# Phase 26.7 Implementation Report — Colosseum

**Date**: 2026-11-08  
**Phase**: 26.7 (Handbook Section: World and Content Expansion)  
**Status**: Completed

---

### 1. Executive Summary

Phase 26.7 implements the **Colosseum** as a **single-player PvE challenge/arena environment**, kept fully separate from the existing player-vs-player duel code (`ArenaDuelSession`, `ArenaRivals`, `PvPDifficultyEngine`). Per the handbook, this phase:

- **Inspects and reuses the existing arena code** — the new module lives alongside, not on top of, the PvP duel system and does not modify any PvP logic.
- **Keeps PvE challenge modes separate from future online PvP** — the challenge module is a distinct subtree (`src/arena/challenge/`) re-exported under a clearly labelled barrel comment.
- **Implements configurable modes** — Consecutive Monsters, Boss Challenge, Educational Subject Challenge, and Time/Score Attack all ship as data-driven challenge definitions.
- **Does not implement matchmaking or network play** — there are no network calls, no opponent pairing, and no remote state.

The Colosseum is modelled as a headless, data-driven layer (types, progress tracker, registry, session) plus world wiring (one `ZoneType.Arena` map, a region link, and an Arena Master NPC) and one new boss (`grand-champion-ragnar`) registered in the **existing** `ELITE_BOSS_REGISTRY`. No new combat rules, no scene duplication, and no invented art assets were introduced.

**Reward idempotency** is enforced at two independent levels:

1. **Session level** — `ChallengeArenaSession.claimRewards()` returns the reward bundle exactly once; repeated calls return `null`. Reading `getRewards()` is side-effect free and returns the same cached object.
2. **Profile level** — a `ChallengeProgressTracker` records first-clear ids via `markCleared(id)`, which returns `true` only the first time. The one-time first-clear bonus is applied **only** on that first clear, so repeated entries never re-grant it.

**Deterministic timing** — the Time/Score Attack mode reads time through an injectable `ChallengeClock` (`now()`), so timeouts and elapsed scoring are fully testable without real wall-clock waits.

### 2. Files Created and Modified

- **New Files**:
  - `src/arena/challenge/ChallengeTypes.ts`: `ChallengeMode` and `ChallengeStatus` enums plus `ChallengeStage`, `ChallengeRewardItem`, `ChallengeRewardConfig`, `ChallengeDefinition`, `ChallengeRewardResult`, and `ChallengeProgress` interfaces.
  - `src/arena/challenge/ChallengeProgressTracker.ts`: `ChallengeProgressSnapshot` and the `ChallengeProgressTracker` class (`isCleared`, `markCleared`, `getClearedIds`, `getClearedCount`, `loadSnapshot`, `snapshot`) for first-clear idempotency.
  - `src/arena/challenge/ChallengeRegistry.ts`: `CHALLENGE_REGISTRY` (four provisional, repeatable challenges) plus `CHALLENGE_DEFINITIONS`, `getChallengeById`, `getChallengesForMode`, and `getChallengesForSubject`.
  - `src/arena/challenge/ChallengeArenaSession.ts`: `resolveChallengeOpponent`, the injectable `ChallengeClock`, `ChallengeArenaOptions`, and the `ChallengeArenaSession` class (progression, defeat, time-attack scoring, progress view, once-only rewards).
  - `src/arena/challenge/index.ts`: barrel export for the challenge module.
  - `tests/arena/phase26_7_colosseum_challenge.test.ts`: 31 tests.
  - `docs/PHASE_26_7_IMPLEMENTATION_REPORT.md`: This report.
- **Modified Files**:
  - `src/arena/index.ts`: added `export * from './challenge';` under a labelled "separate from PvP" comment.
  - `src/monsters/EliteBossRegistry.ts`: added `grand-champion-ragnar` (Level 70, `MonsterCategory.Boss`, Mathematics, two phases incl. a 50% enrage, `firstClearBonus`, and a 10-minute respawn cooldown).
  - `src/world/maps.ts`: added `MapIds.ColosseumGrounds`, `COLOSSEUM_BOUNDS` / `COLOSSEUM_LEVELS`, the `COLOSSEUM_GROUNDS` map (`ZoneType.Arena`, `connections: []`), `COLOSSEUM_MAPS`, and the registry entry.
  - `src/world/regions.ts`: linked the Colosseum map to the Colosseum region's `mapIds` (`COLOSSEUM_MAPS.map((map) => map.id)`).
  - `src/world/index.ts`: barrel exports for `COLOSSEUM_GROUNDS` / `COLOSSEUM_MAPS`.
  - `src/quests/NPCRegistry.ts`: added `grand-arbiter-theron` (`NPCType.ArenaMaster`) on `colosseum-grounds`.
  - `docs/IMPLEMENTATION_REPORTS.md`: consolidated tracker updated with Phase 26.7.

### 3. Colosseum Challenge Content Package

**Challenge catalog** (`CHALLENGE_REGISTRY`, all provisional, all repeatable, all `recommendedMinLevel: 60`):

| Challenge ID | Name | Mode | Stages | Special config |
| --- | --- | --- | --- | --- |
| `challenge-trial-of-endurance` | Trial of Endurance | Consecutive Monsters | Ash Stalker → Blight Horror → Ruin Colossus | — |
| `challenge-champion-duel` | Champion Duel | Boss Challenge | Grand Champion Ragnar | Single boss bout |
| `challenge-scholastic-trial` | Scholastic Trial of Numbers | Subject Challenge | Crumbling Sentry → Fractured Golem → Fallen Warden | `subject: Mathematics` |
| `challenge-quick-wits` | Quick Wits | Time Attack | Blight Horror → Fractured Golem → Ruin Colossus → Fallen Warden | `timeLimitSeconds: 120`, `scorePerStage: 100` |

**Rewards** are fully data-driven per challenge (`expPerStage`, `goldPerStage`, `completionBonusExp`, `completionBonusGold`, optional `completionItems`, and an optional one-time `firstClearBonus`). Example — `challenge-trial-of-endurance`: 200 EXP + 90 gold per stage, 500 EXP + 300 gold completion bonus, 3× Minor Health Potion, first-clear `{ gold: 250, exp: 400, itemId: 'rare-crystal' }`.

**Opponents** reuse existing monster ids only. The three Forgotten Lands beasts (`ash-stalker`, `blight-horror`, `ruin-colossus`) and Mathematics counterparts (`crumbling-sentry`, `fractured-golem`, `fallen-warden`) come from the existing `MONSTER_REGISTRY`; the new `grand-champion-ragnar` is registered in the existing `ELITE_BOSS_REGISTRY`. `resolveChallengeOpponent(monsterId)` resolves either registry, so no combat logic is duplicated.

**World wiring**:

| Element | Value |
| --- | --- |
| Map ID | `colosseum-grounds` (`MapIds.ColosseumGrounds`) |
| Type | `ZoneType.Arena` |
| Bounds | 1200 × 900 |
| Connections | none (challenges entered via the challenge system, not by zoning) |
| Recommended levels | 60–70 (advisory) |
| Collision rects | three (300,250 / 720,250 / 480,560) |
| NPC | `grand-arbiter-theron` (`ArenaMaster`) at `{x:600, y:450}` |
| Region link | Colosseum region `mapIds` = `COLOSSEUM_MAPS.map(m => m.id)` |

### 4. Verification & Test Results

Per the handbook, the phase verifies **challenge progression, defeat, rewards, repeated entry, and reward idempotency**, plus configuration integrity, time-attack behaviour, and world wiring:

- **Configuration** — the catalog has unique ids; every mode has ≥1 challenge; all are provisional; every stage opponent resolves to a real monster or elite/boss encounter; stage numbers ascend; subject challenges carry exactly one subject; time-attack challenges declare a positive limit; the boss challenge points at a registered boss; `getChallengesForSubject` filters correctly; unknown ids resolve to `undefined`.
- **Progression** — `start()` is a no-op after the first call; a session advances through every stage; completion does not advance past the final stage; `getProgress()` and `getCurrentOpponent()` reflect the live stage.
- **Defeat** — a failed stage yields no rewards; a defeat after the challenge is over is ignored; a defeated session can be re-entered.
- **Rewards & idempotency** — first-clear math is exact; repeated `getRewards()` reads return the same object; `claimRewards()` succeeds once and then returns `null`; the first-clear bonus is granted only once across repeated entries; the tracker's `markCleared()` / `snapshot()` round-trip preserves cleared state.
- **Time attack** — completing all stages within the limit succeeds and scores `cleared × scorePerStage`; advancing past the limit fails the stage (defeat).
- **World wiring** — the Colosseum region `mapIds` includes `colosseum-grounds`; the map is a 1200×900 `ZoneType.Arena` map at recommended min level 60 with no connections; `validateMapGraph` and `validateRegionGraph` both pass; the Arena Master NPC is present.

**Results:**
- **Automated Tests (`npm test`)**: 68 test files passed (**775 passed, 0 failures**). New `phase26_7_colosseum_challenge.test.ts` contributes 31 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

### 5. Scope Notes

- **PvE is separate from PvP** — the new `src/arena/challenge/` module does not touch `ArenaDuelSession`, `ArenaRivals`, or `PvPDifficultyEngine`; the two systems share only the arena folder and a labelled barrel export.
- **No matchmaking or network play** — none is implemented, per the handbook.
- **No new combat rules** — challenges reuse existing monster/boss definitions and the existing reward pipeline; only data and a headless session were added.
- **No scene duplication** — the Colosseum is a data-driven map definition; no Phaser scene was forked.
- **No invented art** — no assets were fabricated; required placeholders are listed below.
- **Values are provisional** — every challenge id, stage, and reward figure is draft and can be tuned in `CHALLENGE_REGISTRY` without code changes.
- **No new subjects** — only the existing `SubjectId.Mathematics` is used; the taxonomy is unchanged.

### 6. Required Assets (placeholders in use)

| Asset | Currently | Needed |
| --- | --- | --- |
| Colosseum grounds | Flat tint + grid | Arena tileset (sand, walls, seating) |
| Arena obstacles | Grey rounded rects | Pillars / statues sprites |
| Grand Champion Ragnar | Coloured circle | Animated boss sprite (+ phase visual) |
| `grand-arbiter-theron` | Coloured circle | NPC sprite |
| Challenge UI (stage/score/timer) | Headless only | Modal / HUD chrome |
| Colosseum BGM | Reused `bgm-wilderness` | Dedicated arena track |

### 7. Backlog Surfaced (not blocking)

- **Challenge UI** — this phase delivers the headless logic and data only; a Phaser challenge-selection modal and in-arena stage/score/timer HUD are deferred to a later UI phase.
- **Progress persistence** — the `ChallengeProgressTracker` supports snapshot/restore, but wiring the snapshot into `SaveData` is deferred (consistent with the region-discovery decision to avoid a save-schema change this phase).
- **Senior High content** — as in Phase 26.6, some Colosseum opponents sit at Level 55–60 and may resolve into the Senior High tier, which still relies on the existing `resolveQuestionsWithFallback` protections.

Phase complete. Stopping here as required; no subsequent phase was started.
