import type { SkillAvailability, SkillEffect } from './SkillTypes';
import { getSkillDefinition } from './SkillRegistry';
import type { SkillManager } from './SkillManager';

/**
 * Aggregated passive stat & mechanic bonuses.
 */
export interface PassiveSkillBonuses {
  flatAttack: number;
  flatDefense: number;
  critRatePercent: number;
  expMultiplier: number;
  manaCostReductionPercent: number;
  activeEffects: Array<{
    skillId: string;
    skillName: string;
    level: number;
    effect: SkillEffect;
  }>;
}

/**
 * Upper safety caps on stacked passive bonuses to prevent balance exploitation or division by zero.
 */
export const PASSIVE_BONUS_CAPS = {
  MAX_CRIT_RATE_PERCENT: 50, // Max +50% passive crit boost
  MAX_MANA_COST_REDUCTION_PERCENT: 50, // Max 50% MP cost reduction
  MAX_EXP_MULTIPLIER: 3.0, // Max 300% total EXP
  MIN_FLAT_DEFENSE: 0,
  MAX_FLAT_DEFENSE: 100,
  MIN_FLAT_ATTACK: 0,
  MAX_FLAT_ATTACK: 100,
} as const;

export type TargetMode = 'pve' | 'pvp' | 'both';

/**
 * Headless Passive Skill Calculator.
 *
 * Requirements (Phase 23.4):
 * - Never permanently mutate base player stats.
 * - Deduplicate skills: each unlocked skill's passive effects apply strictly once at its highest unlocked level.
 * - Enforce mode checking (e.g., PvE vs. PvP vs. both).
 * - Enforce defined caps on percentage and flat bonuses.
 * - Keep base stats, equipment modifiers, and passive modifiers cleanly distinguishable.
 */
export class PassiveSkillCalculator {
  /**
   * Calculates all active passive bonuses for a player in a given target mode.
   *
   * @param skillManager - Player's skill manager containing unlocked skill states
   * @param mode - Target mode ('pve' or 'pvp'). Defaults to 'pve'.
   */
  calculatePassiveBonuses(
    skillManager?: SkillManager,
    mode: TargetMode = 'pve',
  ): PassiveSkillBonuses {
    const bonuses: PassiveSkillBonuses = {
      flatAttack: 0,
      flatDefense: 0,
      critRatePercent: 0,
      expMultiplier: 1.0,
      manaCostReductionPercent: 0,
      activeEffects: [],
    };

    if (!skillManager) {
      return bonuses;
    }

    const state = skillManager.getState();
    const processedSkillIds = new Set<string>();

    for (const [skillId, record] of Object.entries(state.unlockedSkills)) {
      if (!record || record.currentLevel <= 0) continue;
      if (processedSkillIds.has(skillId)) continue; // Deduplication guarantee
      processedSkillIds.add(skillId);

      const def = getSkillDefinition(skillId);
      if (!def || def.type !== 'passive') continue;

      // Mode validation: check if skill is available in current mode
      if (!this.isModeEligible(def.availability, mode)) {
        continue;
      }

      const lvlConfig = def.levels[record.currentLevel];
      if (!lvlConfig || !Array.isArray(lvlConfig.effects)) continue;

      for (const effect of lvlConfig.effects) {
        bonuses.activeEffects.push({
          skillId: def.id,
          skillName: def.name,
          level: record.currentLevel,
          effect,
        });

        switch (effect.type) {
          case 'flat-attack-bonus':
            bonuses.flatAttack += effect.value;
            break;
          case 'flat-defense-bonus':
            bonuses.flatDefense += effect.value;
            break;
          case 'crit-rate-bonus':
            bonuses.critRatePercent += effect.value;
            break;
          case 'exp-gain-multiplier':
            // Stacking rule: multiplicative stacking or incremental bonus (e.g. 1.05 = +5%)
            if (effect.value > 1.0) {
              bonuses.expMultiplier += (effect.value - 1.0);
            } else if (effect.value > 0) {
              bonuses.expMultiplier += effect.value;
            }
            break;
          case 'mana-cost-reduction-percent':
            bonuses.manaCostReductionPercent += effect.value;
            break;
          default:
            // Non-passive or unhandled effects ignored
            break;
        }
      }
    }

    // Apply safety caps
    bonuses.flatAttack = Math.min(
      PASSIVE_BONUS_CAPS.MAX_FLAT_ATTACK,
      Math.max(PASSIVE_BONUS_CAPS.MIN_FLAT_ATTACK, bonuses.flatAttack),
    );
    bonuses.flatDefense = Math.min(
      PASSIVE_BONUS_CAPS.MAX_FLAT_DEFENSE,
      Math.max(PASSIVE_BONUS_CAPS.MIN_FLAT_DEFENSE, bonuses.flatDefense),
    );
    bonuses.critRatePercent = Math.min(
      PASSIVE_BONUS_CAPS.MAX_CRIT_RATE_PERCENT,
      Math.max(0, bonuses.critRatePercent),
    );
    bonuses.manaCostReductionPercent = Math.min(
      PASSIVE_BONUS_CAPS.MAX_MANA_COST_REDUCTION_PERCENT,
      Math.max(0, bonuses.manaCostReductionPercent),
    );
    bonuses.expMultiplier = Math.min(
      PASSIVE_BONUS_CAPS.MAX_EXP_MULTIPLIER,
      Math.max(1.0, bonuses.expMultiplier),
    );

    return bonuses;
  }

  /**
   * Checks whether a skill with availability `skillAvailability` is applicable in `targetMode`.
   */
  private isModeEligible(skillAvailability: SkillAvailability, targetMode: TargetMode): boolean {
    if (skillAvailability === 'both') return true;
    if (targetMode === 'both') return true;
    return skillAvailability === targetMode;
  }
}

export const passiveSkillCalculator = new PassiveSkillCalculator();
