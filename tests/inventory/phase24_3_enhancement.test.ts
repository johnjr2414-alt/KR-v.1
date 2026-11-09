import { describe, it, expect, beforeEach } from 'vitest';
import { InventoryManager } from '../../src/inventory/InventoryManager';
import { EquipmentSlot } from '../../src/inventory/ItemTypes';
import {
  calculateEnhancedStats,
  calculateEnhancementCost,
  previewEnhancement,
} from '../../src/inventory/EnhancementService';
import { EquipmentStatCalculator } from '../../src/inventory/EquipmentStatCalculator';
import { DEFAULT_ENHANCEMENT_CONFIG } from '../../src/config/enhancementConfig';
import { validateSaveData } from '../../src/storage/SaveDataValidator';

describe('Phase 24.3 — Equipment Enhancement', () => {
  describe('Stat Increase and Cost Formulas', () => {
    it('calculates deterministic +10% stat boost per level with minimum flat guarantee', () => {
      // Base: attack 10, critRate 2
      const baseMods = { attack: 10, critRate: 2 };

      // Level 1: 10 * 0.10 = +1 -> 11 attack. critRate: 2 * 0.10 = 0.2 -> flat minimum +1 -> 3 critRate
      const lvl1 = calculateEnhancedStats(baseMods, 1);
      expect(lvl1.attack).toBe(11);
      expect(lvl1.critRate).toBe(3);

      // Level 5: 10 * 0.50 = +5 -> 15 attack. critRate: 2 * 0.50 = 1, min 5 -> 2 + 5 = 7
      const lvl5 = calculateEnhancedStats(baseMods, 5);
      expect(lvl5.attack).toBe(15);
      expect(lvl5.critRate).toBe(7);
    });

    it('returns exact base modifiers when enhancement level is 0', () => {
      const baseMods = { attack: 10, defense: 5 };
      expect(calculateEnhancedStats(baseMods, 0)).toEqual(baseMods);
    });

    it('calculates gold costs exponentially per level', () => {
      const cost1 = calculateEnhancementCost(1);
      const cost2 = calculateEnhancementCost(2);
      const cost5 = calculateEnhancementCost(5);

      expect(cost1).toBe(25); // 25 * 1^1.5
      expect(cost2).toBeGreaterThan(cost1);
      expect(cost5).toBeGreaterThan(cost2);
    });
  });

  describe('Enhancement Preview Logic', () => {
    it('generates an accurate preview with cost, material, and stat gains', () => {
      const preview = previewEnhancement(
        'iron-blade',
        0, // current level
        100, // player gold
        (matId) => (matId === 'slime-gel' ? 5 : 0), // has 5 slime-gel
      );

      expect(preview.canEnhance).toBe(true);
      expect(preview.reasons).toHaveLength(0);
      expect(preview.currentLevel).toBe(0);
      expect(preview.targetLevel).toBe(1);
      expect(preview.goldCost).toBe(25);
      expect(preview.requiredMaterial?.itemId).toBe('slime-gel');
      expect(preview.requiredMaterial?.quantityRequired).toBe(2);
      expect(preview.requiredMaterial?.hasEnough).toBe(true);
      expect(preview.statGains.attack).toBeGreaterThan(0);
    });

    it('rejects preview and provides reasons for insufficient gold or materials', () => {
      const previewNoGold = previewEnhancement('iron-blade', 0, 10, () => 5);
      expect(previewNoGold.canEnhance).toBe(false);
      expect(previewNoGold.reasons.some((r) => r.includes('Insufficient Gold'))).toBe(true);

      const previewNoMats = previewEnhancement('iron-blade', 0, 100, () => 0);
      expect(previewNoMats.canEnhance).toBe(false);
      expect(previewNoMats.reasons.some((r) => r.includes('Insufficient materials'))).toBe(true);
    });

    it('rejects enhancement for ineligible items or maximum level cap', () => {
      const consumablePreview = previewEnhancement('minor-health-potion', 0, 100, () => 10);
      expect(consumablePreview.canEnhance).toBe(false);
      expect(consumablePreview.reasons.some((r) => r.includes('not eligible'))).toBe(true);

      const maxLevelPreview = previewEnhancement(
        'iron-blade',
        DEFAULT_ENHANCEMENT_CONFIG.maxEnhancementLevel,
        1000,
        () => 10,
      );
      expect(maxLevelPreview.canEnhance).toBe(false);
      expect(maxLevelPreview.reasons.some((r) => r.includes('maximum enhancement level'))).toBe(true);
    });
  });

  describe('Atomic Enhancement Transactions & Inventory Integration', () => {
    let manager: InventoryManager;

    beforeEach(() => {
      manager = new InventoryManager();
      manager.addItem('iron-blade', 1); // slot 0
      manager.addItem('slime-gel', 10); // slot 1
    });

    it('performs atomic enhancement in inventory slot, deducting gold and materials', () => {
      let gold = 100;
      const deductGold = (amt: number) => {
        if (gold >= amt) {
          gold -= amt;
          return true;
        }
        return false;
      };

      const result = manager.enhanceItem({ type: 'slot', slotIndex: 0 }, gold, deductGold);
      expect(result.success).toBe(true);
      expect(result.previousLevel).toBe(0);
      expect(result.newLevel).toBe(1);
      expect(result.goldSpent).toBe(25);
      expect(gold).toBe(75);

      // Slot 0 item should now have enhancementLevel = 1
      expect(manager.getState().slots[0]?.enhancementLevel).toBe(1);
      // Slime gel should be reduced by 2 (10 - 2 = 8)
      expect(manager.getItemCount('slime-gel')).toBe(8);
    });

    it('rolls back consumed materials if gold deduction fails', () => {
      const deductGold = () => false; // Simulated failure

      const result = manager.enhanceItem({ type: 'slot', slotIndex: 0 }, 100, deductGold);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to deduct gold');
      // Materials must remain completely intact
      expect(manager.getItemCount('slime-gel')).toBe(10);
      expect(manager.getState().slots[0]?.enhancementLevel ?? 0).toBe(0);
    });

    it('enhances equipped gear and preserves enhancement level across equip/unequip', () => {
      // Equip iron-blade (slot 0) at level 3
      manager.equipItem(0, 3);
      expect(manager.getState().equipped[EquipmentSlot.Weapon]).toBe('iron-blade');

      let gold = 200;
      const deductGold = (amt: number) => {
        gold -= amt;
        return true;
      };

      // Enhance equipped weapon
      const res = manager.enhanceItem(
        { type: 'equipped', slot: EquipmentSlot.Weapon },
        gold,
        deductGold,
      );
      expect(res.success).toBe(true);
      expect(manager.getState().equippedEnhancements?.[EquipmentSlot.Weapon]).toBe(1);

      // Unequip weapon
      manager.unequipItem(EquipmentSlot.Weapon);
      const unequippedSlot = manager.getState().slots.find((s) => s?.itemId === 'iron-blade');
      expect(unequippedSlot).toBeDefined();
      expect(unequippedSlot?.enhancementLevel).toBe(1);

      // Re-equip weapon
      manager.equipItem(unequippedSlot!.slotIndex, 3);
      expect(manager.getState().equippedEnhancements?.[EquipmentSlot.Weapon]).toBe(1);
    });
  });

  describe('Combat Stat Calculator Integration', () => {
    it('incorporates enhancement levels into total equipment bonuses', () => {
      const calculator = new EquipmentStatCalculator();

      // Unenhanced iron-blade (attack: 10, critRate: 2)
      const baseBonuses = calculator.calculateEquipmentBonuses({
        [EquipmentSlot.Weapon]: 'iron-blade',
      });
      expect(baseBonuses.attack).toBe(10);

      // +2 Enhanced iron-blade
      const enhancedBonuses = calculator.calculateEquipmentBonuses(
        { [EquipmentSlot.Weapon]: 'iron-blade' },
        { [EquipmentSlot.Weapon]: 2 },
      );
      // attack: 10 + round(10 * 0.2) = 12
      expect(enhancedBonuses.attack).toBe(12);
    });
  });

  describe('Save Data Serialization & Backward Compatibility', () => {
    it('validates and preserves enhancement levels in slots and equipped gear', () => {
      const rawSave: any = {
        version: 3,
        updatedAt: Date.now(),
        player: {
          id: 'hero-1',
          name: 'Hero',
          level: 3,
          currentExp: 0,
          maxHp: 100,
          currentHp: 100,
          maxMp: 50,
          currentMp: 50,
          attack: 10,
          defense: 5,
          intelligence: 8,
          critRate: 5,
          movementSpeed: 1.0,
          unallocatedStatPoints: 0,
          allocatedStats: { hp: 0, mp: 0, attack: 0, defense: 0, intelligence: 0, critRate: 0 },
        },
        mastery: {},
        inventory: {
          capacity: 24,
          slots: [
            { slotIndex: 0, itemId: 'iron-blade', quantity: 1, enhancementLevel: 3 },
            null,
          ],
          equipped: { [EquipmentSlot.Armor]: 'leather-vest' },
          equippedEnhancements: { [EquipmentSlot.Armor]: 2 },
        },
        quests: [],
        settings: {
          masterVolume: 0.8,
          sfxVolume: 0.8,
          musicVolume: 0.7,
          showDamageNumbers: true,
          controlLayout: 'wasd',
        },
      };

      const result = validateSaveData(rawSave);
      expect(result.isValid).toBe(true);
      expect(result.data?.inventory.slots[0]?.enhancementLevel).toBe(3);
      expect(result.data?.inventory.equippedEnhancements?.[EquipmentSlot.Armor]).toBe(2);
    });
  });
});
