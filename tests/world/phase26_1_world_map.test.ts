import { describe, it, expect } from 'vitest';
import type { RegionDefinition } from '../../src/world/RegionDefinition';
import { RegionAccessState, RegionIds } from '../../src/world/RegionDefinition';
import {
  REGION_REGISTRY,
  STARTING_REGION_ID,
  WORLD_REGIONS,
} from '../../src/world/regions';
import {
  deriveDiscoveredRegions,
  evaluateAllRegionAccess,
  isRegionUnlockSatisfied,
  validateRegionGraph,
} from '../../src/world/regionAccess';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function region(overrides: Partial<RegionDefinition> & { id: string }): RegionDefinition {
  return {
    name: overrides.id,
    description: '',
    order: 1,
    recommendedLevel: { min: null, max: null },
    unlock: { minLevel: null, requiresDiscovery: false },
    travelPoints: [],
    mapIds: [],
    provisional: true,
    ...overrides,
  };
}

function stateOf(
  results: ReturnType<typeof evaluateAllRegionAccess>,
  regionId: string,
): RegionAccessState {
  const found = results.find((r) => r.regionId === regionId);
  if (!found) throw new Error(`No result for region "${regionId}"`);
  return found.state;
}

// ─── Configuration integrity ─────────────────────────────────────────────────

describe('Phase 26.1 — region configuration', () => {
  it('defines exactly the seven planned regions', () => {
    expect(WORLD_REGIONS).toHaveLength(7);
    expect(Object.keys(REGION_REGISTRY).sort()).toEqual(
      Object.values(RegionIds).sort(),
    );
  });

  it('lists regions in a unique, sequential display order', () => {
    const orders = WORLD_REGIONS.map((r) => r.order);
    expect(new Set(orders).size).toBe(orders.length);
    expect([...orders].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('marks every region as provisional (draft values pending approval)', () => {
    expect(WORLD_REGIONS.every((r) => r.provisional)).toBe(true);
  });

  it('starts the player in the Beginners Village, ungated by discovery', () => {
    expect(STARTING_REGION_ID).toBe(RegionIds.BeginnersVillage);
    const start = REGION_REGISTRY[RegionIds.BeginnersVillage];
    expect(start.unlock.minLevel).toBe(1);
    expect(start.unlock.requiresDiscovery).toBe(false);
  });

  it('links the existing Beginners Village maps to the starting region', () => {
    const start = REGION_REGISTRY[RegionIds.BeginnersVillage];
    expect(start.mapIds).toContain('beginners-village');
    expect(start.mapIds).toContain('beginners-hunting-ground');
  });
});

// ─── Unlock level vs recommended level ───────────────────────────────────────

describe('Phase 26.1 — unlock requirement vs recommended level', () => {
  it('treats a null unlock level as "no gate" (never blocks)', () => {
    const ungated = region({ id: 'x' });
    expect(isRegionUnlockSatisfied(ungated, 1)).toBe(true);
  });

  it('satisfies the unlock gate only once the player reaches minLevel', () => {
    const gated = region({ id: 'g', unlock: { minLevel: 20, requiresDiscovery: true } });
    expect(isRegionUnlockSatisfied(gated, 19)).toBe(false);
    expect(isRegionUnlockSatisfied(gated, 20)).toBe(true);
    expect(isRegionUnlockSatisfied(gated, 99)).toBe(true);
  });

  it('keeps recommended level separate from the unlock level', () => {
    const advisory = region({
      id: 'advisory',
      recommendedLevel: { min: 50, max: 60 },
      unlock: { minLevel: null, requiresDiscovery: false },
    });
    // Recommended level says 50+, but there is no hard gate: a level-1 player
    // is not locked out.
    expect(isRegionUnlockSatisfied(advisory, 1)).toBe(true);

    const results = evaluateAllRegionAccess([advisory], {
      playerLevel: 1,
      currentRegionId: 'advisory',
    });
    expect(results[0].state).toBe(RegionAccessState.Available);
    expect(results[0].recommendedLevel).toEqual({ min: 50, max: 60 });
  });
});

// ─── Discovery derivation (level + adjacency, no persistence) ────────────────

describe('Phase 26.1 — derived discovery', () => {
  it('reveals only the current region and its open neighbour at level 1', () => {
    const discovered = deriveDiscoveredRegions(
      WORLD_REGIONS,
      1,
      RegionIds.BeginnersVillage,
    );
    expect([...discovered].sort()).toEqual(
      [RegionIds.BeginnersVillage, RegionIds.EmeraldForest].sort(),
    );
  });

  it('reveals the next region once the frontier is unlocked', () => {
    const discovered = deriveDiscoveredRegions(
      WORLD_REGIONS,
      10,
      RegionIds.BeginnersVillage,
    );
    expect(discovered.has(RegionIds.EmeraldForest)).toBe(true);
    expect(discovered.has(RegionIds.IronholdKingdom)).toBe(true);
    expect(discovered.has(RegionIds.GoldenCapital)).toBe(false);
  });

  it('returns an empty set when the current region is unknown', () => {
    const discovered = deriveDiscoveredRegions(WORLD_REGIONS, 50, 'not-a-region');
    expect(discovered.size).toBe(0);
  });
});

// ─── Locked / unlocked / available states ────────────────────────────────────

describe('Phase 26.1 — region access states', () => {
  it('has only the starting region available at level 1', () => {
    const results = evaluateAllRegionAccess(WORLD_REGIONS, {
      playerLevel: 1,
      currentRegionId: RegionIds.BeginnersVillage,
    });

    expect(results).toHaveLength(7);
    expect(results.map((r) => r.regionId)).toEqual(WORLD_REGIONS.map((r) => r.id));
    expect(stateOf(results, RegionIds.BeginnersVillage)).toBe(RegionAccessState.Available);
    expect(stateOf(results, RegionIds.EmeraldForest)).toBe(RegionAccessState.Locked);
    expect(stateOf(results, RegionIds.IronholdKingdom)).toBe(RegionAccessState.Locked);
  });

  it('reports locked reasons for gated and undiscovered regions', () => {
    const results = evaluateAllRegionAccess(WORLD_REGIONS, {
      playerLevel: 1,
      currentRegionId: RegionIds.BeginnersVillage,
    });

    const emerald = results.find((r) => r.regionId === RegionIds.EmeraldForest)!;
    expect(emerald.unlockSatisfied).toBe(false);
    expect(emerald.reasons.some((r) => r.includes('level 10'))).toBe(true);

    const ironhold = results.find((r) => r.regionId === RegionIds.IronholdKingdom)!;
    expect(ironhold.discovered).toBe(false);
    expect(ironhold.reasons).toContain('Region not yet discovered.');
  });

  it('makes the adjacent region available once its unlock level is reached', () => {
    const results = evaluateAllRegionAccess(WORLD_REGIONS, {
      playerLevel: 10,
      currentRegionId: RegionIds.BeginnersVillage,
    });

    expect(stateOf(results, RegionIds.EmeraldForest)).toBe(RegionAccessState.Available);
    expect(stateOf(results, RegionIds.IronholdKingdom)).toBe(RegionAccessState.Locked);
  });

  it('distinguishes an open-but-not-adjacent region (unlocked) from an adjacent one (available)', () => {
    const results = evaluateAllRegionAccess(WORLD_REGIONS, {
      playerLevel: 20,
      currentRegionId: RegionIds.IronholdKingdom,
    });

    // Current region and its direct neighbour are enterable now.
    expect(stateOf(results, RegionIds.IronholdKingdom)).toBe(RegionAccessState.Available);
    expect(stateOf(results, RegionIds.EmeraldForest)).toBe(RegionAccessState.Available);

    // Village is discovered and open, but only reachable through Emerald Forest.
    expect(stateOf(results, RegionIds.BeginnersVillage)).toBe(RegionAccessState.Unlocked);

    // Golden Capital's level gate is not yet met.
    expect(stateOf(results, RegionIds.GoldenCapital)).toBe(RegionAccessState.Locked);
  });

  it('honours an explicitly supplied discovered set', () => {
    const results = evaluateAllRegionAccess(WORLD_REGIONS, {
      playerLevel: 10,
      currentRegionId: RegionIds.BeginnersVillage,
      discoveredRegionIds: [RegionIds.BeginnersVillage],
    });

    // Level gate satisfied, but Emerald Forest was not supplied as discovered.
    expect(stateOf(results, RegionIds.EmeraldForest)).toBe(RegionAccessState.Locked);
  });
});

// ─── Travel point / graph validation ─────────────────────────────────────────

describe('Phase 26.1 — travel point validation', () => {
  it('accepts the shipped region graph', () => {
    const validation = validateRegionGraph(WORLD_REGIONS);
    expect(validation.errors).toEqual([]);
    expect(validation.valid).toBe(true);
  });

  it('rejects a travel point without a return travel point', () => {
    const validation = validateRegionGraph([
      region({ id: 'a', order: 1, travelPoints: [{ targetRegionId: 'b', label: 'to b' }] }),
      region({ id: 'b', order: 2 }),
    ]);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes('no return travel point'))).toBe(true);
  });

  it('rejects a travel point that references an unknown region', () => {
    const validation = validateRegionGraph([
      region({ id: 'a', order: 1, travelPoints: [{ targetRegionId: 'ghost', label: 'nowhere' }] }),
    ]);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes('unknown region'))).toBe(true);
  });

  it('rejects a self-referencing travel point', () => {
    const validation = validateRegionGraph([
      region({ id: 'a', order: 1, travelPoints: [{ targetRegionId: 'a', label: 'loop' }] }),
    ]);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes('self-referencing'))).toBe(true);
  });

  it('rejects duplicate region ids and duplicate display orders', () => {
    const validation = validateRegionGraph([
      region({ id: 'a', order: 1 }),
      region({ id: 'a', order: 2 }),
      region({ id: 'b', order: 2 }),
    ]);
    expect(validation.errors.some((e) => e.includes('Duplicate region id'))).toBe(true);
    expect(validation.errors.some((e) => e.includes('share order'))).toBe(true);
  });
});
