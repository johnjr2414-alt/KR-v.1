import type { SubjectId } from '../../core/types/education';

/**
 * Configurable single-player Challenge Arena formats.
 *
 * These are PvE challenge modes and are deliberately kept separate from the
 * PvP duel system (`ArenaDuelSession`) so that future online PvP can evolve
 * independently. No matchmaking or network play is involved.
 */
export enum ChallengeMode {
  /** Clear a fixed sequence of monsters back to back. */
  ConsecutiveMonsters = 'consecutive-monsters',
  /** Defeat a single elite / boss opponent. */
  BossChallenge = 'boss-challenge',
  /** Clear a gauntlet drawn from one academic subject. */
  SubjectChallenge = 'subject-challenge',
  /** Clear as many rounds as possible within a time limit (score-based). */
  TimeAttack = 'time-attack',
}

/** Lifecycle of a single challenge run. */
export enum ChallengeStatus {
  NotStarted = 'not-started',
  InProgress = 'in-progress',
  Completed = 'completed',
  Defeated = 'defeated',
}

/** One opponent slot in a challenge's encounter sequence. */
export interface ChallengeStage {
  /** 1-based stage number (for display + ordering). */
  stageNumber: number;
  /** Display name of the round. */
  name: string;
  /** Opponent monster id — resolved against the monster and elite/boss registries. */
  monsterId: string;
}

/** A single item reward. */
export interface ChallengeRewardItem {
  itemId: string;
  quantity: number;
}

/** Reward tuning for a challenge (per-stage plus completion bonuses). */
export interface ChallengeRewardConfig {
  /** Combat EXP granted for each cleared stage. */
  expPerStage: number;
  /** Gold granted for each cleared stage. */
  goldPerStage: number;
  /** Bonus EXP granted only on full completion. */
  completionBonusExp: number;
  /** Bonus gold granted only on full completion. */
  completionBonusGold: number;
  /** Items granted only on full completion. */
  completionItems?: ChallengeRewardItem[];
  /**
   * One-time bonus granted at most once per profile. This is what makes
   * repeated entries reward-idempotent (see `ChallengeProgressTracker`).
   */
  firstClearBonus?: { gold: number; exp: number; itemId?: string };
}

/** A fully data-driven challenge definition. */
export interface ChallengeDefinition {
  id: string;
  name: string;
  description: string;
  mode: ChallengeMode;
  /** Advisory recommended player level (never locks entry). */
  recommendedMinLevel: number;
  /** Subject focus for subject / educational challenges. */
  subject?: SubjectId;
  /** Fixed encounter sequence. */
  stages: ChallengeStage[];
  /** Time limit in seconds (time-attack modes only). */
  timeLimitSeconds?: number;
  /** Score awarded per cleared stage (score / time modes). */
  scorePerStage?: number;
  rewards: ChallengeRewardConfig;
  /** Whether the challenge may be entered again after completion. */
  repeatable: boolean;
  provisional: boolean;
}

/** Reward outcome computed once a challenge is completed. */
export interface ChallengeRewardResult {
  challengeId: string;
  clearedStages: number;
  combatExp: number;
  gold: number;
  items: ChallengeRewardItem[];
  firstClearBonusApplied: boolean;
}

/** Serializable progress view of a challenge run. */
export interface ChallengeProgress {
  challengeId: string;
  status: ChallengeStatus;
  /** 0-based index of the current stage. */
  stageIndex: number;
  stageCount: number;
  clearedStages: number;
  /** Seconds elapsed on a completed run (time-attack modes). */
  elapsedSeconds: number;
  score: number;
}
