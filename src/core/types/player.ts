/**
 * Base character combat statistics.
 * All values are integers; scaling formulas live in the progression module.
 */
export interface CharacterStats {
  /** Maximum health points. */
  hp: number;
  /** Maximum mana points. */
  mp: number;
  /** Physical attack power. */
  attack: number;
  /** Physical damage reduction. */
  defense: number;
  /** Magical power and mastery amplifier. */
  intelligence: number;
  /** Critical hit probability (0–100 percentage). */
  critRate: number;
  /** Overworld movement speed multiplier. */
  movementSpeed: number;
}

/**
 * Complete player character state.
 */
export interface PlayerState {
  /** Unique player identifier. */
  id: string;
  /** Display name. */
  name: string;
  /** Current character level (combat progression). */
  level: number;
  /** Accumulated combat EXP toward next level. */
  currentExp: number;
  /** Current HP (may be less than max during combat). */
  currentHp: number;
  /** Current MP. */
  currentMp: number;
  /** Computed character stats at current level. */
  stats: CharacterStats;
  /** Gold currency balance. */
  gold: number;
}
