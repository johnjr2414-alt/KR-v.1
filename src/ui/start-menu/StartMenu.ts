import { GAME_TITLE, GAME_VERSION } from '../../constants';
import { AppRole } from '../../core/roles';
import { UI_STRINGS } from '../strings';

/** Handlers for the two start-menu entry points. */
export interface StartMenuHandlers {
  /** Called when the player chooses the normal user flow. */
  onUserSelected: () => void;
  /** Called when the player asks for the local Super Admin gate. */
  onAdminRequest: () => void;
}

/**
 * Pure markup builder so the start-menu structure stays testable without a DOM.
 *
 * Only the user role is offered as a primary action. Admin access is a subtle
 * secondary link (Phase 28.4) so it cannot be entered by accident.
 */
export function buildStartMenuMarkup(): string {
  return `
    <div class="start-menu__backdrop">
      <div class="start-menu__card">
        <h1 class="start-menu__title">${GAME_TITLE}</h1>
        <p class="start-menu__version">v${GAME_VERSION}</p>
        <div class="start-menu__buttons">
          <button class="start-menu__btn start-menu__btn--user" data-role="${AppRole.User}" type="button">
            ⚔️ ${UI_STRINGS.startMenu.enterAsUser}
          </button>
        </div>
        <p class="start-menu__disclaimer">
          ${UI_STRINGS.startMenu.savedLocally}
        </p>
        <button class="start-menu__admin-link" type="button" data-action="admin-access">
          ${UI_STRINGS.startMenu.localAdminAccess}
        </button>
      </div>
    </div>
  `;
}

/**
 * StartMenu — a DOM-layered HTML/CSS overlay rendered on top of the Phaser canvas.
 *
 * Displays the game title and the normal user entry point. Super Admin access is
 * reachable only through a small link or Ctrl/Cmd+Shift+A, which opens the local
 * gate (see `AdminAccessDialog`).
 */
export class StartMenu {
  private container: HTMLDivElement | null = null;
  private keydownHandler: ((event: KeyboardEvent) => void) | null = null;

  show(handlers: StartMenuHandlers): void {
    // Prevent duplicates.
    this.destroy();

    const container = document.createElement('div');
    container.id = 'start-menu';
    container.innerHTML = buildStartMenuMarkup();

    container
      .querySelector<HTMLButtonElement>('.start-menu__btn--user')
      ?.addEventListener('click', () => {
        this.destroy();
        handlers.onUserSelected();
      });

    container
      .querySelector<HTMLButtonElement>('[data-action="admin-access"]')
      ?.addEventListener('click', () => handlers.onAdminRequest());

    this.keydownHandler = (event: KeyboardEvent): void => {
      const isShortcut =
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === 'a';
      if (!isShortcut) return;
      event.preventDefault();
      handlers.onAdminRequest();
    };
    document.addEventListener('keydown', this.keydownHandler);

    document.body.appendChild(container);
    this.container = container;
  }

  /** Remove the start menu from the DOM. */
  destroy(): void {
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
