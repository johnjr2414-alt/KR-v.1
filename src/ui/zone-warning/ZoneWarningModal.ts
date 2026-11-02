import type { ZoneAccessCheckResult } from '../../world/zoneAccess';
import { ZoneDangerLevel } from '../../world/HuntingZoneDefinition';

export type ZoneWarningCallback = (confirmed: boolean) => void;

const DANGER_COLORS: Record<ZoneDangerLevel, string> = {
  [ZoneDangerLevel.Safe]: '#22c55e',
  [ZoneDangerLevel.Caution]: '#f59e0b',
  [ZoneDangerLevel.Danger]: '#ef4444',
  [ZoneDangerLevel.Extreme]: '#9333ea',
};

/**
 * ZoneWarningModal — DOM overlay shown before a player enters a dangerous zone.
 *
 * Displays recommended level, danger rating, and warning text.
 * Player must explicitly Confirm or Cancel; entry is never auto-blocked.
 */
export class ZoneWarningModal {
  private container: HTMLDivElement | null = null;

  /**
   * Show the danger warning.
   * @param checkResult Result from checkZoneAccess().
   * @param zoneName Display name of the zone.
   * @param onConfirm Called with true if player confirms, false if they cancel.
   */
  show(
    checkResult: ZoneAccessCheckResult,
    zoneName: string,
    onConfirm: ZoneWarningCallback,
  ): void {
    this.destroy();

    const color = DANGER_COLORS[checkResult.dangerLevel];
    const dangerLabel = checkResult.dangerLevel.toUpperCase().replace('-', ' ');

    const container = document.createElement('div');
    container.id = 'zone-warning-modal';
    container.innerHTML = `
      <div class="zone-warning__backdrop">
        <div class="zone-warning__card">
          <div class="zone-warning__header" style="border-color: ${color}">
            <span class="zone-warning__icon">⚠️</span>
            <h2 class="zone-warning__title">Entering Dangerous Zone</h2>
          </div>
          <div class="zone-warning__zone-name">${zoneName}</div>
          <div class="zone-warning__danger-badge" style="background: ${color}22; border-color: ${color}; color: ${color}">
            ${dangerLabel}
          </div>
          <div class="zone-warning__stats">
            <div class="zone-warning__stat">
              <span class="zone-warning__stat-label">Your Level</span>
              <span class="zone-warning__stat-value">${checkResult.playerLevel}</span>
            </div>
            <div class="zone-warning__stat">
              <span class="zone-warning__stat-label">Monster Level</span>
              <span class="zone-warning__stat-value" style="color: ${color}">~${checkResult.averageMonsterLevel}</span>
            </div>
          </div>
          <p class="zone-warning__message">
            Monsters here are <strong style="color: ${color}">${checkResult.delta} levels above you</strong>.
            Questions will be significantly harder and your character may be defeated quickly.
            You may still enter — proceed at your own risk.
          </p>
          <div class="zone-warning__buttons">
            <button class="zone-warning__btn zone-warning__btn--cancel" id="zone-warning-cancel">
              ← Go Back
            </button>
            <button class="zone-warning__btn zone-warning__btn--confirm" id="zone-warning-confirm" style="border-color: ${color}; color: ${color}">
              Enter Anyway
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('zone-warning-cancel')?.addEventListener('click', () => {
      this.destroy();
      onConfirm(false);
    });

    container.querySelector('#zone-warning-confirm')?.addEventListener('click', () => {
      this.destroy();
      onConfirm(true);
    });

    document.body.appendChild(container);
    this.container = container;
  }

  destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
