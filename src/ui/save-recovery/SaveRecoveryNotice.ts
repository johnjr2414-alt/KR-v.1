import { UI_STRINGS } from '../strings';
import './save-recovery-notice.css';

const AUTO_DISMISS_MS = 12_000;

/**
 * SaveRecoveryNotice — a small, dismissible DOM banner that tells the player
 * when a save was repaired, salvaged, or could not be read (Phase 28.3).
 *
 * Messages are inserted with `textContent`, so even a corrupted save can never
 * inject markup. The banner auto-dismisses and never blocks gameplay.
 */
export class SaveRecoveryNotice {
  private container: HTMLDivElement | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  show(message: string): void {
    if (!message) return;
    this.destroy();
    // BootScene can be re-entered, so clear any banner left by a prior instance.
    document.getElementById('save-recovery-notice')?.remove();

    const container = document.createElement('div');
    container.className = 'save-recovery-notice';
    container.id = 'save-recovery-notice';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');

    const icon = document.createElement('span');
    icon.className = 'save-recovery-notice__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '⚠️';

    const text = document.createElement('span');
    text.className = 'save-recovery-notice__text';
    text.textContent = message;

    const close = document.createElement('button');
    close.className = 'save-recovery-notice__close';
    close.type = 'button';
    close.setAttribute('aria-label', UI_STRINGS.notices.saveRecoveryDismiss);
    close.textContent = '✕';
    close.addEventListener('click', () => this.destroy());

    container.append(icon, text, close);
    document.body.appendChild(container);
    this.container = container;

    this.timer = setTimeout(() => this.destroy(), AUTO_DISMISS_MS);
  }

  destroy(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
