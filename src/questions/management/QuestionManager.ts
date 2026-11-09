import type { Question } from '../../core/types/question';
import { ContentReviewStatus } from '../../core/types/question';
import { createUniqueId } from '../../core/uniqueId';
import type { QuestionStore } from '../../storage/QuestionStore';
import { questionStore } from '../../storage/QuestionStore';
import type { QuestionValidationError } from './QuestionValidator';
import { QuestionValidator } from './QuestionValidator';
import type { QuestionFilterCriteria } from '../retrieval/QuestionRepository';
import { QuestionRepository } from '../retrieval/QuestionRepository';
import { loadBundledQuestions } from '../retrieval/QuestionLoader';
import { normalizePromptText } from '../review/ContentReviewTools';
import {
  createQuestionBankExport,
  parseQuestionBankImport,
  serializeQuestionBankExport,
  QUESTION_BANK_FORMAT,
  type QuestionBankCompatibility,
} from './QuestionBankTransfer';

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

/**
 * Per-record outcome from a dry-run import analysis.
 * `status` is `valid`, `invalid` (structural failure) or `duplicate-id`.
 */
export interface ImportRecordReport {
  /** Zero-based position of the record within the payload. */
  index: number;
  /** Declared question ID, when present. */
  questionId?: string;
  status: 'valid' | 'invalid' | 'duplicate-id';
  /** Blocking problems that prevent import. */
  errors: string[];
  /** Non-blocking advisory notes (e.g. a similar prompt candidate). */
  warnings: string[];
}

/**
 * Non-mutating analysis of a pending bulk import.
 *
 * Summarises what would be imported and what would be rejected, together with
 * prompt-duplication warnings. It never writes to the store or repository.
 */
export interface ImportPreview {
  /** True when the payload parsed and is an array. */
  ok: boolean;
  /** Set when the payload itself is unusable (bad JSON / not an array). */
  message?: string;
  totalRecords: number;
  validCount: number;
  invalidCount: number;
  duplicateIdCount: number;
  /** Count of records whose prompt resembles an existing or earlier-batched one. */
  duplicatePromptWarnings: number;
  records: ImportRecordReport[];
  /** True when committing would import the batch without rejecting any record. */
  canImport: boolean;
}

/** A point-in-time snapshot of the question bank, taken before bulk operations. */
export interface QuestionBackup {
  /** Serialized question array, re-importable as-is. */
  json: string;
  /** Number of questions captured in the snapshot. */
  questionCount: number;
  /** ISO timestamp of when the backup was created. */
  createdAt: string;
}

/** Result of restoring a previously-created backup. */
export interface RestoreResult {
  success: boolean;
  restoredCount: number;
  errors: Array<{ questionId?: string; message: string }>;
}

/** Per-record outcome from a versioned question bank dry run. */
export interface QuestionBankRecordReport {
  index: number;
  questionId?: string;
  status: 'valid' | 'invalid' | 'duplicate-id';
  errors: string[];
  /** Non-blocking notes (bundled override, similar prompt). */
  warnings: string[];
  /** True when the record replaces a locally bundled question. */
  override: boolean;
}

/**
 * Non-mutating analysis of a versioned question bank import.
 *
 * Extends the legacy `ImportPreview` with format compatibility and the
 * tombstone/override metadata carried by the export envelope.
 */
export interface QuestionBankImportPreview {
  ok: boolean;
  message?: string;
  /** 0 for legacy (envelope-less) files. */
  formatVersion: number;
  compatibility: QuestionBankCompatibility;
  legacy: boolean;
  totalRecords: number;
  validCount: number;
  invalidCount: number;
  duplicateIdCount: number;
  overrideCount: number;
  tombstoneCount: number;
  duplicatePromptWarnings: number;
  records: QuestionBankRecordReport[];
  canImport: boolean;
}

/** Result of applying a versioned question bank import. */
export interface QuestionBankImportResult {
  success: boolean;
  importedCount: number;
  overrideCount: number;
  tombstoneCount: number;
  errors: Array<{ questionId?: string; message: string }>;
}

interface BankImportAnalysis {
  preview: QuestionBankImportPreview;
  questions: Question[];
  tombstones: string[];
}

function emptyBankPreview(): QuestionBankImportPreview {
  return {
    ok: false,
    formatVersion: 0,
    compatibility: 'unknown',
    legacy: false,
    totalRecords: 0,
    validCount: 0,
    invalidCount: 0,
    duplicateIdCount: 0,
    overrideCount: 0,
    tombstoneCount: 0,
    duplicatePromptWarnings: 0,
    records: [],
    canImport: false,
  };
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
  private initialized = false;
  /** In-flight bootstrap shared by concurrent/repeated initialize() calls. */
  private initPromise: Promise<void> | null = null;
  /** IDs supplied by bundled JSON; collisions with these are overrides, not duplicates. */
  private bundledIds = new Set<string>();

  constructor(
    private readonly repository: QuestionRepository,
    private readonly store: QuestionStore,
  ) {}

  /**
   * Returns whether the manager has completed initialization.
   */
  isInitialized(): boolean {
    return this.initialized;
  }

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
   *
   * If storage is unavailable, bundled questions are still loaded so combat
   * remains playable for the session.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.bootstrap().finally(() => {
      this.initPromise = null;
    });
    return this.initPromise;
  }

  private async bootstrap(): Promise<void> {
    // Open the database while the small bundled bank is being validated so the
    // IndexedDB round-trip overlaps with CPU work.
    const storeReady = this.store.init();
    const bundled = loadBundledQuestions();
    this.bundledIds = new Set(bundled.questions.map((q) => q.id));

    let storeAvailable = true;
    let storeError: unknown = null;
    try {
      await storeReady;
    } catch (err) {
      storeAvailable = false;
      storeError = err;
      console.warn(
        '[QuestionManager] Question storage unavailable; using bundled questions only:',
        err,
      );
    }

    // 2 + 3 — Saved questions and tombstones can be read concurrently.
    let savedQuestions: Question[] = [];
    let tombstoneIds: string[] = [];
    if (storeAvailable) {
      const [savedResult, tombstoneResult] = await Promise.allSettled([
        this.store.getAll(),
        this.store.getTombstones(),
      ]);
      if (savedResult.status === 'fulfilled') {
        savedQuestions = savedResult.value;
      } else {
        console.warn('[QuestionManager] Failed to load saved questions from store:', savedResult.reason);
      }
      if (tombstoneResult.status === 'fulfilled') {
        tombstoneIds = tombstoneResult.value;
      } else {
        console.warn('[QuestionManager] Failed to load tombstones from store:', tombstoneResult.reason);
      }
    }
    const tombstones = new Set(tombstoneIds);

    // 4 — Filter out tombstoned bundled questions
    const liveBundled = bundled.questions.filter(
      (q) => !tombstones.has(q.id),
    );

    // 5 — Merge: start with bundled, overlay IndexedDB (wins on ID collision)
    // Only overlay valid questions from IndexedDB
    const mergedMap = new Map<string, Question>();

    for (const q of liveBundled) {
      mergedMap.set(q.id, q);
    }
    for (const q of savedQuestions) {
      if (!tombstones.has(q.id)) {
        const val = QuestionValidator.validate(q);
        if (val.isValid) {
          mergedMap.set(q.id, q);
        } else {
          console.warn(`[QuestionManager] Skipping invalid stored question "${q.id}":`, val.errors);
        }
      }
    }

    // 6 — Populate repository
    this.repository.setQuestions([...mergedMap.values()]);

    // Bundled questions stay available for this run, but the bootstrap still
    // reports the missing store so a later initialize() can retry it.
    if (!storeAvailable) {
      throw storeError instanceof Error
        ? storeError
        : new Error('Question storage unavailable.');
    }

    this.initialized = true;
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
      id: input.id || createUniqueId(),
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

  // ─── Review marker ───────────────────────────────────────────────────────────

  /**
   * Sets the human review marker on a question.
   *
   * This is an explicit reviewer action. It records a workflow label only and
   * does not change the question's answer, difficulty, or content.
   */
  async markReviewStatus(
    id: string,
    status: ContentReviewStatus,
  ): Promise<{ question?: Question; errors?: QuestionValidationError[] }> {
    return this.updateQuestion(id, { reviewStatus: status });
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

  // ─── Import preview (dry run) ────────────────────────────────────────────────

  /**
   * Analyses a pending import without writing anything.
   *
   * Each record is classified as valid, invalid (structural failure), or a
   * duplicate ID. Valid records whose prompt resembles an existing or
   * earlier-batched question are additionally flagged with a **warning** — a
   * candidate for human review, never a rejection.
   *
   * @param jsonString — A JSON string encoding an array of Question objects.
   */
  previewImport(jsonString: string): ImportPreview {
    const empty: ImportPreview = {
      ok: false,
      totalRecords: 0,
      validCount: 0,
      invalidCount: 0,
      duplicateIdCount: 0,
      duplicatePromptWarnings: 0,
      records: [],
      canImport: false,
    };

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      return { ...empty, message: 'Invalid JSON: failed to parse input string.' };
    }

    if (!Array.isArray(parsed)) {
      return { ...empty, message: 'JSON payload must be an array of question objects.' };
    }

    const records: ImportRecordReport[] = [];
    const batchIds = new Set<string>();
    const batchPrompts = new Map<string, string>();
    let invalidCount = 0;
    let duplicateIdCount = 0;
    let duplicatePromptWarnings = 0;

    (parsed as Partial<Question>[]).forEach((raw, index) => {
      const record: Partial<Question> = {
        ...raw,
        createdAt: raw.createdAt || new Date().toISOString(),
        updatedAt: raw.updatedAt || new Date().toISOString(),
      };

      const errors: string[] = [];
      const warnings: string[] = [];

      const validation = QuestionValidator.validate(record);
      if (!validation.isValid) {
        for (const e of validation.errors) errors.push(`${e.field}: ${e.message}`);
        records.push({ index, questionId: record.id, status: 'invalid', errors, warnings });
        invalidCount += 1;
        return;
      }

      const questionId = record.id as string;
      if (this.repository.getById(questionId) || batchIds.has(questionId)) {
        errors.push(
          `Duplicate ID: a question with ID "${questionId}" already exists (existing bank or earlier in this batch).`,
        );
        records.push({ index, questionId, status: 'duplicate-id', errors, warnings });
        duplicateIdCount += 1;
        return;
      }
      batchIds.add(questionId);

      const normalized = normalizePromptText(record.question ?? '');
      if (normalized !== '') {
        const match = this.findPromptMatch(normalized) ?? batchPrompts.get(normalized);
        if (match) {
          warnings.push(
            `Prompt resembles question "${match}". This is a candidate only — please review.`,
          );
          duplicatePromptWarnings += 1;
        } else {
          batchPrompts.set(normalized, questionId);
        }
      }

      records.push({ index, questionId, status: 'valid', errors, warnings });
    });

    const validCount = records.filter((r) => r.status === 'valid').length;
    return {
      ok: true,
      totalRecords: parsed.length,
      validCount,
      invalidCount,
      duplicateIdCount,
      duplicatePromptWarnings,
      records,
      canImport: parsed.length > 0 && invalidCount === 0 && duplicateIdCount === 0,
    };
  }

  /** Finds an existing question whose normalized prompt matches. */
  private findPromptMatch(normalizedPrompt: string): string | undefined {
    for (const question of this.repository.getAll()) {
      if (normalizePromptText(question.question) === normalizedPrompt) {
        return question.id;
      }
    }
    return undefined;
  }

  // ─── Versioned bank import/export (Phase 28.5) ─────────────────────────────

  /**
   * Exports the question bank with format version, tombstone, and override
   * metadata. Full exports include tombstones; filtered exports omit them.
   */
  async exportBankToJson(
    criteria?: QuestionFilterCriteria,
    options: { appVersion?: string } = {},
  ): Promise<string> {
    const questions = criteria ? this.repository.filter(criteria) : this.repository.getAll();

    let tombstones: string[] = [];
    let overrides: string[] = [];
    try {
      if (!criteria) tombstones = await this.store.getTombstones();
      const localIds = new Set((await this.store.getAll()).map((q) => q.id));
      overrides = questions
        .filter((q) => localIds.has(q.id) && this.bundledIds.has(q.id))
        .map((q) => q.id);
    } catch (err) {
      // Exporting the effective bank is still useful without metadata.
      console.warn('[QuestionManager] Could not read tombstone/override metadata:', err);
    }

    return serializeQuestionBankExport(
      createQuestionBankExport(questions, {
        tombstones,
        overrides,
        appVersion: options.appVersion,
      }),
    );
  }

  /** Analyses a versioned question bank file without writing anything. */
  previewBankImport(jsonString: string): QuestionBankImportPreview {
    return this.analyzeBankImport(jsonString).preview;
  }

  /**
   * Applies a versioned question bank file (or a legacy bare array).
   *
   * **All-or-nothing**: the payload is fully parsed, validated, and checked for
   * duplicate IDs before any write. Collisions with locally bundled IDs are
   * accepted as overrides; any other collision rejects the batch. Tombstones
   * are applied only after every record has been committed.
   */
  async importBankFromJson(jsonString: string): Promise<QuestionBankImportResult> {
    const analysis = this.analyzeBankImport(jsonString);
    const { preview } = analysis;

    if (!preview.ok || !preview.canImport) {
      const errors: Array<{ questionId?: string; message: string }> = [];
      if (preview.message) errors.push({ message: preview.message });
      for (const record of preview.records) {
        for (const message of record.errors) {
          errors.push({ questionId: record.questionId, message });
        }
      }
      if (errors.length === 0) {
        errors.push({ message: 'The file does not contain an importable question batch.' });
      }
      return {
        success: false,
        importedCount: 0,
        overrideCount: 0,
        tombstoneCount: 0,
        errors,
      };
    }

    try {
      if (analysis.questions.length > 0) {
        await this.store.saveAll(analysis.questions);
      }
      for (const question of analysis.questions) {
        this.repository.addQuestion(question);
      }

      for (const id of analysis.tombstones) {
        await this.store.addTombstone(id);
        this.repository.removeQuestion(id);
      }
    } catch (err) {
      return {
        success: false,
        importedCount: 0,
        overrideCount: 0,
        tombstoneCount: 0,
        errors: [{ message: `Import failed while writing: ${(err as Error).message}` }],
      };
    }

    return {
      success: true,
      importedCount: analysis.questions.length,
      overrideCount: preview.overrideCount,
      tombstoneCount: analysis.tombstones.length,
      errors: [],
    };
  }

  private analyzeBankImport(jsonString: string): BankImportAnalysis {
    const parsed = parseQuestionBankImport(jsonString);
    if (!parsed.ok) {
      const preview = emptyBankPreview();
      preview.message = parsed.message ?? 'The question bank file could not be read.';
      preview.formatVersion = parsed.formatVersion;
      preview.compatibility = parsed.compatibility;
      preview.legacy = parsed.legacy;
      preview.tombstoneCount = parsed.tombstones.length;
      return { preview, questions: [], tombstones: [] };
    }

    const batchPrompts = new Map<string, string>();
    let duplicatePromptWarnings = 0;

    const records: QuestionBankRecordReport[] = parsed.records.map((parsedRecord) => {
      const errors = [...parsedRecord.errors];
      const warnings: string[] = [];
      const question = parsedRecord.question;
      let status = parsedRecord.status;
      let override = false;

      if (status === 'valid' && question) {
        const existing = this.repository.getById(question.id);
        if (existing) {
          if (this.bundledIds.has(question.id)) {
            override = true;
            warnings.push(`Overrides bundled question "${question.id}".`);
          } else {
            status = 'duplicate-id';
            errors.push(`Duplicate ID: a question with ID "${question.id}" already exists.`);
          }
        }
      }

      if (status === 'valid' && question) {
        const normalized = normalizePromptText(question.question);
        if (normalized !== '') {
          const match = this.findPromptMatch(normalized) ?? batchPrompts.get(normalized);
          if (match && match !== question.id) {
            warnings.push(
              `Prompt resembles question "${match}". This is a candidate only — please review.`,
            );
            duplicatePromptWarnings += 1;
          } else if (!match) {
            batchPrompts.set(normalized, question.id);
          }
        }
      }

      return {
        index: parsedRecord.index,
        questionId: parsedRecord.questionId,
        status,
        errors,
        warnings,
        override,
      };
    });

    const questions: Question[] = [];
    records.forEach((report, index) => {
      if (report.status !== 'valid') return;
      const question = parsed.records[index]?.question;
      if (question) questions.push(question);
    });

    const invalidCount = records.filter((r) => r.status === 'invalid').length;
    const duplicateIdCount = records.filter((r) => r.status === 'duplicate-id').length;

    return {
      preview: {
        ok: true,
        formatVersion: parsed.formatVersion,
        compatibility: parsed.compatibility,
        legacy: parsed.legacy,
        totalRecords: parsed.records.length,
        validCount: questions.length,
        invalidCount,
        duplicateIdCount,
        overrideCount: records.filter((r) => r.override).length,
        tombstoneCount: parsed.tombstones.length,
        duplicatePromptWarnings,
        records,
        canImport: parsed.records.length > 0 && invalidCount === 0 && duplicateIdCount === 0,
      },
      questions,
      tombstones: parsed.tombstones,
    };
  }

  // ─── Backup / restore ────────────────────────────────────────────────────────

  /**
   * Captures a snapshot of the current question bank.
   *
   * Intended to be taken *before* a bulk operation so the bank can be restored
   * if the operation is unwanted. The captured JSON is re-importable as-is.
   */
  createBackup(): QuestionBackup {
    return {
      json: JSON.stringify(this.repository.getAll(), null, 2),
      questionCount: this.repository.count(),
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Restores the question bank to a previously-captured backup.
   *
   * **All-or-nothing**: if any backup record is invalid, nothing changes. On
   * success the repository and store are returned to the snapshot: backup
   * records are upserted and any record absent from the backup is removed
   * (with a tombstone so bundled questions stay removed across reloads).
   */
  async restoreBackup(backupJson: string): Promise<RestoreResult> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(backupJson);
    } catch {
      return {
        success: false,
        restoredCount: 0,
        errors: [{ message: 'Invalid JSON: failed to parse backup.' }],
      };
    }

    let payload: unknown = parsed;
    let importedTombstones: string[] = [];

    // Versioned bank envelopes are also valid backups; unsupported versions are
    // rejected before anything is written.
    if (!Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null) {
      const candidate = parsed as Record<string, unknown>;
      if (candidate.format === QUESTION_BANK_FORMAT) {
        const bank = parseQuestionBankImport(candidate);
        if (!bank.ok) {
          return {
            success: false,
            restoredCount: 0,
            errors: [{ message: bank.message ?? 'Unsupported question bank backup.' }],
          };
        }
        const invalid = bank.records.filter((record) => record.status !== 'valid');
        if (invalid.length > 0) {
          return {
            success: false,
            restoredCount: 0,
            errors: invalid.flatMap((record) =>
              record.errors.map((message) => ({ questionId: record.questionId, message })),
            ),
          };
        }
        payload = bank.records.map((record) => record.question as Question);
        importedTombstones = bank.tombstones;
      }
    }

    if (!Array.isArray(payload)) {
      return {
        success: false,
        restoredCount: 0,
        errors: [{ message: 'Backup payload must be an array of question objects.' }],
      };
    }

    const errors: Array<{ questionId?: string; message: string }> = [];
    const validated: Question[] = [];
    const seen = new Set<string>();

    for (const raw of payload as Partial<Question>[]) {
      const validation = QuestionValidator.validate(raw);
      if (!validation.isValid) {
        const fieldMessages = validation.errors
          .map((e) => `${e.field}: ${e.message}`)
          .join('; ');
        errors.push({
          questionId: raw.id,
          message: `Validation failed — ${fieldMessages}`,
        });
        continue;
      }
      if (seen.has(raw.id as string)) {
        errors.push({
          questionId: raw.id,
          message: `Duplicate ID within backup: "${raw.id}".`,
        });
        continue;
      }
      seen.add(raw.id as string);
      validated.push(raw as Question);
    }

    if (errors.length > 0) {
      return { success: false, restoredCount: 0, errors };
    }

    // Upsert every backup record
    await this.store.saveAll(validated);
    for (const question of validated) {
      this.repository.addQuestion(question);
    }

    // Remove records that were not part of the snapshot
    const backupIds = new Set(validated.map((q) => q.id));
    for (const existing of this.repository.getAll()) {
      if (backupIds.has(existing.id)) continue;
      const stored = await this.store.getById(existing.id);
      if (stored) await this.store.delete(existing.id);
      await this.store.addTombstone(existing.id);
      this.repository.removeQuestion(existing.id);
    }

    // Preserve tombstones carried by a versioned envelope, including IDs not
    // present in this build's bundled content.
    for (const id of importedTombstones) {
      await this.store.addTombstone(id);
      this.repository.removeQuestion(id);
    }

    return { success: true, restoredCount: validated.length, errors: [] };
  }

  // ─── Export ──────────────────────────────────────────────────────────────────

  /**
   * Exports questions as a pretty-printed JSON string.
   *
   * With no criteria, exports the entire bank. With criteria, exports the
   * matching filtered set (using the same repository filter semantics as the
   * admin list — including its default-to-Published behaviour when the
   * `status` criterion is omitted).
   */
  exportToJson(criteria?: QuestionFilterCriteria): string {
    const questions = criteria
      ? this.repository.filter(criteria)
      : this.repository.getAll();
    return JSON.stringify(questions, null, 2);
  }
}

// ─── Shared Global Singletons ──────────────────────────────────────────────────

/** Shared runtime QuestionRepository for the entire application. */
export const sharedQuestionRepository = new QuestionRepository();

/**
 * Shared runtime QuestionManager instance.
 * Connects the default questionStore (IndexedDB) with the shared QuestionRepository.
 */
export const sharedQuestionManager = new QuestionManager(
  sharedQuestionRepository,
  questionStore,
);
