import type { PlayerData, AllocatedStats } from '../../player/PlayerData';
import { DEFAULT_ALLOCATED_STATS } from '../../player/PlayerData';
import {
  type AllocatableStat,
  type StatAllocationConfig,
  ALLOCATABLE_STATS,
  DEFAULT_STAT_ALLOCATION_CONFIG,
} from '../../config/statAllocationConfig';
import { calculateStatsForLevel } from './StatGrowthService';
import type { StatGrowthConfig } from '../../config/statGrowthConfig';
import { DEFAULT_STAT_GROWTH_CONFIG } from '../../config/statGrowthConfig';

/** Result of an allocation attempt. */
export interface AllocationResult {
  success: boolean;
  error?: string;
  player: PlayerData;
}

/**
 * Calculates the total stat points a player should have earned by a given level.
 * Level 1 grants 0 points; each subsequent level grants `pointsPerLevel`.
 */
export function getTotalStatPointsForLevel(
  level: number,
  config: StatAllocationConfig = DEFAULT_STAT_ALLOCATION_CONFIG,
): number {
  if (level < 1) return 0;
  return (level - 1) * config.pointsPerLevel;
}

/**
 * Calculates how many points have been spent across all stats.
 */
export function getTotalAllocatedPoints(allocated: AllocatedStats): number {
  let total = 0;
  for (const stat of ALLOCATABLE_STATS) {
    total += allocated[stat];
  }
  return total;
}

/**
 * Calculates stat bonuses from allocated points.
 */
export function calculateAllocationBonuses(
  allocated: AllocatedStats,
  config: StatAllocationConfig = DEFAULT_STAT_ALLOCATION_CONFIG,
): Record<AllocatableStat, number> {
  return {
    hp: allocated.hp * config.gains.hp,
    mp: allocated.mp * config.gains.mp,
    attack: allocated.attack * config.gains.attack,
    defense: allocated.defense * config.gains.defense,
    intelligence: allocated.intelligence * config.gains.intelligence,
    critRate: allocated.critRate * config.gains.critRate,
  };
}

/**
 * Recomputes a player's stats from: base(level) + allocation bonuses.
 * Does NOT include equipment or passive skill bonuses (those are layered at runtime).
 * Adjusts currentHp/currentMp proportionally when maximums change.
 */
export function recomputePlayerStats(
  player: PlayerData,
  allocationConfig: StatAllocationConfig = DEFAULT_STAT_ALLOCATION_CONFIG,
  growthConfig: StatGrowthConfig = DEFAULT_STAT_GROWTH_CONFIG,
): PlayerData {
  const baseStats = calculateStatsForLevel(player.level, growthConfig);
  const bonuses = calculateAllocationBonuses(player.allocatedStats, allocationConfig);

  const newMaxHp = baseStats.maxHp + bonuses.hp;
  const newMaxMp = baseStats.maxMp + bonuses.mp;

  const hpDiff = newMaxHp - player.maxHp;
  const mpDiff = newMaxMp - player.maxMp;

  player.maxHp = newMaxHp;
  player.currentHp = Math.min(player.maxHp, player.currentHp + Math.max(0, hpDiff));

  player.maxMp = newMaxMp;
  player.currentMp = Math.min(player.maxMp, player.currentMp + Math.max(0, mpDiff));

  player.attack = Math.round((baseStats.attack + bonuses.attack) * 10) / 10;
  player.defense = Math.round((baseStats.defense + bonuses.defense) * 10) / 10;
  player.intelligence = Math.round((baseStats.intelligence + bonuses.intelligence) * 10) / 10;
  player.critRate = baseStats.critRate + bonuses.critRate;
  player.movementSpeed = baseStats.movementSpeed;

  return player;
}

/**
 * Allocates stat points for the player.
 *
 * @param player - The player to allocate points for (mutated in place).
 * @param stat - The stat to allocate points into.
 * @param points - Number of points to allocate (must be positive integer).
 * @param config - Allocation config for gains and limits.
 * @param growthConfig - Stat growth config for base stat recalculation.
 * @returns AllocationResult with success/error and the updated player.
 */
export function allocateStatPoints(
  player: PlayerData,
  stat: AllocatableStat,
  points: number,
  config: StatAllocationConfig = DEFAULT_STAT_ALLOCATION_CONFIG,
  growthConfig: StatGrowthConfig = DEFAULT_STAT_GROWTH_CONFIG,
): AllocationResult {
  // Validate stat name
  if (!ALLOCATABLE_STATS.includes(stat)) {
    return { success: false, error: `Invalid stat: ${stat}`, player };
  }

  // Validate points amount
  if (!Number.isInteger(points) || points < 1) {
    return { success: false, error: `Points must be a positive integer, received ${points}`, player };
  }

  // Check available points
  if (points > player.unallocatedStatPoints) {
    return {
      success: false,
      error: `Not enough stat points. Available: ${player.unallocatedStatPoints}, requested: ${points}`,
      player,
    };
  }

  // Check per-stat cap if configured
  if (config.maxPointsPerStat > 0) {
    const currentInStat = player.allocatedStats[stat];
    if (currentInStat + points > config.maxPointsPerStat) {
      return {
        success: false,
        error: `Cannot exceed ${config.maxPointsPerStat} points in ${stat}. Currently: ${currentInStat}`,
        player,
      };
    }
  }

  // Perform allocation
  player.allocatedStats[stat] += points;
  player.unallocatedStatPoints -= points;

  // Recompute stats with new allocation
  recomputePlayerStats(player, config, growthConfig);

  return { success: true, player };
}

/**
 * Migrates a legacy player (no stat points) to the allocation system.
 * Grants unallocated points retroactively based on current level.
 * Does NOT touch existing stats — they remain as-is until the player allocates.
 */
export function migratePlayerToStatAllocation(
  player: PlayerData,
  config: StatAllocationConfig = DEFAULT_STAT_ALLOCATION_CONFIG,
): PlayerData {
  if (!player.allocatedStats) {
    player.allocatedStats = { ...DEFAULT_ALLOCATED_STATS };
  }

  const totalEarned = getTotalStatPointsForLevel(player.level, config);
  const totalSpent = getTotalAllocatedPoints(player.allocatedStats);
  player.unallocatedStatPoints = Math.max(0, totalEarned - totalSpent);

  return player;
}
