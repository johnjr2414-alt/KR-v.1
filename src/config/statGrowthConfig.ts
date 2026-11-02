/**
 * Configurable stat growth parameters.
 * Defines starting base stats at level 1 and per-level gains.
 */
export interface StatGrowthConfig {
  baseHp: number;
  hpPerLevel: number;

  baseMp: number;
  mpPerLevel: number;

  baseAttack: number;
  attackPerLevel: number;

  baseDefense: number;
  defensePerLevel: number;

  baseIntelligence: number;
  intelligencePerLevel: number;

  baseCritRate: number;
  critRatePerLevel: number;
  maxCritRate: number;

  baseMovementSpeed: number;
  movementSpeedPerLevel: number;
}

/** Provisional stat growth balance configuration. */
export const DEFAULT_STAT_GROWTH_CONFIG: StatGrowthConfig = {
  baseHp: 100,
  hpPerLevel: 15,

  baseMp: 50,
  mpPerLevel: 8,

  baseAttack: 10,
  attackPerLevel: 2,

  baseDefense: 5,
  defensePerLevel: 1.5,

  baseIntelligence: 8,
  intelligencePerLevel: 2,

  baseCritRate: 5.0,
  critRatePerLevel: 0.2,
  maxCritRate: 50.0,

  baseMovementSpeed: 1.0,
  movementSpeedPerLevel: 0,
};
