import type { EducationalTier, SubjectId } from './education';

// ─── Difficulty ──────────────────────────────────────────────────────────────

/**
 * Minimum allowed difficulty value (inclusive).
 * A difficulty-1 question is the easiest within its educational tier.
 */
export const QUESTION_DIFFICULTY_MIN = 1;

/**
 * Maximum allowed difficulty value (inclusive).
 * A difficulty-5 question is the hardest within its educational tier.
 */
export const QUESTION_DIFFICULTY_MAX = 5;

/**
 * Pure guard: returns true when `d` is an integer in [QUESTION_DIFFICULTY_MIN,
 * QUESTION_DIFFICULTY_MAX].
 *
 * Use this in data-validation layers (admin CRUD, import pipelines) rather
 * than in hot combat paths.
 */
export function isValidDifficulty(d: number): boolean {
  return Number.isInteger(d) && d >= QUESTION_DIFFICULTY_MIN && d <= QUESTION_DIFFICULTY_MAX;
}

// ─── Question type ───────────────────────────────────────────────────────────

/**
 * Supported question formats.
 *
 * - MultipleChoice: Player picks one choice from `choices[]`.
 *   `correctAnswer` stores the matching `choiceId`.
 * - Identification:  Player types a short answer.
 *   `correctAnswer` holds the canonical form; `acceptedAnswers` lists
 *   accepted alternatives (case-insensitive comparison recommended).
 * - Essay: Player writes a long-form answer.
 *   Graded against `expectedAnswer`; full auto-grading is a future feature.
 *   A human/admin review step may be required.
 */
export enum QuestionType {
  MultipleChoice = 'multiple-choice',
  Identification = 'identification',
  Essay          = 'essay',
}

// ─── Status ──────────────────────────────────────────────────────────────────

/**
 * Publication lifecycle for a question record.
 *
 * - Draft:     Under construction; never served in combat or practice.
 * - Published: Active; eligible for combat retrieval and mastery tracking.
 * - Archived:  Retired; excluded from retrieval but preserved for history.
 */
export enum QuestionStatus {
  Draft     = 'draft',
  Published = 'published',
  Archived  = 'archived',
}

// ─── Answer choice ───────────────────────────────────────────────────────────

/**
 * A single answer option for a multiple-choice question.
 * The display order is controlled by the presentation layer (shuffled at
 * battle-start); `choiceId` is stable and used for correct-answer matching.
 */
export interface QuestionChoice {
  /** Stable choice identifier — not affected by display shuffling. */
  choiceId: string;
  /** Answer text displayed to the player. */
  text: string;
}

// ─── Question record ─────────────────────────────────────────────────────────

/**
 * Complete question record as stored in the IndexedDB question database.
 *
 * Field applicability by question type:
 *
 * | Field           | MultipleChoice | Identification | Essay |
 * |-----------------|:--------------:|:--------------:|:-----:|
 * | choices         | required       | —              | —     |
 * | correctAnswer   | required (id)  | required (txt) | —     |
 * | acceptedAnswers | —              | optional       | —     |
 * | expectedAnswer  | —              | —              | recommended |
 *
 * The retrieval engine must not surface a question whose `status` is not
 * `QuestionStatus.Published`.
 */
export interface Question {
  // ── Identity ──────────────────────────────────────────────────────────────

  /** Unique question identifier (UUID or admin-assigned slug). */
  id: string;

  // ── Classification ────────────────────────────────────────────────────────

  /** Educational tier this question belongs to. */
  educationalTier: EducationalTier;
  /** Academic subject. */
  subject: SubjectId;
  /** Specific topic within the subject (e.g., "fractions", "photosynthesis"). */
  topic: string;
  /**
   * Relative difficulty within the educational tier.
   * Valid range: QUESTION_DIFFICULTY_MIN (1) – QUESTION_DIFFICULTY_MAX (5).
   * 1 = easiest, 5 = hardest.
   */
  difficulty: number;

  // ── Format ────────────────────────────────────────────────────────────────

  /** Question format type. Determines which answer fields are relevant. */
  type: QuestionType;

  // ── Content ───────────────────────────────────────────────────────────────

  /** The question stem displayed to the player. */
  question: string;
  /**
   * Answer choices — required for MultipleChoice questions.
   * Should contain 2–5 entries (typically 4).
   * Omit or leave undefined for Identification and Essay.
   */
  choices?: QuestionChoice[];
  /**
   * For MultipleChoice: the `choiceId` of the correct choice.
   * For Identification: the canonical correct answer string.
   * For Essay: omit — use `expectedAnswer` instead.
   */
  correctAnswer?: string;
  /**
   * Alternative accepted spellings or phrasings (Identification only).
   * Comparison should be case-insensitive and trim-normalised.
   * Example: ["NaCl", "sodium chloride", "table salt"]
   */
  acceptedAnswers?: string[];
  /**
   * Model answer or grading rubric (Essay only).
   * Used as a reference by admin reviewers and future auto-grading.
   */
  expectedAnswer?: string;
  /** Explanation shown to the player after answering (correct or incorrect). */
  explanation?: string;

  // ── Timing ────────────────────────────────────────────────────────────────

  /**
   * Per-question time limit in seconds.
   * The combat engine falls back to a subject-level default when this is 0.
   * Timeout counts as an incorrect answer (player takes damage).
   */
  timeLimit: number;

  // ── Progression ───────────────────────────────────────────────────────────

  /**
   * Base subject mastery EXP awarded for a correct answer in combat.
   * Modified by combat modifiers (speed bonus, streak) at the call site.
   * Must be > 0 for Published questions.
   */
  baseMasteryExp: number;

  // ── Metadata ──────────────────────────────────────────────────────────────

  /** Searchable keyword tags for admin filtering (e.g., ["addition", "grade3"]). */
  tags?: string[];
  /** Publication lifecycle state. Only Published questions are served in combat. */
  status: QuestionStatus;
  /**
   * ISO 8601 timestamp of when this record was first created.
   * Set by the admin creation service; never updated after initial save.
   */
  createdAt: string;
  /**
   * ISO 8601 timestamp of the most recent modification.
   * Updated by any admin edit operation.
   */
  updatedAt: string;
}
