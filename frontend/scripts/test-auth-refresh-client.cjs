const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ts = require('typescript'), axios = require('axios');
function load(file, mocks, globals = {}) {
  const source = fs.readFileSync(path.resolve(__dirname, '../src', file), 'utf8').replaceAll('import.meta.env', "({MODE:'production'})");
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText,
    { exports, require: name => name in mocks ? mocks[name] : require(name), console, setTimeout, clearTimeout, AbortController, ...globals });
  return exports;
}
(async () => {
  const policy = load('utils/sessionRecovery.ts', {});
  assert.equal(policy.sessionRetryDelay({response:{headers:{'retry-after':'120'}}},0),null,'long cooldown never starts an automatic retry loop');
  assert.equal(policy.sessionRetryDelay({code:'ERR_CANCELED'},0),null,'cancelled navigation never retries');
  const version = load('utils/authSessionVersion.ts', {});
  let auth, refreshCalls = 0, rejectRefresh = null;
  const storage = new Map();
  const globals = { window: { addEventListener() {} }, document: { cookie: 'XSRF-TOKEN=fixture', addEventListener() {} } };
  const departure = load('utils/pageDeparture.ts',{});
  const api = load('lib/axios.ts', { axios, '@/stores/useAuthStore': { get useAuthStore() { return auth; } }, '@/config/appConfig': { appConfig: { apiTimeout: 1000 } }, '@/utils/authSessionVersion': version, '@/utils/pageDeparture':departure }, globals).default;
  api.defaults.adapter = async config => {
    const response = (status, data) => ({ status, statusText: String(status), data, headers: {}, config });
    if (config.url === '/auth/refresh') {
      refreshCalls++;
      await new Promise(r => setTimeout(r, 20));
      if (rejectRefresh === 'malformed') return response(200, {});
      if (rejectRefresh === 'network' || rejectRefresh === 'timeout') throw new axios.AxiosError('Temporary failure', rejectRefresh === 'timeout' ? 'ECONNABORTED' : 'ERR_NETWORK', config);
      if (rejectRefresh) throw new axios.AxiosError('Rejected', undefined, config, undefined, response(rejectRefresh, {}));
      return response(200, { accessToken: 'new-token' });
    }
    if (!config._retryCount) throw new axios.AxiosError('Expired access token', undefined, config, undefined, response(401, {}));
    return response(200, { success: true });
  };
  const authService = load('services/authService.ts', { '@/lib/axios': api, '@/utils/authSessionVersion': version, '@/utils/pageDeparture':departure }).authService;
  const events = { dispatchLogout() {}, dispatchLoginSuccess() {} };
  auth = load('stores/useAuthStore.ts', {
    '@/services/authService': { authService }, '@/utils/authSessionVersion': version, '@/utils/pageDeparture':departure,
    '@/utils/sessionRecovery': load('utils/sessionRecovery.ts', {}), '@/utils/authEvents': events,
    '@/utils/safeStorage': { removeSessionItem: k => storage.delete(k), setSessionItem: (k, v) => storage.set(k, v) },
    '@/i18n': { t: key => key }, sonner: { toast: { error() {}, success() {} } },
  }, globals).useAuthStore;
  auth.getState().setAccessToken('old-token');
  await Promise.all(Array.from({ length: 8 }, (_, i) => api.get('/protected/' + i)));
  assert.equal(refreshCalls, 1, 'concurrent protected 401s share one refresh');
  assert.equal(auth.getState().accessToken, 'new-token');
  // Startup and an interceptor must also join the same HTTP refresh.
  refreshCalls = 0;
  await Promise.all([auth.getState().refresh(), api.get('/protected/concurrent'), authService.refresh()]);
  assert.equal(refreshCalls, 1);
  for (const failure of [429, 503, 'network', 'timeout', 'malformed']) {
    rejectRefresh = failure;
    const before = version.getAuthSessionVersion();
    await assert.rejects(api.get('/protected/failure'), error => {
      assert.equal(error.response?.status, typeof failure === 'number' ? failure : undefined, 'temporary refresh error is never replaced with 401');
      return true;
    });
    assert.equal(auth.getState().accessToken, 'new-token');
    assert.equal(version.getAuthSessionVersion(), before);
    assert.ok(auth.getState().sessionError);
  }
  rejectRefresh = 401;
  await assert.rejects(api.get('/protected/expired'));
  assert.equal(auth.getState().accessToken, null);
  assert.equal(auth.getState().sessionError, null);
  // Bounded initialization, logout while waiting cancels retries and late results.
  rejectRefresh = 503; refreshCalls = 0;
  auth.setState({ isInitializing: true });
  const initializing = auth.getState().initializeApp();
  await new Promise(r => setTimeout(r, 60));
  auth.getState().clearAuth();
  await initializing;
  assert.equal(refreshCalls, 1, 'logout cancels scheduled retry');
  console.log('PASS shared refresh flight, original error status, network/timeout preservation, rejected session and logout during retry');
})().catch(error => { console.error(error); process.exitCode = 1; });
