import { describe, it, expect } from 'vitest';
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

// ─── Constructor & mutation ──────────────────────────────────────────────────

describe('QuestionRepository — pool management', () => {
  it('starts empty with no constructor argument', () => {
    const repo = new QuestionRepository();
    expect(repo.count()).toBe(0);
    expect(repo.getAll()).toHaveLength(0);
  });

  it('accepts initial questions via constructor', () => {
    const q = makeQuestion({ id: 'q1' });
    const repo = new QuestionRepository([q]);
    expect(repo.count()).toBe(1);
  });

  it('setQuestions replaces the entire pool', () => {
    const repo = new QuestionRepository([makeQuestion({ id: 'q1' })]);
    repo.setQuestions([makeQuestion({ id: 'q2' }), makeQuestion({ id: 'q3' })]);
    expect(repo.count()).toBe(2);
    expect(repo.getById('q1')).toBeUndefined();
  });

  it('addQuestion appends new questions', () => {
    const repo = new QuestionRepository();
    repo.addQuestion(makeQuestion({ id: 'q1' }));
    repo.addQuestion(makeQuestion({ id: 'q2' }));
    expect(repo.count()).toBe(2);
  });

  it('addQuestion replaces existing questions by ID', () => {
    const repo = new QuestionRepository();
    repo.addQuestion(makeQuestion({ id: 'q1', topic: 'old' }));
    repo.addQuestion(makeQuestion({ id: 'q1', topic: 'new' }));
    expect(repo.count()).toBe(1);
    expect(repo.getById('q1')!.topic).toBe('new');
  });

  it('removeQuestion deletes by ID', () => {
    const repo = new QuestionRepository([makeQuestion({ id: 'q1' })]);
    repo.removeQuestion('q1');
    expect(repo.count()).toBe(0);
  });

  it('removeQuestion is a no-op for unknown ID', () => {
    const repo = new QuestionRepository([makeQuestion({ id: 'q1' })]);
    repo.removeQuestion('q999');
    expect(repo.count()).toBe(1);
  });

  it('getById returns the correct question', () => {
    const repo = new QuestionRepository([makeQuestion({ id: 'q1' }), makeQuestion({ id: 'q2' })]);
    expect(repo.getById('q2')!.id).toBe('q2');
  });

  it('getById returns undefined for missing ID', () => {
    const repo = new QuestionRepository();
    expect(repo.getById('nope')).toBeUndefined();
  });
});

// ─── Filtering ───────────────────────────────────────────────────────────────

describe('QuestionRepository — filter', () => {
  const pool: Question[] = [
    makeQuestion({ id: 'mc1', subject: SubjectId.Mathematics, educationalTier: EducationalTier.Elementary, difficulty: 1, type: QuestionType.MultipleChoice, topic: 'addition', tags: ['math', 'grade-1'] }),
    makeQuestion({ id: 'mc2', subject: SubjectId.Mathematics, educationalTier: EducationalTier.JuniorHigh, difficulty: 3, type: QuestionType.MultipleChoice, topic: 'algebra', tags: ['math', 'algebra'] }),
    makeQuestion({ id: 'id1', subject: SubjectId.Science, educationalTier: EducationalTier.Elementary, difficulty: 2, type: QuestionType.Identification, topic: 'biology', tags: ['science', 'plants'] }),
    makeQuestion({ id: 'es1', subject: SubjectId.GeneralKnowledge, educationalTier: EducationalTier.SeniorHigh, difficulty: 4, type: QuestionType.Essay, topic: 'history', tags: ['history'] }),
    makeQuestion({ id: 'draft1', subject: SubjectId.Mathematics, educationalTier: EducationalTier.Elementary, difficulty: 1, status: QuestionStatus.Draft }),
    makeQuestion({ id: 'archived1', subject: SubjectId.Science, educationalTier: EducationalTier.Elementary, difficulty: 1, status: QuestionStatus.Archived }),
  ];
  const repo = new QuestionRepository(pool);

  it('returns only Published questions by default (omitted status)', () => {
    const results = repo.filter({});
    expect(results.every((q) => q.status === QuestionStatus.Published)).toBe(true);
    expect(results.some((q) => q.id === 'draft1')).toBe(false);
    expect(results.some((q) => q.id === 'archived1')).toBe(false);
  });

  it('filters by subject', () => {
    const results = repo.filter({ subject: SubjectId.Science });
    expect(results.every((q) => q.subject === SubjectId.Science)).toBe(true);
    expect(results.length).toBe(1); // id1
  });

  it('filters by educationalTier', () => {
    const results = repo.filter({ educationalTier: EducationalTier.Elementary });
    expect(results.every((q) => q.educationalTier === EducationalTier.Elementary)).toBe(true);
    // mc1 + id1 (draft1 and archived1 excluded by default status)
    expect(results.length).toBe(2);
  });

  it('filters by exact difficulty', () => {
    const results = repo.filter({ difficulty: 3 });
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('mc2');
  });

  it('filters by difficulty range (min/max)', () => {
    const results = repo.filter({ minDifficulty: 2, maxDifficulty: 4 });
    // id1(2), mc2(3), es1(4)
    expect(results.length).toBe(3);
  });

  it('filters by question type', () => {
    const results = repo.filter({ type: QuestionType.Identification });
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('id1');
  });

  it('filters by topic', () => {
    const results = repo.filter({ topic: 'algebra' });
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('mc2');
  });

  it('filters by tags using OR logic', () => {
    const results = repo.filter({ tags: ['algebra', 'history'] });
    expect(results.length).toBe(2);
  });

  it('returns Draft questions when explicitly filtering by Draft status', () => {
    const results = repo.filter({ status: QuestionStatus.Draft });
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('draft1');
  });

  it('combines multiple criteria with AND logic', () => {
    const results = repo.filter({
      subject: SubjectId.Mathematics,
      educationalTier: EducationalTier.Elementary,
      difficulty: 1,
    });
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('mc1');
  });

  it('returns an empty array when no questions match', () => {
    const results = repo.filter({ subject: SubjectId.Business });
    expect(results).toHaveLength(0);
  });
});

// ─── Integration with loader ─────────────────────────────────────────────────

describe('QuestionRepository — loaded bundled data', () => {
  const loadResult = loadBundledQuestions();
  const repo = new QuestionRepository(loadResult.questions);

  it('repository count matches loaded count', () => {
    expect(repo.count()).toBe(loadResult.questions.length);
  });

  it('can filter loaded data by Mathematics subject', () => {
    const results = repo.filter({ subject: SubjectId.Mathematics });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((q) => q.subject === SubjectId.Mathematics)).toBe(true);
  });

  it('can filter loaded data by Elementary tier', () => {
    const results = repo.filter({ educationalTier: EducationalTier.Elementary });
    expect(results.length).toBeGreaterThan(0);
  });
});
