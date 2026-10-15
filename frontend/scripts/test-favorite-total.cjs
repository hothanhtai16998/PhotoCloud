const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const ts = require('typescript');
require('immer').enableMapSet();
const listeners = new Map();
let fetches = 0;
const requests = [];
const window = {
  addEventListener: (name, callback) => listeners.set(name, callback),
  dispatchEvent: event => listeners.get(event.type)?.(event),
};
const exportsForStore = {};
const mocks = {
  zustand: require('zustand'),
  'zustand/middleware/immer': require('zustand/middleware/immer'),
  '@/utils/authEvents': { onLogout: () => {} },
  '@/services/favoriteService': { favoriteService: { getFavorites: () => { fetches++; return new Promise(resolve => requests.push(resolve)); } } },
};
const source = fs.readFileSync(path.resolve(__dirname, '../src/stores/useFavoriteStore.ts'), 'utf8');
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, {
  exports: exportsForStore, require: name => mocks[name], window,
  CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
  Map, Set, Date, console,
});
const store = exportsForStore.useFavoriteStore;
store.setState({ pagination: { page: 1, limit: 20, total: 2, pages: 1 } });
function publish(detail) { window.dispatchEvent({ type: 'favoriteCacheUpdated', detail }); }
const total = () => store.getState().pagination.total;
publish({ imageId: 'photo', isFavorited: true, previousIsFavorited: false });
assert.equal(total(), 3, 'Count updates synchronously without full image data');
publish({ imageId: 'photo', isFavorited: true, image: { _id: 'photo' } });
assert.equal(total(), 3, 'Image event must not double count');
assert.equal(store.getState().images.length, 1);
publish({ imageId: 'photo', isFavorited: false });
assert.equal(total(), 2);
publish({ imageId: 'photo', isFavorited: false });
assert.equal(total(), 2, 'Duplicate removal must not decrement twice');
publish({ imageId: 'outside-page', isFavorited: false, previousIsFavorited: true });
assert.equal(total(), 1, 'Removal outside loaded page still changes total');
publish({ imageId: 'outside-page', isFavorited: true });
assert.equal(total(), 2, 'Rollback restores total');
assert.equal(fetches, 0, 'Known header total needs no extra request');
console.log('PASS: immediate total, duplicate events, removal outside page, rollback, no extra API');

(async () => {
  const pending = store.getState().fetchFavorites();
  publish({ imageId: 'new-photo', isFavorited: true, previousIsFavorited: false, image: { _id: 'new-photo' } });
  publish({ imageId: 'old-photo', isFavorited: false, previousIsFavorited: true });
  const currentTotal = total();
  requests[0]({ images: [{ _id: 'old-photo' }], pagination: { page: 1, limit: 20, total: 50, pages: 3 } });
  await pending;
  assert.equal(total(), currentTotal, 'Late fetch must not overwrite updated total');
  assert.ok(store.getState().images.some(image => image._id === 'new-photo'));
  assert.ok(!store.getState().images.some(image => image._id === 'old-photo'));
  const older = store.getState().fetchFavorites();
  const newer = store.getState().fetchFavorites();
  requests[2]({ images: [{ _id: 'latest' }], pagination: { page: 1, limit: 20, total: 4, pages: 1 } });
  await newer;
  requests[1]({ images: [{ _id: 'stale' }], pagination: { page: 1, limit: 20, total: 99, pages: 5 } });
  await older;
  assert.equal(total(), 4);
  assert.ok(!store.getState().images.some(image => image._id === 'stale'));
  console.log('PASS: stale fetch, rapid add/remove, out-of-order responses');
})().catch(error => { console.error(error); process.exitCode = 1; });
