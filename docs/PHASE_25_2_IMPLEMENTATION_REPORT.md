# Phase 25.2 Implementation Report — Subject and Topic Taxonomy

**Date**: 2026-11-08  
**Phase**: 25.2 (Handbook Section: Educational Content and Learning Quality)  
**Status**: Completed

---

### 1. Executive Summary

Phase 25.2 organizes the question bank into a maintainable subject/topic structure. Every declared `SubjectId` has a subject node, topics are derived directly from the bundled content, and each raw `question.topic` string is linked to a canonical topic through an explicit, reviewable mapping table.

Two rules drove the design:

1. **Stable ids independent of labels.** Topic ids are namespaced as `<subjectId>.<topicSlug>` (for example `mathematics.addition`). This keeps ids globally unique and collision-free — the `physics` topic under `science` cannot be confused with the `physics` subject id. `displayName` and `description` are presentation text and may change without touching ids.
2. **No content is rewritten.** Questions are classified at read time only. The mapping table is the single place where reclassification happens, and unmapped questions are reported rather than silently altered. No mass reclassification was performed.

Subjects that are declared but have no bundled questions (`physics`, `business`) carry empty tier lists and are listed as "subjects without content" — no topics or content were invented for them.

### 2. Files Created and Modified

- **New Files**:
  - `src/questions/taxonomy/TaxonomyTypes.ts`: Domain types for subjects, topics, subtopics, mapping entries, validation issues, classification results, and coverage summaries.
  - `src/questions/taxonomy/TaxonomyData.ts`: `SUBJECT_TAXONOMY`, `TOPIC_TAXONOMY`, `QUESTION_TOPIC_MAPPINGS`, and the `buildTopicId` helper.
  - `src/questions/taxonomy/TaxonomyValidator.ts`: `TOPIC_ID_PATTERN`, `isValidTopicId`, and the non-mutating `validateTaxonomy` integrity check.
  - `src/questions/taxonomy/TaxonomyCoverage.ts`: Lookups, `resolveRawTopicsForTopic`, read-only `classifyQuestion`, and `buildTaxonomyCoverageReport`.
  - `src/questions/taxonomy/index.ts`: Barrel export for the taxonomy module.
  - `tests/questions/phase25_2_taxonomy.test.ts`: 14 tests covering validation, id namespacing, classification, coverage, and repository filtering.
  - `docs/PHASE_25_2_IMPLEMENTATION_REPORT.md`: This report.
- **Modified Files**:
  - `src/questions/index.ts`: Re-exports the taxonomy module.
  - `src/questions/retrieval/QuestionRepository.ts`: Added an optional `topics?: string[]` filter criterion (OR logic) so one taxonomy topic can match the several raw topic strings that resolve to it. Existing `topic` behaviour is unchanged.
  - `src/ui/admin/AdminDashboard.ts`: Subject filter uses display names; added a Topic filter fed by `TOPIC_TAXONOMY`; added a coverage line that reports mapped/unmapped questions and subjects without content.
  - `src/ui/admin/admin-dashboard.css`: Styled the coverage line.
  - `docs/IMPLEMENTATION_REPORTS.md`: Consolidated tracker updated with Phase 25.2.

### 3. Taxonomy Shape

**Subjects** (one per `SubjectId`): Mathematics, General Knowledge, Science, Programming, and the declared-but-empty Physics and Business.

**Topics** (derived from bundled data): mathematics — addition, subtraction, multiplication, division, fractions, algebra, geometry; science — biology, states-of-matter, solar-system, chemistry, physics; general-knowledge — geography, animals; programming — logic, binary.

**Subtopics**: the schema supports nested subtopics, but no bundled question records one, so no subtopics are declared — the data is not padded to look richer than it is.

**Mapping**: `QUESTION_TOPIC_MAPPINGS` lists all 16 raw topic strings found in the bundled bank, each pointing at its canonical topic id. Because the table is exhaustive for the current bank, a coverage report over it shows zero unmapped questions.

### 4. Validation Rules

`validateTaxonomy` is structural and read-only. It flags:

- unknown or duplicate subject ids, empty subject labels, and invalid or duplicated tiers;
- declared subjects that have no taxonomy node;
- malformed topic ids, duplicate topic ids, unknown subject references, and ids whose subject prefix does not match their `subject` field;
- empty topic/subtopic labels and duplicate subtopic ids;
- malformed mappings: empty raw topics, unknown subjects, duplicate raw-topic keys, undefined target topics, and subject/topic mismatches.

It does not judge educational appropriateness and does not modify any data.

### 5. Verification & Test Results

- **Automated Tests (`npm test`)**: 58 test files passed (539 tests passed, 0 failures). The new `phase25_2_taxonomy.test.ts` contributes 14 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

Phase complete. Stopping here as required; no subsequent phase was started.
