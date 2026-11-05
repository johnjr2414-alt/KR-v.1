import type { PlayerData } from '../player/PlayerData';
import type { MonsterDefinition } from '../core/types/monster';
import type { Question } from '../core/types/question';
import type { PvEQuestionProfile } from '../questions/retrieval/DifficultyEngine';
import { BattleOutcome, type CombatTurnResult } from '../core/types/combat';

/**
 * Lifecycle state of an active battle session.
 */
export enum BattleStatus {
  Ready = 'ready',
  AwaitingAnswer = 'awaiting-answer',
  TurnResolved = 'turn-resolved',
  Victory = 'victory',
  Defeat = 'defeat',
  MonsterEscaped = 'monster-escaped',
}

/**
 * Complete battle state snapshot.
 */
export interface BattleState {
  id: string;
  player: PlayerData;
  monster: MonsterDefinition;
  playerCurrentHp: number;
  playerMaxHp: number;
  monsterCurrentHp: number;
  monsterMaxHp: number;
  totalQuestionCount: number;
  currentQuestionIndex: number; // 0-based
  questions: Question[];
  turns: CombatTurnResult[];
  status: BattleStatus;
  correctAnswersCount: number;
  incorrectAnswersCount: number;
  profile: PvEQuestionProfile;
}

/**
 * Result of a completed battle.
 */
export interface BattleEndSummary {
  outcome: BattleOutcome;
  monsterDefeated: boolean;
  playerDefeated: boolean;
  turnsPlayed: number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  remainingPlayerHp: number;
  remainingMonsterHp: number;
  expEarned: number;
  goldEarned: number;
  droppedItems: Array<{ itemId: string; quantity: number }>;
  masteryGains: Array<{ subject: string; expGained: number; leveledUp: boolean; newLevel: number }>;
}
