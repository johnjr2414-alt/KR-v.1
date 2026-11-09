import { describe, it, expect } from 'vitest';
import {
  formatCombatFeedback,
  calculateHpPercentage,
} from '../../src/combat/CombatFeedbackMapper';
import { AnswerOutcome, type CombatTurnResult } from '../../src/core/types/combat';

describe('Phase 22.2 — Combat Visual Feedback Mapper Unit Tests', () => {
  it('1. Formats correct player attack and critical damage feedback', () => {
    const normalHit: CombatTurnResult = {
      questionIndex: 1,
      outcome: AnswerOutcome.Correct,
      damageToMonster: 24,
      damageToPlayer: 0,
      isCritical: false,
      monsterHpRemaining: 26,
      playerHpRemaining: 100,
    };

    const feedbackNormal = formatCombatFeedback(normalHit, true);
    expect(feedbackNormal.damageAmount).toBe(24);
    expect(feedbackNormal.isCritical).toBe(false);
    expect(feedbackNormal.displayText).toBe('-24');
    expect(feedbackNormal.statusBadge).toBe('CORRECT!');
    expect(feedbackNormal.badgeClass).toContain('combat-badge--correct');

    const critHit: CombatTurnResult = {
      ...normalHit,
      damageToMonster: 48,
      isCritical: true,
    };

    const feedbackCrit = formatCombatFeedback(critHit, true);
    expect(feedbackCrit.damageAmount).toBe(48);
    expect(feedbackCrit.isCritical).toBe(true);
    expect(feedbackCrit.displayText).toContain('-48');
    expect(feedbackCrit.displayText).toContain('💥');
    expect(feedbackCrit.statusBadge).toBe('CRITICAL HIT!');
    expect(feedbackCrit.badgeClass).toContain('combat-badge--critical');
  });

  it('2. Formats incorrect answer monster retaliation feedback', () => {
    const incorrectTurn: CombatTurnResult = {
      questionIndex: 2,
      outcome: AnswerOutcome.Incorrect,
      damageToMonster: 0,
      damageToPlayer: 15,
      isCritical: false,
      monsterHpRemaining: 50,
      playerHpRemaining: 85,
    };

    const feedback = formatCombatFeedback(incorrectTurn, true);
    expect(feedback.damageAmount).toBe(15);
    expect(feedback.isCritical).toBe(false);
    expect(feedback.displayText).toBe('-15');
    expect(feedback.statusBadge).toBe('INCORRECT!');
    expect(feedback.badgeClass).toContain('combat-badge--incorrect');
  });

  it('3. Formats timeout outcome feedback', () => {
    const timeoutTurn: CombatTurnResult = {
      questionIndex: 3,
      outcome: AnswerOutcome.Timeout,
      damageToMonster: 0,
      damageToPlayer: 12,
      isCritical: false,
      monsterHpRemaining: 50,
      playerHpRemaining: 73,
    };

    const feedback = formatCombatFeedback(timeoutTurn, true);
    expect(feedback.damageAmount).toBe(12);
    expect(feedback.displayText).toBe('-12');
    expect(feedback.statusBadge).toBe('TIME UP!');
    expect(feedback.badgeClass).toContain('combat-badge--timeout');
  });

  it('4. Respects showDamageNumbers setting when disabled', () => {
    const hit: CombatTurnResult = {
      questionIndex: 1,
      outcome: AnswerOutcome.Correct,
      damageToMonster: 20,
      damageToPlayer: 0,
      isCritical: false,
      monsterHpRemaining: 30,
      playerHpRemaining: 100,
    };

    const feedbackNoNumbers = formatCombatFeedback(hit, false);
    expect(feedbackNoNumbers.displayText).toBe('HIT!');

    const critNoNumbers = formatCombatFeedback({ ...hit, isCritical: true }, false);
    expect(critNoNumbers.displayText).toBe('CRIT!');
  });

  it('5. Correctly calculates clamped HP percentages', () => {
    expect(calculateHpPercentage(100, 100)).toBe(100);
    expect(calculateHpPercentage(50, 100)).toBe(50);
    expect(calculateHpPercentage(0, 100)).toBe(0);
    expect(calculateHpPercentage(-10, 100)).toBe(0);
    expect(calculateHpPercentage(120, 100)).toBe(100);
    expect(calculateHpPercentage(50, 0)).toBe(0);
  });
});
