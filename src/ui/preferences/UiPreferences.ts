import { UI_STRINGS } from '../strings';

/** Player-selectable UI text scales. Values map to the `--kr-font-scale` CSS variable. */
export const TEXT_SCALE_OPTIONS = [1, 1.15, 1.3] as const;
export type TextScale = (typeof TEXT_SCALE_OPTIONS)[number];
export const DEFAULT_TEXT_SCALE: TextScale = 1;

const STORAGE_KEY = 'kr.ui.textScale';

/** Structural storage so preferences stay testable without a DOM. */
export interface TextScaleStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Structural root element so the preference can be applied without a DOM in tests. */
export interface TextScaleRoot {
  style: { setProperty(name: string, value: string): void };
}

/** Snaps arbitrary input to the nearest supported scale (invalid input → default). */
export function normalizeTextScale(value: number): TextScale {
  if (!Number.isFinite(value)) return DEFAULT_TEXT_SCALE;
  return TEXT_SCALE_OPTIONS.reduce<TextScale>(
    (best, option) => (Math.abs(option - value) < Math.abs(best - value) ? option : best),
    DEFAULT_TEXT_SCALE,
  );
}

export function textScaleLabel(scale: number): string {
  const normalized = normalizeTextScale(scale);
  if (normalized === 1.3) return UI_STRINGS.pause.textSizeExtraLarge;
  if (normalized === 1.15) return UI_STRINGS.pause.textSizeLarge;
  return UI_STRINGS.pause.textSizeStandard;
}

function safeStorage(): TextScaleStorage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function loadTextScale(storage: TextScaleStorage | null = safeStorage()): TextScale {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (raw === null || raw === undefined || raw === '') return DEFAULT_TEXT_SCALE;
    return normalizeTextScale(Number(raw));
  } catch {
    return DEFAULT_TEXT_SCALE;
  }
}

export function saveTextScale(
  scale: number,
  storage: TextScaleStorage | null = safeStorage(),
): void {
  try {
    storage?.setItem(STORAGE_KEY, String(normalizeTextScale(scale)));
  } catch {
    // Private-mode or quota failures must not block gameplay.
  }
}

function defaultRoot(): TextScaleRoot | null {
  return typeof document !== 'undefined' ? document.documentElement : null;
}

export function applyTextScale(scale: number, root: TextScaleRoot | null = defaultRoot()): void {
  root?.style.setProperty('--kr-font-scale', String(normalizeTextScale(scale)));
}
