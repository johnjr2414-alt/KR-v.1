import type { SkillDefinition, SkillEffect } from './SkillTypes';

export interface SkillValidationResult {
  valid: boolean;
  errors: string[];
}

const VALID_EFFECT_TYPES: Set<string> = new Set([
  'damage-boost-percent',
  'flat-attack-bonus',
  'flat-defense-bonus',
  'crit-rate-bonus',
  'exp-gain-multiplier',
  'mana-cost-reduction-percent',
  'direct-heal-hp',
  'shield-absorption',
]);

/**
 * Validates a single effect payload.
 */
export function validateSkillEffect(effect: SkillEffect, path: string): string[] {
  const errors: string[] = [];

  if (!effect.type || !VALID_EFFECT_TYPES.has(effect.type)) {
    errors.push(`${path}: Invalid effect type "${effect.type}"`);
  }

  if (typeof effect.value !== 'number' || isNaN(effect.value)) {
    errors.push(`${path}: Effect value must be a valid number`);
  }

  if (effect.durationTurns !== undefined && (typeof effect.durationTurns !== 'number' || effect.durationTurns < 0)) {
    errors.push(`${path}: durationTurns must be a non-negative number`);
  }

  return errors;
}

/**
 * Validates a static SkillDefinition to prevent corrupted data or invalid rules.
 */
export function validateSkillDefinition(def: SkillDefinition): SkillValidationResult {
  const errors: string[] = [];

  if (!def.id || typeof def.id !== 'string' || def.id.trim().length === 0) {
    errors.push('Skill id must be a non-empty string');
  }

  if (!def.name || typeof def.name !== 'string' || def.name.trim().length === 0) {
    errors.push('Skill name must be a non-empty string');
  }

  if (def.type !== 'active' && def.type !== 'passive') {
    errors.push(`Skill type must be 'active' or 'passive', got "${def.type}"`);
  }

  if (def.availability !== 'pve' && def.availability !== 'pvp' && def.availability !== 'both') {
    errors.push(`Skill availability must be 'pve', 'pvp', or 'both', got "${def.availability}"`);
  }

  if (typeof def.maxLevel !== 'number' || def.maxLevel < 1) {
    errors.push('Skill maxLevel must be at least 1');
  }

  if (!def.requirements || typeof def.requirements !== 'object') {
    errors.push('Skill requirements must be an object');
  } else {
    if (typeof def.requirements.minMasteryLevel !== 'number' || def.requirements.minMasteryLevel < 1) {
      errors.push('Skill requirements.minMasteryLevel must be at least 1');
    }
    if (def.requirements.minPlayerLevel !== undefined && def.requirements.minPlayerLevel < 1) {
      errors.push('Skill requirements.minPlayerLevel must be at least 1');
    }
    if (def.requirements.goldCost !== undefined && def.requirements.goldCost < 0) {
      errors.push('Skill requirements.goldCost cannot be negative');
    }
  }

  if (!def.levels || typeof def.levels !== 'object') {
    errors.push('Skill levels configuration must be an object mapping level to config');
  } else {
    for (let lvl = 1; lvl <= (def.maxLevel ?? 1); lvl++) {
      const lvlConfig = def.levels[lvl];
      if (!lvlConfig) {
        errors.push(`Missing level configuration for level ${lvl}`);
        continue;
      }

      if (typeof lvlConfig.mpCost !== 'number' || lvlConfig.mpCost < 0) {
        errors.push(`Level ${lvl}: mpCost must be a non-negative number`);
      }

      if (typeof lvlConfig.cooldownTurns !== 'number' || lvlConfig.cooldownTurns < 0) {
        errors.push(`Level ${lvl}: cooldownTurns must be a non-negative number`);
      }

      if (!Array.isArray(lvlConfig.effects) || lvlConfig.effects.length === 0) {
        errors.push(`Level ${lvl}: must have at least one effect`);
      } else {
        lvlConfig.effects.forEach((eff, i) => {
          errors.push(...validateSkillEffect(eff, `Level ${lvl} effect[${i}]`));
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
