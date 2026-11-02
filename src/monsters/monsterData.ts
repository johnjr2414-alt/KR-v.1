import type { MonsterDefinition } from '../core/types/monster';
import { MonsterCategory } from '../core/types/monster';
import { SubjectId } from '../core/types/education';

/**
 * Monster data table for Beginners Village (Levels 1–5).
 *
 * Organised by subject: Mathematics, General Knowledge, Science, Technology.
 * All values are provisional and tunable via data-driven configuration.
 *
 * Drop tables are empty at this stage — items are implemented in Phase 15.
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
