import { describe, it, expect } from 'vitest';
import { loadBundledQuestions } from '../../src/questions/retrieval/QuestionLoader';
import { QuestionStatus, QuestionType } from '../../src/core/types/question';
import { EducationalTier } from '../../src/core/types/education';

describe('loadBundledQuestions', () => {
  const result = loadBundledQuestions();

  it('loads a non-empty array of questions', () => {
    expect(result.questions.length).toBeGreaterThan(0);
  });

  it('skips zero invalid records from bundled data', () => {
    expect(result.skippedCount).toBe(0);
    expect(result.skippedIds).toHaveLength(0);
  });

  it('every loaded question has a non-empty id', () => {
    for (const q of result.questions) {
      expect(q.id.length).toBeGreaterThan(0);
    }
  });

  it('all loaded IDs are unique', () => {
    const ids = result.questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes Elementary-tier questions', () => {
    expect(result.questions.some((q) => q.educationalTier === EducationalTier.Elementary)).toBe(true);
  });

  it('includes Junior High-tier questions', () => {
    expect(result.questions.some((q) => q.educationalTier === EducationalTier.JuniorHigh)).toBe(true);
  });

  it('includes questions from at least 3 different subjects', () => {
    const subjects = new Set(result.questions.map((q) => q.subject));
    expect(subjects.size).toBeGreaterThanOrEqual(3);
  });

  it('includes Multiple Choice questions', () => {
    expect(result.questions.some((q) => q.type === QuestionType.MultipleChoice)).toBe(true);
  });

  it('includes Identification questions', () => {
    expect(result.questions.some((q) => q.type === QuestionType.Identification)).toBe(true);
  });

  it('includes at least one Essay question', () => {
    expect(result.questions.some((q) => q.type === QuestionType.Essay)).toBe(true);
  });

  it('all loaded questions have Published status', () => {
    for (const q of result.questions) {
      expect(q.status).toBe(QuestionStatus.Published);
    }
  });

  it('all loaded questions have a positive baseMasteryExp', () => {
    for (const q of result.questions) {
      expect(q.baseMasteryExp).toBeGreaterThan(0);
    }
  });
});
