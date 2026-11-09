import { describe, it, expect, beforeEach } from 'vitest';
import { AchievementTracker } from '../../src/achievements/AchievementTracker';
import {
  ACHIEVEMENT_DEFINITIONS,
  ACHIEVEMENT_REGISTRY,
} from '../../src/achievements/AchievementRegistry';
import {
  AchievementCategory,
  AchievementEventType,
  type AchievementDefinition,
} from '../../src/achievements/AchievementTypes';

function tracker() {
  return new AchievementTracker({ now: () => 1_000 });
}

const monsterDefeat = (targetId?: string, eventId?: string) => ({
  type: AchievementEventType.MonsterDefeated,
  targetId,
  eventId,
});

// ─── Registry integrity ──────────────────────────────────────────────────────

describe('Phase 26.8 — achievement registry integrity', () => {
  it('has unique ids matching their keys', () => {
    for (const [key, def] of Object.entries(ACHIEVEMENT_REGISTRY)) {
      expect(def.id).toBe(key);
    }
  });

  it('gives every rule a usable event type and positive threshold', () => {
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      expect(def.rules.length).toBeGreaterThan(0);
      for (const rule of def.rules) {
        expect(Object.values(AchievementEventType)).toContain(rule.eventType);
        expect(rule.threshold).toBeGreaterThan(0);
      }
    }
  });

  it('marks every definition provisional (draft values)', () => {
    expect(ACHIEVEMENT_DEFINITIONS.every((d) => d.provisional)).toBe(true);
  });

  it('catalogues at least one achievement per configured category sample', () => {
    const categories = new Set(ACHIEVEMENT_DEFINITIONS.map((d) => d.category));
    expect(categories.has(AchievementCategory.Combat)).toBe(true);
    expect(categories.has(AchievementCategory.Story)).toBe(true);
    expect(categories.has(AchievementCategory.Progression)).toBe(true);
  });
});

// ─── Basic unlocking ─────────────────────────────────────────────────────────

describe('Phase 26.8 — achievement unlocking', () => {
  let t: AchievementTracker;

  beforeEach(() => {
    t = tracker();
  });

  it('unlocks a count-based milestone once the threshold is reached', () => {
    expect(t.isUnlocked('ach-first-blood')).toBe(false);
    const unlocked = t.handleEvent(monsterDefeat('forest-slime'));
    expect(unlocked.map((d) => d.id)).toContain('ach-first-blood');
    expect(t.isUnlocked('ach-first-blood')).toBe(true);
  });

  it('does not unlock before the count threshold', () => {
    for (let i = 0; i < 24; i += 1) t.handleEvent(monsterDefeat('forest-slime'));
    expect(t.isUnlocked('ach-slayer-25')).toBe(false);
    t.handleEvent(monsterDefeat('forest-slime'));
    expect(t.isUnlocked('ach-slayer-25')).toBe(true);
  });

  it('only unlocks target-restricted achievements for the matching target', () => {
    t.handleEvent(monsterDefeat('forest-slime'));
    expect(t.isUnlocked('ach-grand-champion')).toBe(false);
    t.handleEvent(monsterDefeat('grand-champion-ragnar'));
    expect(t.isUnlocked('ach-grand-champion')).toBe(true);
  });

  it('unlocks a threshold milestone using the max aggregate', () => {
    t.handleEvent({ type: AchievementEventType.LevelReached, value: 5 });
    expect(t.isUnlocked('ach-scholar-level-10')).toBe(false);
    t.handleEvent({ type: AchievementEventType.LevelReached, value: 10 });
    expect(t.isUnlocked('ach-scholar-level-10')).toBe(true);
  });

  it('unlocks quest-completion milestones by quest id', () => {
    t.handleEvent({ type: AchievementEventType.QuestCompleted, targetId: 'quest-slime-hunter' });
    expect(t.isUnlocked('ach-first-quest')).toBe(true);
    expect(t.isUnlocked('ach-archivist-path')).toBe(false);
    t.handleEvent({
      type: AchievementEventType.QuestCompleted,
      targetId: 'quest-archivist-3-final-proof',
    });
    expect(t.isUnlocked('ach-archivist-path')).toBe(true);
  });

  it('requires every rule of a multi-rule achievement to be satisfied', () => {
    const multi: AchievementDefinition = {
      id: 'ach-multi',
      name: 'Multi',
      description: 'Two conditions.',
      category: AchievementCategory.Combat,
      rules: [
        { eventType: AchievementEventType.MonsterDefeated, targetId: 'a', threshold: 1 },
        { eventType: AchievementEventType.MonsterDefeated, targetId: 'b', threshold: 1 },
      ],
    };
    const mt = new AchievementTracker({ definitions: [multi], now: () => 1_000 });

    mt.handleEvent(monsterDefeat('a'));
    expect(mt.isUnlocked('ach-multi')).toBe(false);
    mt.handleEvent(monsterDefeat('b'));
    expect(mt.isUnlocked('ach-multi')).toBe(true);
  });

  it('reports unlocked and total counts', () => {
    expect(t.getUnlockedCount()).toBe(0);
    expect(t.getTotalCount()).toBe(ACHIEVEMENT_DEFINITIONS.length);
    t.handleEvent(monsterDefeat('forest-slime'));
    expect(t.getUnlockedCount()).toBeGreaterThanOrEqual(1);
  });
});

// ─── Idempotency ─────────────────────────────────────────────────────────────

describe('Phase 26.8 — achievement idempotency', () => {
  let t: AchievementTracker;

  beforeEach(() => {
    t = tracker();
  });

  it('ignores a replayed event with the same eventId', () => {
    t.handleEvent(monsterDefeat('forest-slime', 'evt-1'));
    const countersAfterFirst = [...(t.getProgress('ach-slayer-25')?.counters ?? [])];

    const second = t.handleEvent(monsterDefeat('forest-slime', 'evt-1'));
    expect(second).toEqual([]);
    expect(t.getProgress('ach-slayer-25')?.counters).toEqual(countersAfterFirst);
  });

  it('does not unlock an achievement twice', () => {
    const first = t.handleEvent(monsterDefeat('forest-slime'));
    expect(first.map((d) => d.id)).toContain('ach-first-blood');

    const second = t.handleEvent(monsterDefeat('forest-slime'));
    expect(second.map((d) => d.id)).not.toContain('ach-first-blood');
    expect(t.isUnlocked('ach-first-blood')).toBe(true);
  });

  it('fires the unlock listener exactly once per achievement', () => {
    const fired: string[] = [];
    t.onUnlock((def) => fired.push(def.id));

    t.handleEvent(monsterDefeat('forest-slime'));
    t.handleEvent(monsterDefeat('forest-slime'));
    t.handleEvent(monsterDefeat('forest-slime'));

    expect(fired.filter((id) => id === 'ach-first-blood')).toHaveLength(1);
  });

  it('records an unlock timestamp from the injected clock', () => {
    t.handleEvent(monsterDefeat('forest-slime'));
    expect(t.getProgress('ach-first-blood')?.unlockedAt).toBe(1_000);
  });
});

// ─── Snapshot / restore ──────────────────────────────────────────────────────

describe('Phase 26.8 — achievement snapshot round-trip', () => {
  it('restores unlocked state, counters, and the dedup window', () => {
    const t = tracker();
    for (let i = 0; i < 25; i += 1) t.handleEvent(monsterDefeat('forest-slime', `evt-${i}`));
    expect(t.isUnlocked('ach-slayer-25')).toBe(true);

    const snapshot = t.snapshot();

    const restored = tracker();
    restored.loadSnapshot(snapshot);
    expect(restored.isUnlocked('ach-slayer-25')).toBe(true);
    expect(restored.getUnlockedCount()).toBe(t.getUnlockedCount());
    expect(restored.getProgress('ach-slayer-25')?.counters).toEqual(
      t.getProgress('ach-slayer-25')?.counters,
    );

    // Replaying a deduplicated event after restore is still ignored.
    const replay = restored.handleEvent(monsterDefeat('forest-slime', 'evt-0'));
    expect(replay).toEqual([]);
  });

  it('gives unknown definitions fresh state when loading an older snapshot', () => {
    const t = tracker();
    t.handleEvent(monsterDefeat('forest-slime'));
    const partial = t.snapshot();
    delete partial.achievements['ach-scholar-level-10'];

    const restored = tracker();
    restored.loadSnapshot(partial);
    expect(restored.isUnlocked('ach-first-blood')).toBe(true);
    expect(restored.isUnlocked('ach-scholar-level-10')).toBe(false);
    expect(restored.getProgress('ach-scholar-level-10')?.counters).toEqual([0]);
  });
});
