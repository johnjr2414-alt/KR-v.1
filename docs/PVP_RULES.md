# Knowledge Realms — PvP Difficulty & Arena Rules

## Overview
This document specifies the core design philosophy and question difficulty rules for future competitive Player vs. Player (PvP) encounters and Arena tournaments in Knowledge Realms.

---

## 1. The Reverse Difficulty Principle

Unlike traditional RPGs where numerical character advantages dominate every contest, or standard trivia games with uniform questions, Knowledge Realms incorporates a **Cognitive Handicap Balancing Mechanism** termed the **Reverse Difficulty Rule**:

> **Lower-level player = Harder questions**  
> **Higher-level player = Easier questions**

### Design Justification & Intent
1. **Stat Disparity Compensation**:
   - In standard RPG combat, high-level characters possess vast advantages in Max HP, Attack (ATK), Defense (DEF), and Gear Modifiers.
   - If both players answered identical questions, the higher-level player would virtually always win simply by enduring more hits and dealing vastly superior base damage.
2. **Cognitive Equalizer**:
   - By assigning harder curriculum-tier questions to the lower-level player and easier questions to the higher-level player, question difficulty acts as a natural handicap.
   - An underleveled intellectual prodigy who reliably masters harder/higher-tier academic concepts can overcome an over-geared warrior who stumbles on elementary curriculum questions.
3. **Decoupled Isolation**:
   - The PvP difficulty algorithm is completely isolated and decoupled from PvE difficulty logic.
   - It will never alter PvE monster encounters or single-player dungeon progression.

---

## 2. PvE vs. PvP Difficulty Comparison

| Dimension | PvE Difficulty Selection | PvP Difficulty Selection (Arena) |
| :--- | :--- | :--- |
| **Primary Reference** | $\Delta\text{Level} = \text{Monster Level} - \text{Player Level}$ | $\Delta\text{Level} = \text{Opponent Level} - \text{Player Level}$ |
| **Difficulty Flow** | Higher-level monster $\rightarrow$ Harder questions.<br>Lower-level monster $\rightarrow$ Easier questions. | Lower-level player $\rightarrow$ Harder questions.<br>Higher-level player $\rightarrow$ Easier questions. |
| **Objective** | Real-time danger gating and progression challenge against the realm. | Fair competitive matchmaking and intellectual handicap balancing. |
| **Consequence of Mistake** | Retaliatory monster attack against player HP. | Opponent initiative, damage mitigation loss, or turn forfeit. |
| **Architecture** | `DifficultyEngine.ts` (Phase 11) | `PvPDifficultyEngine` interface (Phase 19) |

---

## 3. Strict Boundary Rules
- **No Multiplayer Networking in Initial Release**: All PvP models and difficulty contracts are offline/headless models reserved for future releases.
- **No Final Damage or Ranking Formulas**: Ranking ladders, ELO systems, and competitive tournament rating formulas remain open specifications to be balanced upon network multiplayer implementation.
