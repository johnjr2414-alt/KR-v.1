import { DEFAULT_INITIAL_PLAYER_DATA } from '../player/PlayerData';
import type { SaveData } from './StorageTypes';
import { SAVE_DATA_SCHEMA_VERSION } from './StorageTypes';
import { migrateSaveData, readSaveVersion } from './SaveMigrations';
import type { SaveDiagnosticsReport, SaveSectionStatus } from './SaveDiagnostics';
import {
  buildRecoveryUserMessage,
  createUnrecognizableSaveReport,
  isRecognizableSave,
  UNREADABLE_SAVE_MESSAGE,
} from './SaveDiagnostics';

/** Outcome of the recovery pass over a stored payload. */
export type SaveRecoveryStatus = 'intact' | 'repaired' | 'salvaged' | 'unreadable';

export interface SaveRecoveryResult {
  /**
   * - `intact`    — loaded without changes.
   * - `repaired`  — loaded after repairing damaged optional sections.
   * - `salvaged`  — the player record was unusable; defaults were applied while
   *                 other valid sections were preserved.
   * - `unreadable`— not a usable save payload at all.
   */
  status: SaveRecoveryStatus;
  data?: SaveData;
  report: SaveDiagnosticsReport;
  errors: string[];
  /** True when an older supported save was migrated forward. */
  migrated: boolean;
  fromVersion: number | null;
  toVersion: number;
  futureVersion: boolean;
}

interface SalvagedPayload {
  payload: Record<string, unknown>;
  /** Status to stamp on the `player` section. */
  action: Extract<SaveSectionStatus, 'repaired' | 'reset'>;
}

function createDefaultPlayerRecord(): Record<string, unknown> {
  return {
    id: 'player-1',
    name: 'Hero',
    ...DEFAULT_INITIAL_PLAYER_DATA,
    allocatedStats: { ...DEFAULT_INITIAL_PLAYER_DATA.allocatedStats },
  };
}

/**
 * Replaces only the unusable player record, leaving every other section in the
 * payload untouched so valid inventory, mastery, quests, etc. can be preserved.
 * Returns `null` when the player record is already valid and no salvage is needed.
 */
function salvagePlayerSection(source: Record<string, unknown>): SalvagedPayload | null {
  const player = source.player;

  if (!player || typeof player !== 'object' || Array.isArray(player)) {
    return {
      payload: { ...source, player: createDefaultPlayerRecord() },
      action: 'reset',
    };
  }

  const record = player as Record<string, unknown>;
  if (typeof record.name !== 'string' || !record.name.trim()) {
    return {
      payload: { ...source, player: { ...record, name: 'Hero' } },
      action: 'repaired',
    };
  }

  return null;
}

function withSalvagedPlayer(
  report: SaveDiagnosticsReport,
  action: SalvagedPayload['action'],
): SaveDiagnosticsReport {
  const sections = report.sections.map((entry) =>
    entry.section === 'player'
      ? { section: 'player' as const, status: action, reason: 'salvaged-player' }
      : entry,
  );
  if (!sections.some((entry) => entry.section === 'player')) {
    sections.unshift({ section: 'player', status: action, reason: 'salvaged-player' });
  }

  const recoveredSections = sections
    .filter((entry) => entry.status === 'repaired' || entry.status === 'reset')
    .map((entry) => entry.section);
  const failedSections = sections
    .filter((entry) => entry.status === 'failed')
    .map((entry) => entry.section);

  const next: SaveDiagnosticsReport = {
    ...report,
    sections,
    recoveredSections,
    failedSections,
    userMessage: null,
  };
  next.userMessage = buildRecoveryUserMessage(next);
  return next;
}

function unreadableResult(raw: unknown): SaveRecoveryResult {
  const fromVersion = readSaveVersion(raw);
  return {
    status: 'unreadable',
    report: createUnrecognizableSaveReport(fromVersion),
    errors: ['Save data is not a recognizable save payload'],
    migrated: false,
    fromVersion,
    toVersion: SAVE_DATA_SCHEMA_VERSION,
    futureVersion: fromVersion !== null && fromVersion > SAVE_DATA_SCHEMA_VERSION,
  };
}

/**
 * Loads a raw payload with progressive recovery (Phase 28.3).
 *
 * 1. Run the strict migration + validation path.
 * 2. If that fails but the payload looks like a save, repair **only** the player
 *    record (the sole section whose failure blocks loading) and retry, keeping
 *    every other section intact.
 * 3. Only if the payload is not recognizable as a save does recovery give up.
 *
 * The original raw payload is never mutated.
 */
export function recoverSaveData(raw: unknown): SaveRecoveryResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return unreadableResult(raw);
  }

  const strict = migrateSaveData(raw);
  if (strict.success && strict.data) {
    return {
      status: strict.diagnostics.recoveredSections.length > 0 ? 'repaired' : 'intact',
      data: strict.data,
      report: strict.diagnostics,
      errors: strict.errors,
      migrated: strict.migrated,
      fromVersion: strict.fromVersion,
      toVersion: strict.toVersion,
      futureVersion: strict.futureVersion,
    };
  }

  if (!isRecognizableSave(raw)) {
    return unreadableResult(raw);
  }

  const salvage = salvagePlayerSection(raw as Record<string, unknown>);
  if (!salvage) {
    return {
      status: 'unreadable',
      report: { ...strict.diagnostics, userMessage: UNREADABLE_SAVE_MESSAGE },
      errors: strict.errors,
      migrated: strict.migrated,
      fromVersion: strict.fromVersion,
      toVersion: strict.toVersion,
      futureVersion: strict.futureVersion,
    };
  }

  const retry = migrateSaveData(salvage.payload);
  if (!retry.success || !retry.data) {
    return {
      status: 'unreadable',
      report: { ...retry.diagnostics, userMessage: UNREADABLE_SAVE_MESSAGE },
      errors: retry.errors,
      migrated: retry.migrated,
      fromVersion: retry.fromVersion,
      toVersion: retry.toVersion,
      futureVersion: retry.futureVersion,
    };
  }

  return {
    status: 'salvaged',
    data: retry.data,
    report: withSalvagedPlayer(retry.diagnostics, salvage.action),
    errors: retry.errors,
    migrated: retry.migrated,
    fromVersion: retry.fromVersion,
    toVersion: retry.toVersion,
    futureVersion: retry.futureVersion,
  };
}
