/** Question system — management (CRUD) and retrieval (combat sampling). */

// ─── Management ──────────────────────────────────────────────────────────────
export {
  QuestionValidator,
  validateQuestion,
  type QuestionValidationError,
  type QuestionValidationResult,
} from './management/QuestionValidator';

// ─── Retrieval ───────────────────────────────────────────────────────────────
export {
  loadBundledQuestions,
  type QuestionLoadResult,
} from './retrieval/QuestionLoader';

export {
  QuestionRepository,
  type QuestionFilterCriteria,
} from './retrieval/QuestionRepository';

export {
  QuestionSelector,
  SelectionOutcome,
  type QuestionSelectionResult,
} from './retrieval/QuestionSelector';
