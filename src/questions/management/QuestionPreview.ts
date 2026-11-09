import type { EducationalTier, SubjectId } from '../../core/types/education';
import { QuestionStatus, QuestionType, type Question } from '../../core/types/question';
import { QuestionValidator, type QuestionValidationError } from './QuestionValidator';

/** A single answer option as the player would see it. */
export interface QuestionPreviewChoice {
  /** Stable identifier (used for answer submission). */
  choiceId: string;
  /** Display label, e.g. "A". */
  label: string;
  text: string;
  /** True when this option is the recorded correct answer. */
  isCorrect: boolean;
}

/**
 * A player-facing projection of a question.
 *
 * This mirrors the shape the combat/practice UI renders. It is derived from the
 * same record the player would receive, so anything shown here is exactly what
 * the player sees. It performs no mutation and makes no factual claim.
 */
export interface QuestionPreview {
  id: string;
  subject: SubjectId | null;
  educationalTier: EducationalTier | null;
  topic: string;
  difficulty: number | null;
  type: QuestionType | null;
  prompt: string;
  timeLimit: number | null;
  baseMasteryExp: number | null;
  /** Multiple-choice options (empty for other types). */
  choices: QuestionPreviewChoice[];
  /** Human-friendly correct answer (choice text for MC, canonical text otherwise). */
  correctAnswerText: string | null;
  /** Accepted alternatives (Identification only). */
  acceptedAnswers: string[];
  /** Model answer / grading reference (Essay only). */
  expectedAnswer: string | null;
  explanation: string | null;
  /**
   * Whether the player could actually be served this question: it must be
   * structurally valid *and* published. Invalid or unpublished questions are
   * never previewed as playable.
   */
  playable: boolean;
  /** Structural issues that would block the question from being played. */
  issues: QuestionValidationError[];
}

/** Resolves the correct-answer display text for the given question. */
function resolveCorrectAnswerText(question: Partial<Question>): string | null {
  if (question.type === QuestionType.MultipleChoice && Array.isArray(question.choices)) {
    const target = (question.correctAnswer ?? '').trim().toLowerCase();
    const match = question.choices.find(
      (choice) => (choice?.choiceId ?? '').trim().toLowerCase() === target,
    );
    if (match) return `${match.choiceId.toUpperCase()}: ${match.text}`;
  }

  if (question.type === QuestionType.Essay) {
    return question.expectedAnswer ?? null;
  }

  return question.correctAnswer ?? question.expectedAnswer ?? null;
}

/**
 * Projects a question record into the shape the player sees.
 *
 * The projection re-uses {@link QuestionValidator} so an invalid record is
 * surfaced as unplayable rather than silently presented.
 */
export function buildQuestionPreview(question: Partial<Question>): QuestionPreview {
  const validation = QuestionValidator.validate(question);

  const choices: QuestionPreviewChoice[] = (question.choices ?? []).map((choice) => ({
    choiceId: choice.choiceId,
    label: (choice.choiceId ?? '').toUpperCase(),
    text: choice.text,
    isCorrect:
      (choice.choiceId ?? '').trim().toLowerCase() ===
      (question.correctAnswer ?? '').trim().toLowerCase(),
  }));

  const playable =
    validation.isValid && question.status === QuestionStatus.Published;

  return {
    id: question.id ?? '',
    subject: question.subject ?? null,
    educationalTier: question.educationalTier ?? null,
    topic: question.topic ?? '',
    difficulty: question.difficulty ?? null,
    type: question.type ?? null,
    prompt: question.question ?? '',
    timeLimit: question.timeLimit ?? null,
    baseMasteryExp: question.baseMasteryExp ?? null,
    choices,
    correctAnswerText: resolveCorrectAnswerText(question),
    acceptedAnswers: Array.isArray(question.acceptedAnswers) ? [...question.acceptedAnswers] : [],
    expectedAnswer: question.expectedAnswer ?? null,
    explanation: question.explanation ?? null,
    playable,
    issues: validation.errors,
  };
}
