import { describe, it, expect } from 'vitest';
import { SubjectId, EducationalTier } from '../../src/core/types/education';
import { createInitialMasteryMap } from '../../src/mastery/MasteryData';
import { getRequiredMasteryExp } from '../../src/config/masteryConfig';
import {
  LearningAnalytics,
  computeLearningStatistics,
  buildMasteryProgress,
  sanitizeAnalyticsSnapshot,
  LEARNING_ANALYTICS_SNAPSHOT_VERSION,
  type AnswerAttemptEvent,
} from '../../src/analytics';
import { validateSaveData } from '../../src/storage/SaveDataValidator';
import { DEFAULT_GAME_SETTINGS } from '../../src/storage/StorageTypes';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function evt(overrides: Partial<AnswerAttemptEvent>): AnswerAttemptEvent {
  return {
    eventId: 'e1',
    questionId: 'q1',
    subject: SubjectId.Mathematics,
    topic: 'addition',
    educationalTier: EducationalTier.Elementary,
    difficulty: 1,
    isCorrect: true,
    answeredAt: 1_000,
    timeLimitSeconds: 15,
    timeRemainingSeconds: 10,
    answerTimeMs: 5_000,
    ...overrides,
  };
}

function makeSaveData(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: 3,
    updatedAt: 1_700_000_000_000,
    player: {
      id: 'player-1',
      name: 'Hero',
      level: 1,
      currentExp: 0,
      maxHp: 100,
      currentHp: 100,
      maxMp: 50,
      currentMp: 50,
      attack: 10,
      defense: 5,
      intelligence: 5,
      critRate: 5,
      movementSpeed: 1,
      unallocatedStatPoints: 0,
      allocatedStats: {},
    },
    mastery: createInitialMasteryMap(),
    inventory: { capacity: 20, slots: [], equipped: {} },
    quests: [],
    settings: DEFAULT_GAME_SETTINGS,
    ...overrides,
  };
}

// ─── Core formulas ───────────────────────────────────────────────────────────

describe('Phase 25.4 learning analytics — formulas', () => {
  it('counts totals and computes accuracy over answered attempts', () => {
    const engine = new LearningAnalytics();
    engine.applyEvents([
      evt({ eventId: 'a', isCorrect: true }),
      evt({ eventId: 'b', isCorrect: true }),
      evt({ eventId: 'c', isCorrect: true }),
      evt({ eventId: 'd', isCorrect: false }),
    ]);

    const stats = computeLearningStatistics(engine.getSnapshot());
    expect(stats.totalAnswered).toBe(4);
    expect(stats.totalCorrect).toBe(3);
    expect(stats.totalIncorrect).toBe(1);
    expect(stats.accuracy).toBeCloseTo(0.75, 10);
  });

  it('returns null accuracy and null average time with a zero denominator', () => {
    const stats = computeLearningStatistics(new LearningAnalytics().getSnapshot());
    expect(stats.totalAnswered).toBe(0);
    expect(stats.accuracy).toBeNull();
    expect(stats.averageAnswerTimeMs).toBeNull();
    expect(stats.answerTimeSampleCount).toBe(0);
    expect(stats.insightsReliable).toBe(false);
    expect(stats.bySubject).toHaveLength(0);
  });

  it('averages only attempts that recorded an answer time', () => {
    const engine = new LearningAnalytics();
    engine.applyEvents([
      evt({ eventId: 'a', answerTimeMs: 1_000 }),
      evt({ eventId: 'b', answerTimeMs: 3_000 }),
      evt({ eventId: 'c', answerTimeMs: undefined }),
    ]);

    const stats = computeLearningStatistics(engine.getSnapshot());
    expect(stats.totalAnswered).toBe(3);
    expect(stats.answerTimeSampleCount).toBe(2);
    expect(stats.averageAnswerTimeMs).toBe(2_000);
  });

  it('breaks accuracy down by subject and by topic', () => {
    const engine = new LearningAnalytics();
    engine.applyEvents([
      evt({ eventId: 'm1', subject: SubjectId.Mathematics, topic: 'addition', isCorrect: true }),
      evt({ eventId: 'm2', subject: SubjectId.Mathematics, topic: 'addition', isCorrect: false }),
      evt({ eventId: 's1', subject: SubjectId.Science, topic: 'biology', isCorrect: true }),
    ]);

    const stats = computeLearningStatistics(engine.getSnapshot());
    const math = stats.bySubject.find((s) => s.subject === SubjectId.Mathematics)!;
    const science = stats.bySubject.find((s) => s.subject === SubjectId.Science)!;
    expect(math.accuracy).toBeCloseTo(0.5, 10);
    expect(science.accuracy).toBe(1);

    const addition = stats.byTopic.find((t) => t.topic === 'addition')!;
    expect(addition.answered).toBe(2);
    expect(addition.accuracy).toBeCloseTo(0.5, 10);
  });
});

// ─── Duplicate + invalid handling ────────────────────────────────────────────

describe('Phase 25.4 learning analytics — ingestion guards', () => {
  it('never double-counts a re-applied event', () => {
    const engine = new LearningAnalytics();
    const event = evt({ eventId: 'dup' });

    const first = engine.applyEvents([event]);
    expect(first.acceptedEventIds).toEqual(['dup']);

    const second = engine.applyEvents([event]);
    expect(second.acceptedEventIds).toHaveLength(0);
    expect(second.duplicateEventIds).toEqual(['dup']);

    expect(engine.getSnapshot().totalAnswered).toBe(1);
  });

  it('deduplicates within a single batch', () => {
    const engine = new LearningAnalytics();
    const event = evt({ eventId: 'same' });
    const result = engine.applyEvents([event, { ...event }]);
    expect(result.acceptedEventIds).toEqual(['same']);
    expect(result.duplicateEventIds).toEqual(['same']);
    expect(engine.getSnapshot().totalAnswered).toBe(1);
  });

  it('rejects invalid and unanswered attempts so they cannot skew denominators', () => {
    const engine = new LearningAnalytics();
    const result = engine.applyEvents([
      evt({ eventId: 'ok' }),
      evt({ eventId: '', questionId: '' }),
      evt({ eventId: 'bad-subject', subject: 'chemistry' as SubjectId }),
      { ...evt({ eventId: 'bad-time' }), timeLimitSeconds: 0 },
      { ...evt({ eventId: 'bad-correct' }), isCorrect: undefined } as unknown as AnswerAttemptEvent,
    ]);

    expect(result.acceptedEventIds).toEqual(['ok']);
    expect(result.rejectedEventIds).toEqual(['', 'bad-subject', 'bad-time', 'bad-correct']);
    expect(engine.getSnapshot().totalAnswered).toBe(1);
  });
});

// ─── Insights from limited data ──────────────────────────────────────────────

describe('Phase 25.4 learning analytics — insights', () => {
  it('labels insights unreliable below the minimum sample', () => {
    const engine = new LearningAnalytics();
    engine.applyEvents([evt({ eventId: 'a' }), evt({ eventId: 'b' })]);
    const stats = computeLearningStatistics(engine.getSnapshot(), undefined, { minSampleForInsights: 10 });
    expect(stats.insightsReliable).toBe(false);
    expect(stats.minSampleForInsights).toBe(10);
  });

  it('flags commonly missed questions only after the minimum attempts', () => {
    const engine = new LearningAnalytics();
    engine.applyEvents([
      evt({ eventId: 'w1', questionId: 'q-weak', isCorrect: false }),
      evt({ eventId: 'w2', questionId: 'q-weak', isCorrect: false }),
      evt({ eventId: 'w3', questionId: 'q-weak', isCorrect: true }),
      evt({ eventId: 'r1', questionId: 'q-rare', isCorrect: false }),
    ]);

    const withDefault = computeLearningStatistics(engine.getSnapshot());
    expect(withDefault.mostMissedQuestions.map((m) => m.key)).toEqual(['q-weak']);

    const strict = computeLearningStatistics(engine.getSnapshot(), undefined, { minAttemptsForMissedInsight: 5 });
    expect(strict.mostMissedQuestions).toHaveLength(0);
  });

  it('returns recent activity within the recency window, newest first', () => {
    const engine = new LearningAnalytics();
    engine.applyEvents([
      evt({ eventId: 'old', answeredAt: 1_000 }),
      evt({ eventId: 'new', answeredAt: 5_000 }),
    ]);
    const stats = computeLearningStatistics(engine.getSnapshot(), undefined, {
      now: 6_000,
      recentActivityWindowMs: 2_000,
    });
    expect(stats.recentActivity.map((e) => e.eventId)).toEqual(['new']);
  });
});

// ─── Mastery progress adapter ────────────────────────────────────────────────

describe('Phase 25.4 learning analytics — mastery progress', () => {
  it('derives level and progress from mastery records without mutating them', () => {
    const records = createInitialMasteryMap();
    records[SubjectId.Mathematics] = {
      subject: SubjectId.Mathematics,
      level: 2,
      currentExp: 30,
      totalCorrect: 12,
      totalAttempted: 20,
    };
    records[SubjectId.Science] = {
      subject: SubjectId.Science,
      level: 100,
      currentExp: 0,
      totalCorrect: 0,
      totalAttempted: 0,
    };
    const before = JSON.stringify(records);

    const progress = buildMasteryProgress(records);
    const math = progress.find((p) => p.subject === SubjectId.Mathematics)!;
    expect(math.requiredExp).toBe(getRequiredMasteryExp(2));
    expect(math.progressRatio).toBeCloseTo(30 / getRequiredMasteryExp(2), 10);
    expect(math.isMaxLevel).toBe(false);

    const science = progress.find((p) => p.subject === SubjectId.Science)!;
    expect(science.isMaxLevel).toBe(true);
    expect(science.progressRatio).toBe(1);

    expect(JSON.stringify(records)).toBe(before);
  });

  it('includes mastery stats in the full statistics view', () => {
    const stats = computeLearningStatistics(new LearningAnalytics().getSnapshot(), createInitialMasteryMap());
    expect(stats.masteryBySubject).toHaveLength(Object.values(SubjectId).length);
  });
});

// ─── Persistence, sanitization, and migration ────────────────────────────────

describe('Phase 25.4 learning analytics — persistence and migration', () => {
  it('round-trips a snapshot and preserves the dedup window', () => {
    const engine = new LearningAnalytics();
    engine.applyEvents([evt({ eventId: 'keep' }), evt({ eventId: 'keep2', isCorrect: false })]);

    const restored = JSON.parse(JSON.stringify(engine.getSnapshot()));
    const reloaded = new LearningAnalytics(restored);
    expect(reloaded.getSnapshot().totalAnswered).toBe(2);

    const result = reloaded.applyEvents([evt({ eventId: 'keep' })]);
    expect(result.duplicateEventIds).toEqual(['keep']);
    expect(reloaded.getSnapshot().totalAnswered).toBe(2);
  });

  it('returns a defensive copy from getSnapshot', () => {
    const engine = new LearningAnalytics();
    engine.applyEvents([evt({ eventId: 'a' })]);
    const snapshot = engine.getSnapshot();
    snapshot.totalAnswered = 999;
    expect(engine.getSnapshot().totalAnswered).toBe(1);
  });

  it('sanitizes malformed snapshots instead of throwing', () => {
    const sanitized = sanitizeAnalyticsSnapshot({
      version: 1,
      totalAnswered: 'lots',
      totalCorrect: 9,
      bySubject: { mathematics: { answered: 3, correct: 9 }, bogus: { answered: 5, correct: 5 } },
      recentEvents: [null, { nope: true }],
    });

    expect(sanitized).toBeDefined();
    expect(sanitized!.totalAnswered).toBe(0);
    expect(sanitized!.totalCorrect).toBe(0);
    expect(sanitized!.bySubject[SubjectId.Mathematics]!.correct).toBe(3);
    expect((sanitized!.bySubject as Record<string, unknown>).bogus).toBeUndefined();
    expect(sanitized!.recentEvents).toHaveLength(0);
    expect(sanitized!.version).toBe(LEARNING_ANALYTICS_SNAPSHOT_VERSION);
  });

  it('loads a legacy (v3) save without analytics', () => {
    const result = validateSaveData(makeSaveData());
    expect(result.isValid).toBe(true);
    expect(result.data!.analytics).toBeUndefined();
  });

  it('preserves a valid analytics block on load', () => {
    const engine = new LearningAnalytics();
    engine.applyEvents([evt({ eventId: 'm1' }), evt({ eventId: 'm2', isCorrect: false })]);

    const result = validateSaveData(makeSaveData({ version: 4, analytics: engine.getSnapshot() }));
    expect(result.isValid).toBe(true);
    expect(result.data!.analytics!.totalAnswered).toBe(2);
    expect(result.data!.analytics!.totalCorrect).toBe(1);
  });

  it('repairs a malformed analytics block on load', () => {
    const result = validateSaveData(
      makeSaveData({ analytics: { totalAnswered: -5, bySubject: 'nope', recentEvents: 'nope' } }),
    );
    expect(result.isValid).toBe(true);
    expect(result.data!.analytics).toBeDefined();
    expect(result.data!.analytics!.totalAnswered).toBe(0);
    expect(result.data!.analytics!.recentEvents).toHaveLength(0);
  });
});
