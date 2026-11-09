import type { Question } from '../../core/types/question';
import {
  createQuestionBankExport,
  parseQuestionBankImport,
  type CreateQuestionBankExportOptions,
  type ParsedQuestionBank,
  type QuestionBankEnvelope,
} from './QuestionBankTransfer';

/**
 * Phase 28.5 — Optional versioned content packs.
 *
 * A content pack is a named, versioned container around a question bank
 * envelope. The bank keeps its own format/schema version checks, so a pack can
 * never smuggle in records the ordinary importer would reject. The module is
 * pure and execution-free; no pack loader is wired into the runtime yet.
 */

export const CONTENT_PACK_FORMAT = 'knowledge-realms-content-pack';
export const CONTENT_PACK_FORMAT_VERSION = 1;

export type ContentPackCompatibility = 'current' | 'future' | 'unknown';

export interface ContentPackMetadata {
  id: string;
  name: string;
  /** Author-defined pack version string (informational). */
  packVersion: string;
}

export interface ContentPackEnvelope extends ContentPackMetadata {
  format: typeof CONTENT_PACK_FORMAT;
  formatVersion: number;
  /** ISO timestamp of the export. */
  createdAt: string;
  generator: {
    name: string;
    version: string;
  };
  bank: QuestionBankEnvelope;
}

export interface CreateContentPackOptions extends CreateQuestionBankExportOptions {
  id: string;
  name: string;
  packVersion: string;
}

export interface ParsedContentPack {
  ok: boolean;
  message?: string;
  formatVersion: number;
  compatibility: ContentPackCompatibility;
  pack?: ContentPackMetadata;
  bank?: ParsedQuestionBank;
  errors: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function fail(
  compatibility: ContentPackCompatibility,
  formatVersion: number,
  message: string,
): ParsedContentPack {
  return { ok: false, message, formatVersion, compatibility, errors: [message] };
}

/** Builds a versioned content pack around a versioned question bank. */
export function createContentPack(
  questions: readonly Question[],
  options: CreateContentPackOptions,
): ContentPackEnvelope {
  const bank = createQuestionBankExport(questions, options);
  return {
    format: CONTENT_PACK_FORMAT,
    formatVersion: CONTENT_PACK_FORMAT_VERSION,
    id: options.id,
    name: options.name,
    packVersion: options.packVersion,
    createdAt: bank.exportedAt,
    generator: bank.generator,
    bank,
  };
}

/** Serializes a content pack to JSON. */
export function serializeContentPack(pack: ContentPackEnvelope): string {
  return JSON.stringify(pack, null, 2);
}

/** Parses and compatibility-checks a content pack (execution-free). */
export function parseContentPack(input: string | unknown): ParsedContentPack {
  let parsed: unknown = input;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch {
      return fail('unknown', 0, 'File is not valid JSON.');
    }
  }

  if (!isRecord(parsed)) {
    return fail('unknown', 0, 'File is not a content pack.');
  }

  if (!('format' in parsed)) {
    return fail('unknown', 0, 'File is not a versioned content pack (missing format identifier).');
  }

  if (parsed.format !== CONTENT_PACK_FORMAT) {
    return fail('unknown', 0, `Unrecognized file format: ${String(parsed.format)}.`);
  }

  const formatVersion = parsed.formatVersion;
  if (typeof formatVersion !== 'number' || !Number.isInteger(formatVersion) || formatVersion < 1) {
    return fail('unknown', 0, 'Missing or invalid content pack format version.');
  }

  if (formatVersion > CONTENT_PACK_FORMAT_VERSION) {
    return fail(
      'future',
      formatVersion,
      `Unsupported content pack format version ${formatVersion} (this build supports up to ${CONTENT_PACK_FORMAT_VERSION}).`,
    );
  }

  if (!nonEmptyString(parsed.id) || !nonEmptyString(parsed.name) || !nonEmptyString(parsed.packVersion)) {
    return fail('current', formatVersion, 'Content pack requires non-empty id, name, and packVersion.');
  }

  if (!isRecord(parsed.bank)) {
    return fail('current', formatVersion, 'Content pack does not contain a question bank payload.');
  }

  const bank = parseQuestionBankImport(parsed.bank);
  if (!bank.ok) {
    return {
      ok: false,
      message: bank.message ?? 'Content pack question bank is not usable.',
      formatVersion,
      compatibility: 'current',
      pack: { id: parsed.id, name: parsed.name, packVersion: parsed.packVersion },
      bank,
      errors: bank.errors.length > 0 ? bank.errors : [bank.message ?? 'Content pack question bank is not usable.'],
    };
  }

  return {
    ok: true,
    formatVersion,
    compatibility: 'current',
    pack: { id: parsed.id, name: parsed.name, packVersion: parsed.packVersion },
    bank,
    errors: [],
  };
}
