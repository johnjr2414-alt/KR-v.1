/**
 * Assignment reward router (Phase 27.5).
 *
 * Routes a completed assignment's configured {@link AssignmentRewards} through the
 * **existing** progression, mastery, and currency services rather than
 * re-implementing reward logic:
 *
 *   - Profession EXP   → profession progression service (Phase 27.5)
 *   - Reputation       → profession reputation service (Phase 27.5)
 *   - Character EXP    → existing character {@link import('../core/progression/ProgressionService').ProgressionService}
 *   - Gold             → existing {@link import('../economy/CurrencyService').CurrencyService}
 *   - Subject mastery  → existing {@link import('../mastery/MasteryManager').MasteryManager}
 *
 * The service is headless and dependency-injected through an
 * {@link AssignmentRewardContext} of callbacks, mirroring the existing
 * `EnrollmentContext` / `AssignmentContext` pattern. This keeps it decoupled from
 * the session/manager layer and trivially testable.
 *
 * Reward safety: distribution is keyed off the assignment engine's
 * `rewardsClaimed` flag. An already-claimed completion is reported as
 * `alreadyClaimed` and grants nothing, so repeated calls can never duplicate
 * rewards. Failed assignments are never granted.
 */

import type { SubjectId } from '../core/types/education';
import type {
  AssignmentClaimResult,
  AssignmentDefinition,
  AssignmentHistoryEntry,
  AssignmentSubjectMasteryReward,
} from './AssignmentTypes';
import { AssignmentStatus } from './AssignmentTypes';

/** Callbacks the router uses to read completions and route each reward kind. */
export interface AssignmentRewardContext {
  /** Returns the completion entry for a `completionId`, or `undefined`. */
  getCompletion: (completionId: string) => AssignmentHistoryEntry | undefined;
  /** Returns the assignment definition, or `undefined` when unknown. */
  getAssignment: (assignmentId: string) => AssignmentDefinition | undefined;
  /** Marks a completion's rewards as claimed (idempotent). */
  claimRewards: (completionId: string) => AssignmentClaimResult;
  /** Awards profession EXP through the profession progression service. */
  awardProfessionExp?: (professionId: string, amount: number) => void;
  /** Awards profession reputation. */
  awardReputation?: (professionId: string, amount: number) => void;
  /** Awards character (combat) EXP through the character progression service. */
  awardCharacterExp?: (amount: number) => void;
  /** Awards gold through the currency service. */
  awardGold?: (amount: number) => void;
  /** Awards subject mastery EXP through the mastery service. */
  awardSubjectMasteryExp?: (subject: SubjectId, amount: number) => void;
}

/** The rewards actually credited for a completion. */
export interface AssignmentGrantedRewards {
  professionExp?: number;
  reputation?: number;
  characterExp?: number;
  gold?: number;
  subjectMasteryExp?: AssignmentSubjectMasteryReward[];
}

/** Result of distributing (or replaying the distribution of) a completion's rewards. */
export interface AssignmentRewardDistributionResult {
  success: boolean;
  completionId: string;
  /** True when the completion's rewards had already been claimed. */
  alreadyClaimed: boolean;
  /** The rewards credited by this call (empty when already claimed). */
  granted: AssignmentGrantedRewards;
  message: string;
}

export class AssignmentRewardService {
  private readonly ctx: AssignmentRewardContext;

  constructor(ctx: AssignmentRewardContext) {
    this.ctx = ctx;
  }

  /**
   * Distributes the rewards for a completed assignment exactly once. Replays
   * safely: an already-claimed completion reports `alreadyClaimed` and grants
   * nothing. Only {@link AssignmentStatus.Completed} entries are eligible; failed
   * assignments receive no successful-completion rewards.
   */
  distributeCompletion(completionId: string): AssignmentRewardDistributionResult {
    const entry = this.ctx.getCompletion(completionId);
    if (!entry) {
      return {
        success: false,
        completionId,
        alreadyClaimed: false,
        granted: {},
        message: `No completion found for '${completionId}'.`,
      };
    }

    if (entry.status !== AssignmentStatus.Completed) {
      return {
        success: false,
        completionId,
        alreadyClaimed: false,
        granted: {},
        message: `Completion '${completionId}' is not a successful completion.`,
      };
    }

    if (entry.rewardsClaimed) {
      return {
        success: true,
        completionId,
        alreadyClaimed: true,
        granted: {},
        message: `Rewards for '${completionId}' were already claimed.`,
      };
    }

    const def = this.ctx.getAssignment(entry.assignmentId);
    if (!def) {
      return {
        success: false,
        completionId,
        alreadyClaimed: false,
        granted: {},
        message: `Unknown assignment '${entry.assignmentId}' for completion '${completionId}'.`,
      };
    }

    const granted = this.grant(def, entry.professionId);

    // Record the claim only after distribution so the flag reflects reality.
    this.ctx.claimRewards(completionId);

    return {
      success: true,
      completionId,
      alreadyClaimed: false,
      granted,
      message: `Rewards for '${completionId}' distributed.`,
    };
  }

  private grant(def: AssignmentDefinition, professionId: string): AssignmentGrantedRewards {
    const rewards = def.rewards;
    const granted: AssignmentGrantedRewards = {};

    if (isPositive(rewards.professionExp) && this.ctx.awardProfessionExp) {
      this.ctx.awardProfessionExp(professionId, rewards.professionExp);
      granted.professionExp = rewards.professionExp;
    }

    if (isPositive(rewards.reputation) && this.ctx.awardReputation) {
      this.ctx.awardReputation(professionId, rewards.reputation);
      granted.reputation = rewards.reputation;
    }

    if (isPositive(rewards.characterExp) && this.ctx.awardCharacterExp) {
      this.ctx.awardCharacterExp(rewards.characterExp);
      granted.characterExp = rewards.characterExp;
    }

    if (isPositive(rewards.gold) && this.ctx.awardGold) {
      this.ctx.awardGold(rewards.gold);
      granted.gold = rewards.gold;
    }

    if (Array.isArray(rewards.subjectMasteryExp) && this.ctx.awardSubjectMasteryExp) {
      const applied: AssignmentSubjectMasteryReward[] = [];
      for (const entry of rewards.subjectMasteryExp) {
        if (!entry || !isPositive(entry.amount)) continue;
        this.ctx.awardSubjectMasteryExp(entry.subject, entry.amount);
        applied.push({ subject: entry.subject, amount: entry.amount });
      }
      if (applied.length > 0) {
        granted.subjectMasteryExp = applied;
      }
    }

    return granted;
  }
}

function isPositive(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}
