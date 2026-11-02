import { describe, it, expect, vi } from 'vitest';
import { createPlayerData } from '@/player';
import {
  DEFAULT_EXP_CONFIG,
  getRequiredExpForNextLevel,
  type ExpFormulaConfig,
} from '@/config/expConfig';
import {
  DEFAULT_STAT_GROWTH_CONFIG,
  type StatGrowthConfig,
} from '@/config/statGrowthConfig';
import {
  ProgressionService,
  calculateStatsForLevel,
  type LevelUpEvent,
} from '@/core/progression';

describe('Player Data Model', () => {
  it('creates player data with required attributes and defaults', () => {
    const player = createPlayerData('p-1', 'Arthur');
    expect(player.id).toBe('p-1');
    expect(player.name).toBe('Arthur');
    expect(player.level).toBe(1);
    expect(player.currentExp).toBe(0);
    expect(player.maxHp).toBe(100);
    expect(player.currentHp).toBe(100);
    expect(player.maxMp).toBe(50);
    expect(player.currentMp).toBe(50);
    expect(player.attack).toBe(10);
    expect(player.defense).toBe(5);
    expect(player.intelligence).toBe(8);
    expect(player.critRate).toBe(5);
    expect(player.movementSpeed).toBe(1.0);
  });

  it('allows overriding specific attributes during creation', () => {
    const player = createPlayerData('p-2', 'Merlin', {
      intelligence: 25,
      attack: 6,
    });
    expect(player.intelligence).toBe(25);
    expect(player.attack).toBe(6);
    expect(player.level).toBe(1);
  });
});

describe('Character EXP Configuration', () => {
  it('calculates required EXP for next level using default formula', () => {
    // Formula: floor(50 * 1^2.2 + 100 * 1) = 150
    const reqLevel1 = getRequiredExpForNextLevel(1);
    expect(reqLevel1).toBe(150);

    // Formula: floor(50 * 2^2.2 + 100 * 2) = floor(50 * 4.59479 + 200) = 429
    const reqLevel2 = getRequiredExpForNextLevel(2);
    expect(reqLevel2).toBe(429);
  });

  it('returns 0 when level reaches or exceeds maxLevel', () => {
    expect(getRequiredExpForNextLevel(100)).toBe(0);
    expect(getRequiredExpForNextLevel(105)).toBe(0);
  });

  it('throws an error for invalid level (< 1)', () => {
    expect(() => getRequiredExpForNextLevel(0)).toThrow();
    expect(() => getRequiredExpForNextLevel(-5)).toThrow();
  });

  it('respects custom level overrides', () => {
    const customConfig: ExpFormulaConfig = {
      ...DEFAULT_EXP_CONFIG,
      customLevelOverrides: { 1: 50 },
    };
    expect(getRequiredExpForNextLevel(1, customConfig)).toBe(50);
    expect(getRequiredExpForNextLevel(2, customConfig)).toBe(429);
  });
});

describe('Stat Growth System', () => {
  it('calculates baseline stats at level 1 matching base configuration', () => {
    const stats = calculateStatsForLevel(1);
    expect(stats.maxHp).toBe(DEFAULT_STAT_GROWTH_CONFIG.baseHp);
    expect(stats.maxMp).toBe(DEFAULT_STAT_GROWTH_CONFIG.baseMp);
    expect(stats.attack).toBe(DEFAULT_STAT_GROWTH_CONFIG.baseAttack);
    expect(stats.defense).toBe(DEFAULT_STAT_GROWTH_CONFIG.baseDefense);
    expect(stats.intelligence).toBe(DEFAULT_STAT_GROWTH_CONFIG.baseIntelligence);
    expect(stats.critRate).toBe(DEFAULT_STAT_GROWTH_CONFIG.baseCritRate);
    expect(stats.movementSpeed).toBe(DEFAULT_STAT_GROWTH_CONFIG.baseMovementSpeed);
  });

  it('scales stats predictably at level 5', () => {
    // Delta = 4 levels
    const stats = calculateStatsForLevel(5);
    expect(stats.maxHp).toBe(100 + 15 * 4); // 160
    expect(stats.maxMp).toBe(50 + 8 * 4); // 82
    expect(stats.attack).toBe(10 + 2 * 4); // 18
    expect(stats.defense).toBe(5 + 1.5 * 4); // 11
    expect(stats.intelligence).toBe(8 + 2 * 4); // 16
    expect(stats.critRate).toBe(5.0 + 0.2 * 4); // 5.8
  });

  it('caps crit rate at maxCritRate', () => {
    const customGrowth: StatGrowthConfig = {
      ...DEFAULT_STAT_GROWTH_CONFIG,
      critRatePerLevel: 10,
      maxCritRate: 40,
    };
    const stats = calculateStatsForLevel(10, customGrowth);
    expect(stats.critRate).toBe(40);
  });

  it('throws when calculating stats for level < 1', () => {
    expect(() => calculateStatsForLevel(0)).toThrow();
  });
});

describe('EXP Awarding & Character Leveling', () => {
  it('rejects invalid or negative EXP amounts', () => {
    const service = new ProgressionService();
    const player = createPlayerData('p-1', 'Hero');

    expect(() => service.awardExp(player, -50)).toThrow('Invalid EXP amount');
    expect(() => service.awardExp(player, NaN)).toThrow('Invalid EXP amount');
    expect(() => service.awardExp(player, Infinity)).toThrow('Invalid EXP amount');
  });

  it('accumulates EXP without leveling up if threshold is not met', () => {
    const service = new ProgressionService();
    const player = createPlayerData('p-1', 'Hero');

    // Level 1 requires 150 EXP
    const result = service.awardExp(player, 100);

    expect(result.leveledUp).toBe(false);
    expect(result.previousLevel).toBe(1);
    expect(result.newLevel).toBe(1);
    expect(result.currentExp).toBe(100);
    expect(result.expRequiredForNextLevel).toBe(150);
    expect(player.level).toBe(1);
    expect(player.currentExp).toBe(100);
  });

  it('handles a single level-up correctly and updates stats', () => {
    const service = new ProgressionService();
    const player = createPlayerData('p-1', 'Hero');

    // Level 1 requires 150 EXP, award 160 EXP -> Level 2 with 10 EXP remaining
    const result = service.awardExp(player, 160);

    expect(result.leveledUp).toBe(true);
    expect(result.previousLevel).toBe(1);
    expect(result.newLevel).toBe(2);
    expect(result.currentExp).toBe(10);
    expect(result.levelUpEvents).toHaveLength(1);
    expect(result.levelUpEvents[0].previousLevel).toBe(1);
    expect(result.levelUpEvents[0].newLevel).toBe(2);

    expect(player.level).toBe(2);
    expect(player.currentExp).toBe(10);
    // Stats should have grown (Base HP 100 + 15 = 115)
    expect(player.maxHp).toBe(115);
    expect(player.currentHp).toBe(115);
    expect(player.attack).toBe(12);
  });

  it('handles multiple level-ups from a large EXP award', () => {
    const service = new ProgressionService();
    const player = createPlayerData('p-1', 'Hero');

    // Level 1 requires 150, Level 2 requires 429. Total to reach L3: 579 EXP
    const result = service.awardExp(player, 600);

    expect(result.leveledUp).toBe(true);
    expect(result.previousLevel).toBe(1);
    expect(result.newLevel).toBe(3);
    expect(result.currentExp).toBe(600 - 579); // 21 EXP remaining
    expect(result.levelUpEvents).toHaveLength(2);

    expect(result.levelUpEvents[0].previousLevel).toBe(1);
    expect(result.levelUpEvents[0].newLevel).toBe(2);
    expect(result.levelUpEvents[1].previousLevel).toBe(2);
    expect(result.levelUpEvents[1].newLevel).toBe(3);

    expect(player.level).toBe(3);
  });

  it('respects maximum level configuration', () => {
    const lowMaxConfig: ExpFormulaConfig = {
      ...DEFAULT_EXP_CONFIG,
      maxLevel: 3,
    };
    const service = new ProgressionService({ expConfig: lowMaxConfig });
    const player = createPlayerData('p-1', 'Hero');

    // Huge EXP award
    const result = service.awardExp(player, 100000);

    expect(result.newLevel).toBe(3);
    expect(player.level).toBe(3);
    expect(player.currentExp).toBe(0);
    expect(result.expRequiredForNextLevel).toBe(0);

    // Further awards should not advance level
    const subsequentResult = service.awardExp(player, 500);
    expect(subsequentResult.leveledUp).toBe(false);
    expect(player.level).toBe(3);
    expect(player.currentExp).toBe(0);
  });

  it('dispatches level-up events to registered listeners', () => {
    const service = new ProgressionService();
    const player = createPlayerData('p-1', 'Hero');

    const listener = vi.fn();
    const unsubscribe = service.onLevelUp(listener);

    service.awardExp(player, 600); // 2 level-ups

    expect(listener).toHaveBeenCalledTimes(2);
    const firstCallEvent = listener.mock.calls[0][0] as LevelUpEvent;
    expect(firstCallEvent.newLevel).toBe(2);
    const secondCallEvent = listener.mock.calls[1][0] as LevelUpEvent;
    expect(secondCallEvent.newLevel).toBe(3);

    unsubscribe();
    service.awardExp(player, 2000);
    // Listener should not be called again after unsubscribe
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
