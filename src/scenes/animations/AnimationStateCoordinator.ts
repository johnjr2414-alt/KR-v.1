/**
 * Animation direction representing 4 cardinal headings.
 */
export type Direction = 'down' | 'up' | 'left' | 'right';

/**
 * High-level entity animation states.
 */
export type AnimationState =
  | 'idle'
  | 'walk'
  | 'attack'
  | 'hurt'
  | 'defeat';

/**
 * Result of evaluating entity movement and actions into an animation state.
 */
export interface AnimationEvaluationResult {
  state: AnimationState;
  direction: Direction;
  animationKey: string;
}

/**
 * Pure function to determine directional heading from velocity.
 * Preserves previous direction when velocity is zero.
 */
export function resolveDirection(
  vx: number,
  vy: number,
  previousDirection: Direction = 'down',
): Direction {
  if (vx === 0 && vy === 0) {
    return previousDirection;
  }

  // Prioritize primary axis with larger absolute velocity
  if (Math.abs(vx) > Math.abs(vy)) {
    return vx > 0 ? 'right' : 'left';
  } else if (Math.abs(vy) > 0) {
    return vy > 0 ? 'down' : 'up';
  }

  return previousDirection;
}

/**
 * Pure function to evaluate player movement velocity into an animation state.
 */
export function evaluatePlayerAnimationState(
  vx: number,
  vy: number,
  currentDirection: Direction,
  isAttacking = false,
  isHurt = false,
  isDefeated = false,
): AnimationEvaluationResult {
  const direction = resolveDirection(vx, vy, currentDirection);

  if (isDefeated) {
    return {
      state: 'defeat',
      direction,
      animationKey: `player-defeat-${direction}`,
    };
  }

  if (isHurt) {
    return {
      state: 'hurt',
      direction,
      animationKey: `player-hurt-${direction}`,
    };
  }

  if (isAttacking) {
    return {
      state: 'attack',
      direction,
      animationKey: `player-attack-${direction}`,
    };
  }

  const isMoving = vx !== 0 || vy !== 0;
  const state: AnimationState = isMoving ? 'walk' : 'idle';

  return {
    state,
    direction,
    animationKey: `player-${state}-${direction}`,
  };
}

/**
 * Pure function to evaluate monster state.
 */
export function evaluateMonsterAnimationState(
  isMoving: boolean,
  isAttacking = false,
  isHurt = false,
  isDefeated = false,
): AnimationState {
  if (isDefeated) return 'defeat';
  if (isHurt) return 'hurt';
  if (isAttacking) return 'attack';
  return isMoving ? 'walk' : 'idle';
}
