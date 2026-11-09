import { describe, it, expect } from 'vitest';
import {
  SAVE_EXPORT_FORMAT,
  SAVE_EXPORT_FORMAT_VERSION,
  createSaveExport,
  serializeSaveExport,
  exportSaveToString,
  parseSaveImport,
} from '../../src/storage/SaveTransfer';
import {
  SAVE_DATA_SCHEMA_VERSION,
  SAVE_SLOT_IDS,
} from '../../src/storage/StorageTypes';
import type { SaveData } from '../../src/storage/StorageTypes';
import { InMemoryStorageService } from '../../src/storage/IndexedDBStorageService';

/** Builds a fully-valid save payload stamped with a given schema version. */
function rawSave(version: number, name = 'Hero'): Record<string, unknown> {
  return {
    version,
    updatedAt: 1_700_000_000_000,
    player: {
      id: 'p1',
      name,
      level: 7,
      currentExp: 120,
      maxHp: 100,
      currentHp: 80,
      maxMp: 30,
      currentMp: 10,
      attack: 12,
      defense: 8,
      intelligence: 5,
      critRate: 0.1,
      movementSpeed: 120,
    },
    mastery: {},
    inventory: { capacity: 24, slots: [], equipped: {} },
    quests: [{ questId: 'q1', status: 'in-progress', objectives: [] }],
    currency: { gold: 4_242 },
    settings: {},
  };
}

function validSave(name = 'Hero'): SaveData {
  return rawSave(SAVE_DATA_SCHEMA_VERSION, name) as unknown as SaveData;
}

// ─── Export envelope ─────────────────────────────────────────────────────────

describe('Phase 28.2 — export envelope', () => {
  it('stamps format, format version, schema version, and generator metadata', () => {
    const envelope = createSaveExport(validSave(), {
      now: 123,
      appName: 'KR',
      appVersion: '6.0.0',
    });

    expect(envelope.format).toBe(SAVE_EXPORT_FORMAT);
    expect(envelope.formatVersion).toBe(SAVE_EXPORT_FORMAT_VERSION);
    expect(envelope.schemaVersion).toBe(SAVE_DATA_SCHEMA_VERSION);
    expect(envelope.exportedAt).toBe(123);
    expect(envelope.generator).toEqual({ name: 'KR', version: '6.0.0' });
    expect(envelope.data.player.name).toBe('Hero');
  });

  it('serializes to JSON that round-trips structurally', () => {
    const envelope = createSaveExport(validSave(), { now: 1 });
    const parsed = JSON.parse(serializeSaveExport(envelope));
    expect(parsed.format).toBe(SAVE_EXPORT_FORMAT);
    expect(parsed.data.currency.gold).toBe(4_242);
  });
});

// ─── Round-trip ──────────────────────────────────────────────────────────────

describe('Phase 28.2 — export/import round-trip', () => {
  it('imports an exported file and preserves player data', () => {
    const original = validSave('RoundTrip');
    const text = exportSaveToString(original, { now: 5, appVersion: '6.0.0' });

    const result = parseSaveImport(text);
    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.migrated).toBe(false);
    expect(result.futureVersion).toBe(false);
    expect(result.schemaVersion).toBe(SAVE_DATA_SCHEMA_VERSION);
    expect(result.data?.player.name).toBe('RoundTrip');
    expect(result.data?.player.level).toBe(7);
    expect(result.data?.currency?.gold).toBe(4_242);
    expect(result.data?.quests).toHaveLength(1);
  });

  it('remains compatible with a bare (envelope-less) save object', () => {
    const result = parseSaveImport(validSave('Bare'));
    expect(result.success).toBe(true);
    expect(result.data?.player.name).toBe('Bare');
  });
});

// ─── Malformed + invalid files ───────────────────────────────────────────────

describe('Phase 28.2 — malformed and invalid files', () => {
  it('rejects non-JSON text', () => {
    const result = parseSaveImport('{ definitely not json');
    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.errors).toContain('File is not valid JSON');
  });

  it('rejects a non-object payload', () => {
    expect(parseSaveImport('123').success).toBe(false);
    expect(parseSaveImport('"a string"').success).toBe(false);
    expect(parseSaveImport('null').success).toBe(false);
    expect(parseSaveImport('[]').success).toBe(false);
  });

  it('rejects an unrecognized format identifier', () => {
    const result = parseSaveImport(
      JSON.stringify({ format: 'some-other-game', formatVersion: 1, data: {} }),
    );
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('Unrecognized file format');
  });

  it('rejects an unsupported (future) export container version', () => {
    const envelope = createSaveExport(validSave());
    envelope.formatVersion = SAVE_EXPORT_FORMAT_VERSION + 1;
    const result = parseSaveImport(serializeSaveExport(envelope));
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('Unsupported export format version');
  });

  it('rejects a missing or invalid format version', () => {
    expect(parseSaveImport(JSON.stringify({ format: SAVE_EXPORT_FORMAT, data: {} })).success).toBe(
      false,
    );
    expect(
      parseSaveImport(JSON.stringify({ format: SAVE_EXPORT_FORMAT, formatVersion: 0, data: {} }))
        .success,
    ).toBe(false);
  });

  it('rejects an envelope without save data', () => {
    const result = parseSaveImport(
      JSON.stringify({ format: SAVE_EXPORT_FORMAT, formatVersion: 1 }),
    );
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('does not contain save data');
  });

  it('rejects a structurally corrupted save payload', () => {
    const result = parseSaveImport(JSON.stringify({ version: 6, player: { name: '   ' } }));
    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.errors).toContain('Player name is required');
  });
});

// ─── Version handling ────────────────────────────────────────────────────────

describe('Phase 28.2 — version handling on import', () => {
  it('migrates an older exported save forward to the current version', () => {
    const text = exportSaveToString(rawSave(1, 'Legacy') as unknown as SaveData);
    const result = parseSaveImport(text);

    expect(result.success).toBe(true);
    expect(result.migrated).toBe(true);
    expect(result.futureVersion).toBe(false);
    expect(result.schemaVersion).toBe(1);
    expect(result.data?.version).toBe(SAVE_DATA_SCHEMA_VERSION);
    expect(result.data?.player.name).toBe('Legacy');
    expect(result.data?.currency?.gold).toBe(4_242);
  });

  it('accepts a future-schema save in best-effort mode without dropping data', () => {
    const futureVersion = SAVE_DATA_SCHEMA_VERSION + 1;
    const text = exportSaveToString(rawSave(futureVersion, 'FromTheFuture') as unknown as SaveData);
    const result = parseSaveImport(text);

    expect(result.success).toBe(true);
    expect(result.futureVersion).toBe(true);
    expect(result.migrated).toBe(false);
    expect(result.data?.player.name).toBe('FromTheFuture');
  });
});

// ─── Safety: no code execution / no prototype pollution ──────────────────────

describe('Phase 28.2 — import is execution-free', () => {
  it('does not execute or evaluate imported content', () => {
    let executed = false;
    const payload = rawSave(SAVE_DATA_SCHEMA_VERSION) as Record<string, unknown>;
    (payload.player as Record<string, unknown>).name = 'Hero';
    // A malicious-looking string must be treated as inert data, not code.
    (payload as Record<string, unknown>).note =
      'function(){ executed = true; return executed; }()';

    const result = parseSaveImport(JSON.stringify(payload));
    expect(result.success).toBe(true);
    expect(executed).toBe(false);
    expect(result.data?.player.name).toBe('Hero');
  });

  it('does not pollute Object.prototype from a crafted import', () => {
    const hostile = '{"version":6,"__proto__":{"polluted":true},"player":{"name":"Hero"},' +
      '"mastery":{},"inventory":{"capacity":24,"slots":[],"equipped":{}},"quests":[],"settings":{}}';

    parseSaveImport(hostile);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

// ─── Save slots (storage service) ────────────────────────────────────────────

describe('Phase 28.2 — save slots', () => {
  it('lists the configured slots as empty by default', async () => {
    const storage = new InMemoryStorageService();
    const slots = await storage.listSaveSlots?.();
    expect(slots).toHaveLength(SAVE_SLOT_IDS.length);
    expect(slots?.every((s) => s.exists === false)).toBe(true);
  });

  it('writes, reads, and reports slot metadata', async () => {
    const storage = new InMemoryStorageService();
    await storage.saveToSlot?.('slot-1', validSave('SlotHero'));

    const info = (await storage.listSaveSlots?.())?.find((s) => s.slotId === 'slot-1');
    expect(info?.exists).toBe(true);
    expect(info?.playerName).toBe('SlotHero');
    expect(info?.level).toBe(7);
    expect(info?.schemaVersion).toBe(SAVE_DATA_SCHEMA_VERSION);

    const loaded = await storage.loadFromSlot?.('slot-1');
    expect(loaded?.player.name).toBe('SlotHero');
    expect(loaded?.currency?.gold).toBe(4_242);
  });

  it('deletes a slot and reports it as empty again', async () => {
    const storage = new InMemoryStorageService();
    await storage.saveToSlot?.('slot-2', validSave());
    await storage.deleteSlot?.('slot-2');

    const info = (await storage.listSaveSlots?.())?.find((s) => s.slotId === 'slot-2');
    expect(info?.exists).toBe(false);
    expect(await storage.loadFromSlot?.('slot-2')).toBeNull();
  });

  it('refuses to write an invalid save into a slot', async () => {
    const storage = new InMemoryStorageService();
    const invalid = { version: SAVE_DATA_SCHEMA_VERSION } as unknown as SaveData;
    await expect(storage.saveToSlot?.('slot-1', invalid)).rejects.toThrow(/Invalid save data/);
  });

  it('clears slots when the save is cleared', async () => {
    const storage = new InMemoryStorageService();
    await storage.saveToSlot?.('slot-1', validSave());
    await storage.clearSave();

    const info = (await storage.listSaveSlots?.())?.find((s) => s.slotId === 'slot-1');
    expect(info?.exists).toBe(false);
  });
});

// ─── Backup, restore, confirmation, and rollback ─────────────────────────────

describe('Phase 28.2 — backup, restore, and rollback', () => {
  it('requires explicit confirmation for a destructive restore', async () => {
    const storage = new InMemoryStorageService();
    await storage.saveGame(validSave('Original'));

    const result = await storage.restoreActiveSave?.(validSave('Intruder'), { confirm: false });
    expect(result?.success).toBe(false);
    expect(result?.errors).toContain('Restore requires explicit confirmation');

    const active = await storage.loadGame();
    expect(active?.player.name).toBe('Original');
  });

  it('backs up the previous save before replacing it', async () => {
    const storage = new InMemoryStorageService();
    await storage.saveGame(validSave('Original'));

    const result = await storage.restoreActiveSave?.(validSave('Restored'), { confirm: true });
    expect(result?.success).toBe(true);
    expect(result?.backupCreated).toBe(true);
    expect(result?.errors).toEqual([]);

    expect((await storage.loadGame())?.player.name).toBe('Restored');
    // Rollback is possible: the previous save is preserved.
    expect(storage.getBackupCopy()?.player.name).toBe('Original');
  });

  it('does not create a backup when restoring into an empty profile', async () => {
    const storage = new InMemoryStorageService();
    const result = await storage.restoreActiveSave?.(validSave('First'), { confirm: true });
    expect(result?.success).toBe(true);
    expect(result?.backupCreated).toBe(false);
    expect(storage.getBackupCopy()).toBeNull();
  });

  it('rejects restoring an invalid save even when confirmed', async () => {
    const storage = new InMemoryStorageService();
    await storage.saveGame(validSave('Original'));

    const invalid = { version: SAVE_DATA_SCHEMA_VERSION } as unknown as SaveData;
    const result = await storage.restoreActiveSave?.(invalid, { confirm: true });
    expect(result?.success).toBe(false);
    expect(result?.errors.length).toBeGreaterThan(0);
    expect((await storage.loadGame())?.player.name).toBe('Original');
  });
});
