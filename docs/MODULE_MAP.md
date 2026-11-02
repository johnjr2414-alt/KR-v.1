# Knowledge Realms — Module Map & Responsibilities

This document defines the strict boundary, files, dependencies, and prohibitions for each subsystem in the codebase.

---

## 1. Core Module Map Summary

| Module | Core Responsibility | Files Owned | Prohibited Coupling |
|---|---|---|---|
| **Core Progression** | Character level, stats, combat EXP curves | `src/core/progression/*` | No Phaser scenes, no Mastery EXP |
| **Core Mastery** | Subject tracking, mastery EXP calculation | `src/core/mastery/*` | No Character EXP, no Phaser rendering |
| **Core Combat** | Battle math, turn/timer resolution, damage | `src/core/combat/*` | No direct DOM manipulation, no Phaser sprites |
| **Question Retrieval** | PvE question sampling, difficulty calculation | `src/questions/retrieval/*` | No Admin CRUD, no Phaser dependencies |
| **Question Management** | Question CRUD, schema validation, import/export | `src/questions/management/*` | No combat execution, no Phaser rendering |
| **Storage / Persistence** | IndexedDB read/write, saving, migrations | `src/storage/*` | No game rules, no battle state |
| **Presentation / Scenes** | 2D tilemaps, camera, sprites, input handling | `src/scenes/*` | Must not be authoritative on stats or math |
| **UI Components** | HTML HUD, question modals, admin dashboard | `src/ui/*` | Must not alter core rules directly |

---

## 2. Detailed Module Specifications

### 2.1 Progression Module (`src/core/progression/`)
- **Purpose**: Calculate character combat leveling, EXP requirements, and stat scaling.
- **Files Owned**:
  - `ProgressionManager.ts`
  - `LevelFormulas.ts`
  - `CharacterStats.ts`
- **Public Interfaces**:
  - `addCombatExp(amount: number): LevelUpResult`
  - `getRequiredExp(level: number): number`
  - `calculateStats(baseStats: BaseStats, level: number): ComputedStats`
- **Dependencies**: None (pure mathematical logic).
- **Forbidden Actions**:
  - Must NOT manage or mutate Subject Mastery EXP.
  - Must NOT render level-up effects directly or depend on Phaser.

### 2.2 Mastery Module (`src/core/mastery/`)
- **Purpose**: Track player mastery across academic disciplines and compute performance-based gains.
- **Files Owned**:
  - `MasteryManager.ts`
  - `MasteryFormulas.ts`
- **Public Interfaces**:
  - `recordAnswerPerformance(subject: SubjectId, difficulty: DifficultyTier, timeTaken: number, timeLimit: number, streak: number): MasteryGainResult`
  - `getMasteryLevel(subject: SubjectId): number`
  - `getAllMasterySummary(): Record<SubjectId, MasteryRecord>`
- **Dependencies**: None (pure domain logic).
- **Forbidden Actions**:
  - Must NOT award character combat EXP.
  - Must NOT alter character RPG combat stats (HP/ATK/DEF).

### 2.3 Combat Engine (`src/core/combat/`)
- **Purpose**: Authoritative manager of monster encounters, combat state transitions, and damage calculations.
- **Files Owned**:
  - `CombatManager.ts`
  - `DamageCalculator.ts`
  - `BattleState.ts`
- **Public Interfaces**:
  - `initiateBattle(player: PlayerEntity, monster: MonsterEntity, questionCount: number): BattleSession`
  - `processAnswer(answerResult: AnswerEvaluation): CombatTurnResult`
  - `handleTimeout(): CombatTurnResult`
  - `getBattleState(): BattleStateSnapshot`
- **Dependencies**: `ProgressionManager`, `MasteryManager`.
- **Forbidden Actions**:
  - Must NOT render animations, play audio, or mutate DOM elements.
  - Must NOT decide which questions exist in the database (delegates to Question Retrieval).

### 2.4 Question Retrieval Engine (`src/questions/retrieval/`)
- **Purpose**: Sample appropriate questions for combat based on player level, monster level, and subject.
- **Files Owned**:
  - `DifficultyEngine.ts`
  - `QuestionSampler.ts`
- **Public Interfaces**:
  - `calculateDifficultyTier(playerLevel: number, monsterLevel: number): TierAndDifficulty`
  - `sampleBattleQuestions(criteria: RetrievalCriteria): Question[]`
- **Dependencies**: `QuestionModel`.
- **Forbidden Actions**:
  - Must NOT perform Admin CRUD or overwrite the question bank.
  - Must NOT execute combat damage or handle Phaser scenes.

### 2.5 Question Management & Admin (`src/questions/management/` & `src/ui/admin/`)
- **Purpose**: Administrative question authoring, validation, search/filtering, and JSON serialization.
- **Files Owned**:
  - `QuestionValidator.ts`
  - `QuestionManager.ts`
  - `AdminDashboard.ts`
- **Public Interfaces**:
  - `createQuestion(data: QuestionInput): ValidationResult<Question>`
  - `deleteQuestion(id: string): void`
  - `exportQuestionsToJson(): string`
  - `importQuestionsFromJson(jsonString: string): ImportSummary`
- **Dependencies**: `QuestionRepository`, `QuestionModel`.
- **Forbidden Actions**:
  - Must NOT interfere with runtime battle question selection or state.

### 2.6 Storage & Persistence (`src/storage/`)
- **Purpose**: Local IndexedDB abstraction handling save states and overrides.
- **Files Owned**:
  - `Database.ts`
  - `PlayerRepository.ts`
  - `MasteryRepository.ts`
  - `QuestionRepository.ts`
- **Public Interfaces**:
  - `savePlayer(player: PlayerState): Promise<void>`
  - `loadPlayer(): Promise<PlayerState | null>`
  - `saveQuestionOverride(override: QuestionOverride): Promise<void>`
- **Dependencies**: Native browser IndexedDB API.
- **Forbidden Actions**:
  - Must NOT compute game rules, leveling math, or combat outcomes.

### 2.7 Presentation Scenes (`src/scenes/`)
- **Purpose**: Visual presentation, 2D sprite rendering, tilemap physics, particle effects, and user controls.
- **Files Owned**:
  - `BootScene.ts`, `PreloadScene.ts`, `VillageScene.ts`, `BuildingScene.ts`, `HuntingScene.ts`, `BattleScene.ts`
- **Public Interfaces**: Phaser 3 Scene lifecycle (`preload()`, `create()`, `update()`).
- **Dependencies**: Phaser 3, Core Domain managers (`CombatManager`, `ProgressionManager`).
- **Forbidden Actions**:
  - Must NOT contain authoritative game logic or hardcoded combat damage calculations. All authoritative state belongs in `src/core/`.
