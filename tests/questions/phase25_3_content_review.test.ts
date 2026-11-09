import { describe, it, expect } from 'vitest';
import { ContentReviewStatus, QuestionType, QuestionStatus, type Question } from '../../src/core/types/question';
import { EducationalTier, SubjectId } from '../../src/core/types/education';
import { QuestionRepository } from '../../src/questions/retrieval/QuestionRepository';
import type { QuestionStore } from '../../src/storage/QuestionStore';
import { QuestionManager } from '../../src/questions/management/QuestionManager';
import type { PvEQuestionProfile } from '../../src/questions/retrieval/DifficultyEngine';
import { loadBundledQuestions } from '../../src/questions/retrieval/QuestionLoader';
import {
  findContentGaps,
  findSimilarPromptPairs,
  previewBattleSelection,
  buildReviewReport,
  renderReviewReportJson,
  normalizePromptText,
} from '../../src/questions/review';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeQuestion(overrides: Partial<Question>): Question {
  return {
    id: 'test-q',
    educationalTier: EducationalTier.Elementary,
    subject: SubjectId.Mathematics,
    topic: 'addition',
    difficulty: 1,
    type: QuestionType.MultipleChoice,
    question: 'Test?',
    choices: [
      { choiceId: 'a', text: 'A' },
      { choiceId: 'b', text: 'B' },
    ],
    correctAnswer: 'a',
    timeLimit: 10,
    baseMasteryExp: 10,
    status: QuestionStatus.Published,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

class MockQuestionStore implements QuestionStore {
  private questions = new Map<string, Question>();
  private tombstones = new Set<string>();

  async init(): Promise<void> {}
  async getAll(): Promise<Question[]> {
    return [...this.questions.values()];
  }
  async getById(id: string): Promise<Question | undefined> {
    return this.questions.get(id);
  }
  async save(question: Question): Promise<void> {
    this.questions.set(question.id, { ...question });
  }
  async saveAll(questions: Question[]): Promise<void> {
    for (const q of questions) this.questions.set(q.id, { ...q });
  }
  async delete(id: string): Promise<void> {
    this.questions.delete(id);
  }
  async getTombstones(): Promise<string[]> {
    return [...this.tombstones];
  }
  async addTombstone(id: string): Promise<void> {
    this.tombstones.add(id);
  }
  async clear(): Promise<void> {
    this.questions.clear();
    this.tombstones.clear();
  }
}

const codes = (gaps: ReturnType<typeof findContentGaps>): string[] => gaps.map((gap) => gap.code);

// ─── Gap detection ───────────────────────────────────────────────────────────

describe('Phase 25.3 content review — gap detection', () => {
  it('reports no gaps for a fully-populated, mapped, reviewed question', () => {
    const complete = makeQuestion({
      id: 'complete-1',
      explanation: 'Three plus five is eight.',
      tags: ['arithmetic'],
      subtopic: 'single-digit',
      source: { label: 'Author notes' },
      reviewStatus: ContentReviewStatus.AuthorChecked,
      topic: 'addition',
      timeLimit: 15,
    });

    expect(findContentGaps([complete])).toHaveLength(0);
  });

  it('reports authoring gaps without mutating the question', () => {
    const bare = makeQuestion({ id: 'bare-1', subject: SubjectId.Mathematics, topic: 'addition' });
    const before = JSON.stringify(bare);

    const gaps = findContentGaps([bare]);

    expect(codes(gaps)).toEqual(
      expect.arrayContaining([
        'missing-explanation',
        'missing-subtopic',
        'missing-source',
        'review-pending',
        'missing-tags',
      ]),
    );
    expect(codes(gaps)).not.toContain('unmapped-topic');
    expect(JSON.stringify(bare)).toBe(before);
  });

  it('flags an unmapped topic and honours the include filter', () => {
    const orphan = makeQuestion({ id: 'orphan-1', subject: SubjectId.Mathematics, topic: 'calculus' });
    expect(codes(findContentGaps([orphan]))).toContain('unmapped-topic');

    const onlyTags = findContentGaps([orphan], { include: ['missing-tags'] });
    expect(onlyTags).toHaveLength(1);
    expect(onlyTags[0].code).toBe('missing-tags');
  });

  it('restricts by subject and tier', () => {
    const pool = [
      makeQuestion({ id: 'm', subject: SubjectId.Mathematics, educationalTier: EducationalTier.Elementary }),
      makeQuestion({ id: 's', subject: SubjectId.Science, educationalTier: EducationalTier.JuniorHigh, topic: 'biology' }),
    ];

    const scienceOnly = findContentGaps(pool, { subjects: [SubjectId.Science] });
    expect(scienceOnly.every((gap) => gap.questionId === 's')).toBe(true);

    const jhOnly = findContentGaps(pool, { tiers: [EducationalTier.JuniorHigh] });
    expect(jhOnly.every((gap) => gap.questionId === 's')).toBe(true);
  });
});

// ─── Similar-prompt candidates ───────────────────────────────────────────────

describe('Phase 25.3 content review — similar prompts', () => {
  it('normalizes prompts for comparison', () => {
    expect(normalizePromptText('What is 3 + 5?')).toBe('what is 3 5');
  });

  it('flags identical prompts as candidates and never claims certainty', () => {
    const pairs = findSimilarPromptPairs([
      makeQuestion({ id: 'p-a', question: 'What is 3 + 5?' }),
      makeQuestion({ id: 'p-b', question: 'what is 3+5' }),
      makeQuestion({ id: 'p-c', question: 'Name the largest planet.', topic: 'solar-system' }),
    ]);

    expect(pairs).toHaveLength(1);
    expect(pairs[0].similarity).toBe(1);
    expect(pairs[0].certain).toBe(false);
    expect([pairs[0].questionIdA, pairs[0].questionIdB].sort()).toEqual(['p-a', 'p-b']);
  });

  it('respects the threshold and the same-subject restriction', () => {
    const preset = [
      makeQuestion({ id: 'math-a', subject: SubjectId.Mathematics, question: 'Add two numbers together now' }),
      makeQuestion({ id: 'math-b', subject: SubjectId.Mathematics, question: 'Add two numbers together please' }),
    ];
    // "now" vs "please" differ; token overlap = 4/6 ≈ 0.67.
    expect(findSimilarPromptPairs(preset)).toHaveLength(0);
    expect(findSimilarPromptPairs(preset, { threshold: 0.5 })).toHaveLength(1);

    const crossSubject = [
      makeQuestion({ id: 'cross-a', subject: SubjectId.Mathematics, question: 'Same exact prompt' }),
      makeQuestion({ id: 'cross-b', subject: SubjectId.Science, topic: 'biology', question: 'Same exact prompt' }),
    ];
    expect(findSimilarPromptPairs(crossSubject)).toHaveLength(0);
    expect(findSimilarPromptPairs(crossSubject, { sameSubjectOnly: false })).toHaveLength(1);
  });
});

// ─── Battle selection preview ────────────────────────────────────────────────

describe('Phase 25.3 content review — battle selection preview', () => {
  const profile: PvEQuestionProfile = {
    subject: SubjectId.Mathematics,
    baselineTier: EducationalTier.Elementary,
    targetTier: EducationalTier.JuniorHigh,
    targetDifficulty: 4,
    timerMultiplier: 0.8,
    rewardMultiplier: 1,
    levelDifference: {
      playerLevel: 1,
      monsterLevel: 8,
      deltaL: 7,
      isMonsterHigher: true,
      isSameLevel: false,
      isMonsterLower: false,
    },
    reason: 'test profile',
  };

  it('classifies exact, same-tier, baseline-tier, and fallback matches', () => {
    const exact = previewBattleSelection(
      makeQuestion({ id: 'e', educationalTier: EducationalTier.JuniorHigh, difficulty: 4, timeLimit: 20 }),
      profile,
    );
    expect(exact.match).toBe('exact');
    expect(exact.eligible).toBe(true);
    expect(exact.effectiveTimerSeconds).toBe(16);

    const sameTier = previewBattleSelection(
      makeQuestion({ id: 's', educationalTier: EducationalTier.JuniorHigh, difficulty: 1 }),
      profile,
    );
    expect(sameTier.match).toBe('same-tier');
    expect(sameTier.eligible).toBe(true);

    const baseline = previewBattleSelection(
      makeQuestion({ id: 'b', educationalTier: EducationalTier.Elementary, difficulty: 1 }),
      profile,
    );
    expect(baseline.match).toBe('baseline-tier');
    expect(baseline.eligible).toBe(true);

    const doubleFallback = previewBattleSelection(
      makeQuestion({ id: 'f', educationalTier: EducationalTier.SeniorHigh, difficulty: 2 }),
      profile,
    );
    expect(doubleFallback.match).toBe('fallback');
    expect(doubleFallback.eligible).toBe(true);
  });

  it('marks a subject mismatch as the only non-eligible case', () => {
    const other = previewBattleSelection(
      makeQuestion({ id: 'o', subject: SubjectId.Science, topic: 'biology' }),
      profile,
    );
    expect(other.match).toBe('none');
    expect(other.eligible).toBe(false);
  });
});

// ─── Repository + manager review-status flows ────────────────────────────────

describe('Phase 25.3 content review — review status', () => {
  it('filters the pool by recorded review status', () => {
    const repo = new QuestionRepository([
      makeQuestion({ id: 'checked', reviewStatus: ContentReviewStatus.AuthorChecked }),
      makeQuestion({ id: 'revision', reviewStatus: ContentReviewStatus.NeedsRevision }),
      makeQuestion({ id: 'none' }),
    ]);

    expect(repo.filter({ reviewStatus: ContentReviewStatus.AuthorChecked }).map((q) => q.id)).toEqual(['checked']);
    expect(repo.filter({ reviewStatus: ContentReviewStatus.NeedsRevision }).map((q) => q.id)).toEqual(['revision']);
    expect(repo.filter({})).toHaveLength(3);
  });

  it('marks review status through QuestionManager without touching content', async () => {
    const repo = new QuestionRepository();
    const manager = new QuestionManager(repo, new MockQuestionStore());
    await manager.initialize();

    const target = repo.getAll()[0];
    const before = { ...target };

    const result = await manager.markReviewStatus(target.id, ContentReviewStatus.AuthorChecked);

    expect(result.errors).toBeUndefined();
    const stored = repo.getById(target.id)!;
    expect(stored.reviewStatus).toBe(ContentReviewStatus.AuthorChecked);
    expect(stored.difficulty).toBe(before.difficulty);
    expect(stored.correctAnswer).toBe(before.correctAnswer);
    expect(stored.topic).toBe(before.topic);
  });
});

// ─── Report assembly ─────────────────────────────────────────────────────────

describe('Phase 25.3 content review — report', () => {
  it('builds a non-mutating report with counts, breakdown, and notes', () => {
    const pool = [
      makeQuestion({
        id: 'ok',
        explanation: 'x',
        tags: ['t'],
        subtopic: 's',
        source: { label: 'L' },
        reviewStatus: ContentReviewStatus.AuthorChecked,
        timeLimit: 15,
      }),
      makeQuestion({ id: 'gap', topic: 'addition' }),
      makeQuestion({ id: 'rev', reviewStatus: ContentReviewStatus.NeedsRevision }),
    ];
    const before = JSON.stringify(pool);

    const report = buildReviewReport(pool, { generatedAt: '2026-11-08T00:00:00.000Z' });

    expect(report.generatedAt).toBe('2026-11-08T00:00:00.000Z');
    expect(report.totalQuestions).toBe(3);
    expect(report.questionsWithGaps).toBe(2);
    expect(report.gapCount).toBeGreaterThan(0);
    expect(report.gapsByCode['missing-explanation']).toBe(2);
    expect(report.reviewStatusBreakdown).toEqual({
      unreviewed: 1,
      authorChecked: 1,
      needsRevision: 1,
    });
    expect(report.notes.length).toBeGreaterThan(0);
    expect(JSON.stringify(pool)).toBe(before);
  });

  it('serializes to JSON that round-trips', () => {
    const report = buildReviewReport(loadBundledQuestions().questions, {
      generatedAt: '2026-11-08T00:00:00.000Z',
    });
    const parsed = JSON.parse(renderReviewReportJson(report));
    expect(parsed.totalQuestions).toBe(report.totalQuestions);
    expect(parsed.gapCount).toBe(report.gapCount);
    expect(Array.isArray(parsed.gaps)).toBe(true);
  });

  it('reports the bundled bank as fully mapped', () => {
    const report = buildReviewReport(loadBundledQuestions().questions);
    expect(report.gapsByCode['unmapped-topic']).toBeUndefined();
  });
});
