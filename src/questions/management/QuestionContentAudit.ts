import {
  ContentReviewStatus,
  QUESTION_TIMER_RECOMMENDED_MAX_SECONDS,
  QUESTION_TIMER_RECOMMENDED_MIN_SECONDS,
  type Question,
} from '../../core/types/question';
import {
  hasRedundantCanonicalAlias,
  isStructurallyValidTimer,
  isTimerOutsideRecommendedBand,
} from './QuestionContentStandards';
import {
  QuestionValidator,
  type QuestionValidationError,
} from './QuestionValidator';

/**
 * Authoring note that does not, by itself, reject a question.
 * Structural defects stay on {@link QuestionValidator}.
 */
export interface ContentAdvisory {
  field: string;
  code:
    | 'missing-explanation'
    | 'subtopic-not-recorded'
    | 'source-not-recorded'
    | 'review-pending'
    | 'timer-outside-recommended'
    | 'redundant-alias';
  message: string;
}

export interface ContentStandardsAssessment {
  /** True when the record passes structural validation and may be stored. */
  structurallyValid: boolean;
  structuralErrors: QuestionValidationError[];
  /**
   * Quality notes for human review. These do not change the question and
   * do not claim that an answer is factually right or wrong.
   */
  advisories: ContentAdvisory[];
}

/**
 * Structural validation plus non-blocking content notes.
 * Does not mutate the question and does not invent sources or review claims.
 */
export function assessQuestionContent(
  question: Partial<Question>,
): ContentStandardsAssessment {
  const snapshot = question;
  const structural = QuestionValidator.validate(snapshot);
  const advisories: ContentAdvisory[] = [];

  if (snapshot.explanation === undefined) {
    advisories.push({
      field: 'explanation',
      code: 'missing-explanation',
      message:
        'No explanation is recorded. This is an authoring gap, not a factual verdict.',
    });
  }

  if (snapshot.subtopic === undefined) {
    advisories.push({
      field: 'subtopic',
      code: 'subtopic-not-recorded',
      message: 'No subtopic is recorded. Subtopics are optional.',
    });
  }

  if (snapshot.source === undefined) {
    advisories.push({
      field: 'source',
      code: 'source-not-recorded',
      message:
        'No source is recorded. The game does not invent citations, and a missing source is not an expert-review claim.',
    });
  }

  if (
    snapshot.reviewStatus === undefined ||
    snapshot.reviewStatus === ContentReviewStatus.Unreviewed
  ) {
    advisories.push({
      field: 'reviewStatus',
      code: 'review-pending',
      message:
        'No completed human review is recorded. Publication status is separate from factual review.',
    });
  }

  if (
    typeof snapshot.timeLimit === 'number' &&
    isStructurallyValidTimer(snapshot.timeLimit) &&
    isTimerOutsideRecommendedBand(snapshot.timeLimit)
  ) {
    advisories.push({
      field: 'timeLimit',
      code: 'timer-outside-recommended',
      message: `Timer ${snapshot.timeLimit}s is outside the recommended ${QUESTION_TIMER_RECOMMENDED_MIN_SECONDS}–${QUESTION_TIMER_RECOMMENDED_MAX_SECONDS}s band. It remains structurally valid.`,
    });
  }

  if (hasRedundantCanonicalAlias(snapshot)) {
    advisories.push({
      field: 'acceptedAnswers',
      code: 'redundant-alias',
      message:
        'An accepted alias repeats the canonical answer after trimming and lowercasing. The record is not rewritten.',
    });
  }

  return {
    structurallyValid: structural.isValid,
    structuralErrors: structural.errors,
    advisories,
  };
}
