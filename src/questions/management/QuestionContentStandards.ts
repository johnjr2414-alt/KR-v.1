import {
  ContentReviewStatus,
  QUESTION_ID_MAX_LENGTH,
  QUESTION_TIMER_MAX_SECONDS,
  QUESTION_TIMER_MIN_SECONDS,
  QUESTION_TIMER_RECOMMENDED_MAX_SECONDS,
  QUESTION_TIMER_RECOMMENDED_MIN_SECONDS,
  type Question,
  type QuestionChoice,
  type QuestionSource,
} from '../../core/types/question';

/**
 * Stable ids are lowercase slugs or UUIDs: letters, digits, and single hyphens.
 * This keeps bundled ids (`elem-math-001`) and `crypto.randomUUID()` values valid
 * without rewriting stored records.
 */
export const STABLE_QUESTION_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const QUESTION_EXPLANATION_MAX_LENGTH = 2000;
export const QUESTION_ALIAS_MAX_LENGTH = 120;
export const QUESTION_SUBTOPIC_MAX_LENGTH = 80;
export const QUESTION_SOURCE_LABEL_MAX_LENGTH = 300;
export const QUESTION_SOURCE_LOCATOR_MAX_LENGTH = 500;

export function isStableQuestionId(id: string): boolean {
  return (
    id.length >= 1 &&
    id.length <= QUESTION_ID_MAX_LENGTH &&
    STABLE_QUESTION_ID_PATTERN.test(id)
  );
}

export function isStructurallyValidTimer(timeLimit: number): boolean {
  return (
    Number.isInteger(timeLimit) &&
    timeLimit >= QUESTION_TIMER_MIN_SECONDS &&
    timeLimit <= QUESTION_TIMER_MAX_SECONDS
  );
}

export function isTimerOutsideRecommendedBand(timeLimit: number): boolean {
  return (
    timeLimit < QUESTION_TIMER_RECOMMENDED_MIN_SECONDS ||
    timeLimit > QUESTION_TIMER_RECOMMENDED_MAX_SECONDS
  );
}

/** Trim and lowercase for alias comparison. Does not rewrite the stored value. */
export function normalizeAlias(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Returns choice indexes whose visible text repeats an earlier choice,
 * compared case-insensitively after trimming.
 */
export function findDuplicateChoiceTextIndexes(choices: QuestionChoice[]): number[] {
  const seen = new Map<string, number>();
  const duplicates: number[] = [];

  choices.forEach((choice, index) => {
    if (!choice || typeof choice.text !== 'string') return;
    const key = normalizeAlias(choice.text);
    if (key === '') return;
    if (seen.has(key)) {
      duplicates.push(index);
    } else {
      seen.set(key, index);
    }
  });

  return duplicates;
}

export function isValidReviewStatus(value: string): value is ContentReviewStatus {
  return (Object.values(ContentReviewStatus) as string[]).includes(value);
}

export function isValidQuestionSource(source: QuestionSource): boolean {
  if (!source || typeof source !== 'object') return false;
  if (
    typeof source.label !== 'string' ||
    source.label.trim() === '' ||
    source.label.length > QUESTION_SOURCE_LABEL_MAX_LENGTH
  ) {
    return false;
  }
  if (source.locator !== undefined) {
    if (
      typeof source.locator !== 'string' ||
      source.locator.trim() === '' ||
      source.locator.length > QUESTION_SOURCE_LOCATOR_MAX_LENGTH
    ) {
      return false;
    }
  }
  return true;
}

export function hasRedundantCanonicalAlias(question: Partial<Question>): boolean {
  if (typeof question.correctAnswer !== 'string' || !Array.isArray(question.acceptedAnswers)) {
    return false;
  }
  const canonical = normalizeAlias(question.correctAnswer);
  if (canonical === '') return false;
  return question.acceptedAnswers.some(
    (alias) => typeof alias === 'string' && normalizeAlias(alias) === canonical,
  );
}
