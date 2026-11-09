import type { RegionDefinition } from './RegionDefinition';
import { RegionAccessState } from './RegionDefinition';

/**
 * Headless world-map navigation rules.
 *
 * Given the player's level and current region, this module computes, for every
 * region, whether it is locked, unlocked, or available. It performs no
 * rendering and reads no UI state, so the rules stay independent of the world
 * map presentation layer.
 *
 * Discovery is **derived** (never persisted): starting from the current region,
 * a region becomes discovered when it is directly connected to an already
 * discovered region whose unlock *level* is satisfied. This makes exploration
 * reveal the frontier as the player levels up, without a save-schema change.
 */

/** Inputs required to evaluate region access. */
export interface RegionAccessOptions {
  /** The player's current character level. */
  playerLevel: number;
  /** The region the player is currently in (seeds discovery + availability). */
  currentRegionId: string;
  /**
   * Optional explicit set of discovered region IDs. When omitted, discovery is
   * derived from the world graph via {@link deriveDiscoveredRegions}. The
   * current region is always treated as discovered.
   */
  discoveredRegionIds?: Iterable<string>;
}

/** Per-region evaluation result. */
export interface RegionAccessResult {
  regionId: string;
  state: RegionAccessState;
  /** Whether the region has been discovered (derived or supplied). */
  discovered: boolean;
  /** Whether the hard unlock level requirement is satisfied. */
  unlockSatisfied: boolean;
  /** Whether the player can enter this region right now from the current one. */
  reachableNow: boolean;
  /** Advisory recommended level range (never used to lock). */
  recommendedLevel: { min: number | null; max: number | null };
  /** Human-readable reasons a region is locked (empty when not locked). */
  reasons: string[];
}

/** Result of validating the region graph's travel points. */
export interface RegionGraphValidation {
  valid: boolean;
  errors: string[];
}

/** True when the region's hard level gate is satisfied (`null` = no gate). */
export function isRegionUnlockSatisfied(
  region: RegionDefinition,
  playerLevel: number,
): boolean {
  return region.unlock.minLevel === null || playerLevel >= region.unlock.minLevel;
}

/**
 * Derives the set of discovered regions without any persistence.
 *
 * Starts from `currentRegionId` and repeatedly reveals the direct neighbours of
 * each discovered region whose unlock level is satisfied — i.e. the player
 * "sees" the next region once the current one is open to them.
 */
export function deriveDiscoveredRegions(
  regions: readonly RegionDefinition[],
  playerLevel: number,
  currentRegionId: string,
): Set<string> {
  const byId = new Map(regions.map((region) => [region.id, region]));
  const discovered = new Set<string>();
  if (!byId.has(currentRegionId)) return discovered;

  discovered.add(currentRegionId);
  const queue: string[] = [currentRegionId];

  while (queue.length > 0) {
    const id = queue.shift() as string;
    const region = byId.get(id);
    if (!region) continue;
    if (!isRegionUnlockSatisfied(region, playerLevel)) continue;

    for (const point of region.travelPoints) {
      const target = byId.get(point.targetRegionId);
      if (!target || discovered.has(target.id)) continue;
      discovered.add(target.id);
      queue.push(target.id);
    }
  }

  return discovered;
}

/**
 * Evaluates every region's access state for the given player context.
 *
 * Regions are returned in display order.
 */
export function evaluateAllRegionAccess(
  regions: readonly RegionDefinition[],
  options: RegionAccessOptions,
): RegionAccessResult[] {
  const byId = new Map(regions.map((region) => [region.id, region]));

  const discovered = options.discoveredRegionIds
    ? new Set(options.discoveredRegionIds)
    : deriveDiscoveredRegions(regions, options.playerLevel, options.currentRegionId);
  if (byId.has(options.currentRegionId)) discovered.add(options.currentRegionId);

  // Regions directly reachable right now: the current region plus its neighbours.
  const reachableIds = new Set<string>([options.currentRegionId]);
  const currentRegion = byId.get(options.currentRegionId);
  if (currentRegion) {
    for (const point of currentRegion.travelPoints) {
      reachableIds.add(point.targetRegionId);
    }
  }

  return [...regions]
    .sort((a, b) => a.order - b.order)
    .map((region) => {
      const unlockSatisfied = isRegionUnlockSatisfied(region, options.playerLevel);
      const isDiscovered = discovered.has(region.id);
      const discoverySatisfied = !region.unlock.requiresDiscovery || isDiscovered;
      const reachableNow = reachableIds.has(region.id);

      const reasons: string[] = [];
      if (!isDiscovered && region.unlock.requiresDiscovery) {
        reasons.push('Region not yet discovered.');
      }
      if (!unlockSatisfied) {
        reasons.push(`Requires character level ${region.unlock.minLevel}.`);
      }

      let state: RegionAccessState;
      if (!unlockSatisfied || !discoverySatisfied) {
        state = RegionAccessState.Locked;
      } else if (reachableNow) {
        state = RegionAccessState.Available;
      } else {
        state = RegionAccessState.Unlocked;
      }

      return {
        regionId: region.id,
        state,
        discovered: isDiscovered,
        unlockSatisfied,
        reachableNow,
        recommendedLevel: region.recommendedLevel,
        reasons,
      };
    });
}

/**
 * Validates the region graph's travel points.
 *
 * Checks that: region IDs are unique, display orders are unique, no travel point
 * is self-referencing or references an unknown region, and every travel point
 * has a matching return travel point (so "return travel" is always valid).
 */
export function validateRegionGraph(
  regions: readonly RegionDefinition[],
): RegionGraphValidation {
  const errors: string[] = [];

  const byId = new Map<string, RegionDefinition>();
  for (const region of regions) {
    if (byId.has(region.id)) {
      errors.push(`Duplicate region id "${region.id}".`);
      continue;
    }
    byId.set(region.id, region);
  }

  const seenOrders = new Map<number, string>();
  for (const region of regions) {
    const existingOrder = seenOrders.get(region.order);
    if (existingOrder !== undefined) {
      errors.push(`Regions "${existingOrder}" and "${region.id}" share order ${region.order}.`);
    } else {
      seenOrders.set(region.order, region.id);
    }

    for (const point of region.travelPoints) {
      if (point.targetRegionId === region.id) {
        errors.push(`Region "${region.id}" has a self-referencing travel point.`);
        continue;
      }
      const target = byId.get(point.targetRegionId);
      if (!target) {
        errors.push(
          `Region "${region.id}" travel point references unknown region "${point.targetRegionId}".`,
        );
        continue;
      }
      const hasReturn = target.travelPoints.some((t) => t.targetRegionId === region.id);
      if (!hasReturn) {
        errors.push(
          `Travel point "${region.id}" → "${point.targetRegionId}" has no return travel point.`,
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
