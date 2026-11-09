import { describe, it, expect } from 'vitest';
import {
  resolveDirection,
  evaluatePlayerAnimationState,
  evaluateMonsterAnimationState,
  type Direction,
} from '../../src/scenes/animations/AnimationStateCoordinator';

describe('Phase 22.1 — Animation State Coordinator Pure Logic Unit Tests', () => {
  describe('resolveDirection', () => {
    it('1. Resolves cardinal directions accurately from velocity vectors', () => {
      expect(resolveDirection(100, 0, 'down')).toBe('right');
      expect(resolveDirection(-100, 0, 'down')).toBe('left');
      expect(resolveDirection(0, 100, 'right')).toBe('down');
      expect(resolveDirection(0, -100, 'right')).toBe('up');
    });

    it('2. Prioritizes dominant axis on diagonal velocity', () => {
      // Horizontal dominant
      expect(resolveDirection(150, 50, 'down')).toBe('right');
      expect(resolveDirection(-150, 50, 'down')).toBe('left');

      // Vertical dominant
      expect(resolveDirection(50, 150, 'right')).toBe('down');
      expect(resolveDirection(50, -150, 'right')).toBe('up');
    });

    it('3. Preserves previous direction when stationary (vx = 0, vy = 0)', () => {
      const prev: Direction = 'left';
      expect(resolveDirection(0, 0, prev)).toBe('left');
    });
  });

  describe('evaluatePlayerAnimationState', () => {
    it('4. Returns idle animation key when velocity is zero', () => {
      const result = evaluatePlayerAnimationState(0, 0, 'down');
      expect(result.state).toBe('idle');
      expect(result.direction).toBe('down');
      expect(result.animationKey).toBe('player-idle-down');
    });

    it('5. Returns walk animation key and updates facing when moving', () => {
      const resultRight = evaluatePlayerAnimationState(180, 0, 'down');
      expect(resultRight.state).toBe('walk');
      expect(resultRight.direction).toBe('right');
      expect(resultRight.animationKey).toBe('player-walk-right');

      const resultUp = evaluatePlayerAnimationState(0, -180, 'right');
      expect(resultUp.state).toBe('walk');
      expect(resultUp.direction).toBe('up');
      expect(resultUp.animationKey).toBe('player-walk-up');
    });

    it('6. Priority overrides: attack > hurt > defeat', () => {
      const defeat = evaluatePlayerAnimationState(100, 0, 'down', false, false, true);
      expect(defeat.state).toBe('defeat');
      expect(defeat.animationKey).toBe('player-defeat-right');

      const hurt = evaluatePlayerAnimationState(100, 0, 'down', false, true, false);
      expect(hurt.state).toBe('hurt');
      expect(hurt.animationKey).toBe('player-hurt-right');

      const attack = evaluatePlayerAnimationState(0, 0, 'up', true, false, false);
      expect(attack.state).toBe('attack');
      expect(attack.animationKey).toBe('player-attack-up');
    });
  });

  describe('evaluateMonsterAnimationState', () => {
    it('7. Maps monster movement and status to correct high-level animation states', () => {
      expect(evaluateMonsterAnimationState(false)).toBe('idle');
      expect(evaluateMonsterAnimationState(true)).toBe('walk');
      expect(evaluateMonsterAnimationState(false, true)).toBe('attack');
      expect(evaluateMonsterAnimationState(false, false, true)).toBe('hurt');
      expect(evaluateMonsterAnimationState(false, false, false, true)).toBe('defeat');
    });
  });
});
