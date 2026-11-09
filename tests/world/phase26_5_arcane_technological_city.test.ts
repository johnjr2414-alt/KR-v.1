import { describe, it, expect } from 'vitest';
import {
  ARCANE_CITY_MAPS,
  ARCANE_CITY_PLAZA,
  ARCANE_CITY_ZONES,
  HUNTING_ZONE_REGISTRY,
  HuntingZoneIds,
  LOGIC_SPIRE,
  LOGIC_SPIRE_ZONE,
  MANA_FOUNDRY,
  MANA_FOUNDRY_ZONE,
  MAP_REGISTRY,
  MapIds,
  REGION_REGISTRY,
  validateMapGraph,
  ZoneType,
} from '../../src/world';
import { RegionIds } from '../../src/world/RegionDefinition';
import { getMonsterById } from '../../src/monsters/monsterData';
import { monsterSpawner } from '../../src/monsters';
import { EducationalTier, SubjectId } from '../../src/core/types/education';
import { DifficultyEngine } from '../../src/questions/retrieval/DifficultyEngine';
import { SUBJECT_TAXONOMY } from '../../src/questions/taxonomy/TaxonomyData';
import { checkZoneAccess } from '../../src/world/zoneAccess';
import { getItemDefinition } from '../../src/inventory/ItemRegistry';
import { NPC_REGISTRY, getNPCsForMap } from '../../src/quests/NPCRegistry';
import { QUEST_REGISTRY } from '../../src/quests/QuestRegistry';
import { NPCType } from '../../src/quests/NPCTypes';

const ARCANE_CITY_MAP_IDS = ARCANE_CITY_MAPS.map((m) => m.id);

// ─── Configuration integrity ─────────────────────────────────────────────────

describe('Phase 26.5 — Arcane Technological City map configuration', () => {
  it('defines the plaza plus two hunting grounds', () => {
    expect(ARCANE_CITY_MAPS).toHaveLength(3);
    expect(ARCANE_CITY_PLAZA.zoneType).toBe(ZoneType.Town);
    expect(MANA_FOUNDRY.zoneType).toBe(ZoneType.HuntingGround);
    expect(LOGIC_SPIRE.zoneType).toBe(ZoneType.HuntingGround);
  });

  it('registers every Arcane City map in the world registry', () => {
    for (const id of ARCANE_CITY_MAP_IDS) {
      expect(MAP_REGISTRY[id]).toBeDefined();
      expect(MAP_REGISTRY[id].id).toBe(id);
    }
  });

  it('marks the region with the Arcane City maps and a Level 40–50 band', () => {
    const region = REGION_REGISTRY[RegionIds.ArcaneTechnologicalCity];
    expect(region).toBeDefined();
    expect(region.unlock.minLevel).toBe(40);
    expect(region.recommendedLevel).toEqual({ min: 40, max: 50 });
    for (const id of ARCANE_CITY_MAP_IDS) {
      expect(region.mapIds).toContain(id);
    }
  });

  it('keeps map entry requirements aligned with the region band', () => {
    for (const map of ARCANE_CITY_MAPS) {
      expect(map.entryRequirements.recommendedMinLevel).toBe(40);
      expect(map.entryRequirements.recommendedMaxLevel).toBe(50);
    }
  });

  it('defines collision obstacles within each map', () => {
    for (const map of ARCANE_CITY_MAPS) {
      expect(map.collisionRects.length).toBeGreaterThan(0);
    }
  });
});

// ─── Zone transitions ────────────────────────────────────────────────────────

describe('Phase 26.5 — Arcane Technological City zone transitions', () => {
  it('passes map-graph validation with bidirectional routes', () => {
    const validation = validateMapGraph(ARCANE_CITY_MAPS, { requireBidirectional: true });
    expect(validation.errors).toEqual([]);
    expect(validation.valid).toBe(true);
  });

  it('connects the plaza to both hunting grounds and back', () => {
    const plazaTargets = ARCANE_CITY_PLAZA.connections.map((c) => c.targetMapId);
    expect(plazaTargets).toContain(MapIds.ManaFoundry);
    expect(plazaTargets).toContain(MapIds.LogicSpire);

    expect(MANA_FOUNDRY.connections.some((c) => c.targetMapId === MapIds.ArcaneCityPlaza)).toBe(true);
    expect(LOGIC_SPIRE.connections.some((c) => c.targetMapId === MapIds.ArcaneCityPlaza)).toBe(true);
  });

  it('has a resolvable exit → entry round trip for every connection', () => {
    for (const map of ARCANE_CITY_MAPS) {
      for (const conn of map.connections) {
        const target = MAP_REGISTRY[conn.targetMapId];
        expect(target).toBeDefined();
        // The target must route back to the origin map (bidirectional travel).
        const back = target.connections.find((c) => c.targetMapId === map.id);
        expect(back).toBeDefined();
        // Arriving in the target places the player at this connection's entry point.
        expect(conn.entryPosition.x).toBeLessThanOrEqual(target.bounds.width);
        expect(conn.entryPosition.y).toBeLessThanOrEqual(target.bounds.height);
      }
    }
  });

  it('keeps every entry/exit point inside its map bounds', () => {
    for (const map of ARCANE_CITY_MAPS) {
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

describe('Phase 26.5 — Arcane Technological City spawn validity', () => {
  it('keeps generated spawn positions inside every Arcane City map', () => {
    for (const map of ARCANE_CITY_MAPS) {
      const { width, height } = map.bounds;
      const positions = monsterSpawner.generateSpawnPositions({ width, height }, 12);
      for (const p of positions) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(width);
        expect(p.y).toBeLessThanOrEqual(height);
      }
    }
  });

  it('produces a full spawn plan for both Arcane City zones within map bounds', () => {
    for (const zone of ARCANE_CITY_ZONES) {
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

// ─── Level-risk warnings ─────────────────────────────────────────────────────

describe('Phase 26.5 — Arcane Technological City level-risk warnings', () => {
  it('does not warn an on-level player', () => {
    for (const zone of ARCANE_CITY_ZONES) {
      const check = checkZoneAccess(
        zone.recommendedMinLevel,
        zone.averageMonsterLevel,
        zone.name,
        zone.recommendedMinLevel,
      );
      expect(check.isDangerous).toBe(false);
    }
  });

  it('warns once the monster/player delta reaches the threshold (5)', () => {
    const zone = MANA_FOUNDRY_ZONE; // avg level 43
    expect(checkZoneAccess(38, zone.averageMonsterLevel, zone.name, zone.recommendedMinLevel).isDangerous).toBe(true);
    expect(checkZoneAccess(39, zone.averageMonsterLevel, zone.name, zone.recommendedMinLevel).isDangerous).toBe(false);
  });

  it('escalates to Extreme for a severely under-leveled player', () => {
    const zone = LOGIC_SPIRE_ZONE; // avg level 43
    const check = checkZoneAccess(30, zone.averageMonsterLevel, zone.name, zone.recommendedMinLevel);
    expect(check.isDangerous).toBe(true);
    expect(check.dangerLevel).toBe('extreme');
  });
});

// ─── Encounter profiles ──────────────────────────────────────────────────────

describe('Phase 26.5 — Arcane Technological City encounter profiles', () => {
  const engine = new DifficultyEngine();

  it('registers both Arcane City zones with the right subjects', () => {
    expect(HUNTING_ZONE_REGISTRY[HuntingZoneIds.ManaFoundry]).toBeDefined();
    expect(HUNTING_ZONE_REGISTRY[HuntingZoneIds.LogicSpire]).toBeDefined();
    expect(MANA_FOUNDRY_ZONE.subject).toBe(SubjectId.Science);
    expect(LOGIC_SPIRE_ZONE.subject).toBe(SubjectId.Mathematics);
  });

  it('derives the zone baseline tier from its average monster level', () => {
    for (const zone of ARCANE_CITY_ZONES) {
      expect(engine.getMonsterBaselineTier(zone.averageMonsterLevel)).toBe(zone.educationalTier);
      expect(zone.educationalTier).toBe(EducationalTier.JuniorHigh);
    }
  });

  it('uses a tier that actually has bundled content for the zone subject', () => {
    for (const zone of ARCANE_CITY_ZONES) {
      const subjectEntry = SUBJECT_TAXONOMY.find((s) => s.id === zone.subject);
      expect(subjectEntry).toBeDefined();
      expect(subjectEntry?.tiers).toContain(zone.educationalTier);
    }
  });

  it('resolves a Junior High profile for an on-level player', () => {
    for (const zone of ARCANE_CITY_ZONES) {
      const profile = engine.createQuestionProfile(
        zone.subject,
        zone.recommendedMinLevel,
        zone.averageMonsterLevel,
      );
      expect(profile.baselineTier).toBe(EducationalTier.JuniorHigh);
      expect(profile.targetTier).toBe(EducationalTier.JuniorHigh);
    }
  });

  it('keeps every spawn config resolvable, subject-matched, and within the level band', () => {
    for (const zone of ARCANE_CITY_ZONES) {
      expect(zone.monsterSpawnConfigs.length).toBeGreaterThan(0);
      for (const cfg of zone.monsterSpawnConfigs) {
        const monster = getMonsterById(cfg.monsterId);
        expect(monster).toBeDefined();
        expect(monster?.subject).toBe(zone.subject);
        expect(monster!.level).toBeGreaterThanOrEqual(zone.recommendedMinLevel);
        expect(monster!.level).toBeLessThanOrEqual(zone.recommendedMaxLevel);
        expect(engine.getMonsterBaselineTier(monster!.level)).toBe(zone.educationalTier);
      }
    }
  });

  it('gives every category in each zone a distinct monster', () => {
    for (const zone of ARCANE_CITY_ZONES) {
      const ids = zone.monsterSpawnConfigs.map((c) => c.monsterId);
      expect(new Set(ids).size).toBe(ids.length);
      const categories = zone.monsterSpawnConfigs.map((c) => c.category);
      expect(new Set(categories).size).toBe(categories.length);
    }
  });
});

// ─── Rewards / drops ─────────────────────────────────────────────────────────

describe('Phase 26.5 — Arcane Technological City rewards and drops', () => {
  const arcaneMonsterIds = ARCANE_CITY_ZONES.flatMap((zone) =>
    zone.monsterSpawnConfigs.map((cfg) => cfg.monsterId),
  );

  it('gives every Arcane City monster positive exp and non-negative gold', () => {
    for (const id of arcaneMonsterIds) {
      const monster = getMonsterById(id)!;
      expect(monster.baseExp).toBeGreaterThan(0);
      expect(monster.baseGold).toBeGreaterThanOrEqual(0);
    }
  });

  it('references only real items in every Arcane City drop table', () => {
    for (const id of arcaneMonsterIds) {
      const monster = getMonsterById(id)!;
      expect(monster.dropConfig).toBeDefined();
      for (const drop of monster.dropConfig.drops) {
        expect(getItemDefinition(drop.itemId)).toBeDefined();
        expect(drop.dropChance).toBeGreaterThan(0);
        expect(drop.dropChance).toBeLessThanOrEqual(1);
        expect(drop.minQuantity).toBeGreaterThanOrEqual(1);
        expect(drop.maxQuantity).toBeGreaterThanOrEqual(drop.minQuantity);
      }
    }
  });
});

// ─── NPC interactions ────────────────────────────────────────────────────────

describe('Phase 26.5 — Arcane Technological City NPC interactions', () => {
  it('places the Arcane City NPCs on the plaza map', () => {
    const ids = getNPCsForMap(MapIds.ArcaneCityPlaza).map((n) => n.id);
    expect(ids).toContain('engineer-vesper');
    expect(ids).toContain('scholar-aeon');
    expect(ids).toContain('artificer-nova');
  });

  it('links the Arcane City quest giver to a registered quest and a real monster target', () => {
    const npc = NPC_REGISTRY['engineer-vesper'];
    expect(npc.type).toBe(NPCType.QuestGiver);
    expect(npc.offeredQuestIds).toContain('quest-arcane-calibration');

    const quest = QUEST_REGISTRY['quest-arcane-calibration'];
    expect(quest).toBeDefined();
    expect(quest.giverNpcId).toBe(npc.id);
    expect(quest.requirements.minLevel).toBe(40);

    for (const objective of quest.objectives) {
      expect(getMonsterById(objective.targetId)).toBeDefined();
    }
  });

  it('uses only real items and subjects in the Arcane City quest rewards', () => {
    const quest = QUEST_REGISTRY['quest-arcane-calibration'];
    expect(quest.rewards.combatExp).toBeGreaterThan(0);
    expect(quest.rewards.gold).toBeGreaterThan(0);
    for (const item of quest.rewards.items ?? []) {
      expect(getItemDefinition(item.itemId)).toBeDefined();
      expect(item.quantity).toBeGreaterThan(0);
    }
    if (quest.rewards.masteryExp) {
      const subject = SUBJECT_TAXONOMY.find((s) => s.id === quest.rewards.masteryExp!.subjectId);
      expect(subject).toBeDefined();
    }
  });
});
