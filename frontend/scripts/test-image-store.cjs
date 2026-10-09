const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const ts = require('typescript');
const path = require('path');
const root = path.resolve(__dirname, '..');
const pending = [];
const favorite = {getFavoriteCount: () => 0, updateFavoriteCount: () => {}};
const mocks = {
  sonner: {toast: {error: () => {}, success: () => {}}},
  '@/services/imageService': {imageService: {fetchImages: (params, signal) => new Promise((resolve, reject) => pending.push({params, signal, resolve, reject}))}},
  '@/utils/errorHandler': {getErrorMessage: e => e.message, getUploadErrorMessage: e => e.message, isCancelledRequest: e => e.name === 'AbortError'},
  './useImageFavoriteCountStore': {useImageFavoriteCountStore: {getState: () => favorite}},
};
function load(file) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  const customRequire = name => mocks[name] || (name.startsWith('.') ? load(path.resolve(path.dirname(file), name + '.ts')) : require(name));
  vm.runInNewContext(code, {exports, require: customRequire, AbortController, Date, Map, Set, console, setInterval, clearInterval});
  return exports;
}
const store = load(path.join(root, 'src/stores/useImageStore.ts')).useImageStore;
const image = id => ({_id: id, createdAt: '2000-01-01', imageUrl: id});
const response = (id, page = 1) => ({images: [image(id)], pagination: {page, pages: 3, total: 3, limit: 20}});
(async () => {
  const a = store.getState().fetchImages({category: 'A', page: 1});
  await store.getState().fetchImages({category: 'A', page: 1});
  assert.equal(pending.length, 1, 'duplicate pending request');
  const b = store.getState().fetchImages({category: 'B', page: 1});
  assert.equal(pending[0].signal.aborted, true);
  pending[1].resolve(response('B')); await b;
  pending[0].resolve(response('A')); await a;
  assert.equal(store.getState().images[0]._id, 'B', 'stale reply');
  const c = store.getState().fetchImages({category: 'A', page: 1});
  pending[2].resolve(response('A')); await c;
  await store.getState().fetchImages({category: 'B', page: 1});
  assert.equal(pending.length, 3, 'cross-category cache');
  const more = store.getState().fetchImages({category: 'B', page: 2});
  pending[3].resolve(response('B2', 2)); await more;
  assert.equal(store.getState().images.map(i => i._id).join(','), 'B,B2');
  const filtered = store.getState().fetchImages({category: 'B', page: 1, color: 'red'});
  pending[4].resolve(response('red')); await filtered;
  const filteredMore = store.getState().fetchImages({category: 'B', page: 2, color: 'red'});
  pending[5].resolve(response('red2', 2)); await filteredMore;
  assert.equal(store.getState().images.map(i => i._id).join(','), 'red,red2');
  await store.getState().fetchImages({category: 'B', page: 1});
  assert.equal(store.getState().images[0]._id, 'B', 'filtered data does not pollute cache');
  const old = store.getState().fetchImages({category: 'old', page: 1});
  const latest = store.getState().fetchImages({category: 'latest', page: 1});
  pending[6].reject(new Error('stale')); await old;
  assert.equal(store.getState().loading, true, 'stale failure leaves current request loading');
  pending[7].resolve(response('latest')); await latest;
  const controller = new AbortController();
  const abort = store.getState().fetchImages({search: 'test', page: 1}, controller.signal);
  controller.abort(); pending[8].resolve(response('aborted')); await abort;
  assert.equal(store.getState().images[0]._id, 'latest');
  const helpers = load(path.join(root, 'src/stores/helpers/imageStoreHelpers.ts'));
  assert.equal(helpers.hasFiltersChanged({}, undefined, 'search', 'location').searchChanged, true);
  assert.equal(helpers.hasFiltersChanged({}, undefined, 'search', 'location').locationChanged, true);
  console.log('PASS: latest category, deduplication, cache, stale errors, pagination, filtered pagination, cancellation, search reset.');
})().catch(error => {console.error(error); process.exitCode = 1;});
