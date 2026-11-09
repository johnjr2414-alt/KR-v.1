# Phase 29.2 — Browser and Device Compatibility Report

**Date**: 2026-11-09  
**Scope**: Browser APIs actually used by the game, storage failure behavior, input methods,
scaling, refresh/resume, and an explicit support matrix.  
**Status**: Completed — desktop Chromium verified; other browsers and touch-only devices are
explicitly **not claimed**.

## 1. Intended Support Matrix

The matrix below is defined before any compatibility claim. “Verified” means the flow was exercised
in this phase; “not verified” means the code is expected to work but has not been tested and is
therefore not supported by claim.

| Tier | Platform | Requirements | Status |
| --- | --- | --- | --- |
| **Supported** | Desktop Chrome / Edge (Chromium) on Windows | Keyboard (WASD/arrows), mouse or trackpad, viewport ≥ 800×600, Canvas or WebGL | **Verified** (Chrome 156 headless) |
| **Expected, not claimed** | Desktop Firefox, desktop Safari 17+, Chromium on Linux/macOS | Same as above; IndexedDB enabled | **Not verified** |
| **Expected, not claimed** | Chromium with IndexedDB blocked/absent | Same as above; saves are session-only and a notice is shown | **Verified behavior in Chromium**, not verified on other engines |
| **Not supported** | Touch-only phones/tablets | No on-screen movement controls exist; movement is keyboard-only | **Not supported** |
| **Not supported** | Viewports below 800×600 | Compact CSS applies, but gameplay layout and controls are untested below the base canvas | **Not verified** |

Capability requirements:

- **Required for play**: JavaScript, Canvas 2D (WebGL preferred; Phaser `AUTO` falls back to Canvas),
  keyboard input.
- **Optional with degradation**: IndexedDB (session-only saves + warning), Web Audio
  (silent play if unavailable), `crypto.randomUUID` (fallback ID generator).
- **No requirement**: network access after the assets load, cookies, service workers, History API.

## 2. Test Method

- Production build served with `vite preview` on `http://localhost:4173`.
- Headless Chrome 156 (`--headless=new`) driven over the Chrome DevTools Protocol by
  `scripts/verify-phase29-2.mjs`.
- For each viewport the script reloads the app, waits for the start menu, clicks “Enter as User”,
  waits for the exploration HUD, and measures:
  - start-menu and canvas bounding boxes against the viewport;
  - document horizontal/vertical scroll size (overflow);
  - HUD count and bounds (duplicate-overlay check);
  - `Escape` key handling at 1366×768 (pause modal opens).
- Reload/resume: the save database, player name, and schema version are read before and after a
  full page reload, then the user start flow is repeated.
- No-IndexedDB: `window.indexedDB` is defined as `undefined` before the app scripts run; the start
  flow, HUD, save notice, and console errors are checked.
- Environment: Windows 10, Node 24.22.1, Chrome 156 headless, unthrottled local preview.

Reproduce:

```bash
npm.cmd run build
npm.cmd run preview -- --port 4173 --strictPort
"C:/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu \
  --remote-debugging-port=9222 --user-data-dir="<temp-profile>" about:blank
node scripts/verify-phase29-2.mjs
```

## 3. Viewport and Scaling Results

Canvas is 800×600 with Phaser `Scale.FIT` + `CENTER_BOTH`; the DOM overlays scale independently.

| Viewport | Canvas rendered | Canvas fits | Menu fits | No page overflow | HUD count | Pause via Escape |
| --- | --- | --- | --- | --- | ---: | --- |
| 1920×1080 | 1440×1080 (centered, x=360) | Yes | Yes | Yes | 1 | Not tested |
| 1366×768 | 1024×768 (centered, x=257) | Yes | Yes | Yes | 1 | **Opened** |
| 1024×768 | 1024×768 | Yes | Yes | Yes | 1 | Not tested |
| 800×600 | 800×600 | Yes | Yes | Yes | 1 | Not tested |

Observations:

- Aspect ratio is preserved; the canvas letterboxes horizontally on wider viewports rather than
  stretching.
- The HUD measured 470×136 px at 12,12 in all four viewports; no horizontal page scrollbar appeared.
- Exactly one canvas and one exploration HUD were present after each start; no duplicate overlays.
- The start menu fills the viewport at every tested size.

## 4. Browser API Behavior

### 4.1 IndexedDB (saves)

- When `indexedDB` is absent, `createStorageService()` returns `InMemoryStorageService`.
- `PlayerSessionManager` now detects the non-persistent fallback, keeps the session playable, and
  surfaces: “Local save storage is unavailable in this browser. Progress will be kept for this
  session only.”
- Verified in Chromium with `indexedDB` removed: start menu → HUD succeeded, one canvas, no console
  errors or uncaught exceptions, and the session-only notice displayed.
- If the API exists but opening fails (private mode, blocked storage), `init()` rejects; the session
  manager catches it, marks storage unavailable, creates a playable session, and shows the existing
  storage-unavailable notice. Covered by `tests/storage/phase28_3_save_diagnostics.test.ts`.

### 4.2 IndexedDB (question bank)

- `createQuestionStore()` selects the IndexedDB store when available and an in-memory store when the
  API is absent.
- If the store opens but the database fails, bundled questions are still merged into the repository
  before the bootstrap error is reported, so combat questions remain usable for the session.
  `BootScene` catches the error and still enters the Village.
- Unavailable/corrupt store reads (`getAll`, `getTombstones`) are non-fatal; bundled questions load.

### 4.3 `crypto.randomUUID`

- Used for battle IDs, arena match IDs, and new question IDs.
- `crypto.randomUUID` is only exposed in secure contexts, so plain-HTTP LAN play can lack it.
  `createUniqueId()` now falls back to a timestamp/random ID when the API is unavailable.
- Unit-tested for the UUID path, the fallback path, and fallback uniqueness.

### 4.4 Web Audio

- `AudioManager` creates `AudioContext`/`webkitAudioContext` lazily on the first sound effect and
  calls `resume()` inside a `try/catch`, so autoplay-policy suspension does not throw.
- Audio is optional: if the context cannot be created or remains suspended, gameplay continues
  silently.
- Audible output was not verified in headless Chrome (no audio device); this is a code-inspection
  guarantee only.

### 4.5 Keyboard and pointer/touch

- Movement: WASD and arrow keys (`PhaserInputAdapter`). Interaction: Space/Enter. Panels: I, M, Q, K.
  Pause: Escape. These are keyboard-only; no touch movement or virtual joystick exists.
- All DOM overlays (start menu, HUD buttons, modals) are standard buttons with click handlers, so
  they are tap-compatible on touch devices, but gameplay itself is not.
- Keyboard pause was verified end-to-end in Chromium at 1366×768.

### 4.6 Storage quota

- IndexedDB write failures reject; `PlayerSessionManager.saveSession()` catches them, logs an error,
  and returns `false` without crashing. Concurrent/queued saves are preserved.
- The previous successful save remains intact. There is **no player-facing toast** for a quota
  failure; only the console records it. Simulated with “Disk quota exceeded” in
  `tests/player/playerSessionManager.test.ts`; an actual filled quota was not exercised.
- The admin question store has no quota-specific handling; writes reject and the admin UI reports the
  import/write failure.

### 4.7 Refresh, resume, and long sessions

- Verified reload: both `knowledge-realms-save` and `knowledge-realms-questions` databases were
  present before and after reload; the saved player (`Novice Hero`, schema v6) was restored, and the
  HUD appeared after clicking “Enter as User”. The start menu is always shown after a reload by
  design — the game does not auto-resume.
- Unsaved progress since the last save point is lost on reload. Saves occur on discrete actions
  (scene transitions, combat/reward events, UI actions); there is no timed autosave and no
  `pagehide`/`beforeunload` flush.
- Long-session soak was **not** performed. Phase 29.1 measured ~13.4 MB JS heap shortly after play
  started; sustained memory growth remains unverified.

### 4.8 Back navigation

- The game does not use the History API. Browser Back/Forward therefore leaves the game page rather
  than moving between menus. Returning requires reopening the app; the saved profile reloads from
  IndexedDB.
- In-game “Quit to menu” is handled by the pause overlay, not by browser history.

## 5. Changes Applied

| File | Change |
| --- | --- |
| `src/storage/QuestionStore.ts` | Added `InMemoryQuestionStore`, `createQuestionStore()`, and an explicit missing-API error in `IndexedDBQuestionStore.init()`. |
| `src/storage/index.ts` | Re-exports the fallback store and factory. |
| `src/storage/StorageTypes.ts` | Added optional `isPersistent?()` capability to `StorageService`. |
| `src/storage/IndexedDBStorageService.ts` | IndexedDB service reports persistence based on API presence; in-memory service reports `false`. |
| `src/player/PlayerSessionManager.ts` | Shows a session-only save notice when the storage fallback is non-persistent, without overriding recovery notices. |
| `src/questions/management/QuestionManager.ts` | Store-init failure no longer prevents bundled questions from populating the repository; bootstrap still rejects so initialization can retry. |
| `src/core/uniqueId.ts` (new) | `createUniqueId()` with a non-secure-context fallback. |
| `src/combat/BattleSession.ts`, `src/arena/ArenaDuelSession.ts`, `src/questions/management/QuestionManager.ts` | Use `createUniqueId()` instead of direct `crypto.randomUUID()`. |
| `tests/storage/phase29_2_compatibility.test.ts` (new) | 9 tests covering the in-memory store, factory selection, bundled fallback on store failure/read failure, battle lookup without storage, session-only notice, and UUID fallback. |
| `scripts/verify-phase29-2.mjs` (new) | Reproducible CDP browser/viewport/reload/no-IndexedDB verification. |
| `docs/DEVELOPMENT_ROADMAP.md`, `docs/IMPLEMENTATION_REPORTS.md` | Roadmap checkbox and consolidated report entry. |

## 6. Verification Summary

- `npm test`: 85 test files, 1180 tests passed.
- `npx tsc --noEmit`: 0 errors.
- `npm run build`: succeeded (215 modules; initial JS 197.53 kB + Phaser 1,481.79 kB raw).
- Headless Chromium: all four viewports fit with no overflow and one HUD; Escape opened pause;
  reload restored the save; no-IndexedDB start showed the session-only notice with no console errors
  or uncaught exceptions.

## 7. Known Limitations and Non-Claims

- No Firefox, Safari, or Linux/macOS browser was tested in this phase.
- No physical mobile/tablet was tested; touch-only play is not supported because movement requires a
  keyboard.
- Web Audio output was not heard in headless testing.
- Storage quota exhaustion was simulated in unit tests, not by filling a real quota; the player is
  not notified of a failed save beyond the console.
- No timed autosave or unload flush exists; a reload discards progress since the last save point.
- Long-session memory and thermal behavior were not soaked.
- Browser Back/Forward leaves the game; there is no history integration.
