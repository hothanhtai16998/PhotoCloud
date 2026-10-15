const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const ts = require('typescript');

function fixture() {
  let auth = { accessToken: 'original' };
  const subscribers = new Set();
  const logoutListeners = new Set();
  const writes = [];
  const messages = [];
  const requests = [];
  const store = selector => selector(auth);
  store.getState = () => auth;
  store.subscribe = callback => {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
  };
  const jsx = (type, props) => ({ type, props });
  const mocks = {
    react: {
      useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
      useRef: initial => ({ current: initial }), useEffect: () => {}, useLayoutEffect: () => {},
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-dom': { flushSync: callback => callback() },
    'lucide-react': {},
    sonner: { toast: { success: message => messages.push(message), error: message => messages.push(message) } },
    '@/i18n': { t: key => key },
    '@/stores/useAuthStore': { useAuthStore: store },
    '@/stores/useImageFavoriteCountStore': { useImageFavoriteCountStore: { getState: () => ({ updateFavoriteCount: (...args) => writes.push(args) }) } },
    '@/hooks/useBatchedFavoriteCheck': { useBatchedFavoriteCheck: () => false, updateFavoriteCache: (...args) => writes.push(args) },
    '@/utils/authEvents': { onLogout: callback => {
      logoutListeners.add(callback);
      return () => logoutListeners.delete(callback);
    } },
    '@/services/favoriteService': { favoriteService: { toggleFavorite: id => new Promise((resolve, reject) => requests.push({ id, resolve, reject })) } },
    './TimedCardSlider.css': {},
  };
  const exports = {};
  const source = fs.readFileSync(path.resolve(__dirname, '../src/components/TimedCardSlider.tsx'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: name => {
    assert.ok(name in mocks, `Unexpected dependency ${name}`);
    return mocks[name];
  }, window: { matchMedia: () => ({ matches: true }) }, console });
  const tree = exports.TimedCardSlider({ slides: [{ id: '0123456789abcdef01234567', title: 'Photo', image: '/photo.jpg' }] });
  function find(node) {
    if (!node || typeof node !== 'object') return;
    if (node.props?.className === 'bookmark ') return node;
    const children = node.props?.children;
    for (const child of Array.isArray(children) ? children.flat() : [children]) {
      const match = find(child);
      if (match) return match;
    }
  }
  return {
    click: find(tree).props.onClick, writes, messages, requests,
    token: value => { auth = { accessToken: value }; subscribers.forEach(callback => callback(auth)); },
    logout: () => logoutListeners.forEach(callback => callback()),
    listeners: () => subscribers.size + logoutListeners.size,
  };
}

(async () => {
  const refreshed = fixture();
  const pending = refreshed.click();
  assert.equal(refreshed.writes[0][1], true, 'Bookmark must change before API resolves');
  await refreshed.click();
  assert.equal(refreshed.requests.length, 1, 'Repeated clicks must not toggle twice');
  refreshed.token('refreshed');
  refreshed.requests[0].resolve({ isFavorited: true, favoriteCount: 3 });
  await pending;
  assert.equal(refreshed.writes.length, 3, 'Token refresh must preserve successful cache/count updates');
  assert.equal(refreshed.messages[0], 'favorites.added');
  assert.equal(refreshed.listeners(), 0);

  const switched = fixture();
  const oldRequest = switched.click();
  switched.token(null);
  switched.logout();
  switched.token('another-session');
  switched.requests[0].resolve({ isFavorited: true });
  await oldRequest;
  assert.equal(switched.writes.length, 1, 'Old response must not update a new session after optimistic change');
  assert.equal(switched.messages.length, 0);
  assert.equal(switched.listeners(), 0);

  const failed = fixture();
  const failure = failed.click();
  failed.requests[0].reject(new Error('Network failure'));
  await failure;
  assert.equal(failed.writes[1][1], false, 'Failed request must roll back bookmark');
  assert.equal(failed.messages[0], 'favorites.updateFailed');
  const retry = failed.click();
  failed.requests[1].resolve({ isFavorited: false });
  await retry;
  assert.equal(failed.messages[1], 'favorites.removed');
  assert.equal(failed.listeners(), 0);
  console.log('PASS: refresh, duplicate clicks, session switch, failure and retry');
})().catch(error => { console.error(error); process.exitCode = 1; });
