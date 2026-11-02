import type { Question } from '../../core/types/question';
import { QuestionValidator } from '../management/QuestionValidator';

// ─── Static JSON imports ─────────────────────────────────────────────────────
// Vite resolves JSON imports at build-time. Each file is a typed array.

import elemMath from '../../data/questions/elementary/mathematics.json';
import elemScience from '../../data/questions/elementary/science.json';
import elemGK from '../../data/questions/elementary/general-knowledge.json';
import elemProg from '../../data/questions/elementary/programming.json';
import jhMath from '../../data/questions/junior-high/mathematics.json';
import jhScience from '../../data/questions/junior-high/science.json';

/**
 * Result of loading a bundle of question JSON files.
 */
export interface QuestionLoadResult {
  /** All successfully loaded (and validated) questions. */
  questions: Question[];
  /** Count of records that failed validation and were skipped. */
  skippedCount: number;
  /** IDs (where available) of records that failed validation. */
  skippedIds: string[];
}

/**
 * Loads all bundled question JSON data files, validates each record,
 * and returns only the questions that pass validation.
 *
 * This is a pure function: it reads from static Vite-imported JSON
 * arrays and does not touch IndexedDB, the filesystem, or the network.
 *
 * Questions that fail validation are silently skipped (counted in the
 * result) so that a single malformed record does not block the whole
 * question pool.
 */
export function loadBundledQuestions(): QuestionLoadResult {
  // Aggregate every JSON file into a single raw array
  const rawArrays: unknown[][] = [
    elemMath,
    elemScience,
    elemGK,
    elemProg,
    jhMath,
    jhScience,
  ];

  const questions: Question[] = [];
  const skippedIds: string[] = [];
  let skippedCount = 0;

  for (const rawArray of rawArrays) {
    for (const raw of rawArray) {
      const record = raw as Partial<Question>;
      const result = QuestionValidator.validate(record);

      if (result.isValid) {
        questions.push(record as Question);
      } else {
        skippedCount++;
        if (record.id) {
          skippedIds.push(record.id);
        }
      }
    }
  }

  return { questions, skippedCount, skippedIds };
}
