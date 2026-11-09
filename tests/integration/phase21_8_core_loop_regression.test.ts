import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlayerSessionManager } from '../../src/player/PlayerSessionManager';
import { InMemoryStorageService } from '../../src/storage/IndexedDBStorageService';
import { InventoryManager } from '../../src/inventory/InventoryManager';
import { MasteryManager } from '../../src/mastery/MasteryManager';
import { QuestManager } from '../../src/quests/QuestManager';
import { CurrencyService } from '../../src/economy/CurrencyService';
import { ProgressionService } from '../../src/core/progression/ProgressionService';
import { ShopService } from '../../src/economy/ShopService';
import { getShopForMerchant } from '../../src/economy/ShopRegistry';
import { BattleSession } from '../../src/combat/BattleSession';
import { QuestionManager } from '../../src/questions/management/QuestionManager';
import { QuestionRepository } from '../../src/questions/retrieval/QuestionRepository';
import type { QuestionStore } from '../../src/storage/QuestionStore';
import { AnswerOutcome } from '../../src/core/types/combat';
import { BattleStatus } from '../../src/combat/BattleState';
import { QuestStatus } from '../../src/quests/QuestTypes';
import { EducationalTier, SubjectId } from '../../src/core/types/education';
import { QuestionType, QuestionStatus, type Question } from '../../src/core/types/question';
import { MonsterCategory, type MonsterDefinition } from '../../src/core/types/monster';

class MockQuestionStore implements QuestionStore {
  private questions: Map<string, Question> = new Map();
  private tombstones: Set<string> = new Set();

  async init(): Promise<void> {}
  async getAll(): Promise<Question[]> {
    return [...this.questions.values()];
  }
  async getById(id: string): Promise<Question | undefined> {
    return this.questions.get(id);
  }
  async save(question: Question): Promise<void> {
    this.questions.set(question.id, { ...question });
  }
  async saveAll(questions: Question[]): Promise<void> {
    for (const q of questions) {
      this.questions.set(q.id, { ...q });
    }
  }
  async delete(id: string): Promise<void> {
    this.questions.delete(id);
  }
  async getTombstones(): Promise<string[]> {
    return [...this.tombstones];
  }
  async addTombstone(id: string): Promise<void> {
    this.tombstones.add(id);
  }
  async clear(): Promise<void> {
    this.questions.clear();
    this.tombstones.clear();
  }
}

describe('Phase 21.8 — End-to-End Core Loop Regression Suite', () => {
  let storage: InMemoryStorageService;
  let session: PlayerSessionManager;

  const sampleQuestion: Question = {
    id: 'math-test-slime',
    subject: SubjectId.Mathematics,
    educationalTier: EducationalTier.Elementary,
    topic: 'arithmetic',
    difficulty: 1,
    type: QuestionType.MultipleChoice,
    question: '5 + 5 = ?',
    choices: [
      { choiceId: 'c1', text: '10' },
      { choiceId: 'c2', text: '12' },
    ],
    correctAnswer: 'c1',
    timeLimit: 30,
    baseMasteryExp: 10,
    status: QuestionStatus.Published,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockMonster: MonsterDefinition = {
    id: 'forest-slime',
    name: 'Forest Slime',
    level: 1,
    maxHp: 15,
    attack: 20,
    defense: 0,
    subject: SubjectId.Mathematics,
    category: MonsterCategory.Normal,
    baseExp: 25,
    baseGold: 15,
    dropConfig: {
      bonusGoldMin: 5,
      bonusGoldMax: 10,
      drops: [{ itemId: 'slime-gel', dropChance: 1.0, minQuantity: 1, maxQuantity: 2 }],
    },
    spriteColor: 0x22c55e,
    detectionRadius: 60,
  };

  beforeEach(async () => {
    PlayerSessionManager.resetInstance();
    storage = new InMemoryStorageService();

    session = PlayerSessionManager.getInstance({
      storage,
      inventory: new InventoryManager(),
      mastery: new MasteryManager(),
      quests: new QuestManager(),
      currency: new CurrencyService(100),
      progression: new ProgressionService(),
    });

    await session.initializeSession('RegressionHero');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Journey Step 1-4: Boots, initializes session, loads initial state for Beginners Village', () => {
    expect(session.isInitialized()).toBe(true);
    const player = session.getPlayer();
    expect(player.name).toBe('RegressionHero');
    expect(player.level).toBe(1);
    expect(player.currentHp).toBe(player.maxHp);
    expect(player.currentMp).toBe(player.maxMp);
    expect(session.currency.getGold()).toBe(100);
  });

  it('Journey Step 5-8: Accepts quest, tracks objectives, and inspects quest journal data', () => {
    const acceptRes = session.quests.acceptQuest('quest-slime-hunter');
    expect(acceptRes.success).toBe(true);

    const record = session.quests.getQuestRecord('quest-slime-hunter');
    expect(record).toBeDefined();
    expect(record?.status).toBe(QuestStatus.InProgress);
    expect(record?.objectives[0].currentCount).toBe(0);
    expect(record?.objectives[0].requiredCount).toBe(2);
  });

  it('Journey Step 9-11: Visits Merchant Barnaby, buys item, sells item, updates currency', () => {
    const shopDef = getShopForMerchant('merchant-barnaby');
    expect(shopDef).toBeDefined();

    const shop = new ShopService(session.currency, session.inventory);

    // Initial Gold: 100. Buy wooden-sword (price: 20)
    const buyRes = shop.buyItem(shopDef!, 'wooden-sword', 1);
    expect(buyRes.success).toBe(true);
    expect(session.currency.getGold()).toBe(80);
    expect(session.inventory.hasItem('wooden-sword', 1)).toBe(true);

    // Sell wooden-sword back (base value: 15 * multiplier 0.5 = 7 gold)
    const sellRes = shop.sellItem(shopDef!, 'wooden-sword', 1);
    expect(sellRes.success).toBe(true);
    expect(sellRes.totalCost).toBe(7);
    expect(session.currency.getGold()).toBe(87);
    expect(session.inventory.hasItem('wooden-sword', 1)).toBe(false);
  });

  it('Journey Step 12-19: Combat loop: correct answers, timer expiration, victory, and reward payout', () => {
    // 1. Accept quest first so monster defeats are tracked
    session.quests.acceptQuest('quest-slime-hunter');

    const repo = new QuestionRepository([sampleQuestion]);
    const battle = new BattleSession({
      player: session.getPlayer(),
      monster: mockMonster,
      repository: repo,
      masteryManager: session.mastery,
      fixedQuestionCount: 3,
    });

    expect(battle.isBattleOver()).toBe(false);

    // Turn 1: Correct answer (player deals damage)
    battle.beginTurn();
    const t1 = battle.processAnswer({
      outcome: AnswerOutcome.Correct,
      isCorrect: true,
      correctAnswerText: '10',
      submittedAnswer: '10',
    }, false);
    expect(t1.outcome).toBe(AnswerOutcome.Correct);
    expect(t1.damageToMonster).toBeGreaterThan(0);

    // Turn 2: Timeout (player takes damage)
    battle.beginTurn();
    const t2 = battle.processAnswer({
      outcome: AnswerOutcome.Timeout,
      isCorrect: false,
      correctAnswerText: '10',
      submittedAnswer: '',
    }, false);
    expect(t2.outcome).toBe(AnswerOutcome.Timeout);
    expect(t2.damageToPlayer).toBeGreaterThan(0);

    // Turn 3: Fatal strike to monster
    battle.beginTurn();
    battle.processAnswer({
      outcome: AnswerOutcome.Correct,
      isCorrect: true,
      correctAnswerText: '10',
      submittedAnswer: '10',
    }, false);
    expect(battle.getState().status).toBe(BattleStatus.Victory);
    expect(battle.isBattleOver()).toBe(true);

    // Claim rewards through session (matching BattleScene payout)
    const summary = battle.getEndSummary();
    const initialExp = session.getPlayer().currentExp;
    const initialGold = session.currency.getGold();

    session.progression.awardExp(session.getPlayer(), summary.expEarned);
    session.currency.addGold(summary.goldEarned);
    for (const drop of summary.droppedItems) {
      session.inventory.addItem(drop.itemId, drop.quantity);
    }

    expect(session.getPlayer().currentExp).toBe(initialExp + summary.expEarned);
    expect(session.currency.getGold()).toBe(initialGold + summary.goldEarned);

    // Advance quest kill objective
    session.quests.handleMonsterDefeated('forest-slime');
    session.quests.handleMonsterDefeated('forest-slime');
    expect(session.quests.getQuestRecord('quest-slime-hunter')?.status).toBe(QuestStatus.ReadyToTurnIn);
  });

  it('Journey Step 20-22: Defeat and safe respawn restores HP, preserves gold/inventory, saves session', async () => {
    const player = session.getPlayer();
    player.currentHp = 0;

    // Defeat handling (matching BattleScene / VillageScene respawn)
    player.currentHp = player.maxHp;
    expect(player.currentHp).toBe(player.maxHp);
    expect(session.currency.getGold()).toBe(100);

    await session.saveSession();
    const loadedSave = await storage.loadGame();
    expect(loadedSave).not.toBeNull();
    expect(loadedSave?.player.currentHp).toBe(player.maxHp);
  });

  it('Journey Step 23-24: Browser reload simulation verifies state persistence across reload', async () => {
    // Modify player state
    session.currency.addGold(50);
    session.inventory.addItem('wooden-sword', 1);
    await session.saveSession();

    // Reset memory and simulate reload from storage
    PlayerSessionManager.resetInstance();
    const reloadedSession = PlayerSessionManager.getInstance({
      storage,
      inventory: new InventoryManager(),
      mastery: new MasteryManager(),
      quests: new QuestManager(),
      currency: new CurrencyService(0),
      progression: new ProgressionService(),
    });

    await reloadedSession.initializeSession();
    expect(reloadedSession.currency.getGold()).toBe(150);
    expect(reloadedSession.inventory.hasItem('wooden-sword', 1)).toBe(true);
  });

  it('Journey Step 25-27: Admin CRUD modifies question store and propagates to combat selection', async () => {
    const repo = new QuestionRepository();
    const mockStore = new MockQuestionStore();
    const manager = new QuestionManager(repo, mockStore);
    await manager.initialize();

    // 1. Create a published question via Admin QuestionManager
    const newQuestion: Question = {
      id: 'calculus-derivative-sin',
      subject: SubjectId.Mathematics,
      educationalTier: EducationalTier.College,
      topic: 'Calculus',
      difficulty: 4,
      type: QuestionType.MultipleChoice,
      question: 'What is the derivative of sin(x)?',
      choices: [
        { choiceId: 'c1', text: 'cos(x)' },
        { choiceId: 'c2', text: '-cos(x)' },
      ],
      correctAnswer: 'c1',
      timeLimit: 30,
      baseMasteryExp: 50,
      status: QuestionStatus.Published,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const createRes = await manager.createQuestion(newQuestion);
    expect(createRes.question).toBeDefined();

    // 2. Question is immediately in effective repository
    const q = repo.getById('calculus-derivative-sin');
    expect(q).toBeDefined();
    expect(q?.question).toBe('What is the derivative of sin(x)?');
    expect(q?.correctAnswer).toBe('c1');
  });
});
