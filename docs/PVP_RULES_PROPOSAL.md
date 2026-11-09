# Knowledge Realms — PvP Reverse-Difficulty Specification (Proposal)

**Date**: 2026-11-09  
**Phase**: 30.4 (Handbook Section: Phase 30 — Online Architecture Preparation Only)  
**Status**: Approved design — all 14 decisions recorded in §19; no PvP, networking, matchmaking, backend, or balance change implemented

---

## 1. Purpose and Constraints

This document specifies the approved design for competitive PvP under the player-selected
**Reverse Difficulty** rule:

> Lower-level player receives **harder** questions.  
> Higher-level player receives **easier** questions.

The reverse rule is a product decision. This proposal does not replace it with equalized,
mirrored, or identical difficulty. Every option below assumes the rule stays in force; the
questions are how to apply it consistently, fairly, and verifiably.

Hard constraints:

1. **PvP logic stays separate from PvE logic.** `src/questions/retrieval/DifficultyEngine.ts`
   (PvE) is inspected only for contrast and must not be modified or shared as the PvP authority.
2. **The approved choices are recorded in §19.** Numeric values marked **initial** are configurable
   starting points, not final balance numbers; no implementation starts from this document alone.
3. **No online code is written.** The current AI sparring mode remains the only executable PvP
   surface. Ranked multiplayer depends on the server-authority work proposed in Phases 30.1–30.3.
4. **Offline practice and ranked play are different products.** The existing local sparring mode
   can survive unchanged as an unranked practice feature; ranked PvP is a separate mode with
   server-owned questions, timing, scoring, and results.

Sections 5–15 retain the option analysis as design rationale. Where they differ from the approved
record, §19 is authoritative.

Handbook checklist coverage:

| Required topic | Section |
| :--- | :--- |
| Level difference calculation | 5 |
| Question tier and difficulty mapping per participant | 6 |
| Whether both participants answer different questions | 7 |
| Scoring | 8 |
| Damage | 9 |
| Time limits | 10 |
| Ties | 11 |
| Disconnects | 12 |
| Question fairness and content availability | 13 |
| Exploit prevention | 14 |
| Match result validation | 15 |

---

## 2. What Exists Today (Audit)

### 2.1 Reverse-difficulty engine

`src/arena/PvPDifficultyEngine.ts` implements `HeadlessPvPDifficultyEngine`, isolated from the PvE
engine. For a combatant, `deltaLevel = opponent.level - combatant.level`:

| Level difference | Tier assigned | Target difficulty | Time limit | Handicap note |
| :--- | :--- | :--- | :--- | :--- |
| `deltaLevel >= 5` (lower level) | SeniorHigh | 5 | 20 s | Heavy cognitive challenge |
| `1 <= deltaLevel < 5` | JuniorHigh | 4 | 25 s | Moderate cognitive challenge |
| `deltaLevel === 0` | JuniorHigh | 3 | 30 s | Balanced matchmaking tier |
| `-5 < deltaLevel < 0` | JuniorHigh | 2 | 35 s | Mild cognitive tier |
| `deltaLevel <= -5` (higher level) | Elementary | 1 | 40 s | Relaxed cognitive tier |

`calculateMatchDifficulty(a, b)` returns two independent profiles, one per combatant. The engine
only uses `ArenaCompetitor.level`; `rating` and `subjectFocus` do not affect difficulty.

### 2.2 Duel session

`src/arena/ArenaDuelSession.ts` is a headless single-player sparring simulation:

- Default `maxRounds = 3`, configurable.
- `samplePlayerQuestion()` filters the repository by subject and **`playerProfile.tier` only**,
  then picks uniformly at random. If the tier pool is empty it falls back to any question in the
  subject, then returns `undefined` if the subject has none.
- `resolveRound(playerAnsweredCorrect: boolean)` accepts the correctness **from the caller**. It
  adds one point for a correct player answer, then simulates the rival with
  `Math.random() < 0.8` when the rival's target difficulty is `<= 2`, otherwise `0.6`.
- The rival is never assigned a question, never timed, and never receives a per-round outcome
  derived from content. The rival's "answer" is a probability check.
- At `currentRound >= maxRounds` the match resolves; the higher score wins, equal scores leave
  `winnerId` undefined (a draw). No tiebreak, rematch, rating, reward, or persistence exists.

### 2.3 Arena UI and data

- `src/ui/arena-modal/ArenaModal.ts` renders rival selection and the duel screen. It shows only the
  player's profile (`handicapNote`, `timeLimitSeconds`, `targetDifficulty`), passes the profile's
  time limit onto the question copy, and treats timeout as an incorrect answer.
- `src/arena/ArenaTypes.ts` defines `ArenaCompetitor` as `{ id, displayName, level, rating?,
  subjectFocus? }`. It has no HP, attack, defense, crit, or equipment. `ArenaMatchDefinition`
  carries `roundLimit`, `timePerTurnSeconds`, status, and winner id — no round log, no deadlines,
  no disconnect state.
- `src/arena/ArenaRivals.ts` contains three static AI rivals (levels 2, 5, 10).
- The active subject is chosen from the rival's `subjectFocus` when the player starts a sparring
  match; the player's own focus is ignored.

### 2.4 Existing rules documents

- `docs/PVP_RULES.md` states the principle and explicitly defers damage and ranking formulas:
  “No Final Damage or Ranking Formulas … remain open specifications to be balanced upon network
  multiplayer implementation.”
- `docs/GAME_RULES.md` §6 repeats the reverse inequality and forbids applying it to PvE.
- `docs/ONLINE_ARCHITECTURE_PROPOSAL.md` §4.6 proposes a server Match Orchestrator that owns
  question selection, answer validation, round deadlines, scoring, and finalization. This proposal
  supplies the PvP-specific rules that orchestrator would enforce.

---

## 3. Findings and Risks

| # | Finding | Consequence |
| :--- | :--- | :--- |
| F1 | Sampling filters by tier but ignores `targetDifficulty` | A profile requesting difficulty 4/5 can receive any question in that tier, including difficulty 1. Reverse difficulty is only partially applied today. |
| F2 | Equal-level matches always use JuniorHigh | A level-2 vs level-2 match produces JuniorHigh questions even though the PvE tier config maps levels 1–10 to Elementary. The PvP baseline is hard-coded, not anchored to character level. |
| F3 | Only three of seven configured tiers are reachable | `College`, `Masters`, `PhD`, and `Specialization` exist in `DEFAULT_EDUCATIONAL_TIER_CONFIG` but are unreachable in PvP. High-level duels have no defined behavior. |
| F4 | Thresholds are coarse and fixed | A 1-level gap and a 4-level gap produce identical profiles; a 5-level gap and a 100-level gap also produce identical profiles. |
| F5 | Double handicap on the lower-level player | The lower-level player receives both harder questions **and** less time (20 s vs 40 s). The design intent mentions question difficulty, not shortened time. |
| F6 | The rival does not actually play | Rival accuracy is a fixed probability, so reverse difficulty for the rival is a difficulty label with no content or timing behind it. |
| F7 | No damage or HP model exists in the arena | The handbook asks about damage, but today only score changes. `ArenaCompetitor` has no combat stats. |
| F8 | Draws have no resolution | Equal scores end the match with no winner and no defined rating or rematch behavior. |
| F9 | No disconnect, forfeit, or reconnect concept | A dropped connection has no meaning; there is no concept of a participant failing to answer. |
| F10 | Client is fully trusted | `resolveRound(boolean)` accepts correctness from the UI; full `Question` objects (including `correctAnswer`) are shipped to the client. This is acceptable for offline practice and unacceptable for ranked play. |
| F11 | Content fallback is asymmetric and silent | `samplePlayerQuestion()` can fall back to any question in the subject for one competitor while the other keeps their intended profile. |
| F12 | No match record or validation | Results are in-memory only; nothing can be replayed, audited, or rated. |
| F13 | Subject selection favors the rival | The rival's `subjectFocus` becomes the active subject, which can systematically advantage the rival (and any future opponent) in ranked play. |

These findings are inputs to the options below. None of them is fixed by this phase.

---

## 4. Design Principles

1. **The rule is about difficulty assignment, not about outcomes.** Reverse difficulty compensates
   for RPG stat advantages; it must not predetermine who wins.
2. **One handicap, not several stacked by accident.** If lower-level players receive harder
   content, any additional timer or scoring penalty must be an explicit, approved decision.
3. **Procedural fairness over identical content.** Profiles may differ, but both participants must
   get the same number of questions, equivalent subject/topic coverage, equivalent calibration
   quality, and the same timing rules.
4. **Server owns anything ranked.** Question choice, answer validation, deadlines, score, and
   result must be recomputable by the server from recorded events.
5. **Practice stays practice.** Offline AI sparring may keep simplified rules, but its results are
   unranked and must be labeled as such.
6. **Every relaxation is symmetric and recorded.** If content is insufficient, either both
   profiles relax identically or the match is cancelled — never one side silently.

---

## 5. Level Difference Calculation

### Option A — Raw integer delta (current behavior)

`Δ = opponent.level − combatant.level`, clamped to `level >= 1`, integer levels.

- **Strengths**: simple, explainable, already implemented and tested; deterministic and easy to
  audit server-side.
- **Weaknesses**: 1 level at level 2 is a 50% relative gap, while 1 level at level 200 is 0.5%;
  both produce the same profile. Coarse buckets make large gaps indistinguishable (F4).
- **Fit**: good for a first ranked season if thresholds are revisited; poor long-term at high
  levels.

### Option B — Normalized delta

Divide the raw delta by a level scale, for example `Δ / max(1, min(levelA, levelB))`, or use a
log-ratio `log(levelOpponent / levelCombatant)`.

- **Strengths**: treats a 2-vs-4 gap as more significant than 198-vs-200; scales across the full
  level range.
- **Weaknesses**: harder to explain in the UI; needs a scale constant (another balance decision);
  can overreact at very low levels; floating-point determinism must be pinned server-side.
- **Fit**: better long-term fairness, more tuning surface.

### Option C — Level band plus relative adjustment (hybrid)

1. Anchor each participant's **baseline tier** to their own level using the PvE tier boundaries
   (or a PvP-specific copy of them).
2. Shift tier/difficulty **relative to the opponent** by the delta, within that anchor.

- **Strengths**: fixes F2/F3 — a level-5 mirror match uses Elementary, a level-60 mirror uses
  SeniorHigh, and all seven tiers become reachable. Reverse difficulty becomes a shift around a
  meaningful baseline rather than a fixed JuniorHigh default.
- **Weaknesses**: more complex; requires PvP-owned tier boundaries (must not import the PvE engine);
  high-tier content availability becomes a hard constraint (Section 13).
- **Fit**: the most coherent with the rest of the game's educational model, at the cost of content
  coverage work.

### Decision 5.1

Choose A (keep simple, revisit later), B (normalized), or C (level-anchored hybrid). If C, approve
a **PvP-owned** copy of the level→tier boundaries; PvE config remains untouched.

### Additional sub-decisions

- **Which level?** Character combat level only (current), or an effective level including
  equipment/stat allocation? Using combat level keeps the rule legible and avoids gear-driven
  difficulty swings; an effective level would require server-validated stat snapshots.
- **Clamping**: should gaps above a cap (e.g. 10 or 20 levels) stop increasing difficulty? A cap
  prevents unreachable content at extreme mismatches but also removes the incentive to fight
  stronger opponents.
- **Rating vs level**: `ArenaCompetitor.rating` exists but is unused. Matchmaking by rating
  (Phase 30.5) may reduce extreme gaps; difficulty assignment should still be level-based unless
  the user decides otherwise.

---

## 6. Question Tier and Difficulty Mapping per Participant

### Current mapping (for reference)

The table in §2.1 is the entire current rule. It assigns a tier, an integer difficulty 1–5, and a
timer. Difficulty is stored per question (`Question.difficulty`), and the repository can filter by
exact difficulty or a min/max range, but the duel session does not use it (F1).

### What "harder" should mean

Three independent levers exist:

1. **Educational tier** (Elementary → Specialization): curriculum level.
2. **Within-tier difficulty** (1–5): difficulty inside that curriculum.
3. **Question type/topic mix**: multiple choice vs identification, recall vs application.

The user's rule speaks of "harder questions" generally. The proposal recommends treating **tier
first, within-tier difficulty second**, because tier is the legible curriculum signal players
already see in PvE.

### Option A — Keep the current three-tier buckets

Preserve SeniorHigh/JuniorHigh/Elementary and the 1–5 difficulty values, but start actually
filtering by `targetDifficulty` (with a symmetric fallback).

- **Strengths**: smallest change; existing tests and UI language still apply; easy to ship.
- **Weaknesses**: F2/F3 remain — mirror matches at any level use JuniorHigh, and high tiers are
  unreachable.

### Option B — Level-anchored mapping (recommended direction, subject to approval)

Each participant's baseline tier comes from their own level; the opponent delta shifts the target
up (lower-level player) or down (higher-level player). Candidate shift table — **illustrative
only, not approved**:

| Relative situation | Candidate shift |
| :--- | :--- |
| Combatant much lower (gap ≥ large threshold) | +2 tiers, high within-tier difficulty |
| Combatant lower (gap ≥ small threshold) | +1 tier, high within-tier difficulty |
| Near-equal | Own tier, mid difficulty |
| Combatant higher | −1 tier, low difficulty |
| Combatant much higher | −2 tiers, lowest difficulty |

Open sub-decisions:

- Tier shifts must clamp at the ends of the tier ladder.
- Whether the shift is symmetric (a +2 for one participant implies −2 for the other) or each side
  is computed independently from its own baseline. Independent computation is simpler but can
  produce non-complementary profiles when the two baselines differ.
- Whether within-tier difficulty is also shifted or only the tier.
- Whether a small level gap should produce a within-tier change only (no tier jump), preserving
  content availability.

### Option C — Difficulty-only mapping

Keep each participant in their own tier and vary only within-tier difficulty.

- **Strengths**: best content availability; least jarring for players; avoids asking a level-5
  player to answer SeniorHigh content.
- **Weaknesses**: a within-tier 1→5 swing may be too weak to offset large stat gaps; arguably does
  not satisfy "harder questions" as strongly as tier shifts.

### Decision 6.1

Choose A, B, or C, and approve or reject the candidate shift table. The user may also want a
**difficulty floor/ceiling per tier** (e.g. never assign difficulty 5 in a participant's own tier
to avoid punishing the higher-level player twice).

### Mapping output per participant

Regardless of option, each participant's profile should explicitly carry:

- `baselineTier` (from their own level, if Option B/C)
- `targetTier`
- `targetDifficulty` (1–5)
- `timeLimitSeconds` (Section 10)
- a machine-readable reason code (for audit and UI), replacing the current free-text-only note

This extends `PvPDifficultyProfile`; it does not change PvE profiles.

---

## 7. Do Both Participants Answer Different Questions?

Today only the human player answers a real question; the rival is simulated (F6). Real PvP requires
a decision.

### Option A — Same question for both participants

Both receive the identical question (same item id), each with their own timer.

- **Strengths**: maximum perceived fairness; simple to explain; one content lookup; easy to audit.
- **Weaknesses**: cancels the reverse rule unless scoring differs by profile; if the rule is kept
  only through scoring, it stops being a difficulty handicap. Also creates a leak risk if one
  participant can see the other's screen or shares the item externally.
- **Fit**: appropriate for "mirror" casual modes, not for the stated reverse-difficulty design.

### Option B — Different questions per participant (recommended for ranked)

Each participant receives a distinct item sampled from their own profile, matched on subject (and
optionally topic) for the round.

- **Strengths**: the reverse rule is applied to actual content; one participant's answer cannot
  help the other; each side gets a valid question for their assigned level.
- **Weaknesses**: requires two calibrated pools per round; "fair" becomes procedural rather than
  identical; content availability must be verified for both profiles before the round starts.
- **Fit**: the only option consistent with distinct per-participant profiles.

### Option C — Shared round theme, different items

Both receive different items drawn from the same subject/topic and comparable difficulty band.

- **Strengths**: preserves the feel of a shared contest while honoring different profiles;
  reduces the chance that one side gets an outlier topic.
- **Weaknesses**: requires topic metadata and calibration; harder to prove equivalence.
- **Fit**: a refinement of B if the user wants stronger perceived fairness.

### Option D — Alternating "attack/defense" rounds

One participant answers a question to attack; the other answers to defend, then roles swap.

- **Strengths**: creates a duel rhythm and makes damage meaningful (Section 9).
- **Weaknesses**: longer matches; the defender's question difficulty and the attacker's are
  different by design, which compounds the reverse rule; more state to validate.
- **Fit**: interesting for a future mode, not a first ranked ruleset.

### Decision 7.1

Choose B (different questions, recommended), C (same theme/topic, different items), or A (same
question) for each mode. If B/C, decide whether topic must match and whether both participants
must be assigned their questions before either may answer (recommended: yes, to prevent one side
answering before the other's content is confirmed available).

### Timing model implications

- **Simultaneous rounds**: both questions assigned at round start; each participant has a deadline;
  round resolves when both answer or both deadlines pass.
- **Turn-based rounds**: one participant answers at a time; the other waits. Easier to follow, but
  slower and more sensitive to disconnects.
- Recommendation to evaluate: simultaneous rounds with per-participant deadlines, because they
  avoid giving the second mover information from the first mover's result.

---

## 8. Scoring

Current: +1 point per correct player answer, rival +1 per simulated success, most points after
`maxRounds` wins, equal is a draw.

### Option A — Round points (current, extended)

Correct = 1 round point; incorrect/timeout = 0; after N rounds, higher total wins.

- **Strengths**: simple, transparent, already implemented.
- **Weaknesses**: ignores difficulty and speed; a player can win by answering easy questions while
  the opponent faces harder ones (which is the intended handicap, but makes score a poor skill
  signal for rating).

### Option B — Weighted points by assigned difficulty

Award more points for a correct answer on a harder assigned question (e.g. difficulty or tier
weight).

- **Strengths**: acknowledges that the lower-level player faces harder content.
- **Weaknesses**: risks **inverting** the handicap — if hard questions pay more, the lower-level
  player is rewarded for the disadvantage; if the weights are too small they add complexity for no
  effect. Also makes rating comparisons across profiles harder.
- **Fit**: only if the user wants difficulty to be a scoring dimension, not merely a handicap.

### Option C — HP/damage score (see Section 9)

Correct answers deal damage; the match ends at 0 HP or after a round cap; remaining HP is the
score.

- **Strengths**: fits the RPG fantasy; makes damage meaningful.
- **Weaknesses**: requires a damage model and server-validated stats; can snowball; longer matches.

### Option D — Separate match score and rating

Match score decides the winner (Option A). Rating change is computed separately from the
expectation (e.g. Elo-style), independent of how many points were scored.

- **Strengths**: keeps the duel readable while allowing a principled ladder; avoids weighting
  exploits.
- **Weaknesses**: two systems to explain; rating formula remains an open Phase 30.5 decision.

### Decision 8.1

Choose the match-score model (A/B/C) and confirm that ranked rating is separate (D). If B, approve
weights; if C, approve Section 9. The proposal recommends **A + D** for a first ranked ruleset:
simple round points for the match, separate rating, no difficulty weighting.

### Round count

`maxRounds` is currently 3. Options: fixed best-of-N (first to majority), fixed N rounds, or
first-to-X points. A fixed round count is the most auditable and avoids variable match length.
Decision: round count and whether it varies by mode (duel vs tournament).

---

## 9. Damage

Today the arena has **no HP or damage** (F7). `ArenaCompetitor` has no combat stats, and the duel
session only tracks points. The handbook requires a damage decision even if the answer is "none
for ranked v1."

### Option A — No damage (score-only duels)

- **Strengths**: consistent with the current implementation; no stat snapshot or damage formula;
  reverse difficulty remains the only balancing lever; easy to validate.
- **Weaknesses**: less RPG-like; "damage" requested by the design brief is absent; the arena feels
  like a quiz scoreboard rather than combat.

### Option B — Fixed damage per correct answer

Correct answer deals a fixed amount to the opponent (or removes a fixed HP chunk); incorrect or
timeout deals nothing.

- **Strengths**: simple, symmetric, independent of gear; easy to reason about; timer/score are
  unaffected.
- **Weaknesses**: ignores character stats entirely; no progression fantasy; still a race to N
  correct answers in disguise.

### Option C — Stat-derived damage

Use each participant's server-validated `PlayerData` (attack, defense, crit) with the existing
`DamageCalculator`, or a PvP-specific mirror of it.

- **Strengths**: connects arena combat to character progression and equipment; reuses proven math.
- **Weaknesses**: reintroduces the exact stat disparity the reverse rule exists to offset; requires
  server snapshots of both characters; critical hits add variance; balance becomes much harder;
  gear advantages can overwhelm question difficulty.
- **Fit**: only with explicit caps or normalization (e.g. damage scaled by level band, not raw
  gear).

### Option D — Symmetric fixed "round damage" with no stats

Both participants start at the same HP (e.g. 3 "hearts"); a correct answer removes one heart from
the opponent; first to zero loses, with the round cap as a fallback.

- **Strengths**: readable, fair, no stat disparity; reverse difficulty still decides who answers
  what; maps cleanly to a best-of-N score.
- **Weaknesses**: essentially Option A with different presentation; "damage" is cosmetic.

### Decision 9.1

Choose A (no damage), B (fixed), C (stat-derived, with caps), or D (symmetric hearts). If C,
approve: stat snapshot source, PvP formula ownership (must not silently reuse PvE balance), crit
policy, and caps. If any damage model is chosen, decide whether damage is applied per correct
answer, per round win, or only at match end.

### Recommendation to evaluate

For a first ranked season, **A or D** is the lowest-risk choice: it preserves the product's
"questions decide the duel" identity and avoids compounding stat disparity. Stat-derived damage
can be a later mode once the ladder and anti-cheat are proven.

---

## 10. Time Limits

Current: each participant profile carries `timeLimitSeconds` (20/25/30/35/40). The player's value
is copied onto the question and enforced by the client `QuestionTimer`; timeout is evaluated as
`AnswerOutcome.Timeout` and counted as a miss. There is no server clock, no round deadline, and no
deadline for the rival.

### Issue: stacked handicap

The lower-level player receives harder questions **and** the shortest timer (F5). The higher-level
player receives easier questions **and** the longest timer. That is a double handicap that may be
intended, but it is currently an implicit side effect of the mapping table, not a stated rule.

### Option A — Keep per-profile asymmetric timers

- **Strengths**: strongest handicap; already implemented; simple.
- **Weaknesses**: makes the lower-level player's task harder in two dimensions; may feel punitive;
  hard to separate the effect of content from the effect of time when balancing.

### Option B — Equal timer for both participants

Both get the same per-question time, while question difficulty remains reversed.

- **Strengths**: one handicap (content) is isolated and measurable; easier to explain; less
  punishing for younger or slower readers.
- **Weaknesses**: weakens the overall handicap; the higher-level player's stat advantage may
  dominate more often.

### Option C — Compensating timers

Give more time for harder assigned questions (the inverse of the current table), so content
difficulty is the handicap and time is neutral or supportive.

- **Strengths**: keeps the cognitive challenge without punishing reading speed; accessible.
- **Weaknesses**: can cancel part of the difficulty handicap; more tuning.

### Option D — Server-authoritative round deadline

A fixed deadline per round (same for both), with a network grace window; late answers count as
unanswered. Per-question timers become a UI countdown only.

- **Strengths**: required for ranked integrity; prevents client clock manipulation; makes
  disconnects and ties treatable.
- **Weaknesses**: network latency fairness; requires the server Match Orchestrator.

### Decision 10.1

Choose the timer model (A/B/C) and confirm D for ranked matches. If C is chosen, approve whether
time is derived from difficulty, tier, or a flat bonus. If A is kept, explicitly approve the
double handicap. The proposal recommends **B or C plus D** for ranked play; keep A only for
offline practice.

### Additional timing questions

- Is the timer per question or per round (including reading/answer submission)?
- Does time spent disconnected count against the participant?
- Is there a minimum time floor for accessibility (Phase 29.4 text scaling and reduced motion
  already exist; timing is a separate accessibility concern)?
- Should a timeout end the round immediately or let the opponent finish their question?

---

## 11. Ties

Current: equal scores after `maxRounds` produce `winnerId === undefined`; the UI shows a standoff.
No rating or rematch rule exists (F8).

### Option A — True draw

- **Strengths**: honest; simple; no artificial tiebreak.
- **Weaknesses**: ranked ladders dislike draws; requires a rating policy (e.g. half-win or no
  change); tournament brackets need a winner.

### Option B — Sudden-death rounds

Play additional rounds until one participant answers correctly and the other does not; cap the
number of extra rounds.

- **Strengths**: produces a winner; dramatic; uses the same content pipeline.
- **Weaknesses**: can extend matches unpredictably; content availability for extra rounds; a
  participant may disconnect during sudden death (Section 12).

### Option C — Tiebreak by response time

Compare total or average server-measured response time on correct answers.

- **Strengths**: rewards quick, confident mastery; no extra content.
- **Weaknesses**: penalizes careful readers and accessibility needs; network latency contamination
  unless server-measured; can encourage guessing.

### Option D — Tiebreak by harder-question performance

Compare correctness on the hardest assigned band, then next-hardest.

- **Strengths**: aligns with the educational theme; no extra content; no speed penalty.
- **Weaknesses**: profiles differ, so "hardest assigned" is not directly comparable; sample sizes
  are tiny (3 rounds).

### Option E — Rating-only draw handling

Declare a draw for match purposes; rating treats it as an expected result (e.g. no change or
half-point).

- **Strengths**: separates match presentation from ladder math; no content cost.
- **Weaknesses**: tournaments still need a winner; players may feel unresolved.

### Decision 11.1

Choose the tie policy (A/B/C/D) and, separately, the rating treatment (E). The proposal recommends
**A + E for duels** and **B with a hard cap for tournaments**, unless the user prefers a single
policy everywhere.

---

## 12. Disconnects

Current: no concept of disconnect, forfeit, or reconnect (F9). A real-time PvP system needs one.

### Distinctions to define

1. **Voluntary leave** (explicit quit) — treat as forfeit.
2. **Network loss** (unexpected) — allow a reconnect window.
3. **Server-side failure** — cancel/no-contest; no rating loss.
4. **Failure before any answer** — cancel the match; no rating change.
5. **Failure after answers** — apply forfeit or resume, depending on policy.

### Option A — Immediate forfeit

- **Strengths**: simple, fast, discourages rage-quitting.
- **Weaknesses**: punishes unstable mobile networks; can be exploited by opponents who want a free
  win against a disconnected player (though the disconnect still decides it).

### Option B — Reconnect window with auto-forfeit

A short window (illustrative: 30–60 s, configurable) to return; missed rounds expire; failing to
return forfeits.

- **Strengths**: fair to transient network loss; server can enforce; matches the proposal in
  `ONLINE_ARCHITECTURE_PROPOSAL.md` §4.10.
- **Weaknesses**: longer matches; the connected player waits; needs presence/transport support.

### Option C — AI takeover of the disconnected participant

- **Strengths**: match completes; no waiting.
- **Weaknesses**: ranked integrity problem (the AI may outperform or underperform the human);
  opponent cannot know; not recommended for ranked. Could be acceptable for casual unranked.

### Option D — Pause the match

- **Strengths**: no penalty for network loss.
- **Weaknesses**: exploitable to stall; requires server state and resume tokens; bad for tournaments.

### Option E — No-contest with rating protection

If a participant never connects or disconnects before meaningful play, cancel with no rating
change.

- **Strengths**: prevents rating loss from infrastructure failure.
- **Weaknesses**: does not resolve a match already in progress; needs a "meaningful play" threshold.

### Decision 12.1

Choose the policy and the reconnect window. The proposal recommends **E before first answer**,
**B after play begins**, and **A for explicit quit**, with no AI takeover in ranked. Also decide:
who receives the win on forfeit, whether rating is adjusted, and whether repeated disconnects carry
an account-level penalty (Phase 30.5 moderation).

---

## 13. Question Fairness and Content Availability

### Fairness requirements

1. Both participants receive the **same number** of questions.
2. Both receive the **same subject** (and optionally the same topic) per round.
3. Both questions are **validated, published**, and from the same content-bank version.
4. Both are assigned **before either may answer**, so one side cannot answer while the other's
   content is missing.
5. Neither participant can see the other's item, choices, or result before answering.
6. Relaxation for missing content is **symmetric or the match is cancelled** (F11).
7. Question reuse across simultaneous matches is limited to avoid answer sharing (see Section 14).
8. A question may not repeat within a match.

### Content availability options

The current fallback chain (exact tier/difficulty → same tier → baseline/any tier → any subject) is
fine for PvE but not for two independent PvP profiles.

- **Option A — Cancel the match if either side lacks content.** Safest; may cause matchmaking
  failures in low-population tiers.
- **Option B — Symmetric relaxation.** If one side lacks its target band, relax both sides by the
  same step until both have content, and record the reason. Preserves fairness but weakens the
  handicap.
- **Option C — Asymmetric relaxation with disclosure.** Allow one side to relax and show that the
  match is "content-adjusted"; simplest operationally, weakest fairness guarantee.
- **Option D — Restrict ranked play to content-complete bands.** Ranked queues only open for
  modes/tiers with verified pools; other bands are practice-only.

### Decision 13.1

Choose the availability policy. The proposal recommends **B for ranked duels** with a hard
**A** fallback if symmetric relaxation still cannot fill both pools, and **D** for tournament
modes. Also decide whether topic matching is required or subject-only.

### Content metadata needed

- Tier, difficulty, subject, topic, type, status, bank version (already present on `Question`).
- Calibration data (difficulty rating quality) if available later.
- Per-tier/per-topic pool counts per bank version, exposed to the matchmaker so it does not create
  impossible matches.
- Language/locale once localization exists (Phase 29.4 readiness only; not implemented).

### Educational coverage risk

The reverse rule can assign SeniorHigh questions to a very low-level player. That is the intended
handicap, but the lower-level player may never have been exposed to that curriculum. This is a
product question, not a bug: the user should confirm that the rule is meant to test **potential**
and not only **taught content**. If the intent is "harder but still fair," Option C in Section 6
(difficulty-only within the player's own tier) is the conservative choice.

---

## 14. Exploit Prevention

Ranked PvP must not trust the client. Current offline sparring is inherently exploitable (F10) and
must remain unranked if it keeps its current trust model.

| Threat | Current exposure | Proposed mitigation |
| :--- | :--- | :--- |
| Client reports "correct" without answering | `resolveRound(boolean)` accepts it | Server receives the chosen answer/identification text, evaluates against the answer key, and ignores any client correctness flag |
| Answer key visible in client memory | Full `Question` objects ship to the browser | Server sends a projection without `correctAnswer`/`acceptedAnswers`; keys never leave the server |
| Question sharing between participants | Same client can inspect its own item | Distinct items per participant (Section 7); no item overlap within a match; optional no-reuse window across concurrent matches |
| Answer sharing with a third party | Any player can screenshot/share | Server-side time limits, randomized question order per match, item rotation, anomaly detection; cannot be fully prevented, so ranked integrity should not rely on secrecy alone |
| Multiple accounts / smurfing | No accounts today (Phase 30.2) | Account + character identity, rating gating, minimum level for ranked, device/account linkage policy |
| Level manipulation | Local saves | Server-authoritative progression (Phase 30.1); ranked eligibility based on server-validated level/xp |
| Gear/stat exploits | Stats are local | Server stat snapshots; damage (if any) computed server-side |
| Timer manipulation | Client `QuestionTimer` | Server deadlines and timestamps; client timer is display-only |
| Disconnect abuse | None today | §12 policy; repeated-disconnect tracking; no rating gain from no-contest |
| Duplicate/replayed submissions | None today | `matchId` + `roundId` + participant idempotency keys; one accepted answer per participant per round |
| Collusion / win trading | No match history | Match history, repeated-pair detection, rating anomaly review (Phase 30.5 moderation) |
| Forged match results | None today | Server recomputes result from its own event log; client result is display-only |
| Question-bank tampering | Local bank is editable | Server-owned ranked bank; content version pinned per match; local bank only for offline play |
| Alt-account rating farming | No rating yet | Rating eligibility rules and match history review; open Phase 30.5 decision |

### Decision 14.1

Confirm the ranked trust boundary: **server owns questions, answers, timing, and results**. Confirm
that offline sparring remains explicitly unranked. Decide whether ranked requires a minimum
character level or completed onboarding to reduce alt-account abuse.

### Note on "answer secrecy"

Because questions are educational content, perfect secrecy is impossible. The design should
therefore treat secrecy as a deterrent, not the primary defense. The primary defenses are
server-side validation, per-participant items, timing, and rating integrity review.

---

## 15. Match Result Validation

Current: `ArenaDuelSession` resolves locally and holds the result in memory only. There is nothing
to validate or replay (F12).

### Option A — Client-authoritative result (practice only)

- **Strengths**: no backend; current behavior; works offline.
- **Weaknesses**: trivially forgeable; cannot grant rating or ranked rewards.
- **Fit**: acceptable only for unranked AI sparring, clearly labeled.

### Option B — Server-authoritative result with event log (recommended for ranked)

The server Match Orchestrator records, per round:

- match id, mode, bank version, subject, round index
- each participant's assigned question id and profile (tier/difficulty/timer)
- assignment timestamp, answer timestamp, submitted answer (or timeout)
- server evaluation result
- round score and cumulative score
- disconnect/forfeit events with reason codes

At the end it recomputes the winner from the event log, applies rating/rewards in the same
transaction, and stores an immutable match record.

- **Strengths**: auditable, replayable, idempotent; supports dispute review; rating integrity.
- **Weaknesses**: backend required; event schema and retention policy; more implementation work.

### Option C — Deterministic replay validation

Client and server both simulate from a seed and compare a result hash.

- **Strengths**: compact verification.
- **Weaknesses**: still trusts client-reported inputs unless answers are server-submitted; the
  server is already the evaluator in Option B, making this redundant. Not recommended.

### Decision 15.1

Confirm B for ranked. Approve the event fields, retention period, and who can access match history
(participants, moderators, support). Confirm that rating and rewards are applied atomically with
the result, keyed by `matchId` for idempotency.

### Validation checklist (future implementation)

1. Both participants are authenticated and eligible for the mode.
2. Both have a server-validated character snapshot.
3. Each round assigns exactly one question per participant from the intended profile.
4. No question repeats within the match.
5. Each participant has at most one accepted answer per round.
6. Answers arrive before the server deadline (with approved grace).
7. The server evaluates answers; client correctness claims are ignored.
8. Scores and winner are recomputed from the log, not accepted from the client.
9. A disconnect/forfeit follows the approved policy and is recorded with a reason.
10. Rating/reward changes are idempotent and auditable.

---

## 16. Relationship to the Online Architecture Proposals

This proposal is the PvP rules layer for the Match Orchestrator described in
`docs/ONLINE_ARCHITECTURE_PROPOSAL.md` §4.6. It depends on:

- **Phase 30.1** server-authoritative boundaries: the server selects questions, validates answers,
  owns timing and results.
- **Phase 30.2** accounts and identity: both participants are authenticated; `ArenaCompetitor`
  becomes a server-issued projection rather than a client object.
- **Phase 30.3** online save sync: character levels/stats used by the difficulty profile are
  server-validated; no offline edit can change ranked difficulty.

The existing `PvPDifficultyEngine` contract can remain the client-side preview and UI explanation,
but the server must compute the authoritative profile. To avoid drift, both sides should use the
same pure rule module with a pinned configuration version; the client copy is advisory only.

---

## 17. Reuse, Redesign, and Deprecate

| Surface | Disposition |
| :--- | :--- |
| `PvPDifficultyEngine` interface and pure calculation | **Reuse**, moved behind a shared rules package with a versioned config; add baseline/difficulty fields per Section 6 |
| `ArenaTypes.PvPDifficultyProfile` | **Extend** with baseline tier, reason code, config version |
| `ArenaCompetitor` | **Redesign** for online play: server-issued id, validated level/rating; no client-supplied stats in ranked |
| `ArenaDuelSession` | **Redesign** as a thin client receiver for ranked; keep as offline practice simulator with its current trust model |
| `ArenaModal` | **Extend** with opponent presence, round deadlines, reconnect/forfeit states; keep offline sparring UI |
| `ArenaRivals` / AI simulation | **Keep** for unranked practice; ranked AI (if ever) must be server-simulated |
| `QuestionRepository` filter | **Reuse** server-side; client ranked play receives projections only |
| `QuestionTimer` | **Keep** as UI countdown; server deadline is authoritative |
| `AnswerEvaluator` | **Reuse** server-side; client may preview but not decide ranked results |
| Existing `docs/PVP_RULES.md` | **Keep** as the principle statement; this proposal is the detailed design |
| PvE `DifficultyEngine` | **Unchanged**; do not import or modify for PvP |
| Ranking/ELO | **Not defined here**; Phase 30.5 |

---

## 18. Staged Path (Design-Only Milestones)

1. **Rules direction approved** (2026-11-09, §19): level model, mapping option, question model,
   score, damage, timer, tie, disconnect, fairness, validation.
2. **Specify the pure rules module** (still no online code): versioned config, deterministic
   profiles, reason codes, unit tests for boundary cases.
3. **Specify the Match Orchestrator contract** (ties into Phase 30.1): round lifecycle, event log,
   deadlines, validation checklist.
4. **Implement only after explicit approval** and after the backend/account/sync foundations exist.

No step in this path authorizes networking or backend work by itself.

---

## 19. Approved Decisions (2026-11-09)

All 14 decisions were approved on 2026-11-09. These are the operative PvP rules for future
implementation. Values marked **initial** are configurable starting points, not final balance
numbers.

1. **Level model — Option A (raw delta).** `Δ = opponent.level − combatant.level`, with both levels
   clamped to ≥ 1. No normalized or log model in v1; revisit after the first ranked season.
2. **Tier mapping — Option B (level-anchored).** Each participant's baseline tier comes from their
   own level using PvP-owned boundaries; the opponent delta shifts the target:
   - gap 1–4 → ±1 tier, gap ≥5 → ±2 tiers, equal → own tier;
   - shifts clamp at the ends of the tier ladder;
   - lower-level target within-tier difficulty 4–5, equal 3, higher 1–2;
   - the 5-level threshold is **initial**/configurable;
   - each participant is computed independently; a validation test must assert that the
     lower-level participant's target is never easier than the higher-level participant's. If a
     boundary case would violate that ordering, clamp the higher-level profile to an easier band.
3. **Tier boundaries — PvP owns a copy** of the level→tier configuration. The PvE
   `difficultyConfig` and `DifficultyEngine` remain unchanged and are not imported as the PvP
   authority.
4. **Question assignment — Option B (distinct per participant).** Each participant receives a
   different item sampled from their own profile; the same subject per round; topic matching is not
   required in v1; both items are assigned before either participant may answer. Ranked matches do
   not share an item between participants.
5. **Round model — simultaneous, fixed count.** Both participants answer in parallel with
   per-participant deadlines; a round resolves when both answer or both deadlines expire. Initial
   fixed count: 3 rounds per duel (the current default), configurable per mode. Tournament round
   counts are set in Phase 30.5.
6. **Match score — Option A + D.** One point per correct answer; incorrect or timeout scores 0;
   higher total after the fixed rounds wins. No difficulty weighting. Rating is computed separately
   from the match score (Elo-style expectation); the rating formula is a Phase 30.5 decision.
7. **Damage — Option A (none in ranked v1).** Ranked duels are score-only; no HP and no
   stat-derived damage. Symmetric hearts (Option D) may be prototyped later as a casual mode;
   stat-derived damage (Option C) is not approved for ranked play.
8. **Time limits — Option B + D.** Equal per-question limit for both participants; initial 30 s
   (the current balanced-match value), configurable; server-authoritative round deadline with a
   grace window; the client timer is display-only; timeout counts as incorrect. No asymmetric timer
   in ranked play.
9. **Ties — Option A + E for duels; Option B with a hard cap for tournaments.** Duels end in a true
   draw with no rating change. Tournaments use up to 3 sudden-death rounds; if still tied, rank by
   performance on the hardest assigned band (Option D); if still tied, the Phase 30.5 tournament
   seeding rule decides advancement.
10. **Disconnects — Option E before play, Option B after play, Option A for explicit quit.**
    - Before the first accepted answer: no-contest, no rating change.
    - After play begins: reconnect window (initial 45 s, within the proposed 30–60 s); missed
      rounds expire; failure to return forfeits to the connected opponent.
    - Explicit quit: immediate forfeit to the opponent.
    - No AI takeover in ranked. Server-side failures are no-contest. Post-play forfeits count as a
      normal win/loss; repeated disconnects are tracked for Phase 30.5 moderation.
11. **Content availability — Option B with Option A fallback.** If either participant's pool is
    short, relax both profiles symmetrically by the same step and record the reason; if both still
    cannot be filled, cancel the match with no rating change. No asymmetric relaxation in ranked.
    Tournaments use Option D (content-complete bands only).
12. **Ranked trust boundary — confirmed server authority.** The server owns question selection,
    answer keys, evaluation, timing, deadlines, score, and result. Clients receive projections
    without answer keys and may preview only. Offline AI sparring remains explicitly unranked and
    cannot feed ranked rating or progress.
13. **Ranked eligibility — authenticated, server-validated character; no minimum level in the first
    season.** Rating is the primary matchmaking key and level a secondary constraint. Alt-account
    linkage, anomaly review, and any onboarding or minimum-level gate are Phase 30.5 decisions;
    revisit after the first season.
14. **Match record retention — immutable records with provisional retention.** Store the event log
    described in §15 with `matchId`/`roundId`, profiles, question ids, timestamps, answers, results,
    and disconnect reasons. Participants can view their own history; moderators and support get
    read-only access. Provisional retention: the active ranked season plus one full season for
    dispute review; final duration and deletion procedure require the Phase 30.2 privacy review and
    Phase 30.5 operations approval.

---

## 20. Non-Goals

- No implementation of PvP, networking, matchmaking, rating, or backend.
- No change to offline AI sparring behavior in this phase.
- No change to PvE difficulty, question sampling, rewards, or balance.
- No final damage, rating, or tournament formula.
- No provider, transport, or database selection.
- No deployment, publication, or external service.
- No replacement of the reverse-difficulty rule with equalized or mirrored difficulty.

---

## 21. Acceptance Criteria for a Future Implementation

A later implementation phase may be considered complete only when:

1. The approved level model and mapping are encoded in a pure, versioned PvP rules module with unit
   tests covering equal, near-equal, large-gap, minimum-level, and maximum-tier cases.
2. Both participants receive validated, distinct (if approved) questions, assigned before answering.
3. The server evaluates answers and computes scores/timing/results; client correctness is ignored.
4. Answer keys are not sent to ranked clients.
5. Deadlines, ties, disconnects, and forfeits follow the approved policy and are recorded.
6. Content-availability relaxation is symmetric or the match is cancelled, with a recorded reason.
7. Match results are idempotent, stored, and auditable; rating/rewards apply exactly once.
8. Offline practice remains labeled unranked and cannot feed ranked progress.
9. PvE difficulty and balance are unchanged.
10. The full test/typecheck/build gate passes, and the verification is reported.

---

## 22. Summary

The game already has a clean, isolated reverse-difficulty calculation and a working offline
sparring loop, but it is a partial implementation: it samples by tier without honoring
within-tier difficulty, uses a hard-coded JuniorHigh baseline, stacks shorter timers onto harder
questions, simulates the rival with a probability, has no damage/HP, no tiebreak, no disconnect
policy, and trusts the client completely. This proposal keeps the player-selected reverse rule
intact and records the approved decisions needed to turn it into a fair, verifiable PvP ruleset:
server-authoritative questions and results, distinct per-participant questions, level-anchored
mapping, simple round scoring with a separate rating, no ranked damage in v1, equal server-owned
timers, symmetric content fallback, and a reconnect window that forfeits only after play begins.

No code, network layer, backend, or balance change has been made. Phase 30.5 (matchmaking,
leaderboards, guilds, and tournaments) remains a separate design step requiring confirmation.
