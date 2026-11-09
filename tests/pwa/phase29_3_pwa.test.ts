import { describe, it, expect } from 'vitest';
import {
  APP_MANIFEST,
  PRECACHE_GLOB_PATTERNS,
  PWA_MAX_CACHE_FILE_BYTES,
  PWA_NAVIGATE_FALLBACK,
  PWA_WORKBOX_OPTIONS,
  UPDATE_CHECK_INTERVAL_MS,
} from '../../src/pwa/pwaConfig';

describe('Phase 29.3 — PWA configuration', () => {
  it('defines a valid standalone app manifest', () => {
    expect(APP_MANIFEST.name).toBe('Knowledge Realms');
    expect(APP_MANIFEST.short_name).toBeTruthy();
    expect(APP_MANIFEST.description).toBeTruthy();
    expect(APP_MANIFEST.start_url).toBe('/');
    expect(APP_MANIFEST.scope).toBe('/');
    expect(APP_MANIFEST.display).toBe('standalone');
    expect(APP_MANIFEST.orientation).toBe('landscape');
    expect(APP_MANIFEST.background_color).toBe('#0e0e12');
    expect(APP_MANIFEST.theme_color).toBe('#1a1a2e');
  });

  it('provides a scalable icon for both any and maskable purposes', () => {
    const icons = APP_MANIFEST.icons ?? [];
    expect(icons.length).toBeGreaterThanOrEqual(2);
    for (const icon of icons) {
      expect(icon.src).toBe('/pwa-icon.svg');
      expect(icon.sizes).toBe('any');
      expect(icon.type).toBe('image/svg+xml');
    }
    const purposes = icons.map((icon) => icon.purpose);
    expect(purposes).toContain('any');
    expect(purposes).toContain('maskable');
  });

  it('precaches the shell, styles, and lazy scene chunks', () => {
    const patterns = PRECACHE_GLOB_PATTERNS.join(',');
    for (const extension of ['js', 'css', 'html', 'svg']) {
      expect(patterns).toContain(extension);
    }
    expect(patterns).not.toContain('"**/*"');
    expect(PWA_NAVIGATE_FALLBACK).toBe('/index.html');
    expect(PWA_MAX_CACHE_FILE_BYTES).toBeGreaterThanOrEqual(1_500_000);
  });

  it('never activates a waiting worker without player action', () => {
    expect(PWA_WORKBOX_OPTIONS.skipWaiting).toBe(false);
    expect(PWA_WORKBOX_OPTIONS.clientsClaim).toBe(false);
    expect(PWA_WORKBOX_OPTIONS.cleanupOutdatedCaches).toBe(true);
    // No runtime route may cache admin/question responses; precache only.
    expect('runtimeCaching' in PWA_WORKBOX_OPTIONS).toBe(false);
  });

  it('checks for updates once per hour', () => {
    expect(UPDATE_CHECK_INTERVAL_MS).toBe(60 * 60 * 1000);
  });
});
