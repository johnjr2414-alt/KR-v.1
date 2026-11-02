import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuestionTimer } from '../../src/questions/timer/QuestionTimer';

describe('QuestionTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with correct seconds remaining and progress', () => {
    const timer = new QuestionTimer({ durationSeconds: 10 });
    expect(timer.getSecondsRemaining()).toBe(10);
    expect(timer.getProgress()).toBe(1);
  });

  it('triggers onTick on start and during countdown', () => {
    const onTick = vi.fn();
    const timer = new QuestionTimer({
      durationSeconds: 5,
      intervalMs: 1000,
      onTick,
    });

    timer.start();
    expect(onTick).toHaveBeenCalledWith(5, 1);

    vi.advanceTimersByTime(2000);
    expect(timer.getSecondsRemaining()).toBe(3);
    expect(onTick).toHaveBeenCalledWith(3, 0.6);

    timer.stop();
  });

  it('emits onTimeout exactly once upon expiration', () => {
    const onTimeout = vi.fn();
    const timer = new QuestionTimer({
      durationSeconds: 2,
      intervalMs: 500,
      onTimeout,
    });

    timer.start();
    vi.advanceTimersByTime(3000);

    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(timer.getSecondsRemaining()).toBe(0);
    expect(timer.getProgress()).toBe(0);

    // Further time advance must not re-trigger timeout
    vi.advanceTimersByTime(2000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('stopping the timer pauses countdown and prevents timeout', () => {
    const onTimeout = vi.fn();
    const timer = new QuestionTimer({
      durationSeconds: 5,
      intervalMs: 1000,
      onTimeout,
    });

    timer.start();
    vi.advanceTimersByTime(2000);
    timer.stop();

    vi.advanceTimersByTime(10000);
    expect(onTimeout).not.toHaveBeenCalled();
    expect(timer.getSecondsRemaining()).toBe(3);
  });
});
