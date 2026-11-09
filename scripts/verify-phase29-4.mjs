const DEBUG_BASE = 'http://127.0.0.1:9224';
const APP_URL = 'http://localhost:4173/';

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

const layoutExpression = `(() => {
  const root = document.documentElement;
  const card = document.querySelector('.pause-card');
  return {
    scale: getComputedStyle(root).getPropertyValue('--kr-font-scale').trim(),
    titleFont: parseFloat(getComputedStyle(document.querySelector('.pause-card__title')).fontSize),
    optionFont: parseFloat(getComputedStyle(document.querySelector('#text-scale-select')).fontSize),
    stored: localStorage.getItem('kr.ui.textScale'),
    overflowX: root.scrollWidth <= window.innerWidth + 1,
    cardFitsViewport: card ? card.getBoundingClientRect().bottom <= window.innerHeight + 1 : null,
  };
})()`;

async function main() {
  const target = await createTarget('about:blank');
  const session = await connect(target);

  await session.send('Page.navigate', { url: APP_URL });
  await session.waitFor(`!!document.querySelector('#start-menu')`);
  await session.evaluate(`document.querySelector('.start-menu__btn--user').click(), true`);
  await session.waitFor(`!!document.querySelector('.exploration-hud')`, 30000);

  await session.pressKey('Escape', 'Escape', 27);
  await session.waitFor(`!!document.querySelector('#pause-modal')`);
  await session.evaluate(`document.querySelector('#pause-settings-btn').click(), true`);
  await session.waitFor(`!!document.querySelector('#text-scale-select')`);

  const baseline = await session.evaluate(layoutExpression);

  await session.evaluate(`(() => {
    const select = document.querySelector('#text-scale-select');
    select.value = '1.3';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  const scaled = await session.evaluate(layoutExpression);

  // Keyboard focus should be visible on the select after tabbing away and back.
  await session.evaluate(`document.querySelector('#pause-settings-btn')?.focus(), true`);
  const focusCheck = await session.evaluate(`(() => {
    const select = document.querySelector('#text-scale-select');
    select.focus();
    const style = getComputedStyle(select);
    return {
      isFocusVisible: select.matches(':focus-visible'),
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
    };
  })()`);

  // A very long player name must not create horizontal page overflow.
  const longName = await session.evaluate(`(() => {
    const name = document.querySelector('.exploration-hud__name');
    if (name) name.textContent = 'A'.repeat(160);
    return {
      overflowX: document.documentElement.scrollWidth <= window.innerWidth + 1,
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    };
  })()`);

  await session.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  const reducedMotion = await session.evaluate(`(() => {
    const select = document.querySelector('#text-scale-select');
    return {
      matches: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      transitionDuration: getComputedStyle(select).transitionDuration,
    };
  })()`);
  await session.send('Emulation.setEmulatedMedia', { features: [] });

  await session.send('Page.reload');
  await session.waitFor(`!!document.querySelector('#start-menu')`);
  const afterReload = await session.evaluate(`(() => ({
    scale: getComputedStyle(document.documentElement).getPropertyValue('--kr-font-scale').trim(),
    stored: localStorage.getItem('kr.ui.textScale'),
    startButtonFont: parseFloat(getComputedStyle(document.querySelector('.start-menu__btn')).fontSize),
  }))()`);

  const result = {
    baseline,
    scaled,
    focusCheck,
    longName,
    reducedMotion,
    afterReload,
    consoleErrors: session.consoleErrors,
    uncaughtExceptions: session.exceptions,
  };

  session.close();
  await closeTarget(target.id);
  console.log(JSON.stringify(result, null, 2));
}

await main();
