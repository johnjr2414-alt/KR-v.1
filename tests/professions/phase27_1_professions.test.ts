import { describe, it, expect } from 'vitest';
import {
  CareerService,
  sanitizeCareerSnapshot,
} from '../../src/professions/CareerService';
import {
  PROFESSION_DEFINITIONS,
  PROFESSION_REGISTRY,
  getProfession,
  getProfessionsByCategory,
} from '../../src/professions/ProfessionRegistry';
import {
  PROFESSION_CATEGORY_DEFINITIONS,
  PROFESSION_CATEGORY_REGISTRY,
  getProfessionCategory,
} from '../../src/professions/ProfessionCategories';
import {
  ProfessionValidationSeverity,
  validateProfessionCatalogue,
  validateProfessionCategories,
} from '../../src/professions/ProfessionValidator';
import {
  CAREER_SNAPSHOT_VERSION,
  EnrollmentFailureReason,
  ProfessionEnrollmentStatus,
  type ProfessionCategoryDefinition,
  type ProfessionDefinition,
} from '../../src/professions/ProfessionTypes';
import { SubjectId } from '../../src/core/types/education';
import { createInitialMasteryMap } from '../../src/mastery/MasteryData';
import { validateSaveData } from '../../src/storage/SaveDataValidator';
import { InMemoryStorageService } from '../../src/storage/IndexedDBStorageService';
import { PlayerSessionManager } from '../../src/player/PlayerSessionManager';
import { MasteryManager } from '../../src/mastery/MasteryManager';
import { QuestManager } from '../../src/quests/QuestManager';
import { CurrencyService } from '../../src/economy/CurrencyService';
import { InventoryManager } from '../../src/inventory/InventoryManager';

/** Deep-clones a starter profession for mutation in validation tests. */
function makeProfession(overrides: Partial<ProfessionDefinition> = {}): ProfessionDefinition {
  return {
    ...structuredClone(PROFESSION_DEFINITIONS[0]),
    ...overrides,
  };
}

/** A permissive enrollment context that satisfies every default requirement. */
function fullContext(overrides: Partial<Parameters<CareerService['enroll']>[1]> = {}) {
  return {
    characterLevel: 50,
    getMasteryLevel: () => 10,
    gold: 10_000,
    isQuestCompleted: () => true,
    ...overrides,
  };
}

// ─── Category registry ───────────────────────────────────────────────────────

describe('Phase 27.1 — profession categories', () => {
  it('exposes unique category ids matching their registry keys', () => {
    for (const [key, category] of Object.entries(PROFESSION_CATEGORY_REGISTRY)) {
      expect(category.id).toBe(key);
    }
    expect(Object.keys(PROFESSION_CATEGORY_REGISTRY).length).toBe(
      PROFESSION_CATEGORY_DEFINITIONS.length,
    );
  });

  it('resolves a category and returns undefined for unknown ids', () => {
    expect(getProfessionCategory('healthcare')?.name).toBe('Healthcare');
    expect(getProfessionCategory('nope')).toBeUndefined();
  });

  it('validates a clean category catalogue', () => {
    expect(validateProfessionCategories(PROFESSION_CATEGORY_DEFINITIONS).isValid).toBe(true);
  });

  it('flags duplicate category ids', () => {
    const dup: ProfessionCategoryDefinition[] = [
      { id: 'a', name: 'A', description: 'a' },
      { id: 'a', name: 'A2', description: 'a2' },
    ];
    const report = validateProfessionCategories(dup);
    expect(report.isValid).toBe(false);
    expect(report.issues.some((i) => i.code === 'duplicate-category-id')).toBe(true);
  });
});

// ─── Profession registry ─────────────────────────────────────────────────────

describe('Phase 27.1 — profession registry', () => {
  it('has unique profession ids matching their registry keys', () => {
    for (const [key, def] of Object.entries(PROFESSION_REGISTRY)) {
      expect(def.id).toBe(key);
    }
  });

  it('fully defines the three required professions', () => {
    for (const id of ['doctor', 'electrical-engineer', 'architect']) {
      const def = getProfession(id);
      expect(def, `missing profession '${id}'`).toBeDefined();
      expect(def!.responsibilities.length).toBeGreaterThan(0);
      expect(def!.ranks.length).toBeGreaterThanOrEqual(2);
      expect(def!.questionTags.length).toBeGreaterThan(0);
      expect(def!.workplaceIds.length).toBeGreaterThan(0);
    }
  });

  it('gives every profession a resolvable category', () => {
    for (const def of PROFESSION_DEFINITIONS) {
      expect(getProfessionCategory(def.categoryId), `unknown category '${def.categoryId}'`).toBeDefined();
    }
  });

  it('orders every rank ladder ascending from profession level 1', () => {
    for (const def of PROFESSION_DEFINITIONS) {
      const thresholds = def.ranks.map((r) => r.minLevel);
      expect(thresholds[0]).toBe(1);
      for (let i = 1; i < thresholds.length; i++) {
        expect(thresholds[i]).toBeGreaterThan(thresholds[i - 1]);
      }
    }
  });

  it('supports multiple professions within a category', () => {
    expect(getProfessionsByCategory('healthcare').length).toBeGreaterThanOrEqual(2);
  });

  it('validates the full starter catalogue without errors', () => {
    const report = validateProfessionCatalogue(PROFESSION_DEFINITIONS, PROFESSION_CATEGORY_DEFINITIONS);
    const errors = report.issues.filter((i) => i.severity === ProfessionValidationSeverity.Error);
    expect(errors, JSON.stringify(errors)).toEqual([]);
    expect(report.isValid).toBe(true);
  });
});

// ─── Validation ──────────────────────────────────────────────────────────────

describe('Phase 27.1 — profession catalogue validation', () => {
  it('flags duplicate profession ids', () => {
    const report = validateProfessionCatalogue(
      [makeProfession({ id: 'dup' }), makeProfession({ id: 'dup' })],
      PROFESSION_CATEGORY_DEFINITIONS,
    );
    expect(report.isValid).toBe(false);
    expect(report.issues.some((i) => i.code === 'duplicate-profession-id')).toBe(true);
  });

  it('flags an unknown category reference', () => {
    const report = validateProfessionCatalogue(
      [makeProfession({ categoryId: 'does-not-exist' })],
      PROFESSION_CATEGORY_DEFINITIONS,
    );
    expect(report.issues.some((i) => i.code === 'unknown-category')).toBe(true);
  });

  it('flags non-ascending rank thresholds', () => {
    const report = validateProfessionCatalogue(
      [
        makeProfession({
          ranks: [
            { id: 'a', name: 'A', minLevel: 1 },
            { id: 'b', name: 'B', minLevel: 1 },
          ],
        }),
      ],
      PROFESSION_CATEGORY_DEFINITIONS,
    );
    expect(report.issues.some((i) => i.code === 'rank-thresholds-not-ascending')).toBe(true);
  });

  it('flags invalid experience settings', () => {
    const report = validateProfessionCatalogue(
      [makeProfession({ experience: { maxProfessionLevel: 50, baseExp: 100, growthFactor: 0.5 } })],
      PROFESSION_CATEGORY_DEFINITIONS,
    );
    expect(report.issues.some((i) => i.code === 'invalid-growth-factor')).toBe(true);
  });

  it('flags unknown subject references in enrollment and tags', () => {
    const report = validateProfessionCatalogue(
      [
        makeProfession({
          subjectTags: ['astrology' as SubjectId],
          enrollment: { mastery: [{ subject: 'alchemy' as SubjectId, minLevel: 1 }] },
        }),
      ],
      PROFESSION_CATEGORY_DEFINITIONS,
    );
    expect(report.issues.filter((i) => i.code === 'unknown-subject').length).toBeGreaterThanOrEqual(1);
    expect(report.issues.some((i) => i.code === 'unknown-subject-tag')).toBe(true);
  });

  it('flags unknown prerequisite quests only when a quest set is supplied', () => {
    const profession = makeProfession({ enrollment: { prerequisiteQuestIds: ['ghost-quest'] } });
    const unchecked = validateProfessionCatalogue([profession], PROFESSION_CATEGORY_DEFINITIONS);
    expect(unchecked.issues.some((i) => i.code === 'unknown-prerequisite-quest')).toBe(false);

    const checked = validateProfessionCatalogue([profession], PROFESSION_CATEGORY_DEFINITIONS, {
      knownQuestIds: new Set(['real-quest']),
    });
    expect(checked.issues.some((i) => i.code === 'unknown-prerequisite-quest')).toBe(true);
  });

  it('warns (not errors) about workplaces not yet registered', () => {
    const report = validateProfessionCatalogue(
      [makeProfession({ workplaceIds: ['not-a-place'] })],
      PROFESSION_CATEGORY_DEFINITIONS,
      { knownWorkplaceIds: new Set<string>() },
    );
    const issue = report.issues.find((i) => i.code === 'unknown-workplace');
    expect(issue?.severity).toBe(ProfessionValidationSeverity.Warning);
    expect(report.isValid).toBe(true);
  });
});

// ─── Enrollment ──────────────────────────────────────────────────────────────

describe('Phase 27.1 — enrollment', () => {
  it('enrolls successfully when every requirement is met', () => {
    const service = new CareerService();
    const result = service.enroll('doctor', fullContext());
    expect(result.success).toBe(true);
    expect(result.record?.professionId).toBe('doctor');
    expect(result.record?.level).toBe(1);
    expect(result.record?.exp).toBe(0);
    expect(result.record?.rankId).toBe('medical-trainee');
    expect(result.record?.status).toBe(ProfessionEnrollmentStatus.Enrolled);
    expect(result.record?.assignmentHistory).toEqual([]);
    expect(service.isEnrolled('doctor')).toBe(true);
  });

  it('rejects enrollment when the character level is too low', () => {
    const service = new CareerService();
    const result = service.enroll('doctor', fullContext({ characterLevel: 1 }));
    expect(result.success).toBe(false);
    expect(result.reason).toBe(EnrollmentFailureReason.LevelTooLow);
  });

  it('rejects enrollment when subject mastery is insufficient', () => {
    const service = new CareerService();
    const result = service.enroll('doctor', fullContext({ getMasteryLevel: () => 0 }));
    expect(result.success).toBe(false);
    expect(result.reason).toBe(EnrollmentFailureReason.MasteryTooLow);
  });

  it('rejects enrollment when gold is insufficient', () => {
    const service = new CareerService();
    const result = service.enroll('doctor', fullContext({ gold: 0 }));
    expect(result.success).toBe(false);
    expect(result.reason).toBe(EnrollmentFailureReason.InsufficientGold);
  });

  it('rejects enrollment when a prerequisite quest is incomplete', () => {
    const service = new CareerService({
      professions: [makeProfession({ enrollment: { prerequisiteQuestIds: ['quest-prereq'] } })],
    });
    const result = service.enroll('doctor', fullContext({ isQuestCompleted: () => false }));
    expect(result.success).toBe(false);
    expect(result.reason).toBe(EnrollmentFailureReason.PrerequisiteQuest);
  });

  it('deducts gold only on a successful enrollment', () => {
    const service = new CareerService();
    let spent = 0;
    const ok = service.enroll('doctor', fullContext({ spendGold: (a) => { spent += a; return true; } }));
    expect(ok.success).toBe(true);
    expect(spent).toBe(200);

    let spentOnFailure = 0;
    service.enroll('architect', fullContext({
      characterLevel: 1,
      spendGold: (a) => { spentOnFailure += a; return true; },
    }));
    expect(spentOnFailure).toBe(0);
  });

  it('exposes a per-requirement breakdown from checkEnrollment', () => {
    const service = new CareerService();
    const check = service.checkEnrollment('doctor', fullContext({ characterLevel: 1, gold: 0 }));
    expect(check.canEnroll).toBe(false);
    expect(check.reasons).toContain(EnrollmentFailureReason.LevelTooLow);
    expect(check.reasons).toContain(EnrollmentFailureReason.InsufficientGold);
    const levelReq = check.requirements.find((r) => r.label.startsWith('Character level'));
    expect(levelReq?.satisfied).toBe(false);
    expect(levelReq?.detail).toContain('level');
  });

  it('handles an unknown profession safely in check and enroll', () => {
    const service = new CareerService();
    expect(service.checkEnrollment('ghost', fullContext()).reasons).toContain(
      EnrollmentFailureReason.UnknownProfession,
    );
    const result = service.enroll('ghost', fullContext());
    expect(result.success).toBe(false);
    expect(result.reason).toBe(EnrollmentFailureReason.UnknownProfession);
  });

  it('prevents duplicate enrollment in the same profession', () => {
    const service = new CareerService();
    expect(service.enroll('doctor', fullContext()).success).toBe(true);

    let spentOnSecond = 0;
    const second = service.enroll('doctor', fullContext({ spendGold: (a) => { spentOnSecond += a; return true; } }));
    expect(second.success).toBe(false);
    expect(second.reason).toBe(EnrollmentFailureReason.AlreadyEnrolled);
    expect(spentOnSecond).toBe(0);
    expect(service.getAllRecords().length).toBe(1);
  });

  it('tracks multiple professions independently for one player', () => {
    const service = new CareerService();
    expect(service.enroll('doctor', fullContext()).success).toBe(true);
    expect(service.enroll('electrical-engineer', fullContext()).success).toBe(true);
    expect(service.enroll('architect', fullContext()).success).toBe(true);

    expect(service.getAllRecords().length).toBe(3);
    expect(service.getProfessionRecord('doctor')?.rankId).toBe('medical-trainee');
    expect(service.getProfessionRecord('electrical-engineer')?.rankId).toBe('engineering-intern');
    expect(service.getProfessionRecord('architect')?.rankId).toBe('architectural-trainee');
  });
});

// ─── Rank resolution ─────────────────────────────────────────────────────────

describe('Phase 27.1 — rank resolution', () => {
  const service = new CareerService();

  it('maps profession levels to the correct rank', () => {
    expect(service.getRankForLevel('doctor', 1)?.id).toBe('medical-trainee');
    expect(service.getRankForLevel('doctor', 2)?.id).toBe('medical-trainee');
    expect(service.getRankForLevel('doctor', 3)?.id).toBe('junior-doctor');
    expect(service.getRankForLevel('doctor', 6)?.id).toBe('general-practitioner');
    expect(service.getRankForLevel('doctor', 19)?.id).toBe('medical-specialist');
    expect(service.getRankForLevel('doctor', 20)?.id).toBe('chief-physician');
    expect(service.getRankForLevel('doctor', 99)?.id).toBe('chief-physician');
  });

  it('returns undefined for an unknown profession', () => {
    expect(service.getRankForLevel('ghost', 5)).toBeUndefined();
  });
});

// ─── Persistence ─────────────────────────────────────────────────────────────

describe('Phase 27.1 — career persistence', () => {
  it('round-trips a career profile through snapshot/loadSnapshot', () => {
    const source = new CareerService();
    source.enroll('doctor', fullContext());
    const snapshot = source.snapshot();
    expect(snapshot.version).toBe(CAREER_SNAPSHOT_VERSION);

    const restored = new CareerService();
    restored.loadSnapshot(snapshot);
    expect(restored.isEnrolled('doctor')).toBe(true);
    expect(restored.getProfessionRecord('doctor')?.rankId).toBe('medical-trainee');
  });

  it('drops records for professions absent from the catalogue', () => {
    const service = new CareerService();
    service.loadSnapshot({
      version: 1,
      professions: [
        {
          professionId: 'doctor',
          level: 4,
          exp: 10,
          rankId: 'junior-doctor',
          reputation: 0,
          status: ProfessionEnrollmentStatus.Enrolled,
          assignmentHistory: [],
          enrolledAt: 1,
        },
        {
          professionId: 'ghost-profession',
          level: 1,
          exp: 0,
          rankId: 'x',
          reputation: 0,
          status: ProfessionEnrollmentStatus.Enrolled,
          assignmentHistory: [],
          enrolledAt: 1,
        },
      ],
    });
    expect(service.isEnrolled('doctor')).toBe(true);
    expect(service.getProfessionRecord('ghost-profession')).toBeUndefined();
  });

  it('repairs an invalid rank id to the profession first rank', () => {
    const service = new CareerService();
    service.loadSnapshot({
      version: 1,
      professions: [
        {
          professionId: 'doctor',
          level: 5,
          exp: 0,
          rankId: 'not-a-real-rank',
          reputation: -3,
          status: 'bogus' as ProfessionEnrollmentStatus,
          assignmentHistory: [{ assignmentId: 'a1', completedAt: 5 }],
          enrolledAt: 2,
        },
      ],
    });
    const record = service.getProfessionRecord('doctor');
    expect(record?.rankId).toBe('medical-trainee');
    expect(record?.reputation).toBe(0);
    expect(record?.status).toBe(ProfessionEnrollmentStatus.Enrolled);
    expect(record?.assignmentHistory).toEqual([{ assignmentId: 'a1', completedAt: 5 }]);
  });

  it('sanitizes unknown career payloads safely', () => {
    expect(sanitizeCareerSnapshot(null)).toBeUndefined();
    expect(sanitizeCareerSnapshot('nope')).toBeUndefined();
    const snap = sanitizeCareerSnapshot({ professions: [{ professionId: 'doctor' }, { nope: true }] });
    expect(snap?.version).toBe(CAREER_SNAPSHOT_VERSION);
    expect(snap?.professions.length).toBe(1);
    expect(snap?.professions[0].professionId).toBe('doctor');
  });

  it('remains backward compatible when careers data is absent', () => {
    const result = validateSaveData({ player: { name: 'Hero' } });
    expect(result.isValid).toBe(true);
    expect(result.data?.careers).toBeUndefined();
  });

  it('sanitizes a present careers payload through validateSaveData', () => {
    const result = validateSaveData({
      player: { name: 'Hero' },
      careers: {
        version: 1,
        professions: [
          { professionId: 'doctor', level: 7, exp: 0, rankId: 'senior-doctor', reputation: 3, status: 'enrolled', assignmentHistory: [], enrolledAt: 9 },
        ],
      },
    });
    expect(result.isValid).toBe(true);
    expect(result.data?.careers?.professions[0].professionId).toBe('doctor');
  });

  it('persists careers through a player session save/load round trip', async () => {
    PlayerSessionManager.resetInstance();
    const storage = new InMemoryStorageService();
    const inventory = new InventoryManager();
    const mastery = new MasteryManager();

    const session = new PlayerSessionManager({
      storage,
      inventory,
      mastery,
      quests: new QuestManager(inventory),
      currency: new CurrencyService(0),
      careers: new CareerService(),
    });

    await session.initializeSession('Hero');

    // Configure the fresh player to satisfy the Doctor enrollment requirements.
    session.getPlayer().level = 10;
    const records = createInitialMasteryMap();
    records[SubjectId.Science] = { ...records[SubjectId.Science], level: 5 };
    session.mastery.loadRecords(records);
    session.currency.setGold(1000);

    const enroll = session.careers.enroll('doctor', session.buildEnrollmentContext());
    expect(enroll.success).toBe(true);
    expect(session.currency.getGold()).toBe(800); // 1000 - 200 gold cost

    await session.saveSession();

    PlayerSessionManager.resetInstance();
    const reloadedSession = new PlayerSessionManager({
      storage,
      inventory: new InventoryManager(),
      mastery: new MasteryManager(),
      quests: new QuestManager(new InventoryManager()),
      currency: new CurrencyService(0),
      careers: new CareerService(),
    });
    await reloadedSession.initializeSession('Hero');
    expect(reloadedSession.careers.isEnrolled('doctor')).toBe(true);
    expect(reloadedSession.careers.getProfessionRecord('doctor')?.enrolledAt).toBeGreaterThanOrEqual(0);
  });
});
