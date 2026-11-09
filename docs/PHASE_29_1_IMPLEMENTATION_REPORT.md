# Phase 29.1 — Performance and Memory Optimization

**Date**: 2026-11-09  
**Phase**: 29.1 (Handbook Section: Phase 29 — Release Readiness)  
**Status**: Completed

## 1. Executive Summary

Phase 29.1 measured the production build and start-up path before changing code, then applied four
targeted optimizations:

- **Lazy loading**: the start menu now downloads only Phaser, the boot scene, and the start/gate UI.
  Gameplay scenes, overlays, and admin tools load on demand.
- **Vendor chunking**: Phaser is a separate long-lived chunk, so application updates do not force a
  repeat download of the engine.
- **Question bootstrap deduplication**: concurrent/repeated `QuestionManager.initialize()` calls share
  one bootstrap; the database open overlaps bundled-question validation, and question/tombstone reads
  run concurrently.
- **Timer cleanup**: pending auto-close and panel-switch timeouts are cleared when their UI is
  destroyed.

The start-menu transfer dropped from **462,647 B to 394,792 B (−14.7%)**, and initial JS gzip dropped
from **452.06 kB to 393.37 kB (−13.0%)**. In headless Chrome the Village HUD appeared **158–178 ms**
after clicking “Enter as User”, and the admin dashboard appeared **90 ms** after the gate succeeded.
No new dependencies were added. The full before/after data is in
[`PHASE_29_1_PERFORMANCE_REPORT.md`](./PHASE_29_1_PERFORMANCE_REPORT.md).

## 2. Files Created and Modified

- **New Files**:
  - `docs/PHASE_29_1_PERFORMANCE_REPORT.md` — methodology, baseline, after measurements, and caveats.
  - `scripts/measure-phase29-1.mts` — reproducible in-memory benchmark for bundled-question loading
    and repeated manager initialization.
  - `tests/questions/phase29_1_performance.test.ts` (3 tests) — initialization coalescing, no-op
    repeats, and retry after failure.
- **Modified Files**:
  - `src/main.ts` — registers only `BootScene`.
  - `src/scenes/BootScene.ts` — loads/registers gameplay scenes on user start and the admin scene after
    a granted gate decision; registration is idempotent.
  - `src/scenes/AdminDashboardScene.ts` — imports the dashboard UI and stylesheet on demand, and skips
    showing if the scene is no longer active.
  - `src/questions/management/QuestionManager.ts` — in-flight initialization promise, overlapped store
    open, parallel question/tombstone reads, and retry after failure.
  - `src/ui/question-modal/QuestionModal.ts` — clears the auto-close timeout in `destroy()`.
  - `src/ui/admin/AdminDashboard.ts` — clears the post-save panel-switch timeout in `destroy()`.
  - `vite.config.ts` — Phaser manual vendor chunk.
  - `tsconfig.json` — includes `scripts/` so the benchmark is typechecked.
  - `docs/DEVELOPMENT_ROADMAP.md`, `docs/IMPLEMENTATION_REPORTS.md`.

## 3. Design Details

### 3.1 Lazy scene registration

`main.ts` now starts with `[BootScene]`. `BootScene` imports `VillageScene`, `HuntingScene`,
`BattleScene`, and `UserGameScene` in parallel with player/question initialization, then registers any
missing scene by key. The same helper registers `AdminDashboardScene` only after the local gate grants
access. Re-entering the menu reuses registered scenes and cached modules.

### 3.2 Question bootstrap

`initialize()` returns immediately when already initialized. Otherwise it stores one promise that
concurrent callers share. The promise is cleared on failure so startup can retry. `bootstrap()` starts
`store.init()`, validates the bundled bank while the database opens, then awaits questions and
tombstones concurrently with `Promise.allSettled` (preserving the existing “warn and continue” behavior
for individual read failures).

### 3.3 Timer ownership

`QuestionModal` owns its auto-close timeout and clears it in `destroy()`. `AdminDashboard` does the same
for the 800 ms panel switch after a save. This prevents callbacks from firing after a modal or dashboard
has been torn down.

## 4. Verification & Test Results

- **Automated Tests (`npm test`)**: 84 test files passed (**1171 passed, 0 failures**). Phase 29.1 adds
  3 tests: concurrent initialize calls use one storage bootstrap; repeated calls do no storage work;
  a failed bootstrap clears the in-flight promise and succeeds on retry.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors (including the benchmark script).
- **Production Build (`npm run build`)**: Succeeded; 214 modules, Vite build 5.65 s.
- **Headless Chrome smoke test** (`vite preview`):
  - Start menu loads with only the core JS, Phaser, and small CSS payloads.
  - “Enter as User” loads the gameplay chunks and reaches the Village HUD.
  - “Local admin access” → `LOCAL ADMIN` loads the admin chunks and renders the dashboard.
  - No duplicate exploration HUD elements were observed.

## 5. Limitations and Out of Scope

- Headless Chrome timing is local and unthrottled; it is not a real-device or low-bandwidth benchmark.
- Hunting/battle transitions were not manually replayed end-to-end. Their modules were fetched and
  registered by the same path, and the Village/admin entry paths were verified.
- Long-running memory growth across hundreds of battles was not soaked. Phase 29.2 covers target
  browser/device compatibility and should repeat the smoke test there.
- No service worker, PWA, browser-support matrix, accessibility/localization work, or deployment was
  added; those remain Phases 29.2–29.5.
