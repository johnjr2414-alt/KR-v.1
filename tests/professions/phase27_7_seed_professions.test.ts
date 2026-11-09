import { describe, it, expect } from 'vitest';
import { CareerService } from '../../src/professions/CareerService';
import { WorkplaceService } from '../../src/professions/WorkplaceService';
import { ProfessionProgressionService } from '../../src/professions/ProfessionProgressionService';
import { AssignmentService } from '../../src/professions/AssignmentService';
import { AssignmentRewardService } from '../../src/professions/AssignmentRewardService';
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
import {
  PROFESSION_DEFINITIONS,
  getProfession,
} from '../../src/professions/ProfessionRegistry';
import { PROFESSION_CATEGORY_DEFINITIONS } from '../../src/professions/ProfessionCategories';
import {
  WORKPLACE_DEFINITIONS,
  getWorkplace,
  getWorkplacesForProfession,
  getProfessionsForWorkplace,
} from '../../src/professions/WorkplaceRegistry';
import {
  ASSIGNMENT_DEFINITIONS,
  getAssignmentsForProfession,
} from '../../src/professions/AssignmentRegistry';
import { PROFESSION_QUESTION_SAMPLES } from '../../src/professions/ProfessionQuestionSamples';
import { AssignmentQuestionResolver } from '../../src/professions/AssignmentQuestionResolver';
import { QuestionRepository } from '../../src/questions/retrieval/QuestionRepository';
import { loadBundledQuestions } from '../../src/questions/retrieval/QuestionLoader';
import { validateProfessionCatalogue } from '../../src/professions/ProfessionValidator';
import {
  validateWorkplaceCatalogue,
  validateWorkplaceProfessionAssociations,
} from '../../src/professions/WorkplaceValidator';
import { validateAssignmentCatalogue } from '../../src/professions/AssignmentValidator';
import { NPC_REGISTRY, getNPCsForMap } from '../../src/quests/NPCRegistry';
import { QUEST_REGISTRY } from '../../src/quests/QuestRegistry';
import { SubjectId } from '../../src/core/types/education';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SEED_PROFESSIONS = ['doctor', 'electrical-engineer', 'architect'] as const;

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

/** Builds a self-contained set of headless career services. */
function makeDeps(): CareerViewDeps & {
  careers: CareerService;
  assignments: AssignmentService;
} {
  const careers = new CareerService();
  const workplaces = new WorkplaceService();
  const progression = new ProfessionProgressionService({ careers });
  const assignments = new AssignmentService({
    onCompleted: (entry) => {
      careers.recordAssignmentCompletion(entry.professionId, entry.assignmentId, entry.completedAt);
    },
  });
  return { careers, workplaces, assignments, progression };
}

/** An assignment context derived from a live career profile. */
function ctxFromCareers(careers: CareerService): AssignmentContext {
  return {
    getProfessionState: (professionId) => {
      const record = careers.getProfessionRecord(professionId);
      return record ? { level: record.level, rankId: record.rankId } : undefined;
    },
    isQuestCompleted: () => true,
  };
}

/** A workplace access context derived from a live career profile. */
function workplaceCtxFromCareers(careers: CareerService): WorkplaceAccessContext {
  return {
    characterLevel: 10,
    getProfessionState: (professionId) => {
      const record = careers.getProfessionRecord(professionId);
      return record ? { level: record.level, rankId: record.rankId } : undefined;
    },
    getMasteryLevel: () => 5,
    isQuestCompleted: () => true,
  };
}

// ─── Seed professions end-to-end ──────────────────────────────────────────────

describe('Phase 27.7 — seed professions are fully wired end-to-end', () => {
  for (const professionId of SEED_PROFESSIONS) {
    describe(`seed profession: ${professionId}`, () => {
      it('has a definition with ranks, tags, and a workplace', () => {
        const profession = getProfession(professionId);
        expect(profession).toBeDefined();
        expect(profession!.ranks.length).toBeGreaterThanOrEqual(2);
        expect(profession!.questionTags.length).toBeGreaterThan(0);
        expect(profession!.subjectTags.length).toBeGreaterThan(0);
        expect(profession!.workplaceIds.length).toBeGreaterThanOrEqual(1);
      });

      it('resolves a workplace that lists the profession and staffs an interactive NPC', () => {
        const profession = getProfession(professionId)!;
        const workplaceId = profession.workplaceIds[0];
        const workplace = getWorkplace(workplaceId);
        expect(workplace).toBeDefined();
        expect(workplace!.professionIds).toContain(professionId);
        expect(getProfessionsForWorkplace(workplaceId)).toContain(professionId);
        expect(getWorkplacesForProfession(professionId).map((w) => w.id)).toContain(workplaceId);

        // At least one staffed, interactive NPC linked back to the workplace.
        expect(workplace!.npcIds.length).toBeGreaterThanOrEqual(1);
        const linked = workplace!.npcIds.filter((id) => NPC_REGISTRY[id]?.workplaceId === workplaceId);
        expect(linked.length).toBeGreaterThanOrEqual(1);
      });

      it('provides facilities for the workplace', () => {
        const profession = getProfession(professionId)!;
        const workplace = getWorkplace(profession.workplaceIds[0])!;
        expect(workplace.facilities.length).toBeGreaterThan(0);
        expect(workplace.interactionPoints.length).toBeGreaterThan(0);
      });

      it('offers at least two professional assignments', () => {
        const assignments = getAssignmentsForProfession(professionId);
        expect(assignments.length).toBeGreaterThanOrEqual(2);
        expect(assignments.every((a) => a.professionId === professionId)).toBe(true);
      });

      it('has profession-tagged question samples for its question tags', () => {
        const profession = getProfession(professionId)!;
        const tagged = PROFESSION_QUESTION_SAMPLES.filter((q) =>
          (q.professionTags ?? []).some((tag) => profession.questionTags.includes(tag)),
        );
        expect(tagged.length).toBeGreaterThan(0);
      });

      it('can be enrolled in, then earn profession EXP and reputation', () => {
        const deps = makeDeps();
        expect(deps.careers.enroll(professionId, enrollContext()).success).toBe(true);
        expect(deps.careers.isEnrolled(professionId)).toBe(true);

        const exp = deps.progression.awardProfessionExp(professionId, 250);
        expect(exp.success).toBe(true);
        expect(exp.newLevel).toBeGreaterThan(1);

        const rep = deps.progression.awardReputation(professionId, 4);
        expect(rep.success).toBe(true);
        expect(rep.totalReputation).toBe(4);
      });

      it('completes a professional activity end-to-end with configurable rewards', () => {
        const deps = makeDeps();
        deps.careers.enroll(professionId, enrollContext());
        const ctx = ctxFromCareers(deps.careers);

        const assignment = getAssignmentsForProfession(professionId)[0];
        expect(deps.assignments.acceptAssignment(assignment.id, ctx).success).toBe(true);

        // Clear every objective of every stage.
        for (const stage of assignment.stages) {
          for (const objective of stage.objectives) {
            deps.assignments.recordObjectiveProgress(assignment.id, objective.id, objective.required);
          }
        }

        const completion = deps.assignments.completeAssignment(assignment.id);
        expect(completion.success).toBe(true);
        expect(completion.completionId).toBeDefined();

        // Rewards route through the existing services, once only.
        const goldAwards: number[] = [];
        const charExpAwards: number[] = [];
        const masteryAwards: Array<[SubjectId, number]> = [];
        const rewards = new AssignmentRewardService({
          getCompletion: (id) => deps.assignments.getCompletion(id),
          getAssignment: (id) => deps.assignments.getAssignment(id),
          claimRewards: (id) => deps.assignments.claimRewards(id),
          awardProfessionExp: (id, amount) => void deps.progression.awardProfessionExp(id, amount),
          awardReputation: (id, amount) => void deps.progression.awardReputation(id, amount),
          awardGold: (amount) => goldAwards.push(amount),
          awardCharacterExp: (amount) => charExpAwards.push(amount),
          awardSubjectMasteryExp: (subject, amount) => masteryAwards.push([subject, amount]),
        });

        const first = rewards.distributeCompletion(completion.completionId!);
        expect(first.success).toBe(true);
        expect(first.alreadyClaimed).toBe(false);

        const second = rewards.distributeCompletion(completion.completionId!);
        expect(second.alreadyClaimed).toBe(true);
        expect(second.granted).toEqual({});

        // The completion mirrored into the career profile.
        const record = deps.careers.getProfessionRecord(professionId)!;
        expect(record.assignmentHistory.some((h) => h.assignmentId === assignment.id)).toBe(true);
      });

      it('survives a save/load round trip of career and assignment state', () => {
        const deps = makeDeps();
        deps.careers.enroll(professionId, enrollContext());
        deps.progression.awardProfessionExp(professionId, 250);
        deps.progression.awardReputation(professionId, 3);

        const assignment = getAssignmentsForProfession(professionId)[0];
        const ctx = ctxFromCareers(deps.careers);
        deps.assignments.acceptAssignment(assignment.id, ctx);

        const careerSnapshot = deps.careers.snapshot();
        const assignmentSnapshot = deps.assignments.snapshot();

        // Reload into fresh services.
        const reloaded = makeDeps();
        reloaded.careers.loadSnapshot(careerSnapshot);
        reloaded.assignments.loadSnapshot(assignmentSnapshot);

        const record = reloaded.careers.getProfessionRecord(professionId)!;
        expect(record.level).toBe(deps.careers.getProfessionRecord(professionId)!.level);
        expect(record.reputation).toBe(3);
        expect(reloaded.assignments.isActive(assignment.id)).toBe(true);
      });
    });
  }
});

// ─── Extensibility: config-only profession ────────────────────────────────────

describe('Phase 27.7 — a new profession can be added through configuration only', () => {
  const TEACHER = 'teacher';

  it('is present in the catalogue and resolves to a valid category', () => {
    const teacher = getProfession(TEACHER);
    expect(teacher).toBeDefined();
    expect(PROFESSION_CATEGORY_DEFINITIONS.some((c) => c.id === teacher!.categoryId)).toBe(true);
  });

  it('is displayable in the career selection view', () => {
    const deps = makeDeps();
    const view = buildProfessionCatalogueView(deps, enrollContext());
    const tile = view.categories
      .flatMap((c) => c.professions)
      .find((p) => p.id === TEACHER);
    expect(tile).toBeDefined();
    expect(tile!.workplaceNames.length).toBeGreaterThan(0);
    expect(tile!.rankNames.length).toBeGreaterThan(0);
  });

  it('can be enrolled in', () => {
    const deps = makeDeps();
    const result = deps.careers.enroll(TEACHER, enrollContext({ characterLevel: 3, getMasteryLevel: () => 1, gold: 500 }));
    expect(result.success).toBe(true);
    expect(deps.careers.isEnrolled(TEACHER)).toBe(true);
  });

  it('accesses its configured workplace and its staffed NPC', () => {
    const deps = makeDeps();
    deps.careers.enroll(TEACHER, enrollContext());

    const workplace = getWorkplace('academy')!;
    expect(workplace.professionIds).toContain(TEACHER);
    expect(workplace.npcIds.length).toBeGreaterThanOrEqual(1);

    const view = buildWorkplaceView(
      deps,
      'academy',
      workplaceCtxFromCareers(deps.careers),
      ctxFromCareers(deps.careers),
    )!;
    expect(view.professions.some((p) => p.id === TEACHER)).toBe(true);
    expect(view.facilities.length).toBeGreaterThan(0);
  });

  it('receives assignments without any engine change', () => {
    const assignments = getAssignmentsForProfession(TEACHER);
    expect(assignments.length).toBeGreaterThanOrEqual(1);

    const deps = makeDeps();
    deps.careers.enroll(TEACHER, enrollContext());
    const def = assignments[0];
    const availability = deps.assignments.checkAvailability(def.id, ctxFromCareers(deps.careers));
    expect(availability.available).toBe(true);
  });

  it('retrieves suitable profession questions through the existing resolver', () => {
    const repo = new QuestionRepository([...PROFESSION_QUESTION_SAMPLES]);
    const resolver = new AssignmentQuestionResolver(repo);

    // Elementary-tier assignment, high-enough player level.
    const elementary = resolver.resolve({
      assignmentId: 'teacher-lesson-basics',
      count: 3,
      playerLevel: 5,
    });
    expect(elementary.questions.length).toBe(3);
    expect(elementary.professionPrioritized).toBe(true);

    // Junior-high-tier assessment, player at junior-high level.
    const juniorHigh = resolver.resolve({
      assignmentId: 'teacher-class-assessment',
      count: 2,
      playerLevel: 20,
    });
    expect(juniorHigh.questions.length).toBe(2);
    expect(juniorHigh.professionPrioritized).toBe(true);
  });

  it('earns profession EXP, rewards, and survives save/restore', () => {
    const deps = makeDeps();
    deps.careers.enroll(TEACHER, enrollContext());
    const teacher = getProfession(TEACHER)!;
    const assignment = getAssignmentsForProfession(TEACHER)[0];

    // Accept and clear the assignment.
    const ctx = ctxFromCareers(deps.careers);
    expect(deps.assignments.acceptAssignment(assignment.id, ctx).success).toBe(true);
    for (const stage of assignment.stages) {
      for (const objective of stage.objectives) {
        deps.assignments.recordObjectiveProgress(assignment.id, objective.id, objective.required);
      }
    }
    const completion = deps.assignments.completeAssignment(assignment.id);
    expect(completion.success).toBe(true);

    const rewards = new AssignmentRewardService({
      getCompletion: (id) => deps.assignments.getCompletion(id),
      getAssignment: (id) => deps.assignments.getAssignment(id),
      claimRewards: (id) => deps.assignments.claimRewards(id),
      awardProfessionExp: (id, amount) => void deps.progression.awardProfessionExp(id, amount),
      awardReputation: (id, amount) => void deps.progression.awardReputation(id, amount),
      awardGold: () => {},
      awardCharacterExp: () => {},
      awardSubjectMasteryExp: () => {},
    });
    const distributed = rewards.distributeCompletion(completion.completionId!);
    expect(distributed.success).toBe(true);
    expect(distributed.granted.professionExp).toBe(assignment.rewards.professionExp);

    const record = deps.careers.getProfessionRecord(TEACHER)!;
    expect(record.exp).toBe(assignment.rewards.professionExp);
    expect(record.reputation).toBe(assignment.rewards.reputation);

    // Save/restore round trip.
    const snapshot = deps.careers.snapshot();
    const reloaded = new CareerService();
    reloaded.loadSnapshot(snapshot);
    const restored = reloaded.getProfessionRecord(TEACHER)!;
    expect(restored.level).toBe(record.level);
    expect(restored.exp).toBe(record.exp);
    expect(restored.rankId).toBe(record.rankId);

    // Keep the imported catalogue symbol referenced (guards accidental removal).
    expect(PROFESSION_DEFINITIONS.some((p) => p.id === TEACHER)).toBe(true);
    expect(teacher.workplaceIds).toContain('academy');
  });

  it('unlocks a gated follow-up assignment through rank and prerequisites', () => {
    const deps = makeDeps();
    deps.careers.enroll(TEACHER, enrollContext());
    const ctx = ctxFromCareers(deps.careers);

    // Freshly enrolled: the follow-up is gated behind rank + prerequisite.
    let view = buildAssignmentView(deps, 'teacher-class-assessment', ctx)!;
    expect(view.professionName).toBe('Teacher');
    expect(view.status).toBe('unavailable');
    expect(view.requirements.some((r) => !r.satisfied)).toBe(true);

    // Reach Junior Teacher (level >= 3).
    expect(deps.progression.awardProfessionExp(TEACHER, 250).newLevel).toBeGreaterThanOrEqual(3);

    // Complete the prerequisite assignment.
    const prereq = deps.assignments.getAssignment('teacher-lesson-basics')!;
    expect(deps.assignments.acceptAssignment(prereq.id, ctxFromCareers(deps.careers)).success).toBe(true);
    for (const stage of prereq.stages) {
      for (const objective of stage.objectives) {
        deps.assignments.recordObjectiveProgress(prereq.id, objective.id, objective.required);
      }
    }
    expect(deps.assignments.completeAssignment(prereq.id).success).toBe(true);

    view = buildAssignmentView(deps, 'teacher-class-assessment', ctxFromCareers(deps.careers))!;
    expect(view.status).toBe('available');

    const profile = buildCareerProfileView(deps);
    expect(profile.professions.some((p) => p.professionId === TEACHER)).toBe(true);
  });
});

// ─── Catalogue validation & regression ────────────────────────────────────────

describe('Phase 27.7 — extended catalogues stay valid and backward-compatible', () => {
  it('validates the profession catalogue (including Teacher)', () => {
    const knownWorkplaceIds = new Set(WORKPLACE_DEFINITIONS.map((w) => w.id));
    const knownQuestIds = new Set(Object.keys(QUEST_REGISTRY));
    const report = validateProfessionCatalogue(
      PROFESSION_DEFINITIONS,
      PROFESSION_CATEGORY_DEFINITIONS,
      { knownWorkplaceIds, knownQuestIds },
    );
    expect(report.issues.filter((i) => i.severity === 'error')).toEqual([]);
    expect(report.isValid).toBe(true);
  });

  it('validates the workplace catalogue and its profession associations', () => {
    const knownProfessionIds = new Set(PROFESSION_DEFINITIONS.map((p) => p.id));
    const knownNpcIds = new Set(Object.keys(NPC_REGISTRY));
    const knownQuestIds = new Set(Object.keys(QUEST_REGISTRY));
    const report = validateWorkplaceCatalogue(WORKPLACE_DEFINITIONS, {
      knownProfessionIds,
      knownNpcIds,
      knownQuestIds,
    });
    expect(report.isValid).toBe(true);

    const associations = validateWorkplaceProfessionAssociations(
      PROFESSION_DEFINITIONS,
      WORKPLACE_DEFINITIONS,
    );
    expect(associations.isValid).toBe(true);
    expect(associations.issues.filter((i) => i.severity === 'error')).toEqual([]);
  });

  it('validates the extended assignment catalogue', () => {
    const knownProfessionIds = new Set(PROFESSION_DEFINITIONS.map((p) => p.id));
    const knownAssignmentIds = new Set(ASSIGNMENT_DEFINITIONS.map((a) => a.id));
    const report = validateAssignmentCatalogue(ASSIGNMENT_DEFINITIONS, {
      knownProfessionIds,
      knownAssignmentIds,
      professions: PROFESSION_DEFINITIONS,
    });
    expect(report.isValid).toBe(true);
    expect(report.issues.filter((i) => i.severity === 'error')).toEqual([]);
  });

  it('keeps the bundled question bank free of profession tags', () => {
    const bundled = loadBundledQuestions().questions;
    const tagged = bundled.filter(
      (q) => (q.professionTags?.length ?? 0) > 0 || (q.specialtyTags?.length ?? 0) > 0,
    );
    expect(tagged).toHaveLength(0);
  });

  it('keeps career NPCs placed in the beginners village', () => {
    const ids = getNPCsForMap('beginners-village').map((n) => n.id);
    for (const npcId of ['career-advisor-marisol', 'doctor-quinn', 'academy-instructor-lena', 'engineer-rurik', 'architect-ines']) {
      expect(ids).toContain(npcId);
    }
  });
});
