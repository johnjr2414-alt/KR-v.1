import type { NPCDefinition } from '../../quests/NPCTypes';
import { QuestManager, questManager } from '../../quests/QuestManager';
import { getQuestDefinition } from '../../quests/QuestRegistry';
import { resolveNpcDialogue } from '../../quests/DialogueResolver';
import { UI_STRINGS } from '../strings';

export interface NPCDialogueModalOptions {
  npc: NPCDefinition;
  questManager?: QuestManager;
  playerLevel?: number;
  onClose?: () => void;
  onQuestUpdate?: () => void;
  /**
   * When set, an extra footer action opens the career interface for the
   * workplace this NPC represents (Phase 27.6). Supplying it keeps NPC
   * interaction flowing through this one dialogue modal — no duplicate NPC
   * system — while still reaching the career UI.
   */
  onOpenCareer?: () => void;
}

/**
 * NPCDialogueModal — HTML/CSS overlay for interacting with Village NPCs,
 * reading dialogues, accepting quests, and turning in completed quests.
 */
export class NPCDialogueModal {
  private container: HTMLDivElement | null = null;
  private readonly npc: NPCDefinition;
  private readonly qm: QuestManager;
  private readonly playerLevel: number;
  private readonly onClose?: () => void;
  private readonly onQuestUpdate?: () => void;
  private readonly onOpenCareer?: () => void;

  constructor(options: NPCDialogueModalOptions) {
    this.npc = options.npc;
    this.qm = options.questManager || questManager;
    this.playerLevel = options.playerLevel ?? 1;
    this.onClose = options.onClose;
    this.onQuestUpdate = options.onQuestUpdate;
    this.onOpenCareer = options.onOpenCareer;
  }

  show(): void {
    this.destroy();

    const container = document.createElement('div');
    container.className = 'npc-dialogue-modal';
    container.id = 'npc-dialogue-modal';

    const resolution = resolveNpcDialogue(this.npc, this.qm, this.playerLevel);
    const questStatus = resolution.state;
    const offeredQuestId = resolution.questId;
    const questDef = offeredQuestId ? getQuestDefinition(offeredQuestId) : undefined;
    const questRecord = offeredQuestId ? this.qm.getQuestRecord(offeredQuestId) : undefined;

    const dialogueText = resolution.lines
      .map((line) => `<p>${this.escape(line.text)}</p>`)
      .join('');

    let questSnippet = '';
    if (questDef && (questStatus === 'available' || questStatus === 'in-progress' || questStatus === 'ready-turn-in')) {
      const objText = questRecord
        ? questRecord.objectives.map((o) => `• ${this.escape(o.description)}: ${o.currentCount}/${o.requiredCount}`).join('<br>')
        : questDef.objectives.map((o) => `• ${this.escape(o.description)}: 0/${o.requiredCount}`).join('<br>');

      const rewardText = `Rewards: ${questDef.rewards.combatExp} Combat EXP, ${questDef.rewards.gold} Gold${
        questDef.rewards.items ? ', ' + questDef.rewards.items.map((i) => `${i.quantity}x ${i.itemId}`).join(', ') : ''
      }`;

      questSnippet = `
        <div class="quest-box">
          <div class="quest-box__name">📜 ${this.escape(questDef.name)}</div>
          <div class="quest-box__desc">${this.escape(questDef.description)}</div>
          <div class="quest-box__objectives">${objText}</div>
          <div class="quest-box__rewards">🎁 ${this.escape(rewardText)}</div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="npc-dialogue-card">
        <div class="npc-dialogue-header">
          <div class="npc-dialogue-header__title">
            👤 ${this.escape(this.npc.name)}
            ${this.npc.title ? `<span class="npc-title">(${this.escape(this.npc.title)})</span>` : ''}
          </div>
          <button class="npc-dialogue-header__close" id="npc-close-btn">&times;</button>
        </div>
        <div class="npc-dialogue-body">
          ${dialogueText}
          ${questSnippet}
        </div>
        <div class="npc-dialogue-footer" id="npc-footer-actions"></div>
      </div>
    `;

    document.body.appendChild(container);
    this.container = container;

    // Attach footer buttons
    const footerActions = container.querySelector('#npc-footer-actions');
    if (footerActions && questDef) {
      if (questStatus === 'available') {
        const acceptBtn = document.createElement('button');
        acceptBtn.className = 'npc-btn npc-btn--primary';
        acceptBtn.textContent = UI_STRINGS.npcDialogue.acceptQuest;
        acceptBtn.addEventListener('click', () => {
          this.qm.acceptQuest(questDef.id, this.playerLevel);
          this.onQuestUpdate?.();
          this.show(); // Re-render dialogue modal with new status
        });
        footerActions.appendChild(acceptBtn);
      } else if (questStatus === 'ready-turn-in') {
        const turnInBtn = document.createElement('button');
        turnInBtn.className = 'npc-btn npc-btn--success';
        turnInBtn.textContent = UI_STRINGS.npcDialogue.completeQuest;
        turnInBtn.addEventListener('click', () => {
          this.qm.completeQuest(questDef.id);
          this.onQuestUpdate?.();
          this.show(); // Re-render dialogue modal with completed state
        });
        footerActions.appendChild(turnInBtn);
      }
    }

    const closeBtn = document.createElement('button');
    closeBtn.className = 'npc-btn npc-btn--secondary';
    closeBtn.textContent = UI_STRINGS.common.close;
    closeBtn.addEventListener('click', () => {
      this.destroy();
      this.onClose?.();
    });
    footerActions?.appendChild(closeBtn);

    // Career interface entry point for workplace staff / career contacts.
    if (footerActions && this.onOpenCareer) {
      const careerBtn = document.createElement('button');
      careerBtn.className = 'npc-btn npc-btn--career';
      careerBtn.textContent = UI_STRINGS.npcDialogue.careerCenter;
      careerBtn.addEventListener('click', () => this.onOpenCareer?.());
      footerActions.appendChild(careerBtn);
    }

    container.querySelector('#npc-close-btn')?.addEventListener('click', () => {
      this.destroy();
      this.onClose?.();
    });
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
