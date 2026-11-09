# Phase 27.7 — Seed Professions End-to-End and Extensibility Validation

**Date**: 2026-11-09
**Phase**: 27.7 (Handbook Section: Phase 27 — Real-World Professions and Careers)
**Status**: Completed

## 1. Executive Summary

Phase 27.7 is the **validation and completeness** phase that closes the Phase 27 track. It does two
things:

1. **Finishes the three fully-defined seed professions** (Doctor, Electrical Engineer, Architect) so
   each is genuinely playable end-to-end: a definition, a workplace, **at least one interactive NPC**,
   facilities, **two example assignments**, profession-tagged questions, profession EXP/reputation
   progression, configurable rewards, save/load support, and career-UI integration.
2. **Proves extensibility** by adding one more profession — **Teacher** — *purely through configuration*,
   with **no change to the core profession engine**, and verifies it can be displayed, enrolled in,
   workplace-accessed, assigned, served questions, rewarded, and restored from a save.

The gap this phase closed for the seed set was the **interactive NPC requirement**: the Engineering
Center and Architecture Studio workplaces had no staffed NPC. Two workplace-staff NPCs were added and
wired bidirectionally. The config-only profession reuses the existing Academy workplace and its NPC, so
it needed only catalogue data plus its own assignments and question samples.

## 2. Files Created and Modified

- **New Files**:
  - `tests/professions/phase27_7_seed_professions.test.ts` (37 tests): the seed-profession end-to-end
    suite and the configuration-only extensibility suite.
  - `docs/PHASE_27_7_IMPLEMENTATION_REPORT.md`: this standalone phase report.
- **Modified Files**:
  - `src/quests/NPCRegistry.ts`: added two workplace-staff NPCs — `engineer-rurik` (Engineering Center
    Foreman, `workplaceId: 'engineering-center'`) and `architect-ines` (Architecture Studio Designer,
    `workplaceId: 'architecture-studio'`), both on `beginners-village` with default dialogue and no
    offered quests (so the village routes them to the career interface).
  - `src/professions/WorkplaceRegistry.ts`: linked the new staff — Engineering Center
    `npcIds: ['engineer-rurik']`, Architecture Studio `npcIds: ['architect-ines']`; associated the new
    profession with the Academy (`professionIds: ['teacher']`).
  - `src/professions/ProfessionRegistry.ts`: appended the configuration-only **Teacher** profession
    (category `education-science`, workplace `academy`, 6-rank ladder, `questionTags: ['teaching',
    'pedagogy']`, `experience: standardExperience()`) and updated the file docstring.
  - `src/professions/AssignmentRegistry.ts`: appended **two Teacher assignments**
    (`teacher-lesson-basics`, `teacher-class-assessment`) — append-only, so index-sensitive earlier
    tests are unaffected.
  - `src/professions/ProfessionQuestionSamples.ts`: appended **five Teacher question samples**
    (teaching/pedagogy at elementary and junior-high tiers) — append-only, preserving
    `PROFESSION_QUESTION_SAMPLES[7]`.
  - `docs/DEVELOPMENT_ROADMAP.md`: Phase 27.7 marked complete.
  - `docs/IMPLEMENTATION_REPORTS.md`: consolidated master tracker updated with Phase 27.7.

## 3. Design Notes

### 3.1 Seed professions are complete end-to-end
Each of Doctor, Electrical Engineer, and Architect now has:

| Element | Doctor | Electrical Engineer | Architect |
| --- | --- | --- | --- |
| Definition (category, ranks, tags) | ✓ | ✓ | ✓ |
| Workplace | Hospital | Engineering Center | Architecture Studio |
| Interactive NPC (bidirectional) | `doctor-quinn` | `engineer-rurik` (new) | `architect-ines` (new) |
| Facilities | ✓ | ✓ | ✓ |
| Example assignments | 2 | 2 | 2 |
| Profession question samples | 3 | 2 | 2 |
| EXP / reputation progression | ✓ | ✓ | ✓ |
| Configurable rewards + save/load | ✓ | ✓ | ✓ |

### 3.2 Extensibility demonstrated by configuration only
The **Teacher** profession was added by appending catalogue data only — no `src/professions/` engine
code changed to support it. It reuses:

- the existing `education-science` **category**,
- the existing **Academy** workplace and its `academy-instructor-lena` NPC,
- the existing **assignment engine** (two new assignments are pure data),
- the existing **`AssignmentQuestionResolver`** and `QuestionRepository` (five new tagged samples),
- the existing **progression / reward** services (its EXP curve is the shared `standardExperience()`).

This is the concrete proof that profession content is additive and non-invasive.

### 3.3 Append-only content edits
Earlier phase tests reference catalogue entries **by array index**
(`ASSIGNMENT_DEFINITIONS[0]/[1]/[5]`, `PROFESSION_QUESTION_SAMPLES[7]`). All Phase 27.7 content was
**appended**, never inserted, so every existing index remains stable. `PROFESSION_QUESTION_SAMPLES`
continues to be **excluded** from the shipped bundled bank, keeping the bundle profession-tag-free.

### 3.4 No engine, schema, or scene changes
No new `SaveData` field was required (Phase 27.1's `CareerSnapshot` / `AssignmentSnapshot` already cover
all career state). `VillageScene` already routes pure workplace-staff NPCs (no offered quests) to the
career interface, so the new NPCs needed no scene change.

## 4. Verification & Test Results

The suite (`tests/professions/phase27_7_seed_professions.test.ts`, **37 tests**) covers:

- **Seed professions end-to-end** (8 checks × 3 professions): definition (ranks/tags/workplace);
  workplace lists the profession and staffs a linked NPC; facilities + interaction points; ≥2
  assignments; profession-tagged question samples; enroll → profession EXP + reputation; full activity
  completion with idempotent, configurable reward distribution through the existing services;
  career+assignment save/load round trip.
- **Extensibility (Teacher)** — present in catalogue + valid category; displayable in the career
  selection view; enrollable; accesses the Academy workplace + staffed NPC; receives assignments
  without engine change; retrieves suitable questions through `AssignmentQuestionResolver` at both
  elementary and junior-high tiers; earns EXP + rewards and survives save/restore; unlocks a gated
  follow-up assignment through rank + prerequisite progression.
- **Catalogue validation & regression** — profession, workplace (incl. cross-associations), and
  assignment catalogues validate clean; the bundled question bank stays free of profession tags; the
  career NPCs remain placed in the Beginners Village.

- **Automated Tests (`npm test`)**: 78 test files passed (**1064 passed, 0 failures**). The new
  Phase 27.7 suite contributes 37 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

### 4.1 Manual gameplay verification
The handbook's runtime checklist is exercised at the headless service/view-model layer (the layers the
scene routing and overlays are thin wrappers over): career selection, enrollment, workplace/facility
access, assignment accept → progress → complete, question retrieval, reward distribution, career
profile updates, and save/load. The seed professions and the configuration-only Teacher were confirmed
reachable through the existing village → career-modal → workplace/assignment flow.

## 5. Phase 27 Closure

With 27.7 complete, the Phase 27 track (Real-World Professions and Careers) is finished: framework,
workplaces, assignment engine, question integration, progression, career UI/NPC/quest integration, and
end-to-end seed validation with a configuration-only extensibility demonstration. **Stop after this
phase**, per the Phase 27 Master Implementation Plan.

## 6. Future Roadmap Compatibility Review

Per the Phase 27 Master Implementation Plan (Future Roadmap Compatibility), the following reviews how
later/handbook phases interact with the new career system, with the smallest necessary adjustment for
each. **No future-phase feature is implemented here.**

### 6.1 Phase 28 — Save Integrity and Administration Hardening
- **Dependency**: `SaveData` now carries optional `careers` (`CareerSnapshot`) and `assignments`
  (`AssignmentSnapshot`) at schema **v6**. The migration chain (28.1), corruption recovery (28.3), and
  import/export (28.5) must include these sections.
- **Smallest adjustment**: the 28.1 migration chain already treats schema changes through v6 as additive
  and runs `validateSaveData` (which sanitizes `careers`/`assignments`) after migrating, so no extra
  branch is needed. If a *non-additive* change to those snapshots is ever made, add a real transform in
  the corresponding step in `src/storage/SaveMigrations.ts` rather than a no-op.

### 6.2 Phase 29 — Release Readiness
- **Dependency**: minimal. `PROFESSION_QUESTION_SAMPLES` is deliberately **not** merged into the bundled
  bank, and career UI logic is headless (`CareerViewModels.ts`), so profession content does not inflate
  the shipped question bundle.
- **Smallest adjustment**: none required; the 29.1 bundle-size review may simply note the profession
  samples are excluded from the production bundle.

### 6.3 Phase 30 — Online Architecture Preparation
- **Dependency**: career enrollment, profession EXP/rank/reputation, and assignment completion are
  player-authoritative state that would become **server-authoritative** candidates.
- **Smallest adjustment**: none now. Document `CareerService`/`AssignmentService`/`ProfessionProgressionService`
  as the authoritative career-state boundary when the 30.1 server-boundary analysis is performed.

### 6.4 Preserved future systems (gathering, crafting, economy, property)
- The plan requires preserving the original gathering/crafting/economy concepts as possible future
  systems (Mining, Farming, Woodcutting, Blacksmithing, Alchemy, Crafting, Trading, Business, Banking,
  Property). These are **not** implemented in Phase 27 and are **not** renumbered.
- **Smallest adjustment**: when such activities are built, they may reuse the profession framework
  (e.g. a `Miner`/`Artisan` profession) by adding **configuration only** — the same additive path proven
  in 27.7 — without changing the profession engine.
