import { describe, it, expect, beforeEach } from 'vitest';
import { QuestManager } from '../../src/quests/QuestManager';
import { QuestCategory, QuestStatus } from '../../src/quests/QuestTypes';
import {
  QUEST_REGISTRY,
  getChainIds,
  getQuestChain,
  getQuestsForNpc,
} from '../../src/quests/QuestRegistry';
import { NPC_REGISTRY } from '../../src/quests/NPCRegistry';
import type { NPCDefinition } from '../../src/quests/NPCTypes';
import { resolveNpcDialogue } from '../../src/quests/DialogueResolver';
import { InventoryManager } from '../../src/inventory/InventoryManager';
import { RewardCalculator } from '../../src/combat/rewards/RewardCalculator';

const CHAIN_ID = 'chain-archivists-path';
const C1 = 'quest-archivist-1-first-page';
const C2 = 'quest-archivist-2-lost-formula';
const C3 = 'quest-archivist-3-final-proof';

function newManager() {
  return new QuestManager(new InventoryManager(), new RewardCalculator());
}

// ─── Content integrity ───────────────────────────────────────────────────────

describe('Phase 26.8 — story content integrity', () => {
  it('defines the sample main story chain as three ordered chapters', () => {
    const chain = getQuestChain(CHAIN_ID);
    expect(chain.map((q) => q.id)).toEqual([C1, C2, C3]);
    expect(chain.map((q) => q.orderInChain)).toEqual([1, 2, 3]);
    expect(chain.every((q) => q.category === QuestCategory.MainStory)).toBe(true);
    expect(chain.every((q) => q.chainId === CHAIN_ID)).toBe(true);
    expect(chain.every((q) => q.giverNpcId === 'chronicler-selene')).toBe(true);
  });

  it('registers the chain in the chain index', () => {
    expect(getChainIds()).toContain(CHAIN_ID);
  });

  it('classifies the sample side quest as Side', () => {
    expect(QUEST_REGISTRY['quest-side-lost-chalk'].category).toBe(QuestCategory.Side);
  });

  it('leaves pre-existing quests without a category (defaults to Side semantics)', () => {
    expect(QUEST_REGISTRY['quest-slime-hunter'].category).toBeUndefined();
    expect(QUEST_REGISTRY['quest-slime-hunter'].chainId).toBeUndefined();
  });

  it('orders an NPC\'s offered quests by chain position', () => {
    const seleneQuests = getQuestsForNpc('chronicler-selene');
    expect(seleneQuests.map((q) => q.id)).toEqual([C1, C2, C3]);
  });

  it('lists every quest a multi-quest NPC offers', () => {
    const lyraQuests = getQuestsForNpc('scholar-lyra').map((q) => q.id);
    expect(lyraQuests).toContain('quest-slime-sample');
    expect(lyraQuests).toContain('quest-side-lost-chalk');
  });

  it('only references existing quests and NPCs in prerequisites', () => {
    for (const quest of Object.values(QUEST_REGISTRY)) {
      expect(NPC_REGISTRY[quest.giverNpcId], `missing giver for ${quest.id}`).toBeDefined();
      for (const prereq of quest.requirements.prerequisiteQuestIds ?? []) {
        expect(QUEST_REGISTRY[prereq], `missing prereq ${prereq}`).toBeDefined();
      }
    }
  });
});

// ─── Prerequisite chain gating ───────────────────────────────────────────────

describe('Phase 26.8 — prerequisite chain gating', () => {
  let qm: QuestManager;

  beforeEach(() => {
    qm = newManager();
  });

  it('blocks a chained quest until its prerequisite is completed', () => {
    const check = qm.canAcceptQuest(C2, 10);
    expect(check.canAccept).toBe(false);
    expect(check.reason).toContain('Prerequisite quest not completed');
  });

  it('enforces the level gate on a chained quest', () => {
    const check = qm.canAcceptQuest(C2, 2);
    expect(check.canAccept).toBe(false);
    expect(check.reason).toContain('Requires level 3');
  });

  it('unlocks the next chapter only after completing the previous one', () => {
    expect(qm.acceptQuest(C1, 1).success).toBe(true);

    // Chapter I needs 2 Math Slimes.
    qm.handleMonsterDefeated('math-slime');
    qm.handleMonsterDefeated('math-slime');
    expect(qm.completeQuest(C1).success).toBe(true);

    expect(qm.canAcceptQuest(C2, 3).canAccept).toBe(true);
  });

  it('does not let a later chapter be accepted out of order', () => {
    expect(qm.canAcceptQuest(C3, 20).canAccept).toBe(false);
    expect(qm.canAcceptQuest(C3, 20).reason).toContain('Prerequisite quest not completed');
  });
});

// ─── Objective tracking + rewards ────────────────────────────────────────────

describe('Phase 26.8 — chain objective tracking and rewards', () => {
  let qm: QuestManager;
  let inventory: InventoryManager;

  beforeEach(() => {
    inventory = new InventoryManager();
    qm = new QuestManager(inventory, new RewardCalculator());
  });

  function completeChapterOne(): void {
    qm.acceptQuest(C1, 5);
    qm.handleMonsterDefeated('math-slime');
    qm.handleMonsterDefeated('math-slime');
    qm.completeQuest(C1);
  }

  it('advances kill objectives and grants configured rewards', () => {
    qm.acceptQuest(C1, 1);
    qm.handleMonsterDefeated('math-slime');
    expect(qm.getQuestRecord(C1)?.status).toBe(QuestStatus.InProgress);

    qm.handleMonsterDefeated('math-slime');
    expect(qm.getQuestRecord(C1)?.status).toBe(QuestStatus.ReadyToTurnIn);

    const result = qm.completeQuest(C1);
    expect(result.success).toBe(true);
    expect(result.rewards?.combatExp).toBe(40);
    expect(result.rewards?.gold).toBe(30);
    expect(
      inventory.getState().slots.some(
        (s) => s?.itemId === 'minor-health-potion' && s.quantity === 2,
      ),
    ).toBe(true);
  });

  it('completes a collect objective once the item is in inventory', () => {
    completeChapterOne();
    inventory.addItem('slime-gel', 1);

    expect(qm.acceptQuest(C2, 5).success).toBe(true);
    const result = qm.completeQuest(C2);
    expect(result.success).toBe(true);
    expect(result.rewards?.masteryExp).toEqual({ subjectId: 'mathematics', amount: 30 });

    // The turn-in item is deducted.
    const gel = inventory.getState().slots.find((s) => s?.itemId === 'slime-gel');
    expect(gel).toBeUndefined();
  });

  it('reports chain progress as chapters complete', () => {
    expect(qm.getChainProgress(CHAIN_ID, 5)).toMatchObject({
      nextQuestId: C1,
      nextAcceptable: true,
      completedCount: 0,
      totalCount: 3,
    });

    completeChapterOne();
    expect(qm.getChainProgress(CHAIN_ID, 5)).toMatchObject({
      nextQuestId: C2,
      completedCount: 1,
    });

    inventory.addItem('slime-gel', 1);
    qm.acceptQuest(C2, 5);
    qm.completeQuest(C2);

    qm.acceptQuest(C3, 5);
    for (let i = 0; i < 4; i += 1) qm.handleMonsterDefeated('number-goblin');
    qm.completeQuest(C3);

    const done = qm.getChainProgress(CHAIN_ID, 5);
    expect(done.completedCount).toBe(3);
    expect(done.nextQuestId).toBeNull();
  });

  it('surfaces a reason when the next chapter is level-locked', () => {
    completeChapterOne();
    // Chapter II requires level 3; the same player is only level 1.
    const progress = qm.getChainProgress(CHAIN_ID, 1);
    expect(progress.nextQuestId).toBe(C2);
    expect(progress.nextAcceptable).toBe(false);
    expect(progress.reason).toContain('Requires level 3');
  });
});

// ─── Dialogue conditions ─────────────────────────────────────────────────────

describe('Phase 26.8 — NPC dialogue conditions', () => {
  let qm: QuestManager;

  beforeEach(() => {
    qm = newManager();
  });

  it('uses the "available" lines when a quest can be accepted', () => {
    const res = resolveNpcDialogue(NPC_REGISTRY['chronicler-selene'], qm, 5);
    expect(res.state).toBe('available');
    expect(res.questId).toBe(C1);
    expect(res.lines.map((l) => l.text)).toEqual(
      NPC_REGISTRY['chronicler-selene'].dialogue.questAvailable,
    );
  });

  it('uses the "in-progress" lines after accepting the quest', () => {
    qm.acceptQuest(C1, 5);
    const res = resolveNpcDialogue(NPC_REGISTRY['chronicler-selene'], qm, 5);
    expect(res.state).toBe('in-progress');
    expect(res.lines.map((l) => l.text)).toEqual(
      NPC_REGISTRY['chronicler-selene'].dialogue.questInProgress,
    );
  });

  it('uses the "turn-in" lines once objectives are met', () => {
    qm.acceptQuest(C1, 5);
    qm.handleMonsterDefeated('math-slime');
    qm.handleMonsterDefeated('math-slime');
    const res = resolveNpcDialogue(NPC_REGISTRY['chronicler-selene'], qm, 5);
    expect(res.state).toBe('ready-turn-in');
    expect(res.lines.map((l) => l.text)).toEqual(
      NPC_REGISTRY['chronicler-selene'].dialogue.questCompleted,
    );
  });

  it('advances to the next chapter\'s dialogue after the previous one is completed', () => {
    qm.acceptQuest(C1, 5);
    qm.handleMonsterDefeated('math-slime');
    qm.handleMonsterDefeated('math-slime');
    qm.completeQuest(C1);

    const res = resolveNpcDialogue(NPC_REGISTRY['chronicler-selene'], qm, 5);
    expect(res.state).toBe('available');
    expect(res.questId).toBe(C2);
  });

  it('falls back to default lines for an NPC with no quests', () => {
    const res = resolveNpcDialogue(NPC_REGISTRY['merchant-barnaby'], qm, 5);
    expect(res.state).toBe('none');
    expect(res.questId).toBeUndefined();
    expect(res.lines.map((l) => l.text)).toEqual(
      NPC_REGISTRY['merchant-barnaby'].dialogue.default,
    );
  });

  it('falls back to default lines when a state has no bespoke text', () => {
    const stripped: NPCDefinition = {
      ...NPC_REGISTRY['chronicler-selene'],
      dialogue: { default: ['Only default lines here.'] },
    };
    const res = resolveNpcDialogue(stripped, qm, 5);
    expect(res.state).toBe('available');
    expect(res.lines.map((l) => l.text)).toEqual(['Only default lines here.']);
    expect(res.speaker).toBe('Chronicler Selene');
  });
});

// ─── Registry-derived NPC quest status ───────────────────────────────────────

describe('Phase 26.8 — registry-derived NPC quest status', () => {
  it('reports availability for NPCs beyond the original tutorial pair', () => {
    const qm = newManager();
    expect(qm.getNpcQuestStatus('forgemaster-durn', 20)).toBe('available');
    expect(qm.resolveNpcQuest('forgemaster-durn', 20).questId).toBe('quest-forge-order');
  });

  it('keeps the original tutorial behaviour intact', () => {
    const qm = newManager();
    expect(qm.getNpcQuestStatus('elder-aldous', 1)).toBe('available');
    qm.acceptQuest('quest-slime-hunter', 1);
    expect(qm.getNpcQuestStatus('elder-aldous', 1)).toBe('in-progress');
    qm.handleMonsterDefeated('forest-slime');
    qm.handleMonsterDefeated('forest-slime');
    expect(qm.getNpcQuestStatus('elder-aldous', 1)).toBe('ready-turn-in');
    qm.completeQuest('quest-slime-hunter');
    expect(qm.getNpcQuestStatus('elder-aldous', 1)).toBe('none');
  });
});
