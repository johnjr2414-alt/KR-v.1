import { describe, it, expect, beforeEach } from 'vitest';
import { BattleSession } from '../../src/combat/BattleSession';
import { BattleStatus } from '../../src/combat/BattleState';
import { SkillManager } from '../../src/skills/SkillManager';
import { QuestionRepository } from '../../src/questions/retrieval/QuestionRepository';
import { createPlayerData, PlayerData } from '../../src/player/PlayerData';
import { MonsterDefinition, MonsterCategory } from '../../src/core/types/monster';
import { SubjectId, EducationalTier } from '../../src/core/types/education';
import { Question, QuestionType, QuestionStatus } from '../../src/core/types/question';
import { AnswerOutcome } from '../../src/core/types/combat';

describe('Phase 23.3 — Active Skills and Combat Integration', () => {
  let player: PlayerData;
  let monster: MonsterDefinition;
  let repo: QuestionRepository;
  let skillManager: SkillManager;
  let session: BattleSession;

  const testQuestion: Question = {
    id: 'test-q-1',
    educationalTier: EducationalTier.Elementary,
    subject: SubjectId.Mathematics,
    topic: 'arithmetic',
    difficulty: 1,
    type: QuestionType.MultipleChoice,
    question: 'What is 2 + 2?',
    choices: [
      { choiceId: 'c1', text: '3' },
      { choiceId: 'c2', text: '4' },
      { choiceId: 'c3', text: '5' },
      { choiceId: 'c4', text: '6' },
    ],
    correctAnswer: 'c2',
    timeLimit: 30,
    baseMasteryExp: 10,
    status: QuestionStatus.Published,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    player = createPlayerData('hero-1', 'Hero', {
      level: 5,
      currentHp: 100,
      maxHp: 100,
      currentMp: 50,
      maxMp: 50,
      attack: 20,
      defense: 10,
    });

    monster = {
      id: 'monster-slime',
      name: 'Slime',
      level: 3,
      maxHp: 100,
      attack: 15,
      defense: 5,
      baseExp: 25,
      baseGold: 10,
      category: MonsterCategory.Weak,
      subject: SubjectId.Mathematics,
      dropConfig: { drops: [], bonusGoldMin: 0, bonusGoldMax: 0 },
      spriteColor: 0x22c55e,
      detectionRadius: 60,
    };

    repo = new QuestionRepository([testQuestion]);
    skillManager = new SkillManager({
      unlockedSkills: {
        'math-prime-strike': {
          skillId: 'math-prime-strike',
          currentLevel: 1,
          unlockedAt: Date.now(),
        },
        'science-empirical-shield': {
          skillId: 'science-empirical-shield',
          currentLevel: 1,
          unlockedAt: Date.now(),
        },
        'gen-rallying-insight': {
          skillId: 'gen-rallying-insight',
          currentLevel: 1,
          unlockedAt: Date.now(),
        },
      },
      equippedActiveSkillIds: ['math-prime-strike', 'science-empirical-shield', 'gen-rallying-insight'],
    });

    session = new BattleSession({
      player,
      monster,
      repository: repo,
      skillManager,
      fixedQuestionCount: 5,
    });
  });

  describe('Skill Activation Validation and MP Consumption', () => {
    it('successfully activates an unlocked active skill, consumes MP, and sets cooldown', () => {
      expect(session.getState().playerCurrentMp).toBe(50);
      const result = session.activateSkill('math-prime-strike');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Activated Prime Strike!');
      expect(session.getState().playerCurrentMp).toBe(35); // 50 - 15 MP
      expect(session.getSkillTracker().getCooldown('math-prime-strike')).toBe(3);
      expect(session.getSkillTracker().getDamageMultiplier()).toBe(1.25);
    });

    it('rejects activation when MP is insufficient without deducting MP or setting cooldown', () => {
      const lowMpPlayer = createPlayerData('hero-low-mp', 'Hero Low MP', {
        currentMp: 10,
        maxMp: 50,
      });
      const lowMpSession = new BattleSession({
        player: lowMpPlayer,
        monster,
        repository: repo,
        skillManager,
      });

      const result = lowMpSession.activateSkill('math-prime-strike');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient MP');
      expect(lowMpSession.getState().playerCurrentMp).toBe(10);
      expect(lowMpSession.getSkillTracker().isSkillOnCooldown('math-prime-strike')).toBe(false);
    });

    it('rejects activation when skill is currently on cooldown', () => {
      const first = session.activateSkill('math-prime-strike');
      expect(first.success).toBe(true);

      const second = session.activateSkill('math-prime-strike');
      expect(second.success).toBe(false);
      expect(second.error).toContain('on cooldown');
    });

    it('rejects activation for passive skills', () => {
      // math-mental-arithmetic is a passive skill
      const result = session.activateSkill('math-mental-arithmetic');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot activate a passive skill');
    });

    it('rejects activation if player has not unlocked the skill', () => {
      const freshManager = new SkillManager(); // empty unlockedSkills
      const restrictedSession = new BattleSession({
        player,
        monster,
        repository: repo,
        skillManager: freshManager,
      });

      const result = restrictedSession.activateSkill('math-prime-strike');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Skill is not unlocked');
    });

    it('rejects activation if battle has already ended', () => {
      // Create session where player has 1 HP and monster deals lethal damage
      const fragilePlayer = createPlayerData('fragile', 'Hero', { currentHp: 1, defense: 0 });
      const lethalSession = new BattleSession({
        player: fragilePlayer,
        monster,
        repository: repo,
        skillManager,
      });
      lethalSession.beginTurn();
      lethalSession.processAnswer({
        outcome: AnswerOutcome.Incorrect,
        isCorrect: false,
        correctAnswerText: '4',
        submittedAnswer: 'c1',
      });
      expect(lethalSession.getState().status).toBe(BattleStatus.Defeat);

      const result = lethalSession.activateSkill('math-prime-strike');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot activate skills when battle is over');
    });
  });

  describe('Combat Mechanics Integration (Damage Boost, Shields, Heals)', () => {
    it('applies Prime Strike damage multiplier upon answering correctly', () => {
      // Player attack 20, monster defense 5 -> base damage = 20 - 5 = 15
      // Activate math-prime-strike (+25% damage boost) -> 15 * 1.25 = 18.75 -> rounded to 19
      session.activateSkill('math-prime-strike');
      session.beginTurn();

      const turn = session.processAnswer({
        outcome: AnswerOutcome.Correct,
        isCorrect: true,
        correctAnswerText: '4',
        submittedAnswer: 'c2',
      });

      expect(turn.outcome).toBe(AnswerOutcome.Correct);
      expect(turn.damageToMonster).toBe(19);
      expect(turn.damageToPlayer).toBe(0);
      expect(session.getState().monsterCurrentHp).toBe(81);
    });

    it('absorbs monster damage with Empirical Shield on incorrect answer', () => {
      // Monster attack 15, player defense 10 -> base damage = 15 - 10 = 5
      // Activate science-empirical-shield (absorbs up to 30 damage)
      session.activateSkill('science-empirical-shield');
      expect(session.getSkillTracker().getShieldAbsorption()).toBe(30);

      session.beginTurn();
      const turn = session.processAnswer({
        outcome: AnswerOutcome.Incorrect,
        isCorrect: false,
        correctAnswerText: '4',
        submittedAnswer: 'c1',
      });

      expect(turn.outcome).toBe(AnswerOutcome.Incorrect);
      // Monster dealt 5 damage, fully absorbed by shield
      expect(turn.damageToPlayer).toBe(0);
      expect(session.getSkillTracker().getShieldAbsorption()).toBe(25);
      expect(session.getState().playerCurrentHp).toBe(100);
    });

    it('partially absorbs damage when monster attack exceeds shield capacity', () => {
      session.activateSkill('science-empirical-shield');
      // Consume 28 points of shield
      session.getSkillTracker().absorbDamage(28);
      expect(session.getSkillTracker().getShieldAbsorption()).toBe(2);

      // Monster deals 5 damage -> shield absorbs 2 -> 3 passes through to player
      session.beginTurn();
      const turn = session.processAnswer({
        outcome: AnswerOutcome.Incorrect,
        isCorrect: false,
        correctAnswerText: '4',
        submittedAnswer: 'c1',
      });

      expect(turn.damageToPlayer).toBe(3);
      expect(session.getSkillTracker().getShieldAbsorption()).toBe(0);
      expect(session.getState().playerCurrentHp).toBe(97);
    });

    it('applies direct healing with Rallying Insight without exceeding max HP', () => {
      const damagedPlayer = createPlayerData('damaged-player', 'Damaged', {
        currentHp: 60,
        maxHp: 100,
        currentMp: 50,
      });
      const damagedSession = new BattleSession({
        player: damagedPlayer,
        monster,
        repository: repo,
        skillManager,
      });

      const result = damagedSession.activateSkill('gen-rallying-insight');

      expect(result.success).toBe(true);
      // gen-rallying-insight heals 35 HP: 60 + 35 = 95
      expect(damagedSession.getState().playerCurrentHp).toBe(95);
    });

    it('heals up to max HP cap when heal would otherwise exceed it', () => {
      const slightlyDamagedPlayer = createPlayerData('slightly-damaged', 'Hero', {
        currentHp: 90,
        maxHp: 100,
        currentMp: 50,
      });
      const healSession = new BattleSession({
        player: slightlyDamagedPlayer,
        monster,
        repository: repo,
        skillManager,
      });

      healSession.activateSkill('gen-rallying-insight');
      // 90 + 35 = 125 -> capped at 100
      expect(healSession.getState().playerCurrentHp).toBe(100);
    });
  });

  describe('Turn Advancement and Cooldown Decrement', () => {
    it('decrements cooldowns and expires buff durations as turns advance', () => {
      session.activateSkill('math-prime-strike'); // 3 turns cooldown, 1 turn buff duration
      expect(session.getSkillTracker().getCooldown('math-prime-strike')).toBe(3);
      expect(session.getSkillTracker().getDamageMultiplier()).toBe(1.25);

      // Turn 1
      session.beginTurn();
      session.processAnswer({
        outcome: AnswerOutcome.Correct,
        isCorrect: true,
        correctAnswerText: '4',
        submittedAnswer: 'c2',
      });

      expect(session.getSkillTracker().getCooldown('math-prime-strike')).toBe(2);
      // Duration was 1 turn, so buff expires after turn completes
      expect(session.getSkillTracker().getDamageMultiplier()).toBe(1.0);

      // Turn 2
      session.beginTurn();
      session.processAnswer({
        outcome: AnswerOutcome.Correct,
        isCorrect: true,
        correctAnswerText: '4',
        submittedAnswer: 'c2',
      });
      expect(session.getSkillTracker().getCooldown('math-prime-strike')).toBe(1);

      // Turn 3
      session.beginTurn();
      session.processAnswer({
        outcome: AnswerOutcome.Correct,
        isCorrect: true,
        correctAnswerText: '4',
        submittedAnswer: 'c2',
      });
      expect(session.getSkillTracker().getCooldown('math-prime-strike')).toBe(0);
      expect(session.getSkillTracker().isSkillOnCooldown('math-prime-strike')).toBe(false);
    });
  });

  describe('Battle Summary and State Tracking', () => {
    it('records remainingPlayerMp in battle end summary', () => {
      const fragileMonster: MonsterDefinition = {
        ...monster,
        maxHp: 10,
      };
      const quickSession = new BattleSession({
        player,
        monster: fragileMonster,
        repository: repo,
        skillManager,
      });

      quickSession.activateSkill('math-prime-strike'); // 50 -> 35 MP
      quickSession.beginTurn();
      quickSession.processAnswer({
        outcome: AnswerOutcome.Correct,
        isCorrect: true,
        correctAnswerText: '4',
        submittedAnswer: 'c2',
      });

      const summary = quickSession.getEndSummary();
      expect(summary.remainingPlayerMp).toBe(35);
      expect(summary.remainingPlayerHp).toBe(100);
      expect(summary.monsterDefeated).toBe(true);
    });
  });
});
