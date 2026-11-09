# Phase 25.4 Implementation Report — Learning Analytics and Mastery Insights

**Date**: 2026-11-08  
**Phase**: 25.4 (Handbook Section: Educational Content and Learning Quality)  
**Status**: Completed

---

### 1. Executive Summary

Phase 25.4 adds a headless learning-analytics engine that turns recorded answer attempts and mastery records into meaningful learning statistics, using only data the game can actually observe.

The engine consumes `AnswerAttemptEvent` records, maintains aggregated counters (never the full history), and exposes a pure `computeLearningStatistics` view. It implements every statistic the handbook lists, defines denominators explicitly, avoids inferring ability from thin data, and stores nothing personally sensitive.

Key guarantees:

- **No double counting.** Events are deduplicated by `eventId` within a bounded recent-event window, so replaying a batch is a no-op.
- **Explicit denominators.** Accuracy = correct / answered, where "answered" counts only valid recorded attempts. Invalid or unanswered attempts are rejected at ingestion and cannot skew results. A zero denominator yields `null`, not `0`.
- **No inference from insufficient data.** Insights carry an `insightsReliable` flag and a minimum-sample note; questions/topics are flagged as "commonly missed" only after a minimum number of attempts.
- **Safe persistence.** The save schema gained an optional, backward-compatible `analytics` block and was bumped to version 4; loading sanitizes or drops malformed analytics without failing the save.

### 2. Files Created and Modified

- **New Files**:
  - `src/analytics/AnalyticsTypes.ts`: `AnswerAttemptEvent`, aggregate and snapshot types, statistics view types, and options.
  - `src/analytics/LearningAnalytics.ts`: `LearningAnalytics` engine, `isValidAnswerAttemptEvent`, `sanitizeAnalyticsSnapshot`, `buildMasteryProgress`, `computeLearningStatistics`.
  - `src/analytics/index.ts`: Barrel export.
  - `tests/analytics/phase25_4_learning_analytics.test.ts`: 18 tests (formulas, zero denominators, duplicates, invalid events, insights, mastery adapter, persistence, migration).
  - `docs/PHASE_25_4_IMPLEMENTATION_REPORT.md`: This report.
- **Modified Files**:
  - `src/storage/StorageTypes.ts`: Added optional `analytics?: LearningAnalyticsSnapshot`; bumped `SAVE_DATA_SCHEMA_VERSION` from 3 to 4.
  - `src/storage/SaveDataValidator.ts`: Sanitizes the optional analytics block on load (Phase 25.4 migration).
  - `docs/IMPLEMENTATION_REPORTS.md`: Consolidated tracker updated with Phase 25.4.

### 3. Statistics and Denominators

| Statistic | Definition |
| --- | --- |
| Total answered | Count of valid recorded attempts. |
| Correct / incorrect | Correct attempts, and answered − correct. |
| Accuracy | correct / answered; `null` when answered is 0. |
| Average answer time | Mean of attempts that recorded `answerTimeMs`; `null` when none did (`answerTimeSampleCount` reports the sample). |
| Accuracy by subject | Per-subject correct / answered, plus per-subject average time. |
| Accuracy by topic | Per-topic correct / answered, plus per-topic average time. |
| Mastery by subject | Level, current/required EXP, progress ratio, max-level flag, and lifetime correct/attempted from mastery records. |
| Recent activity | Events within the recency window (default 7 days), newest first. |
| Commonly missed | Questions/topics with `missedRatio = incorrect / answered`, reported only after a minimum attempt count. |

### 4. Deduplication, Data Limits, and Migration

- **Deduplication.** `applyEvents` keeps a set of event ids from the retained recent window and skips any id already present, both across batches and within a single batch. The window size is configurable (`recentEventLimit`, default 500) and is documented as a best-effort window.
- **Data minimization.** Only aggregate counters plus a bounded recent-event list are persisted — never the full attempt stream. No player name, id, or other identifying field is part of an event.
- **Migration.** `SAVE_DATA_SCHEMA_VERSION` is now 4. A legacy save without an `analytics` block loads unchanged with `analytics` undefined. A malformed block is repaired (counts clamped and floored, unknown subjects dropped, invalid events removed) rather than rejected.

### 5. Verification & Test Results

- **Automated Tests (`npm test`)**: 60 test files passed (571 tests passed, 0 failures). The new `phase25_4_learning_analytics.test.ts` contributes 18 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

### 6. Scope Note

This phase delivers the headless analytics domain, the persistence type, and safe migration. Emitting events from the live battle loop and surfacing the statistics in the Mastery Panel are **not** part of this phase — and, per the existing project audit, the game does not yet call `saveGame()` during gameplay at all. Wiring event emission into battle/save is left for a future phase so it can be done deliberately rather than scaffolded now.

Phase complete. Stopping here as required; no subsequent phase was started.
