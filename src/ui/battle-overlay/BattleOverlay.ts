import type { BattleSession } from '../../combat/BattleSession';
import type { BattleEndSummary } from '../../combat/BattleState';
import { BattleStatus } from '../../combat/BattleState';
import { calculateHpPercentage, type CombatFeedbackDescriptor } from '../../combat/CombatFeedbackMapper';

export interface BattleOverlayOptions {
  session: BattleSession;
  onContinue: () => void;
}

/**
 * HTML/CSS DOM Battle HUD overlay.
 * Shows player and monster HP bars, active question round, and handles end-of-battle summary.
 */
export class BattleOverlay {
  private container: HTMLDivElement | null = null;
  private readonly session: BattleSession;
  private readonly onContinue: () => void;

  constructor(options: BattleOverlayOptions) {
    this.session = options.session;
    this.onContinue = options.onContinue;
  }

  show(): void {
    this.destroy();

    const state = this.session.getState();
    const container = document.createElement('div');
    container.className = 'battle-overlay';
    container.id = 'battle-overlay';

    container.innerHTML = `
      <div class="battle-hud">
        <div class="battle-hud__card">
          <div class="battle-hud__name">
            <span>⚔️ ${this.escape(state.player.name)}</span>
            <span class="battle-hud__level">Lv. ${state.player.level}</span>
          </div>
          <div class="battle-hud__hp-bar-bg">
            <div class="battle-hud__hp-bar" id="player-hp-bar" style="width: ${(state.playerCurrentHp / state.playerMaxHp) * 100}%"></div>
          </div>
          <div class="battle-hud__hp-text" id="player-hp-text">${state.playerCurrentHp} / ${state.playerMaxHp} HP</div>
        </div>

        <div class="battle-hud__round-info" id="battle-round-info">
          Question ${state.currentQuestionIndex + 1} of ${state.totalQuestionCount}
        </div>

        <div class="battle-hud__card">
          <div class="battle-hud__name">
            <span>👾 ${this.escape(state.monster.name)}</span>
            <span class="battle-hud__level">Lv. ${state.monster.level}</span>
          </div>
          <div class="battle-hud__hp-bar-bg">
            <div class="battle-hud__hp-bar battle-hud__hp-bar--monster" id="monster-hp-bar" style="width: ${(state.monsterCurrentHp / state.monsterMaxHp) * 100}%"></div>
          </div>
          <div class="battle-hud__hp-text" id="monster-hp-text">${state.monsterCurrentHp} / ${state.monsterMaxHp} HP</div>
        </div>
      </div>

      <div class="battle-log" id="battle-log" style="display: none;"></div>
    `;

    document.body.appendChild(container);
    this.container = container;
  }

  update(): void {
    if (!this.container) return;
    const state = this.session.getState();

    const playerBar = this.container.querySelector<HTMLElement>('#player-hp-bar');
    const playerText = this.container.querySelector<HTMLElement>('#player-hp-text');
    const monsterBar = this.container.querySelector<HTMLElement>('#monster-hp-bar');
    const monsterText = this.container.querySelector<HTMLElement>('#monster-hp-text');
    const roundInfo = this.container.querySelector<HTMLElement>('#battle-round-info');

    if (playerBar) {
      playerBar.style.width = `${calculateHpPercentage(state.playerCurrentHp, state.playerMaxHp)}%`;
    }
    if (playerText) {
      playerText.textContent = `${state.playerCurrentHp} / ${state.playerMaxHp} HP`;
    }
    if (monsterBar) {
      monsterBar.style.width = `${calculateHpPercentage(state.monsterCurrentHp, state.monsterMaxHp)}%`;
    }
    if (monsterText) {
      monsterText.textContent = `${state.monsterCurrentHp} / ${state.monsterMaxHp} HP`;
    }
    if (roundInfo) {
      roundInfo.textContent = `Question ${Math.min(state.totalQuestionCount, state.currentQuestionIndex + 1)} of ${state.totalQuestionCount}`;
    }
  }

  showLogMessage(message: string, feedback?: CombatFeedbackDescriptor): void {
    const logEl = this.container?.querySelector<HTMLElement>('#battle-log');
    if (!logEl) return;

    if (feedback) {
      logEl.innerHTML = `
        <span class="combat-badge ${feedback.badgeClass}">${feedback.statusBadge}</span>
        <div style="margin-top: 4px;">${this.escape(message)}</div>
      `;
    } else {
      logEl.textContent = message;
    }

    logEl.style.display = 'block';
  }

  showEndSummary(summary: BattleEndSummary): void {
    const modal = document.createElement('div');
    modal.className = 'battle-summary-modal';
    modal.id = 'battle-summary-modal';

    let titleClass = 'battle-summary-modal__title--defeat';
    let titleText = 'Defeat...';

    if (summary.monsterDefeated) {
      titleClass = 'battle-summary-modal__title--victory';
      titleText = '🏆 Victory!';
    } else if (this.session.getState().status === BattleStatus.MonsterEscaped) {
      titleClass = 'battle-summary-modal__title--escape';
      titleText = '💨 Monster Escaped!';
    }

    modal.innerHTML = `
      <div class="battle-summary-modal__card">
        <div class="${titleClass}">${titleText}</div>
        <div class="battle-summary-modal__stats">
          <div>Questions Answered: <strong>${summary.turnsPlayed} / ${summary.totalQuestions}</strong></div>
          <div>Correct Answers: <strong>${summary.correctAnswers}</strong></div>
          <div>Incorrect Answers: <strong>${summary.incorrectAnswers}</strong></div>
          ${summary.expEarned > 0 ? `<div>Combat EXP: <strong>+${summary.expEarned}</strong></div>` : ''}
          ${summary.goldEarned > 0 ? `<div>Gold: <strong>+${summary.goldEarned}</strong></div>` : ''}
          ${
            summary.droppedItems && summary.droppedItems.length > 0
              ? `<div>Items Dropped: <strong>${summary.droppedItems.map((d) => `${d.itemId} x${d.quantity}`).join(', ')}</strong></div>`
              : ''
          }
          ${
            summary.masteryGains && summary.masteryGains.length > 0
              ? `<div>Mastery Gains: <strong>${summary.masteryGains.map((g) => `+${g.expGained} ${g.subject}${g.leveledUp ? ` (Lv UP -> ${g.newLevel}!)` : ''}`).join(', ')}</strong></div>`
              : ''
          }
        </div>
        <button class="battle-summary-modal__btn" id="summary-ok-btn">Return</button>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#summary-ok-btn')?.addEventListener('click', () => {
      modal.remove();
      this.destroy();
      this.onContinue();
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
