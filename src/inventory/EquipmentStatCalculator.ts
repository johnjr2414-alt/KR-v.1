import type { PlayerData } from '../player/PlayerData';
import type { StatModifiers } from './ItemTypes';
import { EquipmentSlot } from './ItemTypes';
import { getItemDefinition } from './ItemRegistry';

/**
 * Result of aggregating base player stats and equipment bonuses.
 * Maintains immutable separation: does NOT mutate base PlayerData.
 */
export interface EffectiveCharacterStats {
  maxHp: number;
  maxMp: number;
  attack: number;
  defense: number;
  intelligence: number;
  critRate: number;
  movementSpeed: number;
  bonuses: StatModifiers;
}

/**
 * Headless stat calculation service for equipment bonuses.
 * Invariant: Never mutates base player stats directly.
 */
export class EquipmentStatCalculator {
  /**
   * Aggregates all stat modifiers provided by currently equipped items.
   */
  calculateEquipmentBonuses(
    equipped: Partial<Record<EquipmentSlot, string>>,
  ): StatModifiers {
    const total: Required<StatModifiers> = {
      hp: 0,
      mp: 0,
      attack: 0,
      defense: 0,
      intelligence: 0,
      critRate: 0,
      movementSpeed: 0,
    };

    for (const itemId of Object.values(equipped)) {
      if (!itemId) continue;
      const def = getItemDefinition(itemId);
      if (def?.statModifiers) {
        if (def.statModifiers.hp) total.hp += def.statModifiers.hp;
        if (def.statModifiers.mp) total.mp += def.statModifiers.mp;
        if (def.statModifiers.attack) total.attack += def.statModifiers.attack;
        if (def.statModifiers.defense) total.defense += def.statModifiers.defense;
        if (def.statModifiers.intelligence) total.intelligence += def.statModifiers.intelligence;
        if (def.statModifiers.critRate) total.critRate += def.statModifiers.critRate;
        if (def.statModifiers.movementSpeed) total.movementSpeed += def.statModifiers.movementSpeed;
      }
    }

    return total;
  }

  /**
   * Returns effective stats combining player's base stats and equipment bonuses.
   */
  calculateEffectiveStats(
    player: PlayerData,
    equipped: Partial<Record<EquipmentSlot, string>>,
  ): EffectiveCharacterStats {
    const bonuses = this.calculateEquipmentBonuses(equipped);

    return {
      maxHp: player.maxHp + (bonuses.hp ?? 0),
      maxMp: player.maxMp + (bonuses.mp ?? 0),
      attack: player.attack + (bonuses.attack ?? 0),
      defense: player.defense + (bonuses.defense ?? 0),
      intelligence: player.intelligence + (bonuses.intelligence ?? 0),
      critRate: player.critRate + (bonuses.critRate ?? 0),
      movementSpeed: player.movementSpeed + (bonuses.movementSpeed ?? 0),
      bonuses,
    };
  }
}

export const equipmentStatCalculator = new EquipmentStatCalculator();
