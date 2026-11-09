import { MonsterDefinition, MonsterCategory } from '../core/types/monster';
import { SubjectId } from '../core/types/education';

/**
 * Encounter boss phase definition.
 * Triggers at an HP threshold, altering boss behavior (attack, defense, or subject focus).
 */
export interface BossPhase {
  phaseNumber: number;
  name: string;
  hpThresholdPercent: number; // e.g. 50 for 50% max HP
  attackMultiplier: number; // e.g. 1.25 for +25% attack
  defenseMultiplier: number;
  subjectShift?: SubjectId; // Optional subject shift during enrage
  phaseEnrageMessage?: string;
}

/**
 * Full elite or boss encounter specification.
 */
export interface EliteEncounterDefinition extends MonsterDefinition {
  isElite: boolean;
  isBoss: boolean;
  /** Unique guaranteed first-clear reward (granted only once per save profile). */
  firstClearBonus?: {
    gold: number;
    exp: number;
    itemId?: string;
  };
  /** Multi-phase mechanics (primarily for bosses). */
  phases?: BossPhase[];
  /** Respawn cooldown in milliseconds (0 = normal zone respawn). */
  respawnCooldownMs?: number;
}

/**
 * Catalog of high-stakes Elite and World Boss encounters.
 */
export const ELITE_BOSS_REGISTRY: Record<string, EliteEncounterDefinition> = {
  // ─── Mathematics Elite ────────────────────────────────────────────────────────
  'prime-gargoyle': {
    id: 'prime-gargoyle',
    name: 'Prime Gargoyle',
    level: 6,
    maxHp: 160,
    attack: 24,
    defense: 8,
    subject: SubjectId.Mathematics,
    category: MonsterCategory.Elite,
    baseExp: 80,
    baseGold: 35,
    dropConfig: {
      drops: [
        { itemId: 'rare-crystal', dropChance: 0.6, minQuantity: 1, maxQuantity: 2 },
        { itemId: 'iron-blade', dropChance: 0.25, minQuantity: 1, maxQuantity: 1 },
      ],
      bonusGoldMin: 5,
      bonusGoldMax: 15,
    },
    spriteColor: 0x9333ea, // Purple
    detectionRadius: 90,
    isElite: true,
    isBoss: false,
    firstClearBonus: {
      gold: 50,
      exp: 100,
      itemId: 'rare-crystal',
    },
    respawnCooldownMs: 60000, // 1 minute
  },

  // ─── Science Elite ───────────────────────────────────────────────────────────
  'overclocked-golem': {
    id: 'overclocked-golem',
    name: 'Overclocked Golem',
    level: 7,
    maxHp: 200,
    attack: 28,
    defense: 12,
    subject: SubjectId.Science,
    category: MonsterCategory.Elite,
    baseExp: 105,
    baseGold: 45,
    dropConfig: {
      drops: [
        { itemId: 'rare-crystal', dropChance: 0.75, minQuantity: 1, maxQuantity: 3 },
        { itemId: 'leather-vest', dropChance: 0.3, minQuantity: 1, maxQuantity: 1 },
      ],
      bonusGoldMin: 10,
      bonusGoldMax: 20,
    },
    spriteColor: 0x2563eb, // Royal Blue
    detectionRadius: 95,
    isElite: true,
    isBoss: false,
    firstClearBonus: {
      gold: 75,
      exp: 140,
      itemId: 'leather-vest',
    },
    respawnCooldownMs: 90000,
  },

  // ─── Beginners Village World Boss ────────────────────────────────────────────
  'archivist-malakor': {
    id: 'archivist-malakor',
    name: 'Archivist Malakor, Keeper of Paradoxes',
    level: 10,
    maxHp: 450,
    attack: 35,
    defense: 15,
    subject: SubjectId.GeneralKnowledge,
    category: MonsterCategory.Boss,
    baseExp: 350,
    baseGold: 150,
    dropConfig: {
      drops: [
        { itemId: 'amulet-of-logic', dropChance: 0.5, minQuantity: 1, maxQuantity: 1 },
        { itemId: 'scholars-hood', dropChance: 0.5, minQuantity: 1, maxQuantity: 1 },
        { itemId: 'rare-crystal', dropChance: 1.0, minQuantity: 3, maxQuantity: 5 },
      ],
      bonusGoldMin: 25,
      bonusGoldMax: 50,
    },
    spriteColor: 0xdc2626, // Crimson red
    detectionRadius: 120,
    isElite: false,
    isBoss: true,
    firstClearBonus: {
      gold: 250,
      exp: 400,
      itemId: 'amulet-of-logic',
    },
    respawnCooldownMs: 300000, // 5 minutes
    phases: [
      {
        phaseNumber: 1,
        name: 'Scholastic Thesis',
        hpThresholdPercent: 100,
        attackMultiplier: 1.0,
        defenseMultiplier: 1.0,
      },
      {
        phaseNumber: 2,
        name: 'Intellectual Enrage',
        hpThresholdPercent: 50,
        attackMultiplier: 1.35,
        defenseMultiplier: 1.15,
        phaseEnrageMessage: 'Archivist Malakor channels forbidden equations! Attack increased by 35%!',
      },
    ],
  },

  // ─── Colosseum Grand Champion (Phase 26.7) ───────────────────────────────────
  'grand-champion-ragnar': {
    id: 'grand-champion-ragnar',
    name: 'Grand Champion Ragnar',
    level: 70,
    maxHp: 2600,
    attack: 240,
    defense: 130,
    subject: SubjectId.Mathematics,
    category: MonsterCategory.Boss,
    baseExp: 1500,
    baseGold: 600,
    dropConfig: {
      drops: [
        { itemId: 'rare-crystal', dropChance: 1.0, minQuantity: 2, maxQuantity: 4 },
        { itemId: 'amulet-of-logic', dropChance: 0.5, minQuantity: 1, maxQuantity: 1 },
        { itemId: 'scholars-hood', dropChance: 0.4, minQuantity: 1, maxQuantity: 1 },
      ],
      bonusGoldMin: 40,
      bonusGoldMax: 80,
    },
    spriteColor: 0xf59e0b, // champion gold
    detectionRadius: 140,
    isElite: false,
    isBoss: true,
    firstClearBonus: {
      gold: 400,
      exp: 800,
      itemId: 'amulet-of-logic',
    },
    respawnCooldownMs: 600000, // 10 minutes
    phases: [
      {
        phaseNumber: 1,
        name: 'Champion’s Poise',
        hpThresholdPercent: 100,
        attackMultiplier: 1.0,
        defenseMultiplier: 1.0,
      },
      {
        phaseNumber: 2,
        name: 'Undefeated Fury',
        hpThresholdPercent: 50,
        attackMultiplier: 1.4,
        defenseMultiplier: 1.2,
        phaseEnrageMessage: 'Grand Champion Ragnar rises undefeated! Attack increased by 40%!',
      },
    ],
  },
};

/**
 * Returns elite/boss encounter definition by ID.
 */
export function getEliteOrBossEncounter(id: string): EliteEncounterDefinition | undefined {
  return ELITE_BOSS_REGISTRY[id];
}
