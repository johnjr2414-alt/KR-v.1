import type { Question } from '../../core/types/question';
import { QuestionType } from '../../core/types/question';
import { AnswerOutcome } from '../../core/types/combat';
import { AnswerEvaluator, type AnswerEvaluationResult } from '../../questions/evaluation/AnswerEvaluator';
import { QuestionTimer } from '../../questions/timer/QuestionTimer';

export interface QuestionModalOptions {
  /** The question to present. */
  question: Question;
  /** Callback triggered when evaluation is complete (correct, incorrect, or timeout). */
  onAnswer?: (result: AnswerEvaluationResult) => void;
  /** Callback triggered when the modal is closed or user clicks proceed. */
  onClose?: () => void;
  /** Whether to automatically close after feedback. If false or undefined, shows Continue button. */
  autoCloseDelayMs?: number;
}

/**
 * Reusable HTML/CSS Question Display component.
 *
 * Responsibilities:
 * - Renders Question text, choices (Multiple Choice), or input field (Identification)
 * - Embeds a configurable countdown timer
 * - Restricts multiple answer submissions (submits exactly once)
 * - Evaluates answers via headless AnswerEvaluator
 * - Displays correct/incorrect/timeout feedback and question explanation
 * - Decoupled from combat/battle mechanics and mastery rewards
 */
export class QuestionModal {
  private container: HTMLDivElement | null = null;
  private readonly options: QuestionModalOptions;
  private timer: QuestionTimer | null = null;
  private isSubmitted = false;
  private evaluationResult: AnswerEvaluationResult | null = null;

  constructor(options: QuestionModalOptions) {
    this.options = options;
  }

  /** Gets the result of the evaluation, if submitted or timed out. */
  getEvaluationResult(): AnswerEvaluationResult | null {
    return this.evaluationResult;
  }

  show(): void {
    this.destroy();

    const q = this.options.question;
    const container = document.createElement('div');
    container.className = 'question-modal';
    container.id = 'question-modal';

    container.innerHTML = `
      <div class="question-modal__card">
        <div class="question-modal__header">
          <div class="question-modal__meta">
            <span class="question-modal__badge">${this.escape(q.subject)}</span>
            <span class="question-modal__badge">${this.escape(q.educationalTier)}</span>
            <span class="question-modal__badge">Diff: ${q.difficulty}</span>
          </div>
          <div class="question-modal__timer-wrapper">
            <span class="question-modal__timer-text" id="qm-timer-text">${q.timeLimit}s</span>
          </div>
        </div>
        <div class="question-modal__timer-bar-bg">
          <div class="question-modal__timer-bar" id="qm-timer-bar"></div>
        </div>

        <div class="question-modal__body">
          <div class="question-modal__stem">${this.escape(q.question)}</div>

          <div id="qm-interactive-area">
            ${this.renderInputArea(q)}
          </div>

          <div class="question-modal__feedback" id="qm-feedback"></div>
        </div>

        <div class="question-modal__footer" id="qm-footer" style="display: none;">
          <button class="question-modal__next-btn" id="qm-continue-btn">Continue</button>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    this.container = container;

    this.bindEvents();
    this.startTimer(q.timeLimit);
  }

  destroy(): void {
    if (this.timer) {
      this.timer.stop();
      this.timer = null;
    }
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private renderInputArea(q: Question): string {
    if (q.type === QuestionType.MultipleChoice && q.choices) {
      const choicesHtml = q.choices
        .map((choice) => `
          <button class="question-modal__choice-btn" data-choice-id="${this.escape(choice.choiceId)}">
            <span class="question-modal__choice-id">${this.escape(choice.choiceId.toUpperCase())}</span>
            <span class="question-modal__choice-text">${this.escape(choice.text)}</span>
          </button>
        `)
        .join('');
      return `<div class="question-modal__choices">${choicesHtml}</div>`;
    }

    if (q.type === QuestionType.Identification) {
      return `
        <form class="question-modal__id-form" id="qm-id-form">
          <input
            type="text"
            class="question-modal__id-input"
            id="qm-id-input"
            placeholder="Type your answer here..."
            autocomplete="off"
            autofocus
          />
          <button type="submit" class="question-modal__submit-btn" id="qm-submit-btn">Submit</button>
        </form>
      `;
    }

    // Fallback for Essay or unsupported
    return `
      <form class="question-modal__id-form" id="qm-id-form">
        <input
          type="text"
          class="question-modal__id-input"
          id="qm-id-input"
          placeholder="Answer..."
          autocomplete="off"
        />
        <button type="submit" class="question-modal__submit-btn" id="qm-submit-btn">Submit</button>
      </form>
    `;
  }

  private bindEvents(): void {
    if (!this.container) return;

    const q = this.options.question;

    if (q.type === QuestionType.MultipleChoice) {
      const buttons = this.container.querySelectorAll<HTMLButtonElement>('.question-modal__choice-btn');
      buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const choiceId = btn.dataset.choiceId;
          if (choiceId) {
            this.handleAnswerSubmission(choiceId);
          }
        });
      });
    } else {
      const form = this.container.querySelector('#qm-id-form');
      const input = this.container.querySelector<HTMLInputElement>('#qm-id-input');
      form?.addEventListener('submit', (e) => {
        e.preventDefault();
        const value = input?.value || '';
        this.handleAnswerSubmission(value);
      });
    }

    const continueBtn = this.container.querySelector('#qm-continue-btn');
    continueBtn?.addEventListener('click', () => {
      this.destroy();
      this.options.onClose?.();
    });
  }

  private startTimer(durationSeconds: number): void {
    const timerText = this.container?.querySelector('#qm-timer-text');
    const timerBar = this.container?.querySelector<HTMLElement>('#qm-timer-bar');

    this.timer = new QuestionTimer({
      durationSeconds,
      onTick: (remaining, ratio) => {
        if (timerText) timerText.textContent = `${remaining}s`;
        if (timerBar) {
          timerBar.style.width = `${ratio * 100}%`;
          if (ratio <= 0.25) {
            timerBar.className = 'question-modal__timer-bar question-modal__timer-bar--danger';
          } else if (ratio <= 0.5) {
            timerBar.className = 'question-modal__timer-bar question-modal__timer-bar--warning';
          } else {
            timerBar.className = 'question-modal__timer-bar';
          }
        }
      },
      onTimeout: () => {
        this.handleTimeout();
      },
    });

    this.timer.start();
  }

  private handleAnswerSubmission(answer: string): void {
    if (this.isSubmitted) return;
    this.isSubmitted = true;
    this.timer?.stop();

    this.disableInputs();

    const result = AnswerEvaluator.evaluate(this.options.question, answer, false);
    this.evaluationResult = result;

    this.displayFeedback(result, answer);
    this.options.onAnswer?.(result);

    this.handlePostFeedback();
  }

  private handleTimeout(): void {
    if (this.isSubmitted) return;
    this.isSubmitted = true;

    this.disableInputs();

    const result = AnswerEvaluator.evaluate(this.options.question, '', true);
    this.evaluationResult = result;

    this.displayFeedback(result);
    this.options.onAnswer?.(result);

    this.handlePostFeedback();
  }

  private disableInputs(): void {
    if (!this.container) return;
    const buttons = this.container.querySelectorAll<HTMLButtonElement>('.question-modal__choice-btn');
    buttons.forEach((btn) => (btn.disabled = true));

    const input = this.container.querySelector<HTMLInputElement>('#qm-id-input');
    if (input) input.disabled = true;

    const submitBtn = this.container.querySelector<HTMLButtonElement>('#qm-submit-btn');
    if (submitBtn) submitBtn.disabled = true;
  }

  private displayFeedback(result: AnswerEvaluationResult, submittedAnswer?: string): void {
    if (!this.container) return;

    // Highlight choices if multiple-choice
    if (this.options.question.type === QuestionType.MultipleChoice) {
      const buttons = this.container.querySelectorAll<HTMLButtonElement>('.question-modal__choice-btn');
      const correctChoiceId = (this.options.question.correctAnswer || '').toLowerCase();

      buttons.forEach((btn) => {
        const choiceId = (btn.dataset.choiceId || '').toLowerCase();
        if (choiceId === correctChoiceId) {
          btn.classList.add('question-modal__choice-btn--correct');
        } else if (submittedAnswer && choiceId === submittedAnswer.toLowerCase()) {
          btn.classList.add('question-modal__choice-btn--incorrect');
        }
      });
    }

    const feedbackEl = this.container.querySelector<HTMLElement>('#qm-feedback');
    if (!feedbackEl) return;

    feedbackEl.style.display = 'block';

    let title = '';
    let modifierClass = '';

    if (result.outcome === AnswerOutcome.Correct) {
      title = '✓ Correct!';
      modifierClass = 'question-modal__feedback--correct';
    } else if (result.outcome === AnswerOutcome.Timeout) {
      title = '⏱ Time Up!';
      modifierClass = 'question-modal__feedback--timeout';
    } else {
      title = '✗ Incorrect';
      modifierClass = 'question-modal__feedback--incorrect';
    }

    feedbackEl.className = `question-modal__feedback ${modifierClass}`;

    let html = `<div class="question-modal__feedback-title">${title}</div>`;

    if (result.outcome !== AnswerOutcome.Correct) {
      html += `<div>Correct answer: <strong>${this.escape(result.correctAnswerText)}</strong></div>`;
    }

    if (result.explanation) {
      html += `<div class="question-modal__feedback-explanation">${this.escape(result.explanation)}</div>`;
    }

    feedbackEl.innerHTML = html;
  }

  private handlePostFeedback(): void {
    if (this.options.autoCloseDelayMs !== undefined && this.options.autoCloseDelayMs > 0) {
      window.setTimeout(() => {
        this.destroy();
        this.options.onClose?.();
      }, this.options.autoCloseDelayMs);
    } else {
      const footer = this.container?.querySelector<HTMLElement>('#qm-footer');
      if (footer) footer.style.display = 'flex';
    }
  }

  private escape(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
