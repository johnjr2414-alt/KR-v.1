# Knowledge Realms — Game Rules Specification

**Document Version:** 1.0  
**Scope:** Formal rule definitions, formulas, state machines, and configuration parameters for all gameplay mechanics.

---

## 1. Character Progression vs. Knowledge Mastery

### 1.1 Character Combat EXP
- **Source**: Monster grinding, boss encounters, and quest completion.
- **Rule**: Character level strictly determines base RPG statistics (HP, MP, ATK, DEF, INT, CRIT, SPD) and equipment level requirements.
- **EXP Curve Formula (Configurable)**:
  $$\text{RequiredEXP}(L) = \lfloor A \times L^{B} + C \times L \rfloor$$
  *Provisional values*: $A = 50$, $B = 2.2$, $C = 100$.

### 1.2 Knowledge Mastery EXP
- **Source**: Correct answers to educational questions in combat or guild challenges.
- **Rule**: Every academic discipline tracks independent mastery level and EXP. Mastery never automatically advances combat stats or character level.
- **Mastery EXP Formula**:
  $$\text{MasteryGain} = \text{BaseEXP} \times M_{\text{diff}} \times M_{\text{speed}} \times M_{\text{streak}}$$
  *Provisional values*:
  - $\text{BaseEXP}$: Configured per question (Default: 20).
  - $M_{\text{diff}}$: Elementary = 1.0, Junior High = 1.5, Senior High = 2.2, College = 3.2.
  - $M_{\text{speed}}$: If $\text{TimeRemaining} / \text{TimeLimit} > 0.5$, then $1.0 + 0.5 \times (\text{TimeRemaining} / \text{TimeLimit})$; else $1.0$.
  - $M_{\text{streak}}$: For $S$ consecutive correct answers: $1.0 + \min(0.5, S \times 0.05)$.
  - Incorrect answers or expired timers award **zero** mastery EXP.

---

## 2. PvE Educational Tier Selection & Difficulty Scaling

### 2.1 Baseline Tier Selection
Baseline educational tier is mapped from Monster Level ($L_m$):

| Monster Level Range | Baseline Educational Tier | Numeric Difficulty Tier |
|---|---|---|
| 1 – 10 | Elementary | Tier 1 |
| 11 – 50 | Junior High School | Tier 2 |
| 51 – 100 | Senior High School | Tier 3 |
| 101 – 150 | College (Proposed) | Tier 4 |
| 151 – 200 | Master's (Proposed) | Tier 5 |
| 201 – 250 | PhD (Proposed) | Tier 6 |
| 251+ | Specialization (Proposed) | Tier 7 |

### 2.2 Level Difference Calculation
$$\Delta L = L_m - L_p$$
where $L_m$ is Monster Level and $L_p$ is Player Level.

### 2.3 Higher-Level Monster Challenge Jumps ($\Delta L > 0$)
When a player confronts a higher-level monster:
- **$\Delta L \in [1, 2]$**: Within-tier hard questions; timer reduced by 10%.
- **$\Delta L \in [3, 4]$**: Within-tier expert questions; timer reduced by 20%.
- **$\Delta L \in [5, 9]$**: Major difficulty jump. Sample questions from top 10% of current tier or introductory questions of next tier ($+1$ tier shift).
- **$\Delta L \in [10, 19]$**: Guaranteed $+1$ full educational tier jump; timer reduced by 30%.
- **$\Delta L \ge 20$**: Extreme cognitive peril; $+2$ educational tiers jump; timer reduced by 40%.
*Fallback Rule*: If the target tier/difficulty pool has fewer than 3 available questions, retrieve the hardest available questions in the closest populated tier and flag an audit event.

### 2.4 Lower-Level Monster Adjustment ($\Delta L < 0$)
- Questions are drawn from the monster's baseline tier with introductory/easy difficulty ratings.
- Diminishing returns applied to Combat EXP and Mastery EXP if $|\Delta L| \ge 10$:
  $$\text{EXPMultiplier} = \max\left(0.1, 1.0 - 0.08 \times (L_p - L_m)\right)$$

---

## 3. Combat System & Battle State Machine

### 3.1 Battle Initialization & Random Question Count
At the instant combat initiates, the engine determines the battle question quota $Q_{\text{total}}$:
$$Q_{\text{total}} = \text{RandomInteger}(Q_{\min}(C_m), Q_{\max}(C_m))$$
where $C_m$ is the Monster Category:
- **Weak**: $Q_{\min} = 2, Q_{\max} = 3$
- **Normal**: $Q_{\min} = 3, Q_{\max} = 5$
- **Strong**: $Q_{\min} = 4, Q_{\max} = 7$
- **Elite**: $Q_{\min} = 5, Q_{\max} = 8$
- **Boss**: $Q_{\min} = 6, Q_{\max} = 10$

*Invariant*: $Q_{\text{total}}$ is locked for the entire duration of that combat instance.

### 3.2 Combat Action Resolution
For each question index $q \in [1, Q_{\text{total}}]$:
1. **Timer**: Each question runs a countdown of $T$ seconds (default: 15–30s based on question difficulty).
2. **Correct Answer**:
   - Player executes attack animation.
   - Damage dealt to monster:
     $$\text{Dmg}_{\text{player}} = \max\left(1, (\text{ATK}_{\text{player}} \times M_{\text{crit}}) - \text{DEF}_{\text{monster}}\right)$$
   - If Critical roll succeeds: $M_{\text{crit}} = 2.0$, else $1.0$.
   - Accrue eligible Mastery EXP to battle reward cache.
3. **Incorrect Answer / Timeout (`DAMAGE-PLAYER`)**:
   - Monster executes attack animation.
   - Damage dealt to player:
     $$\text{Dmg}_{\text{monster}} = \max\left(1, \text{ATK}_{\text{monster}} - \text{DEF}_{\text{player}}\right)$$
   - Deduct $\text{Dmg}_{\text{monster}}$ from Player current HP.
   - Streak counter reset to 0. Zero Mastery EXP awarded for this question.
4. **Resolution Check**:
   - If Monster HP $\le 0$: Combat terminates with **Victory**.
   - If Player HP $\le 0$: Combat terminates with **Defeat**.
   - If $q = Q_{\text{total}}$ and both combatants survive: If monster HP $> 0$, monster retreats or unleashes enrage strike depending on monster configuration.

---

## 4. World Exploration & Zone Access

### 4.1 Risk-Based Access Rule
- No player level gates or invisible walls block zone transitions.
- A zone entrance check triggers an advisory modal if $L_p < L_{\text{zone\_recommended}}$:
  > *Warning: Entering [Zone Name]. Recommended Level: [L_rec]. Monster lethality and educational difficulty are extreme.*
- Player retains explicit option to `Proceed` or `Return`.

---

## 5. Question System Formats & Evaluation

1. **Multiple Choice**:
   - Exactly 1 correct answer matching `correctChoiceId`.
   - Display choices shuffled at presentation time without altering IDs.
2. **Identification**:
   - Player input normalized: `input.trim().toLowerCase()`.
   - Match verified against normalized `correctAnswer` and elements of `acceptedAnswers[]`.
3. **Essay**:
   - Rubric/keyword reference storage. Reserved for guild tasks and quests; excluded from combat pool.

---

## 6. PvP Reverse Difficulty Specification (Future System)

- **Mechanic**: Cognitive equalizer.
- **Rule**:
  $$\text{Player A Level} > \text{Player B Level} \implies \text{Difficulty}(\text{Player A}) < \text{Difficulty}(\text{Player B})$$
  The higher-level player receives lower-tier questions to offset their equipment advantage, while the lower-level player receives higher-tier questions.
- Under no circumstances will this reverse difficulty logic be applied to PvE monster battles.
