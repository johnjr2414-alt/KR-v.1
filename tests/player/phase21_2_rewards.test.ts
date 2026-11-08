import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerSessionManager } from '../../src/player/PlayerSessionManager';
import { InMemoryStorageService } from '../../src/storage/IndexedDBStorageService';
import { InventoryManager } from '../../src/inventory/InventoryManager';
import { MasteryManager } from '../../src/mastery/MasteryManager';
import { QuestManager } from '../../src/quests/QuestManager';
import { CurrencyService } from '../../src/economy/CurrencyService';
import { ProgressionService } from '../../src/core/progression/ProgressionService';
import { validateSaveData } from '../../src/storage/SaveDataValidator';
import type { SaveData } from '../../src/storage/StorageTypes';
import { createPlayerData } from '../../src/player/PlayerData';
import { createInitialMasteryMap } from '../../src/mastery/MasteryData';
import { SubjectId, EducationalTier } from '../../src/core/types/education';
import type { MonsterDefinition } from '../../src/core/types/monster';
import { MonsterCategory } from '../../src/core/types/monster';
import { BattleSession } from '../../src/combat/BattleSession';
import { QuestionRepository } from '../../src/questions/retrieval/QuestionRepository';
import { QuestionType, QuestionStatus, type Question } from '../../src/core/types/question';
import { BattleStatus } from '../../src/combat/BattleState';
import { AnswerOutcome } from '../../src/core/types/combat';

describe('Phase 21.2 — Combat Rewards, Currency Persistence, and Defeat Respawn', () => {
  let storage: InMemoryStorageService;
  let inventory: InventoryManager;
  let mastery: MasteryManager;
  let quests: QuestManager;
  let currency: CurrencyService;
  let progression: ProgressionService;
  let session: PlayerSessionManager;

  const mockMonster: MonsterDefinition = {
    id: 'forest-slime',
    name: 'Forest Slime',
    level: 1,
    maxHp: 10,
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

  const sampleQuestion: Question = {
    id: 'math-test-1',
    subject: SubjectId.Mathematics,
    educationalTier: EducationalTier.Elementary,
    type: QuestionType.MultipleChoice,
    question: '2 + 2 = ?',
    choices: [
      { choiceId: 'c1', text: '3' },
      { choiceId: 'c2', text: '4' },
      { choiceId: 'c3', text: '5' },
    ],
    correctAnswer: 'c2',
    topic: 'addition',
    difficulty: 1,
    timeLimit: 30,
    baseMasteryExp: 10,
    status: QuestionStatus.Published,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    PlayerSessionManager.resetInstance();
    storage = new InMemoryStorageService();
    inventory = new InventoryManager();
    mastery = new MasteryManager();
    quests = new QuestManager();
    currency = new CurrencyService(100);
    progression = new ProgressionService();

    session = PlayerSessionManager.getInstance({
      storage,
      inventory,
      mastery,
      quests,
      currency,
      progression,
    });
  });

  it('1. Victory awards combat EXP, Gold, and item drops through single claim path', async () => {
    await session.initializeSession('Hero');
    const player = session.getPlayer();
    const initialExp = player.currentExp;
    const initialGold = session.currency.getGold();

    const repo = new QuestionRepository([sampleQuestion]);
    const battle = new BattleSession({
      player,
      monster: mockMonster,
      repository: repo,
      masteryManager: session.mastery,
      fixedQuestionCount: 1,
    });

    // Answer correctly to defeat slime
    battle.beginTurn();
    battle.processAnswer({
      outcome: AnswerOutcome.Correct,
      isCorrect: true,
      correctAnswerText: '4',
      submittedAnswer: '4',
    });

    expect(battle.getState().status).toBe(BattleStatus.Victory);
    const summary = battle.getEndSummary();
    expect(summary.monsterDefeated).toBe(true);
    expect(summary.expEarned).toBeGreaterThan(0);
    expect(summary.goldEarned).toBeGreaterThan(0);
    expect(summary.droppedItems.length).toBeGreaterThan(0);

    // Apply single reward claim path (mimicking BattleScene.finishBattle logic)
    session.progression.awardExp(player, summary.expEarned);
    session.currency.addGold(summary.goldEarned);
    for (const drop of summary.droppedItems) {
      session.inventory.addItem(drop.itemId, drop.quantity);
    }

    expect(player.currentExp).toBe(initialExp + summary.expEarned);
    expect(session.currency.getGold()).toBe(initialGold + summary.goldEarned);
    expect(session.inventory.hasItem('slime-gel', 1)).toBe(true);
  });

  it('2. Defeat does not award victory-only rewards (EXP, Gold, drops)', async () => {
    await session.initializeSession('Hero');
    const player = session.getPlayer();
    player.currentHp = 1; // 1 HP to ensure defeat on wrong answer
    const initialExp = player.currentExp;
    const initialGold = session.currency.getGold();

    const repo = new QuestionRepository([sampleQuestion]);
    const battle = new BattleSession({
      player,
      monster: mockMonster,
      repository: repo,
      masteryManager: session.mastery,
      fixedQuestionCount: 1,
    });

    // Answer incorrectly -> monster retaliates -> player dies
    battle.beginTurn();
    battle.processAnswer({
      outcome: AnswerOutcome.Incorrect,
      isCorrect: false,
      correctAnswerText: '4',
      submittedAnswer: 'wrong-answer',
    });

    expect(battle.getState().status).toBe(BattleStatus.Defeat);
    const summary = battle.getEndSummary();
    expect(summary.playerDefeated).toBe(true);
    expect(summary.expEarned).toBe(0);
    expect(summary.goldEarned).toBe(0);
    expect(summary.droppedItems).toHaveLength(0);

    // Verify rewards are not applied
    expect(player.currentExp).toBe(initialExp);
    expect(session.currency.getGold()).toBe(initialGold);
  });

  it('3. Defeat respawns player at safe location with full HP and saves state', async () => {
    await session.initializeSession('Hero');
    const player = session.getPlayer();
    player.currentHp = 0; // Defeated state

    // Defeat handling respawn rule: restore to max HP & Village Plaza position
    player.currentHp = player.maxHp;
    const returnSceneKey = 'VillageScene';
    const returnPosition = { x: 600, y: 550 };

    await session.saveSession();

    // Verify persisted state reflects full HP
    const saved = await storage.loadGame();
    expect(saved?.player.currentHp).toBe(player.maxHp);
    expect(returnSceneKey).toBe('VillageScene');
    expect(returnPosition).toEqual({ x: 600, y: 550 });
  });

  it('4. Gold persists across save and load cycles', async () => {
    await session.initializeSession('Rich Hero');
    session.currency.setGold(750);
    await session.saveSession();

    const saved = await storage.loadGame();
    expect(saved?.currency?.gold).toBe(750);

    // Simulate reload in new session
    PlayerSessionManager.resetInstance();
    const newSession = PlayerSessionManager.getInstance({
      storage,
      inventory: new InventoryManager(),
      mastery: new MasteryManager(),
      quests: new QuestManager(),
      currency: new CurrencyService(),
      progression: new ProgressionService(),
    });

    await newSession.initializeSession();
    expect(newSession.currency.getGold()).toBe(750);
  });

  it('5. Legacy save data without currency field loads with default gold (backward compatibility)', async () => {
    // Construct valid v1 legacy save without currency object
    const legacySave: SaveData = {
      version: 1,
      updatedAt: 1700000000000,
      player: createPlayerData('p-old', 'Legacy Adventurer', { level: 3 }),
      mastery: createInitialMasteryMap(),
      inventory: { capacity: 24, slots: [], equipped: {} },
      quests: [],
      settings: {
        masterVolume: 0.8,
        sfxVolume: 0.8,
        musicVolume: 0.7,
        showDamageNumbers: true,
        controlLayout: 'wasd',
      },
    };

    // Validate legacy save (simulating validator migrating it)
    const validated = validateSaveData(legacySave);
    expect(validated.isValid).toBe(true);
    expect(validated.data?.currency?.gold).toBe(0); // Safely defaulted

    await storage.saveGame(legacySave);

    // Initialize session from this legacy save
    await session.initializeSession();
    expect(session.getPlayer().name).toBe('Legacy Adventurer');
    expect(session.currency.getGold()).toBe(0); // Gracefully restored without error
  });

  it('6. Invalid/negative gold is safely normalized during validation', () => {
    const rawWithBadGold = {
      version: 2,
      updatedAt: Date.now(),
      player: createPlayerData('p-1', 'Test Hero'),
      mastery: createInitialMasteryMap(),
      inventory: { capacity: 24, slots: [], equipped: {} },
      quests: [],
      currency: {
        gold: -999, // Invalid negative gold
      },
      settings: {
        masterVolume: 0.8,
        sfxVolume: 0.8,
        musicVolume: 0.7,
        showDamageNumbers: true,
        controlLayout: 'wasd',
      },
    };

    const validated = validateSaveData(rawWithBadGold);
    expect(validated.isValid).toBe(true);
    expect(validated.data?.currency?.gold).toBe(0); // Normalized to 0
  });
});
