import { ContentReviewStatus, type Question } from '../../core/types/question';
import type { PvEQuestionProfile } from '../retrieval/DifficultyEngine';
import { assessQuestionContent, type ContentAdvisory } from '../management/QuestionContentAudit';
import { classifyQuestion } from '../taxonomy';
import type {
  BattleSelectionPreview,
  ContentGap,
  ContentGapCode,
  ContentGapOptions,
  ReviewReport,
  ReviewStatusBreakdown,
  SimilarPromptOptions,
  SimilarPromptPair,
} from './ContentReviewTypes';

/** Default token-overlap threshold for flagging similar prompts. */
export const SIMILAR_PROMPT_DEFAULT_THRESHOLD = 0.8;

/** Maps a content-standards advisory onto a review gap code. */
const ADVISORY_TO_GAP: Record<ContentAdvisory['code'], ContentGapCode> = {
  'missing-explanation': 'missing-explanation',
  'subtopic-not-recorded': 'missing-subtopic',
  'source-not-recorded': 'missing-source',
  'review-pending': 'review-pending',
  'timer-outside-recommended': 'timer-outside-recommended',
  'redundant-alias': 'redundant-alias',
};

// ─── Prompt text normalization (heuristic only) ──────────────────────────────

/**
 * Lowercases and reduces a prompt to alphanumeric tokens separated by single
 * spaces. Used only to look for *candidate* duplicates — it makes no claim
 * about meaning.
 */
export function normalizePromptText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function tokenize(text: string): string[] {
  const normalized = normalizePromptText(text);
  return normalized === '' ? [] : normalized.split(' ');
}

/** Jaccard similarity of two token sets (0–1). */
function tokenSetSimilarity(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ─── Gap detection ───────────────────────────────────────────────────────────

/**
 * Collects authoring gaps for the given questions. Nothing is mutated and no
 * gap asserts that an answer is factually wrong.
 */
export function findContentGaps(
  questions: readonly Question[],
  options: ContentGapOptions = {},
): ContentGap[] {
  const include = options.include ? new Set(options.include) : undefined;
  const subjects = options.subjects ? new Set(options.subjects) : undefined;
  const tiers = options.tiers ? new Set(options.tiers) : undefined;

  const gaps: ContentGap[] = [];

  for (const question of questions) {
    if (subjects && !subjects.has(question.subject)) continue;
    if (tiers && !tiers.has(question.educationalTier)) continue;

    const push = (code: ContentGapCode, field: string, message: string): void => {
      if (include && !include.has(code)) return;
      gaps.push({
        questionId: question.id,
        subject: question.subject,
        topic: question.topic,
        code,
        field,
        message,
      });
    };

    for (const advisory of assessQuestionContent(question).advisories) {
      const mapped = ADVISORY_TO_GAP[advisory.code];
      if (mapped) push(mapped, advisory.field, advisory.message);
    }

    if (!question.tags || question.tags.length === 0) {
      push('missing-tags', 'tags', 'No tags are recorded. Tags aid review filtering.');
    }

    if (!classifyQuestion(question).mapped) {
      push('unmapped-topic', 'topic', `Topic "${question.topic}" is not mapped in the taxonomy.`);
    }
  }

  return gaps;
}

// ─── Similar-prompt detection ────────────────────────────────────────────────

/**
 * Finds pairs of questions whose prompts look alike. Results are *candidates*
 * for human review; the function never claims semantic certainty and never
 * changes a record.
 */
export function findSimilarPromptPairs(
  questions: readonly Question[],
  options: SimilarPromptOptions = {},
): SimilarPromptPair[] {
  const threshold = options.threshold ?? SIMILAR_PROMPT_DEFAULT_THRESHOLD;
  const sameSubjectOnly = options.sameSubjectOnly ?? true;

  const prepared = questions.map((question) => ({
    question,
    normalized: normalizePromptText(question.question),
    tokens: new Set(tokenize(question.question)),
  }));

  const pairs: SimilarPromptPair[] = [];

  for (let i = 0; i < prepared.length; i += 1) {
    for (let j = i + 1; j < prepared.length; j += 1) {
      const a = prepared[i];
      const b = prepared[j];
      if (a.normalized === '' || b.normalized === '') continue;
      if (sameSubjectOnly && a.question.subject !== b.question.subject) continue;

      const similarity =
        a.normalized === b.normalized ? 1 : tokenSetSimilarity(a.tokens, b.tokens);
      if (similarity < threshold) continue;

      pairs.push({
        questionIdA: a.question.id,
        questionIdB: b.question.id,
        subject: a.question.subject,
        similarity,
        reason:
          similarity === 1
            ? 'Prompt text is identical after normalization.'
            : `Prompt token overlap ${Math.round(similarity * 100)}% — candidate only.`,
        certain: false,
      });
    }
  }

  pairs.sort(
    (x, y) =>
      y.similarity - x.similarity ||
      x.questionIdA.localeCompare(y.questionIdA) ||
      x.questionIdB.localeCompare(y.questionIdB),
  );

  return pairs;
}

// ─── Battle selection preview ────────────────────────────────────────────────

/**
 * Shows how a question lines up with a battle profile's selection cascade,
 * mirroring how {@link import('../retrieval/DifficultyEngine').DifficultyEngine}
 * resolves a pool. It is a preview only; it does not select or modify content.
 */
export function previewBattleSelection(
  question: Question,
  profile: PvEQuestionProfile,
): BattleSelectionPreview {
  const effectiveTimerSeconds = Math.round(question.timeLimit * profile.timerMultiplier);
  const base = {
    questionId: question.id,
    subject: question.subject,
    effectiveTimerSeconds,
  };

  if (question.subject !== profile.subject) {
    return {
      ...base,
      eligible: false,
      match: 'none',
      detail: `Subject "${question.subject}" does not match the profile subject "${profile.subject}".`,
    };
  }

  if (
    question.educationalTier === profile.targetTier &&
    question.difficulty === profile.targetDifficulty
  ) {
    return {
      ...base,
      eligible: true,
      match: 'exact',
      detail: `Exact match on target ${profile.targetTier} / difficulty ${profile.targetDifficulty}.`,
    };
  }

  if (question.educationalTier === profile.targetTier) {
    return {
      ...base,
      eligible: true,
      match: 'same-tier',
      detail: `Same tier as target; difficulty ${question.difficulty} vs target ${profile.targetDifficulty}.`,
    };
  }

  if (question.educationalTier === profile.baselineTier) {
    return {
      ...base,
      eligible: true,
      match: 'baseline-tier',
      detail: `Reached via the baseline-tier fallback (${profile.baselineTier}).`,
    };
  }

  return {
    ...base,
    eligible: true,
    match: 'fallback',
    detail: 'Reachable only through the last-resort subject fallback.',
  };
}

// ─── Report assembly and export ──────────────────────────────────────────────

/** Options for {@link buildReviewReport}. */
export interface ReviewReportOptions {
  gapOptions?: ContentGapOptions;
  similarOptions?: SimilarPromptOptions;
  /** Override the timestamp (used for deterministic tests). */
  generatedAt?: string;
}

function countReviewStatuses(questions: readonly Question[]): ReviewStatusBreakdown {
  const breakdown: ReviewStatusBreakdown = { unreviewed: 0, authorChecked: 0, needsRevision: 0 };
  for (const question of questions) {
    switch (question.reviewStatus) {
      case ContentReviewStatus.AuthorChecked:
        breakdown.authorChecked += 1;
        break;
      case ContentReviewStatus.NeedsRevision:
        breakdown.needsRevision += 1;
        break;
      default:
        breakdown.unreviewed += 1;
    }
  }
  return breakdown;
}

/**
 * Builds a non-mutating review report: content gaps, similar-prompt
 * candidates, and a review-status tally. No difficulty or answer is changed.
 */
export function buildReviewReport(
  questions: readonly Question[],
  options: ReviewReportOptions = {},
): ReviewReport {
  const gaps = findContentGaps(questions, options.gapOptions ?? {});
  const similarPromptPairs = findSimilarPromptPairs(questions, options.similarOptions ?? {});

  const gapsByCode: Partial<Record<ContentGapCode, number>> = {};
  for (const gap of gaps) {
    gapsByCode[gap.code] = (gapsByCode[gap.code] ?? 0) + 1;
  }

  const questionsWithGaps = new Set(gaps.map((gap) => gap.questionId)).size;

  return {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    totalQuestions: questions.length,
    questionsWithGaps,
    gapCount: gaps.length,
    gaps,
    gapsByCode,
    similarPromptPairs,
    reviewStatusBreakdown: countReviewStatuses(questions),
    notes: [
      'Gaps are authoring signals for a human reviewer; they are not factual verdicts.',
      'Similar-prompt pairs are candidates only and do not assert semantic equivalence.',
      'No question difficulty or answer was modified by this report.',
    ],
  };
}

/** Serializes a review report to pretty-printed JSON for export. */
export function renderReviewReportJson(report: ReviewReport): string {
  return JSON.stringify(report, null, 2);
}
