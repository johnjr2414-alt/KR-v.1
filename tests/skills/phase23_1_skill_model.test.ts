import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateSkillDefinition,
  SKILL_REGISTRY,
  getSkillDefinition,
  SkillManager,
} from '../../src/skills';
import { MasteryManager } from '../../src/mastery/MasteryManager';
import { CurrencyService } from '../../src/economy/CurrencyService';
import { createPlayerData } from '../../src/player/PlayerData';
import { SubjectId } from '../../src/core/types/education';

describe('Phase 23.1 — Skill Domain Model Unit Tests', () => {
  let skillManager: SkillManager;
  let masteryManager: MasteryManager;
  let currency: CurrencyService;

  beforeEach(() => {
    skillManager = new SkillManager();
    masteryManager = new MasteryManager();
    currency = new CurrencyService(200);
  });

  describe('1. Static Skill Validation', () => {
    it('validates all registered baseline skills', () => {
      for (const skill of Object.values(SKILL_REGISTRY)) {
        const result = validateSkillDefinition(skill);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    it('rejects invalid or corrupted skill definitions', () => {
      const corruptSkill: any = {
        id: '',
        name: '',
        type: 'magic', // invalid type
        availability: 'arena-only', // invalid availability
        maxLevel: 0,
        requirements: {
          minMasteryLevel: 0,
          goldCost: -10,
        },
        levels: {},
      };

      const result = validateSkillDefinition(corruptSkill);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('2. Unlock Conditions & Prerequisite Enforcement', () => {
    it('permits unlock when mastery and level requirements are met', () => {
      const player = createPlayerData('p-1', 'Hero', { level: 1 });
      const skillDef = getSkillDefinition('math-mental-arithmetic')!;
      expect(skillDef).toBeDefined();

      // At mastery level 1, mental arithmetic can be unlocked
      const check = skillManager.canUnlockOrUpgradeSkill(skillDef, player, masteryManager, currency);
      expect(check.canUnlock).toBe(true);

      const unlockRes = skillManager.unlockOrUpgradeSkill('math-mental-arithmetic', player, masteryManager, currency);
      expect(unlockRes.success).toBe(true);
      expect(unlockRes.record?.currentLevel).toBe(1);
      expect(skillManager.isSkillUnlocked('math-mental-arithmetic')).toBe(true);
      expect(skillManager.getSkillLevel('math-mental-arithmetic')).toBe(1);
    });

    it('blocks unlock when mastery level is insufficient', () => {
      const player = createPlayerData('p-1', 'Hero', { level: 5 });
      const primeStrike = getSkillDefinition('math-prime-strike')!;
      expect(primeStrike).toBeDefined();

      // Math mastery is 1 by default, Prime Strike requires mastery 2
      const check = skillManager.canUnlockOrUpgradeSkill(primeStrike, player, masteryManager, currency);
      expect(check.canUnlock).toBe(false);
      expect(check.reason).toContain('mastery level 2');
    });

    it('blocks unlock when prerequisite skill is not unlocked', () => {
      const player = createPlayerData('p-1', 'Hero', { level: 5 });
      const primeStrike = getSkillDefinition('math-prime-strike')!;

      // Boost math mastery to level 2
      masteryManager.loadRecords({
        ...masteryManager.getAllMastery(),
        [SubjectId.Mathematics]: {
          subject: SubjectId.Mathematics,
          level: 2,
          currentExp: 0,
          totalCorrect: 10,
          totalAttempted: 10,
        },
      });

      // Still missing prerequisite 'math-mental-arithmetic'
      const check = skillManager.canUnlockOrUpgradeSkill(primeStrike, player, masteryManager, currency);
      expect(check.canUnlock).toBe(false);
      expect(check.reason).toContain('Requires prerequisite skill: Mental Arithmetic');
    });

    it('deducts gold and equips active skill upon successful unlock with prerequisites satisfied', () => {
      const player = createPlayerData('p-1', 'Hero', { level: 5 });
      const primeStrike = getSkillDefinition('math-prime-strike')!;

      // Unlock prerequisite first
      skillManager.unlockOrUpgradeSkill('math-mental-arithmetic', player, masteryManager, currency);

      // Boost mastery to 2
      masteryManager.loadRecords({
        ...masteryManager.getAllMastery(),
        [SubjectId.Mathematics]: {
          subject: SubjectId.Mathematics,
          level: 2,
          currentExp: 0,
          totalCorrect: 10,
          totalAttempted: 10,
        },
      });

      const initialGold = currency.getGold(); // 200
      const unlockRes = skillManager.unlockOrUpgradeSkill('math-prime-strike', player, masteryManager, currency);

      expect(unlockRes.success).toBe(true);
      expect(currency.getGold()).toBe(initialGold - (primeStrike.requirements.goldCost ?? 0));
      expect(skillManager.getState().equippedActiveSkillIds).toContain('math-prime-strike');
    });
  });

  describe('3. Skill State Hydration & Max Level Caps', () => {
    it('restores skills from saved state and caps at maxLevel', () => {
      const savedState = {
        unlockedSkills: {
          'math-mental-arithmetic': {
            skillId: 'math-mental-arithmetic',
            currentLevel: 3,
            unlockedAt: 12345,
          },
        },
        equippedActiveSkillIds: [],
      };

      skillManager.loadState(savedState);
      expect(skillManager.getSkillLevel('math-mental-arithmetic')).toBe(3);

      const player = createPlayerData('p-1', 'Hero', { level: 10 });
      const def = getSkillDefinition('math-mental-arithmetic')!;
      const check = skillManager.canUnlockOrUpgradeSkill(def, player, masteryManager, currency);
      expect(check.canUnlock).toBe(false);
      expect(check.reason).toBe('Skill already at maximum level');
    });
  });
});
