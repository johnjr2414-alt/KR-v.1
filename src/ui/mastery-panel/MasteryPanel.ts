import { SubjectId } from '../../core/types/education';
import { MasteryManager, masteryManager } from '../../mastery/MasteryManager';

export interface MasteryPanelOptions {
  manager?: MasteryManager;
  onClose?: () => void;
}

/**
 * MasteryPanel — HTML/CSS DOM overlay presenting the player's subject mastery progression.
 * Displays level, accumulated EXP, progress bar to next level, and lifetime accuracy stats for all subjects.
 */
export class MasteryPanel {
  private container: HTMLDivElement | null = null;
  private readonly manager: MasteryManager;
  private readonly onClose?: () => void;

  constructor(options: MasteryPanelOptions = {}) {
    this.manager = options.manager || masteryManager;
    this.onClose = options.onClose;
  }

  show(): void {
    this.destroy();

    const container = document.createElement('div');
    container.className = 'mastery-modal';
    container.id = 'mastery-modal';

    const subjects = Object.values(SubjectId) as SubjectId[];
    const itemsHtml = subjects
      .map((subject) => {
        const record = this.manager.getMastery(subject);
        const progress = this.manager.getProgress(subject);
        const accuracy =
          record.totalAttempted > 0
            ? Math.round((record.totalCorrect / record.totalAttempted) * 100)
            : 0;

        const displayName = subject.replace(/-/g, ' ');

        return `
          <div class="mastery-item">
            <div class="mastery-item__header">
              <span class="mastery-item__name">📖 ${this.escape(displayName)}</span>
              <span class="mastery-item__level">Mastery Lv. ${record.level}</span>
            </div>
            <div class="mastery-item__bar-bg">
              <div class="mastery-item__bar" style="width: ${progress.progressRatio * 100}%"></div>
            </div>
            <div class="mastery-item__meta">
              <span>EXP: ${record.currentExp} / ${progress.isMaxLevel ? 'MAX' : progress.requiredExp}</span>
              <span>Accuracy: ${accuracy}% (${record.totalCorrect}/${record.totalAttempted})</span>
            </div>
          </div>
        `;
      })
      .join('');

    container.innerHTML = `
      <div class="mastery-card">
        <div class="mastery-header">
          <div class="mastery-header__title">🎓 Subject Knowledge Mastery</div>
          <button class="mastery-header__close" id="mastery-close-btn">&times;</button>
        </div>
        <div class="mastery-body">
          ${itemsHtml}
        </div>
      </div>
    `;

    document.body.appendChild(container);
    this.container = container;

    container.querySelector('#mastery-close-btn')?.addEventListener('click', () => {
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
