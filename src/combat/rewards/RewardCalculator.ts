import type { MonsterDefinition } from '../../core/types/monster';
import type { DroppedItem, MonsterRewardResult, MonsterDefeatedEvent } from './RewardTypes';

export type MonsterDefeatedListener = (event: MonsterDefeatedEvent) => void;

/**
 * Headless service for calculating, rolling, and dispatching monster victory rewards.
 */
export class RewardCalculator {
  private listeners: MonsterDefeatedListener[] = [];

  /**
   * Registers a callback listener for monster defeat events (e.g. for quest progression).
   */
  onMonsterDefeated(callback: MonsterDefeatedListener): () => void {
    this.listeners.push(callback);
    return () => {
      const idx = this.listeners.indexOf(callback);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  /**
   * Calculates victory rewards for a defeated monster.
   *
   * @param monster - Defeated monster definition
   * @param expMultiplier - Optional multiplier (e.g. from underleveled penalty)
   * @param randomRoller - Optional random generator (0..1) for deterministic unit testing
   */
  calculateRewards(
    monster: MonsterDefinition,
    expMultiplier = 1.0,
    randomRoller: () => number = Math.random,
  ): MonsterRewardResult {
    // 1. Combat EXP (scaled by multiplier, floor at 1)
    const combatExp = Math.max(1, Math.floor(monster.baseExp * Math.max(0, expMultiplier)));

    // 2. Gold Calculation: Base + Random bonus range
    const minBonus = monster.dropConfig?.bonusGoldMin ?? 0;
    const maxBonus = monster.dropConfig?.bonusGoldMax ?? 0;
    const bonusGold =
      maxBonus >= minBonus
        ? Math.floor(randomRoller() * (maxBonus - minBonus + 1)) + minBonus
        : minBonus;
    const totalGold = monster.baseGold + bonusGold;

    // 3. Roll drop table
    const droppedItems: DroppedItem[] = [];
    if (monster.dropConfig && Array.isArray(monster.dropConfig.drops)) {
      for (const entry of monster.dropConfig.drops) {
        const roll = randomRoller();
        if (roll <= entry.dropChance) {
          const qty =
            entry.maxQuantity >= entry.minQuantity
              ? Math.floor(randomRoller() * (entry.maxQuantity - entry.minQuantity + 1)) + entry.minQuantity
              : entry.minQuantity;
          if (qty > 0) {
            droppedItems.push({
              itemId: entry.itemId,
              quantity: qty,
            });
          }
        }
      }
    }

    return {
      monsterId: monster.id,
      monsterName: monster.name,
      monsterLevel: monster.level,
      combatExp,
      baseGold: monster.baseGold,
      bonusGold,
      totalGold,
      droppedItems,
    };
  }

  /**
   * Dispatches a monster defeat event to all registered listeners.
   */
  emitMonsterDefeated(monster: MonsterDefinition, rewards: MonsterRewardResult): MonsterDefeatedEvent {
    const event: MonsterDefeatedEvent = {
      monsterId: monster.id,
      monsterName: monster.name,
      monsterLevel: monster.level,
      subject: monster.subject,
      rewards,
      timestamp: new Date().toISOString(),
    };

    for (const listener of this.listeners) {
      listener(event);
    }

    return event;
  }
}

export const rewardCalculator = new RewardCalculator();
