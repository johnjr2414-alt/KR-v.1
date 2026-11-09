# Knowledge Realms — Online Features Proposal

**Date**: 2026-11-09  
**Phase**: 30.5 (Handbook Section: Phase 30 — Online Architecture Preparation Only)  
**Status**: Design proposal plus Stage 0 offline headless cores (implemented 2026-11-09) — no
networking, external service, provider, or dependency added

---

## 1. Purpose and Scope

This document proposes the modular online feature set requested by the handbook:

- Matchmaking
- Leaderboards
- Guilds
- Tournaments
- Match history
- Moderation and reporting
- Backend services and high-level operating costs

The game is currently offline-only. There is no network layer, account system, server, chat, guild
model, rating engine, or persisted match history. This proposal defines how those features fit
together, what existing modules can be reused, what must be redesigned, and what each stage costs
to operate. It does not select a provider, framework, transport, or hosting vendor.

Hard constraints:

1. **No networking or external services in this phase.** No endpoint, socket, database, queue,
   email, payment, or vendor dependency is added.
2. **No provider selection.** Service categories are named; vendor choices remain open.
3. **No implementation without a separately approved stage.** Stage 0 (offline headless models) is
   the only stage that can start before backend decisions; every later stage needs approval.
4. **Offline play remains first-class.** No online feature may block, downgrade, or silently mutate
   offline saves.
5. **Ranked data is server-validated.** Offline practice, local analytics, and client-reported
   results never enter a ranked leaderboard, tournament, or guild standing.
6. **This document does not replace the approved PvP rules.** Match structure, difficulty, timing,
   ties, and disconnects follow `docs/PVP_RULES_PROPOSAL.md` §19.

After the proposal was written, Stage 0 (the pure TypeScript offline cores defined in §13.1) was
implemented under `src/arena/online/`. No server, network transport, provider, database, or UI
integration was added, and no existing arena behavior changed. Later stages remain blocked on the
decisions in §15.

---

## 2. Current State Audit

### 2.1 What exists

| Surface | Current state | File |
| :--- | :--- | :--- |
| Arena modes | `Duel`, `RankedTournament`, `PracticeSparring` are declared enum values; only AI sparring is used | `src/arena/ArenaTypes.ts` |
| Competitor | `id`, `displayName`, `level`, optional `rating`, optional `subjectFocus` | `src/arena/ArenaTypes.ts` |
| AI rivals | Three static rivals with ratings 1000/1250/1600 | `src/arena/ArenaRivals.ts` |
| Duel session | Headless, in-memory, 3 rounds, client-supplied correctness, simulated rival | `src/arena/ArenaDuelSession.ts` |
| Difficulty | Isolated reverse-difficulty calculation, coarse fixed buckets | `src/arena/PvPDifficultyEngine.ts` |
| Arena UI | Rival list and duel screen; “Return to Matchmaking” label but no queue exists | `src/ui/arena-modal/ArenaModal.ts` |
| Challenge Arena | Single-player PvE challenge runs (consecutive monsters, boss, subject, time attack); not a tournament system | `src/arena/challenge/*` |
| Challenge progress | In-memory first-clear tracker; comment says “reserved for future save wiring” | `src/arena/challenge/ChallengeProgressTracker.ts` |
| Analytics | Content-free answer-attempt events and a bounded local snapshot; no server, no leaderboard | `src/analytics/AnalyticsTypes.ts` |
| Persistence | IndexedDB `knowledge-realms-save`, schema v6, slots/backup/recovery/export | `src/storage/*` |
| Identity | One local profile per origin; new characters use literal `player-1`; roles are local UI selection | `src/player/PlayerSessionManager.ts`, `src/core/roles/*` |
| Admin | Local passcode gate; explicitly not authentication | `src/config/adminAccessConfig.ts` |
| Network | None. No `fetch`, `XMLHttpRequest`, `WebSocket`, or `sendBeacon` in `src` | repository audit |

### 2.2 What does not exist

- Accounts, sessions, server-side characters, or server-side authorization.
- A rating service, rating history, placements, seasons, or decay.
- A matchmaking queue, queue tickets, match proposals, or accept/decline flow.
- Persisted match records, round logs, or replay/audit data.
- Guilds, rosters, invitations, guild roles, guild chat, or guild progression.
- Tournament definitions, registration, brackets, scheduling, prizes, or disputes.
- Player reports, moderation cases, penalties, appeals, or audit logs.
- Server-validated leaderboards of any kind.
- Chat, friends, presence, notifications, or social graph.
- Operational tooling: admin console, customer support views, dashboards, or on-call runbooks.

### 2.3 Findings

| # | Finding | Consequence |
| :--- | :--- | :--- |
| F1 | Identity is local and anonymous | Matchmaking, guilds, and leaderboards cannot be authoritative until Phase 30.2 is implemented |
| F2 | `rating` is a decorative optional field | A rating engine, placement policy, and season model must be designed before ranked queues |
| F3 | Match state is in-memory only | Match history, disputes, anti-cheat review, and rating validation have no evidence source |
| F4 | Challenge Arena is PvE and single-player | It can supply PvE scoreboards later, but it is not a tournament or PvP system |
| F5 | No social model exists | Guilds require new identity, membership, role, and moderation surfaces |
| F6 | No moderation system exists | Reporting, sanctions, appeals, and audit are prerequisites for chat and public names |
| F7 | No network layer exists | Every feature in this document is a future server project, not a client-only addition |
| F8 | Offline results are client-trusted | They must remain unranked; importing them into shared systems would be exploitable |
| F9 | Matches do not record rules/content versions | Season resets, balance changes, and question-bank updates cannot be audited |
| F10 | There is no operational budget or staffing model | Guild chat and public leaderboards create ongoing human moderation cost, not just infrastructure cost |

---

## 3. Shared Foundations

All six features depend on the same small set of primitives. Designing them once avoids six
incompatible implementations.

### 3.1 Identity and character

From Phase 30.2: `accountId`, `characterId`, `sessionId`, and a guest profile. Online features
require an authenticated account and a server-validated character. Display names are account-level
or character-level (open decision), must be unique enough for reporting, and must pass a name
policy before appearing on a leaderboard or guild roster.

### 3.2 Rating

The rating is the shared input for matchmaking, leaderboards, tournament seeding, and guild
standing. Options:

| Option | Strengths | Weaknesses |
| :--- | :--- | :--- |
| **Elo** | Simple, well understood, easy to audit, familiar to players | No uncertainty; poor handling of new/inactive players; inflation/deflation over seasons |
| **Glicko-2** | Models rating deviation and volatility; better placements and inactivity | More complex; harder to explain; more parameters to tune |
| **TrueSkill-like** | Handles team/guild play naturally | Overkill for 1v1; licensing/patent history requires care; complex |
| **Points ladder** | Very transparent; easy seasonal resets | Rewards volume over skill; easy to grind |

Recommendation to evaluate: **Elo for the first ranked season**, with Glicko-2 reconsidered when
team/guild play or placements become important. This is a recommendation, not an approved formula.

Shared rating rules to decide:

- Starting rating and provisional period (placement matches).
- K-factor or equivalent, and whether it varies by rating/experience.
- Season length, soft reset, and placement requirements.
- Inactivity handling (decay, hidden rating, or no change).
- Draw treatment (approved PvP decision: no rating change for duel draws).
- Forfeit treatment (approved: normal win/loss after play begins; no-contest before play).
- Whether rating is visible, hidden, or only shown as a tier/badge.

### 3.3 Season

A season is the unit for leaderboard resets, rewards, tournament cadence, and rating snapshots.
Options: fixed 8–12 week seasons, continuous ladder with periodic snapshots, or no seasons. A fixed
season is easier to operate and to explain; it also bounds leaderboard retention and reward scope.

### 3.4 Match record

The authoritative record produced by the Match Orchestrator described in
`docs/ONLINE_ARCHITECTURE_PROPOSAL.md` §4.6–4.8 and the approved rules in
`docs/PVP_RULES_PROPOSAL.md`. Minimum fields:

- `matchId`, mode, season id, rules version, content/question-bank version
- participant ids, character ids, display-name snapshots, pre-match ratings
- round count, per-round question ids, assigned profiles, deadlines
- submitted answers, server evaluation, timestamps
- scores, winner/draw, disconnect/forfeit reason
- post-match rating delta
- created/resolved timestamps, audit fields

Match history, leaderboards, tournaments, guild standings, and moderation all read from this
record. No feature should invent its own result format.

### 3.5 Moderation case

A single case model shared by reports, chat abuse, guild-name abuse, cheating, and dispute review:

- case id, category, severity, reporter (protected), subject account/character
- linked match/guild/chat evidence
- state, assignee, actions, appeal, audit trail
- retention and access policy

### 3.6 Content and rules versioning

Every ranked match pins the question-bank version and PvP rules configuration. Leaderboards and
tournaments must be able to exclude or annotate matches played under a deprecated or broken
configuration. This prevents “score inflation from a bug” from becoming permanent.

---

## 4. Matchmaking

### 4.1 Modes

| Mode | Queue? | Ranked? | Notes |
| :--- | :--- | :--- | :--- |
| AI practice sparring | No | No | Current offline mode; no server required |
| Ranked duel | Yes | Yes | 1v1, server-validated, rating applies |
| Unranked human duel | Yes | No | Optional; no rating, still server-validated if online |
| Tournament match | No queue | Yes | Created by the tournament service with fixed participants |
| Guild match | Future | Depends | Requires team/guild matchmaking and scheduling |

### 4.2 Inputs

Hard constraints (must match):

- eligible mode/season, authenticated, server-validated character
- content availability for both participants under the approved mapping
- region/latency ceiling (if regional pools exist)
- blocked-player and repeat-opponent rules

Soft inputs (scored):

- rating difference (primary)
- character level difference (secondary; does not replace the reverse-difficulty rule)
- subject preference/avoidance
- wait time (grows the acceptable rating band)
- recent-opponent penalty
- guild/party constraints (future)

### 4.3 Algorithm options

| Option | Description | Strengths | Weaknesses |
| :--- | :--- | :--- | :--- |
| **A. Rating-only expanding window** | Start with a tight rating band, widen every few seconds | Simple, predictable | Ignores level/content/region; can pair extreme gaps late |
| **B. Rating + level band** | Hard level band plus rating window | Keeps matches readable and content-feasible | Can starve queues in low population |
| **C. Quality score** | Score candidates by weighted rating, level, latency, wait, repeat penalty | Best match quality; tunable | More parameters; needs simulation and monitoring |
| **D. Bucket queue** | Fixed rating buckets, merge buckets over time | Cheap at scale | Coarse; boundary effects; poor at low population |

Recommendation to evaluate: **B first, evolving to C** once population and telemetry justify it.
Keep all weights in a versioned config; publish the match-quality target rather than the formula.

### 4.4 Queue lifecycle

1. Client requests a queue ticket (server authenticates and validates character/content).
2. Queue service places the ticket with rating, level, region, subject, and enqueue time.
3. Search proposes a match when constraints and quality thresholds pass.
4. Both clients accept/decline within a short window (or auto-accept for ranked).
5. Match Orchestrator creates the match and assigns questions.
6. Queue tickets are consumed exactly once; stale proposals expire.
7. Cancel, timeout, decline, and disconnect paths return the remaining player to the queue or end
   the search with a clear reason.

Race conditions to handle: duplicate proposals, two matches created for one ticket, one player
accepting after the other cancels, server restart during proposal, and reconnect during accept.
Use ticket ids, idempotency keys, and transactional match creation.

### 4.5 Placements, smurfs, and population

- New ranked players may play placement matches before receiving a visible rating.
- Bots are not allowed in ranked queues; AI opponents remain unranked practice.
- Low-population regions/modes may use longer waits, cross-region play with latency disclosure, or
  scheduled “queue windows” rather than fake opponents.
- Repeat-opponent avoidance is a soft rule; in very small pools it must yield.
- Alt-account and win-trading detection is a moderation input, not an automatic ban (Section 9).

### 4.6 Metrics

- Median and p95 queue time by mode/region/rating band
- Match quality: predicted win probability distribution, rating gap, level gap
- Accept rate, decline rate, cancel rate, requeue rate
- Repeat-opponent rate
- Queue abandonment
- Match completion and disconnect rate

### 4.7 Open decisions

- Rating system and starting/provisional values.
- Hard level band vs soft level penalty.
- Region model (single global pool vs regional pools).
- Subject selection: player choice, rotating subject, or random from eligible pool.
- Whether unranked human duels exist at launch.
- Placement match count and visibility of provisional rating.
- Queue windows versus always-open queues for low population.

---

## 5. Leaderboards

### 5.1 Scope options

| Board | Metric | Ranked source | Recommendation |
| :--- | :--- | :--- | :--- |
| Seasonal PvP rating | Rating | Server-validated PvP matches | Primary board |
| Seasonal wins | Wins (min matches) | Server-validated PvP matches | Secondary; volume-sensitive |
| Subject mastery/PvP | Per-subject rating or wins | Server-validated matches with subject | Later; content-sensitive |
| PvE challenge score | Challenge score/time | Server-validated PvE runs | Later; requires server PvE authority |
| Guild standing | Aggregate member rating/wins | Server-validated matches | With guilds |
| Learning accuracy | Answer accuracy/mastery | Server-validated attempts | **Not public by default**; privacy and learner-confidence risk |

Public learning leaderboards can discourage struggling learners and expose learning data. If they
exist at all, they should be opt-in, cohort-based, and never a global “smartest player” board.

### 5.2 Update model

Options:

- **Synchronous write on match completion** — simplest; every match updates the entry and rank.
- **Event stream + periodic snapshot** — match completion emits an event; a worker updates sorted
  sets and snapshots; resilient to spikes.
- **Batch recomputation** — periodic full recompute; easy to audit, but stale and expensive.

Recommendation to evaluate: **event-driven update with cached sorted sets and periodic snapshots**.
The match transaction records the result; a separate worker updates leaderboard projections. If the
worker fails, it can replay from match records.

### 5.3 Ties, seasons, and decay

- Ties: shared rank, or ordered by wins/head-to-head/earliest-achieved. Decide and document.
- Seasonal reset: hard reset, soft reset (compress toward the mean), or placement-based reset.
- Inactivity: no decay, visible decay, or hidden rating. Decay must not punish illness/vacation
  without a clear policy.
- Minimum matches for eligibility (e.g. 10) to prevent one lucky match from topping a board.
- Rewards: cosmetic titles/badges by default; currency rewards require an approved economy sink and
  anti-abuse review.

### 5.4 Integrity and visibility

- Only server-validated results count; offline/local results never do.
- Accounts under active anti-cheat review may be hidden (“provisional”) rather than publicly
  removed mid-investigation.
- Corrected results trigger rank recomputation and an audit entry.
- Public boards show display name, rating/tier, rank, region, and season — not account ids, email,
  or learning analytics.
- Players can see their own rank even if they opt out of public display (open decision).
- Top-N caching and pagination keep reads cheap; do not expose full-history scraping endpoints.

### 5.5 Data model (conceptual)

- `seasons` (id, starts_at, ends_at, status, rules_version)
- `ratings` (character_id, season_id, rating, deviation, matches, updated_at)
- `leaderboard_entries` (season_id, board, character_id, score, rank, updated_at)
- `leaderboard_snapshots` (season_id, captured_at, payload/object key)
- `rating_events` (match_id, character_id, before, after, reason)

### 5.6 Open decisions

- Board set at launch (rating only vs rating + wins).
- Season length, reset policy, and rewards.
- Tie ordering and minimum-match eligibility.
- Public visibility/opt-out and display-name policy.
- Whether PvE or learning boards ever become public.

---

## 6. Guilds

### 6.1 Scope options

| Option | Features | Risk | Recommendation |
| :--- | :--- | :--- | :--- |
| **Lightweight** | Name/tag, description, emblem, roster, roles, join/invite, guild leaderboard | Low | Launch first |
| **Social** | Lightweight + chat/announcements | Medium–high (moderation) | Only after moderation tooling |
| **Full** | Social + shared bank, perks, guild quests, guild wars | High (economy fraud, balance, operations) | Much later, if ever |

Recommendation to evaluate: **lightweight guilds first**. No shared bank or currency in v1; guild
progression should be cosmetic or convenience-only so it cannot distort PvP balance. Shared
inventory is a classic duplication/fraud surface and should wait for a mature server economy and
audit trail.

### 6.2 Membership and roles

- Roles: Leader, Officer, Member (optionally Recruiter).
- Join modes: open, request approval, invite-only.
- Size cap (e.g. 20–50; initial value configurable).
- One guild per character per season (or per account; decide).
- Invitations expire; join requests are rate-limited.
- Leader inactivity transfer after a configured period; disband requires confirmation and a
  cooldown.
- Guild name/tag uniqueness, length limits, profanity filter, rename cooldown, and report path.

### 6.3 Guild progression (v1)

Options:

- Guild level from member ranked matches (cosmetic badge/emblem unlocks only).
- Guild leaderboard standing (average rating or total wins with minimum participation).
- Guild quests later, using existing quest primitives, but no shared rewards until economy audit.

Avoid guild perks that grant combat stats, extra question time, or matchmaking advantages; those
would reintroduce the stat disparity the reverse-difficulty rule exists to offset.

### 6.4 Guild operations

- Create (server-validated cost or free; decide), edit, invite, accept, kick, promote, transfer,
  leave, disband.
- Audit every membership/role change with actor, target, timestamp, reason.
- Read-only cache in the client; all mutations require online state.
- Moderation actions can rename/remove a guild name or freeze a guild during an investigation.
- If chat is added later, it needs its own retention, reporting, mute, and escalation policy
  (Section 9).

### 6.5 Data model (conceptual)

- `guilds` (id, name, tag, description, emblem, created_at, status, leader_character_id)
- `guild_members` (guild_id, character_id, role, joined_at, contribution)
- `guild_invites` (guild_id, character_id, invited_by, expires_at, status)
- `guild_join_requests` (guild_id, character_id, status, created_at)
- `guild_audit` (guild_id, actor, action, target, timestamp, metadata)
- `guild_leaderboard` (season_id, guild_id, score, rank)

### 6.6 Open decisions

- Launch scope (lightweight vs social).
- Size cap, creation cost, and one-guild-per-account vs per-character.
- Guild progression and whether any rewards are non-cosmetic.
- Chat: none, preset messages, or moderated text.
- Guild-vs-guild play and scheduling (future).
- Name policy, uniqueness, and rename rules.

---

## 7. Tournaments

### 7.1 Formats

| Format | Description | Strengths | Weaknesses |
| :--- | :--- | :--- | :--- |
| Single elimination | 8/16/32 players, lose once and out | Simple, dramatic, short | High variance; early exits feel harsh |
| Swiss | Fixed rounds, pair by score | Fairer; more matches per player | More complex pairing and operations |
| Round robin | Everyone plays everyone | Maximally fair for small fields | O(n²) matches; slow |
| Seasonal ladder | Continuous ranked queue with postseason | No scheduling; always available | Not a discrete “event” |
| Gauntlet/qualifier | Open qualifiers feeding a bracket | Inclusive | Multi-stage operations |

Recommendation to evaluate: **asynchronous single-elimination, 8 or 16 players**, for the first
event; add Swiss if participation justifies it. Asynchronous round windows avoid real-time
scheduling and timezone pressure, and fit the turn-based question format.

### 7.2 Registration and seeding

- Eligibility: authenticated, server-validated character, minimum matches/rating or open
  qualifier; account standing in good order.
- Capacity and waitlist; registration window; withdrawal deadline.
- Seed by rating (or qualifier result); byes for non-power-of-two fields.
- Entry fee (optional) and prize pool (optional) require the server currency ledger and an approved
  economy policy; no fee/prize in the first event unless the ledger is ready.
- Publish rules, format, schedule, tie policy, disconnect policy, and prize terms before
  registration opens.

### 7.3 Structure and scheduling

- Bracket generated deterministically from seeds; published; admin override requires audit.
- Round windows with open/close timestamps; both participants must play within the window.
- No-show at window close = forfeit; this is the asynchronous analogue of the approved disconnect
  policy. The 45-second reconnect window applies only to live matches.
- Reminders/notifications before a window closes (email/push open decision).
- Results come only from validated match records; manual result entry is a moderator action with
  evidence and audit.
- Disputes go to the moderation case system; a frozen bracket slot waits for resolution.

### 7.4 Prizes and standings

- Cosmetic titles, badges, emblems, and guild trophies are the low-risk default.
- Currency prizes require a server-validated ledger, anti-collusion review, and tax/legal review if
  real value is involved.
- Power-granting items should be avoided in competitive prizes; if used, disclose before entry.
- Standings must be reproducible from match records; ties use the approved tournament tie policy.

### 7.5 Data model (conceptual)

- `tournaments` (id, name, format, status, registration window, rules_version, prize_policy)
- `tournament_participants` (tournament_id, character_id, seed, status, checked_in)
- `tournament_rounds` (tournament_id, round_number, opens_at, closes_at, status)
- `tournament_matches` (tournament_id, round_id, match_id, participant_a, participant_b, winner)
- `tournament_prizes` (tournament_id, place, reward_type, amount/item, status)
- `tournament_audit` (actor, action, target, timestamp, metadata)

### 7.6 Open decisions

- First format and field size.
- Asynchronous windows vs live scheduled events.
- Entry fee and prizes (none, cosmetic, currency).
- Seeding and qualifier rules.
- No-show/forfeit and dispute deadlines.
- Whether guild tournaments exist in the first event.

---

## 8. Match History

### 8.1 What to record

The authoritative match record from §3.4. For player-facing history, add:

- mode, season, rules version, content version
- opponent display-name snapshot and pre/post rating
- result, score, rounds won/lost
- per-round own question id/topic/tier/difficulty, own answer, correctness, time used
- disconnect/forfeit reason (if any)
- rating delta and leaderboard impact

Do **not** expose the opponent's question text, answer keys, or private account data in the
player-facing view. A post-match review may show the player's own questions and explanations after
the match, subject to content-spoiler policy.

### 8.2 Views

| View | Access | Contents |
| :--- | :--- | :--- |
| Own history | Authenticated player | Full own-side record, paginated and filterable |
| Opponent summary | Both participants | Result, score, names, rating delta; no opponent answer details |
| Public profile | Opt-in / policy | Aggregate record and leaderboard rank; no per-match answers |
| Moderator/support | Server RBAC + case link | Full match log, questions, timestamps, disconnect evidence |
| Admin/audit | Restricted role | Full record plus configuration/version metadata |

### 8.3 Persistence and retention

- Server stores immutable match records for ranked/online play.
- Local IndexedDB stores offline practice history only, clearly labeled unranked; it is never
  uploaded as ranked evidence.
- Retention: align with the approved PvP decision (active season plus one full season for dispute
  review); final duration and deletion procedure require the Phase 30.2 privacy review.
- Player export/delete: export should include own history; delete should remove or anonymize
  personal data while preserving aggregate integrity records where legally permitted (open
  decision).
- Display-name snapshots preserve history after a rename; account ids are internal.

### 8.4 API sketch (no implementation)

- `GET /me/matches?mode=&season=&cursor=` — own history
- `GET /matches/{id}` — own-side match detail or moderator view by permission
- `GET /characters/{id}/summary` — public aggregate, policy-controlled
- `POST /matches/{id}/report` — creates a moderation case (Section 9)

Pagination by cursor, bounded page size, rate limits, and no bulk export endpoint beyond the
player's own data.

### 8.5 Open decisions

- Whether opponents can see each other's question topics after a match.
- Public profile default (private vs public).
- Retention duration and deletion/anonymization policy.
- Whether offline practice history is ever shown in the same UI as ranked history.
- Export format and scope.

---

## 9. Moderation and Reporting

### 9.1 Report categories

- Cheating/exploiting (answer injection, timer manipulation, result forgery)
- Win trading/collusion/rating manipulation
- Harassment or abusive display name/guild name
- Chat abuse (if chat exists)
- Griefing/intentional disconnect/queue dodging
- Inappropriate guild content
- Other (free text with limits)

### 9.2 Report flow

1. Player submits a report from match history, profile, guild, or chat; rate-limited and
   deduplicated per reporter/target/context.
2. Server creates a case with category, severity, reporter (protected), target, and linked
   evidence.
3. Triage queue assigns priority; automated signals attach context but do not decide.
4. Moderator reviews evidence (match log, chat, account history, prior cases).
5. Action or dismissal is recorded with a reason and audit entry.
6. Subject is notified where policy allows; appeal window opens.
7. Appeal is reviewed by a different moderator when possible; outcome is audited.
8. Metrics feed policy review, not automatic punishment.

### 9.3 Case states

`Open → Triaged → Investigating → Actioned | Dismissed → Appealed → Upheld | Overturned`

A case can be linked to multiple reports and multiple matches. Duplicate reports merge into one
case to prevent pile-on and reporter farming.

### 9.4 Actions

- Warning (account-visible)
- Content removal/rename (guild/display name)
- Chat mute (if chat exists)
- Ranked suspension (temporary; rating protected or adjusted per policy)
- Rating rollback/leaderboard removal for confirmed manipulation
- Account suspension/ban (serious or repeat cases)
- Guild freeze/disband (rare; requires senior approval)

Penalty ladder, durations, and appeal windows are policy decisions. Automated bans from heuristics
are explicitly out of scope; automation may only queue for review or apply low-risk rate limits.

### 9.5 Roles and authorization

- Player/support: submit reports, view own case status.
- Moderator: triage and action cases within policy.
- Senior moderator/admin: bans, rating rollbacks, guild dissolution, policy changes.
- Auditor: read-only access to cases and audit logs.
- Server-side RBAC only. The existing local `VITE_ADMIN_PASSCODE_HASH` gate is not authorization
  and must never unlock online moderation actions.

### 9.6 Evidence, privacy, and minors

- Collect the minimum evidence needed: match ids, timestamps, answer/result records, chat messages
  (if any), and account standing.
- Restrict access by role and log every view of sensitive evidence.
- Retention: case evidence expires per policy; legal holds are explicit and audited.
- If minors use the service, review parental consent, data minimization, and reporting obligations
  before launch (Phase 30.2 privacy review).
- Public shaming, doxxing, and unredacted evidence are prohibited.

### 9.7 Staffing and service levels

Moderation is the dominant operational cost at scale. Define:

- Triage SLA (e.g. 72 hours for standard, 24 hours for urgent safety cases).
- Appeal SLA.
- Coverage hours and escalation path.
- Moderator training, tooling, and quality review.
- Metrics: reports per 1k matches, upheld rate, time to triage, appeal overturn rate, repeat
  offenders, moderator caseload.

### 9.8 Data model (conceptual)

- `reports` (id, reporter_account_id, target_account_id, category, context_type, context_id,
  status, created_at)
- `moderation_cases` (id, category, severity, state, assignee, created_at, closed_at)
- `moderation_evidence` (case_id, type, reference_id, metadata)
- `moderation_actions` (case_id, action, duration, reason, actor, created_at)
- `moderation_appeals` (case_id, appellant, state, reviewer, outcome, created_at)
- `moderation_audit` (actor, action, case_id, timestamp, metadata)

### 9.9 Open decisions

- Whether chat exists at launch (drives a large share of moderation cost).
- Penalty ladder, durations, and appeal window.
- Public visibility of bans/suspensions.
- Rating rollback policy for confirmed win trading.
- Staffing model (in-house, outsourced, community-assisted with strict limits).
- Minors/consent policy.

---

## 10. Backend Services and Architecture

### 10.1 Service map

| Service | Responsibility | Build vs managed | Scaling driver |
| :--- | :--- | :--- | :--- |
| Identity/auth/session | Accounts, credentials, sessions, recovery | Managed identity or custom | Logins, sessions |
| API gateway | TLS termination, routing, rate limits, schema validation | Managed | Requests/sec |
| Matchmaking | Queue tickets, proposals, accept/decline | Custom | Concurrent queued players |
| Match Orchestrator | Round lifecycle, deadlines, validation, result | Custom | Active matches, answer rate |
| Realtime/push | Round state, presence, notifications | Managed realtime or WebSocket | Concurrent connections, messages |
| Leaderboard | Rating projections, sorted ranks, snapshots | Custom + cache/sorted sets | Reads, match completions |
| Tournament | Registration, brackets, scheduling, prizes | Custom | Events, participants |
| Guild | Membership, roles, invites, audit | Custom | Guild operations |
| Chat (optional) | Messages, retention, reporting hooks | Managed or custom | Messages/sec, moderation load |
| Moderation | Reports, cases, actions, appeals, audit | Custom + admin console | Reports/day, evidence size |
| Notification | Email/push for matches, tournaments, appeals | Managed | Sends/day |
| Content/question | Ranked question bank, versions, projections | Custom | Fetches/matches |
| Analytics | Product and integrity metrics | Managed pipeline | Events/day |
| Relational database | Accounts, characters, matches, guilds, cases | Managed | Writes/day, storage |
| Cache/sorted sets | Leaderboards, sessions, queues | Managed | Ops/sec, memory |
| Queue/jobs | Rating updates, snapshots, notifications, cleanup | Managed or custom | Job backlog |
| Object storage/CDN | Question media, snapshots, exports | Managed | Storage, egress |
| Observability | Logs, metrics, traces, alerts | Managed | Ingest volume, retention |
| Backups | Database/object backups, restore drills | Managed | Storage, RPO/RTO |
| Admin console | Support/moderation/content operations | Custom | Staff users |

No provider, framework, or vendor is selected. The architecture should remain portable: standard
HTTPS APIs, a relational source of truth, cache for hot reads, and asynchronous jobs for projections.

### 10.2 Request flow (ranked duel)

1. Client authenticates and requests a queue ticket.
2. Matchmaking service validates eligibility/content and enqueues.
3. Match found → Match Orchestrator creates match and assigns questions.
4. Clients receive projections (no answer keys) over the realtime channel.
5. Answers are submitted with idempotency keys and server-validated.
6. Rounds resolve on both answers or deadlines.
7. Match completes → result stored → rating/leaderboard/quest updates in a transaction or
   outbox-driven workflow.
8. Match history and moderation reference the stored record.

### 10.3 Transaction boundaries

- One answer submission = one transaction covering validation, round state, and answer record.
- Match completion = one transaction for result + rating + leaderboard outbox event.
- Guild membership changes = one transaction for roster + audit.
- Tournament result = one transaction for match link + bracket advance + audit.
- Use an outbox for notifications, snapshots, and analytics so a downstream outage does not block
  gameplay.

### 10.4 Environments and operations

- Development, staging, production; seeded test accounts and question banks.
- Database migrations versioned and reversible; backups tested.
- Feature flags for each online feature; kill switches for matchmaking, chat, and tournaments.
- Load tests for queue spikes and tournament start times.
- Runbooks for stuck matches, rating discrepancies, mass reports, and provider outages.
- Data residency/regional hosting is an open decision if the audience is global.

---

## 11. High-Level Operating Costs

These are planning ranges, not quotes. Actual cost depends on provider, region, traffic,
retention, and staffing. Currency: USD.

### 11.1 Assumptions

| Assumption | Small | Medium | Large |
| :--- | :--- | :--- | :--- |
| Monthly active players | 1,000 | 10,000 | 100,000 |
| Daily active share | 20% | 20% | 20% |
| Ranked matches per DAU/day | 2 | 3 | 4 |
| Answers per match | 6 (2 players × 3 rounds) | 6 | 6 |
| Chat messages per DAU/day (if chat exists) | 0 | 20 | 30 |
| Match-record retention | Season + 1 | Season + 1 | Season + 1 |

At 10k MAU this is roughly 6,000 matches/day, 36,000 answer submissions/day, and about 1.1M
answers/month. These volumes are small for a managed relational database and cache; the operational
challenge is correctness, moderation, and support, not raw throughput.

### 11.2 Infrastructure drivers

| Driver | What scales it | Cost control |
| :--- | :--- | :--- |
| Compute (API, matchmaking, orchestrator) | Active matches, requests/sec | Autoscaling, scale-to-zero at low traffic, efficient round logic |
| Relational database | Writes per answer/match, storage, backups | Indexing, batching, retention, read replicas only when needed |
| Cache/sorted sets | Concurrent queues, leaderboard reads | TTLs, snapshot caching, bounded top-N |
| Realtime connections | Concurrent players in matches | Regional edges, connection limits, push instead of polling |
| Bandwidth/CDN | Question/media payloads, snapshots | Compression, caching, small projections, no full-bank downloads |
| Object storage | Match logs, exports, media, backups | Retention tiers, compression, lifecycle rules |
| Logs/metrics | Request and audit volume | Sampling, retention limits, structured logs |
| Notifications | Tournament reminders, appeals | Batching, opt-in, email/push quotas |
| Moderation tooling | Reports/day, evidence size | Self-service status, deduplication, good triage UI |
| Human moderation/support | Reports, appeals, disputes, chat | Clear policy, tooling, community limits, staffing plan |

### 11.3 Illustrative monthly ranges

| Scale | Infrastructure | Human moderation/support | Notes |
| :--- | :--- | :--- | :--- |
| Small (1k MAU) | ~$50–300 | ~$0–750 | Low traffic; founder/part-time moderation may suffice |
| Medium (10k MAU) | ~$300–1,500 | ~$1,000–5,000 | Part-time moderation; chat materially increases hours |
| Large (100k MAU) | ~$2,000–10,000 | ~$10,000–40,000+ | Dedicated moderation, appeals, on-call, compliance |

These ranges exclude one-time development, security review, legal/privacy review, content
licensing, design, QA, and marketing. They also exclude payment processing and any real-money
prizes. At small scale, infrastructure is usually minor; at large scale, **human moderation and
support dominate**. Adding chat or guild banks moves a project toward the high end.

### 11.4 One-time and periodic costs

- Backend implementation and integration (largest engineering cost).
- Security review and penetration testing before ranked launch.
- Privacy/legal review (minors, data retention, export/delete, terms).
- Question-content licensing and moderation for ranked pools.
- Moderation tooling/admin console.
- Load testing and incident readiness.
- Seasonal content, rewards, and tournament operations.
- Customer support tooling and training.
- Insurance/compliance if real-money prizes or minors are involved (legal review required).

### 11.5 Cost controls

- Launch one mode and one region; expand only after retention and cost data.
- Keep ranked question payloads small and cached; never ship the full bank.
- Use asynchronous tournament windows instead of always-on realtime events.
- Delay chat and guild banks; they add moderation and fraud cost disproportionate to engagement.
- Sample analytics; retain aggregates longer than raw events.
- Automate triage and evidence collection, but keep humans deciding sanctions.
- Set per-account rate limits and queue caps to bound abuse-driven cost.

---

## 12. Security, Privacy, and Anti-Abuse

### 12.1 Trust boundaries

- Server owns identity, characters, questions, answers, timing, results, ratings, leaderboards,
  guild membership, tournament brackets, and moderation actions.
- Client sends intents only: queue request, answer submission, guild action, report, etc.
- Client-side results are display-only; offline results are unranked.
- Admin/moderation actions use server-side RBAC, not the local passcode gate.

### 12.2 Threats and mitigations

| Threat | Mitigation |
| :--- | :--- |
| Queue manipulation/sniping | Server-side queue state, hidden opponent identity until matched, rate limits, repeat-opponent penalties |
| Win trading/collusion | Match history analysis, rating anomaly detection, human review, rating rollback |
| Alt accounts/smurfing | Account linkage signals, eligibility rules, anomaly review; no automatic ban without policy |
| Result forgery | Server-computed results only; client cannot submit a winner |
| Leaderboard scraping | Bounded public endpoints, pagination, rate limits, no bulk export |
| Guild name/chat abuse | Name policy, filters, reporting, rename/removal actions, audit |
| Report brigading/false reports | Deduplication, reporter rate limits, case merging, abuse review |
| Tournament bracket manipulation | Deterministic seeding, published brackets, audited admin overrides |
| Disconnect abuse | Approved disconnect policy, repeated-disconnect tracking, queue cooldowns |
| Account takeover | Session revocation, device/session listing, login rate limits (Phase 30.2) |
| Data exposure in match history | Own-side visibility, redaction, role-based access, retention limits |

### 12.3 Privacy

- Minimize personal data: account id, display name, character stats, match records; no email in
  public projections.
- Publish a retention schedule for matches, reports, chat, and analytics.
- Provide export/delete paths for player data; preserve only what is legally/operationally required.
- Public leaderboards expose display name and performance, not learning analytics or contact data.
- Review minors’ data and consent requirements before any public social feature.
- Log access to moderation evidence; restrict bulk queries.

### 12.4 Anti-abuse metrics

- Reports per 1,000 matches; upheld rate; time to triage; appeal overturn rate.
- Rating anomalies: sudden jumps, repeated pairings, unusual accuracy/latency, disconnect patterns.
- Queue anomalies: mass declines, coordinated queue timing, region hopping.
- Guild anomalies: rapid membership churn, name-change evasion, report clusters.
- Tournament anomalies: no-show patterns, repeated opponent collusion, prize concentration.

---

## 13. Staged Implementation Plan and Approval Gates

Each stage requires explicit approval, a budget, and a security/privacy check where relevant.

| Stage | Scope | Backend? | Risk | Prerequisite |
| :--- | :--- | :--- | :--- | :--- |
| **0** | Offline headless cores: matchmaking queue types/algorithm, tournament bracket generator, leaderboard ranking model, match-record schema — pure TypeScript + tests, no network | No | Low | This proposal; **implemented 2026-11-09** |
| **1** | Accounts, sessions, cloud save sync | Yes | Medium | Phase 30.1–30.3 approval |
| **2** | Server-validated PvE runs and PvE leaderboards | Yes | Medium | Stage 1; server question/reward authority |
| **3** | Ranked PvP duels: matchmaking, rating, match history, reports | Yes | High | Stage 1; approved PvP rules; moderation basics |
| **4** | Tournaments (async single elimination first) | Yes | High | Stage 3; bracket service; dispute workflow |
| **5** | Lightweight guilds + guild leaderboard | Yes | Medium–high | Stage 3; name policy; audit |
| **6** | Chat, guild banks, guild wars, advanced moderation | Yes | Very high | Stage 5; staffing, fraud controls, privacy review |

Stage 0 is the only stage that does not require a provider or backend decision. It can produce
reusable, tested domain models without touching offline gameplay. It must not be wired into the UI
until a later stage is approved.

### 13.1 Stage 0 definition and implementation record (implemented 2026-11-09)

- `MatchmakingQueue` with injectable clock/rating comparator, deterministic tests for pairing,
  timeout, cancel, and repeat-opponent avoidance.
- `TournamentBracket` generator/advancer for 8/16 fields with byes, deterministic seeding, and
  no-show handling as a pure state machine.
- `LeaderboardRanking` model for sorting, ties, and seasonal snapshots (in-memory; no storage).
- Shared `MatchRecord` types aligned with §3.4.
- No `fetch`, WebSocket, database, or external dependency; no UI integration; no changes to
  existing arena behavior.

Implemented files:

| File | Contents |
| :--- | :--- |
| `src/arena/online/MatchRecord.ts` | Schema v1, match/mode/status/participant/round types, `isTerminalMatchStatus` |
| `src/arena/online/MatchmakingQueue.ts` | Ticket/pair model, expanding rating window, region/subject wildcards, level-gap limit, repeat-opponent cooldown, deterministic pairing |
| `src/arena/online/TournamentBracket.ts` | 2–128 fields, next-power-of-two size, standard seed order, byes, advancement, forfeit/no-show, snapshots |
| `src/arena/online/LeaderboardRanking.ts` | Descending ranking, `shared`/`earliest`/`matches-played` tie policies, minimum matches, top-N with cutoff-tie extension, seasonal snapshots |
| `src/arena/online/index.ts` | Barrel for the four modules |
| `src/arena/index.ts` | Adds `export * from './online'` |

Tests:

| File | Tests |
| :--- | :--- |
| `tests/arena/online/matchmakingQueue.test.ts` | 12 |
| `tests/arena/online/tournamentBracket.test.ts` | 10 |
| `tests/arena/online/leaderboardRanking.test.ts` | 12 |
| `tests/arena/online/matchRecord.test.ts` | 3 |

Verification: 37 new tests pass; full suite 1,244 tests in 92 files; `tsc --noEmit` clean;
production build succeeds. The models are not imported by any scene or UI; they are dormant,
tested cores for a later approved stage.

---

## 14. Reuse, Redesign, and Deprecate

| Surface | Disposition |
| :--- | :--- |
| `ArenaTypes.ArenaMatchMode` | **Reuse**; add online/tournament modes only when implemented |
| `ArenaCompetitor` | **Extend** for server-issued identity/rating; no client-supplied stats in ranked |
| `PvPDifficultyEngine` | **Reuse** as the rules layer; server recomputes authoritative profiles |
| `ArenaDuelSession` | **Keep** as offline practice; ranked becomes a server-driven client receiver |
| `ArenaRivals` / AI simulation | **Keep** for unranked practice; no ranked bots |
| `ArenaModal` | **Extend** with queue/history/report entry points in later stages |
| `ChallengeArenaSession` | **Reuse** for PvE challenge scoreboards; not a tournament engine |
| `ChallengeProgressTracker` | **Persist** when save wiring is approved; not a leaderboard source |
| `AnalyticsTypes` | **Reuse** for local learning insights; server integrity events are separate |
| IndexedDB storage | **Keep** as offline cache/local authority; server is authoritative online |
| `RoleManager` / local admin gate | **Keep** for local UI; **not** authorization for online moderation |
| Economy/currency services | **Reuse** rules server-side; entry fees/prizes need a server ledger and audit |
| `docs/PVP_RULES_PROPOSAL.md` | **Authoritative** for match rules; this proposal only adds features around it |
| Guilds/chat/moderation | **New modules**; no existing implementation |

---

## 15. Open Decisions Requiring Approval

1. **First server-backed stage**: Stage 1 (accounts/cloud save), Stage 2 (validated PvE), or
   Stage 3 (ranked PvP). Stage 0 offline cores are already implemented and dormant.
2. **Provider/hosting/stack**: managed vs custom; relational database, cache, realtime, storage.
3. **Transport**: HTTPS polling, WebSocket, or managed realtime for matches/presence.
4. **Rating system**: Elo, Glicko-2, or points ladder; starting rating and K-factor.
5. **Season model**: length, soft/hard reset, placement matches, rewards, inactivity handling.
6. **Matchmaking**: rating-only vs rating+level vs quality score; hard constraints; region model.
7. **Leaderboards**: launch boards, visibility/opt-out, tie ordering, minimum matches, rewards.
8. **Guilds**: lightweight vs social vs full; size cap; creation cost; one guild per account or
   character; chat policy; any non-cosmetic rewards.
9. **Tournaments**: format, field size, async windows vs live, entry fee, prizes, seeding.
10. **Match history**: public/private default, opponent visibility, retention, export/delete.
11. **Moderation**: staffing model, triage/appeal SLAs, penalty ladder, rating rollback policy.
12. **Chat**: none, preset, or moderated text; if text, retention and reporting rules.
13. **Minors/privacy**: consent, data retention, export/delete, public profile policy.
14. **Operational budget**: approved monthly infrastructure and moderation budget per scale.
15. **Offline/ranked policy**: confirm offline results never enter leaderboards, tournaments, or
    guild standings (default: never).

Until these are approved, no online feature is implemented.

---

## 16. Non-Goals

- No networking, server, database, queue, chat, email, payment, or external service in this phase.
- No provider, framework, or hosting vendor selection.
- No server-backed implementation of matchmaking, leaderboards, guilds, tournaments, history, or
  moderation. Stage 0 provides offline headless models only; they are not wired to the UI or saves.
- No change to offline gameplay, saves, questions, rewards, or balance.
- No final rating, matchmaking, leaderboard, or tournament formulas.
- No chat or guild bank before moderation and economy controls exist.
- No automatic bans or sanctions from heuristics.
- No offline result import into ranked systems.

---

## 17. Acceptance Criteria for Future Implementation

A later stage may be considered complete only when:

1. The approved stage has a written scope, budget, and explicit approval.
2. Every ranked result is produced and stored by the server; client results are display-only.
3. Matchmaking meets published queue-time and match-quality targets under load tests.
4. Leaderboards update from validated match records and can be recomputed after corrections.
5. Match history is immutable, paginated, access-controlled, and retention-compliant.
6. Reports create cases; moderation actions and appeals are audited; staff access is role-based.
7. Guild/tournament operations are transactional and audited; name/content policies are enforced.
8. Offline play and local saves are unaffected; offline results remain unranked.
9. Security/privacy review is complete; export/delete and minors’ policy are documented.
10. Operational dashboards, alerts, backups, and runbooks exist for the new services.
11. The test/typecheck/build gate passes for client code; server tests and migrations are included
    in the approved project.
12. The implementation report lists every file and service changed.

---

## 18. Summary

The game has a clean offline arena foundation — reverse-difficulty rules, an AI sparring session,
a single-player Challenge Arena, content-free analytics, and a tested local save stack — but none
of the online primitives: identity, rating, queues, match records, guilds, tournaments, moderation,
or networking. This proposal defines those features around a shared match record and rating/season
model, recommends lightweight guilds and asynchronous tournaments first, treats moderation as the
dominant long-term operating cost, and stages implementation so the only immediately safe work is a
pure TypeScript Stage 0 with no network. No provider, backend, dependency, or network code was
added.

Phase 30.5 is complete as a design proposal, and Stage 0's offline headless cores (matchmaking
queue, tournament bracket, leaderboard ranking, match-record schema) are implemented and tested.
Later stages require approval of a specific stage and budget.
