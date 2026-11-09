# Phase 27.6 — Career UI, NPC, and Quest Integration

**Date**: 2026-11-09
**Phase**: 27.6 (Handbook Section: Phase 27 — Real-World Professions and Careers)
**Status**: Completed

## 1. Executive Summary

Phase 27.6 makes the profession framework **visible and playable**. It adds the four career
interfaces required by the phase — Career Selection, Career Profile, Workplace, and Assignment —
and connects them to the world through the **existing** NPC, dialogue, and quest systems, without
introducing a duplicate NPC interaction system or a duplicate quest engine.

Two design choices keep the work honest and testable:

1. **A headless view-model layer.** `src/professions/CareerViewModels.ts` turns the authoritative
   `CareerService`, `WorkplaceService`, `AssignmentService`, and `ProfessionProgressionService` into
   plain, display-ready view models. All game rules (enrollment eligibility, access checks,
   availability, progress, rewards) are computed there using existing services — the DOM layer is a
   thin renderer, and the "UI-facing service logic" is unit-tested without a browser.
2. **Reuse over reinvention.** The single `CareerModal` overlay hosts all four interfaces and reuses
   the existing `QuestionModal` + shared `QuestionRepository` + `AssignmentQuestionResolver` for
   assignment questions. Career NPCs flow through the existing `NPCDialogueModal`, which gains a
   single career entry button. Career quests live in the existing `QuestRegistry` under a new
   `QuestCategory.Career`, distinct from general quests and from professional assignments.

No new save field was required: Phase 27.1's `CareerSnapshot` / `AssignmentSnapshot` already persist
all career state, so persistence only needed to expose view accessors on `PlayerSessionManager`.

## 2. Files Created and Modified

- **New Files**:
  - `src/professions/CareerViewModels.ts`: the headless, UI-facing builders —
    `buildProfessionCatalogueView`, `buildCareerProfileView`, `buildWorkplaceView`,
    `buildAssignmentView`, and the `CareerViewDeps` bundle and all view-model types.
  - `src/ui/career-modal/CareerModal.ts`: the single career overlay (tabs: Careers / Profile /
    Workplace) with an inline Assignment detail view; performs enroll / accept / progress / complete
    / abandon actions and runs assignment questions through the existing `QuestionModal`.
  - `src/ui/career-modal/career-modal.css`: overlay/card/tab styling, badges, requirement lists,
    EXP bars, stage/reward panels.
  - `src/ui/career-modal/index.ts`: barrel export.
  - `tests/professions/phase27_6_career_ui.test.ts` (22 tests).
  - `docs/PHASE_27_6_IMPLEMENTATION_REPORT.md`: this standalone phase report.
- **Modified Files**:
  - `src/player/PlayerSessionManager.ts`: added an injectable `WorkplaceService` (default
    `workplaceService`), `careerViewDeps()`, and session-level view accessors
    `getCareerCatalogueView()`, `getCareerProfileView()`, `getWorkplaceView(id)`,
    `getAssignmentView(id)`.
  - `src/professions/index.ts`: barrel export for `CareerViewModels`.
  - `src/ui/index.ts`: exports `CareerModal` (+ options/tab types).
  - `src/quests/NPCTypes.ts`: optional `workplaceId` on `NPCDefinition` (data link only).
  - `src/quests/NPCRegistry.ts`: `career-advisor-marisol` now offers the career quest and links to
    the `career-center`; added workplace-staff NPCs `academy-instructor-lena` (`academy`) and
    `doctor-quinn` (`hospital`).
  - `src/professions/WorkplaceRegistry.ts`: `academy`/`hospital` `npcIds` link the new staff NPCs.
  - `src/quests/QuestTypes.ts`: added `QuestCategory.Career`.
  - `src/quests/QuestRegistry.ts`: added `quest-career-orientation` (Career category) and the
    `getQuestsByCategory()` helper.
  - `src/ui/npc-dialogue/NPCDialogueModal.ts`: optional `onOpenCareer` callback and a "🎓 Career
    Center" footer action for workplace contacts.
  - `src/ui/npc-dialogue/npc-dialogue.css`: `.npc-btn--career` styling.
  - `src/scenes/VillageScene.ts`: routes career NPCs (career modal for pure staff; dialogue + career
    button for quest-giving contacts), added `openCareerModal()`, included `activeCareerModal` in the
    update/interaction guards, added the proximity prompt, and added shutdown cleanup.
  - `docs/IMPLEMENTATION_REPORTS.md`: consolidated master tracker updated with Phase 27.6.
  - `docs/DEVELOPMENT_ROADMAP.md`: Phase 27.6 marked complete.

## 3. Design Notes

### 3.1 Career interfaces (all in one overlay)
The spec calls for four interfaces; they are tabs/views of one `CareerModal` so they can be reached
from a single NPC interaction:
- **Career Selection** — browse profession categories, descriptions, responsibilities, associated
  workplaces, ranks, enrollment requirements, and per-requirement eligibility; enroll with inline
  validation feedback.
- **Career Profile** — enrolled professions with level/EXP bar, current rank, reputation, status,
  active assignments, and completed-assignment history.
- **Workplace** — workplace info, professions, staff (`npcIds`), activities, entry requirements,
  facilities with open/locked state, and offerable professional assignments.
- **Assignment** — title/status, profession, question topics, requirements, stages/objectives with
  progress, question-backed objectives (via the existing question modal), rewards, and
  accept/progress/complete/abandon actions.

### 3.2 Reuse (no duplicate systems)
- **Questions**: assignment question objectives are run by instantiating the existing `QuestionModal`
  (chained) and resolving questions through `AssignmentQuestionResolver` over the shared
  `sharedQuestionRepository` — identical to the Arena pattern.
- **NPCs**: career contacts use the existing `NPCDialogueModal`. Pure workplace staff open the career
  interface directly; quest-giving career NPCs keep the dialogue modal and expose the career
  interface through one added footer button. No second NPC interaction system exists.
- **Quests**: career quests are ordinary `QuestRegistry` entries with `category: QuestCategory.Career`.
  They share objectives/requirements/rewards infrastructure with every other quest but stay a distinct
  category from general quests and from professional assignments (which use the assignment engine and
  profession-progression rules).

### 3.3 Persistence
Career state continues to persist through the existing `careers` / `assignments` `SaveData` payloads
(schema v6). This phase did not add or migrate any schema — it only exposed read-only view accessors
on the session and saved the session after state-changing actions.

### 3.4 NPC placement
`career-advisor-marisol` (Career Center), `academy-instructor-lena` (Academy), and `doctor-quinn`
(Hospital) were placed in the Beginners Village, linking NPCs ↔ workplaces bidirectionally. The
Career Advisor also gives `quest-career-orientation` so career quests are reachable through the
existing quest pipeline.

## 4. Verification & Test Results

Coverage (22 tests) spans the UI-facing service logic and the integration wiring:
career-selection view (grouping, eligibility, requirement reporting, enrollment reflection);
career-profile view (empty state; level/EXP/rank/reputation; active → history transitions);
workplace view (unknown id; professions/facilities/staff/interaction points; per-context facility
access; assignment offers; activities); assignment view (unknown id; availability/requirements/
stages/objectives/rewards; available → active → completed); career quest integration (distinct
category; registered quest; separation from general quests and from assignments; NPC pipeline);
career NPC integration (advisor type/workplace/quest; staff workplace links; bidirectional
NPC ↔ workplace; map placement); and a persistence round trip through `PlayerSessionManager`
(session view models; careers/assignments survive save/load).

The handbook's runtime checklist (career selection, enrollment, workplace interactions, facility
access, assignment interactions, assignment completion, career profile updates, scene transitions,
save/load) is exercised at the service/view-model layer by the suite above; the scene routing
(`VillageScene.openCareerModal` / dialogue career button) and overlay are thin wrappers over the
tested logic.

- **Automated Tests (`npm test`)**: 77 test files passed (1027 passed, 0 failures). The new career-UI
  suite contributes 22 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).
