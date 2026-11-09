import { EducationalTier, SubjectId } from '../core/types/education';
import type { MasteryRecord } from '../core/types/mastery';
import { DEFAULT_MASTERY_CONFIG, getRequiredMasteryExp, type MasteryFormulaConfig } from '../config/masteryConfig';
import {
  LEARNING_ANALYTICS_SNAPSHOT_VERSION,
  type AccuracyAggregate,
  type AccuracySummary,
  type AnswerAttemptEvent,
  type IngestResult,
  type LearningAnalyticsOptions,
  type LearningAnalyticsSnapshot,
  type LearningStatistics,
  type MasteryProgressStat,
  type MissedStat,
  type QuestionAggregate,
  type SubjectLearningStat,
  type TopicLearningStat,
} from './AnalyticsTypes';

// ─── Constants ───────────────────────────────────────────────────────────────

const SUBJECT_VALUES = new Set<string>(Object.values(SubjectId));
const TIER_VALUES = new Set<string>(Object.values(EducationalTier));

const DEFAULT_RECENT_EVENT_LIMIT = 500;
const DEFAULT_MIN_SAMPLE_FOR_INSIGHTS = 10;
const DEFAULT_MIN_ATTEMPTS_FOR_MISSED_INSIGHT = 3;
const DEFAULT_RECENT_ACTIVITY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MISSED_INSIGHT_LIMIT = 5;

// ─── Guards and small helpers ────────────────────────────────────────────────

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * An event is valid only when it carries the fields a statistic needs. Invalid
 * or unanswered attempts are rejected so they cannot skew denominators.
 */
export function isValidAnswerAttemptEvent(event: unknown): event is AnswerAttemptEvent {
  if (!event || typeof event !== 'object') return false;
  const e = event as Partial<AnswerAttemptEvent>;

  if (!isNonEmptyString(e.eventId)) return false;
  if (!isNonEmptyString(e.questionId)) return false;
  if (typeof e.subject !== 'string' || !SUBJECT_VALUES.has(e.subject)) return false;
  if (typeof e.educationalTier !== 'string' || !TIER_VALUES.has(e.educationalTier)) return false;
  if (typeof e.topic !== 'string') return false;
  if (typeof e.isCorrect !== 'boolean') return false;
  if (typeof e.difficulty !== 'number' || !Number.isFinite(e.difficulty)) return false;
  if (!isFiniteNonNegative(e.answeredAt)) return false;
  if (typeof e.timeLimitSeconds !== 'number' || !Number.isFinite(e.timeLimitSeconds) || e.timeLimitSeconds <= 0) {
    return false;
  }
  if (!isFiniteNonNegative(e.timeRemainingSeconds)) return false;
  if (e.answerTimeMs !== undefined && !isFiniteNonNegative(e.answerTimeMs)) return false;

  return true;
}

/** A ratio, or `null` when the denominator is zero. */
function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

function emptyAccuracy(): AccuracyAggregate {
  return { answered: 0, correct: 0, answerTimeMs: 0, answerTimeSamples: 0 };
}

function createEmptySnapshot(): LearningAnalyticsSnapshot {
  return {
    version: LEARNING_ANALYTICS_SNAPSHOT_VERSION,
    totalAnswered: 0,
    totalCorrect: 0,
    totalAnswerTimeMs: 0,
    answerTimeSamples: 0,
    bySubject: {},
    byTopic: {},
    byQuestion: {},
    recentEvents: [],
  };
}

// ─── Snapshot sanitization (used on load and by the save validator) ──────────

function sanitizeCount(value: unknown): number {
  return isFiniteNonNegative(value) ? Math.floor(value) : 0;
}

function sanitizeAccuracyAggregate(raw: unknown): AccuracyAggregate {
  const obj = (raw ?? {}) as Partial<AccuracyAggregate>;
  const answered = sanitizeCount(obj.answered);
  const correct = Math.min(sanitizeCount(obj.correct), answered);
  const answerTimeSamples = Math.min(sanitizeCount(obj.answerTimeSamples), answered);
  const answerTimeMs = isFiniteNonNegative(obj.answerTimeMs) ? obj.answerTimeMs : 0;
  return { answered, correct, answerTimeMs, answerTimeSamples };
}

function sanitizeQuestionAggregate(raw: unknown): QuestionAggregate {
  const obj = (raw ?? {}) as Partial<QuestionAggregate>;
  const answered = sanitizeCount(obj.answered);
  return { answered, correct: Math.min(sanitizeCount(obj.correct), answered) };
}

/**
 * Repairs a persisted analytics snapshot. Unknown or malformed pieces are
 * dropped or clamped rather than failing the whole save.
 */
export function sanitizeAnalyticsSnapshot(
  raw: unknown,
  options: LearningAnalyticsOptions = {},
): LearningAnalyticsSnapshot | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const candidate = raw as Partial<LearningAnalyticsSnapshot>;

  const totalAnswered = sanitizeCount(candidate.totalAnswered);
  const totalCorrect = Math.min(sanitizeCount(candidate.totalCorrect), totalAnswered);
  const answerTimeSamples = Math.min(sanitizeCount(candidate.answerTimeSamples), totalAnswered);

  const bySubject: Partial<Record<SubjectId, AccuracyAggregate>> = {};
  if (candidate.bySubject && typeof candidate.bySubject === 'object') {
    for (const [subject, aggregate] of Object.entries(candidate.bySubject)) {
      if (SUBJECT_VALUES.has(subject)) {
        bySubject[subject as SubjectId] = sanitizeAccuracyAggregate(aggregate);
      }
    }
  }

  const byTopic: Record<string, AccuracyAggregate> = {};
  if (candidate.byTopic && typeof candidate.byTopic === 'object') {
    for (const [topic, aggregate] of Object.entries(candidate.byTopic)) {
      byTopic[topic] = sanitizeAccuracyAggregate(aggregate);
    }
  }

  const byQuestion: Record<string, QuestionAggregate> = {};
  if (candidate.byQuestion && typeof candidate.byQuestion === 'object') {
    for (const [questionId, aggregate] of Object.entries(candidate.byQuestion)) {
      byQuestion[questionId] = sanitizeQuestionAggregate(aggregate);
    }
  }

  const limit = options.recentEventLimit ?? DEFAULT_RECENT_EVENT_LIMIT;
  const recentEvents = Array.isArray(candidate.recentEvents)
    ? candidate.recentEvents.filter(isValidAnswerAttemptEvent).slice(-limit)
    : [];

  return {
    version: isFiniteNonNegative(candidate.version) && candidate.version >= 1
      ? Math.floor(candidate.version)
      : LEARNING_ANALYTICS_SNAPSHOT_VERSION,
    totalAnswered,
    totalCorrect,
    totalAnswerTimeMs: isFiniteNonNegative(candidate.totalAnswerTimeMs) ? candidate.totalAnswerTimeMs : 0,
    answerTimeSamples,
    bySubject,
    byTopic,
    byQuestion,
    recentEvents,
  };
}

// ─── Engine ──────────────────────────────────────────────────────────────────

/**
 * Headless learning-analytics accumulator.
 *
 * Apply answer-attempt events to build aggregates. Re-applying an event whose
 * id was already seen in the recent window is a no-op, so replaying a batch
 * never double-counts. Nothing here touches Phaser or the DOM.
 */
export class LearningAnalytics {
  private snapshot: LearningAnalyticsSnapshot;
  private readonly options: LearningAnalyticsOptions;

  constructor(snapshot?: LearningAnalyticsSnapshot | null, options: LearningAnalyticsOptions = {}) {
    this.options = options;
    this.snapshot = snapshot ? (sanitizeAnalyticsSnapshot(snapshot, options) ?? createEmptySnapshot()) : createEmptySnapshot();
  }

  /** Applies a batch of events, ignoring duplicates and rejecting invalid ones. */
  applyEvents(events: readonly AnswerAttemptEvent[]): IngestResult {
    const acceptedEventIds: string[] = [];
    const duplicateEventIds: string[] = [];
    const rejectedEventIds: string[] = [];

    const known = new Set(this.snapshot.recentEvents.map((event) => event.eventId));

    for (const event of events) {
      if (!isValidAnswerAttemptEvent(event)) {
        const id = event && typeof (event as AnswerAttemptEvent).eventId === 'string'
          ? (event as AnswerAttemptEvent).eventId
          : '<invalid>';
        rejectedEventIds.push(id);
        continue;
      }
      if (known.has(event.eventId)) {
        duplicateEventIds.push(event.eventId);
        continue;
      }
      known.add(event.eventId);
      acceptedEventIds.push(event.eventId);
      this.record(event);
    }

    this.trimRecent();
    return { acceptedEventIds, duplicateEventIds, rejectedEventIds };
  }

  /** Returns a deep copy of the current snapshot. */
  getSnapshot(): LearningAnalyticsSnapshot {
    return {
      ...this.snapshot,
      bySubject: Object.fromEntries(
        Object.entries(this.snapshot.bySubject).map(([k, v]) => [k, { ...(v as AccuracyAggregate) }]),
      ) as Partial<Record<SubjectId, AccuracyAggregate>>,
      byTopic: Object.fromEntries(Object.entries(this.snapshot.byTopic).map(([k, v]) => [k, { ...v }])),
      byQuestion: Object.fromEntries(Object.entries(this.snapshot.byQuestion).map(([k, v]) => [k, { ...v }])),
      recentEvents: this.snapshot.recentEvents.map((event) => ({ ...event })),
    };
  }

  /** Replaces the snapshot (for load/migration). */
  loadSnapshot(snapshot: LearningAnalyticsSnapshot | null): void {
    this.snapshot = snapshot
      ? (sanitizeAnalyticsSnapshot(snapshot, this.options) ?? createEmptySnapshot())
      : createEmptySnapshot();
  }

  /** Clears all analytics. */
  reset(): void {
    this.snapshot = createEmptySnapshot();
  }

  private record(event: AnswerAttemptEvent): void {
    const s = this.snapshot;

    s.totalAnswered += 1;
    if (event.isCorrect) s.totalCorrect += 1;

    const hasTime = isFiniteNonNegative(event.answerTimeMs);
    if (hasTime) {
      s.totalAnswerTimeMs += event.answerTimeMs as number;
      s.answerTimeSamples += 1;
    }

    const subjectAggregate = s.bySubject[event.subject] ?? emptyAccuracy();
    subjectAggregate.answered += 1;
    if (event.isCorrect) subjectAggregate.correct += 1;
    if (hasTime) {
      subjectAggregate.answerTimeMs += event.answerTimeMs as number;
      subjectAggregate.answerTimeSamples += 1;
    }
    s.bySubject[event.subject] = subjectAggregate;

    const topicAggregate = s.byTopic[event.topic] ?? emptyAccuracy();
    topicAggregate.answered += 1;
    if (event.isCorrect) topicAggregate.correct += 1;
    if (hasTime) {
      topicAggregate.answerTimeMs += event.answerTimeMs as number;
      topicAggregate.answerTimeSamples += 1;
    }
    s.byTopic[event.topic] = topicAggregate;

    const questionAggregate = s.byQuestion[event.questionId] ?? { answered: 0, correct: 0 };
    questionAggregate.answered += 1;
    if (event.isCorrect) questionAggregate.correct += 1;
    s.byQuestion[event.questionId] = questionAggregate;

    s.recentEvents.push({ ...event });
  }

  private trimRecent(): void {
    const limit = this.options.recentEventLimit ?? DEFAULT_RECENT_EVENT_LIMIT;
    if (this.snapshot.recentEvents.length > limit) {
      this.snapshot.recentEvents = this.snapshot.recentEvents.slice(-limit);
    }
  }
}

// ─── Mastery progress adapter ────────────────────────────────────────────────

/**
 * Derives mastery level and progress per subject from recorded mastery records.
 * Pure — it reads records and a config, and never mutates either.
 */
export function buildMasteryProgress(
  records: Record<SubjectId, MasteryRecord>,
  config: MasteryFormulaConfig = DEFAULT_MASTERY_CONFIG,
): MasteryProgressStat[] {
  const result: MasteryProgressStat[] = [];
  for (const [subject, record] of Object.entries(records)) {
    const isMaxLevel = record.level >= config.maxMasteryLevel;
    const requiredExp = isMaxLevel ? 0 : getRequiredMasteryExp(record.level, config);
    const progressRatio = isMaxLevel
      ? 1
      : requiredExp > 0
        ? Math.min(1, record.currentExp / requiredExp)
        : 0;

    result.push({
      subject: subject as SubjectId,
      level: record.level,
      currentExp: record.currentExp,
      requiredExp,
      progressRatio,
      isMaxLevel,
      totalCorrect: record.totalCorrect,
      totalAttempted: record.totalAttempted,
    });
  }
  result.sort((a, b) => a.subject.localeCompare(b.subject));
  return result;
}

// ─── Statistics (pure) ───────────────────────────────────────────────────────

function buildMissedStats(
  entries: Array<{ key: string; aggregate: QuestionAggregate; subject?: SubjectId; topic?: string }>,
  minAttempts: number,
): MissedStat[] {
  return entries
    .filter((entry) => entry.aggregate.answered >= minAttempts && entry.aggregate.correct < entry.aggregate.answered)
    .map((entry) => ({
      key: entry.key,
      subject: entry.subject,
      topic: entry.topic,
      answered: entry.aggregate.answered,
      correct: entry.aggregate.correct,
      incorrect: entry.aggregate.answered - entry.aggregate.correct,
      missedRatio: (entry.aggregate.answered - entry.aggregate.correct) / entry.aggregate.answered,
    }))
    .sort(
      (a, b) =>
        b.missedRatio - a.missedRatio ||
        b.answered - a.answered ||
        a.key.localeCompare(b.key),
    )
    .slice(0, MISSED_INSIGHT_LIMIT);
}

/**
 * Computes the read-only learning statistics view from a snapshot and the
 * player's mastery records. Pure: it never mutates its inputs.
 */
export function computeLearningStatistics(
  snapshot: LearningAnalyticsSnapshot,
  masteryRecords?: Record<SubjectId, MasteryRecord>,
  options: LearningAnalyticsOptions = {},
): LearningStatistics {
  const minSampleForInsights = options.minSampleForInsights ?? DEFAULT_MIN_SAMPLE_FOR_INSIGHTS;
  const minAttemptsForMissedInsight =
    options.minAttemptsForMissedInsight ?? DEFAULT_MIN_ATTEMPTS_FOR_MISSED_INSIGHT;
  const now = options.now ?? Date.now();
  const windowMs = options.recentActivityWindowMs ?? DEFAULT_RECENT_ACTIVITY_WINDOW_MS;

  const bySubject: SubjectLearningStat[] = Object.entries(snapshot.bySubject)
    .map(([subject, aggregate]) => {
      const agg = aggregate as AccuracyAggregate;
      return {
        subject: subject as SubjectId,
        answered: agg.answered,
        correct: agg.correct,
        accuracy: ratio(agg.correct, agg.answered),
        averageAnswerTimeMs: agg.answerTimeSamples > 0 ? agg.answerTimeMs / agg.answerTimeSamples : null,
        answerTimeSampleCount: agg.answerTimeSamples,
      };
    })
    .sort((a, b) => a.subject.localeCompare(b.subject));

  const byTopic: TopicLearningStat[] = Object.entries(snapshot.byTopic)
    .map(([topic, agg]) => ({
      topic,
      answered: agg.answered,
      correct: agg.correct,
      accuracy: ratio(agg.correct, agg.answered),
      averageAnswerTimeMs: agg.answerTimeSamples > 0 ? agg.answerTimeMs / agg.answerTimeSamples : null,
    }))
    .sort((a, b) => a.topic.localeCompare(b.topic));

  // Resolve question → subject/topic from the recent window (best effort).
  const questionContext = new Map<string, { subject: SubjectId; topic: string }>();
  for (const event of snapshot.recentEvents) {
    if (!questionContext.has(event.questionId)) {
      questionContext.set(event.questionId, { subject: event.subject, topic: event.topic });
    }
  }

  const mostMissedQuestions = buildMissedStats(
    Object.entries(snapshot.byQuestion).map(([questionId, aggregate]) => {
      const context = questionContext.get(questionId);
      return { key: questionId, aggregate, subject: context?.subject, topic: context?.topic };
    }),
    minAttemptsForMissedInsight,
  );

  const mostMissedTopics = buildMissedStats(
    Object.entries(snapshot.byTopic).map(([topic, aggregate]) => ({ key: topic, aggregate, topic })),
    minAttemptsForMissedInsight,
  );

  const recentActivity = snapshot.recentEvents
    .filter((event) => event.answeredAt >= now - windowMs)
    .sort((a, b) => b.answeredAt - a.answeredAt);

  const accuracySummary: AccuracySummary = {
    answered: snapshot.totalAnswered,
    correct: snapshot.totalCorrect,
    accuracy: ratio(snapshot.totalCorrect, snapshot.totalAnswered),
  };

  return {
    totalAnswered: snapshot.totalAnswered,
    totalCorrect: snapshot.totalCorrect,
    totalIncorrect: snapshot.totalAnswered - snapshot.totalCorrect,
    accuracy: accuracySummary.accuracy,
    averageAnswerTimeMs:
      snapshot.answerTimeSamples > 0 ? snapshot.totalAnswerTimeMs / snapshot.answerTimeSamples : null,
    answerTimeSampleCount: snapshot.answerTimeSamples,
    bySubject,
    byTopic,
    masteryBySubject: buildMasteryProgress(masteryRecords ?? ({} as Record<SubjectId, MasteryRecord>)),
    mostMissedQuestions,
    mostMissedTopics,
    recentActivity,
    insightsReliable: snapshot.totalAnswered >= minSampleForInsights,
    minSampleForInsights,
    notes: [
      'Accuracy = correct / answered. Only valid recorded attempts count toward the denominator.',
      'Average answer time uses only attempts with a recorded answer time; it is null when none exist.',
      `Insights are labelled unreliable below ${minSampleForInsights} answered attempts.`,
      `A question or topic is flagged as commonly missed only after at least ${minAttemptsForMissedInsight} attempts.`,
    ],
  };
}
