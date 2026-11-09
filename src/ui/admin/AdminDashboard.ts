import type { Question, QuestionChoice } from '../../core/types/question';
import { ContentReviewStatus, QuestionType, QuestionStatus } from '../../core/types/question';
import { EducationalTier, SubjectId } from '../../core/types/education';
import type {
  QuestionBankImportPreview,
  QuestionBackup,
  QuestionManager,
} from '../../questions/management/QuestionManager';
import { QUESTION_BANK_FORMAT_VERSION } from '../../questions/management/QuestionBankTransfer';
import { GAME_VERSION } from '../../constants';
import type { QuestionFilterCriteria } from '../../questions/retrieval/QuestionRepository';
import {
  buildQuestionDraft,
  validateQuestionDraft,
  type QuestionDraftInput,
} from '../../questions/management/QuestionDraft';
import { buildQuestionPreview } from '../../questions/management/QuestionPreview';
import {
  TOPIC_TAXONOMY,
  buildTaxonomyCoverageReport,
  getSubjectDisplayName,
  resolveRawTopicsForTopic,
} from '../../questions/taxonomy';
import { buildReviewReport, renderReviewReportJson } from '../../questions/review';
import { ADMIN_LOCAL_SECURITY_WARNING } from '../../config/adminAccessConfig';

type Panel = 'add' | 'list' | 'import-export';

/**
 * AdminDashboard — full-page HTML/CSS overlay for Super Admin question management.
 *
 * Responsibilities:
 *  - Navigation sidebar with Add Question, Question List, Import/Export
 *  - Add/Edit Question form with real-time validation
 *  - Filterable question list table
 *  - JSON import/export
 *  - Delete confirmation
 *  - Calls QuestionManager for all CRUD operations
 */
export class AdminDashboard {
  private container: HTMLDivElement | null = null;
  private readonly manager: QuestionManager;
  private readonly onExit: () => void;

  /** Currently active navigation panel. */
  private activePanel: Panel = 'list';
  /** Question being edited (null = creating new). */
  private editingQuestion: Question | null = null;
  /** Current choice count for the MC form. */
  private choiceCount = 4;
  /** Last filter criteria applied on the list panel (used for filtered export). */
  private lastListCriteria: QuestionFilterCriteria = {};
  /** Snapshot taken immediately before the most recent bulk import. */
  private lastBackup: QuestionBackup | null = null;
  /** Pending post-save panel switch, cleared when the dashboard is torn down. */
  private panelSwitchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(manager: QuestionManager, onExit: () => void) {
    this.manager = manager;
    this.onExit = onExit;
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  /** Gets the currently active navigation panel. */
  getActivePanel(): Panel {
    return this.activePanel;
  }

  show(): void {
    this.destroy();

    const container = document.createElement('div');
    container.id = 'admin-dashboard';
    container.innerHTML = this.buildLayout();
    document.body.appendChild(container);
    this.container = container;

    const banner = container.querySelector<HTMLElement>('.admin__security-banner');
    if (banner) banner.textContent = `⚠️ ${ADMIN_LOCAL_SECURITY_WARNING}`;

    this.bindNavigation();
    this.switchPanel('list');
  }

  destroy(): void {
    if (this.panelSwitchTimer !== null) {
      clearTimeout(this.panelSwitchTimer);
      this.panelSwitchTimer = null;
    }
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }

  // ─── Layout builder ────────────────────────────────────────────────────────

  private buildLayout(): string {
    return `
      <nav class="admin__sidebar">
        <div class="admin__sidebar-title">🛡️ Admin Panel</div>
        <button class="admin__nav-btn" data-panel="list">📋 Question List</button>
        <button class="admin__nav-btn" data-panel="add">➕ Add Question</button>
        <button class="admin__nav-btn" data-panel="import-export">📦 Import / Export</button>
        <button class="admin__nav-btn admin__nav-btn--exit" data-action="exit">🚪 Exit Admin</button>
      </nav>
      <main class="admin__content">
        <div class="admin__security-banner" role="note"></div>
        <section id="panel-list" class="admin__panel"></section>
        <section id="panel-add" class="admin__panel"></section>
        <section id="panel-import-export" class="admin__panel"></section>
      </main>
    `;
  }

  // ─── Navigation ─────────────────────────────────────────────────────────────

  private bindNavigation(): void {
    if (!this.container) return;

    this.container.querySelectorAll<HTMLButtonElement>('.admin__nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const panel = btn.dataset.panel as Panel | undefined;
        const action = btn.dataset.action;

        if (action === 'exit') {
          this.destroy();
          this.onExit();
          return;
        }
        if (panel) {
          this.switchPanel(panel);
        }
      });
    });
  }

  private switchPanel(panel: Panel): void {
    if (!this.container) return;
    this.activePanel = panel;
    this.editingQuestion = null;

    // Update nav highlights
    this.container.querySelectorAll('.admin__nav-btn').forEach((btn) => {
      btn.classList.toggle(
        'admin__nav-btn--active',
        (btn as HTMLElement).dataset.panel === panel,
      );
    });

    // Hide all panels
    this.container.querySelectorAll('.admin__panel').forEach((p) => {
      p.classList.remove('admin__panel--active');
    });

    // Show + render active panel
    const panelEl = this.container.querySelector(`#panel-${panel}`);
    if (panelEl) {
      panelEl.classList.add('admin__panel--active');
      if (panel === 'list') this.renderList(panelEl as HTMLElement);
      else if (panel === 'add') this.renderForm(panelEl as HTMLElement);
      else if (panel === 'import-export') this.renderImportExport(panelEl as HTMLElement);
    }
  }

  // ─── Add / Edit Question Form ──────────────────────────────────────────────

  private renderForm(panelEl: HTMLElement, question?: Question): void {
    this.editingQuestion = question ?? null;
    this.choiceCount = question?.choices?.length ?? 4;
    const isEdit = !!question;
    const q = question;

    const tierOptions = Object.values(EducationalTier).map((t) =>
      `<option value="${t}" ${q?.educationalTier === t ? 'selected' : ''}>${t}</option>`
    ).join('');

    const subjectOptions = Object.values(SubjectId).map((s) =>
      `<option value="${s}" ${q?.subject === s ? 'selected' : ''}>${s}</option>`
    ).join('');

    const typeOptions = Object.values(QuestionType).map((t) =>
      `<option value="${t}" ${q?.type === t ? 'selected' : ''}>${t}</option>`
    ).join('');

    const statusOptions = Object.values(QuestionStatus).map((s) =>
      `<option value="${s}" ${q?.status === s ? 'selected' : ''}>${s}</option>`
    ).join('');

    const reviewOptions = Object.values(ContentReviewStatus).map((r) =>
      `<option value="${r}" ${q?.reviewStatus === r ? 'selected' : ''}>${r}</option>`
    ).join('');

    panelEl.innerHTML = `
      <div class="admin-form">
        <h2 class="admin-form__title">${isEdit ? '✏️ Edit Question' : '➕ Add Question'}</h2>
        <div id="form-messages"></div>
        <form id="question-form">
          <div class="admin-form__row">
            <label class="admin-form__label">Educational Tier</label>
            <select class="admin-form__select" name="educationalTier">${tierOptions}</select>
          </div>
          <div class="admin-form__row">
            <label class="admin-form__label">Subject</label>
            <select class="admin-form__select" name="subject">${subjectOptions}</select>
          </div>
          <div class="admin-form__row">
            <label class="admin-form__label">Topic</label>
            <input class="admin-form__input" name="topic" value="${this.esc(q?.topic ?? '')}" placeholder="e.g. fractions, photosynthesis" />
          </div>
          <div class="admin-form__row">
            <label class="admin-form__label">Difficulty (1–5)</label>
            <input class="admin-form__input" name="difficulty" type="number" min="1" max="5" value="${q?.difficulty ?? 1}" />
          </div>
          <div class="admin-form__row">
            <label class="admin-form__label">Question Type</label>
            <select class="admin-form__select" name="type" id="question-type-select">${typeOptions}</select>
          </div>
          <div class="admin-form__row">
            <label class="admin-form__label">Question Text</label>
            <textarea class="admin-form__textarea" name="question" rows="3" placeholder="Enter the question stem...">${this.esc(q?.question ?? '')}</textarea>
          </div>
          <div class="admin-form__row" id="choices-section">
            <label class="admin-form__label">Choices (select the correct answer)</label>
            <div class="admin-form__choices-container" id="choices-container"></div>
            <button type="button" class="admin-form__add-choice-btn" id="add-choice-btn">+ Add Choice</button>
          </div>
          <div class="admin-form__row" id="correct-answer-section">
            <label class="admin-form__label">Correct Answer</label>
            <input class="admin-form__input" name="correctAnswer" value="${this.esc(q?.correctAnswer ?? '')}" placeholder="Canonical correct answer text" />
          </div>
          <div class="admin-form__row" id="accepted-answers-section">
            <label class="admin-form__label">Accepted Answers (comma-separated alternatives)</label>
            <input class="admin-form__input" name="acceptedAnswers" value="${this.esc((q?.acceptedAnswers ?? []).join(', '))}" placeholder="e.g. H2O, h2o" />
          </div>
          <div class="admin-form__row" id="expected-answer-section">
            <label class="admin-form__label">Expected Answer / Grading Reference</label>
            <textarea class="admin-form__textarea" name="expectedAnswer" rows="3">${this.esc(q?.expectedAnswer ?? '')}</textarea>
          </div>
          <div class="admin-form__row">
            <label class="admin-form__label">Explanation</label>
            <textarea class="admin-form__textarea" name="explanation" rows="2">${this.esc(q?.explanation ?? '')}</textarea>
          </div>
          <div class="admin-form__row">
            <label class="admin-form__label">Time Limit (seconds)</label>
            <input class="admin-form__input" name="timeLimit" type="number" min="1" value="${q?.timeLimit ?? 15}" />
          </div>
          <div class="admin-form__row">
            <label class="admin-form__label">Base Mastery EXP</label>
            <input class="admin-form__input" name="baseMasteryExp" type="number" min="1" value="${q?.baseMasteryExp ?? 10}" />
          </div>
          <div class="admin-form__row">
            <label class="admin-form__label">Status</label>
            <select class="admin-form__select" name="status">${statusOptions}</select>
          </div>
          <div class="admin-form__row">
            <label class="admin-form__label">Review Status (authoring label, optional)</label>
            <select class="admin-form__select" name="reviewStatus">
              <option value="">(no review recorded)</option>
              ${reviewOptions}
            </select>
          </div>
          <div class="admin-form__row">
            <label class="admin-form__label">Tags (comma-separated)</label>
            <input class="admin-form__input" name="tags" value="${this.esc((q?.tags ?? []).join(', '))}" placeholder="e.g. grade-3, algebra" />
          </div>
          <div class="admin-form__actions">
            <button type="submit" class="admin-form__btn admin-form__btn--primary">
              ${isEdit ? 'Save Changes' : 'Create Question'}
            </button>
            <button type="button" class="admin-form__btn admin-form__btn--secondary" id="form-draft-btn">Save as Draft</button>
            <button type="button" class="admin-form__btn admin-form__btn--secondary" id="form-preview-btn">👁️ Preview as Player</button>
            <button type="button" class="admin-form__btn admin-form__btn--secondary" id="form-cancel-btn">Cancel</button>
          </div>
        </form>
        <div class="admin-form__preview" id="form-preview" hidden></div>
      </div>
    `;

    this.renderChoicesForType(q?.type ?? QuestionType.MultipleChoice, q?.choices, q?.correctAnswer);
    this.bindFormEvents(panelEl, isEdit);
  }

  private renderChoicesForType(
    type: QuestionType,
    existingChoices?: QuestionChoice[],
    correctAnswer?: string,
  ): void {
    if (!this.container) return;

    const choicesSection = this.container.querySelector('#choices-section') as HTMLElement;
    const correctSection = this.container.querySelector('#correct-answer-section') as HTMLElement;
    const acceptedSection = this.container.querySelector('#accepted-answers-section') as HTMLElement;
    const expectedSection = this.container.querySelector('#expected-answer-section') as HTMLElement;

    // Show/hide sections based on type
    choicesSection.style.display = type === QuestionType.MultipleChoice ? 'block' : 'none';
    correctSection.style.display = type === QuestionType.Identification ? 'block' : 'none';
    acceptedSection.style.display = type === QuestionType.Identification ? 'block' : 'none';
    expectedSection.style.display = type === QuestionType.Essay ? 'block' : 'none';

    if (type === QuestionType.MultipleChoice) {
      this.renderChoiceInputs(existingChoices, correctAnswer);
    }
  }

  private renderChoiceInputs(existingChoices?: QuestionChoice[], correctAnswer?: string): void {
    const container = this.container?.querySelector('#choices-container');
    if (!container) return;

    const count = Math.max(this.choiceCount, 2);
    const letters = 'abcdefghij';
    let html = '';

    for (let i = 0; i < count; i++) {
      const choiceId = letters[i] ?? `c${i}`;
      const existingChoice = existingChoices?.[i];
      const text = existingChoice?.text ?? '';
      const isCorrect = correctAnswer === (existingChoice?.choiceId ?? choiceId);

      html += `
        <div class="admin-form__choice-row">
          <input type="radio" name="correctChoice" value="${choiceId}" ${isCorrect ? 'checked' : ''} />
          <span class="admin-form__choice-label">${choiceId.toUpperCase()}:</span>
          <input type="text" class="admin-form__input" data-choice-id="${choiceId}" value="${this.esc(text)}" placeholder="Choice ${choiceId.toUpperCase()}" />
        </div>
      `;
    }

    container.innerHTML = html;
  }

  private bindFormEvents(panelEl: HTMLElement, isEdit: boolean): void {
    const form = panelEl.querySelector('#question-form') as HTMLFormElement;
    const typeSelect = panelEl.querySelector('#question-type-select') as HTMLSelectElement;
    const addChoiceBtn = panelEl.querySelector('#add-choice-btn') as HTMLButtonElement;
    const cancelBtn = panelEl.querySelector('#form-cancel-btn') as HTMLButtonElement;
    const draftBtn = panelEl.querySelector('#form-draft-btn') as HTMLButtonElement;
    const previewBtn = panelEl.querySelector('#form-preview-btn') as HTMLButtonElement;

    typeSelect?.addEventListener('change', () => {
      this.renderChoicesForType(typeSelect.value as QuestionType);
    });

    addChoiceBtn?.addEventListener('click', () => {
      this.choiceCount = Math.min(this.choiceCount + 1, 10);
      this.renderChoiceInputs();
    });

    cancelBtn?.addEventListener('click', () => {
      this.switchPanel('list');
    });

    draftBtn?.addEventListener('click', () => {
      void this.handleFormSubmit(form, isEdit, { forceDraft: true });
    });

    previewBtn?.addEventListener('click', () => {
      this.renderPreview(form);
    });

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.handleFormSubmit(form, isEdit);
    });
  }

  /**
   * Reads the current form state into a plain {@link QuestionDraftInput}.
   * No DOM element is left out of this mapping, and no validation happens here.
   */
  private collectDraftInput(form: HTMLFormElement): QuestionDraftInput {
    const formData = new FormData(form);
    const type = formData.get('type') as QuestionType;

    const input: QuestionDraftInput = {
      educationalTier: (formData.get('educationalTier') as string) ?? '',
      subject: (formData.get('subject') as string) ?? '',
      topic: (formData.get('topic') as string) ?? '',
      difficulty: (formData.get('difficulty') as string) ?? '',
      type: type ?? '',
      question: (formData.get('question') as string) ?? '',
      timeLimit: (formData.get('timeLimit') as string) ?? '',
      baseMasteryExp: (formData.get('baseMasteryExp') as string) ?? '',
      status: (formData.get('status') as string) ?? '',
      reviewStatus: (formData.get('reviewStatus') as string) ?? '',
      explanation: (formData.get('explanation') as string) ?? '',
      tags: (formData.get('tags') as string) ?? '',
    };

    if (type === QuestionType.MultipleChoice) {
      const choiceInputs = this.container?.querySelectorAll<HTMLInputElement>('[data-choice-id]') ?? [];
      const choices: Array<{ choiceId: string; text: string }> = [];
      choiceInputs.forEach((el) => {
        choices.push({ choiceId: el.dataset.choiceId ?? '', text: el.value });
      });
      input.choices = choices;
      const checkedRadio = this.container?.querySelector<HTMLInputElement>('input[name="correctChoice"]:checked');
      input.correctChoiceId = checkedRadio?.value ?? '';
    } else if (type === QuestionType.Identification) {
      input.correctAnswer = (formData.get('correctAnswer') as string) ?? '';
      input.acceptedAnswers = (formData.get('acceptedAnswers') as string) ?? '';
    } else if (type === QuestionType.Essay) {
      input.expectedAnswer = (formData.get('expectedAnswer') as string) ?? '';
    }

    return input;
  }

  private async handleFormSubmit(
    form: HTMLFormElement,
    isEdit: boolean,
    options: { forceDraft?: boolean } = {},
  ): Promise<void> {
    const messagesEl = this.container?.querySelector('#form-messages');
    if (messagesEl) messagesEl.innerHTML = '';
    this.clearFieldErrors();

    const input = this.collectDraftInput(form);
    if (options.forceDraft) {
      input.status = QuestionStatus.Draft;
    }

    const validation = validateQuestionDraft(input);
    if (!validation.isValid) {
      // Never silently publish/submit invalid content — surface every error
      // next to the offending field.
      this.markFieldErrors(validation.byField);
      this.showValidationErrors(
        validation.errors.map((e) => `${e.field}: ${e.message}`),
      );
      return;
    }

    const questionData: Partial<Question> = validation.draft;

    try {
      if (isEdit && this.editingQuestion) {
        const result = await this.manager.updateQuestion(this.editingQuestion.id, questionData);
        if (result.errors && result.errors.length > 0) {
          this.showValidationErrors(result.errors.map((e) => `${e.field}: ${e.message}`));
          return;
        }
        this.showSuccessMessage('Question updated successfully.');
      } else {
        const result = await this.manager.createQuestion(questionData);
        if (result.errors && result.errors.length > 0) {
          this.showValidationErrors(result.errors.map((e) => `${e.field}: ${e.message}`));
          return;
        }
        this.showSuccessMessage(
          options.forceDraft ? 'Draft saved successfully.' : 'Question created successfully.',
        );
      }

      if (this.panelSwitchTimer !== null) clearTimeout(this.panelSwitchTimer);
      this.panelSwitchTimer = setTimeout(() => {
        this.panelSwitchTimer = null;
        this.switchPanel('list');
      }, 800);
    } catch (err) {
      this.showValidationErrors([(err as Error).message]);
    }
  }

  /** Clears any previously-marked field errors. */
  private clearFieldErrors(): void {
    if (!this.container) return;
    this.container.querySelectorAll('.admin-form__input--error').forEach((el) =>
      el.classList.remove('admin-form__input--error'),
    );
    this.container.querySelectorAll('.admin-form__error-text').forEach((el) => el.remove());
  }

  /**
   * Attaches validation messages directly beneath the offending form controls.
   * Fields without a matching control (e.g. `id`, `createdAt`) are summarised.
   */
  private markFieldErrors(byField: Record<string, string[]>): void {
    if (!this.container) return;
    const form = this.container.querySelector('#question-form');
    if (!form) return;

    for (const [field, messages] of Object.entries(byField)) {
      if (field === 'choices') {
        const section = this.container.querySelector('#choices-section');
        if (section) {
          section.classList.add('admin-form__input--error');
          const err = document.createElement('div');
          err.className = 'admin-form__error-text';
          err.textContent = messages.join(' ');
          section.appendChild(err);
        }
        continue;
      }

      const control = form.querySelector(`[name="${field}"]`) as HTMLElement | null;
      if (!control) continue;
      control.classList.add('admin-form__input--error');
      const err = document.createElement('div');
      err.className = 'admin-form__error-text';
      err.textContent = messages.join(' ');
      control.insertAdjacentElement('afterend', err);
    }
  }

  /** Renders a live player-view preview of the current draft below the form. */
  private renderPreview(form: HTMLFormElement): void {
    const previewEl = this.container?.querySelector('#form-preview') as HTMLElement | null;
    if (!previewEl) return;

    const preview = buildQuestionPreview(buildQuestionDraft(this.collectDraftInput(form)));

    const choiceRows = preview.choices.length > 0
      ? preview.choices.map((choice) => `
          <div class="admin-preview__choice ${choice.isCorrect ? 'admin-preview__choice--correct' : ''}">
            <span class="admin-preview__choice-label">${this.esc(choice.label)}</span>
            <span>${this.esc(choice.text)}</span>
            ${choice.isCorrect ? '<span class="admin-preview__tag">correct</span>' : ''}
          </div>`).join('')
      : '<div class="admin-preview__muted">No choices (not a multiple-choice question).</div>';

    const answerLine =
      preview.type === QuestionType.Identification
        ? `<div><strong>Accepted answers:</strong> ${this.esc(preview.acceptedAnswers.join(', ') || preview.correctAnswerText || '—')}</div>`
        : preview.type === QuestionType.Essay
          ? `<div><strong>Model answer:</strong> ${this.esc(preview.expectedAnswer ?? '—')}</div>`
          : `<div><strong>Correct:</strong> ${this.esc(preview.correctAnswerText ?? '—')}</div>`;

    const issueList = preview.issues.length > 0
      ? `<div class="admin-preview__issues">${preview.issues.map((i) => `• ${this.esc(i.field)}: ${this.esc(i.message)}`).join('<br/>')}</div>`
      : '';

    previewEl.hidden = false;
    previewEl.innerHTML = `
      <div class="admin-preview">
        <div class="admin-preview__header">
          <span class="admin-preview__badge ${preview.playable ? 'admin-preview__badge--ok' : 'admin-preview__badge--warn'}">
            ${preview.playable ? 'Playable' : 'Not playable'}
          </span>
          <span class="admin-preview__meta">
            ${this.esc(preview.educationalTier ?? '—')} · ${this.esc(preview.subject ?? '—')} · ${this.esc(preview.topic || '—')}
            · Diff ${preview.difficulty ?? '—'} · ${preview.timeLimit ?? '—'}s · ${preview.baseMasteryExp ?? '—'} EXP
          </span>
        </div>
        <div class="admin-preview__prompt">${this.esc(preview.prompt || '(no prompt)')}</div>
        <div class="admin-preview__choices">${choiceRows}</div>
        <div class="admin-preview__answer">${answerLine}</div>
        ${preview.explanation ? `<div class="admin-preview__explanation"><strong>Explanation:</strong> ${this.esc(preview.explanation)}</div>` : ''}
        ${issueList}
      </div>
    `;
  }

  private showValidationErrors(errors: string[]): void {
    const el = this.container?.querySelector('#form-messages');
    if (!el) return;
    el.innerHTML = `
      <div class="admin-form__validation-summary">
        <strong>Validation Errors:</strong><br/>
        ${errors.map((e) => `• ${this.esc(e)}`).join('<br/>')}
      </div>
    `;
  }

  private showSuccessMessage(msg: string): void {
    const el = this.container?.querySelector('#form-messages');
    if (!el) return;
    el.innerHTML = `<div class="admin-form__success-msg">${this.esc(msg)}</div>`;
  }

  // ─── Question List ──────────────────────────────────────────────────────────

  private renderList(panelEl: HTMLElement): void {
    const allQuestions = this.manager.getRepository().getAll();

    panelEl.innerHTML = `
      <h2 class="admin-list__title">📋 Question List</h2>
      <div class="admin-list__filters" id="list-filters">
        <select class="admin-list__filter-select" data-filter="subject">
          <option value="">All Subjects</option>
          ${Object.values(SubjectId).map((s) => `<option value="${s}">${this.esc(getSubjectDisplayName(s))}</option>`).join('')}
        </select>
        <select class="admin-list__filter-select" data-filter="topic">
          <option value="">All Topics</option>
          ${TOPIC_TAXONOMY.map((t) => `<option value="${t.id}">${this.esc(getSubjectDisplayName(t.subject))} · ${this.esc(t.displayName)}</option>`).join('')}
        </select>
        <select class="admin-list__filter-select" data-filter="educationalTier">
          <option value="">All Tiers</option>
          ${Object.values(EducationalTier).map((t) => `<option value="${t}">${t}</option>`).join('')}
        </select>
        <select class="admin-list__filter-select" data-filter="difficulty">
          <option value="">All Difficulties</option>
          ${[1, 2, 3, 4, 5].map((d) => `<option value="${d}">${d}</option>`).join('')}
        </select>
        <select class="admin-list__filter-select" data-filter="type">
          <option value="">All Types</option>
          ${Object.values(QuestionType).map((t) => `<option value="${t}">${t}</option>`).join('')}
        </select>
        <select class="admin-list__filter-select" data-filter="status">
          <option value="">Published</option>
          ${Object.values(QuestionStatus).map((s) => `<option value="${s}">${s}</option>`).join('')}
        </select>
        <select class="admin-list__filter-select" data-filter="reviewStatus">
          <option value="">All Review States</option>
          ${Object.values(ContentReviewStatus).map((r) => `<option value="${r}">${r}</option>`).join('')}
        </select>
      </div>
      <div class="admin-list__count" id="list-count">${allQuestions.length} questions</div>
      <div class="admin-list__coverage" id="list-coverage">${this.buildCoverageText(allQuestions)}</div>
      <div class="admin-list__coverage" id="list-review-summary">${this.buildReviewSummaryText(allQuestions)}</div>
      <table class="admin-list__table">
        <thead>
          <tr>
            <th>Question</th>
            <th>Subject</th>
            <th>Tier</th>
            <th>Diff</th>
            <th>Type</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="list-tbody"></tbody>
      </table>
    `;

    this.renderTableRows(allQuestions);
    this.bindListFilters(panelEl);
  }

  private renderTableRows(questions: Question[]): void {
    const tbody = this.container?.querySelector('#list-tbody');
    const countEl = this.container?.querySelector('#list-count');
    if (!tbody) return;
    if (countEl) countEl.textContent = `${questions.length} questions`;

    if (questions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#606080;padding:24px;">No questions found.</td></tr>';
      return;
    }

    tbody.innerHTML = questions.map((q) => `
      <tr>
        <td title="${this.esc(q.question)}">${this.esc(q.question.substring(0, 60))}${q.question.length > 60 ? '…' : ''}</td>
        <td>${q.subject}</td>
        <td>${q.educationalTier}</td>
        <td>${q.difficulty}</td>
        <td>${q.type}</td>
        <td>${q.status}</td>
        <td>
          <button class="admin-list__action-btn admin-list__action-btn--edit" data-action="edit" data-id="${q.id}">Edit</button>
          <button class="admin-list__action-btn admin-list__action-btn--delete" data-action="delete" data-id="${q.id}">Delete</button>
        </td>
      </tr>
    `).join('');

    // Bind row actions
    tbody.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id!;
        if (btn.dataset.action === 'edit') {
          this.handleEdit(id);
        } else if (btn.dataset.action === 'delete') {
          this.handleDelete(id);
        }
      });
    });
  }

  private bindListFilters(panelEl: HTMLElement): void {
    panelEl.querySelectorAll<HTMLSelectElement>('.admin-list__filter-select').forEach((select) => {
      select.addEventListener('change', () => {
        this.applyListFilters();
      });
    });
  }

  private applyListFilters(): void {
    if (!this.container) return;

    const criteria: QuestionFilterCriteria = {};
    const filters = this.container.querySelectorAll<HTMLSelectElement>('.admin-list__filter-select');

    filters.forEach((select) => {
      const filterName = select.dataset.filter;
      const value = select.value;
      if (!value || !filterName) return;

      if (filterName === 'subject') criteria.subject = value as SubjectId;
      else if (filterName === 'topic') {
        const rawTopics = resolveRawTopicsForTopic(value);
        if (rawTopics.length > 0) criteria.topics = rawTopics;
      } else if (filterName === 'educationalTier') criteria.educationalTier = value as EducationalTier;
      else if (filterName === 'difficulty') criteria.difficulty = parseInt(value, 10);
      else if (filterName === 'type') criteria.type = value as QuestionType;
      else if (filterName === 'status') criteria.status = value as QuestionStatus;
      else if (filterName === 'reviewStatus') criteria.reviewStatus = value as ContentReviewStatus;
    });

    const filtered = this.manager.getRepository().filter(criteria);
    this.lastListCriteria = criteria;
    this.renderTableRows(filtered);
  }

  /**
   * Summarises how the taxonomy covers the given pool. Unmapped questions are
   * reported here, never reclassified.
   */
  private buildCoverageText(questions: Question[]): string {
    const report = buildTaxonomyCoverageReport(questions);
    const emptySubjects = report.subjectsWithoutContent
      .map((subject) => getSubjectDisplayName(subject))
      .join(', ');
    const noContent = emptySubjects ? ` Subjects without content: ${this.esc(emptySubjects)}.` : '';

    if (report.unmappedCount === 0) {
      return `Taxonomy coverage: all ${report.totalQuestions} questions map to a topic.${noContent}`;
    }

    const sample = report.unmappedQuestions
      .slice(0, 5)
      .map((question) => `${question.subject}/${question.topic}`)
      .join(', ');
    const suffix = report.unmappedCount > 5 ? ', …' : '';
    return `Taxonomy coverage: ${report.unmappedCount} of ${report.totalQuestions} questions are unmapped (${this.esc(sample)}${suffix}).${noContent}`;
  }

  /**
   * Summarises authoring gaps and similar-prompt candidates across the pool.
   * Candidates are reported, never treated as duplicate verdicts.
   */
  private buildReviewSummaryText(questions: Question[]): string {
    const report = buildReviewReport(questions);
    const candidates = report.similarPromptPairs.length;
    const candidateText =
      candidates > 0 ? ` ${candidates} similar-prompt candidate(s) need review.` : '';
    return `Content review: ${report.questionsWithGaps} question(s) have ${report.gapCount} authoring gap(s).${candidateText}`;
  }

  private handleEdit(id: string): void {
    const question = this.manager.getRepository().getById(id);
    if (!question) return;

    const addPanel = this.container?.querySelector('#panel-add') as HTMLElement;
    if (!addPanel) return;

    // Switch to add panel with edit mode
    this.container?.querySelectorAll('.admin__panel').forEach((p) => p.classList.remove('admin__panel--active'));
    addPanel.classList.add('admin__panel--active');

    this.container?.querySelectorAll('.admin__nav-btn').forEach((btn) => {
      btn.classList.toggle('admin__nav-btn--active', (btn as HTMLElement).dataset.panel === 'add');
    });

    this.renderForm(addPanel, question);
  }

  private handleDelete(id: string): void {
    const question = this.manager.getRepository().getById(id);
    if (!question) return;

    this.showConfirmDialog(
      `Are you sure you want to delete "${question.question.substring(0, 50)}…"?`,
      async () => {
        await this.manager.deleteQuestion(id);
        this.applyListFilters();
      },
    );
  }

  /**
   * Shows a blocking confirmation dialog. Used for every destructive or
   * bulk action (delete, import, restore) so nothing irreversible happens
   * without an explicit confirmation.
   */
  private showConfirmDialog(
    message: string,
    onConfirm: () => Promise<void> | void,
    options: { confirmLabel?: string; danger?: boolean; messageHtml?: string } = {},
  ): void {
    const confirmLabel = options.confirmLabel ?? 'Delete';
    const confirmClass = options.danger === false
      ? 'admin-form__btn--primary'
      : 'admin-form__btn--danger';
    const body = options.messageHtml ?? this.esc(message);

    const overlay = document.createElement('div');
    overlay.className = 'admin-confirm';
    overlay.innerHTML = `
      <div class="admin-confirm__card">
        <div class="admin-confirm__msg">${body}</div>
        <div class="admin-confirm__actions">
          <button class="admin-form__btn ${confirmClass}" id="confirm-yes">${this.esc(confirmLabel)}</button>
          <button class="admin-form__btn admin-form__btn--secondary" id="confirm-no">Cancel</button>
        </div>
      </div>
    `;

    overlay.querySelector('#confirm-yes')!.addEventListener('click', () => {
      overlay.remove();
      void onConfirm();
    });
    overlay.querySelector('#confirm-no')!.addEventListener('click', () => {
      overlay.remove();
    });

    document.body.appendChild(overlay);
  }

  // ─── Import / Export ────────────────────────────────────────────────────────

  private renderImportExport(panelEl: HTMLElement): void {
    const repoCount = this.manager.getRepository().count();
    panelEl.innerHTML = `
      <div class="admin-io__section">
        <h3 class="admin-io__title">📥 Import Questions</h3>
        <p class="admin-io__desc">Upload a versioned question bank export (format v${QUESTION_BANK_FORMAT_VERSION}) or a legacy question array. The format version is checked first, every record is validated in a dry run, and a backup of the current bank is taken before anything is committed.</p>
        <div class="admin-io__file-input">
          <input type="file" accept=".json" id="import-file-input" />
        </div>
        <div class="admin-form__actions">
          <button class="admin-form__btn admin-form__btn--secondary" id="validate-import-btn">🔎 Validate (dry run)</button>
          <button class="admin-form__btn admin-form__btn--primary" id="import-btn">Import</button>
        </div>
        <div id="import-result"></div>
      </div>
      <div class="admin-io__section">
        <h3 class="admin-io__title">📤 Export Questions</h3>
        <p class="admin-io__desc">Download a versioned question bank file (format v${QUESTION_BANK_FORMAT_VERSION}). Full exports preserve tombstone and bundled-override metadata; the file can be re-imported unchanged.</p>
        <p class="admin-io__desc" id="export-filter-note"></p>
        <div class="admin-form__actions">
          <button class="admin-form__btn admin-form__btn--primary" id="export-btn">Export All (${repoCount})</button>
          <button class="admin-form__btn admin-form__btn--secondary" id="export-filtered-btn">Export Filtered Set</button>
        </div>
        <div id="export-result"></div>
      </div>
      <div class="admin-io__section">
        <h3 class="admin-io__title">🧾 Export Review Report</h3>
        <p class="admin-io__desc">Download a content-review report listing authoring gaps, similar-prompt candidates, and review-status counts. It changes no question.</p>
        <button class="admin-form__btn admin-form__btn--primary" id="review-report-btn">Export Review Report (JSON)</button>
        <div id="review-report-result"></div>
      </div>
      <div class="admin-io__section">
        <h3 class="admin-io__title">💾 Backup &amp; Restore</h3>
        <p class="admin-io__desc">Snapshot the bank before bulk changes. The most recent snapshot can be restored (this replaces the current bank).</p>
        <div class="admin-form__actions">
          <button class="admin-form__btn admin-form__btn--secondary" id="backup-btn">Download Backup</button>
          <button class="admin-form__btn admin-form__btn--secondary" id="restore-backup-btn" disabled>Restore Last Backup</button>
        </div>
        <div id="backup-result"></div>
      </div>
    `;

    this.updateExportFilterNote();
    this.updateRestoreButton();
    this.bindImportExportEvents(panelEl);
  }

  private bindImportExportEvents(panelEl: HTMLElement): void {
    (panelEl.querySelector('#validate-import-btn') as HTMLButtonElement)?.addEventListener(
      'click',
      () => this.handleValidateImport(),
    );
    (panelEl.querySelector('#import-btn') as HTMLButtonElement)?.addEventListener(
      'click',
      () => void this.handleImport(),
    );
    (panelEl.querySelector('#export-btn') as HTMLButtonElement)?.addEventListener(
      'click',
      () => void this.handleExport(false),
    );
    (panelEl.querySelector('#export-filtered-btn') as HTMLButtonElement)?.addEventListener(
      'click',
      () => void this.handleExport(true),
    );
    (panelEl.querySelector('#review-report-btn') as HTMLButtonElement)?.addEventListener(
      'click',
      () => this.handleReviewReportExport(),
    );
    (panelEl.querySelector('#backup-btn') as HTMLButtonElement)?.addEventListener(
      'click',
      () => this.handleBackup(),
    );
    (panelEl.querySelector('#restore-backup-btn') as HTMLButtonElement)?.addEventListener(
      'click',
      () => this.handleRestoreBackup(),
    );
  }

  /** Reads the selected import file, or reports why it cannot be read. */
  private async readImportFile(): Promise<{ text?: string; error?: string }> {
    const fileInput = this.container?.querySelector('#import-file-input') as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    if (!file) return { error: 'Please select a JSON file.' };
    try {
      return { text: await file.text() };
    } catch (err) {
      return { error: (err as Error).message };
    }
  }

  /** Renders a dry-run import report (never mutates anything). */
  private renderImportReport(preview: QuestionBankImportPreview): string {
    if (!preview.ok) {
      return `<div class="admin-io__result admin-io__result--error">❌ ${this.esc(preview.message ?? 'Import payload could not be read.')}</div>`;
    }

    const formatLabel =
      preview.formatVersion === 0
        ? 'legacy file, no version envelope'
        : `format v${preview.formatVersion}`;

    const blocking = preview.records.filter((r) => r.errors.length > 0);
    const warned = preview.records.filter((r) => r.warnings.length > 0);

    const blockingLines = blocking.slice(0, 10).map((r) =>
      `• [${this.esc(r.questionId ?? `#${r.index}`)}] ${this.esc(r.errors.join(' '))}`).join('<br/>');
    const warnedLines = warned.slice(0, 10).map((r) =>
      `• [${this.esc(r.questionId ?? `#${r.index}`)}] ${this.esc(r.warnings.join(' '))}`).join('<br/>');

    const metadata: string[] = [];
    if (preview.overrideCount > 0) {
      metadata.push(`${preview.overrideCount} bundled override(s)`);
    }
    if (preview.tombstoneCount > 0) {
      metadata.push(`${preview.tombstoneCount} tombstone(s) will be preserved`);
    }

    const cls = preview.canImport ? 'success' : 'error';
    const headline = preview.canImport
      ? `✅ ${preview.validCount} of ${preview.totalRecords} record(s) are importable (${formatLabel}).`
      : `❌ ${preview.totalRecords} record(s) checked — ${preview.invalidCount} invalid, ${preview.duplicateIdCount} duplicate ID (${formatLabel}).`;

    return `
      <div class="admin-io__result admin-io__result--${cls}">
        ${headline}
        ${metadata.length > 0 ? `<div class="admin-io__detail">${metadata.map((m) => this.esc(m)).join(' · ')}</div>` : ''}
        ${blockingLines ? `<div class="admin-io__detail">${blockingLines}</div>` : ''}
        ${warnedLines ? `<div class="admin-io__warnings">⚠ ${preview.duplicatePromptWarnings} prompt warning(s) — candidates only:<br/>${warnedLines}</div>` : ''}
      </div>
    `;
  }

  private handleValidateImport(): void {
    const resultEl = this.container?.querySelector('#import-result');
    if (!resultEl) return;
    void this.readImportFile().then(({ text, error }) => {
      if (error !== undefined || text === undefined) {
        resultEl.innerHTML = `<div class="admin-io__result admin-io__result--error">${this.esc(error ?? 'Could not read file.')}</div>`;
        return;
      }
      resultEl.innerHTML = this.renderImportReport(this.manager.previewBankImport(text));
    });
  }

  private async handleImport(): Promise<void> {
    const resultEl = this.container?.querySelector('#import-result');
    if (!resultEl) return;

    const { text, error } = await this.readImportFile();
    if (error !== undefined || text === undefined) {
      resultEl.innerHTML = `<div class="admin-io__result admin-io__result--error">${this.esc(error ?? 'Could not read file.')}</div>`;
      return;
    }

    const preview = this.manager.previewBankImport(text);

    // Destructive-action protection: never commit a batch the dry run rejected,
    // and never commit without an explicit confirmation.
    if (!preview.canImport) {
      resultEl.innerHTML = this.renderImportReport(preview);
      return;
    }

    const current = this.manager.getRepository().count();
    const extras: string[] = [];
    if (preview.overrideCount > 0) {
      extras.push(`${preview.overrideCount} record(s) will replace bundled question(s).`);
    }
    if (preview.tombstoneCount > 0) {
      extras.push(`${preview.tombstoneCount} tombstone(s) will be preserved.`);
    }

    const summary =
      `Import ${preview.validCount} question(s)? A backup of the current ${current} question(s) will be taken first.` +
      (extras.length > 0 ? ` ${extras.join(' ')}` : '') +
      (preview.duplicatePromptWarnings > 0
        ? ` ${preview.duplicatePromptWarnings} prompt warning(s) were flagged as candidates for review.`
        : '');

    this.showConfirmDialog(
      summary,
      async () => {
        this.lastBackup = this.manager.createBackup();
        const result = await this.manager.importBankFromJson(text);
        if (result.success) {
          const details: string[] = [];
          if (result.overrideCount > 0) details.push(`${result.overrideCount} bundled override(s)`);
          if (result.tombstoneCount > 0) details.push(`${result.tombstoneCount} tombstone(s) applied`);
          resultEl.innerHTML = `<div class="admin-io__result admin-io__result--success">✅ Imported ${result.importedCount} questions successfully${details.length > 0 ? ` (${details.join(', ')})` : ''}.</div>`;
        } else {
          resultEl.innerHTML = `<div class="admin-io__result admin-io__result--error">❌ Import failed: ${this.esc(result.errors.map((e) => e.message).join(' '))}</div>`;
        }
        this.updateRestoreButton();
      },
      { confirmLabel: 'Import', danger: false },
    );
  }

  private handleBackup(): void {
    const resultEl = this.container?.querySelector('#backup-result');
    const backup = this.manager.createBackup();
    this.lastBackup = backup;
    this.downloadJson(backup.json, `knowledge-realms-backup-${new Date().toISOString().slice(0, 10)}.json`);
    if (resultEl) {
      resultEl.innerHTML = `<div class="admin-io__result admin-io__result--success">✅ Backup created (${backup.questionCount} questions).</div>`;
    }
    this.updateRestoreButton();
  }

  private handleRestoreBackup(): void {
    const resultEl = this.container?.querySelector('#backup-result');
    const backup = this.lastBackup;
    if (!backup) return;

    this.showConfirmDialog(
      `Restore the backup taken ${backup.createdAt}? This replaces the current ${this.manager.getRepository().count()} question(s) with ${backup.questionCount}.`,
      async () => {
        // A restore is a bulk replacement: snapshot the current bank first so it
        // can be reverted with the same button.
        const previous = this.manager.createBackup();
        const result = await this.manager.restoreBackup(backup.json);
        if (result.success) {
          this.lastBackup = previous;
          this.updateRestoreButton();
        }
        if (resultEl) {
          resultEl.innerHTML = result.success
            ? `<div class="admin-io__result admin-io__result--success">✅ Restored ${result.restoredCount} questions. The previous ${previous.questionCount} question(s) were backed up first; use Restore to revert.</div>`
            : `<div class="admin-io__result admin-io__result--error">❌ Restore failed: ${this.esc(result.errors.map((e) => e.message).join(' '))}</div>`;
        }
      },
      { confirmLabel: 'Restore', danger: true },
    );
  }

  private updateRestoreButton(): void {
    const btn = this.container?.querySelector('#restore-backup-btn') as HTMLButtonElement | null;
    if (btn) btn.disabled = !this.lastBackup;
  }

  private async handleExport(filtered: boolean): Promise<void> {
    const resultEl = this.container?.querySelector('#export-result');
    try {
      const criteria =
        filtered && Object.keys(this.lastListCriteria).length > 0
          ? this.lastListCriteria
          : undefined;
      const json = await this.manager.exportBankToJson(criteria, { appVersion: GAME_VERSION });
      const count = criteria
        ? this.manager.getRepository().filter(criteria).length
        : this.manager.getRepository().count();
      this.downloadJson(
        json,
        `knowledge-realms-question-bank-${filtered ? 'filtered-' : ''}${new Date().toISOString().slice(0, 10)}.json`,
      );
      if (resultEl) {
        resultEl.innerHTML = `<div class="admin-io__result admin-io__result--success">✅ Exported ${count} question(s) as format v${QUESTION_BANK_FORMAT_VERSION}${criteria ? ' (filtered set; tombstones omitted)' : ''}.</div>`;
      }
    } catch (err) {
      if (resultEl) {
        resultEl.innerHTML = `<div class="admin-io__result admin-io__result--error">Error: ${this.esc((err as Error).message)}</div>`;
      }
    }
  }

  private handleReviewReportExport(): void {
    const resultEl = this.container?.querySelector('#review-report-result');
    try {
      const report = buildReviewReport(this.manager.getRepository().getAll());
      this.downloadJson(
        renderReviewReportJson(report),
        `knowledge-realms-review-report-${new Date().toISOString().slice(0, 10)}.json`,
      );
      if (resultEl) {
        resultEl.innerHTML = `<div class="admin-io__result admin-io__result--success">✅ Review report exported (${report.gapCount} gap(s), ${report.similarPromptPairs.length} candidate pair(s)).</div>`;
      }
    } catch (err) {
      if (resultEl) {
        resultEl.innerHTML = `<div class="admin-io__result admin-io__result--error">Error: ${this.esc((err as Error).message)}</div>`;
      }
    }
  }

  /** Describes the currently-applied list filters, for the export note. */
  private describeCriteria(criteria: QuestionFilterCriteria): string {
    const parts: string[] = [];
    if (criteria.subject) parts.push(`subject=${criteria.subject}`);
    if (criteria.topics && criteria.topics.length > 0) parts.push(`topic=${criteria.topics.join('|')}`);
    if (criteria.educationalTier) parts.push(`tier=${criteria.educationalTier}`);
    if (criteria.difficulty !== undefined) parts.push(`difficulty=${criteria.difficulty}`);
    if (criteria.type) parts.push(`type=${criteria.type}`);
    if (criteria.status) parts.push(`status=${criteria.status}`);
    if (criteria.reviewStatus) parts.push(`review=${criteria.reviewStatus}`);
    return parts.join(', ');
  }

  private updateExportFilterNote(): void {
    const note = this.container?.querySelector('#export-filter-note');
    if (!note) return;
    const description = this.describeCriteria(this.lastListCriteria);
    note.textContent = description
      ? `Filtered export uses the current list filters: ${description}. Tombstones are only included in full exports.`
      : 'Filtered export uses the current list filters. None are applied, so it falls back to all questions. Tombstones are only included in full exports.';
  }

  /** Triggers a client-side JSON file download. */
  private downloadJson(json: string, filename: string): void {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Utilities ──────────────────────────────────────────────────────────────

  /** Escape HTML for safe interpolation. */
  private esc(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
