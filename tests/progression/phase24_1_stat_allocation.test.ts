import { describe, it, expect, beforeEach } from 'vitest';
import { createPlayerData, DEFAULT_ALLOCATED_STATS, PlayerData } from '../../src/player/PlayerData';
import {
  allocateStatPoints,
  calculateAllocationBonuses,
  getTotalAllocatedPoints,
  getTotalStatPointsForLevel,
  migratePlayerToStatAllocation,
  recomputePlayerStats,
} from '../../src/core/progression/StatAllocationService';
import {
  DEFAULT_STAT_ALLOCATION_CONFIG,
  StatAllocationConfig,
} from '../../src/config/statAllocationConfig';
import { ProgressionService } from '../../src/core/progression/ProgressionService';
import { validateSaveData } from '../../src/storage/SaveDataValidator';
import { PlayerSessionManager } from '../../src/player/PlayerSessionManager';

describe('Phase 24.1 — Character Stats and Stat Allocation', () => {
  let player: PlayerData;

  beforeEach(() => {
    player = createPlayerData('test-hero', 'Test Hero');
  });

  describe('Stat Points Earning and Level Growth', () => {
    it('initializes Level 1 player with 0 unallocated stat points and zeroed allocations', () => {
      expect(player.level).toBe(1);
      expect(player.unallocatedStatPoints).toBe(0);
      expect(player.allocatedStats).toEqual(DEFAULT_ALLOCATED_STATS);
    });

    it('calculates expected total stat points accurately per level', () => {
      expect(getTotalStatPointsForLevel(1)).toBe(0);
      expect(getTotalStatPointsForLevel(2)).toBe(5);
      expect(getTotalStatPointsForLevel(5)).toBe(20);
      expect(getTotalStatPointsForLevel(10)).toBe(45);
    });

    it('awards 5 stat points on each level-up through ProgressionService', () => {
      const progression = new ProgressionService();
      expect(player.unallocatedStatPoints).toBe(0);

      // Award enough EXP for level 1 -> 2 (req: 150)
      const res = progression.awardExp(player, 160);
      expect(res.leveledUp).toBe(true);
      expect(player.level).toBe(2);
      expect(player.unallocatedStatPoints).toBe(5);
      expect(res.levelUpEvents[0].statPointsAwarded).toBe(5);
    });

    it('awards cumulative stat points across multi-level jumps', () => {
      const progression = new ProgressionService();
      // Level 1 -> 4
      progression.awardExp(player, 2000);
      expect(player.level).toBeGreaterThanOrEqual(4);
      expect(player.unallocatedStatPoints).toBe((player.level - 1) * 5);
    });
  });

  describe('Stat Allocation Rules and Limits', () => {
    beforeEach(() => {
      player.unallocatedStatPoints = 10;
    });

    it('successfully allocates points into attack and deducts unallocated pool', () => {
      const initialAtk = player.attack;
      const res = allocateStatPoints(player, 'attack', 3);
      expect(res.success).toBe(true);
      expect(player.allocatedStats.attack).toBe(3);
      expect(player.unallocatedStatPoints).toBe(7);
      expect(player.attack).toBe(initialAtk + 3);
    });

    it('correctly scales HP and MP when allocated', () => {
      const initialHp = player.maxHp;
      const initialMp = player.maxMp;

      allocateStatPoints(player, 'hp', 2); // +20 HP
      allocateStatPoints(player, 'mp', 2); // +10 MP

      expect(player.maxHp).toBe(initialHp + 20);
      expect(player.currentHp).toBe(initialHp + 20);
      expect(player.maxMp).toBe(initialMp + 10);
      expect(player.currentMp).toBe(initialMp + 10);
    });

    it('rejects allocation when requesting more points than available', () => {
      const res = allocateStatPoints(player, 'defense', 15);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Not enough stat points');
      expect(player.allocatedStats.defense).toBe(0);
      expect(player.unallocatedStatPoints).toBe(10);
    });

    it('rejects negative, zero, or non-integer points', () => {
      expect(allocateStatPoints(player, 'defense', -1).success).toBe(false);
      expect(allocateStatPoints(player, 'defense', 0).success).toBe(false);
      expect(allocateStatPoints(player, 'defense', 2.5).success).toBe(false);
      expect(player.unallocatedStatPoints).toBe(10);
    });

    it('rejects allocation when per-stat cap is configured and exceeded', () => {
      const cappedConfig: StatAllocationConfig = {
        pointsPerLevel: 5,
        gains: DEFAULT_STAT_ALLOCATION_CONFIG.gains,
        maxPointsPerStat: 5,
      };

      const res1 = allocateStatPoints(player, 'critRate', 4, cappedConfig);
      expect(res1.success).toBe(true);

      const res2 = allocateStatPoints(player, 'critRate', 2, cappedConfig);
      expect(res2.success).toBe(false);
      expect(res2.error).toContain('Cannot exceed 5 points in critRate');
      expect(player.allocatedStats.critRate).toBe(4);
    });
  });

  describe('Derived Stats Calculation and Invariance', () => {
    it('calculates bonuses accurately based on configured per-point gains', () => {
      const allocated = {
        hp: 3,
        mp: 2,
        attack: 4,
        defense: 2,
        intelligence: 5,
        critRate: 2,
      };
      const bonuses = calculateAllocationBonuses(allocated);
      expect(bonuses.hp).toBe(30);
      expect(bonuses.mp).toBe(10);
      expect(bonuses.attack).toBe(4);
      expect(bonuses.defense).toBe(2);
      expect(bonuses.intelligence).toBe(5);
      expect(bonuses.critRate).toBe(1.0);
    });

    it('sums total allocated points across all stats', () => {
      const allocated = {
        hp: 1,
        mp: 2,
        attack: 3,
        defense: 4,
        intelligence: 5,
        critRate: 6,
      };
      expect(getTotalAllocatedPoints(allocated)).toBe(21);
    });

    it('recomputes effective base stats without corrupting base level progression', () => {
      player.level = 3; // Base ATK for L3 = 10 + 2*2 = 14
      player.allocatedStats.attack = 5; // +5 from allocation
      recomputePlayerStats(player);

      expect(player.attack).toBe(19);
    });
  });

  describe('Save Data Migration & Backward Compatibility', () => {
    it('migrates a legacy player with no stat allocation fields by awarding retroactive points', () => {
      // Legacy player at level 4 with no allocatedStats or unallocatedStatPoints
      const legacyPlayer: any = {
        id: 'legacy-1',
        name: 'Veteran',
        level: 4,
        currentExp: 0,
        maxHp: 145,
        currentHp: 145,
        maxMp: 74,
        currentMp: 74,
        attack: 16,
        defense: 9.5,
        intelligence: 14,
        critRate: 5.6,
        movementSpeed: 1.0,
      };

      const migrated = migratePlayerToStatAllocation(legacyPlayer);
      expect(migrated.allocatedStats).toEqual(DEFAULT_ALLOCATED_STATS);
      // (4 - 1) * 5 = 15 unallocated points retroactively granted
      expect(migrated.unallocatedStatPoints).toBe(15);
    });

    it('SaveDataValidator correctly sanitizes and migrates old saves missing stat point fields', () => {
      const legacySave: any = {
        version: 2,
        updatedAt: Date.now(),
        player: {
          id: 'p-1',
          name: 'Hero',
          level: 3,
          currentExp: 0,
          maxHp: 130,
          currentHp: 130,
          maxMp: 66,
          currentMp: 66,
          attack: 14,
          defense: 8,
          intelligence: 12,
          critRate: 5.4,
          movementSpeed: 1.0,
        },
        mastery: {},
        inventory: { capacity: 20, slots: [], equipped: {} },
        quests: [],
        settings: {
          masterVolume: 0.8,
          sfxVolume: 0.8,
          musicVolume: 0.7,
          showDamageNumbers: true,
          controlLayout: 'wasd',
        },
      };

      const validation = validateSaveData(legacySave);
      expect(validation.isValid).toBe(true);
      expect(validation.data?.player.allocatedStats).toEqual(DEFAULT_ALLOCATED_STATS);
      // Level 3 should have (3 - 1) * 5 = 10 points
      expect(validation.data?.player.unallocatedStatPoints).toBe(10);
    });

    it('PlayerSessionManager exposes allocateStats with auto-save', () => {
      const session = new PlayerSessionManager();
      const mockPlayer = createPlayerData('hero-sess', 'SessHero', {
        level: 2,
        unallocatedStatPoints: 5,
      });
      (session as any).player = mockPlayer;
      (session as any).initialized = true;

      const res = session.allocateStats('attack', 2);
      expect(res.success).toBe(true);
      expect(session.getPlayer().allocatedStats.attack).toBe(2);
      expect(session.getPlayer().unallocatedStatPoints).toBe(3);
    });
  });
});
