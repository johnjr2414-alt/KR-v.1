import type { EducationalTier, SubjectId } from '../core/types/education';

/**
 * A single recorded answer attempt. This is the smallest unit the learning
 * analytics engine consumes. `eventId` is the deduplication key: applying the
 * same event twice must not change any statistic.
 *
 * Only data the game can actually observe is recorded here. Nothing personally
 * identifying is stored — a question id, a subject, an outcome, and timings.
 */
export interface AnswerAttemptEvent {
  /** Stable, unique id used to deduplicate re-applied events. */
  eventId: string;
  /** Question that was answered. */
  questionId: string;
  /** Academic subject of the question. */
  subject: SubjectId;
  /** Authoring topic string (raw `question.topic`). */
  topic: string;
  /** Educational tier the question belonged to. */
  educationalTier: EducationalTier;
  /** Within-tier difficulty (1–5) of the question. */
  difficulty: number;
  /** Whether the attempt was answered correctly. */
  isCorrect: boolean;
  /** When the attempt happened (epoch milliseconds). */
  answeredAt: number;
  /** Time limit that applied to the attempt, in whole seconds. */
  timeLimitSeconds: number;
  /** Time remaining when the attempt was submitted, in seconds. */
  timeRemainingSeconds: number;
  /**
   * Measured answer time in milliseconds. Omit when the game cannot record it
   * reliably — the average answer time ignores events without this field.
   */
  answerTimeMs?: number;
}

/** Rolling correct/answered counters for one question. */
export interface QuestionAggregate {
  answered: number;
  correct: number;
}

/** Correct/answered counters plus answer-time accumulation for a grouping. */
export interface AccuracyAggregate {
  answered: number;
  correct: number;
  /** Sum of measured answer times, in milliseconds. */
  answerTimeMs: number;
  /** Number of attempts that contributed a measured answer time. */
  answerTimeSamples: number;
}

/** Current snapshot schema version for learning analytics. */
export const LEARNING_ANALYTICS_SNAPSHOT_VERSION = 1;

/**
 * Persisted, aggregated learning analytics. Only counters and a bounded
 * recent-event window are stored — never the full attempt history.
 */
export interface LearningAnalyticsSnapshot {
  version: number;
  /** Total valid attempts recorded. */
  totalAnswered: number;
  /** Total correct attempts recorded. */
  totalCorrect: number;
  /** Sum of measured answer times across all attempts, in milliseconds. */
  totalAnswerTimeMs: number;
  /** Number of attempts that contributed a measured answer time. */
  answerTimeSamples: number;
  bySubject: Partial<Record<SubjectId, AccuracyAggregate>>;
  byTopic: Record<string, AccuracyAggregate>;
  byQuestion: Record<string, QuestionAggregate>;
  /**
   * Most recent events, newest last. Also serves as the deduplication window:
   * an event whose id appears here is treated as already applied.
   */
  recentEvents: AnswerAttemptEvent[];
}

/** Outcome of applying a batch of events. */
export interface IngestResult {
  acceptedEventIds: string[];
  duplicateEventIds: string[];
  rejectedEventIds: string[];
}

/** Tunable behaviour for ingestion and reporting. */
export interface LearningAnalyticsOptions {
  /** Maximum recent events retained (and thus the dedup window size). */
  recentEventLimit?: number;
  /** Minimum total attempts before insights are called reliable. */
  minSampleForInsights?: number;
  /** Minimum attempts on a question/topic before it can be flagged as missed. */
  minAttemptsForMissedInsight?: number;
  /** Recency window for activity, in milliseconds. */
  recentActivityWindowMs?: number;
  /** Current time (epoch ms) used to build recency windows. */
  now?: number;
}

/** A ratio that is `null` when the denominator is zero. */
export interface AccuracySummary {
  answered: number;
  correct: number;
  /** correct / answered, or `null` when there are no answered attempts. */
  accuracy: number | null;
}

/** Per-subject learning statistics. */
export interface SubjectLearningStat extends AccuracySummary {
  subject: SubjectId;
  /** Mean measured answer time, or `null` when none were recorded. */
  averageAnswerTimeMs: number | null;
  answerTimeSampleCount: number;
}

/** Per-topic learning statistics. */
export interface TopicLearningStat extends AccuracySummary {
  topic: string;
  averageAnswerTimeMs: number | null;
}

/** A commonly missed question or topic. */
export interface MissedStat {
  /** Question id or topic string. */
  key: string;
  subject?: SubjectId;
  topic?: string;
  answered: number;
  correct: number;
  incorrect: number;
  /** incorrect / answered (0–1). */
  missedRatio: number;
}

/** Mastery level and progress for one subject, derived from mastery records. */
export interface MasteryProgressStat {
  subject: SubjectId;
  level: number;
  currentExp: number;
  requiredExp: number;
  progressRatio: number;
  isMaxLevel: boolean;
  totalCorrect: number;
  totalAttempted: number;
}

/** The complete, read-only learning statistics view. */
export interface LearningStatistics {
  totalAnswered: number;
  totalCorrect: number;
  totalIncorrect: number;
  accuracy: number | null;
  averageAnswerTimeMs: number | null;
  answerTimeSampleCount: number;
  bySubject: SubjectLearningStat[];
  byTopic: TopicLearningStat[];
  masteryBySubject: MasteryProgressStat[];
  mostMissedQuestions: MissedStat[];
  mostMissedTopics: MissedStat[];
  recentActivity: AnswerAttemptEvent[];
  /** False when fewer than `minSampleForInsights` attempts exist. */
  insightsReliable: boolean;
  minSampleForInsights: number;
  /** Caveats about denominators and what the numbers do and do not claim. */
  notes: string[];
}
