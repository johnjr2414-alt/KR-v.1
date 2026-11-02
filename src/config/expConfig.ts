/**
 * Configuration parameters for character level EXP requirements.
 *
 * Values here are provisional and separated from player logic.
 * Follows the approved formula: RequiredEXP(L) = floor(A * L^B + C * L)
 */
export interface ExpFormulaConfig {
  /** Maximum level a player can achieve. */
  maxLevel: number;
  /** Exponential scale factor (A). */
  scaleFactorA: number;
  /** Power exponent (B). */
  exponentB: number;
  /** Linear component coefficient (C). */
  linearCoefficientC: number;
  /** Optional manual overrides for specific levels. */
  customLevelOverrides?: Record<number, number>;
}

/**
 * Provisional EXP balance configuration.
 * Can be replaced or tweaked without altering game logic.
 */
export const DEFAULT_EXP_CONFIG: ExpFormulaConfig = {
  maxLevel: 100,
  scaleFactorA: 50,
  exponentB: 2.2,
  linearCoefficientC: 100,
  customLevelOverrides: {},
};

/**
 * Calculates the amount of EXP required to advance from `currentLevel` to `currentLevel + 1`.
 * Returns 0 if currentLevel is greater than or equal to maxLevel.
 */
export function getRequiredExpForNextLevel(
  currentLevel: number,
  config: ExpFormulaConfig = DEFAULT_EXP_CONFIG,
): number {
  if (currentLevel < 1) {
    throw new Error(`Current level must be >= 1, received ${currentLevel}`);
  }

  if (currentLevel >= config.maxLevel) {
    return 0; // Cap reached, no further leveling possible
  }

  if (config.customLevelOverrides && config.customLevelOverrides[currentLevel] !== undefined) {
    return config.customLevelOverrides[currentLevel];
  }

  const { scaleFactorA, exponentB, linearCoefficientC } = config;
  const exp = Math.floor(
    scaleFactorA * Math.pow(currentLevel, exponentB) + linearCoefficientC * currentLevel,
  );

  return Math.max(1, exp);
}
