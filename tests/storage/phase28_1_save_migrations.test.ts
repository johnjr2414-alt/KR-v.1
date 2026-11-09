import { describe, it, expect } from 'vitest';
import {
  SAVE_MIGRATIONS,
  migrateSaveData,
  readSaveVersion,
  EARLIEST_SUPPORTED_SAVE_VERSION,
} from '../../src/storage/SaveMigrations';
import { SAVE_DATA_SCHEMA_VERSION } from '../../src/storage/StorageTypes';
import type { SaveData } from '../../src/storage/StorageTypes';
import { InMemoryStorageService } from '../../src/storage/IndexedDBStorageService';

/** Builds a rich, valid raw save payload stamped with a given schema version. */
function richRawSave(version: number): Record<string, unknown> {
  return {
    version,
    updatedAt: 1_700_000_000_000,
    player: {
      id: 'p1',
      name: 'Hero',
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
    careers: {
      version: 1,
      professions: [
        {
          professionId: 'doctor',
          level: 2,
          exp: 10,
          rankId: 'intern',
          reputation: 3,
          status: 'enrolled',
          assignmentHistory: [],
          enrolledAt: 1,
        },
      ],
    },
    settings: {},
  };
}

const ALL_VERSIONS = Array.from(
  { length: SAVE_DATA_SCHEMA_VERSION - EARLIEST_SUPPORTED_SAVE_VERSION + 1 },
  (_, i) => EARLIEST_SUPPORTED_SAVE_VERSION + i,
);

describe('Phase 28.1 — migration chain integrity', () => {
  it('is contiguous from the earliest supported version to the current version', () => {
    expect(SAVE_MIGRATIONS.length).toBe(SAVE_DATA_SCHEMA_VERSION - EARLIEST_SUPPORTED_SAVE_VERSION);
    expect(SAVE_MIGRATIONS[0].from).toBe(EARLIEST_SUPPORTED_SAVE_VERSION);

    for (let i = 0; i < SAVE_MIGRATIONS.length; i++) {
      const step = SAVE_MIGRATIONS[i];
      expect(step.to).toBe(step.from + 1);
      if (i > 0) {
        expect(step.from).toBe(SAVE_MIGRATIONS[i - 1].to);
      }
    }

    expect(SAVE_MIGRATIONS[SAVE_MIGRATIONS.length - 1].to).toBe(SAVE_DATA_SCHEMA_VERSION);
  });
});

describe('Phase 28.1 — migration of every supported version', () => {
  for (const version of ALL_VERSIONS) {
    it(`migrates a v${version} save to v${SAVE_DATA_SCHEMA_VERSION} and preserves valid player data`, () => {
      const result = migrateSaveData(richRawSave(version));

      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.data).toBeDefined();
      expect(result.fromVersion).toBe(version);

      const data = result.data as SaveData;
      expect(data.version).toBe(SAVE_DATA_SCHEMA_VERSION);
      expect(data.player.name).toBe('Hero');
      expect(data.player.level).toBe(7);
      expect(data.currency?.gold).toBe(4_242);
      expect(data.quests).toHaveLength(1);
      expect(data.careers?.professions[0]?.professionId).toBe('doctor');
      expect(data.careers?.professions[0]?.reputation).toBe(3);

      expect(result.migrated).toBe(version !== SAVE_DATA_SCHEMA_VERSION);
      expect(result.futureVersion).toBe(false);
    });
  }

  it('defaults a missing version to the earliest supported version and migrates', () => {
    const raw = richRawSave(EARLIEST_SUPPORTED_SAVE_VERSION);
    delete raw.version;

    expect(readSaveVersion(raw)).toBeNull();
    const result = migrateSaveData(raw);
    expect(result.success).toBe(true);
    expect(result.fromVersion).toBe(EARLIEST_SUPPORTED_SAVE_VERSION);
    expect(result.data?.version).toBe(SAVE_DATA_SCHEMA_VERSION);
    expect(result.data?.player.name).toBe('Hero');
    expect(result.migrated).toBe(true);
  });
});

describe('Phase 28.1 — validation after migration', () => {
  it('rejects malformed input without producing data', () => {
    const nullResult = migrateSaveData(null);
    expect(nullResult.success).toBe(false);
    expect(nullResult.data).toBeUndefined();

    const stringResult = migrateSaveData('not-a-save');
    expect(stringResult.success).toBe(false);
    expect(stringResult.data).toBeUndefined();
  });

  it('fails validation when the player is missing at an older version', () => {
    const result = migrateSaveData({ version: 1 });
    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.errors).toContain('Missing or invalid player data object');
  });

  it('fails validation when the player name is empty after migration', () => {
    const result = migrateSaveData({ version: 2, player: { name: '   ' } });
    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.errors).toContain('Player name is required');
  });

  it('never mutates the original payload', () => {
    const raw = { version: 1 };
    const before = JSON.stringify(raw);
    migrateSaveData(raw);
    expect(JSON.stringify(raw)).toBe(before);
  });
});

describe('Phase 28.1 — unknown future versions', () => {
  it('does not migrate a future save but preserves valid data (best-effort fallback)', () => {
    const futureVersion = SAVE_DATA_SCHEMA_VERSION + 1;
    const result = migrateSaveData(richRawSave(futureVersion));

    expect(result.success).toBe(true);
    expect(result.futureVersion).toBe(true);
    expect(result.migrated).toBe(false);
    expect(result.fromVersion).toBe(futureVersion);
    expect(result.data?.version).toBe(futureVersion);
    expect(result.data?.player.name).toBe('Hero');
  });

  it('fails safely when a future save is also invalid', () => {
    const result = migrateSaveData({ version: SAVE_DATA_SCHEMA_VERSION + 5, player: {} });
    expect(result.success).toBe(false);
    expect(result.futureVersion).toBe(true);
    expect(result.data).toBeUndefined();
  });
});

describe('Phase 28.1 — readSaveVersion', () => {
  it('reads a valid stored version', () => {
    expect(readSaveVersion({ version: 3 })).toBe(3);
    expect(readSaveVersion({ version: SAVE_DATA_SCHEMA_VERSION })).toBe(SAVE_DATA_SCHEMA_VERSION);
  });

  it('returns null for missing, non-integer, or non-positive versions', () => {
    expect(readSaveVersion({})).toBeNull();
    expect(readSaveVersion({ version: 0 })).toBeNull();
    expect(readSaveVersion({ version: -1 })).toBeNull();
    expect(readSaveVersion({ version: 1.5 })).toBeNull();
    expect(readSaveVersion({ version: '2' })).toBeNull();
    expect(readSaveVersion(null)).toBeNull();
  });
});

describe('Phase 28.1 — storage service integration', () => {
  it('loads a legacy save at the current version and captures a recovery copy', async () => {
    const storage = new InMemoryStorageService();
    await storage.saveGame(richRawSave(1) as unknown as SaveData);

    const loaded = await storage.loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded?.version).toBe(SAVE_DATA_SCHEMA_VERSION);
    expect(loaded?.player.name).toBe('Hero');
    expect(loaded?.currency?.gold).toBe(4_242);

    const recovery = storage.getRecoveryCopy() as Record<string, unknown> | null;
    expect(recovery).not.toBeNull();
    expect(recovery?.version).toBe(1);
    expect((recovery?.player as { name?: string }).name).toBe('Hero');
  });

  it('does not capture a recovery copy for a current-version save', async () => {
    const storage = new InMemoryStorageService();
    await storage.saveGame(richRawSave(SAVE_DATA_SCHEMA_VERSION) as unknown as SaveData);

    const loaded = await storage.loadGame();
    expect(loaded?.version).toBe(SAVE_DATA_SCHEMA_VERSION);
    expect(storage.getRecoveryCopy()).toBeNull();
  });

  it('clears the recovery copy when the save is cleared', async () => {
    const storage = new InMemoryStorageService();
    await storage.saveGame(richRawSave(1) as unknown as SaveData);
    await storage.loadGame();
    expect(storage.getRecoveryCopy()).not.toBeNull();

    await storage.clearSave();
    expect(storage.getRecoveryCopy()).toBeNull();
    expect(await storage.loadGame()).toBeNull();
  });
});
