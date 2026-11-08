import {
  ItemDefinition,
  ItemRarity,
  ItemType,
  EquipmentSlot,
  StatModifiers,
} from './ItemTypes';
import { getItemDefinition } from './ItemRegistry';

/**
 * Result of validating an item definition.
 */
export interface ItemValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates an ItemDefinition against game domain rules.
 */
export function validateItemDefinition(item: unknown): ItemValidationResult {
  const errors: string[] = [];

  if (!item || typeof item !== 'object') {
    return { isValid: false, errors: ['Item definition must be a non-null object.'] };
  }

  const def = item as Partial<ItemDefinition>;

  // ID validation
  if (typeof def.id !== 'string' || !def.id.trim()) {
    errors.push('Item must have a non-empty string ID.');
  }

  // Name validation
  if (typeof def.name !== 'string' || !def.name.trim()) {
    errors.push('Item must have a non-empty string name.');
  }

  // Type validation
  if (!def.type || !Object.values(ItemType).includes(def.type)) {
    errors.push(`Invalid item type: ${String(def.type)}.`);
  }

  // Rarity validation
  if (!def.rarity || !Object.values(ItemRarity).includes(def.rarity)) {
    errors.push(`Invalid item rarity: ${String(def.rarity)}.`);
  }

  // Value (Gold) validation
  if (typeof def.value !== 'number' || def.value < 0 || !Number.isFinite(def.value)) {
    errors.push('Item value (gold) must be a non-negative finite number.');
  }

  // Stack limit validation
  if (typeof def.stackLimit !== 'number' || def.stackLimit < 1 || !Number.isInteger(def.stackLimit)) {
    errors.push('Item stackLimit must be a positive integer.');
  }

  // Equipment specific validation
  const isEquipment =
    def.type === ItemType.Weapon ||
    def.type === ItemType.Armor ||
    def.type === ItemType.Helmet ||
    def.type === ItemType.Accessory;

  if (isEquipment) {
    if (!def.equipmentSlot || !Object.values(EquipmentSlot).includes(def.equipmentSlot)) {
      errors.push(`Equipment items must specify a valid equipmentSlot.`);
    }
    if (def.stackLimit !== 1) {
      errors.push('Equipment items must have a stackLimit of 1.');
    }
    if (def.requiredLevel !== undefined) {
      if (typeof def.requiredLevel !== 'number' || def.requiredLevel < 1 || !Number.isInteger(def.requiredLevel)) {
        errors.push('requiredLevel must be a positive integer when provided.');
      }
    }
    if (def.statModifiers) {
      for (const [key, val] of Object.entries(def.statModifiers)) {
        if (typeof val !== 'number' || !Number.isFinite(val)) {
          errors.push(`Stat modifier '${key}' must be a finite number.`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Breakdown of a single stat comparison between two items.
 */
export interface StatDiff {
  stat: keyof StatModifiers;
  currentValue: number;
  candidateValue: number;
  delta: number;
}

/**
 * Comprehensive comparison between an equipped item and a candidate equipment item.
 */
export interface EquipmentComparison {
  currentEquippedId?: string;
  currentEquippedDef?: ItemDefinition;
  candidateId: string;
  candidateDef: ItemDefinition;
  targetSlot: EquipmentSlot;
  canEquip: boolean;
  levelMet: boolean;
  requiredLevel: number;
  statDiffs: StatDiff[];
}

/**
 * Compares an inventory item against the currently equipped item in that slot.
 *
 * @param candidateItemId - The item the player is considering equipping.
 * @param currentlyEquipped - The player's active equipment map.
 * @param playerLevel - Current player level to check requirements.
 */
export function compareEquipment(
  candidateItemId: string,
  currentlyEquipped: Partial<Record<EquipmentSlot, string>>,
  playerLevel = 1,
): EquipmentComparison | null {
  const candidateDef = getItemDefinition(candidateItemId);
  if (!candidateDef || !candidateDef.equipmentSlot) {
    return null;
  }

  const slot = candidateDef.equipmentSlot;
  const currentEquippedId = currentlyEquipped[slot];
  const currentEquippedDef = currentEquippedId ? getItemDefinition(currentEquippedId) : undefined;

  const requiredLevel = candidateDef.requiredLevel ?? 1;
  const levelMet = playerLevel >= requiredLevel;
  const canEquip = levelMet;

  const currentMods = currentEquippedDef?.statModifiers ?? {};
  const candidateMods = candidateDef.statModifiers ?? {};

  const statKeys: (keyof StatModifiers)[] = [
    'hp',
    'mp',
    'attack',
    'defense',
    'intelligence',
    'critRate',
    'movementSpeed',
  ];

  const statDiffs: StatDiff[] = [];

  for (const stat of statKeys) {
    const curVal = currentMods[stat] ?? 0;
    const candVal = candidateMods[stat] ?? 0;
    const delta = candVal - curVal;

    // Only record if at least one of the items touches this stat
    if (curVal !== 0 || candVal !== 0) {
      statDiffs.push({
        stat,
        currentValue: curVal,
        candidateValue: candVal,
        delta,
      });
    }
  }

  return {
    currentEquippedId,
    currentEquippedDef,
    candidateId: candidateItemId,
    candidateDef,
    targetSlot: slot,
    canEquip,
    levelMet,
    requiredLevel,
    statDiffs,
  };
}
