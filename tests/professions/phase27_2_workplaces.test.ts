import { describe, it, expect } from 'vitest';
import { WorkplaceService, workplaceService } from '../../src/professions/WorkplaceService';
import {
  WORKPLACE_DEFINITIONS,
  WORKPLACE_REGISTRY,
  WorkplaceIds,
  getWorkplace,
  getWorkplaces,
  getWorkplacesForProfession,
  getProfessionsForWorkplace,
  getWorkplaceFacilities,
  getWorkplaceFacility,
  getIntegratedWorkplaces,
} from '../../src/professions/WorkplaceRegistry';
import {
  WorkplaceAccessFailureReason,
  type WorkplaceAccessContext,
  type WorkplaceDefinition,
  type WorkplaceProfessionState,
} from '../../src/professions/WorkplaceTypes';
import {
  WorkplaceValidationSeverity,
  validateWorkplaceCatalogue,
  validateWorkplaceProfessionAssociations,
} from '../../src/professions/WorkplaceValidator';
import { PROFESSION_DEFINITIONS } from '../../src/professions/ProfessionRegistry';
import { NPC_REGISTRY } from '../../src/quests/NPCRegistry';
import { QUEST_REGISTRY } from '../../src/quests/QuestRegistry';
import { BUILDING_REGISTRY } from '../../src/world/buildings';
import { BEGINNERS_VILLAGE, MAP_REGISTRY } from '../../src/world/maps';

/** Builds a workplace access context with sensible, fully-denied defaults. */
function makeContext(overrides: Partial<WorkplaceAccessContext> = {}): WorkplaceAccessContext {
  return {
    characterLevel: 1,
    getProfessionState: () => undefined,
    getMasteryLevel: () => 0,
    isQuestCompleted: () => false,
    ...overrides,
  };
}

/** Builds a context in which the supplied professions are enrolled. */
function withProfessions(
  states: Record<string, WorkplaceProfessionState>,
  overrides: Partial<WorkplaceAccessContext> = {},
): WorkplaceAccessContext {
  return makeContext({
    ...overrides,
    getProfessionState: (professionId) => states[professionId],
  });
}

const SERVICE = new WorkplaceService();

describe('Phase 27.2 — Workplace definitions', () => {
  it('registers the expected workplaces', () => {
    const ids = getWorkplaces().map((workplace) => workplace.id);
    expect(ids).toContain(WorkplaceIds.CareerCenter);
    expect(ids).toContain(WorkplaceIds.Hospital);
    expect(ids).toContain(WorkplaceIds.EngineeringCenter);
    expect(ids).toContain(WorkplaceIds.ArchitectureStudio);
    expect(ids).toContain(WorkplaceIds.Academy);
    expect(ids).toContain(WorkplaceIds.Courthouse);
    expect(WORKPLACE_REGISTRY[WorkplaceIds.Hospital]).toBeDefined();
  });

  it('gives every workplace a name, description, and at least one facility', () => {
    for (const workplace of WORKPLACE_DEFINITIONS) {
      expect(workplace.name.trim().length).toBeGreaterThan(0);
      expect(workplace.description.trim().length).toBeGreaterThan(0);
      expect(workplace.facilities.length).toBeGreaterThan(0);
      expect(workplace.provisional).toBe(true);
    }
  });

  it('defines unique facility ids within each workplace', () => {
    for (const workplace of WORKPLACE_DEFINITIONS) {
      const ids = workplace.facilities.map((facility) => facility.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('only references facilities that exist from interaction points', () => {
    for (const workplace of WORKPLACE_DEFINITIONS) {
      const facilityIds = new Set(workplace.facilities.map((f) => f.id));
      for (const point of workplace.interactionPoints) {
        if (point.facilityId) {
          expect(facilityIds.has(point.facilityId)).toBe(true);
        }
      }
    }
  });

  it('exposes facilities and single-facility lookups', () => {
    expect(getWorkplaceFacilities(WorkplaceIds.Hospital).map((f) => f.id)).toEqual([
      'reception',
      'examination-room',
      'laboratory',
      'medical-office',
    ]);
    expect(getWorkplaceFacility(WorkplaceIds.Hospital, 'laboratory')?.name).toBe('Laboratory');
    expect(getWorkplaceFacility(WorkplaceIds.Hospital, 'nope')).toBeUndefined();
    expect(getWorkplace('not-a-workplace')).toBeUndefined();
  });
});

describe('Phase 27.2 — Profession associations', () => {
  it('resolves workplaces for a profession', () => {
    expect(getWorkplacesForProfession('doctor').map((w) => w.id)).toContain(WorkplaceIds.Hospital);
    expect(getWorkplacesForProfession('architect').map((w) => w.id)).toEqual([
      WorkplaceIds.ArchitectureStudio,
    ]);
    expect(getWorkplacesForProfession('unknown-profession')).toEqual([]);
  });

  it('resolves professions for a workplace', () => {
    expect(getProfessionsForWorkplace(WorkplaceIds.Hospital)).toEqual(['doctor', 'nurse']);
    expect(getProfessionsForWorkplace(WorkplaceIds.ArchitectureStudio)).toEqual(['architect']);
    expect(getProfessionsForWorkplace('unknown-workplace')).toEqual([]);
  });

  it('supports multiple professions sharing one workplace', () => {
    expect(getProfessionsForWorkplace(WorkplaceIds.Hospital).length).toBeGreaterThan(1);
    expect(getProfessionsForWorkplace(WorkplaceIds.EngineeringCenter).length).toBeGreaterThan(1);
  });
});

describe('Phase 27.2 — Workspace entry requirements', () => {
  it('keeps ordinary workplaces open to everyone', () => {
    const check = SERVICE.checkWorkplaceAccess(WorkplaceIds.Hospital, makeContext());
    expect(check.canAccess).toBe(true);
    expect(check.reasons).toHaveLength(0);
  });

  it('blocks entry to a gated workplace until the requirement is met', () => {
    const denied = SERVICE.checkWorkplaceAccess(WorkplaceIds.Academy, makeContext({ characterLevel: 1 }));
    expect(denied.canAccess).toBe(false);
    expect(denied.reasons).toContain(WorkplaceAccessFailureReason.CharacterLevelTooLow);
    expect(denied.message).toContain('character level 5');

    const allowed = SERVICE.checkWorkplaceAccess(WorkplaceIds.Academy, makeContext({ characterLevel: 5 }));
    expect(allowed.canAccess).toBe(true);
  });

  it('reports unknown workplaces without throwing', () => {
    const check = SERVICE.checkWorkplaceAccess('ghost-workplace', makeContext());
    expect(check.canAccess).toBe(false);
    expect(check.reasons).toEqual([WorkplaceAccessFailureReason.UnknownWorkplace]);
  });
});

describe('Phase 27.2 — Facility access', () => {
  it('lets anyone use an open facility', () => {
    const check = SERVICE.checkFacilityAccess(WorkplaceIds.Hospital, 'reception', makeContext());
    expect(check.canAccess).toBe(true);
  });

  it('gates enrollment-restricted facilities', () => {
    const denied = SERVICE.checkFacilityAccess(WorkplaceIds.Hospital, 'examination-room', makeContext());
    expect(denied.canAccess).toBe(false);
    expect(denied.reasons).toContain(WorkplaceAccessFailureReason.NotEnrolled);

    const allowed = SERVICE.checkFacilityAccess(
      WorkplaceIds.Hospital,
      'examination-room',
      withProfessions({ doctor: { level: 1, rankId: 'medical-trainee' } }),
    );
    expect(allowed.canAccess).toBe(true);
  });

  it('lets a player enter a workplace without access to every facility', () => {
    const ctx = makeContext();
    expect(SERVICE.checkWorkplaceAccess(WorkplaceIds.Hospital, ctx).canAccess).toBe(true);
    expect(SERVICE.checkFacilityAccess(WorkplaceIds.Hospital, 'laboratory', ctx).canAccess).toBe(false);
  });

  it('reports unknown facilities', () => {
    const check = SERVICE.checkFacilityAccess(WorkplaceIds.Hospital, 'nope', makeContext());
    expect(check.canAccess).toBe(false);
    expect(check.reasons).toEqual([WorkplaceAccessFailureReason.UnknownFacility]);
    expect(check.workplaceId).toBe(WorkplaceIds.Hospital);
  });
});

describe('Phase 27.2 — Rank-based unlocking', () => {
  it('unlocks a rank-gated facility at the required rank', () => {
    const trainee = withProfessions({ doctor: { level: 1, rankId: 'medical-trainee' } });
    const denied = SERVICE.checkFacilityAccess(WorkplaceIds.Hospital, 'medical-office', trainee);
    expect(denied.canAccess).toBe(false);
    expect(denied.reasons).toContain(WorkplaceAccessFailureReason.RankTooLow);

    const practitioner = withProfessions({ doctor: { level: 6, rankId: 'general-practitioner' } });
    expect(SERVICE.checkFacilityAccess(WorkplaceIds.Hospital, 'medical-office', practitioner).canAccess).toBe(true);
  });

  it('unlocks a level-gated facility as profession level rises', () => {
    const junior = withProfessions({ 'electrical-engineer': { level: 5, rankId: 'junior-engineer' } });
    expect(SERVICE.checkFacilityAccess(WorkplaceIds.EngineeringCenter, 'project-office', junior).canAccess).toBe(false);

    const engineer = withProfessions({ 'electrical-engineer': { level: 6, rankId: 'engineer' } });
    expect(SERVICE.checkFacilityAccess(WorkplaceIds.EngineeringCenter, 'project-office', engineer).canAccess).toBe(true);
  });

  it('requires quest completion where configured', () => {
    const architect = { level: 6, rankId: 'architect' };
    const noQuest = withProfessions({ architect }, { isQuestCompleted: () => false });
    expect(SERVICE.checkFacilityAccess(WorkplaceIds.ArchitectureStudio, 'project-room', noQuest).canAccess).toBe(false);

    const withQuest = withProfessions({ architect }, { isQuestCompleted: (id) => id === 'quest-archivist-3-final-proof' });
    expect(SERVICE.checkFacilityAccess(WorkplaceIds.ArchitectureStudio, 'project-room', withQuest).canAccess).toBe(true);
  });
});

describe('Phase 27.2 — Facility resolution', () => {
  it('resolves all facilities with their accessibility', () => {
    const resolved = SERVICE.resolveFacilities(WorkplaceIds.Hospital, makeContext());
    expect(resolved).toHaveLength(4);
    expect(resolved.find((r) => r.facility.id === 'reception')?.accessible).toBe(true);
    expect(resolved.find((r) => r.facility.id === 'medical-office')?.accessible).toBe(false);
  });

  it('filters to only accessible facilities', () => {
    const accessible = SERVICE.getAccessibleFacilities(WorkplaceIds.Hospital, makeContext());
    expect(accessible.map((f) => f.id)).toEqual(['reception']);
  });

  it('returns no facilities for an unknown workplace', () => {
    expect(SERVICE.resolveFacilities('ghost-workplace', makeContext())).toEqual([]);
    expect(SERVICE.getAccessibleFacilities('ghost-workplace', makeContext())).toEqual([]);
  });

  it('lists every facility across every workplace', () => {
    const all = SERVICE.getAllFacilities();
    expect(all.length).toBe(WORKPLACE_DEFINITIONS.reduce((n, w) => n + w.facilities.length, 0));
    expect(all.every((entry) => entry.workplaceId.length > 0)).toBe(true);
  });
});

describe('Phase 27.2 — World integration', () => {
  it('adds the Career Center landmark to the Beginners Village', () => {
    const landmark = BEGINNERS_VILLAGE.landmarks.find((l) => l.id === 'career-center');
    expect(landmark).toBeDefined();
    expect(landmark?.name).toBe('Career Center');
  });

  it('adds an interactive Career Advisor NPC on the village map', () => {
    const npc = NPC_REGISTRY['career-advisor-marisol'];
    expect(npc).toBeDefined();
    expect(npc.mapId).toBe('beginners-village');
    expect(npc.dialogue.default.length).toBeGreaterThan(0);
    expect(npc.dialogue.default.join(' ')).toMatch(/profession/i);
  });

  it('resolves workplaces from world locations', () => {
    expect(SERVICE.resolveWorkplaceAtLocation('beginners-village', 'career-center')?.id).toBe(
      WorkplaceIds.CareerCenter,
    );
    expect(SERVICE.resolveWorkplaceAtLocation('beginners-village', 'library')?.id).toBe(
      WorkplaceIds.Academy,
    );
    expect(SERVICE.resolveWorkplaceAtLocation('beginners-village', 'fountain')).toBeUndefined();
  });

  it('integrates the Career Center and Academy with existing world content', () => {
    const integrated = getIntegratedWorkplaces().map((w) => w.id);
    expect(integrated).toContain(WorkplaceIds.CareerCenter);
    expect(integrated).toContain(WorkplaceIds.Academy);
  });
});

describe('Phase 27.2 — Invalid workplace references', () => {
  const knownProfessionIds = new Set(PROFESSION_DEFINITIONS.map((p) => p.id));

  it('flags a workplace associating an unknown profession', () => {
    const broken: WorkplaceDefinition = {
      id: 'broken',
      name: 'Broken',
      description: 'Broken workplace.',
      professionIds: ['not-a-profession'],
      facilities: [{ id: 'room', name: 'Room', description: 'A room.', access: {} }],
      npcIds: [],
      interactionPoints: [],
      entryRequirements: {},
      provisional: true,
    };
    const report = validateWorkplaceCatalogue([broken], { knownProfessionIds });
    expect(report.isValid).toBe(false);
    expect(report.issues.some((i) => i.code === 'unknown-profession')).toBe(true);
  });

  it('flags an interaction point referencing a missing facility', () => {
    const broken: WorkplaceDefinition = {
      id: 'broken-2',
      name: 'Broken Two',
      description: 'Broken workplace.',
      professionIds: [],
      facilities: [{ id: 'room', name: 'Room', description: 'A room.', access: {} }],
      npcIds: [],
      interactionPoints: [{ id: 'desk', label: 'Desk', facilityId: 'missing-room' }],
      entryRequirements: {},
      provisional: true,
    };
    const report = validateWorkplaceCatalogue([broken]);
    expect(report.issues.some((i) => i.code === 'unknown-facility-reference')).toBe(true);
  });

  it('flags duplicate workplace and facility ids', () => {
    const base: WorkplaceDefinition = {
      id: 'dupe',
      name: 'Dupe',
      description: 'Duplicated.',
      professionIds: [],
      facilities: [
        { id: 'room', name: 'Room', description: 'A room.', access: {} },
        { id: 'room', name: 'Room again', description: 'Same id.', access: {} },
      ],
      npcIds: [],
      interactionPoints: [],
      entryRequirements: {},
      provisional: true,
    };
    const report = validateWorkplaceCatalogue([base, { ...base }]);
    expect(report.issues.some((i) => i.code === 'duplicate-workplace-id')).toBe(true);
    expect(report.issues.some((i) => i.code === 'duplicate-facility-id')).toBe(true);
  });

  it('warns when a profession references an unregistered workplace', () => {
    const report = validateWorkplaceProfessionAssociations(PROFESSION_DEFINITIONS, []);
    const warning = report.issues.find((i) => i.code === 'unknown-workplace');
    expect(warning).toBeDefined();
    expect(warning?.severity).toBe(WorkplaceValidationSeverity.Warning);
    // Warnings alone do not invalidate the report.
    expect(report.isValid).toBe(true);
  });

  it('errors when a workplace associates an unknown profession', () => {
    const broken: WorkplaceDefinition = {
      id: WorkplaceIds.Hospital,
      name: 'Hospital',
      description: 'Hospital.',
      professionIds: ['ghost-doctor'],
      facilities: [],
      npcIds: [],
      interactionPoints: [],
      entryRequirements: {},
      provisional: true,
    };
    const report = validateWorkplaceProfessionAssociations(PROFESSION_DEFINITIONS, [broken]);
    expect(report.isValid).toBe(false);
    expect(report.issues.some((i) => i.code === 'unknown-profession')).toBe(true);
  });
});

describe('Phase 27.2 — Catalogue validity', () => {
  it('validates the shipped workplace catalogue with no issues', () => {
    const knownLandmarkIds = new Set(
      Object.values(MAP_REGISTRY).flatMap((map) => map.landmarks.map((l) => l.id)),
    );
    const report = validateWorkplaceCatalogue(WORKPLACE_DEFINITIONS, {
      knownProfessionIds: new Set(PROFESSION_DEFINITIONS.map((p) => p.id)),
      knownNpcIds: new Set(Object.keys(NPC_REGISTRY)),
      knownMapIds: new Set(Object.keys(MAP_REGISTRY)),
      knownLandmarkIds,
      knownBuildingIds: new Set(Object.keys(BUILDING_REGISTRY)),
      knownQuestIds: new Set(Object.keys(QUEST_REGISTRY)),
    });
    expect(report.issues).toEqual([]);
    expect(report.isValid).toBe(true);
  });

  it('keeps profession/workplace associations symmetric', () => {
    const report = validateWorkplaceProfessionAssociations(PROFESSION_DEFINITIONS, WORKPLACE_DEFINITIONS);
    expect(report.issues).toEqual([]);
    expect(report.isValid).toBe(true);
  });

  it('exposes a shared default workplace service', () => {
    expect(workplaceService).toBeInstanceOf(WorkplaceService);
  });
});
