import { describe, it, expect } from 'vitest';
import { CareerService } from '../../src/professions/CareerService';
import { WorkplaceService } from '../../src/professions/WorkplaceService';
import { WorkplaceIds } from '../../src/professions/WorkplaceRegistry';
import { AssignmentService } from '../../src/professions/AssignmentService';
import { ProfessionProgressionService } from '../../src/professions/ProfessionProgressionService';
import {
  buildProfessionCatalogueView,
  buildCareerProfileView,
  buildWorkplaceView,
  buildAssignmentView,
  type CareerViewDeps,
} from '../../src/professions/CareerViewModels';
import type { EnrollmentContext } from '../../src/professions/ProfessionTypes';
import type { AssignmentContext } from '../../src/professions/AssignmentTypes';
import type { WorkplaceAccessContext } from '../../src/professions/WorkplaceTypes';
import { NPC_REGISTRY, getNPCsForMap } from '../../src/quests/NPCRegistry';
import { NPCType } from '../../src/quests/NPCTypes';
import {
  QUEST_REGISTRY,
  getQuestDefinition,
  getQuestsByCategory,
  getQuestsForNpc,
} from '../../src/quests/QuestRegistry';
import { QuestCategory } from '../../src/quests/QuestTypes';
import { ASSIGNMENT_REGISTRY } from '../../src/professions/AssignmentRegistry';
import { WORKPLACE_REGISTRY } from '../../src/professions/WorkplaceRegistry';
import { PlayerSessionManager } from '../../src/player/PlayerSessionManager';
import { InMemoryStorageService } from '../../src/storage/IndexedDBStorageService';
import { InventoryManager } from '../../src/inventory/InventoryManager';
import { MasteryManager } from '../../src/mastery/MasteryManager';
import { QuestManager } from '../../src/quests/QuestManager';
import { CurrencyService } from '../../src/economy/CurrencyService';
import { createInitialMasteryMap } from '../../src/mastery/MasteryData';
import { SubjectId } from '../../src/core/types/education';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** A context that can enroll in any starter profession. */
function enrollContext(overrides: Partial<EnrollmentContext> = {}): EnrollmentContext {
  return {
    characterLevel: 10,
    getMasteryLevel: () => 5,
    gold: 10_000,
    isQuestCompleted: () => true,
    ...overrides,
  };
}

/** A permissive assignment context (enrolled anywhere, at a high level). */
function assignmentContext(overrides: Partial<AssignmentContext> = {}): AssignmentContext {
  return {
    getProfessionState: () => ({ level: 10, rankId: 'junior-doctor' }),
    isQuestCompleted: () => true,
    ...overrides,
  };
}

/** A workplace access context granting entry and facility access. */
function workplaceContext(overrides: Partial<WorkplaceAccessContext> = {}): WorkplaceAccessContext {
  return {
    characterLevel: 10,
    getProfessionState: () => ({ level: 10, rankId: 'junior-doctor' }),
    getMasteryLevel: () => 5,
    isQuestCompleted: () => true,
    ...overrides,
  };
}

/** Builds a self-contained set of headless career services. */
function makeDeps(): CareerViewDeps & {
  careers: CareerService;
  assignments: AssignmentService;
} {
  const careers = new CareerService();
  const workplaces = new WorkplaceService();
  const progression = new ProfessionProgressionService({ careers });
  // Mirror how the live session mirrors completions into the career profile.
  const assignments = new AssignmentService({
    onCompleted: (entry) => {
      careers.recordAssignmentCompletion(entry.professionId, entry.assignmentId, entry.completedAt);
    },
  });
  return { careers, workplaces, assignments, progression };
}

// ─── Career selection interface ───────────────────────────────────────────────

describe('Phase 27.6 — career selection view', () => {
  it('lists professions grouped by category with eligibility and requirements', () => {
    const deps = makeDeps();
    const view = buildProfessionCatalogueView(deps, enrollContext());

    expect(view.professionCount).toBeGreaterThanOrEqual(3);
    expect(view.enrolledCount).toBe(0);

    const doctor = view.categories
      .flatMap((c) => c.professions)
      .find((p) => p.id === 'doctor');
    expect(doctor).toBeDefined();
    expect(doctor!.name).toBe('Doctor');
    expect(doctor!.enrolled).toBe(false);
    expect(doctor!.canEnroll).toBe(true);
    expect(doctor!.workplaceIds).toContain('hospital');
    expect(doctor!.workplaceNames).toContain('Hospital');
    expect(doctor!.rankNames.length).toBeGreaterThan(0);
    expect(doctor!.requirements.length).toBeGreaterThan(0);
  });

  it('reports invalid enrollment requirements instead of silently allowing enrollment', () => {
    const deps = makeDeps();
    const view = buildProfessionCatalogueView(
      deps,
      enrollContext({ characterLevel: 1, gold: 0, getMasteryLevel: () => 0 }),
    );

    const doctor = view.categories
      .flatMap((c) => c.professions)
      .find((p) => p.id === 'doctor')!;
    expect(doctor.canEnroll).toBe(false);
    expect(doctor.enrollmentMessage.length).toBeGreaterThan(0);
    expect(doctor.requirements.some((r) => !r.satisfied)).toBe(true);
  });

  it('reflects enrollment state in enrolledCount and per-profession flags', () => {
    const deps = makeDeps();
    expect(deps.careers.enroll('doctor', enrollContext()).success).toBe(true);

    const view = buildProfessionCatalogueView(deps, enrollContext());
    expect(view.enrolledCount).toBe(1);
    const doctor = view.categories
      .flatMap((c) => c.professions)
      .find((p) => p.id === 'doctor')!;
    expect(doctor.enrolled).toBe(true);
  });
});

// ─── Career profile interface ─────────────────────────────────────────────────

describe('Phase 27.6 — career profile view', () => {
  it('is empty before any enrollment', () => {
    const deps = makeDeps();
    const view = buildCareerProfileView(deps);
    expect(view.professions).toHaveLength(0);
    expect(view.totalCompletedAssignments).toBe(0);
    expect(view.totalReputation).toBe(0);
  });

  it('displays level, EXP progress, rank, and reputation for an enrolled profession', () => {
    const deps = makeDeps();
    deps.careers.enroll('doctor', enrollContext());
    deps.progression.awardProfessionExp('doctor', 40);
    deps.progression.awardReputation('doctor', 3);

    const view = buildCareerProfileView(deps);
    const doctor = view.professions.find((p) => p.professionId === 'doctor')!;
    expect(doctor.name).toBe('Doctor');
    expect(doctor.level).toBeGreaterThanOrEqual(1);
    expect(doctor.rankName.length).toBeGreaterThan(0);
    expect(doctor.reputation).toBe(3);
    expect(doctor.requiredExp).toBeGreaterThan(0);
    expect(doctor.progressRatio).toBeGreaterThanOrEqual(0);
  });

  it('shows active assignments and completed-assignment history', () => {
    const deps = makeDeps();
    deps.careers.enroll('doctor', enrollContext());
    const ctx = assignmentContext();

    expect(deps.assignments.acceptAssignment('doctor-patient-intake', ctx).success).toBe(true);

    let view = buildCareerProfileView(deps);
    let doctor = view.professions.find((p) => p.professionId === 'doctor')!;
    expect(doctor.activeAssignments.some((a) => a.assignmentId === 'doctor-patient-intake')).toBe(true);

    // Complete it → it should move from active to history.
    const def = deps.assignments.getAssignment('doctor-patient-intake')!;
    for (const stage of def.stages) {
      for (const objective of stage.objectives) {
        deps.assignments.recordObjectiveProgress('doctor-patient-intake', objective.id, objective.required);
      }
    }
    expect(deps.assignments.completeAssignment('doctor-patient-intake').success).toBe(true);

    view = buildCareerProfileView(deps);
    doctor = view.professions.find((p) => p.professionId === 'doctor')!;
    expect(doctor.activeAssignments).toHaveLength(0);
    expect(doctor.history.some((h) => h.assignmentId === 'doctor-patient-intake')).toBe(true);
    expect(view.totalCompletedAssignments).toBe(1);
  });
});

// ─── Workplace interface ──────────────────────────────────────────────────────

describe('Phase 27.6 — workplace view', () => {
  it('returns undefined for an unknown workplace', () => {
    const deps = makeDeps();
    expect(buildWorkplaceView(deps, 'no-such-workplace', workplaceContext(), assignmentContext())).toBeUndefined();
  });

  it('exposes professions, facilities, staff, and interaction points', () => {
    const deps = makeDeps();
    const view = buildWorkplaceView(
      deps,
      WorkplaceIds.Hospital,
      workplaceContext(),
      assignmentContext(),
    )!;

    expect(view.name).toBe('Hospital');
    expect(view.npcIds).toContain('doctor-quinn');
    expect(view.professions.some((p) => p.id === 'doctor')).toBe(true);
    expect(view.facilities.length).toBeGreaterThan(0);
    expect(view.interactionPoints.length).toBeGreaterThan(0);
  });

  it('reports facility access per the access context', () => {
    const deps = makeDeps();
    // Deny everything the hospital gates behind a profession.
    const denied = buildWorkplaceView(
      deps,
      WorkplaceIds.Hospital,
      workplaceContext({ characterLevel: 1, getProfessionState: () => undefined }),
      assignmentContext(),
    )!;
    const lockedFacility = denied.facilities.find((f) => f.id === 'examination-room')!;
    expect(lockedFacility.accessible).toBe(false);

    const granted = buildWorkplaceView(
      deps,
      WorkplaceIds.Hospital,
      workplaceContext(),
      assignmentContext(),
    )!;
    const openFacility = granted.facilities.find((f) => f.id === 'examination-room')!;
    expect(openFacility.accessible).toBe(true);
  });

  it('offers the professional assignments associated with the workplace professions', () => {
    const deps = makeDeps();
    const view = buildWorkplaceView(
      deps,
      WorkplaceIds.Hospital,
      workplaceContext(),
      assignmentContext(),
    )!;
    expect(view.availableAssignments.some((a) => a.assignmentId === 'doctor-patient-intake')).toBe(true);
    // Responsibilities surface as workplace activities.
    expect(view.activities.length).toBeGreaterThan(0);
  });
});

// ─── Assignment interface ─────────────────────────────────────────────────────

describe('Phase 27.6 — assignment view', () => {
  it('returns undefined for an unknown assignment', () => {
    const deps = makeDeps();
    expect(buildAssignmentView(deps, 'no-such-assignment', assignmentContext())).toBeUndefined();
  });

  it('reports availability, requirements, stages, objectives, and rewards', () => {
    const deps = makeDeps();
    const view = buildAssignmentView(deps, 'doctor-patient-intake', assignmentContext())!;

    expect(view.title).toBe('Patient Intake Interview');
    expect(view.professionName).toBe('Doctor');
    expect(view.status).toBe('available');
    expect(view.available).toBe(true);
    expect(view.stages.length).toBeGreaterThan(0);
    expect(view.stages[0].objectives.length).toBeGreaterThan(0);
    expect(view.rewards.professionExp).toBe(40);
    expect(view.questionTopics.length).toBeGreaterThan(0);
  });

  it('transitions to active, then completed, as the assignment progresses', () => {
    const deps = makeDeps();
    const ctx = assignmentContext();
    expect(deps.assignments.acceptAssignment('doctor-patient-intake', ctx).success).toBe(true);

    let view = buildAssignmentView(deps, 'doctor-patient-intake', ctx)!;
    expect(view.status).toBe('active');
    expect(view.active).toBe(true);
    expect(view.stages[0].active).toBe(true);

    const def = deps.assignments.getAssignment('doctor-patient-intake')!;
    for (const stage of def.stages) {
      for (const objective of stage.objectives) {
        deps.assignments.recordObjectiveProgress('doctor-patient-intake', objective.id, objective.required);
      }
    }
    expect(deps.assignments.completeAssignment('doctor-patient-intake').success).toBe(true);

    view = buildAssignmentView(deps, 'doctor-patient-intake', ctx)!;
    expect(view.status).toBe('completed');
    expect(view.completed).toBe(true);
  });
});

// ─── Quest integration ────────────────────────────────────────────────────────

describe('Phase 27.6 — career quest integration', () => {
  it('exposes a distinct Career quest category', () => {
    expect(QuestCategory.Career).toBe('career');
  });

  it('registers the career orientation quest with the career category', () => {
    const quest = getQuestDefinition('quest-career-orientation');
    expect(quest).toBeDefined();
    expect(quest!.category).toBe(QuestCategory.Career);
    expect(quest!.giverNpcId).toBe('career-advisor-marisol');
    expect(quest!.objectives.length).toBeGreaterThan(0);
  });

  it('separates career quests from general quests and from assignments', () => {
    const career = getQuestsByCategory(QuestCategory.Career);
    expect(career.map((q) => q.id)).toContain('quest-career-orientation');
    expect(career.every((q) => q.category === QuestCategory.Career)).toBe(true);

    // A career quest must not be a professional assignment, and vice versa.
    expect(ASSIGNMENT_REGISTRY['quest-career-orientation']).toBeUndefined();
    expect(QUEST_REGISTRY['doctor-patient-intake']).toBeUndefined();

    // General quests keep their own categories.
    const side = getQuestsByCategory(QuestCategory.Side);
    expect(side.some((q) => q.id === 'quest-career-orientation')).toBe(false);
  });

  it('surfaces the career quest through the NPC quest pipeline', () => {
    const forNpc = getQuestsForNpc('career-advisor-marisol');
    expect(forNpc.some((q) => q.id === 'quest-career-orientation')).toBe(true);
  });
});

// ─── NPC ↔ workplace integration ──────────────────────────────────────────────

describe('Phase 27.6 — career NPC integration', () => {
  it('registers the career advisor as a career NPC tied to a workplace', () => {
    const marisol = NPC_REGISTRY['career-advisor-marisol'];
    expect(marisol).toBeDefined();
    expect(marisol.type).toBe(NPCType.CareerAdvisor);
    expect(marisol.workplaceId).toBe('career-center');
    expect(marisol.offeredQuestIds).toContain('quest-career-orientation');
  });

  it('registers workplace-staff NPCs that link back to their workplace', () => {
    const lena = NPC_REGISTRY['academy-instructor-lena'];
    const quinn = NPC_REGISTRY['doctor-quinn'];
    expect(lena.workplaceId).toBe('academy');
    expect(quinn.workplaceId).toBe('hospital');
  });

  it('keeps the NPC ↔ workplace link bidirectional', () => {
    expect(WORKPLACE_REGISTRY[WorkplaceIds.CareerCenter].npcIds).toContain('career-advisor-marisol');
    expect(WORKPLACE_REGISTRY[WorkplaceIds.Hospital].npcIds).toContain('doctor-quinn');
    expect(WORKPLACE_REGISTRY[WorkplaceIds.Academy].npcIds).toContain('academy-instructor-lena');
  });

  it('places the career NPCs in the beginners village', () => {
    const ids = getNPCsForMap('beginners-village').map((n) => n.id);
    expect(ids).toContain('career-advisor-marisol');
    expect(ids).toContain('academy-instructor-lena');
    expect(ids).toContain('doctor-quinn');
  });
});

// ─── Persistence & session view models ────────────────────────────────────────

describe('Phase 27.6 — career state persistence & session view models', () => {
  it('serves career view models through the session and survives a save/load round trip', async () => {
    PlayerSessionManager.resetInstance();
    const storage = new InMemoryStorageService();
    const makeSession = (): PlayerSessionManager =>
      new PlayerSessionManager({
        storage,
        inventory: new InventoryManager(),
        mastery: new MasteryManager(),
        quests: new QuestManager(new InventoryManager()),
        currency: new CurrencyService(0),
        careers: new CareerService(),
      });

    const session = makeSession();
    await session.initializeSession('Tester');
    session.getPlayer().level = 10;
    const records = createInitialMasteryMap();
    records[SubjectId.Science] = { ...records[SubjectId.Science], level: 5 };
    session.mastery.loadRecords(records);
    session.currency.setGold(1000);

    // Session-level view models (career selection interface).
    expect(session.getCareerCatalogueView().professionCount).toBeGreaterThanOrEqual(3);

    expect(session.careers.enroll('doctor', session.buildEnrollmentContext()).success).toBe(true);
    expect(
      session.assignments.acceptAssignment('doctor-patient-intake', session.buildAssignmentContext())
        .success,
    ).toBe(true);

    await session.saveSession();

    PlayerSessionManager.resetInstance();
    const reloaded = makeSession();
    await reloaded.initializeSession('Tester');

    // Career profile interface survives the round trip.
    const profile = reloaded.getCareerProfileView();
    const doctor = profile.professions.find((p) => p.professionId === 'doctor')!;
    expect(doctor).toBeDefined();
    expect(
      doctor.activeAssignments.some((a) => a.assignmentId === 'doctor-patient-intake'),
    ).toBe(true);

    // Workplace and assignment interfaces resolve from the reloaded session.
    expect(reloaded.getWorkplaceView('hospital')?.name).toBe('Hospital');
    expect(reloaded.getAssignmentView('doctor-patient-intake')?.status).toBe('active');
  });
});
