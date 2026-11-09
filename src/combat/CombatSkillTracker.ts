import type { SkillDefinition, SkillEffect } from '../skills/SkillTypes';

export interface ActiveBuff {
  skillId: string;
  effect: SkillEffect;
  turnsRemaining: number;
}

export interface SkillActivationResult {
  success: boolean;
  error?: string;
  skillId: string;
  mpCost: number;
  message?: string;
}

/**
 * Headless combat skill modifier tracker.
 * Tracks active buffs (damage boosts, shields, mana reduction) and skill cooldowns across combat turns.
 */
export class CombatSkillTracker {
  private activeBuffs: ActiveBuff[] = [];
  private skillCooldowns: Map<string, number> = new Map(); // skillId -> turns remaining
  private activeShieldAbsorption = 0;

  reset(): void {
    this.activeBuffs = [];
    this.skillCooldowns.clear();
    this.activeShieldAbsorption = 0;
  }

  getCooldown(skillId: string): number {
    return this.skillCooldowns.get(skillId) ?? 0;
  }

  isSkillOnCooldown(skillId: string): boolean {
    return (this.skillCooldowns.get(skillId) ?? 0) > 0;
  }

  getShieldAbsorption(): number {
    return this.activeShieldAbsorption;
  }

  /**
   * Applies an active skill's effects into combat state.
   */
  applySkill(skill: SkillDefinition, level: number): { shieldGained: number; healAmount: number } {
    const lvlConfig = skill.levels[level];
    if (!lvlConfig) {
      return { shieldGained: 0, healAmount: 0 };
    }

    // Set cooldown
    if (lvlConfig.cooldownTurns > 0) {
      this.skillCooldowns.set(skill.id, lvlConfig.cooldownTurns);
    }

    let shieldGained = 0;
    let healAmount = 0;

    for (const effect of lvlConfig.effects) {
      if (effect.type === 'shield-absorption') {
        this.activeShieldAbsorption += effect.value;
        shieldGained += effect.value;
      } else if (effect.type === 'direct-heal-hp') {
        healAmount += effect.value;
      } else {
        // Buff with duration
        this.activeBuffs.push({
          skillId: skill.id,
          effect,
          turnsRemaining: effect.durationTurns ?? 1,
        });
      }
    }

    return { shieldGained, healAmount };
  }

  /**
   * Returns multiplicative damage bonus modifier (e.g. 1.25 for +25%).
   */
  getDamageMultiplier(): number {
    let multiplier = 1.0;
    for (const buff of this.activeBuffs) {
      if (buff.effect.type === 'damage-boost-percent') {
        multiplier += buff.effect.value / 100;
      }
    }
    return multiplier;
  }

  /**
   * Absorbs incoming damage using active shields. Returns remaining unabsorbed damage.
   */
  absorbDamage(incomingDamage: number): { finalDamage: number; absorbed: number } {
    if (this.activeShieldAbsorption <= 0) {
      return { finalDamage: incomingDamage, absorbed: 0 };
    }

    const absorbed = Math.min(this.activeShieldAbsorption, incomingDamage);
    this.activeShieldAbsorption -= absorbed;
    const finalDamage = incomingDamage - absorbed;

    return { finalDamage, absorbed };
  }

  /**
   * Called at the end of each combat turn to decrement buff durations and cooldowns.
   */
  advanceTurn(): void {
    // 1. Decrement cooldowns
    for (const [skillId, cd] of this.skillCooldowns.entries()) {
      if (cd > 1) {
        this.skillCooldowns.set(skillId, cd - 1);
      } else {
        this.skillCooldowns.delete(skillId);
      }
    }

    // 2. Decrement active buffs
    this.activeBuffs = this.activeBuffs
      .map((buff) => ({
        ...buff,
        turnsRemaining: buff.turnsRemaining - 1,
      }))
      .filter((buff) => buff.turnsRemaining > 0);
  }

  getActiveBuffs(): ReadonlyArray<ActiveBuff> {
    return this.activeBuffs;
  }
}
