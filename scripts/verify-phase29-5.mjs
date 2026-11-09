import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const APP_URL = process.env.APP_URL ?? 'http://localhost:4173/';
const DEBUG_BASE = process.env.DEBUG_BASE ?? 'http://127.0.0.1:9225';
const root = process.cwd();
const dist = join(root, 'dist');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

function walk(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}

function staticAudit() {
  assert(existsSync(dist), 'dist/ is missing — run `npm run build` first.');

  const files = walk(dist);
  const relative = files.map((path) => path.slice(dist.length + 1).replace(/\\/g, '/'));
  const required = [
    'index.html',
    'sw.js',
    'manifest.webmanifest',
    'pwa-icon.svg',
    'THIRD_PARTY_NOTICES.txt',
  ];
  for (const name of required) {
    assert(relative.includes(name), `dist/${name} is missing.`);
  }
  assert(
    relative.some((name) => /^workbox-[\w-]+\.js$/.test(name)),
    'Workbox runtime chunk is missing from dist/.',
  );
  assert(
    relative.filter((name) => name.startsWith('assets/')).length > 0,
    'No hashed assets were emitted.',
  );

  const sourceMaps = relative.filter((name) => name.endsWith('.map'));
  assert(sourceMaps.length === 0, `Source maps should not ship: ${sourceMaps.join(', ')}`);

  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  assert(html.includes('content="#1a1a2e"'), 'index.html is missing the theme color.');
  assert(/<script[^>]+type="module"[^>]+src="\/assets\//.test(html), 'Module entry is missing.');
  assert(!/https?:\/\//.test(html), 'index.html references external URLs.');

  const manifest = JSON.parse(readFileSync(join(dist, 'manifest.webmanifest'), 'utf8'));
  assert(manifest.name === 'Knowledge Realms', 'Manifest name mismatch.');
  assert(manifest.start_url === '/', 'Manifest start_url must be /.');
  assert(manifest.scope === '/', 'Manifest scope must be /.');
  assert(manifest.display === 'standalone', 'Manifest display must be standalone.');

  const sw = readFileSync(join(dist, 'sw.js'), 'utf8');
  const precacheEntries = (sw.match(/\{url:/g) ?? []).length;
  assert(precacheEntries >= 20, `Expected >= 20 precache entries, found ${precacheEntries}.`);
  assert(sw.includes('SKIP_WAITING'), 'sw.js must expose the explicit SKIP_WAITING message.');
  const skipWaitingCalls = (sw.match(/skipWaiting\s*\(/g) ?? []).length;
  assert(
    skipWaitingCalls === 1,
    `sw.js must call skipWaiting only from the SKIP_WAITING handler (found ${skipWaitingCalls} calls).`,
  );
  assert(!/clientsClaim/.test(sw), 'sw.js must not claim clients automatically.');

  const js = relative
    .filter((name) => name.endsWith('.js'))
    .map((name) => readFileSync(join(dist, name), 'utf8'))
    .join('\n');
  assert(js.includes(`"${pkg.version}"`) || js.includes(`'${pkg.version}'`), 'Bundle does not contain the release version.');

  const notices = readFileSync(join(dist, 'THIRD_PARTY_NOTICES.txt'), 'utf8');
  assert(notices.includes('Phaser') && notices.includes('Workbox'), 'License notices are incomplete.');

  return {
    files: relative.length,
    precacheEntries,
    hashedAssets: relative.filter((name) => name.startsWith('assets/')).length,
    version: pkg.version,
  };
}

async function createTarget(url) {
  const response = await fetch(`${DEBUG_BASE}/json/new?${encodeURIComponent(url)}`, {
    method: 'PUT',
  });
  if (!response.ok) {
    throw new Error(
      `Could not create a CDP target (${response.status}). Start Chrome with --remote-debugging-port=9225 and ${APP_URL} on preview.`,
    );
  }
  return response.json();
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

async function previewSmoke() {
  const target = await createTarget('about:blank');
  const session = await connect(target);

  await session.send('Page.navigate', { url: APP_URL });
  await session.waitFor(`!!document.querySelector('#start-menu')`);

  const startMenuVersion = await session.evaluate(`(() => {
    const el = document.querySelector('.start-menu__version');
    return el ? el.textContent.trim() : null;
  })()`);
  assert(startMenuVersion === `v${pkg.version}`, `Start menu shows ${startMenuVersion}, expected v${pkg.version}.`);

  await session.evaluate(`document.querySelector('.start-menu__btn--user').click(), true`);
  await session.waitFor(`!!document.querySelector('.exploration-hud')`, 30000);

  const storage = await session.evaluate(`(async () => {
    if (!indexedDB.databases) return { supported: false };
    const names = (await indexedDB.databases()).map((db) => db.name);
    return { supported: true, hasSave: names.includes('knowledge-realms-save') };
  })()`);
  assert(!storage.supported || storage.hasSave, 'Player save database was not created.');

  await session.evaluate(`navigator.serviceWorker.ready.then(() => true)`);
  await session.send('Page.reload');
  await session.waitFor(`!!document.querySelector('#start-menu')`);
  const controlled = await session.evaluate(
    `!!navigator.serviceWorker && navigator.serviceWorker.controller !== null`,
  );
  assert(controlled, 'Page is not controlled by the service worker after reload.');

  const online = await session.evaluate(`navigator.onLine`);
  await session.send('Network.emulateNetworkConditions', {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
  });
  await session.send('Page.reload');
  await session.waitFor(`!!document.querySelector('#start-menu')`, 30000);
  const offlineState = await session.evaluate(`({
    online: navigator.onLine,
    menu: !!document.querySelector('#start-menu'),
  })`);
  await session.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
  assert(offlineState.online === false, 'Offline emulation was not applied.');
  assert(offlineState.menu, 'Start menu did not load while offline.');

  const result = {
    startMenuVersion,
    storage,
    serviceWorkerControlled: controlled,
    offlineReload: offlineState,
    onlineBeforeOffline: online,
    consoleErrors: session.consoleErrors,
    uncaughtExceptions: session.exceptions,
  };
  assert(result.consoleErrors.length === 0, `Console errors: ${result.consoleErrors.join(' | ')}`);
  assert(result.uncaughtExceptions.length === 0, `Uncaught exceptions: ${result.uncaughtExceptions.join(' | ')}`);

  session.close();
  await fetch(`${DEBUG_BASE}/json/close/${target.id}`);
  return result;
}

const staticResult = staticAudit();
const browserResult = await previewSmoke();
console.log(JSON.stringify({ staticAudit: staticResult, previewSmoke: browserResult }, null, 2));
