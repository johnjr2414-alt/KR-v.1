const DEBUG_BASE = 'http://127.0.0.1:9222';
const APP_URL = 'http://localhost:4173/';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  constructor(socket, label) {
    this.socket = socket;
    this.label = label;
    this.nextId = 1;
    this.pending = new Map();
    this.consoleMessages = [];
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
      if (message.method === 'Runtime.consoleAPICalled') {
        this.consoleMessages.push({
          type: message.params.type,
          text: message.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' '),
        });
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

  async waitFor(expression, timeoutMs = 20000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await this.evaluate(expression)) return true;
      await sleep(150);
    }
    throw new Error(`Timed out waiting for: ${expression}`);
  }

  async pressKey(key, code, virtualKeyCode) {
    const base = {
      key,
      code,
      windowsVirtualKeyCode: virtualKeyCode,
      nativeVirtualKeyCode: virtualKeyCode,
    };
    await this.send('Input.dispatchKeyEvent', { type: 'keyDown', ...base });
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  }

  close() {
    this.socket.close();
  }
}

async function connect(target, label) {
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  const session = new CdpSession(socket, label);
  await session.send('Page.enable');
  await session.send('Runtime.enable');
  return session;
}

async function setViewport(session, width, height) {
  await session.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
}

const measureExpression = `(() => {
  const rect = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom), width: Math.round(r.width), height: Math.round(r.height) };
  };
  const canvas = document.querySelector('#game-container canvas');
  return {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    canvas: rect(canvas),
    canvasCount: document.querySelectorAll('#game-container canvas').length,
    hud: rect(document.querySelector('.exploration-hud')),
    hudCount: document.querySelectorAll('.exploration-hud').length,
    startMenu: rect(document.querySelector('#start-menu')),
    pauseModal: rect(document.querySelector('#pause-modal')),
  };
})()`;

const dbExpression = `(async () => {
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
  return {
    databases,
    playerName: save?.player?.name ?? null,
    schemaVersion: save?.version ?? null,
    savedAt: save?.updatedAt ?? null,
  };
})()`;

async function runViewportMatrix() {
  const target = await createTarget(APP_URL);
  const session = await connect(target, 'viewport-matrix');
  const results = [];

  for (const [width, height] of [
    [1920, 1080],
    [1366, 768],
    [1024, 768],
    [800, 600],
  ]) {
    await setViewport(session, width, height);
    await session.send('Page.navigate', { url: APP_URL });
    await session.waitFor(`!!document.querySelector('#start-menu')`);
    const menuMetrics = await session.evaluate(measureExpression);

    await session.evaluate(`document.querySelector('.start-menu__btn--user').click(), true`);
    await session.waitFor(`!!document.querySelector('.exploration-hud')`, 30000);
    await sleep(400);
    const gameMetrics = await session.evaluate(measureExpression);

    let pauseOpened = null;
    if (width === 1366) {
      await session.pressKey('Escape', 'Escape', 27);
      pauseOpened = await session.waitFor(`!!document.querySelector('#pause-modal')`, 4000)
        .then(() => session.evaluate(`!!document.querySelector('#pause-modal')`))
        .catch(() => false);
      if (pauseOpened) {
        await sleep(250);
        await session.pressKey('Escape', 'Escape', 27);
        await sleep(300);
      }
    }

    results.push({
      viewport: { width, height },
      menuMetrics,
      gameMetrics,
      pauseOpened,
      menuFits:
        menuMetrics.startMenu !== null &&
        menuMetrics.startMenu.left >= 0 &&
        menuMetrics.startMenu.top >= 0 &&
        menuMetrics.startMenu.right <= menuMetrics.innerWidth &&
        menuMetrics.startMenu.bottom <= menuMetrics.innerHeight,
      canvasFits:
        gameMetrics.canvas !== null &&
        gameMetrics.canvas.width <= gameMetrics.innerWidth &&
        gameMetrics.canvas.height <= gameMetrics.innerHeight,
      noHorizontalOverflow: gameMetrics.scrollWidth <= gameMetrics.innerWidth + 1,
      singleHud: gameMetrics.hudCount === 1,
    });
  }

  // Reload/resume: a fresh profile save must survive a page reload.
  const dbBeforeReload = await session.evaluate(dbExpression);
  await setViewport(session, 1366, 768);
  await session.send('Page.reload', { ignoreCache: false });
  await session.waitFor(`!!document.querySelector('#start-menu')`);
  await session.evaluate(`document.querySelector('.start-menu__btn--user').click(), true`);
  await session.waitFor(`!!document.querySelector('.exploration-hud')`, 30000);
  await sleep(400);
  const reloadMetrics = await session.evaluate(measureExpression);
  const dbAfterReload = await session.evaluate(dbExpression);

  const errors = session.consoleMessages.filter((message) => message.type === 'error');

  session.close();
  await closeTarget(target.id);

  return {
    viewports: results,
    reload: {
      dbBeforeReload,
      dbAfterReload,
      hudAfterReload: reloadMetrics.hudCount === 1,
      hudVisible: reloadMetrics.hud !== null,
    },
    consoleErrors: errors,
    uncaughtExceptions: session.exceptions,
  };
}

async function runWithoutIndexedDb() {
  const target = await createTarget('about:blank');
  const session = await connect(target, 'no-indexeddb');
  await session.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true });`,
  });
  await setViewport(session, 1366, 768);
  await session.send('Page.navigate', { url: APP_URL });
  await session.waitFor(`!!document.querySelector('#start-menu')`);
  const indexedDbType = await session.evaluate(`typeof indexedDB`);

  await session.evaluate(`document.querySelector('.start-menu__btn--user').click(), true`);
  await session.waitFor(`!!document.querySelector('.exploration-hud')`, 30000);
  await sleep(1000);

  const result = {
    indexedDbType,
    hudVisible: await session.evaluate(`!!document.querySelector('.exploration-hud')`),
    saveNotice: await session.evaluate(
      `document.querySelector('.save-recovery-notice')?.textContent ?? null`,
    ),
    canvasCount: await session.evaluate(`document.querySelectorAll('#game-container canvas').length`),
    consoleErrors: session.consoleMessages.filter((message) => message.type === 'error'),
    uncaughtExceptions: session.exceptions,
  };

  session.close();
  await closeTarget(target.id);
  return result;
}

const output = {
  viewportMatrix: await runViewportMatrix(),
  noIndexedDb: await runWithoutIndexedDb(),
};
console.log(JSON.stringify(output, null, 2));
