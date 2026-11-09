import { EducationalTier, SubjectId } from '../core/types/education';
import type { AssignmentDefinition } from './AssignmentTypes';
import { AssignmentObjectiveType, AssignmentTaskType } from './AssignmentTypes';
import type { ProfessionDefinition } from './ProfessionTypes';

/** Severity of an assignment-catalogue validation finding. */
export enum AssignmentValidationSeverity {
  Error = 'error',
  Warning = 'warning',
}

/** A single validation finding. */
export interface AssignmentValidationIssue {
  severity: AssignmentValidationSeverity;
  /** Stable machine-readable code (e.g. `duplicate-assignment-id`). */
  code: string;
  /** Human-readable description. */
  message: string;
  /** Assignment this issue relates to, when applicable. */
  assignmentId?: string;
  /** Stage this issue relates to, when applicable. */
  stageId?: string;
  /** Objective this issue relates to, when applicable. */
  objectiveId?: string;
}

/** Aggregate validation report. */
export interface AssignmentValidationReport {
  isValid: boolean;
  issues: AssignmentValidationIssue[];
}

export interface AssignmentValidationOptions {
  /** Known profession ids. Unknown profession references become errors. */
  knownProfessionIds?: ReadonlySet<string>;
  /** Known quest ids. Unknown prerequisite quest references become errors. */
  knownQuestIds?: ReadonlySet<string>;
  /** Known assignment ids. Unknown prerequisite assignment references become errors. */
  knownAssignmentIds?: ReadonlySet<string>;
  /**
   * Profession catalogue used to validate `minRankId` references against each
   * profession's rank ladder. When omitted, rank references are not checked.
   */
  professions?: readonly ProfessionDefinition[];
  /** Valid subject ids. Defaults to the shared {@link SubjectId} set. */
  knownSubjects?: ReadonlySet<string>;
}

const VALID_TASK_TYPES = new Set<string>(Object.values(AssignmentTaskType));
const VALID_OBJECTIVE_TYPES = new Set<string>(Object.values(AssignmentObjectiveType));
const VALID_TIERS = new Set<string>(Object.values(EducationalTier));

function issue(
  severity: AssignmentValidationSeverity,
  code: string,
  message: string,
  refs: { assignmentId?: string; stageId?: string; objectiveId?: string } = {},
): AssignmentValidationIssue {
  return { severity, code, message, ...refs };
}

/**
 * Validates the assignment catalogue: unique ids, required fields, resolvable
 * profession/quest/assignment references, well-formed stage & objective
 * structures, and sane reward data. Missing or malformed definitions are
 * reported rather than thrown.
 */
export function validateAssignmentCatalogue(
  assignments: readonly AssignmentDefinition[],
  options: AssignmentValidationOptions = {},
): AssignmentValidationReport {
  const issues: AssignmentValidationIssue[] = [];
  const validSubjects = options.knownSubjects ?? new Set<string>(Object.values(SubjectId));
  const professionById = new Map((options.professions ?? []).map((p) => [p.id, p]));
  const seenIds = new Set<string>();

  for (const def of assignments) {
    const id = def.id;

    if (!id || typeof id !== 'string') {
      issues.push(issue(AssignmentValidationSeverity.Error, 'invalid-assignment-id', 'Assignment id is required.'));
      continue;
    }
    if (seenIds.has(id)) {
      issues.push(issue(AssignmentValidationSeverity.Error, 'duplicate-assignment-id', `Duplicate assignment id '${id}'.`, { assignmentId: id }));
    }
    seenIds.add(id);

    if (!def.title || !def.title.trim()) {
      issues.push(issue(AssignmentValidationSeverity.Error, 'missing-title', `Assignment '${id}' is missing a title.`, { assignmentId: id }));
    }
    if (!def.description || !def.description.trim()) {
      issues.push(issue(AssignmentValidationSeverity.Warning, 'missing-description', `Assignment '${id}' is missing a description.`, { assignmentId: id }));
    }

    // ── Profession association ──
    if (!def.professionId || !def.professionId.trim()) {
      issues.push(issue(AssignmentValidationSeverity.Error, 'missing-profession', `Assignment '${id}' is missing a profession association.`, { assignmentId: id }));
    } else if (options.knownProfessionIds && !options.knownProfessionIds.has(def.professionId)) {
      issues.push(issue(AssignmentValidationSeverity.Error, 'unknown-profession', `Assignment '${id}' references unknown profession '${def.professionId}'.`, { assignmentId: id }));
    }

    // ── Task type & difficulty ──
    if (!VALID_TASK_TYPES.has(def.taskType)) {
      issues.push(issue(AssignmentValidationSeverity.Error, 'invalid-task-type', `Assignment '${id}' has an invalid task type '${def.taskType}'.`, { assignmentId: id }));
    }
    if (!(Number.isInteger(def.difficulty) && def.difficulty >= 1 && def.difficulty <= 5)) {
      issues.push(issue(AssignmentValidationSeverity.Error, 'invalid-difficulty', `Assignment '${id}' difficulty must be an integer from 1 to 5.`, { assignmentId: id }));
    }

    // ── Educational tier & subjects ──
    if (!VALID_TIERS.has(def.educationalTier)) {
      issues.push(issue(AssignmentValidationSeverity.Error, 'invalid-educational-tier', `Assignment '${id}' has an invalid educational tier '${def.educationalTier}'.`, { assignmentId: id }));
    }
    if (Array.isArray(def.requiredSubjects)) {
      for (const subject of def.requiredSubjects) {
        if (!validSubjects.has(subject)) {
          issues.push(issue(AssignmentValidationSeverity.Error, 'unknown-subject', `Assignment '${id}' references unknown subject '${subject}'.`, { assignmentId: id }));
        }
      }
    } else {
      issues.push(issue(AssignmentValidationSeverity.Warning, 'missing-subjects', `Assignment '${id}' defines no required subjects.`, { assignmentId: id }));
    }

    // ── Stages & objectives ──
    validateStages(def, issues);

    // ── Requirements ──
    validateRequirements(def, professionById, options, issues);

    // ── Rewards ──
    validateRewards(def, validSubjects, issues);
  }

  return { isValid: !issues.some((i) => i.severity === AssignmentValidationSeverity.Error), issues };
}

function validateStages(def: AssignmentDefinition, issues: AssignmentValidationIssue[]): void {
  const stages = Array.isArray(def.stages) ? def.stages : [];
  if (stages.length === 0) {
    issues.push(issue(AssignmentValidationSeverity.Error, 'missing-stages', `Assignment '${def.id}' must define at least one stage.`, { assignmentId: def.id }));
    return;
  }

  const stageIds = new Set<string>();
  const objectiveIds = new Set<string>();

  for (const stage of stages) {
    if (!stage.id || stageIds.has(stage.id)) {
      issues.push(issue(AssignmentValidationSeverity.Error, 'duplicate-stage-id', `Assignment '${def.id}' has a missing or duplicate stage id '${stage.id}'.`, { assignmentId: def.id, stageId: stage.id }));
    }
    stageIds.add(stage.id);
    if (!stage.name || !stage.name.trim()) {
      issues.push(issue(AssignmentValidationSeverity.Error, 'missing-stage-name', `Assignment '${def.id}' stage '${stage.id}' is missing a name.`, { assignmentId: def.id, stageId: stage.id }));
    }

    const objectives = Array.isArray(stage.objectives) ? stage.objectives : [];
    if (objectives.length === 0) {
      issues.push(issue(AssignmentValidationSeverity.Error, 'missing-objectives', `Assignment '${def.id}' stage '${stage.id}' has no objectives.`, { assignmentId: def.id, stageId: stage.id }));
    }

    for (const objective of objectives) {
      if (!objective.id || objectiveIds.has(objective.id)) {
        issues.push(issue(AssignmentValidationSeverity.Error, 'duplicate-objective-id', `Assignment '${def.id}' has a missing or duplicate objective id '${objective.id}'.`, { assignmentId: def.id, stageId: stage.id, objectiveId: objective.id }));
      }
      objectiveIds.add(objective.id);

      if (!objective.description || !objective.description.trim()) {
        issues.push(issue(AssignmentValidationSeverity.Warning, 'missing-objective-description', `Assignment '${def.id}' objective '${objective.id}' is missing a description.`, { assignmentId: def.id, stageId: stage.id, objectiveId: objective.id }));
      }
      if (!VALID_OBJECTIVE_TYPES.has(objective.type)) {
        issues.push(issue(AssignmentValidationSeverity.Error, 'invalid-objective-type', `Assignment '${def.id}' objective '${objective.id}' has an invalid type '${objective.type}'.`, { assignmentId: def.id, stageId: stage.id, objectiveId: objective.id }));
      }
      if (!(Number.isInteger(objective.required) && objective.required >= 1)) {
        issues.push(issue(AssignmentValidationSeverity.Error, 'invalid-objective-required', `Assignment '${def.id}' objective '${objective.id}' required count must be an integer >= 1.`, { assignmentId: def.id, stageId: stage.id, objectiveId: objective.id }));
      }
    }
  }
}

function validateRequirements(
  def: AssignmentDefinition,
  professionById: Map<string, ProfessionDefinition>,
  options: AssignmentValidationOptions,
  issues: AssignmentValidationIssue[],
): void {
  const req = def.requirements;
  if (!req || typeof req !== 'object') {
    issues.push(issue(AssignmentValidationSeverity.Warning, 'missing-requirements', `Assignment '${def.id}' has no requirements object.`, { assignmentId: def.id }));
    return;
  }

  if (req.minProfessionLevel !== undefined && !(req.minProfessionLevel >= 1)) {
    issues.push(issue(AssignmentValidationSeverity.Error, 'invalid-min-profession-level', `Assignment '${def.id}' minProfessionLevel must be >= 1.`, { assignmentId: def.id }));
  }

  if (req.minRankId !== undefined) {
    const profession = professionById.get(def.professionId);
    if (profession && !profession.ranks.some((r) => r.id === req.minRankId)) {
      issues.push(issue(AssignmentValidationSeverity.Error, 'unknown-rank', `Assignment '${def.id}' references rank '${req.minRankId}' not in profession '${def.professionId}'.`, { assignmentId: def.id }));
    }
  }

  if (Array.isArray(req.prerequisiteAssignmentIds)) {
    for (const prereqId of req.prerequisiteAssignmentIds) {
      if (prereqId === def.id) {
        issues.push(issue(AssignmentValidationSeverity.Error, 'self-prerequisite', `Assignment '${def.id}' lists itself as a prerequisite.`, { assignmentId: def.id }));
      }
      if (options.knownAssignmentIds && !options.knownAssignmentIds.has(prereqId)) {
        issues.push(issue(AssignmentValidationSeverity.Error, 'unknown-prerequisite-assignment', `Assignment '${def.id}' references unknown prerequisite assignment '${prereqId}'.`, { assignmentId: def.id }));
      }
    }
  }

  if (Array.isArray(req.prerequisiteQuestIds) && options.knownQuestIds) {
    for (const questId of req.prerequisiteQuestIds) {
      if (!options.knownQuestIds.has(questId)) {
        issues.push(issue(AssignmentValidationSeverity.Error, 'unknown-prerequisite-quest', `Assignment '${def.id}' references unknown prerequisite quest '${questId}'.`, { assignmentId: def.id }));
      }
    }
  }
}

function validateRewards(
  def: AssignmentDefinition,
  validSubjects: ReadonlySet<string>,
  issues: AssignmentValidationIssue[],
): void {
  const rewards = def.rewards;
  if (!rewards || typeof rewards !== 'object') {
    issues.push(issue(AssignmentValidationSeverity.Warning, 'missing-rewards', `Assignment '${def.id}' defines no rewards.`, { assignmentId: def.id }));
    return;
  }

  const numeric: Array<[string, number | undefined]> = [
    ['professionExp', rewards.professionExp],
    ['characterExp', rewards.characterExp],
    ['gold', rewards.gold],
    ['reputation', rewards.reputation],
  ];
  for (const [field, value] of numeric) {
    if (value !== undefined && !(Number.isFinite(value) && value >= 0)) {
      issues.push(issue(AssignmentValidationSeverity.Error, 'invalid-reward', `Assignment '${def.id}' reward '${field}' must be a number >= 0.`, { assignmentId: def.id }));
    }
  }

  if (Array.isArray(rewards.subjectMasteryExp)) {
    for (const entry of rewards.subjectMasteryExp) {
      if (!validSubjects.has(entry.subject)) {
        issues.push(issue(AssignmentValidationSeverity.Error, 'unknown-reward-subject', `Assignment '${def.id}' reward references unknown subject '${entry.subject}'.`, { assignmentId: def.id }));
      }
      if (!(Number.isFinite(entry.amount) && entry.amount > 0)) {
        issues.push(issue(AssignmentValidationSeverity.Error, 'invalid-reward-amount', `Assignment '${def.id}' mastery reward for '${entry.subject}' must be > 0.`, { assignmentId: def.id }));
      }
    }
  }
}
