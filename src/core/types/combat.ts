import type { SubjectId } from './education';
import type { MasteryGainResult } from './mastery';

/**
 * Outcome of evaluating a single player answer within a battle turn.
 */
export enum AnswerOutcome {
  Correct = 'correct',
  Incorrect = 'incorrect',
  Timeout = 'timeout',
}

/**
 * Result of a single combat turn (one question answered or timed out).
 */
export interface CombatTurnResult {
  /** Which question index in the battle (1-based). */
  questionIndex: number;
  /** Whether the answer was correct, incorrect, or timed out. */
  outcome: AnswerOutcome;
  /** Damage dealt to the monster (0 if incorrect/timeout). */
  damageToMonster: number;
  /** Damage dealt to the player (0 if correct). */
  damageToPlayer: number;
  /** Whether a critical hit occurred. */
  isCritical: boolean;
  /** Monster HP remaining after this turn. */
  monsterHpRemaining: number;
  /** Player HP remaining after this turn. */
  playerHpRemaining: number;
}

/**
 * Final outcome of a completed battle.
 */
export enum BattleOutcome {
  Victory = 'victory',
  Defeat = 'defeat',
}

/**
 * Complete summary of a resolved battle encounter.
 */
export interface BattleResult {
  /** Whether the player won or lost. */
  outcome: BattleOutcome;
  /** Total questions presented in this battle. */
  totalQuestions: number;
  /** Number of questions answered correctly. */
  correctAnswers: number;
  /** Character combat EXP earned (0 on defeat). */
  expEarned: number;
  /** Gold earned (0 on defeat). */
  goldEarned: number;
  /** Subject mastery gains from correct answers (empty on defeat). */
  masteryGains: MasteryGainResult[];
  /** The subject of the battle's monster. */
  subject: SubjectId;
  /** Turn-by-turn results for replay or summary display. */
  turns: CombatTurnResult[];
}
