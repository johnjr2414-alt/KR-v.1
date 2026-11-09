import {
  WorkplaceAccessFailureReason,
  type FacilityAccessResult,
  type ResolvedFacility,
  type WorkplaceAccessCheck,
  type WorkplaceAccessContext,
  type WorkplaceAccessRequirement,
  type WorkplaceDefinition,
  type WorkplaceFacilityDefinition,
  type WorkplaceProfessionState,
  type WorkplaceRequirementStatus,
} from './WorkplaceTypes';
import { WORKPLACE_DEFINITIONS } from './WorkplaceRegistry';

export interface WorkplaceServiceOptions {
  /** Workplace catalogue. Defaults to the shared {@link WORKPLACE_DEFINITIONS}. */
  workplaces?: readonly WorkplaceDefinition[];
}

interface EvaluatedRequirement {
  reasons: WorkplaceAccessFailureReason[];
  requirements: WorkplaceRequirementStatus[];
}

/**
 * Headless workplace service (Phase 27.2).
 *
 * Resolves workplaces (and their world locations), exposes profession
 * associations, and validates workplace entry and per-facility access against a
 * caller-supplied {@link WorkplaceAccessContext}. All rules are data-driven off
 * the injected workplace catalogue, and a player may enter a workplace without
 * having access to every facility it contains.
 *
 * The service is non-mutating and never throws: unknown workplaces/facilities
 * produce failed checks with explanatory messages.
 */
export class WorkplaceService {
  private readonly workplaces: Map<string, WorkplaceDefinition>;

  constructor(options: WorkplaceServiceOptions = {}) {
    const definitions = options.workplaces ?? WORKPLACE_DEFINITIONS;
    this.workplaces = new Map(definitions.map((workplace) => [workplace.id, workplace]));
  }

  // ── Catalogue access ──────────────────────────────────────────────────────

  /** Returns a workplace definition, or `undefined` when unknown. */
  getWorkplace(workplaceId: string): WorkplaceDefinition | undefined {
    return this.workplaces.get(workplaceId);
  }

  /** Returns every registered workplace definition. */
  getWorkplaces(): WorkplaceDefinition[] {
    return [...this.workplaces.values()];
  }

  /** Returns the facilities of a workplace (empty when unknown). */
  getFacilities(workplaceId: string): WorkplaceFacilityDefinition[] {
    return [...(this.workplaces.get(workplaceId)?.facilities ?? [])];
  }

  /** Returns a single facility of a workplace, or `undefined` when unknown. */
  getFacility(workplaceId: string, facilityId: string): WorkplaceFacilityDefinition | undefined {
    return this.workplaces.get(workplaceId)?.facilities.find((facility) => facility.id === facilityId);
  }

  /** Returns every facility across every workplace, tagged with its workplace id. */
  getAllFacilities(): Array<{ workplaceId: string; facility: WorkplaceFacilityDefinition }> {
    const all: Array<{ workplaceId: string; facility: WorkplaceFacilityDefinition }> = [];
    for (const workplace of this.workplaces.values()) {
      for (const facility of workplace.facilities) {
        all.push({ workplaceId: workplace.id, facility });
      }
    }
    return all;
  }

  // ── Profession associations ───────────────────────────────────────────────

  /** Returns the professions associated with a workplace (empty when unknown). */
  getProfessionsForWorkplace(workplaceId: string): string[] {
    return [...(this.workplaces.get(workplaceId)?.professionIds ?? [])];
  }

  /** Returns the workplaces that associate `professionId` with themselves. */
  getWorkplacesForProfession(professionId: string): WorkplaceDefinition[] {
    return [...this.workplaces.values()].filter((workplace) =>
      workplace.professionIds.includes(professionId),
    );
  }

  // ── World resolution ──────────────────────────────────────────────────────

  /**
   * Resolves the workplace physically located at a world location. When
   * `landmarkId` is provided the landmark must match; when omitted, the first
   * workplace on the map is returned.
   */
  resolveWorkplaceAtLocation(mapId: string, landmarkId?: string): WorkplaceDefinition | undefined {
    const matches = [...this.workplaces.values()].filter(
      (workplace) => workplace.worldLocation?.mapId === mapId,
    );
    if (landmarkId === undefined) return matches[0];
    return matches.find((workplace) => workplace.worldLocation?.landmarkId === landmarkId);
  }

  /** Returns every workplace associated with a physical world location. */
  getIntegratedWorkplaces(): WorkplaceDefinition[] {
    return [...this.workplaces.values()].filter((workplace) => workplace.worldLocation !== undefined);
  }

  // ── Access validation ─────────────────────────────────────────────────────

  /** Non-mutating workplace entry check. */
  checkWorkplaceAccess(workplaceId: string, ctx: WorkplaceAccessContext): WorkplaceAccessCheck {
    const workplace = this.workplaces.get(workplaceId);
    if (!workplace) {
      return {
        canAccess: false,
        reasons: [WorkplaceAccessFailureReason.UnknownWorkplace],
        requirements: [],
        message: `Unknown workplace '${workplaceId}'.`,
      };
    }

    const { reasons, requirements } = this.evaluate(
      workplace.entryRequirements,
      ctx,
      workplace.professionIds,
    );

    return this.buildCheck(reasons, requirements, {
      ok: `You may enter the ${workplace.name}.`,
      denied: `You cannot enter the ${workplace.name} yet.`,
    });
  }

  /** Non-mutating facility access check. */
  checkFacilityAccess(
    workplaceId: string,
    facilityId: string,
    ctx: WorkplaceAccessContext,
  ): FacilityAccessResult {
    const workplace = this.workplaces.get(workplaceId);
    if (!workplace) {
      return {
        workplaceId,
        facilityId,
        canAccess: false,
        reasons: [WorkplaceAccessFailureReason.UnknownWorkplace],
        requirements: [],
        message: `Unknown workplace '${workplaceId}'.`,
      };
    }

    const facility = workplace.facilities.find((f) => f.id === facilityId);
    if (!facility) {
      return {
        workplaceId,
        facilityId,
        canAccess: false,
        reasons: [WorkplaceAccessFailureReason.UnknownFacility],
        requirements: [],
        message: `Unknown facility '${facilityId}' in ${workplace.name}.`,
      };
    }

    const { reasons, requirements } = this.evaluate(
      facility.access,
      ctx,
      workplace.professionIds,
    );

    const check = this.buildCheck(reasons, requirements, {
      ok: `You may use the ${facility.name}.`,
      denied: `You cannot use the ${facility.name} yet.`,
    });

    return { workplaceId, facilityId, ...check };
  }

  /**
   * Resolves every facility of a workplace together with its current
   * accessibility. Unknown workplaces yield an empty list.
   */
  resolveFacilities(workplaceId: string, ctx: WorkplaceAccessContext): ResolvedFacility[] {
    const workplace = this.workplaces.get(workplaceId);
    if (!workplace) return [];

    return workplace.facilities.map((facility) => ({
      workplaceId,
      facility,
      accessible: this.checkFacilityAccess(workplaceId, facility.id, ctx).canAccess,
    }));
  }

  /** Convenience: only the facilities the player can currently access. */
  getAccessibleFacilities(
    workplaceId: string,
    ctx: WorkplaceAccessContext,
  ): WorkplaceFacilityDefinition[] {
    return this.resolveFacilities(workplaceId, ctx)
      .filter((entry) => entry.accessible)
      .map((entry) => entry.facility);
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private buildCheck(
    reasons: WorkplaceAccessFailureReason[],
    requirements: WorkplaceRequirementStatus[],
    messages: { ok: string; denied: string },
  ): WorkplaceAccessCheck {
    const canAccess = reasons.length === 0;
    const firstFailure = requirements.find((requirement) => !requirement.satisfied);
    return {
      canAccess,
      reasons,
      requirements,
      message: canAccess ? messages.ok : firstFailure?.detail ?? messages.denied,
    };
  }

  /**
   * Evaluates one access requirement against the supplied context. Profession
   * gates are evaluated against the explicit `professionIds` when given,
   * otherwise against the owning workplace's associated professions
   * (`scopeProfessionIds`).
   */
  private evaluate(
    requirement: WorkplaceAccessRequirement,
    ctx: WorkplaceAccessContext,
    scopeProfessionIds: string[],
  ): EvaluatedRequirement {
    const reasons: WorkplaceAccessFailureReason[] = [];
    const requirements: WorkplaceRequirementStatus[] = [];

    if (requirement.minCharacterLevel !== undefined) {
      const satisfied = ctx.characterLevel >= requirement.minCharacterLevel;
      requirements.push({
        label: `Character level ${requirement.minCharacterLevel}`,
        satisfied,
        detail: satisfied
          ? undefined
          : `Requires character level ${requirement.minCharacterLevel} (you are ${ctx.characterLevel}).`,
      });
      if (!satisfied) reasons.push(WorkplaceAccessFailureReason.CharacterLevelTooLow);
    }

    const explicitProfessions =
      Array.isArray(requirement.professionIds) && requirement.professionIds.length > 0
        ? requirement.professionIds
        : undefined;
    const needsLevel = requirement.minProfessionLevel !== undefined;
    const needsRank = Array.isArray(requirement.requiredRankIds) && requirement.requiredRankIds.length > 0;

    if (explicitProfessions || needsLevel || needsRank) {
      const candidates = explicitProfessions ?? scopeProfessionIds;
      const enrolledStates: WorkplaceProfessionState[] = [];
      if (ctx.getProfessionState) {
        for (const professionId of candidates) {
          const state = ctx.getProfessionState(professionId);
          if (state) enrolledStates.push(state);
        }
      }

      if (explicitProfessions) {
        const satisfied = enrolledStates.length > 0;
        requirements.push({
          label: `Enrolled as ${candidates.join(' or ')}`,
          satisfied,
          detail: satisfied
            ? undefined
            : `Requires enrollment in one of: ${candidates.join(', ')}.`,
        });
        if (!satisfied) reasons.push(WorkplaceAccessFailureReason.NotEnrolled);
      }

      if (needsLevel) {
        const min = requirement.minProfessionLevel as number;
        const satisfied = enrolledStates.some((state) => state.level >= min);
        requirements.push({
          label: `Profession level ${min}`,
          satisfied,
          detail: satisfied
            ? undefined
            : `Requires profession level ${min} in one of: ${candidates.join(', ')}.`,
        });
        if (!satisfied) reasons.push(WorkplaceAccessFailureReason.ProfessionLevelTooLow);
      }

      if (needsRank) {
        const ranks = requirement.requiredRankIds as string[];
        const satisfied = enrolledStates.some((state) => ranks.includes(state.rankId));
        requirements.push({
          label: `Rank ${ranks.join(' / ')}`,
          satisfied,
          detail: satisfied
            ? undefined
            : `Requires rank ${ranks.join(' or ')} in one of: ${candidates.join(', ')}.`,
        });
        if (!satisfied) reasons.push(WorkplaceAccessFailureReason.RankTooLow);
      }
    }

    if (Array.isArray(requirement.requiredQuestIds)) {
      for (const questId of requirement.requiredQuestIds) {
        const satisfied = ctx.isQuestCompleted ? ctx.isQuestCompleted(questId) : false;
        requirements.push({
          label: `Quest: ${questId}`,
          satisfied,
          detail: satisfied ? undefined : `Requires quest '${questId}' to be completed.`,
        });
        if (!satisfied) reasons.push(WorkplaceAccessFailureReason.QuestIncomplete);
      }
    }

    if (Array.isArray(requirement.mastery)) {
      for (const req of requirement.mastery) {
        const current = ctx.getMasteryLevel ? ctx.getMasteryLevel(req.subject) : 0;
        const satisfied = current >= req.minLevel;
        requirements.push({
          label: `${req.subject} mastery ${req.minLevel}`,
          satisfied,
          detail: satisfied
            ? undefined
            : `Requires ${req.subject} mastery ${req.minLevel} (you have ${current}).`,
        });
        if (!satisfied) reasons.push(WorkplaceAccessFailureReason.MasteryTooLow);
      }
    }

    return { reasons, requirements };
  }
}

/** Shared default workplace service instance. */
export const workplaceService = new WorkplaceService();
