import { registerSW } from 'virtual:pwa-register';
import { playerSessionManager } from '../player';
import { UPDATE_CHECK_INTERVAL_MS } from './pwaConfig';
import { UpdateNotice } from './UpdateNotice';

/**
 * Registers the generated service worker in prompt mode.
 *
 * A new build is never activated automatically. The player accepts a banner
 * action, the session is saved first, and only then is the waiting worker
 * activated and the page reloaded.
 */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  const notice = new UpdateNotice();

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      notice.showUpdate(() => {
        void (async () => {
          await playerSessionManager.saveSession();
          await updateSW(true);
        })();
      });
    },
    onOfflineReady() {
      notice.showOfflineReady();
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      window.setInterval(() => {
        void registration.update();
      }, UPDATE_CHECK_INTERVAL_MS);
    },
    onRegisterError(error) {
      console.warn('[PWA] Service worker registration failed:', error);
    },
  });
}
