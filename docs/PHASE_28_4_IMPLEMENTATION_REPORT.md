# Phase 28.4 — Super Admin Protection

**Date**: 2026-11-09  
**Phase**: 28.4 (Handbook Section: Phase 28 — Save Integrity and Administration Hardening)  
**Status**: Completed

## 1. Executive Summary

Phase 28.4 removes the **accidental** path into Super Admin tools and adds proportionate local
safeguards. Previously the start menu presented a prominent, unauthenticated “Enter as Super Admin”
button next to the normal play button.

This phase adds:

- A **single primary start-menu action** (Enter as User). Admin access is now a deliberately subtle
  secondary link and a `Ctrl/Cmd+Shift+A` shortcut.
- A **local admin gate** (`AdminAccessService` + `AdminAccessDialog`) with two modes:
  - **passcode**: an operator may supply a SHA-256 hash of their own passcode at build time; no
    password is hardcoded in the client;
  - **acknowledgement**: with no hash configured, the user must type `LOCAL ADMIN` to confirm they
    understand the gate is not secure.
- **Failed-attempt lockout**: five failed entries trigger a 30-second cooldown.
- **Defence in depth**: `AdminDashboardScene` refuses to render unless `roleManager.isSuperAdmin()`.
- A **local-only security warning** on both the gate and the admin dashboard.
- A **pre-restore backup** so that a full-bank restore can itself be reverted.

This is **not authentication**. Everything shipped to the browser can be inspected or bypassed; the
gate exists to prevent normal-flow accidents, not deliberate tampering. Real security requirements are
documented in §5.

No save or question schema changes were introduced.

## 2. Files Created and Modified

- **New Files**:
  - `src/config/adminAccessConfig.ts` — gate configuration, SHA-256 hash normalization, the local-only
    warning text, and the optional `VITE_ADMIN_PASSCODE_HASH` reader. No default credential.
  - `src/core/roles/AdminAccessService.ts` — headless gate logic: two modes, attempt counting,
    cooldown lockout, injectable clock/hasher, and a Web Crypto SHA-256 helper.
  - `src/ui/admin-access/` — `AdminAccessDialog` component, CSS, and index. Messages are inserted with
    `textContent`; Cancel/Escape/backdrop close the gate without disturbing the start menu.
  - `src/vite-env.d.ts` — Vite client environment typings.
  - `tests/admin/phase28_4_admin_protection.test.ts` (16 tests).
  - `docs/PHASE_28_4_IMPLEMENTATION_REPORT.md` (this file).
- **Modified Files**:
  - `src/ui/start-menu/StartMenu.ts` — pure `buildStartMenuMarkup()`, one primary user action, subtle
    admin link, keyboard shortcut, listener cleanup. `start-menu.css` restyled accordingly.
  - `src/scenes/BootScene.ts` — owns the gate service/dialog, starts the user session directly, and
    enters the admin scene only after a granted decision.
  - `src/scenes/AdminDashboardScene.ts` — Super Admin role guard with a redirect to `BootScene`.
  - `src/ui/admin/AdminDashboard.ts` — local-only warning banner; pre-restore backup and updated
    restore message/continue-to-revert behavior. `admin-dashboard.css` adds the banner style.
  - `src/core/roles/index.ts`, `src/ui/index.ts`, `src/ui/start-menu/index.ts` — exports.
  - `docs/DEVELOPMENT_ROADMAP.md`, `docs/IMPLEMENTATION_REPORTS.md`.

## 3. Design

### 3.1 Avoiding accidental access
The start menu now renders exactly one primary button (`Enter as User`). Admin entry is a muted, small
link below the disclaimer, plus `Ctrl/Cmd+Shift+A`. Clicking either opens the gate overlay while the
start menu stays visible behind it; closing the gate leaves the player exactly where they were.

### 3.2 Configurable local gate without hardcoded credentials
`DEFAULT_ADMIN_ACCESS_CONFIG.passcodeHash` is `null`, so the repository never ships a usable password.
To configure a passcode, an operator sets `VITE_ADMIN_PASSCODE_HASH` to the SHA-256 hex digest of their
chosen passcode at build time, for example:

```bash
node -e "console.log(require('crypto').createHash('sha256').update('your passcode').digest('hex'))"
```

A hash is still present in the client bundle and can be brute-forced offline, which is why the gate is
described as local protection only. With no hash, the gate requires typing `LOCAL ADMIN` exactly
(whitespace-trimmed, case-sensitive) — an explicit acknowledgement rather than a secret.

### 3.3 Attempts and cooldown
Failures are counted in memory. Five failures set `lockedUntil = now + 30s`; every submission during
the lock is refused with `reason: 'locked'`. Expiry resets the counter. Empty input is rejected without
consuming an attempt, and a hashing failure (e.g. missing Web Crypto) reports `unavailable` without
locking. A successful entry clears the counter. Reloading the page resets the state, which is
acceptable for a non-authenticating local gate.

### 3.4 Defence in depth
The gate is the only intended route to admin tools, but `AdminDashboardScene.create()` independently
checks `roleManager.isSuperAdmin()` and returns to `BootScene` otherwise. This prevents accidental
navigation (for example, a stale scene key) from rendering admin tools in a normal user session.

### 3.5 Admin operations and destructive actions
Existing safeguards remain in place and are now complemented by the pre-restore snapshot:

- `QuestionManager` validates every create, update, import, and restore through `QuestionValidator`
  before anything is stored; imports and restores are all-or-nothing.
- Deleting a question requires an explicit confirmation dialog.
- Import takes a full in-memory backup via `createBackup()` before applying the batch.
- Restoring a backup now takes a full in-memory backup of the **current** bank first, then reports that
  the previous state can be restored with the same button.
- The dashboard displays a permanent local-only warning banner.

### 3.6 Documented limitations
The warning text is shown at both entry points, and the report below records what must change if real
security is required.

## 4. Verification & Test Results

`tests/admin/phase28_4_admin_protection.test.ts` (**16 tests**) covers:

- **Configuration** — no default passcode; warning wording; SHA-256 hex normalization; env/override
  resolution and explicit `null` forcing acknowledgement mode.
- **Acknowledgement mode** — exact phrase with trimming, case sensitivity, empty input without penalty,
  lockout at the attempt cap, refusal during the cooldown, post-cooldown recovery, and counter reset on
  success.
- **Passcode mode** — injected-hasher verification and input trimming, wrong-passcode counting, hasher
  failure without lockout, and the default SHA-256 digest for a known vector.
- **Entry points and defence in depth** — the start menu exposes only the user role as a primary
  action, admin access is a secondary link, and a non-admin role is never treated as Super Admin.

- **Automated Tests (`npm test`)**: 82 test files passed (**1146 passed, 0 failures**). The Phase 28.4
  suite contributes 16 tests.
- **TypeScript Check (`npx tsc --noEmit`)**: 0 errors.
- **Production Build (`npm run build`)**: Succeeded (`tsc && vite build`).

## 5. Future Server-Side Authentication Requirements

A client-side gate cannot provide real security. When Knowledge Realms gains a shared or hosted
content pipeline, the following must be implemented server-side:

1. **Authentication** — an identity provider or first-party login issuing an HTTP-only session or
   short-lived signed token.
2. **Authorization** — every admin mutation endpoint checks the caller's role and resource scope
   server-side; client role state is advisory only.
3. **Server-side validation** — the server re-validates every question, import, and restore against
   the canonical schema and rejects unsupported versions.
4. **Audit logging** — record actor identity, action, target ids, timestamp, and before/after hashes for
   destructive and bulk operations.
5. **Transport and request hardening** — HTTPS, CSRF protection for cookie-based sessions, request size
   limits, and rate limiting on authentication and mutation endpoints.
6. **Secret management** — credentials and signing keys live server-side; no passcode or hash in the
   client bundle is treated as a secret.
7. **Recovery controls** — server-side backups with retention policy and a reviewed restore procedure.

## 6. Out of Scope

Import/export compatibility and content versioning (28.5) remain for their own subphase. No deployment,
publishing, or server infrastructure was added.
