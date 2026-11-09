import type { Question } from '../../core/types/question';
import { QuestionValidator } from './QuestionValidator';

/**
 * Phase 28.5 — Versioned question bank export/import.
 *
 * Pure and execution-free: input is read with `JSON.parse`, known fields are
 * copied, and records are passed through {@link QuestionValidator}. Imported
 * strings are never evaluated.
 *
 * Version semantics:
 * - `format` / `formatVersion` identify the export container.
 * - Files without an envelope are treated as **legacy** (version 0) question
 *   arrays so older exports keep working.
 * - Unknown formats and future container versions are rejected before any
 *   record is examined.
 *
 * Tombstone/override semantics (documented for callers):
 * - `tombstones` lists bundled question IDs deleted in the source bank. Import
 *   applies them additively; it never clears existing tombstones.
 * - `overrides` lists exported records that correspond to bundled questions in
 *   the source bank. On import, a record colliding with a *locally bundled* ID
 *   is accepted as an override, while a collision with any other stored
 *   question is rejected as a duplicate.
 */

/** Magic identifier written into every versioned question bank export. */
export const QUESTION_BANK_FORMAT = 'knowledge-realms-question-bank';

/** Current version of the question bank export container. */
export const QUESTION_BANK_FORMAT_VERSION = 1;

export type QuestionBankCompatibility = 'current' | 'legacy' | 'future' | 'unknown';

export interface QuestionBankEnvelope {
  format: typeof QUESTION_BANK_FORMAT;
  formatVersion: number;
  /** ISO timestamp of the export. */
  exportedAt: string;
  /** Non-sensitive generator metadata. */
  generator: {
    name: string;
    version: string;
  };
  /** Bundled question IDs deleted in the source bank. */
  tombstones: string[];
  /** Exported records that correspond to bundled questions in the source bank. */
  overrides: string[];
  /** Effective question records. */
  questions: Question[];
}

export interface CreateQuestionBankExportOptions {
  tombstones?: readonly string[];
  overrides?: readonly string[];
  /** Injectable clock for deterministic exports/tests. */
  now?: string;
  appName?: string;
  appVersion?: string;
}

export interface ParsedQuestionBankRecord {
  index: number;
  questionId?: string;
  status: 'valid' | 'invalid' | 'duplicate-id';
  errors: string[];
  /** Present only for valid records. */
  question?: Question;
}

export interface ParsedQuestionBank {
  /** True when the container is compatible and structurally usable. */
  ok: boolean;
  /** Set when the container itself is unusable. */
  message?: string;
  formatVersion: number;
  compatibility: QuestionBankCompatibility;
  legacy: boolean;
  tombstones: string[];
  overrides: string[];
  records: ParsedQuestionBankRecord[];
  /** Container-level errors (bad metadata, contradictions, conflicts). */
  errors: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeStringList(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  if (value.some((entry) => typeof entry !== 'string')) return null;
  return [...new Set(value as string[])];
}

function emptyParsed(
  compatibility: QuestionBankCompatibility,
  formatVersion: number,
  message?: string,
): ParsedQuestionBank {
  return {
    ok: false,
    message,
    formatVersion,
    compatibility,
    legacy: compatibility === 'legacy',
    tombstones: [],
    overrides: [],
    records: [],
    errors: message ? [message] : [],
  };
}

/** Parses records through the question validator and detects duplicate IDs. */
function parseRecords(rawRecords: unknown[]): ParsedQuestionBankRecord[] {
  const seen = new Set<string>();

  return rawRecords.map((raw, index) => {
    const candidate = isRecord(raw) ? raw : undefined;
    const declaredId = typeof candidate?.id === 'string' ? candidate.id : undefined;

    const validation = QuestionValidator.validate(raw as Partial<Question>);
    if (!validation.isValid) {
      return {
        index,
        questionId: declaredId,
        status: 'invalid',
        errors: validation.errors.map((error) => `${error.field}: ${error.message}`),
      };
    }

    const question = raw as Question;
    if (seen.has(question.id)) {
      return {
        index,
        questionId: question.id,
        status: 'duplicate-id',
        errors: [`Duplicate ID within import batch: "${question.id}".`],
      };
    }
    seen.add(question.id);

    return {
      index,
      questionId: question.id,
      status: 'valid',
      errors: [],
      question,
    };
  });
}

/**
 * Parses a question bank file (versioned envelope or legacy bare array).
 *
 * Never mutates application state; callers decide whether to apply the result.
 */
export function parseQuestionBankImport(input: string | unknown): ParsedQuestionBank {
  let parsed: unknown = input;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch {
      return emptyParsed('unknown', 0, 'File is not valid JSON.');
    }
  }

  // Legacy export: a bare array was the format before explicit versioning.
  if (Array.isArray(parsed)) {
    const records = parseRecords(parsed);
    return {
      ok: true,
      formatVersion: 0,
      compatibility: 'legacy',
      legacy: true,
      tombstones: [],
      overrides: [],
      records,
      errors: [],
    };
  }

  if (!isRecord(parsed)) {
    return emptyParsed('unknown', 0, 'File is not a question bank export.');
  }

  if (!('format' in parsed)) {
    return emptyParsed(
      'unknown',
      0,
      'File is not a versioned question bank export (missing format identifier).',
    );
  }

  if (parsed.format !== QUESTION_BANK_FORMAT) {
    return emptyParsed(
      'unknown',
      0,
      `Unrecognized file format: ${String(parsed.format)}.`,
    );
  }

  const formatVersion = parsed.formatVersion;
  if (typeof formatVersion !== 'number' || !Number.isInteger(formatVersion) || formatVersion < 1) {
    return emptyParsed('unknown', 0, 'Missing or invalid question bank format version.');
  }

  if (formatVersion > QUESTION_BANK_FORMAT_VERSION) {
    return emptyParsed(
      'future',
      formatVersion,
      `Unsupported question bank format version ${formatVersion} (this build supports up to ${QUESTION_BANK_FORMAT_VERSION}).`,
    );
  }

  if (!Array.isArray(parsed.questions)) {
    return emptyParsed('current', formatVersion, 'Question bank export does not contain a questions array.');
  }

  const tombstones = normalizeStringList(parsed.tombstones);
  if (tombstones === null) {
    return emptyParsed('current', formatVersion, 'Question bank export has an invalid tombstones list.');
  }

  const overrides = normalizeStringList(parsed.overrides);
  if (overrides === null) {
    return emptyParsed('current', formatVersion, 'Question bank export has an invalid overrides list.');
  }

  const records = parseRecords(parsed.questions);
  const payloadIds = new Set(
    records.map((record) => record.questionId).filter((id): id is string => typeof id === 'string'),
  );

  const errors: string[] = [];
  for (const id of tombstones) {
    if (payloadIds.has(id)) {
      errors.push(`Tombstone "${id}" also appears as a question in the same file.`);
    }
  }
  for (const id of overrides) {
    if (!payloadIds.has(id)) {
      errors.push(`Override "${id}" is not present in the questions array.`);
    }
  }

  return {
    ok: errors.length === 0,
    message: errors[0],
    formatVersion,
    compatibility: 'current',
    legacy: false,
    tombstones,
    overrides,
    records,
    errors,
  };
}

/** Wraps questions in a versioned, self-describing export envelope. */
export function createQuestionBankExport(
  questions: readonly Question[],
  options: CreateQuestionBankExportOptions = {},
): QuestionBankEnvelope {
  return {
    format: QUESTION_BANK_FORMAT,
    formatVersion: QUESTION_BANK_FORMAT_VERSION,
    exportedAt: options.now ?? new Date().toISOString(),
    generator: {
      name: options.appName ?? 'Knowledge Realms',
      version: options.appVersion ?? 'unknown',
    },
    tombstones: [...new Set(options.tombstones ?? [])].sort(),
    overrides: [...new Set(options.overrides ?? [])].sort(),
    questions: [...questions],
  };
}

/** Serializes a bank envelope to JSON. */
export function serializeQuestionBankExport(envelope: QuestionBankEnvelope): string {
  return JSON.stringify(envelope, null, 2);
}

/** Convenience: wraps and serializes a question bank in one call. */
export function exportQuestionBankToString(
  questions: readonly Question[],
  options: CreateQuestionBankExportOptions = {},
): string {
  return serializeQuestionBankExport(createQuestionBankExport(questions, options));
}
