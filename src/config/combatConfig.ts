import { MonsterCategory } from '../core/types/monster';

/**
 * Question count bounds per monster category.
 */
export interface QuestionCountConfig {
  min: number;
  max: number;
}

/**
 * Question count ranges determined when battle initiates.
 */
export const DEFAULT_BATTLE_QUESTION_COUNTS: Record<MonsterCategory, QuestionCountConfig> = {
  [MonsterCategory.Weak]: { min: 2, max: 3 },
  [MonsterCategory.Normal]: { min: 3, max: 5 },
  [MonsterCategory.Strong]: { min: 4, max: 7 },
  [MonsterCategory.Elite]: { min: 5, max: 8 },
  [MonsterCategory.Boss]: { min: 6, max: 10 },
};

/**
 * Resolves the locked question count for a combat encounter.
 */
export function calculateBattleQuestionCount(
  category: MonsterCategory,
  config: Record<MonsterCategory, QuestionCountConfig> = DEFAULT_BATTLE_QUESTION_COUNTS,
): number {
  const range = config[category] || { min: 3, max: 5 };
  const min = Math.max(1, range.min);
  const max = Math.max(min, range.max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Combat damage calculation options and multipliers.
 */
export interface DamageCalculationConfig {
  criticalMultiplier: number;
  minDamage: number;
}

export const DEFAULT_DAMAGE_CONFIG: DamageCalculationConfig = {
  criticalMultiplier: 2.0,
  minDamage: 1,
};
