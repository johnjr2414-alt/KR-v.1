import { describe, it, expect } from 'vitest';
import {
  EducationalTier,
  SubjectId,
  MonsterCategory,
  QuestionType,
  QuestionStatus,
  AnswerOutcome,
  BattleOutcome,
} from '@/core/types';
import type {
  CharacterStats,
  PlayerState,
  MonsterDefinition,
  Question,
  MasteryRecord,
  BattleResult,
} from '@/core/types';

describe('Core Type Definitions', () => {
  it('should define all educational tiers', () => {
    expect(Object.values(EducationalTier)).toEqual([
      'elementary',
      'junior-high',
      'senior-high',
      'college',
      'masters',
      'phd',
      'specialization',
    ]);
  });

  it('should define all subject IDs', () => {
    expect(Object.values(SubjectId)).toHaveLength(6);
    expect(SubjectId.Mathematics).toBe('mathematics');
    expect(SubjectId.Programming).toBe('programming');
  });

  it('should define monster categories', () => {
    expect(Object.values(MonsterCategory)).toEqual([
      'weak', 'normal', 'strong', 'elite', 'boss',
    ]);
  });

  it('should define question types', () => {
    expect(QuestionType.MultipleChoice).toBe('multiple-choice');
    expect(QuestionType.Identification).toBe('identification');
    expect(QuestionType.Essay).toBe('essay');
  });

  it('should define question statuses', () => {
    expect(QuestionStatus.Draft).toBe('draft');
    expect(QuestionStatus.Published).toBe('published');
    expect(QuestionStatus.Archived).toBe('archived');
  });

  it('should define answer outcomes', () => {
    expect(AnswerOutcome.Correct).toBe('correct');
    expect(AnswerOutcome.Incorrect).toBe('incorrect');
    expect(AnswerOutcome.Timeout).toBe('timeout');
  });

  it('should define battle outcomes', () => {
    expect(BattleOutcome.Victory).toBe('victory');
    expect(BattleOutcome.Defeat).toBe('defeat');
  });

  it('should allow constructing a valid PlayerState object', () => {
    const stats: CharacterStats = {
      hp: 100, mp: 50, attack: 10, defense: 5,
      intelligence: 8, critRate: 5, movementSpeed: 1.0,
    };
    const player: PlayerState = {
      id: 'p1', name: 'Hero', level: 1,
      currentExp: 0, currentHp: 100, currentMp: 50,
      stats, gold: 0,
    };
    expect(player.level).toBe(1);
    expect(player.stats.hp).toBe(100);
  });

  it('should allow constructing a valid MonsterDefinition', () => {
    const monster: MonsterDefinition = {
      id: 'm1', name: 'Math Slime', level: 1,
      maxHp: 30, attack: 5, defense: 2,
      subject: SubjectId.Mathematics,
      category: MonsterCategory.Weak,
      baseExp: 15, baseGold: 5,
      dropConfig: { drops: [], bonusGoldMin: 0, bonusGoldMax: 2 },
      spriteColor: 0x22c55e,
      detectionRadius: 64,
    };
    expect(monster.subject).toBe('mathematics');
    expect(monster.category).toBe('weak');
  });

  it('should allow constructing a valid Question', () => {
    const q: Question = {
      id: 'q1',
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
      timeLimit: 15,
      baseMasteryExp: 20,
      status: QuestionStatus.Published,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    expect(q.correctAnswer).toBe('b');
    expect(q.choices).toHaveLength(4);
  });

  it('should allow constructing a valid MasteryRecord', () => {
    const record: MasteryRecord = {
      subject: SubjectId.Science,
      level: 5, currentExp: 120,
      totalCorrect: 40, totalAttempted: 55,
    };
    expect(record.level).toBe(5);
  });

  it('should allow constructing a valid BattleResult', () => {
    const result: BattleResult = {
      outcome: BattleOutcome.Victory,
      totalQuestions: 3, correctAnswers: 2,
      expEarned: 30, goldEarned: 10,
      masteryGains: [],
      subject: SubjectId.Mathematics,
      turns: [],
    };
    expect(result.outcome).toBe('victory');
    expect(result.totalQuestions).toBe(3);
  });
});
