import { ItemType } from '../inventory/ItemTypes';

/**
 * Configuration contract for equipment enhancement.
 */
export interface EnhancementConfig {
  /** Maximum enhancement level an item can reach (+10 by default). */
  maxEnhancementLevel: number;
  /** Eligible item types for enhancement (weapons, armor, helmets, accessories). */
  eligibleTypes: ItemType[];
  /** Base gold cost multiplier formula: baseCost * level^costExponent. */
  baseGoldCost: number;
  costExponent: number;
  /** Percentage stat increase per enhancement level (e.g., 0.10 for +10% per level). */
  statMultiplierPerLevel: number;
  /** Minimum flat bonus granted if percentage increase rounds to zero. */
  minFlatBonusPerLevel: number;
  /** Required material item ID and quantity per upgrade step (optional). */
  materialRequirements?: {
    [targetLevel: number]: {
      itemId: string;
      quantity: number;
    };
  };
}

/**
 * Default enhancement configuration.
 * Predictable, 100% deterministic upgrades (no random destruction or downgrades).
 */
export const DEFAULT_ENHANCEMENT_CONFIG: EnhancementConfig = {
  maxEnhancementLevel: 10,
  eligibleTypes: [ItemType.Weapon, ItemType.Armor, ItemType.Helmet, ItemType.Accessory],
  baseGoldCost: 25,
  costExponent: 1.5,
  statMultiplierPerLevel: 0.1, // +10% base stat value per level
  minFlatBonusPerLevel: 1, // At least +1 to each positive stat
  materialRequirements: {
    1: { itemId: 'slime-gel', quantity: 2 },
    2: { itemId: 'slime-gel', quantity: 3 },
    3: { itemId: 'slime-gel', quantity: 5 },
    4: { itemId: 'slime-gel', quantity: 8 },
    5: { itemId: 'rare-crystal', quantity: 1 },
    6: { itemId: 'rare-crystal', quantity: 2 },
    7: { itemId: 'rare-crystal', quantity: 3 },
    8: { itemId: 'rare-crystal', quantity: 4 },
    9: { itemId: 'rare-crystal', quantity: 5 },
    10: { itemId: 'rare-crystal', quantity: 8 },
  },
};
