import { SubjectId } from '../core/types/education';
import type { ProfessionDefinition } from './ProfessionTypes';
import type { WorkplaceAccessRequirement, WorkplaceDefinition } from './WorkplaceTypes';

/** Severity of a workplace-catalogue validation finding. */
export enum WorkplaceValidationSeverity {
  Error = 'error',
  Warning = 'warning',
}

/** A single validation finding. */
export interface WorkplaceValidationIssue {
  severity: WorkplaceValidationSeverity;
  /** Stable machine-readable code (e.g. `duplicate-workplace-id`). */
  code: string;
  /** Human-readable description. */
  message: string;
  /** Workplace this issue relates to, when applicable. */
  workplaceId?: string;
  /** Facility this issue relates to, when applicable. */
  facilityId?: string;
}

/** Aggregate validation report. */
export interface WorkplaceValidationReport {
  isValid: boolean;
  issues: WorkplaceValidationIssue[];
}

export interface WorkplaceValidationOptions {
  /** Known profession ids. Unknown workplace profession associations become errors. */
  knownProfessionIds?: ReadonlySet<string>;
  /** Known NPC ids. Unknown NPC references become warnings. */
  knownNpcIds?: ReadonlySet<string>;
  /** Known map ids. Unknown world-location map references become warnings. */
  knownMapIds?: ReadonlySet<string>;
  /** Known landmark ids. Unknown world-location landmark references become warnings. */
  knownLandmarkIds?: ReadonlySet<string>;
  /** Known building ids. Unknown world-location building references become warnings. */
  knownBuildingIds?: ReadonlySet<string>;
  /** Known quest ids. Unknown quest references become errors. */
  knownQuestIds?: ReadonlySet<string>;
  /** Valid subject ids. Defaults to the shared {@link SubjectId} set. */
  knownSubjects?: ReadonlySet<string>;
}

function issue(
  severity: WorkplaceValidationSeverity,
  code: string,
  message: string,
  workplaceId?: string,
  facilityId?: string,
): WorkplaceValidationIssue {
  return { severity, code, message, workplaceId, facilityId };
}

/**
 * Validates the workplace catalogue: unique ids, non-empty fields, resolvable
 * profession/NPC/world references, and well-formed access requirements. Missing
 * or malformed definitions are reported rather than thrown.
 */
export function validateWorkplaceCatalogue(
  workplaces: readonly WorkplaceDefinition[],
  options: WorkplaceValidationOptions = {},
): WorkplaceValidationReport {
  const issues: WorkplaceValidationIssue[] = [];
  const validSubjects = options.knownSubjects ?? new Set<string>(Object.values(SubjectId));
  const seenWorkplaceIds = new Set<string>();

  for (const workplace of workplaces) {
    const id = workplace.id;

    if (!id || typeof id !== 'string') {
      issues.push(issue(WorkplaceValidationSeverity.Error, 'invalid-workplace-id', 'Workplace id is required.'));
      continue;
    }
    if (seenWorkplaceIds.has(id)) {
      issues.push(issue(WorkplaceValidationSeverity.Error, 'duplicate-workplace-id', `Duplicate workplace id '${id}'.`, id));
    }
    seenWorkplaceIds.add(id);

    if (!workplace.name || !workplace.name.trim()) {
      issues.push(issue(WorkplaceValidationSeverity.Error, 'missing-workplace-name', `Workplace '${id}' is missing a name.`, id));
    }
    if (!workplace.description || !workplace.description.trim()) {
      issues.push(issue(WorkplaceValidationSeverity.Warning, 'missing-workplace-description', `Workplace '${id}' is missing a description.`, id));
    }

    // ── Associated professions ──
    const professionIds = Array.isArray(workplace.professionIds) ? workplace.professionIds : [];
    const seenProfessionRefs = new Set<string>();
    for (const professionId of professionIds) {
      if (seenProfessionRefs.has(professionId)) {
        issues.push(issue(WorkplaceValidationSeverity.Error, 'duplicate-profession-association', `Workplace '${id}' lists profession '${professionId}' more than once.`, id));
      }
      seenProfessionRefs.add(professionId);
      if (options.knownProfessionIds && !options.knownProfessionIds.has(professionId)) {
        issues.push(issue(WorkplaceValidationSeverity.Error, 'unknown-profession', `Workplace '${id}' associates unknown profession '${professionId}'.`, id));
      }
    }

    // ── Facilities ──
    const facilities = Array.isArray(workplace.facilities) ? workplace.facilities : [];
    if (facilities.length === 0) {
      issues.push(issue(WorkplaceValidationSeverity.Warning, 'missing-facilities', `Workplace '${id}' defines no facilities.`, id));
    }
    const facilityIds = new Set<string>();
    for (const facility of facilities) {
      if (!facility.id || facilityIds.has(facility.id)) {
        issues.push(issue(WorkplaceValidationSeverity.Error, 'duplicate-facility-id', `Workplace '${id}' has a missing or duplicate facility id '${facility.id}'.`, id, facility.id));
      }
      facilityIds.add(facility.id);
      if (!facility.name || !facility.name.trim()) {
        issues.push(issue(WorkplaceValidationSeverity.Error, 'missing-facility-name', `Workplace '${id}' facility '${facility.id}' is missing a name.`, id, facility.id));
      }
      if (!facility.description || !facility.description.trim()) {
        issues.push(issue(WorkplaceValidationSeverity.Warning, 'missing-facility-description', `Workplace '${id}' facility '${facility.id}' is missing a description.`, id, facility.id));
      }
      validateAccessRequirement(facility.access, professionIds, validSubjects, options, issues, id, facility.id);
    }

    // ── Interaction points ──
    const interactionPoints = Array.isArray(workplace.interactionPoints) ? workplace.interactionPoints : [];
    const pointIds = new Set<string>();
    for (const point of interactionPoints) {
      if (!point.id || pointIds.has(point.id)) {
        issues.push(issue(WorkplaceValidationSeverity.Error, 'duplicate-interaction-point-id', `Workplace '${id}' has a missing or duplicate interaction point id '${point.id}'.`, id));
      }
      pointIds.add(point.id);
      if (!point.label || !point.label.trim()) {
        issues.push(issue(WorkplaceValidationSeverity.Error, 'missing-interaction-point-label', `Workplace '${id}' interaction point '${point.id}' is missing a label.`, id));
      }
      if (point.facilityId && !facilityIds.has(point.facilityId)) {
        issues.push(issue(WorkplaceValidationSeverity.Error, 'unknown-facility-reference', `Workplace '${id}' interaction point '${point.id}' references unknown facility '${point.facilityId}'.`, id));
      }
    }

    // ── NPC associations ──
    if (options.knownNpcIds) {
      for (const npcId of workplace.npcIds ?? []) {
        if (!options.knownNpcIds.has(npcId)) {
          issues.push(issue(WorkplaceValidationSeverity.Warning, 'unknown-npc', `Workplace '${id}' references unknown NPC '${npcId}'.`, id));
        }
      }
    }

    // ── Entry requirement ──
    validateAccessRequirement(workplace.entryRequirements, professionIds, validSubjects, options, issues, id);

    // ── World location ──
    const location = workplace.worldLocation;
    if (location) {
      if (!location.mapId || !location.mapId.trim()) {
        issues.push(issue(WorkplaceValidationSeverity.Error, 'missing-location-map', `Workplace '${id}' world location is missing a map id.`, id));
      } else if (options.knownMapIds && !options.knownMapIds.has(location.mapId)) {
        issues.push(issue(WorkplaceValidationSeverity.Warning, 'unknown-location-map', `Workplace '${id}' references unknown map '${location.mapId}'.`, id));
      }
      if (location.landmarkId && options.knownLandmarkIds && !options.knownLandmarkIds.has(location.landmarkId)) {
        issues.push(issue(WorkplaceValidationSeverity.Warning, 'unknown-location-landmark', `Workplace '${id}' references unknown landmark '${location.landmarkId}'.`, id));
      }
      if (location.buildingId && options.knownBuildingIds && !options.knownBuildingIds.has(location.buildingId)) {
        issues.push(issue(WorkplaceValidationSeverity.Warning, 'unknown-location-building', `Workplace '${id}' references unknown building '${location.buildingId}'.`, id));
      }
    }
  }

  return { isValid: !issues.some((i) => i.severity === WorkplaceValidationSeverity.Error), issues };
}

function validateAccessRequirement(
  access: WorkplaceAccessRequirement | undefined,
  scopeProfessionIds: string[],
  validSubjects: ReadonlySet<string>,
  options: WorkplaceValidationOptions,
  issues: WorkplaceValidationIssue[],
  workplaceId: string,
  facilityId?: string,
): void {
  if (!access || typeof access !== 'object') {
    issues.push(issue(WorkplaceValidationSeverity.Error, 'invalid-access-requirement', `Workplace '${workplaceId}' has a malformed access requirement.`, workplaceId, facilityId));
    return;
  }

  if (access.minCharacterLevel !== undefined && !(access.minCharacterLevel >= 1)) {
    issues.push(issue(WorkplaceValidationSeverity.Error, 'invalid-min-character-level', `Workplace '${workplaceId}' minCharacterLevel must be >= 1.`, workplaceId, facilityId));
  }
  if (access.minProfessionLevel !== undefined && !(access.minProfessionLevel >= 1)) {
    issues.push(issue(WorkplaceValidationSeverity.Error, 'invalid-min-profession-level', `Workplace '${workplaceId}' minProfessionLevel must be >= 1.`, workplaceId, facilityId));
  }

  const explicitProfessions = Array.isArray(access.professionIds) ? access.professionIds : undefined;
  if (explicitProfessions) {
    const seen = new Set<string>();
    for (const professionId of explicitProfessions) {
      if (seen.has(professionId)) {
        issues.push(issue(WorkplaceValidationSeverity.Error, 'duplicate-profession-reference', `Workplace '${workplaceId}' lists profession '${professionId}' more than once in an access rule.`, workplaceId, facilityId));
      }
      seen.add(professionId);
      if (options.knownProfessionIds && !options.knownProfessionIds.has(professionId)) {
        issues.push(issue(WorkplaceValidationSeverity.Error, 'unknown-profession-reference', `Workplace '${workplaceId}' access rule references unknown profession '${professionId}'.`, workplaceId, facilityId));
      }
    }
  }

  // A profession gate with no resolvable profession scope can never be satisfied.
  const hasProfessionGate = access.minProfessionLevel !== undefined ||
    (Array.isArray(access.requiredRankIds) && access.requiredRankIds.length > 0);
  const scope = explicitProfessions && explicitProfessions.length > 0 ? explicitProfessions : scopeProfessionIds;
  if (hasProfessionGate && scope.length === 0) {
    issues.push(issue(WorkplaceValidationSeverity.Warning, 'unresolvable-profession-gate', `Workplace '${workplaceId}' has a profession gate but no associated professions to evaluate it against.`, workplaceId, facilityId));
  }

  if (Array.isArray(access.requiredQuestIds) && options.knownQuestIds) {
    for (const questId of access.requiredQuestIds) {
      if (!options.knownQuestIds.has(questId)) {
        issues.push(issue(WorkplaceValidationSeverity.Error, 'unknown-quest-reference', `Workplace '${workplaceId}' access rule references unknown quest '${questId}'.`, workplaceId, facilityId));
      }
    }
  }

  if (Array.isArray(access.mastery)) {
    for (const req of access.mastery) {
      if (!validSubjects.has(req.subject)) {
        issues.push(issue(WorkplaceValidationSeverity.Error, 'unknown-subject', `Workplace '${workplaceId}' access rule references unknown subject '${req.subject}'.`, workplaceId, facilityId));
      }
      if (!(req.minLevel >= 1)) {
        issues.push(issue(WorkplaceValidationSeverity.Error, 'invalid-mastery-level', `Workplace '${workplaceId}' mastery requirement for '${req.subject}' must be >= 1.`, workplaceId, facilityId));
      }
    }
  }
}

/**
 * Cross-validates profession ↔ workplace associations. A profession referencing
 * an unregistered workplace is a warning (configuration may precede content); a
 * workplace referencing an unknown profession is an error; one-sided
 * associations are reported as warnings.
 */
export function validateWorkplaceProfessionAssociations(
  professions: readonly ProfessionDefinition[],
  workplaces: readonly WorkplaceDefinition[],
): WorkplaceValidationReport {
  const issues: WorkplaceValidationIssue[] = [];
  const workplaceById = new Map(workplaces.map((w) => [w.id, w]));
  const professionById = new Map(professions.map((p) => [p.id, p]));

  for (const profession of professions) {
    for (const workplaceId of profession.workplaceIds ?? []) {
      const workplace = workplaceById.get(workplaceId);
      if (!workplace) {
        issues.push(issue(WorkplaceValidationSeverity.Warning, 'unknown-workplace', `Profession '${profession.id}' references workplace '${workplaceId}' that is not registered.`, workplaceId));
        continue;
      }
      if (!workplace.professionIds.includes(profession.id)) {
        issues.push(issue(WorkplaceValidationSeverity.Warning, 'asymmetric-association', `Workplace '${workplaceId}' does not list profession '${profession.id}', though the profession lists the workplace.`, workplaceId));
      }
    }
  }

  for (const workplace of workplaces) {
    for (const professionId of workplace.professionIds ?? []) {
      const profession = professionById.get(professionId);
      if (!profession) {
        issues.push(issue(WorkplaceValidationSeverity.Error, 'unknown-profession', `Workplace '${workplace.id}' associates unknown profession '${professionId}'.`, workplace.id));
        continue;
      }
      if (!profession.workplaceIds.includes(workplace.id)) {
        issues.push(issue(WorkplaceValidationSeverity.Warning, 'asymmetric-association', `Profession '${professionId}' does not list workplace '${workplace.id}', though the workplace associates it.`, workplace.id));
      }
    }
  }

  return { isValid: !issues.some((i) => i.severity === WorkplaceValidationSeverity.Error), issues };
}
