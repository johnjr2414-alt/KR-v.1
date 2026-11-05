import {
  QuestStatus,
  QuestType,
  type PlayerQuestRecord,
  type QuestDefinition,
  type QuestRewards,
} from './QuestTypes';
import { getQuestDefinition } from './QuestRegistry';
import { InventoryManager, inventoryManager } from '../inventory/InventoryManager';
import { RewardCalculator, rewardCalculator } from '../combat/rewards/RewardCalculator';
import type { MonsterDefeatedEvent } from '../combat/rewards/RewardTypes';

export interface AcceptQuestResult {
  success: boolean;
  error?: string;
  record?: PlayerQuestRecord;
}

export interface CompleteQuestResult {
  success: boolean;
  error?: string;
  rewards?: QuestRewards;
}

/**
 * Headless Quest Manager Service.
 *
 * Responsibilities:
 * - Tracking quest state (Unaccepted, InProgress, ReadyToTurnIn, Completed)
 * - Accepting quests and checking requirements
 * - Listening to MonsterDefeatedEvent to track kill objectives
 * - Checking item inventory to track collect objectives
 * - Completing quests and awarding combat EXP, gold, inventory items, and mastery EXP
 */
export class QuestManager {
  private activeQuests: Map<string, PlayerQuestRecord> = new Map();
  private inventory: InventoryManager;
  private unsubscribeDefeated?: () => void;

  constructor(
    inventory: InventoryManager = inventoryManager,
    rewards: RewardCalculator = rewardCalculator,
  ) {
    this.inventory = inventory;

    // Listen to monster defeated events
    this.unsubscribeDefeated = rewards.onMonsterDefeated((event: MonsterDefeatedEvent) => {
      this.handleMonsterDefeated(event.monsterId);
    });
  }

  destroy(): void {
    if (this.unsubscribeDefeated) {
      this.unsubscribeDefeated();
      this.unsubscribeDefeated = undefined;
    }
  }

  /**
   * Returns all tracked quest records.
   */
  getAllQuests(): PlayerQuestRecord[] {
    return Array.from(this.activeQuests.values());
  }

  /**
   * Returns a specific quest record by ID.
   */
  getQuestRecord(questId: string): PlayerQuestRecord | undefined {
    return this.activeQuests.get(questId);
  }

  /**
   * Checks if player meets requirements to accept quest.
   */
  canAcceptQuest(questId: string, playerLevel = 1): { canAccept: boolean; reason?: string } {
    const def = getQuestDefinition(questId);
    if (!def) {
      return { canAccept: false, reason: 'Quest does not exist' };
    }

    const currentRecord = this.activeQuests.get(questId);
    if (currentRecord) {
      if (currentRecord.status === QuestStatus.Completed) {
        return { canAccept: false, reason: 'Quest already completed' };
      }
      return { canAccept: false, reason: 'Quest already accepted' };
    }

    if (def.requirements.minLevel && playerLevel < def.requirements.minLevel) {
      return {
        canAccept: false,
        reason: `Requires level ${def.requirements.minLevel}`,
      };
    }

    if (def.requirements.prerequisiteQuestIds) {
      for (const prereqId of def.requirements.prerequisiteQuestIds) {
        const prereqRecord = this.activeQuests.get(prereqId);
        if (!prereqRecord || prereqRecord.status !== QuestStatus.Completed) {
          return {
            canAccept: false,
            reason: `Prerequisite quest not completed: ${prereqId}`,
          };
        }
      }
    }

    return { canAccept: true };
  }

  /**
   * Player accepts a quest.
   */
  acceptQuest(questId: string, playerLevel = 1): AcceptQuestResult {
    const check = this.canAcceptQuest(questId, playerLevel);
    if (!check.canAccept) {
      return { success: false, error: check.reason };
    }

    const def = getQuestDefinition(questId)!;
    const record: PlayerQuestRecord = {
      questId,
      status: QuestStatus.InProgress,
      objectives: def.objectives.map((obj) => ({
        ...obj,
        currentCount: 0,
      })),
      acceptedAt: Date.now(),
    };

    this.activeQuests.set(questId, record);

    // Initial check for collection objectives (player might already possess items)
    this.refreshItemCollectionObjectives(record);
    this.checkCompletionReady(record);

    return { success: true, record };
  }

  /**
   * Advances kill objectives when a monster is defeated.
   */
  handleMonsterDefeated(monsterId: string): void {
    for (const record of this.activeQuests.values()) {
      if (record.status !== QuestStatus.InProgress) continue;

      let changed = false;
      for (const obj of record.objectives) {
        if (obj.type === QuestType.KillMonster && obj.targetId === monsterId) {
          if (obj.currentCount < obj.requiredCount) {
            obj.currentCount += 1;
            changed = true;
          }
        }
      }

      if (changed) {
        this.checkCompletionReady(record);
      }
    }
  }

  /**
   * Refreshes item collection objectives based on current inventory.
   */
  refreshItemCollectionObjectives(record: PlayerQuestRecord): void {
    const inventoryState = this.inventory.getState();

    for (const obj of record.objectives) {
      if (obj.type === QuestType.CollectItem) {
        let count = 0;
        for (const slot of inventoryState.slots) {
          if (slot && slot.itemId === obj.targetId) {
            count += slot.quantity;
          }
        }
        obj.currentCount = Math.min(count, obj.requiredCount);
      }
    }
  }

  /**
   * Evaluates if all objectives are fulfilled to transition to ReadyToTurnIn.
   */
  private checkCompletionReady(record: PlayerQuestRecord): void {
    const allMet = record.objectives.every(
      (obj) => obj.currentCount >= obj.requiredCount,
    );
    if (allMet && record.status === QuestStatus.InProgress) {
      record.status = QuestStatus.ReadyToTurnIn;
    }
  }

  /**
   * Verifies and completes a quest, deducting required items and returning configured rewards.
   */
  completeQuest(questId: string): CompleteQuestResult {
    const record = this.activeQuests.get(questId);
    if (!record) {
      return { success: false, error: 'Quest not accepted' };
    }

    if (record.status === QuestStatus.Completed) {
      return { success: false, error: 'Quest already completed' };
    }

    const def = getQuestDefinition(questId);
    if (!def) {
      return { success: false, error: 'Quest definition missing' };
    }

    // Refresh collection objectives before completing
    this.refreshItemCollectionObjectives(record);
    this.checkCompletionReady(record);

    if (record.status !== QuestStatus.ReadyToTurnIn) {
      return { success: false, error: 'Quest objectives not yet completed' };
    }

    // Remove turn-in collect items from inventory
    for (const obj of record.objectives) {
      if (obj.type === QuestType.CollectItem) {
        const removed = this.inventory.removeItem(obj.targetId, obj.requiredCount);
        if (!removed) {
          return {
            success: false,
            error: `Failed to turn in required item: ${obj.targetId}`,
          };
        }
      }
    }

    // Award inventory item rewards
    if (def.rewards.items) {
      for (const itemReward of def.rewards.items) {
        this.inventory.addItem(itemReward.itemId, itemReward.quantity);
      }
    }

    record.status = QuestStatus.Completed;
    record.completedAt = Date.now();

    return {
      success: true,
      rewards: def.rewards,
    };
  }

  /**
   * Determines an NPC's status for the player:
   * 'ready-turn-in' | 'available' | 'in-progress' | 'none'
   */
  getNpcQuestStatus(npcId: string, playerLevel = 1): 'ready-turn-in' | 'available' | 'in-progress' | 'none' {
    const defs = Object.values(getQuestDefinition ? [getQuestDefinition('quest-slime-hunter'), getQuestDefinition('quest-slime-sample')] : []).filter(
      (q): q is QuestDefinition => q !== undefined && q.giverNpcId === npcId,
    );

    let hasAvailable = false;
    let hasInProgress = false;

    for (const q of defs) {
      const rec = this.activeQuests.get(q.id);
      if (rec) {
        if (rec.status === QuestStatus.ReadyToTurnIn) {
          return 'ready-turn-in';
        }
        if (rec.status === QuestStatus.InProgress) {
          hasInProgress = true;
        }
      } else {
        if (this.canAcceptQuest(q.id, playerLevel).canAccept) {
          hasAvailable = true;
        }
      }
    }

    if (hasInProgress) return 'in-progress';
    if (hasAvailable) return 'available';
    return 'none';
  }
}

export const questManager = new QuestManager();
