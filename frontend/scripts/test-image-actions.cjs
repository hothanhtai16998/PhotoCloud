const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const compile = source => ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const root = path.join(__dirname, '../src');
function store(state) {
  const listeners = new Set();
  return {getState:()=>state, subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},set:next=>{state=next;listeners.forEach(fn=>fn(state));},listeners};
}
const auth = store({accessToken:'token'}), user = store({user:{_id:'user-a'}});
const moduleContext = {exports:{},require:name=>name.includes('useAuthStore')?{useAuthStore:auth}:{useUserStore:user}};
vm.runInNewContext(compile(fs.readFileSync(path.join(root,'utils/imageActionSession.ts'),'utf8')), moduleContext);
const capture = moduleContext.exports.captureImageActionSession;
const deferred = () => {let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const source = fs.readFileSync(path.join(root,'pages/image/useImagePageActions.ts'),'utf8');
assert.match(source, /import '@\/stores\/useDownloadHistoryStore';/, 'direct routes must register the history event listener');
const block = source.slice(source.indexOf('  const handleDownload ='),source.indexOf('  const handleShare ='));
function harness() {
  auth.set({accessToken:'token'});user.set({user:{_id:'user-a'}});
  const transfer=deferred(), favorite=deferred();
  const seen={get:0,toggle:0,stats:0,links:0,history:0,favorites:[],counts:[],toasts:[],busy:false,revoked:0};
  const context={
    useCallback:fn=>fn,image:{_id:'photo-a',imageTitle:'Title',imageUrl:'photo.webp'},user:{_id:'user-a'},isFavorited:false,
    favoritePendingRef:{current:false},downloadPendingRef:{current:false},pageActiveRef:{current:true},currentImageIdRef:{current:'photo-a'},
    captureImageActionSession:capture,setIsDownloading:v=>seen.busy=v,setIsTogglingFavorite:()=>{},closeDownloadMenu:()=>{},setDownloads:()=>{},
    updateFavoriteCache:(_id,v)=>seen.favorites.push(v),updateFavoriteCount:(_id,v)=>seen.counts.push(v),updateStats:()=>{},apiStatsCache:new Map(),
    api:{get:()=>{seen.get++;return transfer.promise;}},favoriteService:{toggleFavorite:()=>{seen.toggle++;return favorite.promise;}},
    imageStatsService:{incrementDownload:async()=>{seen.stats++;return{downloads:5};}},
    toast:{success:v=>seen.toasts.push(v),error:v=>seen.toasts.push(v)},t:v=>v,navigate:()=>{},
    Blob,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL:()=>seen.revoked++},setTimeout:fn=>fn(),
    document:{body:{appendChild:()=>{}},createElement:()=>({click:()=>seen.links++,remove:()=>{}})},
    CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},
    window:{dispatchEvent:event=>{if(event.type==='downloadCompleted')seen.history++;}},
    require:()=>({useFavoriteStore:{getState:()=>({pagination:{},images:[]})}}),
  };
  vm.runInNewContext(compile(block)+'\nrunDownload=handleDownload;runFavorite=handleToggleFavorite;',context);
  return{context,seen,transfer,favorite};
}
(async()=>{
  let session=capture();auth.set({accessToken:'refreshed'});assert.equal(session.isCurrent(),true);
  auth.set({accessToken:null});auth.set({accessToken:'token'});assert.equal(session.isCurrent(),false);session.dispose();
  assert.equal(auth.listeners.size,0);assert.equal(user.listeners.size,0);
  let h=harness();let task=h.context.runDownload('medium');await h.context.runDownload('small');assert.equal(h.seen.get,1);assert.equal(h.seen.stats,0);
  h.transfer.reject(new Error('failed'));await task;assert.equal(h.seen.stats,0);assert.equal(h.seen.history,0);assert.equal(h.seen.busy,false);
  h=harness();task=h.context.runDownload('medium');h.transfer.resolve({data:'image',headers:{'content-disposition':'attachment; filename="photo.webp"'}});await task;
  assert.equal(h.seen.stats,1);assert.equal(h.seen.history,1);assert.equal(h.seen.links,1);assert.equal(h.seen.revoked,1);
  h=harness();task=h.context.runDownload('medium');h.context.currentImageIdRef.current='photo-b';h.transfer.resolve({data:'image',headers:{}});await task;
  assert.equal(h.seen.stats,1);assert.equal(h.seen.history,1);assert.equal(h.seen.toasts.length,0);
  h=harness();task=h.context.runDownload('medium');user.set({user:{_id:'user-b'}});h.transfer.resolve({data:'image',headers:{}});await task;
  assert.equal(h.seen.history,0);assert.equal(h.seen.stats,0);assert.equal(h.seen.toasts.length,0);
  h=harness();task=h.context.runFavorite();await h.context.runFavorite();assert.equal(h.seen.toggle,1);
  h.favorite.reject({response:{status:403}});await task;assert.equal(h.seen.toggle,1,'permission denial must not replay a toggle');assert.deepEqual(h.seen.favorites,[true,false]);
  h=harness();task=h.context.runFavorite();user.set({user:{_id:'user-b'}});h.favorite.resolve({isFavorited:true,favoriteCount:10});await task;
  assert.deepEqual(h.seen.favorites,[true]);assert.equal(h.seen.toasts.length,0);
  h=harness();task=h.context.runFavorite();h.favorite.resolve({isFavorited:true,favoriteCount:0});await task;
  assert.deepEqual(h.seen.favorites,[true,true]);assert.equal(h.seen.toasts[0],'favorites.added');
  assert.deepEqual(h.seen.counts,[0]);
  assert.equal(auth.listeners.size,0);assert.equal(user.listeners.size,0);
  const controller=fs.readFileSync(path.join(root,'pages/image/useImagePageController.ts'),'utf8');
  const menuEffect=controller.slice(controller.indexOf('  useLayoutEffect(() => {', controller.indexOf('const downloadMenuRef')),controller.indexOf('  // Edit modal state'));
  let cleanup;const events=new Map(),rect={top:200,bottom:236};
  const menu={style:{},scrollHeight:276,querySelector:()=>null,parentElement:{querySelector:()=>({getBoundingClientRect:()=>rect})}};
  let observerDisconnected=false;
  const layout={showDownloadMenu:true,downloadMenuRef:{current:menu},ResizeObserver:class{observe(){}disconnect(){observerDisconnected=true;}},useLayoutEffect:fn=>cleanup=fn(),window:{innerHeight:320,addEventListener:(key,fn)=>events.set(key,fn),removeEventListener:key=>events.delete(key)}};
  vm.runInNewContext(compile(menuEffect),layout);
  assert.equal(menu.style.bottom,'calc(100% + 8px)');assert.equal(menu.style.maxHeight,'180px');
  layout.window.innerHeight=844;events.get('resize')();assert.equal(menu.style.top,'100%');assert.equal(menu.style.maxHeight,'588px');
  rect.top=30;rect.bottom=66;events.get('scroll')();assert.equal(menu.style.maxHeight,'758px');
  cleanup();assert.equal(events.size,0);assert.equal(observerDisconnected,true);
  console.log('Image actions: duplicate locks, success-only tracking, stale photo/session, rollback and cleanup passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
