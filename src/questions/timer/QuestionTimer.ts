export interface QuestionTimerOptions {
  /** Duration in seconds. */
  durationSeconds: number;
  /** Tick callback invoked every update with seconds remaining. */
  onTick?: (secondsRemaining: number, progressRatio: number) => void;
  /** Timeout callback invoked exactly once when timer reaches 0. */
  onTimeout?: () => void;
  /** Tick interval in milliseconds (defaults to 100ms for smooth progress animation). */
  intervalMs?: number;
}

/**
 * Headless countdown timer for questions.
 * Handles timeouts safely ensuring timeout fires at most once.
 */
export class QuestionTimer {
  private durationMs: number;
  private remainingMs: number;
  private intervalMs: number;
  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private hasTimedOut = false;
  private isRunning = false;
  private onTick?: (secondsRemaining: number, progressRatio: number) => void;
  private onTimeout?: () => void;

  constructor(options: QuestionTimerOptions) {
    this.durationMs = Math.max(1, options.durationSeconds) * 1000;
    this.remainingMs = this.durationMs;
    this.intervalMs = options.intervalMs ?? 100;
    this.onTick = options.onTick;
    this.onTimeout = options.onTimeout;
  }

  /** Starts the countdown. No-op if already running or timed out. */
  start(): void {
    if (this.isRunning || this.hasTimedOut) return;
    this.isRunning = true;

    this.emitTick();

    this.timerHandle = setInterval(() => {
      this.remainingMs = Math.max(0, this.remainingMs - this.intervalMs);
      this.emitTick();

      if (this.remainingMs <= 0) {
        this.stop();
        this.triggerTimeout();
      }
    }, this.intervalMs);
  }

  /** Stops / pauses the timer. */
  stop(): void {
    if (this.timerHandle !== null) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
    this.isRunning = false;
  }

  /** Resets timer with optional new duration. */
  reset(durationSeconds?: number): void {
    this.stop();
    if (durationSeconds !== undefined) {
      this.durationMs = Math.max(1, durationSeconds) * 1000;
    }
    this.remainingMs = this.durationMs;
    this.hasTimedOut = false;
    this.emitTick();
  }

  /** Gets remaining seconds (rounded up to nearest whole integer). */
  getSecondsRemaining(): number {
    return Math.ceil(this.remainingMs / 1000);
  }

  /** Gets normalized remaining progress (1.0 down to 0.0). */
  getProgress(): number {
    if (this.durationMs <= 0) return 0;
    return Math.max(0, Math.min(1, this.remainingMs / this.durationMs));
  }

  private emitTick(): void {
    if (this.onTick) {
      this.onTick(this.getSecondsRemaining(), this.getProgress());
    }
  }

  private triggerTimeout(): void {
    if (this.hasTimedOut) return;
    this.hasTimedOut = true;
    if (this.onTimeout) {
      this.onTimeout();
    }
  }
}
