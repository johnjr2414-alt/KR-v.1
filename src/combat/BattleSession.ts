import type { PlayerData } from '../player/PlayerData';
import type { MonsterDefinition } from '../core/types/monster';
import type { Question } from '../core/types/question';
import type { QuestionRepository } from '../questions/retrieval/QuestionRepository';
import {
  DifficultyEngine,
  difficultyEngine,
  type PvEQuestionProfile,
} from '../questions/retrieval/DifficultyEngine';
import {
  calculateBattleQuestionCount,
  type QuestionCountConfig,
} from '../config/combatConfig';
import {
  BattleStatus,
  type BattleState,
  type BattleEndSummary,
} from './BattleState';
import { AnswerOutcome, BattleOutcome, type CombatTurnResult } from '../core/types/combat';
import { DamageCalculator, damageCalculator } from './DamageCalculator';
import type { AnswerEvaluationResult } from '../questions/evaluation/AnswerEvaluator';
import { MasteryManager, masteryManager } from '../mastery/MasteryManager';
import type { MasteryGainResult } from '../core/types/mastery';

import { RewardCalculator, rewardCalculator } from './rewards/RewardCalculator';
import type { MonsterRewardResult } from './rewards/RewardTypes';
import { CombatSkillTracker, type SkillActivationResult } from './CombatSkillTracker';
import { SkillManager, getSkillDefinition } from '../skills';

export interface BattleSessionOptions {
  player: PlayerData;
  monster: MonsterDefinition;
  repository: QuestionRepository;
  difficultyEngine?: DifficultyEngine;
  damageCalculator?: DamageCalculator;
  masteryManager?: MasteryManager;
  rewardCalculator?: RewardCalculator;
  skillManager?: SkillManager;
  questionCountConfig?: Record<string, QuestionCountConfig>;
  /** Optional deterministic question count override (for tests) */
  fixedQuestionCount?: number;
}

/**
 * Headless combat state machine.
 *
 * Implements:
 * - Battle initialization & PvE question profile resolution
 * - Locked random question count per encounter
 * - Answer consequence resolution (Correct -> Player attacks, Incorrect/Timeout -> DAMAGE-PLAYER)
 * - Turn advancement & end-of-combat resolution (Victory, Defeat, MonsterEscaped)
 */
export class BattleSession {
  private state: BattleState;
  private readonly damageCalc: DamageCalculator;
  private readonly mastery: MasteryManager;
  private readonly rewards: RewardCalculator;
  private readonly skillManager?: SkillManager;
  private readonly skillTracker: CombatSkillTracker = new CombatSkillTracker();
  private currentStreak = 0;
  private pendingMasteryGains: MasteryGainResult[] = [];
  private victoryRewards: MonsterRewardResult | null = null;

  constructor(options: BattleSessionOptions) {
    const diffEngine = options.difficultyEngine || difficultyEngine;
    this.damageCalc = options.damageCalculator || damageCalculator;
    this.mastery = options.masteryManager || masteryManager;
    this.rewards = options.rewardCalculator || rewardCalculator;
    this.skillManager = options.skillManager;

    // 1. Calculate PvE difficulty profile
    const profile: PvEQuestionProfile = diffEngine.createQuestionProfile(
      options.monster.subject,
      options.player.level,
      options.monster.level,
    );

    // 2. Determine random question quota
    const totalQuestionCount =
      options.fixedQuestionCount !== undefined
        ? options.fixedQuestionCount
        : calculateBattleQuestionCount(options.monster.category);

    // 3. Resolve questions
    const resolved = diffEngine.resolveQuestionsWithFallback(
      options.repository,
      profile,
      totalQuestionCount,
    );

    // 4. Initialize State
    this.state = {
      id: crypto.randomUUID(),
      player: { ...options.player },
      monster: { ...options.monster },
      playerCurrentHp: options.player.currentHp,
      playerMaxHp: options.player.maxHp,
      playerCurrentMp: options.player.currentMp,
      playerMaxMp: options.player.maxMp,
      monsterCurrentHp: options.monster.maxHp,
      monsterMaxHp: options.monster.maxHp,
      totalQuestionCount,
      currentQuestionIndex: 0,
      questions: resolved.questions,
      turns: [],
      status: BattleStatus.Ready,
      correctAnswersCount: 0,
      incorrectAnswersCount: 0,
      profile,
    };
  }

  /**
   * Retrieves the current skill tracker for inspecting active buffs, shields, and cooldowns.
   */
  getSkillTracker(): CombatSkillTracker {
    return this.skillTracker;
  }

  /**
   * Activates a skill in combat.
   */
  activateSkill(skillId: string): SkillActivationResult {
    if (this.isBattleOver()) {
      return { success: false, error: 'Cannot activate skills when battle is over', skillId, mpCost: 0 };
    }

    const def = getSkillDefinition(skillId);
    if (!def) {
      return { success: false, error: `Skill "${skillId}" not found`, skillId, mpCost: 0 };
    }

    if (def.type !== 'active') {
      return { success: false, error: 'Cannot activate a passive skill', skillId, mpCost: 0 };
    }

    if (def.availability === 'pvp') {
      return { success: false, error: 'Skill is only available in PvP', skillId, mpCost: 0 };
    }

    // Check unlock
    const skillLevel = this.skillManager ? this.skillManager.getSkillLevel(skillId) : 1;
    if (skillLevel < 1) {
      return { success: false, error: 'Skill is not unlocked', skillId, mpCost: 0 };
    }

    const lvlConfig = def.levels[skillLevel];
    if (!lvlConfig) {
      return { success: false, error: 'Invalid skill configuration', skillId, mpCost: 0 };
    }

    // Check cooldown
    if (this.skillTracker.isSkillOnCooldown(skillId)) {
      return {
        success: false,
        error: `Skill on cooldown (${this.skillTracker.getCooldown(skillId)} turns remaining)`,
        skillId,
        mpCost: 0,
      };
    }

    // Check MP
    if (this.state.playerCurrentMp < lvlConfig.mpCost) {
      return {
        success: false,
        error: `Insufficient MP. Required: ${lvlConfig.mpCost}, Available: ${this.state.playerCurrentMp}`,
        skillId,
        mpCost: lvlConfig.mpCost,
      };
    }

    // Deduct MP only after validation passes
    this.state.playerCurrentMp -= lvlConfig.mpCost;

    // Apply effects
    const { shieldGained, healAmount } = this.skillTracker.applySkill(def, skillLevel);

    if (healAmount > 0) {
      this.state.playerCurrentHp = Math.min(this.state.playerMaxHp, this.state.playerCurrentHp + healAmount);
    }

    let message = `Activated ${def.name}!`;
    if (shieldGained > 0) message += ` (Shield: +${shieldGained})`;
    if (healAmount > 0) message += ` (Healed: +${healAmount} HP)`;

    return {
      success: true,
      skillId,
      mpCost: lvlConfig.mpCost,
      message,
    };
  }
  getState(): Readonly<BattleState> {
    return this.state;
  }

  /**
   * Retrieves the current question being asked.
   */
  getCurrentQuestion(): Question | undefined {
    return this.state.questions[this.state.currentQuestionIndex];
  }

  /**
   * Starts or resumes the battle turn.
   */
  beginTurn(): void {
    if (this.isBattleOver()) return;
    this.state.status = BattleStatus.AwaitingAnswer;
  }

  /**
   * Submits an evaluated answer result to advance combat turn.
   *
   * @param evaluation - Evaluated outcome from AnswerEvaluator
   * @param forceCrit - Optional flag for testing damage
   */
  processAnswer(
    evaluation: AnswerEvaluationResult,
    forceCrit?: boolean,
    timeRemaining = 0,
  ): CombatTurnResult {
    if (this.state.status !== BattleStatus.AwaitingAnswer && this.state.status !== BattleStatus.Ready) {
      throw new Error(`Cannot process answer in state: ${this.state.status}`);
    }

    const currentQuestion = this.getCurrentQuestion();
    const questionIndex = this.state.currentQuestionIndex + 1;
    let damageToMonster = 0;
    let damageToPlayer = 0;
    let isCritical = false;

    // 1. Correct Answer: Player strikes Monster & awards Mastery EXP
    if (evaluation.outcome === AnswerOutcome.Correct) {
      this.state.correctAnswersCount++;
      this.currentStreak++;

      const dmgResult = this.damageCalc.calculatePlayerDamage(
        this.state.player.attack,
        this.state.monster.defense,
        this.state.player.critRate,
        forceCrit,
      );

      // Apply skill damage boost multiplier if active
      const dmgMult = this.skillTracker.getDamageMultiplier();
      damageToMonster = Math.round(dmgResult.damage * dmgMult);
      isCritical = dmgResult.isCritical;

      this.state.monsterCurrentHp = Math.max(0, this.state.monsterCurrentHp - damageToMonster);

      if (currentQuestion) {
        const { gainResult } = this.mastery.processAnswerAttempt({
          question: currentQuestion,
          isCorrect: true,
          timeRemaining,
          timeLimit: currentQuestion.timeLimit,
          currentStreak: this.currentStreak,
          rewardMultiplier: this.state.profile.rewardMultiplier,
        });
        this.pendingMasteryGains.push(gainResult);
      }
    } else {
      // 2. Incorrect / Timeout: Monster strikes Player (DAMAGE-PLAYER rule)
      this.state.incorrectAnswersCount++;
      this.currentStreak = 0; // Streak reset
      const rawMonsterDamage = this.damageCalc.calculateMonsterDamage(
        this.state.monster.attack,
        this.state.player.defense,
      );

      // Apply shield absorption from active skills
      const { finalDamage } = this.skillTracker.absorbDamage(rawMonsterDamage);
      damageToPlayer = finalDamage;

      this.state.playerCurrentHp = Math.max(0, this.state.playerCurrentHp - damageToPlayer);

      if (currentQuestion) {
        this.mastery.processAnswerAttempt({
          question: currentQuestion,
          isCorrect: false,
          timeRemaining: 0,
          timeLimit: currentQuestion.timeLimit,
          currentStreak: 0,
        });
      }
    }

    const turnResult: CombatTurnResult = {
      questionIndex,
      outcome: evaluation.outcome,
      damageToMonster,
      damageToPlayer,
      isCritical,
      monsterHpRemaining: this.state.monsterCurrentHp,
      playerHpRemaining: this.state.playerCurrentHp,
    };

    this.state.turns.push(turnResult);

    // Advance skill cooldowns and buff durations at the end of the combat turn
    this.skillTracker.advanceTurn();

    // 3. Check termination conditions
    if (this.state.monsterCurrentHp <= 0) {
      this.state.status = BattleStatus.Victory;
      // Calculate and emit victory rewards
      this.victoryRewards = this.rewards.calculateRewards(
        this.state.monster,
        this.state.profile.rewardMultiplier,
      );
      this.rewards.emitMonsterDefeated(this.state.monster, this.victoryRewards);
    } else if (this.state.playerCurrentHp <= 0) {
      this.state.status = BattleStatus.Defeat;
    } else {
      // Advance question index
      this.state.currentQuestionIndex++;
      if (this.state.currentQuestionIndex >= this.state.totalQuestionCount) {
        // Questions exhausted and monster survived
        this.state.status = BattleStatus.MonsterEscaped;
      } else {
        this.state.status = BattleStatus.TurnResolved;
      }
    }

    return turnResult;
  }

  isBattleOver(): boolean {
    return (
      this.state.status === BattleStatus.Victory ||
      this.state.status === BattleStatus.Defeat ||
      this.state.status === BattleStatus.MonsterEscaped
    );
  }

  /**
   * Produces final victory/defeat end summary.
   */
  getEndSummary(): BattleEndSummary {
    const outcome =
      this.state.status === BattleStatus.Victory
        ? BattleOutcome.Victory
        : BattleOutcome.Defeat;

    const isVictory = this.state.status === BattleStatus.Victory;
    const expEarned = isVictory && this.victoryRewards ? this.victoryRewards.combatExp : 0;
    const goldEarned = isVictory && this.victoryRewards ? this.victoryRewards.totalGold : 0;
    const droppedItems = isVictory && this.victoryRewards ? this.victoryRewards.droppedItems : [];

    return {
      outcome,
      monsterDefeated: this.state.monsterCurrentHp <= 0,
      playerDefeated: this.state.playerCurrentHp <= 0,
      turnsPlayed: this.state.turns.length,
      totalQuestions: this.state.totalQuestionCount,
      correctAnswers: this.state.correctAnswersCount,
      incorrectAnswers: this.state.incorrectAnswersCount,
      remainingPlayerHp: this.state.playerCurrentHp,
      remainingPlayerMp: this.state.playerCurrentMp,
      remainingMonsterHp: this.state.monsterCurrentHp,
      expEarned,
      goldEarned,
      droppedItems,
      masteryGains: [...this.pendingMasteryGains],
    };
  }
}
