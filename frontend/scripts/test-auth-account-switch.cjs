const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const load = (file, mocks, globals = {}) => {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: name => name in mocks ? mocks[name] : require(name), console, setTimeout, clearTimeout, ...globals });
  return exports;
};
const deferred = () => { let resolve, reject; const promise = new Promise((yes,no) => { resolve=yes;reject=no; });return {promise,resolve,reject}; };
(async () => {
  const events = { logout: new Set(), login: new Set() };
  const authEvents = {
    dispatchLogout: () => events.logout.forEach(callback => callback()),
    dispatchLoginSuccess: () => events.login.forEach(callback => callback()),
    onLogout: callback => events.logout.add(callback), onLoginSuccess: callback => events.login.add(callback),
  };
  const version = load('utils/authSessionVersion.ts', {});
  const refresh = deferred(); const profiles = [];
  let logoutOperation = Promise.resolve(); let signinCalls = 0;
  const service = { refresh: () => refresh.promise, signIn: async () => { signinCalls++;return {accessToken:'admin-token'}; }, signOut: () => logoutOperation,
    fetchMe: () => {const request=deferred();profiles.push(request);return request.promise;} };
  const mocks = { '@/services/authService': {authService:service}, '@/utils/authEvents':authEvents, '@/utils/authSessionVersion':version,
    '@/utils/pageDeparture':{isPageDeparting:()=>false,getPageDepartureVersion:()=>0}, '@/utils/sessionRecovery':load('utils/sessionRecovery.ts',{}), '@/utils/safeStorage':{removeSessionItem(){},setSessionItem(){}},
    sonner:{toast:{success(){},error(){}}}, '@/i18n':{t:key=>key} };
  const auth = load('stores/useAuthStore.ts',mocks,{window:{},sessionStorage:{removeItem(){}}}).useAuthStore;
  const users = load('stores/useUserStore.ts',{...mocks,'./useAuthStore':{useAuthStore:auth}},{window:{}}).useUserStore;
  auth.getState().setAccessToken('member-token');
  users.setState({user:{_id:'member',username:'user111'}});
  const oldProfile = users.getState().fetchMe();
  const oldRefresh = auth.getState().refresh();
  await auth.getState().signIn('admin','test-only');
  assert.equal(users.getState().user,null,'Old account must clear immediately');
  profiles[1].resolve({_id:'admin',username:'admin123',isAdmin:true});
  await Promise.resolve();await Promise.resolve();
  profiles[0].resolve({_id:'member',username:'user111'});await oldProfile;
  refresh.resolve('old-member-token');await oldRefresh;
  assert.equal(auth.getState().accessToken,'admin-token','Late startup refresh cannot replace admin token');
  assert.equal(users.getState().user.username,'admin123','Late /me cannot replace admin profile');
  const slowLogout = deferred();logoutOperation=slowLogout.promise;
  const signout=auth.getState().signOut();
  const signing=auth.getState().signIn('admin','test-only');
  await Promise.resolve();assert.equal(signinCalls,1,'Login waits until old cookie logout is complete');
  slowLogout.resolve();await signout;await signing;
  profiles[2].resolve({_id:'admin',username:'admin123',isAdmin:true});await Promise.resolve();
  assert.equal(signinCalls,2);
  const guestVersion = load('utils/authSessionVersion.ts', {});
  const guestRefresh = deferred(); let guestRefreshCalls = 0;
  const guestAuth = load('stores/useAuthStore.ts', {...mocks,
    '@/utils/authSessionVersion': guestVersion,
    '@/utils/authEvents': {dispatchLogout(){},dispatchLoginSuccess(){}},
    '@/services/authService': {authService:{refresh:()=>{guestRefreshCalls++;return guestRefresh.promise;}}},
  }, {window:{},sessionStorage:{removeItem(){}}}).useAuthStore;
  const initialVersion = guestVersion.getAuthSessionVersion();
  const initOne = guestAuth.getState().initializeApp();
  const initTwo = guestAuth.getState().initializeApp();
  assert.equal(guestRefreshCalls,1,'StrictMode initializers must share refresh');
  guestRefresh.reject({response:{status:401}});
  await Promise.all([initOne,initTwo]);
  assert.equal(guestVersion.getAuthSessionVersion(),initialVersion,'Guest 401 must not cancel public requests');
  assert.equal(guestAuth.getState().isInitializing,false);
  await guestAuth.getState().initializeApp();
  assert.equal(guestRefreshCalls,1,'Completed initialization must not refresh again');
  console.log('PASS: guest 401 preserves public requests, startup refresh is single-flight');
  console.log('PASS: stale profile, stale refresh, clear previous account, logout/login cookie ordering');
})().catch(error=>{console.error(error);process.exitCode=1;});
