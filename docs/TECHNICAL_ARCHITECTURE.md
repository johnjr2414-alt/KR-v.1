# Knowledge Realms — Technical Architecture

**Version:** 1.0  
**Stack:** Phaser 3, TypeScript (Strict), Vite, HTML5/CSS3, JSON, IndexedDB, Vitest  
**Maintainability Target:** Clean, beginner-friendly modular architecture with headless core domain logic.

---

## 1. Architectural Philosophy: Headless Domain Separation

Knowledge Realms strictly isolates presentation (Phaser 3 / DOM UI) from pure game rules, formulas, and data models.

```
┌─────────────────────────────────────────────────────────────┐
│                       PRESENTATION                          │
│   Phaser 3 Scenes (Maps, Sprites, Animations, Inputs)       │
│   HTML5 / CSS3 Overlays (Dialogues, HUD, Question Modals)   │
└──────────────────────────────▲──────────────────────────────┘
                               │ Events / Method Calls
                               │ State Updates
┌──────────────────────────────▼──────────────────────────────┐
│                    CORE DOMAIN ENGINE                       │
│  src/core/                                                  │
│   ├── combat/      (Damage formulas, battle state machine)  │
│   ├── progression/ (EXP, leveling curves, stat growth)     │
│   ├── mastery/     (Subject tracking, streak multipliers)   │
│   ├── questions/   (Sampling algorithms, difficulty scale)  │
│   ├── entities/    (Player, Monster, Item domain models)    │
│   └── inventory/   (Slots, equip logic, item definitions)   │
└──────────────────────────────▲──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                     PERSISTENCE LAYER                       │
│  src/storage/                                               │
│   ├── IndexedDB Manager (Local saves, profiles, overrides)  │
│   └── JSON Repositories (Bundled static balance & question) │
└─────────────────────────────────────────────────────────────┘
```

### Why this design?
1. **Headless Testability**: Game balance, combat math, question retrieval, and leveling logic can be unit-tested headlessly in Node.js via Vitest in milliseconds without needing Canvas, WebGL, or browser mocks.
2. **Beginner Clarity**: Beginners can read and adjust math formulas in `src/core/` without worrying about Phaser physics bodies or rendering pipelines.
3. **Pluggable UI**: The Question Modal and Admin Dashboard can run cleanly in HTML/DOM overlays without coupling to canvas coordinate spaces.

---

## 2. Directory Structure

```
knowledge-realms/
├── .agents/                    # Agent directives and rules
│   └── rules/
│       └── development-rules.md
├── docs/                       # Architectural & design documentation
│   ├── GDD.md
│   ├── GAME_RULES.md
│   ├── TECHNICAL_ARCHITECTURE.md
│   ├── MODULE_MAP.md
│   └── DEVELOPMENT_ROADMAP.md
├── public/                     # Static assets (spritesheets, audio, tilesets)
│   └── assets/
├── src/
│   ├── main.ts                 # Bootstrap & role router (User vs. Admin)
│   ├── config/                 # Static JSON balance tables and constants
│   │   ├── balance.json
│   │   └── educational-tiers.json
│   ├── core/                   # Headless game domain logic
│   │   ├── combat/
│   │   ├── progression/
│   │   ├── mastery/
│   │   ├── entities/
│   │   └── inventory/
│   ├── questions/              # Question management & combat retrieval
│   │   ├── models/             # Question TypeScript interfaces & schemas
│   │   ├── management/         # Admin CRUD, JSON import/export, IndexedDB
│   │   └── retrieval/          # PvE difficulty math & battle sampling
│   ├── storage/                # IndexedDB database wrappers & repository
│   │   ├── db.ts
│   │   ├── player-repository.ts
│   │   └── question-repository.ts
│   ├── scenes/                 # Phaser 3 presentation scenes
│   │   ├── BootScene.ts
│   │   ├── PreloadScene.ts
│   │   ├── VillageScene.ts
│   │   ├── BuildingScene.ts
│   │   ├── HuntingScene.ts
│   │   └── BattleScene.ts
│   └── ui/                     # HTML/DOM layered UI components
│       ├── hud/
│       ├── question-modal/
│       └── admin-dashboard/
└── tests/                      # Vitest test suites
    ├── combat/
    ├── progression/
    ├── questions/
    └── storage/
```

---

## 3. Game Scenes Flow

Phaser 3 manages screen flow and world states via discrete Scenes:

```
[BootScene]
    │ Loads minimal boot assets & initializes IndexedDB
    ▼
[PreloadScene]
    │ Preloads spritesheets, tilemaps, fonts, question bundles
    ▼
[RoleSelectModal] (HTML/DOM)
    ├── If "Admin" ──► [AdminDashboardScene / AdminUI]
    └── If "User"  ──► [VillageScene] (Beginners Village)
                           │
                           ├── Enters Building ──► [BuildingScene]
                           │
                           ├── Leaves Village  ──► [HuntingScene]
                           │                           │
                           │                           └── Collides Monster
                           │                                   │
                           │                                   ▼
                           └──────────────────────◄─── [BattleScene]
                                                     (Overlays QuestionModal)
```

1. **BootScene**: Configures canvas scaling, initializes local database connections, and verifies system health.
2. **PreloadScene**: Loads static JSON configs, audio, and visual spritesheets while displaying a progress bar.
3. **VillageScene**: 2D tilemap representation of Beginners Village. Manages player top-down movement, building collision doors, NPC interactions, and shops.
4. **BuildingScene**: Specialized interiors (Math Guild, Science Lab, Library, Workshop) containing subject trainers and interior monster arenas.
5. **HuntingScene**: Exterior hostile zones where monsters roam with basic wander/chase AI.
6. **BattleScene**: Turn/timed combat encounter visualizer. Pauses background movement, displays combatant sprites, and coordinates with the HTML Question Modal.

---

## 4. Question Retrieval vs. Admin Management Pipeline

To prevent coupling and state corruption, question handling is partitioned into two distinct subsystems:

### 4.1 Question Management Subsystem (`src/questions/management/`)
- Interacts with **Admin Dashboard UI**.
- Validates question integrity against the TypeScript schema (`id`, `educationalLevel`, `subject`, `difficulty`, `correctAnswer`).
- Reads from and writes to the local `question-repository` in IndexedDB.
- Handles soft-deletes (tombstones) so that default bundled questions do not reappear after browser reload.
- Serializes and deserializes question data for JSON file import and export.

### 4.2 Combat Question Retrieval Subsystem (`src/questions/retrieval/`)
- Headless query engine invoked strictly when combat starts.
- Takes `(playerLevel, monsterLevel, monsterSubject, questionCategory)`.
- Calculates level difference: $\Delta L = L_m - L_p$.
- Computes effective educational tier and difficulty rating according to `docs/GAME_RULES.md`.
- Pulls eligible questions from the question cache, randomizes selection, and guarantees that previously answered questions in the active combat encounter do not repeat.

---

## 5. Storage Architecture (Offline-First)

Storage relies entirely on browser-native technologies:
1. **Bundled Static JSON (`public/data/` or `src/config/`)**:
   - Initial question bank across tiers.
   - Base monster stat tables, level EXP tables, and item dictionaries.
2. **IndexedDB (via lightweight wrapper)**:
   - `player_profile`: Active character stats, level, combat EXP, current HP/MP, gold, inventory items, equipped gear, and quest logs.
   - `subject_mastery`: Mastery levels, EXP points, and performance stats per discipline.
   - `question_overrides`: Admin additions, edits, and tombstone records marking deleted default questions.
   - `system_settings`: Audio volume, key bindings, and display options.

---

## 6. Testing Strategy

All core logic must be verified with automated headless unit tests:
1. **Formula Verification**: Leveling curve calculation, damage formulas, critical strike math, and diminishing return multipliers.
2. **Difficulty Engine Verification**: Tests ensuring $\Delta L$ shifts educational tiers correctly under all level brackets (including boundary cases and fallbacks).
3. **Question Sampling Invariants**: Tests asserting question quotas are randomized within bounds and locked once combat begins.
4. **Storage Mock Tests**: Verification that player profiles and mastery state serialize and deserialize without loss.
