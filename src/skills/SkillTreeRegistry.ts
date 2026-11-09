import { SubjectId } from '../core/types/education';
import type { SkillDefinition } from './SkillTypes';
import type { SubjectSkillTree, SkillTreeNode } from './SkillTreeTypes';

export const COMPREHENSIVE_SKILL_REGISTRY: Record<string, SkillDefinition> = {
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

  'math-geometric-ward': {
    id: 'math-geometric-ward',
    name: 'Geometric Ward',
    type: 'passive',
    subject: SubjectId.Mathematics,
    availability: 'both',
    maxLevel: 2,
    requirements: {
      subject: SubjectId.Mathematics,
      minMasteryLevel: 3,
      minPlayerLevel: 3,
      prerequisiteSkillIds: ['math-prime-strike'],
      goldCost: 75,
    },
    levels: {
      1: {
        level: 1,
        mpCost: 0,
        cooldownTurns: 0,
        description: 'Angles of deflection reduce incoming damage, granting +4 flat defense.',
        effects: [{ type: 'flat-defense-bonus', value: 4 }],
      },
      2: {
        level: 2,
        mpCost: 0,
        cooldownTurns: 0,
        description: 'Grants +8 flat defense.',
        effects: [{ type: 'flat-defense-bonus', value: 8 }],
      },
    },
  },

  // ── Science ──
  'science-empirical-observation': {
    id: 'science-empirical-observation',
    name: 'Empirical Observation',
    type: 'passive',
    subject: SubjectId.Science,
    availability: 'both',
    maxLevel: 3,
    requirements: {
      subject: SubjectId.Science,
      minMasteryLevel: 1,
      minPlayerLevel: 1,
    },
    levels: {
      1: {
        level: 1,
        mpCost: 0,
        cooldownTurns: 0,
        description: 'Meticulous observation increases combat EXP gained by +5%.',
        effects: [{ type: 'exp-gain-multiplier', value: 1.05 }],
      },
      2: {
        level: 2,
        mpCost: 0,
        cooldownTurns: 0,
        description: 'Increases combat EXP gained by +10%.',
        effects: [{ type: 'exp-gain-multiplier', value: 1.1 }],
      },
      3: {
        level: 3,
        mpCost: 0,
        cooldownTurns: 0,
        description: 'Increases combat EXP gained by +15%.',
        effects: [{ type: 'exp-gain-multiplier', value: 1.15 }],
      },
    },
  },

  'science-empirical-shield': {
    id: 'science-empirical-shield',
    name: 'Empirical Shield',
    type: 'active',
    subject: SubjectId.Science,
    availability: 'both',
    maxLevel: 2,
    requirements: {
      subject: SubjectId.Science,
      minMasteryLevel: 2,
      minPlayerLevel: 2,
      prerequisiteSkillIds: ['science-empirical-observation'],
      goldCost: 40,
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

  // ── General Knowledge ──
  'gen-encyclopedic-memory': {
    id: 'gen-encyclopedic-memory',
    name: 'Encyclopedic Memory',
    type: 'passive',
    subject: SubjectId.GeneralKnowledge,
    availability: 'both',
    maxLevel: 3,
    requirements: {
      subject: SubjectId.GeneralKnowledge,
      minMasteryLevel: 1,
      minPlayerLevel: 1,
    },
    levels: {
      1: {
        level: 1,
        mpCost: 0,
        cooldownTurns: 0,
        description: 'Reduces mana cost of all active spells by 5%.',
        effects: [{ type: 'mana-cost-reduction-percent', value: 5 }],
      },
      2: {
        level: 2,
        mpCost: 0,
        cooldownTurns: 0,
        description: 'Reduces mana cost of all active spells by 10%.',
        effects: [{ type: 'mana-cost-reduction-percent', value: 10 }],
      },
      3: {
        level: 3,
        mpCost: 0,
        cooldownTurns: 0,
        description: 'Reduces mana cost of all active spells by 15%.',
        effects: [{ type: 'mana-cost-reduction-percent', value: 15 }],
      },
    },
  },

  'gen-rallying-insight': {
    id: 'gen-rallying-insight',
    name: 'Rallying Insight',
    type: 'active',
    subject: SubjectId.GeneralKnowledge,
    availability: 'both',
    maxLevel: 2,
    requirements: {
      subject: SubjectId.GeneralKnowledge,
      minMasteryLevel: 2,
      minPlayerLevel: 2,
      prerequisiteSkillIds: ['gen-encyclopedic-memory'],
      goldCost: 60,
    },
    levels: {
      1: {
        level: 1,
        mpCost: 20,
        cooldownTurns: 3,
        description: 'Restores 35 HP through clear focus and composure.',
        effects: [{ type: 'direct-heal-hp', value: 35 }],
      },
      2: {
        level: 2,
        mpCost: 28,
        cooldownTurns: 3,
        description: 'Restores 70 HP through clear focus and composure.',
        effects: [{ type: 'direct-heal-hp', value: 70 }],
      },
    },
  },
};

/**
 * Builds a SubjectSkillTree from a set of registered skill definitions.
 */
export function buildSubjectSkillTree(
  subject: SubjectId,
  name: string,
  description: string,
  skillIds: string[],
): SubjectSkillTree {
  const nodes: Record<string, SkillTreeNode> = {};
  const rootSkillIds: string[] = [];

  // 1. Populate initial nodes
  for (const id of skillIds) {
    const skill = COMPREHENSIVE_SKILL_REGISTRY[id];
    if (!skill) continue;

    const prereqs = skill.requirements.prerequisiteSkillIds || [];
    nodes[id] = {
      skill,
      prerequisites: [...prereqs],
      children: [],
      tier: 1,
    };

    if (prereqs.length === 0) {
      rootSkillIds.push(id);
    }
  }

  // 2. Populate children lists and tiers
  for (const [id, node] of Object.entries(nodes)) {
    for (const prereqId of node.prerequisites) {
      if (nodes[prereqId]) {
        nodes[prereqId].children.push(id);
        node.tier = Math.max(node.tier, nodes[prereqId].tier + 1);
      }
    }
  }

  return {
    subject,
    name,
    description,
    nodes,
    rootSkillIds,
  };
}

/**
 * Baseline Subject Skill Trees for active subjects.
 */
export const MATHEMATICS_SKILL_TREE = buildSubjectSkillTree(
  SubjectId.Mathematics,
  'Mathematics Skill Tree',
  'Master arithmetic, numerical logic, and geometry to empower precision attacks and defensive angles.',
  ['math-mental-arithmetic', 'math-prime-strike', 'math-geometric-ward'],
);

export const SCIENCE_SKILL_TREE = buildSubjectSkillTree(
  SubjectId.Science,
  'Science Skill Tree',
  'Harness empirical observation and elemental principles to boost battle gains and construct energy barriers.',
  ['science-empirical-observation', 'science-empirical-shield'],
);

export const GENERAL_KNOWLEDGE_SKILL_TREE = buildSubjectSkillTree(
  SubjectId.GeneralKnowledge,
  'General Knowledge Skill Tree',
  'Deepen broad encyclopedic understanding to conserve mana and restore vitality in the heat of exploration.',
  ['gen-encyclopedic-memory', 'gen-rallying-insight'],
);

export const SUBJECT_SKILL_TREES: Record<SubjectId, SubjectSkillTree | undefined> = {
  [SubjectId.Mathematics]: MATHEMATICS_SKILL_TREE,
  [SubjectId.Science]: SCIENCE_SKILL_TREE,
  [SubjectId.GeneralKnowledge]: GENERAL_KNOWLEDGE_SKILL_TREE,
  [SubjectId.Programming]: undefined,
  [SubjectId.Physics]: undefined,
  [SubjectId.Business]: undefined,
};

export function getSkillTreeForSubject(subject: SubjectId): SubjectSkillTree | undefined {
  return SUBJECT_SKILL_TREES[subject];
}
