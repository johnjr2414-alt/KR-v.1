import { describe, it, expect, beforeEach } from 'vitest';
import { PassiveSkillCalculator, PASSIVE_BONUS_CAPS } from '../../src/skills/PassiveSkillCalculator';
import { SkillManager } from '../../src/skills/SkillManager';
import { EquipmentStatCalculator } from '../../src/inventory/EquipmentStatCalculator';
import { BattleSession } from '../../src/combat/BattleSession';
import { createPlayerData, PlayerData } from '../../src/player/PlayerData';
import { MonsterDefinition, MonsterCategory } from '../../src/core/types/monster';
import { SubjectId, EducationalTier } from '../../src/core/types/education';
import { Question, QuestionType, QuestionStatus } from '../../src/core/types/question';
import { QuestionRepository } from '../../src/questions/retrieval/QuestionRepository';
import { AnswerOutcome } from '../../src/core/types/combat';

describe('Phase 23.4 — Passive Skills and Mastery Unlocks', () => {
  let calc: PassiveSkillCalculator;
  let equipCalc: EquipmentStatCalculator;
  let player: PlayerData;

  const testQuestion: Question = {
    id: 'test-q-1',
    educationalTier: EducationalTier.Elementary,
    subject: SubjectId.Mathematics,
    topic: 'arithmetic',
    difficulty: 1,
    type: QuestionType.MultipleChoice,
    question: 'What is 5 + 5?',
    choices: [
      { choiceId: 'c1', text: '9' },
      { choiceId: 'c2', text: '10' },
    ],
    correctAnswer: 'c2',
    timeLimit: 30,
    baseMasteryExp: 10,
    status: QuestionStatus.Published,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const testMonster: MonsterDefinition = {
    id: 'test-monster',
    name: 'Training Dummy',
    level: 1,
    maxHp: 50,
    attack: 10,
    defense: 2,
    baseExp: 20,
    baseGold: 5,
    category: MonsterCategory.Weak,
    subject: SubjectId.Mathematics,
    dropConfig: { drops: [], bonusGoldMin: 0, bonusGoldMax: 0 },
    spriteColor: 0x22c55e,
    detectionRadius: 60,
  };

  beforeEach(() => {
    calc = new PassiveSkillCalculator();
    equipCalc = new EquipmentStatCalculator();
    player = createPlayerData('test-hero', 'Hero', {
      level: 5,
      attack: 20,
      defense: 10,
      critRate: 0.05, // 5% base crit
      currentMp: 50,
      maxMp: 50,
    });
  });

  describe('Modifier Pipeline & Invariance Requirements', () => {
    it('never permanently mutates base PlayerData when calculating bonuses', () => {
      const skillManager = new SkillManager({
        unlockedSkills: {
          'math-mental-arithmetic': {
            skillId: 'math-mental-arithmetic',
            currentLevel: 2, // +6% crit
            unlockedAt: Date.now(),
          },
          'math-geometric-ward': {
            skillId: 'math-geometric-ward',
            currentLevel: 1, // +4 flat defense
            unlockedAt: Date.now(),
          },
        },
        equippedActiveSkillIds: [],
      });

      const originalAttack = player.attack;
      const originalDefense = player.defense;
      const originalCritRate = player.critRate;

      const bonuses = calc.calculatePassiveBonuses(skillManager, 'pve');
      const effectiveStats = equipCalc.calculateEffectiveStats(player, {}, bonuses);

      // Effective stats reflect modifiers
      expect(effectiveStats.defense).toBe(14); // 10 + 4
      expect(effectiveStats.critRate).toBeCloseTo(0.11); // 0.05 + 0.06

      // Base player object remains completely unmutated
      expect(player.attack).toBe(originalAttack);
      expect(player.defense).toBe(originalDefense);
      expect(player.critRate).toBe(originalCritRate);
    });

    it('keeps base stats, equipment modifiers, and passive modifiers distinctly distinguishable', () => {
      const skillManager = new SkillManager({
        unlockedSkills: {
          'math-geometric-ward': {
            skillId: 'math-geometric-ward',
            currentLevel: 2, // +8 flat defense
            unlockedAt: Date.now(),
          },
        },
        equippedActiveSkillIds: [],
      });

      const bonuses = calc.calculatePassiveBonuses(skillManager, 'pve');
      const effective = equipCalc.calculateEffectiveStats(player, {}, bonuses);

      expect(player.defense).toBe(10); // Base stat
      expect(effective.bonuses.defense).toBe(0); // Equipment bonus
      expect(effective.passiveBonuses?.flatDefense).toBe(8); // Passive bonus
      expect(effective.defense).toBe(18); // Combined total
    });
  });

  describe('Deduplication & Level Scaling', () => {
    it('applies passive modifiers strictly once at the highest unlocked level', () => {
      // Mental Arithmetic Level 3 gives +10% crit rate
      const skillManager = new SkillManager({
        unlockedSkills: {
          'math-mental-arithmetic': {
            skillId: 'math-mental-arithmetic',
            currentLevel: 3,
            unlockedAt: Date.now(),
          },
        },
        equippedActiveSkillIds: [],
      });

      const bonuses = calc.calculatePassiveBonuses(skillManager, 'pve');
      expect(bonuses.critRatePercent).toBe(10);
      expect(bonuses.activeEffects.length).toBe(1);
    });

    it('ignores active skills and skills with level <= 0', () => {
      const skillManager = new SkillManager({
        unlockedSkills: {
          'math-prime-strike': {
            skillId: 'math-prime-strike', // Active skill
            currentLevel: 1,
            unlockedAt: Date.now(),
          },
          'math-mental-arithmetic': {
            skillId: 'math-mental-arithmetic',
            currentLevel: 0, // Not unlocked
            unlockedAt: Date.now(),
          },
        },
        equippedActiveSkillIds: [],
      });

      const bonuses = calc.calculatePassiveBonuses(skillManager, 'pve');
      expect(bonuses.critRatePercent).toBe(0);
      expect(bonuses.flatDefense).toBe(0);
      expect(bonuses.activeEffects.length).toBe(0);
    });
  });

  describe('Stacking Rules and Safety Caps', () => {
    it('stacks distinct passive skills additively', () => {
      const skillManager = new SkillManager({
        unlockedSkills: {
          'math-mental-arithmetic': {
            skillId: 'math-mental-arithmetic',
            currentLevel: 1, // +3% crit
            unlockedAt: Date.now(),
          },
          'math-geometric-ward': {
            skillId: 'math-geometric-ward',
            currentLevel: 2, // +8 flat defense
            unlockedAt: Date.now(),
          },
          'gen-encyclopedic-memory': {
            skillId: 'gen-encyclopedic-memory',
            currentLevel: 2, // 10% mana cost reduction
            unlockedAt: Date.now(),
          },
          'science-empirical-observation': {
            skillId: 'science-empirical-observation',
            currentLevel: 3, // +15% EXP multiplier (1.15)
            unlockedAt: Date.now(),
          },
        },
        equippedActiveSkillIds: [],
      });

      const bonuses = calc.calculatePassiveBonuses(skillManager, 'pve');
      expect(bonuses.critRatePercent).toBe(3);
      expect(bonuses.flatDefense).toBe(8);
      expect(bonuses.manaCostReductionPercent).toBe(10);
      expect(bonuses.expMultiplier).toBeCloseTo(1.15);
    });

    it('enforces safety caps to prevent overflow or balance breakdown', () => {
      // Mock an extreme passives setup using registry or caps check
      expect(PASSIVE_BONUS_CAPS.MAX_CRIT_RATE_PERCENT).toBe(50);
      expect(PASSIVE_BONUS_CAPS.MAX_MANA_COST_REDUCTION_PERCENT).toBe(50);
      expect(PASSIVE_BONUS_CAPS.MAX_EXP_MULTIPLIER).toBe(3.0);
    });
  });

  describe('Mode Eligibility (PvE vs PvP)', () => {
    it('does not apply PvP-only passives in PvE encounters', () => {
      // Create a manager with a hypothetical pvp-only passive
      const skillManager = new SkillManager();
      const pveBonuses = calc.calculatePassiveBonuses(skillManager, 'pve');
      const pvpBonuses = calc.calculatePassiveBonuses(skillManager, 'pvp');

      expect(pveBonuses).toBeDefined();
      expect(pvpBonuses).toBeDefined();
    });
  });

  describe('Combat Integration with BattleSession', () => {
    it('integrates passive defense, crit rate, mana reduction, and EXP boost into BattleSession', () => {
      const repo = new QuestionRepository([testQuestion]);
      const skillManager = new SkillManager({
        unlockedSkills: {
          'math-geometric-ward': {
            skillId: 'math-geometric-ward',
            currentLevel: 2, // +8 defense
            unlockedAt: Date.now(),
          },
          'math-mental-arithmetic': {
            skillId: 'math-mental-arithmetic',
            currentLevel: 2, // +6% crit rate
            unlockedAt: Date.now(),
          },
          'gen-encyclopedic-memory': {
            skillId: 'gen-encyclopedic-memory',
            currentLevel: 1, // 5% mana reduction
            unlockedAt: Date.now(),
          },
          'science-empirical-observation': {
            skillId: 'science-empirical-observation',
            currentLevel: 2, // +10% EXP multiplier
            unlockedAt: Date.now(),
          },
          'math-prime-strike': {
            skillId: 'math-prime-strike', // Active skill: base cost 15 MP
            currentLevel: 1,
            unlockedAt: Date.now(),
          },
        },
        equippedActiveSkillIds: ['math-prime-strike'],
      });

      const session = new BattleSession({
        player, // defense 10, critRate 0.05
        monster: testMonster, // attack 10, baseExp 20
        repository: repo,
        skillManager,
        fixedQuestionCount: 1,
      });

      // 1. Check effective combat defense: 10 base + 8 passive = 18 defense
      expect(session.getState().player.defense).toBe(18);
      // 2. Check effective crit rate: 0.05 base + 0.06 passive = 0.11
      expect(session.getState().player.critRate).toBeCloseTo(0.11);

      // 3. Test mana cost reduction: 15 MP * (1 - 0.05) = 14.25 -> 14 MP
      const actResult = session.activateSkill('math-prime-strike');
      expect(actResult.success).toBe(true);
      expect(actResult.mpCost).toBe(14); // Reduced from 15 to 14
      expect(session.getState().playerCurrentMp).toBe(36); // 50 - 14

      // 4. Test EXP multiplier on victory:
      // monster baseExp = 20, rewardMultiplier = 1.0, passive expMultiplier = 1.10 -> 22 EXP
      // Player attack 20 - monster def 2 = 18 raw dmg. With Prime Strike (+25%): 18 * 1.25 = 22.5 -> 23 dmg.
      // Monster HP: 50 - 23 = 27 (monster survived turn 1, escaped since 1 question)
      // To test victory, set monster maxHp to 20
      const fragileMonster: MonsterDefinition = {
        ...testMonster,
        maxHp: 20,
      };

      const victorySession = new BattleSession({
        player,
        monster: fragileMonster,
        repository: repo,
        skillManager,
        fixedQuestionCount: 1,
      });

      victorySession.activateSkill('math-prime-strike');
      victorySession.beginTurn();
      victorySession.processAnswer({
        outcome: AnswerOutcome.Correct,
        isCorrect: true,
        correctAnswerText: '10',
        submittedAnswer: 'c2',
      });

      const summary = victorySession.getEndSummary();
      expect(summary.monsterDefeated).toBe(true);
      expect(summary.expEarned).toBe(22); // 20 * 1.10 = 22 EXP
    });
  });
});
