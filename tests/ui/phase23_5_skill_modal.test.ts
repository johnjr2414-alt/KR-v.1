import { describe, it, expect, beforeEach } from 'vitest';
import { SubjectId } from '../../src/core/types/education';
import { SkillManager } from '../../src/skills/SkillManager';
import { SUBJECT_SKILL_TREES } from '../../src/skills/SkillTreeRegistry';
import { getSkillDefinition } from '../../src/skills/SkillRegistry';
import { CurrencyService } from '../../src/economy/CurrencyService';
import { MasteryManager } from '../../src/mastery/MasteryManager';
import { PlayerSessionManager } from '../../src/player/PlayerSessionManager';
import { InMemoryStorageService } from '../../src/storage/IndexedDBStorageService';
import { InventoryManager } from '../../src/inventory/InventoryManager';
import { QuestManager } from '../../src/quests/QuestManager';
import { ProgressionService } from '../../src/core/progression/ProgressionService';
import { passiveSkillCalculator } from '../../src/skills/PassiveSkillCalculator';

describe('Phase 23.5 — Skill UI and Upgrades Logic Tests', () => {
  let skillManager: SkillManager;
  let currency: CurrencyService;
  let mastery: MasteryManager;
  let session: PlayerSessionManager;

  beforeEach(async () => {
    PlayerSessionManager.resetInstance();
    currency = new CurrencyService(100);
    mastery = new MasteryManager();
    skillManager = new SkillManager({
      unlockedSkills: {},
      equippedActiveSkillIds: [],
    });

    session = PlayerSessionManager.getInstance({
      storage: new InMemoryStorageService(),
      inventory: new InventoryManager(),
      mastery,
      quests: new QuestManager(),
      currency,
      progression: new ProgressionService(),
      skills: skillManager,
    });
    await session.initializeSession('Hero');
    currency.setGold(1000);
  });

  it('1. Partitions and maps skill trees for all registered subjects', () => {
    const trees = Object.values(SUBJECT_SKILL_TREES);
    expect(trees.length).toBeGreaterThanOrEqual(3);

    const mathTree = SUBJECT_SKILL_TREES[SubjectId.Mathematics];
    expect(mathTree).toBeDefined();
    expect(mathTree?.rootSkillIds.length).toBeGreaterThan(0);

    const scienceTree = SUBJECT_SKILL_TREES[SubjectId.Science];
    expect(scienceTree).toBeDefined();

    const gkTree = SUBJECT_SKILL_TREES[SubjectId.GeneralKnowledge];
    expect(gkTree).toBeDefined();
  });

  it('2. Evaluates unlock and upgrade prerequisites accurately against player state', () => {
    const player = session.getPlayer();
    expect(player.level).toBe(1);

    // Root math skill: math-mental-arithmetic (minPlayerLevel: 1, minMasteryLevel: 1)
    const mentalDef = getSkillDefinition('math-mental-arithmetic');
    expect(mentalDef).toBeDefined();

    // Check root skill unlock eligibility
    const check1 = skillManager.canUnlockOrUpgradeSkill(mentalDef!, player, mastery, currency);
    expect(check1.canUnlock).toBe(true);

    // Unlock root skill
    const unlockRes1 = skillManager.unlockOrUpgradeSkill('math-mental-arithmetic', player, mastery, currency);
    expect(unlockRes1.success).toBe(true);
    expect(skillManager.isSkillUnlocked('math-mental-arithmetic')).toBe(true);

    // Dependent skill: math-prime-strike requires player level 2, mastery 2, and prereq
    const primeStrikeDef = getSkillDefinition('math-prime-strike');
    expect(primeStrikeDef).toBeDefined();

    // At player level 1, cannot unlock prime-strike yet
    const check2 = skillManager.canUnlockOrUpgradeSkill(primeStrikeDef!, player, mastery, currency);
    expect(check2.canUnlock).toBe(false);
    expect(check2.reason).toContain('mastery level 2');

    // Grant mastery and level to satisfy requirements
    mastery.loadRecords({
      ...mastery.getAllMastery(),
      [SubjectId.Mathematics]: {
        subject: SubjectId.Mathematics,
        level: 2,
        currentExp: 0,
        totalCorrect: 5,
        totalAttempted: 5,
      },
    });
    player.level = 2;

    const check3 = skillManager.canUnlockOrUpgradeSkill(primeStrikeDef!, player, mastery, currency);
    expect(check3.canUnlock).toBe(true);

    const unlockRes2 = skillManager.unlockOrUpgradeSkill('math-prime-strike', player, mastery, currency);
    expect(unlockRes2.success).toBe(true);
    expect(currency.getGold()).toBe(950); // 50 gold deducted
  });

  it('3. Equips and validates active skills onto hotbar slots', () => {
    // Setup mastery and player level
    mastery.loadRecords({
      ...mastery.getAllMastery(),
      [SubjectId.Mathematics]: {
        subject: SubjectId.Mathematics,
        level: 2,
        currentExp: 0,
        totalCorrect: 5,
        totalAttempted: 5,
      },
    });
    session.getPlayer().level = 2;

    skillManager.unlockOrUpgradeSkill('math-mental-arithmetic', session.getPlayer(), mastery, currency);
    skillManager.unlockOrUpgradeSkill('math-prime-strike', session.getPlayer(), mastery, currency);
    expect(skillManager.isSkillUnlocked('math-prime-strike')).toBe(true);

    // Active skill is automatically equipped or manually equippable
    expect(skillManager.getState().equippedActiveSkillIds).toContain('math-prime-strike');

    // Unequip and re-equip
    const unequipRes = skillManager.unequipActiveSkill('math-prime-strike');
    expect(unequipRes).toBe(true);
    expect(skillManager.getState().equippedActiveSkillIds).not.toContain('math-prime-strike');

    const equipRes = skillManager.equipActiveSkill('math-prime-strike');
    expect(equipRes).toBe(true);
    expect(skillManager.getState().equippedActiveSkillIds).toContain('math-prime-strike');

    // Attempting to equip passive skill to hotbar is rejected
    const equipPassive = skillManager.equipActiveSkill('math-mental-arithmetic');
    expect(equipPassive).toBe(false);
  });

  it('4. Computes passive skill bonuses dynamically for UI display and stat overlays', () => {
    // Unlock mental arithmetic level 1 (+3% crit)
    skillManager.unlockOrUpgradeSkill('math-mental-arithmetic', session.getPlayer(), mastery, currency);
    // Upgrade to level 2 (+6% crit)
    skillManager.unlockOrUpgradeSkill('math-mental-arithmetic', session.getPlayer(), mastery, currency);

    // Meet requirements for geometric ward (mastery level 3, player level 3)
    mastery.loadRecords({
      ...mastery.getAllMastery(),
      [SubjectId.Mathematics]: {
        subject: SubjectId.Mathematics,
        level: 3,
        currentExp: 0,
        totalCorrect: 10,
        totalAttempted: 10,
      },
    });
    session.getPlayer().level = 3;

    // Unlock prime strike (prerequisite)
    const primeRes = skillManager.unlockOrUpgradeSkill('math-prime-strike', session.getPlayer(), mastery, currency);
    expect(primeRes.success).toBe(true);

    // Unlock geometric ward (+4 flat defense)
    const wardRes = skillManager.unlockOrUpgradeSkill('math-geometric-ward', session.getPlayer(), mastery, currency);
    expect(wardRes.success).toBe(true);

    const bonuses = passiveSkillCalculator.calculatePassiveBonuses(skillManager, 'pve');
    expect(bonuses.flatDefense).toBe(4);
    expect(bonuses.critRatePercent).toBe(6);
    expect(bonuses.activeEffects.length).toBe(2);
  });
});
