import { describe, it, expect, beforeEach } from 'vitest';
import { InventoryManager } from '../../src/inventory/InventoryManager';
import { EquipmentSlot } from '../../src/inventory/ItemTypes';

describe('InventoryManager', () => {
  let inventory: InventoryManager;

  beforeEach(() => {
    inventory = new InventoryManager();
  });

  describe('Adding and Stacking Items', () => {
    it('initializes with default capacity (24) and empty slots', () => {
      const state = inventory.getState();
      expect(state.capacity).toBe(24);
      expect(state.slots).toHaveLength(24);
      expect(state.slots.every((s) => s === null)).toBe(true);
      expect(Object.keys(state.equipped)).toHaveLength(0);
    });

    it('adds single non-stackable item (equipment) to first free slot', () => {
      const res = inventory.addItem('wooden-sword', 1);
      expect(res.success).toBe(true);
      expect(res.addedQuantity).toBe(1);
      expect(res.remainingQuantity).toBe(0);

      const state = inventory.getState();
      expect(state.slots[0]).toEqual({
        slotIndex: 0,
        itemId: 'wooden-sword',
        quantity: 1,
      });
      expect(state.slots[1]).toBeNull();
    });

    it('adds stackable items and combines them up to stackLimit', () => {
      // Slime gel has stackLimit: 99
      const res1 = inventory.addItem('slime-gel', 10);
      expect(res1.success).toBe(true);
      expect(res1.addedQuantity).toBe(10);

      const res2 = inventory.addItem('slime-gel', 15);
      expect(res2.success).toBe(true);
      expect(res2.addedQuantity).toBe(15);

      const state = inventory.getState();
      expect(state.slots[0]).toEqual({
        slotIndex: 0,
        itemId: 'slime-gel',
        quantity: 25,
      });
      expect(state.slots[1]).toBeNull();
    });

    it('overflows to next slot when stackLimit is exceeded', () => {
      // Minor health potion stackLimit is 20
      inventory.addItem('minor-health-potion', 18);
      const res = inventory.addItem('minor-health-potion', 5);

      expect(res.success).toBe(true);
      expect(res.addedQuantity).toBe(5);
      expect(res.remainingQuantity).toBe(0);

      const state = inventory.getState();
      expect(state.slots[0]?.quantity).toBe(20);
      expect(state.slots[1]?.quantity).toBe(3);
    });

    it('reports remaining quantity when inventory capacity is exceeded', () => {
      // Fill all 24 slots with weapons
      for (let i = 0; i < 24; i++) {
        inventory.addItem('wooden-sword', 1);
      }

      const res = inventory.addItem('wooden-sword', 1);
      expect(res.success).toBe(false);
      expect(res.addedQuantity).toBe(0);
      expect(res.remainingQuantity).toBe(1);
    });
  });

  describe('Removing Items', () => {
    it('removes exact quantity from inventory', () => {
      inventory.addItem('slime-gel', 10);
      const ok = inventory.removeItem('slime-gel', 4);
      expect(ok).toBe(true);
      expect(inventory.getState().slots[0]?.quantity).toBe(6);
    });

    it('clears slot to null when exact remaining quantity is removed', () => {
      inventory.addItem('slime-gel', 5);
      const ok = inventory.removeItem('slime-gel', 5);
      expect(ok).toBe(true);
      expect(inventory.getState().slots[0]).toBeNull();
    });

    it('spans across multiple slots when removing items', () => {
      inventory.addItem('minor-health-potion', 20);
      inventory.addItem('minor-health-potion', 10);

      const ok = inventory.removeItem('minor-health-potion', 25);
      expect(ok).toBe(true);

      const state = inventory.getState();
      expect(state.slots[0]).toBeNull();
      expect(state.slots[1]?.quantity).toBe(5);
    });

    it('refuses to remove if not enough items exist', () => {
      inventory.addItem('slime-gel', 5);
      const ok = inventory.removeItem('slime-gel', 10);
      expect(ok).toBe(false);
      expect(inventory.getState().slots[0]?.quantity).toBe(5);
    });
  });

  describe('Equipping and Unequipping Items', () => {
    it('equips a weapon into the weapon slot and removes it from inventory slot', () => {
      inventory.addItem('wooden-sword', 1);
      const result = inventory.equipItem(0, 1);

      expect(result.success).toBe(true);
      const state = inventory.getState();
      expect(state.equipped[EquipmentSlot.Weapon]).toBe('wooden-sword');
      expect(state.slots[0]).toBeNull();
    });

    it('prevents equipping if player does not meet required level', () => {
      // iron-blade requires level 3
      inventory.addItem('iron-blade', 1);
      const result = inventory.equipItem(0, 2); // player is Lv.2

      expect(result.success).toBe(false);
      expect(result.error).toContain('Requires level 3');
      expect(inventory.getState().equipped[EquipmentSlot.Weapon]).toBeUndefined();
    });

    it('swaps equipped item into the slot when slot already has an item', () => {
      inventory.addItem('wooden-sword', 1);
      inventory.addItem('iron-blade', 1);

      // Equip wooden sword
      inventory.equipItem(0, 5);
      expect(inventory.getState().equipped[EquipmentSlot.Weapon]).toBe('wooden-sword');

      // Now equip iron blade from slot 1
      const res = inventory.equipItem(1, 5);
      expect(res.success).toBe(true);
      expect(res.previousEquippedId).toBe('wooden-sword');

      const state = inventory.getState();
      expect(state.equipped[EquipmentSlot.Weapon]).toBe('iron-blade');
      expect(state.slots[1]?.itemId).toBe('wooden-sword');
    });

    it('unequips an item into the first available inventory slot', () => {
      inventory.addItem('cloth-tunic', 1);
      inventory.equipItem(0, 1);
      expect(inventory.getState().equipped[EquipmentSlot.Armor]).toBe('cloth-tunic');

      const unequipSuccess = inventory.unequipItem(EquipmentSlot.Armor);
      expect(unequipSuccess).toBe(true);

      const state = inventory.getState();
      expect(state.equipped[EquipmentSlot.Armor]).toBeUndefined();
      expect(state.slots[0]?.itemId).toBe('cloth-tunic');
    });

    it('fails to unequip when inventory is full', () => {
      inventory.addItem('cloth-tunic', 1);
      inventory.equipItem(0, 1);

      // Fill remaining 24 slots with swords
      for (let i = 0; i < 24; i++) {
        inventory.addItem('wooden-sword', 1);
      }

      const unequipSuccess = inventory.unequipItem(EquipmentSlot.Armor);
      expect(unequipSuccess).toBe(false);
      expect(inventory.getState().equipped[EquipmentSlot.Armor]).toBe('cloth-tunic');
    });
  });
});
