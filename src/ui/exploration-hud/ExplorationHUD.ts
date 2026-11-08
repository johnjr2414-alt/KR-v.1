import { playerSessionManager } from '../../player';
import { getRequiredExpForNextLevel } from '../../config/expConfig';
import './exploration-hud.css';

export interface ExplorationHUDOptions {
  onOpenInventory?: () => void;
  onOpenMastery?: () => void;
  onOpenQuests?: () => void;
}

/**
 * ExplorationHUD — persistent HTML/CSS DOM overlay for exploration scenes (VillageScene, HuntingScene).
 * Displays authoritative character name, level, HP, MP, level EXP progress, Gold balance,
 * and quick-access panel buttons.
 */
export class ExplorationHUD {
  private container: HTMLDivElement | null = null;
  private readonly onOpenInventory?: () => void;
  private readonly onOpenMastery?: () => void;
  private readonly onOpenQuests?: () => void;
  private unsubscribeGoldListener: (() => void) | null = null;

  constructor(options: ExplorationHUDOptions = {}) {
    this.onOpenInventory = options.onOpenInventory;
    this.onOpenMastery = options.onOpenMastery;
    this.onOpenQuests = options.onOpenQuests;
  }

  show(): void {
    this.destroy();

    const container = document.createElement('div');
    container.className = 'exploration-hud';
    container.id = 'exploration-hud';

    document.body.appendChild(container);
    this.container = container;

    this.render();

    // Listen to currency balance changes
    this.unsubscribeGoldListener = playerSessionManager.currency.onBalanceChange(() => {
      this.updateGoldDisplay();
    });
  }

  render(): void {
    if (!this.container) return;

    const player = playerSessionManager.getPlayer();
    const gold = playerSessionManager.currency.getGold();

    const hpPercent = Math.max(0, Math.min(100, Math.round((player.currentHp / player.maxHp) * 100)));
    const mpPercent =
      player.maxMp > 0
        ? Math.max(0, Math.min(100, Math.round((player.currentMp / player.maxMp) * 100)))
        : 0;

    const nextLevelExp = getRequiredExpForNextLevel(player.level);
    const expPercent =
      nextLevelExp > 0
        ? Math.max(0, Math.min(100, Math.round((player.currentExp / nextLevelExp) * 100)))
        : 100;

    this.container.innerHTML = `
      <div class="exploration-hud__card">
        <div class="exploration-hud__header">
          <span class="exploration-hud__name">⚔️ ${this.escape(player.name)}</span>
          <span class="exploration-hud__level">Lv. ${player.level}</span>
        </div>

        <div class="exploration-hud__bar-group">
          <!-- HP Bar -->
          <div class="exploration-hud__bar-wrapper" title="Health Points">
            <div class="exploration-hud__bar exploration-hud__bar--hp" id="hud-hp-bar" style="width: ${hpPercent}%"></div>
            <div class="exploration-hud__bar-label">
              <span>HP</span>
              <span id="hud-hp-text">${player.currentHp} / ${player.maxHp}</span>
            </div>
          </div>

          <!-- MP Bar -->
          <div class="exploration-hud__bar-wrapper" title="Mana Points">
            <div class="exploration-hud__bar exploration-hud__bar--mp" id="hud-mp-bar" style="width: ${mpPercent}%"></div>
            <div class="exploration-hud__bar-label">
              <span>MP</span>
              <span id="hud-mp-text">${player.currentMp} / ${player.maxMp}</span>
            </div>
          </div>

          <!-- EXP Bar -->
          <div class="exploration-hud__bar-wrapper" title="Character Experience Progress">
            <div class="exploration-hud__bar exploration-hud__bar--exp" id="hud-exp-bar" style="width: ${expPercent}%"></div>
            <div class="exploration-hud__bar-label">
              <span>EXP</span>
              <span id="hud-exp-text">${player.currentExp} / ${nextLevelExp > 0 ? nextLevelExp : 'MAX'}</span>
            </div>
          </div>
        </div>

        <div class="exploration-hud__footer">
          <div class="exploration-hud__gold" id="hud-gold-text">
            🪙 <span>${gold} G</span>
          </div>
          <div class="exploration-hud__buttons">
            <button class="exploration-hud__btn" id="hud-inv-btn" type="button">
              🎒 Bag <span class="exploration-hud__btn-key">I</span>
            </button>
            <button class="exploration-hud__btn" id="hud-mastery-btn" type="button">
              📖 Mastery <span class="exploration-hud__btn-key">M</span>
            </button>
            <button class="exploration-hud__btn" id="hud-quest-btn" type="button">
              📜 Quests <span class="exploration-hud__btn-key">Q</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Wire HUD buttons
    this.container.querySelector('#hud-inv-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onOpenInventory?.();
    });

    this.container.querySelector('#hud-mastery-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onOpenMastery?.();
    });

    this.container.querySelector('#hud-quest-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onOpenQuests?.();
    });
  }

  /**
   * Refreshes all values from player state (e.g. after equipment changes or EXP gains).
   */
  refresh(): void {
    if (!this.container) return;
    this.render();
  }

  private updateGoldDisplay(): void {
    const goldTextEl = this.container?.querySelector('#hud-gold-text span');
    if (goldTextEl) {
      goldTextEl.textContent = `${playerSessionManager.currency.getGold()} G`;
    }
  }

  destroy(): void {
    if (this.unsubscribeGoldListener) {
      this.unsubscribeGoldListener();
      this.unsubscribeGoldListener = null;
    }
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
