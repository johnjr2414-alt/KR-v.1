# Phase 29.1 — Before/After Performance Report

**Date**: 2026-11-09  
**Scope**: Production bundle, start-up path, lazy loading, question-bank initialization, and timer cleanup.

## 1. Measurement Method

- **Production builds**: `npm run build` (`tsc && vite build`), comparing the Vite size report and
  independent gzip/Brotli measurements of the emitted files.
- **Browser smoke test**: headless Chrome (`--headless=new`) against `vite preview` on
  `http://localhost:4173`. Chrome DevTools Protocol was used to read `PerformanceResourceTiming`,
  `PerformanceNavigationTiming`, JS heap usage, and to click through the start menu.
- **Domain benchmark**: `npx vite-node scripts/measure-phase29-1.mts` measures bundled-question
  validation and repeated `QuestionManager.initialize()` calls against an in-memory store.
- **Environment**: Windows 10, Node 24.22.1, Chrome headless, local preview (no network throttling).
  Numbers are comparative, not a substitute for real-device profiling.

## 2. Baseline (Phase 28.5 build)

| Metric | Value |
| --- | ---: |
| Modules transformed | 214 |
| Initial JS (raw / gzip) | 1,919.81 kB / 452.06 kB |
| Initial CSS (raw / gzip) | 58.08 kB / 9.99 kB |
| Start-menu encoded transfer (JS + CSS) | 462,647 bytes |
| Vite build time | 7.44 s (13.2 s wall including `tsc`) |

Baseline audit findings:

- Phaser, every gameplay scene, and every UI overlay were in one initial chunk.
- `QuestionManager.initialize()` re-read bundled JSON, IndexedDB questions, and tombstones on every
  call. Boot and the admin scene both call it; returning to the menu and starting again also repeated
  the work.
- The two IndexedDB reads ran sequentially.
- `QuestionModal`'s auto-close timeout outlived `destroy()`; `AdminDashboard`'s post-save panel switch
  did the same. A modal closed during the delay could still fire its callback.
- Scene shutdown already destroyed exploration overlays, panels, keyboard keys, music state, and the
  monster detection zones (scene-level cleanup), so no new scene teardown leaks were found.

## 3. Changes Applied

1. **Vendor chunk split** — Phaser is emitted as a separate long-lived chunk, so application updates do
   not invalidate the engine download.
2. **Lazy gameplay/admin loading** — `main.ts` registers only `BootScene`. On “Enter as User”, the
   gameplay scenes and their UI are imported in parallel with session/question initialization. Admin
   tools load only after the local gate succeeds.
3. **Idempotent, overlapping question bootstrap** — concurrent `initialize()` calls share one promise;
   after success later calls are no-ops. The database opens while bundled questions are validated, and
   question/tombstone reads run concurrently.
4. **Timer cleanup** — `QuestionModal` and `AdminDashboard` clear pending timeouts in `destroy()` so
   callbacks cannot run after their UI is gone.

## 4. After (Phase 29.1 build)

| Metric | Value |
| --- | ---: |
| Modules transformed | 214 |
| Initial JS (raw / gzip) | 196.23 kB + 1,481.79 kB / 53.51 kB + 339.86 kB |
| Initial CSS (raw / gzip) | 4.40 kB / 1.42 kB |
| Start-menu encoded transfer (JS + CSS) | **394,792 bytes** |
| Additional transfer on first user start | 64,746 bytes |
| Admin-only transfer (on gate success) | 36,520 bytes JS + 6,860 bytes CSS |
| Vite build time | 5.65 s (11.1 s wall including `tsc`) |

Headless Chrome interaction results:

| Metric | Value |
| --- | ---: |
| DOMContentLoaded | 269 ms |
| Load event | 623 ms |
| Village HUD ready after clicking “Enter as User” | 158–178 ms (median 171 ms) |
| Admin dashboard ready after gate success | 90 ms |
| Duplicate `#exploration-hud` elements | 0 (exactly one) |
| JS heap after starting play | ~13.4 MB |

Lazy chunks (raw / gzip):

| Chunk | Raw | Gzip |
| --- | ---: | ---: |
| `VillageScene` | 74.24 kB | 18.38 kB |
| `InteractionGuard` (shared UI) | 78.50 kB | 19.44 kB |
| `BattleScene` | 21.87 kB | 6.82 kB |
| `HuntingScene` | 22.09 kB | 6.10 kB |
| `QuestionModal` | 9.88 kB | 2.79 kB |
| `AdminDashboardScene` | 1.54 kB | 0.78 kB |
| Admin dashboard UI | 36.52 kB | 9.11 kB |

## 5. Before/After Summary

| Metric | Before | After | Change |
| --- | ---: | ---: | ---: |
| Start-menu encoded transfer | 462,647 B | 394,792 B | **−67,855 B (−14.7%)** |
| Initial JS gzip | 452.06 kB | 393.37 kB | **−58.69 kB (−13.0%)** |
| Initial CSS gzip | 9.99 kB | 1.42 kB | **−8.57 kB (−85.8%)** |
| Repeated `QuestionManager.initialize()` | 0.038 ms/op | 0.000 ms/op | **no-op** |
| First `QuestionManager.initialize()` (in-memory) | 0.053 ms | 0.005 ms | −0.048 ms |
| Phaser re-download on app update | Included in app chunk | Separate cached chunk | caching win |

The full payload after starting play is approximately the same total size as before; the change moves
scene, overlay, and admin code off the critical start-menu path. The Phaser chunk (339.86 kB gzip)
remains the largest single download; splitting it improves update caching rather than first-load size.

## 6. Remaining Observations

- `loadBundledQuestions()` is cheap at the current 19-question bank (0.049 ms/op). Caching it was not
  justified; it should be revisited only when the bundled bank grows substantially.
- Long-session heap growth across hundreds of battles was not soaked in this phase. The lifecycle audit
  found the expected scene/DOM cleanup in place; Phase 29.2 should repeat the smoke test on target
  browsers/devices.
- Headless Chrome numbers are local and unthrottled. They should not be presented as real-device load
  times.

## 7. Reproduce

```bash
npm run build
npm run preview -- --port 4173
npx vite-node scripts/measure-phase29-1.mts
```

The browser measurements were taken with headless Chrome against the preview server; the interaction
thresholds and encoded transfer sizes above are reproducible from the same build.
