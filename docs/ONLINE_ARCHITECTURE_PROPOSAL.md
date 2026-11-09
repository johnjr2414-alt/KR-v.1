# Online Architecture Proposal — Server-Authoritative Boundaries (Phase 30.1)

**Date**: 2026-11-09  
**Phase**: 30.1 (design only)  
**Status**: Proposal — **no implementation, no server dependencies, no backend selected**

## 1. Purpose and guardrails

This document identifies which systems in Knowledge Realms would need server authority if the
game became online, where the current offline design can be reused, and where it must be
redesigned. It is an architecture review only.

Guardrails for this phase and every follow-up:

- **No online multiplayer is implemented** without explicit user approval of a separate project.
- **No server dependency is added**, no provider is selected, and no backend is deployed.
- **Offline play remains the default and must keep working** if the network is unavailable.
- The client is trusted for presentation and input intents only; it is not trusted for
  progression, economy, answers, rewards, or match outcomes.
- Authentication must never verify passwords in the client; passwords must never be stored in
  plaintext (detailed in Phase 30.2).
- Educational question content keeps its authored language and factual meaning; UI localization
  stays separate and must not machine-translate questions.

## 2. Current offline architecture (as inspected)

The game is a single-player, offline-first Phaser client. There is **no network layer**: a
repository-wide search for `fetch`, `XMLHttpRequest`, `WebSocket`, and `sendBeacon` returns no
gameplay usage. Every rule executes in the browser, and the only persistent authority is the
player's IndexedDB save.

| System | Current authority | Evidence |
| --- | --- | --- |
| Identity | None. A local display name plus a single local profile. | `PlayerSessionManager.initializeSession(defaultName)` |
| Character stats/level | `PlayerData` in the client; level-ups and stat allocation mutate it locally. | `src/player/PlayerSessionManager.ts`, `src/core/progression/` |
| Save persistence | IndexedDB via `StorageService`; snapshot built from live client managers. | `PlayerSessionManager.createSnapshot()`, `src/storage/StorageTypes.ts` |
| Inventory/equipment | `InventoryManager` mutates local state; equipment/enhancement rules run locally. | `src/inventory/InventoryManager.ts`, `EnhancementService.ts` |
| Currency/economy | `CurrencyService` (gold) plus `ShopService`, `BankService`, assignment rewards. | `src/economy/CurrencyService.ts` |
| Questions | Bundled JSON + local IndexedDB authoring store; the full `Question` (including `correctAnswer`, `acceptedAnswers`, `explanation`) is sent into battle. | `src/questions/retrieval/QuestionRepository.ts`, `src/core/types/question.ts` |
| Answer correctness | `AnswerEvaluator` runs in the client on the full question object. | `src/questions/evaluation/AnswerEvaluator.ts` |
| PvE combat | `BattleSession` state machine runs all damage, skills, HP/MP, mastery, drops locally. | `src/combat/BattleSession.ts`, `DamageCalculator.ts` |
| Rewards | `RewardCalculator.calculateRewards()` rolls gold/drops with `Math.random` in the client, then local listeners apply quest/achievement progress. | `src/combat/rewards/RewardCalculator.ts` |
| Mastery | `MasteryManager.processAnswerAttempt()` runs on the client result. | `BattleSession` answer path |
| Quests/achievements | `QuestManager` and achievement trackers mutate local save state and grant item rewards. | `src/quests/QuestManager.ts`, `src/achievements/` |
| PvP arena | `ArenaDuelSession` accepts a client boolean `playerCorrect` and simulates the rival with `Math.random`. There is no real matchmaking or opponent transport. | `src/arena/ArenaDuelSession.ts` |
| Challenge arena | `ChallengeArenaSession` scores stages against a client clock and local player level. | `src/arena/challenge/ChallengeArenaSession.ts` |
| Learning analytics | An `AnswerAttemptEvent` snapshot is built and stored inside the client save. | `src/analytics/LearningAnalytics.ts`, `StorageTypes.analytics` |
| Admin/roles | Local passcode/acknowledgement gate and local role state; explicitly not a security boundary. | `src/core/roles/AdminAccessService.ts`, `config/adminAccessConfig.ts` |
| IDs | `createUniqueId()` falls back to timestamp/random outside secure contexts. | `src/core/uniqueId.ts` |
| Updates/offline | Prompt-mode service worker precaches the whole app; saves and questions live in IndexedDB. | `src/pwa/pwaConfig.ts`, `src/pwa/registerServiceWorker.ts` |

**Consequence:** today a modified client or DevTools can change gold, items, levels, answers,
reward rolls, and PvP results. That is acceptable for a single-player offline game and must be
treated as untrusted input the moment any shared, ranked, or economic state exists.

## 3. Target authority model

| Concern | Server authority | Client responsibility |
| --- | --- | --- |
| Identity and sessions | Account identity, session issuance, revocation, role checks | Store tokens securely; present login UI |
| Character ownership | Owns characters and which account may use them | Select a character; send intents referencing it |
| Progression | Level, EXP, stats, stat points, mastery, achievements | Display; request an allocation |
| Inventory/currency | Item stacks, equipment, enhancement results, gold ledger | Display; request purchase/equip/enhance |
| Questions | Pool membership, selection, correct answers, explanations | Render a projection; collect an answer |
| Combat outcome | Turn order, correctness, damage, skills, HP/MP, victory | Send answer/skill intents; animate results |
| Rewards | EXP/gold/drops/quest credit, granted once | Show the applied delta |
| PvP | Matchmaking, rounds, timing, scoring, forfeits | Send answers; render match state |
| Persistence | Authoritative database, versions, migrations | Local read cache and offline mode |
| Admin/content | Server roles, authoring audit trail | Authoring UI, subject to server checks |

**Core rule:** the client may say *what the player wants to do*; the server decides *what
happened*. Every state-changing request is validated, versioned, idempotent, and logged.

## 4. Required design areas

### 4.1 Player identity

**Current:** no identity beyond a local display name; the save is the player.

**Proposal:**

- Keep a **guest/local mode** that requires no account and remains offline-only/unranked.
- Introduce an optional account with a server-generated `accountId`. Authentication details are
  Phase 30.2; at the boundary level, the server issues short-lived access credentials and a
  revocable session, and never trusts a client-asserted account or role.
- Separate **account**, **character**, and **session** identifiers. The client may choose a
  character only from those the account owns.
- Link a guest save through an explicit, user-confirmed one-time import (Section 8), never by
  silently uploading local data.
- Admin capability is a server-side role, not the local passcode gate. The existing
  `AdminAccessService` remains a local deterrent for offline tooling and is **not** accepted as
  authorization online.

**Risks:** account sharing, credential stuffing (rate limiting and lockouts in 4.11/30.2),
privacy of learner data, and guest-to-account merge conflicts.

### 4.2 Character ownership

**Current:** one local `PlayerData` object is mutated in place by dozens of systems.

**Proposal:**

- Server stores characters with `accountId`, slot, name, class, level/EXP, allocated stats, and a
  monotonically increasing `stateVersion`.
- The client receives a **projection** (display-ready character state). All mutations arrive as
  intents with the expected `stateVersion`:
  - `AllocateStat { characterId, stat, points, stateVersion }`
  - `EquipItem`, `UnequipItem`, `EnhanceItem`
  - `AcceptQuest`, `CompleteQuest`
- The server validates ownership, available points/level, item ownership, class rules, and
  quest prerequisites, then applies the change and returns the new projection plus version.
- Client-side `PlayerSessionManager` becomes a **projection store** for online characters. Its
  local save path remains for offline characters only.
- Name uniqueness/policy, character slots, and deletion are server concerns (deletion is soft
  with an audit record).

**Reuse:** stat allocation rules, level/EXP curves, equipment requirements, and quest rules are
already pure and can run unchanged server-side.

### 4.3 Inventory and currency authority

**Current:** `CurrencyService`, `InventoryManager`, `ShopService`, `BankService`, and
`EnhancementService` mutate in-memory client state and are snapshotted into IndexedDB. Shop
purchase adds the item before spending gold; there is no cross-store transaction.

**Proposal:**

- Server owns item stacks, equipment, enhancement levels, and a gold **ledger**. Balance is
  derived from or checked against ledger entries; every mutation has a unique `transactionId`
  and an idempotency key.
- All economy actions become server transactions that validate definitions and bounds and apply
  atomically:
  - buy/sell (server prices; client totals are never trusted),
  - bank deposit/withdraw/investment,
  - enhancement cost and result (deterministic, but applied only by the server),
  - quest/achievement/assignment rewards,
  - PvE/PvP reward grants.
- The client submits only intent (`shopId`, `itemId`, `quantity`, `expectedVersion`).
- Inventory operations must be atomic with currency: item grant and gold debit succeed or fail
  together. Enhancement must consume materials and gold exactly once.
- Response returns the new projection and a compact delta for animation. Duplicate requests
  return the original result (idempotent), not a second grant.
- Offline characters can keep the current local economy; their gold/items are never merged into
  ranked/online state without a validated import policy.

**Reuse:** the existing domain services are pure enough to run server-side, including
`CurrencyService`'s non-negative/integer guard, item registry, equipment stat calculation, and
enhancement math. They must be wrapped in server transactions and fed server-generated RNG.

### 4.4 Question selection and answer validation

**Current:** questions are loaded into the client from bundled data and IndexedDB; the battle
state holds full `Question` records, including `correctAnswer`, `acceptedAnswers`,
`expectedAnswer`, and `explanation`. `AnswerEvaluator` decides correctness in the browser.

**Proposal:**

- **Selection is server-side.** Reuse `DifficultyEngine`, `QuestionSelector` (without
  replacement, excluding recently seen IDs), and `QuestionRepository` as server-side services.
  The server resolves the PvE profile from server-known player/monster levels, samples the
  exact question set, and stores it on the battle record.
- **The client receives a projection**, not the question record:
  - `questionId` (opaque token), `prompt`, `type`, `choices[{choiceId, text}]` **without**
    whether a choice is correct, `timeLimitSeconds`, `subject`, `tier`.
  - No `correctAnswer`, `acceptedAnswers`, `expectedAnswer`, or `explanation` before the answer
    is accepted. Explanations may be returned in the answer response for learning value.
- **Validation is server-side.** The client submits
  `{ battleId, questionId, choiceId | text, clientElapsedMs }`. The server checks that the
  question belongs to that battle, has not been answered, the battle is active, the choice
  exists, and the answer arrived within the server-enforced limit (with a network grace
  window). It then runs the shared `AnswerEvaluator`/normalizers.
- **Timers:** the client timer is a UX hint. Ranked/online correctness and timeouts use server
  receive timestamps. Offline play keeps client timers because there is no shared stake.
- **Essay questions** are not fully auto-gradable today; exclude them from ranked/PvP scoring
  unless a server-side review workflow is added.
- **Question scraping:** do not expose bulk endpoints or correct answers; scope every question
  payload to an active battle; rate-limit fetches (4.11). Bundled data may still ship for
  offline mode, which is acceptable because offline play is unranked. If ranked integrity
  requires it, offline bundles may exclude competitive question sets.
- **Language:** questions are delivered as authored. The UI string table
  (`src/ui/strings.ts`) stays client-side and separate; no automatic translation of educational
  content.

**Reuse:** `DifficultyEngine`, `QuestionSelector`, `QuestionRepository`,
`AnswerEvaluator.normalizeAnswerText`, question schema/validation, and content standards.
**Redesign:** question DTOs, battle-level answer storage, admin authoring API, and any endpoint
that currently would expose full records.

### 4.5 Reward calculation

**Current:** `RewardCalculator.calculateRewards(monster, expMultiplier, randomRoller)` rolls
gold and drops in the client with `Math.random`; `emitMonsterDefeated` drives quest and
achievement progress locally. Mastery gains are also applied locally from client-evaluated
answers.

**Proposal:**

- Rewards are computed **server-side only**, from server-known monster definitions, the
  server-resolved battle result, and server RNG. The existing calculator is reusable because it
  already accepts an injected `randomRoller`.
- A reward grant is keyed by `battleId` (or PvP `matchId`) and applied exactly once inside the
  same transaction as EXP/gold/item changes, quest progress, achievements, and mastery.
- The client receives a summary of what was applied (`expEarned`, `goldEarned`, `droppedItems`,
  mastery deltas) and animates it; it never posts reward values back.
- Victory is required for PvE rewards; the defeat/escape paths grant nothing, matching the
  current `BattleSession`.
- Offline rewards remain local and must be marked unranked; no offline reward can be imported as
  ranked progress without server re-validation.

**Reuse:** `RewardCalculator`, drop tables, EXP multipliers, quest/achievement definitions.
**Redesign:** reward application (listener-based local mutation becomes a server transaction)
and the trust boundary for mastery/analytics inputs.

### 4.6 PvP combat resolution

**Current:** `ArenaDuelSession` is single-player "sparring" against an AI rival. `resolveRound`
accepts a client-provided boolean `playerAnsweredCorrect` and computes the rival's result with
`Math.random()` at fixed 0.8/0.6 thresholds. `PvPDifficultyEngine` applies the reverse-difficulty
rule. No opponent connection exists.

**Proposal:**

- Keep `PvPDifficultyEngine` and `ArenaTypes` as the rules layer: lower-level combatants receive
  harder questions and vice versa, with per-competitor profiles.
- Introduce a server **Match Orchestrator** that:
  1. creates a match with two authenticated participants (or an explicitly unranked AI
     opponent simulated server-side),
  2. selects each competitor's question projection per round,
  3. accepts one answer per competitor per round, validated like 4.4,
  4. resolves the round when both have answered or the round deadline expires,
  5. computes scores server-side, advances rounds, and finalizes the winner.
- The client never sends "I was correct". It sends the chosen answer; the server decides.
- For AI sparring, the rival is simulated **on the server** with server RNG if it grants
  rewards/rating; an entirely offline AI rival remains a practice mode with no ranked value.
- Round timing: server clock with a grace window for network latency; late answers are treated
  as unanswered. Disconnect/forfeit rules are in 4.10.
- Transport: request/response is sufficient for a turn-based asynchronous feel; a WebSocket (or
  similar push channel) is preferred for timely round state, opponent-presence, and match end.
  The transport choice is an open decision (Section 9).

**Reuse:** difficulty engine, question selection, archetypes/rival definitions, scoring input
validator. **Redesign:** `ArenaDuelSession` (becomes a thin client state receiver), matchmaking,
round timing, opponent transport, rating.

### 4.7 Anti-cheat boundaries

This is a protective design, not evasive tooling. The goal is integrity for shared/ranked state,
not client obfuscation.

| Threat | Boundary / response |
| --- | --- |
| Modified client grants gold/items/EXP | Server owns all balances and grants; client values are display only. |
| Reading answers from the payload | Answer keys never leave the server before an accepted answer; projections only. |
| Replaying an answer or reward request | Idempotency keys per battle/question and per grant; server rejects duplicates. |
| Tampered timers | Server receive time decides ranked timeouts; client timer is cosmetic. |
| Impossible accuracy/speed | Server-side anomaly signals (answer latency, session patterns, question difficulty) plus audit logs; review/limit, not automatic bans without policy. |
| Question scraping / bulk extraction | Battle-scoped payloads, no bulk endpoints, rate limits, optional exclusion of ranked sets from offline bundles. |
| Shared/compromised accounts | Session revocation, device/session listing, login rate limits (30.2). |
| Tampered local save | Online characters never accept a client save as authority; imports are validated and non-ranked by default. |
| Admin impersonation | Server-side RBAC; local passcode gate is not authorization. |

**Never trusted from the client:** correct answers, RNG, damage/reward math, HP/MP, currency,
inventory, level, mastery, match results, timers for ranked play, roles.  
**Acceptable client trust:** rendering, local UI preferences (volume, text scale), input
intents, and answer submissions (judged server-side).

Analytics events used for integrity are server-derived from validated actions; the existing
client analytics snapshot can inform the player's own dashboard but cannot determine rank or
rewards.

### 4.8 Match state

**Current:** `BattleSession` has a client-side state machine (`Ready`, `TurnResolved`,
`Victory`, `Defeat`, `MonsterEscaped`) with full in-memory state. `ArenaDuelSession` tracks
round/score locally.

**Proposal:**

- Move the authoritative state machine server-side for online matches:
  - PvE: `Created → Active → (TurnResolved → Active)* → Completed(Victory|Defeat|Escaped)`
  - PvP: `Created → AwaitingPlayers → RoundActive → RoundResolved → … → Completed | Abandoned`
- Server state includes: participants, question set/projections, round or turn index, per-turn
  deadlines, submitted answers, computed results, scores, `stateVersion`, and audit timestamps.
- Clients receive snapshots or deltas tagged with `stateVersion`; a client action includes the
  version it acted on. Stale actions are rejected with the current snapshot so the UI can
  reconcile.
- Illegal transitions (answer outside an active round, second answer for the same question,
  action after completion) are rejected without changing state.
- Reuse `BattleState` enums/statuses as the vocabulary where practical, but the instance and
  transitions live on the server.

### 4.9 Persistence

**Current:** IndexedDB (`knowledge-realms-save`, schema v6) with migrations, backup/slots, and
export envelopes. `SaveDataValidator`, `SaveMigrations`, `SaveDiagnostics`, and `SaveTransfer`
are pure-ish and tested.

**Proposal:**

- The server database becomes authoritative for online state. A minimal schema (engine
  agnostic):
  - `accounts`, `sessions`, `characters`, `character_stats`
  - `inventory_items`, `equipment`, `currency_ledger`
  - `quests`, `mastery`, `achievements`, `analytics_events`
  - `question_bank`, `content_versions`
  - `battles`, `battle_turns`, `pvp_matches`, `pvp_rounds`
  - `idempotency_keys`, `audit_log`
- Every character/aggregate row carries `stateVersion` and `updatedAt`; writes are transactional
  and guarded by the expected version.
- Connection/transaction boundaries: one answer submission = one transaction covering answer
  validation, turn result, and (on terminal state) rewards/quest/mastery updates.
- The local IndexedDB remains a **cache and offline mode**, not a second authority. A
  server-issued `stateVersion` is stored so a reconnect can detect drift.
- Server-side migrations mirror the existing versioned approach; `SaveDataValidator` and
  `SaveMigrations` remain reusable for validating imported local saves. `SaveTransfer` envelopes
  are import artifacts only, never proof of legitimate online progress.
- Backups: server backups plus the existing browser-local export remain separate; deleting a
  local profile must never delete server state without an explicit account action.
- Privacy: learner analytics stored server-side require a retention/export/deletion policy
  (open decision).

### 4.10 Reconnection

**Proposal:**

- Sessions are resumable with a short-lived access credential and a refresh path; revocation
  takes effect immediately for new requests.
- On reconnect, the client fetches a **snapshot** of active battle/match state (no answer keys)
  and resumes rendering.
- Answer/reward retries use the same idempotency key, so a lost response never double-applies.
- Turn deadlines use server time. A configurable grace window (e.g. latency + a few seconds)
  avoids punishing slow networks; after that, the turn is missed or the match is forfeited per
  policy.
- PvP disconnect policy (proposal): a short reconnect window (e.g. 30–60 s, configurable);
  failure to return expires rounds and eventually forfeits. The player sees the countdown.
- If the app is offline, online modes pause and explain; offline play continues on a local
  character. A reconnect must not silently merge divergent online/offline progress.
- Service-worker precache continues to make the shell load offline; it does not make online
  actions work offline.

### 4.11 Rate limiting

Initial defaults to tune in implementation (all enforced server-side, per account and per IP):

| Endpoint class | Limit (starting point) |
| --- | --- |
| Login/credential attempts | 5/min per account+IP, exponential lockout |
| Question fetch / encounter start | 10/min per account |
| Answer submission | 1/s burst 5 per account; also one per battle question |
| Shop/bank/enhancement transactions | 5/min per account |
| Admin/content writes | 30/min per admin role, stricter for bulk import |
| Snapshot/state polling | 30/min per account (push preferred for PvP) |

- Return HTTP 429 with `Retry-After`; log repeated violations.
- Limits must not be bypassable by changing a client header; identity is server-derived.
- Rate limiting is separate from anti-automation heuristics; both feed review/audit, not silent
  punishment without policy.

### 4.12 Server validation

Every request passes, in order:

1. **Authentication** — valid session, not revoked.
2. **Authorization** — account owns the character; role permits admin actions.
3. **Schema validation** — known fields/types only; reject unknown or malformed payloads.
4. **Reference validation** — item, monster, question, quest, shop, and skill IDs exist in
   server content registries and are eligible.
5. **State validation** — battle/match is active, participant matches, question belongs to the
   battle, not already answered, round/turn is correct.
6. **Temporal validation** — server clock, deadline plus grace.
7. **Concurrency validation** — `stateVersion` matches; idempotency key unused or returns the
   stored result.
8. **Domain validation** — reuses pure rules: damage bounds, non-negative gold, item quantities,
   level/stat limits, enhancement costs, quest prerequisites.
9. **Invariant checks before commit** — no negative balances, equipment references owned items,
   rewards granted once, terminal state is final.
10. **Audit** — state-changing operations record actor, action, before/after summary, request ID,
    and timestamp without storing secrets.

Server recomputes all derived values; client-submitted computed values (damage, totals, EXP)
are either ignored or checked against the recomputation and rejected on mismatch.

## 5. Reusable versus redesigned modules

### 5.1 Reusable with little or no change (pure rules)

| Module | Role online |
| --- | --- |
| `src/combat/DamageCalculator.ts` | Damage math, run server-side |
| `src/config/combatConfig.ts`, `difficultyConfig.ts`, `expConfig.ts`, `statGrowthConfig.ts`, `enhancementConfig.ts` | Balance/rules, shared or server-only |
| `src/questions/retrieval/DifficultyEngine.ts` | PvE/PvP difficulty profiles |
| `src/questions/retrieval/QuestionSelector.ts` | Sampling without replacement |
| `src/questions/evaluation/AnswerEvaluator.ts` | Correctness and normalization |
| `src/combat/rewards/RewardCalculator.ts` | Reward rolls with server RNG |
| `src/core/progression/*` | Level/EXP/stat allocation rules |
| `src/inventory/*` (registry, stat calc, enhancement, comparison) | Item/equipment rules |
| `src/economy/CurrencyService.ts`, `ShopService`, `BankService` | Economy rules server-side |
| `src/quests/QuestManager.ts`, quest definitions | Quest progression server-side |
| `src/mastery/MasteryManager.ts` | Mastery gains from validated answers |
| `src/storage/SaveDataValidator.ts`, `SaveMigrations.ts`, `SaveTransfer.ts` | Import validation and migrations |
| `src/questions/management/QuestionValidator.ts`, content standards | Server-side authoring validation |
| `src/analytics/LearningAnalytics.ts` | Aggregate computation over server events |

### 5.2 Reusable only after being moved behind the server

| Module | Why |
| --- | --- |
| `QuestionRepository` | Data access must be server-side; client gets projections only |
| `RoleManager` | Roles become server-issued claims |
| `ChallengeArenaSession` | Timers/scores must be validated for ranked play |
| `Achievement` definitions | Progress computed from validated events |
| `Gathering`/profession/assignment rules | Rewards and rank must be server-validated if shared |

### 5.3 Must be redesigned

| Module | Required change |
| --- | --- |
| `PlayerSessionManager` | Singleton mutable client state → server session + local projection cache; offline mode retained |
| `IndexedDBStorageService` / storage layer | Local authority → cache/offline store; server persistence added |
| `BattleSession` | Client-authoritative combat → server-authoritative battle with intents and snapshots |
| `ArenaDuelSession` | Local boolean-based duel → server match with answer validation and server RNG |
| PvP UI flow | Add matchmaking, opponent presence, deadlines, reconnect/forfeit states |
| Question DTOs | Strip answer keys, explanations, and accepted answers pre-answer |
| `LearningAnalytics` ingestion | Server event pipeline; client snapshot no longer authoritative |
| `AdminAccessService` | Demo gate → server authentication/RBAC; keep local gate only for offline tooling |
| `createUniqueId` | Server IDs and idempotency keys; client IDs become correlation-only |
| PWA/offline behavior | Online modes must surface connectivity loss and reconcile on reconnect |
| Save import | Validated, user-confirmed, non-ranked by default |

### 5.4 Deprecated in online mode only

- Client-side `Math.random` for reward/drop rolls, critical-hit rolls, question sampling, and
  PvP rival accuracy.
- Client-supplied `playerCorrect` booleans and reward summaries as inputs.
- Local admin passcode as proof of authority.
- Treating IndexedDB as the source of truth for shared state.

## 6. Protocol sketch (design only, not implemented)

- **Non-realtime:** HTTPS JSON request/response for identity, character, economy, quests,
  encounters, and answers. Cache-safe GETs for static content; POSTs for mutations.
- **Realtime PvP:** a push channel (WebSocket or equivalent) for match events, with
  request/response fallback for resilience. Selection is deferred.
- **Envelope:**

```json
{
  "requestId": "opaque-correlation-id",
  "session": "opaque-token",
  "stateVersion": 41,
  "payload": {}
}
```

- **Mutation response:**

```json
{
  "requestId": "opaque-correlation-id",
  "stateVersion": 42,
  "applied": {},
  "projection": {},
  "replayed": false
}
```

- **Error shape:** stable code (`AUTH_REQUIRED`, `VERSION_CONFLICT`, `ILLEGAL_TRANSITION`,
  `QUESTION_ALREADY_ANSWERED`, `RATE_LIMITED`, `VALIDATION_FAILED`), no internal details.
- **PvE flow:** start encounter → server selects questions and returns projections → answer
  intents → server turn results → terminal summary with applied rewards → new projection.
- **PvP flow:** matchmaking → match snapshot (round, deadline, own question) → answer intent →
  round result when resolved → final result/rating.
- **Idempotency:** every mutating request carries a unique key scoped to
  `(account, action, battle/match, question)`; the server stores the first result and returns it
  for duplicates.
- **Versioning:** API version in the path or header; question/content versions remain explicit
  (Phase 28.5). Older clients receive a clear “update required” response rather than undefined
  behavior.

## 7. Offline/online coexistence and staged migration

The online capability should be introduced in stages, each requiring explicit approval:

| Stage | Scope | Authority | Risk |
| --- | --- | --- | --- |
| 0 (current) | Offline only | Client | None online |
| 1 | Optional accounts + cloud backup of a local save | Client; server stores copies | Low; not cheat-resistant, no ranked value |
| 2 | Server-verified PvE battles for ranked rewards/leaderboards | Server battles | Medium; requires question/answer/reward authority |
| 3 | Real PvP arena with matchmaking and rating | Server matches | High; timing, reconnect, abuse |
| 4 | Server-authoritative characters/economy for online mode | Server | High; migration, offline divergence, operations |

Rules for coexistence:

- Offline play is never blocked or downgraded; it is marked **unranked** for shared systems.
- Online characters and offline characters are separate records unless an explicit validated
  import is approved.
- A ranked leaderboard accepts only server-validated results. Offline results may be shown
  locally but never ranked.
- Guest/local saves are imported only with user confirmation, with a preview, conflict report,
  and a preserved local backup (`SaveTransfer` envelope).
- PWA updates remain prompt-based; an online client must not activate a new worker mid-match
  without a safe reload policy (finish or forfeit first).

## 8. Risks and open decisions

Decisions required before any implementation:

1. **Project approval and scope** — which stage to build first (recommend stage 2 as the smallest
   meaningful online feature, or stage 1 if the goal is only backup).
2. **Hosting/back-end stack** — not selected here; must fit offline-first clients and HTTPS.
3. **Transport** — HTTPS-only polling vs WebSocket for PvP.
4. **Identity provider** — account system details are Phase 30.2; no client-only auth.
5. **Offline/ranked policy** — whether offline progress can ever appear on leaderboards (default:
   no).
6. **Learner-data policy** — retention, export, deletion, and parent/guardian consent for
   analytics.
7. **Content licensing** — rights to distribute question content server-side and offline.
8. **Moderation/support** — admin roles, dispute handling, and audit access.
9. **Operational budget** — question serving, PvP rooms, backups, and monitoring.

Known technical risks:

- Latency in a question-timer game; the server grace window must be tuned and communicated.
- Reconnect/forfeit fairness, especially on mobile networks.
- Divergence between offline and online saves if users play both.
- Question leakage via offline bundles if competitive sets ship to clients.
- Migration of schema v6 saves and future schema changes across client/server versions.
- Analytics/PII compliance if events become server-side.

## 9. Non-goals for this phase

- No server code, database, deployment, or dependency is added.
- No multiplayer, matchmaking, accounts, or authentication is implemented.
- No provider, framework, or hosting vendor is selected.
- No changes to offline gameplay, saves, questions, or balance.
- No anti-cheat evasion, client obfuscation, or DRM is proposed; integrity relies on server
  authority and auditing.

## 10. Summary

The offline game is a clean, pure-rules codebase whose domain logic is unusually well suited to
server reuse: combat math, question selection, answer evaluation, rewards, economy, quests,
mastery, and save validation are already isolated from Phaser. The redesign is concentrated in
the **authority boundary**: replace client-owned sessions/persistence/economy/combat with server
transactions and projections, strip answers from client payloads, validate every mutation, make
PvP a server match, and treat offline play as a separate unranked mode. That keeps the current
game intact while enabling online features incrementally, with each step behind explicit
approval.
