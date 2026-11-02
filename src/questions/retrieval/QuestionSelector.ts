import type { Question } from '../../core/types/question';
import type { QuestionFilterCriteria } from './QuestionRepository';
import { QuestionRepository } from './QuestionRepository';

/**
 * Outcome of a question selection attempt.
 */
export enum SelectionOutcome {
  /** All requested questions were selected successfully. */
  Success = 'success',
  /**
   * Fewer questions were available than requested.
   * The returned array contains whatever was available (may be empty).
   */
  InsufficientPool = 'insufficient-pool',
  /**
   * The filtered pool is completely empty — no questions match at all.
   */
  NoQuestionsAvailable = 'no-questions-available',
}

/**
 * Result of a question selection request.
 */
export interface QuestionSelectionResult {
  /** Outcome status of the selection attempt. */
  outcome: SelectionOutcome;
  /** The selected questions (may be fewer than requested). */
  questions: Question[];
  /** How many questions were requested. */
  requestedCount: number;
  /** How many questions were available in the filtered pool. */
  availableCount: number;
}

/**
 * QuestionSelector — headless service for randomly selecting questions
 * from a QuestionRepository based on filter criteria.
 *
 * Design constraints:
 *  - Avoids repeating questions within the same selection (battle).
 *  - Handles insufficient question pools gracefully.
 *  - Returns a clear result object including the outcome status.
 *  - Does NOT connect to combat — it returns Question[] for the caller.
 *  - No Phaser imports — fully testable in Vitest.
 */
export class QuestionSelector {
  private readonly repository: QuestionRepository;

  constructor(repository: QuestionRepository) {
    this.repository = repository;
  }

  /**
   * Selects up to `count` questions from the repository that match
   * the given criteria.
   *
   * Questions are drawn without replacement (no repeats within the
   * same call). If `excludeIds` is provided, those question IDs are
   * excluded from the available pool before selection — useful for
   * avoiding recently-seen questions across consecutive battles.
   *
   * @param criteria  - Filtering criteria (subject, tier, difficulty, etc.)
   * @param count     - Number of questions to select.
   * @param excludeIds - Optional set of question IDs to exclude.
   * @returns A QuestionSelectionResult describing the outcome.
   */
  select(
    criteria: QuestionFilterCriteria,
    count: number,
    excludeIds?: Set<string>,
  ): QuestionSelectionResult {
    // 1. Get the filtered pool from the repository
    let pool = this.repository.filter(criteria);

    // 2. Exclude previously-seen questions if requested
    if (excludeIds && excludeIds.size > 0) {
      pool = pool.filter((q) => !excludeIds.has(q.id));
    }

    // 3. Handle empty pool
    if (pool.length === 0) {
      return {
        outcome: SelectionOutcome.NoQuestionsAvailable,
        questions: [],
        requestedCount: count,
        availableCount: 0,
      };
    }

    // 4. Determine outcome
    const availableCount = pool.length;
    const actualCount = Math.min(count, availableCount);
    const outcome =
      actualCount < count
        ? SelectionOutcome.InsufficientPool
        : SelectionOutcome.Success;

    // 5. Fisher-Yates partial shuffle to pick `actualCount` unique questions
    const selected = this.shuffleSelect(pool, actualCount);

    return {
      outcome,
      questions: selected,
      requestedCount: count,
      availableCount,
    };
  }

  /**
   * Selects `count` random elements from `pool` without replacement
   * using a Fisher-Yates partial shuffle (O(count) swaps).
   */
  private shuffleSelect(pool: Question[], count: number): Question[] {
    // Work on a copy so we don't mutate the repository's data
    const arr = [...pool];
    const n = arr.length;
    const result: Question[] = [];

    for (let i = 0; i < count && i < n; i++) {
      const randIndex = i + Math.floor(Math.random() * (n - i));
      // Swap
      const temp = arr[i];
      arr[i] = arr[randIndex];
      arr[randIndex] = temp;

      result.push(arr[i]);
    }

    return result;
  }
}
