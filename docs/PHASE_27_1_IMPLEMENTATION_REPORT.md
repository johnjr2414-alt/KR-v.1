# Phase 27.1 Implementation Report — Profession Framework, Categories, and Enrollment

**Date**: 2026-11-09
**Phase**: 27.1 (Handbook Section: Phase 27 — Real-World Professions and Careers)
**Status**: Completed
**Scope**: Headless `src/professions/` domain — configurable categories, profession definitions, rank ladders, enrollment requirements, career profile, validation, and backward-compatible persistence + tests. No world/UI content this phase.

---

### 1. Executive Summary

Phase 27.1 establishes a **reusable, configurable Real-World Professions & Career framework**.
Per the master plan, the phase:

- **Inspected** the player session and save schema (`PlayerData`, `StorageTypes`, `SaveDataValidator`,
  `PlayerSessionManager`), education tiers and subject mastery (`education.ts`, `MasteryManager`,
  `MasteryData`), currency (`CurrencyService`), quests (`QuestManager`, `QuestRegistry`,
  `QuestTypes`), and the world/building registries **before** writing code.
- **Adds configurable categories** — Healthcare, Engineering and Technology, Architecture and
  Construction, Education and Science, Business and Finance, Law — as additive data
  (`PROFESSION_CATEGORY_DEFINITIONS`), never hardcoded limitations.
- **Adds profession definitions** carrying id, name, category, description, responsibilities,
  associated workplaces, enrollment requirements, rank definitions, EXP progression settings,
  question/subject tags, and optional specializations. New professions are added purely through
  configuration.
- **Adds configurable rank ladders** per profession (e.g. Doctor: Medical Trainee → Junior Doctor →
  General Practitioner → Senior Doctor → Medical Specialist → Chief Physician).
- **Adds optional enrollment requirements** — character level, subject mastery, gold, and
  prerequisite quests — none of which is mandatory for every profession.
- **Adds a career profile** where a player pursues multiple professions, each independently tracking
  profession id, level, EXP, rank, reputation, enrollment status, and assignment history, with
  **duplicate enrollment prevented**.
- **Adds validation** for ids, categories, ranks, thresholds, requirements, and missing references,
  handling invalid definitions safely.
- **Adds persistence** through an optional, backward-compatible `careers` field on `SaveData`,
  integrated with `PlayerSessionManager`. No separate profession save system was created.
- **Fully defines Doctor, Electrical Engineer, and Architect**, plus three definition-only entries
  (Nurse, Civil Engineer, Lawyer) to demonstrate that new professions are purely additive.

All rules are headless; no Phaser/DOM dependency was introduced. All balance values are
**provisional** (`provisional: true`).

### 2. Files Created and Modified

- **New Files**:
  - `src/professions/ProfessionTypes.ts`: category, rank, enrollment-requirement, specialization,
    profession definition, career record, `CareerSnapshot`, `EnrollmentContext`, enrollment
    result/check types, and `CAREER_SNAPSHOT_VERSION`.
  - `src/professions/ProfessionCategories.ts`: `PROFESSION_CATEGORY_DEFINITIONS` + registry and
    lookups.
  - `src/professions/ProfessionRegistry.ts`: `PROFESSION_DEFINITIONS` (Doctor, Electrical Engineer,
    Architect fully defined; Nurse, Civil Engineer, Lawyer definition-only) + registry and lookups.
  - `src/professions/ProfessionValidator.ts`: `validateProfessionCategories`,
    `validateProfessionCatalogue`, and issue/report types.
  - `src/professions/CareerService.ts`: headless `CareerService` (catalogue access, rank resolution,
    `checkEnrollment`, `enroll`, `snapshot`/`loadSnapshot`), `sanitizeCareerSnapshot`, and the default
    `careerService` instance.
  - `src/professions/index.ts`: barrel export.
  - `tests/professions/phase27_1_professions.test.ts`: 36 tests.
  - `docs/PHASE_27_1_IMPLEMENTATION_REPORT.md`: This report.
- **Modified Files**:
  - `src/storage/StorageTypes.ts`: added the optional `careers?: CareerSnapshot` field and bumped
    `SAVE_DATA_SCHEMA_VERSION` from `4` to `5` (purely additive; older saves remain loadable).
  - `src/storage/SaveDataValidator.ts`: sanitises the optional `careers` payload via
    `sanitizeCareerSnapshot`.
  - `src/player/PlayerSessionManager.ts`: added an injectable `CareerService`, hydrates it from the
    save, includes `careers.snapshot()` in the session snapshot, and adds
    `buildEnrollmentContext()` to assemble player level, mastery, gold, and quest state for the
    headless service.
  - `docs/IMPLEMENTATION_REPORTS.md`: consolidated master tracker updated with Phase 27.1.
  - `docs/DEVELOPMENT_ROADMAP.md`: added the Phase 27 (Real-World Professions and Careers) section.

### 3. Initial Profession Catalogue (provisional, data-only)

| Profession | Category | Enrollment (level / mastery / gold) | Ranks |
| --- | --- | --- | --- |
| `doctor` | Healthcare | 5 / Science 2 / 200 | Medical Trainee → Chief Physician (6) |
| `electrical-engineer` | Engineering and Technology | 5 / Physics 2 / 150 | Engineering Intern → Principal Engineer (6) |
| `architect` | Architecture and Construction | 5 / Mathematics 2 / 150 | Architectural Trainee → Principal Architect (6) |
| `nurse` *(definition-only)* | Healthcare | 3 / Science 1 / 100 | Nursing Assistant → Chief Nurse (6) |
| `civil-engineer` *(definition-only)* | Architecture and Construction | 5 / Mathematics 2, Physics 1 / 150 | Civil Engineering Intern → Principal Civil Engineer (6) |
| `lawyer` *(definition-only)* | Law | 8 / Business 2, General Knowledge 2 / 250 | Law Clerk → Senior Partner (6) |

Doctor also carries optional specializations (`cardiology`, `pediatrics`) to exercise the optional
specialization field.

### 4. Design Notes & Deliberate Boundaries

- **Headless & decoupled.** `CareerService` never reaches into managers or the session. Enrollment
  is evaluated against a plain `EnrollmentContext` (level, mastery resolver, gold, gold-spend
  callback, quest-completion resolver), keeping the domain pure and deterministic in tests.
- **Atomic enrollment.** All requirements are validated before any state change; gold is deducted
  only after every other requirement passes and only when the deduction succeeds. Duplicate
  enrollment is rejected *before* requirement evaluation or any gold deduction.
- **Rank is derived data.** Ranks are configured thresholds; `getRankForLevel` resolves the current
  rank. No rank/level is stored redundantly beyond the persisted `rankId` snapshot.
- **Progression application is deferred.** EXP settings (max level, base, growth) are part of the
  definition and validated here, but profession EXP gain and rank-up stay out of scope (Phase 27.5).
- **Workplaces are references only.** `workplaceIds` are stable string references resolved and
  validated in Phase 27.2; the validator only *warns* about unregistered workplaces so profession
  configuration can precede world content.
- **Assignment history is a placeholder.** `ProfessionAssignmentRecord[]` exists on each career
  record (empty for now) so assignments (Phase 27.3+) persist without a schema change.
- **No second question/reward/mastery/currency/save system.** The phase integrates with existing
  systems only, as required.

### 5. Verification & Test Results

Per the handbook, tests cover profession definitions and validation, enrollment, multiple
professions per player, duplicate enrollment prevention, requirement validation, invalid/missing
definitions, backward-compatible save loading, and career data persistence.

- **Automated Tests (`npm test`)**: **72 test files passed (875 passed, 0 failures)**. The new
  `tests/professions/phase27_1_professions.test.ts` contributes **36 tests**.
- **TypeScript Check (`npx tsc --noEmit`)**: **0 errors**.
- **Production Build (`npm run build`)**: **Succeeded** (`tsc && vite build`).

*Starting point for this phase was 71 files / 839 tests; the phase adds 1 file / 36 tests.*

### 6. Follow-ups / Notes for Later Sub-phases

- The Phase 27 track was redefined by the master plan. Earlier deliverables now sit under the old
  numbering in `docs/IMPLEMENTATION_REPORTS.md`: **Phase 27.1 — Economy Balance**
  (`docs/PHASE_27_1_ECONOMY_REPORT.md`) and **Phase 27.2 — Gathering Professions**
  (`docs/PHASE_27_2_IMPLEMENTATION_REPORT.md`). These remain valid delivered work and were preserved.
- **Report-name collision to resolve:** the upcoming **new** Phase 27.2 (workplace/facility/world
  integration) would create `docs/PHASE_27_2_IMPLEMENTATION_REPORT.md`, which already belongs to the
  gathering report. Recommend renaming the gathering report (e.g.
  `PHASE_27_2_GATHERING_IMPLEMENTATION_REPORT.md`) before Phase 27.2 begins.
- Gathering/crafting/economy concepts are preserved as future systems and were not modified here.
