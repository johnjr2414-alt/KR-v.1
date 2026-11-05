import { describe, it, expect, beforeEach } from 'vitest';
import { CurrencyService } from '../../src/economy/CurrencyService';
import { ShopService } from '../../src/economy/ShopService';
import { BankService } from '../../src/economy/BankService';
import { SHOP_REGISTRY } from '../../src/economy/ShopRegistry';
import { InventoryManager } from '../../src/inventory/InventoryManager';
import { BusinessType } from '../../src/economy/BankTypes';

describe('Economy Systems', () => {
  describe('CurrencyService (Prompt 18.1)', () => {
    let currency: CurrencyService;

    beforeEach(() => {
      currency = new CurrencyService(50);
    });

    it('initializes with positive integer balance', () => {
      expect(currency.getGold()).toBe(50);
    });

    it('adds gold and notifies listeners', () => {
      let deltaReceived = 0;
      currency.onBalanceChange((_newBal, delta) => {
        deltaReceived = delta;
      });

      const res = currency.addGold(25);
      expect(res.success).toBe(true);
      expect(res.newBalance).toBe(75);
      expect(currency.getGold()).toBe(75);
      expect(deltaReceived).toBe(25);
    });

    it('spends gold when funds are sufficient', () => {
      const res = currency.spendGold(30);
      expect(res.success).toBe(true);
      expect(res.newBalance).toBe(20);
      expect(currency.getGold()).toBe(20);
    });

    it('prevents spending more gold than available', () => {
      const res = currency.spendGold(100);
      expect(res.success).toBe(false);
      expect(res.newBalance).toBe(50);
      expect(currency.getGold()).toBe(50);
      expect(res.error).toContain('Insufficient funds');
    });

    it('rejects invalid or negative amounts', () => {
      expect(currency.addGold(-10).success).toBe(false);
      expect(currency.spendGold(0).success).toBe(false);
    });
  });

  describe('ShopService (Prompts 18.2, 18.3, 18.4)', () => {
    let currency: CurrencyService;
    let inventory: InventoryManager;
    let shopService: ShopService;
    const shop = SHOP_REGISTRY['village-general-store'];

    beforeEach(() => {
      currency = new CurrencyService(100);
      inventory = new InventoryManager();
      shopService = new ShopService(currency, inventory);
    });

    it('allows player to purchase item and deducts gold', () => {
      // Minor health potion costs 10 gold
      const res = shopService.buyItem(shop, 'minor-health-potion', 3);
      expect(res.success).toBe(true);
      expect(res.totalCost).toBe(30);
      expect(currency.getGold()).toBe(70);

      // Verify item was placed into inventory
      const slot = inventory.getState().slots[0];
      expect(slot?.itemId).toBe('minor-health-potion');
      expect(slot?.quantity).toBe(3);
    });

    it('prevents purchase if player has insufficient gold', () => {
      // 100 gold available, wooden-sword costs 20, 6 swords = 120 gold
      const res = shopService.buyItem(shop, 'wooden-sword', 6);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Insufficient gold');
      expect(currency.getGold()).toBe(100);
    });

    it('allows player to sell items from inventory for gold', () => {
      // Put 5 slime-gel (value 2, multiplier 0.5 = 1 gold each) in inventory
      inventory.addItem('slime-gel', 5);

      const res = shopService.sellItem(shop, 'slime-gel', 3);
      expect(res.success).toBe(true);
      expect(res.totalCost).toBe(3); // 3 * 1 gold
      expect(currency.getGold()).toBe(103); // 100 + 3

      // Check remaining inventory
      expect(inventory.getState().slots[0]?.quantity).toBe(2);
    });
  });

  describe('BankService, Savings & Investment (Prompts 18.5, 18.6, 18.7, 18.8)', () => {
    let currency: CurrencyService;
    let bank: BankService;

    beforeEach(() => {
      currency = new CurrencyService(200);
      bank = new BankService('player-1', currency, {
        interestRatePerInterval: 0.1, // 10%
        interestIntervalMs: 1000,
        maxSavingsLimit: 1000,
      });
    });

    it('deposits gold into savings account from purse', () => {
      const ok = bank.deposit(80);
      expect(ok).toBe(true);
      expect(bank.getSavingsBalance()).toBe(80);
      expect(currency.getGold()).toBe(120);
    });

    it('withdraws gold from savings back into purse', () => {
      bank.deposit(100);
      const ok = bank.withdraw(40);
      expect(ok).toBe(true);
      expect(bank.getSavingsBalance()).toBe(60);
      expect(currency.getGold()).toBe(140);
    });

    it('accrues savings interest based on elapsed time intervals', () => {
      bank.deposit(100); // 100 savings
      const now = Date.now();

      // Simulate 2 intervals (2,000 ms)
      const interestEarned = bank.applyInterest(now + 2100);
      // Interval 1: 100 * 0.10 = 10 -> 110
      // Interval 2: 110 * 0.10 = 11 -> 121
      expect(interestEarned).toBe(21);
      expect(bank.getSavingsBalance()).toBe(121);
    });

    it('supports investments with maturation duration and payout', () => {
      const opp = {
        id: 'invest-apothecary',
        name: 'Apothecary Expansion',
        description: 'Fund herbal harvest',
        cost: 100,
        expectedReturnRate: 0.2, // +20%
        durationMs: 5000,
      };

      const startOk = bank.startInvestment(opp, 1000);
      expect(startOk).toBe(true);
      expect(currency.getGold()).toBe(100);

      // Premature claim fails
      expect(bank.claimInvestment('invest-apothecary', 3000).success).toBe(false);

      // Matured claim succeeds with profit (100 * 1.2 = 120 gold)
      const claim = bank.claimInvestment('invest-apothecary', 6500);
      expect(claim.success).toBe(true);
      expect(claim.payout).toBe(120);
      expect(currency.getGold()).toBe(220);
    });

    it('calculates player business model daily net profits', () => {
      bank.registerBusiness({
        id: 'blacksmith-1',
        name: 'Village Forge',
        type: BusinessType.Blacksmith,
        ownerId: 'player-1',
        level: 1,
        employees: 2,
        dailyRevenue: 150,
        dailyExpenses: 60,
        productionItemIds: ['iron-blade'],
      });

      expect(bank.calculateDailyNetProfit('blacksmith-1')).toBe(90);
    });
  });
});
