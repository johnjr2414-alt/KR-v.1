# Phase 21.2 Implementation Report — Combat Rewards, Currency Persistence, and Defeat Respawn

**Date**: 2026-11-08  
**Phase**: 21.2  
**Status**: Implemented — manual verification pending  

---

## 1. Executive Summary

Phase 21.2 establishes an authoritative, single reward-claim pipeline upon battle resolution, integrates Gold persistence into the IndexedDB `SaveData` schema with full backward-compatibility for legacy saves, and implements safe defeat respawn handling.

---

## 2. Existing Files Inspected

- `src/player/PlayerSessionManager.ts`
- `src/player/PlayerData.ts`
- `src/storage/StorageTypes.ts`
- `src/storage/SaveDataValidator.ts`
- `src/economy/CurrencyService.ts`
- `src/core/progression/ProgressionService.ts`
- `src/inventory/InventoryManager.ts`
- `src/combat/rewards/RewardCalculator.ts`
- `src/combat/BattleSession.ts`
- `src/scenes/BattleScene.ts`
- `src/scenes/VillageScene.ts`
- `src/scenes/HuntingScene.ts`

---

## 3. Files Created and Modified

### New Files
- [`tests/player/phase21_2_rewards.test.ts`](file:///c:/Users/johnb/Desktop/KR%20v.2/tests/player/phase21_2_rewards.test.ts): Unit tests verifying single reward-claim operations, defeat exclusion of victory rewards, Gold persistence round-trip, backward compatibility for saves missing currency, and defeat respawn state.

### Modified Files
- [`src/storage/StorageTypes.ts`](file:///c:/Users/johnb/Desktop/KR%20v.2/src/storage/StorageTypes.ts):
  - Incremented `SAVE_DATA_SCHEMA_VERSION` from 1 to 2.
  - Added optional `currency?: { gold: number }` to `SaveData`.
- [`src/storage/SaveDataValidator.ts`](file:///c:/Users/johnb/Desktop/KR%20v.2/src/storage/SaveDataValidator.ts):
  - Added schema validation and normalization for `currency.gold`.
  - Non-numeric or negative gold is clamped safely to `0`. Legacy saves omitting currency default gracefully to `0`.
- [`src/economy/CurrencyService.ts`](file:///c:/Users/johnb/Desktop/KR%20v.2/src/economy/CurrencyService.ts):
  - Added `setGold(amount: number): void` allowing headless hydration from saved sessions.
- [`src/player/PlayerSessionManager.ts`](file:///c:/Users/johnb/Desktop/KR%20v.2/src/player/PlayerSessionManager.ts):
  - Exposed `progression` service alongside `currency`, `inventory`, `mastery`, and `quests`.
  - Added Gold hydration in `initializeSession()`.
  - Fresh player baseline seeds `100` gold (matching initial `currencyService` default).
  - Included `currency: { gold: this.currency.getGold() }` in snapshots.
- [`src/inventory/InventoryManager.ts`](file:///c:/Users/johnb/Desktop/KR%20v.2/src/inventory/InventoryManager.ts):
  - Added `hasItem(itemId: string, quantity?: number): boolean` helper for state checks.
- [`src/scenes/BattleScene.ts`](file:///c:/Users/johnb/Desktop/KR%20v.2/src/scenes/BattleScene.ts):
  - Added `rewardsProcessed` boolean guard in `BattleScene` to guarantee that battle end resolution and reward claims occur exactly once.
  - Victory claims: awards combat EXP via `playerSessionManager.progression.awardExp()`, Gold via `playerSessionManager.currency.addGold()`, and item drops via `playerSessionManager.inventory.addItem()`.
  - Defeat resolution: does not award victory EXP, Gold, or drops; restores player HP to `maxHp` (configured safe respawn rule); reroutes return destination to Beginners Village plaza (`{ x: 600, y: 550 }`).
  - Auto-saves updated player state immediately upon resolution.

---

## 4. Key Design Decisions

1. **Single Reward Claim Path**:
   - `finishBattle()` coordinates headless domain services (`ProgressionService`, `CurrencyService`, `InventoryManager`) only once per battle instance via a state flag (`this.rewardsProcessed`).
   - Multiple modal clicks or scene transitions cannot re-trigger rewards.
2. **Gold Persistence & Backward Compatibility**:
   - Upgraded `SAVE_DATA_SCHEMA_VERSION` to 2.
   - Any legacy save (version 1 or without `currency`) will cleanly load without crashing or data loss, with Gold safely defaulted to 0.
   - New saves write `{ currency: { gold: n } }` to IndexedDB.
3. **Defeat and Respawn**:
   - On player defeat, the return target is dynamically redirected from the hunting zone to `VillageScene` at the plaza coordinates (`x: 600, y: 550`).
   - Player HP is restored to full (`maxHp`) on defeat/respawn.
   - Session auto-saves the respawn state so a browser refresh does not trap the player at 0 HP.

---

## 5. Automated Test & Build Results

- **Automated Tests (`npm.cmd test`)**:
  - **33 test files passed** (363 tests passed, 0 failures).
- **TypeScript Check (`npx.cmd tsc --noEmit`)**:
  - 0 errors.
- **Production Build (`npm.cmd run build`)**:
  - Passed without errors.

---

## 6. Manual Verification Checklist (For Browser Testing)

- [ ] **Victory Rewards**:
  1. Start game as "User".
  2. Travel to Beginners Hunting Ground and initiate encounter with a slime.
  3. Answer questions correctly to win.
  4. Verify the battle victory modal displays gained EXP, Gold, and any item drops.
  5. Click Return. Verify player EXP and Gold increased.
- [ ] **Defeat Respawn**:
  1. Initiate an encounter.
  2. Answer incorrectly or let time expire repeatedly until player HP reaches 0.
  3. Verify the battle summary displays "Defeat..." with 0 EXP and 0 Gold awarded.
  4. Click Return. Verify you are respawned in Beginners Village plaza (not inside the hunting zone).
  5. Verify HP is restored to full.
- [ ] **Persistence Across Browser Reload**:
  1. Win a battle to earn Gold and items.
  2. Hard refresh the browser (`F5` / `Ctrl+R`).
  3. Click "Play as User" from the start menu.
  4. Verify that character EXP, level, inventory items, and Gold reflect the post-combat values.

---

## 7. Next Steps

Per the **Knowledge Realms Master Development Prompt Handbook**, the next phase is:
**Phase 21.3 — Unified Question Repository for Combat and Admin** (unifying combat question retrieval with Super Admin IndexedDB question storage, custom questions, and tombstones).
