import type { SaveData } from './StorageTypes';
import { SAVE_DATA_SCHEMA_VERSION } from './StorageTypes';
import { migrateSaveData } from './SaveMigrations';

/**
 * Phase 28.2 — Save export/import (backup, restore, and portable files).
 *
 * This module is **headless and pure**: it serializes a save to a portable,
 * versioned JSON envelope and parses/validates an imported file. It performs no
 * I/O and never executes imported content — imports are only ever read through
 * `JSON.parse` and passed to the strict save validator.
 *
 * Imported files carry explicit version information:
 * - `format` / `formatVersion`: identifies the export container itself.
 * - `schemaVersion`: the {@link SaveData} schema version of the payload, so an
 *   older file can be migrated forward and an unknown future file can be
 *   detected and handled safely.
 */

/** Magic identifier written into every exported file. */
export const SAVE_EXPORT_FORMAT = 'knowledge-realms-save';

/** Version of the export *container* (not the save schema). */
export const SAVE_EXPORT_FORMAT_VERSION = 1;

/** Portable, versioned wrapper around a save payload. */
export interface SaveExportEnvelope {
  format: typeof SAVE_EXPORT_FORMAT;
  formatVersion: number;
  /** Schema version of `data` at export time. */
  schemaVersion: number;
  exportedAt: number;
  /** Non-sensitive generator metadata (no secrets). */
  generator: {
    name: string;
    version: string;
  };
  data: SaveData;
}

export interface SaveImportResult {
  /** True when the file parsed, migrated, and validated successfully. */
  success: boolean;
  /** Migrated + validated save data (present only when `success`). */
  data?: SaveData;
  /** Schema version read from the file (falls back to the current version). */
  schemaVersion: number;
  /** True when a forward migration was applied. */
  migrated: boolean;
  /** True when the file was written by a newer, unknown schema version. */
  futureVersion: boolean;
  errors: string[];
}

export interface CreateSaveExportOptions {
  now?: number;
  appName?: string;
  appVersion?: string;
}

/** Wraps a save payload in a portable, versioned export envelope. */
export function createSaveExport(
  save: SaveData,
  options: CreateSaveExportOptions = {},
): SaveExportEnvelope {
  return {
    format: SAVE_EXPORT_FORMAT,
    formatVersion: SAVE_EXPORT_FORMAT_VERSION,
    schemaVersion: typeof save.version === 'number' ? save.version : SAVE_DATA_SCHEMA_VERSION,
    exportedAt: options.now ?? Date.now(),
    generator: {
      name: options.appName ?? 'Knowledge Realms',
      version: options.appVersion ?? 'unknown',
    },
    data: save,
  };
}

/** Serializes an export envelope to a JSON string. */
export function serializeSaveExport(envelope: SaveExportEnvelope): string {
  return JSON.stringify(envelope);
}

/** Convenience: wraps + serializes a save in one call. */
export function exportSaveToString(
  save: SaveData,
  options: CreateSaveExportOptions = {},
): string {
  return serializeSaveExport(createSaveExport(save, options));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Parses and strictly validates an imported file.
 *
 * Accepts either an export envelope (preferred) or a bare {@link SaveData}
 * object (legacy). Execution-free: the input is never evaluated; only known
 * fields are read and the payload is passed through the save validator.
 */
export function parseSaveImport(input: string | unknown): SaveImportResult {
  const fail = (errors: string[], schemaVersion = SAVE_DATA_SCHEMA_VERSION): SaveImportResult => ({
    success: false,
    schemaVersion,
    migrated: false,
    futureVersion: false,
    errors,
  });

  let parsed: unknown = input;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch {
      return fail(['File is not valid JSON']);
    }
  }

  if (!isRecord(parsed)) {
    return fail(['File is not a valid save object']);
  }

  // Envelope path: validate the container before touching the payload.
  if ('format' in parsed) {
    if (parsed.format !== SAVE_EXPORT_FORMAT) {
      return fail([`Unrecognized file format: ${String(parsed.format)}`]);
    }
    const formatVersion = parsed.formatVersion;
    if (typeof formatVersion !== 'number' || !Number.isInteger(formatVersion) || formatVersion < 1) {
      return fail(['Missing or invalid export format version']);
    }
    if (formatVersion > SAVE_EXPORT_FORMAT_VERSION) {
      return fail([
        `Unsupported export format version ${formatVersion} (this build supports up to ${SAVE_EXPORT_FORMAT_VERSION})`,
      ]);
    }
    if (!('data' in parsed) || !isRecord(parsed.data)) {
      return fail(['Export file does not contain save data']);
    }
    parsed = parsed.data;
  }

  // From here `parsed` is a candidate save payload.
  const declaredVersion =
    typeof (parsed as { version?: unknown }).version === 'number'
      ? ((parsed as { version: number }).version)
      : SAVE_DATA_SCHEMA_VERSION;

  const migration = migrateSaveData(parsed);
  if (!migration.success || !migration.data) {
    return {
      success: false,
      schemaVersion: declaredVersion,
      migrated: migration.migrated,
      futureVersion: migration.futureVersion,
      errors: migration.errors.length > 0 ? migration.errors : ['Imported save failed validation'],
    };
  }

  return {
    success: true,
    data: migration.data,
    schemaVersion: declaredVersion,
    migrated: migration.migrated,
    futureVersion: migration.futureVersion,
    errors: [],
  };
}
