import type { Question } from '../../core/types/question';
import { QuestionType } from '../../core/types/question';
import { AnswerOutcome } from '../../core/types/combat';

/**
 * Result of evaluating a player answer against a question.
 */
export interface AnswerEvaluationResult {
  /** Evaluation outcome: correct, incorrect, or timeout. */
  outcome: AnswerOutcome;
  /** Whether the answer was considered correct. */
  isCorrect: boolean;
  /** Canonical correct answer or display text. */
  correctAnswerText: string;
  /** Explanation associated with the question, if provided. */
  explanation?: string;
  /** Normalized representation of the submitted answer. */
  submittedAnswer: string;
}

/**
 * Normalizes input text for comparison:
 * - Converts to lowercase
 * - Strips leading/trailing whitespace
 * - Collapses internal consecutive whitespace to single spaces
 * - Strips common terminal punctuation (. , ! ?)
 */
export function normalizeAnswerText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,!?]+$/, '')
    .trim();
}

/**
 * Headless evaluator for player answers across question formats.
 * Pure domain logic independent of DOM and Phaser.
 */
export class AnswerEvaluator {
  /**
   * Evaluates a player submission against a Question.
   *
   * @param question - The question definition.
   * @param answer - The submitted answer (choiceId for Multiple Choice, text for Identification).
   * @param isTimeout - Whether this evaluation was triggered by a timeout.
   */
  static evaluate(
    question: Question,
    answer: string,
    isTimeout = false,
  ): AnswerEvaluationResult {
    const explanation = question.explanation;

    if (isTimeout) {
      return {
        outcome: AnswerOutcome.Timeout,
        isCorrect: false,
        correctAnswerText: this.getCanonicalAnswerText(question),
        explanation,
        submittedAnswer: '',
      };
    }

    if (question.type === QuestionType.MultipleChoice) {
      return this.evaluateMultipleChoice(question, answer);
    }

    if (question.type === QuestionType.Identification) {
      return this.evaluateIdentification(question, answer);
    }

    // Default / Essay (or future types)
    const expected = question.expectedAnswer || question.correctAnswer || '';
    const isCorrect = normalizeAnswerText(answer) === normalizeAnswerText(expected);
    return {
      outcome: isCorrect ? AnswerOutcome.Correct : AnswerOutcome.Incorrect,
      isCorrect,
      correctAnswerText: expected,
      explanation,
      submittedAnswer: answer,
    };
  }

  private static evaluateMultipleChoice(
    question: Question,
    submittedChoiceId: string,
  ): AnswerEvaluationResult {
    const normalizedSubmitted = submittedChoiceId.trim();
    const correctChoiceId = (question.correctAnswer || '').trim();

    const isCorrect =
      normalizedSubmitted.length > 0 &&
      normalizedSubmitted.toLowerCase() === correctChoiceId.toLowerCase();

    return {
      outcome: isCorrect ? AnswerOutcome.Correct : AnswerOutcome.Incorrect,
      isCorrect,
      correctAnswerText: this.getCanonicalAnswerText(question),
      explanation: question.explanation,
      submittedAnswer: submittedChoiceId,
    };
  }

  private static evaluateIdentification(
    question: Question,
    submittedText: string,
  ): AnswerEvaluationResult {
    const normalizedInput = normalizeAnswerText(submittedText);

    // Build list of valid normalized targets
    const validTargets: string[] = [];

    if (question.correctAnswer && question.correctAnswer.trim() !== '') {
      validTargets.push(normalizeAnswerText(question.correctAnswer));
    }

    if (Array.isArray(question.acceptedAnswers)) {
      for (const accepted of question.acceptedAnswers) {
        if (typeof accepted === 'string' && accepted.trim() !== '') {
          validTargets.push(normalizeAnswerText(accepted));
        }
      }
    }

    const isCorrect =
      normalizedInput.length > 0 && validTargets.includes(normalizedInput);

    return {
      outcome: isCorrect ? AnswerOutcome.Correct : AnswerOutcome.Incorrect,
      isCorrect,
      correctAnswerText: this.getCanonicalAnswerText(question),
      explanation: question.explanation,
      submittedAnswer: submittedText,
    };
  }

  /**
   * Resolves a human-friendly string for the correct answer.
   */
  private static getCanonicalAnswerText(question: Question): string {
    if (question.type === QuestionType.MultipleChoice && question.choices) {
      const match = question.choices.find(
        (c) => c.choiceId.toLowerCase() === (question.correctAnswer || '').toLowerCase(),
      );
      if (match) {
        return `${match.choiceId.toUpperCase()}: ${match.text}`;
      }
    }
    return question.correctAnswer || question.expectedAnswer || 'N/A';
  }
}
