const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
let version = 0, logout, login, resolveRead, rejectRead, calls = 0, deleteCalls = 0, resolveDelete;
const service = {
 getUserCollections: () => { calls++; return new Promise((resolve, reject) => { resolveRead = resolve; rejectRead = reject; }); },
 deleteCollection: () => { deleteCalls++; return new Promise(resolve => { resolveDelete = resolve; }); },
};
function load(file) {
 const context = { exports: {}, require: name => {
  if (name === 'zustand') return require('zustand');
  if (name.includes('collectionService')) return { collectionService: service };
  if (name.includes('useAuthStore')) return { useAuthStore: { getState: () => ({ accessToken: 'fixture' }) } };
  if (name.includes('authSessionVersion')) return { getAuthSessionVersion: () => version };
  if (name.includes('authEvents')) return { onLogout: fn => { logout = fn; }, onLoginSuccess: fn => { login = fn; } };
  throw new Error(name);
 }, AbortController, Date, console };
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
 return context.exports;
}
(async () => {
 const store = load('stores/useCollectionsListStore.ts').useCollectionsListStore;
 const filter = load('utils/collectionList.ts').filterCollections;
 const rows = [{ _id: 'a', name: 'Ánh sáng', createdAt: '2026-10-01', isPublic: false, tags: ['studio'], imageCount: 2 }, { _id: 'b', name: 'Bình yên', createdAt: '2026-10-02', isPublic: true, description: 'Tiếng Việt %', imageCount: 5 }];
 const pending = store.getState().fetchCollections(); await store.getState().fetchCollections(); assert.equal(calls, 1, 'deduplicate reads'); resolveRead(rows); await pending;
 const visible = () => filter(store.getState().collections, store.getState());
 let notifications = 0; const unsubscribe = store.subscribe(() => notifications++);
 store.getState().setSearchQuery('Ánh'); assert.equal(notifications, 1); unsubscribe(); assert.equal(visible()[0]._id, 'a'); store.getState().clearFilters();
 const large = Array.from({ length: 1000 }, (_, index) => ({ ...rows[index % 2], _id: String(index) }));
 const start = performance.now(); const result = filter(large, store.getState()); const filterMs = performance.now() - start;
 fs.writeFileSync(path.join(__dirname, '../qa-policy-checkbox/collections-filter-performance.json'), JSON.stringify({ rows: large.length, result: result.length, filterMs, notificationsPerSearch: notifications }, null, 2));
 assert.equal(visible()[0]._id, 'b'); store.getState().setSearchQuery(' ánh '); assert.equal(visible()[0]._id, 'a');
 store.getState().setSearchQuery('%'); assert.equal(visible()[0]._id, 'b'); store.getState().clearFilters();
 store.getState().setSelectedTag('studio'); assert.equal(visible().length, 1); store.getState().setShowPublicOnly(true); assert.equal(visible().length, 0); store.getState().clearFilters();
 store.getState().setSortBy('oldest'); assert.equal(visible()[0]._id, 'a'); store.getState().setSortBy('images'); assert.equal(visible()[0]._id, 'b');
 const read = store.getState().refreshCollections(); const oldResolve = resolveRead;
 const deletion = store.getState().deleteCollection('a'); assert.equal(await store.getState().deleteCollection('a'), false); assert.equal(deleteCalls, 1); resolveDelete(); assert.equal(await deletion, true); oldResolve(rows); await read; assert.equal(store.getState().collections.length, 1, 'old read cannot resurrect deleted row');
 const failed = store.getState().fetchCollections(); rejectRead(new Error('offline')); await failed; assert.ok(store.getState().error); assert.equal(store.getState().collections.length, 1, 'keep cache on errors');
 const stale = store.getState().refreshCollections(); version++; logout(); resolveRead(rows); await stale; assert.equal(store.getState().collections.length, 0); assert.equal(store.getState().loading, false);
 store.getState().addCollection(rows[0]); store.getState().addCollection(rows[0]); assert.equal(store.getState().collections.length, 1); login(); assert.equal(store.getState().collections.length, 0);
 assert.equal(rows[0]._id, 'a', 'sort never mutates source'); console.log('PASS: current filters, combined filters, sorting, deduplication, stale reads, logout, cache/error and mutation locking.');
})().catch(error => { console.error(error); process.exitCode = 1; });
