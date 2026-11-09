# Phase 27.4 — Profession Question Integration

**Date**: 2026-11-09
**Phase**: 27.4 (Handbook Section: Phase 27 — Real-World Professions and Careers)
**Status**: Completed

## 1. Executive Summary

Phase 27.4 connects the professional assignment framework (Phase 27.3) to the **existing**
question management and retrieval system. It deliberately introduces **no new question engine**:
instead it adds a headless bridge, `AssignmentQuestionResolver`, that

- builds filter criteria for the existing `QuestionRepository`;
- prioritises **profession relevance** using two new, backward-compatible optional question
  fields (`professionTags`, `specialtyTags`);
- respects the shared **educational-tier** configuration and the existing **difficulty** system;
- applies a **configurable, multi-level fallback** strategy that widens scope step by step and
  **reports** what it did instead of silently returning unrelated questions; and
- surfaces **missing-coverage** information so content gaps can be identified.

Question *selection* is kept strictly separate from answer *evaluation*: the resolver returns
`Question[]` only, and answers continue to flow through the existing `AnswerEvaluator` and mastery
reward pathways unchanged. The selection flow follows the plan exactly:

> identify profession → assignment → required subjects/topics → educational tier → difficulty →
> retrieve from the existing repository → prioritise profession relevance → return to the
> assignment system.

Everything added lives in `src/professions/` (headless, no Phaser/DOM imports) and augments the
existing question modules rather than replacing them.

## 2. Files Created and Modified

- **New Files**:
  - `src/professions/AssignmentQuestionResolver.ts`: the headless bridge. Exposes
    `AssignmentQuestionResolver` (`resolve`, `assessCoverage`), the `getStageQuestionRequirement`
    helper, the `AssignmentQuestionRequest`/`AssignmentQuestionResult`/`AssignmentQuestionCoverage`
    and `AssignmentFallbackEvent` types, and the configurable
    `AssignmentFallbackStrategy` (`DEFAULT_ASSIGNMENT_FALLBACK_STRATEGY`).
  - `src/professions/ProfessionQuestionSamples.ts`: clearly-labelled **sample** profession question
    mappings for the three fully-defined seed professions (Doctor, Electrical Engineer, Architect),
    plus untagged counterparts. Exports `PROFESSION_QUESTION_SAMPLES` and
    `getProfessionQuestionSamples()`. Intentionally **not** merged into the bundled bank.
  - `tests/professions/phase27_4_question_integration.test.ts` (28 tests).
  - `docs/PHASE_27_4_IMPLEMENTATION_REPORT.md`: this standalone phase report.
- **Modified Files**:
  - `src/core/types/question.ts`: added optional `professionTags?: string[]` and
    `specialtyTags?: string[]` to `Question` (backward-compatible; both optional).
  - `src/questions/retrieval/QuestionRepository.ts`: added optional `professionTags`/`specialtyTags`
    to `QuestionFilterCriteria` and OR-logic filtering for them. Legacy callers that pass no tag
    filter see identical behaviour.
  - `src/questions/management/QuestionValidator.ts`: validated the two new optional fields (array of
    non-empty strings) while keeping them optional.
  - `src/professions/index.ts`: barrel exports for the resolver and the sample module.
  - `docs/IMPLEMENTATION_REPORTS.md`: consolidated master tracker updated with Phase 27.4.
  - `docs/DEVELOPMENT_ROADMAP.md`: Phase 27.4 marked complete.

## 3. Design Notes

### 3.1 Metadata extension (backward-compatible)
Two optional tag arrays were added to `Question`. Existing questions omit them and continue to pass
validation and filtering unchanged. The repository only applies a tag filter when the caller supplies
one (OR-match across the supplied tags). The bundled question bank is left untouched — it carries no
profession tags — which the tests assert explicitly to prove backward compatibility.

### 3.2 Selection flow & prioritisation
`resolve(request)` reads the assignment's `professionId`, `requiredSubjects`,
`requiredQuestionTopics`, `difficulty`, and `educationalTier`. It resolves the profession's
`questionTags` (and an optional `specialtyId` hint) and draws from the repository, scoring
profession/specialty-tagged questions ahead of untagged ones. `professionPrioritized` on the result
is `true` when at least one served question carried a profession or specialty tag.

### 3.3 Educational-tier compatibility
`effectiveTierFor()` clamps the assignment's requested tier to the player's current tier plus a
configurable ceiling (`maxTierOverPlayer`, default `0`), using the shared
`DEFAULT_EDUCATIONAL_TIER_CONFIG`. As a result an advanced-tier assignment never serves advanced
questions to a beginner player, satisfying the handbook requirement — while still allowing a
configured ceiling (e.g. `maxTierOverPlayer: 2`) to relax the guard where desired.

### 3.4 Difficulty handling
The assignment `difficulty` is clamped to the shared 1–5 range (`clampDifficulty`). The resolver
first attempts an exact difficulty match; only when short does it relax difficulty *within the same
tier* (when `relaxDifficulty` is enabled), recording an `AssignmentFallbackEvent`.

### 3.5 Configurable multi-level fallback
Escalation order:

1. Exact tier + difficulty + topic, **profession-tagged first**.
2. Exact tier + difficulty + topic, any question.
3. Relax difficulty within the tier (`relaxDifficulty`).
4. Widen beyond the required topics to the whole subject set (`relaxTopics`).
5. Emergency: any question in the subjects regardless of tier, **only** when
   `allowSubjectEmergency` is explicitly enabled (default `false`).

Every relaxation is recorded as an `AssignmentFallbackEvent` (mirroring the existing PvE
`DifficultyFallbackEvent` pattern). When emergency is disabled and no in-scope question exists, the
resolver returns an empty result with `missingCoverage: true` rather than serving an unrelated
question.

### 3.6 Missing-coverage reporting
`assessCoverage(assignmentId, specialtyId?)` reports `professionTaggedMatches`,
`subjectTopicMatches`, and `hasProfessionCoverage` without selecting questions.
`AssignmentQuestionResult` carries `coverage`, `missingCoverage`, and a human-readable `message`
that notes shortfalls and the absence of profession-tagged content.

### 3.7 Separation from evaluation
The resolver returns questions only. It does not evaluate answers or grant mastery — those continue
to use the existing `AnswerEvaluator`/mastery services. The `getStageQuestionRequirement(def,
stageIndex)` helper sums a stage's `AnswerQuestions` objectives so the assignment system can ask for
the right number of questions before calling `resolve`.

## 4. Sample Content

`PROFESSION_QUESTION_SAMPLES` provides a small, clearly-labelled set (10 questions) covering the
three seed professions, each with untagged counterparts to exercise fallback:

| Question id | Subject | Topic | Tier | Difficulty | Tags |
| --- | --- | --- | --- | --- | --- |
| `sample-doctor-medicine-01` | Science | medicine | Elementary | 1 | profession: medicine, diagnosis |
| `sample-doctor-anatomy-01` | Science | anatomy | Elementary | 1 | profession: anatomy; specialty: cardiology |
| `sample-doctor-diagnosis-jh-01` | Science | diagnosis | Junior High | 3 | profession: diagnosis, medicine |
| `sample-decoy-science-01` | Science | medicine | Elementary | 1 | (none) |
| `sample-engineer-circuits-01` | Physics | circuits | Elementary | 1 | profession: circuits |
| `sample-engineer-power-jh-01` | Physics | power-systems | Junior High | 3 | profession: power-systems |
| `sample-decoy-physics-01` | Physics | circuits | Elementary | 1 | (none) |
| `sample-architect-design-01` | Mathematics | design | Elementary | 1 | profession: design |
| `sample-architect-structures-jh-01` | Mathematics | structures | Junior High | 3 | profession: structures |
| `sample-decoy-math-01` | Mathematics | design | Elementary | 1 | (none) |

These records are **not** merged into the shipped bundled bank (`loadBundledQuestions()`), so
existing content, coverage checks, and `skippedCount === 0` assertions remain unaffected. Consumers
load them explicitly and add them to a `QuestionRepository`.

## 5. Verification & Test Results

Coverage: metadata backward compatibility (legacy questions validate; new fields validate;
malformed tags rejected), repository tag filtering (legacy filters unchanged; OR-logic tag filter),
the labelled sample set, profession-specific selection (prioritisation, fill with untagged, specialty
hint), subject/topic scoping, educational-tier compatibility (no advanced questions to beginners;
served once the player reaches the tier; configurable ceiling), difficulty handling (exact match;
relax-within-tier), fallback behaviour (widen topics; no silent out-of-scope when emergency disabled;
emergency only when enabled), missing-coverage reporting (unknown assignment, shortfall, no-tag
coverage, message), backward compatibility with the bundled bank, PvE retrieval regression
(`DifficultyEngine.resolveQuestionsWithFallback` and existing repository filters), and the
`getStageQuestionRequirement` bridge.

- **Automated Tests (`npm test`)**: 75 test files passed (981 passed, 0 failures). The new
  integration suite contributes 28 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).
