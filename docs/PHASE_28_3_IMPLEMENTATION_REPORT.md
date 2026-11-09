# Phase 28.3 — Corruption Recovery and Data Diagnostics

**Date**: 2026-11-09  
**Phase**: 28.3 (Handbook Section: Phase 28 — Save Integrity and Administration Hardening)  
**Status**: Completed

## 1. Executive Summary

Phase 28.3 makes corrupted saves **survivable and explainable**. Previously a single unusable player
record caused the entire save to be rejected; the session then created a new player and immediately
wrote a baseline save over the original payload, silently discarding it.

This phase adds a **section-level diagnostics and recovery layer**:

- `validateSaveData` now reports a content-free, per-section outcome (`intact`, `repaired`, `reset`,
  `missing`, `failed`) alongside the existing strict result.
- `recoverSaveData` runs the Phase 28.1 migration/validation path, then **salvages only the player
  record** when it is the blocking section, preserving every other valid section.
- Both storage services expose a **detailed load result** (`empty`/`intact`/`repaired`/`salvaged`/
  `unreadable`) plus a **bounded, deduplicated recovery log** that stores only section names, status
  lists, versions, and timestamps — never player names, items, answers, or raw payload values.
- The damaged raw payload is kept under a dedicated recovery key before any repaired save is used.
- `PlayerSessionManager` surfaces a user-visible notice, and a new DOM banner
  (`SaveRecoveryNotice`) displays it on boot. An unreadable save is **not overwritten** on first boot.
- If local storage cannot be initialized or read, the session still starts and warns that progress may
  not be saved.

No save fields or schema changes were introduced (schema stays at v6).

## 2. Files Created and Modified

- **New Files**:
  - `src/storage/SaveDiagnostics.ts` — diagnostics vocabulary (`SaveSectionId`, `SaveSectionStatus`,
    `SectionDiagnostic`, `SaveDiagnosticsReport`), bounded recovery-log model and helpers
    (`createRecoveryLogEntry`, `appendRecoveryLogEntry`, `MAX_RECOVERY_LOG_ENTRIES`), and the
    content-free message builder.
  - `src/storage/SaveRecovery.ts` — `recoverSaveData`, `SaveRecoveryResult`, `SaveRecoveryStatus`;
    player-only salvage orchestration.
  - `src/ui/save-recovery/SaveRecoveryNotice.ts` + `.css` + `index.ts` — dismissible, auto-hiding DOM
    banner (messages inserted with `textContent`, never HTML).
  - `tests/storage/phase28_3_save_diagnostics.test.ts` (23 tests).
  - `docs/PHASE_28_3_IMPLEMENTATION_REPORT.md` (this file).
- **Modified Files**:
  - `src/storage/SaveDataValidator.ts` — per-section diagnostics; capacity values must now be positive
    integers (invalid capacities are repaired to the default).
  - `src/storage/SaveMigrations.ts` — `SaveMigrationResult.diagnostics` passthrough and a
    migration-gap report.
  - `src/storage/StorageTypes.ts` — `SaveLoadStatus`, `SaveLoadResult`, and the optional
    `loadGameDetailed()` / `getRecoveryLog()` interface methods.
  - `src/storage/IndexedDBStorageService.ts` — detailed load, recovery copies (`load-recovery` key),
    bounded `recovery-log` key, slot loads through recovery, best-effort logging; in-memory service
    mirrors the behavior and exposes `getLoadRecoveryCopy()`.
  - `src/storage/index.ts` — re-exports the new modules.
  - `src/player/PlayerSessionManager.ts` — detailed load consumption, recovery notice/report getters,
    storage-availability tracking, and the no-overwrite guard for unreadable saves.
  - `src/scenes/BootScene.ts`, `src/ui/index.ts` — show the recovery banner after session bootstrap.
  - `docs/DEVELOPMENT_ROADMAP.md`, `docs/IMPLEMENTATION_REPORTS.md`.

## 3. Design

### 3.1 Section isolation
Every top-level save section is validated independently. Mastery records, inventory slots, currency,
settings, quests, skills, bank, and the optional snapshots are repaired or reset in isolation, so one
malformed optional record can no longer discard the rest of the save. Only the player record is a hard
requirement, and even that is salvageable (see 3.2).

### 3.2 Player-only salvage
`recoverSaveData` first takes the strict migration/validation path. If that fails but the payload has at
least one recognized save section, it replaces **only** the unusable player record:

- a missing/non-object player → a default level-1 player (`reset`);
- a player with an empty/missing name → the same record with a default name (`repaired`), preserving
  level, stats, EXP, and allocation.

The repaired payload is then migrated and validated normally. All other sections keep their data.

### 3.3 Recovery copies and logging
- A pre-migration payload is still copied to `migration-backup` (Phase 28.1 behavior).
- A damaged-but-recognizable payload is copied to `load-recovery` before a repaired save is used.
- The `recovery-log` stores at most 20 entries. Consecutive identical events increment `occurrences`
  instead of appending, so repeatedly loading a broken save cannot grow the log without bound. Load
  paths perform a single pass — there are no automatic retry loops.
- Log entries contain only: event type, source/current schema versions, recovered/failed section ids,
  whether a recovery copy was saved, occurrence count, and timestamp.

### 3.4 User-visible notice
`PlayerSessionManager` exposes `getSaveRecoveryNotice()`, `getLastSaveReport()`, and
`isStorageAvailable()`. `BootScene` shows the notice through `SaveRecoveryNotice` after the session
bootstraps. The banner is `role="status"`, uses `textContent`, auto-dismisses after 12 seconds, and can
be closed. It does not block gameplay.

### 3.5 No destructive overwrite
When a save is `unreadable` (e.g. not a save payload at all), the session creates a playable character
but **skips the initial baseline save**, leaving the raw payload in `load-recovery`. The player is told
that a new game was started and the damaged data was kept.

### 3.6 Storage failure
If `init()` or the load call throws (IndexedDB unavailable), the session continues in memory, records
`storageAvailable = false`, and warns: “Local save storage could not be accessed. Your progress may not
be saved this session.”

## 4. Verification & Test Results

`tests/storage/phase28_3_save_diagnostics.test.ts` (**23 tests**) covers:

- **Section diagnostics** — intact saves report no recovery; corrupted inventory, mastery, player
  fields, and settings are repaired while other sections survive; missing optional sections are reported
  as `missing` (silent) and do not produce a warning.
- **Recovery orchestration** — intact and repaired loads; player-record salvage for a missing player and
  an empty name (level/stats preserved); non-save input and `{ version: 1 }` are unreadable; future
  versions are preserved; the original payload is never mutated.
- **Recovery log** — entries are content-free; repeated events dedupe via `occurrences`; the log is
  bounded to `MAX_RECOVERY_LOG_ENTRIES`.
- **Storage integration** — a corrupted save loads repaired, the raw payload is kept, the log records the
  event without player content, and repeated loads dedupe; unreadable payloads are preserved and logged;
  migrations are logged; `clearSave()` clears the log and recovery copies.
- **Session behavior** — storage failure still yields a playable session with a warning; an unreadable
  save is not overwritten during initialization; repaired data loads and surfaces the notice.

- **Automated Tests (`npm test`)**: 81 test files passed (**1130 passed, 0 failures**). The Phase 28.3
  suite contributes 23 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

## 5. Out of Scope

Super Admin protection (28.4) and import/export + content versioning (28.5) remain for their own
subphases. No deployment or publishing was performed.
