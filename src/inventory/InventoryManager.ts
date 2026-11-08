import {
  EquipmentSlot,
  type InventoryState,
  type ItemDefinition,
} from './ItemTypes';
import { getItemDefinition } from './ItemRegistry';

export interface AddItemResult {
  success: boolean;
  addedQuantity: number;
  remainingQuantity: number;
}

export interface EquipResult {
  success: boolean;
  error?: string;
  previousEquippedId?: string;
}

export const DEFAULT_INVENTORY_CAPACITY = 24;

/**
 * Headless Inventory and Equipment Management Service.
 *
 * Responsibilities:
 * - Adding/stacking items respecting stack limits
 * - Removing items
 * - Equipping/unequipping items into compatible EquipmentSlots
 * - Checking level requirements
 */
export class InventoryManager {
  private state: InventoryState;

  constructor(initialState?: InventoryState) {
    if (initialState) {
      this.state = {
        capacity: initialState.capacity,
        slots: initialState.slots.map((s) => (s ? { ...s } : null)),
        equipped: { ...initialState.equipped },
      };
    } else {
      this.state = {
        capacity: DEFAULT_INVENTORY_CAPACITY,
        slots: Array.from({ length: DEFAULT_INVENTORY_CAPACITY }, () => null),
        equipped: {},
      };
    }
  }

  /**
   * Returns a copy of the current inventory state.
   */
  getState(): Readonly<InventoryState> {
    return {
      capacity: this.state.capacity,
      slots: this.state.slots.map((s) => (s ? { ...s } : null)),
      equipped: { ...this.state.equipped },
    };
  }

  /**
   * Replaces internal inventory state with a loaded state.
   */
  loadState(newState: InventoryState): void {
    this.state = {
      capacity: newState.capacity || DEFAULT_INVENTORY_CAPACITY,
      slots: newState.slots.map((s) => (s ? { ...s } : null)),
      equipped: { ...newState.equipped },
    };
  }

  /**
   * Adds an item with quantity, stacking where possible up to the item's stackLimit.
   */
  addItem(itemId: string, quantity: number): AddItemResult {
    const itemDef = getItemDefinition(itemId);
    if (!itemDef || quantity <= 0) {
      return { success: false, addedQuantity: 0, remainingQuantity: quantity };
    }

    let remaining = quantity;

    // 1. Fill existing matching stacks
    if (itemDef.stackLimit > 1) {
      for (let i = 0; i < this.state.slots.length; i++) {
        const slot = this.state.slots[i];
        if (slot && slot.itemId === itemId && slot.quantity < itemDef.stackLimit) {
          const space = itemDef.stackLimit - slot.quantity;
          const toAdd = Math.min(space, remaining);
          slot.quantity += toAdd;
          remaining -= toAdd;
          if (remaining <= 0) break;
        }
      }
    }

    // 2. Place in new empty slots
    if (remaining > 0) {
      for (let i = 0; i < this.state.slots.length; i++) {
        if (this.state.slots[i] === null) {
          const toAdd = Math.min(itemDef.stackLimit, remaining);
          this.state.slots[i] = {
            slotIndex: i,
            itemId,
            quantity: toAdd,
          };
          remaining -= toAdd;
          if (remaining <= 0) break;
        }
      }
    }

    const added = quantity - remaining;
    return {
      success: added > 0,
      addedQuantity: added,
      remainingQuantity: remaining,
    };
  }

  /**
   * Removes a quantity of an item from inventory slots.
   */
  removeItem(itemId: string, quantity: number): boolean {
    if (quantity <= 0) return false;

    // Check if player has enough total quantity
    let totalAvailable = 0;
    for (const slot of this.state.slots) {
      if (slot && slot.itemId === itemId) {
        totalAvailable += slot.quantity;
      }
    }

    if (totalAvailable < quantity) return false;

    let remaining = quantity;
    for (let i = 0; i < this.state.slots.length; i++) {
      const slot = this.state.slots[i];
      if (slot && slot.itemId === itemId) {
        if (slot.quantity <= remaining) {
          remaining -= slot.quantity;
          this.state.slots[i] = null;
        } else {
          slot.quantity -= remaining;
          remaining = 0;
        }
        if (remaining <= 0) break;
      }
    }

    return true;
  }

  /**
   * Equips an item from an inventory slot into its designated EquipmentSlot.
   * If a slot already holds an item, it swaps with the slot item.
   */
  equipItem(slotIndex: number, playerLevel = 1): EquipResult {
    if (slotIndex < 0 || slotIndex >= this.state.slots.length) {
      return { success: false, error: 'Invalid slot index' };
    }

    const slot = this.state.slots[slotIndex];
    if (!slot) {
      return { success: false, error: 'Slot is empty' };
    }

    const itemDef = getItemDefinition(slot.itemId);
    if (!itemDef || !itemDef.equipmentSlot) {
      return { success: false, error: 'Item cannot be equipped' };
    }

    if (itemDef.requiredLevel && playerLevel < itemDef.requiredLevel) {
      return {
        success: false,
        error: `Requires level ${itemDef.requiredLevel} to equip`,
      };
    }

    const targetSlot = itemDef.equipmentSlot;
    const previouslyEquippedId = this.state.equipped[targetSlot];

    // Equip the item
    this.state.equipped[targetSlot] = slot.itemId;

    // Remove 1 quantity of the item from the inventory slot
    if (slot.quantity > 1) {
      slot.quantity -= 1;
      // If there was previously an item, place it in an open inventory slot
      if (previouslyEquippedId) {
        this.addItem(previouslyEquippedId, 1);
      }
    } else {
      // Slot had 1 item; replace slot with the previously equipped item (or null)
      if (previouslyEquippedId) {
        this.state.slots[slotIndex] = {
          slotIndex,
          itemId: previouslyEquippedId,
          quantity: 1,
        };
      } else {
        this.state.slots[slotIndex] = null;
      }
    }

    return {
      success: true,
      previousEquippedId: previouslyEquippedId,
    };
  }

  /**
   * Unequips an item from an equipment slot and places it back in inventory.
   */
  unequipItem(slot: EquipmentSlot): boolean {
    const equippedItemId = this.state.equipped[slot];
    if (!equippedItemId) return false;

    // Check if there is room in inventory
    const addRes = this.addItem(equippedItemId, 1);
    if (!addRes.success) {
      return false; // Inventory full
    }

    delete this.state.equipped[slot];
    return true;
  }

  /**
   * Returns item definition of currently equipped gear in a slot.
   */
  getEquippedItem(slot: EquipmentSlot): ItemDefinition | undefined {
    const id = this.state.equipped[slot];
    return id ? getItemDefinition(id) : undefined;
  }
}

export const inventoryManager = new InventoryManager();
