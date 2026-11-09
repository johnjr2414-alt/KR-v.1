# Phase 26.4 Implementation Report — Golden Capital

**Date**: 2026-11-08  
**Phase**: 26.4 (Handbook Section: World and Content Expansion)  
**Status**: Completed

---

### 1. Executive Summary

Phase 26.4 implements **Golden Capital** as a data-driven region **using the reusable region architecture established in Phase 26.2 and reused in Phase 26.3** — no new combat rules, no scene duplication, no hardcoded navigation.

Per the handbook, the **existing economy and NPC architecture was inspected before introducing merchants, services, or civic activities**: `ShopTypes`/`ShopRegistry`/`ShopService`/`ShopModal`, `BankTypes`/`BankRegistry`/`BankService`/`BankModal`, `NPCTypes`/`NPCRegistry`, and the save validator were reviewed first. The region introduces a merchant (reusing the existing shop system), a banker (reusing the **existing** bank/investment/business services — **no new banking or business mechanics were added**, since Phase 27 has not delivered any), a scholar, and a quest giver — all through existing registries.

The region (defined in Phase 26.1 as Levels 30–40, unlocked at Level 30) gains one landing map (`golden-capital-plaza`) and two hunting grounds: `trade-bazaar` (Mathematics — commerce/arithmetic) and `civic-district` (Science — civic/public science). Two hunting zones with weighted spawn tables, six new monsters (Levels 30–36, Junior High baseline tier) with real drop tables, one shop, four NPCs, and one quest hook round out the package.

Level ranges were inspected before assigning content: the region band (30–40) falls in the **Junior High** educational tier (character Levels 11–50), whose Mathematics and Science content already exists in the bundled question bank, so encounters resolve to real material without the difficulty engine's fallback path.

### 2. Files Created and Modified

- **New Files**:
  - `tests/world/phase26_4_golden_capital.test.ts`: 27 tests (configuration, transitions, spawn validity, level-risk, tier selection, rewards/drops, NPC interactions, save persistence).
  - `docs/PHASE_26_4_IMPLEMENTATION_REPORT.md`: This report.
- **Modified Files**:
  - `src/world/buildings.ts`: added `HuntingZoneIds.TradeBazaar` / `CivicDistrict`.
  - `src/world/maps.ts`: added `MapIds.GoldenCapitalPlaza/TradeBazaar/CivicDistrict`, the three map definitions, `GOLDEN_CAPITAL_MAPS`, and registry entries.
  - `src/world/huntingZones.ts`: added `TRADE_BAZAAR_ZONE`, `CIVIC_DISTRICT_ZONE`, `GOLDEN_CAPITAL_ZONES`, and registry entries.
  - `src/monsters/monsterData.ts`: added six Golden Capital monsters with drop tables referencing existing items.
  - `src/quests/NPCRegistry.ts`: added `chancellor-edmund`, `merchant-cordelia`, `banker-cassius`, `archivist-mira` on the plaza.
  - `src/quests/QuestRegistry.ts`: added `quest-capital-levy`.
  - `src/economy/ShopRegistry.ts`: added `capital-grand-bazaar` (reusing the existing shop system; catalog references existing items only).
  - `src/world/regions.ts`: linked the Golden Capital maps to the region's `mapIds`.
  - `src/world/index.ts`: barrel exports for the new maps and zones.
  - `docs/IMPLEMENTATION_REPORTS.md`: consolidated tracker updated with Phase 26.4.

### 3. Region Content Package

**Maps** (`MAP_REGISTRY`, all 1200 × 900, recommended Levels 30–40):

| Map ID | Name | Type | Role |
| --- | --- | --- | --- |
| `golden-capital-plaza` | Golden Capital Plaza | Town | Region landing square; hosts all four NPCs; exits to both hunting grounds |
| `trade-bazaar` | Trade Bazaar | Hunting Ground | Mathematics (commerce / arithmetic) |
| `civic-district` | Civic District | Hunting Ground | Science (civic / public science) |

Each map defines explicit `collisionRects` (stalls / civic-blocks obstacles) and connection exit/entry points. All routes are self-contained within the region and verified bidirectional via `validateMapGraph`.

**Hunting zones** (`HUNTING_ZONE_REGISTRY`):

| Zone | Subject | Tier | Avg Monster Lvl | Spawn Table |
| --- | --- | --- | --- | --- |
| Trade Bazaar | Mathematics | Junior High | 33 | Coin Courier (W), Ledger Golem (N), Vault Sentinel (S) |
| Civic District | Science | Junior High | 33 | Miasma Wisp (W), Clockwork Beetle (N), Aether Engine (S) |

**Monsters** (`MONSTER_REGISTRY`, Levels 30–36 → Junior High baseline tier):

| Monster | Lvl | Category | Subject | HP / ATK / DEF | EXP / Gold | Drops |
| --- | --- | --- | --- | --- | --- | --- |
| Coin Courier | 30 | Weak | Mathematics | 480 / 72 / 30 | 262 / 106 | Minor Health Potion |
| Ledger Golem | 33 | Normal | Mathematics | 640 / 88 / 40 | 352 / 146 | Minor Mana Potion, Copper Ring |
| Vault Sentinel | 36 | Strong | Mathematics | 900 / 112 / 60 | 500 / 212 | Rare Crystal, Amulet of Logic |
| Miasma Wisp | 30 | Weak | Science | 472 / 71 / 31 | 260 / 104 | Minor Health Potion |
| Clockwork Beetle | 33 | Normal | Science | 632 / 87 / 39 | 350 / 145 | Minor Mana Potion |
| Aether Engine | 36 | Strong | Science | 888 / 110 / 58 | 496 / 210 | Rare Crystal, Scholar's Hood |

All stats, drop chances, and level bands are provisional. Drops reuse the existing `dropConfig` system and reference only items already in `ITEM_REGISTRY`.

**Economy, NPC & quest content** (existing registries only):

- **Shop** — `capital-grand-bazaar` (`SHOP_REGISTRY`), keyed to `merchant-cordelia`; catalog lists `iron-blade`, `leather-vest`, `scholars-hood`, `amulet-of-logic`, and the two potions — all existing `ITEM_REGISTRY` items. No shop code changed.
- **NPCs** (all on `golden-capital-plaza`):
  - `merchant-cordelia` (Merchant) → resolves to the shop above via the existing `getShopForMerchant`.
  - `banker-cassius` (Banker) → surfaces the **pre-existing** `BankService` / `AVAILABLE_INVESTMENTS` / `AVAILABLE_BUSINESSES`. **No new banking/business mechanics were introduced.**
  - `chancellor-edmund` (Quest Giver) → offers `quest-capital-levy`.
  - `archivist-mira` (Scholar) → flavour / civic NPC.
- **Quest** — `quest-capital-levy`: destroy 4 Ledger Golems; rewards 520 combat EXP, 320 gold, 4 Minor Health Potions, and 90 Mathematics mastery EXP; requires Level 30. Placeholder content (provisional), wired entirely through existing systems.

### 4. Verification & Test Results

Per the handbook, the phase verifies **navigation, NPC interactions, region content, combat, and save persistence**:

- **Navigation / transitions** — `validateMapGraph(GOLDEN_CAPITAL_MAPS, { requireBidirectional: true })` passes; plaza ↔ both grounds routes exist with in-bounds entry/exit points.
- **Region content / spawn validity** — generated spawn positions and full spawn plans stay inside every map's bounds and are subject-matched.
- **Level-risk warnings** — on-level players (Δ ≤ 4) get no warning; Δ ≥ 5 warns; severe under-leveling escalates to `Extreme`.
- **Question tier selection (combat)** — zone `educationalTier` equals the baseline tier derived from `averageMonsterLevel` (Junior High); zone subjects have bundled content at that tier; every spawn config's monster matches the zone subject, level band, and tier; an on-level profile resolves to Junior High.
- **Rewards/drops (combat)** — all Golden Capital monsters have positive EXP, non-negative gold, and drop tables referencing only real items with valid chances/quantities.
- **NPC interactions** — all four NPCs are placed on the plaza; the merchant resolves to a shop whose catalog references only real items; the banker has no quest and only reuses existing economy services; the quest giver links to a registered quest targeting a real monster with real item/subject rewards.
- **Save persistence** — a Golden Capital-era `SaveData` (player Level 35, gold, bank state, capital quest) passes `validateSaveData` and preserves progression, gold, and bank state, confirming the region adds **no save-schema change** (content is data-only).

**Results:**
- **Automated Tests (`npm test`)**: 65 test files passed (**688 passed, 0 failures**). New `phase26_4_golden_capital.test.ts` contributes 27 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

### 5. Scope Notes

- **Existing services only** — the merchant/shop and banker reuse the existing shop and bank systems; **no new banking or business mechanics were implemented** (Phase 27 not delivered).
- **No new combat rules** — combat, drops, and rewards reuse the existing systems; the region contributes only data.
- **No scene duplication** — Golden Capital content is consumed through the same registries as Emerald Forest / Ironhold; no scene code changed.
- **No new subjects** — only Mathematics and Science (which have Junior High content) are used; the taxonomy is unchanged.
- **Inter-region road deferred** — the Ironhold ↔ Golden Capital "King's Road" travel point (Phase 26.1) is a world-navigation concern and is intentionally not wired as a map connection.
- **NPC/quest content is placeholder** — added because the handbook lists NPCs and quest hooks; all text/values are provisional and can be replaced without code changes.

### 6. Required Assets (placeholders in use)

| Asset | Currently | Needed |
| --- | --- | --- |
| Golden Capital Plaza / Trade Bazaar / Civic District ground | Flat tint + grid | Tileset |
| Market stalls & civic-block obstacles | Grey rounded rects | Sprites |
| Coin Courier, Ledger Golem, Vault Sentinel | Coloured circles | Animated sprites |
| Miasma Wisp, Clockwork Beetle, Aether Engine | Coloured circles | Animated sprites |
| `chancellor-edmund`, `merchant-cordelia`, `banker-cassius`, `archivist-mira` | Coloured circles | NPC sprites |
| Region BGM | Reused `bgm-wilderness` | Dedicated Golden Capital track |

Phase complete. Stopping here as required; no subsequent phase was started.
