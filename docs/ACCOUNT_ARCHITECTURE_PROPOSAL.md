# Account and Identity Architecture Proposal (Phase 30.2)

**Date**: 2026-11-09  
**Phase**: 30.2 (design only)  
**Status**: Proposal — **no authentication implemented, no provider or backend selected, no dependency added**

## 1. Purpose and guardrails

This document designs accounts and identity for an optional online layer on top of Knowledge
Realms. It covers guest/local profile migration, registration and login, session expiration,
account recovery, multiple devices, data ownership, privacy and security, and server-side
authorization.

Guardrails:

- **No client-only authentication.** Every credential check and authorization decision happens
  on the server.
- **No plaintext passwords** anywhere — not in storage, logs, analytics, exports, or the client.
- **No provider or backend is selected** here; that requires explicit user approval.
- **Offline/guest play remains first-class** and must work without an account.
- Account work must not break the current save schema, PWA offline behavior, or the
  single-player flow.

## 2. Current identity state (as inspected)

| Concern | Current behavior | Evidence |
| --- | --- | --- |
| Profile | One local profile per browser origin/profile, stored in IndexedDB | `knowledge-realms-save`, `PlayerSessionManager` |
| Player ID | New characters are created with the **literal** id `player-1`; loaded saves keep whatever id they contain | `PlayerSessionManager.initializeSession()` line ~289; validators default to `player-1` |
| Display name | No name-entry step; defaults to `Novice Hero` | `initializeSession(defaultName = 'Novice Hero')`; start menu only has “Enter as User” |
| Account | None. No account, credential, token, or remote identity exists. | No auth module or network layer in `src` |
| Role | Local UI selection (`user` / `super-admin`) plus a local passcode/acknowledgement gate | `RoleManager`, `AdminAccessService`, `config/adminAccessConfig.ts` |
| Admin secret | Optional SHA-256 passcode hash baked into the client build | `VITE_ADMIN_PASSCODE_HASH` |
| Persistence | Device- and browser-profile-scoped; clearing site data deletes progress | IndexedDB, Phase 29.2/29.5 findings |
| Multi-device | Not supported; each device starts its own save | No sync layer |
| Export | Portable save envelope contains the save and generator metadata, no identity | `SaveTransfer.ts` |
| Analytics | Answer events deliberately contain no directly identifying fields | `AnalyticsTypes.AnswerAttemptEvent` comment and fields |

**Implications:**

- `player-1` cannot be used as a global identity; it is a local default, not a unique key.
- There is nothing to “log in” to today, and nothing to recover if a device is lost.
- The local admin hash is a convenience for an offline build and must never be treated as an
  online authorization mechanism.

## 3. Identity model

```text
Account (server-assigned, durable)
 ├── Credentials / linked identities (server-only, hashed secrets)
 ├── Sessions (per device, revocable)
 └── Characters (server-owned; 1..N per account)
       ├── progression, inventory, currency, quests, mastery, achievements
       └── optional link to an imported guest save (recorded, audited)

Guest profile (local only, no account)
 └── local character in IndexedDB, offline/unranked
```

Four identifiers, never conflated:

1. **`accountId`** — server-generated, opaque, stable for the account's life.
2. **`characterId`** — server-generated, opaque, owned by an account.
3. **`sessionId`** — server-issued, short-lived, revocable, bound to a device/session record.
4. **`guestProfileId`** — client-generated random identifier for a local offline profile,
   used only for import correlation and support. The server never treats it as proof of
   identity or uniqueness.

The current `PlayerData.id` maps to `characterId` in online mode. Offline saves keep their local
id. A future implementation should replace the hardcoded `player-1` with a random per-profile
`guestProfileId` even before accounts exist, to avoid collisions during import.

## 4. Guest/local profile migration

### 4.1 Principle

Guest progress belongs to the device. Linking it to an account is an **explicit, user-confirmed,
one-time import**, never a silent upload. Declining keeps the local profile and continues
offline play unchanged.

### 4.2 Flow

1. The player opens “Link this profile” from the start menu or pause menu.
2. The client shows a **preview** built locally: character name, level, schema version, gold,
   item count, quest/mastery counts, last save time, and app version.
3. The player authenticates or creates an account.
4. The server issues a short-lived, single-use **import token** bound to the account.
5. The client submits the save envelope (`SaveTransfer` format) with the token.
6. The server:
   - validates the envelope and schema using the existing `SaveDataValidator` and
     `SaveMigrations` rules (rejecting unknown/future formats),
   - checks size and structural limits,
   - creates a new `characterId`,
   - records `sourceGuestId`, import timestamp, app version, and schema version in the audit log,
   - returns the canonical character projection and an import result.
7. The local save is **kept** as a backup unless the player explicitly deletes it. The UI
   marks it “imported” and offers “Play offline copy” separately.

### 4.3 Rules and edge cases

- **Idempotency:** the import token can be redeemed once. A retry with the same token returns
  the original result and never creates a second character.
- **Conflict:** if the account already has characters, the import creates an additional
  character; it never overwrites existing server characters.
- **Validation failure:** nothing is created; the player keeps their local save and sees a
  clear reason.
- **Partial/newer schema:** migrate forward when supported; reject future schemas with a
  “update the game” message rather than silently downgrading data.
- **Offline after import:** the local copy remains playable offline. Online/offline divergence
  policy belongs to Phase 30.3 (sync), but this proposal assumes imported history is
  **server-recorded** and marked as imported in metadata.
- **Ranked policy (open decision):** recommended default is that imported single-player
  progression is retained for PvE but is **not eligible for competitive leaderboards** until
  earned through server-verified play. This prevents “import a maxed save” abuse.
- **Duplicate devices:** importing the same local save on two devices creates two characters
  unless the server recognizes the same `sourceGuestId` **and** the user confirms; the default
  is a warning and no automatic merge.
- **Privacy:** the preview and import are user-initiated; no save data leaves the device before
  confirmation.

## 5. Registration and login

### 5.1 Authentication options (decision deferred)

Candidate methods to evaluate in a follow-up decision, not selected here:

- email + password,
- passkeys/WebAuthn,
- third-party OAuth/OIDC identity,
- a combination (passkey preferred, password fallback, optional OAuth linking).

Whatever is chosen, the following requirements apply.

### 5.2 Password handling (if passwords are supported)

- Accept the password over **TLS only**; never hash or verify it in the client as the security
  boundary (PAKE designs are out of scope and must not be improvised).
- Hash on the server with a memory-hard algorithm and per-user salt (e.g. Argon2id with
  parameters tuned for the deployment, or an equivalent approved alternative). Store only the
  algorithm, parameters, salt, and hash.
- Never log, email, or return passwords or password hashes. Use constant-time verification.
- Optional pepper held in a secrets manager/KMS, never in the client.
- Do not impose arbitrary composition rules; enforce a minimum length, check against breached
  password lists if available, and support paste/password managers.
- Password reset tokens are random, single-use, stored hashed, short-lived, and invalidated on
  use or password change.

### 5.3 Registration

- Email (or provider subject) uniqueness enforced server-side.
- Optional email verification; unverified accounts have limited online features (e.g. no
  ranked play, no account recovery until verified).
- Uniform responses that do not reveal whether an email is registered (anti-enumeration).
- Rate-limit registration and verification resends per IP and per identifier.
- Create the account and initial character in one server transaction; no partial accounts.

### 5.4 Login

- Verify server-side, then issue a session; never trust a client-asserted `accountId`, role, or
  “already authenticated” flag.
- Uniform failure message and comparable timing for unknown account vs wrong credential.
- Progressive delays/lockouts after repeated failures (see Phase 30.1 rate limits).
- Successful login rotates any existing refresh credential and records a session/device entry.
- Optional step-up authentication for sensitive actions (password/email change, deletion,
  admin actions).

### 5.5 Session transport

Recommended baseline:

- Opaque 256-bit session identifier; store only its hash server-side.
- `HttpOnly`, `Secure`, `SameSite=Lax` (or `Strict` where compatible) cookie for browser use,
  with CSRF protection on state-changing requests.
- If a bearer-token design is chosen instead, keep access tokens short-lived, avoid
  `localStorage` for long-lived secrets where possible, and treat XSS as token theft.
- Rotation on privilege change, login, and refresh; reuse detection revokes the session family.
- Tokens are never placed in URLs or logs.

## 6. Session expiration

Proposed defaults (tunable, not commitments):

| Item | Default |
| --- | --- |
| Access credential lifetime | 15 minutes |
| Refresh lifetime (sliding) | 30 days |
| Absolute session lifetime | 90 days |
| Idle timeout (ordinary play) | 7 days |
| Idle timeout (admin/super-admin) | 30 minutes |
| “Remember this device” | Extends refresh to 90 days; still revocable |
| Concurrent sessions | Allowed per device, listed and individually revocable |
| Step-up window for sensitive actions | 5 minutes |

Behavior:

- Every server request re-checks session validity; expiration is not a client timer.
- Expired session during an online battle: allow the Phase 30.1 reconnect window to resume;
  after that, the match follows its timeout/forfeit policy.
- Logout revokes the current session; “log out everywhere” revokes all sessions and refresh
  credentials.
- Password/email change revokes other sessions.
- Guest/offline play has no session and is unaffected.
- Session records store minimal device metadata (label, created/last-seen, coarse IP for
  security) with a short retention policy.

## 7. Account recovery

### 7.1 With email

- “Forgot password”: always return the same response. If the account exists, send a
  single-use token link with a short TTL (e.g. 30–60 minutes), stored hashed.
- Token is invalidated on use, password change, or a new request.
- Recovery never reveals the email, character names, or whether an account exists.
- After reset, revoke all sessions and notify the account owner by email.

### 7.2 Passkey/OAuth-only accounts

- Provide single-use recovery codes at enrollment, stored hashed, displayed once.
- Offer a verified secondary email or a support-assisted recovery process.
- Re-authentication requirements for adding/removing a credential.

### 7.3 What cannot be recovered

- **Unlinked guest progress** exists only on that device/browser profile. Account recovery
  cannot restore it. The only options are a local save export (when a UI exists; currently a
  known gap) or browser-profile recovery.
- Deleted accounts follow the deletion policy in Section 9; recovery after deletion is limited
  to a short grace window if one is offered.

### 7.4 Abuse protections

- Rate-limit recovery requests and verifications; cap attempts per account/IP.
- Never use security questions or knowledge-based answers.
- Support staff can never read passwords or session tokens; they can trigger resets and view
  audit logs only.

## 8. Multiple devices

- One account can have multiple active sessions/devices. Characters are server-owned, so every
  device sees the same canonical state after sign-in.
- **One active battle/match per character.** Starting a battle locks the character; a second
  device receives “character in use” rather than a divergent battle.
- Concurrent mutations are rejected by `stateVersion` (Phase 30.1); the losing client refreshes
  the projection instead of overwriting.
- Offline caches are per device. On reconnect, the server state wins; no automatic merge of
  offline edits into an online character.
- Device management UI: list sessions (label, created, last seen), revoke one or all, and
  “sign out everywhere”. Users can rename a device locally.
- Optional device-link flow (QR/short code) for signing in on a TV/console-like device, using a
  short-lived pairing token.
- PWA installs on multiple devices share the account, not IndexedDB. Clearing one device’s site
  data affects only that device’s cache/offline profile.

## 9. Data ownership and privacy

### 9.1 Data inventory

| Data | Purpose | Sensitivity | Retention (proposed) |
| --- | --- | --- | --- |
| Account identifier, email/provider subject | Login, ownership | Personal | Account lifetime + grace |
| Credential hash, salts, recovery-code hashes | Authentication | Secret (hashed) | Until changed/deleted |
| Session records (device label, timestamps, coarse IP) | Security, device list | Personal | 90 days after expiry |
| Character and progression data | Gameplay | Personal (pseudonymous) | Account lifetime |
| Learning analytics events (question, outcome, timings) | Player dashboard, balancing | Pseudonymous; no direct identifiers | Configurable (e.g. 24 months) |
| Audit log (admin actions, imports) | Integrity, support | Personal | 12 months |
| Backups | Recovery | Same as source | Rolling, bounded |
| Client-side save/IndexedDB | Offline play | User-controlled | Until user clears it |

### 9.2 Principles

- **Data minimization:** collect only what gameplay, security, and support require. The current
  analytics event shape (question/outcome/timing, no names or emails) is a good baseline —
  keep it.
- **Purpose limitation:** no advertising or sale of learner data; no third-party analytics
  without explicit consent and a documented need.
- **User control:** export account data (JSON, server-generated), delete the account and its
  characters, and see/revoke active sessions.
- **Account deletion:** soft-delete with a short grace period (e.g. 30 days) then purge;
  document that local device copies are not deleted remotely and must be cleared by the user.
- **Minors:** the game is educational and may be used by children. Before any online launch,
  require a legal/privacy review; consider guardian consent, stricter data minimization, and
  disabling public profiles/chat. This proposal is not legal advice.
- **International data:** data residency and transfer rules are deployment decisions to
  confirm before selecting a host.
- **Consent records:** store acceptance of terms/privacy policy versions with timestamps and
  the policy version, not the policy text.

### 9.3 Ownership boundary

The player owns their data; the operator is the custodian/controller. The operator may use
aggregated, de-identified statistics for balance and content quality, but must not republish
identifiable learner data. Guest saves are entirely under the user’s control on their device
until they choose to import.

## 10. Server-side authorization

### 10.1 Roles

| Role | Capabilities |
| --- | --- |
| Guest/offline | Local play only; no server state |
| Player | Read/write own character within game rules; manage own sessions |
| Content author | Create/edit question drafts; no publishing |
| Content reviewer | Review/approve/publish; cannot silently alter published history |
| Admin | Manage users/content metadata; view audit logs; cannot read secrets |
| Super admin | Assign roles, perform destructive operations; step-up required; fully audited |

- Roles are server-issued claims, checked on every request (deny by default).
- **Separation of duties:** authoring and publishing are distinct capabilities.
- Admin actions that change learner data require a reason and are audit-logged.
- The client never sends a role; if it does, it is ignored.
- Admins cannot view passwords, recovery tokens, or raw session identifiers.
- The existing local `RoleManager`/`AdminAccessService` remain for offline tooling only. In an
  online build, the baked `VITE_ADMIN_PASSCODE_HASH` must not gate server capabilities.
- Admin sessions are shorter, require recent re-authentication for destructive actions, and can
  be revoked by a super admin.

### 10.2 Ownership checks

Every character/economy/quest request verifies `character.accountId === session.accountId`
before domain validation. IDs are opaque; guessing one grants nothing.

## 11. Threat model (summary)

| Threat | Mitigation |
| --- | --- |
| Password theft | Server-side memory-hard hashing, TLS, no logs of secrets, reset revocation |
| Credential stuffing | Rate limits, progressive lockouts, breached-password checks, optional MFA/passkeys |
| Session theft / XSS | `HttpOnly` cookies, short access lifetime, rotation, CSP, no token in storage/URLs |
| CSRF | `SameSite` cookies + CSRF tokens on mutations |
| Token replay | Rotation with reuse detection; revoke session family |
| Account enumeration | Uniform responses and comparable timing for login/recovery/registration |
| Recovery abuse | Single-use hashed tokens, short TTL, rate limits, session revocation on reset |
| Guest import abuse | Explicit consent, validated envelope, idempotent token, imported-progress policy |
| Multi-device conflicts | `stateVersion`, one active battle lock, server-wins projection refresh |
| Insider/admin abuse | RBAC, least privilege, separation of duties, audit log, step-up, no secret access |
| Shared accounts | Device/session list, revoke, optional one-active-device policy |
| PII leakage via analytics | Pseudonymous events, no direct identifiers, retention limits, export/delete |
| Offline tampering | Online state never derives from client saves; imports validated and policy-limited |

## 12. Data model sketch (engine agnostic)

```text
accounts            (account_id, status, created_at, deleted_at, locale?)
credentials         (account_id, type, identifier, secret_hash, params, updated_at)
identity_links      (account_id, provider, subject, created_at)        -- if OAuth/OIDC
sessions            (session_id_hash, account_id, device_label, created_at,
                     last_seen_at, expires_at, revoked_at, ip_hash?)
refresh_tokens      (token_hash, session_id, family_id, expires_at, rotated_at, reused_at?)
recovery_tokens     (token_hash, account_id, purpose, expires_at, used_at)
recovery_codes      (code_hash, account_id, used_at)
characters          (character_id, account_id, name, slot, state_version, created_at,
                     deleted_at, imported_from?, imported_at?)
consent_records     (account_id, document, version, accepted_at)
deletion_requests   (account_id, requested_at, execute_after, status)
audit_log           (actor_account_id, action, target, request_id, at, summary_json)
```

Rules:

- No plaintext secrets; hashes only, with algorithm/parameters recorded.
- `account_id` and `character_id` are server-generated and opaque.
- Soft delete for accounts/characters, with a bounded purge job.
- Audit summaries never include passwords, tokens, or raw save contents.
- Character state tables are defined in Phase 30.3; this proposal owns identity only.

## 13. API sketch (design only, not implemented)

All endpoints use TLS, the Phase 30.1 envelope, CSRF protection where cookie-based, and
idempotency keys on mutations.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/register` | Create account (uniform anti-enumeration response) |
| POST | `/auth/login` | Authenticate; issue session |
| POST | `/auth/refresh` | Rotate/refresh session |
| POST | `/auth/logout` | Revoke current session |
| POST | `/auth/logout-all` | Revoke all sessions |
| GET | `/me` | Account summary, roles, linked identities (no secrets) |
| GET | `/sessions` | List own sessions/devices |
| DELETE | `/sessions/{id}` | Revoke one session |
| POST | `/auth/recovery/request` | Start recovery (uniform response) |
| POST | `/auth/recovery/confirm` | Redeem recovery token |
| GET | `/characters` | Owned characters |
| POST | `/guest-import/preview` | Server-side size/schema check (optional) |
| POST | `/guest-import` | Idempotent, token-bound save import |
| GET | `/account/export` | User data export |
| POST | `/account/delete` | Request deletion (step-up + confirmation) |

Example session response (no secrets):

```json
{
  "account": { "id": "opaque", "roles": ["player"], "emailVerified": true },
  "session": { "id": "opaque-session-ref", "expiresAt": 1790000000000 },
  "characters": [{ "id": "opaque", "name": "Novice Hero", "level": 12 }]
}
```

Error codes (stable, no internals): `AUTH_REQUIRED`, `SESSION_EXPIRED`, `INVALID_CREDENTIALS`,
`RATE_LIMITED`, `EMAIL_UNVERIFIED`, `IMPORT_TOKEN_INVALID`, `IMPORT_CONFLICT`,
`FORBIDDEN`, `STEP_UP_REQUIRED`, `ACCOUNT_DELETED`.

## 14. Client experience and reuse

### 14.1 Flow changes

- Start menu keeps **“Play offline”** as the default primary action. “Sign in / Create account”
  is secondary and skippable.
- Signed-in state shows the account/character name and a session badge; an expired session
  prompts re-authentication without discarding local UI state.
- Linking a guest profile is offered after sign-in with the preview from Section 4.
- Device management is reachable from account settings (list/revoke sessions).
- Offline startup remains unchanged: account UI is unavailable, and the offline profile is
  used. No blocking login wall.

### 14.2 Reuse

| Existing module | Reuse |
| --- | --- |
| `PlayerData` | Character projection shape; `id` becomes `characterId` in online mode |
| `SaveDataValidator`, `SaveMigrations`, `SaveDiagnostics` | Validate/migrate imported guest saves server-side |
| `SaveTransfer` envelope | Import container (server re-validates; never trusted as authority) |
| `GameSettings`, UI preferences | Local per-device preferences remain client-owned |
| `AdminAccessService` | Offline-only deterrent; not online authorization |
| `UI_STRINGS` | Account UI labels, localized independently of question content |
| `RoleManager` | UI mode selection; server roles are separate |

### 14.3 Redesign

| Area | Change |
| --- | --- |
| `player-1` hardcoded id | Persistent random `guestProfileId`; server-assigned `characterId` |
| Start menu | Add offline/account entry points, link flow, session-expired state |
| `PlayerSessionManager` | Guest-only local authority; online characters become server projections |
| Admin gate | Server authentication/RBAC replaces passcode for online capabilities |
| Save slots | Server characters plus local/offline slots need a clear ownership split |
| Analytics | Pseudonymous account linkage on the server; no PII in events |

## 15. Migration stages (each requires approval)

| Stage | Identity scope | Notes |
| --- | --- | --- |
| A | Stable local `guestProfileId` | Small offline change; enables clean import later |
| B | Optional accounts + cloud backup | Identity only; client remains gameplay authority; no ranked value |
| C | Server characters + sync | Requires Phase 30.3; account owns progress |
| D | Ranked/online modes | Full server authority (Phase 30.1 stages 2–4) |

Stage A should happen before any import feature so guest profiles can be correlated safely.
Stage B cannot make leaderboard claims without Stage C/D authority.

## 16. Open decisions

1. Authentication method (passkey-only, password + passkey, OAuth) — no provider selected.
2. Email verification requirement and email delivery mechanism.
3. Whether guest imports are eligible for any ranked/competitive content (default: no).
4. Account deletion grace period and what is purged.
5. Analytics retention period and whether events are tied to the account pseudonymously.
6. Minor/guardian consent and public-profile policy (legal review required).
7. One-active-device policy vs multiple concurrent sessions.
8. Session lifetimes and step-up window for admins.
9. Account export format and delivery (download vs email link).
10. Support process for lost credentials without exposing secrets.

## 17. Non-goals

- No authentication, session, account table, endpoint, or provider is implemented in this phase.
- No passwords are stored or transmitted in this design; no client-side credential verification.
- No backend, database, email service, or hosting vendor is selected or deployed.
- No change to offline saves, gameplay, questions, or balance.
- No social features (friends, chat, public profiles) are proposed here.
- No commitment to specific retention periods; those require a privacy/legal review.

## 18. Summary

Today the game has one anonymous local profile whose id is the literal `player-1`, no name
entry, and local-only roles. The proposed identity layer adds an optional server account that
owns opaque characters, with guest play untouched and import strictly consensual and validated.
Authentication is server-side only, sessions are short-lived and revocable, recovery never
reveals accounts, multi-device play is version-checked, and roles are enforced server-side with
audit logging. Existing save validation/migration/transfer modules are reused for import, while
the identity boundary — profile ids, start-menu flow, admin gate, and session ownership — is
redesigned in later, separately approved stages. Phase 30.3 (online save synchronization) is the
next design step.
