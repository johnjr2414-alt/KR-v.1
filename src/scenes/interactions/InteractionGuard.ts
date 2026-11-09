export interface InteractionCooldownOptions {
  cooldownMs?: number;
}

/**
 * InteractionGuard — Pure logic helper to throttle repeated portal entries,
 * button spamming, and duplicate modal openings.
 * Headless and testable without Phaser or DOM.
 */
export class InteractionGuard {
  private lastTriggerTime = 0;
  private readonly cooldownMs: number;
  private isLocked = false;

  constructor(options: InteractionCooldownOptions = {}) {
    this.cooldownMs = options.cooldownMs ?? 350;
  }

  /**
   * Evaluates whether an interaction action can proceed.
   * If allowed, resets cooldown and returns true; otherwise false.
   */
  canTrigger(now = Date.now()): boolean {
    if (this.isLocked) {
      return false;
    }

    if (now - this.lastTriggerTime < this.cooldownMs) {
      return false;
    }

    this.lastTriggerTime = now;
    return true;
  }

  /**
   * Sets manual lock status (e.g. while scene is fading or modal is active).
   */
  setLocked(locked: boolean): void {
    this.isLocked = locked;
  }

  isCurrentlyLocked(): boolean {
    return this.isLocked;
  }

  reset(): void {
    this.lastTriggerTime = 0;
    this.isLocked = false;
  }
}

/**
 * Evaluates Chebyshev distance between two points against an interaction threshold.
 */
export function isWithinInteractionRange(
  px: number,
  py: number,
  tx: number,
  ty: number,
  threshold: number,
): boolean {
  const dx = Math.abs(px - tx);
  const dy = Math.abs(py - ty);
  return Math.max(dx, dy) <= threshold;
}
