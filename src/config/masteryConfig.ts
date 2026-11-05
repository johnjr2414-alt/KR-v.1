import { EducationalTier } from '../core/types/education';

/**
 * Educational tier difficulty multipliers for mastery EXP.
 */
export const DEFAULT_TIER_MASTERY_MULTIPLIERS: Record<EducationalTier, number> = {
  [EducationalTier.Elementary]: 1.0,
  [EducationalTier.JuniorHigh]: 1.5,
  [EducationalTier.SeniorHigh]: 2.2,
  [EducationalTier.College]: 3.2,
  [EducationalTier.Masters]: 4.5,
  [EducationalTier.PhD]: 6.0,
  [EducationalTier.Specialization]: 8.0,
};

/**
 * Within-tier difficulty (1-5) multipliers for mastery EXP.
 */
export const DEFAULT_DIFFICULTY_MASTERY_MULTIPLIERS: Record<number, number> = {
  1: 1.0,
  2: 1.2,
  3: 1.4,
  4: 1.7,
  5: 2.0,
};

/**
 * Configuration for Mastery EXP calculation and leveling curve.
 */
export interface MasteryFormulaConfig {
  /** Default base EXP if question doesn't define baseMasteryExp */
  defaultBaseExp: number;
  /** Tier multipliers mapping */
  tierMultipliers: Record<EducationalTier, number>;
  /** Within-tier difficulty (1-5) multipliers mapping */
  difficultyMultipliers: Record<number, number>;
  /** Speed bonus threshold: ratio of time remaining (e.g. 0.5) */
  speedBonusThreshold: number;
  /** Speed bonus scaling factor (e.g. 0.5) */
  speedBonusFactor: number;
  /** Streak bonus per consecutive correct answer (e.g. 0.05) */
  streakBonusStep: number;
  /** Maximum streak bonus cap (e.g. 0.5) */
  maxStreakBonus: number;
  /** Level curve constant A: RequiredEXP(M) = floor(A * M^B + C * M) */
  levelCurveA: number;
  levelCurveB: number;
  levelCurveC: number;
  /** Maximum mastery level per subject */
  maxMasteryLevel: number;
}

export const DEFAULT_MASTERY_CONFIG: MasteryFormulaConfig = {
  defaultBaseExp: 20,
  tierMultipliers: DEFAULT_TIER_MASTERY_MULTIPLIERS,
  difficultyMultipliers: DEFAULT_DIFFICULTY_MASTERY_MULTIPLIERS,
  speedBonusThreshold: 0.5,
  speedBonusFactor: 0.5,
  streakBonusStep: 0.05,
  maxStreakBonus: 0.5,
  levelCurveA: 40,
  levelCurveB: 2.0,
  levelCurveC: 60,
  maxMasteryLevel: 100,
};

/**
 * Calculates the required mastery EXP to advance from level to level + 1.
 */
export function getRequiredMasteryExp(
  level: number,
  config: MasteryFormulaConfig = DEFAULT_MASTERY_CONFIG,
): number {
  if (level >= config.maxMasteryLevel) return Infinity;
  const l = Math.max(1, Math.floor(level));
  return Math.floor(
    config.levelCurveA * Math.pow(l, config.levelCurveB) + config.levelCurveC * l,
  );
}
