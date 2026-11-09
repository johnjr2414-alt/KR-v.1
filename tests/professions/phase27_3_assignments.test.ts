import { describe, it, expect } from 'vitest';
import {
  AssignmentService,
  sanitizeAssignmentSnapshot,
} from '../../src/professions/AssignmentService';
import {
  ASSIGNMENT_DEFINITIONS,
  ASSIGNMENT_REGISTRY,
  getAssignment,
  getAssignmentsForProfession,
} from '../../src/professions/AssignmentRegistry';
import {
  AssignmentValidationSeverity,
  validateAssignmentCatalogue,
} from '../../src/professions/AssignmentValidator';
import {
  ASSIGNMENT_SNAPSHOT_VERSION,
  AssignmentFailureReason,
  AssignmentObjectiveType,
  AssignmentStatus,
  AssignmentTaskType,
  type AssignmentContext,
  type AssignmentDefinition,
} from '../../src/professions/AssignmentTypes';
import { CareerService } from '../../src/professions/CareerService';
import { PROFESSION_DEFINITIONS } from '../../src/professions/ProfessionRegistry';
import { SubjectId } from '../../src/core/types/education';
import { createInitialMasteryMap } from '../../src/mastery/MasteryData';
import { validateSaveData } from '../../src/storage/SaveDataValidator';
import { InMemoryStorageService } from '../../src/storage/IndexedDBStorageService';
import { PlayerSessionManager } from '../../src/player/PlayerSessionManager';
import { MasteryManager } from '../../src/mastery/MasteryManager';
import { QuestManager } from '../../src/quests/QuestManager';
import { CurrencyService } from '../../src/economy/CurrencyService';
import { InventoryManager } from '../../src/inventory/InventoryManager';

/** A permissive context: enrolled in every profession at a high level. */
function fullContext(overrides: Partial<AssignmentContext> = {}): AssignmentContext {
  return {
    getProfessionState: () => ({ level: 10, rankId: 'junior-doctor' }),
    isQuestCompleted: () => true,
    ...overrides,
  };
}

/** Deep-clones a starter assignment for mutation in validation tests. */
function makeAssignment(overrides: Partial<AssignmentDefinition> = {}): AssignmentDefinition {
  return {
    ...structuredClone(ASSIGNMENT_DEFINITIONS[0]),
    ...overrides,
  };
}

/** Drives an assignment from acceptance to full progress (all stages). */
function fullyProgress(service: AssignmentService, assignmentId: string): void {
  const def = service.getAssignment(assignmentId)!;
  for (const stage of def.stages) {
    for (const objective of stage.objectives) {
      service.recordObjectiveProgress(assignmentId, objective.id, objective.required);
    }
  }
}

const SEED_PROFESSIONS = ['doctor', 'electrical-engineer', 'architect'];

// ─── Registry & sample content ───────────────────────────────────────────────

describe('Phase 27.3 — assignment registry & sample content', () => {
  it('exposes unique assignment ids matching their registry keys', () => {
    for (const [key, def] of Object.entries(ASSIGNMENT_REGISTRY)) {
      expect(def.id).toBe(key);
    }
    expect(Object.keys(ASSIGNMENT_REGISTRY).length).toBe(ASSIGNMENT_DEFINITIONS.length);
  });

  it('resolves an assignment by id and returns undefined for unknown ids', () => {
    expect(getAssignment('doctor-patient-intake')?.professionId).toBe('doctor');
    expect(getAssignment('nope')).toBeUndefined();
  });

  it('provides at least two sample assignments per seed profession', () => {
    for (const professionId of SEED_PROFESSIONS) {
      const assignments = getAssignmentsForProfession(professionId);
      expect(assignments.length, `profession '${professionId}'`).toBeGreaterThanOrEqual(2);
    }
  });

  it('labels every sample assignment as provisional (draft) content', () => {
    for (const def of ASSIGNMENT_DEFINITIONS) {
      expect(def.provisional, `assignment '${def.id}'`).toBe(true);
    }
  });

  it('covers multiple task types', () => {
    const types = new Set(ASSIGNMENT_DEFINITIONS.map((a) => a.taskType));
    expect(types.size).toBeGreaterThanOrEqual(3);
    expect(types.has(AssignmentTaskType.KnowledgeAssessment)).toBe(true);
    expect(types.has(AssignmentTaskType.CaseAnalysis)).toBe(true);
    expect(types.has(AssignmentTaskType.PracticalSimulation)).toBe(true);
  });

  it('includes at least one non-question objective (framework is not question-only)', () => {
    const hasNonQuestion = ASSIGNMENT_DEFINITIONS.some((def) =>
      def.stages.some((stage) =>
        stage.objectives.some((o) => o.type === AssignmentObjectiveType.CompleteSteps),
      ),
    );
    expect(hasNonQuestion).toBe(true);
  });

  it('is a valid catalogue', () => {
    const report = validateAssignmentCatalogue(ASSIGNMENT_DEFINITIONS, {
      knownProfessionIds: new Set(PROFESSION_DEFINITIONS.map((p) => p.id)),
      knownAssignmentIds: new Set(ASSIGNMENT_DEFINITIONS.map((a) => a.id)),
      professions: PROFESSION_DEFINITIONS,
    });
    expect(report.issues.filter((i) => i.severity === AssignmentValidationSeverity.Error)).toEqual([]);
    expect(report.isValid).toBe(true);
  });
});

// ─── Validator ───────────────────────────────────────────────────────────────

describe('Phase 27.3 — assignment validator', () => {
  const options = {
    knownProfessionIds: new Set(PROFESSION_DEFINITIONS.map((p) => p.id)),
    knownAssignmentIds: new Set(ASSIGNMENT_DEFINITIONS.map((a) => a.id)),
    professions: PROFESSION_DEFINITIONS,
  };

  it('flags duplicate assignment ids', () => {
    const report = validateAssignmentCatalogue([
      makeAssignment({ id: 'dup' }),
      makeAssignment({ id: 'dup' }),
    ]);
    expect(report.isValid).toBe(false);
    expect(report.issues.some((i) => i.code === 'duplicate-assignment-id')).toBe(true);
  });

  it('flags unknown profession references', () => {
    const report = validateAssignmentCatalogue([makeAssignment({ professionId: 'astronaut' })], options);
    expect(report.issues.some((i) => i.code === 'unknown-profession')).toBe(true);
  });

  it('flags ranks that do not exist on the profession ladder', () => {
    const def = makeAssignment({ requirements: { minRankId: 'chief-wizard' } });
    const report = validateAssignmentCatalogue([def], options);
    expect(report.issues.some((i) => i.code === 'unknown-rank')).toBe(true);
  });

  it('flags self-referencing prerequisites', () => {
    const def = makeAssignment({ id: 'self-loop', requirements: { prerequisiteAssignmentIds: ['self-loop'] } });
    const report = validateAssignmentCatalogue([def], options);
    expect(report.issues.some((i) => i.code === 'self-prerequisite')).toBe(true);
  });

  it('flags unknown prerequisite assignments', () => {
    const def = makeAssignment({ requirements: { prerequisiteAssignmentIds: ['ghost'] } });
    const report = validateAssignmentCatalogue([def], options);
    expect(report.issues.some((i) => i.code === 'unknown-prerequisite-assignment')).toBe(true);
  });

  it('flags an assignment with no stages', () => {
    const report = validateAssignmentCatalogue([makeAssignment({ stages: [] })], options);
    expect(report.issues.some((i) => i.code === 'missing-stages')).toBe(true);
  });

  it('flags malformed objectives (bad type / bad required count)', () => {
    const def = makeAssignment({
      stages: [
        {
          id: 's1',
          name: 'Stage',
          objectives: [
            { id: 'o1', description: 'x', type: 'not-a-type' as AssignmentObjectiveType, required: 0 },
          ],
        },
      ],
    });
    const report = validateAssignmentCatalogue([def], options);
    expect(report.issues.some((i) => i.code === 'invalid-objective-type')).toBe(true);
    expect(report.issues.some((i) => i.code === 'invalid-objective-required')).toBe(true);
  });

  it('flags invalid reward values', () => {
    const def = makeAssignment({ rewards: { professionExp: -5, subjectMasteryExp: [{ subject: SubjectId.Science, amount: 0 }] } });
    const report = validateAssignmentCatalogue([def], options);
    expect(report.issues.some((i) => i.code === 'invalid-reward')).toBe(true);
    expect(report.issues.some((i) => i.code === 'invalid-reward-amount')).toBe(true);
  });
});

// ─── Availability & prerequisites ────────────────────────────────────────────

describe('Phase 27.3 — availability & prerequisites', () => {
  it('reports an unknown assignment as unavailable', () => {
    const service = new AssignmentService();
    const availability = service.checkAvailability('nope', fullContext());
    expect(availability.available).toBe(false);
    expect(availability.reasons).toContain(AssignmentFailureReason.UnknownAssignment);
  });

  it('requires enrollment in the owning profession', () => {
    const service = new AssignmentService();
    const availability = service.checkAvailability(
      'doctor-patient-intake',
      fullContext({ getProfessionState: () => undefined }),
    );
    expect(availability.available).toBe(false);
    expect(availability.reasons).toContain(AssignmentFailureReason.NotEnrolled);
  });

  it('blocks acceptance when the profession level is below the required rank', () => {
    const service = new AssignmentService();
    const availability = service.checkAvailability(
      'doctor-diagnose-ward',
      fullContext({ getProfessionState: () => ({ level: 1, rankId: 'medical-trainee' }) }),
    );
    expect(availability.available).toBe(false);
    expect(availability.reasons).toContain(AssignmentFailureReason.RankTooLow);
  });

  it('enforces an explicit minimum profession level', () => {
    const gated = makeAssignment({ id: 'gated', requirements: { minProfessionLevel: 5 } });
    const service = new AssignmentService({ assignments: [gated] });
    const availability = service.checkAvailability(
      'gated',
      fullContext({ getProfessionState: () => ({ level: 3, rankId: 'x' }) }),
    );
    expect(availability.available).toBe(false);
    expect(availability.reasons).toContain(AssignmentFailureReason.ProfessionLevelTooLow);
  });

  it('blocks an assignment whose prerequisite is not yet completed', () => {
    const service = new AssignmentService();
    const availability = service.checkAvailability('doctor-diagnose-ward', fullContext());
    expect(availability.available).toBe(false);
    expect(availability.reasons).toContain(AssignmentFailureReason.PrerequisiteAssignment);
  });

  it('blocks an assignment whose prerequisite quest is not completed', () => {
    const gated = makeAssignment({ id: 'quest-gated', requirements: { prerequisiteQuestIds: ['q1'] } });
    const service = new AssignmentService({ assignments: [gated] });
    const availability = service.checkAvailability(
      'quest-gated',
      fullContext({ isQuestCompleted: () => false }),
    );
    expect(availability.available).toBe(false);
    expect(availability.reasons).toContain(AssignmentFailureReason.PrerequisiteQuest);
  });

  it('reports an in-progress assignment as unavailable', () => {
    const service = new AssignmentService();
    expect(service.acceptAssignment('doctor-patient-intake', fullContext()).success).toBe(true);
    const availability = service.checkAvailability('doctor-patient-intake', fullContext());
    expect(availability.available).toBe(false);
    expect(availability.reasons).toContain(AssignmentFailureReason.AlreadyActive);
  });

  it('unlocks a dependent assignment once its prerequisite is completed', () => {
    const service = new AssignmentService();
    expect(service.acceptAssignment('doctor-patient-intake', fullContext()).success).toBe(true);
    fullyProgress(service, 'doctor-patient-intake');
    expect(service.completeAssignment('doctor-patient-intake').success).toBe(true);

    const availability = service.checkAvailability('doctor-diagnose-ward', fullContext());
    expect(availability.available).toBe(true);
  });
});

// ─── Acceptance ──────────────────────────────────────────────────────────────

describe('Phase 27.3 — acceptance', () => {
  it('creates an active state seeded from the first stage', () => {
    const service = new AssignmentService({ now: () => 1234 });
    const result = service.acceptAssignment('doctor-patient-intake', fullContext());
    expect(result.success).toBe(true);
    expect(result.state?.stageIndex).toBe(0);
    expect(result.state?.objectives).toEqual([{ objectiveId: 'history-questions', progress: 0 }]);
    expect(result.state?.acceptedAt).toBe(1234);
    expect(service.isActive('doctor-patient-intake')).toBe(true);
  });

  it('fails with the first blocking reason when unavailable', () => {
    const service = new AssignmentService();
    const result = service.acceptAssignment('nope', fullContext());
    expect(result.success).toBe(false);
    expect(result.reason).toBe(AssignmentFailureReason.UnknownAssignment);
  });
});

// ─── Objective progress & multi-stage ────────────────────────────────────────

describe('Phase 27.3 — objective progress & multi-stage', () => {
  it('caps progress at the objective requirement', () => {
    const service = new AssignmentService();
    service.acceptAssignment('doctor-patient-intake', fullContext());
    const result = service.recordObjectiveProgress('doctor-patient-intake', 'history-questions', 99);
    expect(result.progress).toBe(3);
    expect(result.stageComplete).toBe(true);
    expect(result.allStagesComplete).toBe(true);
  });

  it('advances through ordered stages', () => {
    const service = new AssignmentService();
    // Satisfy the prerequisite so the two-stage assignment can be accepted.
    service.acceptAssignment('doctor-patient-intake', fullContext());
    fullyProgress(service, 'doctor-patient-intake');
    service.completeAssignment('doctor-patient-intake');

    const accept = service.acceptAssignment('doctor-diagnose-ward', fullContext());
    expect(accept.success).toBe(true);

    const first = service.recordObjectiveProgress('doctor-diagnose-ward', 'symptom-questions', 2);
    expect(first.stageComplete).toBe(true);
    expect(first.allStagesComplete).toBe(false);
    // The engine has switched to the second stage's objectives.
    const state = service.getActiveAssignment('doctor-diagnose-ward');
    expect(state?.stageIndex).toBe(1);
    expect(state?.objectives).toEqual([{ objectiveId: 'lab-report', progress: 0 }]);

    const second = service.recordObjectiveProgress('doctor-diagnose-ward', 'lab-report', 1);
    expect(second.allStagesComplete).toBe(true);
  });

  it('completes a non-question (CompleteSteps) objective', () => {
    const service = new AssignmentService();
    // Satisfy the prerequisite first.
    service.acceptAssignment('architect-floor-plan', fullContext());
    fullyProgress(service, 'architect-floor-plan');
    service.completeAssignment('architect-floor-plan');

    expect(service.acceptAssignment('architect-design-challenge', fullContext()).success).toBe(true);
    service.recordObjectiveProgress('architect-design-challenge', 'dimension-questions', 2);
    const result = service.recordObjectiveProgress('architect-design-challenge', 'design-steps', 1);
    expect(result.allStagesComplete).toBe(true);
  });

  it('rejects progress for an unknown assignment, inactive assignment, or unknown objective', () => {
    const service = new AssignmentService();
    expect(service.recordObjectiveProgress('nope', 'x').reason).toBe(AssignmentFailureReason.UnknownAssignment);
    expect(service.recordObjectiveProgress('doctor-patient-intake', 'x').reason).toBe(AssignmentFailureReason.NotActive);

    service.acceptAssignment('doctor-patient-intake', fullContext());
    expect(service.recordObjectiveProgress('doctor-patient-intake', 'ghost').reason).toBe(
      AssignmentFailureReason.UnknownObjective,
    );
  });
});

// ─── Completion, failure, duplicate prevention ───────────────────────────────

describe('Phase 27.3 — completion, failure & duplicate prevention', () => {
  it('refuses completion while objectives remain', () => {
    const service = new AssignmentService();
    service.acceptAssignment('doctor-patient-intake', fullContext());
    const result = service.completeAssignment('doctor-patient-intake');
    expect(result.success).toBe(false);
    expect(result.reason).toBe(AssignmentFailureReason.ObjectivesIncomplete);
  });

  it('produces a completion result carrying the configured reward data', () => {
    const service = new AssignmentService({ now: () => 5000 });
    service.acceptAssignment('doctor-patient-intake', fullContext());
    fullyProgress(service, 'doctor-patient-intake');
    const result = service.completeAssignment('doctor-patient-intake');

    expect(result.success).toBe(true);
    expect(result.status).toBe(AssignmentStatus.Completed);
    expect(result.completionId).toBe('doctor-patient-intake');
    const def = service.getAssignment('doctor-patient-intake')!;
    expect(result.rewards).toEqual(def.rewards);

    const entry = service.getCompletion('doctor-patient-intake');
    expect(entry?.status).toBe(AssignmentStatus.Completed);
    expect(entry?.completedAt).toBe(5000);
    expect(entry?.rewardsClaimed).toBe(false);
  });

  it('prevents duplicate completion of a non-repeatable assignment', () => {
    const service = new AssignmentService();
    service.acceptAssignment('doctor-patient-intake', fullContext());
    fullyProgress(service, 'doctor-patient-intake');
    service.completeAssignment('doctor-patient-intake');

    const replay = service.completeAssignment('doctor-patient-intake');
    expect(replay.success).toBe(true);
    expect(replay.alreadyCompleted).toBe(true);
    expect(replay.completionId).toBe('doctor-patient-intake');
    expect(service.getHistory('doctor-patient-intake').length).toBe(1);
  });

  it('marks an availability check as already-completed after a non-repeatable completion', () => {
    const service = new AssignmentService();
    service.acceptAssignment('doctor-patient-intake', fullContext());
    fullyProgress(service, 'doctor-patient-intake');
    service.completeAssignment('doctor-patient-intake');

    const availability = service.checkAvailability('doctor-patient-intake', fullContext());
    expect(availability.available).toBe(false);
    expect(availability.reasons).toContain(AssignmentFailureReason.AlreadyCompleted);
  });

  it('records failures with no rewards and no duplicate-active state', () => {
    const service = new AssignmentService({ now: () => 88 });
    service.acceptAssignment('engineer-circuit-basics', fullContext());
    const result = service.failAssignment('engineer-circuit-basics');

    expect(result.success).toBe(true);
    expect(result.status).toBe(AssignmentStatus.Failed);
    expect(result.rewards).toBeUndefined();
    expect(service.isActive('engineer-circuit-basics')).toBe(false);

    const entry = service.getCompletion(result.completionId!);
    expect(entry?.status).toBe(AssignmentStatus.Failed);
    expect(entry?.rewardsClaimed).toBe(true);
  });

  it('cannot fail an assignment that is not active', () => {
    const service = new AssignmentService();
    expect(service.failAssignment('doctor-patient-intake').reason).toBe(AssignmentFailureReason.NotActive);
  });

  it('claims a completion\u2019s rewards idempotently', () => {
    const service = new AssignmentService();
    service.acceptAssignment('doctor-patient-intake', fullContext());
    fullyProgress(service, 'doctor-patient-intake');
    const completion = service.completeAssignment('doctor-patient-intake');

    const first = service.claimRewards(completion.completionId!);
    expect(first.success).toBe(true);
    expect(first.alreadyClaimed).toBe(false);

    const second = service.claimRewards(completion.completionId!);
    expect(second.success).toBe(true);
    expect(second.alreadyClaimed).toBe(true);
  });

  it('reports an unknown completion id as unclaimable', () => {
    const service = new AssignmentService();
    expect(service.claimRewards('ghost').success).toBe(false);
  });

  it('invokes the completion hook once per completion', () => {
    const completed: string[] = [];
    const service = new AssignmentService({ onCompleted: (entry) => completed.push(entry.assignmentId) });
    service.acceptAssignment('doctor-patient-intake', fullContext());
    fullyProgress(service, 'doctor-patient-intake');
    service.completeAssignment('doctor-patient-intake');
    service.completeAssignment('doctor-patient-intake'); // replay must not re-fire
    expect(completed).toEqual(['doctor-patient-intake']);
  });
});

// ─── Persistence ─────────────────────────────────────────────────────────────

describe('Phase 27.3 — persistence', () => {
  it('round-trips active and history state through a snapshot', () => {
    const service = new AssignmentService();
    service.acceptAssignment('doctor-patient-intake', fullContext());
    service.recordObjectiveProgress('doctor-patient-intake', 'history-questions', 1);
    service.acceptAssignment('engineer-circuit-basics', fullContext());
    fullyProgress(service, 'engineer-circuit-basics');
    service.completeAssignment('engineer-circuit-basics');

    const snapshot = service.snapshot();
    expect(snapshot.version).toBe(ASSIGNMENT_SNAPSHOT_VERSION);

    const restored = new AssignmentService();
    restored.loadSnapshot(snapshot);
    expect(restored.getActiveAssignment('doctor-patient-intake')?.objectives[0].progress).toBe(1);
    expect(restored.isCompleted('engineer-circuit-basics')).toBe(true);
    expect(restored.getHistory('engineer-circuit-basics').length).toBe(1);
  });

  it('drops snapshot entries that reference unknown assignments', () => {
    const service = new AssignmentService();
    service.loadSnapshot({
      version: ASSIGNMENT_SNAPSHOT_VERSION,
      active: [{ assignmentId: 'ghost', professionId: 'x', stageIndex: 0, objectives: [], acceptedAt: 0 }],
      history: [{ assignmentId: 'ghost', professionId: 'x', status: AssignmentStatus.Completed, completedAt: 0, completionId: 'g', rewardsClaimed: false }],
    });
    expect(service.getActiveAssignments()).toEqual([]);
    expect(service.getHistory()).toEqual([]);
  });

  it('sanitizes an unknown value into a valid snapshot, or undefined', () => {
    expect(sanitizeAssignmentSnapshot(null)).toBeUndefined();
    const snap = sanitizeAssignmentSnapshot({
      active: [{ assignmentId: 'a' }],
      history: [{ assignmentId: 'b', completionId: 'b' }, { nope: true }],
    });
    expect(snap?.version).toBe(ASSIGNMENT_SNAPSHOT_VERSION);
    expect(snap?.active.length).toBe(1);
    expect(snap?.history.length).toBe(1);
  });

  it('remains backward compatible when assignment data is absent', () => {
    const result = validateSaveData({ player: { name: 'Hero' } });
    expect(result.isValid).toBe(true);
    expect(result.data?.assignments).toBeUndefined();
  });

  it('sanitizes a present assignment payload through validateSaveData', () => {
    const result = validateSaveData({
      player: { name: 'Hero' },
      assignments: {
        version: 1,
        active: [{ assignmentId: 'doctor-patient-intake', professionId: 'doctor', stageIndex: 0, objectives: [], acceptedAt: 1 }],
        history: [],
      },
    });
    expect(result.isValid).toBe(true);
    expect(result.data?.assignments?.active[0].assignmentId).toBe('doctor-patient-intake');
  });

  it('persists assignments and mirrors completions into the career profile across a session round trip', async () => {
    PlayerSessionManager.resetInstance();
    const storage = new InMemoryStorageService();

    const session = new PlayerSessionManager({
      storage,
      inventory: new InventoryManager(),
      mastery: new MasteryManager(),
      quests: new QuestManager(new InventoryManager()),
      currency: new CurrencyService(0),
      careers: new CareerService(),
    });

    await session.initializeSession('Hero');

    session.getPlayer().level = 10;
    const records = createInitialMasteryMap();
    records[SubjectId.Science] = { ...records[SubjectId.Science], level: 5 };
    records[SubjectId.Physics] = { ...records[SubjectId.Physics], level: 5 };
    session.mastery.loadRecords(records);
    session.currency.setGold(1000);

    expect(session.careers.enroll('doctor', session.buildEnrollmentContext()).success).toBe(true);
    expect(session.careers.enroll('electrical-engineer', session.buildEnrollmentContext()).success).toBe(true);

    const ctx = session.buildAssignmentContext();
    expect(session.assignments.acceptAssignment('doctor-patient-intake', ctx).success).toBe(true);
    expect(session.assignments.acceptAssignment('engineer-circuit-basics', ctx).success).toBe(true);
    fullyProgress(session.assignments, 'doctor-patient-intake');
    expect(session.assignments.completeAssignment('doctor-patient-intake').success).toBe(true);

    // The completion hook recorded the assignment on the enrolled profession.
    const doctor = session.careers.getProfessionRecord('doctor');
    expect(doctor?.assignmentHistory.some((a) => a.assignmentId === 'doctor-patient-intake')).toBe(true);

    await session.saveSession();

    PlayerSessionManager.resetInstance();
    const reloaded = new PlayerSessionManager({
      storage,
      inventory: new InventoryManager(),
      mastery: new MasteryManager(),
      quests: new QuestManager(new InventoryManager()),
      currency: new CurrencyService(0),
      careers: new CareerService(),
    });
    await reloaded.initializeSession('Hero');

    expect(reloaded.assignments.isActive('engineer-circuit-basics')).toBe(true);
    expect(reloaded.assignments.isCompleted('doctor-patient-intake')).toBe(true);
    expect(reloaded.careers.getProfessionRecord('doctor')?.assignmentHistory.some((a) => a.assignmentId === 'doctor-patient-intake')).toBe(true);
  });
});
