import type { Question, QuestionChoice } from '../../core/types/question';
import { QuestionType, QuestionStatus } from '../../core/types/question';
import { EducationalTier, SubjectId } from '../../core/types/education';
import type { QuestionManager } from '../../questions/management/QuestionManager';
import type { QuestionFilterCriteria } from '../../questions/retrieval/QuestionRepository';

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

    this.bindNavigation();
    this.switchPanel('list');
  }

  destroy(): void {
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
            <label class="admin-form__label">Tags (comma-separated)</label>
            <input class="admin-form__input" name="tags" value="${this.esc((q?.tags ?? []).join(', '))}" placeholder="e.g. grade-3, algebra" />
          </div>
          <div class="admin-form__actions">
            <button type="submit" class="admin-form__btn admin-form__btn--primary">
              ${isEdit ? 'Save Changes' : 'Create Question'}
            </button>
            <button type="button" class="admin-form__btn admin-form__btn--secondary" id="form-cancel-btn">Cancel</button>
          </div>
        </form>
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

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.handleFormSubmit(form, isEdit);
    });
  }

  private async handleFormSubmit(form: HTMLFormElement, isEdit: boolean): Promise<void> {
    const formData = new FormData(form);
    const messagesEl = this.container?.querySelector('#form-messages');
    if (messagesEl) messagesEl.innerHTML = '';

    const type = formData.get('type') as QuestionType;

    const questionData: Partial<Question> = {
      educationalTier: formData.get('educationalTier') as EducationalTier,
      subject: formData.get('subject') as SubjectId,
      topic: (formData.get('topic') as string)?.trim(),
      difficulty: parseInt(formData.get('difficulty') as string, 10),
      type,
      question: (formData.get('question') as string)?.trim(),
      timeLimit: parseInt(formData.get('timeLimit') as string, 10),
      baseMasteryExp: parseInt(formData.get('baseMasteryExp') as string, 10),
      status: formData.get('status') as QuestionStatus,
      explanation: (formData.get('explanation') as string)?.trim() || undefined,
    };

    // Tags
    const tagsRaw = (formData.get('tags') as string)?.trim();
    if (tagsRaw) {
      questionData.tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean);
    }

    // Type-specific fields
    if (type === QuestionType.MultipleChoice) {
      const choiceInputs = this.container?.querySelectorAll<HTMLInputElement>('[data-choice-id]') ?? [];
      const choices: QuestionChoice[] = [];
      choiceInputs.forEach((input) => {
        const choiceId = input.dataset.choiceId!;
        const text = input.value.trim();
        if (text) {
          choices.push({ choiceId, text });
        }
      });
      questionData.choices = choices;
      const checkedRadio = this.container?.querySelector<HTMLInputElement>('input[name="correctChoice"]:checked');
      questionData.correctAnswer = checkedRadio?.value;
    } else if (type === QuestionType.Identification) {
      questionData.correctAnswer = (formData.get('correctAnswer') as string)?.trim();
      const acceptedRaw = (formData.get('acceptedAnswers') as string)?.trim();
      if (acceptedRaw) {
        questionData.acceptedAnswers = acceptedRaw.split(',').map((a) => a.trim()).filter(Boolean);
      }
    } else if (type === QuestionType.Essay) {
      questionData.expectedAnswer = (formData.get('expectedAnswer') as string)?.trim();
    }

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
        this.showSuccessMessage('Question created successfully.');
      }

      setTimeout(() => this.switchPanel('list'), 800);
    } catch (err) {
      this.showValidationErrors([(err as Error).message]);
    }
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
          ${Object.values(SubjectId).map((s) => `<option value="${s}">${s}</option>`).join('')}
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
      </div>
      <div class="admin-list__count" id="list-count">${allQuestions.length} questions</div>
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
      else if (filterName === 'educationalTier') criteria.educationalTier = value as EducationalTier;
      else if (filterName === 'difficulty') criteria.difficulty = parseInt(value, 10);
      else if (filterName === 'type') criteria.type = value as QuestionType;
      else if (filterName === 'status') criteria.status = value as QuestionStatus;
    });

    const filtered = this.manager.getRepository().filter(criteria);
    this.renderTableRows(filtered);
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

  private showConfirmDialog(message: string, onConfirm: () => Promise<void>): void {
    const overlay = document.createElement('div');
    overlay.className = 'admin-confirm';
    overlay.innerHTML = `
      <div class="admin-confirm__card">
        <div class="admin-confirm__msg">${this.esc(message)}</div>
        <div class="admin-confirm__actions">
          <button class="admin-form__btn admin-form__btn--danger" id="confirm-yes">Delete</button>
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
    panelEl.innerHTML = `
      <div class="admin-io__section">
        <h3 class="admin-io__title">📥 Import Questions</h3>
        <p class="admin-io__desc">Upload a JSON file containing an array of question objects. All questions are validated before importing.</p>
        <div class="admin-io__file-input">
          <input type="file" accept=".json" id="import-file-input" />
        </div>
        <button class="admin-form__btn admin-form__btn--primary" id="import-btn">Import</button>
        <div id="import-result"></div>
      </div>
      <div class="admin-io__section">
        <h3 class="admin-io__title">📤 Export Questions</h3>
        <p class="admin-io__desc">Download all questions as a JSON file. The exported file can be re-imported.</p>
        <button class="admin-form__btn admin-form__btn--primary" id="export-btn">Export as JSON</button>
        <div id="export-result"></div>
      </div>
    `;

    this.bindImportExportEvents(panelEl);
  }

  private bindImportExportEvents(panelEl: HTMLElement): void {
    const importBtn = panelEl.querySelector('#import-btn') as HTMLButtonElement;
    const exportBtn = panelEl.querySelector('#export-btn') as HTMLButtonElement;

    importBtn?.addEventListener('click', () => void this.handleImport());
    exportBtn?.addEventListener('click', () => this.handleExport());
  }

  private async handleImport(): Promise<void> {
    const fileInput = this.container?.querySelector('#import-file-input') as HTMLInputElement;
    const resultEl = this.container?.querySelector('#import-result');
    if (!resultEl) return;

    const file = fileInput?.files?.[0];
    if (!file) {
      resultEl.innerHTML = '<div class="admin-io__result admin-io__result--error">Please select a JSON file.</div>';
      return;
    }

    try {
      const text = await file.text();
      const result = await this.manager.importFromJson(text);

      if (result.success) {
        resultEl.innerHTML = `
          <div class="admin-io__result admin-io__result--success">
            ✅ Imported ${result.importedCount} questions successfully.
            ${result.skippedCount > 0 ? `(${result.skippedCount} skipped)` : ''}
          </div>
        `;
      } else {
        const errorLines = result.errors.map((e) =>
          `• ${e.questionId ? `[${e.questionId}] ` : ''}${e.message}`
        ).join('<br/>');
        resultEl.innerHTML = `
          <div class="admin-io__result admin-io__result--error">
            ❌ Import failed. ${result.errors.length} error(s):<br/>${errorLines}
          </div>
        `;
      }
    } catch (err) {
      resultEl.innerHTML = `<div class="admin-io__result admin-io__result--error">Error: ${(err as Error).message}</div>`;
    }
  }

  private handleExport(): void {
    const resultEl = this.container?.querySelector('#export-result');
    try {
      const json = this.manager.exportToJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `knowledge-realms-questions-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      if (resultEl) {
        resultEl.innerHTML = '<div class="admin-io__result admin-io__result--success">✅ Export started.</div>';
      }
    } catch (err) {
      if (resultEl) {
        resultEl.innerHTML = `<div class="admin-io__result admin-io__result--error">Error: ${(err as Error).message}</div>`;
      }
    }
  }

  // ─── Utilities ──────────────────────────────────────────────────────────────

  /** Escape HTML for safe interpolation. */
  private esc(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
