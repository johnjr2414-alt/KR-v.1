import type { SubjectId } from '../core/types/education';

/**
 * Skill classification: Active (usable in combat/exploration) or Passive (permanent stat/effect modifiers).
 */
export type SkillType = 'active' | 'passive';

/**
 * Combat availability modes.
 */
export type SkillAvailability = 'pve' | 'pvp' | 'both';

/**
 * Safe, typed effect types that can be resolved by combat or stat calculation.
 */
export type SkillEffectType =
  | 'damage-boost-percent'
  | 'flat-attack-bonus'
  | 'flat-defense-bonus'
  | 'crit-rate-bonus'
  | 'exp-gain-multiplier'
  | 'mana-cost-reduction-percent'
  | 'direct-heal-hp'
  | 'shield-absorption';

/**
 * Typed effect definition without arbitrary executable code.
 */
export interface SkillEffect {
  type: SkillEffectType;
  value: number;
  durationTurns?: number; // 0 or undefined = instant/passive
}

/**
 * Prerequisites required to unlock or upgrade a skill.
 */
export interface SkillUnlockRequirements {
  subject: SubjectId;
  minMasteryLevel: number;
  minPlayerLevel?: number;
  prerequisiteSkillIds?: string[];
  goldCost?: number;
}

/**
 * Per-level scaling definition for a skill.
 */
export interface SkillLevelConfig {
  level: number;
  mpCost: number;
  cooldownTurns: number;
  effects: SkillEffect[];
  description: string;
}

/**
 * Data-driven static skill definition.
 */
export interface SkillDefinition {
  id: string;
  name: string;
  type: SkillType;
  subject: SubjectId;
  availability: SkillAvailability;
  maxLevel: number;
  requirements: SkillUnlockRequirements;
  levels: Record<number, SkillLevelConfig>;
}

/**
 * Runtime state of an individual unlocked skill for a player.
 */
export interface PlayerSkillRecord {
  skillId: string;
  currentLevel: number;
  unlockedAt: number;
}

/**
 * Complete player skills state for persistence and runtime tracking.
 */
export interface PlayerSkillsState {
  unlockedSkills: Record<string, PlayerSkillRecord>;
  equippedActiveSkillIds: string[]; // up to 3-4 active skills on hotbar
}
