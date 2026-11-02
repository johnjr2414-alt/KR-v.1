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

export interface BattleSessionOptions {
  player: PlayerData;
  monster: MonsterDefinition;
  repository: QuestionRepository;
  difficultyEngine?: DifficultyEngine;
  damageCalculator?: DamageCalculator;
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

  constructor(options: BattleSessionOptions) {
    const diffEngine = options.difficultyEngine || difficultyEngine;
    this.damageCalc = options.damageCalculator || damageCalculator;

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
   * Current snapshot of battle state.
   */
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
  ): CombatTurnResult {
    if (this.state.status !== BattleStatus.AwaitingAnswer && this.state.status !== BattleStatus.Ready) {
      throw new Error(`Cannot process answer in state: ${this.state.status}`);
    }

    const questionIndex = this.state.currentQuestionIndex + 1;
    let damageToMonster = 0;
    let damageToPlayer = 0;
    let isCritical = false;

    // 1. Correct Answer: Player strikes Monster
    if (evaluation.outcome === AnswerOutcome.Correct) {
      this.state.correctAnswersCount++;
      const dmgResult = this.damageCalc.calculatePlayerDamage(
        this.state.player.attack,
        this.state.monster.defense,
        this.state.player.critRate,
        forceCrit,
      );
      damageToMonster = dmgResult.damage;
      isCritical = dmgResult.isCritical;

      this.state.monsterCurrentHp = Math.max(0, this.state.monsterCurrentHp - damageToMonster);
    } else {
      // 2. Incorrect / Timeout: Monster strikes Player (DAMAGE-PLAYER rule)
      this.state.incorrectAnswersCount++;
      damageToPlayer = this.damageCalc.calculateMonsterDamage(
        this.state.monster.attack,
        this.state.player.defense,
      );

      this.state.playerCurrentHp = Math.max(0, this.state.playerCurrentHp - damageToPlayer);
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

    // 3. Check termination conditions
    if (this.state.monsterCurrentHp <= 0) {
      this.state.status = BattleStatus.Victory;
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
    const expEarned = isVictory ? this.state.monster.baseExp : 0;
    const goldEarned = isVictory ? this.state.monster.baseGold : 0;

    return {
      outcome,
      monsterDefeated: this.state.monsterCurrentHp <= 0,
      playerDefeated: this.state.playerCurrentHp <= 0,
      turnsPlayed: this.state.turns.length,
      totalQuestions: this.state.totalQuestionCount,
      correctAnswers: this.state.correctAnswersCount,
      incorrectAnswers: this.state.incorrectAnswersCount,
      remainingPlayerHp: this.state.playerCurrentHp,
      remainingMonsterHp: this.state.monsterCurrentHp,
      expEarned,
      goldEarned,
    };
  }
}
