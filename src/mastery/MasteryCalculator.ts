import type { Question } from '../core/types/question';
import {
  DEFAULT_MASTERY_CONFIG,
  type MasteryFormulaConfig,
} from '../config/masteryConfig';

export interface MasteryCalculationContext {
  question: Question;
  isCorrect: boolean;
  timeRemaining: number;
  timeLimit: number;
  currentStreak: number;
  rewardMultiplier?: number;
}

export interface MasteryExpBreakdown {
  baseExp: number;
  tierMultiplier: number;
  difficultyMultiplier: number;
  speedMultiplier: number;
  streakMultiplier: number;
  rewardMultiplier: number;
  totalExpGained: number;
}

/**
 * Headless calculation service for Subject Knowledge Mastery EXP.
 * Formula:
 * MasteryGain = BaseEXP * M_tier * M_diff * M_speed * M_streak * M_reward
 */
export class MasteryCalculator {
  constructor(private readonly config: MasteryFormulaConfig = DEFAULT_MASTERY_CONFIG) {}

  calculateExp(ctx: MasteryCalculationContext): MasteryExpBreakdown {
    // Incorrect answer / timeout receives strictly 0 mastery EXP
    if (!ctx.isCorrect) {
      return {
        baseExp: 0,
        tierMultiplier: 1.0,
        difficultyMultiplier: 1.0,
        speedMultiplier: 1.0,
        streakMultiplier: 1.0,
        rewardMultiplier: 1.0,
        totalExpGained: 0,
      };
    }

    const baseExp =
      ctx.question.baseMasteryExp !== undefined && ctx.question.baseMasteryExp > 0
        ? ctx.question.baseMasteryExp
        : this.config.defaultBaseExp;

    const tierMultiplier =
      this.config.tierMultipliers[ctx.question.educationalTier] ?? 1.0;

    const difficultyMultiplier =
      this.config.difficultyMultipliers[ctx.question.difficulty] ?? 1.0;

    // Speed multiplier: If TimeRemaining / TimeLimit > threshold, 1.0 + factor * (TimeRemaining / TimeLimit)
    let speedMultiplier = 1.0;
    if (ctx.timeLimit > 0) {
      const timeRatio = Math.max(0, Math.min(1, ctx.timeRemaining / ctx.timeLimit));
      if (timeRatio > this.config.speedBonusThreshold) {
        speedMultiplier = 1.0 + this.config.speedBonusFactor * timeRatio;
      }
    }

    // Streak multiplier: 1.0 + min(maxCap, streak * step)
    const streakBonus = Math.min(
      this.config.maxStreakBonus,
      Math.max(0, ctx.currentStreak) * this.config.streakBonusStep,
    );
    const streakMultiplier = 1.0 + streakBonus;

    // Reward multiplier (from under-leveled monster penalties if applicable)
    const rewardMultiplier =
      ctx.rewardMultiplier !== undefined ? Math.max(0, ctx.rewardMultiplier) : 1.0;

    const rawExp =
      baseExp *
      tierMultiplier *
      difficultyMultiplier *
      speedMultiplier *
      streakMultiplier *
      rewardMultiplier;

    const totalExpGained = Math.max(1, Math.floor(rawExp));

    return {
      baseExp,
      tierMultiplier,
      difficultyMultiplier,
      speedMultiplier,
      streakMultiplier,
      rewardMultiplier,
      totalExpGained,
    };
  }
}

export const masteryCalculator = new MasteryCalculator();
