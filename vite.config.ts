import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
import { APP_MANIFEST, PWA_WORKBOX_OPTIONS } from './src/pwa/pwaConfig';

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      strategies: 'generateSW',
      registerType: 'prompt',
      injectRegister: null,
      manifest: APP_MANIFEST,
      includeManifestIcons: false,
      workbox: PWA_WORKBOX_OPTIONS,
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: false,
  },
  build: {
    rollupOptions: {
      output: {
        // Keep the engine in its own long-lived chunk so application updates
        // do not force players to re-download Phaser.
        manualChunks: (id) => (id.includes('node_modules/phaser') ? 'phaser' : undefined),
      },
    },
  },
});

