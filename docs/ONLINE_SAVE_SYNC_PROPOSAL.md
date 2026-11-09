# Online Save Synchronization Proposal (Phase 30.3)

**Date**: 2026-11-09  
**Phase**: 30.3 (design only)  
**Status**: Proposal — **no sync code, backend, or dependency added**

## 1. Purpose and guardrails

This document proposes how the local IndexedDB save could synchronize with a server. It covers
local-first behavior, conflict resolution, versioning, offline edits, server authority, retry
behavior, duplicate request protection, data migration, backup/restore, and recovery from partial
sync.

Guardrails:

- **Offline play stays fully functional** and remains the default; sync is optional and never a
  login wall.
- **Server state is authoritative for online characters.** The local cache is never proof of
  progress.
- **No implementation, backend, transport, or dependency is selected** here; Phase 30.1/30.2
  decisions still require approval.
- Save schema, migration, diagnostics, and export behavior from Phases 28.1–28.5 must remain
  valid; sync sits above them, not inside them.
- No automatic upload of local data without explicit user consent.

## 2. Current persistence model (as inspected)

| Concern | Current behavior | Evidence |
| --- | --- | --- |
| Database | IndexedDB `knowledge-realms-save`, version 1 | `IndexedDBStorageService.ts` |
| Active save | One whole-save object under `active-profile` | `saveGame()`/`loadGameDetailed()` |
| Save shape | `SaveData` schema v6: player, mastery, inventory, quests, skills, bank, currency, analytics, gathering, careers, assignments, settings | `StorageTypes.ts` |
| Write model | `PlayerSessionManager` rebuilds a full snapshot from live client managers and overwrites the whole object | `createSnapshot()`, `saveSession()` |
| Timestamp | Client `updatedAt: Date.now()` | `PlayerSessionManager.createSnapshot()` |
| Settings | Separate `settings` store key `user-settings`; some UI prefs in `localStorage` | `saveSettings`/`loadSettings`, `kr.ui.textScale` |
| Recovery copies | `migration-backup` (pre-migration), `backup` (pre-restore), `load-recovery` (damaged payload) | `IndexedDBStorageService.ts` |
| Diagnostics | Content-free `recovery-log`, max 20 entries | `SaveDiagnostics.ts` |
| Manual slots | `slot:slot-1..3` with metadata; restore backs up the current save first | `SAVE_SLOT_IDS`, `restoreActiveSave({confirm:true})` |
| Validation | Strict per-section validator with repair/salvage; unknown future versions flagged | `SaveDataValidator`, `SaveRecovery` |
| Migration | Linear v1→v6 chain; pre-migration raw copy retained | `SaveMigrations`, `EARLIEST_SUPPORTED_SAVE_VERSION = 1` |
| Export/import | Versioned envelope (`format`, `formatVersion`, `schemaVersion`, `generator`) validated on import | `SaveTransfer.ts`, `SAVE_EXPORT_FORMAT_VERSION = 1` |
| Fallback | No IndexedDB → `InMemoryStorageService`, session-only, explicit notice | `StorageTypes.isPersistent?()`, Phase 29.2 |
| Network | None; saves never leave the device | repository audit |

**Implications for sync:**

- The current unit of persistence is a **whole-save snapshot**, not a list of changes. Uploading
  snapshots for online play would make conflicts coarse and could silently overwrite progress.
- `updatedAt` is a **client clock** value and cannot order server events.
- Recovery, migration, and slot semantics are well-tested and should be preserved as the local
  foundation.
- The in-memory fallback cannot synchronize; sync must be disabled with a clear notice when
  storage is not persistent.

## 3. Sync models considered

| Model | Description | Verdict |
| --- | --- | --- |
| **A. Snapshot backup** | Upload/download whole saves as opaque, versioned files | Suitable for optional offline backup and manual restore; not authoritative for online characters |
| **B. Server-authoritative commands + local projection** | Client sends validated intents; server commits and returns projections/versions; local cache for display/offline | **Recommended for online characters** |
| **C. CRDT / per-field merge** | Replicas merge field-by-field without a central authority | Rejected for this game: economy, rewards, and combat need a single authority; complexity far exceeds need |

The proposal uses **B for online characters** and optionally **A for local/offline backups**.
They are deliberately separate paths.

## 4. Target architecture

```text
Client (browser)                                  Server (authoritative for online)
┌──────────────────────────────┐                 ┌────────────────────────────────┐
│ UI / Phaser                  │                 │ Auth/session (Phase 30.2)      │
│        ▲                     │                 │ Character state (stateVersion) │
│        │ projection          │   HTTPS/JSON    │ Command validation (30.1)      │
│ ┌──────┴───────┐   commands  │ ──────────────► │ Transactions + ledger          │
│ │ Projection    │◄────────────│   results       │ Idempotency store              │
│ │ cache (IDB)   │             │                 │ Snapshots/backups              │
│ └──────┬───────┘             │                 └────────────────────────────────┘
│ ┌──────┴───────┐             │
│ │ Outbox (IDB) │             │        Offline-only path:
│ └──────────────┘             │        local character (authority) + optional
│ Local offline character      │        opaque snapshot backup (Model A)
└──────────────────────────────┘
```

Two character classes with different rules:

1. **Offline character** (today's save): local authority; full gameplay; optional manual/cloud
   snapshot backup; never ranked.
2. **Online character** (Phases 30.1–30.2): server authority; local cache for display and offline
   reading; commands are intent-only; ranked eligible.

## 5. Local-first behavior

- **Offline character:** unchanged. All game systems keep using the local save. Sync is a backup
  action, not a gameplay dependency.
- **Online character, offline device:** the client shows the last cached projection in a
  read-only state with an offline banner. Economic/progression actions are disabled to avoid
  divergent merges. The player can switch to an offline character; a deliberate
  **“fork as offline copy”** action may duplicate the cache locally, clearly marked as a copy.
- **Startup:** load local cache immediately, then reconcile with the server in the background.
- **Sync triggers:** after each committed game action batch (save-point semantics), on app
  foreground, on reconnect, after login, and on a low-frequency timer. No `beforeunload` flush
  is required for correctness; commands persist in the outbox as they occur.
- **Settings:** volume, damage numbers, and text scale remain **device-local** (they are
  preferences, not progress). Optional account-level settings sync is an open decision.
- **PWA:** the precached shell keeps loading offline; sync is unrelated to service-worker
  precaching. A waiting update should not activate mid-batch; the update prompt can appear, and
  “Save & Reload” should flush the outbox or clearly warn about unsynced actions.
- **Storage fallback:** if `isPersistent()` is false or IndexedDB is unavailable, online sync is
  disabled and the existing session-only notice is shown. No ephemeral outbox is trusted.

## 6. Conflict resolution

**Principle:** no whole-save last-write-wins for online characters. Conflicts are detected at the
character aggregate and resolved by the server against explicit commands.

### 6.1 Optimistic concurrency

- Each online character has a server `stateVersion`.
- The client sends commands with `baseVersion` (the version it acted on) and a `commandId`.
- If `baseVersion` equals the current server version, the server validates and commits,
  returning the new version and projection.
- If not, the server rejects with `VERSION_CONFLICT` plus the current projection. The client
  refreshes and re-evaluates; it does **not** blindly re-apply commands that may now be invalid.
- Single-writer per character: the server serializes commits; no distributed merge.

### 6.2 Domain-specific rules

| Domain | Conflict handling |
| --- | --- |
| Currency/inventory/shop/bank | Server transaction; reject if balance/items changed; client refreshes. Ledger entries are immutable. |
| PvE/PvP combat | Server owns battle state; a stale action is rejected, never replayed into a different turn. |
| Quests/achievements | Server validates prerequisites against current state; idempotent completion. |
| Stat allocation/equipment | Reject on version mismatch; revalidate points/ownership. |
| Settings/UI | Device-local; no conflict. |
| Offline snapshot backup | Never auto-merged; explicit “keep local / keep server / create copy”. |

### 6.3 Offline snapshot conflicts (Model A)

- A backup belongs to a local character identity, not to an online character.
- Uploading a snapshot under the same name creates a new snapshot version; it never replaces
  online state.
- Restoring a snapshot to an online character is blocked by default; if product policy later
  allows it, it must create a new character or a server-audited rollback, never a silent overwrite.
- If two devices upload different snapshots for the same offline identity, keep both as conflict
  copies and let the user choose; no automatic merge.

## 7. Versioning

Several independent versions, never conflated:

| Version | Purpose | Current |
| --- | --- | --- |
| Save data schema | Shape of the local `SaveData` payload | **6** |
| Export format | Portable envelope container | **1** |
| Character state | Server-authoritative revision per character | New |
| Sync protocol | Client/server sync contract | New |
| API version | Request/response compatibility | New |
| Content version | Question bank/content pack version | Phase 28.5 |
| App version | Build identity | **0.1.0** (strategy from Phase 29.5) |

Rules:

- The server assigns `stateVersion`; it increases monotonically per committed batch.
- Server timestamps are authoritative; client `updatedAt` is advisory metadata only.
- Snapshots carry `snapshotVersion`, `schemaVersion`, checksum, and creation time.
- Commands carry `commandId`, `baseVersion`, and optional `clientTimestamp` (diagnostics only).
- Clients declare app and sync protocol versions; below the minimum, the server returns
  `UPDATE_REQUIRED` with no state change.
- Content versions are pinned when a battle starts so a mid-battle content update cannot change
  answers.

## 8. Offline edits

### 8.1 Online characters

Default policy: **no offline edits for online characters**. Local cache is read-only when the
server is unreachable. This avoids silent divergence in currency, inventory, and progression.

A product may later choose one of these (open decision):

- **Queued intents:** allow non-economic intents offline, validate on reconnect, reject
  conflicts. Requires careful UX and was not chosen as the default.
- **Offline fork:** explicit “continue as offline copy”; the copy is clearly separate and
  unranked, and the online character is unchanged.

### 8.2 Offline characters

Unchanged local authority. All edits are allowed offline. Optional cloud backup uploads a
snapshot at save points; because the server does not interpret it, no merge is attempted.

### 8.3 Ephemeral storage

If the browser cannot persist IndexedDB, nothing is queued for sync. The existing session-only
notice remains the source of truth.

## 9. Retry behavior

- **Persistent outbox:** every mutating command is written to an IndexedDB outbox before the
  request is sent, with `commandId`, character id, payload, `baseVersion`, attempt count, and
  timestamps.
- **Single-flight per character:** one batch in flight at a time; FIFO order preserves intent.
- **Batch boundaries:** commands that depend on each other are sent in order; the client stops
  at the first deterministic rejection and refreshes.
- **Retryable:** network errors, timeouts, 5xx, 429 (honor `Retry-After`), and transient storage
  failures. **Not retryable:** validation errors, version conflicts, authorization failures,
  `UPDATE_REQUIRED`.
- **Backoff:** exponential with jitter (e.g. 1 s, 2 s, 4 s … cap 60 s). After a configurable
  attempt limit, pause and show “sync paused” with a manual retry.
- **Auth expiry:** attempt one session refresh, then pause the outbox and prompt re-login; never
  discard commands.
- **App restart:** the outbox is reloaded on startup and resumed after reconciliation.
- **Ack semantics:** an outbox entry is removed only after a successful response (or a
  `replayed: true` response for the same `commandId`).

## 10. Duplicate request protection

- **Client-generated `commandId`** (UUID) is stable across retries.
- The server stores the first outcome keyed by `(accountId, characterId, commandId)` and returns
  `replayed: true` with the same result for duplicates.
- Command batches are **atomic**: either all state changes commit, or none do.
- Snapshot uploads use a `snapshotId` plus checksum; a duplicate returns the stored snapshot
  record.
- Reward/economy grants from Phase 30.1 remain keyed by battle/match/transaction IDs, so a
  retried command cannot double-grant.
- Client prunes acknowledged entries after a retention window; unacknowledged entries are never
  silently dropped.

At-least-once delivery plus server idempotency yields effectively-once application.

## 11. Data migration

### 11.1 Local

- Existing migrations run before any upload; the raw pre-migration payload is retained in
  `migration-backup`.
- Imports validate via `SaveDataValidator` and migrate forward with `SaveMigrations`; future
  schemas are rejected with an update message.
- Sync never migrates the local payload in place without the existing backup behavior.

### 11.2 Server

- Server schema migrations are versioned, forward-only, idempotent, and run behind a pre-migration
  backup.
- One job per migration version; reruns are no-ops; failures leave the prior version intact.
- Client and server schema versions are independent: a client save (v6) maps into server entities
  once, then server versioning takes over.
- Content migrations remain separate (Phase 28.5); battle records pin content versions.

### 11.3 Imported guest saves

- Validated and migrated server-side, then stored as a new character with import metadata
  (`sourceSchemaVersion`, `importedAt`, `sourceGuestId`) for audit.
- Imported progress policy is decided in Phase 30.2 (recommended: unranked until verified).

## 12. Backup and restore

### 12.1 Local (unchanged)

- `active-profile`, `backup`, `migration-backup`, `load-recovery`, `recovery-log`, and
  `slot:slot-1..3` keep their current meanings.
- Restore is destructive and requires confirmation; the current save is backed up first.
- Slots remain a device-local convenience.

### 12.2 Server

- Automated database backups plus point-in-time recovery for online characters.
- Per-account export (JSON) and deletion policy from Phase 30.2.
- Server backups are for disaster recovery, not a player-facing “undo”. Restoring a user to an
  older server snapshot rolls back authoritative progress and must be an audited support action.

### 12.3 Cross-boundary rules

- A local slot can restore only an offline character. Restoring it over an online character is
  blocked.
- A server snapshot can seed a new offline copy only through an explicit, audited export.
- Restoring a local backup of a character later imported online must not rewrite server state.
- The portable envelope remains the import container; it is never accepted as proof of
  legitimate online progress.

## 13. Recovery from partial sync

| Failure | Detection | Recovery |
| --- | --- | --- |
| Crash mid-request | Outbox entry still unacknowledged | Resend same `commandId`; server returns replay or applies once |
| Response lost after server commit | Client sees timeout | Resend; server returns `replayed: true` and original result |
| Server commit fails mid-batch | Server transaction aborts | Nothing applied; client retries or refreshes |
| Local cache corrupted | Validation/hash mismatch on load | Keep raw payload as quarantine copy (like `load-recovery`), refetch from server |
| Outbox corrupted | Parse/validation failure | Quarantine the entry, pause sync, show a diagnostic; never auto-drop silently |
| Version mismatch | `baseVersion` < server version | Refresh projection, discard stale commands, require user re-action |
| Snapshot upload interrupted | Staged upload incomplete | Server discards staged data; client retries with same `snapshotId` |
| Account switch/logout | Session mismatch | Stop outbox, keep entries tied to the original account; never send across accounts |
| Offline too long / client too old | `UPDATE_REQUIRED` | Block sync, preserve local data, prompt update |

Startup reconciliation order:

1. Load and validate local cache (quarantine on failure).
2. Authenticate and fetch server `stateVersion` + projection.
3. If server is newer and the outbox is empty → replace cache.
4. If the outbox has entries → resend in order; stop on conflict and refresh.
5. Record a content-free sync status (last success, pending count, last error code) locally.

The client must always be able to answer: “Are there unsynced actions?” and “Is this projection
current?” — visible in the UI when not current.

## 14. Server data model and API sketch (design only)

```text
characters          (character_id, account_id, state_version, updated_at, ...)
character_snapshots (snapshot_id, character_id, version, schema_version, checksum,
                     storage_ref, created_at)
command_log         (account_id, character_id, command_id, base_version, result_version,
                     applied_at, summary_json)
idempotency_keys    (scope, key, result_ref, created_at, expires_at)
sync_devices        (device_id, account_id, last_cursor, last_seen_at, app_version)
account_backups     (backup_id, account_id, created_at, storage_ref, retention_class)
```

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/characters/{id}/state?since={version}` | Full projection or delta since a version |
| POST | `/characters/{id}/commands` | Atomic batch with `commandId` + `baseVersion` |
| GET | `/sync/status` | Server version, pending snapshot, min client version |
| POST | `/characters/{id}/snapshots` | Opaque offline backup upload (Model A) |
| GET | `/characters/{id}/snapshots` | List backup snapshots |
| GET | `/account/export` | Data export (Phase 30.2) |

Command response shape:

```json
{
  "commandId": "opaque",
  "stateVersion": 43,
  "replayed": false,
  "applied": [{ "type": "grant-rewards", "summary": { "gold": 24, "exp": 40 } }],
  "projection": { "characterId": "opaque", "level": 12, "...": "..." }
}
```

Conflict response:

```json
{
  "code": "VERSION_CONFLICT",
  "expectedBaseVersion": 43,
  "projection": { "...": "..." },
  "message": "Character changed on another device."
}
```

## 15. Security and privacy

- Every sync request uses the Phase 30.2 session and ownership checks; character IDs are opaque.
- Payload size, command count, and rate limits are enforced server-side (Phase 30.1).
- All commands are schema-validated; unknown fields rejected.
- The local cache contains personal gameplay data: keep it origin-scoped, clear it on explicit
  logout (optional, user-visible), and warn that browser storage is not encrypted at rest.
- Settings and local preferences stay device-local; analytics sync remains pseudonymous and
  content-free.
- Offline mode produces no network telemetry.
- Export/deletion must cover server state and explain that device-local copies are not removed
  remotely.

## 16. Reuse versus redesign

### 16.1 Reuse

| Module | Role in sync |
| --- | --- |
| `SaveDataValidator` | Validate local payloads, imports, and cached projections |
| `SaveMigrations` | Forward migration of local/imported saves |
| `SaveRecovery`, `SaveDiagnostics` | Repair/quarantine local cache; content-free status log |
| `SaveTransfer` envelope | Portable export/import and snapshot container |
| `IndexedDBStorageService` | Local cache, outbox, snapshots, slots, recovery copies |
| `PlayerSessionManager` | Offline character authority; snapshot source |
| `SAVE_DATA_SCHEMA_VERSION` policy | Version discipline and backup-before-migrate |
| Phase 29.2 fallback behavior | Disable sync when storage is not persistent |

### 16.2 Redesign

| Area | Change |
| --- | --- |
| Whole-save overwrite | Online characters become command-based with server versions |
| Client `updatedAt` | Replaced by server-assigned `stateVersion`/timestamps for ordering |
| `StorageService` | Add cache metadata, outbox, sync status, quarantined payloads |
| `PlayerSessionManager` | Online mode becomes a projection store + outbox coordinator; offline mode unchanged |
| Save slots | Local-only semantics must be enforced against online characters |
| Recovery log | Add content-free sync events (pending, conflict, paused, recovered) |
| PWA update flow | Flush/pause outbox before reload; warn on unsynced actions |
| Start/account UI | Show sync state, offline cache state, conflict prompts |

## 17. Migration stages (each requires approval)

| Stage | Capability | Authority |
| --- | --- | --- |
| 1 | Optional cloud backup of offline saves (snapshot upload/download) | Local; snapshot opaque |
| 2 | Server-verified online characters (commands, versions) | Server |
| 3 | Multi-device sync with read-only offline cache and outbox | Server |
| 4 | Account export/restore tooling and audited rollback | Server + support |

Stage 1 delivers backup value without touching gameplay authority. Stage 2 requires the Phase
30.1 battle/economy authority work. Stage 3 requires Phase 30.2 accounts and sessions.

## 18. Open decisions

1. Whether online characters may ever receive offline edits (default: no; fork instead).
2. Which settings sync across devices (default: none).
3. Snapshot retention and frequency for offline backups.
4. Whether restore-to-earlier-state is ever player-facing (default: support only, audited).
5. Encryption-at-rest expectations for server backups and local caches.
6. Outbox retention and maximum offline duration.
7. One active device vs multiple simultaneous sessions for the same character.
8. Conflict UX copy and whether conflicts ever auto-resolve.
9. Imported-progress ranking policy (shared with Phase 30.2).
10. Privacy review for server-side gameplay/analytics retention.

## 19. Non-goals

- No sync implementation, transport, backend, database, or dependency in this phase.
- No change to the existing save schema, migrations, slots, recovery, or export behavior.
- No cloud requirement for offline play.
- No CRDT or peer-to-peer synchronization.
- No promise that browser storage is encrypted; no hidden telemetry.
- No automatic merge of divergent offline and online progress.

## 20. Summary

The current game persists one whole-save snapshot per browser profile with strong validation,
migration, diagnostics, and backup semantics, but no notion of changes, versions, or devices.
The proposal keeps that foundation for offline play and optional opaque backups, and makes online
characters server-authoritative through versioned command batches, an IndexedDB outbox,
idempotency keys, and projection caches. Conflicts are rejected and refreshed rather than
silently merged; offline edits to online characters are disallowed by default; partial sync is
handled by at-least-once retries plus server-side transactional idempotency; and migrations,
backup/restore, and recovery reuse the existing tested modules. Phase 30.4 (PvP reverse-difficulty
specification) is the next design step.
