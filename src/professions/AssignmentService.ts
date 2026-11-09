import {
  ASSIGNMENT_SNAPSHOT_VERSION,
  AssignmentFailureReason,
  AssignmentStatus,
  type ActiveAssignmentState,
  type AssignmentAcceptResult,
  type AssignmentAvailability,
  type AssignmentClaimResult,
  type AssignmentCompletionResult,
  type AssignmentContext,
  type AssignmentDefinition,
  type AssignmentHistoryEntry,
  type AssignmentObjectiveProgress,
  type AssignmentProgressResult,
  type AssignmentRequirementStatus,
  type AssignmentSnapshot,
} from './AssignmentTypes';
import { ASSIGNMENT_DEFINITIONS } from './AssignmentRegistry';
import { PROFESSION_DEFINITIONS } from './ProfessionRegistry';
import type { ProfessionDefinition } from './ProfessionTypes';

export interface AssignmentServiceOptions {
  /** Assignment catalogue. Defaults to the shared {@link ASSIGNMENT_DEFINITIONS}. */
  assignments?: readonly AssignmentDefinition[];
  /** Profession catalogue (used for rank resolution). Defaults to {@link PROFESSION_DEFINITIONS}. */
  professions?: readonly ProfessionDefinition[];
  /** Clock used for timestamps. Injectable for deterministic tests. */
  now?: () => number;
  /**
   * Optional hook invoked once when an assignment completes, carrying the
   * resulting history entry. Used to integrate assignment state with the career
   * profile without coupling the engine to {@link import('./CareerService').CareerService}.
   */
  onCompleted?: (entry: AssignmentHistoryEntry) => void;
}

/**
 * Headless professional assignment engine (Phase 27.3).
 *
 * Manages the full lifecycle of professional assignments — availability,
 * prerequisite validation, acceptance, active tracking, objective progress,
 * completion, failure, and completion-result generation — against a
 * caller-supplied {@link AssignmentContext}. Advancement is fully generic: any
 * objective (question-backed or otherwise) is progressed by the same counter
 * mechanism, so no profession-specific logic lives here.
 *
 * Assignments are multi-stage. Completion requires every objective of every
 * stage to be satisfied; the engine then produces a completion result carrying
 * the configured reward data **without distributing it** (distribution is routed
 * through the existing progression, mastery, and currency services in Phase
 * 27.5).
 *
 * Reward granting is idempotent: completions are keyed by a stable
 * `completionId`, repeated completion requests replay the existing result, and
 * {@link claimRewards} can be called safely more than once.
 */
export class AssignmentService {
  private readonly assignments: Map<string, AssignmentDefinition>;
  private readonly professions: Map<string, ProfessionDefinition>;
  private readonly now: () => number;
  private readonly onCompleted?: (entry: AssignmentHistoryEntry) => void;

  private readonly active = new Map<string, ActiveAssignmentState>();
  private history: AssignmentHistoryEntry[] = [];

  constructor(options: AssignmentServiceOptions = {}) {
    const definitions = options.assignments ?? ASSIGNMENT_DEFINITIONS;
    this.assignments = new Map(definitions.map((assignment) => [assignment.id, assignment]));

    const professions = options.professions ?? PROFESSION_DEFINITIONS;
    this.professions = new Map(professions.map((profession) => [profession.id, profession]));

    this.now = options.now ?? (() => Date.now());
    this.onCompleted = options.onCompleted;
  }

  // ── Catalogue access ──────────────────────────────────────────────────────

  /** Returns an assignment definition, or `undefined` when unknown. */
  getAssignment(assignmentId: string): AssignmentDefinition | undefined {
    return this.assignments.get(assignmentId);
  }

  /** Returns every registered assignment definition. */
  getAssignments(): AssignmentDefinition[] {
    return [...this.assignments.values()];
  }

  /** Returns the assignments associated with a profession. */
  getAssignmentsForProfession(professionId: string): AssignmentDefinition[] {
    return [...this.assignments.values()].filter((a) => a.professionId === professionId);
  }

  // ── Availability & prerequisites ──────────────────────────────────────────

  /**
   * Non-mutating availability check. Never throws; an unknown assignment yields
   * an unavailable result with an explanatory message.
   */
  checkAvailability(assignmentId: string, ctx: AssignmentContext): AssignmentAvailability {
    const def = this.assignments.get(assignmentId);
    if (!def) {
      return {
        assignmentId,
        available: false,
        reasons: [AssignmentFailureReason.UnknownAssignment],
        requirements: [],
        message: `Unknown assignment '${assignmentId}'.`,
      };
    }

    if (this.active.has(assignmentId)) {
      return {
        assignmentId,
        available: false,
        reasons: [AssignmentFailureReason.AlreadyActive],
        requirements: [],
        message: `'${def.title}' is already in progress.`,
      };
    }

    if (!def.repeatable && this.isCompleted(assignmentId)) {
      return {
        assignmentId,
        available: false,
        reasons: [AssignmentFailureReason.AlreadyCompleted],
        requirements: [],
        message: `'${def.title}' has already been completed.`,
      };
    }

    const reasons: AssignmentFailureReason[] = [];
    const requirements: AssignmentRequirementStatus[] = [];
    const state = ctx.getProfessionState ? ctx.getProfessionState(def.professionId) : undefined;

    if (!state) {
      reasons.push(AssignmentFailureReason.NotEnrolled);
      requirements.push({
        label: `Enrolled as ${def.professionId}`,
        satisfied: false,
        detail: `You must be enrolled as a ${def.professionId} to take '${def.title}'.`,
      });
    } else {
      const req = def.requirements;

      if (req.minProfessionLevel !== undefined) {
        const satisfied = state.level >= req.minProfessionLevel;
        requirements.push({
          label: `Profession level ${req.minProfessionLevel}`,
          satisfied,
          detail: satisfied
            ? undefined
            : `Requires profession level ${req.minProfessionLevel} (you are ${state.level}).`,
        });
        if (!satisfied) reasons.push(AssignmentFailureReason.ProfessionLevelTooLow);
      }

      if (req.minRankId !== undefined) {
        const rankMinLevel = this.resolveRankMinLevel(def.professionId, req.minRankId);
        const satisfied = rankMinLevel !== undefined && state.level >= rankMinLevel;
        requirements.push({
          label: `Rank ${req.minRankId}`,
          satisfied,
          detail: satisfied
            ? undefined
            : `Requires rank '${req.minRankId}' or higher.`,
        });
        if (!satisfied) reasons.push(AssignmentFailureReason.RankTooLow);
      }
    }

    if (Array.isArray(def.requirements.prerequisiteAssignmentIds)) {
      for (const prereqId of def.requirements.prerequisiteAssignmentIds) {
        const satisfied = this.isCompleted(prereqId);
        requirements.push({
          label: `Assignment: ${prereqId}`,
          satisfied,
          detail: satisfied
            ? undefined
            : `Requires assignment '${prereqId}' to be completed first.`,
        });
        if (!satisfied) reasons.push(AssignmentFailureReason.PrerequisiteAssignment);
      }
    }

    if (Array.isArray(def.requirements.prerequisiteQuestIds)) {
      for (const questId of def.requirements.prerequisiteQuestIds) {
        const satisfied = ctx.isQuestCompleted ? ctx.isQuestCompleted(questId) : false;
        requirements.push({
          label: `Quest: ${questId}`,
          satisfied,
          detail: satisfied ? undefined : `Requires quest '${questId}' to be completed first.`,
        });
        if (!satisfied) reasons.push(AssignmentFailureReason.PrerequisiteQuest);
      }
    }

    const available = reasons.length === 0;
    return {
      assignmentId,
      available,
      reasons,
      requirements,
      message: available
        ? `You may accept '${def.title}'.`
        : requirements.find((r) => !r.satisfied)?.detail ?? `Cannot accept '${def.title}'.`,
    };
  }

  // ── Acceptance ────────────────────────────────────────────────────────────

  /** Attempts to accept an assignment, creating its active state on success. */
  acceptAssignment(assignmentId: string, ctx: AssignmentContext): AssignmentAcceptResult {
    const def = this.assignments.get(assignmentId);
    if (!def) {
      return {
        success: false,
        assignmentId,
        reason: AssignmentFailureReason.UnknownAssignment,
        message: `Unknown assignment '${assignmentId}'.`,
      };
    }

    const availability = this.checkAvailability(assignmentId, ctx);
    if (!availability.available) {
      return {
        success: false,
        assignmentId,
        reason: availability.reasons[0],
        message: availability.message,
      };
    }

    const firstStage = def.stages[0];
    const state: ActiveAssignmentState = {
      assignmentId,
      professionId: def.professionId,
      stageIndex: 0,
      objectives: firstStage ? firstStage.objectives.map((o) => ({ objectiveId: o.id, progress: 0 })) : [],
      acceptedAt: this.now(),
    };
    this.active.set(assignmentId, state);

    return {
      success: true,
      assignmentId,
      state: cloneActive(state),
      message: `You have accepted '${def.title}'.`,
    };
  }

  // ── Active tracking ───────────────────────────────────────────────────────

  /** Returns copies of every active assignment. */
  getActiveAssignments(): ActiveAssignmentState[] {
    return [...this.active.values()].map(cloneActive);
  }

  /** Returns a copy of the active state for an assignment, or `undefined`. */
  getActiveAssignment(assignmentId: string): ActiveAssignmentState | undefined {
    const state = this.active.get(assignmentId);
    return state ? cloneActive(state) : undefined;
  }

  /** Whether an assignment is currently active. */
  isActive(assignmentId: string): boolean {
    return this.active.has(assignmentId);
  }

  // ── Objective progress ────────────────────────────────────────────────────

  /**
   * Advances one objective of an active assignment by `amount` (default 1). When
   * every objective of the current stage is satisfied the engine advances to the
   * next stage; when the final stage clears the assignment is ready to complete.
   */
  recordObjectiveProgress(
    assignmentId: string,
    objectiveId: string,
    amount = 1,
  ): AssignmentProgressResult {
    const def = this.assignments.get(assignmentId);
    if (!def) {
      return progressFailure(assignmentId, objectiveId, AssignmentFailureReason.UnknownAssignment, `Unknown assignment '${assignmentId}'.`);
    }

    const state = this.active.get(assignmentId);
    if (!state) {
      return progressFailure(assignmentId, objectiveId, AssignmentFailureReason.NotActive, `'${def.title}' is not in progress.`);
    }

    if (state.stageIndex >= def.stages.length) {
      return {
        success: true,
        assignmentId,
        objectiveId,
        progress: 0,
        stageComplete: true,
        allStagesComplete: true,
        message: `'${def.title}' is already fully progressed and ready to complete.`,
      };
    }

    const stage = def.stages[state.stageIndex];
    const definition = stage.objectives.find((o) => o.id === objectiveId);
    const entry = state.objectives.find((o) => o.objectiveId === objectiveId);
    if (!definition || !entry) {
      return progressFailure(assignmentId, objectiveId, AssignmentFailureReason.UnknownObjective, `Unknown objective '${objectiveId}' for '${def.title}'.`);
    }

    const step = Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 1;
    entry.progress = Math.min(definition.required, entry.progress + step);

    const stageComplete = stage.objectives.every((o) => {
      const p = state.objectives.find((s) => s.objectiveId === o.id);
      return (p?.progress ?? 0) >= o.required;
    });

    if (stageComplete) {
      state.stageIndex += 1;
      const next = def.stages[state.stageIndex];
      state.objectives = next ? next.objectives.map((o) => ({ objectiveId: o.id, progress: 0 })) : [];
    }

    const allStagesComplete = state.stageIndex >= def.stages.length;
    return {
      success: true,
      assignmentId,
      objectiveId,
      progress: entry.progress,
      stageComplete,
      allStagesComplete,
      message: allStagesComplete
        ? `'${def.title}' is ready to complete.`
        : stageComplete
          ? `Stage '${stage.name}' complete.`
          : `Progress recorded for '${def.title}'.`,
    };
  }

  // ── Completion & failure ──────────────────────────────────────────────────

  /**
   * Completes an active assignment once all stages are cleared, producing a
   * completion result that carries the configured reward data (no distribution).
   * Replays safely: completing an already-completed non-repeatable assignment
   * returns the existing completion without creating a duplicate.
   */
  completeAssignment(assignmentId: string): AssignmentCompletionResult {
    const def = this.assignments.get(assignmentId);
    if (!def) {
      return completionFailure(assignmentId, AssignmentFailureReason.UnknownAssignment, `Unknown assignment '${assignmentId}'.`);
    }

    if (!def.repeatable) {
      const existing = this.history.find(
        (h) => h.assignmentId === assignmentId && h.status === AssignmentStatus.Completed,
      );
      if (existing) {
        return {
          success: true,
          assignmentId,
          status: AssignmentStatus.Completed,
          completionId: existing.completionId,
          rewards: def.rewards,
          alreadyCompleted: true,
          message: `'${def.title}' has already been completed.`,
        };
      }
    }

    const state = this.active.get(assignmentId);
    if (!state) {
      return completionFailure(assignmentId, AssignmentFailureReason.NotActive, `'${def.title}' is not in progress.`);
    }

    if (state.stageIndex < def.stages.length) {
      return completionFailure(assignmentId, AssignmentFailureReason.ObjectivesIncomplete, `'${def.title}' still has incomplete objectives.`);
    }

    const completionId = this.nextCompletionId(def);
    this.active.delete(assignmentId);
    const entry: AssignmentHistoryEntry = {
      assignmentId,
      professionId: def.professionId,
      status: AssignmentStatus.Completed,
      completedAt: this.now(),
      completionId,
      rewardsClaimed: false,
    };
    this.history.push(entry);
    this.onCompleted?.(cloneHistory(entry));

    return {
      success: true,
      assignmentId,
      status: AssignmentStatus.Completed,
      completionId,
      rewards: def.rewards,
      alreadyCompleted: false,
      message: `'${def.title}' completed.`,
    };
  }

  /**
   * Marks an active assignment as failed. Failures grant no rewards and are
   * recorded in history for the profession.
   */
  failAssignment(assignmentId: string): AssignmentCompletionResult {
    const def = this.assignments.get(assignmentId);
    if (!def) {
      return completionFailure(assignmentId, AssignmentFailureReason.UnknownAssignment, `Unknown assignment '${assignmentId}'.`);
    }

    const state = this.active.get(assignmentId);
    if (!state) {
      return completionFailure(assignmentId, AssignmentFailureReason.NotActive, `'${def.title}' is not in progress.`);
    }

    const failedCount = this.history.filter((h) => h.assignmentId === assignmentId).length;
    const completionId = `${assignmentId}#fail-${failedCount + 1}`;
    this.active.delete(assignmentId);
    this.history.push({
      assignmentId,
      professionId: def.professionId,
      status: AssignmentStatus.Failed,
      completedAt: this.now(),
      completionId,
      rewardsClaimed: true,
    });

    return {
      success: true,
      assignmentId,
      status: AssignmentStatus.Failed,
      completionId,
      alreadyCompleted: false,
      message: `'${def.title}' failed.`,
    };
  }

  // ── History & reward claim status ─────────────────────────────────────────

  /** Whether an assignment has at least one completed history entry. */
  isCompleted(assignmentId: string): boolean {
    return this.history.some(
      (h) => h.assignmentId === assignmentId && h.status === AssignmentStatus.Completed,
    );
  }

  /** Returns copies of the assignment history, optionally filtered by assignment. */
  getHistory(assignmentId?: string): AssignmentHistoryEntry[] {
    const entries = assignmentId === undefined
      ? this.history
      : this.history.filter((h) => h.assignmentId === assignmentId);
    return entries.map(cloneHistory);
  }

  /** Returns a copy of the history entry matching a completion id, or `undefined`. */
  getCompletion(completionId: string): AssignmentHistoryEntry | undefined {
    const entry = this.history.find((h) => h.completionId === completionId);
    return entry ? cloneHistory(entry) : undefined;
  }

  /**
   * Marks a completion's rewards as claimed, idempotently. The first call
   * succeeds; subsequent calls report `alreadyClaimed` without side effects.
   * Phase 27.5 performs the actual distribution and calls this to record it.
   */
  claimRewards(completionId: string): AssignmentClaimResult {
    const entry = this.history.find((h) => h.completionId === completionId);
    if (!entry) {
      return {
        success: false,
        completionId,
        alreadyClaimed: false,
        message: `No completion found for '${completionId}'.`,
      };
    }
    if (entry.status !== AssignmentStatus.Completed) {
      return {
        success: false,
        completionId,
        alreadyClaimed: false,
        message: `Completion '${completionId}' has no rewards to claim.`,
      };
    }
    if (entry.rewardsClaimed) {
      return {
        success: true,
        completionId,
        alreadyClaimed: true,
        entry: cloneHistory(entry),
        message: `Rewards for '${completionId}' were already claimed.`,
      };
    }

    entry.rewardsClaimed = true;
    return {
      success: true,
      completionId,
      alreadyClaimed: false,
      entry: cloneHistory(entry),
      message: `Rewards for '${completionId}' claimed.`,
    };
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  /** Returns a serialisable snapshot of assignment state. */
  snapshot(): AssignmentSnapshot {
    return {
      version: ASSIGNMENT_SNAPSHOT_VERSION,
      active: [...this.active.values()].map(cloneActive),
      history: this.history.map(cloneHistory),
    };
  }

  /**
   * Restores assignment state. Entries referencing unknown assignments are
   * dropped (handled safely); malformed fields fall back to defaults. Passing an
   * unusable payload clears the state.
   */
  loadSnapshot(snapshot: AssignmentSnapshot | undefined): void {
    this.active.clear();
    this.history = [];
    if (!snapshot || typeof snapshot !== 'object') return;

    if (Array.isArray(snapshot.active)) {
      for (const raw of snapshot.active) {
        if (!raw || typeof raw !== 'object') continue;
        const def = this.assignments.get(raw.assignmentId);
        if (!def) continue; // unknown assignment — skip safely
        this.active.set(raw.assignmentId, normalizeActive(raw, def));
      }
    }

    if (Array.isArray(snapshot.history)) {
      for (const raw of snapshot.history) {
        if (!raw || typeof raw !== 'object') continue;
        if (typeof raw.assignmentId !== 'string' || typeof raw.completionId !== 'string') continue;
        const def = this.assignments.get(raw.assignmentId);
        if (!def) continue; // unknown assignment — skip safely
        this.history.push(normalizeHistory(raw));
      }
    }
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  /** Resolves the minimum profession level of a rank, or `undefined` when unknown. */
  private resolveRankMinLevel(professionId: string, rankId: string): number | undefined {
    const profession = this.professions.get(professionId);
    if (!profession) return undefined;
    return profession.ranks.find((r) => r.id === rankId)?.minLevel;
  }

  /** Builds a stable, unique completion id for a finished assignment. */
  private nextCompletionId(def: AssignmentDefinition): string {
    if (!def.repeatable) return def.id;
    const count = this.history.filter(
      (h) => h.assignmentId === def.id && h.status === AssignmentStatus.Completed,
    ).length;
    return `${def.id}#${count + 1}`;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function progressFailure(
  assignmentId: string,
  objectiveId: string,
  reason: AssignmentFailureReason,
  message: string,
): AssignmentProgressResult {
  return {
    success: false,
    assignmentId,
    objectiveId,
    progress: 0,
    stageComplete: false,
    allStagesComplete: false,
    reason,
    message,
  };
}

function completionFailure(
  assignmentId: string,
  reason: AssignmentFailureReason,
  message: string,
): AssignmentCompletionResult {
  return {
    success: false,
    assignmentId,
    status: AssignmentStatus.Active,
    alreadyCompleted: false,
    reason,
    message,
  };
}

function cloneActive(state: ActiveAssignmentState): ActiveAssignmentState {
  return { ...state, objectives: state.objectives.map((o) => ({ ...o })) };
}

function cloneHistory(entry: AssignmentHistoryEntry): AssignmentHistoryEntry {
  return { ...entry };
}

function normalizeActive(
  raw: ActiveAssignmentState,
  def: AssignmentDefinition,
): ActiveAssignmentState {
  const stageIndex =
    typeof raw.stageIndex === 'number' && Number.isFinite(raw.stageIndex) && raw.stageIndex >= 0
      ? Math.min(Math.floor(raw.stageIndex), def.stages.length)
      : 0;

  const stage = def.stages[stageIndex];
  const objectives: AssignmentObjectiveProgress[] = stage
    ? stage.objectives.map((o) => {
        const persisted = Array.isArray(raw.objectives)
          ? raw.objectives.find((p) => p && p.objectiveId === o.id)
          : undefined;
        const progress =
          persisted && typeof persisted.progress === 'number' && Number.isFinite(persisted.progress) && persisted.progress >= 0
            ? Math.min(Math.floor(persisted.progress), o.required)
            : 0;
        return { objectiveId: o.id, progress };
      })
    : [];

  return {
    assignmentId: def.id,
    professionId: def.professionId,
    stageIndex,
    objectives,
    acceptedAt:
      typeof raw.acceptedAt === 'number' && Number.isFinite(raw.acceptedAt) && raw.acceptedAt >= 0
        ? raw.acceptedAt
        : 0,
  };
}

function normalizeHistory(raw: AssignmentHistoryEntry): AssignmentHistoryEntry {
  const status =
    raw.status === AssignmentStatus.Completed || raw.status === AssignmentStatus.Failed
      ? raw.status
      : AssignmentStatus.Completed;
  return {
    assignmentId: raw.assignmentId,
    professionId: typeof raw.professionId === 'string' ? raw.professionId : '',
    status,
    completedAt:
      typeof raw.completedAt === 'number' && Number.isFinite(raw.completedAt) && raw.completedAt >= 0
        ? raw.completedAt
        : 0,
    completionId: raw.completionId,
    rewardsClaimed: raw.rewardsClaimed === true,
  };
}

/**
 * Sanitises an unknown value into an {@link AssignmentSnapshot}, or `undefined`
 * when the payload is unusable. Backward-compatible: absent assignment data is
 * valid and produces `undefined`.
 */
export function sanitizeAssignmentSnapshot(raw: unknown): AssignmentSnapshot | undefined {
  if (!raw || typeof raw !== 'object') return undefined;

  const candidate = raw as Partial<AssignmentSnapshot>;
  const version =
    typeof candidate.version === 'number' && Number.isInteger(candidate.version) && candidate.version > 0
      ? candidate.version
      : ASSIGNMENT_SNAPSHOT_VERSION;

  const active: ActiveAssignmentState[] = [];
  if (Array.isArray(candidate.active)) {
    for (const entry of candidate.active) {
      if (!entry || typeof entry !== 'object') continue;
      const state = entry as Partial<ActiveAssignmentState>;
      if (typeof state.assignmentId !== 'string' || !state.assignmentId) continue;
      active.push(state as ActiveAssignmentState);
    }
  }

  const history: AssignmentHistoryEntry[] = [];
  if (Array.isArray(candidate.history)) {
    for (const entry of candidate.history) {
      if (!entry || typeof entry !== 'object') continue;
      const record = entry as Partial<AssignmentHistoryEntry>;
      if (typeof record.assignmentId !== 'string' || !record.assignmentId) continue;
      if (typeof record.completionId !== 'string' || !record.completionId) continue;
      history.push(record as AssignmentHistoryEntry);
    }
  }

  return { version, active, history };
}

/** Shared default assignment service instance. */
export const assignmentService = new AssignmentService();
