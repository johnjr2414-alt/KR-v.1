import type { CombatTurnResult } from '../core/types/combat';
import { AnswerOutcome } from '../core/types/combat';

export type DamageStyle = 'critical' | 'player-damage' | 'monster-damage' | 'neutral';

export interface CombatFeedbackDescriptor {
  damageAmount: number;
  isCritical: boolean;
  style: DamageStyle;
  prefix: string;
  displayText: string;
  statusBadge: string;
  badgeClass: string;
  soundCue: string;
}

/**
 * Pure headless transformer converting a CombatTurnResult into authoritative visual feedback cues.
 * Completely decoupled from Phaser and DOM.
 */
export function formatCombatFeedback(
  turnResult: CombatTurnResult,
  showDamageNumbers = true,
): CombatFeedbackDescriptor {
  const isPlayerAttacking = turnResult.outcome === AnswerOutcome.Correct;
  const damage = isPlayerAttacking ? turnResult.damageToMonster : turnResult.damageToPlayer;
  const isCritical = turnResult.isCritical;

  let style: DamageStyle = 'neutral';
  let prefix = '';
  let statusBadge = '';
  let badgeClass = '';
  let soundCue = 'hit';

  if (turnResult.outcome === AnswerOutcome.Correct) {
    statusBadge = isCritical ? 'CRITICAL HIT!' : 'CORRECT!';
    badgeClass = isCritical ? 'combat-badge--critical' : 'combat-badge--correct';
    style = isCritical ? 'critical' : 'monster-damage';
    prefix = '-';
    soundCue = isCritical ? 'sfx-crit' : 'sfx-attack';
  } else if (turnResult.outcome === AnswerOutcome.Timeout) {
    statusBadge = 'TIME UP!';
    badgeClass = 'combat-badge--timeout';
    style = 'player-damage';
    prefix = '-';
    soundCue = 'sfx-timeout';
  } else {
    statusBadge = 'INCORRECT!';
    badgeClass = 'combat-badge--incorrect';
    style = 'player-damage';
    prefix = '-';
    soundCue = 'sfx-hurt';
  }

  const displayText = showDamageNumbers
    ? `${prefix}${damage}${isCritical ? ' 💥' : ''}`
    : isCritical
      ? 'CRIT!'
      : 'HIT!';

  return {
    damageAmount: damage,
    isCritical,
    style,
    prefix,
    displayText,
    statusBadge,
    badgeClass,
    soundCue,
  };
}

/**
 * Pure function to calculate health percentage clamped between 0 and 100.
 */
export function calculateHpPercentage(current: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (current / max) * 100));
}
