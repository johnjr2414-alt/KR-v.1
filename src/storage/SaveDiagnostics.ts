import { SAVE_DATA_SCHEMA_VERSION } from './StorageTypes';

/**
 * Phase 28.3 — Save corruption diagnostics and recovery.
 *
 * This module holds the shared diagnostics vocabulary and the pure, content-free
 * helpers used by the validator, the recovery orchestrator, and the storage
 * layer. It deliberately contains no save-data reads: every log entry describes
 * *which section* was damaged, never the player's name, items, answers, or any
 * other stored value.
 */

/** Every persisted top-level section that can be diagnosed. */
export type SaveSectionId =
  | 'version'
  | 'player'
  | 'mastery'
  | 'inventory'
  | 'quests'
  | 'skills'
  | 'bank'
  | 'currency'
  | 'analytics'
  | 'gathering'
  | 'careers'
  | 'assignments'
  | 'settings';

/**
 * Per-section outcome:
 * - `intact`  — read as-is.
 * - `repaired` — present but some values were invalid and replaced.
 * - `reset`   — present but unusable as a whole; defaults were restored.
 * - `missing` — absent (an older save); defaults were applied silently.
 * - `failed`  — could not be preserved at all.
 */
export type SaveSectionStatus = 'intact' | 'repaired' | 'reset' | 'missing' | 'failed';

export interface SectionDiagnostic {
  section: SaveSectionId;
  status: SaveSectionStatus;
  /** Machine-readable, content-free reason code (e.g. `invalid-slots`). */
  reason?: string;
}

export interface SaveDiagnosticsReport {
  /** Version read from the raw payload, or `null` when absent/invalid. */
  sourceSchemaVersion: number | null;
  /** Version this build writes. */
  currentSchemaVersion: number;
  /** One entry per inspected section. */
  sections: SectionDiagnostic[];
  /** Sections whose defaults were restored (`repaired` or `reset`). */
  recoveredSections: SaveSectionId[];
  /** Sections that could not be preserved (`failed`). */
  failedSections: SaveSectionId[];
  /** False when the payload is not recognisable as a save at all. */
  recognizable: boolean;
  /** Content-free, player-facing summary; `null` when nothing was repaired. */
  userMessage: string | null;
}

export type RecoveryEvent =
  | 'save-migrated'
  | 'save-repaired'
  | 'save-salvaged'
  | 'save-unreadable';

/**
 * A bounded, content-free record of a recovery event. It intentionally stores
 * only section identifiers, status lists, versions, and timestamps.
 */
export interface RecoveryLogEntry {
  at: number;
  event: RecoveryEvent;
  sourceSchemaVersion: number | null;
  currentSchemaVersion: number;
  recoveredSections: SaveSectionId[];
  failedSections: SaveSectionId[];
  /** True when the original raw payload was kept for manual recovery. */
  recoveryCopySaved: boolean;
  /** Consecutive identical events are collapsed into one entry. */
  occurrences: number;
}

export const MAX_RECOVERY_LOG_ENTRIES = 20;

export const UNREADABLE_SAVE_MESSAGE =
  'Your save file appears to be damaged and could not be read. A new game was started and the damaged data was kept for recovery where possible.';

const SECTION_LABELS: Record<SaveSectionId, string> = {
  version: 'save version',
  player: 'player data',
  mastery: 'subject mastery',
  inventory: 'inventory',
  quests: 'quests',
  skills: 'skills',
  bank: 'bank',
  currency: 'gold',
  analytics: 'learning analytics',
  gathering: 'gathering',
  careers: 'careers',
  assignments: 'assignments',
  settings: 'settings',
};

/** Sections that mark an object as a save payload rather than unrelated data. */
export const RECOGNIZED_SAVE_SECTIONS: readonly SaveSectionId[] = [
  'player',
  'mastery',
  'inventory',
  'quests',
  'skills',
  'bank',
  'currency',
  'analytics',
  'gathering',
  'careers',
  'assignments',
  'settings',
];

export function isRecognizableSave(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const source = raw as Record<string, unknown>;
  return RECOGNIZED_SAVE_SECTIONS.some((section) => section in source);
}

/**
 * Builds a content-free, player-facing message from a diagnostics report.
 * Returns `null` when nothing was damaged (silent success).
 */
export function buildRecoveryUserMessage(
  report: Pick<SaveDiagnosticsReport, 'recoveredSections' | 'failedSections'>,
): string | null {
  if (report.failedSections.includes('player')) {
    return 'Player data was damaged and has been restored with defaults. Other valid save data was kept where possible; some progress may have been reset.';
  }

  const labels = report.recoveredSections
    .filter((section) => section !== 'version')
    .map((section) => SECTION_LABELS[section]);

  if (labels.length === 0) {
    return null;
  }

  return `Your save was repaired so it could load. Defaults were restored for: ${labels.join(
    ', ',
  )}. Some progress in those areas may have been reset.`;
}

/** Report for input that is not a save payload at all. */
export function createUnrecognizableSaveReport(
  sourceSchemaVersion: number | null = null,
): SaveDiagnosticsReport {
  return {
    sourceSchemaVersion,
    currentSchemaVersion: SAVE_DATA_SCHEMA_VERSION,
    sections: [],
    recoveredSections: [],
    failedSections: [],
    recognizable: false,
    userMessage: UNREADABLE_SAVE_MESSAGE,
  };
}

export interface RecoveryLogSource {
  event: RecoveryEvent;
  sourceSchemaVersion: number | null;
  currentSchemaVersion: number;
  report: SaveDiagnosticsReport;
  recoveryCopySaved: boolean;
}

/** Creates a log entry; contains no raw save values. */
export function createRecoveryLogEntry(source: RecoveryLogSource): RecoveryLogEntry {
  return {
    at: Date.now(),
    event: source.event,
    sourceSchemaVersion: source.sourceSchemaVersion,
    currentSchemaVersion: source.currentSchemaVersion,
    recoveredSections: [...source.report.recoveredSections],
    failedSections: [...source.report.failedSections],
    recoveryCopySaved: source.recoveryCopySaved,
    occurrences: 1,
  };
}

function sameSectionList(a: readonly SaveSectionId[], b: readonly SaveSectionId[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/**
 * Appends an entry to a bounded recovery log. Repeating the identical event
 * bumps `occurrences` instead of growing the log, so a persistent problem can
 * never create an endlessly growing history.
 */
export function appendRecoveryLogEntry(
  log: readonly RecoveryLogEntry[],
  entry: RecoveryLogEntry,
): RecoveryLogEntry[] {
  const next = log.map((item) => ({
    ...item,
    recoveredSections: [...item.recoveredSections],
    failedSections: [...item.failedSections],
  }));

  const previous = next[next.length - 1];
  if (
    previous &&
    previous.event === entry.event &&
    previous.sourceSchemaVersion === entry.sourceSchemaVersion &&
    previous.currentSchemaVersion === entry.currentSchemaVersion &&
    previous.recoveryCopySaved === entry.recoveryCopySaved &&
    sameSectionList(previous.recoveredSections, entry.recoveredSections) &&
    sameSectionList(previous.failedSections, entry.failedSections)
  ) {
    previous.occurrences += 1;
    previous.at = entry.at;
    return next;
  }

  next.push(entry);
  return next.length > MAX_RECOVERY_LOG_ENTRIES
    ? next.slice(next.length - MAX_RECOVERY_LOG_ENTRIES)
    : next;
}
