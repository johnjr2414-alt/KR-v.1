import type { EducationalTier, SubjectId } from '../../core/types/education';
import {
  ContentReviewStatus,
  QuestionStatus,
  QuestionType,
  type Question,
} from '../../core/types/question';
import {
  QuestionValidator,
  type QuestionValidationError,
  type QuestionValidationResult,
} from './QuestionValidator';

/**
 * A single answer choice as captured by the editor form.
 * `choiceId` is the stable identifier (typically a letter like "a").
 */
export interface QuestionDraftChoiceInput {
  choiceId: string;
  text: string;
}

/**
 * Raw, string-oriented editor input.
 *
 * The Super Admin form produces plain strings (select values, text inputs).
 * This structure mirrors the form so the assembly and validation logic can be
 * exercised headlessly, without a DOM.
 */
export interface QuestionDraftInput {
  educationalTier: string;
  subject: string;
  topic: string;
  difficulty: string;
  type: string;
  question: string;
  timeLimit: string;
  baseMasteryExp: string;
  status: string;
  /** Authoring review marker. Empty/undefined means no marker is recorded. */
  reviewStatus?: string;
  explanation?: string;
  /** Comma-separated tag list. */
  tags?: string;
  /** Multiple-choice options (ignored for other types). */
  choices?: QuestionDraftChoiceInput[];
  /** Multiple-choice: the selected correct choiceId. */
  correctChoiceId?: string;
  /** Identification: canonical correct answer. */
  correctAnswer?: string;
  /** Identification: comma-separated accepted alternatives. */
  acceptedAnswers?: string;
  /** Essay: model answer / grading reference. */
  expectedAnswer?: string;
}

/** Result of assembling and validating an editor draft. */
export interface QuestionDraftValidation {
  /** The assembled (partial) question record. */
  draft: Partial<Question>;
  isValid: boolean;
  errors: QuestionValidationError[];
  /**
   * Errors grouped by their root form field (e.g. `choices[2].text` → `choices`),
   * for attaching messages next to the relevant control.
   */
  byField: Record<string, string[]>;
}

/** Splits a comma-separated input into trimmed, non-empty entries. */
function splitList(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
}

/**
 * Parses a numeric input field. Empty or non-numeric input yields `NaN`, which
 * the validator then reports — the editor never silently coerces bad input to a
 * default value.
 */
function parseInteger(raw: string): number {
  const trimmed = (raw ?? '').trim();
  if (trimmed === '') return NaN;
  return Number.parseInt(trimmed, 10);
}

/** Reduces a field path such as `choices[2].text` to its root field `choices`. */
export function rootFieldName(field: string): string {
  const bracket = field.indexOf('[');
  const dot = field.indexOf('.');
  let end = field.length;
  if (bracket >= 0) end = Math.min(end, bracket);
  if (dot >= 0) end = Math.min(end, dot);
  return field.slice(0, end);
}

/**
 * Assembles a partial {@link Question} from raw editor input.
 *
 * The function is pure and performs no validation — it simply maps the form
 * shape onto the domain shape. Use {@link validateQuestionDraft} to also
 * validate the result.
 */
export function buildQuestionDraft(input: QuestionDraftInput): Partial<Question> {
  const type = input.type as QuestionType;

  const draft: Partial<Question> = {
    educationalTier: input.educationalTier as EducationalTier,
    subject: input.subject as SubjectId,
    topic: (input.topic ?? '').trim(),
    difficulty: parseInteger(input.difficulty),
    type,
    question: (input.question ?? '').trim(),
    timeLimit: parseInteger(input.timeLimit),
    baseMasteryExp: parseInteger(input.baseMasteryExp),
    status: input.status as QuestionStatus,
  };

  const explanation = (input.explanation ?? '').trim();
  if (explanation !== '') draft.explanation = explanation;

  const reviewStatus = (input.reviewStatus ?? '').trim();
  if (reviewStatus !== '') draft.reviewStatus = reviewStatus as ContentReviewStatus;

  const tags = splitList(input.tags);
  if (tags.length > 0) draft.tags = tags;

  if (type === QuestionType.MultipleChoice) {
    const choices = (input.choices ?? [])
      .map((choice) => ({
        choiceId: (choice.choiceId ?? '').trim(),
        text: (choice.text ?? '').trim(),
      }))
      .filter((choice) => choice.choiceId !== '' || choice.text !== '');
    draft.choices = choices;

    const correct = (input.correctChoiceId ?? '').trim();
    if (correct !== '') draft.correctAnswer = correct;
  } else if (type === QuestionType.Identification) {
    const canonical = (input.correctAnswer ?? '').trim();
    if (canonical !== '') draft.correctAnswer = canonical;

    const accepted = splitList(input.acceptedAnswers);
    if (accepted.length > 0) draft.acceptedAnswers = accepted;
  } else if (type === QuestionType.Essay) {
    const expected = (input.expectedAnswer ?? '').trim();
    if (expected !== '') draft.expectedAnswer = expected;
  }

  return draft;
}

/**
 * Fields assigned by the persistence path rather than entered by the author.
 * The editor never supplies these, so their absence is not an author error.
 * The manager still validates the fully-assembled record (including `id`) on
 * the write path, so nothing invalid can be silently persisted.
 */
const SYSTEM_MANAGED_FIELDS: ReadonlySet<string> = new Set(['id', 'createdAt', 'updatedAt']);

/** Groups validation errors by their root form field. */
export function groupErrorsByField(
  errors: readonly QuestionValidationError[],
): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const error of errors) {
    const key = rootFieldName(error.field);
    (grouped[key] ??= []).push(error.message);
  }
  return grouped;
}

/**
 * Assembles and validates an editor draft.
 *
 * The assembled record is validated with the same {@link QuestionValidator}
 * used on the write path, so the editor cannot diverge from persistence rules.
 */
export function validateQuestionDraft(input: QuestionDraftInput): QuestionDraftValidation {
  const draft = buildQuestionDraft(input);
  const result: QuestionValidationResult = QuestionValidator.validate(draft);
  const errors = result.errors.filter(
    (error) => !SYSTEM_MANAGED_FIELDS.has(rootFieldName(error.field)),
  );
  return {
    draft,
    isValid: errors.length === 0,
    errors,
    byField: groupErrorsByField(errors),
  };
}
