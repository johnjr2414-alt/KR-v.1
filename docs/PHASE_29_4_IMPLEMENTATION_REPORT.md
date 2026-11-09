# Phase 29.4 — Accessibility, Localization Readiness, and UX Review

**Date**: 2026-11-09  
**Handbook Section**: Phase 29 — Release Readiness  
**Status**: Completed — desktop Chromium verified; screen-reader, RTL, and high-contrast OS modes
are **not claimed**.

## 1. Audit Findings

The review covered DOM overlays in `src/ui/`, the PWA notice, Phaser scene text, stylesheets, and
question rendering.

| Area | Finding |
| --- | --- |
| Shared accessibility stylesheet | `src/ui/accessibility.css` defined focus rings, reduced motion, and responsive rules but **was never imported** (only by the unused `src/ui/index.ts` barrel). Its rules were dead code in production. |
| Text sizing | 221 `font-size` declarations in `px`/`rem`; no way to enlarge UI text. |
| String literals | Player-facing labels were spread across components (~42 direct `textContent` writes plus markup templates); several dialogs interpolated numbers with `(s)` placeholders. |
| Keyboard focus | Global `:focus-visible` rule existed but was inactive; five stylesheets removed outlines for inputs (some replaced with custom focus styles). |
| Contrast | Muted colors such as `#64748b` (3.07:1 on `#1e293b`), `#505068`, `#606080`, and `#707088` failed WCAG AA for normal text; the start-menu version/disclaimer/admin link were the worst. |
| Reduced motion | CSS animations honored the preference only in the dead stylesheet; Phaser idle bobbing, attack lunges, and hurt flashes ignored it. |
| Long strings | No wrap/ellipsis policy for player or monster names; a long localized label could widen or clip overlays. |
| Localization | Number displays used raw string interpolation; UI text was mixed with authored question/dialogue content. |
| Question content | Educational questions, choices, explanations, and NPC dialogue remain authored content; no factual text was changed. |

## 2. Implementation

### 2.1 Centralized UI strings
- New `src/ui/strings.ts`:
  - `UI_STRINGS` with namespaces `common`, `startMenu`, `hud`, `battle`, `pause`, `npcDialogue`,
    and `notices`.
  - `formatUiString(template, values)` for `{placeholder}` substitution without concatenation.
  - `formatUiNumber(value, locale?)` using `Intl.NumberFormat`, defaulting to the document language.
- Migrated: start menu, exploration HUD (including number grouping), battle overlay and summary,
  pause/settings/controls/confirm-exit views, NPC dialogue actions, inventory Equip/Unequip, save
  recovery notice, and PWA update/offline notices.
- Educational content stays outside this table. The test suite asserts that the table contains no
  question text or multiple-choice content and that question/dialogue data is untouched.

### 2.2 Font scaling
- `src/ui/preferences/UiPreferences.ts`:
  - Supported scales: Standard (1.0), Large (1.15), Extra Large (1.3).
  - Persists to `localStorage` key `kr.ui.textScale`; corrupt or blocked storage falls back safely.
  - Applies `--kr-font-scale` on the document root.
- Applied at startup in `src/main.ts` before the game is created.
- Pause → Settings now offers a labelled “Text Size” selector; changes apply immediately and survive
  reloads. Device preference is intentionally not part of the character save.
- All 20 UI/pwa stylesheets now express font sizes as
  `calc(<size> * var(--kr-font-scale, 1))`; inherited controls (`select`, etc.) scale from a scaled
  `body` base size.
- Modal cards gained viewport-bounded height/scroll so Extra Large text cannot push content off-screen.

### 2.3 Focus, contrast, wrapping, and motion
- `src/ui/accessibility.css` is now imported from `src/main.ts`, activating:
  - universal `:focus-visible` outlines (2 px, offset 2 px) for buttons, inputs, selects, textareas,
    and focusable elements;
  - reduced-motion rules for DOM animations/transitions and hover lifts;
  - responsive HUD/modal rules.
- Muted text colors were raised to AA-compliant values; e.g. `#64748b` → `#94a3b8` (3.07:1 → 5.71:1
  on `#1e293b`), `#505068` → `#9a9ab0`, `#606080` → `#94a3b8`, `#8080a0` → `#a0a0c0`,
  `#f43f5e` → `#fb7185`. Button text on gold/green surfaces was left unchanged.
- `body`, form controls, and labels use `overflow-wrap: break-word`; player/monster names ellipsize
  in the HUD instead of widening the layout.
- Pause modal exposes `role="dialog"`, `aria-modal="true"`, and a labelled title; volume labels are
  now associated with their sliders.
- Phaser respects reduced motion: `prefersReducedMotion()` (`src/ui/motion.ts`) skips monster idle
  bobbing, attack lunge/scale tweens, and hurt flashes while keeping damage text and combat state.

### 2.4 Localization readiness
- Sentence templates use named placeholders, so translations can reorder `{current}` and `{total}`.
- Numbers use `Intl.NumberFormat`; labels are associated with controls; the pause back button no
  longer uses an inline fixed `font-size`.
- One English table is shipped; adding a language means providing an alternate table with the same
  shape. Questions and dialogue are deliberately not routed through UI translation.

## 3. Files Created and Modified

**New files**
- `src/ui/strings.ts` — centralized UI text and formatting helpers.
- `src/ui/preferences/UiPreferences.ts` — text-scale preference load/save/apply.
- `src/ui/motion.ts` — reduced-motion query for Phaser effects.
- `tests/ui/phase29_4_accessibility.test.ts` — 13 tests.
- `scripts/verify-phase29-4.mjs` — CDP text-scale/focus/wrapping/reduced-motion verification.
- `docs/PHASE_29_4_IMPLEMENTATION_REPORT.md` — this report.

**Modified files**
- `src/main.ts` — applies the text scale and imports the shared accessibility stylesheet.
- `src/ui/start-menu/StartMenu.ts`, `src/ui/exploration-hud/ExplorationHUD.ts`,
  `src/ui/battle-overlay/BattleOverlay.ts`, `src/ui/pause-modal/PauseModal.ts`,
  `src/ui/npc-dialogue/NPCDialogueModal.ts`, `src/ui/inventory-panel/InventoryPanel.ts`,
  `src/ui/save-recovery/SaveRecoveryNotice.ts`, `src/pwa/UpdateNotice.ts` — shared strings,
  localized numbers, text-size control, dialog semantics.
- `src/scenes/monsters/MonsterSprite.ts`, `src/scenes/BattleScene.ts` — reduced-motion guards.
- `src/ui/accessibility.css` — scale token, base sizing, wrapping/ellipsis, reduced-motion hover rule.
- 20 stylesheets under `src/ui/` and `src/pwa/` — scalable font sizes, contrast fixes, pause select
  and back-button styles.
- `docs/DEVELOPMENT_ROADMAP.md`, `docs/IMPLEMENTATION_REPORTS.md`.

## 4. Verification

### 4.1 Automated checks (13 new tests)
- UI namespaces present and non-empty; no question/choice content in the string table.
- Placeholder substitution; unknown placeholders preserved; `Intl` grouping.
- Scale normalization (snapping, non-finite input), labels, persistence, apply, corrupt/blocked
  storage.
- Entry point imports the accessibility stylesheet; focus/reduced-motion/wrapping tokens exist.
- Every stylesheet font size routes through `--kr-font-scale`; previously audited low-contrast text
  colors are absent.
- Reduced-motion helper returns `false` without `matchMedia`.

Full suite:
- **`npm test`**: 87 files passed, **1,198 tests**, 0 failures.
- **`npx tsc --noEmit`**: 0 errors.
- **`npm run build`**: succeeded; PWA precache 21 entries (1,963.23 KiB).

### 4.2 Headless Chrome (fresh profile, production preview)

| Check | Result |
| --- | --- |
| Defaults | `--kr-font-scale: 1`, title/select 16 px, no stored preference |
| Select Extra Large | scale `1.3`, title and select 20.8 px, stored `1.3` |
| Layout at 130% | no horizontal page overflow; pause card fits the viewport |
| Persistence | reload restores scale `1.3`; start-menu button renders at 20.8 px |
| Keyboard focus | focused select matches `:focus-visible` with a 2 px solid outline |
| Long string | 160-character player name produces no horizontal overflow (764/764 px) |
| Reduced motion | emulated preference matches; transition duration collapses to ~0.00001 s |
| Console errors / uncaught exceptions | None |

Reproduce:

```bash
npm.cmd run build
npm.cmd run preview -- --port 4173 --strictPort
"C:/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu \
  --remote-debugging-port=9224 --user-data-dir="<fresh-temp-profile>" about:blank
node scripts/verify-phase29-4.mjs
```

## 5. Limitations and Non-Claims

- **English only**: no translated string pack, language selector, or locale negotiation is shipped.
  The structure is ready for an alternate table, but layout was not validated in German-length or
  RTL/Arabic text.
- **Authored content is separate**: question text, choices, explanations, and NPC dialogue are not
  translated, and the UI scale does not affect Phaser-rendered canvas dialog text.
- **Partial text centralization**: the Super Admin dashboard and some data-driven labels (item,
  quest, monster names) still carry their own text; these are admin or content surfaces, not the
  primary player loop.
- **Focus management**: focus rings are global, and the pause modal has dialog semantics, but focus
  is not trapped inside every modal and no real screen-reader session was run.
- **No OS high-contrast/forced-colors mode, browser text-only zoom, or mobile layout test** was
  performed in this phase.
- No deployment or publishing occurred; Phase 29.5 owns release checks.
