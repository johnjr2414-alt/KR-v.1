import { describe, it, expect, vi } from 'vitest';
import { validateSaveData } from '../../src/storage/SaveDataValidator';
import { recoverSaveData } from '../../src/storage/SaveRecovery';
import { InMemoryStorageService } from '../../src/storage/IndexedDBStorageService';
import { SAVE_DATA_SCHEMA_VERSION, DEFAULT_GAME_SETTINGS } from '../../src/storage/StorageTypes';
import type { SaveData, StorageService } from '../../src/storage/StorageTypes';
import type { SaveDiagnosticsReport, SaveSectionId, RecoveryLogEntry } from '../../src/storage/SaveDiagnostics';
import {
  appendRecoveryLogEntry,
  createRecoveryLogEntry,
  MAX_RECOVERY_LOG_ENTRIES,
  UNREADABLE_SAVE_MESSAGE,
} from '../../src/storage/SaveDiagnostics';
import { createPlayerData } from '../../src/player/PlayerData';
import { createInitialMasteryMap } from '../../src/mastery/MasteryData';
import { SubjectId } from '../../src/core/types/education';
import { PlayerSessionManager } from '../../src/player/PlayerSessionManager';
import { InventoryManager } from '../../src/inventory/InventoryManager';
import { MasteryManager } from '../../src/mastery/MasteryManager';
import { QuestManager } from '../../src/quests/QuestManager';
import { CurrencyService } from '../../src/economy/CurrencyService';

function makeValidSave(): SaveData {
  return {
    version: SAVE_DATA_SCHEMA_VERSION,
    updatedAt: 1_700_000_000_000,
    player: createPlayerData('player-1', 'Hero', { level: 5, currentExp: 60 }),
    mastery: createInitialMasteryMap(),
    inventory: {
      capacity: 24,
      slots: Array.from({ length: 24 }, () => null),
      equipped: {},
    },
    quests: [],
    currency: { gold: 100 },
    settings: { ...DEFAULT_GAME_SETTINGS },
  };
}

function statusOf(
  report: SaveDiagnosticsReport | undefined,
  section: SaveSectionId,
): string | undefined {
  return report?.sections.find((entry) => entry.section === section)?.status;
}

function makeReport(section: SaveSectionId): SaveDiagnosticsReport {
  return {
    sourceSchemaVersion: SAVE_DATA_SCHEMA_VERSION,
    currentSchemaVersion: SAVE_DATA_SCHEMA_VERSION,
    sections: [{ section, status: 'repaired' }],
    recoveredSections: [section],
    failedSections: [],
    recognizable: true,
    userMessage: 'Repaired.',
  };
}

function seedRawSave(storage: InMemoryStorageService, raw: unknown): void {
  (storage as unknown as { saveState: unknown }).saveState = raw;
}

function makeSession(storage: StorageService): PlayerSessionManager {
  const inventory = new InventoryManager();
  return new PlayerSessionManager({
    storage,
    inventory,
    mastery: new MasteryManager(),
    quests: new QuestManager(inventory),
    currency: new CurrencyService(100),
  });
}

describe('Phase 28.3 — section-level validation diagnostics', () => {
  it('reports no recovery for a fully valid save', () => {
    const result = validateSaveData(makeValidSave());

    expect(result.isValid).toBe(true);
    expect(result.diagnostics?.recoveredSections).toEqual([]);
    expect(result.diagnostics?.failedSections).toEqual([]);
    expect(result.diagnostics?.userMessage).toBeNull();
    expect(statusOf(result.diagnostics, 'player')).toBe('intact');
    expect(statusOf(result.diagnostics, 'inventory')).toBe('intact');
    expect(statusOf(result.diagnostics, 'settings')).toBe('intact');
  });

  it('repairs a corrupted inventory without discarding the player or other sections', () => {
    const raw = {
      ...makeValidSave(),
      inventory: { capacity: -3, slots: 'not-an-array', equipped: null },
      currency: { gold: 55 },
    };

    const result = validateSaveData(raw);

    expect(result.isValid).toBe(true);
    expect(result.data?.player.name).toBe('Hero');
    expect(result.data?.player.level).toBe(5);
    expect(result.data?.currency?.gold).toBe(55);
    expect(result.data?.inventory.capacity).toBe(24);
    expect(result.data?.inventory.slots).toHaveLength(24);
    expect(result.diagnostics?.recoveredSections).toContain('inventory');
    expect(result.diagnostics?.failedSections).toEqual([]);
    expect(result.diagnostics?.userMessage).toContain('inventory');
    expect(statusOf(result.diagnostics, 'player')).toBe('intact');
  });

  it('repairs invalid mastery records and keeps every subject present', () => {
    const mastery = createInitialMasteryMap();
    (mastery as unknown as Record<string, unknown>)[SubjectId.Mathematics] = {
      subject: SubjectId.Mathematics,
      level: -4,
      currentExp: -10,
      totalCorrect: 'many',
      totalAttempted: null,
    };

    const result = validateSaveData({ ...makeValidSave(), mastery });

    expect(result.isValid).toBe(true);
    expect(result.data?.mastery[SubjectId.Mathematics].level).toBe(1);
    expect(result.data?.mastery[SubjectId.Mathematics].currentExp).toBe(0);
    expect(result.data?.mastery[SubjectId.Science]).toBeDefined();
    expect(result.diagnostics?.recoveredSections).toContain('mastery');
  });

  it('repairs corrupted player fields while keeping the character', () => {
    const raw = {
      ...makeValidSave(),
      player: { ...makeValidSave().player, level: 0, maxHp: -10, movementSpeed: 0 },
    };

    const result = validateSaveData(raw);

    expect(result.isValid).toBe(true);
    expect(result.data?.player.name).toBe('Hero');
    expect(result.data?.player.level).toBe(1);
    expect(result.data?.player.maxHp).toBe(100);
    expect(result.data?.player.movementSpeed).toBe(1);
    expect(result.diagnostics?.recoveredSections).toContain('player');
  });

  it('treats absent optional sections as missing (silent) rather than damaged', () => {
    const valid = makeValidSave();
    const raw = {
      version: SAVE_DATA_SCHEMA_VERSION,
      player: valid.player,
      mastery: valid.mastery,
      inventory: valid.inventory,
      quests: valid.quests,
      currency: valid.currency,
      settings: valid.settings,
    };

    const result = validateSaveData(raw);

    expect(result.isValid).toBe(true);
    expect(statusOf(result.diagnostics, 'analytics')).toBe('missing');
    expect(statusOf(result.diagnostics, 'gathering')).toBe('missing');
    expect(statusOf(result.diagnostics, 'careers')).toBe('missing');
    expect(statusOf(result.diagnostics, 'assignments')).toBe('missing');
    expect(result.diagnostics?.recoveredSections).toEqual([]);
    expect(result.diagnostics?.userMessage).toBeNull();
  });

  it('reports repaired settings when values are invalid', () => {
    const result = validateSaveData({
      ...makeValidSave(),
      settings: {
        masterVolume: 9,
        sfxVolume: 'loud',
        musicVolume: 0.5,
        showDamageNumbers: 'yes',
        controlLayout: 'nope',
      },
    });

    expect(result.isValid).toBe(true);
    expect(result.data?.settings.masterVolume).toBe(1);
    expect(result.data?.settings.showDamageNumbers).toBe(true);
    expect(result.data?.settings.controlLayout).toBe('wasd');
    expect(result.diagnostics?.recoveredSections).toContain('settings');
  });
});

describe('Phase 28.3 — recovery orchestration', () => {
  it('loads an intact save without any recovery', () => {
    const result = recoverSaveData(makeValidSave());

    expect(result.status).toBe('intact');
    expect(result.data?.player.name).toBe('Hero');
    expect(result.migrated).toBe(false);
    expect(result.report.recoveredSections).toEqual([]);
  });

  it('loads a repaired save and reports the damaged section', () => {
    const raw = {
      ...makeValidSave(),
      inventory: { capacity: 'wide', slots: 5, equipped: [] },
    };

    const result = recoverSaveData(raw);

    expect(result.status).toBe('repaired');
    expect(result.data?.player.name).toBe('Hero');
    expect(result.report.recoveredSections).toContain('inventory');
    expect(result.report.userMessage).toContain('inventory');
  });

  it('salvages a missing player record while preserving valid sections', () => {
    const raw = {
      version: SAVE_DATA_SCHEMA_VERSION,
      mastery: createInitialMasteryMap(),
      inventory: {
        capacity: 24,
        slots: [{ itemId: 'iron-sword', quantity: 2 }],
        equipped: {},
      },
      currency: { gold: 777 },
    };

    const result = recoverSaveData(raw);

    expect(result.status).toBe('salvaged');
    expect(result.data?.player.name).toBe('Hero');
    expect(result.data?.currency?.gold).toBe(777);
    expect(result.data?.inventory.slots[0]?.itemId).toBe('iron-sword');
    expect(result.report.recoveredSections).toContain('player');
    expect(result.report.failedSections).not.toContain('player');
    expect(result.report.userMessage).toMatch(/player data/i);
  });

  it('salvages an empty player name and keeps its valid level and stats', () => {
    const raw = {
      ...makeValidSave(),
      player: { ...makeValidSave().player, name: '   ', level: 9, maxHp: 250 },
    };

    const result = recoverSaveData(raw);

    expect(result.status).toBe('salvaged');
    expect(result.data?.player.name).toBe('Hero');
    expect(result.data?.player.level).toBe(9);
    expect(result.data?.player.maxHp).toBe(250);
  });

  it('rejects non-save input and payloads with no recognizable sections', () => {
    for (const raw of [null, undefined, 'not-a-save', 42, [], { version: 1 }]) {
      const result = recoverSaveData(raw);
      expect(result.status).toBe('unreadable');
      expect(result.data).toBeUndefined();
    }

    expect(recoverSaveData({ version: 1 }).report.userMessage).toBe(UNREADABLE_SAVE_MESSAGE);
  });

  it('preserves future-version saves without migrating them', () => {
    const futureVersion = SAVE_DATA_SCHEMA_VERSION + 2;
    const result = recoverSaveData({ ...makeValidSave(), version: futureVersion });

    expect(result.status).toBe('intact');
    expect(result.futureVersion).toBe(true);
    expect(result.data?.version).toBe(futureVersion);
  });

  it('never mutates the original payload', () => {
    const raw = {
      ...makeValidSave(),
      player: { ...makeValidSave().player, name: '' },
      inventory: { capacity: 'bad', slots: 'bad' },
    };
    const before = JSON.stringify(raw);

    recoverSaveData(raw);

    expect(JSON.stringify(raw)).toBe(before);
  });
});

describe('Phase 28.3 — recovery log', () => {
  it('keeps log entries content-free', () => {
    const raw = {
      ...makeValidSave(),
      player: { ...makeValidSave().player, name: 'Secret Hero' },
      inventory: { capacity: 'bad', slots: 'bad' },
    };
    const result = recoverSaveData(raw);
    const entry = createRecoveryLogEntry({
      event: 'save-repaired',
      sourceSchemaVersion: SAVE_DATA_SCHEMA_VERSION,
      currentSchemaVersion: SAVE_DATA_SCHEMA_VERSION,
      report: result.report,
      recoveryCopySaved: true,
    });

    const serialized = JSON.stringify(entry);
    expect(serialized).not.toContain('Secret Hero');
    expect(serialized).not.toContain('iron-sword');
    expect(entry.recoveredSections).toContain('inventory');
    expect(result.report.userMessage).not.toContain('Secret Hero');
  });

  it('collapses repeated identical events instead of growing the log', () => {
    const source = {
      event: 'save-repaired' as const,
      sourceSchemaVersion: SAVE_DATA_SCHEMA_VERSION,
      currentSchemaVersion: SAVE_DATA_SCHEMA_VERSION,
      report: makeReport('inventory'),
      recoveryCopySaved: true,
    };

    let log: RecoveryLogEntry[] = [];
    log = appendRecoveryLogEntry(log, createRecoveryLogEntry(source));
    log = appendRecoveryLogEntry(log, createRecoveryLogEntry(source));

    expect(log).toHaveLength(1);
    expect(log[0].occurrences).toBe(2);
  });

  it('bounds the log to a fixed number of entries', () => {
    let log: RecoveryLogEntry[] = [];
    for (let i = 0; i < MAX_RECOVERY_LOG_ENTRIES + 5; i++) {
      log = appendRecoveryLogEntry(
        log,
        createRecoveryLogEntry({
          event: 'save-unreadable',
          sourceSchemaVersion: i,
          currentSchemaVersion: SAVE_DATA_SCHEMA_VERSION,
          report: makeReport('player'),
          recoveryCopySaved: true,
        }),
      );
    }

    expect(log).toHaveLength(MAX_RECOVERY_LOG_ENTRIES);
    expect(log[log.length - 1].sourceSchemaVersion).toBe(MAX_RECOVERY_LOG_ENTRIES + 4);
  });
});

describe('Phase 28.3 — storage integration', () => {
  it('repairs a corrupted save, keeps the raw payload, and logs the event', async () => {
    const storage = new InMemoryStorageService();
    const raw = {
      version: SAVE_DATA_SCHEMA_VERSION,
      player: {
        ...createPlayerData('player-1', 'Keep Me', { level: 4, maxHp: 120 }),
      },
      inventory: { capacity: 'bad', slots: 'bad', equipped: null },
      currency: { gold: 55 },
    };
    seedRawSave(storage, raw);

    const detailed = await storage.loadGameDetailed();
    expect(detailed.status).toBe('repaired');
    expect(detailed.data?.player.name).toBe('Keep Me');
    expect(detailed.data?.player.level).toBe(4);
    expect(detailed.data?.currency?.gold).toBe(55);
    expect(detailed.data?.inventory.capacity).toBe(24);

    const loaded = await storage.loadGame();
    expect(loaded?.player.name).toBe('Keep Me');

    expect(storage.getLoadRecoveryCopy()).toEqual(raw);

    const log = await storage.getRecoveryLog();
    expect(log).toHaveLength(1);
    expect(log[0].event).toBe('save-repaired');
    expect(log[0].recoveredSections).toContain('inventory');
    expect(log[0].occurrences).toBe(2);
    expect(JSON.stringify(log)).not.toContain('Keep Me');
  });

  it('keeps an unreadable payload and records the failure', async () => {
    const storage = new InMemoryStorageService();
    seedRawSave(storage, { version: 1 });

    const detailed = await storage.loadGameDetailed();

    expect(detailed.status).toBe('unreadable');
    expect(detailed.data).toBeUndefined();
    expect(await storage.loadGame()).toBeNull();
    expect(storage.getLoadRecoveryCopy()).toEqual({ version: 1 });

    const log = await storage.getRecoveryLog();
    expect(log).toHaveLength(1);
    expect(log[0].event).toBe('save-unreadable');
  });

  it('logs a migration and still keeps the pre-migration copy', async () => {
    const storage = new InMemoryStorageService();
    seedRawSave(storage, { ...makeValidSave(), version: 1 });

    const detailed = await storage.loadGameDetailed();

    expect(detailed.status).toBe('intact');
    expect(detailed.data?.version).toBe(SAVE_DATA_SCHEMA_VERSION);
    expect(storage.getRecoveryCopy()).not.toBeNull();

    const log = await storage.getRecoveryLog();
    expect(log).toHaveLength(1);
    expect(log[0].event).toBe('save-migrated');
  });

  it('clears the recovery log and copies with the save', async () => {
    const storage = new InMemoryStorageService();
    seedRawSave(storage, { version: 1 });
    await storage.loadGameDetailed();
    expect((await storage.getRecoveryLog()).length).toBe(1);

    await storage.clearSave();

    expect(await storage.getRecoveryLog()).toEqual([]);
    expect(storage.getLoadRecoveryCopy()).toBeNull();
  });
});

describe('Phase 28.3 — session notices and storage failure handling', () => {
  it('warns and creates a playable session when storage cannot be accessed', async () => {
    const saveGame = vi.fn(async () => {});
    const failingStorage: StorageService = {
      init: async () => {
        throw new Error('IndexedDB unavailable');
      },
      saveGame,
      loadGame: async () => {
        throw new Error('IndexedDB unavailable');
      },
      saveSettings: async () => {},
      loadSettings: async () => ({ ...DEFAULT_GAME_SETTINGS }),
      clearSave: async () => {},
    };

    const session = makeSession(failingStorage);
    const player = await session.initializeSession('Offline Hero');

    expect(player.name).toBe('Offline Hero');
    expect(session.isInitialized()).toBe(true);
    expect(session.isStorageAvailable()).toBe(false);
    expect(session.getSaveRecoveryNotice()).toMatch(/storage could not be accessed/i);
    expect(saveGame).not.toHaveBeenCalled();
  });

  it('does not overwrite an unreadable save during initialization', async () => {
    const storage = new InMemoryStorageService();
    seedRawSave(storage, { version: 1 });
    const saveGame = vi.spyOn(storage, 'saveGame');

    const session = makeSession(storage);
    const player = await session.initializeSession('New Hero');

    expect(player.name).toBe('New Hero');
    expect(session.getSaveRecoveryNotice()).toBe(UNREADABLE_SAVE_MESSAGE);
    expect(saveGame).not.toHaveBeenCalled();

    // The raw payload is still preserved for manual recovery.
    const after = await storage.loadGameDetailed();
    expect(after.status).toBe('unreadable');
  });

  it('loads repaired data and surfaces the recovery notice', async () => {
    const storage = new InMemoryStorageService();
    seedRawSave(storage, {
      version: SAVE_DATA_SCHEMA_VERSION,
      player: {
        ...createPlayerData('player-1', 'Repair Hero', { level: 4 }),
      },
      inventory: { capacity: 'bad', slots: 'bad', equipped: null },
      currency: { gold: 12 },
    });

    const session = makeSession(storage);
    const player = await session.initializeSession();

    expect(player.name).toBe('Repair Hero');
    expect(player.level).toBe(4);
    expect(session.getSaveRecoveryNotice()).toContain('inventory');
    expect(session.getLastSaveReport()?.recoveredSections).toContain('inventory');
    expect(session.inventory.getState().capacity).toBe(24);
  });
});
