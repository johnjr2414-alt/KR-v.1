# Phase 27.3 — Professional Assignment Engine

**Date**: 2026-11-09
**Phase**: 27.3 (Handbook Section: Phase 27 — Real-World Professions and Careers)
**Status**: Completed

## 1. Executive Summary

Phase 27.3 adds a reusable, configurable, **headless professional assignment framework** to the
real-world professions track. An *assignment* is a professional activity a player undertakes inside
an enrolled profession — a knowledge assessment, problem-solving task, case analysis, project,
practical simulation, or research assignment. Assignments are composed of ordered **stages**, each
containing generic, typed **objectives**, so the engine never hardcodes a specific profession: new
content (for any profession) is added **purely through configuration**.

Key properties delivered:

- **Not question-only.** Objectives are counters of several kinds — `AnswerQuestions`,
  `CompleteSteps`, `CollectItems`, and `ReportOutcome` — advanced by one uniform mechanism, so
  multi-part projects and non-question milestones are first-class. Question-backed objective *wiring*
  to the live question system is deferred to Phase 27.4.
- **Multi-stage.** Completion requires every objective of every stage to be satisfied; the engine
  advances the active stage automatically as each stage clears.
- **Reward data only.** Reward bundles (profession EXP, character EXP, gold, reputation, subject
  mastery EXP) are defined and validated here and surfaced on a completion result, but are **not
  distributed** — distribution is routed through the existing progression, mastery, and currency
  services in Phase 27.5. No duplicate reward system is introduced.
- **Idempotent, duplicate-safe.** Completions are keyed by a stable `completionId`; repeated
  completion requests replay the existing result, and `claimRewards` is safe to call more than once.
- **Career-profile integration.** Completing an assignment is mirrored onto the enrolled
  profession's career record (`assignmentHistory`) via a completion hook, keeping the engine
  decoupled from `CareerService`.
- **Persisted.** Assignment state (active + full history) is stored as an optional, backward-
  compatible `SaveData` payload; the schema version is bumped 5 → 6.

Everything in `src/professions/` is headless (no Phaser/DOM imports) and data-driven.

## 2. Files Created and Modified

- **New Files**:
  - `src/professions/AssignmentTypes.ts`: assignment task types, generic objective types, stage/
    objective/reward/requirement definitions, active/history state, `AssignmentSnapshot`
    (+ `ASSIGNMENT_SNAPSHOT_VERSION`), the caller-supplied `AssignmentContext`, and result types.
  - `src/professions/AssignmentRegistry.ts`: labelled **sample** catalogue — `ASSIGNMENT_DEFINITIONS`
    (6 assignments, 2 per seed profession) + `ASSIGNMENT_REGISTRY`/lookups. Demonstrates multiple
    task types, multi-stage assignments, a non-question `CompleteSteps` objective, rank/level gates,
    prerequisites, and configurable rewards.
  - `src/professions/AssignmentService.ts`: headless `AssignmentService` (availability, prerequisite
    validation, acceptance, active tracking, objective progress, stage advancement, completion,
    failure, completion-result generation, history, idempotent reward claims, snapshot/load) +
    `sanitizeAssignmentSnapshot` + default `assignmentService`.
  - `src/professions/AssignmentValidator.ts`: catalogue validation (unique ids, required fields,
    resolvable profession/rank/quest/assignment references, stage & objective structure, reward data).
  - `tests/professions/phase27_3_assignments.test.ts` (44 tests).
  - `docs/PHASE_27_3_IMPLEMENTATION_REPORT.md`: this standalone phase report.
- **Modified Files**:
  - `src/professions/index.ts`: barrel exports for the assignment domain.
  - `src/professions/CareerService.ts`: `recordAssignmentCompletion()` — appends a completion to the
    enrolled profession's `assignmentHistory` (no-op when not enrolled).
  - `src/storage/StorageTypes.ts`: optional `assignments?: AssignmentSnapshot` on `SaveData`;
    `SAVE_DATA_SCHEMA_VERSION` 5 → 6.
  - `src/storage/SaveDataValidator.ts`: sanitizes the optional assignment payload.
  - `src/player/PlayerSessionManager.ts`: injectable `AssignmentService` (defaulted with a completion
    hook that records into the career profile), hydrate on load, snapshot on save, and
    `buildAssignmentContext()`.
  - `docs/IMPLEMENTATION_REPORTS.md`: consolidated master tracker updated with Phase 27.3.
  - `docs/DEVELOPMENT_ROADMAP.md`: Phase 27.3 marked complete.

## 3. Sample Content

Six clearly-labelled **provisional** assignments, two per fully-defined seed profession:

| Assignment | Profession | Task type | Difficulty | Requirements | Stages |
| --- | --- | --- | --- | --- | --- |
| `doctor-patient-intake` | Doctor | Knowledge Assessment | 1 | rank `medical-trainee` | 1 |
| `doctor-diagnose-ward` | Doctor | Case Analysis | 3 | rank `junior-doctor`, prereq `doctor-patient-intake` | 2 |
| `engineer-circuit-basics` | Electrical Engineer | Problem Solving | 1 | rank `engineering-intern` | 1 |
| `engineer-fault-finding` | Electrical Engineer | Practical Simulation | 3 | rank `junior-engineer`, prereq `engineer-circuit-basics` | 2 |
| `architect-floor-plan` | Architect | Knowledge Assessment | 1 | rank `architectural-trainee` | 1 |
| `architect-design-challenge` | Architect | Project Completion | 3 | rank `junior-architect`, prereq `architect-floor-plan` | 2 |

`architect-design-challenge` uses a non-question `CompleteSteps` objective to prove the engine is not
restricted to answering questions.

## 4. Design Notes

- **Generic objective engine.** `recordObjectiveProgress(assignmentId, objectiveId, amount)` increments
  a counter capped at the objective's `required`; when every objective of the current stage is
  satisfied the stage index advances and the next stage's objectives are seeded. `allStagesComplete`
  becomes `true` when the stage index reaches the stage count.
- **Completion semantics.** `completeAssignment` refuses while stages remain
  (`ObjectivesIncomplete`), then records a history entry keyed by a stable `completionId` (`def.id`
  for non-repeatable; `def.id#n` for repeatable). Replaying completion of an already-completed
  non-repeatable assignment returns `alreadyCompleted: true` with the existing completion id and no
  duplicate history.
- **Failure semantics.** `failAssignment` records a failed history entry with no rewards and marks it
  non-claimable.
- **Career integration.** The service exposes an optional `onCompleted` hook; `PlayerSessionManager`
  wires it to `CareerService.recordAssignmentCompletion`, so a finished assignment lands on the
  enrolled profession's career record without coupling the engine to `CareerService`.
- **Persistence & backward compatibility.** `AssignmentSnapshot` is optional on `SaveData`;
  unknown-assignment entries are dropped safely on load, and `sanitizeAssignmentSnapshot` repairs or
  discards unusable payloads.

## 5. Verification & Test Results

Coverage: registry/sample-content shape, catalogue validation (duplicate ids, unknown profession/
rank/quest/assignment references, self-prerequisites, malformed stages/objectives/rewards),
availability (unknown, not-enrolled, rank/level gates, prerequisites, already-active, already-
completed), acceptance, cap-at-required, multi-stage advancement, non-question objectives, progress
failure modes, completion conditions, failure conditions, duplicate-completion prevention, reward
result generation, idempotent claims, the completion hook, snapshot round-trip, and save/load
persistence through `PlayerSessionManager` (including career-profile mirroring).

- **Automated Tests (`npm test`)**: 74 test files passed (953 passed, 0 failures). The new assignment
  suite contributes 44 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).
