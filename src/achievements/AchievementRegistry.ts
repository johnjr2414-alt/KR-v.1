import {
  AchievementCategory,
  AchievementEventType,
  type AchievementDefinition,
} from './AchievementTypes';

/**
 * Catalog of milestone achievements.
 *
 * Small, clearly labelled sample tied to the stable event model (monster
 * defeats, quest completions, level milestones). Every value is provisional and
 * lives in data so the tracker never needs to change to add achievements.
 */
export const ACHIEVEMENT_REGISTRY: Record<string, AchievementDefinition> = {
  'ach-first-blood': {
    id: 'ach-first-blood',
    name: 'First Blood',
    description: 'Defeat your first monster.',
    category: AchievementCategory.Combat,
    rules: [{ eventType: AchievementEventType.MonsterDefeated, threshold: 1 }],
    provisional: true,
  },
  'ach-slayer-25': {
    id: 'ach-slayer-25',
    name: 'Seasoned Slayer',
    description: 'Defeat 25 monsters.',
    category: AchievementCategory.Combat,
    rules: [{ eventType: AchievementEventType.MonsterDefeated, threshold: 25 }],
    provisional: true,
  },
  'ach-grand-champion': {
    id: 'ach-grand-champion',
    name: 'Grand Champion',
    description: 'Defeat Grand Champion Ragnar in the Colosseum.',
    category: AchievementCategory.Combat,
    rules: [
      {
        eventType: AchievementEventType.MonsterDefeated,
        targetId: 'grand-champion-ragnar',
        threshold: 1,
      },
    ],
    provisional: true,
  },
  'ach-first-quest': {
    id: 'ach-first-quest',
    name: 'Questing Begins',
    description: 'Complete your first quest.',
    category: AchievementCategory.Story,
    rules: [{ eventType: AchievementEventType.QuestCompleted, threshold: 1 }],
    provisional: true,
  },
  'ach-archivist-path': {
    id: 'ach-archivist-path',
    name: "The Archivist's Path",
    description: "Finish the main story chain 'The Archivist's Path'.",
    category: AchievementCategory.Story,
    rules: [
      {
        eventType: AchievementEventType.QuestCompleted,
        targetId: 'quest-archivist-3-final-proof',
        threshold: 1,
      },
    ],
    provisional: true,
  },
  'ach-scholar-level-10': {
    id: 'ach-scholar-level-10',
    name: 'Apprentice Scholar',
    description: 'Reach character level 10.',
    category: AchievementCategory.Progression,
    rules: [
      {
        eventType: AchievementEventType.LevelReached,
        aggregate: 'max',
        threshold: 10,
      },
    ],
    provisional: true,
  },
};

/** All achievement definitions, in registration order. */
export const ACHIEVEMENT_DEFINITIONS: readonly AchievementDefinition[] =
  Object.values(ACHIEVEMENT_REGISTRY);

/** Returns an achievement definition by id. */
export function getAchievementById(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENT_REGISTRY[id];
}
