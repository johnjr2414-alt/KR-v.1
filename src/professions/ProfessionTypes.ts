/**
 * Real-World Professions & Career framework (Phase 27.1).
 *
 * Headless, data-driven types describing profession categories, profession
 * definitions, configurable rank ladders, enrollment requirements, and the
 * per-player career profile. No Phaser/DOM dependencies live here.
 *
 * A profession is intentionally more than a label: it carries associated
 * workplaces, responsibilities, knowledge tags, and its own progression ladder.
 * The framework models only what Phase 27.1 requires — later sub-phases add
 * workplaces, assignments, question integration, and progression application.
 */

import type { SubjectId } from '../core/types/education';

/**
 * Configurable profession category (e.g. Healthcare, Engineering and
 * Technology). Categories are additive data, never hardcoded limitations.
 */
export interface ProfessionCategoryDefinition {
  /** Unique category identifier (slug). */
  id: string;
  /** Display name. */
  name: string;
  /** Short description of the field. */
  description: string;
}

/** One rung of a profession's rank ladder. */
export interface ProfessionRankDefinition {
  /** Unique within the owning profession. */
  id: string;
  /** Display name (e.g. "Medical Trainee"). */
  name: string;
  /** Minimum profession level required to hold this rank. */
  minLevel: number;
}

/** A single subject-mastery gate within an enrollment requirement. */
export interface SubjectMasteryRequirement {
  subject: SubjectId;
  /** Minimum mastery level for `subject`. */
  minLevel: number;
}

/**
 * Optional, configurable gate applied when enrolling in a profession.
 * Not every profession must use every condition — omit what does not apply.
 */
export interface ProfessionEnrollmentRequirement {
  /** Minimum character (combat) level. */
  minCharacterLevel?: number;
  /** Minimum subject mastery levels. */
  mastery?: SubjectMasteryRequirement[];
  /** One-time gold cost deducted on successful enrollment. */
  goldCost?: number;
  /** Quests that must be completed before enrolling. */
  prerequisiteQuestIds?: string[];
}

/** EXP progression settings describing a profession's level ladder. */
export interface ProfessionExperienceSettings {
  /** Highest attainable profession level. */
  maxProfessionLevel: number;
  /** EXP required to advance from profession level 1 → 2. */
  baseExp: number;
  /** Geometric growth factor applied to each successive level. */
  growthFactor: number;
}

/**
 * Optional specialization metadata for future expansion. Specializations are
 * defined here but their gameplay is out of scope for Phase 27.1.
 */
export interface ProfessionSpecializationDefinition {
  /** Unique within the owning profession. */
  id: string;
  name: string;
  description: string;
  /** Minimum profession level required to unlock. */
  minLevel: number;
}

/**
 * Static definition describing one real-world profession. New professions are
 * added purely through configuration without changing core logic.
 */
export interface ProfessionDefinition {
  /** Unique profession identifier (slug). */
  id: string;
  /** Display name. */
  name: string;
  /** Owning category id; must resolve against the category registry. */
  categoryId: string;
  /** Short description of the profession. */
  description: string;
  /** Player-facing responsibilities (flavour + future assignment hooks). */
  responsibilities: string[];
  /**
   * Associated workplace ids. Resolved/validated in Phase 27.2 once the
   * workplace registry exists; stored as stable string references here.
   */
  workplaceIds: string[];
  /** Optional enrollment gate. */
  enrollment: ProfessionEnrollmentRequirement;
  /** Ordered rank ladder (ascending by `minLevel`). */
  ranks: ProfessionRankDefinition[];
  /** EXP progression settings. */
  experience: ProfessionExperienceSettings;
  /** Tags used for profession-specific question retrieval (Phase 27.4). */
  questionTags: string[];
  /** Subjects most relevant to this profession. */
  subjectTags: SubjectId[];
  /** Optional specialization definitions for future expansion. */
  specializations?: ProfessionSpecializationDefinition[];
  /** Marks balance values as provisional / draft. */
  provisional: boolean;
}

/** Lifecycle status of an enrolled profession on a player's career profile. */
export enum ProfessionEnrollmentStatus {
  /** Currently pursuing the profession. */
  Enrolled = 'enrolled',
  /** Completed the profession's progression ladder. */
  Graduated = 'graduated',
}

/**
 * Value update applied to an enrolled profession's progression by
 * {@link import('./CareerService').CareerService.applyProgression}. Progression
 * rules (EXP curve, level-up, rank derivation) live in
 * {@link import('./ProfessionProgressionService').ProfessionProgressionService};
 * this is the store operation that persists their computed result.
 */
export interface ProfessionProgressionUpdate {
  /** New profession level (clamped to `[1, maxProfessionLevel]`). */
  level: number;
  /** New accumulated profession EXP toward the next level. */
  exp: number;
  /** New accumulated reputation within the profession. */
  reputation: number;
}

/** A record of one completed professional assignment (populated in Phase 27.3+). */
export interface ProfessionAssignmentRecord {
  assignmentId: string;
  completedAt: number;
}

/**
 * Per-profession career progress for a player. Each enrolled profession is
 * tracked independently (its own level, EXP, rank, reputation, and history).
 */
export interface ProfessionCareerRecord {
  /** Profession this record belongs to. */
  professionId: string;
  /** Profession level (independent of character level). */
  level: number;
  /** Accumulated profession EXP toward the next level. */
  exp: number;
  /** Current rank id, resolved against the profession's rank ladder. */
  rankId: string;
  /** Accumulated reputation within the profession. */
  reputation: number;
  /** Enrollment lifecycle status. */
  status: ProfessionEnrollmentStatus;
  /** Chronological assignment history (empty until Phase 27.3+). */
  assignmentHistory: ProfessionAssignmentRecord[];
  /** Timestamp (ms) the player enrolled. */
  enrolledAt: number;
}

export const CAREER_SNAPSHOT_VERSION = 1;

/** Optional, backward-compatible save payload for career/profession state. */
export interface CareerSnapshot {
  version: number;
  professions: ProfessionCareerRecord[];
}

/**
 * Caller-supplied context used to evaluate enrollment requirements. Keeping
 * this a plain object keeps {@link import('./CareerService').CareerService}
 * headless and independent from the manager/session layer.
 */
export interface EnrollmentContext {
  /** Player character (combat) level. */
  characterLevel: number;
  /** Resolves the player's mastery level for a subject. */
  getMasteryLevel?: (subject: SubjectId) => number;
  /** Player gold balance, for display/eligibility checks. */
  gold?: number;
  /**
   * Deducts gold. Must return `false` when funds are insufficient. When the
   * requirement has a gold cost but this callback is absent, no gold is
   * deducted (the caller is responsible for currency handling).
   */
  spendGold?: (amount: number) => boolean;
  /** Reports whether a quest has been completed. */
  isQuestCompleted?: (questId: string) => boolean;
}

/** Why an enrollment attempt could not proceed. */
export enum EnrollmentFailureReason {
  UnknownProfession = 'unknown-profession',
  AlreadyEnrolled = 'already-enrolled',
  LevelTooLow = 'level-too-low',
  MasteryTooLow = 'mastery-too-low',
  InsufficientGold = 'insufficient-gold',
  PrerequisiteQuest = 'prerequisite-quest',
}

/** Per-requirement evaluation entry, useful for UI display. */
export interface EnrollmentRequirementStatus {
  /** Human-readable label of the requirement. */
  label: string;
  /** Whether the requirement is currently satisfied. */
  satisfied: boolean;
  /** Optional detail string (e.g. "requires level 5"). */
  detail?: string;
}

/** Result of a non-mutating enrollment eligibility check. */
export interface EnrollmentCheck {
  canEnroll: boolean;
  /** Failure reasons (each failed requirement); empty when `canEnroll`. */
  reasons: EnrollmentFailureReason[];
  /** Full per-requirement breakdown. */
  requirements: EnrollmentRequirementStatus[];
  /** Player-facing summary message. */
  message: string;
}

/** Result of an enrollment attempt. */
export interface EnrollmentResult {
  success: boolean;
  professionId: string;
  /** Newly created career record (present only on success). */
  record?: ProfessionCareerRecord;
  /** First blocking reason (present only on failure). */
  reason?: EnrollmentFailureReason;
  /** Player-facing summary message. */
  message: string;
}
