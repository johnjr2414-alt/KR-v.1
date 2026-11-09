import { playerSessionManager } from '../../player';
import {
  applyTextScale,
  loadTextScale,
  saveTextScale,
  TEXT_SCALE_OPTIONS,
  textScaleLabel,
} from '../preferences/UiPreferences';
import { UI_STRINGS } from '../strings';
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
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-modal', 'true');
    container.setAttribute('aria-labelledby', 'pause-title');

    document.body.appendChild(container);
    this.container = container;

    this.render();
  }

  render(): void {
    if (!this.container) return;

    let contentHtml = '';
    let title: string = UI_STRINGS.pause.titlePaused;

    if (this.currentView === 'menu') {
      contentHtml = `
        <div class="pause-card__menu-buttons">
          <button class="pause-menu-btn" id="pause-resume-btn" type="button">
            ${UI_STRINGS.pause.resume}
          </button>
          <button class="pause-menu-btn" id="pause-settings-btn" type="button">
            ${UI_STRINGS.pause.settings}
          </button>
          <button class="pause-menu-btn" id="pause-controls-btn" type="button">
            ${UI_STRINGS.pause.controls}
          </button>
          <button class="pause-menu-btn pause-menu-btn--danger" id="pause-quit-btn" type="button">
            ${UI_STRINGS.pause.returnToStartMenu}
          </button>
        </div>
      `;
    } else if (this.currentView === 'settings') {
      title = UI_STRINGS.pause.settingsTitle;
      const settings = playerSessionManager.getSettings();
      const textScale = loadTextScale();
      const textScaleOptions = TEXT_SCALE_OPTIONS.map(
        (scale) =>
          `<option value="${scale}"${scale === textScale ? ' selected' : ''}>${this.escape(textScaleLabel(scale))}</option>`,
      ).join('');

      contentHtml = `
        <div class="pause-settings-group">
          <!-- Master Volume -->
          <div class="pause-setting-row">
            <label class="pause-setting-label" for="master-vol-slider">
              <span>${UI_STRINGS.pause.masterVolume}</span>
              <span class="pause-setting-val" id="master-vol-val">${Math.round(settings.masterVolume * 100)}%</span>
            </label>
            <input class="pause-setting-slider" id="master-vol-slider" type="range" min="0" max="100" value="${Math.round(settings.masterVolume * 100)}" />
          </div>

          <!-- SFX Volume -->
          <div class="pause-setting-row">
            <label class="pause-setting-label" for="sfx-vol-slider">
              <span>${UI_STRINGS.pause.sfxVolume}</span>
              <span class="pause-setting-val" id="sfx-vol-val">${Math.round(settings.sfxVolume * 100)}%</span>
            </label>
            <input class="pause-setting-slider" id="sfx-vol-slider" type="range" min="0" max="100" value="${Math.round(settings.sfxVolume * 100)}" />
          </div>

          <!-- Music Volume -->
          <div class="pause-setting-row">
            <label class="pause-setting-label" for="music-vol-slider">
              <span>${UI_STRINGS.pause.musicVolume}</span>
              <span class="pause-setting-val" id="music-vol-val">${Math.round(settings.musicVolume * 100)}%</span>
            </label>
            <input class="pause-setting-slider" id="music-vol-slider" type="range" min="0" max="100" value="${Math.round(settings.musicVolume * 100)}" />
          </div>

          <!-- Show Damage Numbers -->
          <label class="pause-setting-checkbox">
            <input type="checkbox" id="show-damage-toggle" ${settings.showDamageNumbers ? 'checked' : ''} />
            <span>${UI_STRINGS.pause.showDamageNumbers}</span>
          </label>

          <!-- Text Size -->
          <div class="pause-setting-row">
            <label class="pause-setting-label" for="text-scale-select">
              <span>${UI_STRINGS.pause.textSize}</span>
            </label>
            <select class="pause-setting-select" id="text-scale-select">
              ${textScaleOptions}
            </select>
          </div>
        </div>
      `;
    } else if (this.currentView === 'controls') {
      title = UI_STRINGS.pause.controlsTitle;
      contentHtml = `
        <div class="pause-controls-list">
          <div class="pause-controls-row">
            <span>${UI_STRINGS.pause.moveCharacter}</span>
            <span><kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> / <kbd>Arrows</kbd></span>
          </div>
          <div class="pause-controls-row">
            <span>${UI_STRINGS.pause.interact}</span>
            <span><kbd>SPACE</kbd> / <kbd>ENTER</kbd></span>
          </div>
          <div class="pause-controls-row">
            <span>${UI_STRINGS.pause.inventoryKeys}</span>
            <span><kbd>I</kbd></span>
          </div>
          <div class="pause-controls-row">
            <span>${UI_STRINGS.pause.skillKeys}</span>
            <span><kbd>K</kbd></span>
          </div>
          <div class="pause-controls-row">
            <span>${UI_STRINGS.pause.masteryKeys}</span>
            <span><kbd>M</kbd></span>
          </div>
          <div class="pause-controls-row">
            <span>${UI_STRINGS.pause.questKeys}</span>
            <span><kbd>Q</kbd></span>
          </div>
          <div class="pause-controls-row">
            <span>${UI_STRINGS.pause.pauseKeys}</span>
            <span><kbd>ESC</kbd></span>
          </div>
        </div>
      `;
    } else if (this.currentView === 'confirmQuit') {
      title = UI_STRINGS.pause.confirmExitTitle;
      contentHtml = `
        <div class="pause-confirm-box">
          <span>${UI_STRINGS.pause.confirmExitQuestion}</span>
          <span>${UI_STRINGS.pause.confirmExitDetail}</span>
          <div class="pause-confirm-actions">
            <button class="pause-menu-btn pause-menu-btn--danger" id="confirm-quit-btn" type="button">
              ${UI_STRINGS.pause.confirmSaveAndExit}
            </button>
            <button class="pause-menu-btn" id="cancel-quit-btn" type="button">
              ${UI_STRINGS.common.cancel}
            </button>
          </div>
        </div>
      `;
    }

    const backButtonHtml =
      this.currentView !== 'menu'
        ? `<button class="pause-menu-btn pause-back-btn" id="pause-back-btn" type="button">← ${UI_STRINGS.common.back}</button>`
        : '';

    this.container.innerHTML = `
      <div class="pause-card">
        <div class="pause-card__header">
          <span class="pause-card__title" id="pause-title">${this.escape(title)}</span>
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

      const textScaleSelect = this.container.querySelector<HTMLSelectElement>('#text-scale-select');
      textScaleSelect?.addEventListener('change', () => {
        const scale = Number(textScaleSelect.value);
        applyTextScale(scale);
        saveTextScale(scale);
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
