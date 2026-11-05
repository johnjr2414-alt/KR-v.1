export enum QuestType {
  KillMonster = 'kill-monster',
  CollectItem = 'collect-item',
  AnswerQuestions = 'answer-questions',
}

export enum QuestStatus {
  Unaccepted = 'unaccepted',
  InProgress = 'in-progress',
  ReadyToTurnIn = 'ready-to-turn-in',
  Completed = 'completed',
}

export interface QuestObjective {
  id: string;
  description: string;
  type: QuestType;
  targetId: string; // monsterId, itemId, or subjectId
  requiredCount: number;
  currentCount: number;
}

export interface QuestRewardItem {
  itemId: string;
  quantity: number;
}

export interface QuestRewards {
  combatExp: number;
  gold: number;
  items?: QuestRewardItem[];
  masteryExp?: {
    subjectId: string;
    amount: number;
  };
}

export interface QuestRequirements {
  minLevel?: number;
  prerequisiteQuestIds?: string[];
}

export interface QuestDefinition {
  id: string;
  name: string;
  description: string;
  giverNpcId: string;
  requirements: QuestRequirements;
  objectives: QuestObjective[];
  rewards: QuestRewards;
}

export interface PlayerQuestRecord {
  questId: string;
  status: QuestStatus;
  objectives: QuestObjective[];
  acceptedAt?: number;
  completedAt?: number;
}
