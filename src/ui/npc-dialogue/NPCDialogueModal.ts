import type { NPCDefinition } from '../../quests/NPCTypes';
import { QuestManager, questManager } from '../../quests/QuestManager';
import { getQuestDefinition } from '../../quests/QuestRegistry';

export interface NPCDialogueModalOptions {
  npc: NPCDefinition;
  questManager?: QuestManager;
  playerLevel?: number;
  onClose?: () => void;
  onQuestUpdate?: () => void;
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

  constructor(options: NPCDialogueModalOptions) {
    this.npc = options.npc;
    this.qm = options.questManager || questManager;
    this.playerLevel = options.playerLevel ?? 1;
    this.onClose = options.onClose;
    this.onQuestUpdate = options.onQuestUpdate;
  }

  show(): void {
    this.destroy();

    const container = document.createElement('div');
    container.className = 'npc-dialogue-modal';
    container.id = 'npc-dialogue-modal';

    const questStatus = this.qm.getNpcQuestStatus(this.npc.id, this.playerLevel);
    const offeredQuestId = this.npc.offeredQuestIds?.[0];
    const questDef = offeredQuestId ? getQuestDefinition(offeredQuestId) : undefined;
    const questRecord = offeredQuestId ? this.qm.getQuestRecord(offeredQuestId) : undefined;

    let dialogueLines = this.npc.dialogue.default;
    if (questStatus === 'ready-turn-in' && this.npc.dialogue.questCompleted) {
      dialogueLines = this.npc.dialogue.questCompleted;
    } else if (questStatus === 'in-progress' && this.npc.dialogue.questInProgress) {
      dialogueLines = this.npc.dialogue.questInProgress;
    } else if (questStatus === 'available' && this.npc.dialogue.questAvailable) {
      dialogueLines = this.npc.dialogue.questAvailable;
    }

    const dialogueText = dialogueLines.map((l) => `<p>${this.escape(l)}</p>`).join('');

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
        acceptBtn.textContent = 'Accept Quest';
        acceptBtn.addEventListener('click', () => {
          this.qm.acceptQuest(questDef.id, this.playerLevel);
          this.onQuestUpdate?.();
          this.show(); // Re-render dialogue modal with new status
        });
        footerActions.appendChild(acceptBtn);
      } else if (questStatus === 'ready-turn-in') {
        const turnInBtn = document.createElement('button');
        turnInBtn.className = 'npc-btn npc-btn--success';
        turnInBtn.textContent = 'Complete Quest';
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
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => {
      this.destroy();
      this.onClose?.();
    });
    footerActions?.appendChild(closeBtn);

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
