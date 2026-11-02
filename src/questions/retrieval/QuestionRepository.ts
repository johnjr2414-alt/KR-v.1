import type { Question } from '../../core/types/question';
import { QuestionStatus, QuestionType } from '../../core/types/question';
import type { EducationalTier, SubjectId } from '../../core/types/education';

/**
 * Criteria used to filter the question pool.
 * All fields are optional — omitted fields are not filtered.
 */
export interface QuestionFilterCriteria {
  /** Filter by academic subject. */
  subject?: SubjectId;
  /** Filter by educational tier. */
  educationalTier?: EducationalTier;
  /** Filter by exact difficulty value (1–5). */
  difficulty?: number;
  /** Filter by minimum difficulty (inclusive). */
  minDifficulty?: number;
  /** Filter by maximum difficulty (inclusive). */
  maxDifficulty?: number;
  /** Filter by question format type. */
  type?: QuestionType;
  /** Filter by publication status. Defaults to Published when omitted. */
  status?: QuestionStatus;
  /** Filter by one or more tags (question must contain at least one). */
  tags?: string[];
  /** Filter by specific topic. */
  topic?: string;
}

/**
 * In-memory question repository with multi-faceted filtering.
 *
 * This repository holds a loaded question pool and supports efficient
 * queries by any combination of criteria. It is headless (no Phaser
 * imports) and testable in Vitest.
 *
 * **Important**: This class does NOT implement random selection or
 * battle-specific question retrieval — that responsibility belongs to
 * QuestionSelector (Task 8.6).
 */
export class QuestionRepository {
  private questions: Question[] = [];

  constructor(initialQuestions?: Question[]) {
    if (initialQuestions) {
      this.questions = [...initialQuestions];
    }
  }

  // ─── Mutation ───────────────────────────────────────────────────────────────

  /**
   * Replaces the entire question pool with the given array.
   * Typically called once during game boot with loaded data.
   */
  setQuestions(questions: Question[]): void {
    this.questions = [...questions];
  }

  /**
   * Adds a single question to the pool.
   * Duplicates (by ID) are silently replaced.
   */
  addQuestion(question: Question): void {
    const idx = this.questions.findIndex((q) => q.id === question.id);
    if (idx >= 0) {
      this.questions[idx] = question;
    } else {
      this.questions.push(question);
    }
  }

  /**
   * Removes a question by ID. No-op if the ID is not found.
   */
  removeQuestion(id: string): void {
    this.questions = this.questions.filter((q) => q.id !== id);
  }

  // ─── Query ──────────────────────────────────────────────────────────────────

  /** Returns the total number of questions in the pool. */
  count(): number {
    return this.questions.length;
  }

  /** Returns all questions in the pool (unfiltered copy). */
  getAll(): Question[] {
    return [...this.questions];
  }

  /** Returns a single question by ID, or undefined. */
  getById(id: string): Question | undefined {
    return this.questions.find((q) => q.id === id);
  }

  /**
   * Filters the question pool by the given criteria.
   *
   * When `status` is omitted, only `Published` questions are returned —
   * this ensures draft/archived questions are never accidentally served.
   *
   * Multiple criteria are combined with AND logic. Tag matching uses OR
   * (the question must contain at least one of the specified tags).
   */
  filter(criteria: QuestionFilterCriteria): Question[] {
    const effectiveStatus = criteria.status ?? QuestionStatus.Published;

    return this.questions.filter((q) => {
      // Status gate (always applied)
      if (q.status !== effectiveStatus) return false;

      // Subject
      if (criteria.subject !== undefined && q.subject !== criteria.subject) return false;

      // Educational tier
      if (criteria.educationalTier !== undefined && q.educationalTier !== criteria.educationalTier) return false;

      // Exact difficulty
      if (criteria.difficulty !== undefined && q.difficulty !== criteria.difficulty) return false;

      // Difficulty range
      if (criteria.minDifficulty !== undefined && q.difficulty < criteria.minDifficulty) return false;
      if (criteria.maxDifficulty !== undefined && q.difficulty > criteria.maxDifficulty) return false;

      // Question type
      if (criteria.type !== undefined && q.type !== criteria.type) return false;

      // Topic
      if (criteria.topic !== undefined && q.topic !== criteria.topic) return false;

      // Tags (OR logic — question must have at least one matching tag)
      if (criteria.tags !== undefined && criteria.tags.length > 0) {
        const questionTags = q.tags ?? [];
        const hasMatch = criteria.tags.some((tag) => questionTags.includes(tag));
        if (!hasMatch) return false;
      }

      return true;
    });
  }
}
