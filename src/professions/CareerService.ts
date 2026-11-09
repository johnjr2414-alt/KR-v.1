import {
  CAREER_SNAPSHOT_VERSION,
  EnrollmentFailureReason,
  ProfessionEnrollmentStatus,
  type CareerSnapshot,
  type EnrollmentCheck,
  type EnrollmentContext,
  type EnrollmentRequirementStatus,
  type EnrollmentResult,
  type ProfessionAssignmentRecord,
  type ProfessionCareerRecord,
  type ProfessionCategoryDefinition,
  type ProfessionDefinition,
  type ProfessionProgressionUpdate,
  type ProfessionRankDefinition,
} from './ProfessionTypes';
import { PROFESSION_CATEGORY_DEFINITIONS } from './ProfessionCategories';
import { PROFESSION_DEFINITIONS } from './ProfessionRegistry';

export interface CareerServiceOptions {
  /** Profession catalogue. Defaults to the shared {@link PROFESSION_DEFINITIONS}. */
  professions?: readonly ProfessionDefinition[];
  /** Category catalogue. Defaults to the shared {@link PROFESSION_CATEGORY_DEFINITIONS}. */
  categories?: readonly ProfessionCategoryDefinition[];
  /** Clock used for enrollment timestamps. Injectable for deterministic tests. */
  now?: () => number;
}

/**
 * Headless career/profession service (Phase 27.1).
 *
 * Tracks a player's career profile — one independent {@link ProfessionCareerRecord}
 * per enrolled profession — and evaluates enrollment requirements against a
 * caller-supplied {@link EnrollmentContext}. Duplicate enrollment in the same
 * profession is structurally impossible: a second attempt is rejected before
 * any requirement evaluation or gold deduction.
 *
 * All rules are data-driven off the injected profession catalogue; adding a
 * profession to configuration requires no change here.
 */
export class CareerService {
  private readonly professions: Map<string, ProfessionDefinition>;
  private readonly categories: Map<string, ProfessionCategoryDefinition>;
  private readonly now: () => number;
  private readonly records = new Map<string, ProfessionCareerRecord>();

  constructor(options: CareerServiceOptions = {}) {
    const definitions = options.professions ?? PROFESSION_DEFINITIONS;
    this.professions = new Map(definitions.map((profession) => [profession.id, profession]));

    const categories = options.categories ?? PROFESSION_CATEGORY_DEFINITIONS;
    this.categories = new Map(categories.map((category) => [category.id, category]));

    this.now = options.now ?? (() => Date.now());
  }

  // ── Catalogue access ──────────────────────────────────────────────────────

  /** Returns a profession definition, or `undefined` when unknown. */
  getProfession(professionId: string): ProfessionDefinition | undefined {
    return this.professions.get(professionId);
  }

  /** Returns every registered profession definition. */
  getProfessions(): ProfessionDefinition[] {
    return [...this.professions.values()];
  }

  /** Returns every profession belonging to a category. */
  getProfessionsByCategory(categoryId: string): ProfessionDefinition[] {
    return [...this.professions.values()].filter((p) => p.categoryId === categoryId);
  }

  /** Returns a category definition, or `undefined` when unknown. */
  getCategory(categoryId: string): ProfessionCategoryDefinition | undefined {
    return this.categories.get(categoryId);
  }

  /** Returns every registered category definition. */
  getCategories(): ProfessionCategoryDefinition[] {
    return [...this.categories.values()];
  }

  /**
   * Resolves the rank a profession level maps to. Returns `undefined` when the
   * profession is unknown or defines no ranks.
   */
  getRankForLevel(professionId: string, level: number): ProfessionRankDefinition | undefined {
    const profession = this.professions.get(professionId);
    if (!profession || profession.ranks.length === 0) return undefined;

    const sorted = [...profession.ranks].sort((a, b) => a.minLevel - b.minLevel);
    let current = sorted[0];
    for (const rank of sorted) {
      if (level >= rank.minLevel) {
        current = rank;
      } else {
        break;
      }
    }
    return current;
  }

  // ── Career profile ────────────────────────────────────────────────────────

  /** Returns a copy of the career record for a profession, or `undefined`. */
  getProfessionRecord(professionId: string): ProfessionCareerRecord | undefined {
    const record = this.records.get(professionId);
    return record ? cloneRecord(record) : undefined;
  }

  /** Returns copies of every career record. */
  getAllRecords(): ProfessionCareerRecord[] {
    return [...this.records.values()].map(cloneRecord);
  }

  /** Whether the player is currently enrolled in a profession. */
  isEnrolled(professionId: string): boolean {
    return this.records.has(professionId);
  }

  /**
   * Appends a completed professional assignment to the enrolled profession's
   * career record. Returns `false` (no-op) when the player is not enrolled, so
   * assignment completions are never recorded for a profession the player has
   * not joined.
   */
  recordAssignmentCompletion(
    professionId: string,
    assignmentId: string,
    completedAt?: number,
  ): boolean {
    const record = this.records.get(professionId);
    if (!record) return false;

    record.assignmentHistory.push({
      assignmentId,
      completedAt:
        typeof completedAt === 'number' && Number.isFinite(completedAt) ? completedAt : this.now(),
    });
    return true;
  }

  /**
   * Applies a computed progression update (level, EXP, reputation) to an
   * enrolled profession. The level is clamped to the profession's configured
   * range, the current rank is re-derived from the new level, and the record is
   * marked {@link ProfessionEnrollmentStatus.Graduated} once the profession's
   * maximum level is reached. Returns the updated record, or `undefined` when the
   * player is not enrolled.
   *
   * Progression *rules* live in
   * {@link import('./ProfessionProgressionService').ProfessionProgressionService};
   * this is the store operation that persists their result.
   */
  applyProgression(
    professionId: string,
    update: ProfessionProgressionUpdate,
  ): ProfessionCareerRecord | undefined {
    const record = this.records.get(professionId);
    const profession = this.professions.get(professionId);
    if (!record || !profession) return undefined;

    const maxLevel = profession.experience.maxProfessionLevel;
    const level = clampInt(update.level, 1, maxLevel);
    // At maximum level no further EXP accrues toward a next level.
    const exp = level >= maxLevel ? 0 : clampInt(update.exp, 0, Number.MAX_SAFE_INTEGER);
    const rank = this.getRankForLevel(professionId, level);

    record.level = level;
    record.exp = exp;
    record.rankId = rank?.id ?? record.rankId;
    record.reputation = clampInt(update.reputation, 0, Number.MAX_SAFE_INTEGER);
    if (level >= maxLevel) {
      record.status = ProfessionEnrollmentStatus.Graduated;
    }
    return cloneRecord(record);
  }

  // ── Enrollment ────────────────────────────────────────────────────────────

  /**
   * Non-mutating eligibility check against the supplied context. Never throws;
   * an unknown profession yields a failed check with an explanatory message.
   */
  checkEnrollment(professionId: string, ctx: EnrollmentContext): EnrollmentCheck {
    const profession = this.professions.get(professionId);
    if (!profession) {
      return {
        canEnroll: false,
        reasons: [EnrollmentFailureReason.UnknownProfession],
        requirements: [],
        message: `Unknown profession '${professionId}'.`,
      };
    }

    if (this.records.has(professionId)) {
      return {
        canEnroll: false,
        reasons: [EnrollmentFailureReason.AlreadyEnrolled],
        requirements: [],
        message: `You are already enrolled as a ${profession.name}.`,
      };
    }

    const reasons: EnrollmentFailureReason[] = [];
    const requirements: EnrollmentRequirementStatus[] = [];
    const enrollment = profession.enrollment;

    if (enrollment.minCharacterLevel !== undefined) {
      const satisfied = ctx.characterLevel >= enrollment.minCharacterLevel;
      requirements.push({
        label: `Character level ${enrollment.minCharacterLevel}`,
        satisfied,
        detail: satisfied ? undefined : `Requires character level ${enrollment.minCharacterLevel} (you are ${ctx.characterLevel}).`,
      });
      if (!satisfied) reasons.push(EnrollmentFailureReason.LevelTooLow);
    }

    if (Array.isArray(enrollment.mastery)) {
      for (const req of enrollment.mastery) {
        const current = ctx.getMasteryLevel ? ctx.getMasteryLevel(req.subject) : 0;
        const satisfied = current >= req.minLevel;
        requirements.push({
          label: `${req.subject} mastery ${req.minLevel}`,
          satisfied,
          detail: satisfied ? undefined : `Requires ${req.subject} mastery ${req.minLevel} (you have ${current}).`,
        });
        if (!satisfied) reasons.push(EnrollmentFailureReason.MasteryTooLow);
      }
    }

    if (enrollment.goldCost !== undefined && enrollment.goldCost > 0) {
      const gold = ctx.gold ?? 0;
      const satisfied = gold >= enrollment.goldCost;
      requirements.push({
        label: `${enrollment.goldCost} gold`,
        satisfied,
        detail: satisfied ? undefined : `Requires ${enrollment.goldCost} gold (you have ${gold}).`,
      });
      if (!satisfied) reasons.push(EnrollmentFailureReason.InsufficientGold);
    }

    if (Array.isArray(enrollment.prerequisiteQuestIds)) {
      for (const questId of enrollment.prerequisiteQuestIds) {
        const satisfied = ctx.isQuestCompleted ? ctx.isQuestCompleted(questId) : false;
        requirements.push({
          label: `Quest: ${questId}`,
          satisfied,
          detail: satisfied ? undefined : `Requires quest '${questId}' to be completed.`,
        });
        if (!satisfied) reasons.push(EnrollmentFailureReason.PrerequisiteQuest);
      }
    }

    const canEnroll = reasons.length === 0;
    return {
      canEnroll,
      reasons,
      requirements,
      message: canEnroll
        ? `You can enroll as a ${profession.name}.`
        : requirements.find((r) => !r.satisfied)?.detail ?? `Cannot enroll as a ${profession.name}.`,
    };
  }

  /**
   * Attempts to enroll the player in a profession. Requirements are fully
   * validated before any state change; gold is deducted only after every other
   * requirement passes, and only when the deduction succeeds is the career
   * record created (no partial enrollment).
   */
  enroll(professionId: string, ctx: EnrollmentContext): EnrollmentResult {
    const profession = this.professions.get(professionId);
    if (!profession) {
      return {
        success: false,
        professionId,
        reason: EnrollmentFailureReason.UnknownProfession,
        message: `Unknown profession '${professionId}'.`,
      };
    }

    if (this.records.has(professionId)) {
      return {
        success: false,
        professionId,
        reason: EnrollmentFailureReason.AlreadyEnrolled,
        message: `You are already enrolled as a ${profession.name}.`,
      };
    }

    const check = this.checkEnrollment(professionId, ctx);
    if (!check.canEnroll) {
      return {
        success: false,
        professionId,
        reason: check.reasons[0],
        message: check.message,
      };
    }

    const goldCost = profession.enrollment.goldCost ?? 0;
    if (goldCost > 0 && ctx.spendGold && !ctx.spendGold(goldCost)) {
      return {
        success: false,
        professionId,
        reason: EnrollmentFailureReason.InsufficientGold,
        message: `Insufficient gold to enroll as a ${profession.name}.`,
      };
    }

    const record: ProfessionCareerRecord = {
      professionId,
      level: 1,
      exp: 0,
      rankId: profession.ranks[0]?.id ?? '',
      reputation: 0,
      status: ProfessionEnrollmentStatus.Enrolled,
      assignmentHistory: [],
      enrolledAt: this.now(),
    };
    this.records.set(professionId, record);

    return {
      success: true,
      professionId,
      record: cloneRecord(record),
      message: `You are now enrolled as a ${profession.name}.`,
    };
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  /** Returns a serialisable snapshot of the career profile. */
  snapshot(): CareerSnapshot {
    return {
      version: CAREER_SNAPSHOT_VERSION,
      professions: [...this.records.values()].map(cloneRecord),
    };
  }

  /**
   * Restores the career profile. Records referencing professions absent from the
   * current catalogue are dropped (handled safely); missing fields fall back to
   * defaults. Passing an unusable payload clears the profile.
   */
  loadSnapshot(snapshot: CareerSnapshot | undefined): void {
    this.records.clear();
    if (!snapshot || !Array.isArray(snapshot.professions)) return;

    for (const raw of snapshot.professions) {
      const profession = this.professions.get(raw.professionId);
      if (!profession) continue; // unknown profession — skip safely
      this.records.set(raw.professionId, normalizeCareerRecord(raw, profession));
    }
  }
}

function cloneRecord(record: ProfessionCareerRecord): ProfessionCareerRecord {
  return {
    ...record,
    assignmentHistory: record.assignmentHistory.map((a) => ({ ...a })),
  };
}

/** Clamps a possibly invalid number into an integer within `[min, max]`. */
function clampInt(value: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return min;
  return Math.min(Math.max(Math.floor(value), min), max);
}

/** Repairs a persisted record into a valid record for a known profession. */
function normalizeCareerRecord(
  raw: ProfessionCareerRecord,
  profession: ProfessionDefinition,
): ProfessionCareerRecord {
  const level =
    typeof raw.level === 'number' && Number.isFinite(raw.level) && raw.level >= 1
      ? Math.floor(raw.level)
      : 1;

  const validRankIds = new Set(profession.ranks.map((r) => r.id));
  const rankId = typeof raw.rankId === 'string' && validRankIds.has(raw.rankId)
    ? raw.rankId
    : profession.ranks[0]?.id ?? '';

  const status = Object.values(ProfessionEnrollmentStatus).includes(raw.status)
    ? raw.status
    : ProfessionEnrollmentStatus.Enrolled;

  const assignmentHistory: ProfessionAssignmentRecord[] = Array.isArray(raw.assignmentHistory)
    ? raw.assignmentHistory
        .filter((a): a is ProfessionAssignmentRecord => !!a && typeof a.assignmentId === 'string')
        .map((a) => ({
          assignmentId: a.assignmentId,
          completedAt: typeof a.completedAt === 'number' && Number.isFinite(a.completedAt) ? a.completedAt : 0,
        }))
    : [];

  return {
    professionId: profession.id,
    level,
    exp: typeof raw.exp === 'number' && Number.isFinite(raw.exp) && raw.exp >= 0 ? raw.exp : 0,
    rankId,
    reputation:
      typeof raw.reputation === 'number' && Number.isFinite(raw.reputation) && raw.reputation >= 0
        ? raw.reputation
        : 0,
    status,
    assignmentHistory,
    enrolledAt:
      typeof raw.enrolledAt === 'number' && Number.isFinite(raw.enrolledAt) && raw.enrolledAt >= 0
        ? raw.enrolledAt
        : 0,
  };
}

/**
 * Sanitises an unknown value into a {@link CareerSnapshot}, or `undefined` when
 * the payload is unusable. Backward-compatible: absent career data is valid and
 * produces `undefined`.
 */
export function sanitizeCareerSnapshot(raw: unknown): CareerSnapshot | undefined {
  if (!raw || typeof raw !== 'object') return undefined;

  const candidate = raw as Partial<CareerSnapshot>;
  const version =
    typeof candidate.version === 'number' && Number.isInteger(candidate.version) && candidate.version > 0
      ? candidate.version
      : CAREER_SNAPSHOT_VERSION;

  const professions: ProfessionCareerRecord[] = [];
  if (Array.isArray(candidate.professions)) {
    for (const entry of candidate.professions) {
      if (!entry || typeof entry !== 'object') continue;
      const record = entry as Partial<ProfessionCareerRecord>;
      if (typeof record.professionId !== 'string' || !record.professionId) continue;
      professions.push(record as ProfessionCareerRecord);
    }
  }

  return { version, professions };
}

/** Shared default career service instance. */
export const careerService = new CareerService();
