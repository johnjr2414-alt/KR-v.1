# Phase 25.5 Implementation Report — Question Authoring Workflow

**Date**: 2026-11-08  
**Phase**: 25.5 (Handbook Section: Educational Content and Learning Quality)  
**Status**: Completed

---

### 1. Executive Summary

Phase 25.5 improves the Super Admin content workflow **without compromising question validation**. The editor now reports validation errors next to the specific control that caused them, previews a question exactly as the player would see it, supports a draft → review → published lifecycle, adds a non-mutating bulk-import validation report, warns (never blocks) on duplicate prompts, supports filtered export, and takes an automatic backup before any bulk change.

Key guarantees:

- **The editor cannot diverge from the write path.** Field assembly and validation reuse the same headless `QuestionValidator` the persistence layer uses (`buildQuestionDraft` / `validateQuestionDraft`). Invalid content is never submitted.
- **No silent publishing.** A "Save as Draft" action and a `forceDraft` path always force `status = draft`. The player-view preview marks structurally invalid *or* unpublished records as **not playable**, and lists the blocking issues.
- **Bulk imports are safe.** `previewImport` classifies every record (valid / invalid / duplicate-id) and produces prompt-similarity **warnings as candidates only** — never a block. `importFromJson` remains all-or-nothing, and the dashboard takes a `createBackup()` snapshot before committing.
- **Restorable.** `restoreBackup` returns the bank to a snapshot all-or-nothing, removing records that were not in the snapshot (with tombstones so bundled questions stay removed).
- **No AI, no remote API.** All logic is local and offline.

### 2. Files Created and Modified

- **New Files**:
  - `src/questions/management/QuestionDraft.ts`: `QuestionDraftInput`, `buildQuestionDraft`, `validateQuestionDraft`, `groupErrorsByField`, `rootFieldName`. Raw form strings → partial `Question`, validated with the shared validator; system-managed fields (`id`, timestamps) are excluded from editor errors since the editor never supplies them.
  - `src/questions/management/QuestionPreview.ts`: player-facing projection (`buildQuestionPreview`) that surfaces invalid/unpublished records as unplayable instead of presenting them.
  - `tests/questions/phase25_5_authoring_workflow.test.ts`: 27 tests across editor validation, preview mapping, bulk-import report/rollback, backup/restore, and export compatibility.
  - `docs/PHASE_25_5_IMPLEMENTATION_REPORT.md`: This report.
- **Modified Files**:
  - `src/questions/management/QuestionManager.ts`: Added `previewImport` (dry-run report), `createBackup`, `restoreBackup`, and filtered `exportToJson(criteria)`; added the `ImportRecordReport` / `ImportPreview` / `QuestionBackup` / `RestoreResult` types.
  - `src/questions/index.ts`: Barrel exports for the new draft, preview, and import/backup types.
  - `src/ui/admin/AdminDashboard.ts`: Field-level error rendering, "Save as Draft" and "Preview as Player" actions, a review-status control, a dry-run import report, filtered export, and Backup & Restore. Generalized `showConfirmDialog` for destructive/bulk actions.
  - `src/ui/admin/admin-dashboard.css`: Styles for field errors, the player-view preview, and the import/export detail and warning rows.
  - `docs/IMPLEMENTATION_REPORTS.md`: Consolidated tracker updated with Phase 25.5.

### 3. Editor Validation and Field Errors

- `buildQuestionDraft` maps raw form strings onto a partial `Question` with **no silent coercion** — a blank/non-numeric number parses to `NaN`, which the validator then rejects.
- `validateQuestionDraft` returns errors grouped by root field (`choices[2].text` → `choices`), so the dashboard can attach a message beneath each offending control; choice-level errors land on the choices section.
- Fields owned by the persistence path (`id`, `createdAt`, `updatedAt`) are not treated as author errors, so creating a brand-new question is not blocked. The manager still validates the fully assembled record on write, so nothing invalid is persisted.

### 4. Player-View Preview

`buildQuestionPreview` renders the prompt, meta, options (correct option highlighted), the resolved correct answer (choice text for multiple choice, canonical/expected text otherwise), accepted answers, explanation, and any structural issues. `playable` is true only when the record is both structurally valid **and** published; otherwise the preview is clearly marked "Not playable".

### 5. Bulk Import, Backup, and Export

| Capability | Behaviour |
| --- | --- |
| Dry-run report (`previewImport`) | Non-mutating. Per-record status (valid / invalid / duplicate-id), errors, and prompt warnings; `canImport` only when there are records and zero invalid/duplicate IDs. |
| Duplicate IDs | Blocked — detected against the existing bank and earlier records in the same batch. |
| Duplicate prompts | **Warning only** (candidate for human review), never a block, using the shared `normalizePromptText`. |
| Commit (`importFromJson`) | All-or-nothing; a backup is taken before the batch is applied. |
| Backup / restore (`createBackup` / `restoreBackup`) | Snapshot is re-importable; restore is all-or-nothing and tombstones removed bundled records. |
| Export (`exportToJson`) | No criteria → whole bank. With criteria → the same `repository.filter` semantics as the admin list (default-to-Published preserved), so filtered exports match what the admin sees. |

### 6. Verification & Test Results

- **Automated Tests (`npm test`)**: 61 test files passed (598 tests passed, 0 failures). The new `phase25_5_authoring_workflow.test.ts` contributes 27 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

### 7. Scope Note

This phase delivers the authoring workflow: editor field validation, player-view preview, draft/review/published states, the bulk-import report, backup/restore, and filtered export. Per the handbook, no AI dependency or remote API was introduced, and invalid questions are never silently published.

Phase complete. Stopping here as required; no subsequent phase was started.
