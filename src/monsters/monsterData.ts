import type { MonsterDefinition } from '../core/types/monster';
import { MonsterCategory } from '../core/types/monster';
import { SubjectId } from '../core/types/education';

/**
 * Monster data table.
 *
 * Begins with Beginners Village (Levels 1–5); the Emerald Forest region
 * (Levels 11–16, Junior High tier) is added in Phase 26.2.
 *
 * Organised by subject: Mathematics, General Knowledge, Science, Technology.
 * All values are provisional and tunable via data-driven configuration.
 *
 * Drop tables are empty at this stage — items are implemented in Phase 15.
 * The Emerald Forest monsters reuse the existing drop system and simply carry
 * empty drop tables like their Beginners Village counterparts.
 */
const EMPTY_DROPS = { drops: [], bonusGoldMin: 0, bonusGoldMax: 2 };

export const MONSTER_REGISTRY: Record<string, MonsterDefinition> = {

  // ─── Mathematics ────────────────────────────────────────────────────────────

  'math-slime': {
    id: 'math-slime',
    name: 'Math Slime',
    level: 1,
    maxHp: 30,
    attack: 5,
    defense: 1,
    subject: SubjectId.Mathematics,
    category: MonsterCategory.Weak,
    baseExp: 8,
    baseGold: 3,
    dropConfig: EMPTY_DROPS,
    spriteColor: 0x22c55e,   // green
    detectionRadius: 64,
  },

  'number-goblin': {
    id: 'number-goblin',
    name: 'Number Goblin',
    level: 3,
    maxHp: 55,
    attack: 10,
    defense: 3,
    subject: SubjectId.Mathematics,
    category: MonsterCategory.Normal,
    baseExp: 18,
    baseGold: 7,
    dropConfig: EMPTY_DROPS,
    spriteColor: 0x16a34a,   // darker green
    detectionRadius: 70,
  },

  'fraction-bat': {
    id: 'fraction-bat',
    name: 'Fraction Bat',
    level: 5,
    maxHp: 80,
    attack: 15,
    defense: 5,
    subject: SubjectId.Mathematics,
    category: MonsterCategory.Normal,
    baseExp: 30,
    baseGold: 12,
    dropConfig: EMPTY_DROPS,
    spriteColor: 0x15803d,   // deep green
    detectionRadius: 80,
  },

  // ─── General Knowledge ───────────────────────────────────────────────────────

  'book-mimic': {
    id: 'book-mimic',
    name: 'Book Mimic',
    level: 1,
    maxHp: 28,
    attack: 4,
    defense: 2,
    subject: SubjectId.GeneralKnowledge,
    category: MonsterCategory.Weak,
    baseExp: 7,
    baseGold: 3,
    dropConfig: EMPTY_DROPS,
    spriteColor: 0xf59e0b,   // amber
    detectionRadius: 60,
  },

  'quiz-spirit': {
    id: 'quiz-spirit',
    name: 'Quiz Spirit',
    level: 3,
    maxHp: 50,
    attack: 9,
    defense: 2,
    subject: SubjectId.GeneralKnowledge,
    category: MonsterCategory.Normal,
    baseExp: 16,
    baseGold: 6,
    dropConfig: EMPTY_DROPS,
    spriteColor: 0xd97706,   // darker amber
    detectionRadius: 72,
  },

  'knowledge-wisp': {
    id: 'knowledge-wisp',
    name: 'Knowledge Wisp',
    level: 5,
    maxHp: 90,
    attack: 18,
    defense: 6,
    subject: SubjectId.GeneralKnowledge,
    category: MonsterCategory.Strong,
    baseExp: 35,
    baseGold: 14,
    dropConfig: EMPTY_DROPS,
    spriteColor: 0xb45309,   // deep amber
    detectionRadius: 85,
  },

  // ─── Science ────────────────────────────────────────────────────────────────

  'chemical-blob': {
    id: 'chemical-blob',
    name: 'Chemical Blob',
    level: 1,
    maxHp: 35,
    attack: 6,
    defense: 1,
    subject: SubjectId.Science,
    category: MonsterCategory.Weak,
    baseExp: 9,
    baseGold: 4,
    dropConfig: EMPTY_DROPS,
    spriteColor: 0x8b5cf6,   // violet
    detectionRadius: 60,
  },

  'atom-bug': {
    id: 'atom-bug',
    name: 'Atom Bug',
    level: 3,
    maxHp: 60,
    attack: 11,
    defense: 4,
    subject: SubjectId.Science,
    category: MonsterCategory.Normal,
    baseExp: 20,
    baseGold: 8,
    dropConfig: EMPTY_DROPS,
    spriteColor: 0x7c3aed,   // darker violet
    detectionRadius: 70,
  },

  'experiment-golem': {
    id: 'experiment-golem',
    name: 'Experiment Golem',
    level: 5,
    maxHp: 110,
    attack: 20,
    defense: 8,
    subject: SubjectId.Science,
    category: MonsterCategory.Strong,
    baseExp: 40,
    baseGold: 16,
    dropConfig: EMPTY_DROPS,
    spriteColor: 0x6d28d9,   // deep violet
    detectionRadius: 85,
  },

  // ─── Technology ─────────────────────────────────────────────────────────────

  'binary-slime': {
    id: 'binary-slime',
    name: 'Binary Slime',
    level: 1,
    maxHp: 30,
    attack: 5,
    defense: 1,
    subject: SubjectId.Programming,
    category: MonsterCategory.Weak,
    baseExp: 8,
    baseGold: 3,
    dropConfig: EMPTY_DROPS,
    spriteColor: 0x06b6d4,   // cyan
    detectionRadius: 62,
  },

  'circuit-beetle': {
    id: 'circuit-beetle',
    name: 'Circuit Beetle',
    level: 3,
    maxHp: 58,
    attack: 12,
    defense: 3,
    subject: SubjectId.Programming,
    category: MonsterCategory.Normal,
    baseExp: 19,
    baseGold: 7,
    dropConfig: EMPTY_DROPS,
    spriteColor: 0x0891b2,   // darker cyan
    detectionRadius: 68,
  },

  'glitch-sprite': {
    id: 'glitch-sprite',
    name: 'Glitch Sprite',
    level: 5,
    maxHp: 85,
    attack: 17,
    defense: 6,
    subject: SubjectId.Programming,
    category: MonsterCategory.Strong,
    baseExp: 32,
    baseGold: 13,
    dropConfig: EMPTY_DROPS,
    spriteColor: 0x0e7490,   // deep cyan
    detectionRadius: 80,
  },

  // ─── Emerald Forest — Science (Levels 11–16, Junior High) ─────────────────────

  'sporeling': {
    id: 'sporeling',
    name: 'Sporeling',
    level: 11,
    maxHp: 150,
    attack: 26,
    defense: 10,
    subject: SubjectId.Science,
    category: MonsterCategory.Weak,
    baseExp: 55,
    baseGold: 22,
    dropConfig: EMPTY_DROPS,
    spriteColor: 0x34d399,   // emerald
    detectionRadius: 72,
  },

  'thornback-beast': {
    id: 'thornback-beast',
    name: 'Thornback Beast',
    level: 13,
    maxHp: 210,
    attack: 34,
    defense: 14,
    subject: SubjectId.Science,
    category: MonsterCategory.Normal,
    baseExp: 80,
    baseGold: 32,
    dropConfig: EMPTY_DROPS,
    spriteColor: 0x059669,   // dark emerald
    detectionRadius: 80,
  },

  'ancient-treant': {
    id: 'ancient-treant',
    name: 'Ancient Treant',
    level: 16,
    maxHp: 320,
    attack: 46,
    defense: 22,
    subject: SubjectId.Science,
    category: MonsterCategory.Strong,
    baseExp: 130,
    baseGold: 55,
    dropConfig: EMPTY_DROPS,
    spriteColor: 0x065f46,   // deep emerald
    detectionRadius: 88,
  },

  // ─── Emerald Forest — Mathematics (Levels 11–16, Junior High) ─────────────────

  'rune-keeper': {
    id: 'rune-keeper',
    name: 'Rune Keeper',
    level: 11,
    maxHp: 145,
    attack: 25,
    defense: 11,
    subject: SubjectId.Mathematics,
    category: MonsterCategory.Weak,
    baseExp: 54,
    baseGold: 21,
    dropConfig: EMPTY_DROPS,
    spriteColor: 0x60a5fa,   // rune blue
    detectionRadius: 70,
  },

  'glyph-hound': {
    id: 'glyph-hound',
    name: 'Glyph Hound',
    level: 13,
    maxHp: 205,
    attack: 33,
    defense: 13,
    subject: SubjectId.Mathematics,
    category: MonsterCategory.Normal,
    baseExp: 78,
    baseGold: 31,
    dropConfig: EMPTY_DROPS,
    spriteColor: 0x3b82f6,   // darker rune blue
    detectionRadius: 78,
  },

  'stone-warden': {
    id: 'stone-warden',
    name: 'Stone Warden',
    level: 16,
    maxHp: 330,
    attack: 45,
    defense: 24,
    subject: SubjectId.Mathematics,
    category: MonsterCategory.Strong,
    baseExp: 128,
    baseGold: 54,
    dropConfig: EMPTY_DROPS,
    spriteColor: 0x1d4ed8,   // deep rune blue
    detectionRadius: 86,
  },

  // ─── Ironhold Kingdom — Science (Levels 20–26, Junior High) ───────────────────

  'cinder-imp': {
    id: 'cinder-imp',
    name: 'Cinder Imp',
    level: 20,
    maxHp: 320,
    attack: 48,
    defense: 20,
    subject: SubjectId.Science,
    category: MonsterCategory.Weak,
    baseExp: 150,
    baseGold: 62,
    dropConfig: {
      drops: [
        { itemId: 'minor-health-potion', dropChance: 0.15, minQuantity: 1, maxQuantity: 1 },
      ],
      bonusGoldMin: 2,
      bonusGoldMax: 6,
    },
    spriteColor: 0xf97316,   // ember orange
    detectionRadius: 76,
  },

  'magma-hound': {
    id: 'magma-hound',
    name: 'Magma Hound',
    level: 23,
    maxHp: 430,
    attack: 60,
    defense: 28,
    subject: SubjectId.Science,
    category: MonsterCategory.Normal,
    baseExp: 205,
    baseGold: 82,
    dropConfig: {
      drops: [
        { itemId: 'minor-health-potion', dropChance: 0.2, minQuantity: 1, maxQuantity: 2 },
      ],
      bonusGoldMin: 4,
      bonusGoldMax: 10,
    },
    spriteColor: 0xea580c,   // deep ember
    detectionRadius: 84,
  },

  'iron-golem': {
    id: 'iron-golem',
    name: 'Iron Golem',
    level: 26,
    maxHp: 620,
    attack: 78,
    defense: 42,
    subject: SubjectId.Science,
    category: MonsterCategory.Strong,
    baseExp: 300,
    baseGold: 128,
    dropConfig: {
      drops: [
        { itemId: 'rare-crystal', dropChance: 0.25, minQuantity: 1, maxQuantity: 1 },
        { itemId: 'iron-blade', dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
      ],
      bonusGoldMin: 8,
      bonusGoldMax: 18,
    },
    spriteColor: 0x9a3412,   // wrought iron
    detectionRadius: 92,
  },

  // ─── Ironhold Kingdom — Mathematics (Levels 20–26, Junior High) ───────────────

  'pivot-sentry': {
    id: 'pivot-sentry',
    name: 'Pivot Sentry',
    level: 20,
    maxHp: 315,
    attack: 47,
    defense: 21,
    subject: SubjectId.Mathematics,
    category: MonsterCategory.Weak,
    baseExp: 148,
    baseGold: 60,
    dropConfig: {
      drops: [
        { itemId: 'minor-health-potion', dropChance: 0.15, minQuantity: 1, maxQuantity: 1 },
      ],
      bonusGoldMin: 2,
      bonusGoldMax: 6,
    },
    spriteColor: 0x94a3b8,   // steel
    detectionRadius: 74,
  },

  'angle-knight': {
    id: 'angle-knight',
    name: 'Angle Knight',
    level: 23,
    maxHp: 425,
    attack: 59,
    defense: 27,
    subject: SubjectId.Mathematics,
    category: MonsterCategory.Normal,
    baseExp: 202,
    baseGold: 80,
    dropConfig: {
      drops: [
        { itemId: 'minor-mana-potion', dropChance: 0.2, minQuantity: 1, maxQuantity: 2 },
      ],
      bonusGoldMin: 4,
      bonusGoldMax: 10,
    },
    spriteColor: 0x64748b,   // slate steel
    detectionRadius: 82,
  },

  'bastion-warden': {
    id: 'bastion-warden',
    name: 'Bastion Warden',
    level: 26,
    maxHp: 610,
    attack: 77,
    defense: 42,
    subject: SubjectId.Mathematics,
    category: MonsterCategory.Strong,
    baseExp: 296,
    baseGold: 126,
    dropConfig: {
      drops: [
        { itemId: 'rare-crystal', dropChance: 0.25, minQuantity: 1, maxQuantity: 1 },
        { itemId: 'leather-vest', dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
      ],
      bonusGoldMin: 8,
      bonusGoldMax: 18,
    },
    spriteColor: 0x334155,   // dark slate
    detectionRadius: 90,
  },

  // ─── Golden Capital — Mathematics (Levels 30–36, Junior High) ─────────────────

  'coin-courier': {
    id: 'coin-courier',
    name: 'Coin Courier',
    level: 30,
    maxHp: 480,
    attack: 72,
    defense: 30,
    subject: SubjectId.Mathematics,
    category: MonsterCategory.Weak,
    baseExp: 262,
    baseGold: 106,
    dropConfig: {
      drops: [
        { itemId: 'minor-health-potion', dropChance: 0.2, minQuantity: 1, maxQuantity: 1 },
      ],
      bonusGoldMin: 4,
      bonusGoldMax: 10,
    },
    spriteColor: 0xfbbf24,   // gold
    detectionRadius: 80,
  },

  'ledger-golem': {
    id: 'ledger-golem',
    name: 'Ledger Golem',
    level: 33,
    maxHp: 640,
    attack: 88,
    defense: 40,
    subject: SubjectId.Mathematics,
    category: MonsterCategory.Normal,
    baseExp: 352,
    baseGold: 146,
    dropConfig: {
      drops: [
        { itemId: 'minor-mana-potion', dropChance: 0.2, minQuantity: 1, maxQuantity: 2 },
        { itemId: 'copper-ring', dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
      ],
      bonusGoldMin: 6,
      bonusGoldMax: 14,
    },
    spriteColor: 0xd97706,   // deep gold
    detectionRadius: 86,
  },

  'vault-sentinel': {
    id: 'vault-sentinel',
    name: 'Vault Sentinel',
    level: 36,
    maxHp: 900,
    attack: 112,
    defense: 60,
    subject: SubjectId.Mathematics,
    category: MonsterCategory.Strong,
    baseExp: 500,
    baseGold: 212,
    dropConfig: {
      drops: [
        { itemId: 'rare-crystal', dropChance: 0.3, minQuantity: 1, maxQuantity: 1 },
        { itemId: 'amulet-of-logic', dropChance: 0.08, minQuantity: 1, maxQuantity: 1 },
      ],
      bonusGoldMin: 10,
      bonusGoldMax: 24,
    },
    spriteColor: 0xb45309,   // burnished bronze
    detectionRadius: 94,
  },

  // ─── Golden Capital — Science (Levels 30–36, Junior High) ─────────────────────

  'miasma-wisp': {
    id: 'miasma-wisp',
    name: 'Miasma Wisp',
    level: 30,
    maxHp: 472,
    attack: 71,
    defense: 31,
    subject: SubjectId.Science,
    category: MonsterCategory.Weak,
    baseExp: 260,
    baseGold: 104,
    dropConfig: {
      drops: [
        { itemId: 'minor-health-potion', dropChance: 0.2, minQuantity: 1, maxQuantity: 1 },
      ],
      bonusGoldMin: 4,
      bonusGoldMax: 10,
    },
    spriteColor: 0x84cc16,   // sickly lime
    detectionRadius: 80,
  },

  'clockwork-beetle': {
    id: 'clockwork-beetle',
    name: 'Clockwork Beetle',
    level: 33,
    maxHp: 632,
    attack: 87,
    defense: 39,
    subject: SubjectId.Science,
    category: MonsterCategory.Normal,
    baseExp: 350,
    baseGold: 145,
    dropConfig: {
      drops: [
        { itemId: 'minor-mana-potion', dropChance: 0.2, minQuantity: 1, maxQuantity: 2 },
      ],
      bonusGoldMin: 6,
      bonusGoldMax: 14,
    },
    spriteColor: 0x65a30d,   // olive
    detectionRadius: 86,
  },

  'aether-engine': {
    id: 'aether-engine',
    name: 'Aether Engine',
    level: 36,
    maxHp: 888,
    attack: 110,
    defense: 58,
    subject: SubjectId.Science,
    category: MonsterCategory.Strong,
    baseExp: 496,
    baseGold: 210,
    dropConfig: {
      drops: [
        { itemId: 'rare-crystal', dropChance: 0.3, minQuantity: 1, maxQuantity: 1 },
        { itemId: 'scholars-hood', dropChance: 0.08, minQuantity: 1, maxQuantity: 1 },
      ],
      bonusGoldMin: 10,
      bonusGoldMax: 24,
    },
    spriteColor: 0x4d7c0f,   // deep olive
    detectionRadius: 92,
  },

  // ─── Arcane Technological City — Science (Levels 40–46, Junior High) ──────────

  'arc-spark': {
    id: 'arc-spark',
    name: 'Arc Spark',
    level: 40,
    maxHp: 640,
    attack: 96,
    defense: 40,
    subject: SubjectId.Science,
    category: MonsterCategory.Weak,
    baseExp: 350,
    baseGold: 142,
    dropConfig: {
      drops: [
        { itemId: 'minor-health-potion', dropChance: 0.2, minQuantity: 1, maxQuantity: 2 },
      ],
      bonusGoldMin: 6,
      bonusGoldMax: 14,
    },
    spriteColor: 0x22d3ee,   // arc cyan
    detectionRadius: 82,
  },

  'mana-automaton': {
    id: 'mana-automaton',
    name: 'Mana Automaton',
    level: 43,
    maxHp: 850,
    attack: 118,
    defense: 53,
    subject: SubjectId.Science,
    category: MonsterCategory.Normal,
    baseExp: 470,
    baseGold: 195,
    dropConfig: {
      drops: [
        { itemId: 'minor-mana-potion', dropChance: 0.22, minQuantity: 1, maxQuantity: 2 },
        { itemId: 'rare-crystal', dropChance: 0.12, minQuantity: 1, maxQuantity: 1 },
      ],
      bonusGoldMin: 8,
      bonusGoldMax: 20,
    },
    spriteColor: 0x0891b2,   // deep arc cyan
    detectionRadius: 88,
  },

  'techno-golem': {
    id: 'techno-golem',
    name: 'Techno Golem',
    level: 46,
    maxHp: 1150,
    attack: 150,
    defense: 80,
    subject: SubjectId.Science,
    category: MonsterCategory.Strong,
    baseExp: 660,
    baseGold: 280,
    dropConfig: {
      drops: [
        { itemId: 'rare-crystal', dropChance: 0.32, minQuantity: 1, maxQuantity: 1 },
        { itemId: 'scholars-hood', dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
      ],
      bonusGoldMin: 14,
      bonusGoldMax: 30,
    },
    spriteColor: 0x0e7490,   // dark teal
    detectionRadius: 96,
  },

  // ─── Arcane Technological City — Mathematics (Levels 40–46, Junior High) ──────

  'cipher-drone': {
    id: 'cipher-drone',
    name: 'Cipher Drone',
    level: 40,
    maxHp: 630,
    attack: 95,
    defense: 41,
    subject: SubjectId.Mathematics,
    category: MonsterCategory.Weak,
    baseExp: 348,
    baseGold: 140,
    dropConfig: {
      drops: [
        { itemId: 'minor-health-potion', dropChance: 0.2, minQuantity: 1, maxQuantity: 2 },
      ],
      bonusGoldMin: 6,
      bonusGoldMax: 14,
    },
    spriteColor: 0x818cf8,   // indigo
    detectionRadius: 80,
  },

  'algorithm-hound': {
    id: 'algorithm-hound',
    name: 'Algorithm Hound',
    level: 43,
    maxHp: 845,
    attack: 117,
    defense: 52,
    subject: SubjectId.Mathematics,
    category: MonsterCategory.Normal,
    baseExp: 468,
    baseGold: 194,
    dropConfig: {
      drops: [
        { itemId: 'minor-mana-potion', dropChance: 0.22, minQuantity: 1, maxQuantity: 2 },
        { itemId: 'copper-ring', dropChance: 0.12, minQuantity: 1, maxQuantity: 1 },
      ],
      bonusGoldMin: 8,
      bonusGoldMax: 20,
    },
    spriteColor: 0x6366f1,   // deeper indigo
    detectionRadius: 88,
  },

  'qubit-warden': {
    id: 'qubit-warden',
    name: 'Qubit Warden',
    level: 46,
    maxHp: 1140,
    attack: 149,
    defense: 78,
    subject: SubjectId.Mathematics,
    category: MonsterCategory.Strong,
    baseExp: 656,
    baseGold: 278,
    dropConfig: {
      drops: [
        { itemId: 'rare-crystal', dropChance: 0.32, minQuantity: 1, maxQuantity: 1 },
        { itemId: 'amulet-of-logic', dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
      ],
      bonusGoldMin: 14,
      bonusGoldMax: 30,
    },
    spriteColor: 0x4338ca,   // deep indigo
    detectionRadius: 94,
  },

  // ─── Forgotten Lands — Science (Levels 50–60, Junior High → Senior High) ─────

  'ash-stalker': {
    id: 'ash-stalker',
    name: 'Ash Stalker',
    level: 50,
    maxHp: 820,
    attack: 118,
    defense: 50,
    subject: SubjectId.Science,
    category: MonsterCategory.Weak,
    baseExp: 460,
    baseGold: 180,
    dropConfig: {
      drops: [
        { itemId: 'minor-health-potion', dropChance: 0.2, minQuantity: 1, maxQuantity: 2 },
      ],
      bonusGoldMin: 8,
      bonusGoldMax: 18,
    },
    spriteColor: 0x94a3b8,   // ashen grey
    detectionRadius: 84,
  },

  'blight-horror': {
    id: 'blight-horror',
    name: 'Blight Horror',
    level: 55,
    maxHp: 1100,
    attack: 150,
    defense: 68,
    subject: SubjectId.Science,
    category: MonsterCategory.Normal,
    baseExp: 620,
    baseGold: 250,
    dropConfig: {
      drops: [
        { itemId: 'minor-mana-potion', dropChance: 0.24, minQuantity: 1, maxQuantity: 2 },
        { itemId: 'rare-crystal', dropChance: 0.14, minQuantity: 1, maxQuantity: 1 },
      ],
      bonusGoldMin: 10,
      bonusGoldMax: 24,
    },
    spriteColor: 0x64748b,   // decayed slate
    detectionRadius: 90,
  },

  'ruin-colossus': {
    id: 'ruin-colossus',
    name: 'Ruin Colossus',
    level: 60,
    maxHp: 1500,
    attack: 190,
    defense: 100,
    subject: SubjectId.Science,
    category: MonsterCategory.Strong,
    baseExp: 880,
    baseGold: 360,
    dropConfig: {
      drops: [
        { itemId: 'rare-crystal', dropChance: 0.34, minQuantity: 1, maxQuantity: 1 },
        { itemId: 'leather-vest', dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
      ],
      bonusGoldMin: 18,
      bonusGoldMax: 36,
    },
    spriteColor: 0x475569,   // dark slate
    detectionRadius: 98,
  },

  // ─── Forgotten Lands — Mathematics (Levels 50–60, Junior High → Senior High) ──

  'crumbling-sentry': {
    id: 'crumbling-sentry',
    name: 'Crumbling Sentry',
    level: 50,
    maxHp: 810,
    attack: 117,
    defense: 51,
    subject: SubjectId.Mathematics,
    category: MonsterCategory.Weak,
    baseExp: 458,
    baseGold: 178,
    dropConfig: {
      drops: [
        { itemId: 'minor-health-potion', dropChance: 0.2, minQuantity: 1, maxQuantity: 2 },
      ],
      bonusGoldMin: 8,
      bonusGoldMax: 18,
    },
    spriteColor: 0xa8a29e,   // weathered stone
    detectionRadius: 82,
  },

  'fractured-golem': {
    id: 'fractured-golem',
    name: 'Fractured Golem',
    level: 55,
    maxHp: 1095,
    attack: 149,
    defense: 67,
    subject: SubjectId.Mathematics,
    category: MonsterCategory.Normal,
    baseExp: 618,
    baseGold: 248,
    dropConfig: {
      drops: [
        { itemId: 'minor-mana-potion', dropChance: 0.24, minQuantity: 1, maxQuantity: 2 },
        { itemId: 'copper-ring', dropChance: 0.14, minQuantity: 1, maxQuantity: 1 },
      ],
      bonusGoldMin: 10,
      bonusGoldMax: 24,
    },
    spriteColor: 0x78716c,   // cracked stone
    detectionRadius: 88,
  },

  'fallen-warden': {
    id: 'fallen-warden',
    name: 'Fallen Warden',
    level: 60,
    maxHp: 1490,
    attack: 188,
    defense: 98,
    subject: SubjectId.Mathematics,
    category: MonsterCategory.Strong,
    baseExp: 875,
    baseGold: 358,
    dropConfig: {
      drops: [
        { itemId: 'rare-crystal', dropChance: 0.34, minQuantity: 1, maxQuantity: 1 },
        { itemId: 'amulet-of-logic', dropChance: 0.1, minQuantity: 1, maxQuantity: 1 },
      ],
      bonusGoldMin: 18,
      bonusGoldMax: 36,
    },
    spriteColor: 0x57534e,   // dark stone
    detectionRadius: 96,
  },
};

/**
 * Returns the monster definition for a given ID, or undefined if not found.
 */
export function getMonsterById(id: string): MonsterDefinition | undefined {
  return MONSTER_REGISTRY[id];
}

/**
 * Returns all monster IDs registered in the table.
 */
export function getAllMonsterIds(): string[] {
  return Object.keys(MONSTER_REGISTRY);
}
