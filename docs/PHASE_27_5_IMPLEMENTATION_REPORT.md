# Phase 27.5 — Profession Experience, Rank, Reputation, and Rewards

**Date**: 2026-11-09
**Phase**: 27.5 (Handbook Section: Phase 27 — Real-World Professions and Careers)
**Status**: Completed

## 1. Executive Summary

Phase 27.5 makes profession progression **real and independent**. It adds a headless
`ProfessionProgressionService` that owns the rules of profession advancement — the configurable EXP
curve, multi-level advancement, rank derivation, and reputation — and applies their result to the
authoritative career records held by the existing `CareerService`. It then adds a headless
`AssignmentRewardService` that routes a completed assignment's configured reward bundle through the
**existing** progression, mastery, and currency services instead of re-implementing reward logic.

The three progression systems remain strictly independent:

1. **Character (combat) level** — existing `ProgressionService`.
2. **Subject mastery** — existing `MasteryManager`.
3. **Profession (career) level** — new `ProfessionProgressionService`.

A high character level or a high mastery level never advances profession rank, and advancing a
profession never grants character EXP or mastery. No new save field was introduced: progression
mutates the career records already persisted through `CareerSnapshot`, so no schema migration was
required.

## 2. Files Created and Modified

- **New Files**:
  - `src/professions/ProfessionProgressionService.ts`: the progression engine —
    `getProfessionExpForNextLevel(level, settings)` (EXP curve), and the
    `ProfessionProgressionService` (`getExpForNextLevel`, `getRank`, `hasReachedRank`,
    `awardProfessionExp`, `awardReputation`, `getProgress`) plus its result types and
    `ProfessionProgressionFailureReason`. Exports the shared `professionProgressionService`.
  - `src/professions/AssignmentRewardService.ts`: the reward router —
    `AssignmentRewardService.distributeCompletion(completionId)` driven by an injected
    `AssignmentRewardContext` of callbacks, with `AssignmentGrantedRewards` /
    `AssignmentRewardDistributionResult`.
  - `tests/professions/phase27_5_progression.test.ts` (24 tests).
  - `docs/PHASE_27_5_IMPLEMENTATION_REPORT.md`: this standalone phase report.
- **Modified Files**:
  - `src/mastery/MasteryManager.ts`: added `awardMasteryExp(subject, amount)`, granting raw mastery
    EXP through the **same** level curve and level-up listeners as answer-based gains (no duplicate
    mastery logic).
  - `src/professions/ProfessionTypes.ts`: added `ProfessionProgressionUpdate` (the store operation's
    payload).
  - `src/professions/CareerService.ts`: added `applyProgression(professionId, update)` — a validated
    store operation that clamps level/EXP/reputation, re-derives the current rank from the new level,
    and graduates the record at the profession's maximum level.
  - `src/professions/index.ts`: barrel exports for the progression service and reward router.
  - `src/player/PlayerSessionManager.ts`: creates `professionProgression` and `assignmentRewards`,
    builds `buildRewardContext()` from existing session services, exposes
    `distributeAssignmentRewards(completionId)`, and auto-distributes rewards (then saves) in the
    assignment `onCompleted` hook.
  - `docs/IMPLEMENTATION_REPORTS.md`: consolidated master tracker updated with Phase 27.5.
  - `docs/DEVELOPMENT_ROADMAP.md`: Phase 27.5 marked complete.

## 3. Design Notes

### 3.1 EXP curve (data-driven)
`getProfessionExpForNextLevel` reads a profession's existing `ProfessionExperienceSettings`:
`baseExp` is the cost of the first advancement and each subsequent level grows by `growthFactor`
(`floor(baseExp * growthFactor^(level-1))`). It returns `Infinity` at `maxProfessionLevel`. Adding a
new profession with a different curve requires **no** engine change.

### 3.2 Level-up, rank advancement & graduation
`awardProfessionExp` adds EXP, loops level-ups while the requirement is met, and re-derives the
current rank. Its result reports `previousLevel`/`newLevel`, `levelsGained`, `previousExp`/
`currentExp`, `expRequiredForNextLevel`, and `rankChanged`/`previousRankId`/`newRankId`. At maximum
level, further EXP neither levels up nor accrues. `CareerService.applyProgression` marks a record
`Graduated` once it reaches the profession's maximum level.

### 3.3 Reputation
Reputation is tracked per profession and is purely additive in this phase — non-positive or invalid
awards are ignored, so incorrect answers never incur severe penalties. `awardReputation` reports the
amount credited and the running total.

### 3.4 Unlock gates
`hasReachedRank(professionId, rankId)` and `getRank(professionId)` expose rank-based gating so
existing consumers (assignment `minRankId`, workplace facility rank requirements, future activities)
can consult profession progress without duplicating threshold logic. `getProgress` returns a
UI-ready snapshot (level, EXP, required EXP, ratio, rank).

### 3.5 Reward routing (no duplicate reward logic)
`AssignmentRewardService` is dependency-injected via `AssignmentRewardContext` callbacks, mirroring
the existing `EnrollmentContext` / `AssignmentContext` pattern. Each reward kind is routed to its
owner service:

| Reward | Routed to |
| --- | --- |
| Profession EXP | `ProfessionProgressionService.awardProfessionExp` |
| Reputation | `ProfessionProgressionService.awardReputation` |
| Character EXP | existing `ProgressionService.awardExp` |
| Gold | existing `CurrencyService.addGold` |
| Subject mastery EXP | existing `MasteryManager.awardMasteryExp` |

`PlayerSessionManager.buildRewardContext()` wires these to the live session, and
`distributeAssignmentRewards(completionId)` delegates to the router.

### 3.6 Reward safety & idempotency
Distribution is keyed off the assignment engine's `rewardsClaimed` flag. An already-claimed
completion reports `alreadyClaimed` and grants nothing; failed assignments are never granted;
unknown completions / definitions fail safely. `claimRewards` is recorded only **after** successful
distribution, so repeated calls can never duplicate rewards. The `onCompleted` hook records the
completion on the career profile, distributes rewards, then persists the session.

### 3.7 Future specializations
Specialization definitions already live on `ProfessionDefinition` (added in Phase 27.1). This phase
does not implement specialization gameplay; it keeps specialization readiness intact by expanding
the EXP/level/rank architecture that specializations will gate off (e.g. `minLevel`).

## 4. Verification & Test Results

Coverage (24 tests): the EXP curve (base/growth; `Infinity` at max), EXP awarding (unknown/un-enrolled
failures; level-up; leftover EXP and multi-level advancement; rank advancement; non-positive/invalid
amounts ignored; max-level cap + `Graduated`), reputation (accumulation; no negative reduction;
failure reasons), progress info & rank unlock gates, career-store clamping and rank re-derivation,
reward routing (all five reward kinds; idempotent replay; failed assignment receives nothing; safe
failure paths), separation of the three progression systems (profession EXP never changes character
level/mastery; character EXP never changes profession level), and persistence (career snapshot
round-trip; end-to-end session distribution + save/load, including claimed status).

- **Automated Tests (`npm test`)**: 76 test files passed (1005 passed, 0 failures). The new
  progression suite contributes 24 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).
