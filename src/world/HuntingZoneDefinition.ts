import type { SubjectId, EducationalTier } from '../core/types/education';

/**
 * Monster category determines question count and combat intensity.
 * Mirrors MonsterCategory but kept here to avoid circular imports.
 */
export enum ZoneMonsterCategory {
  Weak = 'weak',
  Normal = 'normal',
  Strong = 'strong',
  Elite = 'elite',
  Boss = 'boss',
}

/**
 * Configuration for a monster slot within a hunting zone.
 * Actual monster stats live in monster data files (Phase 7).
 */
export interface MonsterSpawnConfig {
  /** Monster definition ID. */
  monsterId: string;
  /** Category controlling question count range. */
  category: ZoneMonsterCategory;
  /** Spawn weight (relative frequency compared to other entries). */
  spawnWeight: number;
  /** Maximum simultaneous instances of this monster in the zone. */
  maxCount: number;
}

/**
 * Danger level used for zone access warning display.
 */
export enum ZoneDangerLevel {
  Safe = 'safe',      // Player level is within or above recommended range
  Caution = 'caution', // Monster is moderately above player level (1–4 Δ)
  Danger = 'danger',  // Monster is significantly above player level (5–9 Δ)
  Extreme = 'extreme', // Monster is far above player level (10+ Δ)
}

/**
 * Complete typed definition of a hunting zone.
 */
export interface HuntingZoneDefinition {
  /** Unique zone identifier. */
  id: string;
  /** Display name. */
  name: string;
  /** Academic subject of monsters in this zone. */
  subject: SubjectId;
  /** Baseline educational tier mapped from monster level. */
  educationalTier: EducationalTier;
  /** Recommended minimum player level (advisory). */
  recommendedMinLevel: number;
  /** Recommended maximum player level (advisory). */
  recommendedMaxLevel: number;
  /** Average monster level in this zone (used for Δ calculations). */
  averageMonsterLevel: number;
  /** Monster types that can spawn in this zone. */
  monsterSpawnConfigs: MonsterSpawnConfig[];
}

/**
 * Pure function: calculate zone danger level for a given player level.
 * Used by the risk-access warning system.
 */
export function calculateZoneDanger(
  playerLevel: number,
  zoneAverageMonsterLevel: number,
): ZoneDangerLevel {
  const delta = zoneAverageMonsterLevel - playerLevel;
  if (delta <= 0) return ZoneDangerLevel.Safe;
  if (delta <= 4) return ZoneDangerLevel.Caution;
  if (delta <= 9) return ZoneDangerLevel.Danger;
  return ZoneDangerLevel.Extreme;
}
