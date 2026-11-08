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
