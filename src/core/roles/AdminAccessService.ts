import {
  DEFAULT_ADMIN_ACCESS_CONFIG,
  type AdminAccessConfig,
} from '../../config/adminAccessConfig';

export type AdminGateMode = 'acknowledgement' | 'passcode';

export type AdminGateFailureReason = 'empty' | 'incorrect' | 'locked' | 'unavailable';

export interface AdminGateDecision {
  granted: boolean;
  mode: AdminGateMode;
  reason?: AdminGateFailureReason;
  remainingAttempts: number;
  lockedUntil: number | null;
}

export interface AdminAccessServiceOptions {
  config?: AdminAccessConfig;
  /** Injectable for tests; defaults to SHA-256 via Web Crypto. */
  hashPasscode?: (input: string) => Promise<string>;
  /** Injectable clock, in milliseconds. */
  now?: () => number;
}

/** Hashes an input as a lowercase SHA-256 hex digest using Web Crypto. */
export async function hashSha256Hex(value: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('Web Crypto is unavailable');
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Headless local admin gate (Phase 28.4).
 *
 * Two modes:
 *  - `passcode`: a SHA-256 hash is configured; user input must match it.
 *  - `acknowledgement`: no hash is configured; the user must type the exact
 *    acknowledgement phrase, making the lack of real protection explicit.
 *
 * Failed attempts are counted and trigger a cooldown lock. This state lives in
 * memory only — reloading the page clears it, which is appropriate for a
 * local-only, non-authenticating safeguard.
 */
export class AdminAccessService {
  private readonly config: AdminAccessConfig;
  private readonly hashPasscode: (input: string) => Promise<string>;
  private readonly now: () => number;
  private failures = 0;
  private lockedUntil: number | null = null;

  constructor(options: AdminAccessServiceOptions = {}) {
    this.config = options.config ?? DEFAULT_ADMIN_ACCESS_CONFIG;
    this.hashPasscode = options.hashPasscode ?? hashSha256Hex;
    this.now = options.now ?? Date.now;
  }

  getMode(): AdminGateMode {
    return this.config.passcodeHash !== null ? 'passcode' : 'acknowledgement';
  }

  getAcknowledgementPhrase(): string {
    return this.config.acknowledgementPhrase;
  }

  getMaxAttempts(): number {
    return this.config.maxAttempts;
  }

  getRemainingAttempts(): number {
    this.refreshLock();
    return this.remainingAttempts();
  }

  getLockedUntil(): number | null {
    this.refreshLock();
    return this.lockedUntil;
  }

  isLocked(): boolean {
    return this.getLockedUntil() !== null;
  }

  async submit(input: string): Promise<AdminGateDecision> {
    this.refreshLock();

    if (this.lockedUntil !== null) {
      return this.decision(false, 'locked');
    }

    const trimmed = input.trim();
    if (trimmed.length === 0) {
      return this.decision(false, 'empty');
    }

    if (this.config.passcodeHash === null) {
      if (trimmed === this.config.acknowledgementPhrase) {
        this.reset();
        return this.decision(true);
      }
      return this.registerFailure();
    }

    let candidateHash: string;
    try {
      candidateHash = (await this.hashPasscode(trimmed)).trim().toLowerCase();
    } catch {
      return this.decision(false, 'unavailable');
    }

    if (candidateHash === this.config.passcodeHash) {
      this.reset();
      return this.decision(true);
    }

    return this.registerFailure();
  }

  /** Clears failed attempts and any active lock. */
  reset(): void {
    this.failures = 0;
    this.lockedUntil = null;
  }

  private registerFailure(): AdminGateDecision {
    this.failures += 1;
    if (this.failures >= this.config.maxAttempts) {
      this.lockedUntil = this.now() + this.config.cooldownMs;
    }
    return this.decision(false, 'incorrect');
  }

  private refreshLock(): void {
    if (this.lockedUntil !== null && this.now() >= this.lockedUntil) {
      this.lockedUntil = null;
      this.failures = 0;
    }
  }

  private remainingAttempts(): number {
    if (this.lockedUntil !== null) return 0;
    return Math.max(0, this.config.maxAttempts - this.failures);
  }

  private decision(granted: boolean, reason?: AdminGateFailureReason): AdminGateDecision {
    return {
      granted,
      mode: this.getMode(),
      ...(reason ? { reason } : {}),
      remainingAttempts: granted ? this.config.maxAttempts : this.remainingAttempts(),
      lockedUntil: this.lockedUntil,
    };
  }
}
