# Phase 26.3 Implementation Report — Ironhold Kingdom

**Date**: 2026-11-08  
**Phase**: 26.3 (Handbook Section: World and Content Expansion)  
**Status**: Completed

---

### 1. Executive Summary

Phase 26.3 implements **Ironhold Kingdom** as a data-driven region **using the reusable region architecture established in Phase 26.2** — no new combat rules, no scene duplication, no hardcoded navigation.

The region (defined in Phase 26.1 as Levels 20–30, unlocked at Level 20) gains one landing map (`ironhold-gate`) and two hunting grounds: `forge-district` (Science — engineering / physical sciences) and `siege-works` (Mathematics — algebra / geometry). Two hunting zones with weighted spawn tables, six new monsters (Levels 20–26, Junior High baseline tier) with real drop tables, one hub NPC and one quest hook round out the package — all through the existing `MAP_REGISTRY`, `HUNTING_ZONE_REGISTRY`, `MONSTER_REGISTRY`, `ITEM_REGISTRY`, `NPC_REGISTRY`, and `QUEST_REGISTRY` systems.

Level ranges were inspected before assigning content: the region band (20–30) falls in the **Junior High** educational tier (character Levels 11–50), whose Mathematics and Science content already exists in the bundled question bank, so encounters resolve to real material without the difficulty engine's fallback path.

### 2. Files Created and Modified

- **New Files**:
  - `tests/world/phase26_3_ironhold_kingdom.test.ts`: 25 tests (configuration, transitions, spawn validity, level-risk, tier selection, rewards/drops, NPC/quest wiring).
  - `docs/PHASE_26_3_IMPLEMENTATION_REPORT.md`: This report.
- **Modified Files**:
  - `src/world/buildings.ts`: added `HuntingZoneIds.ForgeDistrict` / `SiegeWorks`.
  - `src/world/maps.ts`: added `MapIds.IronholdGate/ForgeDistrict/SiegeWorks`, the three map definitions, `IRONHOLD_MAPS`, and registry entries.
  - `src/world/huntingZones.ts`: added `FORGE_DISTRICT_ZONE`, `SIEGE_WORKS_ZONE`, `IRONHOLD_ZONES`, and registry entries.
  - `src/monsters/monsterData.ts`: added six Ironhold monsters with drop tables referencing existing items.
  - `src/quests/NPCRegistry.ts`: added `forgemaster-durn` on the Ironhold gate.
  - `src/quests/QuestRegistry.ts`: added `quest-forge-order`.
  - `src/world/regions.ts`: linked the Ironhold maps to the region's `mapIds`.
  - `src/world/index.ts`: barrel exports for the new maps and zones.
  - `docs/IMPLEMENTATION_REPORTS.md`: consolidated tracker updated with Phase 26.3.

### 3. Region Content Package

**Maps** (`MAP_REGISTRY`, all 1200 × 900, recommended Levels 20–30):

| Map ID | Name | Type | Role |
| --- | --- | --- | --- |
| `ironhold-gate` | Ironhold Gate | Town | Region landing courtyard; exits to both hunting grounds |
| `forge-district` | Forge District | Hunting Ground | Science (engineering / physical sciences) |
| `siege-works` | Siege Works | Hunting Ground | Mathematics (algebra / geometry) |

Each map defines explicit `collisionRects` (forge / rampart obstacles) and connection exit/entry points. All routes are self-contained within the region and verified bidirectional via `validateMapGraph`.

**Hunting zones** (`HUNTING_ZONE_REGISTRY`):

| Zone | Subject | Tier | Avg Monster Lvl | Spawn Table |
| --- | --- | --- | --- | --- |
| Forge District | Science | Junior High | 23 | Cinder Imp (W), Magma Hound (N), Iron Golem (S) |
| Siege Works | Mathematics | Junior High | 23 | Pivot Sentry (W), Angle Knight (N), Bastion Warden (S) |

**Monsters** (`MONSTER_REGISTRY`, Levels 20–26 → Junior High baseline tier):

| Monster | Lvl | Category | Subject | HP / ATK / DEF | EXP / Gold | Drops |
| --- | --- | --- | --- | --- | --- | --- |
| Cinder Imp | 20 | Weak | Science | 320 / 48 / 20 | 150 / 62 | Minor Health Potion |
| Magma Hound | 23 | Normal | Science | 430 / 60 / 28 | 205 / 82 | Minor Health Potion |
| Iron Golem | 26 | Strong | Science | 620 / 78 / 42 | 300 / 128 | Rare Crystal, Iron Blade |
| Pivot Sentry | 20 | Weak | Mathematics | 315 / 47 / 21 | 148 / 60 | Minor Health Potion |
| Angle Knight | 23 | Normal | Mathematics | 425 / 59 / 27 | 202 / 80 | Minor Mana Potion |
| Bastion Warden | 26 | Strong | Mathematics | 610 / 77 / 42 | 296 / 126 | Rare Crystal, Leather Vest |

All stats, drop chances, and level bands are provisional. Drops reuse the existing `dropConfig` system and reference only items already in `ITEM_REGISTRY`.

**NPC & quest hook** (existing registries):
- `forgemaster-durn` (Quest Giver) placed on `ironhold-gate`.
- `quest-forge-order`: cull 3 Magma Hounds; rewards 220 combat EXP, 140 gold, 3 Minor Health Potions, and 60 Science mastery EXP; requires Level 20. Placeholder content (provisional), wired entirely through existing systems.

### 4. Verification & Test Results

Per the handbook, the phase verifies **zone boundaries, spawn validity, level-risk warnings, question tier selection, rewards, and transitions**:

- **Zone boundaries & transitions** — `validateMapGraph(IRONHOLD_MAPS, { requireBidirectional: true })` passes; gate ↔ both grounds routes exist with in-bounds entry/exit points.
- **Spawn validity** — generated spawn positions and full spawn plans stay inside every map's bounds and are subject-matched.
- **Level-risk warnings** — on-level players (Δ ≤ 4) get no warning; Δ ≥ 5 warns; severe under-leveling escalates to `Extreme`.
- **Question tier selection** — zone `educationalTier` equals the baseline tier derived from `averageMonsterLevel`; the 10 → 11 (Elementary → Junior High) boundary is respected; zone subjects have bundled content at that tier; every spawn config's monster matches the zone subject and tier.
- **Rewards/drops** — all Ironhold monsters have positive EXP, non-negative gold, and drop tables referencing only real items with valid chances/quantities; quest rewards reference real items and a real subject.

**Results:**
- **Automated Tests (`npm test`)**: 64 test files passed (**661 passed, 0 failures**). New `phase26_3_ironhold_kingdom.test.ts` contributes 25 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

### 5. Scope Notes

- **No new combat rules** — combat, drops, and rewards reuse the existing systems; the region contributes only data.
- **No scene duplication** — Ironhold content is consumed through the same registries as Emerald Forest; no scene code changed.
- **Inter-region trail deferred** — the Emerald Forest ↔ Ironhold "Mountain Pass" travel point (Phase 26.1) is a world-navigation concern and is intentionally not wired as a map connection, keeping existing scene behaviour untouched.
- **NPC/quest content is placeholder** — added because the handbook lists NPCs and quest hooks; all text/values are provisional and can be replaced without code changes.

### 6. Required Assets (placeholders in use)

| Asset | Currently | Needed |
| --- | --- | --- |
| Ironhold Gate / Forge District / Siege Works ground | Flat tint + grid | Tileset |
| Forge & rampart obstacles | Grey rounded rects | Sprites |
| Cinder Imp, Magma Hound, Iron Golem | Coloured circles | Animated sprites |
| Pivot Sentry, Angle Knight, Bastion Warden | Coloured circles | Animated sprites |
| `forgemaster-durn` | Coloured circle | NPC sprite |
| Region BGM | Reused `bgm-wilderness` | Dedicated Ironhold track |

Phase complete. Stopping here as required; no subsequent phase was started.
