import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStorageService } from '../../src/storage/IndexedDBStorageService';
import { validateSaveData, validateGameSettings } from '../../src/storage/SaveDataValidator';
import type { SaveData, GameSettings } from '../../src/storage/StorageTypes';
import { DEFAULT_INITIAL_PLAYER_DATA, createPlayerData } from '../../src/player/PlayerData';
import { createInitialMasteryMap } from '../../src/mastery/MasteryData';
import { SubjectId } from '../../src/core/types/education';
import { EquipmentSlot } from '../../src/inventory/ItemTypes';
import { QuestStatus } from '../../src/quests/QuestTypes';

describe('Storage & Save Data Validation', () => {
  let storage: InMemoryStorageService;

  beforeEach(() => {
    storage = new InMemoryStorageService();
  });

  function createValidSaveData(): SaveData {
    return {
      version: 1,
      updatedAt: 1700000000000,
      player: createPlayerData('p-1', 'Brave Novice', { level: 2, currentExp: 50 }),
      mastery: createInitialMasteryMap(),
      inventory: {
        capacity: 24,
        slots: [
          { slotIndex: 0, itemId: 'wooden-sword', quantity: 1 },
          { slotIndex: 1, itemId: 'minor-health-potion', quantity: 3 },
          ...Array.from({ length: 22 }, () => null),
        ],
        equipped: {
          [EquipmentSlot.Weapon]: 'wooden-sword',
        },
      },
      quests: [
        {
          questId: 'quest-slime-hunter',
          status: QuestStatus.InProgress,
          objectives: [],
        },
      ],
      settings: {
        masterVolume: 0.9,
        sfxVolume: 0.7,
        musicVolume: 0.6,
        showDamageNumbers: true,
        controlLayout: 'wasd',
      },
    };
  }

  describe('Game Settings Validation', () => {
    it('returns default settings when input is invalid or null', () => {
      const s1 = validateGameSettings(null);
      expect(s1.masterVolume).toBe(0.8);
      expect(s1.controlLayout).toBe('wasd');

      const s2 = validateGameSettings({});
      expect(s2.masterVolume).toBe(0.8);
      expect(s2.controlLayout).toBe('wasd');
    });

    it('clamps volume levels to 0.0 - 1.0 range', () => {
      const s = validateGameSettings({
        masterVolume: 2.5,
        sfxVolume: -0.5,
        musicVolume: 0.5,
      });

      expect(s.masterVolume).toBe(1.0);
      expect(s.sfxVolume).toBe(0.0);
      expect(s.musicVolume).toBe(0.5);
    });
  });

  describe('Save Data Validation', () => {
    it('successfully validates complete and proper save data', () => {
      const original = createValidSaveData();
      const res = validateSaveData(original);

      expect(res.isValid).toBe(true);
      expect(res.errors).toHaveLength(0);
      expect(res.data?.player.name).toBe('Brave Novice');
      expect(res.data?.player.level).toBe(2);
      expect(res.data?.inventory.equipped[EquipmentSlot.Weapon]).toBe('wooden-sword');
    });

    it('rejects completely invalid data (null or missing player)', () => {
      const res1 = validateSaveData(null);
      expect(res1.isValid).toBe(false);

      const res2 = validateSaveData({ version: 1 });
      expect(res2.isValid).toBe(false);
      expect(res2.errors).toContain('Missing or invalid player data object');
    });

    it('gracefully repairs missing or corrupted sub-records (mastery, inventory slots)', () => {
      const partialData = {
        version: 1,
        player: { name: 'Survivor' },
        mastery: null, // missing mastery
        inventory: null, // missing inventory
      };

      const res = validateSaveData(partialData);
      expect(res.isValid).toBe(true);
      expect(res.data?.player.name).toBe('Survivor');
      expect(res.data?.player.maxHp).toBe(DEFAULT_INITIAL_PLAYER_DATA.maxHp);
      // Repaired mastery contains all subjects
      expect(res.data?.mastery[SubjectId.Mathematics].level).toBe(1);
      // Repaired inventory contains default empty slots
      expect(res.data?.inventory.slots).toHaveLength(24);
    });
  });

  describe('Storage Service Persistence (Save & Load)', () => {
    it('returns null when no save data exists', async () => {
      const loaded = await storage.loadGame();
      expect(loaded).toBeNull();
    });

    it('saves and reloads full game state', async () => {
      const original = createValidSaveData();
      await storage.saveGame(original);

      const loaded = await storage.loadGame();
      expect(loaded).not.toBeNull();
      expect(loaded?.player.name).toBe('Brave Novice');
      expect(loaded?.player.level).toBe(2);
      expect(loaded?.inventory.slots[1]?.itemId).toBe('minor-health-potion');
      expect(loaded?.inventory.slots[1]?.quantity).toBe(3);
      expect(loaded?.quests[0].questId).toBe('quest-slime-hunter');
    });

    it('saves and loads user settings independently', async () => {
      const newSettings: GameSettings = {
        masterVolume: 0.5,
        sfxVolume: 0.6,
        musicVolume: 0.4,
        showDamageNumbers: false,
        controlLayout: 'arrows',
      };

      await storage.saveSettings(newSettings);
      const loaded = await storage.loadSettings();

      expect(loaded.masterVolume).toBe(0.5);
      expect(loaded.controlLayout).toBe('arrows');
      expect(loaded.showDamageNumbers).toBe(false);
    });

    it('clears all save and settings data', async () => {
      await storage.saveGame(createValidSaveData());
      await storage.clearSave();

      const loaded = await storage.loadGame();
      expect(loaded).toBeNull();
    });
  });
});
