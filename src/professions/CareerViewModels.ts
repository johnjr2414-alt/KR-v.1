/**
 * Career UI view-model builders (Phase 27.6).
 *
 * This module is the **headless, UI-facing service logic** behind the career
 * interfaces. It turns the authoritative career/workplace/assignment services
 * into plain, display-ready view models so the DOM layer stays a thin renderer
 * and the interesting rules remain testable without a browser.
 *
 * Nothing here mutates state or performs DOM work: it composes existing
 * `CareerService`, `WorkplaceService`, `AssignmentService`, and
 * `ProfessionProgressionService` queries (enrollment checks, access checks,
 * availability checks, progression info) into view models. That keeps the
 * interfaces built on the same rules the rest of the game already uses — no
 * duplicate logic.
 */

import type { SubjectId } from '../core/types/education';
import { CareerService } from './CareerService';
import { WorkplaceService } from './WorkplaceService';
import { AssignmentService } from './AssignmentService';
import { ProfessionProgressionService } from './ProfessionProgressionService';
import {
  ProfessionEnrollmentStatus,
  type EnrollmentContext,
  type EnrollmentRequirementStatus,
} from './ProfessionTypes';
import {
  AssignmentObjectiveType,
  AssignmentTaskType,
  type ActiveAssignmentState,
  type AssignmentContext,
  type AssignmentDefinition,
  type AssignmentRequirementStatus,
} from './AssignmentTypes';
import type {
  WorkplaceAccessContext,
  WorkplaceRequirementStatus,
} from './WorkplaceTypes';

/** Services the builders read from. All are headless, read-only here. */
export interface CareerViewDeps {
  careers: CareerService;
  workplaces: WorkplaceService;
  assignments: AssignmentService;
  progression: ProfessionProgressionService;
}

// ─── Career selection ─────────────────────────────────────────────────────────

/** One profession tile in the selection interface. */
export interface ProfessionCatalogueEntry {
  id: string;
  name: string;
  description: string;
  responsibilities: string[];
  /** Associated workplace ids. */
  workplaceIds: string[];
  /** Resolved workplace display names. */
  workplaceNames: string[];
  /** Rank names, ascending by `minLevel`. */
  rankNames: string[];
  /** Whether the player is already enrolled. */
  enrolled: boolean;
  /** Whether the player may enroll right now. */
  canEnroll: boolean;
  /** Player-facing enrollment summary message. */
  enrollmentMessage: string;
  /** Per-requirement breakdown for the enrollment gate. */
  requirements: EnrollmentRequirementStatus[];
  /** Marks balance/definition values as provisional. */
  provisional: boolean;
}

/** One profession category with its professions. */
export interface ProfessionCategoryView {
  id: string;
  name: string;
  description: string;
  professions: ProfessionCatalogueEntry[];
}

/** View model for the career selection interface. */
export interface ProfessionCatalogueView {
  categories: ProfessionCategoryView[];
  /** Total number of professions exposed. */
  professionCount: number;
  /** Number currently enrolled. */
  enrolledCount: number;
}

// ─── Career profile ───────────────────────────────────────────────────────────

/** A completed-assignment entry in the profile history. */
export interface CareerAssignmentHistoryView {
  assignmentId: string;
  title: string;
  completedAt: number;
}

/** A live assignment shown on the profile. */
export interface ActiveAssignmentView {
  assignmentId: string;
  title: string;
  professionId: string;
  /** 1-based stage number currently in progress. */
  stageNumber: number;
  stageCount: number;
  stageName: string;
  objectives: Array<{
    objectiveId: string;
    description: string;
    progress: number;
    required: number;
  }>;
}

/** One enrolled profession on the career profile. */
export interface ProfessionCareerEntryView {
  professionId: string;
  name: string;
  categoryId: string;
  level: number;
  maxLevel: number;
  currentExp: number;
  requiredExp: number;
  progressRatio: number;
  isMaxLevel: boolean;
  rankId: string;
  rankName: string;
  reputation: number;
  status: ProfessionEnrollmentStatus;
  enrolledAt: number;
  activeAssignments: ActiveAssignmentView[];
  history: CareerAssignmentHistoryView[];
}

/** View model for the career profile interface. */
export interface CareerProfileView {
  professions: ProfessionCareerEntryView[];
  totalCompletedAssignments: number;
  totalReputation: number;
}

// ─── Workplace ────────────────────────────────────────────────────────────────

/** One facility with its current accessibility. */
export interface WorkplaceFacilityView {
  id: string;
  name: string;
  description: string;
  accessible: boolean;
  requirements: WorkplaceRequirementStatus[];
}

/** A profession associated with a workplace. */
export interface WorkplaceProfessionRef {
  id: string;
  name: string;
}

/** An assignment offerable from a workplace. */
export interface WorkplaceAssignmentOffer {
  assignmentId: string;
  title: string;
  taskType: AssignmentTaskType;
  difficulty: number;
  available: boolean;
  message: string;
}

/** View model for the workplace interface. */
export interface WorkplaceView {
  id: string;
  name: string;
  description: string;
  canEnter: boolean;
  entryMessage: string;
  entryRequirements: WorkplaceRequirementStatus[];
  professions: WorkplaceProfessionRef[];
  facilities: WorkplaceFacilityView[];
  interactionPoints: Array<{ id: string; label: string; facilityId?: string }>;
  npcIds: string[];
  availableAssignments: WorkplaceAssignmentOffer[];
  /** Profession responsibilities practised here (flavour activities). */
  activities: string[];
}

// ─── Assignment ───────────────────────────────────────────────────────────────

/** A single objective with its current progress. */
export interface AssignmentObjectiveView {
  id: string;
  description: string;
  type: AssignmentObjectiveType;
  required: number;
  progress: number;
  complete: boolean;
}

/** A stage with its objectives. */
export interface AssignmentStageView {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  complete: boolean;
  objectives: AssignmentObjectiveView[];
}

/** A display summary of an assignment's reward bundle. */
export interface AssignmentRewardSummaryView {
  professionExp?: number;
  characterExp?: number;
  gold?: number;
  reputation?: number;
  subjectMasteryExp: Array<{ subject: SubjectId; amount: number }>;
}

/** Lifecycle status as seen by the UI. */
export type AssignmentViewStatus = 'unavailable' | 'available' | 'active' | 'completed';

/** View model for the assignment interface. */
export interface AssignmentView {
  id: string;
  title: string;
  description: string;
  professionId: string;
  professionName: string;
  taskType: AssignmentTaskType;
  difficulty: number;
  /** Question topics this assignment draws from. */
  questionTopics: string[];
  /** Subjects this assignment draws from. */
  subjects: SubjectId[];
  status: AssignmentViewStatus;
  active: boolean;
  completed: boolean;
  available: boolean;
  repeatable: boolean;
  message: string;
  requirements: AssignmentRequirementStatus[];
  stages: AssignmentStageView[];
  rewards: AssignmentRewardSummaryView;
}

// ─── Builders ─────────────────────────────────────────────────────────────────

/** Builds the career selection view (browsing + enrollment eligibility). */
export function buildProfessionCatalogueView(
  deps: CareerViewDeps,
  ctx: EnrollmentContext,
): ProfessionCatalogueView {
  const categories: ProfessionCategoryView[] = deps.careers.getCategories().map((category) => {
    const professions = deps.careers.getProfessionsByCategory(category.id).map((profession) => {
      const check = deps.careers.checkEnrollment(profession.id, ctx);
      const enrolled = deps.careers.isEnrolled(profession.id);
      return {
        id: profession.id,
        name: profession.name,
        description: profession.description,
        responsibilities: [...profession.responsibilities],
        workplaceIds: [...profession.workplaceIds],
        workplaceNames: profession.workplaceIds.map(
          (id) => deps.workplaces.getWorkplace(id)?.name ?? id,
        ),
        rankNames: [...profession.ranks]
          .sort((a, b) => a.minLevel - b.minLevel)
          .map((rank) => rank.name),
        enrolled,
        canEnroll: check.canEnroll,
        enrollmentMessage: check.message,
        requirements: check.requirements.map((requirement) => ({ ...requirement })),
        provisional: profession.provisional,
      };
    });

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      professions,
    };
  });

  const professionCount = categories.reduce((sum, category) => sum + category.professions.length, 0);
  const enrolledCount = categories.reduce(
    (sum, category) => sum + category.professions.filter((p) => p.enrolled).length,
    0,
  );

  return { categories, professionCount, enrolledCount };
}

/** Builds the career profile view (enrolled professions + assignment activity). */
export function buildCareerProfileView(deps: CareerViewDeps): CareerProfileView {
  const professions = deps.careers.getAllRecords().map<ProfessionCareerEntryView>((record) => {
    const profession = deps.careers.getProfession(record.professionId);
    const progress = deps.progression.getProgress(record.professionId);
    const rank = deps.careers.getRankForLevel(record.professionId, record.level);

    const active = deps.assignments
      .getActiveAssignments()
      .filter((state) => state.professionId === record.professionId)
      .map((state) => toActiveAssignmentView(deps, state));

    const history = record.assignmentHistory.map((entry) => ({
      assignmentId: entry.assignmentId,
      title: deps.assignments.getAssignment(entry.assignmentId)?.title ?? entry.assignmentId,
      completedAt: entry.completedAt,
    }));

    return {
      professionId: record.professionId,
      name: profession?.name ?? record.professionId,
      categoryId: profession?.categoryId ?? '',
      level: record.level,
      maxLevel: profession?.experience.maxProfessionLevel ?? record.level,
      currentExp: progress?.currentExp ?? record.exp,
      requiredExp: progress?.requiredExp ?? 0,
      progressRatio: progress?.progressRatio ?? 0,
      isMaxLevel: progress?.isMaxLevel ?? false,
      rankId: record.rankId,
      rankName: rank?.name ?? progress?.rankName ?? '',
      reputation: record.reputation,
      status: record.status,
      enrolledAt: record.enrolledAt,
      activeAssignments: active,
      history,
    };
  });

  const totalCompletedAssignments = professions.reduce((sum, p) => sum + p.history.length, 0);
  const totalReputation = professions.reduce((sum, p) => sum + p.reputation, 0);

  return { professions, totalCompletedAssignments, totalReputation };
}

/** Builds the workplace interface view for one workplace. */
export function buildWorkplaceView(
  deps: CareerViewDeps,
  workplaceId: string,
  accessCtx: WorkplaceAccessContext,
  assignmentCtx: AssignmentContext,
): WorkplaceView | undefined {
  const workplace = deps.workplaces.getWorkplace(workplaceId);
  if (!workplace) return undefined;

  const entry = deps.workplaces.checkWorkplaceAccess(workplaceId, accessCtx);

  const facilities = workplace.facilities.map<WorkplaceFacilityView>((facility) => {
    const access = deps.workplaces.checkFacilityAccess(workplaceId, facility.id, accessCtx);
    return {
      id: facility.id,
      name: facility.name,
      description: facility.description,
      accessible: access.canAccess,
      requirements: access.requirements.map((requirement) => ({ ...requirement })),
    };
  });

  const professions = workplace.professionIds.map<WorkplaceProfessionRef>((id) => ({
    id,
    name: deps.careers.getProfession(id)?.name ?? id,
  }));

  const availableAssignments: WorkplaceAssignmentOffer[] = [];
  for (const professionId of workplace.professionIds) {
    for (const def of deps.assignments.getAssignmentsForProfession(professionId)) {
      const availability = deps.assignments.checkAvailability(def.id, assignmentCtx);
      availableAssignments.push({
        assignmentId: def.id,
        title: def.title,
        taskType: def.taskType,
        difficulty: def.difficulty,
        available: availability.available,
        message: availability.message,
      });
    }
  }

  const activities: string[] = [];
  for (const professionId of workplace.professionIds) {
    const profession = deps.careers.getProfession(professionId);
    if (profession) activities.push(...profession.responsibilities);
  }

  return {
    id: workplace.id,
    name: workplace.name,
    description: workplace.description,
    canEnter: entry.canAccess,
    entryMessage: entry.message,
    entryRequirements: entry.requirements.map((requirement) => ({ ...requirement })),
    professions,
    facilities,
    interactionPoints: workplace.interactionPoints.map((point) => ({
      id: point.id,
      label: point.label,
      facilityId: point.facilityId,
    })),
    npcIds: [...workplace.npcIds],
    availableAssignments,
    activities,
  };
}

/** Builds the assignment interface view for one assignment. */
export function buildAssignmentView(
  deps: CareerViewDeps,
  assignmentId: string,
  ctx: AssignmentContext,
): AssignmentView | undefined {
  const def = deps.assignments.getAssignment(assignmentId);
  if (!def) return undefined;

  const active = deps.assignments.getActiveAssignment(assignmentId);
  const completed = deps.assignments.isCompleted(assignmentId);
  const availability = deps.assignments.checkAvailability(assignmentId, ctx);

  const stages = def.stages.map<AssignmentStageView>((stage, index) => {
    const stageProgress = active && active.stageIndex === index ? active.objectives : undefined;
    const objectives = stage.objectives.map((objective) => {
      const progress = stageProgress
        ? stageProgress.find((p) => p.objectiveId === objective.id)?.progress ?? 0
        : 0;
      return {
        id: objective.id,
        description: objective.description,
        type: objective.type,
        required: objective.required,
        progress,
        complete: progress >= objective.required,
      };
    });

    if (!active) {
      const cleared = completed;
      return {
        id: stage.id,
        name: stage.name,
        description: stage.description,
        active: false,
        complete: cleared,
        objectives: objectives.map((o) => ({ ...o, progress: cleared ? o.required : 0, complete: cleared })),
      };
    }

    const stageComplete = active.stageIndex > index;
    const stageActive = active.stageIndex === index;
    return {
      id: stage.id,
      name: stage.name,
      description: stage.description,
      active: stageActive,
      complete: stageComplete,
      objectives,
    };
  });

  const status: AssignmentViewStatus = active ? 'active' : completed ? 'completed' : availability.available ? 'available' : 'unavailable';

  return {
    id: def.id,
    title: def.title,
    description: def.description,
    professionId: def.professionId,
    professionName: deps.careers.getProfession(def.professionId)?.name ?? def.professionId,
    taskType: def.taskType,
    difficulty: def.difficulty,
    questionTopics: [...def.requiredQuestionTopics],
    subjects: [...def.requiredSubjects],
    status,
    active: active !== undefined,
    completed,
    available: availability.available,
    repeatable: def.repeatable,
    message: active
      ? `'${def.title}' is in progress.`
      : completed && !def.repeatable
        ? `'${def.title}' has been completed.`
        : availability.message,
    requirements: availability.requirements.map((requirement) => ({ ...requirement })),
    stages,
    rewards: toRewardSummary(def),
  };
}

// ─── Internals ────────────────────────────────────────────────────────────────

function toActiveAssignmentView(deps: CareerViewDeps, state: ActiveAssignmentState): ActiveAssignmentView {
  const def = deps.assignments.getAssignment(state.assignmentId);
  const stage = def?.stages[state.stageIndex];
  const objectives = (stage?.objectives ?? []).map((objective) => ({
    objectiveId: objective.id,
    description: objective.description,
    progress: state.objectives.find((p) => p.objectiveId === objective.id)?.progress ?? 0,
    required: objective.required,
  }));

  return {
    assignmentId: state.assignmentId,
    title: def?.title ?? state.assignmentId,
    professionId: state.professionId,
    stageNumber: Math.min(state.stageIndex + 1, def?.stages.length ?? state.stageIndex + 1),
    stageCount: def?.stages.length ?? 0,
    stageName: stage?.name ?? '',
    objectives,
  };
}

function toRewardSummary(def: AssignmentDefinition): AssignmentRewardSummaryView {
  return {
    professionExp: def.rewards.professionExp,
    characterExp: def.rewards.characterExp,
    gold: def.rewards.gold,
    reputation: def.rewards.reputation,
    subjectMasteryExp: (def.rewards.subjectMasteryExp ?? []).map((entry) => ({ ...entry })),
  };
}
