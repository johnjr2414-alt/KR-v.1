/** Question content review — gap detection, similarity, preview, and reporting. */

export type {
  ContentGapCode,
  ContentGap,
  SimilarPromptPair,
  BattleSelectionMatch,
  BattleSelectionPreview,
  ReviewStatusBreakdown,
  ReviewReport,
  ContentGapOptions,
  SimilarPromptOptions,
} from './ContentReviewTypes';

export { CONTENT_GAP_CODES } from './ContentReviewTypes';

export {
  SIMILAR_PROMPT_DEFAULT_THRESHOLD,
  normalizePromptText,
  findContentGaps,
  findSimilarPromptPairs,
  previewBattleSelection,
  buildReviewReport,
  renderReviewReportJson,
  type ReviewReportOptions,
} from './ContentReviewTools';
