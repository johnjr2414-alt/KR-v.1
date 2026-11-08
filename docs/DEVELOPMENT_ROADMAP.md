# Knowledge Realms — Development Roadmap

This roadmap organizes the incremental development of Knowledge Realms into 21 ordered phases, following the verified prompt sequence from the Master Game Design Package.

---

## Phase Overview

```
Phase 0: Project Documentation [COMPLETED]
   ↓
Phase 1: Project Foundation [COMPLETED]
   ↓
Phase 2: Application Structure & Architecture [COMPLETED]
   ↓
Phase 3: Role Selection (User vs. Super Admin) [COMPLETED]
   ↓
Phase 4: Player Data & Character Progression [COMPLETED]
   ↓
Phase 5: World & Beginners Village Scene [COMPLETED]
   ↓
Phase 6: Subject Guild Buildings & Zones [COMPLETED]
   ↓
Phase 7: Monster System & Definitions [COMPLETED]
   ↓
Phase 8: Question Database & Schemas [COMPLETED]
   ↓
Phase 9: Super Admin Question Management Dashboard [COMPLETED]
   ↓
Phase 10: Question Interface & Modal Presentation [COMPLETED]
   ↓
Phase 11: PvE Question Difficulty Engine [COMPLETED]
   ↓
Phase 12: Combat Engine & Battle Scene [COMPLETED]
   ↓
Phase 13: Subject Knowledge Mastery System [COMPLETED]
   ↓
Phase 14: Monster Rewards (EXP, Drops, Gold) [COMPLETED]
   ↓
Phase 15: Inventory & Equipment Systems [COMPLETED]
   ↓
Phase 16: Quests & Village NPCs [COMPLETED]
   ↓
Phase 17: Local Storage & Offline IndexedDB Persistence [COMPLETED]
   ↓
Phase 18: Local Economy & Commerce [COMPLETED]
   ↓
Phase 19: Arena & Future PvP Architecture [COMPLETED]
   ↓
Phase 20: End-to-End Integration & Polish [COMPLETED]
```

---

## Detailed Task Breakdown

### Phase 0: Project Documentation
- [x] **Task 0.1**: Inspect workspace structure and dependencies.
- [x] **Task 0.2**: Create `docs/GDD.md` (Game Design Document).
- [x] **Task 0.3**: Create `docs/GAME_RULES.md` (Implementation-ready rules and math).
- [x] **Task 0.4**: Create `docs/TECHNICAL_ARCHITECTURE.md` (System components and flow).
- [x] **Task 0.5**: Create `docs/MODULE_MAP.md` (Module boundaries and contracts).
- [x] **Task 0.6**: Create `docs/DEVELOPMENT_ROADMAP.md` (Execution schedule).

### Phase 1: Project Foundation
- [x] **Task 1.1**: Initialize Vite, TypeScript, and Vitest configuration.
- [x] **Task 1.2**: Install Phaser 3 engine dependencies.
- [ ] **Task 1.3**: Configure build and verify bare-bones Phaser Canvas launch.

### Phase 2: Application Structure
- [ ] **Task 2.1**: Establish modular directory tree (`src/core`, `src/scenes`, `src/questions`, `src/storage`, `src/ui`).
- [ ] **Task 2.2**: Implement core game configuration schema and balance loading (`balance.json`).
- [ ] **Task 2.3**: Implement base scene lifecycle and asset manager.
- [ ] **Task 2.4**: Create global event bus decoupled from Phaser.

### Phase 3: Role Selection
- [ ] **Task 3.1**: Build Role Selection modal UI (User vs. Super Admin).
- [ ] **Task 3.2**: Implement scene router dispatching to User Game or Admin Dashboard.

### Phase 4: Player Data and Character Progression
- [ ] **Task 4.1**: Define TypeScript interfaces for Player, Stats, and Attributes.
- [ ] **Task 4.2**: Implement Character Combat Level EXP curve and formulas.
- [ ] **Task 4.3**: Unit test leveling, stat calculation, and EXP progression headlessly.
- [ ] **Task 4.4**: Implement player state manager.

### Phase 5: World and Beginners Village
- [ ] **Task 5.1**: Create `VillageScene` tilemap / placeholder grid layout.
- [ ] **Task 5.2**: Implement top-down player movement (WASD/Arrows) and collision bounds.
- [ ] **Task 5.3**: Add Village landmarks (Central Fountain, Shop, Guilds).
- [ ] **Task 5.4**: Add camera follow and viewport bounds.
- [ ] **Task 5.5**: Add exit gateways to hunting zones with Risk-Access warning checks.

### Phase 6: Buildings and Subject Zones
- [ ] **Task 6.1**: Implement `BuildingScene` supporting interior transitions.
- [ ] **Task 6.2**: Configure Mathematics Guild interior.
- [ ] **Task 6.3**: Configure Science Laboratory interior.
- [ ] **Task 6.4**: Configure General Knowledge Library interior.
- [ ] **Task 6.5**: Configure Technology Workshop interior.

### Phase 7: Monster System
- [ ] **Task 7.1**: Define Monster data schema (ID, name, level, HP, ATK, DEF, subject, drops).
- [ ] **Task 7.2**: Create starter monster table in JSON (Math Slime, Binary Bug, Quiz Wisp, etc.).
- [ ] **Task 7.3**: Implement monster roaming and proximity trigger logic in hunting areas.
- [ ] **Task 7.4**: Unit test monster stat loading and category classification.

### Phase 8: Question Database and Question Rules
- [ ] **Task 8.1**: Define TypeScript schema for Question models (Multiple Choice, Identification, Essay).
- [ ] **Task 8.2**: Create bundled JSON questions across Elementary and Junior High tiers.
- [ ] **Task 8.3**: Implement question validator ensuring data integrity.
- [ ] **Task 8.4**: Build question repository loader.
- [ ] **Task 8.5**: Unit test question parsing and schema validation.

### Phase 9: Admin Question Management
- [ ] **Task 9.1**: Create Super Admin HTML dashboard layout.
- [ ] **Task 9.2**: Implement Question list view with multi-faceted filtering (tier, subject, type).
- [ ] **Task 9.3**: Implement Question Creation form with real-time validation.
- [ ] **Task 9.4**: Implement Question Edit & Soft-Delete (tombstone) logic.
- [ ] **Task 9.5**: Implement Question JSON Import and Export.
- [ ] **Task 9.6**: Unit test admin CRUD and tombstone persistence.

### Phase 10: Question Interface
- [ ] **Task 10.1**: Build DOM-layered Question Modal component.
- [ ] **Task 10.2**: Implement Multiple Choice display with randomized options.
- [ ] **Task 10.3**: Implement Identification text input with keyboard shortcut binding.
- [ ] **Task 10.4**: Implement Question countdown timer with animated visual feedback.

### Phase 11: PvE Difficulty Engine
- [ ] **Task 11.1**: Implement level difference calculation ($\Delta L = L_m - L_p$).
- [ ] **Task 11.2**: Implement higher-level monster challenge difficulty spikes and tier jumps.
- [ ] **Task 11.3**: Implement lower-level monster difficulty adjustments and fallback handlers.
- [ ] **Task 11.4**: Implement battle question quota randomizer (fixed per combat encounter).
- [ ] **Task 11.5**: Headless unit test suite covering all difficulty matrix edge cases.

### Phase 12: Battle System
- [ ] **Task 12.1**: Implement headless `CombatManager` state machine.
- [ ] **Task 12.2**: Implement `DAMAGE-PLAYER` rule on incorrect answers and timeouts.
- [ ] **Task 12.3**: Implement player attack damage formula on correct answers.
- [ ] **Task 12.4**: Create `BattleScene` visual overlay coordinating with HTML Question Modal.
- [ ] **Task 12.5**: Wire combat attack animations, hit splats, and audio triggers.
- [x] **Task 12.6**: Implement victory resolution and reward dispatching.
- [x] **Task 12.7**: Implement defeat resolution and village respawn.
- [x] **Task 12.8**: Unit test complete battle scenarios headlessly.

### Phase 13: Knowledge Mastery
- [x] **Task 13.1**: Implement independent `MasteryManager` tracking subject EXP pools.
- [x] **Task 13.2**: Implement performance-based multiplier formula (speed, accuracy, streaks).
- [x] **Task 13.3**: Build UI Mastery Summary panel in the player menu.
- [x] **Task 13.4**: Unit test mastery calculations and verify strict separation from character EXP.

### Phase 14: Monster Rewards
- [x] **Task 14.1**: Implement Combat EXP distribution and level-up triggers.
- [x] **Task 14.2**: Implement Gold and item drop table roller.
- [x] **Task 14.3**: Implement battle victory summary screen.

### Phase 15: Inventory and Equipment
- [x] **Task 15.1**: Implement slot-based inventory data model.
- [x] **Task 15.2**: Implement equipment slots and stat modification calculations.
- [x] **Task 15.3**: Build inventory & character equipment UI overlay.
- [x] **Task 15.4**: Unit test equipping, unequipping, and stat recalculations.

### Phase 16: Quests and NPCs
- [x] **Task 16.1**: Implement dialogue tree runner for Village NPCs.
- [x] **Task 16.2**: Implement beginner questline tracking (talk to teacher, defeat slimes).
- [x] **Task 16.3**: Add quest journal UI.

### Phase 17: Local Storage and Offline Support
- [x] **Task 17.1**: Implement IndexedDB wrapper with transaction safety.
- [x] **Task 17.2**: Implement auto-save and manual save serialization for player and mastery state.
- [x] **Task 17.3**: Verify full offline reload and state restoration.

### Phase 18: Economy
- [x] **Task 18.1**: Implement Village Merchant shop (buy/sell items with Gold).
- [x] **Task 18.2**: Implement village bank with deposit interest.
- [x] **Task 18.3**: Implement player-owned storefront prototype.
- [x] **Task 18.4**: Add tamper-resistant offline income calculation.

### Phase 19: Arena and Future PvP Preparation
- [x] **Task 19.1**: Define PvP reverse-difficulty rule interface.
- [x] **Task 19.2**: Scaffold Colosseum / Arena mock duel scene.

### Phase 20: Testing, Polish, and Full Loop Verification
- [x] **Task 20.1**: Run comprehensive headless test suite across all modules.
- [x] **Task 20.2**: Verify end-to-end user loop: Start -> Explore -> Battle -> Level Up -> Admin Edit -> Reload.
- [x] **Task 20.3**: Production build optimization and package inspection.
