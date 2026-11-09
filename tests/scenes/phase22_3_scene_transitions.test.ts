import { describe, it, expect, beforeEach } from 'vitest';
import {
  InteractionGuard,
  isWithinInteractionRange,
} from '../../src/scenes/interactions/InteractionGuard';

describe('Phase 22.3 — Interaction Guard & Range Verification Unit Tests', () => {
  let guard: InteractionGuard;

  beforeEach(() => {
    guard = new InteractionGuard({ cooldownMs: 300 });
  });

  it('1. Allows first trigger and enforces cooldown threshold', () => {
    const t0 = 1000;
    expect(guard.canTrigger(t0)).toBe(true);

    // Rapid second call within 300ms should be rejected
    expect(guard.canTrigger(t0 + 100)).toBe(false);
    expect(guard.canTrigger(t0 + 299)).toBe(false);

    // After 300ms cooldown, trigger is permitted
    expect(guard.canTrigger(t0 + 301)).toBe(true);
  });

  it('2. Manual locking blocks interaction regardless of time elapsed', () => {
    guard.setLocked(true);
    expect(guard.isCurrentlyLocked()).toBe(true);
    expect(guard.canTrigger(Date.now() + 5000)).toBe(false);

    guard.setLocked(false);
    expect(guard.isCurrentlyLocked()).toBe(false);
    expect(guard.canTrigger(Date.now() + 5000)).toBe(true);
  });

  it('3. Reset clears cooldown and unlock status', () => {
    guard.setLocked(true);
    guard.reset();
    expect(guard.isCurrentlyLocked()).toBe(false);
    expect(guard.canTrigger(1000)).toBe(true);
  });

  it('4. Chebyshev distance evaluation for interaction range threshold', () => {
    const px = 100;
    const py = 100;
    const threshold = 80;

    // Within bounds
    expect(isWithinInteractionRange(px, py, 150, 100, threshold)).toBe(true); // dx: 50, dy: 0
    expect(isWithinInteractionRange(px, py, 180, 180, threshold)).toBe(true); // dx: 80, dy: 80

    // Outside bounds
    expect(isWithinInteractionRange(px, py, 181, 100, threshold)).toBe(false); // dx: 81
    expect(isWithinInteractionRange(px, py, 100, 185, threshold)).toBe(false); // dy: 85
  });
});
