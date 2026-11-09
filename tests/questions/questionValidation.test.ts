import { describe, it, expect } from 'vitest';
import {
  QuestionValidator,
  validateQuestion,
} from '../../src/questions/management/QuestionValidator';
import {
  QuestionType,
  QuestionStatus,
  type Question,
} from '../../src/core/types/question';
import { EducationalTier, SubjectId } from '../../src/core/types/education';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const VALID_MC_QUESTION: Question = {
  id: 'q-mc-100',
  educationalTier: EducationalTier.Elementary,
  subject: SubjectId.Mathematics,
  topic: 'multiplication',
  difficulty: 2,
  type: QuestionType.MultipleChoice,
  question: 'What is 3 * 4?',
  choices: [
    { choiceId: 'c1', text: '7' },
    { choiceId: 'c2', text: '12' },
    { choiceId: 'c3', text: '14' },
    { choiceId: 'c4', text: '10' },
  ],
  correctAnswer: 'c2',
  timeLimit: 20,
  baseMasteryExp: 25,
  status: QuestionStatus.Published,
  tags: ['math', 'multiplication'],
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};

const VALID_ID_QUESTION: Question = {
  id: 'q-id-200',
  educationalTier: EducationalTier.JuniorHigh,
  subject: SubjectId.Science,
  topic: 'elements',
  difficulty: 3,
  type: QuestionType.Identification,
  question: 'What is the chemical symbol for Iron?',
  correctAnswer: 'Fe',
  acceptedAnswers: ['iron', 'ferrum'],
  timeLimit: 15,
  baseMasteryExp: 30,
  status: QuestionStatus.Published,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};

const VALID_ESSAY_QUESTION: Question = {
  id: 'q-es-300',
  educationalTier: EducationalTier.SeniorHigh,
  subject: SubjectId.Programming,
  topic: 'algorithms',
  difficulty: 4,
  type: QuestionType.Essay,
  question: 'Explain the difference between BFS and DFS traversal algorithms.',
  expectedAnswer: 'BFS uses a queue for level-order traversal, DFS uses recursion or a stack for depth-first traversal.',
  timeLimit: 120,
  baseMasteryExp: 50,
  status: QuestionStatus.Published,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};

// ─── Multiple Choice Validation ──────────────────────────────────────────────

describe('QuestionValidator — Multiple Choice', () => {
  it('validates a complete and correct multiple-choice question', () => {
    const result = QuestionValidator.validate(VALID_MC_QUESTION);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects if choices array is missing or has fewer than 2 choices', () => {
    const noChoices = { ...VALID_MC_QUESTION, choices: undefined };
    const oneChoice = { ...VALID_MC_QUESTION, choices: [{ choiceId: 'c1', text: 'Only one' }] };

    const res1 = QuestionValidator.validate(noChoices);
    expect(res1.isValid).toBe(false);
    expect(res1.errors.some((e) => e.field === 'choices')).toBe(true);

    const res2 = QuestionValidator.validate(oneChoice);
    expect(res2.isValid).toBe(false);
    expect(res2.errors.some((e) => e.field === 'choices')).toBe(true);
  });

  it('rejects duplicate choice IDs', () => {
    const duplicateChoices = {
      ...VALID_MC_QUESTION,
      choices: [
        { choiceId: 'c1', text: 'Option A' },
        { choiceId: 'c1', text: 'Option B' },
      ],
      correctAnswer: 'c1',
    };
    const result = QuestionValidator.validate(duplicateChoices);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('Duplicate choice ID'))).toBe(true);
  });

  it('rejects empty choiceId or empty text', () => {
    const emptyId = {
      ...VALID_MC_QUESTION,
      choices: [
        { choiceId: '', text: 'Option A' },
        { choiceId: 'c2', text: 'Option B' },
      ],
    };
    const emptyText = {
      ...VALID_MC_QUESTION,
      choices: [
        { choiceId: 'c1', text: 'Option A' },
        { choiceId: 'c2', text: '   ' },
      ],
    };

    const resId = QuestionValidator.validate(emptyId);
    expect(resId.isValid).toBe(false);
    expect(resId.errors.some((e) => e.field.includes('choiceId'))).toBe(true);

    const resText = QuestionValidator.validate(emptyText);
    expect(resText.isValid).toBe(false);
    expect(resText.errors.some((e) => e.field.includes('text'))).toBe(true);
  });

  it('rejects if correctAnswer does not match any choiceId', () => {
    const unmatched = {
      ...VALID_MC_QUESTION,
      correctAnswer: 'c999',
    };
    const result = QuestionValidator.validate(unmatched);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === 'correctAnswer')).toBe(true);
  });

  it('rejects if correctAnswer is missing or blank', () => {
    const missing = { ...VALID_MC_QUESTION, correctAnswer: undefined };
    const blank = { ...VALID_MC_QUESTION, correctAnswer: '   ' };

    const res1 = QuestionValidator.validate(missing);
    expect(res1.isValid).toBe(false);

    const res2 = QuestionValidator.validate(blank);
    expect(res2.isValid).toBe(false);
  });
});

// ─── Identification Validation ───────────────────────────────────────────────

describe('QuestionValidator — Identification', () => {
  it('validates a correct identification question with canonical and accepted answers', () => {
    const result = QuestionValidator.validate(VALID_ID_QUESTION);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validates an identification question with canonical answer only', () => {
    const canonicalOnly: Question = {
      ...VALID_ID_QUESTION,
      acceptedAnswers: undefined,
    };
    const result = QuestionValidator.validate(canonicalOnly);
    expect(result.isValid).toBe(true);
  });

  it('validates an identification question with acceptedAnswers array only', () => {
    const acceptedOnly: Question = {
      ...VALID_ID_QUESTION,
      correctAnswer: undefined,
      acceptedAnswers: ['ferrum', 'iron'],
    };
    const result = QuestionValidator.validate(acceptedOnly);
    expect(result.isValid).toBe(true);
  });

  it('rejects when both correctAnswer and acceptedAnswers are missing or empty', () => {
    const invalid: Question = {
      ...VALID_ID_QUESTION,
      correctAnswer: '',
      acceptedAnswers: [],
    };
    const result = QuestionValidator.validate(invalid);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === 'correctAnswer')).toBe(true);
  });

  it('flags malformed or empty strings within acceptedAnswers', () => {
    const invalidAnswers: Question = {
      ...VALID_ID_QUESTION,
      acceptedAnswers: ['Fe', '  ', 'iron'],
    };
    const result = QuestionValidator.validate(invalidAnswers);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === 'acceptedAnswers')).toBe(true);
  });
});

// ─── Essay Validation ────────────────────────────────────────────────────────

describe('QuestionValidator — Essay', () => {
  it('validates an essay question with an expectedAnswer', () => {
    const result = QuestionValidator.validate(VALID_ESSAY_QUESTION);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects if expectedAnswer is missing', () => {
    const missing: Question = {
      ...VALID_ESSAY_QUESTION,
      expectedAnswer: undefined,
    };
    const result = QuestionValidator.validate(missing);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === 'expectedAnswer')).toBe(true);
  });

  it('rejects if expectedAnswer is a blank whitespace string', () => {
    const blank: Question = {
      ...VALID_ESSAY_QUESTION,
      expectedAnswer: '   \n  ',
    };
    const result = QuestionValidator.validate(blank);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === 'expectedAnswer')).toBe(true);
  });
});

// ─── Common Fields Validation ────────────────────────────────────────────────

describe('QuestionValidator — Common Fields', () => {
  it('rejects invalid or empty ID', () => {
    const emptyId = { ...VALID_MC_QUESTION, id: '  ' };
    const res = QuestionValidator.validate(emptyId);
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.field === 'id')).toBe(true);
  });

  it('rejects unrecognized educational tier', () => {
    const invalidTier = { ...VALID_MC_QUESTION, educationalTier: 'kindergarten' as any };
    const res = QuestionValidator.validate(invalidTier);
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.field === 'educationalTier')).toBe(true);
  });

  it('rejects unrecognized subject', () => {
    const invalidSubject = { ...VALID_MC_QUESTION, subject: 'alchemy' as any };
    const res = QuestionValidator.validate(invalidSubject);
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.field === 'subject')).toBe(true);
  });

  it('rejects missing or empty topic', () => {
    const blankTopic = { ...VALID_MC_QUESTION, topic: '' };
    const res = QuestionValidator.validate(blankTopic);
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.field === 'topic')).toBe(true);
  });

  it('rejects out-of-range or non-integer difficulties', () => {
    const tooLow = { ...VALID_MC_QUESTION, difficulty: 0 };
    const tooHigh = { ...VALID_MC_QUESTION, difficulty: 6 };
    const floatDiff = { ...VALID_MC_QUESTION, difficulty: 2.5 };

    expect(QuestionValidator.validate(tooLow).isValid).toBe(false);
    expect(QuestionValidator.validate(tooHigh).isValid).toBe(false);
    expect(QuestionValidator.validate(floatDiff).isValid).toBe(false);
  });

  it('rejects empty question stem text', () => {
    const blankStem = { ...VALID_MC_QUESTION, question: '   ' };
    const res = QuestionValidator.validate(blankStem);
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.field === 'question')).toBe(true);
  });

  it('rejects non-positive, non-integer, and unbounded time limits', () => {
    const zeroTime = { ...VALID_MC_QUESTION, timeLimit: 0 };
    const negTime = { ...VALID_MC_QUESTION, timeLimit: -10 };
    const fractional = { ...VALID_MC_QUESTION, timeLimit: 15.5 };
    const unbounded = { ...VALID_MC_QUESTION, timeLimit: 601 };

    expect(QuestionValidator.validate(zeroTime).isValid).toBe(false);
    expect(QuestionValidator.validate(negTime).isValid).toBe(false);
    expect(QuestionValidator.validate(fractional).isValid).toBe(false);
    expect(QuestionValidator.validate(unbounded).isValid).toBe(false);
  });

  it('rejects non-positive base mastery EXP', () => {
    const zeroExp = { ...VALID_MC_QUESTION, baseMasteryExp: 0 };
    const negExp = { ...VALID_MC_QUESTION, baseMasteryExp: -5 };

    expect(QuestionValidator.validate(zeroExp).isValid).toBe(false);
    expect(QuestionValidator.validate(negExp).isValid).toBe(false);
  });

  it('rejects invalid publication status', () => {
    const invalidStatus = { ...VALID_MC_QUESTION, status: 'deleted' as any };
    const res = QuestionValidator.validate(invalidStatus);
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.field === 'status')).toBe(true);
  });

  it('rejects invalid tags array containing empty strings', () => {
    const invalidTags = { ...VALID_MC_QUESTION, tags: ['valid', ''] };
    const res = QuestionValidator.validate(invalidTags);
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.field === 'tags')).toBe(true);
  });

  it('validates using functional wrapper validateQuestion', () => {
    const res = validateQuestion(VALID_MC_QUESTION);
    expect(res.isValid).toBe(true);
  });
});
