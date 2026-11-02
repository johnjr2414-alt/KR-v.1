/** Question system — management (CRUD) and retrieval (combat sampling). */

// ─── Management ──────────────────────────────────────────────────────────────
export {
  QuestionValidator,
  validateQuestion,
  type QuestionValidationError,
  type QuestionValidationResult,
} from './management/QuestionValidator';

export {
  QuestionManager,
  type ImportResult,
} from './management/QuestionManager';

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

// ─── Evaluation ─────────────────────────────────────────────────────────────
export {
  AnswerEvaluator,
  normalizeAnswerText,
  type AnswerEvaluationResult,
} from './evaluation/AnswerEvaluator';

// ─── Timer ──────────────────────────────────────────────────────────────────
export {
  QuestionTimer,
  type QuestionTimerOptions,
} from './timer/QuestionTimer';
