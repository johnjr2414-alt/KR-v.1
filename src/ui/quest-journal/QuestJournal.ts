import { QuestStatus, type PlayerQuestRecord } from '../../quests/QuestTypes';
import { getQuestDefinition } from '../../quests/QuestRegistry';
import { getNPCDefinition } from '../../quests/NPCRegistry';
import { playerSessionManager } from '../../player';
import './quest-journal.css';

export interface QuestJournalOptions {
  onClose?: () => void;
}

type QuestTab = 'active' | 'completed';

/**
 * QuestJournal — HTML/CSS DOM overlay for viewing player quest progress,
 * objective completion, quest givers, rewards, and turn-in readiness.
 */
export class QuestJournal {
  private container: HTMLDivElement | null = null;
  private readonly onClose?: () => void;
  private activeTab: QuestTab = 'active';

  constructor(options: QuestJournalOptions = {}) {
    this.onClose = options.onClose;
  }

  show(): void {
    this.destroy();

    const container = document.createElement('div');
    container.className = 'quest-modal';
    container.id = 'quest-modal';

    document.body.appendChild(container);
    this.container = container;

    this.render();
  }

  render(): void {
    if (!this.container) return;

    const questRecords = playerSessionManager.quests.getAllQuests();
    const activeQuests = questRecords.filter(
      (q) => q.status === QuestStatus.InProgress || q.status === QuestStatus.ReadyToTurnIn,
    );
    const completedQuests = questRecords.filter((q) => q.status === QuestStatus.Completed);

    const displayedQuests = this.activeTab === 'active' ? activeQuests : completedQuests;

    this.container.innerHTML = `
      <div class="quest-card">
        <div class="quest-card__header">
          <span class="quest-card__title">📜 Quest Journal</span>
        </div>

        <div class="quest-card__tabs">
          <button class="quest-card__tab ${this.activeTab === 'active' ? 'quest-card__tab--active' : ''}" id="quest-tab-active" type="button">
            Active Quests (${activeQuests.length})
          </button>
          <button class="quest-card__tab ${this.activeTab === 'completed' ? 'quest-card__tab--active' : ''}" id="quest-tab-completed" type="button">
            Completed (${completedQuests.length})
          </button>
        </div>

        <div class="quest-card__content">
          ${this.renderQuestList(displayedQuests)}
        </div>

        <div class="quest-card__footer">
          <button class="quest-card__close-btn" id="quest-close-btn" type="button">
            Close
          </button>
        </div>
      </div>
    `;

    this.container.querySelector('#quest-tab-active')?.addEventListener('click', () => {
      this.activeTab = 'active';
      this.render();
    });

    this.container.querySelector('#quest-tab-completed')?.addEventListener('click', () => {
      this.activeTab = 'completed';
      this.render();
    });

    this.container.querySelector('#quest-close-btn')?.addEventListener('click', () => {
      this.destroy();
      this.onClose?.();
    });
  }

  private renderQuestList(quests: PlayerQuestRecord[]): string {
    if (quests.length === 0) {
      const msg =
        this.activeTab === 'active'
          ? 'No active quests. Talk to villagers in Beginners Village to find adventures!'
          : 'No completed quests yet.';
      return `<div class="quest-card__empty">${msg}</div>`;
    }

    return quests
      .map((record) => {
        const def = getQuestDefinition(record.questId);
        const name = def?.name ?? record.questId;
        const description = def?.description ?? '';
        const giverNpc = def?.giverNpcId ? getNPCDefinition(def.giverNpcId) : undefined;
        const giverName = giverNpc ? giverNpc.name : def?.giverNpcId ?? 'Unknown';

        let statusClass = 'quest-badge--in-progress';
        let statusText = 'In Progress';

        if (record.status === QuestStatus.ReadyToTurnIn) {
          statusClass = 'quest-badge--ready';
          statusText = 'Ready to Turn In!';
        } else if (record.status === QuestStatus.Completed) {
          statusClass = 'quest-badge--completed';
          statusText = 'Completed';
        }

        const objectivesHtml = record.objectives
          .map((obj) => {
            const isDone = obj.currentCount >= obj.requiredCount;
            return `
              <div class="quest-objective ${isDone ? 'quest-objective--done' : ''}">
                <span>${isDone ? '✓' : '○'} ${this.escape(obj.description)}</span>
                <span><strong>${obj.currentCount}</strong> / ${obj.requiredCount}</span>
              </div>
            `;
          })
          .join('');

        let rewardsHtml = '';
        if (def?.rewards) {
          const r = def.rewards;
          const itemsStr =
            r.items && r.items.length > 0
              ? r.items.map((i) => `${i.itemId} x${i.quantity}`).join(', ')
              : '';

          rewardsHtml = `
            <div class="quest-rewards">
              ${r.combatExp > 0 ? `<span class="quest-reward-pill">✨ ${r.combatExp} EXP</span>` : ''}
              ${r.gold > 0 ? `<span class="quest-reward-pill">🪙 ${r.gold} G</span>` : ''}
              ${itemsStr ? `<span class="quest-reward-pill">🎁 ${this.escape(itemsStr)}</span>` : ''}
            </div>
          `;
        }

        return `
          <div class="quest-entry">
            <div class="quest-entry__header">
              <span class="quest-entry__name">${this.escape(name)}</span>
              <span class="quest-badge ${statusClass}">${statusText}</span>
            </div>
            <div class="quest-entry__desc">${this.escape(description)}</div>
            <div class="quest-entry__giver">Quest Giver: <strong>${this.escape(giverName)}</strong></div>
            <div class="quest-objectives">
              ${objectivesHtml}
            </div>
            ${rewardsHtml}
          </div>
        `;
      })
      .join('');
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
