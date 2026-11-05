import {
  EquipmentSlot,
  ItemRarity,
  ItemType,
  type ItemDefinition,
} from './ItemTypes';

export const ITEM_REGISTRY: Record<string, ItemDefinition> = {
  // ── Weapons ──
  'wooden-sword': {
    id: 'wooden-sword',
    name: 'Wooden Sword',
    description: 'A sturdy practice sword carved from oak.',
    type: ItemType.Weapon,
    rarity: ItemRarity.Common,
    value: 15,
    stackLimit: 1,
    equipmentSlot: EquipmentSlot.Weapon,
    statModifiers: { attack: 4 },
    requiredLevel: 1,
  },
  'iron-blade': {
    id: 'iron-blade',
    name: 'Iron Blade',
    description: 'A reliable forged iron sword with a sharp edge.',
    type: ItemType.Weapon,
    rarity: ItemRarity.Uncommon,
    value: 50,
    stackLimit: 1,
    equipmentSlot: EquipmentSlot.Weapon,
    statModifiers: { attack: 10, critRate: 2 },
    requiredLevel: 3,
  },

  // ── Armor ──
  'cloth-tunic': {
    id: 'cloth-tunic',
    name: 'Cloth Tunic',
    description: 'A comfortable woven tunic offering modest protection.',
    type: ItemType.Armor,
    rarity: ItemRarity.Common,
    value: 12,
    stackLimit: 1,
    equipmentSlot: EquipmentSlot.Armor,
    statModifiers: { defense: 2, hp: 10 },
    requiredLevel: 1,
  },
  'leather-vest': {
    id: 'leather-vest',
    name: 'Leather Vest',
    description: 'Tough cured leather that dampens enemy blows.',
    type: ItemType.Armor,
    rarity: ItemRarity.Uncommon,
    value: 45,
    stackLimit: 1,
    equipmentSlot: EquipmentSlot.Armor,
    statModifiers: { defense: 6, hp: 25 },
    requiredLevel: 3,
  },

  // ── Helmet ──
  'leather-cap': {
    id: 'leather-cap',
    name: 'Leather Cap',
    description: 'A supple cap protecting the brow.',
    type: ItemType.Helmet,
    rarity: ItemRarity.Common,
    value: 10,
    stackLimit: 1,
    equipmentSlot: EquipmentSlot.Helmet,
    statModifiers: { defense: 2 },
    requiredLevel: 1,
  },
  'scholars-hood': {
    id: 'scholars-hood',
    name: "Scholar's Hood",
    description: 'An enchanted cowl enhancing clarity and focus.',
    type: ItemType.Helmet,
    rarity: ItemRarity.Rare,
    value: 80,
    stackLimit: 1,
    equipmentSlot: EquipmentSlot.Helmet,
    statModifiers: { defense: 4, intelligence: 6, mp: 20 },
    requiredLevel: 4,
  },

  // ── Accessories ──
  'copper-ring': {
    id: 'copper-ring',
    name: 'Copper Ring',
    description: 'A simple band polished to a warm sheen.',
    type: ItemType.Accessory,
    rarity: ItemRarity.Common,
    value: 20,
    stackLimit: 1,
    equipmentSlot: EquipmentSlot.Accessory,
    statModifiers: { critRate: 3 },
    requiredLevel: 1,
  },
  'amulet-of-logic': {
    id: 'amulet-of-logic',
    name: 'Amulet of Logic',
    description: 'A glowing pendant that sharpens deduction.',
    type: ItemType.Accessory,
    rarity: ItemRarity.Rare,
    value: 90,
    stackLimit: 1,
    equipmentSlot: EquipmentSlot.Accessory,
    statModifiers: { intelligence: 8, attack: 3 },
    requiredLevel: 4,
  },

  // ── Consumables ──
  'minor-health-potion': {
    id: 'minor-health-potion',
    name: 'Minor Health Potion',
    description: 'Restores 35 HP when consumed.',
    type: ItemType.Consumable,
    rarity: ItemRarity.Common,
    value: 8,
    stackLimit: 20,
  },
  'minor-mana-potion': {
    id: 'minor-mana-potion',
    name: 'Minor Mana Potion',
    description: 'Restores 25 MP when consumed.',
    type: ItemType.Consumable,
    rarity: ItemRarity.Common,
    value: 8,
    stackLimit: 20,
  },

  // ── Monster Drops & Materials ──
  'slime-gel': {
    id: 'slime-gel',
    name: 'Slime Gel',
    description: 'A viscous droplet harvested from slimes.',
    type: ItemType.Material,
    rarity: ItemRarity.Common,
    value: 2,
    stackLimit: 99,
  },
  'rare-crystal': {
    id: 'rare-crystal',
    name: 'Rare Crystal',
    description: 'A crystalline prism resonating with latent power.',
    type: ItemType.Material,
    rarity: ItemRarity.Rare,
    value: 30,
    stackLimit: 50,
  },
};

export function getItemDefinition(id: string): ItemDefinition | undefined {
  return ITEM_REGISTRY[id];
}
