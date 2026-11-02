/**
 * State of directional movement inputs.
 */
export interface MovementInputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

/**
 * Velocity vector resulting from movement calculation.
 */
export interface VelocityVector {
  vx: number;
  vy: number;
}

/** Base player walk speed in pixels per second. */
export const DEFAULT_MOVE_SPEED = 180;

/**
 * Pure function to calculate movement velocity from directional input.
 * Normalizes diagonal movement so diagonal speed equals cardinal speed.
 * Completely headless and testable without Phaser.
 */
export function calculateMovementVelocity(
  input: MovementInputState,
  speed: number = DEFAULT_MOVE_SPEED,
): VelocityVector {
  let dx = 0;
  let dy = 0;

  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;

  if (dx === 0 && dy === 0) {
    return { vx: 0, vy: 0 };
  }

  // If moving diagonally, normalize vector by 1 / sqrt(2)
  if (dx !== 0 && dy !== 0) {
    const invSqrt2 = Math.SQRT1_2;
    return {
      vx: Math.round(dx * speed * invSqrt2),
      vy: Math.round(dy * speed * invSqrt2),
    };
  }

  return {
    vx: dx * speed,
    vy: dy * speed,
  };
}
