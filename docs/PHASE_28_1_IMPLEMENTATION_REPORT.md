# Phase 28.1 — Save Schema Versioning and Migrations

**Date**: 2026-11-09
**Phase**: 28.1 (Handbook Section: Phase 28 — Save Integrity and Administration Hardening)
**Status**: Completed

## 1. Executive Summary

Phase 28.1 introduces a **centralized save schema version and migration chain**. Previously the load
path applied `validateSaveData` directly, which repaired missing optional fields but had no explicit
notion of version history: an older save was implicitly tolerated, and an unknown *future* save was
silently passed through. There was no ordered migration path and no recovery copy on repair.

This phase adds `src/storage/SaveMigrations.ts`, a data-driven, sequential migration framework that:

- defines the current version, the earliest supported version, and an ordered chain of one-version
  steps;
- migrates older supported saves up to the current schema, then validates the result;
- applies a **safe best-effort fallback** for unknown future versions (never destructive);
- **never resets** player data on failure — the caller keeps the original payload, and the storage
  layer writes a **recovery copy** of the pre-migration payload before a migrated save is used.

## 2. Files Created and Modified

- **New Files**:
  - `src/storage/SaveMigrations.ts`: migration framework — `EARLIEST_SUPPORTED_SAVE_VERSION`,
    `SaveMigration`, `SAVE_MIGRATIONS`, `SaveMigrationResult`, `readSaveVersion`, `migrateSaveData`.
  - `tests/storage/phase28_1_save_migrations.test.ts` (19 tests).
  - `docs/PHASE_28_1_IMPLEMENTATION_REPORT.md`: this report.
- **Modified Files**:
  - `src/storage/IndexedDBStorageService.ts`: `loadGame` now runs `migrateSaveData`; added a
    pre-migration **recovery copy** (`migration-backup` key) and `getRecoveryCopy()`; the in-memory
    service mirrors this (`getRecoveryCopy()`), and `clearSave()` clears the recovery copy.
  - `src/storage/index.ts`: re-exports the new module.
  - `docs/DEVELOPMENT_ROADMAP.md`, `docs/IMPLEMENTATION_REPORTS.md`.

## 3. Design

### 3.1 Centralized version + ordered chain
- `SAVE_DATA_SCHEMA_VERSION` (currently **6**) and `EARLIEST_SUPPORTED_SAVE_VERSION` (**1**) are the
  boundaries. `SAVE_MIGRATIONS` is a contiguous list of `{ from, to, description, migrate }` steps,
  each upgrading exactly one version.
- `migrateSaveData(raw)` normalises the version (a missing/invalid version is treated as the earliest
  supported version), runs every step from the source version up to the current version, and then calls
  `validateSaveData`, so **validation always happens after migration**.

### 3.2 Additive history → data-preserving steps
The save schema has grown **additively** since v1: every added field (`currency`, `skills`, `gathering`,
`careers`, `assignments`) is optional and is repaired by the existing sanitizers. Each migration step
therefore preserves all existing data and stamps the new version. Future **non-additive** changes (a
renamed/moved/removed field) should implement a real transform inside the corresponding step rather than
a no-op — the framework provides the home for that.

### 3.3 Safe fallback on unknown future versions
When a save's version is **newer** than the current build, no migration runs. A best-effort validation
is attempted so valid player data is still loadable, and the result is flagged via `futureVersion: true`.
If the payload is also invalid, the load fails cleanly (no data returned) without modifying storage.

### 3.4 No destructive repair
Migration never resets or deletes data. On failure `migrateSaveData` returns `success: false` with
`data` absent so the caller declines to load. Before a migrated save is used, the storage layer stores a
**recovery copy** of the original raw payload (`migration-backup` key; in-memory: `getRecoveryCopy()`),
fulfilling the requirement to preserve a recovery copy before repair where feasible.

## 4. Verification & Test Results

`tests/storage/phase28_1_save_migrations.test.ts` (**19 tests**) covers:

- **Chain integrity**: contiguous from v1 to the current version, each step `to === from + 1`.
- **Every supported version (1–6)**: migrates to the current version, preserves player/currency/quests/
  careers, and reports `migrated` correctly; a missing version defaults to the earliest supported one.
- **Validation after migration**: malformed input, missing player, and empty player name are rejected
  with no data; the original payload is never mutated.
- **Unknown future versions**: best-effort preservation of valid data (`futureVersion: true`, no
  migration) and safe failure for invalid future saves.
- **`readSaveVersion`**: valid / missing / non-integer / non-positive handling.
- **Storage integration**: a legacy v1 save loads at the current version, a recovery copy is captured,
  no recovery copy is captured for current-version saves, and `clearSave()` clears the recovery copy.

- **Automated Tests (`npm test`)**: 79 test files passed (**1083 passed, 0 failures**). The new Phase 28.1
  suite contributes 19 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

## 5. Out of Scope (later subphases)

Backup/restore and save slots (28.2), corruption recovery/diagnostics surfaced to the user (28.3),
Super Admin protection (28.4), and import/export + content versioning (28.5) remain for their own
subphases. **Stop after this phase.**
