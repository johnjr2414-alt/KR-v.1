/**
 * Professional assignment framework types (Phase 27.3).
 *
 * An *assignment* is a configurable professional activity a player undertakes
 * within an enrolled profession — a knowledge assessment, a case analysis, a
 * project, a simulation, or a research task. Assignments are composed of
 * ordered **stages**, each containing **objectives**. Objectives are generic and
 * typed, so the engine never hardcodes a specific profession: a new assignment
 * (for any profession) is added purely through configuration.
 *
 * Objectives are deliberately not limited to questions: an objective can be a
 * question count, a generic step/milestone counter, an item collection, or an
 * externally reported outcome. Question-backed objectives are wired to the
 * existing question system in Phase 27.4.
 *
 * Reward data is *defined and validated* here and surfaced on a completion
 * result, but is **not distributed** — distribution is routed through the
 * existing progression, mastery, and currency services in Phase 27.5. No
 * duplicate reward system is created.
 *
 * Everything here is headless and data-driven (no Phaser/DOM imports).
 */

import type { EducationalTier, SubjectId } from '../core/types/education';

/**
 * High-level classification of an assignment. Different professions use
 * different task types; the engine treats them uniformly.
 */
export enum AssignmentTaskType {
  KnowledgeAssessment = 'knowledge-assessment',
  ProblemSolving = 'problem-solving',
  CaseAnalysis = 'case-analysis',
  ProjectCompletion = 'project-completion',
  PracticalSimulation = 'practical-simulation',
  ResearchAssignment = 'research-assignment',
}

/**
 * Generic objective kinds. The engine advances any objective the same way
 * (a counter toward `required`); the type only describes *what* is being
 * progressed, so profession-specific logic never enters the engine.
 */
export enum AssignmentObjectiveType {
  /** A count of correctly answered questions (question-backed; Phase 27.4). */
  AnswerQuestions = 'answer-questions',
  /** A count of completed steps/milestones (e.g. a multi-part project). */
  CompleteSteps = 'complete-steps',
  /** A count of collected items (the item id is `targetId`). */
  CollectItems = 'collect-items',
  /** An externally reported outcome (e.g. a diagnosis or test result). */
  ReportOutcome = 'report-outcome',
}

/** One objective within an assignment stage. */
export interface AssignmentObjectiveDefinition {
  /** Unique within the owning assignment. */
  id: string;
  /** Player-facing description (e.g. "Interpret the laboratory results"). */
  description: string;
  /** The kind of progress this objective tracks. */
  type: AssignmentObjectiveType;
  /** Count required to satisfy the objective. Must be >= 1. */
  required: number;
  /** Optional target reference (item id, subject id, question topic, etc.). */
  targetId?: string;
}

/** One ordered stage of a (possibly multi-stage) assignment. */
export interface AssignmentStageDefinition {
  /** Unique within the owning assignment. */
  id: string;
  /** Display name. */
  name: string;
  /** Optional longer description. */
  description?: string;
  /** Objectives that must all be satisfied to clear the stage. */
  objectives: AssignmentObjectiveDefinition[];
}

/** A subject-mastery component of an assignment reward. */
export interface AssignmentSubjectMasteryReward {
  subject: SubjectId;
  amount: number;
}

/**
 * Configurable reward bundle. All fields are optional; a reward of a given kind
 * is granted only when specified. Values are data only at this stage.
 */
export interface AssignmentRewards {
  /** Profession EXP. */
  professionExp?: number;
  /** Character (combat) EXP. */
  characterExp?: number;
  /** Gold. */
  gold?: number;
  /** Profession reputation. */
  reputation?: number;
  /** Subject-mastery EXP, one entry per subject. */
  subjectMasteryExp?: AssignmentSubjectMasteryReward[];
}

/** Optional, configurable gates applied when accepting an assignment. */
export interface AssignmentRequirements {
  /**
   * Minimum profession rank (by rank id). Satisfied when the player's current
   * profession level has reached the named rank's `minLevel` on the ladder.
   */
  minRankId?: string;
  /** Minimum profession level (independent of rank). */
  minProfessionLevel?: number;
  /** Other assignments that must already be completed. */
  prerequisiteAssignmentIds?: string[];
  /** Quests that must already be completed. */
  prerequisiteQuestIds?: string[];
}

/**
 * Static, data-driven definition of a professional assignment. New assignments
 * are added purely through configuration without changing the engine.
 */
export interface AssignmentDefinition {
  /** Unique assignment identifier (slug). */
  id: string;
  /** Display title. */
  title: string;
  /** Short description. */
  description: string;
  /** Owning profession id (must resolve against the profession catalogue). */
  professionId: string;
  /** High-level task type. */
  taskType: AssignmentTaskType;
  /** Difficulty rating (1 easiest .. 5 hardest). */
  difficulty: number;
  /** Question topics this assignment draws from (Phase 27.4). */
  requiredQuestionTopics: string[];
  /** Subjects this assignment draws from (Phase 27.4). */
  requiredSubjects: SubjectId[];
  /** Educational tier this assignment is aimed at (Phase 27.4). */
  educationalTier: EducationalTier;
  /** Ordered stages; every objective in every stage must be satisfied. */
  stages: AssignmentStageDefinition[];
  /** Acceptance gates. */
  requirements: AssignmentRequirements;
  /** Reward bundle produced on completion (data only until Phase 27.5). */
  rewards: AssignmentRewards;
  /** Whether the assignment may be undertaken more than once. */
  repeatable: boolean;
  /** Marks balance values as provisional / draft. */
  provisional: boolean;
}

/** Lifecycle status of an assignment instance. */
export enum AssignmentStatus {
  Active = 'active',
  Completed = 'completed',
  Failed = 'failed',
}

/** Progress toward one objective of the currently active stage. */
export interface AssignmentObjectiveProgress {
  objectiveId: string;
  progress: number;
}

/** An accepted, in-progress assignment. */
export interface ActiveAssignmentState {
  assignmentId: string;
  professionId: string;
  /** Index into the definition's `stages`; equals `stages.length` when cleared. */
  stageIndex: number;
  /** Progress for each objective of the current stage. */
  objectives: AssignmentObjectiveProgress[];
  /** Timestamp (ms) the assignment was accepted. */
  acceptedAt: number;
}

/** A finished assignment record (completed or failed). */
export interface AssignmentHistoryEntry {
  assignmentId: string;
  professionId: string;
  status: AssignmentStatus.Completed | AssignmentStatus.Failed;
  /** Timestamp (ms) the assignment finished. */
  completedAt: number;
  /** Stable identifier for this specific completion. */
  completionId: string;
  /** Whether the completion's rewards have been handed out yet. */
  rewardsClaimed: boolean;
}

export const ASSIGNMENT_SNAPSHOT_VERSION = 1;

/** Optional, backward-compatible save payload for assignment state. */
export interface AssignmentSnapshot {
  version: number;
  active: ActiveAssignmentState[];
  history: AssignmentHistoryEntry[];
}

/**
 * Caller-supplied context used to evaluate assignment availability. Keeping
 * this a plain object keeps {@link import('./AssignmentService').AssignmentService}
 * headless and independent from the manager/session layer.
 */
export interface AssignmentContext {
  /** Resolves the player's state in a profession, or `undefined` when not enrolled. */
  getProfessionState?: (professionId: string) => { level: number; rankId: string } | undefined;
  /** Reports whether a quest has been completed. */
  isQuestCompleted?: (questId: string) => boolean;
}

/** Why an assignment action could not proceed. */
export enum AssignmentFailureReason {
  UnknownAssignment = 'unknown-assignment',
  NotEnrolled = 'not-enrolled',
  ProfessionLevelTooLow = 'profession-level-too-low',
  RankTooLow = 'rank-too-low',
  PrerequisiteAssignment = 'prerequisite-assignment',
  PrerequisiteQuest = 'prerequisite-quest',
  AlreadyActive = 'already-active',
  AlreadyCompleted = 'already-completed',
  NotActive = 'not-active',
  ObjectivesIncomplete = 'objectives-incomplete',
  UnknownObjective = 'unknown-objective',
}

/** Per-requirement evaluation entry, useful for UI display. */
export interface AssignmentRequirementStatus {
  /** Human-readable label of the requirement. */
  label: string;
  /** Whether the requirement is currently satisfied. */
  satisfied: boolean;
  /** Optional detail string (e.g. "requires rank Junior Doctor"). */
  detail?: string;
}

/** Result of a non-mutating availability check. */
export interface AssignmentAvailability {
  assignmentId: string;
  available: boolean;
  /** Failure reasons (each failed requirement); empty when `available`. */
  reasons: AssignmentFailureReason[];
  /** Full per-requirement breakdown. */
  requirements: AssignmentRequirementStatus[];
  /** Player-facing summary message. */
  message: string;
}

/** Result of an acceptance attempt. */
export interface AssignmentAcceptResult {
  success: boolean;
  assignmentId: string;
  /** Newly created active state (present only on success). */
  state?: ActiveAssignmentState;
  /** First blocking reason (present only on failure). */
  reason?: AssignmentFailureReason;
  /** Player-facing summary message. */
  message: string;
}

/** Result of recording objective progress. */
export interface AssignmentProgressResult {
  success: boolean;
  assignmentId: string;
  objectiveId: string;
  /** New progress value for the objective. */
  progress: number;
  /** Whether the current stage was cleared by this update. */
  stageComplete: boolean;
  /** Whether every stage has been cleared (assignment ready to complete). */
  allStagesComplete: boolean;
  reason?: AssignmentFailureReason;
  message: string;
}

/** Result of completing an assignment (includes reward data, no distribution). */
export interface AssignmentCompletionResult {
  success: boolean;
  assignmentId: string;
  status: AssignmentStatus;
  /** Stable completion identifier (present once completed). */
  completionId?: string;
  /** Reward data to be distributed by Phase 27.5 (present on completion). */
  rewards?: AssignmentRewards;
  /** True when this call replayed an existing completion (idempotent). */
  alreadyCompleted: boolean;
  reason?: AssignmentFailureReason;
  message: string;
}

/** Result of claiming (or replaying a claim of) a completion's rewards. */
export interface AssignmentClaimResult {
  success: boolean;
  completionId: string;
  /** True when the completion's rewards had already been claimed. */
  alreadyClaimed: boolean;
  entry?: AssignmentHistoryEntry;
  message: string;
}
