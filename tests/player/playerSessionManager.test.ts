import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerSessionManager } from '../../src/player/PlayerSessionManager';
import { InMemoryStorageService } from '../../src/storage/IndexedDBStorageService';
import { InventoryManager } from '../../src/inventory/InventoryManager';
import { MasteryManager } from '../../src/mastery/MasteryManager';
import { QuestManager } from '../../src/quests/QuestManager';
import { CurrencyService } from '../../src/economy/CurrencyService';
import type { SaveData } from '../../src/storage/StorageTypes';
import { createPlayerData } from '../../src/player/PlayerData';
import { createInitialMasteryMap } from '../../src/mastery/MasteryData';
import { SubjectId } from '../../src/core/types/education';
import { EquipmentSlot } from '../../src/inventory/ItemTypes';
import { QuestStatus, QuestType } from '../../src/quests/QuestTypes';
import { AppRole, roleManager } from '../../src/core/roles';

describe('PlayerSessionManager (Phase 21.1)', () => {
  let storage: InMemoryStorageService;
  let inventory: InventoryManager;
  let mastery: MasteryManager;
  let quests: QuestManager;
  let currency: CurrencyService;
  let session: PlayerSessionManager;

  beforeEach(() => {
    PlayerSessionManager.resetInstance();
    storage = new InMemoryStorageService();
    inventory = new InventoryManager();
    mastery = new MasteryManager();
    quests = new QuestManager(inventory);
    currency = new CurrencyService(100);

    session = new PlayerSessionManager({
      storage,
      inventory,
      mastery,
      quests,
      currency,
    });
  });

  function createMockSave(customPlayerName = 'Saved Hero'): SaveData {
    return {
      version: 1,
      updatedAt: 100000,
      player: createPlayerData('player-1', customPlayerName, {
        level: 5,
        currentExp: 150,
        currentHp: 85,
        maxHp: 140,
        attack: 22,
      }),
      mastery: createInitialMasteryMap(),
      inventory: {
        capacity: 24,
        slots: [
          { slotIndex: 0, itemId: 'iron-blade', quantity: 1 },
          ...Array.from({ length: 23 }, () => null),
        ],
        equipped: {
          [EquipmentSlot.Weapon]: 'iron-blade',
        },
      },
      quests: [
        {
          questId: 'quest-slime-hunter',
          status: QuestStatus.InProgress,
          objectives: [
            {
              id: 'kill-forest-slimes',
              description: 'Defeat Forest Slimes',
              type: QuestType.KillMonster,
              targetId: 'forest-slime',
              requiredCount: 2,
              currentCount: 1,
            },
          ],
        },
      ],
      settings: {
        masterVolume: 0.5,
        sfxVolume: 0.6,
        musicVolume: 0.7,
        showDamageNumbers: true,
        controlLayout: 'arrows',
      },
    };
  }

  it('1. Existing save successfully loads into the active session', async () => {
    const mockSave = createMockSave('Veteran Arthur');
    await storage.saveGame(mockSave);

    const player = await session.initializeSession();
    expect(player.name).toBe('Veteran Arthur');
    expect(player.level).toBe(5);
    expect(player.currentHp).toBe(85);
    expect(player.attack).toBe(22);

    // Verify domain services hydrated from save
    expect(session.inventory.getState().equipped[EquipmentSlot.Weapon]).toBe('iron-blade');
    expect(session.inventory.getState().slots[0]?.itemId).toBe('iron-blade');
    expect(session.quests.getQuestRecord('quest-slime-hunter')?.status).toBe(QuestStatus.InProgress);
    expect(session.quests.getQuestRecord('quest-slime-hunter')?.objectives[0].currentCount).toBe(1);
    expect(session.getSettings().controlLayout).toBe('arrows');
  });

  it('2. Missing save creates a new player with initial baseline state', async () => {
    expect(await storage.loadGame()).toBeNull();

    const player = await session.initializeSession('Fresh Adventurer');
    expect(player.name).toBe('Fresh Adventurer');
    expect(player.level).toBe(1);
    expect(player.currentExp).toBe(0);
    expect(player.currentHp).toBe(100);

    // Verify baseline was saved to storage
    const saved = await storage.loadGame();
    expect(saved).not.toBeNull();
    expect(saved?.player.name).toBe('Fresh Adventurer');
    expect(saved?.mastery[SubjectId.Mathematics].level).toBe(1);
  });

  it('3. Invalid save follows existing validation and recovery behavior', async () => {
    // Malformed data missing sub-records
    const corruptedData: any = {
      version: 1,
      player: { name: 'Resilient Hero', level: 3 },
      mastery: null,
      inventory: null,
    };
    await (storage as any).saveGame(corruptedData);

    const player = await session.initializeSession();
    expect(player.name).toBe('Resilient Hero');
    expect(player.level).toBe(3);
    // Repaired mastery and inventory
    expect(session.mastery.getMastery(SubjectId.Mathematics).level).toBe(1);
    expect(session.inventory.getState().capacity).toBe(24);
  });

  it('4. Multiple initialization calls do not create duplicate sessions', async () => {
    const p1Promise = session.initializeSession('Player One');
    const p2Promise = session.initializeSession('Player Two');

    const [p1, p2] = await Promise.all([p1Promise, p2Promise]);
    expect(p1).toBe(p2);
    expect(p1.name).toBe('Player One');
  });

  it('5. Scene transitions retain the same player state', async () => {
    await session.initializeSession('Consistent Hero');
    const player = session.getPlayer();

    // Scene 1: Player takes damage in combat
    player.currentHp = 60;
    player.currentMp = 30;

    // Simulate transition to VillageScene / HuntingScene
    const playerAfterTransition = session.getPlayer();
    expect(playerAfterTransition.currentHp).toBe(60);
    expect(playerAfterTransition.currentMp).toBe(30);
  });

  it('6. Save operations persist the current player state and snapshot', async () => {
    await session.initializeSession('Hero Saver');
    const player = session.getPlayer();

    player.level = 4;
    player.currentHp = 110;
    session.inventory.addItem('cloth-tunic', 1);

    const ok = await session.saveSession();
    expect(ok).toBe(true);

    const loaded = await storage.loadGame();
    expect(loaded?.player.level).toBe(4);
    expect(loaded?.player.currentHp).toBe(110);
    expect(loaded?.inventory.slots[0]?.itemId).toBe('cloth-tunic');
  });

  it('7. A failed save does not crash the application', async () => {
    await session.initializeSession('Error Tester');

    // Simulate storage failure
    storage.saveGame = async () => {
      throw new Error('Disk quota exceeded');
    };

    const result = await session.saveSession();
    expect(result).toBe(false); // Handles gracefully
    expect(session.isInitialized()).toBe(true);
  });

  it('8. Super Admin navigation does not modify player save data', async () => {
    const mockSave = createMockSave('Protected Player');
    await storage.saveGame(mockSave);

    // Super Admin role selection
    roleManager.selectRole(AppRole.SuperAdmin);
    expect(roleManager.getRole()).toBe(AppRole.SuperAdmin);

    // Verify player save in storage remains completely unaltered
    const saved = await storage.loadGame();
    expect(saved?.player.name).toBe('Protected Player');
    expect(saved?.player.level).toBe(5);
  });
});
