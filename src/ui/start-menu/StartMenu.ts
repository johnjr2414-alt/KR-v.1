import { GAME_TITLE, GAME_VERSION } from '../../constants';
import { AppRole } from '../../core/roles';

/** Callback invoked when the player selects a role from the start menu. */
export type RoleSelectedCallback = (role: AppRole) => void;

/**
 * StartMenu — a DOM-layered HTML/CSS overlay rendered on top of the Phaser canvas.
 *
 * Displays the game title and two role-selection buttons.
 * Calls the provided callback with the chosen role, then removes itself from the DOM.
 */
export class StartMenu {
  private container: HTMLDivElement | null = null;

  /**
   * Show the start menu overlay.
   * @param onRoleSelected Called once when the player clicks a role button.
   */
  show(onRoleSelected: RoleSelectedCallback): void {
    // Prevent duplicates.
    this.destroy();

    const container = document.createElement('div');
    container.id = 'start-menu';
    container.innerHTML = `
      <div class="start-menu__backdrop">
        <div class="start-menu__card">
          <h1 class="start-menu__title">${GAME_TITLE}</h1>
          <p class="start-menu__version">v${GAME_VERSION}</p>
          <div class="start-menu__buttons">
            <button class="start-menu__btn start-menu__btn--user" data-role="${AppRole.User}">
              ⚔️ Enter as User
            </button>
            <button class="start-menu__btn start-menu__btn--admin" data-role="${AppRole.SuperAdmin}">
              🛡️ Enter as Super Admin
            </button>
          </div>
          <p class="start-menu__disclaimer">
            Role selection is not authenticated.
          </p>
        </div>
      </div>
    `;

    // Attach click handlers.
    const buttons = container.querySelectorAll<HTMLButtonElement>('.start-menu__btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const role = btn.dataset.role as AppRole;
        this.destroy();
        onRoleSelected(role);
      });
    });

    document.body.appendChild(container);
    this.container = container;
  }

  /** Remove the start menu from the DOM. */
  destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
