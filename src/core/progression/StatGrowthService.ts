import { DEFAULT_STAT_GROWTH_CONFIG, type StatGrowthConfig } from '../../config/statGrowthConfig';
import type { PlayerData } from '../../player/PlayerData';

/** Computed attributes for a specific level. */
export interface ComputedAttributes {
  maxHp: number;
  maxMp: number;
  attack: number;
  defense: number;
  intelligence: number;
  critRate: number;
  movementSpeed: number;
}

/**
 * Calculates raw character attributes for any level using the configured growth rules.
 * Pure function: keeps stat math completely decoupled from PlayerData model.
 */
export function calculateStatsForLevel(
  level: number,
  config: StatGrowthConfig = DEFAULT_STAT_GROWTH_CONFIG,
): ComputedAttributes {
  if (level < 1) {
    throw new Error(`Level must be >= 1, received ${level}`);
  }

  const levelDelta = level - 1;

  const maxHp = Math.round(config.baseHp + config.hpPerLevel * levelDelta);
  const maxMp = Math.round(config.baseMp + config.mpPerLevel * levelDelta);
  const attack = Math.round(config.baseAttack + config.attackPerLevel * levelDelta);
  const defense = Math.round((config.baseDefense + config.defensePerLevel * levelDelta) * 10) / 10;
  const intelligence = Math.round(config.baseIntelligence + config.intelligencePerLevel * levelDelta);
  const rawCrit = config.baseCritRate + config.critRatePerLevel * levelDelta;
  const critRate = Math.min(config.maxCritRate, Math.round(rawCrit * 10) / 10);
  const movementSpeed = config.baseMovementSpeed + config.movementSpeedPerLevel * levelDelta;

  return {
    maxHp,
    maxMp,
    attack,
    defense,
    intelligence,
    critRate,
    movementSpeed,
  };
}

/**
 * Updates a player's combat stats based on their current level.
 * Adjusts currentHp and currentMp proportionally or caps them at the new maximums.
 */
export function applyLevelStatsToPlayer(
  player: PlayerData,
  config: StatGrowthConfig = DEFAULT_STAT_GROWTH_CONFIG,
): PlayerData {
  const newStats = calculateStatsForLevel(player.level, config);

  const hpDiff = newStats.maxHp - player.maxHp;
  const mpDiff = newStats.maxMp - player.maxMp;

  player.maxHp = newStats.maxHp;
  player.currentHp = Math.min(player.maxHp, player.currentHp + Math.max(0, hpDiff));

  player.maxMp = newStats.maxMp;
  player.currentMp = Math.min(player.maxMp, player.currentMp + Math.max(0, mpDiff));

  player.attack = newStats.attack;
  player.defense = newStats.defense;
  player.intelligence = newStats.intelligence;
  player.critRate = newStats.critRate;
  player.movementSpeed = newStats.movementSpeed;

  return player;
}
