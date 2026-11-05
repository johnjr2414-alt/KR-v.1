import { describe, it, expect, vi } from 'vitest';
import { MasteryManager } from '../../src/mastery/MasteryManager';
import { EducationalTier, SubjectId } from '../../src/core/types/education';
import { QuestionType, QuestionStatus, type Question } from '../../src/core/types/question';

const SAMPLE_QUESTION: Question = {
  id: 'q-math-1',
  educationalTier: EducationalTier.Elementary,
  subject: SubjectId.Mathematics,
  topic: 'math',
  difficulty: 1,
  type: QuestionType.MultipleChoice,
  question: 'What is 5 + 5?',
  correctAnswer: 'a',
  timeLimit: 20,
  baseMasteryExp: 50,
  status: QuestionStatus.Published,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('MasteryManager', () => {
  it('initializes default records for all active subjects', () => {
    const manager = new MasteryManager();
    const math = manager.getMastery(SubjectId.Mathematics);

    expect(math.level).toBe(1);
    expect(math.currentExp).toBe(0);
    expect(math.totalCorrect).toBe(0);
    expect(math.totalAttempted).toBe(0);
  });

  it('updates lifetime statistics on attempt', () => {
    const manager = new MasteryManager();

    manager.processAnswerAttempt({
      question: SAMPLE_QUESTION,
      isCorrect: true,
      timeRemaining: 10,
      timeLimit: 20,
      currentStreak: 1,
    });

    const math = manager.getMastery(SubjectId.Mathematics);
    expect(math.totalAttempted).toBe(1);
    expect(math.totalCorrect).toBe(1);

    manager.processAnswerAttempt({
      question: SAMPLE_QUESTION,
      isCorrect: false,
      timeRemaining: 0,
      timeLimit: 20,
      currentStreak: 0,
    });

    const mathAfter = manager.getMastery(SubjectId.Mathematics);
    expect(mathAfter.totalAttempted).toBe(2);
    expect(mathAfter.totalCorrect).toBe(1);
  });

  it('triggers level up when enough EXP is accumulated', () => {
    const manager = new MasteryManager();
    const onLevelUp = vi.fn();
    manager.onLevelUp(onLevelUp);

    // Lv 1 requirement: 40 * 1^2 + 60 * 1 = 100 EXP.
    // Award 150 EXP -> reaches Lv 2 with 50 leftover EXP.
    const bigQuestion: Question = {
      ...SAMPLE_QUESTION,
      baseMasteryExp: 150,
    };

    const { gainResult } = manager.processAnswerAttempt({
      question: bigQuestion,
      isCorrect: true,
      timeRemaining: 0,
      timeLimit: 20,
      currentStreak: 0,
    });

    expect(gainResult.leveledUp).toBe(true);
    expect(gainResult.newLevel).toBe(2);
    expect(onLevelUp).toHaveBeenCalledWith(SubjectId.Mathematics, 1, 2);

    const math = manager.getMastery(SubjectId.Mathematics);
    expect(math.level).toBe(2);
    expect(math.currentExp).toBe(50);
  });

  it('calculates progress percentage correctly', () => {
    const manager = new MasteryManager();
    const progress = manager.getProgress(SubjectId.Mathematics);

    expect(progress.currentLevel).toBe(1);
    expect(progress.currentExp).toBe(0);
    expect(progress.requiredExp).toBe(100);
    expect(progress.progressRatio).toBe(0);
    expect(progress.isMaxLevel).toBe(false);
  });
});
