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
 * Shortest structurally valid per-question timer, in whole seconds.
 * Matches the admin form minimum. Very short timers are still an authoring
 * concern and are reported by the content-standards audit.
 */
export const QUESTION_TIMER_MIN_SECONDS = 1;

/**
 * Longest structurally valid per-question timer, in whole seconds.
 * Prevents malformed or unbounded timer values from entering the bank.
 */
export const QUESTION_TIMER_MAX_SECONDS = 600;

/** Suggested lower bound for playable timers. Advisory only. */
export const QUESTION_TIMER_RECOMMENDED_MIN_SECONDS = 5;

/** Suggested upper bound for playable timers. Advisory only. */
export const QUESTION_TIMER_RECOMMENDED_MAX_SECONDS = 180;

/** Maximum length of a stable question id. UUIDs and bundled slugs fit inside this. */
export const QUESTION_ID_MAX_LENGTH = 64;

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

/**
 * Optional human workflow marker for a question.
 *
 * Absence means no review has been recorded. These values are authoring
 * labels only. They are not expert certification and they are not a
 * factual-accuracy verdict.
 */
export enum ContentReviewStatus {
  Unreviewed = 'unreviewed',
  AuthorChecked = 'author-checked',
  NeedsRevision = 'needs-revision',
}

/**
 * Optional author-supplied citation. The game stores the text and does not
 * verify, fetch, or invent it.
 */
export interface QuestionSource {
  /** Citation label written by an author. */
  label: string;
  /** Optional page, section, or URL stored as text. */
  locator?: string;
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
   * Optional narrower topic. Omission is valid. Existing records are not
   * rewritten to add one.
   */
  subtopic?: string;
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
  /**
   * Explanation shown to the player after answering (correct or incorrect).
   * Recommended for new questions. Omission stays structurally valid so
   * existing records are not rejected or rewritten.
   */
  explanation?: string;
  /**
   * Optional author-supplied source. Omission does not mean the question
   * was reviewed, and the game never fills this in automatically.
   */
  source?: QuestionSource;

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
  /**
   * Optional profession tags (Phase 27.4). Used to prioritise profession-relevant
   * questions when serving professional assignments. Matches a profession's
   * `questionTags`. Purely additive — existing questions remain valid without it.
   */
  professionTags?: string[];
  /**
   * Optional specialty tags (Phase 27.4). A narrower facet within a profession
   * (e.g. "cardiology"). Optional and backward-compatible.
   */
  specialtyTags?: string[];
  /** Publication lifecycle state. Only Published questions are served in combat. */
  status: QuestionStatus;
  /**
   * Optional human review marker. Omission means unreviewed.
   * Never assigned by validation or import.
   */
  reviewStatus?: ContentReviewStatus;
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
