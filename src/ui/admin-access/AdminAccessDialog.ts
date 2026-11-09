import { AdminAccessService, type AdminGateDecision } from '../../core/roles';
import { ADMIN_LOCAL_SECURITY_WARNING } from '../../config/adminAccessConfig';
import './admin-access-dialog.css';

export interface AdminAccessDialogHandlers {
  onGranted: () => void;
  onCancel?: () => void;
}

/**
 * Local admin gate overlay (Phase 28.4).
 *
 * Collects a passcode (when one is configured) or an explicit acknowledgement
 * phrase, then reports the outcome. It never blocks the normal user flow: the
 * start menu stays usable behind the dialog and Cancel/Escape closes it.
 */
export class AdminAccessDialog {
  private container: HTMLDivElement | null = null;
  private service: AdminAccessService | null = null;
  private statusEl: HTMLElement | null = null;
  private inputEl: HTMLInputElement | null = null;
  private submitBtn: HTMLButtonElement | null = null;
  private keydownHandler: ((event: KeyboardEvent) => void) | null = null;

  show(service: AdminAccessService, handlers: AdminAccessDialogHandlers): void {
    this.destroy();
    document.getElementById('admin-access-dialog')?.remove();

    const isPasscode = service.getMode() === 'passcode';

    const container = document.createElement('div');
    container.id = 'admin-access-dialog';
    container.innerHTML = `
      <div class="admin-access__backdrop">
        <div class="admin-access__card" role="dialog" aria-modal="true" aria-labelledby="admin-access-title" aria-describedby="admin-access-warning">
          <h2 class="admin-access__title" id="admin-access-title">Local Admin Access</h2>
          <p class="admin-access__warning" id="admin-access-warning"></p>
          <form class="admin-access__form">
            <label class="admin-access__label" for="admin-access-input"></label>
            <input class="admin-access__input" id="admin-access-input" autocomplete="off" spellcheck="false" />
            <p class="admin-access__status" role="status" aria-live="polite"></p>
            <div class="admin-access__actions">
              <button class="admin-access__btn admin-access__btn--cancel" type="button" data-action="cancel">Cancel</button>
              <button class="admin-access__btn admin-access__btn--submit" type="submit">Unlock</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(container);
    this.container = container;
    this.service = service;

    const warning = container.querySelector<HTMLElement>('#admin-access-warning');
    if (warning) warning.textContent = ADMIN_LOCAL_SECURITY_WARNING;

    const label = container.querySelector<HTMLLabelElement>('.admin-access__label');
    if (label) {
      label.textContent = isPasscode ? 'Admin passcode' : 'Confirmation phrase';
    }

    const input = container.querySelector<HTMLInputElement>('#admin-access-input');
    if (input) {
      input.type = isPasscode ? 'password' : 'text';
      input.placeholder = isPasscode
        ? 'Enter the local admin passcode'
        : `Type ${service.getAcknowledgementPhrase()}`;
      this.inputEl = input;
    }

    this.statusEl = container.querySelector<HTMLElement>('.admin-access__status');
    this.submitBtn = container.querySelector<HTMLButtonElement>('.admin-access__btn--submit');

    if (this.statusEl) {
      if (service.isLocked()) {
        const lockedUntil = service.getLockedUntil();
        const seconds = lockedUntil ? Math.max(1, Math.ceil((lockedUntil - Date.now()) / 1000)) : 0;
        this.statusEl.textContent = `Too many failed attempts. Try again in ${seconds} second(s).`;
      } else if (!isPasscode) {
        this.statusEl.textContent =
          'No passcode is configured. Typing the phrase confirms you understand this gate is not secure.';
      }
    }

    const form = container.querySelector<HTMLFormElement>('.admin-access__form');
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      void this.handleSubmit(handlers);
    });

    container
      .querySelector<HTMLButtonElement>('[data-action="cancel"]')
      ?.addEventListener('click', () => this.cancel(handlers));

    const backdrop = container.querySelector<HTMLElement>('.admin-access__backdrop');
    backdrop?.addEventListener('click', (event) => {
      if (event.target === backdrop) this.cancel(handlers);
    });

    this.keydownHandler = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') this.cancel(handlers);
    };
    document.addEventListener('keydown', this.keydownHandler);

    input?.focus();
  }

  destroy(): void {
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.service = null;
    this.statusEl = null;
    this.inputEl = null;
    this.submitBtn = null;
  }

  private async handleSubmit(handlers: AdminAccessDialogHandlers): Promise<void> {
    const service = this.service;
    const input = this.inputEl;
    if (!service || !input) return;

    this.setBusy(true);
    const decision = await service.submit(input.value);
    if (!this.container) return;
    this.setBusy(false);

    if (decision.granted) {
      this.destroy();
      handlers.onGranted();
      return;
    }

    input.value = '';
    input.focus();
    if (this.statusEl) this.statusEl.textContent = this.describeFailure(decision);
  }

  private describeFailure(decision: AdminGateDecision): string {
    switch (decision.reason) {
      case 'empty':
        return decision.mode === 'passcode'
          ? 'Enter the admin passcode.'
          : `Type ${this.service?.getAcknowledgementPhrase() ?? 'the confirmation phrase'}.`;
      case 'locked': {
        const seconds = decision.lockedUntil !== null
          ? Math.max(1, Math.ceil((decision.lockedUntil - Date.now()) / 1000))
          : 0;
        return `Too many failed attempts. Try again in ${seconds} second(s).`;
      }
      case 'unavailable':
        return 'Passcode checking is unavailable in this browser.';
      case 'incorrect':
      default:
        return decision.remainingAttempts > 0
          ? `Incorrect. ${decision.remainingAttempts} attempt(s) remaining.`
          : 'Incorrect. Try again later.';
    }
  }

  private setBusy(busy: boolean): void {
    if (this.inputEl) this.inputEl.disabled = busy;
    if (this.submitBtn) this.submitBtn.disabled = busy;
  }

  private cancel(handlers: AdminAccessDialogHandlers): void {
    this.destroy();
    handlers.onCancel?.();
  }
}
