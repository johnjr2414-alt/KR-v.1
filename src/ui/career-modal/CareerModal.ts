import { playerSessionManager } from '../../player';
import type {
  AssignmentObjectiveView,
  AssignmentView,
  CareerProfileView,
  ProfessionCatalogueEntry,
  ProfessionCatalogueView,
  WorkplaceView,
} from '../../professions';
import { AssignmentObjectiveType, AssignmentQuestionResolver } from '../../professions';
import { sharedQuestionRepository } from '../../questions';
import type { Question } from '../../core/types/question';
import { AnswerOutcome } from '../../core/types/combat';
import { QuestionModal } from '../question-modal';
import type { AnswerEvaluationResult } from '../../questions/evaluation/AnswerEvaluator';
import './career-modal.css';

export type CareerModalTab = 'careers' | 'profile' | 'workplace';

export interface CareerModalOptions {
  /** Opens directly on a specific workplace's interface. */
  workplaceId?: string;
  /** Initial tab. Defaults to `workplace` when `workplaceId` is set, else `careers`. */
  initialTab?: CareerModalTab;
  /** Invoked when the modal closes. */
  onClose?: () => void;
  /** Invoked after any state-changing career action so the host can persist. */
  onSessionChanged?: () => void;
}

/**
 * Career interface modal (Phase 27.6).
 *
 * A single overlay hosting the four career interfaces required by the phase:
 * - **Career Selection** — browse professions, requirements, and enroll.
 * - **Career Profile** — enrolled professions, level/EXP, rank, reputation,
 *   active assignments, and assignment history.
 * - **Workplace** — workplace info, facilities, access, staff, and the
 *   professional assignments offerable there (plus activities).
 * - **Assignment** — objectives, requirements, progress, and rewards, with
 *   accept/complete/abandon actions and an optional question-runner hook.
 *
 * All game rules live in the headless view models exposed by
 * {@link import('../../player/PlayerSessionManager').PlayerSessionManager}; this
 * class only renders them and forwards actions to the authoritative services.
 */
export class CareerModal {
  private container: HTMLDivElement | null = null;
  private readonly options: CareerModalOptions;
  private activeTab: CareerModalTab;
  private feedbackMessage = '';
  private feedbackIsError = false;
  private selectedAssignmentId: string | null = null;
  private activeQuestionModal: QuestionModal | null = null;
  private questionQueue: Question[] = [];
  private pendingObjectiveId: string | null = null;

  constructor(options: CareerModalOptions = {}) {
    this.options = options;
    this.activeTab = options.initialTab ?? (options.workplaceId ? 'workplace' : 'careers');
  }

  show(): void {
    this.destroy();

    const container = document.createElement('div');
    container.className = 'career-modal';
    container.id = 'career-modal';

    document.body.appendChild(container);
    this.container = container;

    this.render();
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

  render(): void {
    if (!this.container) return;

    const hasWorkplace = !!this.options.workplaceId;

    this.container.innerHTML = `
      <div class="career-card">
        <div class="career-card__header">
          <div class="career-card__title-area">
            <span class="career-card__title">🎓 Career Center</span>
            <span class="career-card__subtitle">Real-world professions, independent of combat level</span>
          </div>
          <button class="career-card__close" id="career-close" type="button" aria-label="Close">×</button>
        </div>

        <div class="career-card__tabs">
          <button class="career-card__tab ${this.activeTab === 'careers' ? 'career-card__tab--active' : ''}" id="career-tab-careers" type="button">Explore Professions</button>
          <button class="career-card__tab ${this.activeTab === 'profile' ? 'career-card__tab--active' : ''}" id="career-tab-profile" type="button">My Career</button>
          ${
            hasWorkplace
              ? `<button class="career-card__tab ${this.activeTab === 'workplace' ? 'career-card__tab--active' : ''}" id="career-tab-workplace" type="button">Workplace</button>`
              : ''
          }
        </div>

        <div class="career-card__content" id="career-content">
          ${this.renderContent()}
        </div>

        <div class="career-card__footer">
          <div class="career-card__feedback ${this.feedbackIsError ? 'career-card__feedback--error' : 'career-card__feedback--success'}">
            ${this.escape(this.feedbackMessage)}
          </div>
          <button class="career-card__done" id="career-done" type="button">Done</button>
        </div>
      </div>
    `;

    this.attachListeners(hasWorkplace);
  }

  // ─── Content routing ────────────────────────────────────────────────────────

  private renderContent(): string {
    if (this.selectedAssignmentId) {
      return this.renderAssignmentDetail(this.selectedAssignmentId);
    }
    if (this.activeTab === 'careers') return this.renderCareers();
    if (this.activeTab === 'profile') return this.renderProfile();
    return this.renderWorkplace();
  }

  // ─── Career Selection ───────────────────────────────────────────────────────

  private renderCareers(): string {
    const view: ProfessionCatalogueView = playerSessionManager.getCareerCatalogueView();

    if (view.professionCount === 0) {
      return `<div class="career-empty">No professions are available yet.</div>`;
    }

    const categoriesHtml = view.categories
      .map((category) => {
        const cards = category.professions.map((p) => this.renderProfessionCard(p)).join('');
        return `
          <section class="career-category">
            <div class="career-category__header">
              <span class="career-category__name">${this.escape(category.name)}</span>
              <span class="career-category__desc">${this.escape(category.description)}</span>
            </div>
            <div class="career-cards">${cards}</div>
          </section>
        `;
      })
      .join('');

    return `
      <div class="career-summary">
        <span>${view.enrolledCount} of ${view.professionCount} professions enrolled</span>
      </div>
      ${categoriesHtml}
    `;
  }

  private renderProfessionCard(p: ProfessionCatalogueEntry): string {
    const requirementsHtml = p.requirements.length
      ? `<ul class="career-reqs">${p.requirements
          .map(
            (r) =>
              `<li class="career-reqs__item ${r.satisfied ? 'career-reqs__item--ok' : 'career-reqs__item--fail'}">${r.satisfied ? '✓' : '✗'} ${this.escape(r.label)}</li>`,
          )
          .join('')}</ul>`
      : '';

    const workplaces = p.workplaceNames.length
      ? `<div class="career-card__row"><span class="career-card__label">Workplaces:</span> ${p.workplaceNames.map((n) => this.escape(n)).join(', ')}</div>`
      : '';
    const ranks = p.rankNames.length
      ? `<div class="career-card__row"><span class="career-card__label">Ranks:</span> ${p.rankNames.map((n) => this.escape(n)).join(' → ')}</div>`
      : '';
    const responsibilities = p.responsibilities.length
      ? `<ul class="career-card__resp">${p.responsibilities.map((r) => `<li>${this.escape(r)}</li>`).join('')}</ul>`
      : '';

    let actionHtml = '';
    if (p.enrolled) {
      actionHtml = `<span class="career-badge career-badge--enrolled">Enrolled</span>`;
    } else {
      actionHtml = `<button class="career-btn career-btn--primary" data-enroll="${this.escape(p.id)}" ${p.canEnroll ? '' : 'disabled'} type="button">Enroll</button>`;
    }

    return `
      <article class="career-card__item">
        <div class="career-card__item-head">
          <span class="career-card__item-name">${this.escape(p.name)}${p.provisional ? ' <span class="career-badge career-badge--provisional">provisional</span>' : ''}</span>
          ${actionHtml}
        </div>
        <p class="career-card__item-desc">${this.escape(p.description)}</p>
        ${responsibilities}
        ${workplaces}
        ${ranks}
        ${requirementsHtml}
        <div class="career-card__item-msg ${p.canEnroll || p.enrolled ? '' : 'career-card__item-msg--fail'}">${this.escape(p.enrollmentMessage)}</div>
      </article>
    `;
  }

  // ─── Career Profile ─────────────────────────────────────────────────────────

  private renderProfile(): string {
    const view: CareerProfileView = playerSessionManager.getCareerProfileView();

    if (view.professions.length === 0) {
      return `<div class="career-empty">You are not enrolled in any profession yet. Visit the Explore Professions tab to begin.</div>`;
    }

    const entries = view.professions
      .map((p) => {
        const activeHtml = p.activeAssignments.length
          ? `<div class="career-profile__section">
              <span class="career-profile__section-title">Active Assignments</span>
              ${p.activeAssignments
                .map(
                  (a) => `
                <div class="career-assignment-line">
                  <button class="career-link" data-view-assignment="${this.escape(a.assignmentId)}" type="button">${this.escape(a.title)}</button>
                  <span class="career-assignment-line__meta">Stage ${a.stageNumber}/${a.stageCount} · ${this.escape(a.stageName)}</span>
                </div>`,
                )
                .join('')}
            </div>`
          : '';

        const historyHtml = p.history.length
          ? `<div class="career-profile__section">
              <span class="career-profile__section-title">Completed Assignments</span>
              <ul class="career-history">${p.history
                .map((h) => `<li>${this.escape(h.title)}</li>`)
                .join('')}</ul>
            </div>`
          : '';

        const expBar = p.isMaxLevel
          ? `<span class="career-badge career-badge--max">Max Level</span>`
          : `<div class="career-exp">
              <div class="career-exp__bar"><div class="career-exp__fill" style="width: ${Math.round(p.progressRatio * 100)}%"></div></div>
              <span class="career-exp__text">${p.currentExp} / ${p.requiredExp} EXP</span>
            </div>`;

        return `
          <article class="career-profile__entry">
            <div class="career-profile__entry-head">
              <span class="career-profile__name">${this.escape(p.name)}</span>
              <span class="career-profile__level">Lv. ${p.level} / ${p.maxLevel}</span>
            </div>
            <div class="career-profile__stats">
              <span>Rank: <strong>${this.escape(p.rankName || p.rankId)}</strong></span>
              <span>Reputation: <strong>${p.reputation}</strong></span>
              <span>Status: <strong>${this.escape(p.status)}</strong></span>
            </div>
            ${expBar}
            ${activeHtml}
            ${historyHtml}
          </article>
        `;
      })
      .join('');

    return `
      <div class="career-summary">
        <span>Total completed assignments: <strong>${view.totalCompletedAssignments}</strong></span>
        <span>Total reputation: <strong>${view.totalReputation}</strong></span>
      </div>
      ${entries}
    `;
  }

  // ─── Workplace ──────────────────────────────────────────────────────────────

  private renderWorkplace(): string {
    const workplaceId = this.options.workplaceId;
    if (!workplaceId) {
      return `<div class="career-empty">No workplace selected.</div>`;
    }

    const view: WorkplaceView | undefined = playerSessionManager.getWorkplaceView(workplaceId);
    if (!view) {
      return `<div class="career-empty">Unknown workplace '${this.escape(workplaceId)}'.</div>`;
    }

    const facilitiesHtml = view.facilities.length
      ? `<div class="career-wp__facilities">${view.facilities
          .map(
            (f) => `
          <div class="career-wp__facility ${f.accessible ? '' : 'career-wp__facility--locked'}">
            <div class="career-wp__facility-head">
              <span>${this.escape(f.name)}</span>
              <span class="career-badge ${f.accessible ? 'career-badge--open' : 'career-badge--locked'}">${f.accessible ? 'Open' : 'Locked'}</span>
            </div>
            <div class="career-wp__facility-desc">${this.escape(f.description)}</div>
          </div>`,
          )
          .join('')}</div>`
      : '';

    const staffHtml = view.npcIds.length
      ? `<div class="career-card__row"><span class="career-card__label">Staff / Contacts:</span> ${view.npcIds.map((id) => this.escape(id)).join(', ')}</div>`
      : '';
    const activitiesHtml = view.activities.length
      ? `<div class="career-card__row"><span class="career-card__label">Profession Activities:</span> ${view.activities.map((a) => this.escape(a)).join(' · ')}</div>`
      : '';

    const offersHtml = view.availableAssignments.length
      ? `<div class="career-wp__offers">${view.availableAssignments
          .map(
            (offer) => `
          <div class="career-offer">
            <div class="career-offer__info">
              <span class="career-offer__title">${this.escape(offer.title)}</span>
              <span class="career-offer__meta">${this.escape(offer.taskType)} · Diff ${offer.difficulty}</span>
            </div>
            <button class="career-btn" data-view-assignment="${this.escape(offer.assignmentId)}" type="button">View</button>
          </div>`,
          )
          .join('')}</div>`
      : `<div class="career-empty">No professional assignments are offered here.</div>`;

    const entryReqs = view.entryRequirements.length
      ? `<ul class="career-reqs">${view.entryRequirements
          .map(
            (r) =>
              `<li class="career-reqs__item ${r.satisfied ? 'career-reqs__item--ok' : 'career-reqs__item--fail'}">${r.satisfied ? '✓' : '✗'} ${this.escape(r.label)}</li>`,
          )
          .join('')}</ul>`
      : '';

    return `
      <div class="career-wp">
        <div class="career-wp__head">
          <span class="career-wp__name">${this.escape(view.name)}</span>
          <span class="career-badge ${view.canEnter ? 'career-badge--open' : 'career-badge--locked'}">${view.canEnter ? 'Access Granted' : 'Restricted'}</span>
        </div>
        <p class="career-wp__desc">${this.escape(view.description)}</p>
        <div class="career-card__row"><span class="career-card__label">Professions:</span> ${view.professions.map((p) => this.escape(p.name)).join(', ') || '—'}</div>
        ${staffHtml}
        ${activitiesHtml}
        ${entryReqs}
        <div class="career-wp__msg ${view.canEnter ? '' : 'career-card__item-msg--fail'}">${this.escape(view.entryMessage)}</div>
        <div class="career-wp__section-title">Facilities</div>
        ${facilitiesHtml}
        <div class="career-wp__section-title">Available Assignments</div>
        ${offersHtml}
      </div>
    `;
  }

  // ─── Assignment ─────────────────────────────────────────────────────────────

  private renderAssignmentDetail(assignmentId: string): string {
    const view: AssignmentView | undefined = playerSessionManager.getAssignmentView(assignmentId);
    if (!view) {
      return `
        <div class="career-empty">Unknown assignment '${this.escape(assignmentId)}'.</div>
        <button class="career-btn" id="career-back" type="button">← Back</button>
      `;
    }

    const reqs = view.requirements.length
      ? `<ul class="career-reqs">${view.requirements
          .map(
            (r) =>
              `<li class="career-reqs__item ${r.satisfied ? 'career-reqs__item--ok' : 'career-reqs__item--fail'}">${r.satisfied ? '✓' : '✗'} ${this.escape(r.label)}</li>`,
          )
          .join('')}</ul>`
      : '';

    const stagesHtml = view.stages
      .map((stage) => {
        const objectives = stage.objectives
          .map((o) => this.renderObjective(view.id, o, stage.active))
          .join('');
        const stateClass = stage.complete
          ? 'career-stage--complete'
          : stage.active
            ? 'career-stage--active'
            : 'career-stage--pending';
        return `
          <div class="career-stage ${stateClass}">
            <div class="career-stage__head">
              <span class="career-stage__name">${this.escape(stage.name)}</span>
              <span class="career-stage__state">${stage.complete ? 'Complete' : stage.active ? 'In Progress' : 'Locked'}</span>
            </div>
            ${stage.description ? `<div class="career-stage__desc">${this.escape(stage.description)}</div>` : ''}
            ${objectives}
          </div>
        `;
      })
      .join('');

    const rewardParts: string[] = [];
    if (view.rewards.professionExp) rewardParts.push(`${view.rewards.professionExp} profession EXP`);
    if (view.rewards.characterExp) rewardParts.push(`${view.rewards.characterExp} combat EXP`);
    if (view.rewards.gold) rewardParts.push(`${view.rewards.gold} gold`);
    if (view.rewards.reputation) rewardParts.push(`${view.rewards.reputation} reputation`);
    for (const m of view.rewards.subjectMasteryExp) {
      rewardParts.push(`${m.amount} ${m.subject} mastery`);
    }
    const rewardsHtml = rewardParts.length
      ? rewardParts.map((r) => `<span class="career-reward">${this.escape(r)}</span>`).join('')
      : `<span class="career-reward career-reward--none">No rewards</span>`;

    const topicsHtml = view.questionTopics.length || view.subjects.length
      ? `<div class="career-card__row"><span class="career-card__label">Related questions:</span> ${[...view.questionTopics, ...view.subjects].map((t) => this.escape(t)).join(', ')}</div>`
      : '';

    const hasQuestionObjectives = view.stages.some((s) =>
      s.objectives.some((o) => o.type === AssignmentObjectiveType.AnswerQuestions),
    );

    const actions: string[] = [];
    actions.push(`<button class="career-btn" id="career-back" type="button">← Back</button>`);
    if (view.status === 'available') {
      actions.push(`<button class="career-btn career-btn--primary" data-accept="${this.escape(view.id)}" type="button">Accept</button>`);
    }
    if (view.active) {
      if (hasQuestionObjectives) {
        actions.push(`<button class="career-btn career-btn--primary" data-answer="${this.escape(view.id)}" type="button">Answer Questions</button>`);
      }
      const allStagesComplete = view.stages.every((s) => s.complete);
      if (allStagesComplete) {
        actions.push(`<button class="career-btn career-btn--primary" data-complete="${this.escape(view.id)}" type="button">Complete</button>`);
      }
      actions.push(`<button class="career-btn career-btn--danger" data-abandon="${this.escape(view.id)}" type="button">Abandon</button>`);
    }

    return `
      <div class="career-assignment">
        <div class="career-assignment__head">
          <span class="career-assignment__title">${this.escape(view.title)}</span>
          <span class="career-badge career-badge--status">${this.escape(view.status)}</span>
        </div>
        <div class="career-assignment__meta">${this.escape(view.professionName)} · ${this.escape(view.taskType)} · Diff ${view.difficulty}${view.repeatable ? ' · Repeatable' : ''}</div>
        <p class="career-assignment__desc">${this.escape(view.description)}</p>
        ${topicsHtml}
        <div class="career-wp__section-title">Requirements</div>
        ${reqs || '<div class="career-empty">No special requirements.</div>'}
        <div class="career-wp__section-title">Stages &amp; Objectives</div>
        ${stagesHtml}
        <div class="career-wp__section-title">Rewards</div>
        <div class="career-rewards">${rewardsHtml}</div>
        <div class="career-assignment__msg">${this.escape(view.message)}</div>
        <div class="career-assignment__actions">${actions.join('')}</div>
      </div>
    `;
  }

  private renderObjective(assignmentId: string, o: AssignmentObjectiveView, canProgress: boolean): string {
    const actionable =
      canProgress && !o.complete && o.type !== AssignmentObjectiveType.AnswerQuestions;
    const actionBtn = actionable
      ? `<button class="career-link" data-progress="${this.escape(assignmentId)}:${this.escape(o.id)}:${o.required}" type="button">Mark Done</button>`
      : '';
    return `
      <div class="career-objective ${o.complete ? 'career-objective--done' : ''}">
        <span class="career-objective__desc">${o.complete ? '✓' : '○'} ${this.escape(o.description)}</span>
        <span class="career-objective__progress">${o.progress} / ${o.required} ${actionBtn}</span>
      </div>
    `;
  }

  // ─── Listeners & actions ────────────────────────────────────────────────────

  private attachListeners(hasWorkplace: boolean): void {
    if (!this.container) return;

    this.container.querySelector('#career-close')?.addEventListener('click', () => {
      this.destroy();
      this.options.onClose?.();
    });
    this.container.querySelector('#career-done')?.addEventListener('click', () => {
      this.destroy();
      this.options.onClose?.();
    });

    this.container.querySelector('#career-tab-careers')?.addEventListener('click', () => this.switchTab('careers'));
    this.container.querySelector('#career-tab-profile')?.addEventListener('click', () => this.switchTab('profile'));
    if (hasWorkplace) {
      this.container.querySelector('#career-tab-workplace')?.addEventListener('click', () => this.switchTab('workplace'));
    }

    this.container.querySelector('#career-back')?.addEventListener('click', () => {
      this.selectedAssignmentId = null;
      this.feedbackMessage = '';
      this.render();
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-enroll]').forEach((btn) => {
      btn.addEventListener('click', () => this.handleEnroll(btn.dataset.enroll ?? ''));
    });
    this.container.querySelectorAll<HTMLButtonElement>('[data-view-assignment]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectedAssignmentId = btn.dataset.viewAssignment ?? null;
        this.feedbackMessage = '';
        this.render();
      });
    });
    this.container.querySelectorAll<HTMLButtonElement>('[data-accept]').forEach((btn) => {
      btn.addEventListener('click', () => this.handleAccept(btn.dataset.accept ?? ''));
    });
    this.container.querySelectorAll<HTMLButtonElement>('[data-answer]').forEach((btn) => {
      btn.addEventListener('click', () => this.handleAnswerQuestions(btn.dataset.answer ?? ''));
    });
    this.container.querySelectorAll<HTMLButtonElement>('[data-progress]').forEach((btn) => {
      btn.addEventListener('click', () => this.handleObjectiveProgress(btn.dataset.progress ?? ''));
    });
    this.container.querySelectorAll<HTMLButtonElement>('[data-complete]').forEach((btn) => {
      btn.addEventListener('click', () => this.handleComplete(btn.dataset.complete ?? ''));
    });
    this.container.querySelectorAll<HTMLButtonElement>('[data-abandon]').forEach((btn) => {
      btn.addEventListener('click', () => this.handleAbandon(btn.dataset.abandon ?? ''));
    });
  }

  private switchTab(tab: CareerModalTab): void {
    this.activeTab = tab;
    this.selectedAssignmentId = null;
    this.feedbackMessage = '';
    this.render();
  }

  private handleEnroll(professionId: string): void {
    if (!professionId) return;
    const result = playerSessionManager.careers.enroll(
      professionId,
      playerSessionManager.buildEnrollmentContext(),
    );
    this.feedbackMessage = result.message;
    this.feedbackIsError = !result.success;
    if (result.success) {
      void playerSessionManager.saveSession();
      this.options.onSessionChanged?.();
    }
    this.render();
  }

  private handleAccept(assignmentId: string): void {
    if (!assignmentId) return;
    const result = playerSessionManager.assignments.acceptAssignment(
      assignmentId,
      playerSessionManager.buildAssignmentContext(),
    );
    this.feedbackMessage = result.message;
    this.feedbackIsError = !result.success;
    if (result.success) {
      void playerSessionManager.saveSession();
      this.options.onSessionChanged?.();
    }
    this.render();
  }

  private handleComplete(assignmentId: string): void {
    if (!assignmentId) return;
    const result = playerSessionManager.assignments.completeAssignment(assignmentId);
    this.feedbackMessage = result.message;
    this.feedbackIsError = !result.success;
    if (result.success) {
      // Reward distribution (idempotent) persists the session via the session manager.
      void playerSessionManager.saveSession();
      this.options.onSessionChanged?.();
    }
    this.render();
  }

  private handleAbandon(assignmentId: string): void {
    if (!assignmentId) return;
    const result = playerSessionManager.assignments.failAssignment(assignmentId);
    this.feedbackMessage = result.message;
    this.feedbackIsError = !result.success;
    if (result.success) {
      void playerSessionManager.saveSession();
      this.options.onSessionChanged?.();
    }
    this.render();
  }

  /**
   * Satisfies a non-question objective of the active stage in one action
   * (e.g. recording a reported outcome or completing a project step). Payload is
   * `assignmentId:objectiveId:required`.
   */
  private handleObjectiveProgress(payload: string): void {
    const [assignmentId, objectiveId, requiredRaw] = payload.split(':');
    if (!assignmentId || !objectiveId) return;
    const required = Number.parseInt(requiredRaw ?? '1', 10);
    const amount = Number.isFinite(required) && required > 0 ? required : 1;
    const result = playerSessionManager.assignments.recordObjectiveProgress(
      assignmentId,
      objectiveId,
      amount,
    );
    this.feedbackMessage = result.message;
    this.feedbackIsError = !result.success;
    if (result.success) {
      void playerSessionManager.saveSession();
      this.options.onSessionChanged?.();
    }
    this.render();
  }

  /**
   * Runs the assignment's current-stage question-backed objectives through the
   * existing {@link QuestionModal}, reusing the shared question repository and
   * the {@link AssignmentQuestionResolver}. Each correct answer advances the
   * stage's `AnswerQuestions` objective.
   */
  private handleAnswerQuestions(assignmentId: string): void {
    const definition = playerSessionManager.assignments.getAssignment(assignmentId);
    const active = playerSessionManager.assignments.getActiveAssignment(assignmentId);
    if (!definition || !active) return;

    const stage = definition.stages[active.stageIndex];
    const objective = stage?.objectives.find(
      (o) => o.type === AssignmentObjectiveType.AnswerQuestions,
    );
    if (!objective) {
      this.feedbackMessage = 'No question-backed objectives in the current stage.';
      this.feedbackIsError = true;
      this.render();
      return;
    }

    const playerLevel = playerSessionManager.getPlayer().level;
    const resolver = new AssignmentQuestionResolver(sharedQuestionRepository);
    const result = resolver.resolve({
      assignmentId,
      count: objective.required,
      playerLevel,
    });

    if (result.questions.length === 0) {
      this.feedbackMessage = result.message;
      this.feedbackIsError = true;
      this.render();
      return;
    }

    this.pendingObjectiveId = objective.id;
    this.questionQueue = [...result.questions];
    this.presentNextQuestion();
  }

  private presentNextQuestion(): void {
    const assignmentId = this.selectedAssignmentId;
    const question = this.questionQueue.shift();

    if (!question || !assignmentId || !this.pendingObjectiveId) {
      this.pendingObjectiveId = null;
      this.questionQueue = [];
      this.render();
      return;
    }

    this.activeQuestionModal = new QuestionModal({
      question,
      autoCloseDelayMs: 1200,
      onAnswer: (result: AnswerEvaluationResult) => {
        if (result.outcome === AnswerOutcome.Correct && assignmentId && this.pendingObjectiveId) {
          playerSessionManager.assignments.recordObjectiveProgress(
            assignmentId,
            this.pendingObjectiveId,
            1,
          );
          void playerSessionManager.saveSession();
        }
      },
      onClose: () => {
        this.activeQuestionModal = null;
        this.presentNextQuestion();
      },
    });
    this.activeQuestionModal.show();
  }

  private escape(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
