# Phase 26.8 Implementation Report — Story, NPCs, Side Quests, and Achievements

**Date**: 2026-11-08  
**Phase**: 26.8 (Handbook Section: Story & Content Systems)  
**Status**: Completed

---

### 1. Executive Summary

Phase 26.8 delivers a **maintainable content layer for story and optional objectives**, built on the existing quest/NPC systems rather than replacing them. Per the handbook, it:

- **Inspects the current dialogue and quest systems** — the quest registry/manager (`src/quests/`), the NPC registry, and the `NPCDialogueModal` overlay were reviewed first.
- **Supports main story quest chains** — a new optional `category` / `chainId` / `orderInChain` on `QuestDefinition`, plus `getQuestChain` / `getChainIds` helpers and a chain-progress view.
- **Supports side quests** — the same `category` field distinguishes optional content; existing quests need no changes (the field defaults to side semantics when omitted).
- **Supports NPC dialogue states** — a new headless `resolveNpcDialogue` resolver selects the right lines for the current state (available / in-progress / turn-in) and falls back to default lines.
- **Supports prerequisites** — already enforced by `QuestManager.canAcceptQuest`; this phase adds coverage and a chain-history view on top.
- **Supports objective tracking and rewards** — reused unchanged from the existing quest manager.
- **Adds achievements/milestones** — a new headless `src/achievements/` module driven by a small, stable event model (monster defeats, quest completions, level milestones), with idempotent unlock tracking.

Per the handbook's instruction to **not write large amounts of narrative content**, only a **small, clearly labelled sample** is included: one three-chapter main-story chain ("The Archivist's Path"), one side quest, and one quest-giver NPC. All values are provisional and live entirely in data.

Two fixes to the existing system were required to make chain/dialogue conditions work correctly:

1. `QuestManager.getNpcQuestStatus` previously used a **hardcoded** two-quest list, so every NPC added after the tutorial (Ironhold, Capital, Arcane City, Forgotten Lands, Colosseum) reported `none`. It now derives an NPC's quests from the full registry via `getQuestsForNpc`.
2. Dialogue-state selection lived inside the DOM `NPCDialogueModal`; it is now a headless resolver the modal consumes, so dialogue conditions are testable without a DOM.

### 2. Files Created and Modified

- **New Files**:
  - `src/quests/DialogueResolver.ts`: headless `resolveNpcDialogue` + `NpcDialogueResolution`.
  - `src/achievements/AchievementTypes.ts`: categories, the `AchievementEvent` model, rule/definition/progress/snapshot types.
  - `src/achievements/AchievementRegistry.ts`: `ACHIEVEMENT_REGISTRY` (six provisional milestones) + `ACHIEVEMENT_DEFINITIONS` and `getAchievementById`.
  - `src/achievements/AchievementTracker.ts`: idempotent, headless tracker with snapshot/restore and unlock listeners.
  - `src/achievements/index.ts`: barrel export.
  - `tests/quests/phase26_8_story_quests.test.ts`: 23 tests.
  - `tests/achievements/phase26_8_achievements.test.ts`: 17 tests.
  - `docs/PHASE_26_8_IMPLEMENTATION_REPORT.md`: This report.
- **Modified Files**:
  - `src/quests/QuestTypes.ts`: added `QuestCategory`, `NpcQuestStatus`, `QuestChainProgress`, and optional chain metadata on `QuestDefinition`.
  - `src/quests/QuestRegistry.ts`: added the sample main-story chain + side quest, plus `getQuestsForNpc`, `getQuestChain`, `getChainIds`.
  - `src/quests/QuestManager.ts`: added `resolveNpcQuest` and `getChainProgress`; `getNpcQuestStatus` now delegates to `resolveNpcQuest` (registry-derived).
  - `src/quests/NPCRegistry.ts`: added `chronicler-selene` (quest giver for the chain); gave `scholar-lyra` the side quest as a second offer.
  - `src/quests/index.ts`: re-exports `DialogueResolver`.
  - `src/ui/npc-dialogue/NPCDialogueModal.ts`: consumes `resolveNpcDialogue` instead of inlining state logic.
  - `docs/IMPLEMENTATION_REPORTS.md`: consolidated tracker updated with Phase 26.8.

### 3. Content Sample (provisional, data-only)

**Main story chain** — `chain-archivists-path`, giver `chronicler-selene` (Beginners Village):

| Order | Quest ID | Objective | Requirements | Rewards |
| --- | --- | --- | --- | --- |
| 1 | `quest-archivist-1-first-page` | Defeat 2 Math Slimes | Level 1 | 40 EXP, 30 gold, 2× Minor Health Potion |
| 2 | `quest-archivist-2-lost-formula` | Collect 1 Slime Gel | Level 3, after Chapter I | 80 EXP, 55 gold, 30 Mathematics mastery EXP |
| 3 | `quest-archivist-3-final-proof` | Defeat 4 Number Goblins | Level 5, after Chapter II | 150 EXP, 120 gold, Copper Ring, 60 Mathematics mastery EXP |

**Side quest** — `quest-side-lost-chalk`, giver `scholar-lyra`: defeat 3 Fraction Bats → 60 EXP, 45 gold, 2× Minor Mana Potion.

**Achievements** — `ACHIEVEMENT_REGISTRY` (all provisional): First Blood, Seasoned Slayer (25 kills), Grand Champion (`grand-champion-ragnar`), Questing Begins (first quest), The Archivist's Path (finish the chain), Apprentice Scholar (reach level 10).

The event model is intentionally small and stable: `MonsterDefeated`, `QuestCompleted`, `LevelReached`. Rules support `count` (accumulate) or `max` (threshold) aggregation and optional `targetId` restriction.

### 4. Verification & Test Results

Per the handbook, the phase tests **prerequisite chains, dialogue conditions, quest rewards, and achievement idempotency**:

- **Prerequisite chains** — a chained quest is blocked until its prerequisite is completed; level gates are enforced; completing Chapter I unlocks Chapter II; later chapters cannot be accepted out of order; `getChainProgress` reports next quest, acceptability, reasons, and completion counts (0/3 → 3/3, `nextQuestId` becomes `null`).
- **Dialogue conditions** — the resolver returns the correct state and lines for available / in-progress / turn-in, advances to the next chapter after a completion, returns `none` with default lines for a quest-less NPC, and falls back to default lines when a state has no bespoke text. The registry-derived status also works for NPCs beyond the original tutorial pair.
- **Quest rewards** — kill and collect objectives advance correctly; completion grants the configured combat EXP, gold, items, and mastery EXP; turn-in items are deducted.
- **Achievement idempotency** — targeted milestones unlock only for the matching target; count and max-threshold rules behave correctly; multi-rule achievements require all rules; a replayed `eventId` neither inflates counters nor re-unlocks; the unlock listener fires once; snapshot/restore preserves unlocked state, counters, and the dedup window.

**Results:**
- **Automated Tests (`npm test`)**: 70 test files passed (**815 passed, 0 failures**). The two new suites contribute 40 tests (23 + 17).
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

### 5. Scope Notes

- **Content stays in data** — quests, dialogue, and achievements are registry data; the logic never needs to change to add content.
- **Backward compatible** — `category` is optional; existing quests, saves, and tests are unaffected.
- **No new subjects / combat rules** — the sample reuses existing monsters, items, and the existing reward paths.
- **Small, labelled sample only** — no large narrative was written, per the handbook.
- **Existing bug fixed, not worked around** — NPC quest status now derives from the registry rather than a hardcoded list.
- **Achievements are pure milestones** — no reward-granting side effects are wired, avoiding duplicate-reward risk; only unlock state is tracked.

### 6. Required Assets (placeholders in use)

| Asset | Currently | Needed |
| --- | --- | --- |
| `chronicler-selene` NPC | Coloured circle | NPC sprite |
| Achievement popup / toast | None (headless only) | UI chrome + icon art |
| Achievement badges in journal | None | Icon set |
| Quest category labels in journal | None | UI label styling |

### 7. Backlog Surfaced (not blocking)

- **Persistence** — quests already persist in `SaveData`; achievement progress exposes `snapshot()`/`loadSnapshot()` but wiring it into `SaveData` (and an optional `achievements?` field) is deferred, consistent with the region-discovery and challenge-progress decisions.
- **Event wiring** — the tracker is headless; feeding it from the live monster-defeat/quest-complete/level-up paths (and surfacing popups) is a UI/integration step deferred to a later phase.
- **Quest journal UI** — distinguishing Main Story vs Side quests in the journal is deferred; the classification data is already available.

Phase complete. Stopping here as required; no subsequent phase was started.
