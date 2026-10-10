// Exercise the real card's loading effects and handlers with no network/backend writes.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const ts = require('typescript');
const settle = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

function fixture({ mobile = false, guest = false } = {}) {
  const slots = [];
  let cursor = 0;
  let alive = true;
  let afterUnmount = 0;
  let tree;
  const effects = [];
  const observers = [];
  const scheduled = new Map();
  let nextTimer = 0;
  const requests = [];
  const cache = new Set();
  const favorites = [];
  const downloads = [];
  const favoriteIds = [];
  const navigations = [];
  const favoriteUpdates = [];
  const history = [];
  let incrementCount = 0;
  let favoriteCheckId;
  let onLoadCount = 0;
  let accessToken = guest ? null : 'mock-session';
  const useAuthStore = selector => selector({ accessToken });
  useAuthStore.getState = () => ({ accessToken });
  const sameDeps = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const hookEffect = (effect, deps) => {
    const index = cursor++;
    const old = slots[index];
    if (!old || !sameDeps(old.deps, deps)) {
      slots[index] = { deps, cleanup: old?.cleanup };
      effects.push(() => {
        slots[index].cleanup?.();
        slots[index].cleanup = effect();
      });
    }
  };
  const react = {
    useState: initial => {
      const index = cursor++;
      if (!slots[index]) {
        const state = { value: typeof initial === 'function' ? initial() : initial };
        state.set = value => {
          if (!alive) afterUnmount++;
          state.value = typeof value === 'function' ? value(state.value) : value;
        };
        slots[index] = state;
      }
      return [slots[index].value, slots[index].set];
    },
    useRef: value => {
      const index = cursor++;
      return slots[index] ??= { current: value };
    },
    useCallback: (callback, deps) => {
      const index = cursor++;
      if (!slots[index] || !sameDeps(slots[index].deps, deps)) slots[index] = { callback, deps };
      return slots[index].callback;
    },
    useEffect: hookEffect,
    useLayoutEffect: hookEffect,
  };
  const jsx = (type, props, key) => ({ type, props, key });
  const noop = () => {};
  const link = { click: noop };
  const mocks = {
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'lucide-react': { Heart: 'Heart', Download: 'Download', Bookmark: 'Bookmark' },
    '../utils/imagePreloader': {
      isImageLoaded: src => cache.has(src),
      preloadImage: src => new Promise((resolve, reject) => requests.push({
        src, reject, resolve: () => { cache.add(src); resolve(src); },
      })),
    },
    '@/services/favoriteService': { favoriteService: { toggleFavorite: id => {
      favoriteIds.push(id);
      return new Promise(resolve => favorites.push({ resolve }));
    } } },
    '@/hooks/useBatchedFavoriteCheck': {
      useBatchedFavoriteCheck: id => { favoriteCheckId = id; return false; },
      updateFavoriteCache: (...args) => favoriteUpdates.push(args),
    },
    '@/services/imageStatsService': { imageStatsService: { incrementDownload: async () => { incrementCount++; } } },
    '@/lib/axios': { default: { get: () => new Promise(resolve => downloads.push({ resolve })) } },
    sonner: { toast: { success: noop, error: noop } },
    '@/i18n': { t: text => text },
    '@/stores/useUserStore': { useUserStore: selector => selector({ user: guest ? null : { _id: 'user' } }) },
    'react-router-dom': { useNavigate: () => route => navigations.push(route) },
    '@/hooks/useIsMobile': { useIsMobile: () => mobile },
    '@/stores/useDownloadHistoryStore': { useDownloadHistoryStore: selector => selector({ addDownloadToHistory: image => history.push(image._id) }) },
    '@/stores/useAuthStore': { useAuthStore },
    '@/utils/avifSupport': { detectAvifSupport: async () => true },
    './BlurUpImage.css': {},
  };
  const exports = {};
  const source = fs.readFileSync(path.resolve(__dirname, '../src/components/NoFlashGrid/components/BlurUpImage.tsx'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const globals = {
    exports, require: name => { assert.ok(name in mocks, `Unexpected dependency: ${name}`); return mocks[name]; },
    window: { dispatchEvent: noop },
    document: { createElement: () => link, body: { appendChild: noop, removeChild: noop } },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    Blob, URL: { createObjectURL: () => 'blob:mock', revokeObjectURL: noop },
    console: { error: noop },
    setTimeout: callback => { scheduled.set(++nextTimer, callback); return nextTimer; },
    clearTimeout: id => scheduled.delete(id),
    requestIdleCallback: callback => { scheduled.set(++nextTimer, callback); return nextTimer; },
    cancelIdleCallback: id => scheduled.delete(id),
    IntersectionObserver: class {
      constructor(callback) { this.callback = callback; observers.push(this); }
      observe() {} disconnect() {}
    },
  };
  vm.runInNewContext(code, globals);
  function nodes(node = tree) {
    if (!node || typeof node !== 'object') return [];
    const children = [node.props?.children].flat(Infinity).filter(child => child !== undefined);
    return [node, ...children.flatMap(child => nodes(child))];
  }
  return {
    requests, cache, favorites, favoriteIds, downloads, favoriteUpdates, navigations, history, observers,
    get increments() { return incrementCount; },
    get afterUnmount() { return afterUnmount; },
    get loadCount() { return onLoadCount; },
    get favoriteCheckId() { return favoriteCheckId; },
    setToken: token => { accessToken = token; },
    nodes,
    full: () => nodes().find(node => node.type === 'img' && node.props.className?.includes(' full ')),
    button: label => nodes().find(node => node.type === 'button' && node.props['aria-label'] === label),
    render: (props, cachedDom = false) => {
      cursor = 0;
      tree = exports.BlurUpImage({ onLoadComplete: () => onLoadCount++, ...props });
      nodes().forEach(node => {
        if (node.props.ref) node.props.ref.current = { complete: cachedDom, naturalWidth: cachedDom ? 800 : 0 };
      });
      effects.splice(0).forEach(effect => effect());
      return tree;
    },
    tick: () => { const callbacks = [...scheduled.values()]; scheduled.clear(); callbacks.forEach(callback => callback()); },
    unmount: () => { alive = false; slots.forEach(slot => slot.cleanup?.()); },
  };
}
const image = name => ({ _id: name, imageUrl: `${name}.webp`, regularAvifUrl: `${name}.avif`, base64Thumbnail: 'data:image/png;base64,placeholder', width: 800, height: 600, uploadedBy: { username: 'author' } });
const event = () => ({ stopPropagation() {}, preventDefault() {} });

async function loading() {
  const f = fixture();
  const a = image('A');
  f.render({ image: a }); await settle(); f.render({ image: a });
  assert.equal(f.requests.length, 0, 'render/cache reads must not request off-screen images');
  f.observers[0].callback([{ isIntersecting: true }]); f.render({ image: a }); f.tick();
  assert.deepEqual(f.requests.map(request => request.src), ['A.avif'], 'load only the selected format');
  f.requests[0].resolve(); await settle(); f.render({ image: a });
  assert.ok(f.full().props.className.includes('loading'), 'preload alone must not hide the placeholder');
  f.full().props.onLoad(); f.full().props.onLoad(); f.render({ image: a });
  assert.equal(f.loadCount, 1, 'completion notified once');
  assert.ok(f.full().props.className.includes('loaded'));

  const race = fixture();
  race.render({ image: a, priority: true }); await settle(); race.render({ image: a, priority: true });
  const b = image('B'); race.render({ image: b, priority: true });
  race.requests[1].resolve(); await settle(); race.render({ image: b, priority: true });
  race.requests[0].resolve(); await settle(); race.render({ image: b, priority: true });
  assert.equal(race.full().props.src, 'B.avif', 'late image result cannot restore the old image');
  race.unmount(); await settle();
  assert.equal(race.afterUnmount, 0);

  const unmounted = fixture();
  unmounted.render({ image: a, priority: true }); await settle(); unmounted.render({ image: a, priority: true });
  unmounted.unmount(); unmounted.requests[0].resolve(); await settle();
  assert.equal(unmounted.afterUnmount, 0, 'pending preload result ignored after unmount');

  const failed = fixture();
  failed.render({ image: a, priority: true }); await settle(); failed.render({ image: a, priority: true });
  failed.requests[0].reject(new Error('offline')); await settle(); failed.render({ image: a, priority: true });
  assert.equal(failed.full(), undefined, 'failed request keeps the placeholder');

  const deferred = fixture();
  deferred.render({ image: a }); await settle(); deferred.render({ image: a });
  deferred.observers[0].callback([{ isIntersecting: true }]); deferred.render({ image: a });
  deferred.unmount(); deferred.tick();
  assert.equal(deferred.requests.length, 0, 'idle preload cancelled on unmount');

  const cached = fixture(); cached.cache.add('A.avif');
  cached.render({ image: a, priority: true }); await settle();
  cached.render({ image: a, priority: true }, true);
  cached.render({ image: a, priority: true }, true);
  assert.equal(cached.requests.length, 0, 'known cached image avoids a preload');
  assert.ok(cached.full().props.className.includes('loaded'));
  assert.equal(cached.loadCount, 1, 'cached image still notifies completion once');

  const neighbors = fixture(); const neighborProps = { image: a, images: [a, b], currentIndex: 0, priority: true };
  neighbors.render(neighborProps); await settle(); neighbors.render(neighborProps);
  neighbors.nodes()[0].props.onMouseEnter();
  assert.deepEqual(neighbors.requests.map(request => request.src), ['A.avif', 'B.avif'], 'two-image gallery preloads its neighbor once');
}

async function actions() {
  const f = fixture({ mobile: true });
  const a = image('A'); f.render({ image: a });
  const save = f.button('Favorite').props.onClick;
  assert.equal(f.button('Bookmark').props.onClick, save, 'save and bookmark keep their shared behavior');
  const saving = save(event()); await save(event());
  assert.equal(f.favorites.length, 1, 'rapid taps cannot toggle twice');
  f.favorites[0].resolve({ isFavorited: true }); await saving;
  assert.deepEqual(f.favoriteUpdates, [['A', true]]);

  const downloading = f.button('Download').props.onClick(event());
  await f.button('Download').props.onClick(event()); await settle();
  assert.equal(f.increments, 1, 'rapid taps cannot count/download twice');
  assert.equal(f.downloads.length, 1);
  f.downloads[0].resolve({ data: new Uint8Array([1]), headers: { 'content-type': 'image/webp' } });
  await downloading;
  assert.deepEqual(f.history, ['A']);
  f.render({ image: a, minimal: true });
  assert.equal(f.favoriteCheckId, undefined, 'minimal covers do not check favorites');
  assert.equal(f.button('Favorite'), undefined);

  const guest = fixture({ guest: true }); guest.render({ image: a });
  await guest.button('Save').props.onClick(event());
  assert.deepEqual(guest.navigations, ['/signin']);
  assert.equal(guest.favorites.length, 0);

  const late = fixture(); late.render({ image: a });
  const toggling = late.button('Save').props.onClick(event()); late.unmount();
  late.favorites[0].resolve({ isFavorited: true }); await toggling;
  assert.equal(late.afterUnmount, 0, 'action completion must not set local state after unmount');

  const account = fixture(); account.render({ image: a });
  const oldToggle = account.button('Save').props.onClick(event());
  account.setToken('another-mock-session');
  account.favorites[0].resolve({ isFavorited: true }); await oldToggle;
  assert.equal(account.favoriteUpdates.length, 0, 'old account toggle must not update new account favorites');
}

async function opening() {
  const f = fixture();
  let resolve;
  let count = 0;
  const onClick = () => { count++; return new Promise(done => { resolve = done; }); };
  const props = { image: image('A'), onClick };
  f.render(props);
  const pending = f.nodes()[0].props.onClick();
  await f.nodes()[0].props.onClick();
  f.render(props);
  assert.equal(count, 1, 'repeat clicks must not start another open');
  assert.ok(f.nodes().some(node => node.props.role === 'status'), 'opening feedback visible while callback pending');
  assert.equal(f.nodes().find(node => node.props.className === 'blur-up-image-image-wrapper').props['aria-busy'], true);
  resolve(); await pending; f.render(props);
  assert.ok(!f.nodes().some(node => node.props.role === 'status'), 'feedback cleared on completion');

  f.render({ image: image('A'), onClick: async () => { throw new Error('offline'); } });
  await f.nodes()[0].props.onClick();
  f.render(props);
  assert.ok(!f.nodes().some(node => node.props.role === 'status'), 'feedback cleared on failure');

  const late = fixture(); let finish;
  late.render({ image: image('A'), onClick: () => new Promise(done => { finish = done; }) });
  const waiting = late.nodes()[0].props.onClick(); late.unmount(); finish(); await waiting;
  assert.equal(late.afterUnmount, 0, 'opening completion ignored after unmount');
}

const watchdog = setTimeout(() => { console.error('FAIL: card tests did not complete'); process.exitCode = 1; }, 5000);
(async () => {
  await loading(); await actions(); await opening();
  console.log('PASS: image loading/cleanup, favorite/bookmark/download guards, minimal/guest behavior, opening feedback, duplicate clicks, completion/error/unmount.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => clearTimeout(watchdog));
