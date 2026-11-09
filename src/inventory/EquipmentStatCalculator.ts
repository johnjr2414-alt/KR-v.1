import type { PlayerData } from '../player/PlayerData';
import type { StatModifiers } from './ItemTypes';
import { EquipmentSlot } from './ItemTypes';
import { getItemDefinition } from './ItemRegistry';
import type { PassiveSkillBonuses } from '../skills/PassiveSkillCalculator';
import { calculateEnhancedStats } from './EnhancementService';

/**
 * Result of aggregating base player stats, equipment bonuses, and passive skill modifiers.
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
  passiveBonuses?: PassiveSkillBonuses;
}

/**
 * Headless stat calculation service for equipment bonuses.
 * Invariant: Never mutates base player stats directly.
 */
export class EquipmentStatCalculator {
  /**
   * Aggregates all stat modifiers provided by currently equipped items,
   * taking item enhancement levels into account.
   */
  calculateEquipmentBonuses(
    equipped: Partial<Record<EquipmentSlot, string>>,
    enhancements?: Partial<Record<EquipmentSlot, number>>,
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

    for (const [slotStr, itemId] of Object.entries(equipped)) {
      if (!itemId) continue;
      const slot = slotStr as EquipmentSlot;
      const def = getItemDefinition(itemId);
      if (def?.statModifiers) {
        const level = enhancements?.[slot] ?? 0;
        const effectiveMods = calculateEnhancedStats(def.statModifiers, level);

        if (effectiveMods.hp) total.hp += effectiveMods.hp;
        if (effectiveMods.mp) total.mp += effectiveMods.mp;
        if (effectiveMods.attack) total.attack += effectiveMods.attack;
        if (effectiveMods.defense) total.defense += effectiveMods.defense;
        if (effectiveMods.intelligence) total.intelligence += effectiveMods.intelligence;
        if (effectiveMods.critRate) total.critRate += effectiveMods.critRate;
        if (effectiveMods.movementSpeed) total.movementSpeed += effectiveMods.movementSpeed;
      }
    }

    return total;
  }

  /**
   * Returns effective stats combining player's base stats, equipment bonuses, and passive skill bonuses.
   */
  calculateEffectiveStats(
    player: PlayerData,
    equipped: Partial<Record<EquipmentSlot, string>>,
    passiveBonuses?: PassiveSkillBonuses,
    enhancements?: Partial<Record<EquipmentSlot, number>>,
  ): EffectiveCharacterStats {
    const bonuses = this.calculateEquipmentBonuses(equipped, enhancements);

    const passiveFlatAtk = passiveBonuses?.flatAttack ?? 0;
    const passiveFlatDef = passiveBonuses?.flatDefense ?? 0;
    const passiveCrit = (passiveBonuses?.critRatePercent ?? 0) / 100;

    return {
      maxHp: player.maxHp + (bonuses.hp ?? 0),
      maxMp: player.maxMp + (bonuses.mp ?? 0),
      attack: player.attack + (bonuses.attack ?? 0) + passiveFlatAtk,
      defense: player.defense + (bonuses.defense ?? 0) + passiveFlatDef,
      intelligence: player.intelligence + (bonuses.intelligence ?? 0),
      critRate: player.critRate + (bonuses.critRate ?? 0) + passiveCrit,
      movementSpeed: player.movementSpeed + (bonuses.movementSpeed ?? 0),
      bonuses,
      passiveBonuses,
    };
  }
}

export const equipmentStatCalculator = new EquipmentStatCalculator();
