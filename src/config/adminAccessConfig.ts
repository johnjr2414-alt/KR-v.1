/**
 * Local Super Admin gate configuration.
 *
 * This gate is a usability safeguard, not authentication. Anything shipped to
 * the browser can be inspected or bypassed, so it only prevents accidental
 * access from the normal user flow. Real security requires server-side
 * authentication and authorization (see docs/PHASE_28_4_IMPLEMENTATION_REPORT.md).
 *
 * No passcode is hardcoded. An operator can supply the SHA-256 hex digest of a
 * locally chosen passcode through `VITE_ADMIN_PASSCODE_HASH` at build time.
 * When that is absent, the gate requires typing an explicit acknowledgement
 * phrase instead.
 */

const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;

export interface AdminAccessConfig {
  /** SHA-256 hex digest of the local passcode, or null when unconfigured. */
  passcodeHash: string | null;
  /** Failed attempts allowed before a cooldown lock. */
  maxAttempts: number;
  /** Lock duration after too many failed attempts, in milliseconds. */
  cooldownMs: number;
  /** Phrase typed when no passcode hash is configured. */
  acknowledgementPhrase: string;
}

export const DEFAULT_ADMIN_ACCESS_CONFIG: AdminAccessConfig = {
  passcodeHash: null,
  maxAttempts: 5,
  cooldownMs: 30_000,
  acknowledgementPhrase: 'LOCAL ADMIN',
};

/** Shown on the gate and inside the admin dashboard. */
export const ADMIN_LOCAL_SECURITY_WARNING =
  'Local-only protection: this admin screen is not server-authenticated. Anyone with access to this browser can inspect or modify it. It prevents accidental access, not deliberate tampering.';

/** Normalizes a passcode hash, returning null when it is not a SHA-256 digest. */
export function normalizePasscodeHash(value: string | null | undefined): string | null {
  const candidate = value?.trim().toLowerCase() ?? '';
  return SHA256_HEX_PATTERN.test(candidate) ? candidate : null;
}

/**
 * Builds the effective config. `overrides` win over the build-time hash, and
 * an explicitly supplied `passcodeHash: null` forces acknowledgement mode.
 */
export function resolveAdminAccessConfig(
  envHash?: string | null,
  overrides: Partial<AdminAccessConfig> = {},
): AdminAccessConfig {
  const rawHash = overrides.passcodeHash !== undefined ? overrides.passcodeHash : envHash;
  return {
    ...DEFAULT_ADMIN_ACCESS_CONFIG,
    ...overrides,
    passcodeHash: normalizePasscodeHash(rawHash),
  };
}

/** Reads the optional build-time passcode hash; never touches browser storage. */
export function readAdminAccessConfigFromEnv(): AdminAccessConfig {
  return resolveAdminAccessConfig(import.meta.env.VITE_ADMIN_PASSCODE_HASH as string | undefined);
}
