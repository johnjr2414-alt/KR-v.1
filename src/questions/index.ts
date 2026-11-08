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
  sharedQuestionManager,
  sharedQuestionRepository,
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

export {
  DifficultyEngine,
  difficultyEngine,
  type LevelDifferenceResult,
  type PvEQuestionProfile,
  type DifficultyFallbackEvent,
} from './retrieval/DifficultyEngine';

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
