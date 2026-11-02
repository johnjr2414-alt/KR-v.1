import { describe, it, expect } from 'vitest';
import {
  AnswerEvaluator,
  normalizeAnswerText,
} from '../../src/questions/evaluation/AnswerEvaluator';
import {
  QuestionType,
  QuestionStatus,
  type Question,
} from '../../src/core/types/question';
import { AnswerOutcome } from '../../src/core/types/combat';
import { EducationalTier, SubjectId } from '../../src/core/types/education';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const MC_QUESTION: Question = {
  id: 'q-mc-1',
  educationalTier: EducationalTier.Elementary,
  subject: SubjectId.Mathematics,
  topic: 'arithmetic',
  difficulty: 1,
  type: QuestionType.MultipleChoice,
  question: 'What is 2 + 2?',
  choices: [
    { choiceId: 'a', text: '3' },
    { choiceId: 'b', text: '4' },
    { choiceId: 'c', text: '5' },
  ],
  correctAnswer: 'b',
  explanation: 'Two and two equals four.',
  timeLimit: 15,
  baseMasteryExp: 10,
  status: QuestionStatus.Published,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const ID_QUESTION: Question = {
  id: 'q-id-1',
  educationalTier: EducationalTier.JuniorHigh,
  subject: SubjectId.Science,
  topic: 'chemistry',
  difficulty: 2,
  type: QuestionType.Identification,
  question: 'What is the chemical symbol for water?',
  correctAnswer: 'H2O',
  acceptedAnswers: ['h2o', 'H₂O', 'water'],
  explanation: 'Water is H2O.',
  timeLimit: 15,
  baseMasteryExp: 15,
  status: QuestionStatus.Published,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

// ─── Normalization Unit Tests ────────────────────────────────────────────────

describe('normalizeAnswerText', () => {
  it('converts to lowercase and trims whitespace', () => {
    expect(normalizeAnswerText('  HELLO World  ')).toBe('hello world');
  });

  it('collapses internal consecutive spaces', () => {
    expect(normalizeAnswerText('Sodium   Chloride')).toBe('sodium chloride');
  });

  it('strips terminal punctuation', () => {
    expect(normalizeAnswerText('Paris.')).toBe('paris');
    expect(normalizeAnswerText('Cheetah!')).toBe('cheetah');
    expect(normalizeAnswerText('What?')).toBe('what');
  });
});

// ─── Multiple Choice Evaluation ──────────────────────────────────────────────

describe('AnswerEvaluator — Multiple Choice', () => {
  it('evaluates correct choice correctly', () => {
    const res = AnswerEvaluator.evaluate(MC_QUESTION, 'b');
    expect(res.outcome).toBe(AnswerOutcome.Correct);
    expect(res.isCorrect).toBe(true);
    expect(res.correctAnswerText).toBe('B: 4');
    expect(res.explanation).toBe('Two and two equals four.');
  });

  it('is case-insensitive for choice IDs', () => {
    const res = AnswerEvaluator.evaluate(MC_QUESTION, 'B');
    expect(res.outcome).toBe(AnswerOutcome.Correct);
    expect(res.isCorrect).toBe(true);
  });

  it('evaluates wrong choice as Incorrect', () => {
    const res = AnswerEvaluator.evaluate(MC_QUESTION, 'a');
    expect(res.outcome).toBe(AnswerOutcome.Incorrect);
    expect(res.isCorrect).toBe(false);
  });

  it('evaluates timeout as Timeout outcome', () => {
    const res = AnswerEvaluator.evaluate(MC_QUESTION, '', true);
    expect(res.outcome).toBe(AnswerOutcome.Timeout);
    expect(res.isCorrect).toBe(false);
    expect(res.correctAnswerText).toBe('B: 4');
  });
});

// ─── Identification Evaluation ───────────────────────────────────────────────

describe('AnswerEvaluator — Identification', () => {
  it('evaluates exact canonical answer correctly', () => {
    const res = AnswerEvaluator.evaluate(ID_QUESTION, 'H2O');
    expect(res.outcome).toBe(AnswerOutcome.Correct);
    expect(res.isCorrect).toBe(true);
  });

  it('evaluates accepted alias with casing and whitespace variance', () => {
    const res1 = AnswerEvaluator.evaluate(ID_QUESTION, '  h2o  ');
    expect(res1.outcome).toBe(AnswerOutcome.Correct);

    const res2 = AnswerEvaluator.evaluate(ID_QUESTION, 'WATER.');
    expect(res2.outcome).toBe(AnswerOutcome.Correct);

    const res3 = AnswerEvaluator.evaluate(ID_QUESTION, 'H₂O');
    expect(res3.outcome).toBe(AnswerOutcome.Correct);
  });

  it('evaluates wrong text as Incorrect', () => {
    const res = AnswerEvaluator.evaluate(ID_QUESTION, 'Hydrogen Peroxide');
    expect(res.outcome).toBe(AnswerOutcome.Incorrect);
    expect(res.isCorrect).toBe(false);
  });

  it('evaluates timeout on identification as Timeout', () => {
    const res = AnswerEvaluator.evaluate(ID_QUESTION, '', true);
    expect(res.outcome).toBe(AnswerOutcome.Timeout);
    expect(res.isCorrect).toBe(false);
  });
});
