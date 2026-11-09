import { SubjectId } from '../../core/types/education';
import type { SkillDefinition, SkillEffect } from '../../skills/SkillTypes';
import { SkillManager } from '../../skills/SkillManager';
import { SUBJECT_SKILL_TREES } from '../../skills/SkillTreeRegistry';
import { getSkillDefinition } from '../../skills/SkillRegistry';
import { passiveSkillCalculator } from '../../skills/PassiveSkillCalculator';
import { playerSessionManager } from '../../player';
import './skill-modal.css';

export interface SkillModalOptions {
  skillManager?: SkillManager;
  onClose?: () => void;
  onStateChange?: () => void;
}

export type SkillNodeState = 'locked' | 'available' | 'unlocked' | 'maxed';

/**
 * SkillModal — HTML/CSS DOM overlay for viewing subject skill trees,
 * upgrading/unlocking skills, equipping active skills to hotbar,
 * and viewing aggregated passive bonuses.
 */
export class SkillModal {
  private container: HTMLDivElement | null = null;
  private readonly skillManager: SkillManager;
  private readonly onClose?: () => void;
  private readonly onStateChange?: () => void;

  private currentSubject: SubjectId = SubjectId.Mathematics;
  private selectedSkillId: string | null = null;

  constructor(options: SkillModalOptions = {}) {
    this.skillManager = options.skillManager || playerSessionManager.skills;
    this.onClose = options.onClose;
    this.onStateChange = options.onStateChange;

    // Default selection to root of first tree
    const defaultTree = SUBJECT_SKILL_TREES[this.currentSubject];
    if (defaultTree && defaultTree.rootSkillIds.length > 0) {
      this.selectedSkillId = defaultTree.rootSkillIds[0];
    }
  }

  show(): void {
    this.destroy();

    const container = document.createElement('div');
    container.className = 'skill-modal';
    container.id = 'skill-modal';

    document.body.appendChild(container);
    this.container = container;

    this.render();
  }

  render(): void {
    if (!this.container) return;

    const availableTrees = Object.values(SUBJECT_SKILL_TREES).filter(Boolean);
    const tabsHtml = availableTrees
      .map((tree) => {
        if (!tree) return '';
        const isActive = tree.subject === this.currentSubject;
        return `
          <button class="skill-tab ${isActive ? 'skill-tab--active' : ''}" data-subject="${tree.subject}">
            ${this.getSubjectIcon(tree.subject)} ${this.escape(tree.name)}
          </button>
        `;
      })
      .join('');

    const treeHtml = this.renderTree();
    const detailHtml = this.renderDetail();
    const footerHtml = this.renderFooter();

    this.container.innerHTML = `
      <div class="skill-card">
        <div class="skill-header">
          <div class="skill-header__title">⚡ Subject Skill Trees & Mastery</div>
          <button class="skill-header__close" id="skill-close-btn">&times;</button>
        </div>
        <div class="skill-tabs">
          ${tabsHtml}
        </div>
        <div class="skill-body">
          <div class="skill-tree-section">
            ${treeHtml}
          </div>
          <div class="skill-detail-section">
            ${detailHtml}
          </div>
        </div>
        <div class="skill-footer">
          ${footerHtml}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private renderTree(): string {
    const tree = SUBJECT_SKILL_TREES[this.currentSubject];
    if (!tree) return '<div class="skill-tree-empty">No skill tree available for this subject.</div>';

    // Group nodes by tier
    const tiers: Record<number, string[]> = {};
    for (const [skillId, node] of Object.entries(tree.nodes)) {
      if (!tiers[node.tier]) tiers[node.tier] = [];
      tiers[node.tier].push(skillId);
    }

    const sortedTiers = Object.keys(tiers)
      .map(Number)
      .sort((a, b) => a - b);

    return sortedTiers
      .map((tier) => {
        const skillIds = tiers[tier];
        const nodesHtml = skillIds
          .map((id) => {
            const def = getSkillDefinition(id);
            if (!def) return '';

            const status = this.getSkillNodeState(def);
            const level = this.skillManager.getSkillLevel(id);
            const isSelected = this.selectedSkillId === id;

            return `
              <div class="skill-node skill-node--${status} ${isSelected ? 'skill-node--selected' : ''}" data-skill-id="${def.id}">
                <div class="skill-node__header">
                  <span class="skill-node__name">${this.escape(def.name)}</span>
                  <span class="skill-node__type-tag skill-node__type-tag--${def.type}">${def.type}</span>
                </div>
                <div class="skill-node__level">Rank: ${level} / ${def.maxLevel}</div>
                <div class="skill-node__status skill-node__status--${status}">
                  ${this.formatStatusLabel(status)}
                </div>
              </div>
            `;
          })
          .join('');

        return `
          <div class="skill-tree-tier">
            <div class="skill-tree-tier__title">Tier ${tier}</div>
            <div class="skill-tree-tier__nodes">
              ${nodesHtml}
            </div>
          </div>
        `;
      })
      .join('');
  }

  private renderDetail(): string {
    if (!this.selectedSkillId) {
      return '<div class="skill-detail__desc">Select a skill to view its requirements and details.</div>';
    }

    const def = getSkillDefinition(this.selectedSkillId);
    if (!def) {
      return '<div class="skill-detail__desc">Skill definition not found.</div>';
    }

    const level = this.skillManager.getSkillLevel(def.id);
    const player = playerSessionManager.getPlayer();
    const mastery = playerSessionManager.mastery;
    const currency = playerSessionManager.currency;

    const nextLevel = Math.min(def.maxLevel, level + 1);
    const activeLvlConfig = def.levels[level > 0 ? level : 1];

    // Build requirements inspection
    const reqs = def.requirements;
    const masteryRecord = mastery.getMastery(def.subject);
    const meetsMastery = masteryRecord.level >= reqs.minMasteryLevel;
    const meetsPlayerLevel = (reqs.minPlayerLevel ?? 1) <= player.level;
    const meetsGold = !reqs.goldCost || currency.getGold() >= reqs.goldCost;

    const prereqItems: string[] = [];
    if (reqs.prerequisiteSkillIds && reqs.prerequisiteSkillIds.length > 0) {
      for (const preId of reqs.prerequisiteSkillIds) {
        const preDef = getSkillDefinition(preId);
        const preLevel = this.skillManager.getSkillLevel(preId);
        const met = preLevel > 0;
        prereqItems.push(`
          <span class="skill-detail__req-item ${met ? 'skill-detail__req-item--met' : 'skill-detail__req-item--unmet'}">
            ${met ? '✓' : '✗'} Prerequisite: ${preDef?.name || preId}
          </span>
        `);
      }
    }

    const unlockCheck = this.skillManager.canUnlockOrUpgradeSkill(def, player, mastery, currency);

    const isEquipped = this.skillManager.getState().equippedActiveSkillIds.includes(def.id);

    return `
      <div class="skill-detail__content">
        <div class="skill-detail__header">
          <div class="skill-detail__title">
            <span>${this.escape(def.name)}</span>
            <span class="skill-node__type-tag skill-node__type-tag--${def.type}">${def.type}</span>
          </div>
          <div class="skill-node__level">Rank: ${level} / ${def.maxLevel}</div>
        </div>

        <div class="skill-detail__desc">
          ${this.escape(activeLvlConfig?.description || 'No description available.')}
        </div>

        <div class="skill-detail__stats">
          ${
            def.type === 'active'
              ? `<span>MP Cost: <b class="skill-detail__stat-val">${activeLvlConfig?.mpCost ?? 0}</b></span>
                 <span>Cooldown: <b class="skill-detail__stat-val">${activeLvlConfig?.cooldownTurns ?? 0} turns</b></span>`
              : `<span>Mode: <b class="skill-detail__stat-val">${def.availability.toUpperCase()}</b></span>
                 <span>Effects: <b class="skill-detail__stat-val">${this.formatEffects(activeLvlConfig?.effects || [])}</b></span>`
          }
        </div>

        <div class="skill-detail__reqs">
          <div style="font-weight: 600; margin-bottom: 2px;">Requirements to Unlock/Upgrade:</div>
          <span class="skill-detail__req-item ${meetsMastery ? 'skill-detail__req-item--met' : 'skill-detail__req-item--unmet'}">
            ${meetsMastery ? '✓' : '✗'} Subject Mastery: Lv. ${reqs.minMasteryLevel} (Current: ${masteryRecord.level})
          </span>
          <span class="skill-detail__req-item ${meetsPlayerLevel ? 'skill-detail__req-item--met' : 'skill-detail__req-item--unmet'}">
            ${meetsPlayerLevel ? '✓' : '✗'} Character Level: Lv. ${reqs.minPlayerLevel ?? 1} (Current: ${player.level})
          </span>
          ${
            reqs.goldCost
              ? `<span class="skill-detail__req-item ${meetsGold ? 'skill-detail__req-item--met' : 'skill-detail__req-item--unmet'}">
                  ${meetsGold ? '✓' : '✗'} Gold Cost: ${reqs.goldCost} G (Current: ${currency.getGold()} G)
                </span>`
              : ''
          }
          ${prereqItems.join('')}
        </div>
      </div>

      <div class="skill-detail__actions">
        ${
          level < def.maxLevel
            ? `<button class="skill-action-btn" id="skill-upgrade-btn" ${!unlockCheck.canUnlock ? 'disabled' : ''}>
                ${level === 0 ? '✨ Unlock Skill' : `⬆️ Upgrade to Rank ${nextLevel}`}
               </button>`
            : `<button class="skill-action-btn" disabled>⭐ Max Rank Reached</button>`
        }
        ${
          def.type === 'active' && level > 0
            ? isEquipped
              ? `<button class="skill-action-btn skill-action-btn--unequip" id="skill-unequip-btn">❌ Unequip from Hotbar</button>`
              : `<button class="skill-action-btn skill-action-btn--equip" id="skill-equip-btn">⚔️ Equip to Hotbar</button>`
            : ''
        }
      </div>
    `;
  }

  private renderFooter(): string {
    const passives = passiveSkillCalculator.calculatePassiveBonuses(this.skillManager, 'pve');
    const state = this.skillManager.getState();

    const hotbarItems = state.equippedActiveSkillIds
      .map((id, index) => {
        const def = getSkillDefinition(id);
        return `<span class="skill-footer__hotbar-slot">[${index + 1}] ${def?.name || id}</span>`;
      })
      .join('');

    return `
      <div class="skill-footer__passives">
        <span>Active Passive Bonuses:</span>
        <span class="skill-footer__passive-item">Def: +${passives.flatDefense}</span>
        <span class="skill-footer__passive-item">Crit: +${passives.critRatePercent}%</span>
        <span class="skill-footer__passive-item">MP Reduction: -${passives.manaCostReductionPercent}%</span>
        <span class="skill-footer__passive-item">EXP: x${passives.expMultiplier.toFixed(2)}</span>
      </div>
      <div class="skill-footer__hotbar">
        <span>Combat Hotbar:</span>
        ${hotbarItems.length > 0 ? hotbarItems : '<span>(Empty)</span>'}
      </div>
    `;
  }

  private bindEvents(): void {
    if (!this.container) return;

    // Close button
    this.container.querySelector('#skill-close-btn')?.addEventListener('click', () => {
      this.destroy();
      this.onClose?.();
    });

    // Subject Tabs
    this.container.querySelectorAll('.skill-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const subject = target.getAttribute('data-subject') as SubjectId;
        if (subject && subject !== this.currentSubject) {
          this.currentSubject = subject;
          const tree = SUBJECT_SKILL_TREES[subject];
          if (tree && tree.rootSkillIds.length > 0) {
            this.selectedSkillId = tree.rootSkillIds[0];
          }
          this.render();
        }
      });
    });

    // Skill Nodes selection
    this.container.querySelectorAll('.skill-node').forEach((node) => {
      node.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const skillId = target.getAttribute('data-skill-id');
        if (skillId) {
          this.selectedSkillId = skillId;
          this.render();
        }
      });
    });

    // Upgrade / Unlock Button
    this.container.querySelector('#skill-upgrade-btn')?.addEventListener('click', () => {
      if (!this.selectedSkillId) return;
      const player = playerSessionManager.getPlayer();
      const mastery = playerSessionManager.mastery;
      const currency = playerSessionManager.currency;

      const result = this.skillManager.unlockOrUpgradeSkill(
        this.selectedSkillId,
        player,
        mastery,
        currency,
      );

      if (result.success) {
        // Save session after valid modification
        void playerSessionManager.saveSession();
        this.onStateChange?.();
        this.render();
      }
    });

    // Equip Button
    this.container.querySelector('#skill-equip-btn')?.addEventListener('click', () => {
      if (!this.selectedSkillId) return;
      if (this.skillManager.equipActiveSkill(this.selectedSkillId)) {
        void playerSessionManager.saveSession();
        this.onStateChange?.();
        this.render();
      }
    });

    // Unequip Button
    this.container.querySelector('#skill-unequip-btn')?.addEventListener('click', () => {
      if (!this.selectedSkillId) return;
      if (this.skillManager.unequipActiveSkill(this.selectedSkillId)) {
        void playerSessionManager.saveSession();
        this.onStateChange?.();
        this.render();
      }
    });
  }

  private getSkillNodeState(def: SkillDefinition): SkillNodeState {
    const level = this.skillManager.getSkillLevel(def.id);
    if (level >= def.maxLevel) return 'maxed';
    if (level > 0) return 'unlocked';

    const player = playerSessionManager.getPlayer();
    const mastery = playerSessionManager.mastery;
    const currency = playerSessionManager.currency;

    const check = this.skillManager.canUnlockOrUpgradeSkill(def, player, mastery, currency);
    return check.canUnlock ? 'available' : 'locked';
  }

  private formatStatusLabel(status: SkillNodeState): string {
    switch (status) {
      case 'maxed': return '★ MASTERED';
      case 'unlocked': return '✓ UNLOCKED';
      case 'available': return '⚡ READY TO UNLOCK';
      case 'locked': return '🔒 LOCKED';
    }
  }

  private formatEffects(effects: SkillEffect[]): string {
    return effects
      .map((e) => `${e.type.replace(/-/g, ' ')}: +${e.value}`)
      .join(', ');
  }

  private getSubjectIcon(subject: SubjectId): string {
    switch (subject) {
      case SubjectId.Mathematics: return '📐';
      case SubjectId.Science: return '🔬';
      case SubjectId.GeneralKnowledge: return '🌍';
      case SubjectId.Programming: return '💻';
      case SubjectId.Physics: return '⚡';
      case SubjectId.Business: return '📈';
      default: return '📖';
    }
  }

  destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }

  private escape(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
