# Phase 28.2 — Backup, Restore, and Save Slots (Save Integrity)

**Date**: 2026-11-09  
**Phase**: 28.2 (Handbook Section: Phase 28 — Save Integrity and Administration Hardening)  
**Status**: Completed

### 1. Executive Summary
Phase 28.2 makes player saves **portable and recoverable**. It implements (a) a headless, purely
data-driven **export/import** format for manual save transfer, and (b) **backup, restore, and named
save-slot** operations layered on the existing storage abstraction — all with **no new save fields**
and **no schema change** (the save schema stays at version 6).

Export wraps a save in a small, versioned JSON **envelope** (`format`, `formatVersion`,
`schemaVersion`, `exportedAt`, non-sensitive `generator` metadata, `data`). Import is
**execution-free**: input is read only through `JSON.parse` and passed to the existing strict
validator via the Phase 28.1 migration chain. Older files migrate forward automatically; a
newer-format *container* is rejected, while a newer *schema* payload is preserved in best-effort mode.

Backup/restore/slots are added to the storage layer as **optional** interface methods so lightweight
test doubles stay valid; both bundled services (IndexedDB and in-memory) implement them. Save slots
are cleanly supported because the IndexedDB object store is a plain key/value store — each slot is
just a distinct key, so no schema or store-version change is needed.

### 2. Files Created and Modified
- **New Files**:
  - `src/storage/SaveTransfer.ts` — portable export/import (`SAVE_EXPORT_FORMAT`,
    `SAVE_EXPORT_FORMAT_VERSION`, `SaveExportEnvelope`, `SaveImportResult`, `createSaveExport`,
    `serializeSaveExport`, `exportSaveToString`, `parseSaveImport`).
  - `tests/storage/phase28_2_save_transfer.test.ts` (24 tests).
  - `docs/PHASE_28_2_IMPLEMENTATION_REPORT.md` (this file).
- **Modified Files**:
  - `src/storage/StorageTypes.ts` — added `SAVE_SLOT_IDS` / `SaveSlotId`, `SaveSlotInfo`,
    `RestoreResult`, and the **optional** storage methods `listSaveSlots`, `saveToSlot`,
    `loadFromSlot`, `deleteSlot`, `backupActiveSave`, `restoreActiveSave`.
  - `src/storage/IndexedDBStorageService.ts` — implemented all slot/backup/restore methods on both
    `IndexedDBStorageService` (keys `slot:<id>` + `backup`) and `InMemoryStorageService`
    (in-memory maps); `clearSave()` now clears slots and the backup.
  - `src/storage/index.ts` — re-exports `./SaveTransfer`.
  - `docs/DEVELOPMENT_ROADMAP.md`, `docs/IMPLEMENTATION_REPORTS.md`.

### 3. Design
- **Export envelope**: self-describing and versioned so files are portable across builds. The
  container version (`formatVersion`) is checked independently of the save schema version, letting an
  old reader reject an incompatible container while still migrating older *saves* forward.
- **Import safety**: the module performs **no I/O and no evaluation**. Only known fields are read; the
  payload is delegated to `migrateSaveData` (Phase 28.1) → `validateSaveData`. Malformed JSON,
  non-objects, unknown formats, unsupported container versions, and structurally corrupt saves all
  fail safely with an error list and **no partial data**.
- **Version information in exported files**: `format`, `formatVersion`, and `schemaVersion` are always
  written, plus `generator.name` / `generator.version` (no secrets, no executable content).
- **Slots**: three fixed manual slots (`slot-1..slot-3`), each a separate key. Slot metadata
  (`SaveSlotInfo`) is derived lazily for listing without loading full payloads.
- **Backup before restore**: `restoreActiveSave` requires `{ confirm: true }`; without it the call is
  refused and nothing changes. When confirmed, the current active save is copied to the backup **before**
  the replacement is written, and the result reports `backupCreated`. This makes a destructive
  replacement both explicit and reversible.

### 4. Verification & Test Results
`tests/storage/phase28_2_save_transfer.test.ts` (24 tests) covers:
- **Export envelope** — format/version/schema/generator stamping; JSON round-trip.
- **Round-trip** — export → import preserves player data; bare (envelope-less) saves still import.
- **Malformed / invalid files** — non-JSON text; non-object payloads; unrecognized format; unsupported
  (future) container version; missing/invalid format version; envelope without data; corrupt payload.
- **Version handling** — older exported save migrates forward; future-schema save preserved best-effort.
- **Execution-free import** — malicious-looking content is inert data; no `Object.prototype` pollution.
- **Slots** — empty-by-default listing; write/read/metadata; delete; invalid-save rejection; `clearSave`.
- **Backup / restore / rollback** — confirmation required; previous save backed up before replacement
  (rollback possible); no backup on an empty profile; invalid restore rejected without changing state.

- **Automated Tests (`npm test`)**: 80 test files passed (1107 passed, 0 failures). The Phase 28.2 suite contributes 24 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

### 5. Out of Scope
Corruption recovery and data diagnostics (28.3), Super Admin protection (28.4), and broader
import/export compatibility + content versioning (28.5) remain for their own subphases.
