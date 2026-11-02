/**
 * Typed player data model.
 *
 * Stores raw character state and combat attributes.
 * Contains no leveling logic or stat calculation formulas.
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
    ...overrides,
  };
}
