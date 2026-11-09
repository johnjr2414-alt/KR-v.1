import { describe, it, expect, beforeEach } from 'vitest';
import { BankService } from '../../src/economy/BankService';
import { CurrencyService } from '../../src/economy/CurrencyService';
import { PlayerSessionManager } from '../../src/player/PlayerSessionManager';
import { InMemoryStorageService } from '../../src/storage/IndexedDBStorageService';
import { InventoryManager } from '../../src/inventory/InventoryManager';
import { MasteryManager } from '../../src/mastery/MasteryManager';
import { QuestManager } from '../../src/quests/QuestManager';
import { ProgressionService } from '../../src/core/progression/ProgressionService';
import { SkillManager } from '../../src/skills/SkillManager';
import { AVAILABLE_INVESTMENTS, AVAILABLE_BUSINESSES } from '../../src/economy/BankRegistry';
import { getNPCDefinition } from '../../src/quests/NPCRegistry';
import { NPCType } from '../../src/quests/NPCTypes';
import { validateSaveData } from '../../src/storage/SaveDataValidator';

describe('Phase 24 — Village Bank & Commerce Systems', () => {
  let currency: CurrencyService;
  let bank: BankService;
  let storage: InMemoryStorageService;
  let session: PlayerSessionManager;

  beforeEach(async () => {
    PlayerSessionManager.resetInstance();
    currency = new CurrencyService(100);
    bank = new BankService('player-1', currency, {
      interestRatePerInterval: 0.05, // 5%
      interestIntervalMs: 1000,
      maxSavingsLimit: 5000,
    });
    storage = new InMemoryStorageService();

    session = PlayerSessionManager.getInstance({
      storage,
      inventory: new InventoryManager(),
      mastery: new MasteryManager(),
      quests: new QuestManager(),
      currency,
      progression: new ProgressionService(),
      skills: new SkillManager(),
      bank,
    });

    await session.initializeSession('Hero');
    currency.setGold(300);
  });

  it('1. Correctly deposits gold into savings vault and enforces maximum savings capacity', () => {
    expect(currency.getGold()).toBe(300);
    expect(bank.getSavingsBalance()).toBe(0);

    // Deposit 120 gold
    const ok = bank.deposit(120);
    expect(ok).toBe(true);
    expect(bank.getSavingsBalance()).toBe(120);
    expect(currency.getGold()).toBe(180);

    // Attempting to deposit more than carried purse fails
    const failOverdraw = bank.deposit(500);
    expect(failOverdraw).toBe(false);
    expect(bank.getSavingsBalance()).toBe(120);
    expect(currency.getGold()).toBe(180);

    // Attempting to deposit negative or zero fails
    expect(bank.deposit(0)).toBe(false);
    expect(bank.deposit(-50)).toBe(false);
  });

  it('2. Withdraws gold from savings vault back into purse funds', () => {
    bank.deposit(200);
    expect(bank.getSavingsBalance()).toBe(200);
    expect(currency.getGold()).toBe(100);

    // Withdraw 75 gold
    const ok = bank.withdraw(75);
    expect(ok).toBe(true);
    expect(bank.getSavingsBalance()).toBe(125);
    expect(currency.getGold()).toBe(175);

    // Attempting to withdraw more than savings balance fails
    const failOverdraw = bank.withdraw(300);
    expect(failOverdraw).toBe(false);
    expect(bank.getSavingsBalance()).toBe(125);
    expect(currency.getGold()).toBe(175);
  });

  it('3. Computes compound interest yields over elapsed time intervals', () => {
    bank.deposit(200);
    const now = Date.now();

    // 1 interval elapsed (1000 ms): 200 * 0.05 = 10 interest
    const interest = bank.applyInterest(now + 1100);
    expect(interest).toBe(10);
    expect(bank.getSavingsBalance()).toBe(210);

    // Second interval: 210 * 0.05 = 10.5 -> 10 interest -> 220
    const interest2 = bank.applyInterest(now + 2200);
    expect(interest2).toBe(10);
    expect(bank.getSavingsBalance()).toBe(220);
  });

  it('4. Funds venture investments and claims matured returns with profit', () => {
    const opp = AVAILABLE_INVESTMENTS[0]; // Apothecary Herb Expedition (50 G, +20% -> 60 G, 45s)
    expect(opp).toBeDefined();

    const startOk = bank.startInvestment(opp, 10_000);
    expect(startOk).toBe(true);
    expect(currency.getGold()).toBe(250); // 300 - 50

    // Claim prematurely fails
    const earlyClaim = bank.claimInvestment(opp.id, 20_000);
    expect(earlyClaim.success).toBe(false);
    expect(currency.getGold()).toBe(250);

    // Claim after maturation (45s -> at timestamp 55_000+)
    const matureClaim = bank.claimInvestment(opp.id, 60_000);
    expect(matureClaim.success).toBe(true);
    expect(matureClaim.payout).toBe(60); // 50 * 1.2 = 60
    expect(currency.getGold()).toBe(310); // 250 + 60
  });

  it('5. Registers and calculates net operating margins for municipal commercial enterprises', () => {
    for (const biz of AVAILABLE_BUSINESSES) {
      bank.registerBusiness(biz);
    }

    const businesses = bank.getAllBusinesses();
    expect(businesses.length).toBeGreaterThanOrEqual(2);

    const teaStall = bank.getBusiness('biz-village-tea');
    expect(teaStall).toBeDefined();
    // Daily revenue 40, expenses 15 -> net margin 25
    expect(bank.calculateDailyNetProfit('biz-village-tea')).toBe(25);
  });

  it('6. Verifies Treasurer Aurelius NPC registration and Banker role', () => {
    const banker = getNPCDefinition('treasurer-aurelius');
    expect(banker).toBeDefined();
    expect(banker?.type).toBe(NPCType.Banker);
    expect(banker?.name).toBe('Treasurer Aurelius');
    expect(banker?.mapId).toBe('beginners-village');
    expect(banker?.dialogue.default.length).toBeGreaterThan(0);
  });

  it('7. Serializes bank savings, active investments, and businesses across sessions', async () => {
    bank.deposit(150);
    bank.startInvestment(AVAILABLE_INVESTMENTS[0], Date.now());

    const snapshot = session.createSnapshot();
    expect(snapshot.bank).toBeDefined();
    expect(snapshot.bank?.account.savingsBalance).toBe(150);
    expect(snapshot.bank?.activeInvestments.length).toBe(1);

    // Validate schema
    const validation = validateSaveData(snapshot);
    expect(validation.isValid).toBe(true);
    expect(validation.data?.bank?.account.savingsBalance).toBe(150);
  });
});
