import {
  ACHIEVEMENT_SNAPSHOT_VERSION,
  type AchievementDefinition,
  type AchievementEvent,
  type AchievementProgress,
  type AchievementSnapshot,
} from './AchievementTypes';
import { ACHIEVEMENT_DEFINITIONS } from './AchievementRegistry';

/** Called once per achievement, at the moment it unlocks. */
export type AchievementUnlockListener = (
  definition: AchievementDefinition,
  progress: AchievementProgress,
) => void;

export interface AchievementTrackerOptions {
  /** Definitions to track. Defaults to the full {@link ACHIEVEMENT_DEFINITIONS}. */
  definitions?: readonly AchievementDefinition[];
  /** Clock used for unlock timestamps. Injectable for deterministic tests. */
  now?: () => number;
}

/**
 * Headless achievement tracker.
 *
 * Consumers feed normalised {@link AchievementEvent}s; the tracker updates each
 * achievement's counters and unlocks it exactly once when every rule is met.
 * Events carrying an `eventId` are deduplicated, so replaying the same event can
 * never inflate progress — the same guarantee the learning-analytics engine makes.
 */
export class AchievementTracker {
  private readonly definitions: readonly AchievementDefinition[];
  private readonly now: () => number;
  private readonly progress = new Map<string, AchievementProgress>();
  private readonly recentEventIds = new Set<string>();
  private readonly unlockListeners = new Set<AchievementUnlockListener>();

  constructor(options: AchievementTrackerOptions = {}) {
    this.definitions = options.definitions ?? ACHIEVEMENT_DEFINITIONS;
    this.now = options.now ?? (() => Date.now());
    for (const definition of this.definitions) {
      this.progress.set(definition.id, this.emptyProgress(definition));
    }
  }

  /** Registers a listener fired once per unlock. Returns an unsubscribe fn. */
  onUnlock(listener: AchievementUnlockListener): () => void {
    this.unlockListeners.add(listener);
    return () => this.unlockListeners.delete(listener);
  }

  /**
   * Applies an event, updating counters and unlocking any achievements whose
   * rules are now satisfied. Returns the definitions unlocked by this call
   * (empty when nothing new unlocked).
   */
  handleEvent(event: AchievementEvent): AchievementDefinition[] {
    if (event.eventId !== undefined) {
      if (this.recentEventIds.has(event.eventId)) return [];
      this.recentEventIds.add(event.eventId);
    }

    const unlockedNow: AchievementDefinition[] = [];

    for (const definition of this.definitions) {
      const progress = this.progress.get(definition.id);
      if (!progress || progress.unlocked) continue;

      let changed = false;
      for (let i = 0; i < definition.rules.length; i += 1) {
        const rule = definition.rules[i];
        if (rule.eventType !== event.type) continue;
        if (rule.targetId !== undefined && rule.targetId !== event.targetId) continue;

        const value = event.value ?? 1;
        if (rule.aggregate === 'max') {
          if (value > progress.counters[i]) {
            progress.counters[i] = value;
            changed = true;
          }
        } else {
          progress.counters[i] += value;
          changed = true;
        }
      }

      if (changed && this.isSatisfied(definition, progress)) {
        progress.unlocked = true;
        progress.unlockedAt = this.now();
        unlockedNow.push(definition);
        for (const listener of this.unlockListeners) listener(definition, progress);
      }
    }

    return unlockedNow;
  }

  isUnlocked(achievementId: string): boolean {
    return this.progress.get(achievementId)?.unlocked ?? false;
  }

  getProgress(achievementId: string): AchievementProgress | undefined {
    return this.progress.get(achievementId);
  }

  getAllProgress(): AchievementProgress[] {
    return this.definitions
      .map((definition) => this.progress.get(definition.id))
      .filter((progress): progress is AchievementProgress => progress !== undefined)
      .map((progress) => ({ ...progress, counters: [...progress.counters] }));
  }

  getUnlockedCount(): number {
    let count = 0;
    for (const progress of this.progress.values()) if (progress.unlocked) count += 1;
    return count;
  }

  getTotalCount(): number {
    return this.definitions.length;
  }

  /** Returns a serialisable snapshot of all progress and the dedup window. */
  snapshot(): AchievementSnapshot {
    const achievements: Record<string, AchievementProgress> = {};
    for (const definition of this.definitions) {
      const progress = this.progress.get(definition.id);
      if (progress) {
        achievements[definition.id] = {
          achievementId: progress.achievementId,
          unlocked: progress.unlocked,
          unlockedAt: progress.unlockedAt,
          counters: [...progress.counters],
        };
      }
    }
    return {
      version: ACHIEVEMENT_SNAPSHOT_VERSION,
      achievements,
      recentEventIds: [...this.recentEventIds],
    };
  }

  /** Restores progress from a snapshot; unknown definitions get fresh state. */
  loadSnapshot(snapshot: AchievementSnapshot): void {
    this.progress.clear();
    for (const definition of this.definitions) {
      const saved = snapshot.achievements[definition.id];
      if (!saved) {
        this.progress.set(definition.id, this.emptyProgress(definition));
        continue;
      }
      this.progress.set(definition.id, {
        achievementId: definition.id,
        unlocked: saved.unlocked,
        unlockedAt: saved.unlockedAt,
        counters: definition.rules.map((_rule, i) => saved.counters[i] ?? 0),
      });
    }

    this.recentEventIds.clear();
    for (const id of snapshot.recentEventIds) this.recentEventIds.add(id);
  }

  private emptyProgress(definition: AchievementDefinition): AchievementProgress {
    return {
      achievementId: definition.id,
      unlocked: false,
      counters: definition.rules.map(() => 0),
    };
  }

  private isSatisfied(
    definition: AchievementDefinition,
    progress: AchievementProgress,
  ): boolean {
    return definition.rules.every(
      (rule, i) => progress.counters[i] >= rule.threshold,
    );
  }
}

/** Shared default tracker instance. */
export const achievementTracker = new AchievementTracker();
