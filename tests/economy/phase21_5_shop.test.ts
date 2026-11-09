import { describe, it, expect, beforeEach } from 'vitest';
import { ShopService } from '../../src/economy/ShopService';
import { CurrencyService } from '../../src/economy/CurrencyService';
import { InventoryManager } from '../../src/inventory/InventoryManager';
import { PlayerSessionManager } from '../../src/player/PlayerSessionManager';
import { InMemoryStorageService } from '../../src/storage/IndexedDBStorageService';
import { MasteryManager } from '../../src/mastery/MasteryManager';
import { QuestManager } from '../../src/quests/QuestManager';
import { ProgressionService } from '../../src/core/progression/ProgressionService';
import type { ShopDefinition } from '../../src/economy/ShopTypes';
import { getShopForMerchant } from '../../src/economy/ShopRegistry';

describe('Phase 21.5 — Village Merchant and Shop Integration Unit Tests', () => {
  let currency: CurrencyService;
  let inventory: InventoryManager;
  let shopService: ShopService;
  let storage: InMemoryStorageService;
  let session: PlayerSessionManager;

  const testShop: ShopDefinition = {
    id: 'test-village-shop',
    name: 'Test Provisioner',
    merchantNpcId: 'merchant-barnaby',
    sellPriceMultiplier: 0.5,
    catalog: [
      { itemId: 'wooden-sword', buyPrice: 20 },
      { itemId: 'minor-health-potion', buyPrice: 10, stock: 5 },
    ],
  };

  beforeEach(() => {
    PlayerSessionManager.resetInstance();
    currency = new CurrencyService(100);
    inventory = new InventoryManager();
    shopService = new ShopService(currency, inventory);
    storage = new InMemoryStorageService();

    session = PlayerSessionManager.getInstance({
      storage,
      inventory,
      currency,
      mastery: new MasteryManager(),
      quests: new QuestManager(),
      progression: new ProgressionService(),
    });
  });

  it('1. Merchant registry resolves merchant-barnaby to village-general-store', () => {
    const shop = getShopForMerchant('merchant-barnaby');
    expect(shop).toBeDefined();
    expect(shop?.id).toBe('village-general-store');
    expect(shop?.catalog.length).toBeGreaterThan(0);
  });

  it('2. Prevents buy transaction when Gold is insufficient and does not mutate inventory', () => {
    currency.spendGold(95); // Remaining: 5 G
    expect(currency.getGold()).toBe(5);

    const res = shopService.buyItem(testShop, 'wooden-sword', 1); // Costs 20 G
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/insufficient/i);

    // State unchanged
    expect(currency.getGold()).toBe(5);
    expect(inventory.hasItem('wooden-sword', 1)).toBe(false);
  });

  it('3. Successful buy deducts Gold, adds item to inventory, and persists cleanly', async () => {
    await session.initializeSession('Hero');
    const initialGold = session.currency.getGold();

    const res = shopService.buyItem(testShop, 'minor-health-potion', 2);
    expect(res.success).toBe(true);
    expect(res.totalCost).toBe(20);

    expect(session.currency.getGold()).toBe(initialGold - 20);
    expect(session.inventory.hasItem('minor-health-potion', 2)).toBe(true);

    // Save and verify storage snapshot
    await session.saveSession();
    const loaded = await storage.loadGame();
    expect(loaded?.currency?.gold).toBe(initialGold - 20);
    expect(loaded?.inventory.slots.some((s) => s?.itemId === 'minor-health-potion')).toBe(true);
  });

  it('4. Prevents buy transaction when inventory is completely full without deducting Gold', () => {
    // Fill all 24 inventory slots with registered non-stackable weapons
    for (let i = 0; i < 24; i++) {
      inventory.addItem('wooden-sword', 1);
    }

    const goldBefore = currency.getGold();
    const res = shopService.buyItem(testShop, 'minor-health-potion', 1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/full/i);
    expect(currency.getGold()).toBe(goldBefore);
  });

  it('5. Successful sell removes item from inventory and credits Gold', () => {
    inventory.addItem('slime-gel', 3);
    const goldBefore = currency.getGold();

    const res = shopService.sellItem(testShop, 'slime-gel', 2);
    expect(res.success).toBe(true);
    expect(res.totalCost).toBeGreaterThan(0);

    expect(currency.getGold()).toBe(goldBefore + res.totalCost);
    expect(inventory.hasItem('slime-gel', 1)).toBe(true);
    expect(inventory.hasItem('slime-gel', 2)).toBe(false);
  });

  it('6. Selling fails if player does not own the requested quantity', () => {
    inventory.addItem('wooden-sword', 1);
    const goldBefore = currency.getGold();

    const res = shopService.sellItem(testShop, 'wooden-sword', 2);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/not have enough/i);

    expect(currency.getGold()).toBe(goldBefore);
    expect(inventory.hasItem('wooden-sword', 1)).toBe(true);
  });

  it('7. Negative or 0 quantity transactions are rejected', () => {
    const buyRes = shopService.buyItem(testShop, 'wooden-sword', -1);
    expect(buyRes.success).toBe(false);

    const sellRes = shopService.sellItem(testShop, 'wooden-sword', 0);
    expect(sellRes.success).toBe(false);
  });
});
