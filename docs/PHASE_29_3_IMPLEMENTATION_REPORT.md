# Phase 29.3 — PWA / Offline Installation and Update Behavior

**Date**: 2026-11-09  
**Handbook Section**: Phase 29 — Release Readiness  
**Status**: Completed — desktop Chromium verified; OS-level install UI and non-Chromium browsers
are explicitly **not claimed**.

## 1. Pre-Implementation Audit

| Surface | Finding |
| --- | --- |
| `vite.config.ts` | No PWA plugin, no manifest, no service worker. Only the Phaser `manualChunks` split. |
| `index.html` | No manifest link, theme color, icon, or description. |
| Build output | Static `dist/` with hashed lazy scene chunks; no runtime data/API calls. |
| Storage | Player saves and question banks live in IndexedDB (`knowledge-realms-save`, `knowledge-realms-questions`); they are not network resources. |
| Asset loading | All gameplay assets are bundled by Vite; the game makes no external requests after load. |
| Browser assumptions | Production build is served over HTTP(S); the service worker requires a secure context (`localhost` counts). |

Because no PWA existed, a maintained plugin was evaluated before implementation. The project already
uses Vite 6; `vite-plugin-pwa@2.0.0` (Workbox 7 `generateSW`) is the compatible, maintained option and
was added as a **build-time devDependency**. It adds no runtime dependency to the game bundle.

## 2. Implementation

### 2.1 Manifest and icon
- `src/pwa/pwaConfig.ts` defines the manifest:
  - `name`: Knowledge Realms, `short_name`: KR Realms, education/games categories.
  - `display`: `standalone`, `orientation`: `landscape`, `start_url`/`scope`: `/`.
  - `theme_color`: `#1a1a2e`, `background_color`: `#0e0e12`.
  - Icons: `/pwa-icon.svg` declared twice, `purpose: "any"` and `"maskable"`.
- `public/pwa-icon.svg` is a 512×512 vector icon (dark rounded tile, gold border, open book, blue
  bookmark, gold sparkle); the artwork stays inside the maskable safe zone.
- `index.html` now declares the manifest link (injected by the plugin), `theme-color`, description,
  and an SVG favicon.
- `src/vite-env.d.ts` references `vite-plugin-pwa/client` for the virtual registration module.

### 2.2 Service worker caching policy
`generateSW` precaches **only build artifacts** matching
`**/*.{js,css,html,svg,png,json,woff2}` (21 entries, 1,949.17 KiB in the verified build), including the
lazy gameplay/admin scene chunks. Policy choices:

- `navigateFallback: '/index.html'` with Workbox's `NavigationRoute`, so an offline deep link or reload
  returns the app shell instead of a browser error page.
- `cleanupOutdatedCaches: true` removes stale precaches after activation.
- `maximumFileSizeToCacheInBytes`: 3 MiB, enough for the Phaser vendor chunk while still rejecting
  accidental large additions.
- **No runtime caching**: admin dashboards, question banks, and player saves are never stored as HTTP
  responses. They remain authoritative in IndexedDB and are read live, so a stale service-worker cache
  cannot serve outdated questions or admin data.
- `registerType: 'prompt'` with `injectRegister: null`; registration is explicit and production-only
  (`import.meta.env.PROD`), keeping `vite dev` free of service-worker interference.

### 2.3 Update behavior
- `skipWaiting: false` and `clientsClaim: false`. A newly deployed service worker installs and waits;
  it never activates under a running game.
- `src/pwa/registerServiceWorker.ts` registers via `virtual:pwa-register`, shows a banner when a new
  version is waiting, and checks for updates hourly while the tab is open.
- “Save & Reload” first awaits `playerSessionManager.saveSession()` and only then sends
  `SKIP_WAITING`, so an active session is persisted before the new assets take over. “Later” dismisses
  the banner without activating the waiting worker.
- The banner is a DOM overlay (`src/pwa/UpdateNotice.ts`, `src/pwa/update-notice.css`) outside the
  Phaser canvas, with `role="status"`, `aria-live="polite"`, focus-visible styling, and reduced-motion
  handling.

### 2.4 Offline-ready notice and storage caveat
On first install the game shows “Ready to play offline. Your browser may clear offline data if storage
is reclaimed.” for six seconds. This deliberately avoids claiming permanent storage: browsers may evict
IndexedDB and cache storage under quota pressure or when the user clears site data.

## 3. Files Created and Modified

**New files**
- `src/pwa/pwaConfig.ts` — manifest, precache patterns, Workbox options, update interval.
- `src/pwa/registerServiceWorker.ts` — registration, update prompt, hourly checks.
- `src/pwa/UpdateNotice.ts`, `src/pwa/update-notice.css` — update/offline banners.
- `public/pwa-icon.svg` — maskable/any SVG app icon.
- `tests/pwa/phase29_3_pwa.test.ts` — 5 policy tests.
- `scripts/verify-phase29-3.mjs` — CDP install/offline/update/save verification.
- `docs/PHASE_29_3_IMPLEMENTATION_REPORT.md` — this report.

**Modified files**
- `vite.config.ts` — `VitePWA` with `generateSW`, prompt mode, explicit registration, Workbox options.
- `package.json` / `package-lock.json` — `vite-plugin-pwa` devDependency.
- `index.html` — theme color, description, SVG icon (manifest link injected at build time).
- `src/vite-env.d.ts` — PWA client types.
- `src/main.ts` — production-only service-worker registration after game creation.
- `docs/DEVELOPMENT_ROADMAP.md`, `docs/IMPLEMENTATION_REPORTS.md` — Phase 29.3 status.

## 4. Verification

### 4.1 Automated checks
- **Policy tests** (`tests/pwa/phase29_3_pwa.test.ts`, 5 tests): manifest identity/display/colors;
  `any` + `maskable` SVG icons; precache covers js/css/html/svg and does not use an unrestricted
  `**/*`; `skipWaiting`/`clientsClaim` false with `cleanupOutdatedCaches` true and no `runtimeCaching`;
  hourly update interval.
- **Automated tests (`npm test`)**: 86 files passed, 1,185 tests, 0 failures.
- **TypeScript (`npx tsc --noEmit`)**: 0 errors.
- **Production build (`npm run build`)**: succeeded; PWA reports 21 precache entries (1,949.17 KiB),
  generating `dist/sw.js`, `dist/manifest.webmanifest`, and `dist/workbox-*.js`.

### 4.2 Headless Chrome end-to-end (`scripts/verify-phase29-3.mjs`)
Fresh Chrome profile, production build served by `vite preview` on `http://localhost:4173`:

| Check | Result |
| --- | --- |
| Manifest discoverable/fetchable | Yes — `200`, `name: Knowledge Realms`, `display: standalone`, 2 icons |
| DevTools manifest errors / installability errors | `[]` / `[]` |
| First install | Worker active; precache 21 entries; offline-ready banner observed |
| Reload | Page controlled by `/sw.js`; no waiting worker |
| Offline reload (`navigator.onLine === false`) | Start menu and HUD loaded; precache intact |
| Save across offline reload | `knowledge-realms-save` present, schema v6, `savedAt` unchanged |
| Update simulation (modified `dist/sw.js`) | Waiting worker + update banner (`waiting: true`) |
| “Save & Reload” | Save timestamp advanced, page reloaded, `waiting: false`, banner removed |
| Console errors / uncaught exceptions | None |

The update test mutates the built `dist/sw.js`; a clean `npm run build` was rerun afterwards, so the
committed production output contains no test marker.

Reproduce:

```bash
npm.cmd run build
npm.cmd run preview -- --port 4173 --strictPort
"C:/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu \
  --remote-debugging-port=9223 --user-data-dir="<fresh-temp-profile>" about:blank
node scripts/verify-phase29-3.mjs
```

## 5. Dependency and Security Review

`npm audit` reports 9 advisories (2 critical, 5 moderate, 2 low), all in the dev/build toolchain:

- Pre-existing dev-only: `vitest`/`@vitest/mocker`/`tinypool` (critical), `deepmerge`, `glob`,
  `minimatch`.
- Added by `vite-plugin-pwa`: `workbox-build` → `@rollup/plugin-node-resolve`, `glob`, `minimatch`
  (moderate, build-time only).

None ship in the production bundle or handle untrusted runtime input. `npm audit fix --force` was not
run because it would force breaking major upgrades of Vitest; the advisories are documented for Phase
29.5 rather than silently suppressed.

## 6. Limitations and Non-Claims

- **OS install automation not tested**: the manifest is installable in Chromium (zero installability
  errors), but this phase did not automate the browser's install prompt, A2HS UI, or a standalone
  window launch.
- **No permanent-storage guarantee**: `navigator.storage.persist()` was not requested, and the UI
  explicitly warns that browsers can clear offline data. Saves remain best-effort.
- **No background sync, push, or periodic sync**; the game is offline-capable but not a background
  service.
- **Firefox and Safari** were not tested. Safari has different SVG icon and install behavior (iOS
  requires a PNG `apple-touch-icon`), so installability is claimed for Chromium only.
- **No deployment/publishing** was performed; Phase 29.5 owns hosting, versioning, and release checks.
- Offline reload was verified with cached assets already present; first-ever load still requires a
  network connection.
