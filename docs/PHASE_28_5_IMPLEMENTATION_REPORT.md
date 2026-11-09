# Phase 28.5 — Import/Export and Content Versioning

**Date**: 2026-11-09  
**Phase**: 28.5 (Handbook Section: Phase 28 — Save Integrity and Administration Hardening)  
**Status**: Completed

## 1. Executive Summary

Phase 28.5 makes every interchange format **self-describing and version-checked**. Previously the
question bank export was a bare JSON array with no format identifier, so an importer could not tell an
old bank from a new one or reject an incompatible file before parsing records. Save exports already had
a versioned envelope (Phase 28.2); this phase verifies that path and adds coverage for old and
unsupported files.

This phase adds:

- A **versioned question bank envelope** (`knowledge-realms-question-bank`, format v1) carrying the
  effective question records plus **tombstones** and **bundled-override** metadata.
- **Legacy compatibility**: a bare array is still accepted and explicitly classified as version 0.
- **Safe rejection** of unknown formats and future container versions before any record is examined.
- **All-or-nothing application**: the whole file is parsed, validated, and checked for duplicate IDs
  before a single write; tombstones are applied only after every record is committed.
- **Documented tombstone/override semantics** (below) used consistently by export, preview, import,
  and versioned-backup restore.
- A **versioned content-pack envelope** (`knowledge-realms-content-pack`, v1) that embeds the same
  bank payload, with its own format checks and no code execution.
- Admin UI updates: version/compatibility label in the dry-run report, override and tombstone counts,
  and format-v1 download metadata.
- Save-export compatibility tests: older schema versions migrate forward; future container versions are
  rejected.

No save schema or question schema changes were introduced.

## 2. Tombstone and Override Semantics

These rules are implemented in `parseQuestionBankImport` / `QuestionManager.analyzeBankImport` and are
the documented contract for callers:

- **Tombstones** are bundled question IDs deleted locally. A **full-bank export** includes them;
  filtered exports omit them. On import, tombstones are **additive** — an import never clears existing
  tombstones. A tombstone may not also appear as a question in the same file.
- **Overrides** are locally stored records whose IDs also exist in bundled data (they shadow the
  bundled copy). The envelope lists them for transparency.
- On import, an incoming record that collides with a **locally bundled** ID is accepted as an override
  and upserted. A collision with **any other** stored question is a duplicate-ID error that rejects
  the whole batch.
- Legacy files carry no metadata, so their collisions are evaluated with the same bundled-ID rule.

## 3. Files Created and Modified

- **New Files**:
  - `src/questions/management/QuestionBankTransfer.ts` — envelope constants/types, pure
    `createQuestionBankExport`, `serializeQuestionBankExport`, `exportQuestionBankToString`, and
    `parseQuestionBankImport` (legacy/current/future/unknown compatibility, duplicate detection,
    metadata conflict checks).
  - `src/questions/management/ContentPackTransfer.ts` — optional versioned content-pack envelope built
    on the bank format, with `createContentPack`, `serializeContentPack`, `parseContentPack`.
  - `tests/questions/phase28_5_content_versioning.test.ts` (22 tests).
  - `docs/PHASE_28_5_IMPLEMENTATION_REPORT.md` (this file).
- **Modified Files**:
  - `src/questions/management/QuestionManager.ts` — tracks bundled IDs at initialization; adds
    `exportBankToJson`, `previewBankImport`, `importBankFromJson`, and the all-or-nothing analysis;
    `restoreBackup` now accepts versioned envelopes and preserves their tombstones.
  - `src/questions/index.ts` — exports the new transfer types/functions and manager result types.
  - `src/ui/admin/AdminDashboard.ts` — uses the versioned preview/import/export paths, shows
    compatibility plus override/tombstone counts, and notes that filtered exports omit tombstones.
  - `docs/DEVELOPMENT_ROADMAP.md`, `docs/IMPLEMENTATION_REPORTS.md`.

## 4. Design Details

### 4.1 Question bank envelope
```json
{
  "format": "knowledge-realms-question-bank",
  "formatVersion": 1,
  "exportedAt": "2026-11-09T00:00:00.000Z",
  "generator": { "name": "Knowledge Realms", "version": "0.1.0" },
  "tombstones": ["removed-bundled-id"],
  "overrides": ["bundled-id-with-local-edit"],
  "questions": [ ... validated question objects ... ]
}
```

Compatibility outcomes: `current`, `legacy` (bare array, version 0), `future` (rejected with the
supported maximum), and `unknown` (malformed/foreign file). Parsing is execution-free: only
`JSON.parse`, known-field reads, and `QuestionValidator` calls are used.

### 4.2 Preview before apply
The admin dry run reports the format version/compatibility, valid/invalid/duplicate-within-batch
counts, bundled overrides, tombstones to preserve, and prompt-similarity warnings. Commit is blocked
unless every record is valid and no duplicate IDs remain. A full in-memory backup is taken before the
commit, and the restore path snapshots the current bank first.

### 4.3 Rollback behavior
Validation happens before writes. If the batch is rejected, neither the store nor the repository is
touched (covered by tests). Writes are committed with `saveAll` (one transaction in the IndexedDB
store), repository updates follow, and tombstones are applied last. A simulated store failure leaves
the repository unchanged.

### 4.4 Content packs (optional)
No runtime pack loader exists yet, so content packs are a pure format module: a pack named/versioned by
its author wraps a versioned bank. Unknown/future pack versions are rejected, and the embedded bank is
subjected to the full bank compatibility checks — a pack cannot bypass record validation. The module is
ready for a future pack loader without changing the bank format.

### 4.5 Save exports
`SaveTransfer` already versioned the container (`format`, `formatVersion`) and payload
(`schemaVersion`). Phase 28.5 adds explicit coverage: old schema exports migrate forward through the
Phase 28.1 chain, `.formatVersion` is stamped, and a future container version is rejected before the
payload is read.

## 5. Verification & Test Results

`tests/questions/phase28_5_content_versioning.test.ts` (**22 tests**) covers:

- **Format** — envelope stamping and round-trip; legacy bare arrays as version 0; unknown formats,
  future versions, and missing arrays rejected safely; invalid records and intra-batch duplicates
  reported; tombstone/override contradictions rejected; imported strings remain inert.
- **Manager** — valid versioned and legacy imports; future files leave the bank untouched; duplicate
  IDs against stored questions rejected; bundled-ID collisions accepted as overrides; invalid batches
  produce no partial writes; store failure leaves the repository unchanged; full export includes
  tombstones while filtered export omits them; imported tombstones are additive; versioned-envelope
  backup restore preserves tombstones.
- **Content packs** — valid pack round-trip; unknown/future pack versions rejected; unsupported embedded
  bank format rejected.
- **Save exports** — format/container/schema versions stamped; older exports migrate; future container
  rejected.

- **Automated Tests (`npm test`)**: 83 test files passed (**1168 passed, 0 failures**). The Phase 28.5
  suite contributes 22 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

## 6. Out of Scope

No runtime content-pack loader or content-pack browser UI was added, and save export/import remains
headless (no new save-management screen). Release readiness (Phase 29) remains for the next phases. No
deployment or publishing was performed.
