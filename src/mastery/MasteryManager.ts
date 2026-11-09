import { SubjectId } from '../core/types/education';
import type { MasteryRecord, MasteryGainResult } from '../core/types/mastery';
import {
  DEFAULT_MASTERY_CONFIG,
  getRequiredMasteryExp,
  type MasteryFormulaConfig,
} from '../config/masteryConfig';
import {
  createInitialMasteryMap,
} from './MasteryData';
import {
  MasteryCalculator,
  masteryCalculator,
  type MasteryCalculationContext,
  type MasteryExpBreakdown,
} from './MasteryCalculator';

export type MasteryLevelUpCallback = (
  subject: SubjectId,
  oldLevel: number,
  newLevel: number,
) => void;

/**
 * Headless Manager handling subject mastery tracking and independent level progression.
 *
 * Invariant: Mastery EXP & Levels are strictly independent from Character Combat EXP & Level.
 */
export class MasteryManager {
  private records: Map<SubjectId, MasteryRecord>;
  private readonly config: MasteryFormulaConfig;
  private readonly calculator: MasteryCalculator;
  private readonly listeners: MasteryLevelUpCallback[] = [];

  constructor(
    initialRecords?: Record<SubjectId, MasteryRecord>,
    config: MasteryFormulaConfig = DEFAULT_MASTERY_CONFIG,
    calculator: MasteryCalculator = masteryCalculator,
  ) {
    this.config = config;
    this.calculator = calculator;
    this.records = new Map();

    const map = initialRecords || createInitialMasteryMap();
    for (const [subject, record] of Object.entries(map)) {
      this.records.set(subject as SubjectId, { ...record });
    }
  }

  /**
   * Retrieves the current mastery record for a subject.
   */
  getMastery(subject: SubjectId): MasteryRecord {
    let rec = this.records.get(subject);
    if (!rec) {
      rec = {
        subject,
        level: 1,
        currentExp: 0,
        totalCorrect: 0,
        totalAttempted: 0,
      };
      this.records.set(subject, rec);
    }
    return { ...rec };
  }

  /**
   * Returns a copy of all mastery records.
   */
  getAllMastery(): Record<SubjectId, MasteryRecord> {
    const result = {} as Record<SubjectId, MasteryRecord>;
    for (const [subject, rec] of this.records.entries()) {
      result[subject] = { ...rec };
    }
    return result;
  }

  /**
   * Replaces internal records with loaded mastery records.
   */
  loadRecords(loadedRecords: Record<SubjectId, MasteryRecord>): void {
    this.records.clear();
    for (const [subject, rec] of Object.entries(loadedRecords)) {
      this.records.set(subject as SubjectId, { ...rec });
    }
  }

  /**
   * Subscribes a listener to mastery level-up events.
   */
  onLevelUp(callback: MasteryLevelUpCallback): () => void {
    this.listeners.push(callback);
    return () => {
      const idx = this.listeners.indexOf(callback);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  /**
   * Calculates and awards mastery EXP for a question answer attempt.
   *
   * @param ctx - Context of the answer attempt
   * @returns MasteryGainResult detailing EXP gained and any level ups
   */
  processAnswerAttempt(ctx: MasteryCalculationContext): {
    gainResult: MasteryGainResult;
    breakdown: MasteryExpBreakdown;
  } {
    const subject = ctx.question.subject;
    const rec = this.records.get(subject) || {
      subject,
      level: 1,
      currentExp: 0,
      totalCorrect: 0,
      totalAttempted: 0,
    };

    // Increment lifetime statistics
    rec.totalAttempted++;
    if (ctx.isCorrect) {
      rec.totalCorrect++;
    }

    const breakdown = this.calculator.calculateExp(ctx);
    const expGained = breakdown.totalExpGained;

    let leveledUp = false;
    const oldLevel = rec.level;

    if (expGained > 0) {
      rec.currentExp += expGained;

      // Handle multi-level progression
      while (rec.level < this.config.maxMasteryLevel) {
        const required = getRequiredMasteryExp(rec.level, this.config);
        if (rec.currentExp >= required) {
          rec.currentExp -= required;
          rec.level++;
          leveledUp = true;
        } else {
          break;
        }
      }

      if (rec.level >= this.config.maxMasteryLevel) {
        rec.level = this.config.maxMasteryLevel;
        rec.currentExp = 0;
      }
    }

    this.records.set(subject, rec);

    if (leveledUp) {
      for (const listener of this.listeners) {
        listener(subject, oldLevel, rec.level);
      }
    }

    const gainResult: MasteryGainResult = {
      subject,
      expGained,
      leveledUp,
      newLevel: rec.level,
    };

    return { gainResult, breakdown };
  }

  /**
   * Awards raw mastery EXP to a subject directly (e.g. as a professional
   * assignment reward), reusing the same level curve and level-up listeners as
   * answer-based gains. Subject mastery remains strictly independent from
   * character combat progression.
   */
  awardMasteryExp(subject: SubjectId, amount: number): MasteryGainResult {
    const expGained =
      typeof amount === 'number' && Number.isFinite(amount) && amount > 0 ? amount : 0;

    const rec = this.records.get(subject) || {
      subject,
      level: 1,
      currentExp: 0,
      totalCorrect: 0,
      totalAttempted: 0,
    };

    const oldLevel = rec.level;
    let leveledUp = false;

    if (expGained > 0) {
      rec.currentExp += expGained;

      // Handle multi-level progression against the shared mastery curve.
      while (rec.level < this.config.maxMasteryLevel) {
        const required = getRequiredMasteryExp(rec.level, this.config);
        if (rec.currentExp >= required) {
          rec.currentExp -= required;
          rec.level++;
          leveledUp = true;
        } else {
          break;
        }
      }

      if (rec.level >= this.config.maxMasteryLevel) {
        rec.level = this.config.maxMasteryLevel;
        rec.currentExp = 0;
      }
    }

    this.records.set(subject, rec);

    if (leveledUp) {
      for (const listener of this.listeners) {
        listener(subject, oldLevel, rec.level);
      }
    }

    return { subject, expGained, leveledUp, newLevel: rec.level };
  }

  /**
   * Computes progress info toward the next mastery level.
   */
  getProgress(subject: SubjectId): {
    currentLevel: number;
    currentExp: number;
    requiredExp: number;
    progressRatio: number;
    isMaxLevel: boolean;
  } {
    const rec = this.getMastery(subject);
    if (rec.level >= this.config.maxMasteryLevel) {
      return {
        currentLevel: rec.level,
        currentExp: 0,
        requiredExp: 0,
        progressRatio: 1.0,
        isMaxLevel: true,
      };
    }
    const requiredExp = getRequiredMasteryExp(rec.level, this.config);
    const progressRatio = Math.min(1.0, rec.currentExp / requiredExp);

    return {
      currentLevel: rec.level,
      currentExp: rec.currentExp,
      requiredExp,
      progressRatio,
      isMaxLevel: false,
    };
  }
}

export const masteryManager = new MasteryManager();
