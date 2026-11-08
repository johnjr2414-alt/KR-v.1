import { MOCK_RIVALS } from '../../arena/ArenaRivals';
import type { ArenaCompetitor } from '../../arena/ArenaTypes';
import { ArenaDuelSession } from '../../arena/ArenaDuelSession';
import { playerSessionManager } from '../../player';
import { QuestionModal } from '../question-modal/QuestionModal';
import { AnswerOutcome } from '../../core/types/combat';
import type { AnswerEvaluationResult } from '../../questions/evaluation/AnswerEvaluator';
import './arena-modal.css';

export interface ArenaModalOptions {
  onClose?: () => void;
  onMatchComplete?: () => void;
}

/**
 * ArenaModal — Interactive Colosseum Sparring UI.
 * Allows players to choose an AI sparring rival, review Cognitive Reverse Difficulty handicaps,
 * and play turn-based educational duel rounds.
 */
export class ArenaModal {
  private container: HTMLDivElement | null = null;
  private readonly onClose?: () => void;
  private readonly onMatchComplete?: () => void;

  private selectedRival: ArenaCompetitor | null = null;
  private activeSession: ArenaDuelSession | null = null;
  private activeQuestionModal: QuestionModal | null = null;
  private lastRoundNote = '';

  constructor(options: ArenaModalOptions = {}) {
    this.onClose = options.onClose;
    this.onMatchComplete = options.onMatchComplete;
  }

  show(): void {
    this.destroy();

    const container = document.createElement('div');
    container.className = 'arena-overlay';
    container.id = 'arena-modal';

    document.body.appendChild(container);
    this.container = container;

    this.render();
  }

  render(): void {
    if (!this.container) return;

    if (!this.activeSession) {
      this.renderRivalSelection();
    } else {
      this.renderDuelMatch();
    }
  }

  private renderRivalSelection(): void {
    if (!this.container) return;

    const player = playerSessionManager.getPlayer();

    const rivalsHtml = MOCK_RIVALS.map((rival) => {
      const delta = rival.level - player.level;
      let handicapText = 'Balanced Duel';
      if (delta > 0) {
        handicapText = `Opponent +${delta} Lv (Reverse Handicap: You receive HARDER questions)`;
      } else if (delta < 0) {
        handicapText = `Opponent -${Math.abs(delta)} Lv (Reverse Handicap: You receive EASIER questions)`;
      }

      return `
        <div class="arena-rival-item" data-rival-id="${rival.id}">
          <div class="arena-rival-item__info">
            <div class="arena-rival-item__name">⚔️ ${this.escape(rival.displayName)} (Level ${rival.level})</div>
            <div class="arena-rival-item__meta">Subject Focus: ${rival.subjectFocus} | Rating: ${rival.rating}</div>
            <div class="arena-rival-item__meta" style="color: #f43f5e;">${handicapText}</div>
          </div>
          <button class="arena-btn arena-btn--primary" data-start-rival="${rival.id}">
            Spar
          </button>
        </div>
      `;
    }).join('');

    this.container.innerHTML = `
      <div class="arena-card">
        <div class="arena-card__header">
          <div class="arena-card__title-area">
            <div class="arena-card__title">🏟️ Colosseum Sparring Grounds</div>
            <div class="arena-card__subtitle">Practice duels against rival scholars with Reverse Difficulty handicap balancing.</div>
          </div>
          <button class="arena-card__close" id="arena-close-btn">&times;</button>
        </div>
        <div class="arena-content">
          <div class="arena-handicap-banner">
            ⚖️ <strong>Reverse Difficulty Rule:</strong> In competitive arena duels, lower-level combatants are assigned harder questions to offset RPG stat advantages, balancing academic mastery against character grinding.
          </div>
          <div class="arena-rival-list">
            ${rivalsHtml}
          </div>
        </div>
        <div class="arena-card__footer">
          <span>Player: ${this.escape(player.name)} (Lv ${player.level})</span>
          <span>Colosseum Practice Arena</span>
        </div>
      </div>
    `;

    this.bindSelectionEvents();
  }

  private renderDuelMatch(): void {
    if (!this.container || !this.activeSession || !this.selectedRival) return;

    const player = playerSessionManager.getPlayer();
    const scores = this.activeSession.getScores();
    const round = this.activeSession.getCurrentRound();
    const maxRounds = this.activeSession.getMaxRounds();
    const isOver = this.activeSession.isResolved();
    const pProfile = this.activeSession.getPlayerProfile();

    let outcomeBox = '';
    if (isOver) {
      const winnerId = this.activeSession.getWinnerId();
      if (winnerId === player.id) {
        outcomeBox = `<div class="arena-outcome-box arena-outcome-box--win">🏆 Match Victory! You triumphed in academic sparring!</div>`;
      } else if (winnerId === this.selectedRival.id) {
        outcomeBox = `<div class="arena-outcome-box arena-outcome-box--lose">💀 Defeat! ${this.escape(this.selectedRival.displayName)} outwitted you this time.</div>`;
      } else {
        outcomeBox = `<div class="arena-outcome-box arena-outcome-box--tie">🤝 Standoff! Academic duel concluded in a tie!</div>`;
      }
    }

    const roundNotice = this.lastRoundNote
      ? `<div style="font-size: 13px; text-align: center; color: #cbd5e1;">${this.lastRoundNote}</div>`
      : '';

    this.container.innerHTML = `
      <div class="arena-card">
        <div class="arena-card__header">
          <div class="arena-card__title-area">
            <div class="arena-card__title">⚔️ Arena Duel — Round ${Math.min(round, maxRounds)} of ${maxRounds}</div>
            <div class="arena-card__subtitle">${pProfile.handicapNote}</div>
          </div>
          <button class="arena-card__close" id="arena-close-btn">&times;</button>
        </div>
        <div class="arena-content">
          <div class="arena-matchup-grid">
            <div class="arena-combatant arena-combatant--player">
              <span class="arena-combatant__name">🛡️ ${this.escape(player.name)}</span>
              <span class="arena-combatant__level">Lv ${player.level} (${pProfile.tier})</span>
              <span class="arena-combatant__score">${scores.player} pts</span>
            </div>
            <div class="arena-vs">VS</div>
            <div class="arena-combatant arena-combatant--rival">
              <span class="arena-combatant__name">🗡️ ${this.escape(this.selectedRival.displayName)}</span>
              <span class="arena-combatant__level">Lv ${this.selectedRival.level}</span>
              <span class="arena-combatant__score">${scores.rival} pts</span>
            </div>
          </div>

          ${outcomeBox}
          ${roundNotice}

          <div style="display: flex; justify-content: center; margin-top: 10px;">
            ${
              !isOver
                ? `<button class="arena-btn arena-btn--primary" id="arena-next-round-btn">Engage Round ${round}</button>`
                : `<button class="arena-btn arena-btn--secondary" id="arena-finish-btn">Return to Matchmaking</button>`
            }
          </div>
        </div>
        <div class="arena-card__footer">
          <span>Question Timer: ${pProfile.timeLimitSeconds}s</span>
          <span>Target Difficulty: ★ ${pProfile.targetDifficulty}/5</span>
        </div>
      </div>
    `;

    this.bindDuelEvents();
  }

  private bindSelectionEvents(): void {
    if (!this.container) return;

    this.container.querySelector('#arena-close-btn')?.addEventListener('click', () => {
      this.destroy();
      this.onClose?.();
    });

    this.container.querySelectorAll('[data-start-rival]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const rivalId = btn.getAttribute('data-start-rival');
        const rival = MOCK_RIVALS.find((r) => r.id === rivalId);
        if (!rival) return;

        this.selectedRival = rival;
        const player = playerSessionManager.getPlayer();

        this.activeSession = new ArenaDuelSession({
          player: {
            id: player.id,
            displayName: player.name,
            level: player.level,
          },
          rival,
          subject: rival.subjectFocus,
        });

        this.lastRoundNote = '';
        this.render();
      });
    });
  }

  private bindDuelEvents(): void {
    if (!this.container) return;

    this.container.querySelector('#arena-close-btn')?.addEventListener('click', () => {
      this.destroy();
      this.onClose?.();
    });

    this.container.querySelector('#arena-finish-btn')?.addEventListener('click', () => {
      this.activeSession = null;
      this.selectedRival = null;
      this.lastRoundNote = '';
      this.onMatchComplete?.();
      this.render();
    });

    this.container.querySelector('#arena-next-round-btn')?.addEventListener('click', () => {
      this.promptRoundQuestion();
    });
  }

  private promptRoundQuestion(): void {
    if (!this.activeSession) return;

    const question = this.activeSession.samplePlayerQuestion();
    if (!question) {
      this.lastRoundNote = 'No question available for this tier. Round passed.';
      this.render();
      return;
    }

    const pProfile = this.activeSession.getPlayerProfile();
    const roundQuestion = {
      ...question,
      timeLimit: pProfile.timeLimitSeconds,
    };

    this.activeQuestionModal = new QuestionModal({
      question: roundQuestion,
      onAnswer: (result: AnswerEvaluationResult) => {
        const isCorrect = result.outcome === AnswerOutcome.Correct;
        const outcome = this.activeSession?.resolveRound(isCorrect);

        if (outcome) {
          const pResultText = isCorrect ? '✅ You answered correctly!' : '❌ You missed the question.';
          const rResultText = outcome.rivalAnsweredCorrect
            ? `⚔️ ${this.escape(this.selectedRival?.displayName || 'Rival')} answered correctly!`
            : `🛡️ ${this.escape(this.selectedRival?.displayName || 'Rival')} made an error!`;

          this.lastRoundNote = `${pResultText} | ${rResultText}`;
        }

        this.activeQuestionModal?.destroy();
        this.activeQuestionModal = null;
        this.render();
      },
    });

    this.activeQuestionModal.show();
  }

  destroy(): void {
    if (this.activeQuestionModal) {
      this.activeQuestionModal.destroy();
      this.activeQuestionModal = null;
    }
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
