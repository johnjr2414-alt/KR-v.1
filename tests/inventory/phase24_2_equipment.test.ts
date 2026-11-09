import { describe, it, expect, beforeEach } from 'vitest';
import {
  ItemDefinition,
  ItemRarity,
  ItemType,
  EquipmentSlot,
} from '../../src/inventory/ItemTypes';
import {
  validateItemDefinition,
  compareEquipment,
} from '../../src/inventory/EquipmentComparison';
import { InventoryManager } from '../../src/inventory/InventoryManager';
import { ITEM_REGISTRY } from '../../src/inventory/ItemRegistry';

describe('Phase 24.2 — Equipment Attributes, Rarity, and Comparison', () => {
  describe('Item Definition Validation', () => {
    it('validates a standard valid equipment item successfully', () => {
      const validItem: ItemDefinition = {
        id: 'silver-sword',
        name: 'Silver Sword',
        description: 'A finely crafted silver blade.',
        type: ItemType.Weapon,
        rarity: ItemRarity.Rare,
        value: 120,
        stackLimit: 1,
        equipmentSlot: EquipmentSlot.Weapon,
        statModifiers: { attack: 15, critRate: 4 },
        requiredLevel: 5,
      };

      const result = validateItemDefinition(validItem);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects an item missing required id or name', () => {
      const invalidItem = {
        id: '',
        name: '   ',
        type: ItemType.Consumable,
        rarity: ItemRarity.Common,
        value: 10,
        stackLimit: 20,
      };

      const result = validateItemDefinition(invalidItem);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Item must have a non-empty string ID.');
      expect(result.errors).toContain('Item must have a non-empty string name.');
    });

    it('rejects an item with invalid rarity or type enum', () => {
      const invalid = {
        id: 'bad-item',
        name: 'Bad Item',
        type: 'invalid-type' as any,
        rarity: 'mythic' as any,
        value: 10,
        stackLimit: 1,
      };

      const result = validateItemDefinition(invalid);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Invalid item type'))).toBe(true);
      expect(result.errors.some((e) => e.includes('Invalid item rarity'))).toBe(true);
    });

    it('validates that all registry items are valid', () => {
      for (const [id, def] of Object.entries(ITEM_REGISTRY)) {
        const res = validateItemDefinition(def);
        expect(res.isValid, `Item '${id}' failed validation: ${res.errors.join(', ')}`).toBe(true);
      }
    });

    it('enforces equipment-specific constraints (stackLimit 1, valid slot)', () => {
      const invalidEquip: any = {
        id: 'bad-armor',
        name: 'Bad Armor',
        type: ItemType.Armor,
        rarity: ItemRarity.Common,
        value: 50,
        stackLimit: 5, // Invalid: equipment must have stackLimit 1
        statModifiers: { defense: 5 },
      };

      const res = validateItemDefinition(invalidEquip);
      expect(res.isValid).toBe(false);
      expect(res.errors).toContain('Equipment items must specify a valid equipmentSlot.');
      expect(res.errors).toContain('Equipment items must have a stackLimit of 1.');
    });
  });

  describe('Equipment Level and Slot Restrictions', () => {
    let manager: InventoryManager;

    beforeEach(() => {
      manager = new InventoryManager();
      // Add a weapon with required level 3 into slot 0
      manager.addItem('iron-blade', 1);
      // Add a consumable into slot 1
      manager.addItem('minor-health-potion', 5);
    });

    it('prevents equipping an item if player does not meet the level requirement', () => {
      // iron-blade requires level 3, player is level 1
      const res = manager.equipItem(0, 1);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Requires level 3 to equip');
      expect(manager.getState().equipped[EquipmentSlot.Weapon]).toBeUndefined();
    });

    it('allows equipping when player meets or exceeds level requirement', () => {
      const res = manager.equipItem(0, 3);
      expect(res.success).toBe(true);
      expect(manager.getState().equipped[EquipmentSlot.Weapon]).toBe('iron-blade');
      expect(manager.getState().slots[0]).toBeNull();
    });

    it('prevents equipping non-equipment items', () => {
      // slot 1 is minor-health-potion (consumable)
      const res = manager.equipItem(1, 10);
      expect(res.success).toBe(false);
      expect(res.error).toBe('Item cannot be equipped');
    });

    it('swaps previously equipped item back to the original slot', () => {
      // First equip wooden-sword at level 3
      manager.addItem('wooden-sword', 1);
      const woodenSlotIndex = manager.getState().slots.findIndex((s) => s?.itemId === 'wooden-sword');
      expect(woodenSlotIndex).toBeGreaterThanOrEqual(0);

      manager.equipItem(woodenSlotIndex, 3);
      expect(manager.getState().equipped[EquipmentSlot.Weapon]).toBe('wooden-sword');

      // Now equip iron-blade from slot 0
      const swapRes = manager.equipItem(0, 3);
      expect(swapRes.success).toBe(true);
      expect(swapRes.previousEquippedId).toBe('wooden-sword');
      expect(manager.getState().equipped[EquipmentSlot.Weapon]).toBe('iron-blade');
      // Slot 0 should now hold wooden-sword
      expect(manager.getState().slots[0]?.itemId).toBe('wooden-sword');
    });
  });

  describe('Stat Comparison Calculation', () => {
    it('returns null when candidate is not equipment or does not exist', () => {
      const comp1 = compareEquipment('non-existent-item', {});
      expect(comp1).toBeNull();

      const comp2 = compareEquipment('minor-health-potion', {});
      expect(comp2).toBeNull();
    });

    it('calculates positive and negative deltas against an equipped item', () => {
      // Compare iron-blade (ATK 10, CRIT 2) against wooden-sword (ATK 4)
      const comparison = compareEquipment('iron-blade', {
        [EquipmentSlot.Weapon]: 'wooden-sword',
      }, 3);

      expect(comparison).not.toBeNull();
      expect(comparison?.candidateId).toBe('iron-blade');
      expect(comparison?.currentEquippedId).toBe('wooden-sword');
      expect(comparison?.targetSlot).toBe(EquipmentSlot.Weapon);
      expect(comparison?.levelMet).toBe(true);
      expect(comparison?.canEquip).toBe(true);

      const atkDiff = comparison?.statDiffs.find((d) => d.stat === 'attack');
      expect(atkDiff).toBeDefined();
      expect(atkDiff?.currentValue).toBe(4);
      expect(atkDiff?.candidateValue).toBe(10);
      expect(atkDiff?.delta).toBe(6);

      const critDiff = comparison?.statDiffs.find((d) => d.stat === 'critRate');
      expect(critDiff?.currentValue).toBe(0);
      expect(critDiff?.candidateValue).toBe(2);
      expect(critDiff?.delta).toBe(2);
    });

    it('calculates stat gains when slot is currently empty', () => {
      const comparison = compareEquipment('leather-vest', {}, 3);
      expect(comparison).not.toBeNull();
      expect(comparison?.currentEquippedId).toBeUndefined();

      const defDiff = comparison?.statDiffs.find((d) => d.stat === 'defense');
      expect(defDiff?.currentValue).toBe(0);
      expect(defDiff?.candidateValue).toBe(6);
      expect(defDiff?.delta).toBe(6);
    });

    it('flags level requirement failure in comparison', () => {
      const comparison = compareEquipment('scholars-hood', {}, 2);
      expect(comparison?.levelMet).toBe(false);
      expect(comparison?.canEquip).toBe(false);
      expect(comparison?.requiredLevel).toBe(4);
    });
  });

  describe('Save / Load & State Integrity', () => {
    it('serializes and restores equipped gear mapping cleanly', () => {
      const manager = new InventoryManager();
      manager.addItem('iron-blade', 1);
      manager.equipItem(0, 5);

      const snapshot = manager.getState();
      expect(snapshot.equipped[EquipmentSlot.Weapon]).toBe('iron-blade');

      const restoredManager = new InventoryManager();
      restoredManager.loadState(snapshot);
      expect(restoredManager.getState().equipped[EquipmentSlot.Weapon]).toBe('iron-blade');
    });
  });
});
