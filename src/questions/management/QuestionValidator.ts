import {
  EducationalTier,
  SubjectId,
} from '../../core/types/education';
import {
  QuestionType,
  QuestionStatus,
  isValidDifficulty,
  type Question,
  type QuestionChoice,
} from '../../core/types/question';

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
   * Rules enforced:
   * - Common fields (id, educationalTier, subject, topic, difficulty, stem, timeLimit, baseMasteryExp, status, timestamps)
   * - MultipleChoice: at least 2 choices, unique choice IDs, non-empty choice text, correctAnswer must match a choiceId
   * - Identification: at least one accepted answer (either correctAnswer or acceptedAnswers)
   * - Essay: must define expectedAnswer as model answer or grading reference
   */
  static validate(question: Partial<Question>): QuestionValidationResult {
    const errors: QuestionValidationError[] = [];

    // ── Common Field Validation ──────────────────────────────────────────────

    if (!question.id || typeof question.id !== 'string' || question.id.trim() === '') {
      errors.push({ field: 'id', message: 'Question ID must be a non-empty string.' });
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
      question.timeLimit <= 0 ||
      Number.isNaN(question.timeLimit)
    ) {
      errors.push({ field: 'timeLimit', message: 'Time limit must be a positive number in seconds.' });
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
      const validAccepted = question.acceptedAnswers.filter(
        (ans) => typeof ans === 'string' && ans.trim() !== '',
      );
      if (validAccepted.length > 0) {
        hasAccepted = true;
      }
      if (question.acceptedAnswers.some((ans) => typeof ans !== 'string' || ans.trim() === '')) {
        errors.push({
          field: 'acceptedAnswers',
          message: 'All entries in acceptedAnswers must be non-empty strings.',
        });
      }
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
