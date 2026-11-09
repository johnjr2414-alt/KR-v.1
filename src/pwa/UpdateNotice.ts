import { UI_STRINGS } from '../ui/strings';
import './update-notice.css';

const UPDATE_NOTICE_ID = 'pwa-update-notice';
const OFFLINE_NOTICE_ID = 'pwa-offline-ready';
const OFFLINE_NOTICE_DURATION_MS = 6000;

/**
 * Small fixed-position banner for service-worker lifecycle messages. It lives
 * outside the Phaser canvas so it remains visible over any scene or modal.
 */
export class UpdateNotice {
  private container: HTMLDivElement | null = null;
  private dismissTimer: number | null = null;

  /** Offers the player an explicit, save-first reload after a new build installs. */
  showUpdate(onReload: () => void): void {
    if (this.container) return;

    const container = this.createContainer(UPDATE_NOTICE_ID);
    const text = document.createElement('span');
    text.className = 'pwa-notice__text';
    text.textContent = UI_STRINGS.notices.updateAvailable;

    const reload = document.createElement('button');
    reload.type = 'button';
    reload.className = 'pwa-notice__action';
    reload.textContent = UI_STRINGS.notices.saveAndReload;
    reload.addEventListener('click', () => {
      reload.disabled = true;
      onReload();
    });

    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'pwa-notice__dismiss';
    dismiss.textContent = UI_STRINGS.notices.later;
    dismiss.addEventListener('click', () => this.destroy());

    container.append(text, reload, dismiss);
    this.mount(container);
  }

  /** Confirms that the app shell is cached and playable without a network. */
  showOfflineReady(): void {
    if (this.container) return;

    const container = this.createContainer(OFFLINE_NOTICE_ID);
    const text = document.createElement('span');
    text.className = 'pwa-notice__text';
    text.textContent = UI_STRINGS.notices.offlineReady;
    container.append(text);

    this.mount(container);
    this.dismissTimer = window.setTimeout(() => this.destroy(), OFFLINE_NOTICE_DURATION_MS);
  }

  destroy(): void {
    if (this.dismissTimer !== null) {
      window.clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
    this.container?.remove();
    this.container = null;
  }

  private createContainer(id: string): HTMLDivElement {
    const container = document.createElement('div');
    container.id = id;
    container.className = 'pwa-notice';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    return container;
  }

  private mount(container: HTMLDivElement): void {
    document.body.appendChild(container);
    this.container = container;
  }
}
