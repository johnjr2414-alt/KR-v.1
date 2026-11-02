import type { Question } from '../core/types';

// ─── Interface ───────────────────────────────────────────────────────────────

/**
 * Async storage contract for question records.
 *
 * Implementations may be backed by IndexedDB, in-memory maps (tests), or any
 * other persistence mechanism.  All methods return Promises so callers are
 * decoupled from the underlying storage engine.
 */
export interface QuestionStore {
  /** Initialize the database (create object stores / indexes if needed). */
  init(): Promise<void>;

  /** Retrieve every question in the store. */
  getAll(): Promise<Question[]>;

  /** Retrieve a single question by its unique ID, or `undefined` if absent. */
  getById(id: string): Promise<Question | undefined>;

  /**
   * Persist a question (upsert).
   * If a record with the same `id` exists it is overwritten.
   */
  save(question: Question): Promise<void>;

  /**
   * Persist many questions in a single transaction.
   * Existing records with matching IDs are overwritten.
   */
  saveAll(questions: Question[]): Promise<void>;

  /** Remove a question by ID.  No-op if the ID does not exist. */
  delete(id: string): Promise<void>;

  /**
   * Return all tombstoned question IDs.
   * Tombstones prevent bundled (seed-data) questions from reappearing after
   * the user deletes them and the app reloads.
   */
  getTombstones(): Promise<string[]>;

  /** Record a tombstone so a bundled question stays deleted across reloads. */
  addTombstone(id: string): Promise<void>;

  /** Wipe every record (questions + tombstones).  Intended for tests / resets. */
  clear(): Promise<void>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DB_NAME = 'knowledge-realms-questions';
const DB_VERSION = 1;
const QUESTIONS_STORE = 'questions';
const TOMBSTONES_STORE = 'tombstones';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Wrap an `IDBRequest` in a `Promise` that resolves with the request result
 * or rejects with its error.
 */
function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Return a `Promise` that resolves when the given transaction completes
 * successfully, or rejects on error / abort.
 */
function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new DOMException('Transaction aborted'));
  });
}

// ─── Implementation ─────────────────────────────────────────────────────────

/**
 * IndexedDB-backed implementation of {@link QuestionStore}.
 *
 * Call {@link init} once before using any other method.  The underlying
 * `IDBDatabase` handle is cached for the lifetime of the instance.
 */
export class IndexedDBQuestionStore implements QuestionStore {
  private db: IDBDatabase | null = null;

  /** Open (or upgrade) the database and cache the connection handle. */
  async init(): Promise<void> {
    if (this.db) return;

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      // ── questions store ────────────────────────────────────────────────
      if (!db.objectStoreNames.contains(QUESTIONS_STORE)) {
        const store = db.createObjectStore(QUESTIONS_STORE, { keyPath: 'id' });
        store.createIndex('subject', 'subject', { unique: false });
        store.createIndex('educationalTier', 'educationalTier', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }

      // ── tombstones store ───────────────────────────────────────────────
      if (!db.objectStoreNames.contains(TOMBSTONES_STORE)) {
        db.createObjectStore(TOMBSTONES_STORE, { keyPath: 'id' });
      }
    };

    this.db = await requestToPromise(request);
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  /** Return the cached database handle, throwing if `init()` hasn't been called. */
  private getDb(): IDBDatabase {
    if (!this.db) {
      throw new Error('QuestionStore has not been initialised. Call init() first.');
    }
    return this.db;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async getAll(): Promise<Question[]> {
    const db = this.getDb();
    const tx = db.transaction(QUESTIONS_STORE, 'readonly');
    const store = tx.objectStore(QUESTIONS_STORE);
    return requestToPromise(store.getAll()) as Promise<Question[]>;
  }

  async getById(id: string): Promise<Question | undefined> {
    const db = this.getDb();
    const tx = db.transaction(QUESTIONS_STORE, 'readonly');
    const store = tx.objectStore(QUESTIONS_STORE);
    const result = await requestToPromise(store.get(id));
    return (result as Question) ?? undefined;
  }

  async save(question: Question): Promise<void> {
    const db = this.getDb();
    const tx = db.transaction(QUESTIONS_STORE, 'readwrite');
    const store = tx.objectStore(QUESTIONS_STORE);
    store.put(question);
    await transactionDone(tx);
  }

  async saveAll(questions: Question[]): Promise<void> {
    if (questions.length === 0) return;

    const db = this.getDb();
    const tx = db.transaction(QUESTIONS_STORE, 'readwrite');
    const store = tx.objectStore(QUESTIONS_STORE);

    for (const q of questions) {
      store.put(q);
    }

    await transactionDone(tx);
  }

  async delete(id: string): Promise<void> {
    const db = this.getDb();
    const tx = db.transaction(QUESTIONS_STORE, 'readwrite');
    const store = tx.objectStore(QUESTIONS_STORE);
    store.delete(id);
    await transactionDone(tx);
  }

  async getTombstones(): Promise<string[]> {
    const db = this.getDb();
    const tx = db.transaction(TOMBSTONES_STORE, 'readonly');
    const store = tx.objectStore(TOMBSTONES_STORE);
    const records = await requestToPromise(store.getAll()) as Array<{ id: string }>;
    return records.map((r) => r.id);
  }

  async addTombstone(id: string): Promise<void> {
    const db = this.getDb();
    const tx = db.transaction(TOMBSTONES_STORE, 'readwrite');
    const store = tx.objectStore(TOMBSTONES_STORE);
    store.put({ id });
    await transactionDone(tx);
  }

  async clear(): Promise<void> {
    const db = this.getDb();
    const tx = db.transaction([QUESTIONS_STORE, TOMBSTONES_STORE], 'readwrite');
    tx.objectStore(QUESTIONS_STORE).clear();
    tx.objectStore(TOMBSTONES_STORE).clear();
    await transactionDone(tx);
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

/** Default application-wide question store instance. */
export const questionStore: QuestionStore = new IndexedDBQuestionStore();
