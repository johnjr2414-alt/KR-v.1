# Knowledge Realms — Game Design Document (GDD)

**Version:** 1.0  
**Genre:** 2D Educational Fantasy Action RPG / Economic Simulation  
**Platform:** Web Browser (Desktop / Mobile responsive)  
**Architecture:** Offline-First, Single-Player  
**Presentation & Core Tech:** Phaser 3, TypeScript, Vite, HTML5/CSS3, JSON, IndexedDB  

---

## 1. Game Concept & Philosophy

Knowledge Realms is a 2D fantasy action RPG inspired by classic 16-bit and mobile action RPGs (such as *Zenonia*). Players explore an expansive fantasy realm, battle monsters, level up their combat statistics, complete narrative quests, craft items, develop trade professions, and manage commercial enterprises.

### Educational Combat System
Unlike conventional trivia games or simple gamified quizzes, Knowledge Realms seamlessly integrates educational challenges directly into real-time monster encounters. Combat efficacy—attacking, dealing damage, defending against enemy strikes, and earning mastery—is directly bound to subject-matter mastery and answering curriculum-aligned questions.

### The Dual Progression Core
Knowledge Realms strictly separates RPG combat growth from intellectual mastery:
1. **Character Level & Combat EXP**: Acquired by defeating monsters, completing combat quests, and exploring. Governs standard RPG attributes (HP, MP, Attack, Defense, Intelligence, Critical Rate, Movement Speed) and equipment tiers.
2. **Knowledge Mastery EXP**: Acquired by answering questions correctly within specific subject disciplines. Scaled by response speed, difficulty tier, and accuracy streaks.

A high-level warrior who has spent hours grinding monsters in a starter zone may have formidable combat attributes but Elementary-tier mathematics mastery. Conversely, an adept academic player may possess Senior High mastery across subjects while having a level 5 character.

---

## 2. Core Gameplay Loop

```
1. Select Mode (User / Super Admin)
   ↓
2. Enter World (Beginners Village)
   ↓
3. Real-Time Exploration (Towns, NPCs, Shops, Hunting Zones)
   ↓
4. Initiate Monster Encounter
   ↓
5. Combat Sequence (Determined Question Count & Countdown Timer)
   ├── Correct Answer  → Player Attacks / Deals Damage (scaled by stats + mastery)
   └── Incorrect/Timeout → Monster Attacks / Deals Damage to Player
   ↓
6. Battle Resolution
   ├── Victory → Combat EXP, Gold, Item Drops + Subject Mastery EXP for correct answers
   └── Defeat  → Player respawns in village with configured defeat penalty
   ↓
7. Character & Mastery Growth (Upgrade Gear, unlock dangerous zones, advance questlines)
```

---

## 3. Player Roles

1. **User**:
   - Explores the 2D world with real-time controls.
   - Engages monsters in subject-specific hunting grounds.
   - Solves educational questions in combat.
   - Manages inventory, equipment, skill trees, and quest logs.
   - Interacts with village NPCs, merchants, and crafting stations.
2. **Super Admin**:
   - Dedicated administrative dashboard accessible directly in-browser.
   - Question CRUD (Create, Read, Update, Delete) with validation.
   - Filtering by Educational Tier, Subject, Topic, Difficulty, and Question Type.
   - Question import and export via standard JSON files.
   - Persistent overrides stored locally via IndexedDB with soft-deletion tombstones.

---

## 4. Player Progression & Combat Stats

Character level advancement is driven primarily by monster grinding.

### Primary Character Attributes
- **HP (Health Points)**: Maximum life pool. Depleted by incorrect answers, battle timeouts, or monster special attacks.
- **MP (Mana Points)**: Energy resource for casting active knowledge skills or magical abilities.
- **Attack (ATK)**: Base physical damage dealt upon answering a combat question correctly.
- **Defense (DEF)**: Damage reduction mitigating monster retaliatory strikes.
- **Intelligence (INT)**: Amplifies magical attacks, mastery gains, and skill effectiveness.
- **Critical Rate (CRIT)**: Probability of dealing double damage on a correct combat answer.
- **Movement Speed (SPD)**: Real-time map navigation velocity in Phaser scenes.

---

## 5. Knowledge Mastery Progression

Knowledge mastery represents a player's intellectual competence within specific academic disciplines. Each subject tracks independent mastery levels and EXP pools.

### Initial Academic Disciplines
1. **Mathematics and Logic**
2. **General Knowledge & History**
3. **Science (Biology, Chemistry)**
4. **Programming and Technology**
5. **Physics and Engineering**
6. **Business and Economics**

### Performance-Based Mastery Formula
Mastery EXP is never awarded for incorrect answers or timeouts. For correct answers, mastery rewards scale strictly on performance:
$$\text{Mastery EXP} = \text{Base EXP} \times \text{Difficulty Multiplier} \times \text{Speed Multiplier} \times \text{Performance Streak Multiplier}$$

- **Base EXP**: Base value assigned to the question schema.
- **Difficulty Multiplier**: Higher tiers and harder ratings yield substantially greater rewards.
- **Speed Multiplier**: Quick responses before timer decay provide a bonus.
- **Performance Streak**: Sustained consecutive correct answers multiply mastery rewards.

---

## 6. Educational Tiers and Character Level

Educational tiers structure curriculum content and baseline monster challenges:

| Character Level Range | Educational Tier | Status | Baseline Scope |
|---|---|---|---|
| Level 1 – 10 | **Elementary** | Confirmed | Arithmetic, basic science, general vocabulary |
| Level 11 – 50 | **Junior High School** | Confirmed | Pre-algebra, general biology, earth science, intro logic |
| Level 51 – 100 | **Senior High School** | Confirmed | Algebra II, chemistry, physics, basic algorithms |
| Level 101 – 150 | **College** | Proposed | Calculus, data structures, microeconomics, organic chemistry |
| Level 151 – 200 | **Master's** | Proposed | Advanced engineering, econometrics, discrete mathematics |
| Level 201 – 250 | **PhD** | Proposed | Specialized domain proofs, research methodologies |
| Level 251+ | **Specialization** | Proposed | Expert-level industry and theoretical certifications |

*Note: All level boundaries are defined in external JSON balance tables.*

---

## 7. Beginners Village

The starting town for all new players, scaled for Levels 1–10:
- **Central Square & Fountain**: Respawn point, save point, guidance NPCs.
- **Shops & Services**: Blacksmith (basic weapons/armor), General Merchant (potions, consumables).
- **Subject-Specific Academic Guilds**:
  - **Mathematics Building**: Math Slimes, Number Goblins, Fraction Bats.
  - **General Knowledge Library**: Book Mimics, Quiz Spirits, Knowledge Wisps.
  - **Science Laboratory**: Chemical Blobs, Atom Bugs, Experiment Golems.
  - **Technology Workshop**: Binary Slimes, Circuit Beetles, Glitch Sprites.
- **Gateways**: North and East gates leading out to higher-level hunting zones.

---

## 8. Subject-Specific Hunting Zones & Monster Levels

Each hunting zone in the world is tied to an academic subject and level range:
- Monsters possess explicit stats: Level, Max HP, ATK, DEF, Subject, Base Character EXP, Gold reward, Item Drop Table, and Question Category parameters.
- Baseline question tier is mapped directly to the monster's designated level.

---

## 9. PvE Question Difficulty Engine

PvE difficulty does **not** simply mirror player level. It is calculated by evaluating:
$$\Delta\text{Level} = \text{Monster Level} - \text{Player Level}$$

### The Higher-Level Monster Challenge Rule
When a player engages a monster higher than their character level, question difficulty spikes sharply:
- **$\Delta\text{Level} = +1\text{ to }+2$**: Slightly harder question pool within the monster's base tier.
- **$\Delta\text{Level} = +3\text{ to }+4$**: Moderately harder questions, lower timer allowance.
- **$\Delta\text{Level} = +5\text{ to }+9$**: Major difficulty jump; highest-difficulty questions of the current tier.
- **$\Delta\text{Level} = +10\text{ to }+19$**: Immediate tier jump (e.g., an Elementary player receives Junior High questions).
- **$\Delta\text{Level} \ge +20$**: Multi-tier jump; very high cognitive challenge.

### Lower-Level Monster Rule
When an overleveled player fights a low-level monster, questions remain within the low-level monster's baseline tier and become easier. Low-level monsters yield diminishing mastery EXP and low character EXP to prevent exploit grinding.

---

## 10. Battle System & Combat Mechanics

Combat is initiated when a player interacts with or collides with a monster in a hunting zone.

### Randomized Battle Question Count
At battle initiation, the engine samples a fixed question count based on monster category and HP:
- **Weak Monster**: 2 – 3 questions
- **Normal Monster**: 3 – 5 questions
- **Strong Monster**: 4 – 7 questions
- **Elite Monster**: 5 – 8 questions
- **Boss Encounter**: 6 – 10 questions

*Rule: The total question count is determined once at combat initialization and does not change during the fight.*

### Resolution Rules
- **Correct Answer**: The player executes an attack. Damage dealt is calculated using Player ATK, weapon stats, critical rolls, and monster DEF.
- **Incorrect Answer / Timeout (`DAMAGE-PLAYER`)**: The player takes damage directly from the monster's ATK stat mitigated by Player DEF. The question attempt is consumed and the battle continues if the player survives.
- **Victory Condition**: Monster HP reaches 0. Player receives Combat EXP, Gold, item drops, and performance-based Mastery EXP for correct answers.
- **Defeat Condition**: Player HP reaches 0. Battle terminates immediately; player respawns at the village with no monster victory rewards.

---

## 11. Question Types & Formats

1. **Multiple Choice (Single Best Answer)**:
   - 4 options with randomized presentation order.
   - Evaluated by stable choice IDs.
2. **Identification (Direct Text Input)**:
   - Case-insensitive, trimmed text input.
   - Evaluated against a list of acceptable aliases.
3. **Essay (Quests & Deep Academic Modules)**:
   - Open-ended response evaluated against rubric reference.
   - Excluded from real-time combat encounters by default.

---

## 12. Risk-Based Zone Access

Knowledge Realms enforces **Risk Access**:
- Higher-level zones are **never artificially locked** by invisible walls solely due to low player level.
- Players receive explicit visual danger warnings upon approaching high-level thresholds.
- Venturing into perilous territories exposes players to lethal monsters and multi-tier question jumps, preserving player agency and high-risk exploration.

---

## 13. Super Admin Capabilities

Accessible via client role toggle:
- Complete browser-based CRUD interface for question bank.
- Field validation (question length, answer validity, tier assignment, subject mapping).
- Local persistence using IndexedDB with soft-deletion tombstones for bundled defaults.
- JSON Import & Export for curriculum management.

---

## 14. PvP Reverse Difficulty (Future Specification)

In competitive PvP encounters:
- **Reverse Difficulty Principle**: The lower-level player receives harder questions, while the higher-level player receives easier questions.
- Compensates for RPG equipment/stat disparities through cognitive handicap, preserving competitive balance.
- Completely isolated from PvE combat algorithms.

---

## 15. Future RPG & Economic Systems

- **RPG Systems**: Equipment slots (Weapon, Armor, Helmet, Boots, Ring, Amulet), inventory management, potion crafting, NPC dialogue trees, and narrative quests.
- **Economic Simulation**: Local commerce, gold banking, savings interest, player-owned storefronts, workshop production chains, and municipal taxation. All economy logic runs locally with anti-tamper offline calculations.
