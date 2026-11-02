import { EducationalTier, type SubjectId } from '../../core/types/education';
import type { Question } from '../../core/types/question';
import {
  DEFAULT_EDUCATIONAL_TIER_CONFIG,
  DEFAULT_HIGHER_LEVEL_SHIFTS,
  DEFAULT_LOWER_LEVEL_ADJUSTMENT,
  type EducationalTierRange,
  type HigherLevelShiftRule,
  type LowerLevelAdjustmentConfig,
} from '../../config/difficultyConfig';
import type { QuestionRepository } from '../retrieval/QuestionRepository';

/**
 * Result of comparing monster level against player level.
 */
export interface LevelDifferenceResult {
  playerLevel: number;
  monsterLevel: number;
  deltaL: number; // monsterLevel - playerLevel
  isMonsterHigher: boolean;
  isSameLevel: boolean;
  isMonsterLower: boolean;
}

/**
 * Question selection profile resulting from PvE difficulty evaluation.
 */
export interface PvEQuestionProfile {
  /** Target academic subject. */
  subject: SubjectId;
  /** Baseline educational tier of the monster. */
  baselineTier: EducationalTier;
  /** Final calculated educational tier (after any level-difference tier shifts). */
  targetTier: EducationalTier;
  /** Target within-tier difficulty rating (1 - 5). */
  targetDifficulty: number;
  /** Multiplier for question time limit (e.g. 0.8 = 20% faster). */
  timerMultiplier: number;
  /** EXP & Mastery reward multiplier (applies penalty for severely under-leveled monsters). */
  rewardMultiplier: number;
  /** Calculated level difference details. */
  levelDifference: LevelDifferenceResult;
  /** Explanatory description of the applied difficulty rule. */
  reason: string;
}

/**
 * Fallback audit event logged when requested question tier or difficulty is unavailable.
 */
export interface DifficultyFallbackEvent {
  requestedTier: EducationalTier;
  requestedDifficulty: number;
  resolvedTier: EducationalTier;
  resolvedDifficulty: number;
  reason: string;
}

/**
 * Headless PvE Difficulty Calculation Engine.
 * Implements prompts 11.1 - 11.6:
 * - Baseline tier from monster level
 * - Level difference calculation (ΔL = Lm - Lp)
 * - Higher-level challenge table (+0 to +2 tier shifts, timer reductions)
 * - Lower-level challenge adjustments (introductory questions, diminishing returns)
 * - Final PvE question profile resolution with content-pool fallback safety
 */
export class DifficultyEngine {
  constructor(
    private readonly tierConfig: EducationalTierRange[] = DEFAULT_EDUCATIONAL_TIER_CONFIG,
    private readonly higherShifts: HigherLevelShiftRule[] = DEFAULT_HIGHER_LEVEL_SHIFTS,
    private readonly lowerAdjustment: LowerLevelAdjustmentConfig = DEFAULT_LOWER_LEVEL_ADJUSTMENT,
  ) {}

  /**
   * Prompt 11.2: Determines the monster's baseline educational tier from its level.
   */
  getMonsterBaselineTier(monsterLevel: number): EducationalTier {
    const level = Math.max(1, Math.floor(monsterLevel));
    for (const range of this.tierConfig) {
      if (level >= range.minLevel && level <= range.maxLevel) {
        return range.tier;
      }
    }
    // Fallback to highest tier if beyond configured ranges
    return this.tierConfig[this.tierConfig.length - 1].tier;
  }

  /**
   * Prompt 11.3: Calculates difference between player level and monster level.
   * ΔL = Lm - Lp
   */
  calculateLevelDifference(playerLevel: number, monsterLevel: number): LevelDifferenceResult {
    const pL = Math.max(1, Math.floor(playerLevel));
    const mL = Math.max(1, Math.floor(monsterLevel));
    const deltaL = mL - pL;

    return {
      playerLevel: pL,
      monsterLevel: mL,
      deltaL,
      isMonsterHigher: deltaL > 0,
      isSameLevel: deltaL === 0,
      isMonsterLower: deltaL < 0,
    };
  }

  /**
   * Prompt 11.4 & 11.5: Calculates the difficulty shifts given a level difference.
   */
  getDifficultyShift(
    baselineTier: EducationalTier,
    diff: LevelDifferenceResult,
  ): {
    targetTier: EducationalTier;
    targetDifficulty: number;
    timerMultiplier: number;
    rewardMultiplier: number;
    reason: string;
  } {
    const baselineIndex = this.getTierIndex(baselineTier);

    // 1. Same Level (ΔL === 0)
    if (diff.isSameLevel) {
      return {
        targetTier: baselineTier,
        targetDifficulty: 3, // balanced mid-tier difficulty
        timerMultiplier: 1.0,
        rewardMultiplier: 1.0,
        reason: 'Same level: standard within-tier difficulty',
      };
    }

    // 2. Higher Level Monster (ΔL > 0)
    if (diff.isMonsterHigher) {
      const delta = diff.deltaL;
      const rule =
        this.higherShifts.find((r) => delta >= r.minDelta && delta <= r.maxDelta) ||
        this.higherShifts[this.higherShifts.length - 1];

      const newTierIndex = Math.min(
        this.tierConfig.length - 1,
        baselineIndex + rule.tierShift,
      );
      const targetTier = this.tierConfig[newTierIndex].tier;
      const timerMultiplier = Math.max(0.5, 1.0 - rule.timerReductionRatio);

      return {
        targetTier,
        targetDifficulty: rule.targetDifficulty,
        timerMultiplier,
        rewardMultiplier: 1.0,
        reason: rule.description,
      };
    }

    // 3. Lower Level Monster (ΔL < 0)
    const levelDiff = diff.playerLevel - diff.monsterLevel; // positive value for Lp - Lm
    let rewardMultiplier = 1.0;

    if (levelDiff >= this.lowerAdjustment.diminishingReturnsThreshold) {
      const penalty = (levelDiff - this.lowerAdjustment.diminishingReturnsThreshold) * this.lowerAdjustment.penaltyPerLevel;
      rewardMultiplier = Math.max(this.lowerAdjustment.minMultiplier, 1.0 - penalty);
    }

    return {
      targetTier: baselineTier,
      targetDifficulty: this.lowerAdjustment.targetDifficulty,
      timerMultiplier: 1.0,
      rewardMultiplier,
      reason: `Lower level monster (${levelDiff} levels below): introductory difficulty`,
    };
  }

  /**
   * Prompt 11.6: Creates the final PvE question profile.
   */
  createQuestionProfile(
    subject: SubjectId,
    playerLevel: number,
    monsterLevel: number,
  ): PvEQuestionProfile {
    const baselineTier = this.getMonsterBaselineTier(monsterLevel);
    const levelDifference = this.calculateLevelDifference(playerLevel, monsterLevel);
    const shift = this.getDifficultyShift(baselineTier, levelDifference);

    return {
      subject,
      baselineTier,
      targetTier: shift.targetTier,
      targetDifficulty: shift.targetDifficulty,
      timerMultiplier: shift.timerMultiplier,
      rewardMultiplier: shift.rewardMultiplier,
      levelDifference,
      reason: shift.reason,
    };
  }

  /**
   * Resolves questions from a QuestionRepository matching the profile,
   * with fallback safety if the exact tier or difficulty is insufficient.
   */
  resolveQuestionsWithFallback(
    repository: QuestionRepository,
    profile: PvEQuestionProfile,
    count: number,
  ): {
    questions: Question[];
    fallbackEvents: DifficultyFallbackEvent[];
  } {
    const fallbackEvents: DifficultyFallbackEvent[] = [];

    // Attempt 1: Exact tier and exact difficulty
    let candidates = repository.filter({
      subject: profile.subject,
      educationalTier: profile.targetTier,
      difficulty: profile.targetDifficulty,
    });

    if (candidates.length >= count) {
      return { questions: candidates.slice(0, count), fallbackEvents };
    }

    // Attempt 2: Same tier, any difficulty
    candidates = repository.filter({
      subject: profile.subject,
      educationalTier: profile.targetTier,
    });

    if (candidates.length >= count) {
      fallbackEvents.push({
        requestedTier: profile.targetTier,
        requestedDifficulty: profile.targetDifficulty,
        resolvedTier: profile.targetTier,
        resolvedDifficulty: candidates[0]?.difficulty ?? 1,
        reason: 'Insufficient questions at exact difficulty; relaxed within same tier',
      });
      return { questions: candidates.slice(0, count), fallbackEvents };
    }

    // Attempt 3: Fall back to baseline tier or closest populated tier
    const tiersToTry = [
      profile.baselineTier,
      EducationalTier.Elementary,
      EducationalTier.JuniorHigh,
      EducationalTier.SeniorHigh,
    ];

    for (const altTier of tiersToTry) {
      const altCandidates = repository.filter({
        subject: profile.subject,
        educationalTier: altTier,
      });

      if (altCandidates.length > 0) {
        fallbackEvents.push({
          requestedTier: profile.targetTier,
          requestedDifficulty: profile.targetDifficulty,
          resolvedTier: altTier,
          resolvedDifficulty: altCandidates[0]?.difficulty ?? 1,
          reason: `Insufficient questions in target tier ${profile.targetTier}; fell back to ${altTier}`,
        });
        return {
          questions: altCandidates.slice(0, count),
          fallbackEvents,
        };
      }
    }

    // Attempt 4: Any published question in subject
    const anyInSubject = repository.filter({ subject: profile.subject });
    if (anyInSubject.length > 0) {
      fallbackEvents.push({
        requestedTier: profile.targetTier,
        requestedDifficulty: profile.targetDifficulty,
        resolvedTier: anyInSubject[0].educationalTier,
        resolvedDifficulty: anyInSubject[0].difficulty,
        reason: 'Emergency fallback: used any available question in subject',
      });
      return { questions: anyInSubject.slice(0, count), fallbackEvents };
    }

    return { questions: [], fallbackEvents };
  }

  private getTierIndex(tier: EducationalTier): number {
    const found = this.tierConfig.find((r) => r.tier === tier);
    return found ? found.tierIndex : 0;
  }
}

/** Global default difficulty engine singleton */
export const difficultyEngine = new DifficultyEngine();
