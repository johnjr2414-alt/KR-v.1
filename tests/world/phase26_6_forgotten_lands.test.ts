import { describe, it, expect } from 'vitest';
import {
  ARCANE_CITY_ZONES,
  ASHEN_WASTES,
  ASHEN_WASTES_ZONE,
  FORGOTTEN_CROSSROADS,
  FORGOTTEN_LANDS_MAPS,
  FORGOTTEN_LANDS_ZONES,
  HUNTING_ZONE_REGISTRY,
  HuntingZoneIds,
  MAP_REGISTRY,
  MapIds,
  REGION_REGISTRY,
  RUINED_ARCHIVE,
  RUINED_ARCHIVE_ZONE,
  validateMapGraph,
  ZoneType,
} from '../../src/world';
import { RegionIds } from '../../src/world/RegionDefinition';
import { getMonsterById } from '../../src/monsters/monsterData';
import { monsterSpawner } from '../../src/monsters';
import { EducationalTier, SubjectId } from '../../src/core/types/education';
import { DifficultyEngine } from '../../src/questions/retrieval/DifficultyEngine';
import { QuestionRepository } from '../../src/questions/retrieval/QuestionRepository';
import { loadBundledQuestions } from '../../src/questions/retrieval/QuestionLoader';
import { DEFAULT_EDUCATIONAL_TIER_CONFIG } from '../../src/config/difficultyConfig';
import { SUBJECT_TAXONOMY } from '../../src/questions/taxonomy/TaxonomyData';
import { checkZoneAccess } from '../../src/world/zoneAccess';
import { getItemDefinition } from '../../src/inventory/ItemRegistry';
import { NPC_REGISTRY, getNPCsForMap } from '../../src/quests/NPCRegistry';
import { QUEST_REGISTRY } from '../../src/quests/QuestRegistry';
import { NPCType } from '../../src/quests/NPCTypes';

const FORGOTTEN_LANDS_MAP_IDS = FORGOTTEN_LANDS_MAPS.map((m) => m.id);
const tierIndex = (tier: EducationalTier): number =>
  DEFAULT_EDUCATIONAL_TIER_CONFIG.find((r) => r.tier === tier)!.tierIndex;

// ─── Configuration integrity ─────────────────────────────────────────────────

describe('Phase 26.6 — Forgotten Lands map configuration', () => {
  it('defines the crossroads plus two hunting grounds', () => {
    expect(FORGOTTEN_LANDS_MAPS).toHaveLength(3);
    expect(FORGOTTEN_CROSSROADS.zoneType).toBe(ZoneType.Town);
    expect(ASHEN_WASTES.zoneType).toBe(ZoneType.HuntingGround);
    expect(RUINED_ARCHIVE.zoneType).toBe(ZoneType.HuntingGround);
  });

  it('registers every Forgotten Lands map in the world registry', () => {
    for (const id of FORGOTTEN_LANDS_MAP_IDS) {
      expect(MAP_REGISTRY[id]).toBeDefined();
      expect(MAP_REGISTRY[id].id).toBe(id);
    }
  });

  it('marks the region with the Forgotten Lands maps and a Level 50–60 band', () => {
    const region = REGION_REGISTRY[RegionIds.ForgottenLands];
    expect(region).toBeDefined();
    expect(region.unlock.minLevel).toBe(50);
    expect(region.recommendedLevel).toEqual({ min: 50, max: 60 });
    for (const id of FORGOTTEN_LANDS_MAP_IDS) {
      expect(region.mapIds).toContain(id);
    }
  });

  it('keeps map entry requirements aligned with the region band', () => {
    for (const map of FORGOTTEN_LANDS_MAPS) {
      expect(map.entryRequirements.recommendedMinLevel).toBe(50);
      expect(map.entryRequirements.recommendedMaxLevel).toBe(60);
    }
  });

  it('defines collision obstacles within each map', () => {
    for (const map of FORGOTTEN_LANDS_MAPS) {
      expect(map.collisionRects.length).toBeGreaterThan(0);
    }
  });
});

// ─── Zone transitions ────────────────────────────────────────────────────────

describe('Phase 26.6 — Forgotten Lands zone transitions', () => {
  it('passes map-graph validation with bidirectional routes', () => {
    const validation = validateMapGraph(FORGOTTEN_LANDS_MAPS, { requireBidirectional: true });
    expect(validation.errors).toEqual([]);
    expect(validation.valid).toBe(true);
  });

  it('connects the crossroads to both hunting grounds and back', () => {
    const targets = FORGOTTEN_CROSSROADS.connections.map((c) => c.targetMapId);
    expect(targets).toContain(MapIds.AshenWastes);
    expect(targets).toContain(MapIds.RuinedArchive);

    expect(ASHEN_WASTES.connections.some((c) => c.targetMapId === MapIds.ForgottenCrossroads)).toBe(true);
    expect(RUINED_ARCHIVE.connections.some((c) => c.targetMapId === MapIds.ForgottenCrossroads)).toBe(true);
  });

  it('keeps every entry/exit point inside its map bounds', () => {
    for (const map of FORGOTTEN_LANDS_MAPS) {
      const { width, height } = map.bounds;
      for (const conn of map.connections) {
        expect(conn.exitPosition.x).toBeGreaterThanOrEqual(0);
        expect(conn.exitPosition.x).toBeLessThanOrEqual(width);
        expect(conn.exitPosition.y).toBeGreaterThanOrEqual(0);
        expect(conn.exitPosition.y).toBeLessThanOrEqual(height);

        const target = MAP_REGISTRY[conn.targetMapId];
        expect(conn.entryPosition.x).toBeLessThanOrEqual(target.bounds.width);
        expect(conn.entryPosition.y).toBeLessThanOrEqual(target.bounds.height);
      }
    }
  });
});

// ─── Spawn validity ──────────────────────────────────────────────────────────

describe('Phase 26.6 — Forgotten Lands spawn validity', () => {
  it('produces a full spawn plan for both zones within map bounds', () => {
    for (const zone of FORGOTTEN_LANDS_ZONES) {
      const map = MAP_REGISTRY[zone.id];
      expect(map).toBeDefined();
      const plan = monsterSpawner.generateSpawnPlan(zone, map.bounds, 6);
      expect(plan).toHaveLength(6);
      for (const { definition, position } of plan) {
        expect(definition.subject).toBe(zone.subject);
        expect(position.x).toBeGreaterThanOrEqual(0);
        expect(position.x).toBeLessThanOrEqual(map.bounds.width);
        expect(position.y).toBeGreaterThanOrEqual(0);
        expect(position.y).toBeLessThanOrEqual(map.bounds.height);
      }
    }
  });
});

// ─── Monster / player level deltas at boundary levels ────────────────────────

describe('Phase 26.6 — Forgotten Lands monster/player level deltas (boundary)', () => {
  const engine = new DifficultyEngine();

  it('registers both Forgotten Lands zones with the right subjects', () => {
    expect(HUNTING_ZONE_REGISTRY[HuntingZoneIds.AshenWastes]).toBeDefined();
    expect(HUNTING_ZONE_REGISTRY[HuntingZoneIds.RuinedArchive]).toBeDefined();
    expect(ASHEN_WASTES_ZONE.subject).toBe(SubjectId.Science);
    expect(RUINED_ARCHIVE_ZONE.subject).toBe(SubjectId.Mathematics);
  });

  it('straddles the Junior High → Senior High boundary (level 50 vs 51)', () => {
    expect(engine.getMonsterBaselineTier(50)).toBe(EducationalTier.JuniorHigh);
    expect(engine.getMonsterBaselineTier(51)).toBe(EducationalTier.SeniorHigh);
  });

  it('derives each zone baseline tier from its average monster level', () => {
    for (const zone of FORGOTTEN_LANDS_ZONES) {
      expect(engine.getMonsterBaselineTier(zone.averageMonsterLevel)).toBe(zone.educationalTier);
      expect(zone.educationalTier).toBe(EducationalTier.SeniorHigh);
    }
  });

  it('has each zone span both Junior High and Senior High monster baselines', () => {
    for (const zone of FORGOTTEN_LANDS_ZONES) {
      const tiers = zone.monsterSpawnConfigs.map((cfg) =>
        engine.getMonsterBaselineTier(getMonsterById(cfg.monsterId)!.level),
      );
      expect(tiers).toContain(EducationalTier.JuniorHigh);
      expect(tiers).toContain(EducationalTier.SeniorHigh);
    }
  });

  it('computes deltas at the region boundary correctly', () => {
    expect(engine.calculateLevelDifference(50, 50).deltaL).toBe(0);
    const d55 = engine.calculateLevelDifference(50, 55);
    expect(d55.deltaL).toBe(5);
    expect(d55.isMonsterHigher).toBe(true);
    expect(engine.calculateLevelDifference(50, 60).deltaL).toBe(10);
    expect(engine.calculateLevelDifference(51, 50).deltaL).toBe(-1);
  });

  it('applies the existing higher-level jump rules at the boundary', () => {
    // ΔL = 5..9 -> +1 tier, introductory difficulty, 20% timer cut (existing rule)
    const major = engine.createQuestionProfile(SubjectId.Science, 50, 55);
    expect(major.levelDifference.deltaL).toBe(5);
    expect(tierIndex(major.targetTier)).toBe(tierIndex(major.baselineTier) + 1);
    expect(major.targetDifficulty).toBe(1);
    expect(major.timerMultiplier).toBeCloseTo(0.8);

    // ΔL = 10..19 -> +1 tier, mid-tier difficulty, 30% timer cut (existing rule)
    const jump = engine.createQuestionProfile(SubjectId.Science, 50, 60);
    expect(jump.levelDifference.deltaL).toBe(10);
    expect(tierIndex(jump.targetTier)).toBe(tierIndex(jump.baselineTier) + 1);
    expect(jump.targetDifficulty).toBe(3);
    expect(jump.timerMultiplier).toBeCloseTo(0.7);
  });

  it('does not warn an on-level player but warns the bare-minimum player', () => {
    for (const zone of FORGOTTEN_LANDS_ZONES) {
      // At the zone's average monster level the encounter is safe.
      expect(
        checkZoneAccess(zone.averageMonsterLevel, zone.averageMonsterLevel, zone.name, zone.recommendedMinLevel)
          .isDangerous,
      ).toBe(false);
      // At the region's recommended minimum the risk messaging explicitly warns.
      const atMin = checkZoneAccess(zone.recommendedMinLevel, zone.averageMonsterLevel, zone.name, zone.recommendedMinLevel);
      expect(atMin.isDangerous).toBe(true);
      expect(atMin.warningMessage).toContain(zone.name);
      expect(atMin.warningMessage).toContain(`Level ${zone.recommendedMinLevel}+`);
    }
  });
});

// ─── Question selection at boundary levels (fallback protection) ──────────────

describe('Phase 26.6 — Forgotten Lands question selection at boundary levels', () => {
  const engine = new DifficultyEngine();
  const repo = new QuestionRepository(loadBundledQuestions().questions);

  it('confirms the zone subjects have no Senior High content (fallback is required)', () => {
    for (const zone of FORGOTTEN_LANDS_ZONES) {
      const subjectEntry = SUBJECT_TAXONOMY.find((s) => s.id === zone.subject);
      expect(subjectEntry).toBeDefined();
      expect(subjectEntry?.tiers).not.toContain(EducationalTier.SeniorHigh);
    }
  });

  it('resolves boundary profiles: player 51 vs a level 50 monster stays Junior High', () => {
    const profile = engine.createQuestionProfile(SubjectId.Science, 51, 50);
    expect(profile.baselineTier).toBe(EducationalTier.JuniorHigh);
    expect(profile.targetTier).toBe(EducationalTier.JuniorHigh);
    expect(profile.targetDifficulty).toBe(1); // lower-level adjustment
    expect(profile.rewardMultiplier).toBe(1.0);
  });

  it('resolves boundary profiles: player 51 vs a level 51 monster is Senior High', () => {
    const profile = engine.createQuestionProfile(SubjectId.Science, 51, 51);
    expect(profile.baselineTier).toBe(EducationalTier.SeniorHigh);
    expect(profile.targetTier).toBe(EducationalTier.SeniorHigh);
    expect(profile.targetDifficulty).toBe(3);
  });

  it('keeps on-level Junior High encounters solvable without any fallback', () => {
    const profile = engine.createQuestionProfile(SubjectId.Science, 50, 50);
    expect(profile.targetTier).toBe(EducationalTier.JuniorHigh);
    const res = engine.resolveQuestionsWithFallback(repo, profile, 2);
    expect(res.questions.length).toBeGreaterThanOrEqual(1);
    expect(res.questions[0].subject).toBe(SubjectId.Science);
  });

  it('falls back (does not bypass) when a Senior High encounter requests empty content', () => {
    // Player 50 vs level 55 -> baseline Senior High, +1 tier -> College (no bundled content).
    const profile = engine.createQuestionProfile(SubjectId.Science, 50, 55);
    expect(profile.targetTier).toBe(EducationalTier.College);

    const res = engine.resolveQuestionsWithFallback(repo, profile, 3);

    expect(res.questions.length).toBeGreaterThan(0);
    expect(res.fallbackEvents.length).toBeGreaterThan(0);
    expect(res.fallbackEvents[0].requestedTier).toBe(EducationalTier.College);
    expect(res.fallbackEvents[0].reason).toContain('Insufficient questions');
    // Every resolved question still belongs to the encounter's subject.
    for (const q of res.questions) {
      expect(q.subject).toBe(SubjectId.Science);
    }
  });

  it('never returns an empty question set for any Forgotten Lands encounter', () => {
    for (const zone of FORGOTTEN_LANDS_ZONES) {
      for (const cfg of zone.monsterSpawnConfigs) {
        const monster = getMonsterById(cfg.monsterId)!;
        const profile = engine.createQuestionProfile(zone.subject, zone.recommendedMinLevel, monster.level);
        const res = engine.resolveQuestionsWithFallback(repo, profile, 3);
        expect(res.questions.length).toBeGreaterThan(0);
      }
    }
  });
});

// ─── Bounded (never impossible) tier jumps ───────────────────────────────────

describe('Phase 26.6 — Forgotten Lands tier jumps stay bounded', () => {
  const engine = new DifficultyEngine();
  const maxTierIndex = DEFAULT_EDUCATIONAL_TIER_CONFIG.length - 1;

  it('caps every region encounter at a bounded tier jump from its baseline', () => {
    for (const zone of FORGOTTEN_LANDS_ZONES) {
      for (const cfg of zone.monsterSpawnConfigs) {
        const monster = getMonsterById(cfg.monsterId)!;
        const profile = engine.createQuestionProfile(zone.subject, zone.recommendedMinLevel, monster.level);
        const jump = tierIndex(profile.targetTier) - tierIndex(profile.baselineTier);
        expect(jump).toBeGreaterThanOrEqual(0);
        expect(jump).toBeLessThanOrEqual(2); // maximum tier shift defined by the existing rules
        expect(tierIndex(profile.targetTier)).toBeLessThanOrEqual(maxTierIndex);
      }
    }
  });

  it('keeps the region level delta bounded (≤ 10) from the recommended minimum', () => {
    for (const zone of FORGOTTEN_LANDS_ZONES) {
      for (const cfg of zone.monsterSpawnConfigs) {
        const monster = getMonsterById(cfg.monsterId)!;
        const delta = monster.level - zone.recommendedMinLevel;
        expect(delta).toBeLessThanOrEqual(10); // worst case: +1 tier, never unbounded
        expect(delta).toBeLessThan(20); // never reaches the +2 tier extreme-jump band
      }
    }
  });

  it('keeps every monster within the zone level band', () => {
    for (const zone of FORGOTTEN_LANDS_ZONES) {
      for (const cfg of zone.monsterSpawnConfigs) {
        const monster = getMonsterById(cfg.monsterId)!;
        expect(monster.level).toBeGreaterThanOrEqual(zone.recommendedMinLevel);
        expect(monster.level).toBeLessThanOrEqual(zone.recommendedMaxLevel);
      }
    }
  });
});

// ─── Rewards / drops ─────────────────────────────────────────────────────────

describe('Phase 26.6 — Forgotten Lands rewards and drops', () => {
  const monsterIds = FORGOTTEN_LANDS_ZONES.flatMap((zone) =>
    zone.monsterSpawnConfigs.map((cfg) => cfg.monsterId),
  );

  it('gives every monster positive exp and non-negative gold', () => {
    for (const id of monsterIds) {
      const monster = getMonsterById(id)!;
      expect(monster.baseExp).toBeGreaterThan(0);
      expect(monster.baseGold).toBeGreaterThanOrEqual(0);
    }
  });

  it('references only real items in every drop table', () => {
    for (const id of monsterIds) {
      const monster = getMonsterById(id)!;
      for (const drop of monster.dropConfig.drops) {
        expect(getItemDefinition(drop.itemId)).toBeDefined();
        expect(drop.dropChance).toBeGreaterThan(0);
        expect(drop.dropChance).toBeLessThanOrEqual(1);
        expect(drop.maxQuantity).toBeGreaterThanOrEqual(drop.minQuantity);
      }
    }
  });

  it('does not overlap Forgotten Lands monsters with other regions', () => {
    const arcane = new Set(
      ARCANE_CITY_ZONES.flatMap((z) => z.monsterSpawnConfigs.map((c) => c.monsterId)),
    );
    for (const id of monsterIds) {
      expect(arcane.has(id)).toBe(false);
    }
  });
});

// ─── NPC interactions ────────────────────────────────────────────────────────

describe('Phase 26.6 — Forgotten Lands NPC interactions', () => {
  it('places the Forgotten Lands NPCs on the crossroads map', () => {
    const ids = getNPCsForMap(MapIds.ForgottenCrossroads).map((n) => n.id);
    expect(ids).toContain('warden-thalia');
    expect(ids).toContain('hermit-orin');
  });

  it('links the quest giver to a registered quest and a real monster target', () => {
    const npc = NPC_REGISTRY['warden-thalia'];
    expect(npc.type).toBe(NPCType.QuestGiver);
    expect(npc.offeredQuestIds).toContain('quest-forgotten-vigil');

    const quest = QUEST_REGISTRY['quest-forgotten-vigil'];
    expect(quest).toBeDefined();
    expect(quest.giverNpcId).toBe(npc.id);
    expect(quest.requirements.minLevel).toBe(50);
    for (const objective of quest.objectives) {
      expect(getMonsterById(objective.targetId)).toBeDefined();
    }
  });

  it('uses only real items and subjects in the quest rewards', () => {
    const quest = QUEST_REGISTRY['quest-forgotten-vigil'];
    for (const item of quest.rewards.items ?? []) {
      expect(getItemDefinition(item.itemId)).toBeDefined();
      expect(item.quantity).toBeGreaterThan(0);
    }
    if (quest.rewards.masteryExp) {
      expect(SUBJECT_TAXONOMY.find((s) => s.id === quest.rewards.masteryExp!.subjectId)).toBeDefined();
    }
  });
});
