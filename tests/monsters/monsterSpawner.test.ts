import { describe, it, expect } from 'vitest';
import { MonsterSpawner } from '../../src/monsters/MonsterSpawner';
import type { HuntingZoneDefinition } from '../../src/world/HuntingZoneDefinition';
import { ZoneMonsterCategory } from '../../src/world/HuntingZoneDefinition';
import { SubjectId, EducationalTier } from '../../src/core/types/education';
import {
  MATH_HUNTING_ZONE,
  GENERAL_BEGINNER_ZONE,
} from '../../src/world';

// ─── Fixtures ────────────────────────────────────────────────────────────────

/** A minimal zone that references only 'math-slime' (always selected). */
const SINGLE_MONSTER_ZONE: HuntingZoneDefinition = {
  id: 'test-single',
  name: 'Test Zone',
  subject: SubjectId.Mathematics,
  educationalTier: EducationalTier.Elementary,
  recommendedMinLevel: 1,
  recommendedMaxLevel: 5,
  averageMonsterLevel: 3,
  monsterSpawnConfigs: [
    { monsterId: 'math-slime', category: ZoneMonsterCategory.Weak, spawnWeight: 100, maxCount: 5 },
  ],
};

/** A zone with zero weight entries (degenerate). */
const ZERO_WEIGHT_ZONE: HuntingZoneDefinition = {
  ...SINGLE_MONSTER_ZONE,
  id: 'test-zero',
  monsterSpawnConfigs: [
    { monsterId: 'math-slime', category: ZoneMonsterCategory.Weak, spawnWeight: 0, maxCount: 5 },
  ],
};

/** A zone with an unknown monster ID. */
const UNKNOWN_MONSTER_ZONE: HuntingZoneDefinition = {
  ...SINGLE_MONSTER_ZONE,
  id: 'test-unknown',
  monsterSpawnConfigs: [
    { monsterId: 'does-not-exist', category: ZoneMonsterCategory.Weak, spawnWeight: 100, maxCount: 5 },
  ],
};

// ─── selectMonsterFromZone ───────────────────────────────────────────────────

describe('MonsterSpawner.selectMonsterFromZone', () => {
  const spawner = new MonsterSpawner();

  it('returns a valid MonsterDefinition for a real zone', () => {
    const result = spawner.selectMonsterFromZone(MATH_HUNTING_ZONE);
    expect(result).toBeDefined();
    expect(result!.maxHp).toBeGreaterThan(0);
  });

  it('always returns "math-slime" from a single-entry zone', () => {
    for (let i = 0; i < 20; i++) {
      const result = spawner.selectMonsterFromZone(SINGLE_MONSTER_ZONE);
      expect(result).toBeDefined();
      expect(result!.id).toBe('math-slime');
    }
  });

  it('returns undefined for a zone with all-zero weights', () => {
    const result = spawner.selectMonsterFromZone(ZERO_WEIGHT_ZONE);
    expect(result).toBeUndefined();
  });

  it('returns undefined for a zone referencing an unknown monster ID', () => {
    const result = spawner.selectMonsterFromZone(UNKNOWN_MONSTER_ZONE);
    expect(result).toBeUndefined();
  });

  it('returns undefined for a zone with no spawn configs', () => {
    const empty: HuntingZoneDefinition = { ...SINGLE_MONSTER_ZONE, monsterSpawnConfigs: [] };
    expect(spawner.selectMonsterFromZone(empty)).toBeUndefined();
  });

  it('respects zone monster IDs — never returns a monster not in the zone config', () => {
    const validIds = MATH_HUNTING_ZONE.monsterSpawnConfigs.map(c => c.monsterId);
    for (let i = 0; i < 50; i++) {
      const result = spawner.selectMonsterFromZone(MATH_HUNTING_ZONE);
      if (result) {
        expect(validIds).toContain(result.id);
      }
    }
  });

  it('covers all monster IDs in a multi-entry zone over enough iterations', () => {
    const validIds = new Set(GENERAL_BEGINNER_ZONE.monsterSpawnConfigs.map(c => c.monsterId));
    const seen = new Set<string>();

    // With 200 iterations and reasonable weights, all IDs should appear
    for (let i = 0; i < 200; i++) {
      const result = spawner.selectMonsterFromZone(GENERAL_BEGINNER_ZONE);
      if (result) seen.add(result.id);
    }

    for (const id of validIds) {
      expect(seen.has(id)).toBe(true);
    }
  });
});

// ─── generateSpawnPositions ──────────────────────────────────────────────────

describe('MonsterSpawner.generateSpawnPositions', () => {
  const spawner = new MonsterSpawner();
  const bounds = { width: 1200, height: 900 };

  it('returns exactly the requested count of positions', () => {
    const positions = spawner.generateSpawnPositions(bounds, 6);
    expect(positions).toHaveLength(6);
  });

  it('returns zero positions when count is 0', () => {
    expect(spawner.generateSpawnPositions(bounds, 0)).toHaveLength(0);
  });

  it('all positions are within usable map bounds', () => {
    const margin = 80;
    const positions = spawner.generateSpawnPositions(bounds, 10, { minMargin: margin });
    for (const pos of positions) {
      expect(pos.x).toBeGreaterThanOrEqual(margin);
      expect(pos.x).toBeLessThanOrEqual(bounds.width - margin);
      expect(pos.y).toBeGreaterThanOrEqual(margin);
      expect(pos.y).toBeLessThanOrEqual(bounds.height - margin);
    }
  });

  it('each position has numeric x and y', () => {
    const positions = spawner.generateSpawnPositions(bounds, 5);
    for (const pos of positions) {
      expect(typeof pos.x).toBe('number');
      expect(typeof pos.y).toBe('number');
    }
  });

  it('handles degenerate tiny bounds without hanging', () => {
    const tinyBounds = { width: 10, height: 10 };
    const positions = spawner.generateSpawnPositions(tinyBounds, 3, { minMargin: 80 });
    expect(positions).toHaveLength(3);
  });
});

// ─── generateSpawnPlan ───────────────────────────────────────────────────────

describe('MonsterSpawner.generateSpawnPlan', () => {
  const spawner = new MonsterSpawner();
  const bounds = { width: 1200, height: 900 };

  it('returns pairs with definition and position', () => {
    const plan = spawner.generateSpawnPlan(MATH_HUNTING_ZONE, bounds, 4);
    expect(plan.length).toBeGreaterThan(0);
    for (const entry of plan) {
      expect(entry.definition).toBeDefined();
      expect(entry.position).toBeDefined();
      expect(entry.definition.maxHp).toBeGreaterThan(0);
    }
  });

  it('returns empty array for unknown-monster zone', () => {
    const plan = spawner.generateSpawnPlan(UNKNOWN_MONSTER_ZONE, bounds, 3);
    expect(plan).toHaveLength(0);
  });
});
