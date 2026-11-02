import type { SubjectId } from './education';

/**
 * Monster category determines question count range and combat behavior.
 */
export enum MonsterCategory {
  Weak = 'weak',
  Normal = 'normal',
  Strong = 'strong',
  Elite = 'elite',
  Boss = 'boss',
}

/**
 * A single item drop entry on a monster's loot table.
 */
export interface DropEntry {
  /** Item ID (references the item registry — implemented in Phase 15). */
  itemId: string;
  /** Drop probability 0–1 (e.g. 0.05 = 5% chance). */
  dropChance: number;
  /** Minimum quantity dropped. */
  minQuantity: number;
  /** Maximum quantity dropped. */
  maxQuantity: number;
}

/**
 * Drop configuration for a monster.
 */
export interface MonsterDropConfig {
  /** Item drop table entries. */
  drops: DropEntry[];
  /** Always-drop gold range (awarded on top of baseGold). */
  bonusGoldMin: number;
  bonusGoldMax: number;
}

/**
 * Complete monster definition as stored in data tables.
 */
export interface MonsterDefinition {
  /** Unique monster identifier. */
  id: string;
  /** Display name. */
  name: string;
  /** Monster level (determines baseline educational tier). */
  level: number;
  /** Maximum hit points. */
  maxHp: number;
  /** Attack power dealt to player on incorrect answers. */
  attack: number;
  /** Damage reduction against player attacks. */
  defense: number;
  /** Academic subject this monster is associated with. */
  subject: SubjectId;
  /** Monster combat category (affects question count range). */
  category: MonsterCategory;
  /** Base character EXP awarded on defeat. */
  baseExp: number;
  /** Base gold awarded on defeat. */
  baseGold: number;
  /** Loot drop configuration. */
  dropConfig: MonsterDropConfig;
  /** Colour used for placeholder sprite (hex number). */
  spriteColor: number;
  /** Pixel radius of the detection zone triggering interaction. */
  detectionRadius: number;
}
