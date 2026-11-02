# Knowledge Realms — Agent Directives & Architecture

## Project Identity
**Knowledge Realms** is a modular 2D educational fantasy action RPG inspired by classic mobile action RPGs (such as *Zenonia*). The game combines traditional real-time exploration, monster grinding, quests, economy, and character progression with an educational combat resolution system where player action efficacy is directly tied to subject mastery and question answering.

### Technical Stack
- **Engine / Presentation**: Phaser 3 (2D Canvas/WebGL rendering, tilemaps, animations, input)
- **Language**: TypeScript (strict mode enabled)
- **Bundler & Build Tool**: Vite
- **UI & Layout**: HTML5 / CSS3 layered overlays & UI components
- **Data & Configuration**: JSON (game balance configs, item tables, monster stats, questions)
- **Persistence**: IndexedDB (offline-first, zero cloud dependencies in initial version)
- **Testing**: Vitest (headless testing for pure domain models and algorithms)

---

## Core System Architecture Principles

1. **Separation of Concerns (Logic vs. Presentation)**:
   - Pure game logic (combat math, damage calculations, leveling, stat modifiers, loot drops, inventory management, question sampling) must reside in headless TypeScript classes/modules (`src/core/`).
   - Phaser scenes (`src/scenes/`) handle rendering, sprites, physics bodies, camera controls, particle effects, and user inputs. Phaser classes must delegate to core domain logic and not store authoritative game state.
2. **Dual Progression Model**:
   - **Character Level & Combat EXP**: Acquired primarily from monster grinding and combat victories. Governs standard RPG stats (HP, MP, Attack, Defense, Intelligence, Critical Rate, Movement Speed) and equipment requirements.
   - **Subject Mastery EXP**: Acquired through answering educational questions in specific subjects/topics. Performance-based; independent of character combat level.
3. **Decoupled Question Pipeline**:
   - Question storage, CRUD, and Super Admin filtering are isolated in question management modules (`src/questions/management/`).
   - Battle question retrieval, difficulty calculation, and sampling are handled by the combat question retrieval engine (`src/questions/retrieval/`).
4. **Offline-First Persistence**:
   - IndexedDB handles local saves, player profiles, inventory states, and question databases.
   - No external APIs or cloud services without explicit instructions.

---

## Agent Operational Requirements

1. **Incremental Scope**: Work on one small, discrete task at a time. Never scaffold future systems prematurely.
2. **Pre-inspection**: Inspect existing files and structure before writing or altering code.
3. **Strict Typing**: Enforce strong TypeScript types without loose `any` casts.
4. **Test-Driven Verification**: Ensure all domain logic is covered by automated unit tests (`npm.cmd test`). Run tests and builds before completing any task.
5. **Transparency**: Report every file created or modified, along with test execution results, and await user confirmation before starting subsequent tasks.
