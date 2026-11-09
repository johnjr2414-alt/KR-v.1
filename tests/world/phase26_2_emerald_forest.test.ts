import { describe, it, expect } from 'vitest';
import {
  BEGINNERS_VILLAGE,
  EMERALD_FOREST_MAPS,
  EMERALD_FOREST_OUTPOST,
  EMERALD_FOREST_ZONES,
  HUNTING_ZONE_REGISTRY,
  HuntingZoneIds,
  MAP_REGISTRY,
  MapIds,
  REGION_REGISTRY,
  RUNESTONE_GROVE,
  RUNESTONE_GROVE_ZONE,
  VERDANT_GLADE,
  VERDANT_GLADE_ZONE,
  validateMapGraph,
  ZoneType,
} from '../../src/world';
import { getMonsterById } from '../../src/monsters/monsterData';
import { monsterSpawner } from '../../src/monsters';
import { EducationalTier, SubjectId } from '../../src/core/types/education';
import { RegionIds } from '../../src/world/RegionDefinition';
import { DifficultyEngine } from '../../src/questions/retrieval/DifficultyEngine';
import { SUBJECT_TAXONOMY } from '../../src/questions/taxonomy/TaxonomyData';
import { checkZoneAccess } from '../../src/world/zoneAccess';

const FOREST_MAP_IDS = EMERALD_FOREST_MAPS.map((m) => m.id);

// ─── Configuration integrity ─────────────────────────────────────────────────

describe('Phase 26.2 — Emerald Forest map configuration', () => {
  it('defines the outpost plus two hunting grounds', () => {
    expect(EMERALD_FOREST_MAPS).toHaveLength(3);
    expect(EMERALD_FOREST_OUTPOST.zoneType).toBe(ZoneType.Town);
    expect(VERDANT_GLADE.zoneType).toBe(ZoneType.HuntingGround);
    expect(RUNESTONE_GROVE.zoneType).toBe(ZoneType.HuntingGround);
  });

  it('registers every Emerald Forest map in the world registry', () => {
    for (const id of FOREST_MAP_IDS) {
      expect(MAP_REGISTRY[id]).toBeDefined();
      expect(MAP_REGISTRY[id].id).toBe(id);
    }
  });

  it('marks the region with the Emerald Forest maps', () => {
    const region = REGION_REGISTRY[RegionIds.EmeraldForest];
    expect(region).toBeDefined();
    for (const id of FOREST_MAP_IDS) {
      expect(region.mapIds).toContain(id);
    }
  });

  it('does not alter the Beginners Village connections (region trail is a navigation concern)', () => {
    const targets = BEGINNERS_VILLAGE.connections.map((c) => c.targetMapId);
    for (const id of FOREST_MAP_IDS) {
      expect(targets).not.toContain(id);
    }
  });

  it('defines collision obstacles within each map', () => {
    for (const map of EMERALD_FOREST_MAPS) {
      expect(map.collisionRects.length).toBeGreaterThan(0);
    }
  });
});

// ─── Map graph / transitions ─────────────────────────────────────────────────

describe('Phase 26.2 — Emerald Forest transitions', () => {
  it('passes map-graph validation with bidirectional routes', () => {
    const validation = validateMapGraph(EMERALD_FOREST_MAPS, { requireBidirectional: true });
    expect(validation.errors).toEqual([]);
    expect(validation.valid).toBe(true);
  });

  it('connects the outpost to both hunting grounds and back', () => {
    const outpostTargets = EMERALD_FOREST_OUTPOST.connections.map((c) => c.targetMapId);
    expect(outpostTargets).toContain(MapIds.VerdantGlade);
    expect(outpostTargets).toContain(MapIds.RunestoneGrove);

    expect(VERDANT_GLADE.connections.some((c) => c.targetMapId === MapIds.EmeraldForestOutpost)).toBe(true);
    expect(RUNESTONE_GROVE.connections.some((c) => c.targetMapId === MapIds.EmeraldForestOutpost)).toBe(true);
  });

  it('rejects a connection whose entry point is outside the target bounds', () => {
    const broken = {
      ...VERDANT_GLADE,
      connections: [
        {
          targetMapId: MapIds.EmeraldForestOutpost,
          exitPosition: { x: 40, y: 300 },
          entryPosition: { x: 99999, y: 300 },
          exitWidth: 40,
          exitHeight: 100,
        },
      ],
    };
    const validation = validateMapGraph([EMERALD_FOREST_OUTPOST, broken]);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes('entry point'))).toBe(true);
  });
});

// ─── Spawn bounds ────────────────────────────────────────────────────────────

describe('Phase 26.2 — Emerald Forest spawn bounds', () => {
  it('keeps generated spawn positions inside every forest map', () => {
    for (const map of EMERALD_FOREST_MAPS) {
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

  it('produces a full spawn plan for both Emerald zones within map bounds', () => {
    for (const zone of EMERALD_FOREST_ZONES) {
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

// ─── Zones: subject / tier profiles ──────────────────────────────────────────

describe('Phase 26.2 — Emerald Forest hunting zones', () => {
  const engine = new DifficultyEngine();

  it('registers both Emerald zones', () => {
    expect(HUNTING_ZONE_REGISTRY[HuntingZoneIds.VerdantGlade]).toBeDefined();
    expect(HUNTING_ZONE_REGISTRY[HuntingZoneIds.RunestoneGrove]).toBeDefined();
    expect(VERDANT_GLADE_ZONE.subject).toBe(SubjectId.Science);
    expect(RUNESTONE_GROVE_ZONE.subject).toBe(SubjectId.Mathematics);
  });

  it('derives the zone baseline tier from its average monster level', () => {
    for (const zone of EMERALD_FOREST_ZONES) {
      expect(engine.getMonsterBaselineTier(zone.averageMonsterLevel)).toBe(zone.educationalTier);
    }
  });

  it('uses a tier that actually has bundled content for the zone subject', () => {
    for (const zone of EMERALD_FOREST_ZONES) {
      const subjectEntry = SUBJECT_TAXONOMY.find((s) => s.id === zone.subject);
      expect(subjectEntry).toBeDefined();
      expect(subjectEntry?.tiers).toContain(zone.educationalTier);
    }
  });

  it('keeps every spawn config resolvable, subject-matched, and within the level band', () => {
    for (const zone of EMERALD_FOREST_ZONES) {
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
});

// ─── Battle difficulty & risk ────────────────────────────────────────────────

describe('Phase 26.2 — Emerald Forest battle difficulty', () => {
  const engine = new DifficultyEngine();

  it('resolves a Junior High profile for an on-level player', () => {
    const zone = VERDANT_GLADE_ZONE;
    const profile = engine.createQuestionProfile(zone.subject, 13, zone.averageMonsterLevel);
    expect(profile.baselineTier).toBe(EducationalTier.JuniorHigh);
    expect(profile.targetTier).toBe(EducationalTier.JuniorHigh);
  });

  it('does not warn an on-level player entering the region', () => {
    for (const zone of EMERALD_FOREST_ZONES) {
      const check = checkZoneAccess(zone.recommendedMinLevel, zone.averageMonsterLevel, zone.name, zone.recommendedMinLevel);
      expect(check.isDangerous).toBe(false);
    }
  });

  it('warns an under-leveled player entering the region', () => {
    const zone = VERDANT_GLADE_ZONE;
    const check = checkZoneAccess(1, zone.averageMonsterLevel, zone.name, zone.recommendedMinLevel);
    expect(check.isDangerous).toBe(true);
  });
});
