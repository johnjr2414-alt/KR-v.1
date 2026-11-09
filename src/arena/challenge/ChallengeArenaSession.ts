import type { MonsterDefinition } from '../../core/types/monster';
import { getMonsterById } from '../../monsters/monsterData';
import { getEliteOrBossEncounter } from '../../monsters/EliteBossRegistry';
import {
  ChallengeStatus,
  type ChallengeDefinition,
  type ChallengeProgress,
  type ChallengeRewardResult,
  type ChallengeStage,
} from './ChallengeTypes';
import { ChallengeProgressTracker } from './ChallengeProgressTracker';

/** Resolves a challenge opponent id against the monster and elite/boss registries. */
export function resolveChallengeOpponent(monsterId: string): MonsterDefinition | undefined {
  return getMonsterById(monsterId) ?? getEliteOrBossEncounter(monsterId);
}

/** Injectable clock so time-attack modes stay deterministic in tests. */
export interface ChallengeClock {
  now(): number;
}

const DEFAULT_CLOCK: ChallengeClock = { now: () => Date.now() };

export interface ChallengeArenaOptions {
  challenge: ChallengeDefinition;
  playerLevel: number;
  /** Optional clock (defaults to wall-clock time). */
  clock?: ChallengeClock;
  /** Shared first-clear tracker (defaults to a private instance). */
  progressTracker?: ChallengeProgressTracker;
}

/**
 * Headless single-player Challenge Arena session.
 *
 * Runs one challenge run: a sequence of monster encounters (stages). Clearing
 * every stage completes the run and computes rewards once; failing a stage (or
 * running out of time) ends the run in defeat with no completion reward. The
 * session is deliberately separate from the PvP duel system.
 */
export class ChallengeArenaSession {
  private readonly challenge: ChallengeDefinition;
  private readonly playerLevel: number;
  private readonly clock: ChallengeClock;
  private readonly tracker: ChallengeProgressTracker;

  private status: ChallengeStatus = ChallengeStatus.NotStarted;
  private stageIndex = 0;
  private clearedStages = 0;
  private startedAtMs = 0;
  private endedAtMs = 0;
  private firstClearApplied = false;
  private cachedRewards: ChallengeRewardResult | null = null;
  private rewardsClaimed = false;

  constructor(options: ChallengeArenaOptions) {
    this.challenge = options.challenge;
    this.playerLevel = options.playerLevel;
    this.clock = options.clock ?? DEFAULT_CLOCK;
    this.tracker = options.progressTracker ?? new ChallengeProgressTracker();
  }

  getChallenge(): Readonly<ChallengeDefinition> {
    return this.challenge;
  }

  getPlayerLevel(): number {
    return this.playerLevel;
  }

  getStatus(): ChallengeStatus {
    return this.status;
  }

  getStageIndex(): number {
    return this.stageIndex;
  }

  getStageCount(): number {
    return this.challenge.stages.length;
  }

  getClearedStages(): number {
    return this.clearedStages;
  }

  getCurrentStage(): ChallengeStage | undefined {
    return this.challenge.stages[this.stageIndex];
  }

  getCurrentOpponent(): MonsterDefinition | undefined {
    const stage = this.getCurrentStage();
    return stage ? resolveChallengeOpponent(stage.monsterId) : undefined;
  }

  isComplete(): boolean {
    return this.status === ChallengeStatus.Completed;
  }

  isDefeated(): boolean {
    return this.status === ChallengeStatus.Defeated;
  }

  isOver(): boolean {
    return this.isComplete() || this.isDefeated();
  }

  /** Begins the run. No-op once the run has started or ended. */
  start(): void {
    if (this.status !== ChallengeStatus.NotStarted) return;
    this.status = ChallengeStatus.InProgress;
    this.startedAtMs = this.clock.now();
    this.endedAtMs = this.startedAtMs;
  }

  /** Seconds elapsed on the current / completed run (0 before start). */
  getElapsedSeconds(): number {
    if (this.status === ChallengeStatus.NotStarted) return 0;
    return Math.max(0, Math.floor((this.endedAtMs - this.startedAtMs) / 1000));
  }

  /** Score for score/time modes (cleared stages × score-per-stage). */
  getScore(): number {
    return this.clearedStages * (this.challenge.scorePerStage ?? 0);
  }

  getProgress(): ChallengeProgress {
    return {
      challengeId: this.challenge.id,
      status: this.status,
      stageIndex: this.stageIndex,
      stageCount: this.challenge.stages.length,
      clearedStages: this.clearedStages,
      elapsedSeconds: this.getElapsedSeconds(),
      score: this.getScore(),
    };
  }

  private isTimedOut(): boolean {
    if (this.challenge.timeLimitSeconds === undefined) return false;
    return this.getElapsedSeconds() > this.challenge.timeLimitSeconds;
  }

  /**
   * Clears the current stage and advances the run.
   * Completes the challenge when the final stage is cleared; in time-attack
   * modes, exceeding the time limit ends the run in defeat instead.
   */
  completeCurrentStage(): void {
    if (this.status !== ChallengeStatus.InProgress) return;
    this.endedAtMs = this.clock.now();

    if (this.isTimedOut()) {
      this.status = ChallengeStatus.Defeated;
      return;
    }

    this.clearedStages += 1;

    if (this.stageIndex >= this.challenge.stages.length - 1) {
      this.status = ChallengeStatus.Completed;
      this.firstClearApplied = this.tracker.markCleared(this.challenge.id);
    } else {
      this.stageIndex += 1;
    }
  }

  /** Player was defeated — the run ends immediately with no completion reward. */
  failCurrentStage(): void {
    if (this.status !== ChallengeStatus.InProgress) return;
    this.endedAtMs = this.clock.now();
    this.status = ChallengeStatus.Defeated;
  }

  /** Whether the challenge may be entered again right now. */
  canReenter(): boolean {
    if (this.challenge.repeatable) return true;
    return !this.tracker.isCleared(this.challenge.id);
  }

  /**
   * Rewards for a completed run, computed once (or `null` when not completed).
   * Includes the one-time first-clear bonus only when this was the first clear.
   */
  getRewards(): ChallengeRewardResult | null {
    if (this.status !== ChallengeStatus.Completed) return null;
    if (this.cachedRewards) return this.cachedRewards;

    const config = this.challenge.rewards;
    const first = this.firstClearApplied;

    const items = (config.completionItems ?? []).map((item) => ({ ...item }));
    if (first && config.firstClearBonus?.itemId) {
      items.push({ itemId: config.firstClearBonus.itemId, quantity: 1 });
    }

    this.cachedRewards = {
      challengeId: this.challenge.id,
      clearedStages: this.clearedStages,
      combatExp:
        config.expPerStage * this.clearedStages +
        config.completionBonusExp +
        (first ? config.firstClearBonus?.exp ?? 0 : 0),
      gold:
        config.goldPerStage * this.clearedStages +
        config.completionBonusGold +
        (first ? config.firstClearBonus?.gold ?? 0 : 0),
      items,
      firstClearBonusApplied: first,
    };

    return this.cachedRewards;
  }

  /**
   * Returns the run's rewards exactly once. Subsequent calls return `null`,
   * enforcing reward idempotency at the session level.
   */
  claimRewards(): ChallengeRewardResult | null {
    if (this.rewardsClaimed) return null;
    const rewards = this.getRewards();
    if (!rewards) return null;
    this.rewardsClaimed = true;
    return rewards;
  }
}
