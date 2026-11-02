import type { Question } from '../../core/types/question';
import type { QuestionStore } from '../../storage/QuestionStore';
import type { QuestionValidationError } from './QuestionValidator';
import { QuestionValidator } from './QuestionValidator';
import { QuestionRepository } from '../retrieval/QuestionRepository';
import { loadBundledQuestions } from '../retrieval/QuestionLoader';

// ─── Public Types ────────────────────────────────────────────────────────────

/**
 * Result of a bulk question import operation.
 */
export interface ImportResult {
  /** True if all questions in the payload were imported successfully. */
  success: boolean;
  /** Number of questions successfully committed. */
  importedCount: number;
  /** Number of questions skipped (due to validation or duplicate ID). */
  skippedCount: number;
  /** Per-question error details (validation failures, duplicates, parse errors). */
  errors: Array<{ questionId?: string; message: string }>;
}

// ─── QuestionManager ─────────────────────────────────────────────────────────

/**
 * Orchestrates CRUD operations on the question database.
 *
 * Acts as the authoritative write-path for question data:
 *   1. Validates inputs via {@link QuestionValidator}.
 *   2. Persists changes to IndexedDB via {@link QuestionStore}.
 *   3. Keeps the in-memory {@link QuestionRepository} in sync.
 *
 * This class is headless — no Phaser or DOM dependencies.
 */
export class QuestionManager {
  constructor(
    private readonly repository: QuestionRepository,
    private readonly store: QuestionStore,
  ) {}

  /**
   * Returns the underlying in-memory question repository.
   */
  getRepository(): QuestionRepository {
    return this.repository;
  }

  // ─── Initialization ──────────────────────────────────────────────────────────

  /**
   * Bootstraps the question pool.
   *
   * 1. Loads bundled (static JSON) questions.
   * 2. Loads user-saved questions from IndexedDB.
   * 3. Retrieves tombstone IDs (bundled questions the admin soft-deleted).
   * 4. Filters out tombstoned bundled questions.
   * 5. Merges: IndexedDB questions override bundled ones sharing the same ID.
   * 6. Populates the in-memory repository.
   */
  async initialize(): Promise<void> {
    await this.store.init();

    // 1 — Bundled questions from static JSON
    const bundled = loadBundledQuestions();

    // 2 — Saved questions from IndexedDB
    const savedQuestions = await this.store.getAll();

    // 3 — Tombstones (IDs of bundled questions that were soft-deleted)
    const tombstones = new Set(await this.store.getTombstones());

    // 4 — Filter out tombstoned bundled questions
    const liveBundled = bundled.questions.filter(
      (q) => !tombstones.has(q.id),
    );

    // 5 — Merge: start with bundled, overlay IndexedDB (wins on ID collision)
    const mergedMap = new Map<string, Question>();

    for (const q of liveBundled) {
      mergedMap.set(q.id, q);
    }
    for (const q of savedQuestions) {
      mergedMap.set(q.id, q);
    }

    // 6 — Populate repository
    this.repository.setQuestions([...mergedMap.values()]);
  }

  // ─── Create ──────────────────────────────────────────────────────────────────

  /**
   * Creates a new question.
   *
   * - Generates a UUID if `input.id` is not set.
   * - Stamps `createdAt` and `updatedAt` with the current ISO timestamp.
   * - Validates the fully-assembled question before persisting.
   *
   * @returns The persisted Question on success, or validation errors.
   */
  async createQuestion(
    input: Partial<Question>,
  ): Promise<{ question?: Question; errors?: QuestionValidationError[] }> {
    const now = new Date().toISOString();
    const assembled: Partial<Question> = {
      ...input,
      id: input.id || crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    const validation = QuestionValidator.validate(assembled);
    if (!validation.isValid) {
      return { errors: validation.errors };
    }

    const question = assembled as Question;

    await this.store.save(question);
    this.repository.addQuestion(question);

    return { question };
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  /**
   * Updates an existing question by ID.
   *
   * Merges `updates` onto the existing record, bumps `updatedAt`,
   * validates the merged result, then persists and syncs the repository.
   *
   * @returns The updated Question on success, or validation errors.
   */
  async updateQuestion(
    id: string,
    updates: Partial<Question>,
  ): Promise<{ question?: Question; errors?: QuestionValidationError[] }> {
    const existing = this.repository.getById(id);
    if (!existing) {
      return {
        errors: [{ field: 'id', message: `Question with ID "${id}" not found.` }],
      };
    }

    const merged: Partial<Question> = {
      ...existing,
      ...updates,
      id, // prevent ID overwrite
      createdAt: existing.createdAt, // preserve original creation timestamp
      updatedAt: new Date().toISOString(),
    };

    const validation = QuestionValidator.validate(merged);
    if (!validation.isValid) {
      return { errors: validation.errors };
    }

    const question = merged as Question;

    await this.store.save(question);
    this.repository.addQuestion(question);

    return { question };
  }

  // ─── Delete ──────────────────────────────────────────────────────────────────

  /**
   * Deletes a question.
   *
   * - **User-created questions** (saved in IndexedDB): hard-deleted from store.
   * - **Bundled questions** (from static JSON): a tombstone ID is recorded so
   *   the question is excluded on next initialization.
   *
   * In both cases the question is removed from the in-memory repository.
   */
  async deleteQuestion(id: string): Promise<void> {
    // Attempt hard-delete from IndexedDB (no-op if it wasn't persisted there)
    const storedQuestion = await this.store.getById(id);
    if (storedQuestion) {
      await this.store.delete(id);
    }

    // If this is a bundled question, add a tombstone so it stays hidden
    // after re-initialization. We can detect bundled membership by checking
    // whether the question exists in the current repository but was NOT in
    // the store — however, a simpler & safer approach is to always add a
    // tombstone: the tombstone is a no-op for IDs that aren't bundled.
    await this.store.addTombstone(id);

    this.repository.removeQuestion(id);
  }

  // ─── Import ──────────────────────────────────────────────────────────────────

  /**
   * Imports questions from a JSON string.
   *
   * **All-or-nothing**: every question in the payload is validated and
   * checked for duplicate IDs against the existing repository BEFORE any
   * writes are committed. If any record fails, none are imported.
   *
   * @param jsonString — A JSON string encoding an array of Question objects.
   */
  async importFromJson(jsonString: string): Promise<ImportResult> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      return {
        success: false,
        importedCount: 0,
        skippedCount: 0,
        errors: [{ message: 'Invalid JSON: failed to parse input string.' }],
      };
    }

    if (!Array.isArray(parsed)) {
      return {
        success: false,
        importedCount: 0,
        skippedCount: 0,
        errors: [{ message: 'JSON payload must be an array of question objects.' }],
      };
    }

    const errors: Array<{ questionId?: string; message: string }> = [];
    const validated: Question[] = [];

    for (const raw of parsed as Partial<Question>[]) {
      const record: Partial<Question> = {
        ...raw,
        createdAt: raw.createdAt || new Date().toISOString(),
        updatedAt: raw.updatedAt || new Date().toISOString(),
      };

      const result = QuestionValidator.validate(record);
      if (!result.isValid) {
        const fieldMessages = result.errors
          .map((e) => `${e.field}: ${e.message}`)
          .join('; ');
        errors.push({
          questionId: record.id,
          message: `Validation failed — ${fieldMessages}`,
        });
        continue;
      }

      // Check for duplicate ID against existing repository
      if (this.repository.getById(record.id as string)) {
        errors.push({
          questionId: record.id,
          message: `Duplicate ID: a question with ID "${record.id}" already exists.`,
        });
        continue;
      }

      // Check for duplicate IDs within the import batch itself
      if (validated.some((q) => q.id === record.id)) {
        errors.push({
          questionId: record.id,
          message: `Duplicate ID within import batch: "${record.id}".`,
        });
        continue;
      }

      validated.push(record as Question);
    }

    // All-or-nothing: if ANY error occurred, reject entire batch
    if (errors.length > 0) {
      return {
        success: false,
        importedCount: 0,
        skippedCount: errors.length,
        errors,
      };
    }

    // Commit all validated questions
    await this.store.saveAll(validated);
    for (const question of validated) {
      this.repository.addQuestion(question);
    }

    return {
      success: true,
      importedCount: validated.length,
      skippedCount: 0,
      errors: [],
    };
  }

  // ─── Export ──────────────────────────────────────────────────────────────────

  /**
   * Exports all questions currently in the repository as a pretty-printed
   * JSON string.
   */
  exportToJson(): string {
    return JSON.stringify(this.repository.getAll(), null, 2);
  }
}
