import { describe, it, expect } from 'vitest';
import {
  QuestionType,
  QuestionStatus,
  QUESTION_DIFFICULTY_MIN,
  QUESTION_DIFFICULTY_MAX,
  isValidDifficulty,
} from '../../src/core/types/question';
import type { Question, QuestionChoice } from '../../src/core/types/question';
import { EducationalTier, SubjectId } from '../../src/core/types/education';

// ─── Shared fixtures ─────────────────────────────────────────────────────────

const NOW = '2026-11-01T00:00:00.000Z';

/** A fully-specified multiple-choice question. */
const MC_QUESTION: Question = {
  id: 'q-mc-001',
  educationalTier: EducationalTier.Elementary,
  subject: SubjectId.Mathematics,
  topic: 'addition',
  difficulty: 1,
  type: QuestionType.MultipleChoice,
  question: 'What is 2 + 2?',
  choices: [
    { choiceId: 'a', text: '3' },
    { choiceId: 'b', text: '4' },
    { choiceId: 'c', text: '5' },
    { choiceId: 'd', text: '6' },
  ],
  correctAnswer: 'b',
  explanation: 'Two plus two equals four.',
  timeLimit: 15,
  baseMasteryExp: 20,
  tags: ['arithmetic', 'grade-1'],
  status: QuestionStatus.Published,
  createdAt: NOW,
  updatedAt: NOW,
};

/** A fully-specified identification question. */
const ID_QUESTION: Question = {
  id: 'q-id-001',
  educationalTier: EducationalTier.JuniorHigh,
  subject: SubjectId.Science,
  topic: 'chemistry',
  difficulty: 3,
  type: QuestionType.Identification,
  question: 'What is the chemical symbol for water?',
  correctAnswer: 'H2O',
  acceptedAnswers: ['h2o', 'H₂O'],
  explanation: 'Water consists of two hydrogen atoms and one oxygen atom.',
  timeLimit: 20,
  baseMasteryExp: 30,
  tags: ['chemistry', 'symbols'],
  status: QuestionStatus.Published,
  createdAt: NOW,
  updatedAt: NOW,
};

/** A fully-specified essay question. */
const ESSAY_QUESTION: Question = {
  id: 'q-es-001',
  educationalTier: EducationalTier.SeniorHigh,
  subject: SubjectId.GeneralKnowledge,
  topic: 'history',
  difficulty: 4,
  type: QuestionType.Essay,
  question: 'Describe the causes of World War I.',
  expectedAnswer: 'Key causes include nationalism, imperialism, militarism, and the alliance system.',
  explanation: 'The war began in 1914 following the assassination of Archduke Franz Ferdinand.',
  timeLimit: 120,
  baseMasteryExp: 60,
  tags: ['history', 'world-war'],
  status: QuestionStatus.Published,
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── QuestionType enum ───────────────────────────────────────────────────────

describe('QuestionType', () => {
  it('has correct string values', () => {
    expect(QuestionType.MultipleChoice).toBe('multiple-choice');
    expect(QuestionType.Identification).toBe('identification');
    expect(QuestionType.Essay).toBe('essay');
  });

  it('has exactly three members', () => {
    const values = Object.values(QuestionType);
    expect(values).toHaveLength(3);
  });
});

// ─── QuestionStatus enum ─────────────────────────────────────────────────────

describe('QuestionStatus', () => {
  it('has correct string values', () => {
    expect(QuestionStatus.Draft).toBe('draft');
    expect(QuestionStatus.Published).toBe('published');
    expect(QuestionStatus.Archived).toBe('archived');
  });

  it('has exactly three lifecycle states', () => {
    expect(Object.values(QuestionStatus)).toHaveLength(3);
  });
});

// ─── Difficulty constants and guard ─────────────────────────────────────────

describe('difficulty constants', () => {
  it('QUESTION_DIFFICULTY_MIN is 1', () => {
    expect(QUESTION_DIFFICULTY_MIN).toBe(1);
  });

  it('QUESTION_DIFFICULTY_MAX is 5', () => {
    expect(QUESTION_DIFFICULTY_MAX).toBe(5);
  });
});

describe('isValidDifficulty', () => {
  it('accepts 1 (minimum)', () => {
    expect(isValidDifficulty(1)).toBe(true);
  });

  it('accepts 5 (maximum)', () => {
    expect(isValidDifficulty(5)).toBe(true);
  });

  it('accepts all integers in range 1–5', () => {
    for (let d = QUESTION_DIFFICULTY_MIN; d <= QUESTION_DIFFICULTY_MAX; d++) {
      expect(isValidDifficulty(d)).toBe(true);
    }
  });

  it('rejects 0 (below minimum)', () => {
    expect(isValidDifficulty(0)).toBe(false);
  });

  it('rejects 6 (above maximum)', () => {
    expect(isValidDifficulty(6)).toBe(false);
  });

  it('rejects negative values', () => {
    expect(isValidDifficulty(-1)).toBe(false);
  });

  it('rejects non-integer floats', () => {
    expect(isValidDifficulty(2.5)).toBe(false);
  });

  it('rejects NaN', () => {
    expect(isValidDifficulty(NaN)).toBe(false);
  });

  it('rejects Infinity', () => {
    expect(isValidDifficulty(Infinity)).toBe(false);
  });
});

// ─── Multiple-choice question schema ─────────────────────────────────────────

describe('Multiple-choice question schema', () => {
  it('stores the correct type value', () => {
    expect(MC_QUESTION.type).toBe(QuestionType.MultipleChoice);
  });

  it('has a non-empty question stem', () => {
    expect(MC_QUESTION.question.length).toBeGreaterThan(0);
  });

  it('has a choices array with at least 2 entries', () => {
    expect(MC_QUESTION.choices).toBeDefined();
    expect(MC_QUESTION.choices!.length).toBeGreaterThanOrEqual(2);
  });

  it('each choice has a non-empty choiceId and text', () => {
    for (const choice of MC_QUESTION.choices!) {
      expect(choice.choiceId.length).toBeGreaterThan(0);
      expect(choice.text.length).toBeGreaterThan(0);
    }
  });

  it('correctAnswer references a valid choiceId', () => {
    const ids = MC_QUESTION.choices!.map((c: QuestionChoice) => c.choiceId);
    expect(ids).toContain(MC_QUESTION.correctAnswer);
  });

  it('has no acceptedAnswers (not applicable for MC)', () => {
    expect(MC_QUESTION.acceptedAnswers).toBeUndefined();
  });

  it('has no expectedAnswer (not applicable for MC)', () => {
    expect(MC_QUESTION.expectedAnswer).toBeUndefined();
  });
});

// ─── Identification question schema ──────────────────────────────────────────

describe('Identification question schema', () => {
  it('stores the correct type value', () => {
    expect(ID_QUESTION.type).toBe(QuestionType.Identification);
  });

  it('has a canonical correctAnswer string', () => {
    expect(typeof ID_QUESTION.correctAnswer).toBe('string');
    expect(ID_QUESTION.correctAnswer!.length).toBeGreaterThan(0);
  });

  it('has acceptedAnswers array with alternative spellings', () => {
    expect(Array.isArray(ID_QUESTION.acceptedAnswers)).toBe(true);
    expect(ID_QUESTION.acceptedAnswers!.length).toBeGreaterThan(0);
  });

  it('has no choices array (not applicable for identification)', () => {
    expect(ID_QUESTION.choices).toBeUndefined();
  });
});

// ─── Essay question schema ───────────────────────────────────────────────────

describe('Essay question schema', () => {
  it('stores the correct type value', () => {
    expect(ESSAY_QUESTION.type).toBe(QuestionType.Essay);
  });

  it('has an expectedAnswer as the grading rubric', () => {
    expect(typeof ESSAY_QUESTION.expectedAnswer).toBe('string');
    expect(ESSAY_QUESTION.expectedAnswer!.length).toBeGreaterThan(0);
  });

  it('has no choices (not applicable for essay)', () => {
    expect(ESSAY_QUESTION.choices).toBeUndefined();
  });

  it('has a longer timeLimit than a typical MC question', () => {
    expect(ESSAY_QUESTION.timeLimit).toBeGreaterThan(MC_QUESTION.timeLimit);
  });
});

// ─── Common required fields ───────────────────────────────────────────────────

describe('Question required fields — common across all types', () => {
  const allQuestions = [MC_QUESTION, ID_QUESTION, ESSAY_QUESTION];

  it.each([['MC', MC_QUESTION], ['Identification', ID_QUESTION], ['Essay', ESSAY_QUESTION]])(
    '%s question has a non-empty id',
    (_label, q) => {
      expect((q as Question).id.length).toBeGreaterThan(0);
    },
  );

  it('all questions have a valid educationalTier', () => {
    const validTiers = Object.values(EducationalTier) as string[];
    for (const q of allQuestions) {
      expect(validTiers).toContain(q.educationalTier);
    }
  });

  it('all questions have a valid subject', () => {
    const validSubjects = Object.values(SubjectId) as string[];
    for (const q of allQuestions) {
      expect(validSubjects).toContain(q.subject);
    }
  });

  it('all questions have a non-empty topic', () => {
    for (const q of allQuestions) {
      expect(q.topic.length).toBeGreaterThan(0);
    }
  });

  it('all questions have a difficulty in the valid range', () => {
    for (const q of allQuestions) {
      expect(isValidDifficulty(q.difficulty)).toBe(true);
    }
  });

  it('all questions have a positive timeLimit', () => {
    for (const q of allQuestions) {
      expect(q.timeLimit).toBeGreaterThan(0);
    }
  });

  it('all questions have a positive baseMasteryExp', () => {
    for (const q of allQuestions) {
      expect(q.baseMasteryExp).toBeGreaterThan(0);
    }
  });

  it('all questions have a valid status', () => {
    const validStatuses = Object.values(QuestionStatus) as string[];
    for (const q of allQuestions) {
      expect(validStatuses).toContain(q.status);
    }
  });

  it('all questions have a createdAt ISO timestamp string', () => {
    for (const q of allQuestions) {
      expect(typeof q.createdAt).toBe('string');
      expect(q.createdAt.length).toBeGreaterThan(0);
    }
  });

  it('all questions have an updatedAt ISO timestamp string', () => {
    for (const q of allQuestions) {
      expect(typeof q.updatedAt).toBe('string');
      expect(q.updatedAt.length).toBeGreaterThan(0);
    }
  });
});

// ─── Optional fields ──────────────────────────────────────────────────────────

describe('Question optional fields', () => {
  it('explanation is optional — absence does not break the type', () => {
    const q: Question = {
      ...MC_QUESTION,
      id: 'q-no-explanation',
      explanation: undefined,
    };
    expect(q.explanation).toBeUndefined();
  });

  it('tags is optional — absence does not break the type', () => {
    const q: Question = {
      ...MC_QUESTION,
      id: 'q-no-tags',
      tags: undefined,
    };
    expect(q.tags).toBeUndefined();
  });

  it('tags can be an empty array', () => {
    const q: Question = { ...MC_QUESTION, id: 'q-empty-tags', tags: [] };
    expect(q.tags).toHaveLength(0);
  });
});

// ─── Status semantics ─────────────────────────────────────────────────────────

describe('QuestionStatus semantics', () => {
  it('Draft status value is "draft"', () => {
    const q: Question = { ...MC_QUESTION, id: 'q-draft', status: QuestionStatus.Draft };
    expect(q.status).toBe('draft');
  });

  it('Archived status value is "archived"', () => {
    const q: Question = { ...MC_QUESTION, id: 'q-archived', status: QuestionStatus.Archived };
    expect(q.status).toBe('archived');
  });
});
