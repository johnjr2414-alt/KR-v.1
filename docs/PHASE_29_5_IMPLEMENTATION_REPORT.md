# Phase 29.5 — Production Build and Release Checklist

**Date**: 2026-11-09  
**Phase**: 29.5 (Handbook Section: Phase 29 — Release Readiness)  
**Status**: Completed — **no deployment and no publishing were performed.**

## 1. Objective

Inspect scripts, environment configuration, asset paths, deployment assumptions, PWA
configuration, and error logging; prepare a reproducible production build, version strategy,
release-notes template, deployment and rollback instructions, asset/license inventory, known
limitations, smoke-test checklist, save backup guidance, and a browser support statement.

## 2. Inspection Findings

### 2.1 Build and toolchain

- `package.json` had `dev`, `build` (`tsc && vite build`), `preview`, `typecheck`, and `test`,
  but no single release gate and no Node engine constraint. `.nvmrc` did not exist.
- `vite.config.ts` uses no environment variables, aliases `@` to `src`, keeps Phaser in a
  dedicated chunk, and builds with default source maps (off).
- The build is static and self-contained: no API endpoints, no server code, no secrets.
- Verified toolchain: Node 24.22.1, npm 11.19.1, Windows 10 x64. Lockfile (`package-lock.json`)
  is the dependency source of truth.

### 2.2 Versioning

- `package.json` (`version: 0.1.0`) and `src/constants.ts` (`GAME_VERSION`) both carried the
  version with no guard against drift.
- The start menu already displays `v{GAME_VERSION}`; `GAME_VERSION` is also written into
  question-bank exports as generator metadata.
- Save schema (`SAVE_DATA_SCHEMA_VERSION = 6`) and export format
  (`SAVE_EXPORT_FORMAT_VERSION = 1`) are independent namespaces.

### 2.3 Deployment assumptions

- `index.html` uses root-absolute paths (`/src/main.ts`, `/pwa-icon.svg`); the manifest uses
  `start_url: "/"`, `scope: "/"`; Workbox navigation fallback is `/index.html`.
- Therefore the artifact must be served from the **origin root over HTTPS**; sub-path hosting
  is unsupported without configuration changes and re-verification.
- `sw.js`, `index.html`, and the manifest must not be cached long-term while hashed assets can
  be immutable.

### 2.4 PWA configuration

- `vite-plugin-pwa` 2.0.0 with Workbox `generateSW`, `registerType: 'prompt'`.
- Generated `sw.js` contains 21 precache entries and only calls `skipWaiting()` inside the
  explicit `SKIP_WAITING` message handler; no `clientsClaim()`.
- The app registers the worker only when `import.meta.env.PROD` is true.

### 2.5 Assets and licensing

- The only static asset is `public/pwa-icon.svg` (project-authored). All gameplay visuals are
  drawn at runtime; all sound is synthesized with Web Audio oscillators; UI fonts are the OS
  system stack. No third-party art, audio, fonts, CDN scripts, or remote URLs.
- Runtime third-party code: Phaser 3.90.0 (MIT) and the Workbox 7.4.1 runtime (MIT) generated
  into `sw.js`. Build-only tools: Vite, `vite-plugin-pwa`, Vitest (MIT), TypeScript
  (Apache-2.0), `@types/node` (MIT).
- **Gap found:** no license notice shipped in `dist/`. Fixed by adding
  `public/THIRD_PARTY_NOTICES.txt`, which Vite copies to `/THIRD_PARTY_NOTICES.txt`.

### 2.6 Error logging

- 18 `console.error`/`console.warn` call sites cover session load/save failures, question-store
  bootstrap failures, admin errors, save-slot writes, and PWA registration.
- Logging is **console-only**: no telemetry, remote crash reporting, cookies, or PII
  collection. This is privacy-friendly but leaves field failures invisible to developers —
  recorded as a known limitation, not changed in this phase (no approved logging backend).

### 2.7 Save backup surface

- Saves live in IndexedDB (`knowledge-realms-save`, schema v6) with a separate question bank
  (`knowledge-realms-questions`).
- The Phase 28.2 export/import envelope and slot/backup storage methods are implemented and
  tested, but **no player-facing export button exists**. Backup guidance therefore documents
  operator-level profile/DevTools backups and flags the missing UI as a known gap.

## 3. Changes Applied

| File | Change |
| --- | --- |
| `package.json` | Added `engines.node: ">=20.19.0"` and a `verify` script (`typecheck` → tests → build). |
| `.nvmrc` (new) | Pins Node 24.22.1 for reproducible installs. |
| `public/THIRD_PARTY_NOTICES.txt` (new) | Ships Phaser and Workbox MIT notices in every build. |
| `tests/release/phase29_5_release.test.ts` (new) | 9 tests: version sync/semver/privacy, toolchain pin and lockfile, release gate script, start-menu version, production-only SW registration, root-path/no-external asset build, shipped notices, required checklist sections, independent save/export schema versions. |
| `scripts/verify-phase29-5.mjs` (new) | Static `dist/` audit (required files, no source maps, manifest fields, precache count, gated `skipWaiting`, no `clientsClaim`, bundled version, notices) plus CDP preview smoke test (start-menu version, save DB creation, SW control, offline reload, console cleanliness). |
| `docs/RELEASE_CHECKLIST.md` (new) | Release gate, reproducible build, version strategy, release-notes template, deployment requirements and steps, rollback procedure, asset/license inventory, known limitations, smoke-test checklist, save backup guidance, browser support statement. |
| `docs/PHASE_29_5_IMPLEMENTATION_REPORT.md` (new) | This report. |
| `docs/DEVELOPMENT_ROADMAP.md` | Phase 29.5 checked. |
| `docs/IMPLEMENTATION_REPORTS.md` | Consolidated Phase 29.5 entry. |

## 4. Verification

- **Automated tests (`npm test`)**: 88 test files, **1,207 tests passed**, 0 failures.
- **TypeScript (`npx tsc --noEmit`)**: 0 errors.
- **Production build (`npm run build`)**: succeeded; 24 files in `dist/`, 21 precache entries
  (1,963.23 KiB); Phaser chunk isolated (1,481.79 kB raw / 339.86 kB gzip).
- **Static artifact audit** (`scripts/verify-phase29-5.mjs`): required files present; 0 source
  maps; manifest name/start_url/scope/display correct; 21 precache entries; only the gated
  `SKIP_WAITING` call; no automatic client claim; version `0.1.0` present in the bundle;
  license notices present.
- **Production preview smoke (fresh Chrome 156 profile, `http://localhost:4173`)**:
  - start menu showed `v0.1.0`;
  - entering play created `knowledge-realms-save`;
  - after reload the page was controlled by the service worker (`controller !== null`);
  - with CDP offline emulation (`navigator.onLine === false`) a reload still served the start
    menu from the precache;
  - **0 console errors, 0 uncaught exceptions**.
- No public host was contacted and nothing was deployed.

## 5. Release Artifacts and Operator Instructions

All operator steps live in [`docs/RELEASE_CHECKLIST.md`](RELEASE_CHECKLIST.md):

- **Gate**: `npm ci && npm run verify` plus `node scripts/verify-phase29-5.mjs`.
- **Archive**: `dist/` as `knowledge-realms-<version>-<git-sha>.zip` with SHA-256.
- **Version bump**: update `package.json` and `src/constants.ts`; the drift test fails otherwise.
- **Deploy**: static HTTPS host at the origin root, SPA fallback to `/index.html`, correct MIME
  types, no-cache for `index.html`/`sw.js`/manifest.
- **Rollback**: redeploy the previous archived artifact; check save schema compatibility (v6)
  first; already-open clients only switch on the update prompt.

## 6. Limitations and Non-Claims

- **No deployment or publishing occurred**; no host was selected.
- Reproducibility was demonstrated for one toolchain (Node 24.22.1 / npm 11.19.1 / Windows).
  Byte-identical output across operating systems or npm versions was not tested.
- No code signing, SBOM generation, dependency vulnerability scan, or CI pipeline was added.
- Browser verification remains Chromium-only; Firefox/Safari and touch devices remain
  unverified (Phase 29.2 statement unchanged).
- The license inventory is based on installed package manifests and `LICENSE` files; authoring
  rights for bundled question content were not independently audited.
- Rollback across a save-schema change may make newer saves unreadable by the older build; the
  checklist requires a compatibility check first.
- Error logging remains console-only; no remote reporting exists.
- No player-facing save export UI exists; backup guidance is operator-level.
- Long-session memory/thermal behavior and real storage-quota exhaustion remain unverified.

## 7. Next Phase

Phase 30 is design-only (online architecture proposals) and must not implement multiplayer,
authentication, or a backend without explicit approval. Phase 29.5 was the final release-readiness
sub-phase; further action requires operator approval to deploy.
