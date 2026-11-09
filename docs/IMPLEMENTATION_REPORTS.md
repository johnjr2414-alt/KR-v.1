# Knowledge Realms — Master Implementation Reports

**Project:** Knowledge Realms (Phaser 3 + TypeScript + Vite)  
**Consolidated Tracker:** All phase integration reports recorded chronologically in one single file.

---

# Phase 21.1 — Centralized Player Session and Save/Load Integration

**Date**: 2026-11-08  
**Phase**: 21.1  
**Status**: Completed  

### 1. Executive Summary
Phase 21.1 connects the existing headless IndexedDB persistence layer (`IndexedDBStorageService`) to the Phaser 3 gameplay runtime. Previously, entering the game created a hardcoded level 1 character in memory and ignored existing saves. 

A centralized `PlayerSessionManager` singleton was implemented to coordinate player state and existing domain singletons (`InventoryManager`, `MasteryManager`, `QuestManager`, `CurrencyService`). `BootScene`, `VillageScene`, `HuntingScene`, and `BattleScene` now uniformly read and update the active player state and trigger auto-saves across scene transitions and battle completions.

### 2. Files Created and Modified
- **New Files**:
  - `src/player/PlayerSessionManager.ts`: Centralized session coordinator managing active `PlayerData`, domain service hydration, snapshot generation, concurrency-safe asynchronous saving, and initialization idempotency.
  - `tests/player/playerSessionManager.test.ts`: Comprehensive unit test suite covering 8 scenarios for session lifecycle, save/load, error handling, and role isolation.
- **Modified Files**:
  - `src/player/index.ts`: Added barrel exports for `PlayerSessionManager`, singleton `playerSessionManager`, and `PlayerSessionConfig`.
  - `src/inventory/InventoryManager.ts`: Added `loadState(state: InventoryState): void` to hydrate inventory items and equipped gear from saved data.
  - `src/mastery/MasteryManager.ts`: Added `loadRecords(records: Record<SubjectId, MasteryRecord>): void` to hydrate subject mastery maps from saved data.
  - `src/quests/QuestManager.ts`: Added `loadQuests(quests: QuestRecord[]): void` to hydrate quest states from saved data.
  - `src/scenes/BootScene.ts`: Added asynchronous session initialization with visual "Loading save data..." feedback upon selecting "User" role. Super Admin path bypasses session initialization to ensure player data isolation.
  - `src/scenes/VillageScene.ts`: Replaced hardcoded test level with `playerSessionManager.getPlayer().level`. Replaced isolated quest manager with `playerSessionManager.quests`. Added auto-save triggers on scene entry, zone transitions, NPC interactions, and quest progress.
  - `src/scenes/HuntingScene.ts`: Replaced hardcoded player references with `playerSessionManager.getPlayer()`. Added auto-save triggers on scene entry, monster encounter start, and zone exit transitions.
  - `src/scenes/BattleScene.ts`: Connected combat initialization and resolution to `playerSessionManager`. Transferred final HP back to active session, rewarded item drops directly into `playerSessionManager.inventory`, and performed auto-save upon battle completion and scene exit.

### 3. Verification & Test Results
- **Automated Tests**: 32 test files passed (357 tests passed, 0 failures).
- **TypeScript**: Strict type check passed with 0 errors (`npx tsc --noEmit`).
- **Production Build**: Vite build succeeded with zero bundling errors (`npm run build`).

---

# Phase 21.2 — Combat Rewards, Currency Persistence, and Defeat Respawn

**Date**: 2026-11-08  
**Phase**: 21.2  
**Status**: Completed  

### 1. Executive Summary
Phase 21.2 establishes an authoritative, single reward-claim pipeline upon battle resolution, integrates Gold persistence into the IndexedDB `SaveData` schema with full backward-compatibility for legacy saves, and implements safe defeat respawn handling.

### 2. Files Created and Modified
- **New Files**:
  - `tests/player/phase21_2_rewards.test.ts`: Unit tests verifying single reward-claim operations, defeat exclusion of victory rewards, Gold persistence round-trip, backward compatibility for saves missing currency, and defeat respawn state.
- **Modified Files**:
  - `src/storage/StorageTypes.ts`: Incremented `SAVE_DATA_SCHEMA_VERSION` from 1 to 2; added optional `currency?: { gold: number }` to `SaveData`.
  - `src/storage/SaveDataValidator.ts`: Added schema validation and normalization for `currency.gold`. Non-numeric or negative gold is clamped safely to `0`. Legacy saves omitting currency default gracefully to `0`.
  - `src/economy/CurrencyService.ts`: Added `setGold(amount: number): void` allowing headless hydration from saved sessions.
  - `src/player/PlayerSessionManager.ts`: Exposed `progression` service; added Gold hydration in `initializeSession()`; fresh player seeds 100 gold; included currency in snapshots.
  - `src/inventory/InventoryManager.ts`: Added `hasItem(itemId: string, quantity?: number): boolean` helper for inventory queries.
  - `src/scenes/BattleScene.ts`: Added `rewardsProcessed` boolean guard in `BattleScene` to guarantee that battle end resolution and reward claims occur exactly once.

### 3. Key Design Decisions
- **Single Claim Path**: Coordinates `ProgressionService.awardExp()`, `CurrencyService.addGold()`, and `InventoryManager.addItem()` idempotently on victory.
- **Gold Persistence**: Backward-compatible schema v2 handles legacy saves without currency data cleanly.
- **Defeat & Respawn**: Defeat does not award victory-only rewards, restores player HP to full (`maxHp`), and reroutes exit destination to Beginners Village plaza (`{ x: 600, y: 550 }`).

### 4. Verification & Test Results
- **Automated Tests**: 33 test files passed (363 tests passed, 0 failures).
- **TypeScript**: 0 errors.
- **Production Build**: Succeeded without errors.

---

# Phase 21.3 — Unified Question Repository for Combat and Admin

**Date**: 2026-11-08  
**Phase**: 21.3  
**Status**: Implemented — manual verification pending  

### 1. Executive Summary
Phase 21.3 eliminates the architectural disconnect between Super Admin question management and combat retrieval. Previously, `BattleScene` loaded only static bundled JSON questions directly, completely bypassing IndexedDB user-created questions, admin edits, and soft-deletion tombstones.

A unified effective question architecture was established via shared singleton instances (`sharedQuestionManager` and `sharedQuestionRepository`). Now, all admin additions, edits, and deletions are immediately reflected in battles without requiring a rebuild, while invalid records and tombstoned questions are strictly excluded from combat.

### 2. Files Created and Modified
- **New Files**:
  - `tests/questions/phase21_3_unified_repo.test.ts`: Comprehensive integration test suite verifying:
    1. Bundled questions appear when not deleted or overridden.
    2. Admin-created questions appear in combat selection.
    3. Edited bundled questions use the edited version in combat.
    4. Tombstoned bundled questions are excluded from combat.
    5. Hard-deleted user-created questions are excluded.
    6. Invalid stored questions are safely rejected during merge.
    7. Fallback resolution never returns tombstoned questions.
- **Modified Files**:
  - `src/questions/management/QuestionManager.ts`:
    - Added `isInitialized(): boolean` lifecycle flag.
    - Added error handling and validation during `initialize()` so invalid/corrupt records in IndexedDB are safely skipped.
    - Exported `sharedQuestionRepository` and `sharedQuestionManager` singletons connecting `questionStore` to runtime queries.
  - `src/questions/index.ts`:
    - Barrel exports for `sharedQuestionManager` and `sharedQuestionRepository`.
  - `src/scenes/AdminDashboardScene.ts`:
    - Updated to use `sharedQuestionManager` so all Super Admin mutations directly update the active runtime repository.
  - `src/scenes/BootScene.ts`:
    - Selecting "User" role initializes both `playerSessionManager` and `sharedQuestionManager.initialize()` before launching gameplay.
  - `src/scenes/BattleScene.ts`:
    - Removed hardcoded local bundled question loader and isolated repository.
    - Uses `sharedQuestionRepository` for `BattleSession` initialization.

### 3. Key Architectural Decisions
- **Effective Question Source Strategy**:
  - The shared repository loads bundled JSON questions first, checks IndexedDB for tombstones (filtering out soft-deleted bundled questions), and merges validated user-created questions/overrides on top (IndexedDB record overrides bundled record with same ID).
  - Admin changes immediately update the shared in-memory repository, making new and edited questions instantly available to subsequent battles.
- **Battle Isolation**:
  - Each `BattleSession` queries `sharedQuestionRepository` upon encounter creation and locks its questions into its internal `BattleState`. Admin mutations during an active battle do not mutate in-flight battle questions.
- **Safety & Fallback Integrity**:
  - Questions stored in IndexedDB must pass full `QuestionValidator.validate()` before entering the runtime pool. Corrupted records trigger console warnings and are safely ignored.
  - Soft-deleted/tombstoned questions are completely excluded from the repository, ensuring `DifficultyEngine` fallback resolution can never surface a deleted question.

### 4. Verification & Test Results
- **Automated Tests (`npm.cmd test`)**:
  - **34 test files passed** (370 tests passed, 0 failures).
- **TypeScript Check (`npx.cmd tsc --noEmit`)**:
  - 0 errors.
- **Production Build (`npm.cmd run build`)**:
  - Passed without errors.

### 5. Manual Verification Checklist (For Browser Testing)
- [ ] **Admin Question Creation in Combat**:
  1. From Start Menu, choose "Super Admin".
  2. Create a new Mathematics Elementary question (e.g., prompt: "What is 50 + 50?").
  3. Exit to Start Menu.
  4. Select "User", travel to Beginners Hunting Ground, and engage a Slime.
  5. Verify the newly created question can appear in the encounter.
- [ ] **Bundled Question Deletion**:
  1. In Super Admin, delete a bundled question.
  2. Exit to Start Menu and launch "User" gameplay.
  3. Engage monsters and verify the deleted question never appears.

---

# Phase 21.4 — Exploration HUD, Player Panels, and Keyboard Shortcuts

**Date**: 2026-11-08  
**Phase**: 21.4  
**Status**: Implemented — manual verification pending  

### 1. Executive Summary
Phase 21.4 introduces a persistent exploration HUD and integrates the existing Inventory (`InventoryPanel`) and Mastery (`MasteryPanel`) overlays directly into gameplay scenes (`VillageScene` and `HuntingScene`).

Player movement is cleanly frozen while any overlay is active, keyboard shortcuts (`I` for inventory, `M` for mastery) are coordinated without repeat clobbering, and shortcut triggers are suppressed while the user is typing into input fields. Changes made in the panels (such as equipping/unequipping gear) automatically update stats, refresh HUD values, and trigger session auto-saves.

### 2. Files Created and Modified
- **New Files**:
  - `src/ui/exploration-hud/ExplorationHUD.ts`: Persistent HTML/CSS DOM overlay displaying character name, level, HP (current/max with percentage bar), MP (current/max with percentage bar), character level EXP progress, Gold balance (reactive via `currency.onBalanceChange`), and quick-access buttons for Bag and Mastery.
  - `src/ui/exploration-hud/exploration-hud.css`: Clean, dark fantasy styling for the HUD card and progress bars with pointer-event click-through for non-interactive areas.
  - `src/ui/exploration-hud/ExplorationUIManager.ts`: Coordinator managing HUD lifecycle, modal transitions, shortcut listeners (`I`, `M`), and input freeze states.
  - `src/ui/exploration-hud/index.ts`: Public exports for `ExplorationHUD` and `ExplorationUIManager`.
  - `tests/ui/phase21_4_exploration_hud.test.ts`: Automated unit tests covering bar clamping/calculations, reactive gold change notifications, and equipment stat calculation through `InventoryManager`.
- **Modified Files**:
  - `src/player/movement/PhaserInputAdapter.ts`: Added `setInputEnabled(boolean)` and `isInputEnabled(): boolean` to freeze player controls when panels are open.
  - `src/ui/index.ts`: Exported `ExplorationHUD` and `ExplorationUIManager`.
  - `src/scenes/VillageScene.ts`: Attached `ExplorationUIManager` during `create()`, moved zone title to top-right to prevent overlap with HUD, prevented player movement while panels are open, and safely cleaned up UI in `shutdown()`.
  - `src/scenes/HuntingScene.ts`: Attached `ExplorationUIManager` during `create()`, moved zone title to top-right, prevented movement during open panels, and destroyed UI in `shutdown()`.

### 3. Key Design Decisions
- **Unified Exploration UI Coordinator**:
  - Encapsulated HUD instantiation, keyboard shortcut listeners, panel exclusivity (opening one panel automatically closes any other), and movement freezing in `ExplorationUIManager`.
- **Input Field Protection**:
  - Checked `document.activeElement` for `input`, `textarea`, or `contenteditable` before handling `I` or `M` shortcuts to prevent hotkey triggers while typing.
- **Quest Journal Deferred**:
  - Per the handbook instructions, Quest Journal (`Q` keybinding) is explicitly deferred to **Phase 21.7** rather than scaffolding an incomplete temporary panel.
- **Equipment Changes & Stat Reflection**:
  - Equipping or unequipping items triggers `onStateChange()`, which immediately recalculates effective stats, invokes `playerSessionManager.saveSession()`, and refreshes the HUD display.

### 4. Verification & Test Results
- **Automated Tests (`npm.cmd test`)**:
  - **35 test files passed** (373 tests passed, 0 failures).
- **TypeScript Check (`npx.cmd tsc --noEmit`)**:
  - 0 errors.
- **Production Build (`npm.cmd run build`)**:
  - Succeeded without errors.

### 5. Manual Verification Checklist (For Browser Testing)
- [ ] **HUD Visibility & Accuracy**:
  1. Boot game as "User".
  2. Confirm HUD appears in top-left in Beginners Village.
  3. Verify character name, level (1), HP (100/100), MP (50/50), EXP bar, and Gold balance (100 G) are accurately rendered.
  4. Walk into Beginners Hunting Ground. Confirm HUD persists accurately and does not duplicate.
- [ ] **Hotkeys & Buttons**:
  1. Press `I` to open the Inventory panel. Verify character movement ceases.
  2. Press `I` again or click Close to dismiss the inventory. Verify movement resumes.
  3. Press `M` to open the Mastery panel. Verify subject accuracies and levels are displayed.
  4. Press `M` again to close it.
  5. Click the "🎒 Bag" and "📖 Mastery" buttons on the HUD with the mouse to confirm point-and-click functionality.
- [ ] **Equipment Changes**:
  1. Open Inventory (`I`), equip a weapon (e.g. `wooden-sword`).
  2. Confirm equipment slot reflects the sword and player stats update.
  3. Close inventory and refresh page; confirm equipped state persists.

---

# Phase 21.5 — Village Merchant and Shop Interface

**Date**: 2026-11-08  
**Phase**: 21.5  
**Status**: Implemented — manual verification pending  

### 1. Executive Summary
Phase 21.5 connects the headless `ShopService`, `ShopRegistry`, and catalog definitions to an interactive merchant NPC in Beginners Village.

A dedicated merchant NPC (`Merchant Barnaby`) was registered in Beginners Village Plaza with a distinct warm merchant color and interaction prompt. Approaching Barnaby displays an interaction prompt (`🏪 Merchant Barnaby [SPACE / ENTER] Trade / Shop`). Interacting opens the focused `ShopModal` overlay featuring full Buy and Sell tabs, real-time Gold balance display, item descriptions, and responsive transaction feedback. All successful transactions update active inventory and currency, trigger immediate HUD updates, and safely auto-save player session progress.

### 2. Files Created and Modified
- **New Files**:
  - `src/ui/shop-modal/ShopModal.ts`: Focused DOM modal overlay featuring Buy Catalog, Sell Inventory, live Gold balance, transaction validation, and rapid-click debounce protection.
  - `src/ui/shop-modal/shop-modal.css`: Dark fantasy shop styling for tabs, item rows, prices, and status feedback.
  - `src/ui/shop-modal/index.ts`: Barrel export for `ShopModal`.
  - `tests/economy/phase21_5_shop.test.ts`: Automated unit test suite verifying merchant resolution, insufficient Gold prevention, inventory fullness rollback, valid purchases, selling calculations, and invalid quantity rejections.
- **Modified Files**:
  - `src/quests/NPCRegistry.ts`: Added `Merchant Barnaby` (`merchant-barnaby`) in Beginners Village plaza (`{ x: 750, y: 520 }`).
  - `src/economy/ShopRegistry.ts`: Assigned `merchant-barnaby` as merchant for `village-general-store`; added `getShopForMerchant(merchantNpcId)` lookup helper.
  - `src/ui/index.ts`: Exported `ShopModal`.
  - `src/scenes/VillageScene.ts`: Detected merchant NPCs in proximity to render `Trade / Shop` prompt, wired interaction to launch `ShopModal`, halted movement while shopping, refreshed HUD on transaction, and cleaned up modal in `shutdown()`.

### 3. Key Architectural Decisions
- **Decoupled Headless Transaction Engine**:
  - `ShopModal` delegates completely to `ShopService.buyItem()` and `ShopService.sellItem()`. Prices, sell multipliers, and inventory capacity limits are enforced by domain rules rather than UI logic.
- **Atomic Operations & Full-Inventory Rollback**:
  - If a player attempts to purchase an item with a completely full inventory, the purchase is safely aborted without charging any Gold.
- **Equipped Gear Protection**:
  - The Sell tab explicitly filters out items currently worn in equipment slots, preventing accidental selling of equipped weapons or armor.
- **Session Persistence**:
  - Each completed trade immediately calls `playerSessionManager.saveSession()`, ensuring purchases survive browser reloads.

### 4. Verification & Test Results
- **Automated Tests (`npm.cmd test`)**:
  - **36 test files passed** (380 tests passed, 0 failures).
- **TypeScript Check (`npx.cmd tsc --noEmit`)**:
  - 0 errors.
- **Production Build (`npm.cmd run build`)**:
  - Succeeded without errors.

### 5. Manual Verification Checklist (For Browser Testing)
- [ ] **Merchant Interaction**:
  1. Boot game as "User" and spawn in Beginners Village.
  2. Walk right toward coordinates (750, 520).
  3. Confirm `Merchant Barnaby` is present and prompt displays `🏪 Merchant Barnaby [SPACE / ENTER] Trade / Shop`.
  4. Press Space or Enter to open the shop. Verify player movement is frozen.
- [ ] **Buying Items**:
  1. Under the "Buy Goods" tab, purchase a `Minor Health Potion` (10 G).
  2. Confirm Gold decreases by 10 G in both the shop header and top-left HUD.
  3. Close shop, press `I` to open Bag, and verify the potion is present in inventory.
- [ ] **Insufficient Gold Feedback**:
  1. Try to purchase an item costing more than current Gold.
  2. Verify an error message appears and no Gold is deducted.
- [ ] **Selling Items**:
  1. Open shop and select "Sell Spoils" tab.
  2. Sell an unequipped item (e.g. Slime Gel or potion).
  3. Confirm item count decreases and Gold is credited.
  4. Confirm currently equipped weapons/armor do not appear in the sell list.
- [ ] **Persistence**:
  1. Refresh browser (`F5`), load User session, and verify post-trade Gold and inventory remain intact.

---

# Phase 21.6 — Pause Menu and Settings

**Date**: 2026-11-08  
**Phase**: 21.6  
**Status**: Implemented — manual verification pending  

### 1. Executive Summary
Phase 21.6 introduces a full-featured pause overlay and persistent settings configuration for exploration scenes (`VillageScene` and `HuntingScene`).

Pressing `ESC` toggles the `PauseModal` overlay, freezing player movement. If an inventory or mastery panel is open when `ESC` is pressed, it safely dismisses the open panel first. The pause menu offers:
1. **Resume Game**: Seamlessly unfreezes player controls and dismisses the overlay.
2. **Settings**: Real-time slider controls for Master Volume, SFX Volume, and Music Volume, plus a toggle for showing damage numbers in combat. Adjustments immediately update and auto-persist to storage.
3. **Controls Guide**: Detailed reference for keyboard shortcuts (`WASD`/Arrows, `SPACE`/`ENTER`, `I`, `M`, `Q`, `ESC`).
4. **Return to Start Menu**: Safe exit workflow with a confirmation prompt and guaranteed pre-exit player state auto-save.

### 2. Files Created and Modified
- **New Files**:
  - `src/ui/pause-modal/PauseModal.ts`: DOM-layered pause menu supporting multi-view navigation (`menu`, `settings`, `controls`, `confirmQuit`), interactive settings sliders, and pre-exit auto-saving.
  - `src/ui/pause-modal/pause-modal.css`: Dark fantasy backdrop blur and card styling.
  - `src/ui/pause-modal/index.ts`: Public export for `PauseModal`.
  - `tests/ui/phase21_6_pause.test.ts`: Automated tests covering settings validation & clamping, live settings persistence in `PlayerSessionManager`, and pre-exit state saving.
- **Modified Files**:
  - `src/ui/exploration-hud/ExplorationUIManager.ts`: Registered `ESC` key listener, implemented hierarchical close order (open panels closed before toggling pause), suppressed `ESC` while typing in form inputs, and exposed `onQuitToMenu` callback.
  - `src/ui/index.ts`: Exported `PauseModal`.
  - `src/scenes/VillageScene.ts`: Passed `onQuitToMenu` callback to transition cleanly to `BootScene`.
  - `src/scenes/HuntingScene.ts`: Passed `onQuitToMenu` callback to transition cleanly to `BootScene`.

### 3. Key Design Decisions & Battle Isolation
- **Escape Key Hierarchy**:
  - If an `InventoryPanel` or `MasteryPanel` is open, pressing `ESC` closes that panel rather than layering a pause menu over it. Pressing `ESC` again when no panels are open activates the pause menu.
- **BattleScene Rule**:
  - As mandated by the handbook, pause is **unavailable during timed combat encounters** in `BattleScene`. Timers and combat answer submissions remain strictly synchronized to prevent out-of-order combat turns or invisible timer expiration.
- **Audio Settings Handling**:
  - Since raw audio assets and the presentation audio engine are planned for Phase 22.4, settings sliders currently persist to `GameSettings` in `storageService` without fabricating dummy web audio nodes.
- **Exit State Preservation**:
  - Clicking "Yes, Save & Exit" synchronously awaits `playerSessionManager.saveSession()` before invoking the scene fade transition back to `BootScene`.

### 4. Verification & Test Results
- **Automated Tests (`npm.cmd test`)**:
  - **37 test files passed** (383 tests passed, 0 failures).
- **TypeScript Check (`npx.cmd tsc --noEmit`)**:
  - 0 errors.
- **Production Build (`npm.cmd run build`)**:
  - Succeeded without errors.


---

# Phase 21.7 — Quest Journal and Core Gameplay UI Integration

**Date**: 2026-11-08  
**Phase**: 21.7  
**Status**: Completed  

### 1. Executive Summary
Phase 21.7 completes the core gameplay user interface by introducing an interactive Quest Journal modal overlay connected to `playerSessionManager.quests`, the `ExplorationHUD`, and the `ExplorationUIManager` shortcut coordinator (`Q` key).

Players can now track active and completed quests, view objective progress (monster kills, item collections, questions answered), check quest giver names and locations, preview completion rewards (combat EXP, gold, items), and monitor when quests become ready to turn in. Single-panel modal exclusivity guarantees clean UI interactions without overlapping dialogs.

### 2. Files Created and Modified
- **New Files**:
  - `src/ui/quest-journal/QuestJournal.ts`: DOM-based modal component rendering tabbed views ("Active Quests" and "Completed Quests"), objective status indicators, reward pills, and close handlers.
  - `src/ui/quest-journal/quest-journal.css`: Responsive CSS theme adhering to the Knowledge Realms retro-fantasy aesthetic.
  - `src/ui/quest-journal/index.ts`: Barrel export for `QuestJournal`.
  - `tests/ui/phase21_7_quest_journal.test.ts`: Unit tests verifying quest active/completed tab partitioning, objective progress tracking, turn-in readiness, reward inspection, and headless compatibility.
- **Modified Files**:
  - `src/ui/index.ts`: Added barrel export for `QuestJournal`.
  - `src/ui/exploration-hud/ExplorationHUD.ts`: Added `📜 Quests [Q]` shortcut button in the HUD footer bar and wired `onOpenQuests` callback.
  - `src/ui/exploration-hud/ExplorationUIManager.ts`:
    - Added `Q` key input registration (`keyQ`).
    - Added `activeQuestJournal` state, `toggleQuests()`, `openQuests()`, and `closeQuests()`.
    - Added `closeAllModals()` to enforce modal exclusivity: opening Inventory, Mastery, Quests, or Pause cleanly dismisses any other open panel.
    - Updated `isPanelOpen()` and `handleEscape()` to prioritize closing the Quest Journal when open.

### 3. Key Design Decisions & Exclusivity Rules
- **Single-Panel Exclusivity**:
  - Opening the Quest Journal (`Q` or HUD button) automatically closes any open Bag (`I`) or Mastery (`M`) panel.
  - Conversely, opening the Bag or Mastery panel automatically closes the Quest Journal.
- **Escape Key Integration**:
  - If the Quest Journal is currently visible, pressing `ESC` immediately closes it and returns control to exploration. Only when all panels are closed does `ESC` trigger the Pause Menu.
- **Movement Suspension**:
  - When the Quest Journal opens, `inputAdapter.suspendMovement()` freezes player movement and velocity. Movement resumes immediately when the modal is closed via `Q`, `ESC`, or the close button (`×`).
- **Dynamic Tab Refreshing**:
  - The journal renders real-time objective counts (`currentCount / requiredCount`), highlights completed objectives with distinct styling, marks quests with `Ready to Turn In` badges, and separates finished quests into a dedicated `Completed` tab with timestamp sorting.

### 4. Verification & Test Results
- **Automated Tests (`npm.cmd test`)**:
  - **38 test files passed** (387 tests passed, 0 failures).
- **TypeScript Check (`npx.cmd tsc --noEmit`)**:
  - 0 errors.
- **Production Build (`npm.cmd run build`)**:
  - Succeeded without errors (`tsc && vite build`).

### 5. Manual Verification Checklist (For Browser Testing)
- [ ] **Open via Keyboard & HUD**:
  1. Boot game as "User" and enter Beginners Village.
  2. Press `Q`. Confirm Quest Journal opens and player cannot move while open.
  3. Press `Q` again. Confirm Quest Journal closes and movement resumes.
  4. Click the `📜 Quests [Q]` button in the bottom HUD. Confirm the journal opens.
- [ ] **Modal Exclusivity**:
  1. Press `Q` to open the Quest Journal.
  2. Press `I`. Verify the Quest Journal closes and the Bag panel opens.
  3. Press `M`. Verify Bag closes and Mastery panel opens.
  4. Press `Q`. Verify Mastery closes and Quest Journal opens.
- [ ] **Escape Key Behavior**:
  1. With Quest Journal open, press `ESC`. Verify Quest Journal closes and Pause Menu does NOT open.
  2. Press `ESC` again. Verify Pause Menu opens.
- [ ] **Quest Progress Tracking**:
  1. Speak with Elder Aldous to accept the "Slime Infestation" quest.
  2. Open Quest Journal (`Q`). Verify quest appears under "Active (1)" with "0 / 2 Defeat Forest Slimes" and giver "Elder Aldous".
  3. Enter Hunting Grounds and defeat 2 Forest Slimes.
  4. Open Quest Journal (`Q`). Verify objective displays "2 / 2" and badge updates to "Ready to Turn In".
  5. Return to Elder Aldous and turn in the quest.
  6. Open Quest Journal (`Q`) and click the "Completed (1)" tab. Verify quest is archived with "Completed" status.

---

# Phase 21.8 — End-to-End Core Loop Regression

**Date**: 2026-11-08  
**Phase**: 21.8  
**Status**: Completed  

### 1. Executive Summary
Phase 21.8 serves as the quality-assurance gate and end-to-end integration verification concluding Phase 21. It validates that the entire single-player loop operates reliably as one interconnected system across boot, role selection, village exploration, dialogue, quest acceptance, shop trading, subject hunting zone transitions, turn-based educational combat, reward claiming, defeat recovery, safe saving, browser refresh rehydration, and Super Admin question synchronization.

All 27 journey steps specified in the Development Prompt Handbook passed with zero regressions. An automated regression test suite was added to continuously protect the core loop across all future phases.

### 2. Files Created and Modified
- **New Files**:
  - `tests/integration/phase21_8_core_loop_regression.test.ts`: Automated regression suite covering the complete 27-step core loop journey from boot to combat, economy, quests, and admin question synchronization.
  - `docs/PHASE_21_8_CORE_LOOP_QA_REPORT.md`: Comprehensive QA classification matrix and audit dimension breakdown.
- **Modified Files**:
  - `docs/IMPLEMENTATION_REPORTS.md`: Consolidated master implementation report updated with Phase 21.8.

### 3. Verification & Test Results
- **Automated Tests (`npm.cmd test`)**:
  - **39 test files passed** (394 tests passed, 0 failures).
- **TypeScript Check (`npx.cmd tsc --noEmit`)**:
  - 0 errors.
- **Production Build (`npm.cmd run build`)**:
  - Succeeded without errors (`tsc && vite build`).

---

# Phase 22.1 — Player and Monster Animation States

**Date**: 2026-11-08  
**Phase**: 22.1  
**Status**: Completed  

### 1. Executive Summary
Phase 22.1 implements a coherent animation-state layer for player movement and monster entities across `VillageScene`, `HuntingScene`, and `MonsterSprite`.

A procedural sprite generation pipeline (`ProceduralAnimationBuilder`) was developed to render multi-frame directional animations (`down`, `up`, `left`, `right`) with walking leg cycles, idle stabilization, and attack/hurt cues without assuming nonexistent external asset sheets. Pure directional and animation state selection logic was decoupled into `AnimationStateCoordinator` and thoroughly unit-tested.

### 2. Files Created and Modified
- **New Files**:
  - `src/scenes/animations/AnimationStateCoordinator.ts`: Pure functions for resolving cardinal directions (`down`, `up`, `left`, `right`), dominant axes on diagonals, and priority-based animation state selection.
  - `src/scenes/animations/ProceduralAnimationBuilder.ts`: Procedural texture and animation generator creating 4-direction idle, walk, and attack frames at 28x36px resolution.
  - `src/scenes/animations/index.ts`: Barrel export.
  - `tests/scenes/phase22_1_animation_states.test.ts`: Automated unit tests for directional vector resolution, stationary direction preservation, and animation key selection.
  - `docs/PHASE_22_1_IMPLEMENTATION_REPORT.md`: Standalone report with asset requirement list.
- **Modified Files**:
  - `src/scenes/VillageScene.ts`: Integrated player directional walk and idle animations, maintaining facing when stationary or when opening modals.
  - `src/scenes/HuntingScene.ts`: Integrated player directional walk and idle animations.
  - `src/scenes/monsters/MonsterSprite.ts`: Added animation state tracking and `setAnimationState()` supporting `idle`, `walk`, `attack`, `hurt`, and `defeat` visual tweens.
  - `docs/IMPLEMENTATION_REPORTS.md`: Consolidated master implementation report updated with Phase 22.1.

### 3. Verification & Test Results
- **Automated Tests (`npm.cmd test`)**:
  - **40 test files passed** (401 tests passed, 0 failures).
- **TypeScript Check (`npx.cmd tsc --noEmit`)**:
  - 0 errors.
- **Production Build (`npm.cmd run build`)**:
  - Succeeded without errors (`tsc && vite build`).

---

# Phase 22.2 — Combat Visual Feedback

**Date**: 2026-11-08  
**Phase**: 22.2  
**Status**: Completed  

### 1. Executive Summary
Phase 22.2 establishes clear, satisfying visual and UI feedback for educational turn-based combat encounters in `BattleScene` and `BattleOverlay`.

Turn results computed authoritatively by `BattleSession` are transformed via a pure headless adapter (`CombatFeedbackMapper`) into floating damage indicators, critical-hit highlights, animated hit flashes, and status badges (`CORRECT!`, `CRITICAL HIT!`, `INCORRECT!`, `TIME UP!`). Health bars animate with clamped percentage calculations, and end-of-battle outcome screens guarantee that committed rewards (Combat EXP, Gold, Item drops, and Mastery gains) are presented accurately without UI-level recalculation.

### 2. Files Created and Modified
- **New Files**:
  - `src/combat/CombatFeedbackMapper.ts`: Headless pure transformer mapping `CombatTurnResult` into visual combat cues (`damageAmount`, `isCritical`, `displayText`, `statusBadge`, `badgeClass`, `soundCue`, and clamped health percentage calculations).
  - `tests/combat/phase22_2_combat_feedback.test.ts`: Automated unit tests verifying critical hit text formatting, timeout outcomes, retaliation damage, `showDamageNumbers` settings toggle, and percentage bounding.
  - `docs/PHASE_22_2_IMPLEMENTATION_REPORT.md`: Standalone report.
- **Modified Files**:
  - `src/ui/battle-overlay/battle-overlay.css`: Added styled badges for `.combat-badge--correct`, `.combat-badge--critical`, `.combat-badge--incorrect`, and `.combat-badge--timeout` with animated CSS keyframe pulsing for critical hits.
  - `src/ui/battle-overlay/BattleOverlay.ts`: Integrated clamped HP percentages and rich badge rendering in `showLogMessage(message, feedback)`.
  - `src/scenes/BattleScene.ts`: Integrated `formatCombatFeedback()`, spawned animated floating damage numbers over targets (`spawnFloatingText`), applied critical hit bold styling, and passed structured feedback into the overlay.
  - `docs/IMPLEMENTATION_REPORTS.md`: Consolidated master implementation report updated with Phase 22.2.

### 3. Verification & Test Results
- **Automated Tests (`npm.cmd test`)**:
  - **41 test files passed** (406 tests passed, 0 failures).
- **TypeScript Check (`npx.cmd tsc --noEmit`)**:
  - 0 errors.
- **Production Build (`npm.cmd run build`)**:
  - Succeeded without errors (`tsc && vite build`).

---

# Phase 22.3 — Scene Transitions and Interaction Feedback

**Date**: 2026-11-08  
**Phase**: 22.3  
**Status**: Completed  

### 1. Executive Summary
Phase 22.3 enhances scene navigation, camera fades, portal transitions, and interaction reliability across `VillageScene`, `HuntingScene`, and `BattleScene`.

Camera transitions now feature uniform bidirectional fades (250ms duration) to eliminate scene popping. An interaction throttling and state locking guard (`InteractionGuard`) protects against rapid repeated portal activations, button spamming, and duplicate modal openings. Proximity evaluations were standardized using pure Chebyshev distance calculations (`isWithinInteractionRange`) to ensure consistent prompt visibility without overlapping artifacts.

### 2. Files Created and Modified
- **New Files**:
  - `src/scenes/interactions/InteractionGuard.ts`: Headless pure helper managing interaction throttling (`cooldownMs`), manual transition locking (`setLocked`), and Chebyshev proximity thresholding (`isWithinInteractionRange`).
  - `src/scenes/interactions/index.ts`: Barrel export.
  - `tests/scenes/phase22_3_scene_transitions.test.ts`: Automated unit tests for cooldown throttling, manual locking, and distance calculations.
  - `docs/PHASE_22_3_IMPLEMENTATION_REPORT.md`: Standalone report.
- **Modified Files**:
  - `src/scenes/VillageScene.ts`: Added camera `fadeIn(250)` on scene creation, integrated `InteractionGuard` to throttle interactions and lock input during scene fades, and standardized transition timing.
  - `src/scenes/HuntingScene.ts`: Added camera `fadeIn(250)`, guarded monster encounter initiation with `interactionGuard.canTrigger()`, locked input on zone exits, and ensured active monster tweens are cleanly defeated on transition.
  - `src/scenes/BattleScene.ts`: Added camera `fadeIn(250)` on battle start and smooth fade-out on battle exit.
  - `docs/IMPLEMENTATION_REPORTS.md`: Consolidated master implementation report updated with Phase 22.3.

### 3. Verification & Test Results
- **Automated Tests (`npm.cmd test`)**:
  - **42 test files passed** (410 tests passed, 0 failures).
- **TypeScript Check (`npx.cmd tsc --noEmit`)**:
  - 0 errors.
- **Production Build (`npm.cmd run build`)**:
  - Succeeded without errors (`tsc && vite build`).

---

# Phase 22.4 — Audio System

**Date**: 2026-11-08  
**Phase**: 22.4  
**Status**: Completed  

### 1. Executive Summary
Phase 22.4 implements a centralized, maintainable audio architecture for Knowledge Realms via `AudioManager`.

Because the project currently has no static audio files (`.mp3`, `.ogg`, `.wav`), `AudioManager` handles volume scaling (`effectiveVolume = masterVolume * channelVolume`), background track deduping (preventing duplicate restarts when transitioning between scenes), and mute toggling. An integrated procedural Web Audio synthesizer provides auditory feedback for combat cues (`sfx-attack`, `sfx-crit`, `sfx-hurt`, `sfx-timeout`) without external assets or CDN dependencies, while safely handling browser autoplay policies. A production audio asset specification has been documented for future audio drops.

### 2. Files Created and Modified
- **New Files**:
  - `src/audio/AudioManager.ts`: Centralized audio manager with volume scaling, track deduping, and procedural tone fallback.
  - `src/audio/index.ts`: Barrel export.
  - `tests/audio/phase22_4_audio_system.test.ts`: Automated unit test suite verifying volume calculations, muting behavior, track deduping, and SFX trigger validation.
  - `docs/PHASE_22_4_IMPLEMENTATION_REPORT.md`: Standalone report with required audio asset list.
- **Modified Files**:
  - `src/player/PlayerSessionManager.ts`: Synchronized `audioManager.updateSettings()` with player session settings.
  - `src/scenes/VillageScene.ts`: Integrated ambient BGM request (`bgm-village`).
  - `src/scenes/HuntingScene.ts`: Integrated wilderness BGM request (`bgm-wilderness`).
  - `src/scenes/BattleScene.ts`: Integrated combat BGM request (`bgm-combat`) and wired combat SFX triggers (`sfx-attack`, `sfx-crit`, `sfx-hurt`, `sfx-timeout`).
  - `docs/IMPLEMENTATION_REPORTS.md`: Consolidated master implementation report updated with Phase 22.4.

### 3. Verification & Test Results
- **Automated Tests (`npm.cmd test`)**:
  - **43 test files passed** (414 tests passed, 0 failures).
- **TypeScript Check (`npx.cmd tsc --noEmit`)**:
  - 0 errors.
- **Production Build (`npm.cmd run build`)**:
  - Succeeded without errors (`tsc && vite build`).

---

# Phase 22.5 — Responsive UI and Accessibility

**Date**: 2026-11-08  
**Phase**: 22.5  
**Status**: Completed  

### 1. Executive Summary
Phase 22.5 implements responsive adaptations, accessibility compliance, and screen form-factor handling across the HTML/CSS DOM overlays and Phaser canvas presentation.

Styles were added in `accessibility.css` to enforce keyboard focus rings (`:focus-visible`), readable contrast tokens, modal bounds clamping (`max-width: 95vw; max-height: 95vh; overflow-y: auto`), screen-reader helpers (`.sr-only`), and system-level reduced motion support (`@media (prefers-reduced-motion: reduce)`). Pure layout helpers in `responsiveLayout.ts` classify viewports into form factors (`compact`, `standard`, `wide`, `ultrawide`) and clamp modal bounds.

### 2. Files Created and Modified
- **New Files**:
  - `src/ui/accessibility.css`: Global styles for interactive focus rings, screen-reader text, reduced-motion overrides, and responsive modal bounds.
  - `src/ui/responsiveLayout.ts`: Pure headless layout helpers (`classifyScreenFormFactor`, `computeModalBounds`).
  - `tests/ui/phase22_5_responsive_ui.test.ts`: Automated unit test suite verifying form factor classification and modal dimension clamping.
  - `docs/PHASE_22_5_IMPLEMENTATION_REPORT.md`: Standalone report with resolution test matrix.
- **Modified Files**:
  - `src/ui/index.ts`: Imported `accessibility.css`.
  - `docs/IMPLEMENTATION_REPORTS.md`: Consolidated master implementation report updated with Phase 22.5.

### 3. Verification & Test Results
- **Automated Tests (`npm.cmd test`)**:
  - **44 test files passed** (416 tests passed, 0 failures).
- **TypeScript Check (`npx.cmd tsc --noEmit`)**:
  - 0 errors.
- **Production Build (`npm.cmd run build`)**:
  - Succeeded without errors (`tsc && vite build`).

---

# Phase 23.1 — Skill Domain Model

**Date**: 2026-11-08  
**Phase**: 23.1  
**Status**: Completed  

### 1. Executive Summary
Phase 23.1 implements the typed, data-driven foundation for active and passive knowledge skills without building presentation UI yet.

A domain model was established in `src/skills/` specifying skill classifications (`active` vs `passive`), safe typed effect primitives (`damage-boost-percent`, `flat-attack-bonus`, `crit-rate-bonus`, `shield-absorption`, etc.), unlock prerequisites (subject mastery level, character level, prerequisite skill IDs, and gold costs), and per-level scaling parameters. A headless `SkillManager` handles player skill unlocks, hotbar assignments, validation, and backward-compatible persistence into `PlayerSessionManager` and `SaveData`.

### 2. Files Created and Modified
- **New Files**:
  - `src/skills/SkillTypes.ts`: Type contracts defining `SkillDefinition`, `SkillType`, `SkillEffect`, `SkillEffectType`, `SkillUnlockRequirements`, `PlayerSkillRecord`, and `PlayerSkillsState`.
  - `src/skills/SkillValidator.ts`: Pure schema validator for skill configurations and effect definitions.
  - `src/skills/SkillRegistry.ts`: Static registry of baseline subject skills.
  - `src/skills/SkillManager.ts`: Headless manager coordinating unlock evaluations, prerequisite checking, gold deductions, skill upgrades, hotbar equipping, and state loading.
  - `src/skills/index.ts`: Barrel export.
  - `tests/skills/phase23_1_skill_model.test.ts`: Automated unit test suite verifying schema validation, prerequisite enforcement, mastery gates, gold deductions, hotbar equipping, and save state hydration.
  - `docs/PHASE_23_1_IMPLEMENTATION_REPORT.md`: Standalone report.
- **Modified Files**:
  - `src/storage/StorageTypes.ts`: Extended `SaveData` schema with optional backward-compatible `skills?: PlayerSkillsState`.
  - `src/storage/SaveDataValidator.ts`: Added validation for candidate `skills` state.
  - `src/player/PlayerSessionManager.ts`: Added `skills: SkillManager` property, hydrated skills during session load, included `skills: this.skills.getState()` in save snapshots.
  - `docs/IMPLEMENTATION_REPORTS.md`: Consolidated master report updated with Phase 23.1.

### 3. Verification & Test Results
- **Automated Tests (`npm.cmd test`)**:
  - **45 test files passed** (423 tests passed, 0 failures).
- **TypeScript Check (`npx.cmd tsc --noEmit`)**:
  - 0 errors.
- **Production Build (`npm.cmd run build`)**:
  - Succeeded without errors (`tsc && vite build`).

---

# Phase 23.2 — Subject-Specific Skill Trees

**Date**: 2026-11-08  
**Phase**: 23.2  
**Status**: Completed  

### 1. Executive Summary
Phase 23.2 connects academic subject mastery to unlockable knowledge-themed skill trees for Mathematics, Science, and General Knowledge.

Directed Acyclic Graph (DAG) structures were established with explicit root nodes, prerequisite linkages, and tier levels. A graph validation engine (`validateSkillTreeDAG`) was implemented using depth-first search (DFS) to detect circular dependencies (loops), missing prerequisites, and subject cross-contamination. Unit tests verify that subject mastery trees operate independently, and skills cannot be unlocked multiple times past their maximum level caps.

### 2. Files Created and Modified
- **New Files**:
  - `src/skills/SkillTreeTypes.ts`: Type contracts defining `SkillTreeNode`, `SubjectSkillTree`, and `SkillTreeValidationResult`.
  - `src/skills/SkillTreeValidator.ts`: Graph validation utility verifying tree integrity and cycle absence via DFS.
  - `src/skills/SkillTreeRegistry.ts`: Configurable skill trees for `Mathematics`, `Science`, and `GeneralKnowledge` (`MATHEMATICS_SKILL_TREE`, `SCIENCE_SKILL_TREE`, `GENERAL_KNOWLEDGE_SKILL_TREE`).
  - `tests/skills/phase23_2_skill_trees.test.ts`: Automated unit test suite verifying DAG validity, cycle detection, missing prerequisites reporting, and subject isolation.
  - `docs/PHASE_23_2_IMPLEMENTATION_REPORT.md`: Standalone report.
- **Modified Files**:
  - `src/skills/SkillRegistry.ts`: Re-exported skills from `SkillTreeRegistry`.
  - `src/skills/index.ts`: Barrel export.
  - `docs/IMPLEMENTATION_REPORTS.md`: Consolidated master report updated with Phase 23.2.

### 3. Verification & Test Results
- **Automated Tests (`npm.cmd test`)**:
  - **46 test files passed** (429 tests passed, 0 failures).
- **TypeScript Check (`npx.cmd tsc --noEmit`)**:
  - 0 errors.
- **Production Build (`npm.cmd run build`)**:
  - Succeeded without errors (`tsc && vite build`).

---

# Phase 23.3 — Active Skills and Combat Integration

**Date**: 2026-11-08  
**Phase**: 23.3  
**Status**: Completed  

### 1. Executive Summary
Phase 23.3 integrates active skills into the headless combat system (`BattleSession`) and visual combat scenes (`BattleScene`) in Knowledge Realms, strictly adhering to the directive that **skills modify player and monster parameters but NEVER bypass educational question answering**.

A headless `CombatSkillTracker` was developed to manage turn-based cooldowns, timed buffs (e.g., percentage damage amplifications), and active shield damage absorption across combat turns. `BattleSession.activateSkill` provides strict activation gating: verifying battle state machine validity, skill availability, unlock records, turn cooldowns, and MP costs (deducting MP only when accepted). Successful answers apply damage multipliers, incorrect answers or timeouts check shield absorption before damaging player HP, and end-of-turn advancement decrements cooldowns and buff counters. Combat end summaries now record remaining player MP alongside remaining HP and synchronise back to the active `PlayerSessionManager`.

### 2. Files Created and Modified
- **New Files**:
  - `src/combat/CombatSkillTracker.ts`: Headless combat skill modifier tracker handling cooldowns, buffs (`ActiveBuff`), shield absorption (`absorbDamage`), and turn advancement (`advanceTurn`).
  - `tests/combat/phase23_3_active_skills.test.ts`: 13 comprehensive unit tests covering activation validation, MP deduction, cooldowns, passive/PvP restrictions, damage boosting, shield absorption, direct healing, turn advancement, and end summary MP tracking.
  - `docs/PHASE_23_3_IMPLEMENTATION_REPORT.md`: Standalone report.
- **Modified Files**:
  - `src/combat/BattleState.ts`: Added `playerCurrentMp` and `playerMaxMp` to `BattleState`, and `remainingPlayerMp` to `BattleEndSummary`.
  - `src/combat/BattleSession.ts`: Added `skillManager?: SkillManager` and `skillTracker: CombatSkillTracker`; implemented `activateSkill()`; integrated damage multiplier, shield absorption, and turn advancement.
  - `src/scenes/BattleScene.ts`: Injected `skillManager: playerSessionManager.skills` into `BattleSession`; synced `this.player.currentMp = summary.remainingPlayerMp` on battle conclusion.
  - `docs/IMPLEMENTATION_REPORTS.md`: Consolidated master report updated with Phase 23.3.

### 3. Verification & Test Results
- **Automated Tests (`npm.cmd test`)**:
  - **47 test files passed** (442 tests passed, 0 failures).
  - `tests/combat/phase23_3_active_skills.test.ts`: 13/13 passed.
- **TypeScript Check (`npx.cmd tsc --noEmit`)**:
  - 0 errors.
- **Production Build (`npm.cmd run build`)**:
  - Succeeded without errors (`tsc && vite build`).

---

# Phase 23.4 — Passive Skills and Mastery Unlocks

**Date**: 2026-11-08  
**Phase**: 23.4  
**Status**: Completed  

### 1. Executive Summary
Phase 23.4 implements passive skills and their safe integration into derived stats, equipment calculations, and combat encounters without ever violating core game design principles.

A headless `PassiveSkillCalculator` service was developed to compute aggregated passive bonuses:
- **Base Stat Invariance**: `PlayerData` base stats are never mutated directly; derived attributes are computed in an immutable modifier pipeline.
- **Delineated Modifiers**: Base stats, equipment bonuses, and passive bonuses remain cleanly distinguished in `EquipmentStatCalculator`.
- **Deduplication Guarantee**: Unlocked passives apply strictly once at their current level.
- **Safety Caps**: Enforced maximum caps (e.g., 50% crit rate, 50% mana cost reduction, 3.0x EXP multiplier) prevent balance exploits.
- **Mode Validation**: PvP-only skills do not activate in PvE combat.
- **Combat Integration**: Passive defense decreases incoming monster damage; passive crit chance augments player critical attacks; passive mana cost reduction lowers active skill MP costs; passive EXP multipliers scale victory combat EXP rewards.

### 2. Files Created and Modified
- **New Files**:
  - `src/skills/PassiveSkillCalculator.ts`: Headless passive calculator with deduplication, mode checking, and safety caps.
  - `tests/skills/phase23_4_passive_skills.test.ts`: 8 comprehensive tests covering base stat invariance, distinct layers, deduplication, stacking, safety caps, mode eligibility, and BattleSession combat integration.
  - `docs/PHASE_23_4_IMPLEMENTATION_REPORT.md`: Standalone report.
- **Modified Files**:
  - `src/inventory/EquipmentStatCalculator.ts`: Extended `calculateEffectiveStats` to accept passive bonuses and include them distinctly in `EffectiveCharacterStats`.
  - `src/skills/index.ts`: Exported `PassiveSkillCalculator` and `passiveSkillCalculator`.
  - `src/combat/BattleSession.ts`: Integrated passive defense, crit rate, mana reduction, and EXP multiplier.
  - `tests/combat/phase23_3_active_skills.test.ts`: Configured question count to 5 for multi-turn cooldown regression test.
  - `docs/IMPLEMENTATION_REPORTS.md`: Consolidated master report updated with Phase 23.4.

### 3. Verification & Test Results
- **Automated Tests (`npm.cmd test`)**:
  - **48 test files passed** (450 tests passed, 0 failures).
  - `tests/skills/phase23_4_passive_skills.test.ts`: 8/8 passed.
- **TypeScript Check (`npx.cmd tsc --noEmit`)**:
  - 0 errors.
- **Production Build (`npm.cmd run build`)**:
  - Succeeded without errors (`tsc && vite build`).

---

# Phase 23.5 — Skill UI and Upgrades

**Date**: 2026-11-08  
**Phase**: 23.5  
**Status**: Completed  

### 1. Executive Summary
Phase 23.5 introduces the presentation and interaction overlay for Knowledge Realms' skill progression system. It enables players to view full-screen skill trees organized by academic subject (`Mathematics`, `Science`, `General Knowledge`), inspect skill prerequisites and scaling effects, unlock or upgrade skills using accumulated Gold and Subject Mastery, manage an active skill hotbar for combat, and monitor live passive bonus aggregations.

The UI is constructed following the canonical DOM modal overlay architecture (`src/ui/skill-modal/`) and is integrated into the exploration user experience alongside existing systems (Inventory, Quest Journal, Subject Mastery, Pause Menu). A dedicated `K` hotkey and an on-screen HUD button allow players to toggle the skill modal during exploration in `VillageScene` and `HuntingScene`.

### 2. Files Created and Modified
- **New Files**:
  - `src/ui/skill-modal/SkillModal.ts`: Modal component managing tabbed subject trees, node state evaluation (`locked`, `available`, `unlocked`, `maxed`), node selection and inspection, skill unlocking/upgrading with Gold deductions, and hotbar equipping/unequipping.
  - `src/ui/skill-modal/skill-modal.css`: BEM-styled styling matching the fantasy pixel RPG aesthetic.
  - `src/ui/skill-modal/index.ts`: Barrel export.
  - `tests/ui/phase23_5_skill_modal.test.ts`: Automated unit test suite verifying skill tree partitioning, unlock/upgrade prerequisite evaluation against player level/mastery/gold, active hotbar equips/unequips, and passive bonus calculation.
  - `docs/PHASE_23_5_IMPLEMENTATION_REPORT.md`: Standalone phase implementation report.
- **Modified Files**:
  - `src/ui/index.ts`: Re-exported `SkillModal` and its option types.
  - `src/ui/exploration-hud/ExplorationHUD.ts`: Added `Skills (K)` interactive HUD button and wiring.
  - `src/ui/exploration-hud/ExplorationUIManager.ts`: Integrated `SkillModal` instance lifecycle, modal mutually exclusive focus, `K` keyboard listener, and escape closure.
  - `src/ui/pause-modal/PauseModal.ts`: Added `Skills & Hotbar (K)` entry in Controls reference guide.
  - `src/combat/BattleSession.ts`: Cleaned up passive bonus application to player combat crit rate.
  - `src/inventory/EquipmentStatCalculator.ts`: Normalized passive critical strike modifier calculations.
  - `docs/IMPLEMENTATION_REPORTS.md`: Consolidated master tracker updated with Phase 23.5.

### 3. Verification & Test Results
- **Automated Tests (`npm.cmd test`)**:
  - **49 test files passed** (454 tests passed, 0 failures).
  - `tests/ui/phase23_5_skill_modal.test.ts`: 4/4 passed.
  - `tests/integration/phase21_8_core_loop_regression.test.ts`: 7/7 passed.
- **TypeScript Check (`npx.cmd tsc --noEmit`)**:
  - 0 errors.
  - Strict typing enforced across all files.
- **Production Build (`npm.cmd run build`)**:
  - Succeeded without errors (`tsc && vite build`).

---

# Phase 24 — Village Bank & Commerce UI Integration

**Date**: 2026-11-08  
**Phase**: 24  
**Status**: Completed  

### 1. Executive Summary
Phase 24 establishes the presentation, interaction, and persistence layers for the local municipal economy in Knowledge Realms. Building upon headless services (`BankService`, `CurrencyService`, `BankTypes`), this phase implements:
1. **Interactive Bank & Treasury UI Overlay (`BankModal`)**: A multi-tabbed HTML/CSS DOM modal overlay providing:
   - **Savings & Vault Tab**: Secure deposit and withdrawal with preset shortcuts (`+10`, `+50`, `+100`, `All`), vault capacity clamping, and manual compound interest collection.
   - **Venture Investments Tab**: Capital underwriting for municipal projects (`Apothecary Herb Expedition`, `Regional Trade Caravan`, `Crystal Deep Shaft Prospecting`) with maturation durations and calculated profit payouts.
   - **Commercial Enterprises Tab**: Inspection of municipal workshops, staffing, daily gross revenues, overhead costs, and net margins.
2. **Village Banker NPC (`Treasurer Aurelius`)**: Placed in `Beginners Village` plaza near other town services with dedicated dialogue and direct interaction binding to open the `BankModal`.
3. **Save/Load Persistence**: Hydration of `BankState` (savings balance, last interest timestamp, active investments, and businesses) into `PlayerSessionManager` and the IndexedDB `SaveData` schema with full backward-compatibility validation.

### 2. Files Created and Modified
- **New Files**:
  - `src/ui/bank-modal/BankModal.ts`: DOM modal overlay implementing savings deposits/withdrawals, venture investments, timer maturation, and enterprise inspection.
  - `src/ui/bank-modal/bank-modal.css`: BEM-styled styling matching the pixel fantasy aesthetic.
  - `src/ui/bank-modal/index.ts`: Barrel export.
  - `src/economy/BankRegistry.ts`: Catalog of venture investment opportunities (`AVAILABLE_INVESTMENTS`) and municipal enterprises (`AVAILABLE_BUSINESSES`).
  - `tests/economy/phase24_bank.test.ts`: Automated test suite covering savings deposits, overdraw/capacity guards, compound interest accrual, investment maturation/payouts, enterprise profit margins, Banker NPC definition, and session persistence.
  - `docs/PHASE_24_IMPLEMENTATION_REPORT.md`: Standalone phase implementation report.
- **Modified Files**:
  - `src/economy/BankTypes.ts`: Added `BankState` contract.
  - `src/economy/BankService.ts`: Added `loadState()`, `getState()`, `getConfig()`, `getActiveInvestments()`, and `getAllBusinesses()`.
  - `src/economy/index.ts`: Exported `BankRegistry`.
  - `src/storage/StorageTypes.ts`: Added optional `bank?: BankState` to `SaveData`.
  - `src/storage/SaveDataValidator.ts`: Added backward-compatible validation and sanitization for `bank` state.
  - `src/player/PlayerSessionManager.ts`: Integrated `bank` service coordinator, load hydration, snapshot serialization, and auto-save triggers.
  - `src/quests/NPCTypes.ts`: Added `NPCType.Banker`.
  - `src/quests/NPCRegistry.ts`: Registered `treasurer-aurelius` in Beginners Village.
  - `src/scenes/VillageScene.ts`: Added Banker proximity detection, interaction trigger for `BankModal`, auto-save on transactions, and cleanup on scene shutdown.
  - `src/ui/index.ts`: Exported `BankModal`.
  - `docs/IMPLEMENTATION_REPORTS.md`: Consolidated master tracker updated with Phase 24.

### 3. Verification & Test Results
- **Automated Tests (`npm.cmd test`)**:
  - **50 test files passed** (461 tests passed, 0 failures).
  - `tests/economy/phase24_bank.test.ts`: 7/7 passed.
  - `tests/integration/phase21_8_core_loop_regression.test.ts`: 7/7 passed.
- **TypeScript Check (`npx.cmd tsc --noEmit`)**:
  - 0 errors.
  - Strict typing enforced across all files.
- **Production Build (`npm.cmd run build`)**:
  - Succeeded without errors (`tsc && vite build`).

---

# Phase 25 — Colosseum & Arena Mock Duel Systems

**Date**: 2026-11-08  
**Phase**: 25  
**Status**: Completed  

### 1. Executive Summary
Phase 25 implements the presentation, duel orchestrator, and interactive Colosseum sparring mode in Knowledge Realms. Built around the **Reverse Difficulty Principle** specified in `docs/PVP_RULES.md`, this system introduces an educational handicap balancing mechanism:
- **Underleveled Combatants**: When facing a higher-level opponent, the underleveled player receives harder, higher-tier questions (e.g., Senior High / Difficulty 5, tighter timers) to compensate for the higher-level player's RPG stats.
- **Overleveled Combatants**: When facing lower-level opponents, higher-level players receive easier questions (e.g., Elementary / Difficulty 1, generous timers).

This phase adds:
1. **Headless Duel Session (`ArenaDuelSession`)**: Manages match definitions, round counters, competitor scores, Reverse Difficulty question sampling via `QuestionRepository`, and simulated AI rival accuracy based on question tiers.
2. **Interactive Arena Overlay (`ArenaModal`)**: DOM modal UI allowing players to select AI rivals from `MOCK_RIVALS` (`Apprentice Fizz`, `Scholar Valeria`, `Grandmaster Ignis`), view the active Reverse Difficulty handicap, and engage in multi-round sparring matches.
3. **Colosseum Arbiter NPC (`Arena Master Gladius`)**: Positioned in Beginners Village (`x: 420, y: 520`) with dedicated dialogue and direct interaction binding to open the `ArenaModal`.

### 2. Files Created and Modified
- **New Files**:
  - `src/arena/ArenaRivals.ts`: Catalog of mock AI sparring rivals (`MOCK_RIVALS`).
  - `src/arena/ArenaDuelSession.ts`: Headless duel state machine implementing multi-round turn progression, Reverse Difficulty question sampling, rival simulation, and victory determination.
  - `src/ui/arena-modal/ArenaModal.ts`: DOM overlay for rival selection, handicap notice display, QuestionModal presentation, round scoring, and match resolution.
  - `src/ui/arena-modal/arena-modal.css`: BEM-styled styling matching the pixel fantasy aesthetic.
  - `src/ui/arena-modal/index.ts`: Barrel export.
  - `tests/arena/phase25_arena_duel.test.ts`: Automated test suite verifying Reverse Difficulty calculations, tailored question sampling, multi-round scoring, and Arena Master NPC registration.
  - `docs/PHASE_25_IMPLEMENTATION_REPORT.md`: Standalone phase implementation report.
- **Modified Files**:
  - `src/arena/index.ts`: Exported `ArenaRivals` and `ArenaDuelSession`.
  - `src/quests/NPCTypes.ts`: Added `NPCType.ArenaMaster`.
  - `src/quests/NPCRegistry.ts`: Registered `gladius-the-bold` in Beginners Village.
  - `src/scenes/VillageScene.ts`: Added Arena Master proximity detection, interaction trigger for `ArenaModal`, and cleanup on scene shutdown.
  - `src/ui/index.ts`: Exported `ArenaModal`.
  - `docs/IMPLEMENTATION_REPORTS.md`: Consolidated master tracker updated with Phase 25.

### 3. Verification & Test Results
- **Automated Tests (`npm.cmd test`)**:
  - **51 test files passed** (465 tests passed, 0 failures).
  - `tests/arena/phase25_arena_duel.test.ts`: 4/4 passed.
  - `tests/arena/pvpDifficulty.test.ts`: 3/3 passed.
  - `tests/integration/phase21_8_core_loop_regression.test.ts`: 7/7 passed.
- **TypeScript Check (`npx.cmd tsc --noEmit`)**:
  - 0 errors.
  - Strict typing enforced across all files.
- **Production Build (`npm.cmd run build`)**:
  - Succeeded without errors (`tsc && vite build`).

---

# Phase 24.1 — Character Stats and Stat Allocation

**Date**: 2026-11-08  
**Phase**: 24.1 (Handbook Section: RPG Progression Depth)  
**Status**: Completed  

### 1. Executive Summary
Phase 24.1 implements player stat allocation. Characters receive 5 configurable stat points per level advancement, which can be allocated among 6 attributes (`hp`, `mp`, `attack`, `defense`, `intelligence`, `critRate`). Derived stats recalculate dynamically while maintaining strict separation between base growth, allocation bonuses, equipment, and passive skills. SaveData schema incremented to v3 with retroactive migration for existing save records.

### 2. Files Created and Modified
- **New Files**:
  - `src/config/statAllocationConfig.ts`: Allocatable stats enum, per-point gains, configuration defaults.
  - `src/core/progression/StatAllocationService.ts`: Pure and stateful calculation, allocation bounds validation, legacy migration.
  - `tests/progression/phase24_1_stat_allocation.test.ts`: 15 automated test cases.
  - `docs/PHASE_24_1_IMPLEMENTATION_REPORT.md`: Comprehensive phase report.
- **Modified Files**:
  - `src/player/PlayerData.ts`: Added `unallocatedStatPoints` and `allocatedStats` to `PlayerData`.
  - `src/player/index.ts`: Barrel exports.
  - `src/core/progression/StatGrowthService.ts`: Layered allocation bonuses into `applyLevelStatsToPlayer()`.
  - `src/core/progression/ProgressionService.ts`: Integrated stat point rewards on level advancement and multi-level jumps.
  - `src/core/progression/index.ts`: Barrel exports.
  - `src/storage/StorageTypes.ts`: Incremented `SAVE_DATA_SCHEMA_VERSION` to 3.
  - `src/storage/SaveDataValidator.ts`: Added sanitization and retroactive point migration.
  - `src/player/PlayerSessionManager.ts`: Added `allocateStats()` with auto-save and migration on boot.
  - `tests/combat/phase23_3_active_skills.test.ts`: Added deterministic non-crit parameter.

### 3. Verification & Test Results
- **Automated Tests (`npm test`)**: 52 test files passed (480 passed, 0 failures).
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded cleanly.

---

# Phase 24.2 — Equipment Attributes, Rarity, and Comparison

**Date**: 2026-11-08  
**Phase**: 24.2 (Handbook Section: RPG Progression Depth)  
**Status**: Completed  

### 1. Executive Summary
Phase 24.2 implements domain-level item validation, equipment slot and level restrictions, side-by-side stat delta comparisons against worn gear, and UI integration inside the `InventoryPanel`.

### 2. Files Created and Modified
- **New Files**:
  - `src/inventory/EquipmentComparison.ts`: Pure domain validator and comparison calculator.
  - `tests/inventory/phase24_2_equipment.test.ts`: 14 automated unit tests.
  - `docs/PHASE_24_2_IMPLEMENTATION_REPORT.md`: Comprehensive phase report.
- **Modified Files**:
  - `src/inventory/index.ts`: Barrel exports.
  - `src/ui/inventory-panel/InventoryPanel.ts`: Comparison card, colored stat diffs, and level-check button guards.

### 3. Verification & Test Results
- **Automated Tests (`npm test`)**: 53 test files passed (494 passed, 0 failures).
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded cleanly.

---

# Phase 24.3 — Equipment Enhancement

**Date**: 2026-11-08  
**Phase**: 24.3 (Handbook Section: RPG Progression Depth)  
**Status**: Completed  

### 1. Executive Summary
Phase 24.3 implements a deterministic, non-exploitative equipment enhancement system (+1 to +10). Upgrades increase base stats by 10% per level (with flat minimum guarantees), consume Gold via an exponential curve, require tiered materials, and execute atomically with rollback protection. Equipment stat calculations reflect enhancement levels dynamically.

### 2. Files Created and Modified
- **New Files**:
  - `src/config/enhancementConfig.ts`: Balance configuration and material tiers.
  - `src/inventory/EnhancementService.ts`: Pure calculations, cost formulas, and preview generation.
  - `tests/inventory/phase24_3_enhancement.test.ts`: 11 automated unit tests.
  - `docs/PHASE_24_3_IMPLEMENTATION_REPORT.md`: Comprehensive phase report.
- **Modified Files**:
  - `src/inventory/ItemTypes.ts`: Added `enhancementLevel` to slots and `equippedEnhancements` to state.
  - `src/inventory/InventoryManager.ts`: Added `enhanceItem()`, material tracking, and equip/unequip preservation.
  - `src/inventory/EquipmentStatCalculator.ts`: Factored enhancement levels into stat bonuses.
  - `src/inventory/index.ts`: Barrel exports.
  - `src/storage/SaveDataValidator.ts`: Added sanitization and defaults.

### 3. Verification & Test Results
- **Automated Tests (`npm test`)**: 54 test files passed (505 passed, 0 failures).
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded cleanly.

---

# Phase 24.4 — Elites, Bosses, and Encounter Progression

**Date**: 2026-11-08  
**Phase**: 24.4 (Handbook Section: RPG Progression Depth)  
**Status**: Completed  

### 1. Executive Summary
Phase 24.4 implements data-driven elite and world boss encounters (`prime-gargoyle`, `overclocked-golem`, `archivist-malakor`), multi-phase combat enrage mechanics via `BossEncounterController`, idempotent first-clear reward protection, and category-aware question count constraints (5-8 for Elites, 6-10 for Bosses).

### 2. Files Created and Modified
- **New Files**:
  - `src/monsters/EliteBossRegistry.ts`: Data catalog of elite/boss encounters and drop configurations.
  - `src/monsters/BossEncounterController.ts`: Headless state coordinator for phase transitions and reward claims.
  - `tests/monsters/phase24_4_elites_bosses.test.ts`: 8 automated unit tests.
  - `docs/PHASE_24_4_IMPLEMENTATION_REPORT.md`: Comprehensive phase report.
- **Modified Files**:
  - `src/monsters/index.ts`: Barrel exports.

### 3. Verification & Test Results
- **Automated Tests (`npm test`)**: 55 test files passed (513 passed, 0 failures).
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded cleanly.

---

# Phase 24.5 — Build Balance and Progression Simulation

**Date**: 2026-11-08  
**Phase**: 24.5 (Handbook Section: RPG Progression Depth)  
**Status**: Completed  

### 1. Executive Summary
Phase 24.5 establishes a deterministic balance simulation and test harness (`ProgressionSimulator`) evaluating character EXP growth curves, archetype match-ups (`Balanced`, `GlassCannon`, `Tank`, `Scholar`), monster lethality, and gold inflation across Beginners Village (Levels 1–10). Simulation confirms smooth pacing (~26–28 battles/level), balanced build asymmetry, and healthy gold sinks.

### 2. Files Created and Modified
- **New Files**:
  - `src/core/progression/ProgressionSimulator.ts`: Headless balance simulator and audit engine.
  - `tests/progression/phase24_5_simulation.test.ts`: 6 automated unit tests.
  - `docs/PHASE_24_5_BALANCE_REPORT.md`: Comprehensive design audit and balance report.
- **Modified Files**:
  - `src/core/progression/index.ts`: Barrel exports.

### 3. Verification & Test Results
- **Automated Tests (`npm test`)**: 56 test files passed (519 passed, 0 failures).
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded cleanly.

---

# Phase 25.1 — Question Content Standards

**Date**: 2026-11-08  
**Phase**: 25.1 (Handbook Section: Educational Content and Learning Quality)  
**Status**: Completed

### 1. Executive Summary
Phase 25.1 defines the question-bank quality rules and enforces them in the existing headless validator. Structural defects reject a record, while missing explanations, subtopics, sources, and human review labels are reported as advisories that do not block loading. Existing bundled questions were not rewritten, no citations were generated, and no question was marked expert-reviewed. Publication status (`draft`, `published`, `archived`) stays separate from the optional review marker (`unreviewed`, `author-checked`, `needs-revision`). The standard is documented in `docs/QUESTION_CONTENT_STANDARDS.md`.

### 2. Files Created and Modified
- **New Files**:
  - `src/questions/management/QuestionContentStandards.ts`: Stable id, timer, alias, source, and review-status checks.
  - `src/questions/management/QuestionContentAudit.ts`: Non-mutating assessment that keeps structural errors separate from authoring advisories.
  - `tests/questions/phase25_1_content_standards.test.ts`: Standards, rejection, advisory, and bundled-bank tests.
  - `docs/QUESTION_CONTENT_STANDARDS.md`: Content standard.
  - `docs/PHASE_25_1_IMPLEMENTATION_REPORT.md`: Standalone phase report.
- **Modified Files**:
  - `src/core/types/question.ts`: Optional `subtopic`, `source`, and `reviewStatus`. Timer and id bounds. Backward-compatible; every new field is optional.
  - `src/core/types/index.ts`: Exports for the new types and bounds.
  - `src/questions/management/QuestionValidator.ts`: Stable ids, duplicate choice text, alias shape and duplicates, whole-second timer bounds, and optional metadata checks.
  - `src/questions/index.ts`: Barrel exports.
  - `tests/questions/questionValidation.test.ts`: Timer cases now include fractions and the upper bound. The valid identification fixture uses distinct aliases.
  - `tests/integration/phase21_8_core_loop_regression.test.ts`: The scripted three-turn battle passes `forceCrit: false` so a random critical hit cannot end the fight on the first correct answer.
  - `docs/IMPLEMENTATION_REPORTS.md`: Consolidated tracker updated with Phase 25.1.

### 3. Verification & Test Results
- **Automated Tests (`npm test`)**: 57 test files passed (525 passed, 0 failures).
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded.

---

# Phase 25.2 — Subject and Topic Taxonomy

**Date**: 2026-11-08  
**Phase**: 25.2 (Handbook Section: Educational Content and Learning Quality)  
**Status**: Completed

### 1. Executive Summary
Phase 25.2 organizes the question bank into a maintainable subject/topic structure. Every declared `SubjectId` receives a subject node, topics are derived directly from bundled content, and each raw `question.topic` string is linked to a canonical topic through an explicit mapping table. Topic ids are namespaced as `<subjectId>.<topicSlug>` so they stay stable and collision-free (`science.physics` vs the `physics` subject). Questions are classified at read time only — no record was rewritten. Declared-but-empty subjects (`physics`, `business`) carry empty tier lists and are reported as "subjects without content."

### 2. Files Created and Modified
- **New Files**:
  - `src/questions/taxonomy/TaxonomyTypes.ts`: Subject, topic, subtopic, mapping, classification, and coverage types.
  - `src/questions/taxonomy/TaxonomyData.ts`: `SUBJECT_TAXONOMY`, `TOPIC_TAXONOMY`, `QUESTION_TOPIC_MAPPINGS`, `buildTopicId`.
  - `src/questions/taxonomy/TaxonomyValidator.ts`: `TOPIC_ID_PATTERN`, `isValidTopicId`, non-mutating `validateTaxonomy`.
  - `src/questions/taxonomy/TaxonomyCoverage.ts`: Lookups, `resolveRawTopicsForTopic`, `classifyQuestion`, `buildTaxonomyCoverageReport`.
  - `src/questions/taxonomy/index.ts`: Barrel export.
  - `tests/questions/phase25_2_taxonomy.test.ts`: 14 tests (validation, namespacing, classification, coverage, filtering).
  - `docs/PHASE_25_2_IMPLEMENTATION_REPORT.md`: Standalone phase report.
- **Modified Files**:
  - `src/questions/index.ts`: Re-exports the taxonomy module.
  - `src/questions/retrieval/QuestionRepository.ts`: Added optional `topics?: string[]` criterion (OR logic).
  - `src/ui/admin/AdminDashboard.ts`: Display-name subject filter, taxonomy-driven Topic filter, coverage report line.
  - `src/ui/admin/admin-dashboard.css`: Coverage line styling.
  - `docs/IMPLEMENTATION_REPORTS.md`: Consolidated master tracker updated with Phase 25.2.

### 3. Verification & Test Results
- **Automated Tests (`npm test`)**: 58 test files passed (539 passed, 0 failures).
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

---

# Phase 25.3 — Difficulty Calibration and Content Review

**Date**: 2026-11-08  
**Phase**: 25.3 (Handbook Section: Educational Content and Learning Quality)  
**Status**: Completed

### 1. Executive Summary
Phase 25.3 adds headless tools that help a reviewer find questionable content and preview how the battle engine will select a question. Reviewers can filter by subject/tier/topic/difficulty and review status, find authoring gaps, surface similar-prompt *candidates* (never semantic verdicts), preview battle selection against a PvE profile, mark a question's review status, and export a JSON review report. No question's answer or difficulty was changed, and no difficulty was auto-assigned. The only actionable gap in the current 19-question bundled bank is 6 redundant-alias records; subtopic/source/review gaps reflect the newer optional schema.

### 2. Files Created and Modified
- **New Files**:
  - `src/questions/review/ContentReviewTypes.ts`: Gap codes, similar-prompt pair, battle-selection preview, review breakdown, report types.
  - `src/questions/review/ContentReviewTools.ts`: `normalizePromptText`, `findContentGaps`, `findSimilarPromptPairs`, `previewBattleSelection`, `buildReviewReport`, `renderReviewReportJson`.
  - `src/questions/review/index.ts`: Barrel export.
  - `tests/questions/phase25_3_content_review.test.ts`: 14 tests.
  - `docs/PHASE_25_3_IMPLEMENTATION_REPORT.md`: Standalone phase report.
- **Modified Files**:
  - `src/questions/retrieval/QuestionRepository.ts`: Optional `reviewStatus` filter criterion.
  - `src/questions/management/QuestionManager.ts`: `markReviewStatus(id, status)` reviewer action.
  - `src/questions/index.ts`: Re-exports the content-review module.
  - `src/ui/admin/AdminDashboard.ts`: Review-status filter, content-review summary line, and review-report export button.
  - `docs/IMPLEMENTATION_REPORTS.md`: Consolidated master tracker updated with Phase 25.3.

### 3. Verification & Test Results
- **Automated Tests (`npm test`)**: 59 test files passed (553 passed, 0 failures).
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

---

# Phase 25.4 — Learning Analytics and Mastery Insights

**Date**: 2026-11-08  
**Phase**: 25.4 (Handbook Section: Educational Content and Learning Quality)  
**Status**: Completed

### 1. Executive Summary
Phase 25.4 adds a headless learning-analytics engine that turns recorded answer attempts and mastery records into learning statistics. It consumes `AnswerAttemptEvent` records, keeps aggregated counters (never the full history), and exposes a pure `computeLearningStatistics` view: totals, accuracy, average answer time, accuracy by subject/topic, mastery level and progress by subject, recent activity, and commonly missed questions/topics. Denominators are explicit (accuracy = correct/answered; zero denominator yields `null`), insights are gated behind a minimum sample so ability is never inferred from thin data, and events are deduplicated by id so re-applying a batch never double-counts. Save schema moved 3→4 with an optional, backward-compatible `analytics` block that is sanitized on load.

### 2. Files Created and Modified
- **New Files**:
  - `src/analytics/AnalyticsTypes.ts`: Event, aggregate, snapshot, statistics, and options types.
  - `src/analytics/LearningAnalytics.ts`: `LearningAnalytics` engine, `isValidAnswerAttemptEvent`, `sanitizeAnalyticsSnapshot`, `buildMasteryProgress`, `computeLearningStatistics`.
  - `src/analytics/index.ts`: Barrel export.
  - `tests/analytics/phase25_4_learning_analytics.test.ts`: 18 tests.
  - `docs/PHASE_25_4_IMPLEMENTATION_REPORT.md`: Standalone phase report.
- **Modified Files**:
  - `src/storage/StorageTypes.ts`: Optional `analytics?: LearningAnalyticsSnapshot`; `SAVE_DATA_SCHEMA_VERSION` incremented to 4.
  - `src/storage/SaveDataValidator.ts`: Sanitizes/migrates the optional analytics block.
  - `docs/IMPLEMENTATION_REPORTS.md`: Consolidated master tracker updated with Phase 25.4.

### 3. Verification & Test Results
- **Automated Tests (`npm test`)**: 60 test files passed (571 passed, 0 failures).
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

---

# Phase 25.5 — Question Authoring Workflow

**Date**: 2026-11-08  
**Phase**: 25.5 (Handbook Section: Educational Content and Learning Quality)  
**Status**: Completed

### 1. Executive Summary
Phase 25.5 improves the Super Admin content workflow without compromising question validation. The editor now shows validation errors next to the offending control (grouped by root field via `QuestionDraft`), previews a question exactly as the player sees it (`QuestionPreview`, marking invalid or unpublished records as not playable), supports draft/review/published states with a "Save as Draft" path, adds a non-mutating bulk-import validation report (`previewImport`), warns — but never blocks — on duplicate prompts, supports filtered export (`exportToJson(criteria)` reusing list-filter semantics), and takes a backup (`createBackup`) before bulk changes with an all-or-nothing `restoreBackup`. No AI dependency or remote API was added, and invalid questions are never silently published.

### 2. Files Created and Modified
- **New Files**:
  - `src/questions/management/QuestionDraft.ts`: `QuestionDraftInput`, `buildQuestionDraft`, `validateQuestionDraft`, `groupErrorsByField`, `rootFieldName`.
  - `src/questions/management/QuestionPreview.ts`: `buildQuestionPreview` player-facing projection.
  - `tests/questions/phase25_5_authoring_workflow.test.ts`: 27 tests.
  - `docs/PHASE_25_5_IMPLEMENTATION_REPORT.md`: Standalone phase report.
- **Modified Files**:
  - `src/questions/management/QuestionManager.ts`: `previewImport`, `createBackup`, `restoreBackup`, filtered `exportToJson`; new `ImportPreview`/`ImportRecordReport`/`QuestionBackup`/`RestoreResult` types.
  - `src/questions/index.ts`: Barrel exports for draft, preview, and import/backup types.
  - `src/ui/admin/AdminDashboard.ts`: Field-level errors, draft/preview actions, review-status control, dry-run import report, filtered export, Backup & Restore, generalized confirm dialog.
  - `src/ui/admin/admin-dashboard.css`: Styles for field errors, preview, and import/export detail rows.
  - `docs/IMPLEMENTATION_REPORTS.md`: Consolidated master tracker updated with Phase 25.5.

### 3. Verification & Test Results
- **Automated Tests (`npm test`)**: 61 test files passed (598 passed, 0 failures).
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

---

# Phase 26.1 — World Map and Region Unlocks

**Date**: 2026-11-08  
**Phase**: 26.1 (Handbook Section: World and Content Expansion)  
**Status**: Completed

### 1. Executive Summary
Phase 26.1 adds a data-driven, headless world-navigation layer for the seven planned regions (Beginners Village, Emerald Forest, Ironhold Kingdom, Golden Capital, Arcane Technological City, Forgotten Lands, Colosseum). Given the player's level and current region it derives each region's locked/unlocked/available state from a config-driven unlock requirement plus a derived discovery frontier, with no save-schema change. Progression decisions were confirmed with the user first: unlock rule = level **+** discovery; values = provisional drafts in configuration; discovery is derived (not persisted); scope = headless layer + config only. `unlock.minLevel` is a hard gate while `recommendedLevel` is advisory only, and the existing non-blocking `checkZoneAccess` risk warning is left unchanged. Travel routes are validated as bidirectional so return travel is always valid.

### 2. Files Created and Modified
- **New Files**:
  - `src/world/RegionDefinition.ts`: `RegionIds`, `RegionAccessState`, `RegionUnlockRequirement`, `RegionTravelPoint`, `RegionDefinition`.
  - `src/world/regions.ts`: `WORLD_REGIONS`, `REGION_REGISTRY`, `STARTING_REGION_ID`.
  - `src/world/regionAccess.ts`: `isRegionUnlockSatisfied`, `deriveDiscoveredRegions`, `evaluateAllRegionAccess`, `validateRegionGraph`.
  - `tests/world/phase26_1_world_map.test.ts`: 21 tests.
  - `docs/PHASE_26_1_IMPLEMENTATION_REPORT.md`: Standalone phase report.
- **Modified Files**:
  - `src/world/index.ts`: Barrel exports for region types, data, and functions.
  - `docs/IMPLEMENTATION_REPORTS.md`: Consolidated master tracker updated with Phase 26.1.

### 3. Verification & Test Results
- **Automated Tests (`npm test`)**: 62 test files passed (619 passed, 0 failures).
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

---

# Phase 26.2 — Emerald Forest

**Date**: 2026-11-08  
**Phase**: 26.2 (Handbook Section: World and Content Expansion)  
**Status**: Completed

### 1. Executive Summary
Phase 26.2 implements Emerald Forest — the first expanded region — as a reusable, data-driven content package. The region gains one landing map (`emerald-forest-outpost`) and two hunting grounds (`verdant-glade` for Science, `runestone-grove` for Mathematics), two hunting zones with subject/tier profiles and spawn tables, and six new monsters (Levels 11–16, Junior High tier). All content flows through the existing `MAP_REGISTRY`, `HUNTING_ZONE_REGISTRY`, and `MONSTER_REGISTRY` lookups, so `HuntingScene` and `MonsterSpawner` needed no changes. A new headless `validateMapGraph` helper (the map-level companion to 26.1's `validateRegionGraph`) checks bounds, obstacle rects, and entry/exit consistency. Zone subjects/tiers were chosen from tiers that already have bundled content, so combat questions resolve without falling back. No NPCs, quest hooks, or art assets were invented (none supplied/approved); placeholders are used and required assets are listed in the standalone report.

### 2. Files Created and Modified
- **New Files**:
  - `src/world/mapGraph.ts`: `validateMapGraph`, `MapGraphValidation`, `MapGraphValidationOptions`.
  - `tests/world/phase26_2_emerald_forest.test.ts`: 17 tests.
  - `docs/PHASE_26_2_IMPLEMENTATION_REPORT.md`: Standalone phase report.
- **Modified Files**:
  - `src/world/buildings.ts`: added `HuntingZoneIds.VerdantGlade` / `RunestoneGrove`.
  - `src/world/maps.ts`: added Emerald Forest map ids, the three map definitions, `EMERALD_FOREST_MAPS`, and registry entries.
  - `src/world/huntingZones.ts`: added `VERDANT_GLADE_ZONE`, `RUNESTONE_GROVE_ZONE`, `EMERALD_FOREST_ZONES`, and registry entries.
  - `src/monsters/monsterData.ts`: added six Emerald Forest monsters.
  - `src/world/regions.ts`: linked the Emerald Forest maps to the region's `mapIds`.
  - `src/world/index.ts`: barrel exports for the new maps, zones, and validator.
  - `docs/IMPLEMENTATION_REPORTS.md`: consolidated master tracker updated with Phase 26.2.

### 3. Verification & Test Results
- **Automated Tests (`npm test`)**: 63 test files passed (636 passed, 0 failures). The new `phase26_2_emerald_forest.test.ts` contributes 17 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

---

# Phase 26.3 — Ironhold Kingdom

**Date**: 2026-11-08  
**Phase**: 26.3 (Handbook Section: World and Content Expansion)  
**Status**: Completed

### 1. Executive Summary
Phase 26.3 implements Ironhold Kingdom as a data-driven region using the reusable region architecture established in Phase 26.2 — no new combat rules, no scene duplication, no hardcoded navigation. The region (Levels 20–30, unlocked at Level 20) gains one landing map (`ironhold-gate`) and two hunting grounds (`forge-district` for Science, `siege-works` for Mathematics), two hunting zones with weighted spawn tables, six new monsters (Levels 20–26, Junior High tier) with real drop tables, one hub NPC (`forgemaster-durn`) and one quest hook (`quest-forge-order`). All content flows through the existing `MAP_REGISTRY`, `HUNTING_ZONE_REGISTRY`, `MONSTER_REGISTRY`, `ITEM_REGISTRY`, `NPC_REGISTRY`, and `QUEST_REGISTRY` systems. Level ranges were inspected first: the 20–30 band falls in the Junior High tier whose Mathematics/Science content already exists, so encounters resolve to real material without the difficulty engine's fallback.

### 2. Files Created and Modified
- **New Files**:
  - `tests/world/phase26_3_ironhold_kingdom.test.ts`: 25 tests.
  - `docs/PHASE_26_3_IMPLEMENTATION_REPORT.md`: Standalone phase report.
- **Modified Files**:
  - `src/world/buildings.ts`: added `HuntingZoneIds.ForgeDistrict` / `SiegeWorks`.
  - `src/world/maps.ts`: added Ironhold map ids, the three map definitions, `IRONHOLD_MAPS`, and registry entries.
  - `src/world/huntingZones.ts`: added `FORGE_DISTRICT_ZONE`, `SIEGE_WORKS_ZONE`, `IRONHOLD_ZONES`, and registry entries.
  - `src/monsters/monsterData.ts`: added six Ironhold monsters (with drop tables referencing existing items).
  - `src/quests/NPCRegistry.ts`: added `forgemaster-durn`.
  - `src/quests/QuestRegistry.ts`: added `quest-forge-order`.
  - `src/world/regions.ts`: linked the Ironhold maps to the region's `mapIds`.
  - `src/world/index.ts`: barrel exports for the new maps and zones.
  - `docs/IMPLEMENTATION_REPORTS.md`: consolidated master tracker updated with Phase 26.3.

### 3. Verification & Test Results
Per the handbook, verified zone boundaries, spawn validity, level-risk warnings, question tier selection, rewards, and transitions.
- **Automated Tests (`npm test`)**: 64 test files passed (661 passed, 0 failures). The new `phase26_3_ironhold_kingdom.test.ts` contributes 25 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

---

# Phase 26.4 — Golden Capital

**Date**: 2026-11-08  
**Phase**: 26.4 (Handbook Section: World and Content Expansion)  
**Status**: Completed

### 1. Executive Summary
Phase 26.4 implements Golden Capital as a data-driven region reusing the architecture from Phases 26.2/26.3 — no new combat rules, no scene duplication, no hardcoded navigation, and no new subjects. The existing economy and NPC architecture was inspected first, so the region introduces a merchant (reusing the existing shop system), a banker (reusing the **existing** bank/investment/business services — no new banking mechanics, since Phase 27 is not delivered), a scholar, and a quest giver, all through existing registries. The region (Levels 30–40, unlocked at Level 30) gains one landing map (`golden-capital-plaza`) and two hunting grounds (`trade-bazaar` for Mathematics, `civic-district` for Science), two hunting zones with weighted spawns, six new monsters (Levels 30–36, Junior High tier) with real drop tables, one shop (`capital-grand-bazaar`), four NPCs, and one quest hook (`quest-capital-levy`). The 30–40 band falls in the Junior High tier whose Mathematics/Science content already exists, so encounters resolve without the difficulty engine's fallback.

### 2. Files Created and Modified
- **New Files**:
  - `tests/world/phase26_4_golden_capital.test.ts`: 27 tests.
  - `docs/PHASE_26_4_IMPLEMENTATION_REPORT.md`: Standalone phase report.
- **Modified Files**:
  - `src/world/buildings.ts`: added `HuntingZoneIds.TradeBazaar` / `CivicDistrict`.
  - `src/world/maps.ts`: added Golden Capital map ids, the three map definitions, `GOLDEN_CAPITAL_MAPS`, and registry entries.
  - `src/world/huntingZones.ts`: added `TRADE_BAZAAR_ZONE`, `CIVIC_DISTRICT_ZONE`, `GOLDEN_CAPITAL_ZONES`, and registry entries.
  - `src/monsters/monsterData.ts`: added six Golden Capital monsters (with drop tables referencing existing items).
  - `src/quests/NPCRegistry.ts`: added `chancellor-edmund`, `merchant-cordelia`, `banker-cassius`, `archivist-mira`.
  - `src/quests/QuestRegistry.ts`: added `quest-capital-levy`.
  - `src/economy/ShopRegistry.ts`: added `capital-grand-bazaar` (reuses the existing shop system).
  - `src/world/regions.ts`: linked the Golden Capital maps to the region's `mapIds`.
  - `src/world/index.ts`: barrel exports for the new maps and zones.
  - `docs/IMPLEMENTATION_REPORTS.md`: consolidated master tracker updated with Phase 26.4.

### 3. Verification & Test Results
Per the handbook, verified navigation, NPC interactions, region content, combat, and save persistence.
- **Automated Tests (`npm test`)**: 65 test files passed (688 passed, 0 failures). The new `phase26_4_golden_capital.test.ts` contributes 27 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

---

# Phase 26.5 — Arcane Technological City

**Date**: 2026-11-08  
**Phase**: 26.5 (Handbook Section: World and Content Expansion)  
**Status**: Completed

### 1. Executive Summary
Phase 26.5 implements the Arcane Technological City as a data-driven region reusing the architecture from Phases 26.2–26.4 — no new combat rules, no scene duplication, no hardcoded navigation, and no new subjects. Its theme combines science and technology, but it reuses only Mathematics and Science (the subjects with Junior High content), so every encounter resolves to real material without the difficulty engine's fallback (Programming is Elementary-only and was deliberately not used at this tier). The region (Levels 40–50, unlocked at Level 40) gains one landing map (`arcane-city-plaza`) and two hunting grounds (`mana-foundry` for Science, `logic-spire` for Mathematics), two hunting zones with weighted spawns, six new monsters (Levels 40–46, Junior High tier) with real drop tables, three NPCs, and one quest hook (`quest-arcane-calibration`).

### 2. Files Created and Modified
- **New Files**:
  - `tests/world/phase26_5_arcane_technological_city.test.ts`: 25 tests.
  - `docs/PHASE_26_5_IMPLEMENTATION_REPORT.md`: Standalone phase report.
- **Modified Files**:
  - `src/world/buildings.ts`: added `HuntingZoneIds.ManaFoundry` / `LogicSpire`.
  - `src/world/maps.ts`: added Arcane City map ids, the three map definitions, `ARCANE_CITY_MAPS`, and registry entries.
  - `src/world/huntingZones.ts`: added `MANA_FOUNDRY_ZONE`, `LOGIC_SPIRE_ZONE`, `ARCANE_CITY_ZONES`, and registry entries.
  - `src/monsters/monsterData.ts`: added six Arcane City monsters (with drop tables referencing existing items).
  - `src/quests/NPCRegistry.ts`: added `engineer-vesper`, `scholar-aeon`, `artificer-nova`.
  - `src/quests/QuestRegistry.ts`: added `quest-arcane-calibration`.
  - `src/world/regions.ts`: linked the Arcane City maps to the region's `mapIds`.
  - `src/world/index.ts`: barrel exports for the new maps and zones.
  - `docs/IMPLEMENTATION_REPORTS.md`: consolidated master tracker updated with Phase 26.5.

### 3. Verification & Test Results
Per the handbook, verified zone transitions and encounter profiles (plus configuration, spawn validity, level-risk, rewards, and NPC interactions).
- **Automated Tests (`npm test`)**: 66 test files passed (713 passed, 0 failures). The new `phase26_5_arcane_technological_city.test.ts` contributes 25 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

---

# Phase 26.6 — Forgotten Lands

**Date**: 2026-11-08  
**Phase**: 26.6 (Handbook Section: World and Content Expansion)  
**Status**: Completed

### 1. Executive Summary
Phase 26.6 implements the Forgotten Lands as a data-driven region reusing the architecture from Phases 26.2–26.5 — no new combat rules, no scene duplication, no hardcoded navigation, and no new subjects. The region (Levels 50–60, unlocked at Level 50) gains one landing map (`forgotten-crossroads`) and two hunting grounds (`ashen-wastes` for Science, `ruined-archive` for Mathematics), two hunting zones with weighted spawns, six new monsters (Levels 50–60) with real drop tables, two NPCs, and one quest hook (`quest-forgotten-vigil`). The 50–60 band straddles the Junior High ↔ Senior High boundary (Junior High = 11–50, Senior High = 51–100), and no Senior High content is bundled; per the handbook the region therefore uses the **existing** higher-level jump rules, caps monster levels at the region maximum (60) so the delta from the recommended minimum (50) is ≤ 10 (at most a **+1 tier** shift, jump stays within `[0, 2]` — never the +2 extreme), relies on the **existing** `resolveQuestionsWithFallback` protections for Senior High encounters (no fallback bypassed; never an empty question set), and provides explicit risk messaging via the existing `checkZoneAccess`.

### 2. Files Created and Modified
- **New Files**:
  - `tests/world/phase26_6_forgotten_lands.test.ts`: 31 tests.
  - `docs/PHASE_26_6_IMPLEMENTATION_REPORT.md`: Standalone phase report.
- **Modified Files**:
  - `src/world/buildings.ts`: added `HuntingZoneIds.AshenWastes` / `RuinedArchive`.
  - `src/world/maps.ts`: added Forgotten Lands map ids, the three map definitions, `FORGOTTEN_LANDS_MAPS`, and registry entries.
  - `src/world/huntingZones.ts`: added `ASHEN_WASTES_ZONE`, `RUINED_ARCHIVE_ZONE`, `FORGOTTEN_LANDS_ZONES`, and registry entries.
  - `src/monsters/monsterData.ts`: added six Forgotten Lands monsters (with drop tables referencing existing items).
  - `src/quests/NPCRegistry.ts`: added `warden-thalia`, `hermit-orin`.
  - `src/quests/QuestRegistry.ts`: added `quest-forgotten-vigil`.
  - `src/world/regions.ts`: linked the Forgotten Lands maps to the region's `mapIds`.
  - `src/world/index.ts`: barrel exports for the new maps and zones.
  - `docs/IMPLEMENTATION_REPORTS.md`: consolidated master tracker updated with Phase 26.6.

### 3. Verification & Test Results
Per the handbook, verified monster/player level deltas and question selection at boundary levels, plus zone transitions, spawn validity, risk messaging, rewards, and NPC/quest wiring.
- **Automated Tests (`npm test`)**: 67 test files passed (744 passed, 0 failures). The new `phase26_6_forgotten_lands.test.ts` contributes 31 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

# Phase 26.7 — Colosseum

**Date**: 2026-11-08  
**Phase**: 26.7 (Handbook Section: World and Content Expansion)  
**Status**: Completed

### 1. Executive Summary
Phase 26.7 implements the Colosseum as a **single-player PvE challenge/arena environment**, kept fully separate from the existing PvP duel code (`ArenaDuelSession`, `ArenaRivals`, `PvPDifficultyEngine`) — no matchmaking, no network play, no duplicate scene. A new headless module (`src/arena/challenge/`) provides a data-driven challenge catalog with four configurable modes (Consecutive Monsters, Boss Challenge, Educational Subject Challenge, Time/Score Attack), a stage-progression session with an injectable clock for deterministic timing, and reward idempotency at two levels (session `claimRewards()` once, and a profile-level first-clear tracker). Challenge opponents reuse existing monsters plus one new Colosseum boss (`grand-champion-ragnar`) registered in the existing `ELITE_BOSS_REGISTRY` — no new combat rules are introduced. The Colosseum map (`colosseum-grounds`, `ZoneType.Arena`) has no connections (challenges are entered via the challenge system, not by zoning), keeping the world graph valid.

### 2. Files Created and Modified
- **New Files**:
  - `src/arena/challenge/ChallengeTypes.ts`: modes/status enums and challenge/stage/reward/progress interfaces.
  - `src/arena/challenge/ChallengeProgressTracker.ts`: first-clear tracking + snapshot/restore for reward idempotency.
  - `src/arena/challenge/ChallengeRegistry.ts`: `CHALLENGE_REGISTRY` (4 provisional, repeatable challenges) and lookup helpers.
  - `src/arena/challenge/ChallengeArenaSession.ts`: headless stage progression, defeat, time-attack scoring, and once-only reward claiming.
  - `src/arena/challenge/index.ts`: barrel export for the challenge module.
  - `tests/arena/phase26_7_colosseum_challenge.test.ts`: 31 tests.
  - `docs/PHASE_26_7_IMPLEMENTATION_REPORT.md`: Standalone phase report.
- **Modified Files**:
  - `src/arena/index.ts`: re-exports the new `./challenge` module (labeled as separate PvE).
  - `src/monsters/EliteBossRegistry.ts`: added `grand-champion-ragnar` (Level 70 boss, two phases incl. enrage).
  - `src/world/maps.ts`: added `MapIds.ColosseumGrounds`, `COLOSSEUM_BOUNDS`/`COLOSSEUM_LEVELS`, the `COLOSSEUM_GROUNDS` map (`ZoneType.Arena`, no connections), `COLOSSEUM_MAPS`, and registry entry.
  - `src/world/regions.ts`: linked the Colosseum map to the Colosseum region's `mapIds`.
  - `src/world/index.ts`: barrel exports for `COLOSSEUM_GROUNDS` / `COLOSSEUM_MAPS`.
  - `src/quests/NPCRegistry.ts`: added `grand-arbiter-theron` (`NPCType.ArenaMaster` on `colosseum-grounds`).
  - `docs/IMPLEMENTATION_REPORTS.md`: consolidated master tracker updated with Phase 26.7.

### 3. Verification & Test Results
Per the handbook, verified challenge progression, defeat, rewards, repeated entry, and reward idempotency, plus Colosseum wiring and map/region graph validity.
- **Automated Tests (`npm test`)**: 68 test files passed (775 passed, 0 failures). The new `phase26_7_colosseum_challenge.test.ts` contributes 31 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

# Phase 26.8 — Story, NPCs, Side Quests, and Achievements

**Date**: 2026-11-08  
**Phase**: 26.8 (Handbook Section: Story & Content Systems)  
**Status**: Completed

### 1. Executive Summary
Phase 26.8 implements a maintainable, data-driven content layer for story and optional objectives, building on the existing quest/NPC systems. `QuestDefinition` gains optional category/chain metadata (backward compatible), a headless `resolveNpcDialogue` selects NPC dialogue per quest state, `QuestManager` gains chain-progress and registry-derived NPC quest status (fixing a hardcoded tutorial-only list), and a new headless `src/achievements/` module tracks milestones from a small stable event model (monster defeats, quest completions, level milestones) with idempotent unlocks. Only a small, clearly labelled sample is added: a three-chapter main story chain, one side quest, and one quest-giver NPC. No new subjects or combat rules; all values provisional.

### 2. Files Created and Modified
- **New Files**:
  - `src/quests/DialogueResolver.ts`: headless `resolveNpcDialogue`.
  - `src/achievements/AchievementTypes.ts`, `AchievementRegistry.ts`, `AchievementTracker.ts`, `index.ts`.
  - `tests/quests/phase26_8_story_quests.test.ts` (23 tests), `tests/achievements/phase26_8_achievements.test.ts` (17 tests).
  - `docs/PHASE_26_8_IMPLEMENTATION_REPORT.md`: Standalone phase report.
- **Modified Files**:
  - `src/quests/QuestTypes.ts`: `QuestCategory`, `NpcQuestStatus`, `QuestChainProgress`, chain metadata.
  - `src/quests/QuestRegistry.ts`: sample chain + side quest, `getQuestsForNpc`, `getQuestChain`, `getChainIds`.
  - `src/quests/QuestManager.ts`: `resolveNpcQuest` + `getChainProgress`; status now registry-derived.
  - `src/quests/NPCRegistry.ts`: added `chronicler-selene`; `scholar-lyra` offers the side quest.
  - `src/quests/index.ts`: exports `DialogueResolver`.
  - `src/ui/npc-dialogue/NPCDialogueModal.ts`: consumes the headless resolver.
  - `docs/IMPLEMENTATION_REPORTS.md`: consolidated master tracker updated with Phase 26.8.

### 3. Verification & Test Results
Per the handbook, verified prerequisite chains, dialogue conditions, quest rewards, and achievement idempotency.
- **Automated Tests (`npm test`)**: 70 test files passed (815 passed, 0 failures). The two new suites contribute 40 tests (23 + 17).
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

# Phase 27.1 — Economy Balance

**Date**: 2026-11-09  
**Phase**: 27.1 (Handbook Section: Phase 27 — Economy & Professions)  
**Status**: Completed (inspection + balance report; **no values changed**)

### 1. Executive Summary
Phase 27.1 inspects the existing economy (Gold rewards, shop prices, sell values, drops, and progression curves) and produces a balance report *before* any value changes, as required by the handbook. All seven evaluation points were assessed: gold earned per encounter, consumable cost, equipment prices, sell-to-buy ratios, infinite-money-loop analysis, reward scaling by level, and inventory limitations. **No exploit or correctness defect was found**, and no values were changed (change requires a documented reason + tests). The report records deferred tuning recommendations for a future scheduled economy phase.

### 2. Files Created and Modified
- **New Files**:
  - `docs/PHASE_27_1_ECONOMY_REPORT.md`: Standalone balance report (all seven evaluation points).
- **Modified Files**:
  - `docs/IMPLEMENTATION_REPORTS.md`: consolidated master tracker updated with Phase 27.1.
- **No source, config, or test files were modified.**

### 3. Key Findings
- **Gold per encounter** scales ~0.40 gold per EXP across the entire monster table (very consistent).
- **Consumables** are cheap relative to income and drop freely from L20+ monsters; little late-game pressure.
- **Equipment** is affordable at game start (starter kit 50g vs. 100g seeded gold) but trivial to buy mid/late game.
- **Sell-to-buy**: always lossy (`sellPriceMultiplier ≤ 0.6`, and `buyPrice ≥ value`); **no arbitrage loop**.
- **Infinite money loops**: none found (no buy/sell loop, no craft/refine loop, no duplication path). Bank interest (2%/min, capped at 1,000,000) is the only non-combat faucet and is flagged as the main long-term risk (bounded, time-gated, out of scope here).
- **Reward scaling**: EXP requires `floor(50·L^2.2 + 100·L)`; since gold tracks EXP at a constant ratio, total gold income grows superlinearly (est. ~74k gold/level at L40) while the top item costs 200g — late-game gold has no sink.
- **Inventory**: `DEFAULT_INVENTORY_CAPACITY = 24`, fixed; equipment drops (stackLimit 1) can fill it; materials (slime-gel 99, rare-crystal 50) stack well.

### 4. Decision on Value Changes
No economy values were changed. Rationale: no exploit/defect exists, and the remaining observations are balance-tuning (adding sinks = a new economy system, which the handbook forbids this phase). Deferred recommendations (high-value gold sink, bank-rate review, capacity upgrades, cross-shop price normalization) are documented in the report for a future tuning phase.

### 5. Verification & Test Results
Inspection-only phase (no code changed); the tree remains green.
- **Automated Tests (`npm test`)**: 70 test files passed (815 passed, 0 failures).
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

# Phase 27.2 — Gathering Professions

**Date**: 2026-11-09  
**Phase**: 27.2 (Handbook Section: Phase 27 — Economy & Professions)  
**Status**: Completed

### 1. Executive Summary
Phase 27.2 adds a **configurable, headless gathering framework** for the user-approved professions **Mining, Herbalism, and Woodcutting**. It introduces `ResourceNodeDefinition`s (six provisional nodes: one tier-1 and one higher-tier per profession), validation of gathering requirements (minimum level + optional tool), inclusive yield rolls, per-node respawn cooldowns, inventory capacity checks, and a re-entrancy guard. `gather` is **atomic** — a failed gather never partially consumes the node or items, and repeated input is rejected by the respawn cooldown. State persists through a new optional, backward-compatible `gathering` field on `SaveData`. Per the approved scope, no world-scene UI was added; `message` / `respawnRemainingMs` form the interaction-feedback contract for a later UI subphase.

### 2. Files Created and Modified
- **New Files**:
  - `src/gathering/GatheringTypes.ts`: professions, node definition, check/result, snapshot types.
  - `src/gathering/GatheringRegistry.ts`: `GATHERING_NODE_DEFINITIONS` (6 nodes) + lookups.
  - `src/gathering/GatheringService.ts`: headless `GatheringService`, `sanitizeGatheringSnapshot`, default instance.
  - `src/gathering/index.ts`: barrel export.
  - `tests/gathering/phase27_2_gathering.test.ts` (24 tests).
  - `docs/PHASE_27_2_GATHERING_IMPLEMENTATION_REPORT.md`: Standalone phase report (renamed from
    `PHASE_27_2_IMPLEMENTATION_REPORT.md` when the Phase 27 track was redefined).
- **Modified Files**:
  - `src/inventory/ItemTypes.ts`: added `ItemType.Tool`.
  - `src/inventory/ItemRegistry.ts`: added 6 gathered materials + 3 tools.
  - `src/storage/StorageTypes.ts`: optional `gathering?: GatheringSnapshot` (schema version stays 4).
  - `src/storage/SaveDataValidator.ts`: sanitises the optional gathering payload.
  - `src/player/PlayerSessionManager.ts`: injectable gathering service, hydrate + snapshot wiring.
  - `docs/IMPLEMENTATION_REPORTS.md`: consolidated master tracker updated with Phase 27.2.

### 3. Verification & Test Results
Verified yields, requirements, capacity, repeat interaction, and persistence per the handbook.
- **Automated Tests (`npm test`)**: 71 test files passed (839 passed, 0 failures). The new gathering suite contributes 24 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

# Phase 27.1 — Profession Framework, Categories, and Enrollment (Real-World Professions)

**Date**: 2026-11-09  
**Phase**: 27.1 (Handbook Section: Phase 27 — Real-World Professions and Careers)  
**Status**: Completed

> Note on numbering: the Phase 27 track was redefined by the Phase 27 Master Implementation Plan into
> seven sub-phases for a Real-World Professions & Career System. The earlier "Phase 27.1 — Economy
> Balance" and "Phase 27.2 — Gathering Professions" entries above are preserved as delivered work under
> the previous numbering.

### 1. Executive Summary
Phase 27.1 establishes a **reusable, configurable Real-World Professions & Career framework** in a
headless `src/professions/` domain. It provides configurable profession categories; profession
definitions (id, name, category, description, responsibilities, workplaces, enrollment
requirements, ranks, EXP settings, question/subject tags, optional specializations); configurable
rank ladders; optional enrollment requirements (character level, subject mastery, gold, prerequisite
quests); and a career profile where a player pursues multiple professions, each independently
tracking level, EXP, rank, reputation, enrollment status, and assignment history — with duplicate
enrollment prevented. Doctor, Electrical Engineer, and Architect are fully defined (plus definition-
only Nurse, Civil Engineer, and Lawyer). Career state persists through an optional, backward-
compatible `careers` field on `SaveData`, integrated with `PlayerSessionManager`. All rules are
headless and data-driven; all balance values are provisional.

### 2. Files Created and Modified
- **New Files**:
  - `src/professions/ProfessionTypes.ts`: category, rank, enrollment-requirement, specialization,
    profession definition, career record, `CareerSnapshot`, `EnrollmentContext`, result types.
  - `src/professions/ProfessionCategories.ts`: 6 configurable categories + registry/lookups.
  - `src/professions/ProfessionRegistry.ts`: starter professions (3 full + 3 definition-only) + lookups.
  - `src/professions/ProfessionValidator.ts`: category + full-catalogue validation.
  - `src/professions/CareerService.ts`: headless career service, `sanitizeCareerSnapshot`, default instance.
  - `src/professions/index.ts`: barrel export.
  - `tests/professions/phase27_1_professions.test.ts` (36 tests).
  - `docs/PHASE_27_1_IMPLEMENTATION_REPORT.md`: standalone phase report.
- **Modified Files**:
  - `src/storage/StorageTypes.ts`: optional `careers?: CareerSnapshot`; schema version `4` → `5`.
  - `src/storage/SaveDataValidator.ts`: sanitises the optional careers payload.
  - `src/player/PlayerSessionManager.ts`: injectable career service, hydrate + snapshot wiring,
    `buildEnrollmentContext()`.
  - `docs/IMPLEMENTATION_REPORTS.md`: consolidated master tracker updated with Phase 27.1.
  - `docs/DEVELOPMENT_ROADMAP.md`: added the Phase 27 (Real-World Professions and Careers) section.

### 3. Verification & Test Results
Verified profession definitions/validation, enrollment, multiple professions per player, duplicate
enrollment prevention, requirement validation, invalid/missing definitions, backward-compatible save
loading, and career persistence.
- **Automated Tests (`npm test`)**: 72 test files passed (875 passed, 0 failures). The new professions suite contributes 36 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

# Phase 27.2 — Workplace, Facility, and World Integration (Real-World Professions)

**Date**: 2026-11-09  
**Phase**: 27.2 (Handbook Section: Phase 27 — Real-World Professions and Careers)  
**Status**: Completed

> Note on numbering: the earlier "Phase 27.2 — Gathering Professions" report was renamed to
> `docs/PHASE_27_2_GATHERING_IMPLEMENTATION_REPORT.md`, freeing the canonical Phase 27.2 name for
> this entry.

### 1. Executive Summary
Phase 27.2 turns the profession framework into **places** the player can visit. It adds a
configurable, headless **workplace** layer (`WorkplaceDefinition` with facilities, interaction
points, NPC associations, world locations, entry gates, and per-facility access rules), a headless
`WorkplaceService` for resolution/access validation, and a `WorkplaceValidator` for catalogue and
association checks. Six workplaces are catalogued (Career Center, Hospital, Engineering Center,
Architecture Studio, Academy, Courthouse); multiple professions may share a workplace (the Hospital
hosts Doctor and Nurse; the Engineering Center hosts Electrical and Civil Engineers). Access is
derived from existing authoritative state (character level, careers, mastery, quests) — no new
`SaveData` field was required. World integration adds a new **Career Center** landmark to the
Beginners Village and an interactive **Career Advisor Marisol** NPC; workplaces reference existing
buildings/landmarks via `worldLocation` instead of duplicating them (the Academy reuses the General
Knowledge Library). All rules are headless and data-driven; all balance values are provisional.

### 2. Files Created and Modified
- **New Files**:
  - `src/professions/WorkplaceTypes.ts`: workplace/facility/interaction-point/world-location/access
    types, `WorkplaceAccessFailureReason`.
  - `src/professions/WorkplaceRegistry.ts`: `WorkplaceIds`, `WORKPLACE_DEFINITIONS` (6 workplaces) +
    registry/lookups.
  - `src/professions/WorkplaceService.ts`: headless `WorkplaceService` + default `workplaceService`.
  - `src/professions/WorkplaceValidator.ts`: catalogue + association validation.
  - `tests/professions/phase27_2_workplaces.test.ts` (34 tests).
  - `docs/PHASE_27_2_IMPLEMENTATION_REPORT.md`: standalone phase report.
- **Modified Files**:
  - `src/professions/index.ts`: barrel exports for the workplace domain.
  - `src/world/maps.ts`: `career-center` landmark added to `BEGINNERS_VILLAGE`.
  - `src/quests/NPCTypes.ts`: `NPCType.CareerAdvisor`.
  - `src/quests/NPCRegistry.ts`: `career-advisor-marisol` NPC.
  - `src/player/PlayerSessionManager.ts`: `buildWorkplaceContext()`.
  - `docs/PHASE_27_2_GATHERING_IMPLEMENTATION_REPORT.md`: renamed from the old Phase 27.2 name.
  - `docs/IMPLEMENTATION_REPORTS.md`: consolidated master tracker updated with Phase 27.2.
  - `docs/DEVELOPMENT_ROADMAP.md`: Phase 27.2 marked complete.

### 3. Verification & Test Results
Verified workplace definitions, profession associations, multiple professions sharing a workplace,
entry requirements, facility access, rank-based unlocking, facility resolution, invalid references,
and catalogue validity (shipped catalogue validates with zero issues; profession ↔ workplace
associations are symmetric).
- **Automated Tests (`npm test`)**: 73 test files passed (909 passed, 0 failures). The new workplaces suite contributes 34 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

---

# Phase 27.3 — Professional Assignment Engine (Real-World Professions)

**Date**: 2026-11-09  
**Phase**: 27.3 (Handbook Section: Phase 27 — Real-World Professions and Careers)  
**Status**: Completed

### 1. Executive Summary
Phase 27.3 adds a reusable, configurable, **headless professional assignment framework**. An
assignment is a professional activity undertaken inside an enrolled profession — a knowledge
assessment, problem-solving task, case analysis, project, practical simulation, or research task —
composed of ordered **stages** of generic, typed **objectives**. The engine never hardcodes a
profession: new assignments (for any profession) are added purely through configuration. Objectives
are not limited to questions (`AnswerQuestions`, `CompleteSteps`, `CollectItems`, `ReportOutcome`),
all advanced by one uniform counter mechanism. Completion requires all stages cleared; the engine
produces a completion result carrying the configured **reward data** but does **not distribute** it
(distribution is routed through the existing progression, mastery, and currency services in Phase
27.5 — no duplicate reward system). Completions are keyed by a stable `completionId` so repeated
completion requests replay safely and `claimRewards` is idempotent. Completing an assignment is
mirrored onto the enrolled profession's career record via a completion hook, and assignment state
(active + history) is persisted as an optional, backward-compatible `SaveData` payload (schema
version 5 → 6).

### 2. Files Created and Modified
- **New Files**:
  - `src/professions/AssignmentTypes.ts`: task/objective types, stage/objective/reward/requirement
    definitions, active & history state, `AssignmentSnapshot` (+ version), `AssignmentContext`, and
    result types.
  - `src/professions/AssignmentRegistry.ts`: labelled sample catalogue — 6 assignments (2 per seed
    profession) + registry/lookups.
  - `src/professions/AssignmentService.ts`: headless engine + `sanitizeAssignmentSnapshot` +
    default `assignmentService`.
  - `src/professions/AssignmentValidator.ts`: catalogue validation.
  - `tests/professions/phase27_3_assignments.test.ts` (44 tests).
  - `docs/PHASE_27_3_IMPLEMENTATION_REPORT.md`: standalone phase report.
- **Modified Files**:
  - `src/professions/index.ts`: barrel exports for the assignment domain.
  - `src/professions/CareerService.ts`: `recordAssignmentCompletion()`.
  - `src/storage/StorageTypes.ts`: optional `assignments?: AssignmentSnapshot`; `SAVE_DATA_SCHEMA_VERSION` 5 → 6.
  - `src/storage/SaveDataValidator.ts`: sanitizes the optional assignment payload.
  - `src/player/PlayerSessionManager.ts`: injectable `AssignmentService` (completion hook →
    career profile), hydrate/snapshot wiring, and `buildAssignmentContext()`.
  - `docs/IMPLEMENTATION_REPORTS.md`: consolidated master tracker updated with Phase 27.3.
  - `docs/DEVELOPMENT_ROADMAP.md`: Phase 27.3 marked complete.

### 3. Verification & Test Results
Verified availability, rank/level requirements, prerequisites, acceptance, multi-stage progress,
non-question objectives, completion conditions, failure conditions, duplicate-completion prevention,
reward result generation, idempotent claims, the completion hook, snapshot round-trip, catalogue
validation, and save/load persistence (including career-profile mirroring).
- **Automated Tests (`npm test`)**: 74 test files passed (953 passed, 0 failures). The new assignment suite contributes 44 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

---

# Phase 27.4 — Profession Question Integration (Real-World Professions)

**Date**: 2026-11-09  
**Phase**: 27.4 (Handbook Section: Phase 27 — Real-World Professions and Careers)  
**Status**: Completed

### 1. Executive Summary
Phase 27.4 connects the professional assignment framework to the **existing** question management
and retrieval system, introducing **no new question engine**. A headless bridge,
`AssignmentQuestionResolver`, builds filter criteria for the existing `QuestionRepository`,
prioritises profession relevance through two new backward-compatible optional question fields
(`professionTags`, `specialtyTags`), respects the shared educational-tier configuration and the
existing difficulty system, applies a **configurable multi-level fallback** that widens scope step by
step and **reports** what it did (never silently returning unrelated questions), and surfaces
missing-coverage information. Question *selection* is kept separate from answer *evaluation*: the
resolver returns `Question[]` only, and answers continue through the existing `AnswerEvaluator` and
mastery pathways unchanged. Selection flow: identify profession → assignment → subjects/topics →
tier → difficulty → retrieve from the existing repository → prioritise profession relevance → return.

### 2. Files Created and Modified
- **New Files**:
  - `src/professions/AssignmentQuestionResolver.ts`: headless bridge (`resolve`, `assessCoverage`),
    `getStageQuestionRequirement`, request/result/coverage/fallback-event types, and the configurable
    `AssignmentFallbackStrategy` (`DEFAULT_ASSIGNMENT_FALLBACK_STRATEGY`).
  - `src/professions/ProfessionQuestionSamples.ts`: labelled sample profession question mappings for
    Doctor, Electrical Engineer, and Architect (+ untagged counterparts); not merged into the bundled bank.
  - `tests/professions/phase27_4_question_integration.test.ts` (28 tests).
  - `docs/PHASE_27_4_IMPLEMENTATION_REPORT.md`: standalone phase report.
- **Modified Files**:
  - `src/core/types/question.ts`: optional `professionTags`/`specialtyTags` on `Question`.
  - `src/questions/retrieval/QuestionRepository.ts`: optional `professionTags`/`specialtyTags` filter criteria + OR-logic filtering.
  - `src/questions/management/QuestionValidator.ts`: validates the new optional fields.
  - `src/professions/index.ts`: barrel exports for the resolver and sample module.
  - `docs/IMPLEMENTATION_REPORTS.md`: consolidated master tracker updated with Phase 27.4.
  - `docs/DEVELOPMENT_ROADMAP.md`: Phase 27.4 marked complete.

### 3. Verification & Test Results
Verified metadata backward compatibility, repository tag filtering (legacy behaviour unchanged),
profession-specific selection (prioritisation, fill, specialty hint), subject/topic scoping,
educational-tier compatibility (no advanced questions to beginners; configurable ceiling), difficulty
handling (exact; relax-within-tier), fallback behaviour (widen topics; no silent out-of-scope;
emergency only when enabled), missing-coverage reporting, backward compatibility with the bundled
bank, PvE retrieval regression (`DifficultyEngine.resolveQuestionsWithFallback`), and the stage
question requirement bridge.
- **Automated Tests (`npm test`)**: 75 test files passed (981 passed, 0 failures). The new integration suite contributes 28 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

---

# Phase 27.5 — Profession Experience, Rank, Reputation, and Rewards (Real-World Professions)

**Date**: 2026-11-09  
**Phase**: 27.5 (Handbook Section: Phase 27 — Real-World Professions and Careers)  
**Status**: Completed

### 1. Executive Summary
Phase 27.5 makes profession progression **real and independent**. A headless
`ProfessionProgressionService` owns the rules of profession advancement — the configurable EXP curve,
multi-level advancement, rank derivation, and reputation — and applies their result to the
authoritative career records held by the existing `CareerService`. A companion headless
`AssignmentRewardService` routes a completed assignment's configured reward bundle through the
**existing** progression, mastery, and currency services instead of re-implementing reward logic. The
three progression systems remain strictly independent: character (combat) level (`ProgressionService`),
subject mastery (`MasteryManager`), and profession (career) level (`ProfessionProgressionService`). A
high character or mastery level never advances profession rank, and advancing a profession never grants
character EXP or mastery. No new save field was introduced — progression mutates the career records
already persisted through `CareerSnapshot`, so no schema migration was required.

### 2. Files Created and Modified
- **New Files**:
  - `src/professions/ProfessionProgressionService.ts`: the progression engine —
    `getProfessionExpForNextLevel(level, settings)` (EXP curve) and the `ProfessionProgressionService`
    (`getExpForNextLevel`, `getRank`, `hasReachedRank`, `awardProfessionExp`, `awardReputation`,
    `getProgress`) plus result types and `ProfessionProgressionFailureReason`; exports the shared
    `professionProgressionService`.
  - `src/professions/AssignmentRewardService.ts`: the reward router —
    `AssignmentRewardService.distributeCompletion(completionId)` driven by an injected
    `AssignmentRewardContext` of callbacks, with `AssignmentGrantedRewards` /
    `AssignmentRewardDistributionResult`.
  - `tests/professions/phase27_5_progression.test.ts` (24 tests).
  - `docs/PHASE_27_5_IMPLEMENTATION_REPORT.md`: standalone phase report.
- **Modified Files**:
  - `src/mastery/MasteryManager.ts`: added `awardMasteryExp(subject, amount)`, granting raw mastery
    EXP through the **same** level curve and level-up listeners as answer-based gains.
  - `src/professions/ProfessionTypes.ts`: added `ProfessionProgressionUpdate` (store-operation payload).
  - `src/professions/CareerService.ts`: added `applyProgression(professionId, update)` — a validated
    store operation that clamps level/EXP/reputation, re-derives the current rank, and graduates the
    record at the profession's maximum level.
  - `src/professions/index.ts`: barrel exports for the progression service and reward router.
  - `src/player/PlayerSessionManager.ts`: creates `professionProgression` and `assignmentRewards`,
    builds `buildRewardContext()` from existing session services, exposes
    `distributeAssignmentRewards(completionId)`, and auto-distributes rewards (then saves) in the
    assignment `onCompleted` hook.
  - `docs/IMPLEMENTATION_REPORTS.md`: consolidated master tracker updated with Phase 27.5.
  - `docs/DEVELOPMENT_ROADMAP.md`: Phase 27.5 marked complete.

### 3. Verification & Test Results
Coverage (24 tests): the EXP curve (base/growth; `Infinity` at max), EXP awarding (unknown/un-enrolled
failures; level-up; leftover EXP and multi-level advancement; rank advancement; non-positive/invalid
amounts ignored; max-level cap + `Graduated`), reputation (accumulation; no negative reduction; failure
reasons), progress info & rank unlock gates, career-store clamping and rank re-derivation, reward
routing (all five reward kinds; idempotent replay; failed assignment receives nothing; safe failure
paths), separation of the three progression systems, and persistence (career snapshot round-trip;
end-to-end session distribution + save/load, including claimed status).
- **Automated Tests (`npm test`)**: 76 test files passed (1005 passed, 0 failures). The new progression suite contributes 24 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

---

# Phase 27.6 — Career UI, NPC, and Quest Integration (Real-World Professions)

**Date**: 2026-11-09  
**Phase**: 27.6 (Handbook Section: Phase 27 — Real-World Professions and Careers)  
**Status**: Completed

### 1. Executive Summary
Phase 27.6 makes the profession framework **visible and playable** by adding the four career
interfaces required by the phase (Career Selection, Career Profile, Workplace, Assignment) and
connecting them to the world through the **existing** NPC, dialogue, and quest systems — no duplicate
NPC system and no duplicate quest engine. A headless `src/professions/CareerViewModels.ts` turns the
authoritative `CareerService` / `WorkplaceService` / `AssignmentService` / `ProfessionProgressionService`
into display-ready view models, so all "UI-facing service logic" is unit-tested without a browser and
the new `CareerModal` overlay stays a thin renderer. The modal reuses the existing `QuestionModal` +
shared `QuestionRepository` + `AssignmentQuestionResolver` for assignment questions. Career NPCs flow
through the existing `NPCDialogueModal` (which gains one career entry button); career quests live in the
existing `QuestRegistry` under the new `QuestCategory.Career`, distinct from general quests and from
professional assignments. No new save field was required — Phase 27.1's `CareerSnapshot` /
`AssignmentSnapshot` already persist all career state; this phase only exposes view accessors on
`PlayerSessionManager`.

### 2. Files Created and Modified
- **New Files**:
  - `src/professions/CareerViewModels.ts`: headless UI-facing builders (`buildProfessionCatalogueView`,
    `buildCareerProfileView`, `buildWorkplaceView`, `buildAssignmentView`), `CareerViewDeps`, and all
    view-model types.
  - `src/ui/career-modal/CareerModal.ts`: the single career overlay (Careers / Profile / Workplace tabs
    + inline Assignment detail) driving enroll/accept/progress/complete/abandon and assignment
    questions.
  - `src/ui/career-modal/career-modal.css`, `src/ui/career-modal/index.ts`.
  - `tests/professions/phase27_6_career_ui.test.ts` (22 tests).
  - `docs/PHASE_27_6_IMPLEMENTATION_REPORT.md`: standalone phase report.
- **Modified Files**:
  - `src/player/PlayerSessionManager.ts`: injectable `WorkplaceService`, `careerViewDeps()`, and
    `getCareerCatalogueView()` / `getCareerProfileView()` / `getWorkplaceView()` / `getAssignmentView()`.
  - `src/professions/index.ts`, `src/ui/index.ts`: barrel exports.
  - `src/quests/NPCTypes.ts`: optional `workplaceId` on `NPCDefinition`.
  - `src/quests/NPCRegistry.ts`: `career-advisor-marisol` gains quest dialogue + `workplaceId`; added
    `academy-instructor-lena` and `doctor-quinn` (workplace staff).
  - `src/professions/WorkplaceRegistry.ts`: `academy` / `hospital` `npcIds`.
  - `src/quests/QuestTypes.ts`: `QuestCategory.Career`.
  - `src/quests/QuestRegistry.ts`: `quest-career-orientation` + `getQuestsByCategory()`.
  - `src/ui/npc-dialogue/NPCDialogueModal.ts` (+ `.css`): `onOpenCareer` footer action.
  - `src/scenes/VillageScene.ts`: career NPC routing, `openCareerModal()`, guards, prompt, shutdown cleanup.
  - `docs/IMPLEMENTATION_REPORTS.md`, `docs/DEVELOPMENT_ROADMAP.md`.

### 3. Verification & Test Results
Coverage (22 tests): career-selection view, career-profile view (incl. active → history), workplace view
(facility access per context; offers; activities), assignment view (available → active → completed),
career quest integration (distinct category; registered quest; separation from general quests and
assignments; NPC pipeline), career NPC integration (type/workplace/quest; bidirectional NPC ↔ workplace;
map placement), and a `PlayerSessionManager` save/load round trip of the career view models. The
handbook's runtime checklist is exercised at the service/view-model layer; scene routing and the overlay
are thin wrappers over the tested logic.
- **Automated Tests (`npm test`)**: 77 test files passed (1027 passed, 0 failures). The new career-UI suite contributes 22 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

---

# Phase 27.7 — Seed Professions End-to-End and Extensibility Validation (Real-World Professions)

**Date**: 2026-11-09  
**Phase**: 27.7 (Handbook Section: Phase 27 — Real-World Professions and Careers)  
**Status**: Completed

### 1. Executive Summary
Phase 27.7 closes the Phase 27 track. It (1) completes the three fully-defined seed professions —
**Doctor, Electrical Engineer, Architect** — so each is playable end-to-end (definition, workplace,
**at least one interactive NPC**, facilities, **two example assignments**, profession-tagged questions,
EXP/reputation progression, configurable rewards, save/load, and career-UI integration), and (2) proves
extensibility by adding **Teacher** *purely through configuration*, with **no core-engine change**, and
verifying it can be displayed, enrolled in, workplace-accessed, assigned, served questions, rewarded,
and restored from a save. The remaining seed gap was the interactive-NPC requirement: the Engineering
Center and Architecture Studio had no staffed NPC, so two workplace-staff NPCs were added and wired
bidirectionally. Teacher reuses the existing Academy workplace/NPC, category, assignment engine, question
resolver, and progression/reward services — adding only catalogue data.

### 2. Files Created and Modified
- **New Files**:
  - `tests/professions/phase27_7_seed_professions.test.ts` (37 tests): seed end-to-end + extensibility.
  - `docs/PHASE_27_7_IMPLEMENTATION_REPORT.md`: standalone phase report.
- **Modified Files**:
  - `src/quests/NPCRegistry.ts`: added `engineer-rurik` (`engineering-center`) and `architect-ines`
    (`architecture-studio`) workplace-staff NPCs on `beginners-village`.
  - `src/professions/WorkplaceRegistry.ts`: Engineering Center / Architecture Studio `npcIds`; Academy
    `professionIds: ['teacher']`.
  - `src/professions/ProfessionRegistry.ts`: appended the configuration-only **Teacher** profession.
  - `src/professions/AssignmentRegistry.ts`: appended two Teacher assignments (append-only).
  - `src/professions/ProfessionQuestionSamples.ts`: appended five Teacher question samples (append-only).
  - `docs/DEVELOPMENT_ROADMAP.md`, `docs/IMPLEMENTATION_REPORTS.md`.

### 3. Verification & Test Results
Coverage (37 tests): seed-profession end-to-end (definition; workplace + linked NPC; facilities;
≥2 assignments; tagged question samples; enroll → EXP + reputation; full activity completion with
idempotent configurable reward distribution; career+assignment save/load round trip) for all three seed
professions; Teacher extensibility (catalogue/category; displayable in the career selection view;
enrollable; Academy workplace + staffed NPC; assignments without engine change; questions retrieved via
`AssignmentQuestionResolver` at elementary and junior-high tiers; EXP + rewards + save/restore; gated
follow-up unlocked through rank + prerequisite); and catalogue validation/regression (profession,
workplace incl. cross-associations, and assignment catalogues validate clean; bundled bank stays
profession-tag-free; career NPCs remain in the Beginners Village).
- **Automated Tests (`npm test`)**: 78 test files passed (1064 passed, 0 failures). The new Phase 27.7 suite contributes 37 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

### 4. Phase 27 Closure
With 27.7 complete, the Phase 27 track (Real-World Professions and Careers) is finished: framework,
workplaces, assignment engine, question integration, progression, career UI/NPC/quest integration, and
end-to-end seed validation with a configuration-only extensibility demonstration.

---

# Phase 28.1 — Save Schema Versioning and Migrations (Save Integrity)

**Date**: 2026-11-09  
**Phase**: 28.1 (Handbook Section: Phase 28 — Save Integrity and Administration Hardening)  
**Status**: Completed

### 1. Executive Summary
Phase 28.1 adds a **centralized save schema version and migration chain**. The load path previously
called `validateSaveData` directly (repairing missing optional fields) with no ordered version history,
no explicit handling of unknown future versions, and no recovery copy. The new framework defines the
current/earliest supported versions plus a contiguous one-version migration chain, migrates older
supported saves up to the current schema, validates **after** migration, applies a non-destructive
best-effort fallback for unknown future versions, and writes a **recovery copy** of the pre-migration
payload before a migrated save is used.

### 2. Files Created and Modified
- **New Files**:
  - `src/storage/SaveMigrations.ts` — `EARLIEST_SUPPORTED_SAVE_VERSION`, `SaveMigration`,
    `SAVE_MIGRATIONS`, `SaveMigrationResult`, `readSaveVersion`, `migrateSaveData`.
  - `tests/storage/phase28_1_save_migrations.test.ts` (19 tests).
  - `docs/PHASE_28_1_IMPLEMENTATION_REPORT.md`.
- **Modified Files**:
  - `src/storage/IndexedDBStorageService.ts` — `loadGame` runs `migrateSaveData`; added a pre-migration
    recovery copy (`migration-backup`) + `getRecoveryCopy()`; in-memory mirror; `clearSave()` clears it.
  - `src/storage/index.ts` — re-exports the new module.
  - `docs/DEVELOPMENT_ROADMAP.md`, `docs/IMPLEMENTATION_REPORTS.md`.

### 3. Design
- Centralized version (`SAVE_DATA_SCHEMA_VERSION` = 6) and `EARLIEST_SUPPORTED_SAVE_VERSION` = 1, with
  `SAVE_MIGRATIONS` as a contiguous `{ from, to, description, migrate }` chain (each step `from → from+1`).
- `migrateSaveData` normalises the version (missing/invalid → earliest), runs the chain to the current
  version, then validates — so validation always follows migration.
- The schema has grown **additively** since v1, so each step preserves all data and stamps the new
  version; a future non-additive change implements a real transform in the relevant step.
- Unknown **future** versions are never migrated; a best-effort validation preserves valid data
  (`futureVersion: true`). Failures return no data and never mutate storage.

### 4. Verification & Test Results
`tests/storage/phase28_1_save_migrations.test.ts` (19 tests): chain integrity; migration of every
supported version (1–6) with data preservation; missing-version defaulting; validation-after-migration
failures; no mutation of the original payload; unknown future versions (valid → preserved, invalid →
safe failure); `readSaveVersion` edge cases; and storage integration (legacy save loads at current
version, recovery copy captured, no copy for current-version saves, `clearSave()` clears the copy).
- **Automated Tests (`npm test`)**: 79 test files passed (1083 passed, 0 failures). The Phase 28.1 suite contributes 19 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

### 5. Out of Scope
Backup/restore and save slots (28.2), corruption recovery/diagnostics (28.3), Super Admin protection
(28.4), and import/export + content versioning (28.5) remain for their own subphases.

---

# Phase 28.2 — Backup, Restore, and Save Slots (Save Integrity)

**Date**: 2026-11-09  
**Phase**: 28.2 (Handbook Section: Phase 28 — Save Integrity and Administration Hardening)  
**Status**: Completed

### 1. Executive Summary
Phase 28.2 makes saves **portable and recoverable** with no new save fields and no schema change
(schema stays at v6). A headless, execution-free `SaveTransfer` module wraps a save in a versioned JSON
export envelope (`format`/`formatVersion`/`schemaVersion`/`exportedAt`/`generator`/`data`) and parses
imports strictly (older saves migrate forward; a newer container version is rejected; a newer schema is
preserved best-effort). Backup/restore and named **save slots** are added to the storage layer as
**optional** interface methods (so test doubles stay valid), implemented by both the IndexedDB and
in-memory services. Slots are supported cleanly because the object store is a plain key/value store —
each slot is just a distinct key, requiring no schema or store-version change.

### 2. Files Created and Modified
- **New Files**:
  - `src/storage/SaveTransfer.ts` — envelope + `createSaveExport` / `serializeSaveExport` /
    `exportSaveToString` / `parseSaveImport`.
  - `tests/storage/phase28_2_save_transfer.test.ts` (24 tests).
  - `docs/PHASE_28_2_IMPLEMENTATION_REPORT.md`.
- **Modified Files**:
  - `src/storage/StorageTypes.ts` — `SAVE_SLOT_IDS`/`SaveSlotId`, `SaveSlotInfo`, `RestoreResult`, and
    optional `listSaveSlots`/`saveToSlot`/`loadFromSlot`/`deleteSlot`/`backupActiveSave`/`restoreActiveSave`.
  - `src/storage/IndexedDBStorageService.ts` — slot/backup/restore on both services (`slot:<id>` + `backup`
    keys); `clearSave()` clears slots and backup.
  - `src/storage/index.ts` — re-exports `./SaveTransfer`.
  - `docs/DEVELOPMENT_ROADMAP.md`, `docs/IMPLEMENTATION_REPORTS.md`.

### 3. Verification & Test Results
Coverage (24 tests): export-envelope stamping + JSON round-trip; export→import round-trip (player data
preserved; bare saves still import); malformed/invalid files (non-JSON, non-object, unrecognized format,
unsupported container version, missing/invalid format version, missing data, corrupt payload); version
handling (older save migrates forward; future-schema preserved best-effort); execution-free imports (inert
content, no prototype pollution); save slots (empty listing, write/read/metadata, delete, invalid-save
rejection, `clearSave`); and backup/restore/rollback (confirmation required, previous save backed up before
replacement, no backup on empty profile, invalid restore rejected without state change).
- **Automated Tests (`npm test`)**: 80 test files passed (1107 passed, 0 failures). The Phase 28.2 suite contributes 24 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

### 4. Out of Scope
Corruption recovery/diagnostics (28.3), Super Admin protection (28.4), and import/export compatibility +
content versioning (28.5) remain for their own subphases.

---

# Phase 28.3 — Corruption Recovery and Data Diagnostics (Save Integrity)

**Date**: 2026-11-09  
**Phase**: 28.3 (Handbook Section: Phase 28 — Save Integrity and Administration Hardening)  
**Status**: Completed

### 1. Executive Summary
Phase 28.3 makes damaged saves **survivable and explainable**. `validateSaveData` now reports a
content-free per-section outcome (`intact`/`repaired`/`reset`/`missing`/`failed`), and a new
`recoverSaveData` layer migrates and validates first, then salvages **only the player record** when it is
the blocking section — preserving every other valid section. Both storage services expose a detailed
load status (`empty`/`intact`/`repaired`/`salvaged`/`unreadable`) and a bounded, deduplicated recovery log
containing only section names, status lists, versions, and timestamps. Damaged raw payloads are kept
under a dedicated `load-recovery` key; an unreadable save is **not overwritten** on first boot.
`PlayerSessionManager` surfaces a content-free notice that `BootScene` renders via a dismissible DOM
banner, and storage-access failures still produce a playable session with a warning. No save fields or
schema changes were introduced (schema stays at v6).

### 2. Files Created and Modified
- **New Files**:
  - `src/storage/SaveDiagnostics.ts` — diagnostics vocabulary, bounded recovery-log helpers, and the
    content-free user-message builder.
  - `src/storage/SaveRecovery.ts` — `recoverSaveData` / `SaveRecoveryResult` / player-only salvage.
  - `src/ui/save-recovery/` — `SaveRecoveryNotice` component, CSS, and index.
  - `tests/storage/phase28_3_save_diagnostics.test.ts` (23 tests).
  - `docs/PHASE_28_3_IMPLEMENTATION_REPORT.md`.
- **Modified Files**:
  - `src/storage/SaveDataValidator.ts` — per-section diagnostics; invalid inventory capacity is now
    repaired to the default.
  - `src/storage/SaveMigrations.ts` — diagnostics passthrough and migration-gap report.
  - `src/storage/StorageTypes.ts` — `SaveLoadStatus`, `SaveLoadResult`, optional
    `loadGameDetailed()` / `getRecoveryLog()`.
  - `src/storage/IndexedDBStorageService.ts` — detailed load, `load-recovery` + `recovery-log` keys,
    recovery-aware slot loads; in-memory service mirrors the behavior.
  - `src/storage/index.ts` — re-exports the new modules.
  - `src/player/PlayerSessionManager.ts` — detailed-load consumption, recovery notice/report getters,
    storage-availability tracking, and the unreadable-save no-overwrite guard.
  - `src/scenes/BootScene.ts`, `src/ui/index.ts` — show the recovery banner after bootstrap.
  - `docs/DEVELOPMENT_ROADMAP.md`, `docs/IMPLEMENTATION_REPORTS.md`.

### 3. Verification & Test Results
Coverage (23 tests): section diagnostics (intact, corrupted inventory/mastery/player/settings, missing
optional sections); recovery orchestration (intact/repaired loads, missing-player and empty-name salvage
with level/stats preserved, unreadable input, future versions, no payload mutation); recovery log
(content-free, deduplicated via `occurrences`, bounded to 20 entries); storage integration (repair +
raw-payload preservation + logging + dedupe, unreadable payload retention, migration logging,
`clearSave()` cleanup); and session behavior (storage failure warning, no overwrite of an unreadable
save, repaired data loads with notice).
- **Automated Tests (`npm test`)**: 81 test files passed (1130 passed, 0 failures). The Phase 28.3 suite contributes 23 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

### 4. Out of Scope
Super Admin protection (28.4) and import/export + content versioning (28.5) remain for their own
subphases.





















---

# Phase 28.4 — Super Admin Protection (Local Administration Hardening)

**Date**: 2026-11-09  
**Phase**: 28.4 (Handbook Section: Phase 28 — Save Integrity and Administration Hardening)  
**Status**: Completed

### 1. Executive Summary
Phase 28.4 removes the accidental path into Super Admin tools. The start menu now offers a single
primary action (`Enter as User`); admin entry is a muted secondary link or `Ctrl/Cmd+Shift+A`, which
opens a local gate. The gate supports an optional build-time SHA-256 passcode hash
(`VITE_ADMIN_PASSCODE_HASH`) with no hardcoded credential, and falls back to typing `LOCAL ADMIN` to
acknowledge that local protection is not secure. Five failed attempts trigger a 30-second cooldown.
`AdminDashboardScene` independently refuses to render without the Super Admin role, the dashboard shows
a permanent local-only warning, and restoring a backup now snapshots the current bank first so the
restore can be reverted. Existing create/update/import validation, all-or-nothing bulk operations,
delete confirmations, and pre-import backups remain unchanged. No save or question schema changes were
introduced.

### 2. Files Created and Modified
- **New Files**:
  - `src/config/adminAccessConfig.ts` — configuration, SHA-256 hash normalization, warning text, optional
    env-hash reader.
  - `src/core/roles/AdminAccessService.ts` — headless two-mode gate with attempt counting, cooldown, and
    injectable clock/hasher.
  - `src/ui/admin-access/` — `AdminAccessDialog` component, CSS, and index.
  - `src/vite-env.d.ts`, `tests/admin/phase28_4_admin_protection.test.ts` (16 tests),
    `docs/PHASE_28_4_IMPLEMENTATION_REPORT.md`.
- **Modified Files**:
  - `src/ui/start-menu/StartMenu.ts` + CSS — pure markup builder, one primary role action, subtle admin
    link, keyboard shortcut, listener cleanup.
  - `src/scenes/BootScene.ts` — owns the gate service/dialog and enters admin tools only after a granted
    decision.
  - `src/scenes/AdminDashboardScene.ts` — Super Admin role guard.
  - `src/ui/admin/AdminDashboard.ts` + CSS — local-only warning banner; pre-restore backup and
    revert message.
  - `src/core/roles/index.ts`, `src/ui/index.ts`, `src/ui/start-menu/index.ts` — exports.
  - `docs/DEVELOPMENT_ROADMAP.md`, `docs/IMPLEMENTATION_REPORTS.md`.

### 3. Verification & Test Results
Coverage (16 tests): configuration (no default credential, warning wording, hash normalization,
env/override resolution); acknowledgement mode (exact phrase, case sensitivity, empty input without
penalty, lockout, lock refusal, cooldown expiry, reset on success); passcode mode (injected hasher,
wrong passcode, unavailable hashing without lockout, known SHA-256 vector); and entry points/defence in
depth (single primary user action, secondary admin link, non-admin role never treated as Super Admin).
- **Automated Tests (`npm test`)**: 82 test files passed (1146 passed, 0 failures). The Phase 28.4 suite contributes 16 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

### 4. Out of Scope
Import/export compatibility and content versioning (28.5) remain for their own subphase. The report
documents future server-side authentication/authorization requirements; no server infrastructure was
added.

---

# Phase 28.5 — Import/Export and Content Versioning

**Date**: 2026-11-09  
**Phase**: 28.5 (Handbook Section: Phase 28 — Save Integrity and Administration Hardening)  
**Status**: Completed

### 1. Executive Summary
Phase 28.5 makes every interchange format self-describing and version-checked. Question bank exports
now use a `knowledge-realms-question-bank` v1 envelope that carries the question records plus tombstone
and bundled-override metadata; a bare array is still accepted and classified as legacy v0. Unknown
formats and future versions are rejected before any record is examined, and every import is parsed,
validated, and duplicate-checked in memory before a single write. An optional
`knowledge-realms-content-pack` v1 envelope wraps the same bank payload for author-published packs.
The admin dry-run now reports format compatibility, overrides, tombstones, and blocking errors, and the
download is stamped with the format version. Save exports were already versioned; this phase adds
explicit coverage that old schemas migrate and future container versions are rejected. No save or
question schema changes were introduced.

### 2. Tombstone and Override Semantics
- Tombstones are bundled IDs deleted locally. Full exports include them; filtered exports omit them.
- Imported tombstones are **additive**: an import never clears existing tombstones, and a tombstone may
  not also appear as a question in the same file.
- Overrides are locally stored records whose IDs also exist in bundled data; the envelope lists them
  for transparency.
- An incoming record colliding with a **bundled** ID is accepted as an override. A collision with any
  other stored question is a duplicate-ID error that rejects the whole batch.

### 3. Files Created and Modified
- **New Files**:
  - `src/questions/management/QuestionBankTransfer.ts` — bank envelope constants/types, pure export
    builders, and execution-free `parseQuestionBankImport` with legacy/current/future/unknown
    classification, per-record validation, duplicate detection, and metadata conflict checks.
  - `src/questions/management/ContentPackTransfer.ts` — versioned content-pack envelope with
    `createContentPack`, `serializeContentPack`, and `parseContentPack`.
  - `tests/questions/phase28_5_content_versioning.test.ts` (22 tests),
    `docs/PHASE_28_5_IMPLEMENTATION_REPORT.md`.
- **Modified Files**:
  - `src/questions/management/QuestionManager.ts` — bundled-ID tracking; `exportBankToJson`,
    `previewBankImport`, `importBankFromJson`; all-or-nothing analysis; `restoreBackup` accepts
    versioned envelopes and preserves tombstones. Legacy array-based methods remain unchanged.
  - `src/questions/index.ts` — new transfer and manager result types.
  - `src/ui/admin/AdminDashboard.ts` — versioned preview/import/export, compatibility label, override
    and tombstone counts, and filtered-export tombstone note.
  - `docs/DEVELOPMENT_ROADMAP.md`, `docs/IMPLEMENTATION_REPORTS.md`.

### 4. Verification & Test Results
Coverage (22 tests): envelope stamping/round-trip; legacy v0; unknown/future/missing-array rejection;
invalid and intra-batch duplicate reporting; tombstone/override contradictions; execution-free strings;
valid versioned and legacy imports; future files leaving the bank untouched; duplicate and bundled-ID
collision handling; no partial writes on invalid batches; store failure leaving the repository
unchanged; full versus filtered tombstone export; additive tombstones; versioned-backup restore;
content-pack round-trip and version rejection; and save-export format/schema compatibility.
- **Automated Tests (`npm test`)**: 83 test files passed (1168 passed, 0 failures). The Phase 28.5 suite contributes 22 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

### 5. Out of Scope
No runtime content-pack loader or content-pack browser UI was added, and save export/import remains
headless. Release readiness (Phase 29) remains for the next phases; no deployment or publishing was
performed.

---

# Phase 29.1 — Performance and Memory Optimization

**Date**: 2026-11-09  
**Phase**: 29.1 (Handbook Section: Phase 29 — Release Readiness)  
**Status**: Completed

### 1. Executive Summary
Phase 29.1 measured the production build and start path before optimizing, then applied four targeted
changes: lazy gameplay/admin scene loading, a separate Phaser vendor chunk, deduplicated question
manager initialization with overlapped/parallel storage reads, and timeout cleanup for modal/dashboard
teardown. The start-menu encoded transfer fell from 462,647 B to 394,792 B (−14.7%), initial JS gzip
from 452.06 kB to 393.37 kB (−13.0%), and initial CSS gzip from 9.99 kB to 1.42 kB. In headless Chrome
the Village HUD appeared 158–178 ms after starting and the admin dashboard 90 ms after a successful
gate. No new dependencies were added. Full measurements and caveats are in
`docs/PHASE_29_1_PERFORMANCE_REPORT.md`.

### 2. Files Created and Modified
- **New Files**:
  - `docs/PHASE_29_1_PERFORMANCE_REPORT.md`, `docs/PHASE_29_1_IMPLEMENTATION_REPORT.md`.
  - `scripts/measure-phase29-1.mts` — reproducible benchmark for bundled-question loading and repeated
    manager initialization.
  - `tests/questions/phase29_1_performance.test.ts` (3 tests).
- **Modified Files**:
  - `src/main.ts` — registers only `BootScene`.
  - `src/scenes/BootScene.ts` — loads/registers gameplay scenes on user start and admin tools after a
    granted gate decision; registration is idempotent.
  - `src/scenes/AdminDashboardScene.ts` — lazy dashboard UI/stylesheet import with an active-scene guard.
  - `src/questions/management/QuestionManager.ts` — shared in-flight initialization promise, overlapped
    store open, parallel question/tombstone reads, retry after failure.
  - `src/ui/question-modal/QuestionModal.ts`, `src/ui/admin/AdminDashboard.ts` — clear pending timeouts
    in `destroy()`.
  - `vite.config.ts`, `tsconfig.json`, `docs/DEVELOPMENT_ROADMAP.md`, `docs/IMPLEMENTATION_REPORTS.md`.

### 3. Verification & Test Results
Coverage (3 tests): concurrent `initialize()` calls perform one storage bootstrap; repeated calls after
success do no storage work; a failed bootstrap clears the in-flight promise so startup can retry.
- **Automated Tests (`npm test`)**: 84 test files passed (1171 passed, 0 failures).
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors (including the benchmark script).
- **Production Build (`npm run build`)**: Succeeded; 214 modules, Vite build 5.65 s.
- **Headless Chrome**: start menu → Village HUD and start menu → admin gate → dashboard verified; no
  duplicate HUD elements observed.

### 4. Out of Scope
Headless timings are unthrottled and not real-device results. Hunting/battle transitions were not
manually replayed end-to-end, and long-session memory growth was not soaked. Browser/device
compatibility, PWA, accessibility/localization, and deployment remain Phases 29.2–29.5.

---

# Phase 29.2 — Browser and Device Compatibility

**Date**: 2026-11-09  
**Phase**: 29.2 (Handbook Section: Phase 29 — Release Readiness)  
**Status**: Completed

### 1. Executive Summary
Phase 29.2 audited the browser APIs actually used by the game and defined an explicit support
matrix before testing. Desktop Chromium is verified at 1920×1080, 1366×768, 1024×768, and 800×600:
the canvas letterboxes without stretching, there is no page overflow, exactly one HUD exists, and
Escape opens the pause modal. A full reload restored the IndexedDB save (schema v6) and re-entered
the Village. Three low-risk compatibility guards were added: an in-memory question store/factory
when IndexedDB is absent, bundled-question fallback when question storage fails to open, a
session-only save warning for non-persistent storage, and a non-secure-context fallback for
`crypto.randomUUID`. Firefox, Safari, mobile/touch-only devices, real quota exhaustion, and long
sessions remain unverified and are explicitly not claimed in
`docs/PHASE_29_2_COMPATIBILITY_REPORT.md`.

### 2. Files Created and Modified
- **New Files**:
  - `docs/PHASE_29_2_COMPATIBILITY_REPORT.md` — support matrix, methodology, results, API behavior,
    and non-claims.
  - `src/core/uniqueId.ts` — `createUniqueId()` with a timestamp/random fallback.
  - `tests/storage/phase29_2_compatibility.test.ts` (9 tests).
  - `scripts/verify-phase29-2.mjs` — CDP viewport/reload/no-IndexedDB verification.
- **Modified Files**:
  - `src/storage/QuestionStore.ts` — `InMemoryQuestionStore`, `createQuestionStore()`, and a clear
    missing-API error in `IndexedDBQuestionStore.init()`.
  - `src/storage/StorageTypes.ts`, `src/storage/IndexedDBStorageService.ts` — optional
    `isPersistent()` capability; in-memory storage reports `false`.
  - `src/player/PlayerSessionManager.ts` — session-only save notice for non-persistent storage,
    without overriding recovery notices.
  - `src/questions/management/QuestionManager.ts` — bundled questions populate the repository even
    when the question store cannot open; bootstrap still rejects so initialization can retry.
  - `src/combat/BattleSession.ts`, `src/arena/ArenaDuelSession.ts` — use `createUniqueId()`.
  - `src/storage/index.ts`, `src/core/index.ts`, `docs/DEVELOPMENT_ROADMAP.md`,
    `docs/IMPLEMENTATION_REPORTS.md`.

### 3. Verification & Test Results
Coverage (9 tests): in-memory question store contract; factory selection with and without IndexedDB;
bundled questions usable after store-init failure; bundled questions survive read failures;
battle-style lookup without storage; session-only save notice; UUID generation and fallback
uniqueness.
- **Automated Tests (`npm test`)**: 85 test files passed (1180 passed, 0 failures).
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (215 modules, Vite 5.18 s).
- **Headless Chrome**: four viewports fit with no overflow and one HUD; Escape opened pause; reload
  restored the save and HUD; no-IndexedDB start showed the session-only notice with no console
  errors or uncaught exceptions.

### 4. Out of Scope
No Firefox/Safari/real-device testing, touch movement controls, timed autosave, unload flush, History
API integration, quota-exhaustion UX, or long-session soak was added. PWA/offline installation,
accessibility/localization review, and production release remain Phases 29.3–29.5.

---

# Phase 29.3 — PWA / Offline Installation and Update Behavior

**Date**: 2026-11-09  
**Phase**: 29.3 (Handbook Section: Phase 29 — Release Readiness)  
**Status**: Completed

### 1. Executive Summary
Phase 29.3 added a production-only PWA layer with `vite-plugin-pwa@2.0.0` (Workbox `generateSW`).
The build now emits a valid web app manifest (standalone/landscape, theme colors, SVG any+maskable
icon), a service worker that precaches the 21 build artifacts (1,949.17 KiB, including lazy scene
chunks), and an offline navigation fallback to `/index.html`. New deployments install a waiting
worker (`skipWaiting`/`clientsClaim` false); the player sees a banner and explicitly chooses
“Save & Reload”, which persists the active session before activating the update. Question/admin data
is never HTTP-cached — it remains authoritative in IndexedDB. A first-install banner explains offline
readiness while warning that browser storage may still be cleared. Headless Chrome verified install,
control after reload, offline reload with save persistence, the waiting-update prompt, and
save-before-reload activation, with zero installability errors and no console exceptions. Full
details are in `docs/PHASE_29_3_IMPLEMENTATION_REPORT.md`.

### 2. Files Created and Modified
- **New Files**:
  - `docs/PHASE_29_3_IMPLEMENTATION_REPORT.md`, `src/pwa/pwaConfig.ts`,
    `src/pwa/registerServiceWorker.ts`, `src/pwa/UpdateNotice.ts`, `src/pwa/update-notice.css`,
    `public/pwa-icon.svg`, `tests/pwa/phase29_3_pwa.test.ts` (5 tests),
    `scripts/verify-phase29-3.mjs`.
- **Modified Files**:
  - `vite.config.ts` — `VitePWA` generateSW in prompt mode with explicit registration and Workbox
    policy (precache build artifacts only, navigation fallback, stale-cache cleanup, 3 MiB cap).
  - `package.json`, `package-lock.json` — `vite-plugin-pwa` build-time devDependency.
  - `index.html` — theme color, description, SVG icon.
  - `src/vite-env.d.ts` — PWA client types.
  - `src/main.ts` — production-only service-worker registration.
  - `docs/DEVELOPMENT_ROADMAP.md`, `docs/IMPLEMENTATION_REPORTS.md`.

### 3. Verification & Test Results
Coverage (5 tests): manifest identity/display/colors; any+maskable SVG icons; precache coverage
without an unrestricted glob; no skip-waiting/clients-claim and no runtime caching; hourly update
checks.
- **Automated Tests (`npm test`)**: 86 test files passed (1185 passed, 0 failures).
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded; PWA precache 21 entries (1949.17 KiB), emitting
  `dist/sw.js`, `dist/manifest.webmanifest`, and the Workbox runtime.
- **Headless Chrome (fresh profile)**: manifest fetch `200` with no DevTools/installability errors;
  first install showed the offline-ready banner; reload became controlled; offline reload
  (`navigator.onLine === false`) loaded the start menu/HUD and preserved the IndexedDB save; a
  modified `dist/sw.js` produced a waiting worker and update banner; “Save & Reload” advanced the save
  timestamp, reloaded, cleared `waiting`, and removed the banner; no console errors or uncaught
  exceptions.
- **Dependency audit**: 9 dev/build-time advisories (2 critical pre-existing Vitest/tinypool,
  `vite-plugin-pwa` adds moderate glob/minimatch/deepmerge via `workbox-build`); none are in the
  production bundle. No forced major upgrades were applied.

### 4. Out of Scope
No OS install-prompt automation, `navigator.storage.persist()`, push/background sync, PNG/iOS
apple-touch-icon set, or Firefox/Safari verification was added; permanent storage is not claimed.
No deployment or publishing was performed. Accessibility/localization and production release remain
Phases 29.4–29.5.

---

# Phase 29.4 — Accessibility, Localization Readiness, and UX Review

**Date**: 2026-11-09  
**Phase**: 29.4 (Handbook Section: Phase 29 — Release Readiness)  
**Status**: Completed

### 1. Executive Summary
Phase 29.4 audited text rendering, labels, fonts, contrast, focus, motion, and layout, then added a
centralized UI string table with placeholder templates and `Intl` number formatting, a device-level
text-size preference (Standard/Large/Extra Large) applied at startup and exposed in Pause → Settings,
and scalable font sizing across all 20 UI/PWA stylesheets. The shared accessibility stylesheet was
found to be dead code and is now imported by the app entry point, activating keyboard focus rings,
reduced-motion rules, and responsive HUD rules. Muted text colors failing WCAG AA were darkened,
long strings wrap or ellipsize, the pause modal gained dialog semantics, and Phaser ambient/attack
effects now honor reduced motion. Question and dialogue content was left untouched and separate from
UI language. Headless Chrome verified 130% scaling, persistence across reload, visible keyboard
focus, no horizontal overflow with a 160-character name, and reduced-motion behavior with no console
errors. Full details are in `docs/PHASE_29_4_IMPLEMENTATION_REPORT.md`.

### 2. Files Created and Modified
- **New Files**:
  - `src/ui/strings.ts`, `src/ui/preferences/UiPreferences.ts`, `src/ui/motion.ts`,
    `tests/ui/phase29_4_accessibility.test.ts` (13 tests), `scripts/verify-phase29-4.mjs`,
    `docs/PHASE_29_4_IMPLEMENTATION_REPORT.md`.
- **Modified Files**:
  - `src/main.ts` — applies the saved text scale and imports `accessibility.css`.
  - Start menu, exploration HUD, battle overlay, pause modal, NPC dialogue, inventory, save-recovery
    notice, and PWA update notice — centralized strings, localized numbers, text-size control, and
    dialog labeling.
  - `src/scenes/monsters/MonsterSprite.ts`, `src/scenes/BattleScene.ts` — skip ambient and attack
    tweens under `prefers-reduced-motion`.
  - `src/ui/accessibility.css` and 19 other stylesheets — scalable font sizes, AA contrast colors,
    wrapping/ellipsis, pause select styles, and modal viewport bounds.
  - `docs/DEVELOPMENT_ROADMAP.md`, `docs/IMPLEMENTATION_REPORTS.md`.

### 3. Verification & Test Results
Coverage (13 tests): string namespaces/non-empty values; separation from question content; placeholder
substitution; `Intl` number grouping; text-scale normalization, labels, persistence, apply, and
corrupt/blocked storage; accessibility stylesheet import; focus/reduced-motion/wrapping tokens;
font-size scale coverage across stylesheets; banned low-contrast colors absent; reduced-motion helper
fallback.
- **Automated Tests (`npm test`)**: 87 test files passed (1198 passed, 0 failures).
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded; PWA precache 21 entries (1963.23 KiB).
- **Headless Chrome (fresh profile)**: 130% scale applied (16 → 20.8 px) and persisted across reload;
  no horizontal overflow at 130% or with a 160-character name; focused select matched
  `:focus-visible` with a 2 px outline; reduced-motion emulation collapsed transitions; no console
  errors or uncaught exceptions.

### 4. Out of Scope
No translated string packs, language switcher, RTL/long-word layout validation, screen-reader
session, focus trap for every modal, OS forced-colors testing, canvas text scaling, or translation of
question/dialogue content. Admin dashboard text remains partially localized. Production release
remains Phase 29.5.

---

# Phase 29.5 — Production Build and Release Checklist

**Date**: 2026-11-09  
**Phase**: 29.5 (Handbook Section: Phase 29 — Release Readiness)  
**Status**: Completed — no deployment or publishing performed

### 1. Executive Summary
Phase 29.5 audited the build scripts, environment assumptions, asset paths, deployment model, PWA
output, and error logging, then produced the operator package needed to release without deploying
it. The build now has a single `npm run verify` gate, a pinned Node version, a version-drift test
tying `package.json` to `GAME_VERSION`, shipped third-party MIT notices, and a reproducible
static-artifact verifier. `docs/RELEASE_CHECKLIST.md` documents the release gate, reproducible
build steps, semantic version strategy, release-notes template, root-path HTTPS deployment
requirements with an example nginx block, rollback procedure (including save-schema risks and
prompt-mode service-worker behavior), asset/license inventory, known limitations, smoke-test
checklist, save backup guidance, and the browser support statement. No host was selected and
nothing was published. Full details are in `docs/PHASE_29_5_IMPLEMENTATION_REPORT.md`.

### 2. Files Created and Modified
- **New Files**:
  - `docs/RELEASE_CHECKLIST.md`, `docs/PHASE_29_5_IMPLEMENTATION_REPORT.md`,
    `tests/release/phase29_5_release.test.ts` (9 tests), `scripts/verify-phase29-5.mjs`,
    `.nvmrc`, `public/THIRD_PARTY_NOTICES.txt`.
- **Modified Files**:
  - `package.json` — Node engine constraint and `verify` script.
  - `docs/DEVELOPMENT_ROADMAP.md`, `docs/IMPLEMENTATION_REPORTS.md`.

### 3. Verification & Test Results
Coverage (9 tests): release version sync and semver; private package and toolchain pin; lockfile
presence; single release gate; start-menu version display; production-only service-worker
registration; root-path build with no external asset URLs and no source maps; manifest/index
theme consistency; shipped Phaser/Workbox MIT notices; all required checklist sections present;
independent save-schema and export-format versions.
- **Automated Tests (`npm test`)**: 88 test files passed (1,207 passed, 0 failures).
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded; 24 files in `dist/`, PWA precache 21 entries
  (1963.23 KiB), Phaser chunk 1,481.79 kB raw / 339.86 kB gzip.
- **Static artifact audit**: 21 precache entries; only the gated `SKIP_WAITING` call; no
  `clientsClaim`; no source maps; manifest `start_url`/`scope` `/`; version and notices present.
- **Headless Chrome (fresh profile, production preview)**: start menu showed `v0.1.0`; the save
  database was created; the page was service-worker controlled after reload; an offline reload
  still served the start menu with `navigator.onLine === false`; no console errors or uncaught
  exceptions.

### 4. Out of Scope
No public deployment/publishing (no host chosen), no CI pipeline, code signing, SBOM, or
vulnerability scan, no cross-browser retest, no remote error reporting, no player-facing save
export UI, and no changes to save schema or gameplay. Phase 30 (online architecture) remains
design-only pending explicit approval.

---

# Phase 30.1 — Server-Authoritative Boundaries (Design Only)

**Date**: 2026-11-09  
**Phase**: 30.1 (Handbook Section: Phase 30 — Online Architecture Preparation Only)  
**Status**: Completed — proposal only; no server dependency, endpoint, or multiplayer code added

### 1. Executive Summary
Phase 30.1 audited the offline architecture and produced `docs/ONLINE_ARCHITECTURE_PROPOSAL.md`, a
server-authority design covering player identity, character ownership, inventory/currency
authority, question selection and answer validation, reward calculation, PvP resolution,
anti-cheat boundaries, match state, persistence, reconnection, rate limiting, and server
validation. The audit confirmed there is no network layer and that the client is currently the
sole authority: full question records (including answers) enter battle, `AnswerEvaluator`,
`RewardCalculator`, `DamageCalculator`, `MasteryManager`, economy mutations, and
`ArenaDuelSession` (client `playerCorrect` boolean plus `Math.random` rival) all run locally.
The proposal separates pure, reusable domain modules from the authority boundary that must be
redesigned, sketches request/idempotency/state-version protocols and server persistence, and
defines a staged migration where offline play remains the default and unranked. Nothing was
implemented or deployed.

### 2. Files Created and Modified
- **New Files**:
  - `docs/ONLINE_ARCHITECTURE_PROPOSAL.md`.
- **Modified Files**:
  - `docs/DEVELOPMENT_ROADMAP.md` — added the Phase 30 design-only section with 30.1 checked.
  - `docs/IMPLEMENTATION_REPORTS.md`.

### 3. Verification & Test Results
This phase changed documentation only; no runtime code, tests, dependencies, or configuration
were modified. The audit used repository evidence: no `fetch`/`XMLHttpRequest`/`WebSocket`/
`sendBeacon` gameplay usage; save snapshot composition in `PlayerSessionManager`; full `Question`
payloads in `BattleSession`; client-side `AnswerEvaluator`; injectable-RNG `RewardCalculator`;
`CurrencyService`/`InventoryManager`/`ShopService` local mutations; and `ArenaDuelSession`'s
client-boolean round resolution. No build or test run was required by the handbook for a
design-only phase; the last verified build/test state remains Phase 29.5 (88 files, 1,207 tests,
0 TypeScript errors).

### 4. Out of Scope
No server, database, authentication, matchmaking, PvP, networking dependency, or deployment was
added. No provider or back-end stack was selected. Offline gameplay, saves, questions, and
balance are unchanged. Phase 30.2 (account and identity design) remains a separate design step
requiring confirmation.

---

# Phase 30.2 — Account and Identity Design (Design Only)

**Date**: 2026-11-09  
**Phase**: 30.2 (Handbook Section: Phase 30 — Online Architecture Preparation Only)  
**Status**: Completed — proposal only; no authentication, backend, provider, or dependency added

### 1. Executive Summary
Phase 30.2 produced `docs/ACCOUNT_ARCHITECTURE_PROPOSAL.md`, covering guest/local profile
migration, registration and login, session expiration, account recovery, multiple devices, data
ownership, privacy and security, and server-side authorization. The audit found that the current
game has one anonymous local profile per browser origin and that new characters are created with
the literal id `player-1`; there is no name-entry step (default `Novice Hero`), no account,
session, credential, or network layer, and roles are a local UI selection plus a non-security
passcode gate. The proposal separates four identifiers (account, character, session, guest
profile), defines a consensual one-time guest import validated by the existing save
validator/migrations, specifies server-only password hashing and revocable sessions, and keeps
offline play as the default with no login wall. Existing save validation, migrations, diagnostics,
transfer envelopes, settings, and UI strings are reused; identity ownership, start-menu flow,
admin authorization, and the hardcoded profile id require redesign in later approved stages.

### 2. Files Created and Modified
- **New Files**:
  - `docs/ACCOUNT_ARCHITECTURE_PROPOSAL.md`.
- **Modified Files**:
  - `docs/DEVELOPMENT_ROADMAP.md` — Phase 30.2 checked.
  - `docs/IMPLEMENTATION_REPORTS.md`.

### 3. Verification & Test Results
Documentation-only phase: no runtime code, tests, dependencies, configuration, or build output
changed. The audit used repository evidence: `PlayerSessionManager.initializeSession()` creating
`player-1`, `PlayerData.id`, `RoleManager`/`AdminAccessService` local gating,
`VITE_ADMIN_PASSCODE_HASH`, IndexedDB save scoping, `SaveTransfer` envelopes, and the
content-free `AnswerAttemptEvent` analytics shape. No test or build run was required; the last
verified state remains Phase 29.5 (88 files, 1,207 tests, 0 TypeScript errors).

### 4. Out of Scope
No accounts, authentication, sessions, password storage, email, provider, database, or deployment
were implemented. No provider was selected. Offline saves, gameplay, questions, and balance are
unchanged. Phase 30.3 (online save synchronization design) remains a separate design step
requiring confirmation.

---

# Phase 30.3 — Online Save Synchronization Design (Design Only)

**Date**: 2026-11-09  
**Phase**: 30.3 (Handbook Section: Phase 30 — Online Architecture Preparation Only)  
**Status**: Completed — proposal only; no sync code, backend, transport, or dependency added

### 1. Executive Summary
Phase 30.3 produced `docs/ONLINE_SAVE_SYNC_PROPOSAL.md`. The audit confirmed the current save
model is a single whole-save snapshot per browser profile (`active-profile`) rebuilt from live
client managers and overwritten on every save, with a client `Date.now()` timestamp, separate
settings storage, local slots/backup/recovery keys, strict validation/migration, and no notion of
changes, versions, or devices. The proposal rejects whole-save last-write-wins for online play and
recommends server-authoritative command batches with a persistent IndexedDB outbox, per-character
`stateVersion`, idempotency keys, and projection caches, while preserving the existing local save
stack for offline play and optional opaque snapshot backups. It covers local-first behavior,
conflict handling by domain, version namespaces, offline-edit policy (online characters are
read-only offline by default), retry/backoff, duplicate protection, client/server migrations,
backup/restore boundaries, and partial-sync recovery. Offline play remains the default; online
sync is staged and requires later approval.

### 2. Files Created and Modified
- **New Files**:
  - `docs/ONLINE_SAVE_SYNC_PROPOSAL.md`.
- **Modified Files**:
  - `docs/DEVELOPMENT_ROADMAP.md` — Phase 30.3 checked.
  - `docs/IMPLEMENTATION_REPORTS.md`.

### 3. Verification & Test Results
Documentation-only phase: no runtime code, tests, dependencies, configuration, or build output
changed. The audit used repository evidence: `IndexedDBStorageService` keys (`active-profile`,
`user-settings`, `migration-backup`, `backup`, `load-recovery`, `recovery-log`,
`slot:slot-1..3`), `PlayerSessionManager.createSnapshot()`/`saveSession()`, `SaveData` schema v6,
`SaveMigrations` (v1→v6), `SaveDataValidator`, `SaveRecovery`, `SaveDiagnostics`
(20-entry content-free log), `SaveTransfer` format v1, and the in-memory storage fallback. No test
or build run was required; the last verified state remains Phase 29.5 (88 files, 1,207 tests,
0 TypeScript errors).

### 4. Out of Scope
No synchronization, outbox, server endpoint, database, transport, encryption, or deployment was
implemented. No provider or backend was selected. Offline saves, gameplay, questions, and balance
are unchanged. Phase 30.4 (PvP reverse-difficulty specification) remains a separate design step
requiring confirmation.

---

# Phase 30.4 — PvP Reverse-Difficulty Specification (Design Only)

**Date**: 2026-11-09  
**Phase**: 30.4 (Handbook Section: Phase 30 — Online Architecture Preparation Only)  
**Status**: Completed — decisions approved; no PvP, networking, matchmaking, backend, or balance change

### 1. Executive Summary
Phase 30.4 produced `docs/PVP_RULES_PROPOSAL.md`, covering every topic the handbook requires:
level-difference calculation, tier/difficulty mapping per participant, whether participants answer
different questions, scoring, damage, time limits, ties, disconnects, question fairness and content
availability, exploit prevention, and match result validation. The audit found that the existing
`PvPDifficultyEngine` correctly applies the reverse rule but with coarse fixed buckets and a
hard-coded JuniorHigh baseline; `ArenaDuelSession` samples by tier only (ignoring
`targetDifficulty`), simulates the rival with `Math.random()`, accepts client-supplied correctness,
has no damage/HP, no tiebreak, no disconnect handling, and no match record. The proposal keeps the
player-selected reverse rule intact, presents options and trade-offs instead of final formulas, and
recommends a baseline of server-authoritative questions/results, distinct per-participant
questions, simple round scoring with a separate rating, symmetric content fallback, and a
reconnect window that forfeits only after play begins. No provider, transport, or backend was
selected.

### 2. Files Created and Modified
- **New Files**:
  - `docs/PVP_RULES_PROPOSAL.md`.
- **Modified Files**:
  - `docs/DEVELOPMENT_ROADMAP.md` — Phase 30.4 checked.
  - `docs/IMPLEMENTATION_REPORTS.md`.

### 3. Verification & Test Results
Documentation-only phase: no runtime code, tests, dependencies, configuration, or build output
changed. The audit used repository evidence: `HeadlessPvPDifficultyEngine` thresholds and
`calculateMatchDifficulty`, `ArenaDuelSession.samplePlayerQuestion()`/`resolveRound()`,
`ArenaTypes` (`ArenaCompetitor` without combat stats), `ArenaModal` timer/profile wiring,
`QuestionRepository` filter criteria, `AnswerEvaluator` timeout handling, `QuestionTimer`,
`DEFAULT_EDUCATIONAL_TIER_CONFIG`, `docs/PVP_RULES.md`, `docs/GAME_RULES.md` §6, existing
`tests/arena/pvpDifficulty.test.ts` and `tests/arena/phase25_arena_duel.test.ts`, and
`docs/ONLINE_ARCHITECTURE_PROPOSAL.md` §4.6/§4.10. No test or build run was required; the last
verified state remains Phase 29.5 (88 files, 1,207 tests, 0 TypeScript errors).

### 4. Out of Scope
No PvP, networking, matchmaking, rating, backend, database, or deployment was implemented. PvE
difficulty, offline AI sparring, questions, saves, and balance are unchanged. Phase 30.5
(matchmaking, leaderboards, guilds, and tournaments) remains a separate design step requiring
confirmation.

### 5. Decision Approval (2026-11-09)
The user approved all 14 decisions. `docs/PVP_RULES_PROPOSAL.md` §19 now records the operative
choices: raw level delta; level-anchored tier mapping with PvP-owned boundaries; distinct
per-participant questions; simultaneous rounds with a fixed initial count of 3; round-point scoring
with a separate rating; no ranked damage in v1; equal 30 s server-owned timers with a grace window;
duel draws with tournament sudden death; no-contest before play, reconnect window after play, and
forfeit on explicit quit; symmetric content relaxation with cancellation as fallback; confirmed
server authority; authenticated server-validated characters eligible without a minimum level in the
first season; and immutable match records with provisional retention. Values marked **initial**
remain configurable; rating formulas and tournament/matchmaking parameters remain Phase 30.5
decisions. This approval record changes documentation only — no implementation, backend, or
balance change was made.

---

# Phase 30.5 — Matchmaking, Leaderboards, Guilds, and Tournaments (Design Only)

**Date**: 2026-11-09  
**Phase**: 30.5 (Handbook Section: Phase 30 — Online Architecture Preparation Only)  
**Status**: Completed — proposal plus Stage 0 offline headless cores; no networking, external
service, or dependency added

### 1. Executive Summary
Phase 30.5 produced `docs/ONLINE_FEATURES_PROPOSAL.md`, covering matchmaking, leaderboards,
guilds, tournaments, match history, moderation and reporting, backend service categories, and
high-level operating costs. The audit confirmed that the game has an offline arena foundation
(reverse-difficulty rules, AI sparring, a single-player Challenge Arena, content-free analytics, and
a tested local save stack) but none of the online primitives: no identity, rating engine, queue,
persisted match record, guild/social model, moderation system, or network layer. The proposal
defines shared foundations (identity, rating, season, match record, moderation case, content/rules
versioning), presents algorithm and scope options with trade-offs, recommends Elo for the first
season, rating-plus-level matchmaking evolving to a quality score, seasonal PvP rating as the
primary board, lightweight guilds without chat or shared banks, asynchronous single-elimination
tournaments, immutable match history, and human-reviewed moderation. It identifies backend service
categories without selecting a provider, stages implementation behind explicit approval gates, and
gives provider-dependent planning ranges: roughly $50–300 infrastructure plus up to ~$750 human
moderation at 1k MAU, $300–1,500 plus ~$1,000–5,000 at 10k MAU, and $2k–10k plus $10k–40k+ at 100k
MAU. Moderation and support dominate long-term cost. Stage 0 (offline headless models) was then
implemented under `src/arena/online/` with 37 tests; no server, network, storage, UI, or existing
arena behavior was touched.

### 2. Files Created and Modified
- **New Files**:
  - `docs/ONLINE_FEATURES_PROPOSAL.md`.
  - `src/arena/online/MatchRecord.ts`.
  - `src/arena/online/MatchmakingQueue.ts`.
  - `src/arena/online/TournamentBracket.ts`.
  - `src/arena/online/LeaderboardRanking.ts`.
  - `src/arena/online/index.ts`.
  - `tests/arena/online/matchmakingQueue.test.ts`.
  - `tests/arena/online/tournamentBracket.test.ts`.
  - `tests/arena/online/leaderboardRanking.test.ts`.
  - `tests/arena/online/matchRecord.test.ts`.
- **Modified Files**:
  - `src/arena/index.ts` — re-exports the offline online models.
  - `docs/DEVELOPMENT_ROADMAP.md` — Phase 30.5 checked; Stage 0 noted.
  - `docs/IMPLEMENTATION_REPORTS.md`.

### 3. Verification & Test Results
The design audit used repository evidence: `ArenaTypes` modes and optional `rating`, `ArenaRivals`
ratings, `ArenaDuelSession`, `PvPDifficultyEngine`, `ArenaModal` (“Return to Matchmaking” label
without a queue), `ChallengeArenaSession`/`ChallengeRegistry`/`ChallengeProgressTracker`
(single-player PvE, first-clear tracking reserved for save wiring), `AnalyticsTypes` (content-free
local snapshot), IndexedDB storage/schema v6, `PlayerSessionManager`, local role/admin gating, and
the absence of any `fetch`/`XMLHttpRequest`/`WebSocket`/`sendBeacon` usage. The cost figures are
planning ranges with stated assumptions and caveats, not provider quotes.

Stage 0 verification (2026-11-09):

- New Stage 0 tests: 37 passed across 4 files.
- Full suite: 92 files, 1,244 tests, all passing.
- `npx tsc --noEmit`: clean.
- `npm run build`: succeeds (PWA service worker generated).
- No `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, database, external package, scene, save,
  or UI code was added.

### 4. Implementation Status and Out of Scope
The proposal was written first, then Stage 0 (pure TypeScript matchmaking queue, tournament bracket,
leaderboard ranking, and match-record schema) was implemented under `src/arena/online/` with tests.
It is not imported by any scene, UI, or save path, so offline gameplay is unaffected. No server,
backend, network transport, provider, database, deployment, guild, moderation, chat, or
server-backed tournament/history code was added. Every later stage still needs an approved scope,
provider/stack, budget, and security/privacy review. Offline gameplay, saves, questions, PvE
balance, and the approved PvP rules are unchanged.

### 5. Approval Required
Stages 1–6 remain blocked on the 15 open decisions in `docs/ONLINE_FEATURES_PROPOSAL.md` §15,
starting with the first server-backed stage, provider/stack, and budget. Stage 0 required no
provider decisions and is complete; wiring it into UI or saves requires a later stage approval.
