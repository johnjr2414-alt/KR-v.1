/** Serializable snapshot of cleared challenges (reserved for future save wiring). */
export interface ChallengeProgressSnapshot {
  clearedChallengeIds: string[];
}

/**
 * Headless tracker of which challenges have been cleared.
 *
 * Repeatable challenges may be re-entered freely, but the one-time
 * `firstClearBonus` must be granted at most once. This tracker records cleared
 * challenge ids so first-clear bonuses stay idempotent, while remaining
 * serializable for a future save-schema integration.
 */
export class ChallengeProgressTracker {
  private readonly cleared = new Set<string>();

  /** Whether the challenge has already been cleared at least once. */
  isCleared(challengeId: string): boolean {
    return this.cleared.has(challengeId);
  }

  /**
   * Marks a challenge cleared.
   *
   * @returns `true` only the first time the challenge is cleared (i.e. the
   * first-clear bonus should apply); `false` on every subsequent clear.
   */
  markCleared(challengeId: string): boolean {
    if (this.cleared.has(challengeId)) return false;
    this.cleared.add(challengeId);
    return true;
  }

  /** All cleared challenge ids. */
  getClearedIds(): string[] {
    return [...this.cleared];
  }

  /** Number of distinct challenges cleared. */
  getClearedCount(): number {
    return this.cleared.size;
  }

  /** Replaces the current state from a snapshot (e.g. a loaded save). */
  loadSnapshot(snapshot: ChallengeProgressSnapshot): void {
    this.cleared.clear();
    for (const id of snapshot.clearedChallengeIds) {
      this.cleared.add(id);
    }
  }

  /** Produces a serializable snapshot of the current state. */
  snapshot(): ChallengeProgressSnapshot {
    return { clearedChallengeIds: [...this.cleared] };
  }
}
