import { appendFileSync } from 'node:fs';

const DEBUG_BASE = 'http://127.0.0.1:9223';
const APP_URL = 'http://localhost:4173/';
const SW_FILE = 'dist/sw.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function createTarget(url) {
  const response = await fetch(`${DEBUG_BASE}/json/new?${encodeURIComponent(url)}`, {
    method: 'PUT',
  });
  if (!response.ok) throw new Error(`Could not create target: ${response.status}`);
  return response.json();
}

async function closeTarget(id) {
  await fetch(`${DEBUG_BASE}/json/close/${id}`);
}

class CdpSession {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.consoleErrors = [];
    this.exceptions = [];
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const entry = this.pending.get(message.id);
        if (!entry) return;
        this.pending.delete(message.id);
        if (message.error) entry.reject(new Error(message.error.message));
        else entry.resolve(message.result);
        return;
      }
      if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
        this.consoleErrors.push(
          message.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' '),
        );
      }
      if (message.method === 'Runtime.exceptionThrown') {
        this.exceptions.push(message.params.exceptionDetails.text);
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      const detail = result.exceptionDetails.exception?.description ?? result.exceptionDetails.text;
      throw new Error(detail);
    }
    return result.result.value;
  }

  async waitFor(expression, timeoutMs = 30000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await this.evaluate(expression)) return true;
      await sleep(150);
    }
    throw new Error(`Timed out waiting for: ${expression}`);
  }

  close() {
    this.socket.close();
  }
}

async function connect(target) {
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  const session = new CdpSession(socket);
  await session.send('Page.enable');
  await session.send('Runtime.enable');
  await session.send('Network.enable');
  return session;
}

const saveDbExpression = `(async () => {
  const databases = (await indexedDB.databases()).map((entry) => entry.name);
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('knowledge-realms-save');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const save = await new Promise((resolve, reject) => {
    const request = db.transaction('game-save', 'readonly').objectStore('game-save').get('active-profile');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return { databases, playerName: save?.player?.name ?? null, schemaVersion: save?.version ?? null, savedAt: save?.updatedAt ?? null };
})()`;

const swStateExpression = `(async () => {
  const registration = await navigator.serviceWorker.getRegistration();
  const keys = await caches.keys();
  return {
    supported: 'serviceWorker' in navigator,
    controlled: Boolean(navigator.serviceWorker.controller),
    controllerUrl: navigator.serviceWorker.controller?.scriptURL ?? null,
    activeUrl: registration?.active?.scriptURL ?? null,
    waiting: Boolean(registration?.waiting),
    cacheNames: keys,
    precacheEntries: await (async () => {
      const name = keys.find((key) => key.includes('precache'));
      if (!name) return 0;
      return (await (await caches.open(name)).keys()).length;
    })(),
    offlineReadySeen: window.__pwaEvents?.offlineReady ?? false,
    updatePromptSeen: window.__pwaEvents?.updatePrompt ?? false,
  };
})()`;

async function startGame(session) {
  await session.waitFor(`!!document.querySelector('#start-menu')`);
  await session.evaluate(`document.querySelector('.start-menu__btn--user').click(), true`);
  await session.waitFor(`!!document.querySelector('.exploration-hud')`, 30000);
}

async function main() {
  const target = await createTarget('about:blank');
  const session = await connect(target);

  await session.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      window.__pwaEvents = { offlineReady: false, updatePrompt: false };
      new MutationObserver(() => {
        if (document.getElementById('pwa-offline-ready')) window.__pwaEvents.offlineReady = true;
        if (document.getElementById('pwa-update-notice')) window.__pwaEvents.updatePrompt = true;
      }).observe(document, { childList: true, subtree: true });
    `,
  });

  await session.send('Page.navigate', { url: APP_URL });
  await session.waitFor(`!!document.querySelector('#start-menu')`);
  await session.waitFor(
    `(async () => Boolean((await navigator.serviceWorker.getRegistration())?.active))()`,
    20000,
  );

  const manifest = await session.evaluate(`(async () => {
    const link = document.querySelector('link[rel="manifest"]');
    const response = await fetch(link?.href ?? '/manifest.webmanifest');
    return { href: link?.href ?? null, status: response.status, body: await response.json() };
  })()`);

  const appManifest = await session.send('Page.getAppManifest').catch(() => null);
  const installability = await session.send('Page.getInstallabilityErrors').catch(() => null);

  const firstLoad = await session.evaluate(swStateExpression);

  await session.send('Page.reload');
  await startGame(session);
  const controlledState = await session.evaluate(swStateExpression);
  const saveBeforeOffline = await session.evaluate(saveDbExpression);

  // Offline reload: the app shell and lazy chunks must come from the precache.
  await session.send('Network.emulateNetworkConditions', {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
  });
  await session.send('Page.reload');
  await startGame(session);
  const offlineState = await session.evaluate(swStateExpression);
  const offlineOnlineFlag = await session.evaluate(`navigator.onLine`);
  const saveOffline = await session.evaluate(saveDbExpression);

  await session.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
  await sleep(500);

  // Simulate a new deployment while the current session is running.
  appendFileSync(SW_FILE, `\n// update-marker ${Date.now()}\n`);
  await session.evaluate(
    `(async () => { const registration = await navigator.serviceWorker.getRegistration(); await registration.update(); return true; })()`,
  );
  await session.waitFor(`!!document.querySelector('#pwa-update-notice')`, 20000);
  const waitingBeforeAccept = await session.evaluate(swStateExpression);

  const saveBeforeUpdate = await session.evaluate(saveDbExpression);
  await session.evaluate(
    `document.querySelector('#pwa-update-notice .pwa-notice__action').click(), true`,
  );
  await session.waitFor(`!!document.querySelector('#start-menu')`, 30000);
  await startGame(session);
  const afterUpdate = await session.evaluate(swStateExpression);
  const saveAfterUpdate = await session.evaluate(saveDbExpression);
  const noticeAfterUpdate = await session.evaluate(
    `Boolean(document.querySelector('#pwa-update-notice'))`,
  );

  const result = {
    manifest: { href: manifest.href, status: manifest.status, name: manifest.body?.name, display: manifest.body?.display, icons: manifest.body?.icons },
    devtoolsManifest: appManifest
      ? { url: appManifest.url, errors: appManifest.errors, parsedName: appManifest.data?.name }
      : null,
    installabilityErrors: installability?.installabilityErrors ?? 'unsupported',
    firstLoad,
    controlledState,
    offline: {
      navigatorOnLine: offlineOnlineFlag,
      state: offlineState,
      save: saveOffline,
    },
    update: {
      waitingBeforeAccept,
      noticeAfterUpdate,
      afterUpdate,
      saveBeforeUpdate,
      saveAfterUpdate,
    },
    saveBeforeOffline,
    consoleErrors: session.consoleErrors,
    uncaughtExceptions: session.exceptions,
  };

  session.close();
  await closeTarget(target.id);
  console.log(JSON.stringify(result, null, 2));
}

await main();
