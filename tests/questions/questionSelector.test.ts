import { describe, it, expect } from 'vitest';
import { QuestionSelector, SelectionOutcome } from '../../src/questions/retrieval/QuestionSelector';
import { QuestionRepository } from '../../src/questions/retrieval/QuestionRepository';
import { QuestionType, QuestionStatus, type Question } from '../../src/core/types/question';
import { EducationalTier, SubjectId } from '../../src/core/types/education';
import { loadBundledQuestions } from '../../src/questions/retrieval/QuestionLoader';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeQuestion(overrides: Partial<Question>): Question {
  return {
    id: 'test-q',
    educationalTier: EducationalTier.Elementary,
    subject: SubjectId.Mathematics,
    topic: 'test-topic',
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

// ─── Empty pool ──────────────────────────────────────────────────────────────

describe('QuestionSelector — empty pool', () => {
  const repo = new QuestionRepository();
  const selector = new QuestionSelector(repo);

  it('returns NoQuestionsAvailable when the pool is empty', () => {
    const result = selector.select({}, 3);
    expect(result.outcome).toBe(SelectionOutcome.NoQuestionsAvailable);
    expect(result.questions).toHaveLength(0);
    expect(result.requestedCount).toBe(3);
    expect(result.availableCount).toBe(0);
  });
});

// ─── Insufficient pool ──────────────────────────────────────────────────────

describe('QuestionSelector — insufficient pool', () => {
  const pool = [
    makeQuestion({ id: 'q1' }),
    makeQuestion({ id: 'q2' }),
  ];
  const repo = new QuestionRepository(pool);
  const selector = new QuestionSelector(repo);

  it('returns InsufficientPool when requesting more than available', () => {
    const result = selector.select({}, 5);
    expect(result.outcome).toBe(SelectionOutcome.InsufficientPool);
    expect(result.questions.length).toBeLessThanOrEqual(2);
    expect(result.requestedCount).toBe(5);
    expect(result.availableCount).toBe(2);
  });

  it('still returns all available questions', () => {
    const result = selector.select({}, 5);
    expect(result.questions.length).toBe(2);
  });
});

// ─── Successful selection ────────────────────────────────────────────────────

describe('QuestionSelector — successful selection', () => {
  const pool = Array.from({ length: 10 }, (_, i) =>
    makeQuestion({ id: `q${i}`, difficulty: (i % 5) + 1 }),
  );
  const repo = new QuestionRepository(pool);
  const selector = new QuestionSelector(repo);

  it('returns Success when enough questions are available', () => {
    const result = selector.select({}, 3);
    expect(result.outcome).toBe(SelectionOutcome.Success);
    expect(result.questions).toHaveLength(3);
    expect(result.requestedCount).toBe(3);
    expect(result.availableCount).toBe(10);
  });

  it('selected questions have unique IDs (no repeats)', () => {
    const result = selector.select({}, 5);
    const ids = result.questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('selecting more than pool returns all without repeats', () => {
    const result = selector.select({}, 10);
    const ids = result.questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(10);
  });
});

// ─── Exclusion set ───────────────────────────────────────────────────────────

describe('QuestionSelector — excludeIds', () => {
  const pool = [
    makeQuestion({ id: 'q1' }),
    makeQuestion({ id: 'q2' }),
    makeQuestion({ id: 'q3' }),
    makeQuestion({ id: 'q4' }),
  ];
  const repo = new QuestionRepository(pool);
  const selector = new QuestionSelector(repo);

  it('excludes specified IDs from the pool', () => {
    const result = selector.select({}, 4, new Set(['q1', 'q3']));
    const ids = result.questions.map((q) => q.id);
    expect(ids).not.toContain('q1');
    expect(ids).not.toContain('q3');
    expect(result.availableCount).toBe(2);
  });

  it('returns NoQuestionsAvailable if all IDs are excluded', () => {
    const result = selector.select({}, 2, new Set(['q1', 'q2', 'q3', 'q4']));
    expect(result.outcome).toBe(SelectionOutcome.NoQuestionsAvailable);
    expect(result.questions).toHaveLength(0);
  });

  it('returns InsufficientPool when exclusions reduce pool below requested count', () => {
    const result = selector.select({}, 3, new Set(['q1', 'q2']));
    expect(result.outcome).toBe(SelectionOutcome.InsufficientPool);
    expect(result.questions.length).toBe(2);
  });
});

// ─── Filter + selection integration ──────────────────────────────────────────

describe('QuestionSelector — filter criteria integration', () => {
  const pool = [
    makeQuestion({ id: 'math1', subject: SubjectId.Mathematics, difficulty: 1 }),
    makeQuestion({ id: 'math2', subject: SubjectId.Mathematics, difficulty: 2 }),
    makeQuestion({ id: 'sci1', subject: SubjectId.Science, difficulty: 1 }),
    makeQuestion({ id: 'sci2', subject: SubjectId.Science, difficulty: 3 }),
  ];
  const repo = new QuestionRepository(pool);
  const selector = new QuestionSelector(repo);

  it('only selects from the filtered pool (by subject)', () => {
    const result = selector.select({ subject: SubjectId.Science }, 2);
    expect(result.outcome).toBe(SelectionOutcome.Success);
    expect(result.questions).toHaveLength(2);
    expect(result.questions.every((q) => q.subject === SubjectId.Science)).toBe(true);
  });

  it('reports NoQuestionsAvailable for a subject with no data', () => {
    const result = selector.select({ subject: SubjectId.Business }, 1);
    expect(result.outcome).toBe(SelectionOutcome.NoQuestionsAvailable);
  });
});

// ─── Randomness coverage ─────────────────────────────────────────────────────

describe('QuestionSelector — randomness', () => {
  const pool = Array.from({ length: 20 }, (_, i) =>
    makeQuestion({ id: `q${i}` }),
  );
  const repo = new QuestionRepository(pool);
  const selector = new QuestionSelector(repo);

  it('produces varied selections over many runs', () => {
    const firstIds = new Set<string>();
    for (let run = 0; run < 30; run++) {
      const result = selector.select({}, 1);
      firstIds.add(result.questions[0].id);
    }
    // With 20 questions and 30 runs, we'd expect at least a few unique IDs
    expect(firstIds.size).toBeGreaterThan(1);
  });
});

// ─── Integration with bundled data ───────────────────────────────────────────

describe('QuestionSelector — bundled data integration', () => {
  const loadResult = loadBundledQuestions();
  const repo = new QuestionRepository(loadResult.questions);
  const selector = new QuestionSelector(repo);

  it('selects from bundled elementary math questions', () => {
    const result = selector.select(
      { subject: SubjectId.Mathematics, educationalTier: EducationalTier.Elementary },
      3,
    );
    expect(result.questions.length).toBeGreaterThan(0);
    expect(result.questions.every((q) => q.subject === SubjectId.Mathematics)).toBe(true);
  });
});
