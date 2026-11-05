import { describe, it, expect, beforeEach } from 'vitest';
import { QuestManager } from '../../src/quests/QuestManager';
import { QuestStatus } from '../../src/quests/QuestTypes';
import { InventoryManager } from '../../src/inventory/InventoryManager';
import { RewardCalculator } from '../../src/combat/rewards/RewardCalculator';
import type { MonsterRewardResult } from '../../src/combat/rewards/RewardTypes';
import { MonsterCategory, type MonsterDefinition } from '../../src/core/types/monster';
import { SubjectId } from '../../src/core/types/education';

const MOCK_SLIME: MonsterDefinition = {
  id: 'forest-slime',
  name: 'Forest Slime',
  level: 1,
  maxHp: 20,
  attack: 10,
  defense: 2,
  subject: SubjectId.Mathematics,
  category: MonsterCategory.Weak,
  baseExp: 10,
  baseGold: 5,
  dropConfig: { drops: [], bonusGoldMin: 0, bonusGoldMax: 0 },
  spriteColor: 0x22c55e,
  detectionRadius: 60,
};

const MOCK_REWARD: MonsterRewardResult = {
  monsterId: 'forest-slime',
  monsterName: 'Forest Slime',
  monsterLevel: 1,
  combatExp: 10,
  baseGold: 5,
  bonusGold: 0,
  totalGold: 5,
  droppedItems: [],
};

describe('QuestManager', () => {
  let inventory: InventoryManager;
  let rewards: RewardCalculator;
  let questManager: QuestManager;

  beforeEach(() => {
    inventory = new InventoryManager();
    rewards = new RewardCalculator();
    questManager = new QuestManager(inventory, rewards);
  });

  describe('Quest Acceptance & Eligibility', () => {
    it('allows player to accept an available quest', () => {
      const res = questManager.acceptQuest('quest-slime-hunter', 1);
      expect(res.success).toBe(true);
      expect(res.record).toBeDefined();
      expect(res.record?.status).toBe(QuestStatus.InProgress);
      expect(res.record?.objectives[0].currentCount).toBe(0);
      expect(res.record?.objectives[0].requiredCount).toBe(2);
    });

    it('rejects duplicate acceptance of already active quest', () => {
      questManager.acceptQuest('quest-slime-hunter', 1);
      const res2 = questManager.acceptQuest('quest-slime-hunter', 1);
      expect(res2.success).toBe(false);
      expect(res2.error).toContain('already accepted');
    });

    it('rejects acceptance if player level requirement is not met', () => {
      // Create a hypothetical check with level 0
      const check = questManager.canAcceptQuest('quest-slime-hunter', 0);
      expect(check.canAccept).toBe(false);
      expect(check.reason).toContain('Requires level 1');
    });
  });

  describe('Objective Tracking via Monster Defeats', () => {
    it('advances kill quest objective when relevant monster is defeated', () => {
      questManager.acceptQuest('quest-slime-hunter', 1);

      // Slay 1st slime
      rewards.emitMonsterDefeated(MOCK_SLIME, MOCK_REWARD);

      let record = questManager.getQuestRecord('quest-slime-hunter');
      expect(record?.objectives[0].currentCount).toBe(1);
      expect(record?.status).toBe(QuestStatus.InProgress);

      // Slay 2nd slime
      rewards.emitMonsterDefeated(MOCK_SLIME, MOCK_REWARD);

      record = questManager.getQuestRecord('quest-slime-hunter');
      expect(record?.objectives[0].currentCount).toBe(2);
      expect(record?.status).toBe(QuestStatus.ReadyToTurnIn);
    });

    it('does not advance objectives when an unrelated monster is defeated', () => {
      questManager.acceptQuest('quest-slime-hunter', 1);

      rewards.emitMonsterDefeated(
        { ...MOCK_SLIME, id: 'goblin-scout' },
        { ...MOCK_REWARD, monsterId: 'goblin-scout' },
      );

      const record = questManager.getQuestRecord('quest-slime-hunter');
      expect(record?.objectives[0].currentCount).toBe(0);
      expect(record?.status).toBe(QuestStatus.InProgress);
    });
  });

  describe('Objective Tracking via Item Collection', () => {
    it('tracks item collection objectives based on inventory items', () => {
      questManager.acceptQuest('quest-slime-sample', 1);
      let record = questManager.getQuestRecord('quest-slime-sample');
      expect(record?.status).toBe(QuestStatus.InProgress);
      expect(record?.objectives[0].currentCount).toBe(0);

      // Pick up slime gel
      inventory.addItem('slime-gel', 1);
      questManager.refreshItemCollectionObjectives(record!);

      record = questManager.getQuestRecord('quest-slime-sample');
      expect(record?.objectives[0].currentCount).toBe(1);
    });
  });

  describe('Quest Completion & Rewards', () => {
    it('fails to complete quest if objectives are not fulfilled', () => {
      questManager.acceptQuest('quest-slime-hunter', 1);
      const res = questManager.completeQuest('quest-slime-hunter');

      expect(res.success).toBe(false);
      expect(res.error).toContain('objectives not yet completed');
    });

    it('completes kill quest, awards rewards, and marks status as Completed', () => {
      questManager.acceptQuest('quest-slime-hunter', 1);

      // Kill 2 slimes
      rewards.emitMonsterDefeated(MOCK_SLIME, MOCK_REWARD);
      rewards.emitMonsterDefeated(MOCK_SLIME, MOCK_REWARD);

      const completeRes = questManager.completeQuest('quest-slime-hunter');
      expect(completeRes.success).toBe(true);
      expect(completeRes.rewards?.combatExp).toBe(35);
      expect(completeRes.rewards?.gold).toBe(25);

      // Verify item reward was granted to inventory
      const invState = inventory.getState();
      const hasPotion = invState.slots.some(
        (s) => s?.itemId === 'minor-health-potion' && s.quantity === 2,
      );
      expect(hasPotion).toBe(true);

      const record = questManager.getQuestRecord('quest-slime-hunter');
      expect(record?.status).toBe(QuestStatus.Completed);
    });

    it('completes collection quest and deducts required items from inventory', () => {
      inventory.addItem('slime-gel', 3);
      questManager.acceptQuest('quest-slime-sample', 1);

      const completeRes = questManager.completeQuest('quest-slime-sample');
      expect(completeRes.success).toBe(true);

      // 1 slime-gel should have been deducted (leaving 2)
      const invState = inventory.getState();
      const slimeSlot = invState.slots.find((s) => s?.itemId === 'slime-gel');
      expect(slimeSlot?.quantity).toBe(2);

      // Minor mana potion rewarded
      const manaPotionSlot = invState.slots.find((s) => s?.itemId === 'minor-mana-potion');
      expect(manaPotionSlot?.quantity).toBe(2);
    });

    it('determines correct NPC quest indicator status', () => {
      expect(questManager.getNpcQuestStatus('elder-aldous', 1)).toBe('available');

      questManager.acceptQuest('quest-slime-hunter', 1);
      expect(questManager.getNpcQuestStatus('elder-aldous', 1)).toBe('in-progress');

      rewards.emitMonsterDefeated(MOCK_SLIME, MOCK_REWARD);
      rewards.emitMonsterDefeated(MOCK_SLIME, MOCK_REWARD);
      expect(questManager.getNpcQuestStatus('elder-aldous', 1)).toBe('ready-turn-in');

      questManager.completeQuest('quest-slime-hunter');
      expect(questManager.getNpcQuestStatus('elder-aldous', 1)).toBe('none');
    });
  });
});
