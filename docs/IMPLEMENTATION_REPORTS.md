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
















