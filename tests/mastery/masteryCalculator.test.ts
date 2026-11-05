import { describe, it, expect } from 'vitest';
import { MasteryCalculator } from '../../src/mastery/MasteryCalculator';
import { EducationalTier, SubjectId } from '../../src/core/types/education';
import { QuestionType, QuestionStatus, type Question } from '../../src/core/types/question';

const SAMPLE_QUESTION: Question = {
  id: 'q-sample',
  educationalTier: EducationalTier.Elementary,
  subject: SubjectId.Mathematics,
  topic: 'math',
  difficulty: 1,
  type: QuestionType.MultipleChoice,
  question: 'What is 1 + 1?',
  correctAnswer: 'a',
  timeLimit: 20,
  baseMasteryExp: 20,
  status: QuestionStatus.Published,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('MasteryCalculator', () => {
  const calc = new MasteryCalculator();

  it('awards 0 EXP for incorrect answers or timeouts', () => {
    const res = calc.calculateExp({
      question: SAMPLE_QUESTION,
      isCorrect: false,
      timeRemaining: 15,
      timeLimit: 20,
      currentStreak: 5,
    });

    expect(res.totalExpGained).toBe(0);
  });

  it('awards baseline EXP on standard correct answer without speed/streak bonus', () => {
    const res = calc.calculateExp({
      question: SAMPLE_QUESTION,
      isCorrect: true,
      timeRemaining: 5, // 5/20 = 0.25 <= 0.5 threshold
      timeLimit: 20,
      currentStreak: 0,
    });

    // 20 Base * 1.0 Tier * 1.0 Diff * 1.0 Speed * 1.0 Streak = 20
    expect(res.totalExpGained).toBe(20);
    expect(res.speedMultiplier).toBe(1.0);
    expect(res.streakMultiplier).toBe(1.0);
  });

  it('applies tier multipliers properly', () => {
    const jhQuestion: Question = {
      ...SAMPLE_QUESTION,
      educationalTier: EducationalTier.JuniorHigh,
    };

    const res = calc.calculateExp({
      question: jhQuestion,
      isCorrect: true,
      timeRemaining: 5,
      timeLimit: 20,
      currentStreak: 0,
    });

    // 20 Base * 1.5 Tier = 30
    expect(res.totalExpGained).toBe(30);
    expect(res.tierMultiplier).toBe(1.5);
  });

  it('applies speed bonus when answering with more than 50% time remaining', () => {
    const res = calc.calculateExp({
      question: SAMPLE_QUESTION,
      isCorrect: true,
      timeRemaining: 16, // 16/20 = 0.8 > 0.5 -> 1.0 + 0.5 * 0.8 = 1.4
      timeLimit: 20,
      currentStreak: 0,
    });

    expect(res.speedMultiplier).toBeCloseTo(1.4);
    // 20 * 1.4 = 28
    expect(res.totalExpGained).toBe(28);
  });

  it('applies streak multipliers up to max cap', () => {
    // 5 streak * 0.05 = +0.25 -> 1.25 multiplier
    const res = calc.calculateExp({
      question: SAMPLE_QUESTION,
      isCorrect: true,
      timeRemaining: 5,
      timeLimit: 20,
      currentStreak: 5,
    });

    expect(res.streakMultiplier).toBeCloseTo(1.25);
    // 20 * 1.25 = 25
    expect(res.totalExpGained).toBe(25);
  });
});
