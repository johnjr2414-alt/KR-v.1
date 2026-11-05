import type { StorageService, SaveData, GameSettings } from './StorageTypes';
import { validateSaveData, validateGameSettings } from './SaveDataValidator';
import { DEFAULT_GAME_SETTINGS } from './StorageTypes';

const DB_NAME = 'knowledge-realms-save';
const DB_VERSION = 1;
const SAVE_STORE = 'game-save';
const SETTINGS_STORE = 'settings';
const PRIMARY_SAVE_KEY = 'active-profile';
const SETTINGS_KEY = 'user-settings';

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
    const db = this.ensureDb();
    const tx = db.transaction([SAVE_STORE], 'readonly');
    const store = tx.objectStore(SAVE_STORE);
    const raw = await requestToPromise(store.get(PRIMARY_SAVE_KEY));
    await transactionDone(tx);

    if (!raw) return null;

    const validation = validateSaveData(raw);
    if (!validation.isValid || !validation.data) {
      console.warn('Save data validation warning:', validation.errors);
      return null;
    }

    return validation.data;
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
  private settings: GameSettings = { ...DEFAULT_GAME_SETTINGS };

  async init(): Promise<void> {}

  async saveGame(saveData: SaveData): Promise<void> {
    const validation = validateSaveData(saveData);
    if (!validation.isValid || !validation.data) {
      throw new Error(`Invalid save data: ${validation.errors.join(', ')}`);
    }
    this.saveState = JSON.parse(JSON.stringify(validation.data));
  }

  async loadGame(): Promise<SaveData | null> {
    if (!this.saveState) return null;
    const validation = validateSaveData(this.saveState);
    return validation.isValid && validation.data ? JSON.parse(JSON.stringify(validation.data)) : null;
  }

  async saveSettings(settings: GameSettings): Promise<void> {
    this.settings = validateGameSettings(settings);
  }

  async loadSettings(): Promise<GameSettings> {
    return { ...this.settings };
  }

  async clearSave(): Promise<void> {
    this.saveState = null;
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
