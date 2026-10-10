// Execute the real hook with controlled effects, observer events and requests.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const ts = require('typescript');
const path = require('path');
const slots = [], effects = [], timers = new Map(), observers = [];
let index = 0, nextTimer = 0, dirty = false, mounted = true, output;
let calls = 0, resolveRequest;
let options = { hasMore: true, progressKey: 'A:1', onLoadMore: () => {
  calls++;
  return new Promise(resolve => { resolveRequest = resolve; });
} };
const react = {
  useRef(value) { const i = index++; return slots[i] ||= { current: value }; },
  useState(value) {
    const i = index++;
    if (!(i in slots)) slots[i] = value;
    return [slots[i], next => {
      assert.ok(mounted, 'must not update after unmount');
      next = typeof next === 'function' ? next(slots[i]) : next;
      if (next !== slots[i]) { slots[i] = next; dirty = true; }
    }];
  },
  useEffect(callback, deps) {
    const i = index++;
    if (!effects[i] || deps.some((d, n) => d !== effects[i].deps[n])) {
      effects[i]?.cleanup?.();
      effects[i] = { deps, callback, pending: true };
    }
  },
};
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,
  '../src/components/NoFlashGrid/hooks/useInfiniteScroll.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, {
  exports: exportsObject, require: () => react,
  setTimeout: callback => { timers.set(++nextTimer, callback); return nextTimer; },
  clearTimeout: id => timers.delete(id),
  IntersectionObserver: class {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {} disconnect() { this.disconnected = true; }
  },
});
function render() {
  do {
    dirty = false; index = 0;
    output = exportsObject.useInfiniteScroll(options);
    output.loadMoreRef.current = {};
    effects.forEach(e => { if (e.pending) { e.pending = false; e.cleanup = e.callback(); } });
  } while (dirty);
}
function enter(visible = true) {
  const observer = observers.at(-1);
  if (!observer.disconnected) observer.callback([{ isIntersecting: visible }]);
  render();
}
function tick() { const jobs = [...timers.values()]; timers.clear(); jobs.forEach(job => job()); render(); }
async function finish() { resolveRequest(); await Promise.resolve(); await Promise.resolve(); render(); }
(async () => {
  render(); enter(); enter(); assert.equal(timers.size, 1); tick();
  assert.equal(calls, 1);
  options = { ...options, isLoading: true }; render(); enter();
  options = { ...options, isLoading: false, onLoadMore: options.onLoadMore.bind(null) }; render(); enter();
  assert.equal(timers.size, 0, 'loading/callback changes must preserve request lock');
  await finish(); enter(); assert.equal(timers.size, 0, 'no progress must not loop');
  options = { ...options, progressKey: 'A:2' }; render(); enter(); tick();
  assert.equal(calls, 2, 'progress permits next page while sentinel remains visible');
  await finish(); enter(false); enter(); tick(); assert.equal(calls, 3, 're-entry permits retry');
  await finish();
  options = { ...options, progressKey: 'A:3' }; render(); enter();
  options = { ...options, progressKey: 'B:1', onLoadMore: options.onLoadMore.bind(null) }; render();
  assert.equal(timers.size, 0, 'filter change cancels scheduled old callback');
  enter(); tick(); assert.equal(calls, 4);
  options = { ...options, hasMore: false }; render(); await finish(); enter();
  assert.equal(timers.size, 0, 'exhausted pagination stops requests');
  options = { ...options, hasMore: true, progressKey: 'failure', onLoadMore: async () => { calls++; throw Error('offline'); } };
  render(); enter(); tick(); await new Promise(setImmediate); render();
  assert.equal(output.isLoadingMore, false, 'failed request clears status');
  enter(); assert.equal(timers.size, 0, 'failure does not automatically retry');
  options = { ...options, hasMore: true, progressKey: 'C:1' }; render(); enter();
  options = { ...options, hasMore: false }; render();
  assert.equal(timers.size, 0, 'removing sentinel cancels timer');
  options = { ...options, hasMore: true, progressKey: 'unmount', onLoadMore: () => new Promise(resolve => { resolveRequest = resolve; }) };
  render(); enter(); tick();
  effects.forEach(e => e.cleanup?.()); mounted = false;
  assert.equal(timers.size, 0, 'unmount cancels timer');
  resolveRequest(); await Promise.resolve(); await Promise.resolve();
  console.log('Infinite scroll regression checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });

