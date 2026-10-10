// Runs the real hook modules against controlled subscriptions/services; no backend calls.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function load(file, mocks, globals = {}) {
  const exports = {};
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports, require: name => {
      assert.ok(name in mocks, `Unexpected dependency: ${name}`);
      return mocks[name];
    }, console, ...globals,
  });
  return exports;
}

function fixture() {
  const timers = new Map();
  let timerId = 0;
  const authListeners = new Set();
  let auth = { accessToken: 'test-session-A' };
  const useAuthStore = selector => selector(auth);
  useAuthStore.getState = () => auth;
  useAuthStore.subscribe = callback => {
    authListeners.add(callback);
    return () => authListeners.delete(callback);
  };
  const events = new Map();
  const window = {
    addEventListener: (name, callback) => {
      if (!events.has(name)) events.set(name, new Set());
      events.get(name).add(callback);
    },
    removeEventListener: (name, callback) => events.get(name)?.delete(callback),
    dispatchEvent: event => events.get(event.type)?.forEach(callback => callback(event)),
  };
  const requests = [];
  const mounts = [];
  const react = {
    useCallback: callback => callback,
    useSyncExternalStore: (subscribe, getSnapshot) => {
      const record = { get: getSnapshot, notices: 0 };
      record.stop = subscribe(() => record.notices++);
      mounts.push(record);
      return getSnapshot();
    },
  };
  const lru = load('src/utils/lruCache.ts', {});
  const hooks = load('src/hooks/useBatchedFavoriteCheck.ts', {
    react,
    '@/utils/lruCache': lru,
    '@/stores/useAuthStore': { useAuthStore },
    '@/services/favoriteService': { favoriteService: {
      checkFavorites: ids => new Promise((resolve, reject) => requests.push({ ids: [...ids], resolve, reject })),
    } },
  }, {
    window,
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    setTimeout: callback => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: id => timers.delete(id),
  });
  return {
    hooks, timers, requests, events, authListeners,
    mount: id => { hooks.useBatchedFavoriteCheck(id); return mounts.at(-1); },
    setAuth: token => {
      auth = { ...auth, accessToken: token };
      [...authListeners].forEach(callback => callback(auth));
    },
    tick: () => {
      const current = [...timers.values()];
      timers.clear();
      current.forEach(callback => callback());
    },
  };
}
const id = number => number.toString(16).padStart(24, '0');
const settle = async () => { await Promise.resolve(); await Promise.resolve(); };

async function favorites() {
  const f = fixture();
  const cards = Array.from({ length: 30 }, (_, i) => f.mount(id(i + 1)));
  const duplicate = f.mount(id(2));
  assert.equal(f.timers.size, 1, 'all cards must share one batch timer');
  assert.equal(f.events.get('favoriteCacheUpdated').size, 1, 'one global update listener');
  cards[0].stop();
  f.tick();
  assert.equal(f.requests.length, 1, 'unmounting one card must not cancel the other checks');
  assert.equal(f.requests[0].ids.length, 29, 'IDs deduplicated and unmounted ID omitted');
  const inFlightCard = f.mount(id(2));
  assert.equal(f.timers.size, 0, 'joining an in-flight check must not send another request');
  f.hooks.updateFavoriteCache(id(2), true);
  f.requests[0].resolve({ favorites: { [id(2)]: false, [id(3)]: true } });
  await settle();
  assert.equal(duplicate.get(), true, 'late check must not undo a toggle');
  assert.equal(inFlightCard.get(), true, 'all cards showing the same photo stay synchronized');
  assert.equal(cards[2].get(), true);
  const cached = f.mount(id(3));
  assert.equal(cached.get(), true);
  assert.equal(f.timers.size, 0, 'cache hit must not recheck');

  f.setAuth('test-session-B');
  assert.equal(cards[2].get(), false, 'previous session cache cannot leak into a new session');
  const sessionB = f.mount(id(3));
  f.tick();
  f.requests[1].resolve({ favorites: { [id(3)]: false } });
  await settle();
  assert.equal(sessionB.get(), false);
  f.setAuth(null);
  assert.equal(f.mount(id(3)).get(), false, 'logout resets status');
  assert.equal(f.timers.size, 0, 'guest does not issue checks');
  [...cards.slice(1), duplicate, inFlightCard, cached, sessionB].forEach(card => card.stop());
  assert.equal(f.authListeners.size, 0, 'auth listener removed after last card');
  assert.equal(f.events.get('favoriteCacheUpdated').size, 0, 'event listener removed after last card');

  const pending = fixture();
  pending.mount(id(1)).stop();
  assert.equal(pending.timers.size, 0, 'last unmount cancels a pending batch');
  pending.mount('invalid');
  assert.equal(pending.timers.size, 0, 'invalid IDs never requested');

  const race = fixture();
  race.mount(id(1)); race.tick();
  race.setAuth('test-session-B');
  const current = race.mount(id(1)); race.tick();
  race.requests[1].resolve({ favorites: { [id(1)]: true } }); await settle();
  race.requests[0].resolve({ favorites: { [id(1)]: false } }); await settle();
  assert.equal(current.get(), true, 'stale account response ignored');

  const failures = fixture();
  const first = failures.mount(id(1)); failures.tick();
  const second = failures.mount(id(2));
  failures.requests[0].reject(new Error('offline')); await settle();
  failures.tick();
  assert.deepEqual(failures.requests[1].ids, [id(2)], 'failed batch must not discard a later batch');
  failures.requests[1].resolve({ favorites: { [id(2)]: true } }); await settle();
  assert.equal(second.get(), true);
  first.stop(); failures.mount(id(1)); failures.tick();
  assert.equal(failures.requests.length, 3, 'remount retries a failed check');
}

function mobile() {
  const subscriptions = new Set();
  const mounts = [];
  let queryCalls = 0;
  const query = {
    matches: false,
    addEventListener: (name, callback) => { assert.equal(name, 'change'); subscriptions.add(callback); },
    removeEventListener: (_name, callback) => subscriptions.delete(callback),
  };
  const react = { useSyncExternalStore: (subscribe, snapshot) => {
    const mount = { get: snapshot, notices: 0 };
    mount.stop = subscribe(() => mount.notices++);
    mounts.push(mount);
    return snapshot();
  } };
  const mocks = { react, '@/config/appConfig': { appConfig: { mobileBreakpoint: 768 } } };
  const hook = load('src/hooks/useIsMobile.ts', mocks, { window: { matchMedia: text => {
    assert.equal(text, '(max-width: 768px)'); queryCalls++; return query;
  } } });
  for (let i = 0; i < 30; i++) hook.useIsMobile();
  assert.equal(queryCalls, 1);
  assert.equal(subscriptions.size, 1, 'one breakpoint listener for all cards');
  mounts[0].stop();
  query.matches = true; subscriptions.forEach(callback => callback());
  assert.ok(mounts.slice(1).every(mount => mount.get() && mount.notices === 1));
  mounts.slice(1).forEach(mount => mount.stop());
  assert.equal(subscriptions.size, 0, 'listener removed after last unmount');
  assert.equal(load('src/hooks/useIsMobile.ts', mocks).useIsMobile(), false, 'SSR remains desktop');
}

(async () => {
  await favorites();
  mobile();
  console.log('PASS: batching, duplicate cards, cache, partial/last unmount, stale toggle/account replies, logout, errors/retry, shared breakpoint, SSR.');
})().catch(error => { console.error(error); process.exitCode = 1; });
