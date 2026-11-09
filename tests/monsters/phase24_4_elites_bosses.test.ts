import { describe, it, expect, beforeEach } from 'vitest';
import {
  ELITE_BOSS_REGISTRY,
  getEliteOrBossEncounter,
} from '../../src/monsters/EliteBossRegistry';
import { BossEncounterController } from '../../src/monsters/BossEncounterController';
import { MonsterCategory } from '../../src/core/types/monster';
import { BattleSession } from '../../src/combat/BattleSession';
import { QuestionRepository } from '../../src/questions/retrieval/QuestionRepository';
import { createPlayerData } from '../../src/player/PlayerData';
import { EducationalTier, SubjectId } from '../../src/core/types/education';
import { Question, QuestionStatus, QuestionType } from '../../src/core/types/question';

describe('Phase 24.4 — Elites, Bosses, and Encounter Progression', () => {
  describe('Elite and Boss Registry Integrity', () => {
    it('contains stable IDs and properly categorized encounters', () => {
      const gargoyle = getEliteOrBossEncounter('prime-gargoyle');
      expect(gargoyle).toBeDefined();
      expect(gargoyle?.category).toBe(MonsterCategory.Elite);
      expect(gargoyle?.isElite).toBe(true);
      expect(gargoyle?.isBoss).toBe(false);

      const boss = getEliteOrBossEncounter('archivist-malakor');
      expect(boss).toBeDefined();
      expect(boss?.category).toBe(MonsterCategory.Boss);
      expect(boss?.isElite).toBe(false);
      expect(boss?.isBoss).toBe(true);
      expect(boss?.phases).toHaveLength(2);
    });

    it('defines rich drop tables and first-clear reward structures', () => {
      const boss = ELITE_BOSS_REGISTRY['archivist-malakor'];
      expect(boss.dropConfig.drops.length).toBeGreaterThan(0);
      expect(boss.firstClearBonus).toBeDefined();
      expect(boss.firstClearBonus?.gold).toBe(250);
      expect(boss.firstClearBonus?.exp).toBe(400);
      expect(boss.firstClearBonus?.itemId).toBe('amulet-of-logic');
    });
  });

  describe('BossEncounterController & Phase Progression', () => {
    let controller: BossEncounterController;
    const bossDef = ELITE_BOSS_REGISTRY['archivist-malakor'];

    beforeEach(() => {
      controller = new BossEncounterController(bossDef, false);
    });

    it('initializes at Phase 1 with base stats', () => {
      const progress = controller.getProgress();
      expect(progress.currentPhaseIndex).toBe(0);
      expect(progress.currentPhase?.name).toBe('Scholastic Thesis');

      const stats = controller.getEffectiveBossStats(bossDef.attack, bossDef.defense);
      expect(stats.attack).toBe(bossDef.attack);
      expect(stats.defense).toBe(bossDef.defense);
    });

    it('triggers Phase 2 transition when HP falls below 50%', () => {
      // 55% HP -> No phase change
      const trans1 = controller.evaluateHpThreshold(248, 450);
      expect(trans1).toBe(false);
      expect(controller.getProgress().currentPhaseIndex).toBe(0);

      // 45% HP -> Phase 2 triggered
      const trans2 = controller.evaluateHpThreshold(200, 450);
      expect(trans2).toBe(true);
      expect(controller.getProgress().currentPhaseIndex).toBe(1);
      expect(controller.getProgress().currentPhase?.name).toBe('Intellectual Enrage');
      expect(controller.getProgress().phaseAlertMessage).toContain('Attack increased by 35%');

      // Check enraged stats
      const stats = controller.getEffectiveBossStats(bossDef.attack, bossDef.defense);
      expect(stats.attack).toBe(Math.round(bossDef.attack * 1.35));
      expect(stats.defense).toBe(Math.round(bossDef.defense * 1.15));
    });

    it('awards first-clear bonus strictly once (idempotent reward protection)', () => {
      const reward1 = controller.claimFirstClearBonus();
      expect(reward1).toBeDefined();
      expect(reward1?.gold).toBe(250);

      // Second attempt on the same cleared state must return null
      const reward2 = controller.claimFirstClearBonus();
      expect(reward2).toBeNull();
    });

    it('does not grant first clear bonus if encounter was already completed previously', () => {
      const clearedController = new BossEncounterController(bossDef, true);
      expect(clearedController.claimFirstClearBonus()).toBeNull();
    });
  });

  describe('Combat Integration with BattleSession', () => {
    const testQuestions: Question[] = [
      {
        id: 'q-1',
        educationalTier: EducationalTier.Elementary,
        subject: SubjectId.Mathematics,
        topic: 'prime',
        difficulty: 3,
        type: QuestionType.MultipleChoice,
        question: 'Is 7 a prime number?',
        choices: [
          { choiceId: 'c1', text: 'Yes' },
          { choiceId: 'c2', text: 'No' },
        ],
        correctAnswer: 'c1',
        timeLimit: 30,
        baseMasteryExp: 15,
        status: QuestionStatus.Published,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    it('correctly locks question count bounds for Elite encounters (5–8 questions)', () => {
      const player = createPlayerData('p-1', 'Hero', { level: 6 });
      const eliteMonster = ELITE_BOSS_REGISTRY['prime-gargoyle'];
      const repo = new QuestionRepository(testQuestions);

      const session = new BattleSession({
        player,
        monster: eliteMonster,
        repository: repo,
      });

      const questionCount = session.getState().totalQuestionCount;
      expect(questionCount).toBeGreaterThanOrEqual(5);
      expect(questionCount).toBeLessThanOrEqual(8);
    });

    it('correctly locks question count bounds for Boss encounters (6–10 questions)', () => {
      const player = createPlayerData('p-1', 'Hero', { level: 10 });
      const bossMonster = ELITE_BOSS_REGISTRY['archivist-malakor'];
      const repo = new QuestionRepository(testQuestions);

      const session = new BattleSession({
        player,
        monster: bossMonster,
        repository: repo,
      });

      const questionCount = session.getState().totalQuestionCount;
      expect(questionCount).toBeGreaterThanOrEqual(6);
      expect(questionCount).toBeLessThanOrEqual(10);
    });
  });
});
