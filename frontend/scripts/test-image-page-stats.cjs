const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const stats = new Map(), favorites = new Map(), pending = new Map();
const rooms = [], layouts = [], effects = [];
let socket;
const store = {
  imageStats: stats, getStats: id => stats.get(id),
  updateStats: (id, update) => stats.set(id, { ...stats.get(id), ...Object.fromEntries(Object.entries(update).filter(([, value]) => value !== undefined)) }),
};
const favoriteStore = {
  favoriteCounts: favorites,
  updateFavoriteCount: (id, count) => favorites.set(id, count),
};
const select = state => Object.assign(selector => selector(state), { getState: () => state });
const source = fs.readFileSync(path.join(__dirname, '../src/pages/image/useImagePageStats.ts'), 'utf8');
const moduleContext = { exports: {}, require: name => {
  if (name === 'react') return {
    useCallback: fn => fn, useRef: current => ({ current }),
    useLayoutEffect: fn => layouts.push(fn), useEffect: fn => effects.push(fn),
  };
  if (name.includes('useImageStatsStore')) return { useImageStatsStore: select(store) };
  if (name.includes('useImageFavoriteCountStore')) return { useImageFavoriteCountStore: select(favoriteStore) };
  if (name.includes('useWebSocket')) return { useWebSocket: options => {
    socket = options;
    return { isConnected: true, joinImageRoom: id => rooms.push(['join', id]), leaveImageRoom: id => rooms.push(['leave', id]) };
  } };
  if (name.includes('imageStatsService')) return { imageStatsService: { incrementView: id => new Promise((resolve, reject) => pending.set(id, {resolve, reject})) } };
  throw new Error(name);
} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, moduleContext);
(async () => {
  const hook = moduleContext.exports.useImagePageStats;
  const image = { _id: 'a', views: 3, downloads: 2, favoriteCount: 1 };
  hook(image, 'viewer');
  layouts[0]();
  assert.equal(stats.get('a').views, 3);
  const leave = effects[0](); effects[1]();
  pending.get('a').resolve({ views: 4, dailyViews: { today: 4 } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(stats.get('a').views, 4);
  socket.onImageStatsUpdate({ imageId: 'a', views: 10, downloads: 7 });
  layouts[0](); // Old grid data and reconnect cannot overwrite the newer counters.
  leave(); effects[0]();
  assert.equal(stats.get('a').views, 10);
  assert.equal(stats.get('a').downloads, 7);
  socket.onImageStatsUpdate({ imageId: 'b', views: 999, downloads: 999 });
  assert.equal(stats.get('a').views, 10);
  socket.onImageFavoriteUpdate({ imageId: 'a', actorId: 'viewer', favoriteCount: 99 });
  assert.equal(favorites.get('a'), 1);
  socket.onImageFavoriteUpdate({ imageId: 'a', actorId: 'other', favoriteCount: 2 });
  assert.equal(favorites.get('a'), 2);
  const derived = hook(image, 'viewer');
  assert.equal(derived.views, 10); assert.equal(derived.downloads, 7);
  assert.equal(derived.chartImage.views, 10);
  assert.equal(derived.chartImage.dailyViews.today, 4);
  assert.equal(derived.favoriteCount, 2);
  assert.deepEqual(rooms, [['join', 'a'], ['leave', 'a'], ['join', 'a']]);
  console.log('Image stats: shared counters, socket updates, reconnect, actor filtering and chart consistency passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
