import { SubjectId } from '../core/types/education';
import type { SkillDefinition } from './SkillTypes';

/**
 * Baseline data-driven skill definitions covering academic disciplines.
 */
export const SKILL_REGISTRY: Record<string, SkillDefinition> = {
  // ── Mathematics ──
  'math-mental-arithmetic': {
    id: 'math-mental-arithmetic',
    name: 'Mental Arithmetic',
    type: 'passive',
    subject: SubjectId.Mathematics,
    availability: 'both',
    maxLevel: 3,
    requirements: {
      subject: SubjectId.Mathematics,
      minMasteryLevel: 1,
      minPlayerLevel: 1,
    },
    levels: {
      1: {
        level: 1,
        mpCost: 0,
        cooldownTurns: 0,
        description: 'Increases base critical strike chance by +3% through rapid calculations.',
        effects: [{ type: 'crit-rate-bonus', value: 3 }],
      },
      2: {
        level: 2,
        mpCost: 0,
        cooldownTurns: 0,
        description: 'Increases base critical strike chance by +6%.',
        effects: [{ type: 'crit-rate-bonus', value: 6 }],
      },
      3: {
        level: 3,
        mpCost: 0,
        cooldownTurns: 0,
        description: 'Increases base critical strike chance by +10%.',
        effects: [{ type: 'crit-rate-bonus', value: 10 }],
      },
    },
  },

  'math-prime-strike': {
    id: 'math-prime-strike',
    name: 'Prime Strike',
    type: 'active',
    subject: SubjectId.Mathematics,
    availability: 'both',
    maxLevel: 2,
    requirements: {
      subject: SubjectId.Mathematics,
      minMasteryLevel: 2,
      minPlayerLevel: 2,
      prerequisiteSkillIds: ['math-mental-arithmetic'],
      goldCost: 50,
    },
    levels: {
      1: {
        level: 1,
        mpCost: 15,
        cooldownTurns: 3,
        description: 'Channel indivisible prime harmonics to deal +25% bonus damage on next strike.',
        effects: [{ type: 'damage-boost-percent', value: 25, durationTurns: 1 }],
      },
      2: {
        level: 2,
        mpCost: 20,
        cooldownTurns: 3,
        description: 'Channel indivisible prime harmonics to deal +45% bonus damage on next strike.',
        effects: [{ type: 'damage-boost-percent', value: 45, durationTurns: 1 }],
      },
    },
  },

  // ── Science ──
  'science-empirical-shield': {
    id: 'science-empirical-shield',
    name: 'Empirical Shield',
    type: 'active',
    subject: SubjectId.Science,
    availability: 'both',
    maxLevel: 2,
    requirements: {
      subject: SubjectId.Science,
      minMasteryLevel: 1,
      minPlayerLevel: 1,
    },
    levels: {
      1: {
        level: 1,
        mpCost: 12,
        cooldownTurns: 2,
        description: 'Erects an empirical barrier absorbing up to 30 damage.',
        effects: [{ type: 'shield-absorption', value: 30, durationTurns: 2 }],
      },
      2: {
        level: 2,
        mpCost: 18,
        cooldownTurns: 2,
        description: 'Erects an empirical barrier absorbing up to 60 damage.',
        effects: [{ type: 'shield-absorption', value: 60, durationTurns: 2 }],
      },
    },
  },
};

export function getSkillDefinition(skillId: string): SkillDefinition | undefined {
  return SKILL_REGISTRY[skillId];
}

export function getAllSkillDefinitions(): SkillDefinition[] {
  return Object.values(SKILL_REGISTRY);
}
