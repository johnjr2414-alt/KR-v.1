# Phase 27.2 Implementation Report — Workplace, Facility, and World Integration

**Date**: 2026-11-09  
**Phase**: 27.2 (Handbook Section: Phase 27 — Real-World Professions and Careers)  
**Status**: Completed  
**Scope**: Headless `src/professions/` workplace domain (workplace + facility definitions, access
validation, profession associations, world-location resolution), world integration (Career Center
landmark + Career Advisor NPC), session wiring, tests, and documentation. No profession-assignment
or UI work this phase.

> Note on numbering: the Phase 27 track was redefined by the Phase 27 Master Implementation Plan
> into a seven-sub-phase "Real-World Professions and Careers" track. The earlier gathering work
> originally filed as `PHASE_27_2_IMPLEMENTATION_REPORT.md` was renamed to
> `PHASE_27_2_GATHERING_IMPLEMENTATION_REPORT.md`; this report takes the canonical name.

---

### 1. Executive Summary

Phase 27.2 turns the profession framework from Phase 27.1 into **places** the player can visit. It
introduces a configurable, headless **workplace** layer and integrates it with the existing world
without duplicating any world/building/NPC definitions. Per the master plan, the phase:

- **Inspects first** — reviewed the world layer (`BuildingDefinition`, `buildings`, `MapDefinition`,
  `RegionDefinition`, `BEGINNERS_VILLAGE` landmarks), the NPC registry/types
  (`quests/NPCRegistry`, `quests/NPCTypes`, `DialogueResolver`), the interaction guard
  (`scenes/interactions/InteractionGuard`), and the session (`PlayerSessionManager`, `CareerService`)
  **before** writing code.
- **Adds workplace definitions** — a data-driven `WorkplaceDefinition` catalogue (Career Center,
  Hospital, Engineering Center, Architecture Studio, Academy, Courthouse) where facilities,
  interaction points, NPC associations, world locations, entry gates, and per-facility access rules
  are all configuration. New workplaces are added purely through data.
- **Supports multiple professions per workplace** — the Hospital hosts Doctor and Nurse; the
  Engineering Center hosts Electrical and Civil Engineers. A workplace may also host no professions
  (Career Center, Academy are general-purpose).
- **Adds facility access rules** — a player may enter a workplace without access to every facility
  inside it. Facilities unlock by character level, profession enrollment, profession level, rank,
  quest completion, or subject mastery (all optional and composable).
- **Adds a headless access service** — `WorkplaceService` resolves workplaces (and their world
  locations), exposes profession associations, and returns non-mutating entry/facility access
  checks with a per-requirement breakdown, machine-readable failure reasons, and player-facing
  messages.
- **Adds validation** — `WorkplaceValidator` checks the catalogue (duplicate ids, unknown profession
  refs, unresolvable profession gates) and cross-validates profession ↔ workplace associations for
  symmetry.
- **Integrates with the world** — a new **Career Center** landmark in the Beginners Village and an
  interactive **Career Advisor Marisol** NPC (per the plan's requirement for at least one NPC that
  introduces available professions and the enrollment system). Workplaces reference existing
  buildings/landmarks via `worldLocation` (e.g. the Academy reuses the General Knowledge Library
  building) rather than duplicating them.
- **Persists nothing new** — workplace access is derived from existing authoritative state
  (character level, careers, mastery, quests); no `SaveData` change was required.

All rules are headless and data-driven; no Phaser/DOM dependency was introduced. All balance values
are **provisional** (`provisional: true`).

### 2. Files Created and Modified

- **New Files**:
  - `src/professions/WorkplaceTypes.ts`: workplace, facility, interaction-point, world-location,
    access-requirement, and access-context/result types; `WorkplaceAccessFailureReason` enum.
  - `src/professions/WorkplaceRegistry.ts`: `WorkplaceIds`, `WORKPLACE_DEFINITIONS` (6 workplaces),
    `WORKPLACE_REGISTRY`, and lookups (`getWorkplace`, `getWorkplaces`, `getWorkplacesForProfession`,
    `getProfessionsForWorkplace`, `getWorkplaceFacilities`, `getWorkplaceFacility`,
    `getIntegratedWorkplaces`).
  - `src/professions/WorkplaceService.ts`: headless `WorkplaceService` (catalogue access, world
    resolution, `checkWorkplaceAccess`, `checkFacilityAccess`, `resolveFacilities`,
    `getAccessibleFacilities`) + default `workplaceService`.
  - `src/professions/WorkplaceValidator.ts`: `validateWorkplaceCatalogue` and
    `validateWorkplaceProfessionAssociations` (severity-tagged issues).
  - `tests/professions/phase27_2_workplaces.test.ts` (34 tests).
  - `docs/PHASE_27_2_IMPLEMENTATION_REPORT.md`: This report.
- **Modified Files**:
  - `src/professions/index.ts`: barrel exports for the workplace domain.
  - `src/world/maps.ts`: added the `career-center` landmark to `BEGINNERS_VILLAGE`.
  - `src/quests/NPCTypes.ts`: added `NPCType.CareerAdvisor`.
  - `src/quests/NPCRegistry.ts`: added the `career-advisor-marisol` NPC (profession/enrollment
    introduction).
  - `src/player/PlayerSessionManager.ts`: added `buildWorkplaceContext()` assembling character
    level, per-profession state (level + resolved rank), mastery, and quest completion.
  - `docs/PHASE_27_2_GATHERING_IMPLEMENTATION_REPORT.md`: renamed from
    `PHASE_27_2_IMPLEMENTATION_REPORT.md` (old numbering) with a numbering note.
  - `docs/IMPLEMENTATION_REPORTS.md`: consolidated master tracker updated with Phase 27.2.

### 3. Workplace Catalogue (provisional, data-only)

| Workplace id | Professions | Entry gate | Notable facility gates |
| --- | --- | --- | --- |
| `career-center` | *(none — hub)* | open | Enrollment Desk: character level 5 |
| `hospital` | doctor, nurse | open | Examination Room: enrolled; Laboratory: enrolled + profession level 3 + character level 8; Medical Office: doctor rank `general-practitioner` |
| `engineering-center` | electrical-engineer, civil-engineer | open | Electronics Laboratory: electrical-engineer; Project Office: profession level 6 (any associated profession) |
| `architecture-studio` | architect | open | Project Room: architect + profession level 6 + quest `quest-archivist-3-final-proof` |
| `academy` | *(none — general)* | character level 5 | Faculty Office: character level 10; Research Room: character level 15 + Science mastery 3 |
| `courthouse` | lawyer | open | Records Room: lawyer + profession level 3; Chambers: lawyer + profession level 6 |

**World integration**: `career-center` → beginners-village landmark `career-center`;
`academy` → beginners-village landmark `library`, building `general-knowledge-library`. The Hospital,
Engineering Center, Architecture Studio, and Courthouse carry no `worldLocation` yet and attach to
world content as their regions are built in later phases.

### 4. Design Notes & Deliberate Boundaries

- **A separate workplace registry, not a `BuildingDefinition` change.** Workplaces are their own
  data-driven catalogue and reference existing world content via `worldLocation`; nothing in the
  world/building system was reshaped, and there is no duplicate building registry.
- **Profession gates resolve against a candidate set.** An explicit `professionIds` gate is evaluated
  against those professions; a gate with only `minProfessionLevel`/`requiredRankIds` is evaluated
  against the **owning workplace's** associated professions (see the Engineering Center's Project
  Office). "Any candidate satisfies" semantics keep multi-profession workplaces coherent.
- **Non-mutating and total.** `WorkplaceService` never throws and never mutates state. Unknown
  workplaces/facilities produce failed checks with explanatory messages
  (`UnknownWorkplace` / `UnknownFacility`).
- **Per-requirement breakdown.** Every check returns `requirements[]` (label / satisfied / detail)
  plus machine-readable `reasons[]`, so a future UI can render exactly what is missing.
- **No new persistence.** Workplace access is derived from authoritative runtime state; the save
  schema was untouched.
- **No UI beyond an introducing NPC.** Per scope, on-screen workplace/facility panels are deferred.
  The Career Advisor NPC plus the `message`/`requirements` contract are the integration surface a
  later UI/scene consumes.
- **Warnings for forward references.** Validation reports unknown NPC/map/landmark/building/quest ids
  and unresolvable profession gates; world/NPC references that legitimate future content will add are
  warnings where appropriate.

### 5. Verification & Test Results

Verified workplace definitions, profession associations, multiple professions sharing a workplace,
entry requirements, facility access, rank-based unlocking, facility resolution, invalid references,
and catalogue validity (including the shipped catalogue validating with zero issues and symmetric
profession ↔ workplace associations).

- **Automated Tests (`npm test`)**: **73 test files passed (909 passed, 0 failures)**. The new
  `tests/professions/phase27_2_workplaces.test.ts` contributes **34 tests**.
- **TypeScript Check (`npx tsc --noEmit`)**: **0 errors**.
- **Production Build (`npm run build`)**: **Succeeded** (`tsc && vite build`).

*Starting point for this phase was 72 files / 875 tests; the phase adds 1 file / 34 tests.*
