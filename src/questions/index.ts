/** Question system — management (CRUD) and retrieval (combat sampling). */

// ─── Management ──────────────────────────────────────────────────────────────
export {
  QuestionValidator,
  validateQuestion,
  type QuestionValidationError,
  type QuestionValidationResult,
} from './management/QuestionValidator';

export {
  STABLE_QUESTION_ID_PATTERN,
  QUESTION_EXPLANATION_MAX_LENGTH,
  QUESTION_ALIAS_MAX_LENGTH,
  QUESTION_SUBTOPIC_MAX_LENGTH,
  isStableQuestionId,
  isStructurallyValidTimer,
  normalizeAlias,
} from './management/QuestionContentStandards';

export {
  assessQuestionContent,
  type ContentAdvisory,
  type ContentStandardsAssessment,
} from './management/QuestionContentAudit';

export {
  buildQuestionDraft,
  validateQuestionDraft,
  groupErrorsByField,
  rootFieldName,
  type QuestionDraftInput,
  type QuestionDraftChoiceInput,
  type QuestionDraftValidation,
} from './management/QuestionDraft';

export {
  buildQuestionPreview,
  type QuestionPreview,
  type QuestionPreviewChoice,
} from './management/QuestionPreview';

export {
  QuestionManager,
  sharedQuestionManager,
  sharedQuestionRepository,
  type ImportResult,
  type ImportRecordReport,
  type ImportPreview,
  type QuestionBackup,
  type QuestionBankImportPreview,
  type QuestionBankImportResult,
  type QuestionBankRecordReport,
  type RestoreResult,
} from './management/QuestionManager';

export {
  QUESTION_BANK_FORMAT,
  QUESTION_BANK_FORMAT_VERSION,
  createQuestionBankExport,
  serializeQuestionBankExport,
  exportQuestionBankToString,
  parseQuestionBankImport,
  type CreateQuestionBankExportOptions,
  type ParsedQuestionBank,
  type ParsedQuestionBankRecord,
  type QuestionBankCompatibility,
  type QuestionBankEnvelope,
} from './management/QuestionBankTransfer';

export {
  CONTENT_PACK_FORMAT,
  CONTENT_PACK_FORMAT_VERSION,
  createContentPack,
  serializeContentPack,
  parseContentPack,
  type ContentPackCompatibility,
  type ContentPackEnvelope,
  type ContentPackMetadata,
  type CreateContentPackOptions,
  type ParsedContentPack,
} from './management/ContentPackTransfer';

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

// ─── Taxonomy ────────────────────────────────────────────────────────────────
export {
  buildTopicId,
  SUBJECT_TAXONOMY,
  TOPIC_TAXONOMY,
  QUESTION_TOPIC_MAPPINGS,
  TOPIC_ID_PATTERN,
  isValidTopicId,
  validateTaxonomy,
  getSubjectEntry,
  getSubjectDisplayName,
  getTopicById,
  getTopicsForSubject,
  resolveRawTopicsForTopic,
  classifyQuestion,
  buildTaxonomyCoverageReport,
  type SubjectTaxonomyEntry,
  type SubtopicTaxonomyEntry,
  type TopicTaxonomyEntry,
  type TopicMappingEntry,
  type TaxonomyValidationIssue,
  type TaxonomyValidationResult,
  type QuestionTopicClassification,
  type SubjectCoverageSummary,
  type TopicCoverageSummary,
  type TaxonomyCoverageReport,
} from './taxonomy';

// ─── Content Review ──────────────────────────────────────────────────────────
export {
  CONTENT_GAP_CODES,
  SIMILAR_PROMPT_DEFAULT_THRESHOLD,
  normalizePromptText,
  findContentGaps,
  findSimilarPromptPairs,
  previewBattleSelection,
  buildReviewReport,
  renderReviewReportJson,
  type ContentGapCode,
  type ContentGap,
  type SimilarPromptPair,
  type BattleSelectionMatch,
  type BattleSelectionPreview,
  type ReviewStatusBreakdown,
  type ReviewReport,
  type ContentGapOptions,
  type SimilarPromptOptions,
  type ReviewReportOptions,
} from './review';

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
