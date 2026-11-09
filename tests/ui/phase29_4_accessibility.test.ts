import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { formatUiNumber, formatUiString, UI_STRINGS } from '../../src/ui/strings';
import {
  applyTextScale,
  DEFAULT_TEXT_SCALE,
  loadTextScale,
  normalizeTextScale,
  saveTextScale,
  TEXT_SCALE_OPTIONS,
  textScaleLabel,
  type TextScaleRoot,
  type TextScaleStorage,
} from '../../src/ui/preferences/UiPreferences';
import { prefersReducedMotion } from '../../src/ui/motion';

function collectCss(dir: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files.push(...collectCss(path));
    else if (name.endsWith('.css')) files.push(path);
  }
  return files;
}

function createStorage(initial: Record<string, string> = {}): TextScaleStorage & {
  values: Record<string, string>;
} {
  const values = { ...initial };
  return {
    values,
    getItem: (key) => (key in values ? values[key] : null),
    setItem: (key, value) => {
      values[key] = value;
    },
  };
}

describe('Phase 29.4 — centralized UI strings', () => {
  it('exposes every UI namespace with non-empty text', () => {
    expect(Object.keys(UI_STRINGS).sort()).toEqual([
      'battle',
      'common',
      'hud',
      'notices',
      'npcDialogue',
      'pause',
      'startMenu',
    ]);
    for (const namespace of Object.values(UI_STRINGS)) {
      for (const text of Object.values(namespace)) {
        expect(typeof text).toBe('string');
        expect(text.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('keeps educational content out of the UI string table', () => {
    const serialized = JSON.stringify(UI_STRINGS).toLowerCase();
    expect(Object.keys(UI_STRINGS)).not.toContain('questions');
    expect(serialized).not.toContain('question text');
    expect(serialized).not.toContain('multiple choice');
  });

  it('fills placeholders and leaves unknown placeholders intact', () => {
    expect(
      formatUiString(UI_STRINGS.battle.questionProgress, { current: 2, total: 5 }),
    ).toBe('Question 2 of 5');
    expect(formatUiString('Hello {name}', { name: 'Aria' })).toBe('Hello Aria');
    expect(formatUiString('Hello {unknown}')).toBe('Hello {unknown}');
  });

  it('formats numbers with locale grouping', () => {
    expect(formatUiNumber(1234567)).toBe('1,234,567');
    expect(formatUiNumber(1234.5, 'en-US')).toBe('1,234.5');
  });
});

describe('Phase 29.4 — text scaling preference', () => {
  it('snaps arbitrary values to supported scales', () => {
    expect(TEXT_SCALE_OPTIONS).toEqual([1, 1.15, 1.3]);
    expect(normalizeTextScale(1.02)).toBe(1);
    expect(normalizeTextScale(1.12)).toBe(1.15);
    expect(normalizeTextScale(2)).toBe(1.3);
    expect(normalizeTextScale(Number.NaN)).toBe(DEFAULT_TEXT_SCALE);
    expect(normalizeTextScale(Number.POSITIVE_INFINITY)).toBe(DEFAULT_TEXT_SCALE);
  });

  it('labels each scale through the shared string table', () => {
    expect(textScaleLabel(1)).toBe(UI_STRINGS.pause.textSizeStandard);
    expect(textScaleLabel(1.15)).toBe(UI_STRINGS.pause.textSizeLarge);
    expect(textScaleLabel(1.3)).toBe(UI_STRINGS.pause.textSizeExtraLarge);
  });

  it('persists, loads, and applies the preference', () => {
    const storage = createStorage();
    saveTextScale(1.3, storage);
    expect(storage.values['kr.ui.textScale']).toBe('1.3');
    expect(loadTextScale(storage)).toBe(1.3);

    const applied: Record<string, string> = {};
    const root: TextScaleRoot = {
      style: { setProperty: (name, value) => { applied[name] = value; } },
    };
    applyTextScale(1.1, root);
    expect(applied['--kr-font-scale']).toBe('1.15');
  });

  it('falls back safely when storage is corrupt or unavailable', () => {
    expect(loadTextScale(createStorage({ 'kr.ui.textScale': 'huge' }))).toBe(
      DEFAULT_TEXT_SCALE,
    );
    expect(loadTextScale(null)).toBe(DEFAULT_TEXT_SCALE);
    const throwing: TextScaleStorage = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    };
    expect(loadTextScale(throwing)).toBe(DEFAULT_TEXT_SCALE);
    expect(() => saveTextScale(1.3, throwing)).not.toThrow();
  });
});

describe('Phase 29.4 — accessibility stylesheets', () => {
  const cssFiles = [
    ...collectCss('src/ui'),
    'src/pwa/update-notice.css',
  ];

  it('loads the shared accessibility stylesheet from the app entry point', () => {
    const main = readFileSync('src/main.ts', 'utf8');
    expect(main).toContain("import './ui/accessibility.css'");
  });

  it('ships focus, reduced-motion, wrapping, and scaling tokens', () => {
    const css = readFileSync('src/ui/accessibility.css', 'utf8');
    expect(css).toContain('--kr-font-scale');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('overflow-wrap: break-word');
  });

  it('routes every stylesheet font size through the scale variable', () => {
    const unscaled: string[] = [];
    for (const file of cssFiles) {
      const css = readFileSync(file, 'utf8');
      for (const match of css.matchAll(/font-size:\s*[^;]+;/g)) {
        if (!match[0].includes('var(--kr-font-scale')) unscaled.push(`${file}: ${match[0]}`);
      }
    }
    expect(unscaled).toEqual([]);
  });

  it('does not use previously audited low-contrast text colors', () => {
    const banned = new Set([
      '#64748b',
      '#718096',
      '#606080',
      '#6f7fa8',
      '#8080a0',
      '#707088',
      '#505068',
      '#40405a',
      '#8a6aa8',
      '#f43f5e',
      '#9f7aea',
    ]);
    const violations: string[] = [];
    for (const file of cssFiles) {
      const css = readFileSync(file, 'utf8');
      for (const match of css.matchAll(/(?<!-)\bcolor:\s*(#[0-9a-fA-F]{6});/g)) {
        if (banned.has(match[1].toLowerCase())) violations.push(`${file}: ${match[1]}`);
      }
    }
    expect(violations).toEqual([]);
  });
});

describe('Phase 29.4 — reduced motion helper', () => {
  it('reports false when matchMedia is unavailable', () => {
    expect(prefersReducedMotion()).toBe(false);
  });
});
