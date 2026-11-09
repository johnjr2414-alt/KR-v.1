/**
 * Configuration for the stat point allocation system.
 *
 * Players receive a configurable number of stat points per level-up,
 * which they can distribute among allocatable stats.
 */

/** The stats a player can allocate points into. */
export type AllocatableStat = 'hp' | 'mp' | 'attack' | 'defense' | 'intelligence' | 'critRate';

/** All valid allocatable stat keys. */
export const ALLOCATABLE_STATS: readonly AllocatableStat[] = [
  'hp',
  'mp',
  'attack',
  'defense',
  'intelligence',
  'critRate',
] as const;

/** How much each allocated point boosts the associated stat. */
export interface StatPointGains {
  readonly hp: number;
  readonly mp: number;
  readonly attack: number;
  readonly defense: number;
  readonly intelligence: number;
  readonly critRate: number;
}

/** Full stat allocation configuration. */
export interface StatAllocationConfig {
  /** Number of stat points granted per level-up. */
  readonly pointsPerLevel: number;
  /** Per-point gains for each allocatable stat. */
  readonly gains: StatPointGains;
  /** Maximum points that can be allocated to a single stat (0 = unlimited). */
  readonly maxPointsPerStat: number;
}

/** Default stat allocation configuration. */
export const DEFAULT_STAT_ALLOCATION_CONFIG: StatAllocationConfig = {
  pointsPerLevel: 5,
  gains: {
    hp: 10,
    mp: 5,
    attack: 1,
    defense: 1,
    intelligence: 1,
    critRate: 0.5,
  },
  maxPointsPerStat: 0, // 0 = unlimited
};
