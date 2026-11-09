import type { AllocatableStat } from '../config/statAllocationConfig';

/**
 * Per-stat allocation point counts.
 * Tracks how many stat points the player has invested into each allocatable stat.
 */
export type AllocatedStats = Record<AllocatableStat, number>;

/** Default allocation map — zero points in every stat. */
export const DEFAULT_ALLOCATED_STATS: AllocatedStats = {
  hp: 0,
  mp: 0,
  attack: 0,
  defense: 0,
  intelligence: 0,
  critRate: 0,
};

/**
 * Typed player data model.
 *
 * Stores raw character state and combat attributes.
 * Contains no leveling logic or stat calculation formulas.
 *
 * Stats on this object represent base stats (level-derived + allocated).
 * Equipment and passive bonuses are layered on top at runtime via EquipmentStatCalculator.
 */
export interface PlayerData {
  /** Unique player identifier. */
  id: string;
  /** Character display name. */
  name: string;
  /** Current character level. */
  level: number;
  /** Accumulated character EXP toward next level. */
  currentExp: number;
  /** Maximum health points. */
  maxHp: number;
  /** Current health points. */
  currentHp: number;
  /** Maximum mana points. */
  maxMp: number;
  /** Current mana points. */
  currentMp: number;
  /** Base attack power. */
  attack: number;
  /** Base defense power. */
  defense: number;
  /** Base intelligence. */
  intelligence: number;
  /** Critical strike rate (percentage 0–100). */
  critRate: number;
  /** Movement speed multiplier. */
  movementSpeed: number;
  /** Unspent stat points available for allocation. */
  unallocatedStatPoints: number;
  /** Points invested per allocatable stat. */
  allocatedStats: AllocatedStats;
}

/** Initial default attributes for a level 1 novice character. */
export const DEFAULT_INITIAL_PLAYER_DATA: Omit<PlayerData, 'id' | 'name'> = {
  level: 1,
  currentExp: 0,
  maxHp: 100,
  currentHp: 100,
  maxMp: 50,
  currentMp: 50,
  attack: 10,
  defense: 5,
  intelligence: 8,
  critRate: 5,
  movementSpeed: 1.0,
  unallocatedStatPoints: 0,
  allocatedStats: { ...DEFAULT_ALLOCATED_STATS },
};

/**
 * Factory to create a new typed player instance.
 */
export function createPlayerData(
  id: string,
  name: string,
  overrides: Partial<Omit<PlayerData, 'id' | 'name'>> = {},
): PlayerData {
  return {
    id,
    name,
    ...DEFAULT_INITIAL_PLAYER_DATA,
    allocatedStats: { ...DEFAULT_ALLOCATED_STATS },
    ...overrides,
  };
}
