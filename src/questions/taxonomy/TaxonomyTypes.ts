import type { EducationalTier, SubjectId } from '../../core/types/education';

/**
 * A subject node in the question taxonomy.
 *
 * `id` is the stable identifier (it matches {@link SubjectId}) and never
 * changes with the display label. `displayName` and `description` are
 * presentation text and may be edited freely.
 */
export interface SubjectTaxonomyEntry {
  /** Stable subject identifier. Independent of `displayName`. */
  id: SubjectId;
  /** Human-readable label shown in the admin UI. */
  displayName: string;
  /** Short description of the discipline. */
  description: string;
  /**
   * Educational tiers this subject is intended to cover. Empty when no
   * bundled content exists for the subject yet.
   */
  tiers: EducationalTier[];
}

/**
 * A subtopic node nested under a topic.
 *
 * Subtopics are optional. No bundled question records one today, so the
 * schema supports them without inventing structure that the data lacks.
 */
export interface SubtopicTaxonomyEntry {
  /** Stable subtopic identifier, unique within its parent topic. */
  id: string;
  displayName: string;
  description: string;
}

/** A topic node in the question taxonomy. */
export interface TopicTaxonomyEntry {
  /**
   * Stable, globally unique topic identifier in the form
   * `<subjectId>.<topicSlug>` (for example `mathematics.addition`).
   */
  id: string;
  /** Parent subject this topic belongs to. */
  subject: SubjectId;
  /** Human-readable label shown in the admin UI. */
  displayName: string;
  /** Short description of the topic. */
  description: string;
  /** Educational tiers this topic is intended to cover. */
  tiers: EducationalTier[];
  /** Optional nested subtopics. Empty when none are defined. */
  subtopics: SubtopicTaxonomyEntry[];
}

/**
 * One reviewable mapping entry.
 *
 * Links a raw `question.topic` string stored in existing data to a
 * canonical taxonomy topic. This table is how content is reclassified —
 * question records are never rewritten automatically.
 */
export interface TopicMappingEntry {
  /** Subject the raw topic string appears under. */
  subject: SubjectId;
  /** The exact `topic` string stored on a question record. */
  rawTopic: string;
  /** Canonical taxonomy topic id the raw string resolves to. */
  topicId: string;
}

/** A single taxonomy integrity problem. */
export interface TaxonomyValidationIssue {
  /** Short stable machine code (for example `duplicate-topic-id`). */
  code: string;
  /** Field or node where the issue was found. */
  field: string;
  /** Human-readable explanation. */
  message: string;
}

/** Result of validating a taxonomy dataset. */
export interface TaxonomyValidationResult {
  isValid: boolean;
  issues: TaxonomyValidationIssue[];
}

/** Result of matching a single question's metadata against the taxonomy. */
export interface QuestionTopicClassification {
  subject: SubjectTaxonomyEntry | undefined;
  topic: TopicTaxonomyEntry | undefined;
  /** True when `(subject, topic)` resolves to a taxonomy topic. */
  mapped: boolean;
  /** Resolved subtopic when one is declared, otherwise undefined. */
  subtopic: SubtopicTaxonomyEntry | undefined;
  /** False when a record names a subtopic the topic does not declare. */
  subtopicMapped: boolean;
  /** Explanation, populated when the record is not mapped. */
  reason: string;
}

/** Per-subject tally inside a coverage report. */
export interface SubjectCoverageSummary {
  subject: SubjectId;
  total: number;
  mapped: number;
  unmapped: number;
}

/** Per-topic tally inside a coverage report. */
export interface TopicCoverageSummary {
  topicId: string;
  subject: SubjectId;
  questionCount: number;
  tiers: EducationalTier[];
}

/** Non-mutating audit of how well the taxonomy covers the existing bank. */
export interface TaxonomyCoverageReport {
  totalQuestions: number;
  mappedCount: number;
  unmappedCount: number;
  unmappedQuestions: Array<{ id: string; subject: SubjectId; topic: string }>;
  bySubject: SubjectCoverageSummary[];
  byTopic: TopicCoverageSummary[];
  /** Subjects that have at least one topic entry. */
  subjectsWithContent: SubjectId[];
  /** Declared subjects that still have no topic entries. */
  subjectsWithoutContent: SubjectId[];
}
