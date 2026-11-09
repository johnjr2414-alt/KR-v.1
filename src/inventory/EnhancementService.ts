import {
  ItemDefinition,
  StatModifiers,
} from './ItemTypes';
import { getItemDefinition } from './ItemRegistry';
import {
  EnhancementConfig,
  DEFAULT_ENHANCEMENT_CONFIG,
} from '../config/enhancementConfig';

/**
 * Preview calculations for upgrading an item to the next enhancement level.
 */
export interface EnhancementPreview {
  canEnhance: boolean;
  reasons: string[];
  itemId: string;
  itemDef: ItemDefinition;
  currentLevel: number;
  targetLevel: number;
  goldCost: number;
  requiredMaterial?: {
    itemId: string;
    materialDef?: ItemDefinition;
    quantityRequired: number;
    quantityAvailable: number;
    hasEnough: boolean;
  };
  currentStats: StatModifiers;
  nextStats: StatModifiers;
  statGains: StatModifiers;
}

/**
 * Result of an atomic enhancement transaction.
 */
export interface EnhancementResult {
  success: boolean;
  error?: string;
  previousLevel: number;
  newLevel: number;
  goldSpent: number;
  materialSpent?: {
    itemId: string;
    quantity: number;
  };
  effectiveStats: StatModifiers;
}

/**
 * Calculates effective stats for an item given its base definition and enhancement level.
 */
export function calculateEnhancedStats(
  baseModifiers: StatModifiers | undefined,
  enhancementLevel: number,
  config: EnhancementConfig = DEFAULT_ENHANCEMENT_CONFIG,
): StatModifiers {
  if (!baseModifiers || enhancementLevel <= 0) {
    return { ...baseModifiers };
  }

  const effective: StatModifiers = {};
  const multiplier = enhancementLevel * config.statMultiplierPerLevel;

  for (const [key, rawVal] of Object.entries(baseModifiers)) {
    const statKey = key as keyof StatModifiers;
    const baseVal = rawVal ?? 0;
    if (baseVal > 0) {
      const percentageBonus = Math.round(baseVal * multiplier);
      const guaranteedBonus = enhancementLevel * config.minFlatBonusPerLevel;
      const totalBonus = Math.max(percentageBonus, guaranteedBonus);
      effective[statKey] = baseVal + totalBonus;
    } else {
      effective[statKey] = baseVal;
    }
  }

  return effective;
}

/**
 * Calculates gold cost for upgrading to a specific target level.
 */
export function calculateEnhancementCost(
  targetLevel: number,
  config: EnhancementConfig = DEFAULT_ENHANCEMENT_CONFIG,
): number {
  if (targetLevel <= 0) return 0;
  return Math.floor(config.baseGoldCost * Math.pow(targetLevel, config.costExponent));
}

/**
 * Generates an immutable preview of the proposed upgrade before committing any resources.
 */
export function previewEnhancement(
  itemId: string,
  currentLevel = 0,
  playerGold = 0,
  hasMaterialCount: (materialId: string) => number = () => 0,
  config: EnhancementConfig = DEFAULT_ENHANCEMENT_CONFIG,
): EnhancementPreview {
  const itemDef = getItemDefinition(itemId);
  const reasons: string[] = [];

  if (!itemDef) {
    return {
      canEnhance: false,
      reasons: ['Item definition not found.'],
      itemId,
      itemDef: {} as any,
      currentLevel,
      targetLevel: currentLevel + 1,
      goldCost: 0,
      currentStats: {},
      nextStats: {},
      statGains: {},
    };
  }

  if (!config.eligibleTypes.includes(itemDef.type)) {
    reasons.push(`Item type '${itemDef.type}' is not eligible for enhancement.`);
  }

  if (currentLevel >= config.maxEnhancementLevel) {
    reasons.push(`Item has already reached the maximum enhancement level (+${config.maxEnhancementLevel}).`);
  }

  const targetLevel = currentLevel + 1;
  const goldCost = calculateEnhancementCost(targetLevel, config);

  if (playerGold < goldCost) {
    reasons.push(`Insufficient Gold (Required: ${goldCost} G, Available: ${playerGold} G).`);
  }

  let requiredMaterialPreview: EnhancementPreview['requiredMaterial'] | undefined;
  if (config.materialRequirements && config.materialRequirements[targetLevel]) {
    const matReq = config.materialRequirements[targetLevel];
    const available = hasMaterialCount(matReq.itemId);
    const hasEnough = available >= matReq.quantity;

    requiredMaterialPreview = {
      itemId: matReq.itemId,
      materialDef: getItemDefinition(matReq.itemId),
      quantityRequired: matReq.quantity,
      quantityAvailable: available,
      hasEnough,
    };

    if (!hasEnough) {
      reasons.push(`Insufficient materials (Requires ${matReq.quantity}x of ${matReq.itemId}, you have ${available}).`);
    }
  }

  const currentStats = calculateEnhancedStats(itemDef.statModifiers, currentLevel, config);
  const nextStats = calculateEnhancedStats(itemDef.statModifiers, targetLevel, config);

  const statGains: StatModifiers = {};
  for (const key of Object.keys(nextStats) as (keyof StatModifiers)[]) {
    const curVal = currentStats[key] ?? 0;
    const nxtVal = nextStats[key] ?? 0;
    statGains[key] = nxtVal - curVal;
  }

  return {
    canEnhance: reasons.length === 0,
    reasons,
    itemId,
    itemDef,
    currentLevel,
    targetLevel,
    goldCost,
    requiredMaterial: requiredMaterialPreview,
    currentStats,
    nextStats,
    statGains,
  };
}
