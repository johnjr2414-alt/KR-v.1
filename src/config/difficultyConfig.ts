import { EducationalTier } from '../core/types/education';

/**
 * Educational tier range configuration.
 */
export interface EducationalTierRange {
  tier: EducationalTier;
  minLevel: number;
  maxLevel: number;
  tierIndex: number; // 0-based index for easy tier arithmetic (+1, +2 tiers)
}

/**
 * Ordered list of educational tiers and their level thresholds.
 * Level boundaries are configurable.
 */
export const DEFAULT_EDUCATIONAL_TIER_CONFIG: EducationalTierRange[] = [
  { tier: EducationalTier.Elementary, minLevel: 1, maxLevel: 10, tierIndex: 0 },
  { tier: EducationalTier.JuniorHigh, minLevel: 11, maxLevel: 50, tierIndex: 1 },
  { tier: EducationalTier.SeniorHigh, minLevel: 51, maxLevel: 100, tierIndex: 2 },
  { tier: EducationalTier.College, minLevel: 101, maxLevel: 150, tierIndex: 3 },
  { tier: EducationalTier.Masters, minLevel: 151, maxLevel: 200, tierIndex: 4 },
  { tier: EducationalTier.PhD, minLevel: 201, maxLevel: 250, tierIndex: 5 },
  { tier: EducationalTier.Specialization, minLevel: 251, maxLevel: 9999, tierIndex: 6 },
];

/**
 * Difficulty challenge band configuration for higher-level monsters (ΔL > 0).
 */
export interface HigherLevelShiftRule {
  minDelta: number;
  maxDelta: number;
  tierShift: number; // +0, +1, +2 tiers
  targetDifficulty: number; // 1 - 5 difficulty rating within the selected tier
  timerReductionRatio: number; // e.g. 0.10 = -10% time limit
  description: string;
}

export const DEFAULT_HIGHER_LEVEL_SHIFTS: HigherLevelShiftRule[] = [
  {
    minDelta: 1,
    maxDelta: 2,
    tierShift: 0,
    targetDifficulty: 4, // within-tier hard
    timerReductionRatio: 0.1,
    description: 'Slightly harder: within-tier hard questions, 10% timer reduction',
  },
  {
    minDelta: 3,
    maxDelta: 4,
    tierShift: 0,
    targetDifficulty: 5, // within-tier expert
    timerReductionRatio: 0.2,
    description: 'Moderately harder: within-tier expert questions, 20% timer reduction',
  },
  {
    minDelta: 5,
    maxDelta: 9,
    tierShift: 1,
    targetDifficulty: 1, // introductory questions of next tier
    timerReductionRatio: 0.2,
    description: 'Major difficulty jump: +1 tier introductory questions',
  },
  {
    minDelta: 10,
    maxDelta: 19,
    tierShift: 1,
    targetDifficulty: 3, // mid-tier of next tier
    timerReductionRatio: 0.3,
    description: 'Tier jump: +1 tier intermediate questions, 30% timer reduction',
  },
  {
    minDelta: 20,
    maxDelta: Infinity,
    tierShift: 2,
    targetDifficulty: 3,
    timerReductionRatio: 0.4,
    description: 'Extreme cognitive challenge: +2 tiers jump, 40% timer reduction',
  },
];

/**
 * Lower-level monster adjustment rules (ΔL < 0).
 */
export interface LowerLevelAdjustmentConfig {
  /** Target difficulty rating (1 - 5) for questions when fighting weaker monsters. */
  targetDifficulty: number;
  /** Delta threshold at which diminishing returns begin (e.g. 10 levels difference). */
  diminishingReturnsThreshold: number;
  /** Penalty rate per level difference above threshold. */
  penaltyPerLevel: number;
  /** Minimum EXP/Mastery multiplier floor (e.g. 0.1 = 10%). */
  minMultiplier: number;
}

export const DEFAULT_LOWER_LEVEL_ADJUSTMENT: LowerLevelAdjustmentConfig = {
  targetDifficulty: 1, // Introductory / easiest
  diminishingReturnsThreshold: 10,
  penaltyPerLevel: 0.08,
  minMultiplier: 0.1,
};
