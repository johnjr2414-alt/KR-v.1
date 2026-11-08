import { describe, it, expect, beforeEach } from 'vitest';
import {
  MATHEMATICS_SKILL_TREE,
  SCIENCE_SKILL_TREE,
  GENERAL_KNOWLEDGE_SKILL_TREE,
  validateSkillTreeDAG,
  getSkillTreeForSubject,
  SkillManager,
  getSkillDefinition,
  type SubjectSkillTree,
} from '../../src/skills';
import { SubjectId } from '../../src/core/types/education';
import { MasteryManager } from '../../src/mastery/MasteryManager';
import { CurrencyService } from '../../src/economy/CurrencyService';
import { createPlayerData } from '../../src/player/PlayerData';

describe('Phase 23.2 — Subject-Specific Skill Trees & DAG Verification Unit Tests', () => {
  let skillManager: SkillManager;
  let masteryManager: MasteryManager;
  let currency: CurrencyService;

  beforeEach(() => {
    skillManager = new SkillManager();
    masteryManager = new MasteryManager();
    currency = new CurrencyService(200);
  });

  describe('1. Baseline Subject Skill Tree DAG Validation', () => {
    it('validates Mathematics, Science, and General Knowledge skill trees with zero DAG errors', () => {
      const trees = [
        MATHEMATICS_SKILL_TREE,
        SCIENCE_SKILL_TREE,
        GENERAL_KNOWLEDGE_SKILL_TREE,
      ];

      for (const tree of trees) {
        const result = validateSkillTreeDAG(tree);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.cycles).toHaveLength(0);
        expect(result.missingPrerequisites).toHaveLength(0);
      }
    });

    it('retrieves correct subject tree via getSkillTreeForSubject', () => {
      const mathTree = getSkillTreeForSubject(SubjectId.Mathematics);
      expect(mathTree).toBeDefined();
      expect(mathTree?.name).toBe('Mathematics Skill Tree');
      expect(mathTree?.rootSkillIds).toContain('math-mental-arithmetic');
    });
  });

  describe('2. Invalid Graph Detection (Missing Prerequisites & Cycles)', () => {
    it('detects and reports missing prerequisite skill IDs in a tree', () => {
      const brokenTree: SubjectSkillTree = {
        subject: SubjectId.Mathematics,
        name: 'Broken Tree',
        description: 'Tree with missing prereq',
        rootSkillIds: [],
        nodes: {
          'math-prime-strike': {
            skill: getSkillDefinition('math-prime-strike')!,
            prerequisites: ['non-existent-skill'],
            children: [],
            tier: 2,
          },
        },
      };

      const result = validateSkillTreeDAG(brokenTree);
      expect(result.valid).toBe(false);
      expect(result.missingPrerequisites).toHaveLength(1);
      expect(result.missingPrerequisites[0].missingId).toBe('non-existent-skill');
    });

    it('detects and rejects circular prerequisite loops (cycles)', () => {
      const cyclicTree: SubjectSkillTree = {
        subject: SubjectId.Mathematics,
        name: 'Cyclic Tree',
        description: 'Tree with loop A -> B -> A',
        rootSkillIds: [],
        nodes: {
          'node-a': {
            skill: { ...getSkillDefinition('math-mental-arithmetic')!, id: 'node-a' },
            prerequisites: ['node-b'],
            children: ['node-b'],
            tier: 1,
          },
          'node-b': {
            skill: { ...getSkillDefinition('math-prime-strike')!, id: 'node-b' },
            prerequisites: ['node-a'],
            children: ['node-a'],
            tier: 2,
          },
        },
      };

      const result = validateSkillTreeDAG(cyclicTree);
      expect(result.valid).toBe(false);
      expect(result.cycles.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes('Circular prerequisite detected'))).toBe(true);
    });
  });

  describe('3. Subject Tree Independence & Mastery Unlock Isolation', () => {
    it('verifies subject trees remain strictly independent', () => {
      // Boosting Science mastery to level 5 does not satisfy Mathematics prerequisite
      masteryManager.loadRecords({
        ...masteryManager.getAllMastery(),
        [SubjectId.Science]: {
          subject: SubjectId.Science,
          level: 5,
          currentExp: 100,
          totalCorrect: 20,
          totalAttempted: 20,
        },
        [SubjectId.Mathematics]: {
          subject: SubjectId.Mathematics,
          level: 1,
          currentExp: 0,
          totalCorrect: 0,
          totalAttempted: 0,
        },
      });

      const player = createPlayerData('p-1', 'Hero', { level: 5 });
      const primeStrike = getSkillDefinition('math-prime-strike')!;

      // Prime strike requires Math mastery level 2
      const check = skillManager.canUnlockOrUpgradeSkill(primeStrike, player, masteryManager, currency);
      expect(check.canUnlock).toBe(false);
      expect(check.reason).toContain('Requires mathematics mastery level 2');

      // However Science skill Empirical Shield can be unlocked with Science mastery
      const empiricalShield = getSkillDefinition('science-empirical-shield')!;
      // Need empirical observation unlocked first
      skillManager.unlockOrUpgradeSkill('science-empirical-observation', player, masteryManager, currency);
      const scienceCheck = skillManager.canUnlockOrUpgradeSkill(empiricalShield, player, masteryManager, currency);
      expect(scienceCheck.canUnlock).toBe(true);
    });

    it('prevents unlocking a skill beyond its max level or duplicate unlocking', () => {
      const player = createPlayerData('p-1', 'Hero', { level: 5 });
      const skillId = 'science-empirical-observation';
      const def = getSkillDefinition(skillId)!;

      // Unlock level 1, 2, 3
      expect(skillManager.unlockOrUpgradeSkill(skillId, player, masteryManager, currency).success).toBe(true);
      expect(skillManager.unlockOrUpgradeSkill(skillId, player, masteryManager, currency).success).toBe(true);
      expect(skillManager.unlockOrUpgradeSkill(skillId, player, masteryManager, currency).success).toBe(true);
      expect(skillManager.getSkillLevel(skillId)).toBe(def.maxLevel);

      // 4th attempt must be rejected
      const overMax = skillManager.unlockOrUpgradeSkill(skillId, player, masteryManager, currency);
      expect(overMax.success).toBe(false);
      expect(overMax.error).toBe('Skill already at maximum level');
    });
  });
});
