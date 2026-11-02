import type { EducationalTier, SubjectId } from './education';

/**
 * Supported question formats.
 */
export enum QuestionType {
  MultipleChoice = 'multiple-choice',
  Identification = 'identification',
  Essay = 'essay',
}

/**
 * Publication status controlling question availability.
 */
export enum QuestionStatus {
  Draft = 'draft',
  Published = 'published',
  Archived = 'archived',
}

/**
 * A single answer choice for multiple-choice questions.
 */
export interface QuestionChoice {
  /** Stable choice identifier (not affected by display shuffling). */
  choiceId: string;
  /** Answer text displayed to the player. */
  text: string;
}

/**
 * Complete question record as stored in the question database.
 */
export interface Question {
  /** Unique question identifier. */
  id: string;
  /** Educational tier this question belongs to. */
  educationalTier: EducationalTier;
  /** Academic subject. */
  subject: SubjectId;
  /** Specific topic within the subject (e.g., "fractions", "photosynthesis"). */
  topic: string;
  /** Relative difficulty within the tier (1 = easiest, 5 = hardest). */
  difficulty: number;
  /** Question format type. */
  type: QuestionType;
  /** The question text displayed to the player. */
  question: string;
  /** Answer choices (multiple-choice only). */
  choices?: QuestionChoice[];
  /** Correct answer choice ID (multiple-choice) or canonical text (identification). */
  correctAnswer: string;
  /** Alternative accepted answer strings (identification only). */
  acceptedAnswers?: string[];
  /** Model answer or rubric reference (essay only). */
  expectedAnswer?: string;
  /** Explanation shown after answering. */
  explanation?: string;
  /** Time limit in seconds for this question. */
  timeLimit: number;
  /** Base mastery EXP awarded for a correct answer. */
  baseMasteryExp: number;
  /** Searchable tags. */
  tags?: string[];
  /** Publication status controlling availability. */
  status: QuestionStatus;
}
