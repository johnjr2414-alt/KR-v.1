import { ZoneDangerLevel } from './HuntingZoneDefinition';

/**
 * Threshold above which the zone-access warning must be shown
 * before the player can enter. (configurable)
 */
export const DANGER_WARNING_THRESHOLD_LEVEL_DELTA = 5;

/**
 * Result of the zone access check — purely data, no DOM/Phaser.
 */
export interface ZoneAccessCheckResult {
  /** Whether the zone is considered dangerous for this player. */
  isDangerous: boolean;
  /** Computed danger level category. */
  dangerLevel: ZoneDangerLevel;
  /** Player's current level used in the check. */
  playerLevel: number;
  /** Zone's average monster level. */
  averageMonsterLevel: number;
  /** Level delta (monsterLevel - playerLevel). */
  delta: number;
  /** Human-readable warning message if isDangerous is true. */
  warningMessage: string;
}

/**
 * Pure function that evaluates whether a danger warning must be shown.
 * Does NOT block entry — that is a player choice at the UI layer.
 */
export function checkZoneAccess(
  playerLevel: number,
  zoneAverageMonsterLevel: number,
  zoneName: string,
  recommendedMinLevel: number,
): ZoneAccessCheckResult {
  const delta = zoneAverageMonsterLevel - playerLevel;

  let dangerLevel: ZoneDangerLevel;
  if (delta <= 0) dangerLevel = ZoneDangerLevel.Safe;
  else if (delta <= 4) dangerLevel = ZoneDangerLevel.Caution;
  else if (delta <= 9) dangerLevel = ZoneDangerLevel.Danger;
  else dangerLevel = ZoneDangerLevel.Extreme;

  const isDangerous = delta >= DANGER_WARNING_THRESHOLD_LEVEL_DELTA;

  let warningMessage = '';
  if (isDangerous) {
    warningMessage =
      `⚠ Warning: ${zoneName} is designed for Level ${recommendedMinLevel}+.\n` +
      `Your character is Level ${playerLevel}.\n` +
      `Monsters here will be much stronger and questions will be significantly harder.\n` +
      `Proceed at your own risk.`;
  }

  return {
    isDangerous,
    dangerLevel,
    playerLevel,
    averageMonsterLevel: zoneAverageMonsterLevel,
    delta,
    warningMessage,
  };
}
