import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerSessionManager } from '../../src/player/PlayerSessionManager';
import { InMemoryStorageService } from '../../src/storage/IndexedDBStorageService';
import { InventoryManager } from '../../src/inventory/InventoryManager';
import { MasteryManager } from '../../src/mastery/MasteryManager';
import { QuestManager } from '../../src/quests/QuestManager';
import { CurrencyService } from '../../src/economy/CurrencyService';
import { ProgressionService } from '../../src/core/progression/ProgressionService';
import { QuestStatus } from '../../src/quests/QuestTypes';
import { getQuestDefinition } from '../../src/quests/QuestRegistry';
import { getNPCDefinition } from '../../src/quests/NPCRegistry';

describe('Phase 21.7 — Quest Journal Data & UI Mapping Unit Tests', () => {
  let session: PlayerSessionManager;

  beforeEach(async () => {
    PlayerSessionManager.resetInstance();
    session = PlayerSessionManager.getInstance({
      storage: new InMemoryStorageService(),
      inventory: new InventoryManager(),
      mastery: new MasteryManager(),
      quests: new QuestManager(),
      currency: new CurrencyService(150),
      progression: new ProgressionService(),
    });
    await session.initializeSession('Hero');
  });

  it('1. Correctly formats and partitions active vs completed quests for journal presentation', () => {
    const acceptRes = session.quests.acceptQuest('quest-slime-hunter');
    expect(acceptRes.success).toBe(true);

    const allQuests = session.quests.getAllQuests();
    const activeQuests = allQuests.filter(
      (q) => q.status === QuestStatus.InProgress || q.status === QuestStatus.ReadyToTurnIn,
    );
    const completedQuests = allQuests.filter((q) => q.status === QuestStatus.Completed);

    expect(activeQuests.length).toBe(1);
    expect(completedQuests.length).toBe(0);

    const activeQuest = activeQuests[0];
    const def = getQuestDefinition(activeQuest.questId);
    expect(def).toBeDefined();
    expect(def?.name).toBe('Slime Infestation');

    const giver = def?.giverNpcId ? getNPCDefinition(def.giverNpcId) : undefined;
    expect(giver?.name).toBe('Elder Aldous');

    expect(activeQuest.objectives[0].currentCount).toBe(0);
    expect(activeQuest.objectives[0].requiredCount).toBe(2);
  });

  it('2. Reflects objective progression and transitions status to ReadyToTurnIn when all objectives are met', () => {
    session.quests.acceptQuest('quest-slime-hunter');
    session.quests.handleMonsterDefeated('forest-slime');
    session.quests.handleMonsterDefeated('forest-slime');

    const record = session.quests.getQuestRecord('quest-slime-hunter');
    expect(record).toBeDefined();
    expect(record?.status).toBe(QuestStatus.ReadyToTurnIn);
    expect(record?.objectives[0].currentCount).toBe(2);
    expect(record?.objectives[0].requiredCount).toBe(2);
  });

  it('3. Partitions completed quests into completed tab data after turn-in', () => {
    session.quests.acceptQuest('quest-slime-hunter');
    session.quests.handleMonsterDefeated('forest-slime');
    session.quests.handleMonsterDefeated('forest-slime');

    const result = session.quests.completeQuest('quest-slime-hunter');
    expect(result.success).toBe(true);

    const allQuests = session.quests.getAllQuests();
    const activeQuests = allQuests.filter(
      (q) => q.status === QuestStatus.InProgress || q.status === QuestStatus.ReadyToTurnIn,
    );
    const completedQuests = allQuests.filter((q) => q.status === QuestStatus.Completed);

    expect(activeQuests.length).toBe(0);
    expect(completedQuests.length).toBe(1);
    expect(completedQuests[0].status).toBe(QuestStatus.Completed);
  });

  it('4. Provides valid rewards and descriptions for UI rendering', () => {
    const def = getQuestDefinition('quest-slime-hunter');
    expect(def).toBeDefined();
    expect(def?.rewards.combatExp).toBe(35);
    expect(def?.rewards.gold).toBe(25);
    expect(def?.rewards.items?.length).toBeGreaterThan(0);
  });
});
