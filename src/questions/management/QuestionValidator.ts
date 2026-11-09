import {
  EducationalTier,
  SubjectId,
} from '../../core/types/education';
import {
  QuestionType,
  QuestionStatus,
  isValidDifficulty,
  QUESTION_TIMER_MAX_SECONDS,
  QUESTION_TIMER_MIN_SECONDS,
  type Question,
  type QuestionChoice,
} from '../../core/types/question';
import {
  QUESTION_ALIAS_MAX_LENGTH,
  QUESTION_EXPLANATION_MAX_LENGTH,
  QUESTION_SUBTOPIC_MAX_LENGTH,
  findDuplicateChoiceTextIndexes,
  isStableQuestionId,
  isStructurallyValidTimer,
  isValidQuestionSource,
  isValidReviewStatus,
  normalizeAlias,
} from './QuestionContentStandards';

/**
 * A validation issue discovered on a specific field of a Question.
 */
export interface QuestionValidationError {
  /** Property or field path where the issue was identified. */
  field: string;
  /** Human-readable explanation of why the value is invalid. */
  message: string;
}

/**
 * Result returned by the question validator.
 */
export interface QuestionValidationResult {
  /** True if there are zero validation errors. */
  isValid: boolean;
  /** List of validation errors discovered (empty when valid). */
  errors: QuestionValidationError[];
}

/**
 * Validates question records according to domain requirements and format rules.
 * Headless utility decoupled from Phaser and UI layers.
 */
export class QuestionValidator {
  /**
   * Validates a complete or partial Question entity.
   *
   * Rules enforced (structural only — factual review is a separate audit):
   * - Stable id, subject, topic, optional subtopic, tier, difficulty, type, prompt
   * - MultipleChoice: at least 2 choices, unique choice IDs and texts, correctAnswer must match a choiceId
   * - Identification: at least one accepted answer; aliases must be non-empty and unique after normalization
   * - Essay: must define expectedAnswer as a model answer or grading reference
   * - Timer must be a whole number of seconds inside the configured bounds
   * - Explanation, source, and review status are optional and are not invented
   */
  static validate(question: Partial<Question>): QuestionValidationResult {
    const errors: QuestionValidationError[] = [];

    // ── Common Field Validation ──────────────────────────────────────────────

    if (!question.id || typeof question.id !== 'string' || !isStableQuestionId(question.id)) {
      errors.push({
        field: 'id',
        message:
          'Question ID must be a stable lowercase slug or UUID (letters, digits, and single hyphens, 1–64 characters).',
      });
    }

    const validTiers = Object.values(EducationalTier) as string[];
    if (!question.educationalTier || !validTiers.includes(question.educationalTier)) {
      errors.push({
        field: 'educationalTier',
        message: `Educational tier must be one of: ${validTiers.join(', ')}.`,
      });
    }

    const validSubjects = Object.values(SubjectId) as string[];
    if (!question.subject || !validSubjects.includes(question.subject)) {
      errors.push({
        field: 'subject',
        message: `Subject must be one of: ${validSubjects.join(', ')}.`,
      });
    }

    if (!question.topic || typeof question.topic !== 'string' || question.topic.trim() === '') {
      errors.push({ field: 'topic', message: 'Topic must be a non-empty string.' });
    }

    if (question.subtopic !== undefined) {
      if (
        typeof question.subtopic !== 'string' ||
        question.subtopic.trim() === '' ||
        question.subtopic.length > QUESTION_SUBTOPIC_MAX_LENGTH
      ) {
        errors.push({
          field: 'subtopic',
          message: `Subtopic, when present, must be a non-empty string of at most ${QUESTION_SUBTOPIC_MAX_LENGTH} characters.`,
        });
      }
    }

    if (
      question.difficulty === undefined ||
      typeof question.difficulty !== 'number' ||
      !isValidDifficulty(question.difficulty)
    ) {
      errors.push({
        field: 'difficulty',
        message: 'Difficulty must be an integer between 1 (easiest) and 5 (hardest).',
      });
    }

    const validTypes = Object.values(QuestionType) as string[];
    if (!question.type || !validTypes.includes(question.type)) {
      errors.push({
        field: 'type',
        message: `Question type must be one of: ${validTypes.join(', ')}.`,
      });
    }

    if (!question.question || typeof question.question !== 'string' || question.question.trim() === '') {
      errors.push({ field: 'question', message: 'Question text stem must be a non-empty string.' });
    }

    if (
      question.timeLimit === undefined ||
      typeof question.timeLimit !== 'number' ||
      !isStructurallyValidTimer(question.timeLimit)
    ) {
      errors.push({
        field: 'timeLimit',
        message: `Time limit must be a whole number of seconds from ${QUESTION_TIMER_MIN_SECONDS} to ${QUESTION_TIMER_MAX_SECONDS}.`,
      });
    }

    if (
      question.baseMasteryExp === undefined ||
      typeof question.baseMasteryExp !== 'number' ||
      question.baseMasteryExp <= 0 ||
      Number.isNaN(question.baseMasteryExp)
    ) {
      errors.push({ field: 'baseMasteryExp', message: 'Base mastery EXP must be a positive number.' });
    }

    const validStatuses = Object.values(QuestionStatus) as string[];
    if (!question.status || !validStatuses.includes(question.status)) {
      errors.push({
        field: 'status',
        message: `Status must be one of: ${validStatuses.join(', ')}.`,
      });
    }

    if (question.tags !== undefined) {
      if (!Array.isArray(question.tags)) {
        errors.push({ field: 'tags', message: 'Tags must be an array of strings.' });
      } else {
        const hasInvalidTag = question.tags.some((tag) => typeof tag !== 'string' || tag.trim() === '');
        if (hasInvalidTag) {
          errors.push({ field: 'tags', message: 'Each tag must be a non-empty string.' });
        }
      }
    }

    if (question.professionTags !== undefined) {
      if (!Array.isArray(question.professionTags)) {
        errors.push({ field: 'professionTags', message: 'Profession tags must be an array of strings.' });
      } else {
        const hasInvalid = question.professionTags.some((tag) => typeof tag !== 'string' || tag.trim() === '');
        if (hasInvalid) {
          errors.push({ field: 'professionTags', message: 'Each profession tag must be a non-empty string.' });
        }
      }
    }

    if (question.specialtyTags !== undefined) {
      if (!Array.isArray(question.specialtyTags)) {
        errors.push({ field: 'specialtyTags', message: 'Specialty tags must be an array of strings.' });
      } else {
        const hasInvalid = question.specialtyTags.some((tag) => typeof tag !== 'string' || tag.trim() === '');
        if (hasInvalid) {
          errors.push({ field: 'specialtyTags', message: 'Each specialty tag must be a non-empty string.' });
        }
      }
    }

    if (question.explanation !== undefined) {
      if (
        typeof question.explanation !== 'string' ||
        question.explanation.trim() === '' ||
        question.explanation.length > QUESTION_EXPLANATION_MAX_LENGTH
      ) {
        errors.push({
          field: 'explanation',
          message: `Explanation, when present, must be a non-empty string of at most ${QUESTION_EXPLANATION_MAX_LENGTH} characters.`,
        });
      }
    }

    if (question.source !== undefined && !isValidQuestionSource(question.source)) {
      errors.push({
        field: 'source',
        message:
          'Source, when present, must be an author-supplied label and an optional non-empty locator. The validator does not create citations.',
      });
    }

    if (
      question.reviewStatus !== undefined &&
      (typeof question.reviewStatus !== 'string' || !isValidReviewStatus(question.reviewStatus))
    ) {
      errors.push({
        field: 'reviewStatus',
        message:
          'Review status, when present, must be unreviewed, author-checked, or needs-revision. It is not an expert-review claim.',
      });
    }

    if (question.createdAt !== undefined && (typeof question.createdAt !== 'string' || question.createdAt.trim() === '')) {
      errors.push({ field: 'createdAt', message: 'createdAt must be a valid timestamp string if provided.' });
    }

    if (question.updatedAt !== undefined && (typeof question.updatedAt !== 'string' || question.updatedAt.trim() === '')) {
      errors.push({ field: 'updatedAt', message: 'updatedAt must be a valid timestamp string if provided.' });
    }

    // ── Type-Specific Validation ─────────────────────────────────────────────

    if (question.type === QuestionType.MultipleChoice) {
      this.validateMultipleChoice(question, errors);
    } else if (question.type === QuestionType.Identification) {
      this.validateIdentification(question, errors);
    } else if (question.type === QuestionType.Essay) {
      this.validateEssay(question, errors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // ─── Private Type Validators ────────────────────────────────────────────────

  private static validateMultipleChoice(
    question: Partial<Question>,
    errors: QuestionValidationError[],
  ): void {
    if (!Array.isArray(question.choices) || question.choices.length < 2) {
      errors.push({
        field: 'choices',
        message: 'Multiple choice questions must have at least 2 choices.',
      });
      return;
    }

    const seenIds = new Set<string>();
    let hasMalformedChoice = false;

    question.choices.forEach((choice: QuestionChoice, index: number) => {
      if (!choice || typeof choice !== 'object') {
        errors.push({
          field: `choices[${index}]`,
          message: 'Each choice must be an object with choiceId and text.',
        });
        hasMalformedChoice = true;
        return;
      }

      if (!choice.choiceId || typeof choice.choiceId !== 'string' || choice.choiceId.trim() === '') {
        errors.push({
          field: `choices[${index}].choiceId`,
          message: 'Choice ID must be a non-empty string.',
        });
        hasMalformedChoice = true;
      } else if (seenIds.has(choice.choiceId)) {
        errors.push({
          field: `choices[${index}].choiceId`,
          message: `Duplicate choice ID detected: "${choice.choiceId}".`,
        });
      } else {
        seenIds.add(choice.choiceId);
      }

      if (!choice.text || typeof choice.text !== 'string' || choice.text.trim() === '') {
        errors.push({
          field: `choices[${index}].text`,
          message: 'Choice text must be a non-empty string.',
        });
        hasMalformedChoice = true;
      }
    });

    for (const index of findDuplicateChoiceTextIndexes(question.choices)) {
      errors.push({
        field: `choices[${index}].text`,
        message: 'Duplicate choice text detected. Choices must be distinct after trimming and lowercasing.',
      });
    }

    if (hasMalformedChoice) return;

    if (!question.correctAnswer || typeof question.correctAnswer !== 'string' || question.correctAnswer.trim() === '') {
      errors.push({
        field: 'correctAnswer',
        message: 'Multiple choice questions must specify a correctAnswer referencing a valid choiceId.',
      });
    } else if (!seenIds.has(question.correctAnswer)) {
      errors.push({
        field: 'correctAnswer',
        message: `correctAnswer "${question.correctAnswer}" does not match any valid choiceId in choices.`,
      });
    }
  }

  private static validateIdentification(
    question: Partial<Question>,
    errors: QuestionValidationError[],
  ): void {
    const hasCanonical =
      typeof question.correctAnswer === 'string' && question.correctAnswer.trim() !== '';

    let hasAccepted = false;
    if (Array.isArray(question.acceptedAnswers)) {
      const seen = new Set<string>();
      question.acceptedAnswers.forEach((ans, index) => {
        if (typeof ans !== 'string' || ans.trim() === '' || ans.length > QUESTION_ALIAS_MAX_LENGTH) {
          errors.push({
            field: 'acceptedAnswers',
            message: `acceptedAnswers[${index}] must be a non-empty string of at most ${QUESTION_ALIAS_MAX_LENGTH} characters.`,
          });
          return;
        }
        const key = normalizeAlias(ans);
        if (seen.has(key)) {
          errors.push({
            field: 'acceptedAnswers',
            message: `Duplicate alias detected after trimming and lowercasing: "${ans}".`,
          });
          return;
        }
        seen.add(key);
        hasAccepted = true;
      });
    } else if (question.acceptedAnswers !== undefined) {
      errors.push({
        field: 'acceptedAnswers',
        message: 'acceptedAnswers must be an array of strings when provided.',
      });
    }

    if (!hasCanonical && !hasAccepted) {
      errors.push({
        field: 'correctAnswer',
        message: 'Identification questions must specify at least one accepted answer (via correctAnswer or acceptedAnswers).',
      });
    }
  }

  private static validateEssay(
    question: Partial<Question>,
    errors: QuestionValidationError[],
  ): void {
    if (
      !question.expectedAnswer ||
      typeof question.expectedAnswer !== 'string' ||
      question.expectedAnswer.trim() === ''
    ) {
      errors.push({
        field: 'expectedAnswer',
        message: 'Essay questions must provide an expectedAnswer as a model answer or grading reference.',
      });
    }
  }
}

/**
 * Functional convenience wrapper for QuestionValidator.validate.
 */
export function validateQuestion(question: Partial<Question>): QuestionValidationResult {
  return QuestionValidator.validate(question);
}
