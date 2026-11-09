# Phase 27.2 Implementation Report — Gathering Professions

> **Numbering note**: This report was originally filed as `PHASE_27_2_IMPLEMENTATION_REPORT.md`
> under the earlier "Phase 27 — Economy & Professions" track. It was renamed to
> `PHASE_27_2_GATHERING_IMPLEMENTATION_REPORT.md` when the Phase 27 track was redefined by the
> Phase 27 Master Implementation Plan into a "Real-World Professions and Careers" track, freeing the
> canonical `PHASE_27_2_IMPLEMENTATION_REPORT.md` name for the professions workplace phase. The
> delivered work below is unchanged.

**Date**: 2026-11-09  
**Phase**: 27.2 (Handbook Section: Phase 27 — Economy & Professions)  
**Status**: Completed  
**Scope approved by user**: professions = **Mining, Herbalism, Woodcutting**; deliverable = **headless framework + persistence + tests** (no world-scene UI this phase).

---

### 1. Executive Summary

Phase 27.2 delivers a **configurable, headless gathering framework** for the approved
professions. Per the handbook, the phase:

- **Inspected** item/resource definitions (`src/inventory/ItemRegistry.ts`), world interaction
  patterns (`src/scenes/interactions/InteractionGuard.ts`, `MapDefinition`/`buildings`), the
  inventory domain (`InventoryManager`), quest objectives, and the save/persistence layer
  (`StorageTypes`, `SaveDataValidator`, `PlayerSessionManager`) **before** writing code.
- **Adds resource node definitions** — a data-driven `ResourceNodeDefinition` catalogue with one
  tier-1 and one higher-tier node per approved profession (six nodes total).
- **Adds gathering requirements** — minimum character level plus an **optional** tool requirement
  (tools are only modelled because they are used; one node is deliberately tool-free to show the
  requirement is optional).
- **Adds interaction feedback** — `canGather` / `gather` return a player-facing `message`, a
  machine-readable `reason`, and `respawnRemainingMs` for cooldown prompts.
- **Adds yield rules** — inclusive `yieldMin`..`yieldMax` rolls, injectable RNG for determinism.
- **Adds respawn rules** — per-node `respawnMs` cooldown tracked against an injectable clock.
- **Adds inventory capacity checks** — a gather that cannot store the **full** rolled yield fails
  with `inventory-full` and consumes nothing (atomic; never partially consumes the node or items).
- **Prevents duplicate resource claims** — the respawn cooldown rejects repeated input, and a
  re-entrancy guard covers listener-triggered double gathers.
- **Adds persistence where required** — an optional, backward-compatible `gathering` field on
  `SaveData`, sanitised on load and hydrated/serialised by `PlayerSessionManager`.

All rules are headless and configurable; no Phaser/DOM dependency was introduced. All balance
values are **provisional** (`provisional: true`).

### 2. Files Created and Modified

- **New Files**:
  - `src/gathering/GatheringTypes.ts`: `GatheringProfession`, `ResourceNodeDefinition`,
    `GatheringFailureReason`, `GatheringCheck`, `GatherResult`, `ResourceNodeState`,
    `GatheringSnapshot` + `GATHERING_SNAPSHOT_VERSION`.
  - `src/gathering/GatheringRegistry.ts`: `GATHERING_NODE_DEFINITIONS` (six provisional nodes) +
    `GATHERING_NODE_REGISTRY`, `getResourceNode`, `getResourceNodesForProfession`.
  - `src/gathering/GatheringService.ts`: headless `GatheringService` (canGather / gather / respawn /
    snapshot / loadSnapshot), `sanitizeGatheringSnapshot`, and the default `gatheringService`.
  - `src/gathering/index.ts`: barrel export.
  - `tests/gathering/phase27_2_gathering.test.ts`: 24 tests.
  - `docs/PHASE_27_2_GATHERING_IMPLEMENTATION_REPORT.md`: This report.
- **Modified Files**:
  - `src/inventory/ItemTypes.ts`: added `ItemType.Tool`.
  - `src/inventory/ItemRegistry.ts`: added six gathered materials (stack 99) and three tools
    (`ItemType.Tool`, stack 1) so node yields and tool requirements resolve to real items.
  - `src/storage/StorageTypes.ts`: added the optional `gathering?: GatheringSnapshot` field
    (backward-compatible; schema version stays `4`).
  - `src/storage/SaveDataValidator.ts`: sanitises the optional `gathering` payload via
    `sanitizeGatheringSnapshot`.
  - `src/player/PlayerSessionManager.ts`: added an injectable `GatheringService`, hydrates it from
    the save, and includes `gathering.snapshot()` in the session snapshot.
  - `docs/IMPLEMENTATION_REPORTS.md`: consolidated master tracker updated with Phase 27.2.

### 3. Content Sample (provisional, data-only)

| Node id | Profession | Yields | Lvl | Tool | Respawn |
| --- | --- | --- | --- | --- | --- |
| `copper-vein` | Mining | 1–3 × copper-ore | 1 | Iron Pickaxe | 8s |
| `iron-deposit` | Mining | 1–2 × iron-ore | 8 | Iron Pickaxe | 12s |
| `healing-bloom` | Herbalism | 1–3 × healing-herb | 1 | *(none)* | 6s |
| `moonpetal-patch` | Herbalism | 1 × moonpetal | 10 | Herbalist's Sickle | 15s |
| `sturdy-oak` | Woodcutting | 1–2 × oak-log | 1 | Woodcutter's Axe | 9s |
| `ashwood-grove` | Woodcutting | 1–2 × ash-wood | 12 | Woodcutter's Axe | 14s |

New items added to `ItemRegistry`: `copper-ore`, `iron-ore`, `healing-herb`, `moonpetal`,
`oak-log`, `ash-wood` (materials, stack 99); `iron-pickaxe`, `herbalist-sickle`,
`woodcutters-axe` (tools, stack 1). `healing-bloom` intentionally has no tool requirement to
demonstrate that tool requirements are optional.

### 4. Design Notes & Deliberate Boundaries

- **Profession progression is out of scope.** "Gathering requirements" is satisfied by level and
  optional tool checks. No gathering XP/levels were introduced (nothing in the handbook requires
  them); the framework is structured so that could be added later without changing node definitions.
- **Tools are carried, not equipped.** Tools are modelled as plain inventory items (`ItemType.Tool`)
  so the requirement is testable against `InventoryManager.hasItem` without inventing a new
  equipment slot. Tools are not equippable (they fail the equipment check as expected).
- **Atomic gathers.** `gather` rolls the yield, verifies the inventory can hold the *entire* yield,
  and only then stores it and starts the cooldown. A failed gather never changes inventory state and
  never starts the node's respawn.
- **Dual check model.** `canGather` is the coarse, non-mutating prompt check ("is any space
  available?"); `gather` is authoritative and additionally requires space for the full roll.
- **No world UI.** Per the approved scope, node placement in maps, proximity detection, and
  on-screen prompts are deferred. `message` / `respawnRemainingMs` are the interaction-feedback
  contract a future UI will consume.
- **No new economy faucet beyond content.** Gathered materials are normal items with `value`; no
  shop, craft, or price changes were made (Phase 27.3 covers crafting).

### 5. Verification & Test Results

Per the handbook, verified yields, requirements, capacity, repeat interaction, and persistence.

- **Automated Tests (`npm test`)**: **71 test files passed (839 passed, 0 failures)**. The new
  `tests/gathering/phase27_2_gathering.test.ts` contributes **24 tests** across registry integrity,
  yield rules, requirements, inventory capacity, repeat interaction/respawn, and persistence
  (snapshot round-trip, sanitisation, save validator, and a full player-session save/load cycle).
- **TypeScript Check (`npx tsc --noEmit`)**: **0 errors**.
- **Production Build (`npm run build`)**: **Succeeded** (`tsc && vite build`).

*Starting point for this phase was 70 files / 815 tests; the phase adds 1 file / 24 tests.*
