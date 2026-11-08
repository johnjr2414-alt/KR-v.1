import type { SkillDefinition, PlayerSkillsState, PlayerSkillRecord } from './SkillTypes';
import { getSkillDefinition } from './SkillRegistry';
import type { MasteryManager } from '../mastery/MasteryManager';
import type { CurrencyService } from '../economy/CurrencyService';
import type { PlayerData } from '../player/PlayerData';

export interface UnlockSkillResult {
  success: boolean;
  error?: string;
  record?: PlayerSkillRecord;
}

/**
 * Headless SkillManager — Manages player skill unlock eligibility, upgrading,
 * active skill hotbar assignments, and state loading.
 */
export class SkillManager {
  private state: PlayerSkillsState = {
    unlockedSkills: {},
    equippedActiveSkillIds: [],
  };

  constructor(initialState?: PlayerSkillsState) {
    if (initialState) {
      this.loadState(initialState);
    }
  }

  loadState(savedState: PlayerSkillsState): void {
    this.state = {
      unlockedSkills: { ...savedState.unlockedSkills },
      equippedActiveSkillIds: [...(savedState.equippedActiveSkillIds || [])],
    };
  }

  getState(): PlayerSkillsState {
    return {
      unlockedSkills: { ...this.state.unlockedSkills },
      equippedActiveSkillIds: [...this.state.equippedActiveSkillIds],
    };
  }

  isSkillUnlocked(skillId: string): boolean {
    return !!this.state.unlockedSkills[skillId];
  }

  getSkillLevel(skillId: string): number {
    return this.state.unlockedSkills[skillId]?.currentLevel ?? 0;
  }

  /**
   * Evaluates whether a player satisfies all requirements to unlock or upgrade a skill.
   */
  canUnlockOrUpgradeSkill(
    skill: SkillDefinition,
    player: PlayerData,
    masteryManager: MasteryManager,
    currency?: CurrencyService,
  ): { canUnlock: boolean; reason?: string } {
    const currentLevel = this.getSkillLevel(skill.id);
    if (currentLevel >= skill.maxLevel) {
      return { canUnlock: false, reason: 'Skill already at maximum level' };
    }

    const reqs = skill.requirements;

    // 1. Mastery Level Check
    const subjectMastery = masteryManager.getMastery(reqs.subject);
    if (subjectMastery.level < reqs.minMasteryLevel) {
      return {
        canUnlock: false,
        reason: `Requires ${reqs.subject} mastery level ${reqs.minMasteryLevel} (Current: ${subjectMastery.level})`,
      };
    }

    // 2. Player Level Check
    if (reqs.minPlayerLevel && player.level < reqs.minPlayerLevel) {
      return {
        canUnlock: false,
        reason: `Requires player character level ${reqs.minPlayerLevel} (Current: ${player.level})`,
      };
    }

    // 3. Prerequisites Check (for first level unlock)
    if (currentLevel === 0 && reqs.prerequisiteSkillIds && reqs.prerequisiteSkillIds.length > 0) {
      for (const prereqId of reqs.prerequisiteSkillIds) {
        if (!this.isSkillUnlocked(prereqId)) {
          const prereqDef = getSkillDefinition(prereqId);
          const name = prereqDef ? prereqDef.name : prereqId;
          return { canUnlock: false, reason: `Requires prerequisite skill: ${name}` };
        }
      }
    }

    // 4. Gold Cost Check
    if (reqs.goldCost && currency) {
      if (currency.getGold() < reqs.goldCost) {
        return {
          canUnlock: false,
          reason: `Insufficient gold: requires ${reqs.goldCost} Gold (Have: ${currency.getGold()})`,
        };
      }
    }

    return { canUnlock: true };
  }

  /**
   * Unlocks or upgrades a skill if requirements are met, optionally deducting gold.
   */
  unlockOrUpgradeSkill(
    skillId: string,
    player: PlayerData,
    masteryManager: MasteryManager,
    currency?: CurrencyService,
  ): UnlockSkillResult {
    const def = getSkillDefinition(skillId);
    if (!def) {
      return { success: false, error: `Skill "${skillId}" not found in registry` };
    }

    const check = this.canUnlockOrUpgradeSkill(def, player, masteryManager, currency);
    if (!check.canUnlock) {
      return { success: false, error: check.reason };
    }

    // Deduct gold if required
    if (def.requirements.goldCost && currency && this.getSkillLevel(skillId) === 0) {
      const spendRes = currency.spendGold(def.requirements.goldCost);
      if (!spendRes.success) {
        return { success: false, error: spendRes.error || 'Failed to deduct gold cost' };
      }
    }

    const currentLevel = this.getSkillLevel(skillId);
    const newRecord: PlayerSkillRecord = {
      skillId,
      currentLevel: currentLevel + 1,
      unlockedAt: currentLevel === 0 ? Date.now() : (this.state.unlockedSkills[skillId]?.unlockedAt ?? Date.now()),
    };

    this.state.unlockedSkills[skillId] = newRecord;

    // Automatically equip first active skill if slot available
    if (def.type === 'active' && !this.state.equippedActiveSkillIds.includes(skillId) && this.state.equippedActiveSkillIds.length < 4) {
      this.state.equippedActiveSkillIds.push(skillId);
    }

    return { success: true, record: newRecord };
  }

  /**
   * Equips an active skill onto the player hotbar (up to 4 active slots).
   */
  equipActiveSkill(skillId: string): boolean {
    const def = getSkillDefinition(skillId);
    if (!def || def.type !== 'active' || !this.isSkillUnlocked(skillId)) {
      return false;
    }
    if (this.state.equippedActiveSkillIds.includes(skillId)) {
      return true;
    }
    if (this.state.equippedActiveSkillIds.length >= 4) {
      return false; // slots full
    }
    this.state.equippedActiveSkillIds.push(skillId);
    return true;
  }

  unequipActiveSkill(skillId: string): boolean {
    const idx = this.state.equippedActiveSkillIds.indexOf(skillId);
    if (idx === -1) return false;
    this.state.equippedActiveSkillIds.splice(idx, 1);
    return true;
  }
}

export const skillManager = new SkillManager();
