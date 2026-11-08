# KNOWLEDGE REALMS

# Master Development Prompt Handbook

**Platform:** Google Antigravity IDE\
**Project:** Knowledge Realms --- 2D educational fantasy action RPG\
**Current checkpoint:** Phase 21.1 completed\
**Document purpose:** A reusable, phase-by-phase prompt library for
continuing development without losing architectural consistency.

------------------------------------------------------------------------

# HOW TO USE THIS HANDBOOK

## The most important rule

**Run one phase prompt at a time.** Do not ask Antigravity to implement
every phase in one operation. Each phase is intentionally scoped so the
agent can inspect the current project, make a limited set of changes,
verify them, and stop for review.

For every phase:

1.  Open the existing Knowledge Realms project in Google Antigravity.
2.  Confirm the correct project folder is open.
3.  Give Antigravity the shared project context in Section 1 if this is
    a new agent conversation.
4.  Paste only the prompt for the phase you want to implement.
5.  Let the agent inspect the repository before it edits anything.
6.  Review the implementation report and changed files.
7.  Run the game and perform the manual checks listed in the phase.
8.  Fix defects before moving to the next phase.
9.  Keep a copy of this handbook in the project, for example
    `docs/DEVELOPMENT_PROMPT_HANDBOOK.md`.

If Antigravity has already read the handbook in the current
conversation, do not repeatedly paste the shared context. Refer to the
relevant section and phase instead. This saves context and avoids
unnecessary repetition.

## What "complete" means

A phase is not complete just because Antigravity says it is complete.
Completion requires:

-   The requested behavior exists in the actual application.
-   Existing behavior has not regressed.
-   Automated tests pass.
-   TypeScript checks pass.
-   Production build passes.
-   Relevant manual browser/gameplay checks pass.
-   The implementation report accurately lists changed files, tests,
    limitations, and follow-up work.

A test that only checks a mock or isolated service does not prove that
the Phaser scene and visible UI are connected correctly. For scene/UI
work, require both automated tests where practical and manual runtime
verification.

## Project checkpoint

The audit and Phase 21.1 report establish this baseline:

-   Phaser 3, TypeScript, and Vite browser game.
-   Headless domain logic is separated from Phaser and DOM presentation.
-   IndexedDB is used for local persistence.
-   Bundled JSON provides initial question content.
-   Super Admin question CRUD, filtering, soft deletion, and JSON
    import/export exist.
-   The project had 32 test files and 357 passing tests after Phase
    21.1.
-   `npx tsc --noEmit` passed with zero errors.
-   `npm run build` succeeded.
-   `PlayerSessionManager` was added at
    `src/player/PlayerSessionManager.ts`.
-   `BootScene`, `VillageScene`, `HuntingScene`, and `BattleScene` were
    connected to the player session.
-   Inventory, mastery, and quest services gained hydration methods.
-   Super Admin navigation bypasses player session initialization.

**Important known limitation:** The current `SaveData` schema does not
include Gold/currency. `CurrencyService` is held in memory during the
session. Phase 21.2 must decide and implement a backward-compatible
persistence change or another explicitly documented solution before
claiming currency is saved across reloads.

The audit/report are a checkpoint, not a substitute for inspecting the
current source code. File names, method signatures, and architecture may
have changed since the reports were generated.

------------------------------------------------------------------------

# SECTION 1 --- SHARED PROJECT CONTEXT FOR ANTIGRAVITY

Use this prompt at the beginning of a new Antigravity agent conversation
when the agent needs project-wide context.

## SHARED CONTEXT PROMPT

You are working on **Knowledge Realms**, an offline-first, 2D
educational fantasy action RPG inspired by classic top-down action RPGs.

### Technical stack

-   Phaser 3 for the game world, scenes, sprites, camera, and real-time
    gameplay.
-   TypeScript with strict typing.
-   Vite for development and production builds.
-   HTML/CSS for menus, dialogs, dashboards, and overlay interfaces
    where the existing project uses them.
-   JSON for bundled educational questions and static content.
-   IndexedDB for local player saves, question overrides, and
    administrative changes.
-   Vitest for automated tests.
-   PWA/service-worker support may be introduced during release
    preparation, but do not assume it is already implemented.

### Architectural rules

1.  Keep domain logic independent of Phaser, browser DOM, and
    presentation code.
2.  Phaser scenes should coordinate rendering, input, and scene
    lifecycle. They should not become containers for all game rules.
3.  Keep UI components focused on presentation and user interaction.
4.  Reuse existing domain services and repositories rather than
    duplicating their logic.
5.  Use the existing player session as the authoritative source of
    active player state.
6.  Avoid creating a second player, inventory, currency, mastery, quest,
    or question state when an existing service already owns it.
7.  Keep PvE and PvP difficulty rules separate.
8.  Keep character progression and subject mastery as separate systems.
9.  Keep question selection, difficulty calculation, answer evaluation,
    and reward calculation testable without Phaser.
10. Use strict TypeScript types. Do not use `any` to silence errors.
11. Validate external or imported data at system boundaries.
12. Keep IDs stable and unique. Do not use display names as persistent
    identifiers.
13. Do not add dependencies unless the need is explained and the
    existing stack cannot reasonably handle the task.
14. Avoid large unrelated refactors.
15. Do not silently change game design rules documented in the project.
16. If requirements conflict with existing code or documentation, report
    the conflict and ask for a decision instead of guessing.
17. Do not claim that a feature works based only on a unit test when the
    actual game integration has not been verified.

### Core game design

-   The game is single-player and offline-first initially.
-   All new players begin in Beginners Village, intended for character
    levels 1--10.
-   Character EXP comes primarily from defeating monsters.
-   Subject mastery EXP is separate and comes from educational question
    performance.
-   Mastery is tracked independently per subject.
-   The initial educational tier mapping is:
    -   Levels 1--10: Elementary.
    -   Levels 11--50: Junior High School.
    -   Levels 51--100: Senior High School.
    -   Levels 101--150: College (provisional).
    -   Levels 151--200: Master's (provisional).
    -   Levels 201--250: PhD (provisional).
    -   Levels 251+: Specialization (provisional).
-   Keep tier ranges in configuration/data, not scattered hardcoded
    conditionals.
-   Players may enter higher-level zones with a warning; do not silently
    block access unless the existing design explicitly says so.
-   Higher-level monsters can trigger substantially harder questions,
    including tier jumps.
-   Lower-level monsters should generally produce easier questions
    relative to their baseline.
-   The monster-vs-player level delta is `Monster Level - Player Level`.
-   A positive delta means the monster is higher level than the player.
-   PvE difficulty adjustments must not be reused as PvP rules.

### Combat design

-   Combat is hybrid: exploration and basic movement are not
    question-gated; initiating a monster encounter starts an educational
    battle.
-   The number of questions is randomized once per battle, based on
    monster category/configuration.
-   Correct answers allow the player to attack.
-   Incorrect answers cause the monster to damage the player.
-   Timeout follows the configured incorrect-answer penalty.
-   Multiple Choice and Identification are the normal fast-combat
    question types.
-   Identification supports normalized whitespace, case-insensitive
    matching, and configured aliases.
-   Essay questions are better suited to quests, research, or training
    unless a special battle explicitly configures them.
-   If the question set is exhausted while the monster survives, follow
    an explicit configured result. Never silently award a victory.
-   Rewards must be granted exactly once per battle resolution.
-   Defeat, victory, and escape are distinct outcomes.

### Mastery design

-   Mastery is tracked separately for each subject.
-   Performance, difficulty, answer speed, and streaks may affect
    mastery EXP according to existing configuration.
-   Do not merge mastery EXP with character EXP.
-   Prevent duplicate reward processing for the same answer attempt.

### World and future systems

Planned regions: 1. Beginners Village. 2. Emerald Forest. 3. Ironhold
Kingdom. 4. Golden Capital. 5. Arcane Technological City. 6. Forgotten
Lands. 7. Colosseum.

Planned RPG/economy systems include inventory, equipment, crafting,
professions, quests, NPCs, shops, banking, savings, fixed deposits,
investments, player businesses, employees, production, expenses, income,
and property. Implement these only when their phase is reached and when
they fit the current project architecture.

### Current progress

Phases 1--20 have been prompted and implemented according to the user's
project history. Phase 21.1, Centralized Player Session and Save/Load
Integration, is reported complete. The implementation report states that
32 test files and 357 tests pass, TypeScript has zero errors, and the
production build succeeds.

Do not assume every feature is perfect just because a prior report says
it passed. Inspect the current code and verify relevant behavior.

### Required workflow for every phase

Before editing: 1. Read `AGENTS.md` and all applicable `.agents/rules/`
instructions. 2. Inspect the actual files and current implementation
related to the task. 3. Identify reusable classes, services, types, and
tests. 4. State a short implementation plan and identify risks. 5. If a
critical design decision is missing, ask one concise question before
making an irreversible assumption.

During implementation: 1. Implement only the current phase scope. 2.
Preserve working behavior and architecture. 3. Keep changes small and
cohesive. 4. Add/update tests alongside implementation. 5. Do not
fabricate test results or manual verification. 6. Do not proceed into
the next phase.

After implementation: 1. Run the relevant tests. 2. Run the full test
suite. 3. Run `npx tsc --noEmit`. 4. Run the production build using the
project's actual package scripts. 5. Report any command that could not
be run and why. 6. Provide a manual verification checklist for
browser/gameplay behavior. 7. Create/update the phase report in `docs/`.
8. Stop and wait for the user's review.

### Required report format

Create `docs/PHASE_<ID>_IMPLEMENTATION_REPORT.md` containing:

-   Phase name and completion status.
-   Summary of what was implemented.
-   Existing files inspected.
-   Files created, modified, or deleted.
-   Important design decisions.
-   Data model or schema changes and migration details, if any.
-   Automated tests added/updated and exact results.
-   TypeScript result.
-   Production build result.
-   Manual checks performed versus checks still required by the user.
-   Known limitations and risks.
-   Follow-up work intentionally deferred.
-   Any discrepancy between requested behavior and actual
    implementation.

Do not mark a phase fully verified if manual browser checks remain
outstanding. Use a status such as
`Implemented — manual verification pending`.

------------------------------------------------------------------------

# SECTION 2 --- PHASE ROADMAP

## Phase 21 --- Core Gameplay Integration

21.1 Centralized player session and save/load integration --- completed
according to report.

21.2 Combat rewards, currency persistence, and defeat respawn.

21.3 Unified question repository between Super Admin and combat.

21.4 Exploration HUD, player panels, and keyboard shortcuts.

21.5 Village merchant and shop interface.

21.6 Pause menu and settings.

21.7 Quest journal UI and gameplay integration review.

21.8 End-to-end core-loop regression and manual test pass.

## Phase 22 --- Game Feel and User Experience

22.1 Player and monster animation/state feedback.

22.2 Combat effects, damage numbers, health bars, and battle feedback.

22.3 Scene transitions, camera behavior, and interaction feedback.

22.4 Audio system and volume controls.

22.5 Responsive UI, readability, accessibility, and input support.

## Phase 23 --- Knowledge Skills and Abilities

23.1 Skill system domain model and configuration.

23.2 Subject-specific skill trees.

23.3 Active skills, cooldowns, MP costs, and combat integration.

23.4 Passive skills and mastery unlocks.

23.5 Skill UI, upgrades, and balance tests.

## Phase 24 --- RPG Progression Depth

24.1 Character stats and stat allocation.

24.2 Equipment attributes, rarity, and item comparison.

24.3 Equipment enhancement and upgrade economy.

24.4 Monster elites, bosses, and encounter progression.

24.5 Build balance and progression simulation.

## Phase 25 --- Educational Content and Learning Quality

25.1 Question content standards, metadata, and validation.

25.2 Subject/topic taxonomy and question coverage.

25.3 Difficulty calibration and content review tools.

25.4 Learning analytics and mastery insights.

25.5 Question authoring workflow and import/export improvements.

## Phase 26 --- World and Content Expansion

26.1 World map, region unlocks, and travel flow.

26.2 Emerald Forest.

26.3 Ironhold Kingdom.

26.4 Golden Capital.

26.5 Arcane Technological City.

26.6 Forgotten Lands.

26.7 Colosseum and challenge encounters.

26.8 Main story, side quests, NPCs, and achievements.

## Phase 27 --- Economy and Professions

27.1 Economy balance and item pricing.

27.2 Gathering professions and resource nodes.

27.3 Crafting, recipes, and production.

27.4 Banking, savings, and fixed deposits.

27.5 Business ownership, employees, operating costs, and income.

27.6 Property, storage, and advanced trading.

## Phase 28 --- Save Integrity and Administration Hardening

28.1 Save schema versioning and migration framework.

28.2 Backup, restore, and save-slot management.

28.3 Corruption recovery and data diagnostics.

28.4 Admin protection and data validation.

28.5 Import/export compatibility and content versioning.

## Phase 29 --- Release Readiness

29.1 Performance and memory optimization.

29.2 Browser and device compatibility.

29.3 PWA/offline installation and update behavior.

29.4 Accessibility, localization readiness, and final UX review.

29.5 Production build, deployment, versioning, and release checklist.

## Phase 30 --- Online Architecture Preparation (not online multiplayer implementation)

30.1 Identify server-authoritative boundaries.

30.2 Account and identity architecture proposal.

30.3 Online save synchronization proposal.

30.4 PvP rules and reverse-difficulty specification.

30.5 Matchmaking, leaderboards, guilds, and tournament architecture
proposal.

**Do not implement online multiplayer in Phase 30 unless the user
explicitly approves a separate online-development project.** The initial
game remains offline-first.

------------------------------------------------------------------------

# SECTION 3 --- COPY-READY PHASE PROMPTS

# PHASE 21.2 --- COMBAT REWARDS, CURRENCY PERSISTENCE, AND DEFEAT RESPAWN

## Objective

Connect the existing battle reward calculation to the centralized player
session. Ensure combat EXP, Gold, and item drops are granted exactly
once, persist correctly, and defeat returns the player to the intended
safe location.

## Prompt for Antigravity

You are implementing Phase 21.2 of Knowledge Realms.

First inspect `AGENTS.md`, applicable agent rules, the Phase 21.1
report, and the current implementations of:

-   `PlayerSessionManager`
-   `PlayerData` and `SaveData`
-   `ProgressionService`
-   `CurrencyService`
-   `InventoryManager`
-   `RewardCalculator`
-   `BattleSession`
-   `BattleScene.finishBattle()`
-   `VillageScene`
-   `HuntingScene`
-   `StorageTypes` and storage validation/migration code
-   Existing reward, progression, currency, and storage tests

Do not assume the report perfectly reflects the current source. Inspect
actual method signatures and event flow.

### A. Establish a single reward-claim path

Trace the complete battle resolution lifecycle. Implement one
authoritative reward-claim operation for a resolved battle.

Requirements: 1. Victory grants the configured combat EXP, Gold, and
item drops. 2. Defeat and escape follow their existing configured reward
rules; do not grant victory-only rewards by accident. 3. Each battle
resolution can be processed only once. 4. Re-entering a scene, duplicate
callbacks, repeated button clicks, or save retries must not duplicate
rewards. 5. Keep reward calculation in the existing headless
reward/domain layer. 6. Keep Phaser scene code responsible for
coordinating the result and presentation, not duplicating reward
formulas. 7. Apply EXP through the existing `ProgressionService` API. 8.
Apply Gold through the existing `CurrencyService` API. 9. Apply drops
through the existing `InventoryManager`. 10. Ensure the active
`PlayerSessionManager` reflects the updated player and services before
saving.

### B. Resolve Gold persistence

The Phase 21.1 report explicitly states that `SaveData` currently lacks
a Gold/currency field.

Inspect the current schema and choose the smallest safe
backward-compatible solution. Prefer a versioned schema migration if the
project already has a migration pattern. If no migration pattern exists,
implement a minimal explicit versioning strategy rather than silently
changing the shape.

Requirements: - Persist the current Gold balance. - Load older saves
that do not contain a currency field. - Define a safe default for old
saves without Gold; do not invent a balance from unrelated fields. -
Validate currency as a finite, non-negative integer according to
existing `CurrencyService` rules. - Preserve existing player, inventory,
mastery, quest, and settings data. - Ensure new saves contain the
currency value. - Test old-save migration, new-save round-trip, invalid
currency recovery, and repeated save/load. - Document the migration and
default behavior.

Do not rewrite the entire storage layer.

### C. Defeat and respawn

Inspect the existing spawn-point and scene-transition design.

On player defeat: - Resolve the battle as defeat. - Apply only the
defeat penalties/rewards that the current game rules support. - Return
the player to the Beginners Village plaza or the existing configured
safe respawn point. - Restore HP according to a clear configurable
respawn rule. If no rule exists, use full HP for the initial
implementation and document it. - Restore MP only if the existing design
or configuration calls for it; do not silently change MP rules. - Ensure
the scene does not respawn the player inside an active monster
encounter. - Save the post-respawn state. - Preserve a clear battle
result message.

Victory should return to the correct hunting-zone location, unless the
existing design specifies another destination. Escape should follow its
existing intended behavior.

### D. Tests

Add tests for: - Victory applies combat EXP once. - Victory applies Gold
once. - Item drops are not duplicated. - Duplicate battle-resolution
events cannot duplicate rewards. - Defeat does not grant victory-only
rewards. - Gold survives save/reload. - Old save without Gold loads with
the documented default. - Invalid Gold is normalized or rejected
safely. - Defeat respawns at the safe location. - Respawn state is
saved. - Existing progression and storage tests remain valid.

### E. Verification and report

Run the full test suite, `npx tsc --noEmit`, and the production build.
Add a manual browser checklist that verifies actual EXP, level, Gold,
item drops, defeat, respawn, refresh, and persistence.

Create `docs/PHASE_21_2_IMPLEMENTATION_REPORT.md`.

Do not implement the question repository, HUD, shop, pause menu, or
other later phases. Stop after this phase and report exact results.

------------------------------------------------------------------------

# PHASE 21.3 --- UNIFIED QUESTION REPOSITORY FOR COMBAT AND ADMIN

## Objective

Make combat use the same effective question data that Super Admin
manages, including custom questions, edits, and tombstones for deleted
bundled questions.

## Prompt for Antigravity

Implement Phase 21.3. Inspect the current question architecture before
editing, including:

-   `QuestionRepository`
-   `QuestionManager`
-   `QuestionStore` / `IndexedDBQuestionStore`
-   Bundled question loaders and JSON files
-   Tombstone behavior
-   `QuestionValidator`
-   `DifficultyEngine`
-   `QuestionSelector`
-   `BattleScene` and battle initialization
-   Admin dashboard save/edit/delete/import flows
-   Question-related tests

### A. Define the effective question source

Combat must not independently load bundled JSON and bypass the IndexedDB
question store.

Create or reuse one initialization path that produces the effective
question repository: 1. Load bundled baseline questions. 2. Load
IndexedDB user-created questions and overrides. 3. Apply edits/overrides
to matching bundled IDs. 4. Exclude IDs present in tombstones. 5.
Include valid admin-created questions. 6. Validate records before they
enter the runtime repository. 7. Handle unavailable or corrupted local
records safely.

Preserve stable IDs and the existing question schema.

### B. Runtime behavior

-   `BattleScene` must obtain questions through the shared
    question-management/repository path.
-   Admin edits must be reflected in future battles without requiring a
    code rebuild.
-   Admin-created questions must be eligible when their subject, tier,
    type, and difficulty match the battle profile.
-   Soft-deleted bundled questions must never appear in combat.
-   Do not mutate the bundled JSON files when applying local overrides.
-   Avoid reinitializing the database unnecessarily for every question.
-   Decide whether the repository is refreshed at session start, battle
    start, or after admin mutations. Choose a clear strategy and
    document it.
-   If an admin changes data while a battle is already active, do not
    mutate the current battle's question list midway. Apply changes to
    the next battle unless the existing design provides a safe
    alternative.

### C. Fallback and quality behavior

-   Preserve the existing tier/difficulty fallback behavior.
-   If no eligible question exists, use the existing nearest-valid
    fallback and log/report it.
-   Never return deleted questions as a fallback.
-   Avoid duplicate question IDs within one battle.
-   Do not silently use an unrelated subject.
-   Keep deterministic injection/seed support if the existing selector
    supports it.

### D. Tests

Test: - Bundled question appears when not deleted or overridden. -
Admin-created question appears in combat selection. - Edited bundled
question uses the edited version. - Tombstoned bundled question is
excluded. - Deleted user-created question is excluded. - Invalid stored
question is safely rejected. - Duplicate IDs are handled according to
the existing policy. - Fallback never returns a tombstoned question. -
Existing admin CRUD/import/export tests remain green.

### E. Verification

Run all tests, TypeScript check, and production build. Manually add a
question in Super Admin, start a matching battle, and verify it can
appear. Delete a bundled question, start another battle, and verify it
cannot appear.

Create `docs/PHASE_21_3_IMPLEMENTATION_REPORT.md`.

Do not implement HUD, shop, or pause menu. Stop after this phase.

------------------------------------------------------------------------

# PHASE 21.4 --- EXPLORATION HUD, INVENTORY, MASTERY, AND KEYBINDINGS

## Objective

Make existing player information and panels accessible during
exploration. Reuse the existing UI components rather than rebuilding
their domain behavior.

## Prompt for Antigravity

Implement Phase 21.4. Inspect the current scene, UI, input adapter,
inventory, mastery, player session, and quest architecture before
changing anything.

### A. Persistent exploration HUD

Create or reuse a HUD that is visible in both `VillageScene` and
`HuntingScene`.

Show, at minimum: - Character name. - Character level. - HP
current/max. - MP current/max if MP exists in the player model. - EXP
progress toward the next character level. - Gold balance.

Requirements: - Read values from the active player session and its
authoritative services. - Do not create a duplicate player model in the
HUD. - Update the display when values change. - Use accessible text and
clear bar labels; do not rely on color alone. - Clamp visual bar widths
to 0--100%. - Avoid excessive polling if the existing architecture
supports events or explicit refresh. - Destroy/unsubscribe listeners
correctly on scene shutdown. - Keep the HUD readable at supported game
resolutions. - Do not cover important interaction prompts or battle
controls.

### B. Panel access

Wire existing panels into actual gameplay.

Initial keyboard mapping: - `I`: Inventory/equipment panel. - `M`:
Subject mastery panel. - `Q`: Quest journal, if a usable journal
component already exists. If not, report that it is deferred to Phase
21.7 rather than inventing an incomplete panel. - `ESC`: Reserved for
pause/settings in Phase 21.6. Until that phase, do not bind it to an
unrelated action.

Provide visible HUD/menu buttons for inventory and mastery so
keyboard-only access is not required.

### C. Input behavior

-   Prevent game movement keys from moving the player while a
    modal/panel is open.
-   Prevent repeated keydown events from opening/closing a panel
    multiple times.
-   Do not trigger a panel shortcut while typing in an input, textarea,
    or editable field.
-   Ensure shortcuts work in both Village and Hunting scenes.
-   Ensure a panel is not duplicated after a scene transition.
-   Close or clean up panel DOM/listeners when the scene shuts down.
-   If a modal is open, define a predictable close behavior.

### D. Inventory and mastery correctness

-   Inventory panel must display the active inventory and equipment.
-   Equip/unequip actions must update the authoritative session service.
-   Stat displays must refresh after equipment changes.
-   Mastery panel must show separate subject records, levels,
    EXP/progress, and accuracy information only if those metrics are
    actually stored.
-   Do not fabricate accuracy or learning statistics that the model does
    not track.
-   Saving must capture panel changes through the existing session save
    pipeline.

### E. Tests and manual verification

Add tests for HUD formatting/calculation where practical and for any new
input/panel coordination logic.

Manual checklist: - HUD appears in both exploration scenes. - HP, MP,
level, EXP, and Gold match active session values. - `I` opens and closes
inventory. - `M` opens and closes mastery. - HUD buttons work. -
Movement stops while panels are open. - Typing into an input does not
trigger shortcuts. - Equipment changes update stats and persist after
refresh. - No duplicate overlays after scene transitions.

Run tests, TypeScript check, and production build.

Create `docs/PHASE_21_4_IMPLEMENTATION_REPORT.md`.

Do not implement the shop or pause/settings menu. Stop after this phase.

------------------------------------------------------------------------

# PHASE 21.5 --- VILLAGE MERCHANT AND SHOP INTERFACE

## Objective

Connect the existing `ShopService` and shop catalog to an interactive
merchant experience in Beginners Village.

## Prompt for Antigravity

Implement Phase 21.5. Inspect `ShopService`, `ShopRegistry`,
`CurrencyService`, `InventoryManager`, item definitions, NPC interaction
patterns, dialogue modals, and scene UI lifecycle.

### A. Merchant interaction

-   Reuse the existing NPC interaction pattern.
-   Add or configure a dedicated merchant NPC if the current village
    does not have a suitable merchant.
-   Show a clear interaction prompt when the player is near the
    merchant.
-   Use the existing interaction key convention.
-   Open the shop modal without accidentally starting another NPC
    dialogue or scene transition.

### B. Shop modal

Create a focused shop interface with: - Merchant name. - Buy tab/list. -
Sell tab/list. - Item name and icon/placeholder. - Item description
where available. - Price. - Player Gold. - Quantity controls where
supported. - Buy/sell confirmation or clear result feedback. - Close
control.

Use existing item metadata and catalog definitions. Do not hardcode
separate prices in UI code.

### C. Transaction correctness

Buying: - Verify the item exists in the active shop catalog. - Validate
quantity and total cost. - Prevent purchases when Gold is
insufficient. - Prevent invalid or negative quantities. - Apply the
transaction through `ShopService` and `CurrencyService`. - Add purchased
items through `InventoryManager`. - Handle full inventory without
charging the player if the purchase cannot be completed. - Ensure failed
purchases do not partially mutate Gold or inventory.

Selling: - Only allow eligible items according to existing shop rules. -
Validate ownership and quantity. - Remove the sold quantity and credit
Gold atomically from the player's perspective. - Prevent negative
quantities and selling more than owned. - Do not allow
equipped/quest-critical items to be sold unless existing rules
explicitly allow it. - Show the actual transaction result.

### D. Persistence and UI lifecycle

-   Use the centralized player session.
-   Update Gold and inventory display immediately after a successful
    transaction.
-   Save after successful transactions using the existing save
    mechanism.
-   Prevent duplicate event handlers and duplicate transactions from
    rapid clicks.
-   Pause or block exploration movement while the modal is open.
-   Clean up modal resources on close and scene shutdown.

### E. Tests

Test insufficient Gold, full inventory, valid purchase, invalid item,
invalid quantity, successful sale, insufficient item quantity,
restricted item sale, transaction rollback/no partial mutation, and
save/reload persistence.

### F. Verification

Run full tests, TypeScript, and production build. Manually verify
merchant interaction, buy, sell, insufficient funds, full inventory,
rapid clicking, closing, and persistence after refresh.

Create `docs/PHASE_21_5_IMPLEMENTATION_REPORT.md`.

Do not implement banking, investments, business management, or other
economy systems. Stop after this phase.

------------------------------------------------------------------------

# PHASE 21.6 --- PAUSE MENU AND SETTINGS

## Objective

Add a reliable pause/settings overlay for exploration and define safe
behavior around battle and modal states.

## Prompt for Antigravity

Implement Phase 21.6. Inspect scene lifecycle, input handling, settings
persistence, audio assets, existing modal components, and
`storageService.saveSettings()`.

### A. Pause menu

-   Bind `ESC` to open/close the pause menu in exploration scenes.
-   Include Resume, Settings, Controls, and Return to Start Menu only if
    those actions can be implemented safely.
-   Require confirmation before leaving gameplay.
-   Save current player state before returning to the start menu.
-   Do not accidentally reset or overwrite the active save.
-   Ensure the player cannot move or interact while paused.
-   Avoid duplicate pause overlays.

### B. Settings

Implement settings that are supported by the current project: - Master
volume. - Music volume if music exists. - Sound-effects volume if sound
effects exist. - Any existing display/control settings that are already
modeled.

Requirements: - Persist settings using the existing settings storage
mechanism. - Apply changes immediately. - Restore settings on session
startup. - Clamp values to valid ranges. - If audio assets or an audio
manager do not exist, do not invent fake working controls. Report the
missing dependency and implement only the supported parts.

### C. Battle behavior

Do not assume Phaser scene pause behavior is identical across all
scenes. Inspect how `BattleScene` runs.

Choose and document a consistent rule: - Either battle has its own safe
pause flow, or - Pause is unavailable during timed questions.

Never pause the visual game while leaving a question timer running
invisibly. Never stop the timer while allowing answer submission to
continue in an inconsistent state.

### D. Input and lifecycle

-   Ignore pause shortcuts while typing into form fields.
-   Prevent movement and interaction while paused.
-   Restore the correct input state on resume.
-   Ensure shutdown cleans up listeners and overlays.
-   Do not bind `ESC` in a way that conflicts with another modal's close
    behavior.

### E. Tests and verification

Test settings validation, save/load, volume application where audio
exists, pause state transitions, duplicate overlay prevention, and safe
exit behavior.

Manually verify pause/resume, settings changes, refresh persistence,
return-to-menu confirmation, and battle timer behavior.

Run all tests, TypeScript, and build.

Create `docs/PHASE_21_6_IMPLEMENTATION_REPORT.md`.

Do not add new game systems. Stop after this phase.

------------------------------------------------------------------------

# PHASE 21.7 --- QUEST JOURNAL AND CORE GAMEPLAY UI INTEGRATION

## Objective

Expose existing quest progress in a usable in-game journal and ensure
the core gameplay UI components work together.

## Prompt for Antigravity

Implement Phase 21.7. Inspect `QuestManager`, quest models, quest
objective tracking, NPC dialogue, player session, and existing UI
components.

### A. Quest journal

If a quest journal already exists, connect and complete it. Otherwise
create a focused UI component in the established UI architecture.

Show: - Active quests. - Quest title and description. - Quest giver if
stored. - Objective progress. - Completion status. - Rewards if defined
in quest data. - Available turn-in state where appropriate.

Do not invent objective progress or reward data.

### B. Interaction

-   `Q` opens/closes the quest journal during exploration.
-   Provide a visible HUD/menu button.
-   Prevent player movement while open.
-   Do not trigger shortcuts while typing.
-   Use the active session's `QuestManager`.
-   Refresh the journal when quest state changes.
-   Ensure accepting, progressing, and turning in quests updates the
    same authoritative service.
-   Save after meaningful quest state changes.

### C. Integration review

Check the interactions among: - HUD. - Inventory. - Mastery. - Quest
journal. - Pause menu. - NPC dialogue. - Shop modal. - Scene
transitions.

Define a simple overlay/modal priority rule. Prevent multiple blocking
modals from being opened at the same time unless the design explicitly
supports stacking.

### D. Tests and verification

Test quest display mapping, objective progress, accept/turn-in refresh,
keyboard shortcuts, overlay exclusivity, and persistence.

Manually verify the complete flow from accepting an NPC quest to
completing its objective and turning it in.

Run all tests, TypeScript, and build.

Create `docs/PHASE_21_7_IMPLEMENTATION_REPORT.md`.

Do not add new quest types or story content in this phase. Stop after
this phase.

------------------------------------------------------------------------

# PHASE 21.8 --- END-TO-END CORE LOOP REGRESSION

## Objective

Verify that the core single-player loop works as one connected game
after Phases 21.1--21.7.

## Prompt for Antigravity

Perform Phase 21.8 as an integration and quality-assurance phase. Do not
add new features unless a defect requires a minimal correction.

### Core test journey

Verify the following flow in the actual browser game:

1.  Start application.
2.  Select User.
3.  Load an existing save or create a new character.
4.  Enter Beginners Village.
5.  Confirm HUD values.
6.  Move around and interact with NPCs.
7.  Accept a quest.
8.  Open inventory and mastery.
9.  Visit a merchant.
10. Buy an item.
11. Sell an eligible item.
12. Enter a subject hunting zone.
13. Encounter a monster.
14. Start battle.
15. Answer correctly.
16. Answer incorrectly.
17. Allow a timer to expire.
18. Win a battle.
19. Verify EXP, level, Gold, mastery, and item drops.
20. Lose a battle.
21. Verify defeat and respawn behavior.
22. Return to exploration.
23. Refresh the browser.
24. Verify all persistent data.
25. Enter Super Admin.
26. Add/edit/delete a question.
27. Return to User mode and verify combat uses the effective question
    repository.

### Audit dimensions

-   State consistency between scenes.
-   Reward idempotency.
-   Save ordering and race conditions.
-   Currency persistence.
-   Question-store consistency.
-   Inventory/equipment correctness.
-   Modal/input conflicts.
-   Scene shutdown cleanup.
-   Browser console errors.
-   IndexedDB errors.
-   Runtime performance.
-   Responsive layout at supported resolutions.

### Output

Create `docs/PHASE_21_8_CORE_LOOP_QA_REPORT.md`.

Classify each check as: - PASS --- verified in actual runtime. - FAIL
--- reproduced defect. - BLOCKED --- could not verify, with reason. -
NOT APPLICABLE --- feature is not part of current scope.

Fix only small, clearly scoped defects. For larger defects, document a
separate corrective task.

Run the complete test suite, TypeScript check, and production build. Do
not proceed to Phase 22.

------------------------------------------------------------------------

# PHASE 22 --- GAME FEEL AND USER EXPERIENCE

# PHASE 22.1 --- PLAYER AND MONSTER ANIMATION STATES

## Objective

Improve visual responsiveness without changing combat or movement rules.

## Prompt

Inspect the current sprite/asset pipeline, player controller, monster
sprites, Phaser animations, and scene lifecycle.

Implement a consistent animation-state layer for the player and
monsters.

Possible states, only where assets support them: - Idle. - Walk in four
directions. - Attack. - Hurt. - Defeat/death. - Monster
idle/move/attack/hurt/death.

Requirements: 1. Reuse available assets and animation conventions. 2. Do
not invent sprite sheets or assume frame dimensions. 3. If assets are
missing, create a clearly documented asset requirement list and use the
project's existing placeholder approach. 4. Prevent animation state
conflicts and repeated animation restarts. 5. Keep animation selection
separate from domain combat calculations. 6. Ensure movement direction
and facing remain correct. 7. Clean up animation listeners where
required. 8. Respect reduced-motion settings if the project has or later
adds them.

Add tests for any pure animation-state selection logic. Manually verify
player movement and monster state changes.

Create `docs/PHASE_22_1_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

# PHASE 22.2 --- COMBAT VISUAL FEEDBACK

## Objective

Make battle outcomes easy to understand and visually satisfying.

## Prompt

Inspect the existing battle UI, damage calculation results,
monster/player sprites, health UI, and event flow.

Implement focused combat feedback: - Player attack effect. - Monster hit
reaction. - Floating damage numbers. - Critical-hit indication when the
domain result says it was critical. - Player damage feedback. - Monster
and player HP bars. - Clear correct/incorrect/timeout feedback. -
Victory, defeat, and escape transitions. - Reward summary with actual
committed rewards.

Rules: 1. Visual effects must reflect authoritative combat results;
never calculate damage again in the UI. 2. Do not show rewards before
they are actually granted. 3. Do not allow animations to grant rewards
or resolve battles. 4. Keep timers and answer submission consistent. 5.
Avoid blocking question interaction with long animations. 6. Clean up
temporary objects and timers. 7. Use existing assets where available;
document missing assets instead of silently referencing nonexistent
files. 8. Support reduced motion if configured.

Add tests for any event-to-feedback mapping that can be tested
headlessly. Manually verify all combat outcomes.

Create `docs/PHASE_22_2_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

# PHASE 22.3 --- SCENE TRANSITIONS AND INTERACTION FEEDBACK

## Objective

Improve navigation and world interaction clarity.

## Prompt

Inspect all current scene transitions, camera fades, portal/gate logic,
NPC prompts, monster prompts, and modal lifecycle.

Improve: - Consistent fade in/out. - Clear transition feedback. -
Interaction prompt visibility and consistency. - NPC and object
interaction range feedback. - Safe handling of rapid repeated
interaction. - Return-to-zone spawn positions. - Scene shutdown and
listener cleanup.

Do not change world layouts or unlock rules unless a bug requires it.

Test repeated portal activation, rapid scene changes, scene shutdown,
and interaction near multiple objects.

Create `docs/PHASE_22_3_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

# PHASE 22.4 --- AUDIO SYSTEM

## Objective

Create a small, maintainable audio layer for music and sound effects.

## Prompt

Inspect existing assets and audio handling. Do not assume audio files
exist.

If suitable assets exist: - Create/reuse a centralized audio manager. -
Support master, music, and sound-effect volume. - Support mute. - Avoid
playing duplicate background music after scene transitions. - Stop or
fade tracks appropriately. - Apply persisted settings. - Handle browser
autoplay restrictions gracefully. - Avoid audio playback before user
interaction when browser policy blocks it.

If assets do not exist: - Implement only the audio infrastructure that
can be verified. - Provide a list of required audio asset names,
formats, and intended use. - Do not use external network audio or CDNs.

Test settings mapping and audio manager behavior with mocks where
appropriate. Manually verify browser playback.

Create `docs/PHASE_22_4_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

# PHASE 22.5 --- RESPONSIVE UI AND ACCESSIBILITY

## Objective

Make the game usable across its intended screen sizes and improve
readability.

## Prompt

Inspect the current supported resolution, scaling mode, CSS, overlays,
text sizes, input support, and accessibility behavior.

Implement improvements for: - Common desktop and laptop resolutions. -
Browser window resizing. - Touch support only if mobile/tablet is an
intended target. - Readable text and contrast. - Clear focus states for
interactive controls. - Keyboard navigation for HTML overlays. - Labels
for form controls. - Avoiding color as the only status indicator. -
Reduced motion where feasible. - Avoiding UI clipping and overlap.

Do not redesign the entire game. Do not claim mobile support unless
actual touch interaction and layout are tested.

Create a resolution test matrix and
`docs/PHASE_22_5_IMPLEMENTATION_REPORT.md`. Stop after this phase.

------------------------------------------------------------------------

# PHASE 23 --- KNOWLEDGE SKILLS AND ABILITIES

# PHASE 23.1 --- SKILL DOMAIN MODEL

## Objective

Design and implement the headless foundation for active and passive
skills without yet building the complete skill UI.

## Prompt

Inspect character stats, mastery records, combat session, damage
calculation, configuration patterns, and storage architecture.

Create a typed, data-driven skill model.

Support concepts where appropriate: - Stable skill ID. - Name and
description. - Subject association. - Active or passive type. - Unlock
requirements. - Mastery requirement. - Character requirement if the game
design uses one. - MP cost. - Cooldown. - Duration. - Effect
definition. - Upgrade levels. - Whether the skill is available in PvE,
PvP, or both.

Rules: 1. Keep skills data-driven. 2. Keep skill definitions separate
from current player skill state. 3. Validate all configuration. 4. Do
not add Phaser imports to skill domain logic. 5. Do not let skill
effects bypass authoritative combat calculations. 6. Avoid arbitrary
executable scripts in skill JSON. 7. Define a safe, typed set of effect
types. 8. Do not implement online PvP behavior here. 9. Document any
storage changes needed, but do not silently break old saves.

Add unit tests for validation, unlock conditions, and skill-state
initialization.

Create `docs/PHASE_23_1_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

# PHASE 23.2 --- SUBJECT-SPECIFIC SKILL TREES

## Objective

Connect subject mastery to unlockable knowledge-themed skill trees.

## Prompt

Inspect the mastery model and Phase 23.1 skill definitions.

Implement configurable skill trees for the subjects that actually exist
in the project.

Requirements: - Each skill node has a stable ID. - Prerequisites are
explicit. - Mastery level/EXP requirements are configurable. - Unlocking
a skill consumes no resource unless a cost is explicitly configured. - A
skill cannot be unlocked twice. - Circular prerequisites are rejected. -
Missing prerequisites are reported. - Subject trees remain
independent. - Character progression and mastery remain separate. - Do
not impose mastery as a character-level gate unless an existing approved
rule requires it.

Add tests for valid unlock, insufficient mastery, unmet prerequisites,
duplicate unlock, invalid graph, and subject separation.

Create `docs/PHASE_23_2_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

# PHASE 23.3 --- ACTIVE SKILLS AND COMBAT INTEGRATION

## Objective

Allow players to use configured active skills during supported combat.

## Prompt

Inspect the current battle state machine, question resolution, damage
calculator, player stats, MP model, and Phase 23.1 skill domain.

Implement active skills through the existing combat boundary.

Requirements: - Skill activation must be a deliberate player action. -
Validate unlock status, MP, cooldown, target, and battle state. - Apply
costs only after activation is accepted. - Prevent repeated activation
from duplicate input. - Use authoritative combat results. - Do not allow
skills to bypass the educational question mechanic unless a specific
skill design explicitly defines that behavior. - Keep skill effects
deterministic and testable. - Define behavior when the target dies or
the battle ends during a skill effect. - Ensure cooldown and MP changes
persist. - Do not let UI code directly mutate player combat stats.

Add tests for activation, invalid activation, MP shortage, cooldown,
target validity, battle termination, and effect resolution.

Create `docs/PHASE_23_3_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

# PHASE 23.4 --- PASSIVE SKILLS AND MASTERY UNLOCKS

## Objective

Apply passive skill effects safely to derived stats or combat
calculations.

## Prompt

Inspect equipment stat calculation, player base stats, skill state,
mastery, and combat calculations.

Implement passive skill effects using a clear modifier pipeline.

Requirements: - Never permanently mutate base stats just because a
passive is equipped/unlocked. - Avoid applying the same passive modifier
more than once. - Define stacking rules. - Define caps and validation
for percentages/flat bonuses. - Keep base stats, equipment modifiers,
and passive modifiers distinguishable. - Apply passive effects only in
the modes they are configured for. - Do not reuse PvE passive
assumptions for future PvP without an explicit PvP rule. - Add tests for
stacking, caps, duplicate application, save/load, and derived-stat
correctness.

Create `docs/PHASE_23_4_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

# PHASE 23.5 --- SKILL UI AND UPGRADES

## Objective

Expose skill trees and active/passive skill management to the player.

## Prompt

Inspect the existing HTML overlay patterns and the skill domain
services.

Create a skill interface that: - Displays subject skill trees. - Shows
locked, available, unlocked, and maxed states. - Explains
requirements. - Shows active skill MP cost and cooldown. - Allows valid
unlock/upgrade actions. - Shows current passive bonuses. - Refreshes
from authoritative skill state. - Saves after valid changes. - Does not
allow invalid or duplicate purchases. - Does not cover important combat
UI. - Is accessible by keyboard and visible UI control.

Add UI mapping tests and domain integration tests. Manually verify
unlocking, upgrading, using active skills, and refreshing the browser.

Create `docs/PHASE_23_5_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

# PHASE 24 --- RPG PROGRESSION DEPTH

# PHASE 24.1 --- CHARACTER STATS AND STAT ALLOCATION

## Objective

Make character attributes understandable and, if supported by the
design, allocatable.

## Prompt

Inspect current player stats, level-up growth, stat growth
configuration, equipment calculations, and save schema.

Before implementation, report which attributes currently exist and how
they affect combat. Do not invent a stat system without documenting the
proposed rules.

If stat allocation is compatible with the existing design: - Add typed
unspent stat points. - Define configurable points per level. - Validate
allocation. - Prevent negative or excessive allocation. - Recalculate
derived stats. - Preserve base stats separately from equipment and
skills. - Migrate old saves safely if needed. - Ensure level-up rewards
are granted once.

Add tests for level-up points, allocation limits, derived stats, and
migration.

Create `docs/PHASE_24_1_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

# PHASE 24.2 --- EQUIPMENT ATTRIBUTES, RARITY, AND COMPARISON

## Objective

Improve item identity and player equipment decisions.

## Prompt

Inspect item definitions, inventory, equipment slots, stat calculator,
shop catalog, drop tables, and UI.

Implement only fields that fit the existing item model: - Rarity/tier. -
Equipment level requirement. - Base attributes. - Optional affixes or
modifiers if approved. - Sell value. - Item category and slot. - Unique
stable item ID versus item-definition ID, as required by the existing
inventory model.

Requirements: - Do not duplicate item definitions in multiple files. -
Keep item definitions data-driven. - Validate rarity and modifier
ranges. - Ensure equipped items are represented consistently. - Add a
comparison view showing current versus candidate equipment stats. -
Prevent equipping invalid slot types or items above requirements. - Keep
quest-critical restrictions. - Preserve older saves through
migration/defaults.

Add tests for item validation, equipment restrictions, stat comparison,
and save/load.

Create `docs/PHASE_24_2_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

# PHASE 24.3 --- EQUIPMENT ENHANCEMENT

## Objective

Add a controlled equipment upgrade system only after the item/economy
rules are clear.

## Prompt

Inspect the item model, Gold economy, shop pricing, crafting plans if
any, and equipment calculator.

Propose and implement a configurable enhancement system: - Eligible item
categories. - Upgrade levels and maximum level. - Cost
formula/configuration. - Success/failure behavior only if randomness is
explicitly part of the design. - Stat increase per level. - Protection
or downgrade rules only if approved. - UI preview before confirmation.

Requirements: - No negative or free exploit through invalid values. -
Transactions must be atomic from the player's perspective. - Do not
consume materials or Gold on rejected actions. - Prevent duplicate
requests. - Persist enhancement state. - Keep the calculation headless.

If important design values are undecided, ask the user before
implementing random failure or downgrade mechanics.

Create `docs/PHASE_24_3_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

# PHASE 24.4 --- ELITES, BOSSES, AND ENCOUNTER PROGRESSION

## Objective

Introduce stronger encounters with explicit mechanics and educational
challenge profiles.

## Prompt

Inspect monster definitions, spawn tables, battle categories, question
count configuration, reward calculation, zone configuration, and current
combat state machine.

Implement data-driven elite and boss encounter support: - Stable
encounter/monster IDs. - Configurable HP, attack, defense, rewards, and
drop tables. - Educational tier and subject constraints. - Question
count ranges. - Optional phases or mechanics only if the battle state
machine can support them safely. - Clear victory/defeat/escape
handling. - Unique reward claim protection. - Appropriate respawn or
re-entry behavior.

Do not hardcode boss mechanics into `BattleScene`. Keep encounter
configuration and rules testable.

Add tests for encounter setup, phase transitions if any, reward
idempotency, and question selection.

Create `docs/PHASE_24_4_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

# PHASE 24.5 --- BUILD BALANCE AND PROGRESSION SIMULATION

## Objective

Detect progression spikes, weak builds, reward exploits, and impossible
encounters before adding large amounts of content.

## Prompt

Inspect the progression formulas, stat growth, item modifiers, skills,
monster stats, reward curves, and question difficulty rules.

Create a deterministic simulation or test harness that can evaluate: -
Character level growth. - EXP required per level. - Expected
time/encounters per level using configurable assumptions. - Damage and
survival ranges. - Equipment and skill combinations. - Monster encounter
difficulty. - Reward and Gold inflation. - Outlier or unreachable
configurations.

Do not claim simulation results are real player telemetry. Clearly label
assumptions.

Prefer headless scripts/tests over UI work. Provide sample scenarios and
a balance report.

Create `docs/PHASE_24_5_BALANCE_REPORT.md`. Stop after this phase.

------------------------------------------------------------------------

# PHASE 25 --- EDUCATIONAL CONTENT AND LEARNING QUALITY

# PHASE 25.1 --- QUESTION CONTENT STANDARDS

## Objective

Establish consistent quality and metadata rules for the educational
question bank.

## Prompt

Inspect the question schema, validator, bundled JSON, admin editor, and
current question repository.

Document and implement validation for: - Stable ID. - Subject. -
Topic/subtopic if available. - Educational tier. - Difficulty. -
Question type. - Prompt text. - Choices and correct answer where
applicable. - Accepted aliases for identification. - Explanation. -
Timer configuration. - Source/reference metadata if the project uses
it. - Content status/review status if approved.

Rules: - Do not fabricate sources or claim expert review. - Do not
silently rewrite existing questions. - Detect missing answers, duplicate
choices, invalid answer references, empty prompts, malformed aliases,
and invalid timers. - Keep schema evolution backward-compatible. -
Separate structural validation from human factual review.

Create a content standard document and tests. Create
`docs/PHASE_25_1_IMPLEMENTATION_REPORT.md`. Stop after this phase.

------------------------------------------------------------------------

# PHASE 25.2 --- SUBJECT AND TOPIC TAXONOMY

## Objective

Organize questions into a maintainable subject/topic structure.

## Prompt

Inspect actual subjects and questions currently included. Do not assume
every planned subject or topic already has content.

Propose a taxonomy with: - Subject IDs. - Topic IDs. - Optional
subtopics. - Tier applicability. - Display names and descriptions. -
Stable identifiers independent of display labels.

Implement the taxonomy in configuration/data and connect it to question
metadata and admin filters.

Do not mass-reclassify content without a reviewable mapping. Report
unmapped questions.

Add tests for taxonomy validation and filtering.

Create `docs/PHASE_25_2_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

# PHASE 25.3 --- DIFFICULTY CALIBRATION AND CONTENT REVIEW

## Objective

Make question difficulty consistent and make questionable content easy
to identify.

## Prompt

Inspect current difficulty ratings, question metadata, battle difficulty
engine, and admin UI.

Implement tools that help reviewers: - Filter by subject, tier, topic,
and difficulty. - Identify missing explanations or metadata. - Identify
duplicate/similar prompts where feasible without claiming semantic
certainty. - Preview how a question may be selected by a battle
profile. - Mark review status if the schema supports it. - Export a
review report.

Do not automatically change a question's factual answer or difficulty
rating without an explicit review process.

Add tests for filters and review metadata. Create a report with known
content gaps.

Create `docs/PHASE_25_3_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

# PHASE 25.4 --- LEARNING ANALYTICS AND MASTERY INSIGHTS

## Objective

Show meaningful learning progress using data the game actually records.

## Prompt

Inspect answer-attempt events, mastery records, question IDs, subject
data, timers, and storage schema.

Define and implement local learning statistics such as: - Total
questions answered. - Correct and incorrect counts. - Accuracy. -
Average answer time, if reliably recorded. - Accuracy by subject. -
Accuracy by topic, if topic data exists. - Mastery level and progress by
subject. - Recent learning activity. - Commonly missed questions/topics,
if enough data is stored.

Requirements: - Clearly define denominators and exclude
unanswered/invalid attempts as appropriate. - Do not infer learning
ability from insufficient data. - Avoid exposing personally sensitive
analytics. - Store only necessary local data. - Version/migrate save
data safely. - Do not allow repeated event processing to duplicate
analytics. - Keep analytics calculations headless.

Add tests for formulas, missing data, zero denominators, duplicate
events, and migration.

Create `docs/PHASE_25_4_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

# PHASE 25.5 --- QUESTION AUTHORING WORKFLOW

## Objective

Improve the Super Admin content workflow without compromising question
validation.

## Prompt

Inspect the current admin dashboard, question editor, JSON
import/export, validator, and repository.

Improve the authoring workflow with only features that fit the existing
architecture: - Clear validation errors next to fields. - Preview
question as the player sees it. - Draft/review/published state if
approved. - Bulk import validation report. - Duplicate ID and duplicate
prompt warnings. - Export filtered question sets. - Backup before bulk
operations. - Safe cancellation and confirmation for destructive
actions.

Do not add an AI dependency or remote API. Do not silently publish
invalid questions.

Test editor validation, preview mapping, import rollback, export
compatibility, and destructive-action protection.

Create `docs/PHASE_25_5_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

# PHASE 26 --- WORLD AND CONTENT EXPANSION

## PHASE 26.1 --- WORLD MAP AND REGION UNLOCKS

## Objective

Create a clear world navigation model for the planned regions.

## Prompt

Inspect current map scenes, zone configuration, player progression,
gates, travel points, and save data.

Implement a data-driven world map/navigation layer for the planned
regions: 1. Beginners Village. 2. Emerald Forest. 3. Ironhold Kingdom.
4. Golden Capital. 5. Arcane Technological City. 6. Forgotten Lands. 7.
Colosseum.

Requirements: - Do not invent final unlock levels if they are not
approved. - Put unlock requirements in configuration. - Show
locked/unlocked/available states. - Preserve the existing risk-based
access rule for entering higher-level zones where applicable. -
Distinguish region unlock from recommended player level. - Persist
region discovery only if the game model requires it. - Ensure return
travel points are valid. - Keep navigation rules independent of
rendering.

Ask for missing progression decisions instead of guessing.

Create `docs/PHASE_26_1_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

## PHASE 26.2 --- EMERALD FOREST

## Objective

Implement the first expanded region as a reusable content package.

## Prompt

Inspect the existing Beginners Village zone and monster/content
architecture. Use its established patterns where appropriate, but do not
duplicate entire scene implementations if the current architecture
supports reusable zone configuration.

Implement Emerald Forest with: - Region and zone definitions. - Map
bounds and collision/obstacles. - Entry/exit points. - Appropriate
monster spawn tables. - Monster levels and educational subject/tier
profiles. - NPCs or points of interest only if content is supplied or
approved. - Quest hooks only if the quest data supports them. - Drops
and rewards using existing systems.

Do not invent art assets. Use available assets/placeholders and list
required assets.

Verify all spawns stay within bounds, transitions work, and battle
difficulty is correct.

Create `docs/PHASE_26_2_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

## PHASE 26.3 --- IRONHOLD KINGDOM

Implement Ironhold Kingdom using the reusable region architecture
established in Phase 26.2.

Inspect current level ranges and progression before assigning monster
levels. Use configurable monster definitions, spawn tables, subjects,
drops, NPCs, and quest hooks. Do not hardcode new combat rules.

Test zone boundaries, spawn validity, level-risk warnings, question tier
selection, rewards, and transitions.

Create `docs/PHASE_26_3_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

## PHASE 26.4 --- GOLDEN CAPITAL

Implement Golden Capital as a data-driven region. Inspect the existing
economy and NPC architecture before introducing merchants, services, or
civic activities.

Do not implement new banking/business mechanics here unless those
systems have already been completed in Phase 27. Use existing services
only.

Test navigation, NPC interactions, region content, combat, and save
persistence.

Create `docs/PHASE_26_4_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

## PHASE 26.5 --- ARCANE TECHNOLOGICAL CITY

Implement the Arcane Technological City using existing world, monster,
NPC, and educational systems.

Its theme may combine science and technology, but do not create new
educational subjects unless the subject taxonomy has been approved.

Keep assets, encounters, and story content data-driven. Test all zone
transitions and encounter profiles.

Create `docs/PHASE_26_5_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

## PHASE 26.6 --- FORGOTTEN LANDS

Implement Forgotten Lands as a challenging region with configurable
high-level encounters.

Requirements: - Use existing higher-level PvE difficulty jump rules. -
Do not bypass question fallback protections. - Do not make difficulty
impossible through unbounded tier jumps. - Define clear recommended
level and risk messaging. - Test monster/player level deltas and
question selection at boundary levels.

Create `docs/PHASE_26_6_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

## PHASE 26.7 --- COLOSSEUM

Implement Colosseum as a challenge/arena environment for single-player
encounters first.

Inspect the existing arena preparation and PvP code. Keep PvE challenge
modes separate from future online PvP.

Possible configurable modes: - Consecutive monster challenges. -
Time/score challenge if a reliable timer exists. - Boss challenge. -
Educational subject challenge.

Do not implement matchmaking or network play.

Test challenge progression, defeat, rewards, repeated entry, and reward
idempotency.

Create `docs/PHASE_26_7_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

## PHASE 26.8 --- STORY, NPCS, SIDE QUESTS, AND ACHIEVEMENTS

Implement a maintainable content layer for story and optional
objectives.

Inspect current dialogue and quest systems. Support: - Main story quest
chains. - Side quests. - NPC dialogue states. - Prerequisites. -
Objective tracking. - Rewards. - Achievements/milestones if a stable
event model exists.

Do not write large amounts of narrative content unless requested.
Implement the system and a small clearly labeled sample if necessary.

Keep content separate from code. Test prerequisite chains, dialogue
conditions, quest rewards, and achievement idempotency.

Create `docs/PHASE_26_8_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

# PHASE 27 --- ECONOMY AND PROFESSIONS

# PHASE 27.1 --- ECONOMY BALANCE

Inspect current Gold rewards, shop prices, sell values, drops, and
progression curves. Create a balance report before changing values.

Evaluate: - Gold earned per encounter. - Cost of consumables. -
Equipment prices. - Sell-to-buy ratios. - Potential infinite money
loops. - Reward scaling by level. - Inventory limitations.

Do not add new economy systems. Change values only with a documented
reason and tests.

Create `docs/PHASE_27_1_ECONOMY_REPORT.md`. Stop after this phase.

------------------------------------------------------------------------

# PHASE 27.2 --- GATHERING PROFESSIONS

Implement a configurable gathering framework for professions that the
user approves, such as mining, herb gathering, or woodcutting.

Inspect item/resource definitions, world interaction patterns,
inventory, and quest objectives.

Requirements: - Resource node definitions. - Gathering requirements. -
Interaction feedback. - Yield rules. - Respawn rules. - Inventory
capacity checks. - Optional tool requirements only if modeled. - No
duplicate resource claims from repeated input. - Persistence where
required.

Keep gathering rules headless and configurable. Add tests for yields,
requirements, capacity, and repeat interaction.

Create `docs/PHASE_27_2_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

# PHASE 27.3 --- CRAFTING AND PRODUCTION

Implement a data-driven recipe and crafting system.

Inspect item definitions, gathering resources, inventory, equipment, and
economy.

Support: - Recipe ID. - Required ingredients and quantities. - Required
profession/level if approved. - Output item and quantity. - Crafting
cost if configured. - Validation and transaction safety. - Recipe
discovery/unlock if supported.

A failed craft must not partially consume ingredients. Prevent duplicate
craft submissions. Test insufficient ingredients, invalid recipes,
output capacity, and persistence.

Create `docs/PHASE_27_3_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

# PHASE 27.4 --- BANKING, SAVINGS, AND FIXED DEPOSITS

Inspect the existing `BankService`, `CurrencyService`, time handling,
save schema, and UI architecture.

Connect banking to a player-facing bank NPC/modal.

Before implementation, document: - Deposit/withdrawal rules. - Interest
calculation. - Time basis. - Offline accrual behavior. - Caps and
exploit prevention. - What happens if system time is changed. - Whether
the existing business/bank model is actually implemented or only
partially modeled.

Requirements: - Use a reliable, documented time policy. - Cap offline
interest/accrual. - Validate amounts. - Prevent negative balances and
duplicate claims. - Persist balances and timestamps safely. - Do not
claim the system is tamper-proof in an offline browser game.

Ask the user to approve any undecided interest rates or fixed-deposit
lock rules.

Create `docs/PHASE_27_4_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

# PHASE 27.5 --- PLAYER BUSINESSES AND EMPLOYEES

Do not begin until the user approves the business rules.

Inspect the current business models and profit formulas. First produce a
design proposal for: - Business types. - Startup costs. - Production. -
Employee roles and wages. - Operating expenses. - Revenue. -
Maintenance. - Offline progress. - Claim intervals. - Loss conditions. -
Upgrade paths.

Clearly distinguish existing implemented formulas from proposed
features.

After approval, implement the headless domain model first, then UI in a
later subphase. Cap offline income and document clock-manipulation
limitations.

Create a design report first. Do not build a large business UI in the
same task.

------------------------------------------------------------------------

# PHASE 27.6 --- PROPERTY, STORAGE, AND ADVANCED TRADING

Inspect the approved property/business/economy model before
implementing.

Propose a small, internally consistent first version: - Property
ownership. - Purchase cost. - Storage capacity or utility. - Recurring
costs only if approved. - Trading rules. - Transaction history if
useful.

Avoid introducing speculative markets or complex investments without a
defined design. Ensure all transactions are validated and persisted.

Create `docs/PHASE_27_6_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

# PHASE 28 --- SAVE INTEGRITY AND ADMIN HARDENING

# PHASE 28.1 --- SAVE SCHEMA VERSIONING AND MIGRATIONS

Inspect every persisted record and current save validation.

Implement a centralized schema version and migration chain: - Current
version. - Older supported versions. - Sequential migrations. -
Validation after migration. - Safe fallback on unknown future
versions. - Preservation of valid player data. - Tests for each
supported version.

Do not simply reset saves when migration fails. Preserve a backup or
recovery copy before destructive repair where feasible.

Create `docs/PHASE_28_1_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

# PHASE 28.2 --- BACKUP, RESTORE, AND SAVE SLOTS

Inspect save model, IndexedDB layout, and export/import conventions.

Implement: - Manual save export. - Save import with strict validation. -
Backup before restore. - Clear confirmation for destructive
replacement. - Save-slot support only if the data model can support it
cleanly. - Safe handling of malformed or incompatible files. - Version
information in exported files.

Do not expose internal secrets or executable content through imports.
Test round-trip, invalid file, older version, and rollback.

Create `docs/PHASE_28_2_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

# PHASE 28.3 --- CORRUPTION RECOVERY AND DIAGNOSTICS

Inspect storage error handling and validation.

Add a diagnostics/recovery layer that can: - Detect invalid records. -
Report which data section failed. - Preserve recoverable sections. -
Restore defaults only for invalid/missing sections. - Keep a recovery
log that does not expose sensitive data. - Avoid endless retry loops. -
Provide a user-visible recovery message.

Do not silently discard the entire save because one optional field is
malformed.

Test corrupted player data, corrupted inventory, invalid mastery,
missing optional fields, and failed IndexedDB access.

Create `docs/PHASE_28_3_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

# PHASE 28.4 --- SUPER ADMIN PROTECTION

Important: A local role selector is not secure authentication. A
browser-only Super Admin screen can be inspected or modified by a user
with access to the client.

Inspect the current role selector and admin dashboard. Implement only
appropriate local safeguards: - Avoid accidental access through normal
user UI. - Add a configurable local admin gate only if the product
design requires it. - Do not hardcode a supposedly secure password in
client code. - Validate all admin operations. - Confirm destructive
actions. - Preserve backups before bulk data changes. - Add clear
warnings that local-only admin protection is not server-grade security.

If real security is required, document the future server-side
authentication/authorization requirements instead of pretending a
client-side password is secure.

Create `docs/PHASE_28_4_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

# PHASE 28.5 --- IMPORT/EXPORT AND CONTENT VERSIONING

Inspect question import/export, save backup, bundled question data, and
admin changes.

Implement explicit format versions and compatibility checks for: -
Question bank exports. - Save exports. - Optional content packs.

Requirements: - Validate before applying. - Preview import counts and
errors. - Reject unsupported versions safely. - Avoid partial
destructive imports. - Preserve tombstones and overrides according to
documented semantics. - Do not execute imported code or scripts.

Test valid import, invalid import, duplicate IDs, older versions, and
rollback.

Create `docs/PHASE_28_5_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

# PHASE 29 --- RELEASE READINESS

# PHASE 29.1 --- PERFORMANCE AND MEMORY OPTIMIZATION

Inspect production build output, asset sizes, Phaser scene lifecycle,
DOM overlays, timers, event listeners, and IndexedDB usage.

Measure before optimizing.

Evaluate: - Initial load time. - Bundle sizes. - Asset loading. - Scene
creation/destruction. - Sprite and game object counts. - Timer/listener
leaks. - Repeated question database initialization. - Large JSON
parsing. - Long-running sessions. - Memory growth after repeated
battles/transitions.

Use profiling or reproducible measurements where available. Do not
optimize based only on guesses. Do not sacrifice architecture for minor
gains.

Create a before/after performance report and
`docs/PHASE_29_1_IMPLEMENTATION_REPORT.md`. Stop after this phase.

------------------------------------------------------------------------

# PHASE 29.2 --- BROWSER AND DEVICE COMPATIBILITY

Inspect the actual browser APIs used by the project and the intended
target devices.

Test supported browsers and screen sizes. At minimum, define the
intended support matrix before claiming compatibility.

Evaluate: - IndexedDB availability and failure behavior. - Keyboard
input. - Pointer/touch if supported. - Audio autoplay. - Resize and
scaling. - Storage quota errors. - Page refresh and resume. - Long
sessions. - Browser back navigation.

Do not claim support for untested browsers/devices.

Create `docs/PHASE_29_2_COMPATIBILITY_REPORT.md`. Stop after this phase.

------------------------------------------------------------------------

# PHASE 29.3 --- PWA AND OFFLINE INSTALLATION

Inspect current Vite configuration, manifest, service worker, asset
loading, and IndexedDB behavior.

If PWA support is not present, implement it using a compatible and
maintained approach only after reviewing dependencies.

Requirements: - Valid web app manifest. - Appropriate icons if assets
exist. - Cache local application shell and required game assets. - Do
not cache unsafe or stale admin/question responses incorrectly. - Define
update behavior. - Avoid activating a new service worker in a way that
corrupts an active session. - Provide offline fallback. - Explain that
browser storage can still be cleared by the user/browser. - Do not claim
guaranteed permanent storage.

Test first install, offline reload, update, cache refresh, and save
persistence.

Create `docs/PHASE_29_3_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

# PHASE 29.4 --- ACCESSIBILITY AND LOCALIZATION READINESS

Inspect text rendering, UI labels, question content, fonts, and layout.

Implement: - Centralized UI strings where practical. - No hardcoded UI
text scattered across components when easy to centralize. - Font scaling
support. - Clear keyboard focus. - Sufficient contrast. - Reduced
motion. - Text wrapping and long-string handling. - Localization-ready
layout.

Do not automatically translate educational questions or change their
factual meaning. Keep educational content language separate from UI
language.

Create `docs/PHASE_29_4_IMPLEMENTATION_REPORT.md`. Stop after this
phase.

------------------------------------------------------------------------

# PHASE 29.5 --- PRODUCTION BUILD AND RELEASE CHECKLIST

Inspect scripts, environment configuration, asset paths, deployment
assumptions, PWA configuration, and error logging.

Prepare: - Reproducible production build. - Version number strategy. -
Release notes template. - Deployment instructions for the chosen host. -
Rollback procedure. - Asset/license inventory. - Known limitations. -
Smoke-test checklist. - Save backup guidance. - Browser support
statement.

Do not deploy to a public host or publish the game without explicit user
approval.

Run tests, TypeScript, production build, and production-preview smoke
tests if supported.

Create `docs/RELEASE_CHECKLIST.md` and
`docs/PHASE_29_5_IMPLEMENTATION_REPORT.md`. Stop after this phase.

------------------------------------------------------------------------

# PHASE 30 --- ONLINE ARCHITECTURE PREPARATION ONLY

**This phase is a design and architecture review. Do not implement
online multiplayer unless the user explicitly approves a separate
project.**

# PHASE 30.1 --- SERVER-AUTHORITATIVE BOUNDARIES

Inspect the current offline architecture and identify which systems
would need server authority in an online game.

Produce a proposal covering: - Player identity. - Character ownership. -
Inventory and currency authority. - Question selection and answer
validation. - Reward calculation. - PvP combat resolution. - Anti-cheat
boundaries. - Match state. - Persistence. - Reconnection. - Rate
limiting. - Server validation.

Clearly distinguish reusable current modules from modules that must be
redesigned. Do not add server dependencies.

Create `docs/ONLINE_ARCHITECTURE_PROPOSAL.md`. Stop after this phase.

------------------------------------------------------------------------

# PHASE 30.2 --- ACCOUNT AND IDENTITY DESIGN

Produce a design proposal for accounts and identity.

Consider: - Guest/local profile migration. - Account registration and
login. - Session expiration. - Account recovery. - Multiple devices. -
Data ownership. - Privacy and security. - Server-side authorization.

Do not store passwords in plaintext. Do not implement authentication in
the client only. Do not select a provider or deploy a backend without
user approval.

Create `docs/ACCOUNT_ARCHITECTURE_PROPOSAL.md`. Stop after this phase.

------------------------------------------------------------------------

# PHASE 30.3 --- ONLINE SAVE SYNCHRONIZATION DESIGN

Propose how local IndexedDB saves would synchronize with a server.

Cover: - Local-first behavior. - Conflict resolution. - Versioning. -
Offline edits. - Server authority. - Retry behavior. - Duplicate request
protection. - Data migration. - Backup/restore. - Recovery from partial
sync.

Do not assume last-write-wins is always safe for inventory, Gold,
rewards, or PvP state.

Create `docs/SAVE_SYNC_ARCHITECTURE_PROPOSAL.md`. Stop after this phase.

------------------------------------------------------------------------

# PHASE 30.4 --- PVP REVERSE-DIFFICULTY SPECIFICATION

The user's selected PvP design is **reverse difficulty**: - The
lower-level player receives harder questions. - The higher-level player
receives easier questions.

Do not silently replace this with equalized or identical question
difficulty.

Inspect the current arena preparation and PvE difficulty engine, but
keep PvP logic separate.

Prepare a design proposal covering: - Level difference calculation. -
Question tier and difficulty mapping for each participant. - Whether
both participants answer different questions. - Scoring. - Damage. -
Time limits. - Ties. - Disconnects. - Question fairness and content
availability. - Exploit prevention. - Match result validation.

Do not invent final formulas. Present options and trade-offs for user
approval.

Create `docs/PVP_RULES_PROPOSAL.md`. Stop after this phase.

------------------------------------------------------------------------

# PHASE 30.5 --- MATCHMAKING, LEADERBOARDS, GUILDS, AND TOURNAMENTS

Produce a modular online feature proposal for: - Matchmaking. -
Leaderboards. - Guilds. - Tournaments. - Match history. - Moderation and
reporting.

Identify backend services and operational costs at a high level. Do not
add networking or external services. Ask for approval before turning any
proposal into implementation work.

Create `docs/ONLINE_FEATURES_PROPOSAL.md`. Stop after this phase.

------------------------------------------------------------------------

# SECTION 4 --- OPTIONAL FEATURES TO SCHEDULE ONLY WHEN NEEDED

These are useful ideas, not mandatory phases. Do not implement them
simply because they appear in this list.

## A. Tutorial and first-time player experience

Possible work: - Movement tutorial. - NPC interaction tutorial. - First
battle guidance. - How educational questions affect combat. -
Inventory/equipment introduction. - Mastery explanation. - Save/load
explanation. - Skip/replay tutorial option.

## B. Monster encyclopedia

Possible entries: - Monster name and image. - Region and level. -
Subject/tier profile. - Defeated count. - Drops discovered. - Lore and
weakness information, only if those properties exist. - First encounter
and first defeat.

Use actual encounter data; do not invent discovered information.

## C. Achievements

Possible categories: - Combat. - Exploration. - Learning. - Mastery. -
Quests. - Collection. - Economy.

Achievements must be awarded idempotently and persisted.

## D. Player statistics screen

Possible statistics: - Total battles. - Victories/defeats/escapes. -
Total questions answered. - Accuracy by subject. - Mastery progress. -
Monsters defeated. - Items collected. - Gold earned/spent.

Only show statistics that are actually tracked.

## E. Save slots and multiple characters

Only implement if the user wants more than one character per browser
profile. Plan identity and storage isolation before coding.

## F. Content packs

Allow additional question/world content to be imported as versioned
packs, with validation and rollback.

## G. Localization

Separate UI localization from educational question translation. Never
assume translated questions are factually equivalent without review.

------------------------------------------------------------------------

# SECTION 5 --- UNIVERSAL ANTIGRAVITY QUALITY GATE

Use this prompt when a phase is implemented but you want an independent
review before accepting it.

## QUALITY GATE PROMPT

Review the current Knowledge Realms implementation for the most recently
completed phase.

Do not immediately modify files.

1.  Read the phase prompt and implementation report.
2.  Inspect every file changed in that phase.
3.  Trace the runtime flow from the player action to the domain service
    and back to the UI.
4.  Verify that the implementation follows `AGENTS.md` and the project's
    architecture.
5.  Identify duplicated state, duplicate event handlers, race
    conditions, resource leaks, invalid assumptions, and missing error
    handling.
6.  Check whether the tests verify real behavior or only implementation
    details/mocks.
7.  Check whether scene/UI integration has been manually verified.
8.  Run the relevant tests, full test suite, TypeScript check, and
    production build.
9.  Compare the actual behavior with the phase requirements.

Classify each finding: - Critical: data loss, reward duplication, broken
core loop, security issue, or crash. - High: major feature incorrect or
inaccessible. - Medium: incomplete behavior, edge case, or usability
problem. - Low: cosmetic or maintainability issue.

Create `docs/PHASE_<ID>_QUALITY_REVIEW.md` with: - Overall result. -
Findings with file paths and exact evidence. - Reproduction steps. -
Recommended fixes. - Test results. - Manual checks still needed.

Do not fix anything yet. Wait for approval.

------------------------------------------------------------------------

# SECTION 6 --- UNIVERSAL BUG-FIX PROMPT

Use this when a phase review identifies a defect.

## BUG-FIX PROMPT

Fix only the approved findings listed below.

\[PASTE THE APPROVED FINDINGS HERE\]

Before editing: - Inspect the affected code and related tests. - Trace
the actual runtime flow. - Identify the root cause, not just the visible
symptom. - Explain the smallest safe fix.

Implementation rules: - Do not rewrite unrelated systems. - Do not
change public data models unless required. - If a schema change is
required, include migration and compatibility tests. - Add a regression
test for each fixed defect. - Preserve current architecture and behavior
outside the approved scope.

After editing: - Run targeted tests. - Run the full test suite. - Run
`npx tsc --noEmit`. - Run the production build. - Report exact
results. - List changed files. - Provide manual
reproduction/verification steps. - Update the relevant phase report.

Stop after the approved defects are fixed.

------------------------------------------------------------------------

# SECTION 7 --- HOW TO REQUEST EFFICIENT WORK FROM ANTIGRAVITY

## Good prompt structure

Every implementation request should contain:

1.  **Goal:** What user-visible result is needed?
2.  **Current state:** What already exists?
3.  **Inspection targets:** Which existing files/services should be
    examined?
4.  **Requirements:** What must happen?
5.  **Rules:** What must not change?
6.  **Tests:** What behavior must be verified?
7.  **Acceptance criteria:** How do we know it works?
8.  **Report:** What file must the agent create?
9.  **Stop condition:** What must the agent not implement yet?

This is more useful than asking the agent to "make the game better."

## Avoid these inefficient instructions

Do not use vague requests such as: - "Improve everything." - "Make the
whole game complete." - "Fix all bugs and add all features." - "Refactor
the whole codebase." - "Make it like a commercial RPG."

These requests encourage broad changes, make review difficult, and
increase the chance of regressions.

## Keep context efficient

-   In a continuing Antigravity conversation, refer to the phase number
    instead of pasting all previous prompts again.
-   In a new conversation, paste the Shared Context Prompt and the
    single current phase.
-   Ask the agent to inspect the source instead of pasting entire source
    files into the prompt.
-   Ask for concise evidence: file path, method, test name, and command
    output.
-   Do not ask for a long narrative of every internal thought. Ask for
    decisions, implementation details, evidence, and test results.
-   Do not ask the agent to repeat the entire project history in every
    report.
-   Keep phase reports focused on changes and verification.
-   Ask before adding a dependency, changing a schema, or making a
    game-design decision that affects balance.

## Recommended Antigravity workflow

For each phase:

**Step A --- Inspect and plan** Ask the agent to inspect relevant code
and provide a concise plan. No edits yet if the phase has major
unknowns.

**Step B --- Implement** Approve the plan, then have the agent implement
only that phase.

**Step C --- Verify** Have the agent run tests, TypeScript, and build.
Ask for manual browser checks.

**Step D --- Review** Share the implementation report and any
errors/screenshots with your reviewer.

**Step E --- Fix** Use the Universal Bug-Fix Prompt for approved issues.

**Step F --- Continue** Only then move to the next phase.

------------------------------------------------------------------------

# SECTION 8 --- CURRENT NEXT ACTION

The next prompt to run is:

**PHASE 21.2 --- COMBAT REWARDS, CURRENCY PERSISTENCE, AND DEFEAT
RESPAWN**

Why: - Phase 21.1 connected the active player session. - The report says
battle EXP and Gold payouts are still deferred. - The report explicitly
confirms Gold is not in the current save schema. - Item drops and ending
HP already have session integration. - The next step is to make battle
outcomes update and persist the same active player state.

Do not jump directly to world expansion, skill trees, or multiplayer.
First complete and manually verify the core loop.

------------------------------------------------------------------------

# SECTION 9 --- PROJECT DECISION LOG

Keep this section updated when the user makes a final design decision.
Do not treat provisional examples as approved rules.

  -----------------------------------------------------------------------
  Topic                               Current decision/status
  ----------------------------------- -----------------------------------
  Initial architecture                Phaser 3 + TypeScript + Vite;
                                      headless domain logic

  Initial game mode                   Offline-first, single-player

  Player session                      Centralized `PlayerSessionManager`;
                                      Phase 21.1 reported complete

  Character EXP                       Primarily from defeating monsters

  Subject mastery                     Separate from character level;
                                      performance-based

  Starting region                     Beginners Village

  Starting level range                Levels 1--10

  Educational tiers                   Elementary 1--10; Junior High
                                      11--50; Senior High 51--100

  Higher educational tiers            College 101--150, Master's
                                      151--200, PhD 201--250,
                                      Specialization 251+ are provisional

  Higher-level zones                  Risk-based access with warning

  PvE level delta                     Monster Level minus Player Level

  Higher-level monster questions      Can jump substantially higher in
                                      difficulty/tier

  Combat                              Hybrid exploration plus educational
                                      battle

  Question count                      Randomized at battle start

  Incorrect answer                    Damage-player

  Timeout                             Same initial penalty as incorrect
                                      answer

  PvP difficulty                      Reverse difficulty: lower-level
                                      player gets harder questions;
                                      higher-level player gets easier
                                      questions

  Question types                      Multiple Choice and Identification
                                      for normal combat; essay better
                                      suited to slower activities

  Currency                            Fictional Gold

  Super Admin                         Local role selector only; not
                                      secure authentication

  Question content                    Bundled JSON plus IndexedDB admin
                                      changes/tombstones

  Phase 21.1 tests                    Reported 32 files / 357 tests
                                      passing

  Known persistence gap               Gold/currency absent from Phase
                                      21.1 `SaveData` schema

  Next phase                          21.2 rewards, currency persistence,
                                      defeat respawn
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# END OF HANDBOOK

**Development principle:** Build a connected, testable, maintainable
game one verified phase at a time. A smaller feature that works in the
actual game is more valuable than a large feature that exists only in
isolated classes or an implementation report.
