import { describe, it, expect, beforeEach } from 'vitest';
import { BattleSession } from '../../src/combat/BattleSession';
import { BattleStatus } from '../../src/combat/BattleState';
import { AnswerOutcome, BattleOutcome } from '../../src/core/types/combat';
import { MonsterCategory, type MonsterDefinition } from '../../src/core/types/monster';
import { SubjectId } from '../../src/core/types/education';
import { createPlayerData } from '../../src/player/PlayerData';
import { QuestionRepository } from '../../src/questions/retrieval/QuestionRepository';
import { loadBundledQuestions } from '../../src/questions/retrieval/QuestionLoader';
import { MasteryManager } from '../../src/mastery/MasteryManager';
import { RewardCalculator } from '../../src/combat/rewards/RewardCalculator';
import type { AnswerEvaluationResult } from '../../src/questions/evaluation/AnswerEvaluator';

const MOCK_MONSTER: MonsterDefinition = {
  id: 'math-goblin',
  name: 'Math Goblin',
  level: 2,
  maxHp: 25,
  attack: 8,
  defense: 2,
  subject: SubjectId.Mathematics,
  category: MonsterCategory.Weak,
  baseExp: 15,
  baseGold: 10,
  dropConfig: { drops: [], bonusGoldMin: 0, bonusGoldMax: 0 },
  spriteColor: 0xef4444,
  detectionRadius: 60,
};

describe('Phase 20 Full Integration: Core Combat & Progression Loop', () => {
  let repo: QuestionRepository;
  let masteryManager: MasteryManager;
  let rewardCalculator: RewardCalculator;

  beforeEach(() => {
    const loaded = loadBundledQuestions();
    repo = new QuestionRepository(loaded.questions);
    masteryManager = new MasteryManager();
    rewardCalculator = new RewardCalculator();
  });

  it('runs complete battle from ready state to victory with dual EXP separation', () => {
    const player = createPlayerData('hero-1', 'Arthur', {
      level: 1,
      currentExp: 0,
      attack: 15,
      defense: 5,
      currentHp: 100,
      maxHp: 100,
    });

    const initialMathMasteryExp = masteryManager.getMastery(SubjectId.Mathematics).currentExp;
    const initialCombatExp = player.currentExp;

    const session = new BattleSession({
      player,
      monster: { ...MOCK_MONSTER },
      repository: repo,
      masteryManager,
      rewardCalculator,
      fixedQuestionCount: 3,
    });

    // 1. Initial State
    expect(session.getState().status).toBe(BattleStatus.Ready);
    expect(session.getState().totalQuestionCount).toBe(3);
    expect(session.getState().currentQuestionIndex).toBe(0);

    // 2. Turn 1: Correct Answer
    session.beginTurn();
    const q1 = session.getCurrentQuestion();
    expect(q1).toBeDefined();

    const evalCorrect: AnswerEvaluationResult = {
      outcome: AnswerOutcome.Correct,
      isCorrect: true,
      correctAnswerText: 'Answer 1',
      submittedAnswer: 'Answer 1',
    };

    const turn1 = session.processAnswer(evalCorrect);
    expect(turn1.outcome).toBe(AnswerOutcome.Correct);
    expect(turn1.damageToMonster).toBeGreaterThan(0);
    expect(turn1.damageToPlayer).toBe(0);

    // Turn 1 should award mastery EXP immediately
    const mathMasteryAfterTurn1 = masteryManager.getMastery(SubjectId.Mathematics).currentExp;
    expect(mathMasteryAfterTurn1).toBeGreaterThan(initialMathMasteryExp);

    // Turn 1 should NOT award Combat Character EXP yet (battle still active)
    expect(player.currentExp).toBe(initialCombatExp);

    // 3. Turn 2: Monster defeated (Turn 1 did 15-2=13 damage, monster has 25 HP, turn 2 kills it)
    session.beginTurn();
    const turn2 = session.processAnswer(evalCorrect);
    expect(turn2.damageToMonster).toBeGreaterThan(0);

    // 4. Verification of Battle End Summary
    expect(session.isBattleOver()).toBe(true);
    expect(session.getState().status).toBe(BattleStatus.Victory);

    const summary = session.getEndSummary();
    expect(summary.outcome).toBe(BattleOutcome.Victory);
    expect(summary.monsterDefeated).toBe(true);
    expect(summary.playerDefeated).toBe(false);
    expect(summary.expEarned).toBe(MOCK_MONSTER.baseExp);
    expect(summary.goldEarned).toBe(MOCK_MONSTER.baseGold);
    expect(summary.correctAnswers).toBe(2);
    expect(summary.incorrectAnswers).toBe(0);
    expect(summary.masteryGains.length).toBe(2);

    // Dual Progression Invariant Check:
    // Combat EXP comes from victory rewards, Mastery EXP comes strictly from question evaluation
    expect(summary.expEarned).toBe(15);
    expect(masteryManager.getMastery(SubjectId.Mathematics).totalCorrect).toBe(2);
    expect(masteryManager.getMastery(SubjectId.Science).totalCorrect).toBe(0);
  });

  it('runs complete battle ending in defeat when player takes fatal damage', () => {
    // Fragile player with only 5 HP and 0 DEF
    const player = createPlayerData('hero-fragile', 'Weakling', {
      currentHp: 5,
      maxHp: 5,
      defense: 0,
    });

    const session = new BattleSession({
      player,
      monster: { ...MOCK_MONSTER, attack: 12 },
      repository: repo,
      masteryManager,
      rewardCalculator,
      fixedQuestionCount: 3,
    });

    session.beginTurn();
    const evalIncorrect: AnswerEvaluationResult = {
      outcome: AnswerOutcome.Incorrect,
      isCorrect: false,
      correctAnswerText: 'Answer 1',
      submittedAnswer: 'Wrong Answer',
    };

    const turn1 = session.processAnswer(evalIncorrect);
    expect(turn1.outcome).toBe(AnswerOutcome.Incorrect);
    expect(turn1.damageToPlayer).toBeGreaterThanOrEqual(5);

    expect(session.isBattleOver()).toBe(true);
    expect(session.getState().status).toBe(BattleStatus.Defeat);

    const summary = session.getEndSummary();
    expect(summary.outcome).toBe(BattleOutcome.Defeat);
    expect(summary.playerDefeated).toBe(true);
    expect(summary.expEarned).toBe(0);
    expect(summary.goldEarned).toBe(0);
  });

  it('marks monster escaped when questions are exhausted before either defeats the other', () => {
    // Tanky player and tanky monster
    const player = createPlayerData('hero-tank', 'Tank', {
      currentHp: 500,
      maxHp: 500,
      attack: 2, // low attack
      defense: 50, // high defense
    });

    const session = new BattleSession({
      player,
      monster: { ...MOCK_MONSTER, maxHp: 500, defense: 10 },
      repository: repo,
      masteryManager,
      rewardCalculator,
      fixedQuestionCount: 1, // only 1 question
    });

    session.beginTurn();
    const evalCorrect: AnswerEvaluationResult = {
      outcome: AnswerOutcome.Correct,
      isCorrect: true,
      correctAnswerText: 'Answer 1',
      submittedAnswer: 'Answer 1',
    };

    session.processAnswer(evalCorrect);

    expect(session.isBattleOver()).toBe(true);
    expect(session.getState().status).toBe(BattleStatus.MonsterEscaped);
  });
});
