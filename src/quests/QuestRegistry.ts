import { QuestType, type QuestDefinition } from './QuestTypes';

export const QUEST_REGISTRY: Record<string, QuestDefinition> = {
  'quest-slime-hunter': {
    id: 'quest-slime-hunter',
    name: 'Slime Infestation',
    description: 'Elder Aldous has asked you to defeat 2 Forest Slimes to secure the outskirts.',
    giverNpcId: 'elder-aldous',
    requirements: {
      minLevel: 1,
    },
    objectives: [
      {
        id: 'kill-forest-slimes',
        description: 'Defeat Forest Slimes',
        type: QuestType.KillMonster,
        targetId: 'forest-slime',
        requiredCount: 2,
        currentCount: 0,
      },
    ],
    rewards: {
      combatExp: 35,
      gold: 25,
      items: [
        { itemId: 'minor-health-potion', quantity: 2 },
      ],
    },
  },
  'quest-slime-sample': {
    id: 'quest-slime-sample',
    name: 'Research Materials',
    description: 'Scholar Lyra needs 1 Slime Gel sample to conduct research.',
    giverNpcId: 'scholar-lyra',
    requirements: {
      minLevel: 1,
    },
    objectives: [
      {
        id: 'collect-slime-gel',
        description: 'Collect Slime Gel',
        type: QuestType.CollectItem,
        targetId: 'slime-gel',
        requiredCount: 1,
        currentCount: 0,
      },
    ],
    rewards: {
      combatExp: 20,
      gold: 15,
      items: [
        { itemId: 'minor-mana-potion', quantity: 2 },
      ],
      masteryExp: {
        subjectId: 'mathematics',
        amount: 25,
      },
    },
  },
};

export function getQuestDefinition(id: string): QuestDefinition | undefined {
  return QUEST_REGISTRY[id];
}
