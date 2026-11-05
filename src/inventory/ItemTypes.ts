/**
 * High-level item classification.
 */
export enum ItemType {
  Weapon = 'weapon',
  Armor = 'armor',
  Helmet = 'helmet',
  Accessory = 'accessory',
  Consumable = 'consumable',
  Material = 'material',
  Quest = 'quest',
}

/**
 * Item rarity tier.
 */
export enum ItemRarity {
  Common = 'common',
  Uncommon = 'uncommon',
  Rare = 'rare',
  Epic = 'epic',
  Legendary = 'legendary',
}

/**
 * Equipment slots available to the player character.
 */
export enum EquipmentSlot {
  Weapon = 'weapon',
  Armor = 'armor',
  Helmet = 'helmet',
  Accessory = 'accessory',
}

/**
 * Stat modifications granted by equipping an item.
 */
export interface StatModifiers {
  hp?: number;
  mp?: number;
  attack?: number;
  defense?: number;
  intelligence?: number;
  critRate?: number;
  movementSpeed?: number;
}

/**
 * Complete definition of an item.
 */
export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: ItemRarity;
  value: number; // Gold value
  stackLimit: number; // Max stack size (1 for equipment)
  equipmentSlot?: EquipmentSlot;
  statModifiers?: StatModifiers;
  requiredLevel?: number;
}

/**
 * A single slot in an inventory container.
 */
export interface InventorySlot {
  slotIndex: number;
  itemId: string;
  quantity: number;
}

/**
 * State representing player inventory slots and equipped gear.
 */
export interface InventoryState {
  capacity: number;
  slots: (InventorySlot | null)[];
  equipped: Partial<Record<EquipmentSlot, string>>; // Maps slot -> itemId
}
