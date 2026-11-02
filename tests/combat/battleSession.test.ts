import { describe, it, expect } from 'vitest';
import { BattleSession } from '../../src/combat/BattleSession';
import { BattleStatus } from '../../src/combat/BattleState';
import { AnswerOutcome, BattleOutcome } from '../../src/core/types/combat';
import { MonsterCategory, type MonsterDefinition } from '../../src/core/types/monster';
import { SubjectId } from '../../src/core/types/education';
import { createPlayerData, type PlayerData } from '../../src/player/PlayerData';
import { QuestionRepository } from '../../src/questions/retrieval/QuestionRepository';
import { loadBundledQuestions } from '../../src/questions/retrieval/QuestionLoader';
import type { AnswerEvaluationResult } from '../../src/questions/evaluation/AnswerEvaluator';

const MOCK_MONSTER: MonsterDefinition = {
  id: 'test-slime',
  name: 'Test Slime',
  level: 1,
  maxHp: 20,
  attack: 10,
  defense: 2,
  subject: SubjectId.Mathematics,
  category: MonsterCategory.Weak,
  baseExp: 10,
  baseGold: 5,
  dropConfig: { drops: [], bonusGoldMin: 0, bonusGoldMax: 1 },
  spriteColor: 0x22c55e,
  detectionRadius: 60,
};

describe('BattleSession', () => {
  const loaded = loadBundledQuestions();
  const repo = new QuestionRepository(loaded.questions);

  function createTestSession(customPlayer?: Partial<Omit<PlayerData, 'id' | 'name'>>, fixedCount = 3) {
    const player = createPlayerData('test-player', 'Hero', customPlayer);
    return new BattleSession({
      player,
      monster: { ...MOCK_MONSTER },
      repository: repo,
      fixedQuestionCount: fixedCount,
    });
  }

  it('initializes battle state properly', () => {
    const session = createTestSession({}, 3);
    const state = session.getState();

    expect(state.status).toBe(BattleStatus.Ready);
    expect(state.totalQuestionCount).toBe(3);
    expect(state.currentQuestionIndex).toBe(0);
    expect(state.monsterCurrentHp).toBe(20);
    expect(state.playerCurrentHp).toBe(100);
    expect(state.questions.length).toBeGreaterThanOrEqual(1);
  });

  it('damages monster and records turn when correct answer is processed', () => {
    const session = createTestSession({ attack: 12 }, 3); // 12 ATK - 2 DEF = 10 damage
    session.beginTurn();

    const evalResult: AnswerEvaluationResult = {
      outcome: AnswerOutcome.Correct,
      isCorrect: true,
      correctAnswerText: 'Answer',
      submittedAnswer: 'Answer',
    };

    const turn = session.processAnswer(evalResult, false);

    expect(turn.outcome).toBe(AnswerOutcome.Correct);
    expect(turn.damageToMonster).toBe(10);
    expect(turn.damageToPlayer).toBe(0);
    expect(session.getState().monsterCurrentHp).toBe(10);
    expect(session.getState().playerCurrentHp).toBe(100);
  });

  it('damages player (DAMAGE-PLAYER rule) when incorrect answer is processed', () => {
    const session = createTestSession({ defense: 4 }, 3); // 10 monster ATK - 4 DEF = 6 damage
    session.beginTurn();

    const evalResult: AnswerEvaluationResult = {
      outcome: AnswerOutcome.Incorrect,
      isCorrect: false,
      correctAnswerText: 'B: 4',
      submittedAnswer: 'A',
    };

    const turn = session.processAnswer(evalResult);

    expect(turn.outcome).toBe(AnswerOutcome.Incorrect);
    expect(turn.damageToPlayer).toBe(6);
    expect(turn.damageToMonster).toBe(0);
    expect(session.getState().playerCurrentHp).toBe(94);
  });

  it('damages player on timeout', () => {
    const session = createTestSession({ defense: 2 }, 3); // 10 - 2 = 8 damage
    session.beginTurn();

    const evalResult: AnswerEvaluationResult = {
      outcome: AnswerOutcome.Timeout,
      isCorrect: false,
      correctAnswerText: 'B: 4',
      submittedAnswer: '',
    };

    const turn = session.processAnswer(evalResult);
    expect(turn.outcome).toBe(AnswerOutcome.Timeout);
    expect(turn.damageToPlayer).toBe(8);
  });

  it('achieves Victory when monster HP drops to 0', () => {
    // 25 ATK - 2 DEF = 23 damage (monster has 20 HP)
    const session = createTestSession({ attack: 25 }, 3);
    session.beginTurn();

    const evalResult: AnswerEvaluationResult = {
      outcome: AnswerOutcome.Correct,
      isCorrect: true,
      correctAnswerText: 'Correct',
      submittedAnswer: 'Correct',
    };

    session.processAnswer(evalResult, false);

    expect(session.getState().status).toBe(BattleStatus.Victory);
    expect(session.isBattleOver()).toBe(true);

    const summary = session.getEndSummary();
    expect(summary.outcome).toBe(BattleOutcome.Victory);
    expect(summary.monsterDefeated).toBe(true);
    expect(summary.expEarned).toBe(MOCK_MONSTER.baseExp);
    expect(summary.goldEarned).toBe(MOCK_MONSTER.baseGold);
  });

  it('results in Defeat when player HP drops to 0', () => {
    // Player has only 5 HP; monster deals 10 - 2 = 8 damage
    const session = createTestSession({ currentHp: 5, defense: 2 }, 3);
    session.beginTurn();

    const evalResult: AnswerEvaluationResult = {
      outcome: AnswerOutcome.Incorrect,
      isCorrect: false,
      correctAnswerText: 'Correct',
      submittedAnswer: 'Wrong',
    };

    session.processAnswer(evalResult);

    expect(session.getState().status).toBe(BattleStatus.Defeat);
    expect(session.isBattleOver()).toBe(true);

    const summary = session.getEndSummary();
    expect(summary.outcome).toBe(BattleOutcome.Defeat);
    expect(summary.playerDefeated).toBe(true);
    expect(summary.expEarned).toBe(0);
  });

  it('marks MonsterEscaped if questions are exhausted and monster survives', () => {
    // Player deals 2 damage per turn, monster has 20 HP, 2 questions total
    const session = createTestSession({ attack: 4 }, 2); // 4 - 2 = 2 damage/turn
    session.beginTurn();

    const correctEval: AnswerEvaluationResult = {
      outcome: AnswerOutcome.Correct,
      isCorrect: true,
      correctAnswerText: 'A',
      submittedAnswer: 'A',
    };

    session.processAnswer(correctEval);
    expect(session.getState().status).toBe(BattleStatus.TurnResolved);

    session.beginTurn();
    session.processAnswer(correctEval);

    expect(session.getState().status).toBe(BattleStatus.MonsterEscaped);
    expect(session.isBattleOver()).toBe(true);
  });
});
