/**
 * Profession progression service (Phase 27.5).
 *
 * Owns the *rules* of independent profession progression — the EXP curve,
 * multi-level advancement, rank derivation, and reputation — and applies their
 * result to the authoritative career records held by
 * {@link import('./CareerService').CareerService}. This keeps the three
 * progression systems strictly independent:
 *
 *   1. Character (combat) level   — {@link import('../core/progression/ProgressionService').ProgressionService}
 *   2. Subject mastery            — {@link import('../mastery/MasteryManager').MasteryManager}
 *   3. Profession (career) level  — this service
 *
 * A profession's EXP curve is data-driven off its {@link ProfessionExperienceSettings}
 * (`baseExp`, `growthFactor`, `maxProfessionLevel`), so a new profession needs no
 * engine change. Everything here is headless (no Phaser/DOM imports).
 */

import type {
  ProfessionCareerRecord,
  ProfessionExperienceSettings,
  ProfessionRankDefinition,
} from './ProfessionTypes';
import { CareerService, careerService } from './CareerService';

export interface ProfessionProgressionServiceOptions {
  /**
   * Career store whose enrolled records this service advances. Defaults to the
   * shared {@link careerService} instance.
   */
  careers?: CareerService;
}

/** Why a progression award could not be applied. */
export enum ProfessionProgressionFailureReason {
  UnknownProfession = 'unknown-profession',
  NotEnrolled = 'not-enrolled',
}

/**
 * Calculates the profession EXP required to advance from `level` to `level + 1`.
 * Returns `Infinity` once the profession's maximum level is reached (no next
 * level). `baseExp` is the cost of the first advancement; each subsequent level
 * grows by `growthFactor`.
 */
export function getProfessionExpForNextLevel(
  level: number,
  settings: ProfessionExperienceSettings,
): number {
  if (level >= settings.maxProfessionLevel) return Number.POSITIVE_INFINITY;
  const l = Math.max(1, Math.floor(level));
  return Math.floor(settings.baseExp * Math.pow(settings.growthFactor, l - 1));
}

/** Result of awarding profession EXP. */
export interface ProfessionExpAwardResult {
  success: boolean;
  professionId: string;
  /** EXP actually credited (0 for a non-positive or invalid request). */
  expAwarded: number;
  previousLevel: number;
  newLevel: number;
  previousExp: number;
  currentExp: number;
  /** EXP still required for the next level (0 at max level). */
  expRequiredForNextLevel: number;
  leveledUp: boolean;
  levelsGained: number;
  /** Whether the current rank changed as a result of this award. */
  rankChanged: boolean;
  previousRankId: string;
  newRankId: string;
  /** Updated career record (present on success). */
  record?: ProfessionCareerRecord;
  /** First blocking reason (present only on failure). */
  reason?: ProfessionProgressionFailureReason;
  message: string;
}

/** Result of awarding profession reputation. */
export interface ProfessionReputationAwardResult {
  success: boolean;
  professionId: string;
  /** Reputation actually credited (0 for a non-positive or invalid request). */
  reputationAwarded: number;
  totalReputation: number;
  reason?: ProfessionProgressionFailureReason;
  message: string;
}

/** Non-mutating snapshot of an enrolled profession's progression for UI display. */
export interface ProfessionProgressInfo {
  professionId: string;
  level: number;
  currentExp: number;
  /** EXP required for the next level (0 at max level). */
  requiredExp: number;
  progressRatio: number;
  isMaxLevel: boolean;
  rankId: string;
  rankName: string;
}

/**
 * Headless profession progression engine.
 *
 * Advancing a profession never touches character level or subject mastery; those
 * are progressed only through their own services. Conversely a high character
 * level or mastery level never grants profession levels.
 */
export class ProfessionProgressionService {
  private readonly careers: CareerService;

  constructor(options: ProfessionProgressionServiceOptions = {}) {
    this.careers = options.careers ?? careerService;
  }

  /** EXP required to advance the profession from `level`. */
  getExpForNextLevel(professionId: string, level: number): number {
    const profession = this.careers.getProfession(professionId);
    if (!profession) return Number.POSITIVE_INFINITY;
    return getProfessionExpForNextLevel(level, profession.experience);
  }

  /** The rank currently held in a profession, or `undefined` when not enrolled. */
  getRank(professionId: string): ProfessionRankDefinition | undefined {
    const record = this.careers.getProfessionRecord(professionId);
    if (!record) return undefined;
    return this.careers.getRankForLevel(professionId, record.level);
  }

  /**
   * Whether the player has reached at least the given rank (by rank id). Used as
   * a configurable unlock gate for assignments, facilities, and activities.
   * Returns `false` for unknown professions, unknown ranks, or un-enrolled players.
   */
  hasReachedRank(professionId: string, rankId: string): boolean {
    const profession = this.careers.getProfession(professionId);
    const record = this.careers.getProfessionRecord(professionId);
    if (!profession || !record) return false;
    const target = profession.ranks.find((r) => r.id === rankId);
    if (!target) return false;
    return record.level >= target.minLevel;
  }

  /**
   * Awards profession EXP, processing any resulting level-ups and rank
   * advancement. Never modifies character level or subject mastery.
   */
  awardProfessionExp(professionId: string, amount: number): ProfessionExpAwardResult {
    const profession = this.careers.getProfession(professionId);
    const record = this.careers.getProfessionRecord(professionId);

    if (!profession) {
      return progressionFailure(professionId, ProfessionProgressionFailureReason.UnknownProfession, `Unknown profession '${professionId}'.`);
    }
    if (!record) {
      return progressionFailure(professionId, ProfessionProgressionFailureReason.NotEnrolled, `You are not enrolled as a ${profession.name}.`);
    }

    const normalized = typeof amount === 'number' && Number.isFinite(amount) && amount > 0 ? amount : 0;
    const maxLevel = profession.experience.maxProfessionLevel;
    const previousLevel = record.level;
    const previousExp = record.exp;
    const previousRankId = record.rankId;

    let level = record.level;
    let exp = record.exp;
    let levelsGained = 0;

    if (level >= maxLevel) {
      exp = 0;
    } else if (normalized > 0) {
      exp += normalized;
      while (level < maxLevel) {
        const required = getProfessionExpForNextLevel(level, profession.experience);
        if (exp >= required) {
          exp -= required;
          level += 1;
          levelsGained += 1;
        } else {
          break;
        }
      }
      if (level >= maxLevel) {
        level = maxLevel;
        exp = 0;
      }
    }

    const updated = this.careers.applyProgression(professionId, {
      level,
      exp,
      reputation: record.reputation,
    });

    const newRankId = updated?.rankId ?? previousRankId;
    const expRequiredForNextLevel = level >= maxLevel ? 0 : getProfessionExpForNextLevel(level, profession.experience);

    return {
      success: true,
      professionId,
      expAwarded: normalized,
      previousLevel,
      newLevel: level,
      previousExp,
      currentExp: exp,
      expRequiredForNextLevel,
      leveledUp: levelsGained > 0,
      levelsGained,
      rankChanged: newRankId !== previousRankId,
      previousRankId,
      newRankId,
      record: updated,
      message:
        levelsGained > 0
          ? `Gained ${levelsGained} profession level(s) — now level ${level}.`
          : `Profession EXP recorded.`,
    };
  }

  /**
   * Awards profession reputation. Reputation is additive and never reduced here,
   * so incorrect answers do not incur severe penalties.
   */
  awardReputation(professionId: string, amount: number): ProfessionReputationAwardResult {
    const profession = this.careers.getProfession(professionId);
    const record = this.careers.getProfessionRecord(professionId);

    if (!profession) {
      return {
        success: false,
        professionId,
        reputationAwarded: 0,
        totalReputation: 0,
        reason: ProfessionProgressionFailureReason.UnknownProfession,
        message: `Unknown profession '${professionId}'.`,
      };
    }
    if (!record) {
      return {
        success: false,
        professionId,
        reputationAwarded: 0,
        totalReputation: 0,
        reason: ProfessionProgressionFailureReason.NotEnrolled,
        message: `You are not enrolled as a ${profession.name}.`,
      };
    }

    const normalized = typeof amount === 'number' && Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0;
    const updated = this.careers.applyProgression(professionId, {
      level: record.level,
      exp: record.exp,
      reputation: record.reputation + normalized,
    });

    return {
      success: true,
      professionId,
      reputationAwarded: normalized,
      totalReputation: updated?.reputation ?? record.reputation + normalized,
      message: `Reputation recorded.`,
    };
  }

  /**
   * Returns non-mutating progression info for an enrolled profession, or
   * `undefined` when the player is not enrolled.
   */
  getProgress(professionId: string): ProfessionProgressInfo | undefined {
    const profession = this.careers.getProfession(professionId);
    const record = this.careers.getProfessionRecord(professionId);
    if (!profession || !record) return undefined;

    const maxLevel = profession.experience.maxProfessionLevel;
    const isMaxLevel = record.level >= maxLevel;
    const requiredExp = isMaxLevel ? 0 : getProfessionExpForNextLevel(record.level, profession.experience);
    const progressRatio = isMaxLevel ? 1 : Math.min(1, record.exp / requiredExp);
    const rank = this.careers.getRankForLevel(professionId, record.level);

    return {
      professionId,
      level: record.level,
      currentExp: isMaxLevel ? 0 : record.exp,
      requiredExp,
      progressRatio,
      isMaxLevel,
      rankId: rank?.id ?? record.rankId,
      rankName: rank?.name ?? '',
    };
  }
}

function progressionFailure(
  professionId: string,
  reason: ProfessionProgressionFailureReason,
  message: string,
): ProfessionExpAwardResult {
  return {
    success: false,
    professionId,
    expAwarded: 0,
    previousLevel: 0,
    newLevel: 0,
    previousExp: 0,
    currentExp: 0,
    expRequiredForNextLevel: 0,
    leveledUp: false,
    levelsGained: 0,
    rankChanged: false,
    previousRankId: '',
    newRankId: '',
    reason,
    message,
  };
}

/** Shared default profession progression service instance. */
export const professionProgressionService = new ProfessionProgressionService();
