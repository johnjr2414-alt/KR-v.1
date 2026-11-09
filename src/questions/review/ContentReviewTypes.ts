import type { EducationalTier, SubjectId } from '../../core/types/education';

/**
 * A reviewable authoring gap. One gap never implies a factual error: it is a
 * signal for a human reviewer, not an automatic verdict or rewrite.
 */
export type ContentGapCode =
  | 'missing-explanation'
  | 'missing-tags'
  | 'missing-subtopic'
  | 'missing-source'
  | 'review-pending'
  | 'timer-outside-recommended'
  | 'redundant-alias'
  | 'unmapped-topic';

/** Every gap code, in reporting order. */
export const CONTENT_GAP_CODES: readonly ContentGapCode[] = [
  'missing-explanation',
  'missing-tags',
  'missing-subtopic',
  'missing-source',
  'review-pending',
  'timer-outside-recommended',
  'redundant-alias',
  'unmapped-topic',
];

/** A single gap attached to one question. */
export interface ContentGap {
  questionId: string;
  subject: SubjectId;
  topic: string;
  code: ContentGapCode;
  field: string;
  message: string;
}

/**
 * A pair of questions whose prompts look alike. This is a *candidate* only —
 * it does not assert semantic equivalence or that one is a duplicate.
 */
export interface SimilarPromptPair {
  questionIdA: string;
  questionIdB: string;
  subject: SubjectId;
  /** 0–1 similarity from normalized token overlap. 1 means identical text. */
  similarity: number;
  reason: string;
  /** Always false: similarity is heuristic, not a semantic determination. */
  certain: false;
}

/** How a question lines up with a battle profile's selection cascade. */
export type BattleSelectionMatch =
  | 'exact'
  | 'same-tier'
  | 'baseline-tier'
  | 'fallback'
  | 'none';

/** Read-only preview of how a single question may be selected. */
export interface BattleSelectionPreview {
  questionId: string;
  subject: SubjectId;
  eligible: boolean;
  match: BattleSelectionMatch;
  /** Question timer scaled by the profile multiplier (rounded seconds). */
  effectiveTimerSeconds: number;
  detail: string;
}

/** Tally of recorded review markers. Absent markers count as unreviewed. */
export interface ReviewStatusBreakdown {
  unreviewed: number;
  authorChecked: number;
  needsRevision: number;
}

/** Non-mutating content-review report suitable for export. */
export interface ReviewReport {
  generatedAt: string;
  totalQuestions: number;
  /** Questions with at least one gap. */
  questionsWithGaps: number;
  gapCount: number;
  gaps: ContentGap[];
  gapsByCode: Partial<Record<ContentGapCode, number>>;
  similarPromptPairs: SimilarPromptPair[];
  reviewStatusBreakdown: ReviewStatusBreakdown;
  /** Explicit caveats about what this report does and does not claim. */
  notes: string[];
}

/** Options controlling which gaps a report collects. */
export interface ContentGapOptions {
  /** Restrict to these codes. Omit to collect every code. */
  include?: ContentGapCode[];
  /** Restrict to these subjects. Omit for all subjects. */
  subjects?: SubjectId[];
  /** Restrict to these tiers. Omit for all tiers. */
  tiers?: EducationalTier[];
}

/** Options for similar-prompt detection. */
export interface SimilarPromptOptions {
  /** Minimum token-overlap similarity (0–1) to report a candidate. */
  threshold?: number;
  /** When true (default), only compare questions within the same subject. */
  sameSubjectOnly?: boolean;
}
