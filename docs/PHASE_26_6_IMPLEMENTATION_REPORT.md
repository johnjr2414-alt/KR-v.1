# Phase 26.6 Implementation Report — Forgotten Lands

**Date**: 2026-11-08  
**Phase**: 26.6 (Handbook Section: World and Content Expansion)  
**Status**: Completed

---

### 1. Executive Summary

Phase 26.6 implements the **Forgotten Lands** as a data-driven region **using the reusable region architecture established in Phase 26.2 and reused in Phases 26.3–26.5** — no new combat rules, no scene duplication, and no hardcoded navigation.

Per the handbook, the region is a "challenging region with configurable high-level encounters" that **uses the existing higher-level PvE difficulty jump rules**, **does not bypass question fallback protections**, and **does not make difficulty impossible through unbounded tier jumps**, with **clear recommended level and risk messaging**. It also required testing monster/player level deltas and question selection at boundary levels.

The region (defined in Phase 26.1 as Levels 50–60, unlocked at Level 50) gains one landing map (`forgotten-crossroads`) and two hunting grounds: `ashen-wastes` (Science — blighted ruin) and `ruined-archive` (Mathematics — decayed scholarship). Two hunting zones with weighted spawn tables, six new monsters (Levels 50–60) with real drop tables, two NPCs, and one quest hook round out the package.

**The defining challenge of this region** is that its 50–60 band **straddles the Junior High ↔ Senior High tier boundary** (Junior High = 11–50, Senior High = 51–100), and **no Senior High content is bundled**. The design therefore:

- **Caps monster levels at the region maximum (60)** so the level delta from the recommended minimum (50) is ≤ 10. Per the existing `DEFAULT_HIGHER_LEVEL_SHIFTS` table, Δ10–19 yields at most a **+1 tier** shift (Junior High → College), never the **+2** extreme jump — the jump stays bounded within `[0, 2]`.
- **Relies on the existing `resolveQuestionsWithFallback` protections** for the Senior High encounters whose tier has no bundled content; the fallback records a `DifficultyFallbackEvent` and still returns real questions rather than an empty set. **No fallback protection was bypassed.**
- **Provides explicit risk messaging** for under-leveled players via the existing `checkZoneAccess` (warning includes zone name and the `Level 50+` recommendation).

### 2. Files Created and Modified

- **New Files**:
  - `tests/world/phase26_6_forgotten_lands.test.ts`: 31 tests (configuration, transitions, spawn validity, level deltas at the boundary, risk messaging, boundary question selection + fallback, bounded tier jumps, rewards/drops, NPC/quest wiring).
  - `docs/PHASE_26_6_IMPLEMENTATION_REPORT.md`: This report.
- **Modified Files**:
  - `src/world/buildings.ts`: added `HuntingZoneIds.AshenWastes` / `RuinedArchive`.
  - `src/world/maps.ts`: added `MapIds.ForgottenCrossroads/AshenWastes/RuinedArchive`, the three map definitions, `FORGOTTEN_LANDS_MAPS`, and registry entries.
  - `src/world/huntingZones.ts`: added `ASHEN_WASTES_ZONE`, `RUINED_ARCHIVE_ZONE`, `FORGOTTEN_LANDS_ZONES`, and registry entries.
  - `src/monsters/monsterData.ts`: added six Forgotten Lands monsters with drop tables referencing existing items.
  - `src/quests/NPCRegistry.ts`: added `warden-thalia` and `hermit-orin` on the crossroads.
  - `src/quests/QuestRegistry.ts`: added `quest-forgotten-vigil`.
  - `src/world/regions.ts`: linked the Forgotten Lands maps to the region's `mapIds`.
  - `src/world/index.ts`: barrel exports for the new maps and zones.
  - `docs/IMPLEMENTATION_REPORTS.md`: consolidated tracker updated with Phase 26.6.

### 3. Region Content Package

**Maps** (`MAP_REGISTRY`, all 1200 × 900, recommended Levels 50–60):

| Map ID | Name | Type | Role |
| --- | --- | --- | --- |
| `forgotten-crossroads` | Forgotten Crossroads | Town | Region landing concourse; hosts both NPCs; exits to both hunting grounds |
| `ashen-wastes` | Ashen Wastes | Hunting Ground | Science (blighted ruin) |
| `ruined-archive` | Ruined Archive | Hunting Ground | Mathematics (decayed scholarship) |

Each map defines explicit `collisionRects` and connection exit/entry points. All routes are self-contained within the region and verified bidirectional via `validateMapGraph`.

**Hunting zones** (`HUNTING_ZONE_REGISTRY`):

| Zone | Subject | Tier | Avg Monster Lvl | Spawn Table |
| --- | --- | --- | --- | --- |
| Ashen Wastes | Science | Senior High | 55 | Ash Stalker (W), Blight Horror (N), Ruin Colossus (S) |
| Ruined Archive | Mathematics | Senior High | 55 | Crumbling Sentry (W), Fractured Golem (N), Fallen Warden (S) |

> Zone `educationalTier` is Senior High (the baseline tier of the average monster level, 55). The weak monsters (Level 50) sit at the Junior High baseline; the normal/strong monsters (Level 55/60) sit at the Senior High baseline. Because Senior High has no bundled content, encounters that resolve to that tier use the existing fallback path.

**Monsters** (`MONSTER_REGISTRY`, Levels 50–60 → spanning the Junior High/Senior High boundary):

| Monster | Lvl | Category | Subject | HP / ATK / DEF | EXP / Gold | Drops |
| --- | --- | --- | --- | --- | --- | --- |
| Ash Stalker | 50 | Weak | Science | 820 / 118 / 50 | 460 / 180 | Minor Health Potion |
| Blight Horror | 55 | Normal | Science | 1100 / 150 / 68 | 620 / 250 | Minor Mana Potion, Rare Crystal |
| Ruin Colossus | 60 | Strong | Science | 1500 / 190 / 100 | 880 / 360 | Rare Crystal, one armour piece |
| Crumbling Sentry | 50 | Weak | Mathematics | 810 / 117 / 51 | 458 / 178 | Minor Health Potion |
| Fractured Golem | 55 | Normal | Mathematics | 1095 / 149 / 67 | 618 / 248 | Minor Mana Potion, Copper Ring |
| Fallen Warden | 60 | Strong | Mathematics | 1490 / 188 / 98 | 875 / 358 | Rare Crystal, one accessory |

All stats, drop chances, and level bands are provisional. Drops reuse the existing `dropConfig` system and reference only items already in `ITEM_REGISTRY`.

**NPC & quest content** (existing registries only):

- **NPCs** (both on `forgotten-crossroads`):
  - `warden-thalia` (Quest Giver) → offers `quest-forgotten-vigil`.
  - `hermit-orin` (Scholar) → flavour / lore NPC.
- **Quest** — `quest-forgotten-vigil`: destroy 5 Blight Horrors; rewards 1000 combat EXP, 620 gold, 5 Minor Health Potions, and 150 Science mastery EXP; requires Level 50. Placeholder content (provisional), wired entirely through existing systems.

### 4. Verification & Test Results

Per the handbook, the phase verifies **monster/player level deltas** and **question selection at boundary levels**, alongside zone transitions, spawn validity, risk messaging, and rewards:

- **Level deltas at the boundary** — monsters are capped at the region maximum (Level 60), so the delta from the recommended minimum (Level 50) is ≤ 10 (and `< 20`). The existing jump rules are exercised at Δ5 (→ +1 tier, difficulty 1, timer ×0.8) and Δ10 (→ +1 tier, difficulty 3, timer ×0.7); the tier jump stays within `[0, 2]`. The Level 50 ↔ 51 boundary correctly splits Junior High (50) from Senior High (51).
- **Question selection at boundary levels** — a Level 51 player facing a Level 50 monster stays at the Junior High baseline (difficulty 1, timer ×1.0); a Level 51 player facing a Level 51 monster resolves to Senior High (difficulty 3); an on-level encounter produces no fallback; a Senior High encounter (no bundled content) falls back and records a `DifficultyFallbackEvent` whose `requestedTier` is College and whose reason notes insufficient questions — and **never returns an empty question set**.
- **Zone transitions** — `validateMapGraph(FORGOTTEN_LANDS_MAPS, { requireBidirectional: true })` passes; the crossroads connects to both hunting grounds and back; every connection has a resolvable exit → entry round trip with in-bounds points.
- **Spawn validity** — generated spawn positions and full spawn plans stay inside every map's bounds and are subject-matched.
- **Level-risk warnings** — on-level players get no warning; at the recommended minimum, a warning naming the zone and its `Level 50+` requirement is produced.
- **Rewards/drops** — all Forgotten Lands monsters have positive EXP, non-negative gold, drop tables referencing only real items with valid chances/quantities, and no monster ids overlap with the Arcane City region.
- **NPC/quest wiring** — both NPCs are placed on the crossroads; the quest giver links to a registered quest targeting a real monster with real item/subject rewards.

**Results:**
- **Automated Tests (`npm test`)**: 67 test files passed (**744 passed, 0 failures**). New `phase26_6_forgotten_lands.test.ts` contributes 31 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

### 5. Scope Notes

- **Bounded difficulty only** — monster levels are capped at the region maximum so tier jumps stay within `[0, 2]`; no unbounded jumps were introduced.
- **Fallback protections preserved** — the Senior High encounters rely on the existing `resolveQuestionsWithFallback`; no fallback path was bypassed or weakened.
- **No new subjects** — only Mathematics and Science are used; the taxonomy is unchanged, per the handbook.
- **Existing systems only** — the region adds only data to the world / monster / NPC / quest registries; no new combat rules and no scene code changed.
- **No content gap silently masked** — the missing Senior High bundled content is surfaced as a normal fallback event and flagged here as a content backlog item, not hidden.
- **NPC/quest content is placeholder** — all text/values are provisional and can be replaced without code changes.

### 6. Required Assets (placeholders in use)

| Asset | Currently | Needed |
| --- | --- | --- |
| Forgotten Crossroads / Ashen Wastes / Ruined Archive ground | Flat tint + grid | Tileset |
| Blight & ruin obstacles | Grey rounded rects | Sprites |
| Ash Stalker, Blight Horror, Ruin Colossus | Coloured circles | Animated sprites |
| Crumbling Sentry, Fractured Golem, Fallen Warden | Coloured circles | Animated sprites |
| `warden-thalia`, `hermit-orin` | Coloured circles | NPC sprites |
| Region BGM | Reused `bgm-wilderness` | Dedicated Forgotten Lands track |

### 7. Backlog Surfaced (not blocking)

- **Senior High bundled content** — the 51–100 tier currently has no Mathematics/Science questions, so Senior High encounters fall back. Authoring that content would remove the fallback; it is intentionally left to the content pipeline, not faked in this phase.

Phase complete. Stopping here as required; no subsequent phase was started.
