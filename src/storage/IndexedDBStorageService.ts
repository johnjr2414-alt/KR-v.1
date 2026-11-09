import type {
  StorageService,
  SaveData,
  GameSettings,
  SaveSlotInfo,
  RestoreResult,
  SaveLoadResult,
} from './StorageTypes';
import { validateSaveData, validateGameSettings } from './SaveDataValidator';
import { recoverSaveData, type SaveRecoveryStatus } from './SaveRecovery';
import type { RecoveryEvent, RecoveryLogEntry } from './SaveDiagnostics';
import {
  appendRecoveryLogEntry,
  createRecoveryLogEntry,
  MAX_RECOVERY_LOG_ENTRIES,
} from './SaveDiagnostics';
import { DEFAULT_GAME_SETTINGS, SAVE_SLOT_IDS } from './StorageTypes';

const DB_NAME = 'knowledge-realms-save';
const DB_VERSION = 1;
const SAVE_STORE = 'game-save';
const SETTINGS_STORE = 'settings';
const PRIMARY_SAVE_KEY = 'active-profile';
const SETTINGS_KEY = 'user-settings';
/** Pre-migration copy of the raw payload, kept before a legacy save is used. */
const MIGRATION_BACKUP_KEY = 'migration-backup';
/** Previous active save, kept before a destructive restore. */
const BACKUP_KEY = 'backup';
/** Damaged-but-recognizable payload kept before recovery replaces it (Phase 28.3). */
const LOAD_RECOVERY_KEY = 'load-recovery';
/** Bounded, content-free diagnostics history (Phase 28.3). */
const RECOVERY_LOG_KEY = 'recovery-log';

/** Storage key for a named manual save slot. */
function slotKey(slotId: string): string {
  return `slot:${slotId}`;
}

function recoveryEventFor(status: SaveRecoveryStatus, migrated: boolean): RecoveryEvent {
  switch (status) {
    case 'repaired':
      return 'save-repaired';
    case 'salvaged':
      return 'save-salvaged';
    case 'unreadable':
      return 'save-unreadable';
    default:
      return migrated ? 'save-migrated' : 'save-repaired';
  }
}

function cloneRecoveryLog(log: readonly RecoveryLogEntry[]): RecoveryLogEntry[] {
  return log.map((entry) => ({
    ...entry,
    recoveredSections: [...entry.recoveredSections],
    failedSections: [...entry.failedSections],
  }));
}

/** Builds lightweight slot metadata from a raw stored payload. */
function toSlotInfo(slotId: string, raw: unknown): SaveSlotInfo {
  if (!raw || typeof raw !== 'object') return { slotId, exists: false };
  const save = raw as Partial<SaveData>;
  return {
    slotId,
    exists: true,
    playerName: save.player?.name,
    level: save.player?.level,
    schemaVersion: typeof save.version === 'number' ? save.version : undefined,
    updatedAt: typeof save.updatedAt === 'number' ? save.updatedAt : undefined,
  };
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new DOMException('Transaction aborted'));
  });
}

/**
 * Production IndexedDB implementation of StorageService.
 * Works seamlessly in modern browsers with offline-first persistence.
 */
export class IndexedDBStorageService implements StorageService {
  private db: IDBDatabase | null = null;

  isPersistent(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  async init(): Promise<void> {
    if (this.db) return;

    if (typeof indexedDB === 'undefined') {
      return; // Headless environment without indexedDB polyfill
    }

    this.db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(SAVE_STORE)) {
          db.createObjectStore(SAVE_STORE);
        }
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          db.createObjectStore(SETTINGS_STORE);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private ensureDb(): IDBDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  async saveGame(saveData: SaveData): Promise<void> {
    const db = this.ensureDb();
    const tx = db.transaction([SAVE_STORE], 'readwrite');
    const store = tx.objectStore(SAVE_STORE);
    store.put(saveData, PRIMARY_SAVE_KEY);
    await transactionDone(tx);
  }

  async loadGame(): Promise<SaveData | null> {
    const result = await this.loadGameDetailed();
    return result.data ?? null;
  }

  async loadGameDetailed(): Promise<SaveLoadResult> {
    const db = this.ensureDb();
    const tx = db.transaction([SAVE_STORE], 'readonly');
    const raw = await requestToPromise(tx.objectStore(SAVE_STORE).get(PRIMARY_SAVE_KEY));
    await transactionDone(tx);

    if (raw === undefined || raw === null) {
      return { status: 'empty', errors: [] };
    }

    const recovery = recoverSaveData(raw);

    // Preserve the original payload before a migrated or repaired save is used.
    if (recovery.migrated) {
      await this.writeRecoveryCopy(raw);
    }
    if (recovery.status !== 'intact') {
      await this.writeKey(LOAD_RECOVERY_KEY, raw, 'load recovery copy');
    }
    if (recovery.migrated || recovery.status !== 'intact') {
      await this.appendRecoveryEntry(
        createRecoveryLogEntry({
          event: recoveryEventFor(recovery.status, recovery.migrated),
          sourceSchemaVersion: recovery.fromVersion,
          currentSchemaVersion: recovery.toVersion,
          report: recovery.report,
          recoveryCopySaved: true,
        }),
      );
    }

    return {
      status: recovery.status,
      data: recovery.data,
      report: recovery.report,
      errors: recovery.errors,
    };
  }

  /** Best-effort keyed write used for recovery copies and the diagnostics log. */
  private async writeKey(key: string, value: unknown, label: string): Promise<void> {
    try {
      const db = this.ensureDb();
      const tx = db.transaction([SAVE_STORE], 'readwrite');
      tx.objectStore(SAVE_STORE).put(value, key);
      await transactionDone(tx);
    } catch (err) {
      console.warn(`Failed to write save ${label}:`, err);
    }
  }

  /** Stores a pre-migration copy of the raw payload (best-effort). */
  private async writeRecoveryCopy(raw: unknown): Promise<void> {
    await this.writeKey(MIGRATION_BACKUP_KEY, raw, 'recovery copy');
  }

  /** Reads the pre-migration recovery copy, if one exists. */
  async getRecoveryCopy(): Promise<unknown | null> {
    return this.readKey(MIGRATION_BACKUP_KEY);
  }

  /** Reads the damaged-but-recognizable payload kept before recovery, if any. */
  async getLoadRecoveryCopy(): Promise<unknown | null> {
    return this.readKey(LOAD_RECOVERY_KEY);
  }

  private async readKey(key: string): Promise<unknown | null> {
    const db = this.ensureDb();
    const tx = db.transaction([SAVE_STORE], 'readonly');
    const raw = await requestToPromise(tx.objectStore(SAVE_STORE).get(key));
    await transactionDone(tx);
    return raw ?? null;
  }

  private async readRecoveryLog(): Promise<RecoveryLogEntry[]> {
    const raw = await this.readKey(RECOVERY_LOG_KEY);
    if (!Array.isArray(raw)) return [];
    const entries = raw.filter(
      (entry): entry is RecoveryLogEntry =>
        Boolean(entry) &&
        typeof entry === 'object' &&
        typeof (entry as RecoveryLogEntry).event === 'string',
    );
    return cloneRecoveryLog(entries.slice(-MAX_RECOVERY_LOG_ENTRIES));
  }

  async getRecoveryLog(): Promise<RecoveryLogEntry[]> {
    try {
      return await this.readRecoveryLog();
    } catch (err) {
      console.warn('Failed to read save recovery log:', err);
      return [];
    }
  }

  private async appendRecoveryEntry(entry: RecoveryLogEntry): Promise<void> {
    try {
      const log = await this.readRecoveryLog();
      await this.writeKey(RECOVERY_LOG_KEY, appendRecoveryLogEntry(log, entry), 'recovery log');
    } catch (err) {
      console.warn('Failed to write save recovery log:', err);
    }
  }

  // ─── Phase 28.2: manual slots, backup, and restore ──────────────────────────

  async listSaveSlots(): Promise<SaveSlotInfo[]> {
    const db = this.ensureDb();
    const tx = db.transaction([SAVE_STORE], 'readonly');
    const store = tx.objectStore(SAVE_STORE);
    const requests = SAVE_SLOT_IDS.map((slotId) => requestToPromise(store.get(slotKey(slotId))));
    const raws = await Promise.all(requests);
    await transactionDone(tx);
    return SAVE_SLOT_IDS.map((slotId, i) => toSlotInfo(slotId, raws[i]));
  }

  async saveToSlot(slotId: string, save: SaveData): Promise<void> {
    const validation = validateSaveData(save);
    if (!validation.isValid || !validation.data) {
      throw new Error(`Invalid save data: ${validation.errors.join(', ')}`);
    }
    const db = this.ensureDb();
    const tx = db.transaction([SAVE_STORE], 'readwrite');
    tx.objectStore(SAVE_STORE).put(validation.data, slotKey(slotId));
    await transactionDone(tx);
  }

  async loadFromSlot(slotId: string): Promise<SaveData | null> {
    const db = this.ensureDb();
    const tx = db.transaction([SAVE_STORE], 'readonly');
    const raw = await requestToPromise(tx.objectStore(SAVE_STORE).get(slotKey(slotId)));
    await transactionDone(tx);
    if (!raw) return null;
    return recoverSaveData(raw).data ?? null;
  }

  async deleteSlot(slotId: string): Promise<void> {
    const db = this.ensureDb();
    const tx = db.transaction([SAVE_STORE], 'readwrite');
    tx.objectStore(SAVE_STORE).delete(slotKey(slotId));
    await transactionDone(tx);
  }

  async backupActiveSave(): Promise<void> {
    const db = this.ensureDb();
    const readTx = db.transaction([SAVE_STORE], 'readonly');
    const raw = await requestToPromise(readTx.objectStore(SAVE_STORE).get(PRIMARY_SAVE_KEY));
    await transactionDone(readTx);
    if (!raw) return;
    const writeTx = db.transaction([SAVE_STORE], 'readwrite');
    writeTx.objectStore(SAVE_STORE).put(raw, BACKUP_KEY);
    await transactionDone(writeTx);
  }

  async restoreActiveSave(save: SaveData, options: { confirm: boolean }): Promise<RestoreResult> {
    if (!options.confirm) {
      return { success: false, backupCreated: false, errors: ['Restore requires explicit confirmation'] };
    }
    const validation = validateSaveData(save);
    if (!validation.isValid || !validation.data) {
      return { success: false, backupCreated: false, errors: validation.errors };
    }
    const db = this.ensureDb();
    const readTx = db.transaction([SAVE_STORE], 'readonly');
    const existing = await requestToPromise(readTx.objectStore(SAVE_STORE).get(PRIMARY_SAVE_KEY));
    await transactionDone(readTx);

    if (existing) {
      await this.backupActiveSave();
    }

    const writeTx = db.transaction([SAVE_STORE], 'readwrite');
    writeTx.objectStore(SAVE_STORE).put(validation.data, PRIMARY_SAVE_KEY);
    await transactionDone(writeTx);
    return { success: true, backupCreated: Boolean(existing), errors: [] };
  }

  async saveSettings(settings: GameSettings): Promise<void> {
    const db = this.ensureDb();
    const tx = db.transaction([SETTINGS_STORE], 'readwrite');
    const store = tx.objectStore(SETTINGS_STORE);
    store.put(settings, SETTINGS_KEY);
    await transactionDone(tx);
  }

  async loadSettings(): Promise<GameSettings> {
    const db = this.ensureDb();
    const tx = db.transaction([SETTINGS_STORE], 'readonly');
    const store = tx.objectStore(SETTINGS_STORE);
    const raw = await requestToPromise(store.get(SETTINGS_KEY));
    await transactionDone(tx);

    return validateGameSettings(raw);
  }

  async clearSave(): Promise<void> {
    const db = this.ensureDb();
    const tx = db.transaction([SAVE_STORE, SETTINGS_STORE], 'readwrite');
    tx.objectStore(SAVE_STORE).clear();
    tx.objectStore(SETTINGS_STORE).clear();
    await transactionDone(tx);
  }
}

/**
 * In-memory implementation of StorageService.
 * Used for Vitest unit testing and environments where IndexedDB is mocked or absent.
 */
export class InMemoryStorageService implements StorageService {
  private saveState: SaveData | null = null;

  isPersistent(): boolean {
    return false;
  }
  private settings: GameSettings = { ...DEFAULT_GAME_SETTINGS };
  private recoveryCopy: unknown = null;
  private loadRecoveryCopy: unknown = null;
  private recoveryLog: RecoveryLogEntry[] = [];
  private readonly slots = new Map<string, SaveData>();
  private backup: SaveData | null = null;

  async init(): Promise<void> {}

  async saveGame(saveData: SaveData): Promise<void> {
    const validation = validateSaveData(saveData);
    if (!validation.isValid || !validation.data) {
      throw new Error(`Invalid save data: ${validation.errors.join(', ')}`);
    }
    this.saveState = JSON.parse(JSON.stringify(validation.data));
  }

  async loadGame(): Promise<SaveData | null> {
    const result = await this.loadGameDetailed();
    return result.data ?? null;
  }

  async loadGameDetailed(): Promise<SaveLoadResult> {
    if (!this.saveState) return { status: 'empty', errors: [] };

    const recovery = recoverSaveData(this.saveState);

    // Preserve the original payload before a migrated or repaired save is used.
    if (recovery.migrated) {
      this.recoveryCopy = JSON.parse(JSON.stringify(this.saveState));
    }
    if (recovery.status !== 'intact') {
      this.loadRecoveryCopy = JSON.parse(JSON.stringify(this.saveState));
    }
    if (recovery.migrated || recovery.status !== 'intact') {
      this.recoveryLog = appendRecoveryLogEntry(
        this.recoveryLog,
        createRecoveryLogEntry({
          event: recoveryEventFor(recovery.status, recovery.migrated),
          sourceSchemaVersion: recovery.fromVersion,
          currentSchemaVersion: recovery.toVersion,
          report: recovery.report,
          recoveryCopySaved: true,
        }),
      );
    }

    return {
      status: recovery.status,
      data: recovery.data ? JSON.parse(JSON.stringify(recovery.data)) : undefined,
      report: recovery.report,
      errors: recovery.errors,
    };
  }

  /** Returns the pre-migration recovery copy, if one was captured. */
  getRecoveryCopy(): unknown {
    return this.recoveryCopy;
  }

  /** Returns the damaged payload kept before recovery, if one was captured. */
  getLoadRecoveryCopy(): unknown {
    return this.loadRecoveryCopy ? JSON.parse(JSON.stringify(this.loadRecoveryCopy)) : null;
  }

  async getRecoveryLog(): Promise<RecoveryLogEntry[]> {
    return cloneRecoveryLog(this.recoveryLog);
  }

  // ─── Phase 28.2: manual slots, backup, and restore ──────────────────────────

  async listSaveSlots(): Promise<SaveSlotInfo[]> {
    return SAVE_SLOT_IDS.map((slotId) => toSlotInfo(slotId, this.slots.get(slotId)));
  }

  async saveToSlot(slotId: string, save: SaveData): Promise<void> {
    const validation = validateSaveData(save);
    if (!validation.isValid || !validation.data) {
      throw new Error(`Invalid save data: ${validation.errors.join(', ')}`);
    }
    this.slots.set(slotId, JSON.parse(JSON.stringify(validation.data)));
  }

  async loadFromSlot(slotId: string): Promise<SaveData | null> {
    const raw = this.slots.get(slotId);
    if (!raw) return null;
    const result = recoverSaveData(raw);
    return result.data ? JSON.parse(JSON.stringify(result.data)) : null;
  }

  async deleteSlot(slotId: string): Promise<void> {
    this.slots.delete(slotId);
  }

  async backupActiveSave(): Promise<void> {
    if (!this.saveState) return;
    this.backup = JSON.parse(JSON.stringify(this.saveState));
  }

  /** Returns the last saved backup payload, if one was captured. */
  getBackupCopy(): SaveData | null {
    return this.backup ? JSON.parse(JSON.stringify(this.backup)) : null;
  }

  async restoreActiveSave(save: SaveData, options: { confirm: boolean }): Promise<RestoreResult> {
    if (!options.confirm) {
      return { success: false, backupCreated: false, errors: ['Restore requires explicit confirmation'] };
    }
    const validation = validateSaveData(save);
    if (!validation.isValid || !validation.data) {
      return { success: false, backupCreated: false, errors: validation.errors };
    }
    const hadExisting = this.saveState !== null;
    if (hadExisting) {
      await this.backupActiveSave();
    }
    this.saveState = JSON.parse(JSON.stringify(validation.data));
    return { success: true, backupCreated: hadExisting, errors: [] };
  }

  async saveSettings(settings: GameSettings): Promise<void> {
    this.settings = validateGameSettings(settings);
  }

  async loadSettings(): Promise<GameSettings> {
    return { ...this.settings };
  }

  async clearSave(): Promise<void> {
    this.saveState = null;
    this.recoveryCopy = null;
    this.loadRecoveryCopy = null;
    this.recoveryLog = [];
    this.slots.clear();
    this.backup = null;
    this.settings = { ...DEFAULT_GAME_SETTINGS };
  }
}

export function createStorageService(): StorageService {
  if (typeof indexedDB !== 'undefined') {
    return new IndexedDBStorageService();
  }
  return new InMemoryStorageService();
}

export const storageService = createStorageService();
