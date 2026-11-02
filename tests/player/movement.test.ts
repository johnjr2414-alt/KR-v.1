import { describe, it, expect } from 'vitest';
import {
  calculateMovementVelocity,
  DEFAULT_MOVE_SPEED,
  type MovementInputState,
} from '@/player';

describe('Player Movement Controller', () => {
  const neutralInput: MovementInputState = {
    up: false,
    down: false,
    left: false,
    right: false,
  };

  it('outputs zero velocity when no direction is pressed', () => {
    const v = calculateMovementVelocity(neutralInput);
    expect(v.vx).toBe(0);
    expect(v.vy).toBe(0);
  });

  it('calculates cardinal velocities at default speed', () => {
    const up = calculateMovementVelocity({ ...neutralInput, up: true });
    expect(up.vx).toBe(0);
    expect(up.vy).toBe(-DEFAULT_MOVE_SPEED);

    const down = calculateMovementVelocity({ ...neutralInput, down: true });
    expect(down.vx).toBe(0);
    expect(down.vy).toBe(DEFAULT_MOVE_SPEED);

    const left = calculateMovementVelocity({ ...neutralInput, left: true });
    expect(left.vx).toBe(-DEFAULT_MOVE_SPEED);
    expect(left.vy).toBe(0);

    const right = calculateMovementVelocity({ ...neutralInput, right: true });
    expect(right.vx).toBe(DEFAULT_MOVE_SPEED);
    expect(right.vy).toBe(0);
  });

  it('normalizes diagonal velocity so speed does not exceed cardinal speed', () => {
    const upRight = calculateMovementVelocity({ ...neutralInput, up: true, right: true }, 200);
    // 200 * (1 / sqrt(2)) ~ 141.42 -> rounded to 141
    expect(upRight.vx).toBe(141);
    expect(upRight.vy).toBe(-141);

    const magnitude = Math.sqrt(upRight.vx * upRight.vx + upRight.vy * upRight.vy);
    expect(Math.round(magnitude)).toBe(199); // within 1 unit due to integer rounding
  });

  it('cancels out opposing directions', () => {
    const opposingY = calculateMovementVelocity({ ...neutralInput, up: true, down: true });
    expect(opposingY.vy).toBe(0);

    const opposingX = calculateMovementVelocity({ ...neutralInput, left: true, right: true });
    expect(opposingX.vx).toBe(0);
  });

  it('supports custom movement speed values', () => {
    const fastSpeed = 300;
    const v = calculateMovementVelocity({ ...neutralInput, right: true }, fastSpeed);
    expect(v.vx).toBe(300);
  });
});
