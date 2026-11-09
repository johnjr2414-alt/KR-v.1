/**
 * Achievement / milestone model.
 *
 * Achievements are unlocked by a small, stable set of game events (monster
 * defeats, quest completions, and level milestones). Definitions live in data
 * (`AchievementRegistry`); the tracking logic is headless so it can be tested
 * without any rendering. Every achievement unlocks at most once per profile.
 */

/** Broad grouping used for display/sorting. */
export enum AchievementCategory {
  Combat = 'combat',
  Learning = 'learning',
  Exploration = 'exploration',
  Story = 'story',
  Progression = 'progression',
}

/** The stable game events achievements can react to. */
export enum AchievementEventType {
  MonsterDefeated = 'monster-defeated',
  QuestCompleted = 'quest-completed',
  LevelReached = 'level-reached',
}

/**
 * A normalised achievement event. Emitters convert their domain event into this
 * shape (e.g. a monster-defeat event becomes `{ type: MonsterDefeated, targetId }`).
 */
export interface AchievementEvent {
  type: AchievementEventType;
  /** monsterId or questId. Omitted when the rule matches any target. */
  targetId?: string;
  /** Observed value (e.g. the new player level). Defaults to 1 when counting. */
  value?: number;
  /**
   * Optional deduplication key. When supplied, replaying an event with the same
   * id is ignored, so counters cannot be inflated by double-counting.
   */
  eventId?: string;
}

/** How a rule aggregates matching events. */
export type AchievementAggregate = 'count' | 'max';

/** One condition that contributes to unlocking an achievement. */
export interface AchievementRule {
  eventType: AchievementEventType;
  /** Restrict to a specific monster/quest id; omit to match any target. */
  targetId?: string;
  /**
   * `count` (default) adds `event.value ?? 1` per matching event; `max` keeps
   * the largest observed `event.value`, for threshold-style milestones.
   */
  aggregate?: AchievementAggregate;
  /** Value the aggregate must reach for the rule to be satisfied. */
  threshold: number;
}

/** A data-driven achievement definition. */
export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  /** Every rule must be satisfied for the achievement to unlock. */
  rules: AchievementRule[];
  /** Marks draft values pending approval, mirroring the rest of the project. */
  provisional?: boolean;
}

/** Per-achievement tracking state. */
export interface AchievementProgress {
  achievementId: string;
  unlocked: boolean;
  /** Epoch ms of the first unlock; absent while locked. */
  unlockedAt?: number;
  /** Aggregate value per rule index, parallel to the definition's `rules`. */
  counters: number[];
}

/** Persisted achievement progress for one profile. */
export interface AchievementSnapshot {
  version: number;
  achievements: Record<string, AchievementProgress>;
  /** Recent event ids used to deduplicate replayed events. */
  recentEventIds: string[];
}

/** Current snapshot schema version for achievements. */
export const ACHIEVEMENT_SNAPSHOT_VERSION = 1;
