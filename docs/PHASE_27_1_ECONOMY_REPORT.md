# Phase 27.1 — Economy Balance Report

**Date**: 2026-11-09
**Phase**: 27.1 (Handbook Section: Phase 27 — Economy & Professions)
**Status**: Completed (inspection + balance report)
**Scope**: Inspection only. **No economy values were changed in this phase.**

---

## 1. Purpose

Per the handbook, inspect the current **Gold rewards, shop prices, sell values, drops, and progression
curves** and produce a balance report *before* changing any values. Evaluate:

1. Gold earned per encounter
2. Cost of consumables
3. Equipment prices
4. Sell-to-buy ratios
5. Potential infinite money loops
6. Reward scaling by level
7. Inventory limitations

The handbook also states: *"Do not add new economy systems. Change values only with a documented reason
and tests."* This report changes nothing; the rationale for making no changes is documented in §10.

---

## 2. Data Sources Inspected

| Concern | File |
| --- | --- |
| Item values / rarity / stack limits | `src/inventory/ItemRegistry.ts`, `src/inventory/ItemTypes.ts` |
| Inventory capacity | `src/inventory/InventoryManager.ts` (`DEFAULT_INVENTORY_CAPACITY`) |
| Monster gold/exp/drops | `src/monsters/monsterData.ts` |
| Reward math | `src/combat/rewards/RewardCalculator.ts` |
| Shop catalogues / sell multipliers | `src/economy/ShopRegistry.ts`, `src/economy/ShopTypes.ts` |
| Buy/sell transactions | `src/economy/ShopService.ts` |
| Gold balance rules | `src/economy/CurrencyService.ts` |
| Bank / interest (adjacent sink) | `src/economy/BankService.ts`, `src/economy/BankTypes.ts` |
| Progression curve | `src/config/expConfig.ts`, `src/core/progression/ProgressionService.ts` |
| Quest gold rewards | `src/quests/QuestRegistry.ts` |

---

## 3. Gold Earned Per Encounter

**Formula** (`RewardCalculator.calculateRewards`):

```
totalGold = baseGold + floor( random * (bonusGoldMax - bonusGoldMin + 1) ) + bonusGoldMin
```

- `baseGold` is authoritative per monster; `bonusGoldMin/Max` come from the monster's `dropConfig`.
- Monsters using the shared `EMPTY_DROPS` config have `bonusGoldMin: 0`, `bonusGoldMax: 2` → **+0..+2**.
- Combat EXP = `max(1, floor(baseExp * expMultiplier))`.

Representative encounters (average gold uses the midpoint of the bonus range):

| Monster | Lvl | baseExp | baseGold | bonus range | Avg gold/kill |
| --- | --- | --- | --- | --- | --- |
| math-slime | 1 | 8 | 3 | 0–2 | 4 |
| fraction-bat | 5 | 30 | 12 | 0–2 | 13 |
| sporeling | 11 | 55 | 22 | 0–2 | 23 |
| cinder-imp | 20 | 150 | 62 | 2–6 | 66 |
| coin-courier | 30 | 262 | 106 | 4–10 | 113 |
| arc-spark | 40 | 350 | 142 | 6–14 | 152 |
| ash-stalker | 50 | 460 | 180 | 8–18 | 193 |
| ruin-colossus | 60 | 880 | 360 | 18–36 | 387 |

**Finding 3.1 — Gold is granted only on monster defeat.** There is no gold from exploring, and quest
gold is a one-time bonus (§7). Currency is strictly `baseGold + random bonus`; no multiplier is applied
to gold the way `expMultiplier` is applied to EXP.

**Finding 3.2 — Gold per EXP is near-constant (~0.40).** Across the whole table, `baseGold / baseExp`
stays within **0.37–0.41**. Gold therefore scales in lock-step with EXP, which means gold income is
driven entirely by the (superlinear) EXP-to-level curve — see §8.

---

## 4. Cost of Consumables

| Item | Restores | `value` | Village buy | Apothecary buy | Capital buy | Best sell |
| --- | --- | --- | --- | --- | --- | --- |
| minor-health-potion | 35 HP | 8 | 10 | — | 20 | 4 |
| minor-mana-potion | 25 MP | 8 | 12 | 12 | 22 | 4 |

**Finding 4.1 — Consumables are cheap relative to income.** A Level-1 math-slime kill (~4 gold) funds
~0.4 health potions; a Level-30 kill (~113 gold) funds ~11 health potions. Consumable cost is
essentially negligible from mid-game onward, and potions drop freely from L20+ monsters
(15–24% drop chance), so a farming player rarely needs to buy them. This is not a defect but means the
consumable sink provides little late-game gold pressure.

**Finding 4.2 — Potion buy prices are inconsistent across shops for the same item.** minor-health-potion
is 10 in the village but 20 in the capital; minor-mana-potion is 12 vs 22. This reads as intentional
regional pricing (capital markup), and since the capital is a higher-level region this is defensible and
does not create an exploit (§6).

---

## 5. Equipment Prices

| Item | Slot | `value` | requiredLevel | Cheapest buy | Notes |
| --- | --- | --- | --- | --- | --- |
| wooden-sword | Weapon | 15 | 1 | 20 | starter weapon |
| cloth-tunic | Armor | 12 | 1 | 15 | starter armor |
| leather-cap | Helmet | 10 | 1 | 15 | starter helmet |
| copper-ring | Accessory | 20 | 1 | 35 | quest reward also grants one |
| iron-blade | Weapon | 50 | 3 | 120 | capital only |
| leather-vest | Armor | 45 | 3 | 110 | capital only; also a drop |
| scholar's-hood | Helmet | 80 | 4 | 100 | rare; also a drop |
| amulet-of-logic | Accessory | 90 | 4 | 150 | rare; also a drop |

**Finding 5.1 — Full starter kit is affordable at game start.** Cheapest entry for the three Level-1
slots = 20 + 15 + 15 = **50 gold**, versus the seeded starting balance of **100 gold**
(`currencyService = new CurrencyService(100)`), and the first main-story quest alone pays 30 gold.
Onboarding affordability is good.

**Finding 5.2 — Equipment is a trivial sink at high levels.** The most expensive item in the game is the
amulet-of-logic at **200 gold** (capital). By Level 30 a single normal kill yields ~113 gold, so a full
best-in-slot set costs a handful of kills. Equipment pricing is not currently a meaningful gold sink for
mid/late game (see §8). This is expected for a content-complete-but-unbalanced prototype and is flagged
as a future tuning target, not a defect to fix now.

---

## 6. Sell-to-Buy Ratios & Infinite-Money-Loop Analysis

**Sell formula** (`ShopService.sellItem`):

```
unitPrice = max(1, floor(itemDef.value * shop.sellPriceMultiplier))
```

Sell price is derived from the item's **`value`**, *not* from its **buy price**. Sell multipliers:
village `0.5`, apothecary `0.6`, capital `0.55`.

**Buy → sell round-trip check (best case: cheapest buy vs. best sell):**

| Item | Cheapest buy | Best sell | Spread | Loop? |
| --- | --- | --- | --- | --- |
| wooden-sword | 20 | 7 | +13 | No |
| cloth-tunic | 15 | 6 | +9 | No |
| leather-cap | 15 | 5 | +10 | No |
| copper-ring | 35 | 12 | +23 | No |
| iron-blade | 120 | 27 | +93 | No |
| leather-vest | 110 | 24 | +86 | No |
| scholar's-hood | 100 | 48 | +52 | No |
| amulet-of-logic | 150 | 54 | +96 | No |
| minor-health-potion | 10 | 4 | +6 | No |
| minor-mana-potion | 12 | 4 | +8 | No |

**Finding 6.1 — No buy/sell arbitrage loop exists.** For every purchasable item, `cheapestBuyPrice >
bestSellPrice` by a wide margin, so buying and re-selling always loses gold. The invariant holds because
`sellPriceMultiplier ≤ 0.6 < 1` **and** every `buyPrice ≥ value` (many are ≥ `value * 1.5`).

**Finding 6.2 — No duplication or crafting loop exists.** There is no crafting, refining, dismantling, or
"combine two items into a more valuable one" path in the current economy, so there is no way to convert
inputs into net-positive gold via item manipulation. Selling is the only gold-out-for-items path, and it
is always lossy.

**Finding 6.3 — Bank interest is a passive gold *source*, not a loop.** `BankService` grants
`2% per 60,000 ms` (`DEFAULT_BANK_CONFIG`), capped at `1,000,000` savings. This is the only mechanism in
the codebase that creates gold without combat or quests. It is a deliberate, bounded feature (time-gated,
capped) rather than an exploit, but it is the largest non-combat gold faucet — at the cap it pays
**+20,000 gold/minute** while idling. **Flagged as the primary long-term economy risk**; it is not
reachable until a player accumulates large savings, and it is out of scope for this phase to change.

**Finding 6.4 — No "sell an infinite stack" exploit.** `sellItem` checks inventory removal *before*
granting gold (`inventory.removeItem` must return `true`), so a player cannot sell items they do not own.

---

## 7. Quest Gold Rewards (secondary faucet)

One-time gold from quests, for reference. These are additive to grinding but not repeatable.

| Quest | Gold | Combat EXP |
| --- | --- | --- |
| quest-slime-hunter | 25 | 35 |
| quest-slime-sample | 15 | 20 |
| quest-archivist-1-first-page | 30 | 40 |
| quest-archivist-2-lost-formula | 55 | 80 |
| quest-side-lost-chalk | 45 | 60 |
| quest-archivist-3-final-proof | 120 | 150 |
| quest-forge-order | 140 | 220 |
| quest-capital-levy | 320 | 520 |
| quest-arcane-calibration | 420 | 700 |
| quest-forgotten-vigil | 620 | 1000 |

**Finding 7.1 — Quest gold tracks quest EXP at ~0.6 gold/EXP**, higher than the ~0.40 grinding ratio,
so quests are a mildly better gold-per-effort source and serve as intended one-time injections. Quest
gold is idempotent (paid once on turn-in), so it cannot be farmed.

---

## 8. Reward Scaling by Level

**Progression curve** (`src/config/expConfig.ts`): `RequiredEXP(L) = floor(50 * L^2.2 + 100 * L)`,
`maxLevel = 100`.

Combining §3 (gold ≈ 0.40 × EXP, near-constant) with the superlinear EXP curve means **gold earned per
character level grows faster than linearly**. Illustrative estimates (EXP needed for the level ÷ baseExp
of a same-tier monster = kills; × avg gold/kill):

| Level | EXP for next level | Kills (same-tier monster) | Est. gold earned that level |
| --- | --- | --- | --- |
| 1 | 150 | ~19 (math-slime) | ~76 |
| 5 | 2,224 | ~74 (fraction-bat) | ~960 |
| 10 | 8,924 | ~162 (sporeling) | ~3,700 |
| 20 | 38,352 | ~256 (cinder-imp) | ~16,900 |
| 30 | 91,915 | ~351 (coin-courier) | ~39,700 |
| 40 | 171,300 | ~489 (arc-spark) | ~74,300 |
| 50 | 278,125 | ~605 (ash-stalker) | ~116,800 |

*(Estimates are derived from the formula and monster table; they are provisional and assume a single
same-tier monster is farmed. Actual values vary with monster choice and underleveled multipliers.)*

**Finding 8.1 — Gold income outpaces the equipment sink by orders of magnitude at high level.** A
Level-40 character earns roughly **74,000 gold per level**, while the most expensive purchasable item is
200 gold. After the mid-game, gold is effectively unbounded relative to any existing spend. Combined with
bank interest (§6.3), late-game gold has no sink.

**Finding 8.2 — Reward *density* is consistent, but *total* reward scales superlinearly.** `baseGold`
tracks monster level roughly linearly (3 → 360 from L1 → L60), while EXP requirements grow at `L^2.2`.
The economy is internally consistent for early/mid game and becomes generous at the top end.

---

## 9. Inventory Limitations

- **Capacity**: `DEFAULT_INVENTORY_CAPACITY = 24` slots (`InventoryManager`).
- **Stack limits** (`ItemRegistry`): equipment = 1; potions = 20; slime-gel = 99; rare-crystal = 50.
- **Drop pressure**: from L20+ monsters the drop tables include equipment (iron-blade, leather-vest,
  scholar's-hood, copper-ring, amulet-of-logic) at 8–12% each. Because equipment has `stackLimit: 1`,
  each drop consumes its own slot.

**Finding 9.1 — 24 slots is adequate for consumables but tight for equipment hoarding.** Farming a
single L26+ monster can drop both `rare-crystal` and a piece of equipment; over a session a player can
accumulate many non-stacking equipment drops and fill all 24 slots, at which point:
- `ShopService.buyItem` returns `error: 'Inventory is full'` (and correctly rolls back any partial add),
- `InventoryManager.addItem` returns `remainingQuantity > 0` (loot is dropped/not stored).

**Finding 9.2 — Materials stack well and are the intended bulk-farm item.** `slime-gel` (99) and
`rare-crystal` (50) stack, so material farming does not pressure capacity the way equipment farming does.

**Finding 9.3 — Capacity is fixed and not upgradeable in the current build.** There is no bag-upgrade
system; 24 is the ceiling. This is an observation for future expansion, not an action for this phase.

---

## 10. Conclusion & Decision On Value Changes

All seven evaluation points were inspected. Summary:

| # | Area | Status |
| --- | --- | --- |
| 1 | Gold per encounter | Internally consistent; ~0.40 gold/EXP across the table |
| 2 | Consumable cost | Cheap; negligible sink from mid-game |
| 3 | Equipment prices | Good onboarding; trivial sink mid/late game |
| 4 | Sell-to-buy ratios | Always lossy; no arbitrage |
| 5 | Infinite money loops | **None found** (no buy/sell loop, no craft loop, no dupe) |
| 6 | Reward scaling by level | Consistent density; superlinear total income |
| 7 | Inventory limits | 24 slots fixed; equipment hoarding can fill it |

**Decision: no economy values are changed in Phase 27.1.**

Rationale (the "documented reason" the handbook requires for any change):
- **No exploit or defect was found.** There is no infinite-money loop, no duplication path, and no
  negative-balance or rounding defect (`CurrencyService` floors and guards negatives; `ShopService`
  validates stock, gold, and inventory before mutating).
- **The identified issues are *balance tuning* (late-game gold has no sink), not *correctness* bugs.**
  Tuning them responsibly requires either new sinks (a new economy system — explicitly forbidden this
  phase) or a coordinated economy-wide pass, which is better scheduled on its own rather than
  opportunistically changed here.
- **Changing values would require tests** (per the handbook) for a purely aesthetic rebalance with no
  player-facing correctness impact, which is not justified at this phase.

### Deferred recommendations (for a future scheduled tuning phase — NOT implemented here)
1. **Add a high-value gold sink** for mid/late game (e.g. priced upgrades, materials, or services) to
   match the ~74k gold/level income at L40+. Requires new content, so out of scope now.
2. **Review the bank interest rate** (`2%/min`) as the largest non-combat faucet; consider a lower rate
   or a shorter accrual window at high balances.
3. **Consider shop-buyable capacity upgrades** to relieve the fixed 24-slot pressure for equipment
   hoarders.
4. **Optionally normalize cross-shop consumable pricing** if the capital markup is unintended.

These are recorded so the next economy phase has a documented starting point. None are implemented in
this phase.

---

## 11. Verification

This phase is inspection-only and modified **no source, test, or config files**; therefore the existing
test/type-check/build results remain valid. To confirm the tree is unchanged and green:

- **Automated Tests**: `npm test`
- **TypeScript Check**: `npx tsc --noEmit`
- **Production Build**: `npm run build`

*(Results recorded in the Phase 27.1 entry of `docs/IMPLEMENTATION_REPORTS.md`.)*
