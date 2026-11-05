import { describe, it, expect, vi } from 'vitest';
import { RewardCalculator } from '../../src/combat/rewards/RewardCalculator';
import { MonsterCategory, type MonsterDefinition } from '../../src/core/types/monster';
import { SubjectId } from '../../src/core/types/education';

const SAMPLE_MONSTER: MonsterDefinition = {
  id: 'goblin-scout',
  name: 'Goblin Scout',
  level: 3,
  maxHp: 40,
  attack: 12,
  defense: 3,
  subject: SubjectId.Mathematics,
  category: MonsterCategory.Normal,
  baseExp: 25,
  baseGold: 10,
  dropConfig: {
    bonusGoldMin: 2,
    bonusGoldMax: 6,
    drops: [
      {
        itemId: 'slime-gel',
        dropChance: 0.5,
        minQuantity: 1,
        maxQuantity: 2,
      },
      {
        itemId: 'rare-crystal',
        dropChance: 0.1,
        minQuantity: 1,
        maxQuantity: 1,
      },
    ],
  },
  spriteColor: 0x16a34a,
  detectionRadius: 70,
};

describe('RewardCalculator', () => {
  const rewards = new RewardCalculator();

  it('calculates EXP based on baseExp and multiplier', () => {
    // 100% multiplier
    const res1 = rewards.calculateRewards(SAMPLE_MONSTER, 1.0);
    expect(res1.combatExp).toBe(25);

    // 50% multiplier
    const res2 = rewards.calculateRewards(SAMPLE_MONSTER, 0.5);
    expect(res2.combatExp).toBe(12);

    // Minimum 1 EXP floor
    const res3 = rewards.calculateRewards(SAMPLE_MONSTER, 0.01);
    expect(res3.combatExp).toBe(1);
  });

  it('calculates Gold with base and bonus range', () => {
    // Deterministic random roller returning 0.5 (middle of range)
    const mockRoller = () => 0.5;
    const res = rewards.calculateRewards(SAMPLE_MONSTER, 1.0, mockRoller);

    expect(res.baseGold).toBe(10);
    // bonus range: 2 to 6 -> (6-2+1)*0.5 + 2 = 2.5 + 2 = 4 bonus
    expect(res.bonusGold).toBe(4);
    expect(res.totalGold).toBe(14);
  });

  it('rolls item drops based on dropChance', () => {
    // Roller always succeeds (0.05 <= 0.5 and 0.05 <= 0.1)
    const luckyRoller = () => 0.05;
    const res = rewards.calculateRewards(SAMPLE_MONSTER, 1.0, luckyRoller);

    expect(res.droppedItems.length).toBe(2);
    expect(res.droppedItems.some((d) => d.itemId === 'slime-gel')).toBe(true);
    expect(res.droppedItems.some((d) => d.itemId === 'rare-crystal')).toBe(true);

    // Roller fails all drops (0.9 > 0.5 and 0.9 > 0.1)
    const unluckyRoller = () => 0.9;
    const unluckyRes = rewards.calculateRewards(SAMPLE_MONSTER, 1.0, unluckyRoller);
    expect(unluckyRes.droppedItems.length).toBe(0);
  });

  it('emits monster defeated event to listeners', () => {
    const listener = vi.fn();
    const unsubscribe = rewards.onMonsterDefeated(listener);

    const calculated = rewards.calculateRewards(SAMPLE_MONSTER);
    const event = rewards.emitMonsterDefeated(SAMPLE_MONSTER, calculated);

    expect(listener).toHaveBeenCalledWith(event);
    expect(event.monsterId).toBe('goblin-scout');
    expect(event.rewards.combatExp).toBe(25);

    unsubscribe();
    rewards.emitMonsterDefeated(SAMPLE_MONSTER, calculated);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
