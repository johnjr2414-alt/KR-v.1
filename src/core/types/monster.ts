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
  /** Monster combat category. */
  category: MonsterCategory;
  /** Base character EXP awarded on defeat. */
  baseExp: number;
  /** Base gold awarded on defeat. */
  baseGold: number;
}
