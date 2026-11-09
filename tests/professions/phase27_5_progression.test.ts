import { describe, it, expect } from 'vitest';
import {
  ProfessionProgressionService,
  ProfessionProgressionFailureReason,
  getProfessionExpForNextLevel,
} from '../../src/professions/ProfessionProgressionService';
import { CareerService } from '../../src/professions/CareerService';
import { AssignmentRewardService } from '../../src/professions/AssignmentRewardService';
import type {
  AssignmentRewardContext,
  AssignmentGrantedRewards,
} from '../../src/professions/AssignmentRewardService';
import {
  ASSIGNMENT_DEFINITIONS,
} from '../../src/professions/AssignmentRegistry';
import {
  AssignmentStatus,
  type AssignmentDefinition,
  type AssignmentHistoryEntry,
  type AssignmentSubjectMasteryReward,
} from '../../src/professions/AssignmentTypes';
import { ProfessionEnrollmentStatus, type ProfessionDefinition } from '../../src/professions/ProfessionTypes';
import type { EnrollmentContext } from '../../src/professions/ProfessionTypes';
import { PROFESSION_DEFINITIONS } from '../../src/professions/ProfessionRegistry';
import { SubjectId } from '../../src/core/types/education';
import { createPlayerData } from '../../src/player/PlayerData';
import type { PlayerData } from '../../src/player/PlayerData';
import { ProgressionService } from '../../src/core/progression/ProgressionService';
import { MasteryManager } from '../../src/mastery/MasteryManager';
import { createInitialMasteryMap } from '../../src/mastery/MasteryData';
import { CurrencyService } from '../../src/economy/CurrencyService';
import { QuestManager } from '../../src/quests/QuestManager';
import { InventoryManager } from '../../src/inventory/InventoryManager';
import { PlayerSessionManager } from '../../src/player/PlayerSessionManager';
import { InMemoryStorageService } from '../../src/storage/IndexedDBStorageService';

/** A context that can enroll in any starter profession. */
function enrollContext(overrides: Partial<EnrollmentContext> = {}): EnrollmentContext {
  return {
    characterLevel: 50,
    getMasteryLevel: () => 10,
    gold: 10_000,
    isQuestCompleted: () => true,
    ...overrides,
  };
}

/** A tiny profession used to exercise max-level/graduation without huge EXP. */
const SMALL_PROFESSION: ProfessionDefinition = {
  id: 'test-prof',
  name: 'Test Profession',
  categoryId: 'healthcare',
  description: 'A minimal profession for progression tests.',
  responsibilities: [],
  workplaceIds: [],
  enrollment: {},
  ranks: [
    { id: 'r1', name: 'Rookie', minLevel: 1 },
    { id: 'r2', name: 'Veteran', minLevel: 3 },
  ],
  experience: { maxProfessionLevel: 3, baseExp: 100, growthFactor: 1.0 },
  questionTags: ['test'],
  subjectTags: [],
  provisional: true,
};

// ─── EXP curve ────────────────────────────────────────────────────────────────

describe('Phase 27.5 — profession EXP curve', () => {
  it('uses baseExp for the first advancement and grows geometrically', () => {
    const doctor = PROFESSION_DEFINITIONS.find((p) => p.id === 'doctor')!;
    expect(getProfessionExpForNextLevel(1, doctor.experience)).toBe(100);
    expect(getProfessionExpForNextLevel(2, doctor.experience)).toBe(114); // floor(100 * 1.15)
    expect(getProfessionExpForNextLevel(3, doctor.experience)).toBe(132); // floor(100 * 1.15^2)
  });

  it('returns Infinity once the maximum profession level is reached', () => {
    const settings = { maxProfessionLevel: 3, baseExp: 100, growthFactor: 1.0 };
    expect(getProfessionExpForNextLevel(3, settings)).toBe(Infinity);
    expect(getProfessionExpForNextLevel(4, settings)).toBe(Infinity);
  });
});

// ─── EXP awarding, level-up, rank advancement ─────────────────────────────────

describe('Phase 27.5 — profession EXP & rank progression', () => {
  function setupDoctor() {
    const careers = new CareerService();
    careers.enroll('doctor', enrollContext());
    const progression = new ProfessionProgressionService({ careers });
    return { careers, progression };
  }

  it('rejects EXP for an unknown profession and for an un-enrolled player', () => {
    const careers = new CareerService();
    const progression = new ProfessionProgressionService({ careers });

    expect(progression.awardProfessionExp('nope', 100).reason).toBe(
      ProfessionProgressionFailureReason.UnknownProfession,
    );
    expect(progression.awardProfessionExp('doctor', 100).reason).toBe(
      ProfessionProgressionFailureReason.NotEnrolled,
    );
  });

  it('levels up when the EXP requirement is met', () => {
    const { careers, progression } = setupDoctor();
    const result = progression.awardProfessionExp('doctor', 100);

    expect(result.success).toBe(true);
    expect(result.leveledUp).toBe(true);
    expect(result.levelsGained).toBe(1);
    expect(result.previousLevel).toBe(1);
    expect(result.newLevel).toBe(2);
    expect(result.currentExp).toBe(0);
    expect(careers.getProfessionRecord('doctor')?.level).toBe(2);
  });

  it('carries leftover EXP and supports multi-level advancement', () => {
    const { progression } = setupDoctor();
    // 100 (lvl2) + 114 (lvl3) = 214; awarding 250 leaves 36 at level 3.
    const result = progression.awardProfessionExp('doctor', 250);

    expect(result.levelsGained).toBe(2);
    expect(result.newLevel).toBe(3);
    expect(result.currentExp).toBe(36);
  });

  it('advances the rank when a rank threshold is crossed', () => {
    const { progression } = setupDoctor();
    const result = progression.awardProfessionExp('doctor', 215); // reaches level 3

    expect(result.newLevel).toBe(3);
    expect(result.rankChanged).toBe(true);
    expect(result.previousRankId).toBe('medical-trainee');
    expect(result.newRankId).toBe('junior-doctor');
  });

  it('ignores non-positive or invalid EXP amounts', () => {
    const { progression } = setupDoctor();
    expect(progression.awardProfessionExp('doctor', 0).expAwarded).toBe(0);
    expect(progression.awardProfessionExp('doctor', -50).expAwarded).toBe(0);
    expect(progression.awardProfessionExp('doctor', Number.NaN).expAwarded).toBe(0);
    expect(progression.getProgress('doctor')?.level).toBe(1);
  });

  it('caps at the maximum level and graduates the record', () => {
    const careers = new CareerService({ professions: [SMALL_PROFESSION] });
    careers.enroll('test-prof', enrollContext());
    const progression = new ProfessionProgressionService({ careers });

    progression.awardProfessionExp('test-prof', 100); // -> level 2
    const max = progression.awardProfessionExp('test-prof', 100); // -> level 3 (max)

    expect(max.newLevel).toBe(3);
    expect(max.currentExp).toBe(0);
    expect(max.expRequiredForNextLevel).toBe(0);
    expect(careers.getProfessionRecord('test-prof')?.status).toBe(ProfessionEnrollmentStatus.Graduated);

    // Further EXP at max level neither levels up nor accrues EXP.
    const beyond = progression.awardProfessionExp('test-prof', 500);
    expect(beyond.leveledUp).toBe(false);
    expect(beyond.currentExp).toBe(0);
  });
});

// ─── Reputation ───────────────────────────────────────────────────────────────

describe('Phase 27.5 — profession reputation', () => {
  it('accumulates reputation for an enrolled profession', () => {
    const careers = new CareerService();
    careers.enroll('doctor', enrollContext());
    const progression = new ProfessionProgressionService({ careers });

    progression.awardReputation('doctor', 4);
    const second = progression.awardReputation('doctor', 6);

    expect(second.success).toBe(true);
    expect(second.reputationAwarded).toBe(6);
    expect(second.totalReputation).toBe(10);
    expect(careers.getProfessionRecord('doctor')?.reputation).toBe(10);
  });

  it('never reduces reputation (no severe penalties)', () => {
    const careers = new CareerService();
    careers.enroll('doctor', enrollContext());
    const progression = new ProfessionProgressionService({ careers });
    progression.awardReputation('doctor', 5);

    expect(progression.awardReputation('doctor', -3).reputationAwarded).toBe(0);
    expect(careers.getProfessionRecord('doctor')?.reputation).toBe(5);
  });

  it('reports failures for unknown / un-enrolled professions', () => {
    const careers = new CareerService();
    const progression = new ProfessionProgressionService({ careers });
    expect(progression.awardReputation('doctor', 5).reason).toBe(
      ProfessionProgressionFailureReason.NotEnrolled,
    );
    expect(progression.awardReputation('nope', 5).reason).toBe(
      ProfessionProgressionFailureReason.UnknownProfession,
    );
  });
});

// ─── Progress info & unlock gates ─────────────────────────────────────────────

describe('Phase 27.5 — progress info & rank unlock gates', () => {
  it('reports progress toward the next level', () => {
    const careers = new CareerService();
    careers.enroll('doctor', enrollContext());
    const progression = new ProfessionProgressionService({ careers });
    progression.awardProfessionExp('doctor', 50);

    const info = progression.getProgress('doctor')!;
    expect(info.level).toBe(1);
    expect(info.currentExp).toBe(50);
    expect(info.requiredExp).toBe(100);
    expect(info.progressRatio).toBeCloseTo(0.5);
    expect(info.isMaxLevel).toBe(false);
    expect(info.rankName).toBe('Medical Trainee');
  });

  it('evaluates rank unlock gates from the current level', () => {
    const careers = new CareerService();
    careers.enroll('doctor', enrollContext());
    const progression = new ProfessionProgressionService({ careers });

    expect(progression.hasReachedRank('doctor', 'junior-doctor')).toBe(false);
    expect(progression.hasReachedRank('doctor', 'medical-trainee')).toBe(true);
    expect(progression.hasReachedRank('doctor', 'does-not-exist')).toBe(false);
    expect(progression.hasReachedRank('nope', 'medical-trainee')).toBe(false);

    progression.awardProfessionExp('doctor', 215); // -> level 3
    expect(progression.hasReachedRank('doctor', 'junior-doctor')).toBe(true);
    expect(progression.getRank('doctor')?.id).toBe('junior-doctor');
  });

  it('returns undefined progress/rank when not enrolled', () => {
    const careers = new CareerService();
    const progression = new ProfessionProgressionService({ careers });
    expect(progression.getProgress('doctor')).toBeUndefined();
    expect(progression.getRank('doctor')).toBeUndefined();
  });
});

// ─── Career store clamping ────────────────────────────────────────────────────

describe('Phase 27.5 — career store progression clamping', () => {
  it('clamps level/exp/reputation and ignores un-enrolled professions', () => {
    const careers = new CareerService({ professions: [SMALL_PROFESSION] });
    careers.enroll('test-prof', enrollContext());

    const updated = careers.applyProgression('test-prof', { level: 99, exp: -5, reputation: -2 })!;
    expect(updated.level).toBe(3); // clamped to maxProfessionLevel
    expect(updated.exp).toBe(0); // at max level
    expect(updated.reputation).toBe(0); // clamped to >= 0

    expect(careers.applyProgression('ghost', { level: 1, exp: 0, reputation: 0 })).toBeUndefined();
  });

  it('re-derives the current rank from the new level', () => {
    const careers = new CareerService();
    careers.enroll('doctor', enrollContext());
    const updated = careers.applyProgression('doctor', { level: 6, exp: 0, reputation: 0 })!;
    expect(updated.rankId).toBe('general-practitioner');
  });
});

// ─── Reward routing ───────────────────────────────────────────────────────────

describe('Phase 27.5 — assignment reward routing', () => {
  const REWARD_DEF: AssignmentDefinition = {
    ...structuredClone(ASSIGNMENT_DEFINITIONS[0]),
    id: 'reward-test',
    rewards: {
      professionExp: 50,
      characterExp: 30,
      gold: 20,
      reputation: 3,
      subjectMasteryExp: [{ subject: SubjectId.Science, amount: 10 }],
    },
  };

  function makeContext(overrides: {
    status?: AssignmentStatus.Completed | AssignmentStatus.Failed;
    def?: AssignmentDefinition | undefined;
  } = {}) {
    let claimed = false;
    const granted: AssignmentGrantedRewards = {};
    const ctx: AssignmentRewardContext = {
      getCompletion: (): AssignmentHistoryEntry => ({
        assignmentId: 'reward-test',
        professionId: 'doctor',
        status: overrides.status ?? AssignmentStatus.Completed,
        completedAt: 0,
        completionId: 'reward-test',
        rewardsClaimed: claimed,
      }),
      getAssignment: () => ('def' in overrides ? overrides.def : REWARD_DEF),
      claimRewards: () => {
        claimed = true;
        return { success: true, completionId: 'reward-test', alreadyClaimed: false, message: '' };
      },
      awardProfessionExp: (_p, a) => {
        granted.professionExp = (granted.professionExp ?? 0) + a;
      },
      awardReputation: (_p, a) => {
        granted.reputation = (granted.reputation ?? 0) + a;
      },
      awardCharacterExp: (a) => {
        granted.characterExp = (granted.characterExp ?? 0) + a;
      },
      awardGold: (a) => {
        granted.gold = (granted.gold ?? 0) + a;
      },
      awardSubjectMasteryExp: (s, a) => {
        const list = (granted.subjectMasteryExp ??= [] as AssignmentSubjectMasteryReward[]);
        list.push({ subject: s, amount: a });
      },
    };
    return { ctx, granted, isClaimed: () => claimed };
  }

  it('routes every configured reward kind through its callback', () => {
    const { ctx, granted } = makeContext();
    const service = new AssignmentRewardService(ctx);
    const result = service.distributeCompletion('reward-test');

    expect(result.success).toBe(true);
    expect(result.alreadyClaimed).toBe(false);
    expect(granted).toEqual({
      professionExp: 50,
      characterExp: 30,
      gold: 20,
      reputation: 3,
      subjectMasteryExp: [{ subject: SubjectId.Science, amount: 10 }],
    });
  });

  it('grants rewards only once (idempotent on repeat)', () => {
    const { ctx, granted, isClaimed } = makeContext();
    const service = new AssignmentRewardService(ctx);

    service.distributeCompletion('reward-test');
    expect(isClaimed()).toBe(true);

    const second = service.distributeCompletion('reward-test');
    expect(second.success).toBe(true);
    expect(second.alreadyClaimed).toBe(true);
    expect(second.granted).toEqual({});
    // No duplicate grants.
    expect(granted.gold).toBe(20);
    expect(granted.professionExp).toBe(50);
  });

  it('never grants rewards for a failed assignment', () => {
    const { ctx, granted } = makeContext({ status: AssignmentStatus.Failed });
    const service = new AssignmentRewardService(ctx);
    const result = service.distributeCompletion('reward-test');

    expect(result.success).toBe(false);
    expect(result.granted).toEqual({});
    expect(granted).toEqual({});
  });

  it('fails safely for an unknown completion or assignment definition', () => {
    const { ctx } = makeContext({ def: undefined });
    const service = new AssignmentRewardService(ctx);
    expect(service.distributeCompletion('reward-test').success).toBe(false);

    const emptyCtx: AssignmentRewardContext = {
      getCompletion: () => undefined,
      getAssignment: () => undefined,
      claimRewards: () => ({ success: false, completionId: 'x', alreadyClaimed: false, message: '' }),
    };
    expect(new AssignmentRewardService(emptyCtx).distributeCompletion('missing').success).toBe(false);
  });
});

// ─── Separation of progression systems ───────────────────────────────────────

describe('Phase 27.5 — progression systems remain independent', () => {
  it('profession EXP never advances character level or subject mastery', () => {
    const careers = new CareerService();
    careers.enroll('doctor', enrollContext());
    const progression = new ProfessionProgressionService({ careers });

    const player = createPlayerData('p1', 'Hero');
    const mastery = new MasteryManager();

    const charLevelBefore = player.level;
    const masteryBefore = mastery.getMastery(SubjectId.Science).level;

    progression.awardProfessionExp('doctor', 100);
    progression.awardReputation('doctor', 10);

    expect(player.level).toBe(charLevelBefore);
    expect(player.currentExp).toBe(0);
    expect(mastery.getMastery(SubjectId.Science).level).toBe(masteryBefore);
    expect(careers.getProfessionRecord('doctor')?.level).toBe(2);
  });

  it('character EXP never advances profession level', () => {
    const careers = new CareerService();
    careers.enroll('doctor', enrollContext());
    const progressBefore = careers.getProfessionRecord('doctor')?.level;

    const player: PlayerData = createPlayerData('p1', 'Hero');
    const characterProgression = new ProgressionService();
    characterProgression.awardExp(player, 100_000);

    expect(player.level).toBeGreaterThan(1);
    expect(careers.getProfessionRecord('doctor')?.level).toBe(progressBefore);
  });
});

// ─── Persistence ──────────────────────────────────────────────────────────────

describe('Phase 27.5 — progression persistence', () => {
  it('round-trips profession level, EXP, rank, and reputation through a snapshot', () => {
    const careers = new CareerService();
    careers.enroll('doctor', enrollContext());
    const progression = new ProfessionProgressionService({ careers });
    progression.awardProfessionExp('doctor', 250); // -> level 3, exp 36
    progression.awardReputation('doctor', 7);

    const snapshot = careers.snapshot();

    const reloaded = new CareerService();
    reloaded.loadSnapshot(snapshot);
    const record = reloaded.getProfessionRecord('doctor')!;

    expect(record.level).toBe(3);
    expect(record.exp).toBe(36);
    expect(record.rankId).toBe('junior-doctor');
    expect(record.reputation).toBe(7);
  });

  it('distributes assignment rewards through the session and persists them', async () => {
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
    records[SubjectId.Science] = { ...records[SubjectId.Science], level: 5, currentExp: 0 };
    session.mastery.loadRecords(records);
    session.currency.setGold(1000);

    expect(session.careers.enroll('doctor', session.buildEnrollmentContext()).success).toBe(true);
    expect(session.currency.getGold()).toBe(800); // 1000 - 200 enrollment cost

    const ctx = session.buildAssignmentContext();
    expect(session.assignments.acceptAssignment('doctor-patient-intake', ctx).success).toBe(true);
    const doctor = session.assignments.getAssignment('doctor-patient-intake')!;
    for (const stage of doctor.stages) {
      for (const objective of stage.objectives) {
        session.assignments.recordObjectiveProgress('doctor-patient-intake', objective.id, objective.required);
      }
    }
    const completion = session.assignments.completeAssignment('doctor-patient-intake');
    expect(completion.success).toBe(true);

    // Rewards landed: 30 gold, 40 profession EXP, 2 reputation, 20 Science mastery EXP.
    expect(session.currency.getGold()).toBe(830);
    const careerRecord = session.careers.getProfessionRecord('doctor')!;
    expect(careerRecord.exp).toBe(40);
    expect(careerRecord.reputation).toBe(2);
    expect(session.mastery.getMastery(SubjectId.Science).currentExp).toBe(20);

    // Re-distribution is a no-op (idempotent).
    const replay = session.distributeAssignmentRewards(completion.completionId!);
    expect(replay.alreadyClaimed).toBe(true);
    expect(session.currency.getGold()).toBe(830);

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

    const reloadedCareer = reloaded.careers.getProfessionRecord('doctor')!;
    expect(reloadedCareer.exp).toBe(40);
    expect(reloadedCareer.reputation).toBe(2);
    expect(reloaded.currency.getGold()).toBe(830);
    expect(reloaded.mastery.getMastery(SubjectId.Science).currentExp).toBe(20);
    expect(reloaded.assignments.getCompletion('doctor-patient-intake')?.rewardsClaimed).toBe(true);
  });
});
