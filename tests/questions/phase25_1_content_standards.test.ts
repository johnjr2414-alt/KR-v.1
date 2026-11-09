import { describe, expect, it } from 'vitest';
import {
  ContentReviewStatus,
  QuestionStatus,
  QuestionType,
  type Question,
} from '../../src/core/types/question';
import { EducationalTier, SubjectId } from '../../src/core/types/education';
import { assessQuestionContent } from '../../src/questions/management/QuestionContentAudit';
import { QuestionValidator } from '../../src/questions/management/QuestionValidator';
import { loadBundledQuestions } from '../../src/questions/retrieval/QuestionLoader';

const BASE: Question = {
  id: 'elem-math-001',
  educationalTier: EducationalTier.Elementary,
  subject: SubjectId.Mathematics,
  topic: 'addition',
  difficulty: 1,
  type: QuestionType.MultipleChoice,
  question: 'What is 3 + 5?',
  choices: [
    { choiceId: 'a', text: '6' },
    { choiceId: 'b', text: '7' },
    { choiceId: 'c', text: '8' },
    { choiceId: 'd', text: '9' },
  ],
  correctAnswer: 'c',
  explanation: '3 + 5 = 8.',
  timeLimit: 15,
  baseMasteryExp: 10,
  status: QuestionStatus.Published,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('Phase 25.1 content standards', () => {
  it('accepts bundled-style ids, UUIDs, and records that omit optional metadata', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    const withoutOptional: Question = { ...BASE, id: uuid };
    delete withoutOptional.explanation;

    expect(QuestionValidator.validate(BASE).isValid).toBe(true);
    expect(QuestionValidator.validate(withoutOptional).isValid).toBe(true);
    expect(withoutOptional.source).toBeUndefined();
    expect(withoutOptional.reviewStatus).toBeUndefined();
  });

  it('rejects unstable ids, empty prompts, bad answer references, and duplicate choice text', () => {
    expect(QuestionValidator.validate({ ...BASE, id: ' Elem-Math-001 ' }).isValid).toBe(false);
    expect(QuestionValidator.validate({ ...BASE, id: 'Question_1' }).isValid).toBe(false);
    expect(QuestionValidator.validate({ ...BASE, question: '   ' }).isValid).toBe(false);

    const badReference = QuestionValidator.validate({ ...BASE, correctAnswer: 'missing' });
    expect(badReference.isValid).toBe(false);
    expect(badReference.errors.some((error) => error.field === 'correctAnswer')).toBe(true);

    const duplicateText = QuestionValidator.validate({
      ...BASE,
      choices: [
        { choiceId: 'a', text: 'Eight' },
        { choiceId: 'b', text: ' eight ' },
      ],
      correctAnswer: 'a',
    });
    expect(duplicateText.isValid).toBe(false);
    expect(duplicateText.errors.some((error) => error.message.includes('Duplicate choice text'))).toBe(true);
  });

  it('rejects malformed aliases and invalid timers without rewriting the record', () => {
    const identification: Question = {
      ...BASE,
      id: 'elem-sci-symbol',
      type: QuestionType.Identification,
      choices: undefined,
      correctAnswer: 'Fe',
      acceptedAnswers: ['Fe', ' fe ', 'iron'],
    };
    const before = JSON.stringify(identification);
    const result = QuestionValidator.validate(identification);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.field === 'acceptedAnswers')).toBe(true);
    expect(JSON.stringify(identification)).toBe(before);

    expect(QuestionValidator.validate({ ...BASE, timeLimit: Number.NaN }).isValid).toBe(false);
    expect(QuestionValidator.validate({ ...BASE, timeLimit: 0 }).isValid).toBe(false);
    expect(QuestionValidator.validate({ ...BASE, timeLimit: 15.5 }).isValid).toBe(false);
  });

  it('keeps missing explanations, sources, and review labels as advisories', () => {
    const untouched: Question = { ...BASE };
    delete untouched.explanation;
    const before = JSON.stringify(untouched);
    const assessment = assessQuestionContent(untouched);

    expect(assessment.structurallyValid).toBe(true);
    expect(assessment.advisories.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        'missing-explanation',
        'subtopic-not-recorded',
        'source-not-recorded',
        'review-pending',
      ]),
    );
    expect(JSON.stringify(untouched)).toBe(before);
    expect(untouched.source).toBeUndefined();
    expect(untouched.reviewStatus).toBeUndefined();
  });

  it('validates optional subtopic, source, and review status only when authors supply them', () => {
    const authored: Question = {
      ...BASE,
      subtopic: 'single-digit',
      source: { label: 'Classroom worksheet', locator: 'Set A, item 1' },
      reviewStatus: ContentReviewStatus.AuthorChecked,
    };
    expect(QuestionValidator.validate(authored).isValid).toBe(true);

    expect(QuestionValidator.validate({ ...BASE, subtopic: '   ' }).isValid).toBe(false);
    expect(QuestionValidator.validate({ ...BASE, source: { label: '   ' } }).isValid).toBe(false);
    expect(
      QuestionValidator.validate({ ...BASE, reviewStatus: 'expert-approved' as ContentReviewStatus }).isValid,
    ).toBe(false);

    const shortTimer = assessQuestionContent({ ...BASE, timeLimit: 3 });
    expect(shortTimer.structurallyValid).toBe(true);
    expect(shortTimer.advisories.some((item) => item.code === 'timer-outside-recommended')).toBe(true);
  });

  it('loads the bundled bank without skipping records or adding sources', () => {
    const loaded = loadBundledQuestions();
    expect(loaded.skippedCount).toBe(0);
    expect(loaded.questions.length).toBeGreaterThan(0);

    for (const question of loaded.questions) {
      const assessment = assessQuestionContent(question);
      expect(assessment.structurallyValid).toBe(true);
      expect(question.source).toBeUndefined();
      expect(question.reviewStatus).toBeUndefined();
      expect(assessment.advisories.some((item) => item.code === 'source-not-recorded')).toBe(true);
      expect(assessment.advisories.some((item) => item.code === 'review-pending')).toBe(true);
    }
  });
});
