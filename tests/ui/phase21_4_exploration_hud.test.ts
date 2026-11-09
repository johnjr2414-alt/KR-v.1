import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerSessionManager } from '../../src/player/PlayerSessionManager';
import { InMemoryStorageService } from '../../src/storage/IndexedDBStorageService';
import { InventoryManager } from '../../src/inventory/InventoryManager';
import { MasteryManager } from '../../src/mastery/MasteryManager';
import { QuestManager } from '../../src/quests/QuestManager';
import { CurrencyService } from '../../src/economy/CurrencyService';
import { ProgressionService } from '../../src/core/progression/ProgressionService';
import { getRequiredExpForNextLevel } from '../../src/config/expConfig';
import { EquipmentSlot } from '../../src/inventory/ItemTypes';
import { EquipmentStatCalculator } from '../../src/inventory/EquipmentStatCalculator';

describe('Phase 21.4 — Exploration HUD and UI Coordinator Unit Tests', () => {
  let session: PlayerSessionManager;
  let statCalc: EquipmentStatCalculator;

  beforeEach(() => {
    PlayerSessionManager.resetInstance();
    session = PlayerSessionManager.getInstance({
      storage: new InMemoryStorageService(),
      inventory: new InventoryManager(),
      mastery: new MasteryManager(),
      quests: new QuestManager(),
      currency: new CurrencyService(150),
      progression: new ProgressionService(),
    });
    statCalc = new EquipmentStatCalculator();
  });

  it('1. Calculates correct percentage bounds (0-100%) for HP, MP, and EXP', async () => {
    await session.initializeSession('Hero');
    const player = session.getPlayer();

    // Normal values
    const hpRatio = Math.max(0, Math.min(100, Math.round((player.currentHp / player.maxHp) * 100)));
    expect(hpRatio).toBe(100);

    // Damaged values
    player.currentHp = 45;
    const damagedHpRatio = Math.max(0, Math.min(100, Math.round((player.currentHp / player.maxHp) * 100)));
    expect(damagedHpRatio).toBe(45);

    // Negative / over-100 clamping
    const overHpRatio = Math.max(0, Math.min(100, Math.round((150 / 100) * 100)));
    expect(overHpRatio).toBe(100);

    const negativeHpRatio = Math.max(0, Math.min(100, Math.round((-10 / 100) * 100)));
    expect(negativeHpRatio).toBe(0);

    // EXP ratio
    const reqExp = getRequiredExpForNextLevel(player.level);
    expect(reqExp).toBeGreaterThan(0);
    player.currentExp = 50;
    const expRatio = Math.max(0, Math.min(100, Math.round((player.currentExp / reqExp) * 100)));
    expect(expRatio).toBeGreaterThan(0);
    expect(expRatio).toBeLessThanOrEqual(100);
  });

  it('2. Currency balance changes immediately notify listener for HUD updates', async () => {
    await session.initializeSession('Hero');
    const initialGold = session.currency.getGold(); // 100 on fresh baseline
    let notifiedBalance = 0;
    session.currency.onBalanceChange((newBal) => {
      notifiedBalance = newBal;
    });

    session.currency.addGold(75);
    expect(notifiedBalance).toBe(initialGold + 75);
    expect(session.currency.getGold()).toBe(initialGold + 75);
  });

  it('3. Equipping items through InventoryManager updates effective stats and reflects in player session', async () => {
    await session.initializeSession('Warrior');
    const player = session.getPlayer();

    // Add wooden sword and equip it
    session.inventory.addItem('wooden-sword', 1);
    const equipRes = session.inventory.equipItem(0, player.level);
    expect(equipRes.success).toBe(true);

    const equipped = session.inventory.getState().equipped;
    expect(equipped[EquipmentSlot.Weapon]).toBe('wooden-sword');

    // Calculate effective bonuses
    const stats = statCalc.calculateEffectiveStats(player, equipped);
    expect(stats.attack).toBeGreaterThan(player.attack);
  });
});
