import { playerSessionManager } from '../../player';
import './pause-modal.css';

export interface PauseModalOptions {
  onResume?: () => void;
  onQuitToMenu?: () => void;
}

type PauseView = 'menu' | 'settings' | 'controls' | 'confirmQuit';

/**
 * PauseModal — HTML/CSS DOM overlay for pausing exploration.
 * Provides Resume, Settings (volume, damage numbers, layout), Controls guide,
 * and safe Return to Start Menu with confirmation and pre-quit auto-save.
 */
export class PauseModal {
  private container: HTMLDivElement | null = null;
  private readonly onResume?: () => void;
  private readonly onQuitToMenu?: () => void;
  private currentView: PauseView = 'menu';

  constructor(options: PauseModalOptions = {}) {
    this.onResume = options.onResume;
    this.onQuitToMenu = options.onQuitToMenu;
  }

  show(): void {
    this.destroy();

    const container = document.createElement('div');
    container.className = 'pause-modal';
    container.id = 'pause-modal';

    document.body.appendChild(container);
    this.container = container;

    this.render();
  }

  render(): void {
    if (!this.container) return;

    let contentHtml = '';
    let title = '⏸️ Game Paused';

    if (this.currentView === 'menu') {
      contentHtml = `
        <div class="pause-card__menu-buttons">
          <button class="pause-menu-btn" id="pause-resume-btn" type="button">
            ▶️ Resume Game
          </button>
          <button class="pause-menu-btn" id="pause-settings-btn" type="button">
            ⚙️ Settings
          </button>
          <button class="pause-menu-btn" id="pause-controls-btn" type="button">
            🎮 Controls & Shortcuts
          </button>
          <button class="pause-menu-btn pause-menu-btn--danger" id="pause-quit-btn" type="button">
            🚪 Return to Start Menu
          </button>
        </div>
      `;
    } else if (this.currentView === 'settings') {
      title = '⚙️ Game Settings';
      const settings = playerSessionManager.getSettings();

      contentHtml = `
        <div class="pause-settings-group">
          <!-- Master Volume -->
          <div class="pause-setting-row">
            <div class="pause-setting-label">
              <span>Master Volume</span>
              <span class="pause-setting-val" id="master-vol-val">${Math.round(settings.masterVolume * 100)}%</span>
            </div>
            <input class="pause-setting-slider" id="master-vol-slider" type="range" min="0" max="100" value="${Math.round(settings.masterVolume * 100)}" />
          </div>

          <!-- SFX Volume -->
          <div class="pause-setting-row">
            <div class="pause-setting-label">
              <span>Sound Effects (SFX)</span>
              <span class="pause-setting-val" id="sfx-vol-val">${Math.round(settings.sfxVolume * 100)}%</span>
            </div>
            <input class="pause-setting-slider" id="sfx-vol-slider" type="range" min="0" max="100" value="${Math.round(settings.sfxVolume * 100)}" />
          </div>

          <!-- Music Volume -->
          <div class="pause-setting-row">
            <div class="pause-setting-label">
              <span>Music Volume</span>
              <span class="pause-setting-val" id="music-vol-val">${Math.round(settings.musicVolume * 100)}%</span>
            </div>
            <input class="pause-setting-slider" id="music-vol-slider" type="range" min="0" max="100" value="${Math.round(settings.musicVolume * 100)}" />
          </div>

          <!-- Show Damage Numbers -->
          <label class="pause-setting-checkbox">
            <input type="checkbox" id="show-damage-toggle" ${settings.showDamageNumbers ? 'checked' : ''} />
            <span>Show Damage Numbers in Combat</span>
          </label>
        </div>
      `;
    } else if (this.currentView === 'controls') {
      title = '🎮 Controls Guide';
      contentHtml = `
        <div class="pause-controls-list">
          <div class="pause-controls-row">
            <span>Move Character:</span>
            <span><kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or <kbd>Arrows</kbd></span>
          </div>
          <div class="pause-controls-row">
            <span>Interact / Dialogue / Battle:</span>
            <span><kbd>SPACE</kbd> or <kbd>ENTER</kbd></span>
          </div>
          <div class="pause-controls-row">
            <span>Inventory / Equipment:</span>
            <span><kbd>I</kbd></span>
          </div>
          <div class="pause-controls-row">
            <span>Skill Trees & Hotbar:</span>
            <span><kbd>K</kbd> (Phase 23.5)</span>
          </div>
          <div class="pause-controls-row">
            <span>Subject Mastery:</span>
            <span><kbd>M</kbd></span>
          </div>
          <div class="pause-controls-row">
            <span>Quest Journal:</span>
            <span><kbd>Q</kbd> (Phase 21.7)</span>
          </div>
          <div class="pause-controls-row">
            <span>Pause / Settings:</span>
            <span><kbd>ESC</kbd></span>
          </div>
        </div>
      `;
    } else if (this.currentView === 'confirmQuit') {
      title = '⚠️ Confirm Exit';
      contentHtml = `
        <div class="pause-confirm-box">
          <span>Are you sure you want to return to the start menu?</span>
          <span>Your character, gold, inventory, and quest progress will be saved automatically.</span>
          <div class="pause-confirm-actions">
            <button class="pause-menu-btn pause-menu-btn--danger" id="confirm-quit-btn" type="button">
              Yes, Save & Exit
            </button>
            <button class="pause-menu-btn" id="cancel-quit-btn" type="button">
              Cancel
            </button>
          </div>
        </div>
      `;
    }

    const backButtonHtml =
      this.currentView !== 'menu'
        ? `<button class="pause-menu-btn" id="pause-back-btn" style="padding: 6px 14px; font-size: 11px;" type="button">← Back</button>`
        : '';

    this.container.innerHTML = `
      <div class="pause-card">
        <div class="pause-card__header">
          <span class="pause-card__title">${this.escape(title)}</span>
          ${backButtonHtml}
        </div>
        <div class="pause-card__content">
          ${contentHtml}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    if (!this.container) return;

    this.container.querySelector('#pause-back-btn')?.addEventListener('click', () => {
      this.currentView = 'menu';
      this.render();
    });

    if (this.currentView === 'menu') {
      this.container.querySelector('#pause-resume-btn')?.addEventListener('click', () => {
        this.destroy();
        this.onResume?.();
      });

      this.container.querySelector('#pause-settings-btn')?.addEventListener('click', () => {
        this.currentView = 'settings';
        this.render();
      });

      this.container.querySelector('#pause-controls-btn')?.addEventListener('click', () => {
        this.currentView = 'controls';
        this.render();
      });

      this.container.querySelector('#pause-quit-btn')?.addEventListener('click', () => {
        this.currentView = 'confirmQuit';
        this.render();
      });
    } else if (this.currentView === 'settings') {
      const masterSlider = this.container.querySelector<HTMLInputElement>('#master-vol-slider');
      masterSlider?.addEventListener('input', () => {
        const val = Number(masterSlider.value) / 100;
        playerSessionManager.updateSettings({ masterVolume: val });
        const label = this.container?.querySelector('#master-vol-val');
        if (label) label.textContent = `${masterSlider.value}%`;
      });

      const sfxSlider = this.container.querySelector<HTMLInputElement>('#sfx-vol-slider');
      sfxSlider?.addEventListener('input', () => {
        const val = Number(sfxSlider.value) / 100;
        playerSessionManager.updateSettings({ sfxVolume: val });
        const label = this.container?.querySelector('#sfx-vol-val');
        if (label) label.textContent = `${sfxSlider.value}%`;
      });

      const musicSlider = this.container.querySelector<HTMLInputElement>('#music-vol-slider');
      musicSlider?.addEventListener('input', () => {
        const val = Number(musicSlider.value) / 100;
        playerSessionManager.updateSettings({ musicVolume: val });
        const label = this.container?.querySelector('#music-vol-val');
        if (label) label.textContent = `${musicSlider.value}%`;
      });

      const damageToggle = this.container.querySelector<HTMLInputElement>('#show-damage-toggle');
      damageToggle?.addEventListener('change', () => {
        playerSessionManager.updateSettings({ showDamageNumbers: Boolean(damageToggle.checked) });
      });
    } else if (this.currentView === 'confirmQuit') {
      this.container.querySelector('#confirm-quit-btn')?.addEventListener('click', async () => {
        // Save state immediately before quitting
        await playerSessionManager.saveSession();
        this.destroy();
        this.onQuitToMenu?.();
      });

      this.container.querySelector('#cancel-quit-btn')?.addEventListener('click', () => {
        this.currentView = 'menu';
        this.render();
      });
    }
  }

  destroy(): void {
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
