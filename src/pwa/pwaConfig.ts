import type { ManifestOptions } from 'vite-plugin-pwa';

/**
 * Web app manifest for the installed (standalone) experience.
 *
 * The SVG icon scales to any size and keeps the artwork inside the maskable
 * safe zone. No raster assets exist in the project yet.
 */
export const APP_MANIFEST: Partial<ManifestOptions> = {
  name: 'Knowledge Realms',
  short_name: 'KR Realms',
  description:
    'An educational fantasy action RPG where combat is resolved through subject-mastery questions.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'landscape',
  background_color: '#0e0e12',
  theme_color: '#1a1a2e',
  categories: ['education', 'games'],
  icons: [
    {
      src: '/pwa-icon.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'any',
    },
    {
      src: '/pwa-icon.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'maskable',
    },
  ],
};

/**
 * Static build outputs cached at install time. Lazy scene chunks are included
 * because Workbox precaches every emitted asset. JSON is included for any
 * future public data files; no runtime/API responses are cached.
 */
export const PRECACHE_GLOB_PATTERNS = [
  '**/*.{js,css,html,svg,png,json,woff2}',
];

/** Serves the cached app shell for offline navigation requests. */
export const PWA_NAVIGATE_FALLBACK = '/index.html';

/** Phaser is ~1.5 MB; leave headroom for engine growth without unbounded caching. */
export const PWA_MAX_CACHE_FILE_BYTES = 3 * 1024 * 1024;

/** How often an open page checks for a new service worker. */
export const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Workbox policy.
 *
 * `skipWaiting` and `clientsClaim` stay false: a new build installs and waits,
 * and only activates after the player accepts the reload prompt. This avoids
 * swapping hashed chunks underneath a running session.
 */
export const PWA_WORKBOX_OPTIONS = {
  globPatterns: PRECACHE_GLOB_PATTERNS,
  navigateFallback: PWA_NAVIGATE_FALLBACK,
  cleanupOutdatedCaches: true,
  clientsClaim: false,
  skipWaiting: false,
  maximumFileSizeToCacheInBytes: PWA_MAX_CACHE_FILE_BYTES,
};
