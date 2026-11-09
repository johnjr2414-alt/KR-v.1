export enum QuestType {
  KillMonster = 'kill-monster',
  CollectItem = 'collect-item',
  AnswerQuestions = 'answer-questions',
}

/**
 * High-level classification of a quest. Main-story quests form ordered chains;
 * side quests are optional and carry no chain membership.
 */
export enum QuestCategory {
  MainStory = 'main-story',
  Side = 'side',
  /**
   * Career progression quests. They run on the same quest engine as every other
   * quest (objectives, requirements, rewards) but are kept a distinct category
   * from general quests and from professional assignments, which have their own
   * profession-progression rules.
   */
  Career = 'career',
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
  /**
   * Story classification. Defaults to {@link QuestCategory.Side} when omitted,
   * so pre-existing quest data needs no change.
   */
  category?: QuestCategory;
  /** Identifier shared by every quest in an ordered story chain. */
  chainId?: string;
  /** 1-based position of this quest within its chain. */
  orderInChain?: number;
}

/** The dialogue/indicator state of an NPC with respect to its offered quests. */
export type NpcQuestStatus = 'ready-turn-in' | 'available' | 'in-progress' | 'none';

/** Snapshot of a player's progress through one quest chain. */
export interface QuestChainProgress {
  chainId: string;
  /** All chain quests, ordered by {@link QuestDefinition.orderInChain}. */
  quests: QuestDefinition[];
  /** Id of the next quest the player has not yet completed, or `null` when done. */
  nextQuestId: string | null;
  /** Whether the next quest can be accepted right now. */
  nextAcceptable: boolean;
  /** Reason the next quest is not acceptable (empty when it is) or the chain is done. */
  reason: string;
  completedCount: number;
  totalCount: number;
}

export interface PlayerQuestRecord {
  questId: string;
  status: QuestStatus;
  objectives: QuestObjective[];
  acceptedAt?: number;
  completedAt?: number;
}
