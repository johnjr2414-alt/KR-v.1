import type { SaveData } from './StorageTypes';
import { SAVE_DATA_SCHEMA_VERSION } from './StorageTypes';
import { validateSaveData } from './SaveDataValidator';
import type { SaveDiagnosticsReport } from './SaveDiagnostics';
import { createUnrecognizableSaveReport, isRecognizableSave } from './SaveDiagnostics';

/**
 * Phase 28.1 — Centralized save schema versioning and migration chain.
 *
 * The save schema has historically grown **additively**: every field added
 * since v1 is optional and is repaired by the sanitizer in
 * `SaveDataValidator.validateSaveData`. On load we therefore:
 *
 *   1. Normalise the stored version.
 *   2. Run the ordered migration chain up to `SAVE_DATA_SCHEMA_VERSION`.
 *   3. Validate the migrated payload.
 *
 * Because the individual schema changes so far have been additive, each step in
 * the chain preserves all existing data and simply stamps the new version. Any
 * future **non-additive** change (a renamed/moved/removed field) should be
 * implemented as a real transform inside the corresponding `migrate` function
 * rather than a no-op.
 *
 * Migrations never reset player data: on failure the caller keeps the original
 * payload untouched (the storage layer also writes a recovery copy before a
 * migrated save would be used — see `IndexedDBStorageService.loadGame`).
 */

/** Earliest save schema version this build can migrate from. */
export const EARLIEST_SUPPORTED_SAVE_VERSION = 1;

export interface SaveMigration {
  /** Source version this step upgrades from. */
  readonly from: number;
  /** Version this step upgrades to (always `from + 1`). */
  readonly to: number;
  /** Human-readable note about what changed in this version. */
  readonly description: string;
  /** Up-converts a raw save payload. Must preserve all valid data. */
  migrate(save: Record<string, unknown>): Record<string, unknown>;
}

/**
 * Ordered, sequential migration steps. Each entry upgrades exactly one version
 * (`from` → `from + 1`), so the chain must remain contiguous from
 * `EARLIEST_SUPPORTED_SAVE_VERSION` to `SAVE_DATA_SCHEMA_VERSION`.
 */
export const SAVE_MIGRATIONS: readonly SaveMigration[] = [
  {
    from: 1,
    to: 2,
    description: 'Additive: currency/gold persistence became part of the save model.',
    migrate: (save) => save,
  },
  {
    from: 2,
    to: 3,
    description: 'Additive: skills and stat-allocation fields introduced.',
    migrate: (save) => save,
  },
  {
    from: 3,
    to: 4,
    description: 'Additive: gathering state (Phase 27.2) introduced.',
    migrate: (save) => save,
  },
  {
    from: 4,
    to: 5,
    description: 'Additive: career/profession state (Phase 27.1) introduced.',
    migrate: (save) => save,
  },
  {
    from: 5,
    to: 6,
    description: 'Additive: professional assignment state (Phase 27.3) introduced.',
    migrate: (save) => save,
  },
];

export interface SaveMigrationResult {
  /** True when the payload migrated + validated and `data` is present. */
  success: boolean;
  /** Migrated and validated save data (present only when `success`). */
  data?: SaveData;
  /** Version the payload was read as. */
  fromVersion: number;
  /** Version the payload was migrated to (`SAVE_DATA_SCHEMA_VERSION`). */
  toVersion: number;
  /** True when a migration actually ran (i.e. `fromVersion` was older). */
  migrated: boolean;
  /** True when the payload was written by a newer, unknown schema version. */
  futureVersion: boolean;
  /** Validation / migration errors (empty on success). */
  errors: string[];
  /** Phase 28.3 — per-section outcome (content-free). */
  diagnostics: SaveDiagnosticsReport;
}

/** Report used when the migration chain itself cannot bridge two versions. */
function migrationFailureReport(raw: unknown, fromVersion: number): SaveDiagnosticsReport {
  return {
    sourceSchemaVersion: fromVersion,
    currentSchemaVersion: SAVE_DATA_SCHEMA_VERSION,
    sections: [{ section: 'version', status: 'failed', reason: 'migration-gap' }],
    recoveredSections: [],
    failedSections: ['version'],
    recognizable: isRecognizableSave(raw),
    userMessage:
      'This save was created with data this version cannot upgrade. Your original save was kept and a new game was started.',
  };
}

/** Reads a stored schema version, or `null` when absent/invalid. */
export function readSaveVersion(raw: unknown): number | null {
  if (!raw || typeof raw !== 'object') return null;
  const version = (raw as { version?: unknown }).version;
  return typeof version === 'number' && Number.isInteger(version) && version >= 1 ? version : null;
}

/**
 * Migrates a raw save payload to the current schema version and validates it.
 *
 * - Older supported versions run the sequential migration chain, then validate.
 * - Unknown **future** versions are never migrated; a best-effort validation is
 *   attempted so valid player data is preserved (flagged via `futureVersion`).
 * - Malformed input or a failed validation returns `success: false`; the caller
 *   must not discard the original payload.
 */
export function migrateSaveData(raw: unknown): SaveMigrationResult {
  const toVersion = SAVE_DATA_SCHEMA_VERSION;

  if (!raw || typeof raw !== 'object') {
    return {
      success: false,
      fromVersion: EARLIEST_SUPPORTED_SAVE_VERSION,
      toVersion,
      migrated: false,
      futureVersion: false,
      errors: ['Save data is null or not an object'],
      diagnostics: createUnrecognizableSaveReport(null),
    };
  }

  const source = raw as Record<string, unknown>;
  const fromVersion = readSaveVersion(source) ?? EARLIEST_SUPPORTED_SAVE_VERSION;

  // Unknown future version: do not migrate; best-effort validate and keep valid data.
  if (fromVersion > toVersion) {
    const validation = validateSaveData(source);
    if (!validation.isValid || !validation.data) {
      return {
        success: false,
        fromVersion,
        toVersion,
        migrated: false,
        futureVersion: true,
        errors: validation.errors,
        diagnostics: validation.diagnostics ?? createUnrecognizableSaveReport(fromVersion),
      };
    }
    return {
      success: true,
      data: validation.data,
      fromVersion,
      toVersion,
      migrated: false,
      futureVersion: true,
      errors: [],
      diagnostics: validation.diagnostics ?? createUnrecognizableSaveReport(fromVersion),
    };
  }

  // Run the chain for every step from `fromVersion` up to the current version.
  const chain = SAVE_MIGRATIONS.filter((m) => m.from >= fromVersion && m.to <= toVersion).sort(
    (a, b) => a.from - b.from,
  );

  let payload: Record<string, unknown> = { ...source };
  let expected = fromVersion;
  for (const step of chain) {
    if (step.from !== expected) {
      return {
        success: false,
        fromVersion,
        toVersion,
        migrated: false,
        futureVersion: false,
        errors: [`Missing migration step from version ${expected}`],
        diagnostics: migrationFailureReport(raw, fromVersion),
      };
    }
    payload = { ...step.migrate(payload), version: step.to };
    expected = step.to;
  }

  if (expected !== toVersion) {
    return {
      success: false,
      fromVersion,
      toVersion,
      migrated: false,
      futureVersion: false,
      errors: [`No migration path from version ${fromVersion} to ${toVersion}`],
      diagnostics: migrationFailureReport(raw, fromVersion),
    };
  }

  const validation = validateSaveData({ ...payload, version: toVersion });
  const migrated = fromVersion !== toVersion;
  if (!validation.isValid || !validation.data) {
    return {
      success: false,
      fromVersion,
      toVersion,
      migrated,
      futureVersion: false,
      errors: validation.errors,
      diagnostics: validation.diagnostics ?? createUnrecognizableSaveReport(fromVersion),
    };
  }

  return {
    success: true,
    data: validation.data,
    fromVersion,
    toVersion,
    migrated,
    futureVersion: false,
    errors: [],
    diagnostics: validation.diagnostics ?? createUnrecognizableSaveReport(fromVersion),
  };
}
