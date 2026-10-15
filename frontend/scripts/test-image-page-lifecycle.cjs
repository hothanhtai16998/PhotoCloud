const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(require('node:path').join(__dirname, '../src/pages/image/useImagePageController.ts'), 'utf8');
const extract = (start, end) => ts.transpileModule(source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start))), {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const dataSource = fs.readFileSync(require('node:path').join(__dirname, '../src/pages/image/useImagePageData.ts'), 'utf8');
const fetchEffect = ts.transpileModule(dataSource.slice(dataSource.indexOf('  // Fetch image'), dataSource.lastIndexOf('}')), {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const statsEffect = extract('  // Increment view count when image is viewed', '  // Image loading logic');
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => {resolve=a; reject=b;}); return {promise,resolve,reject}; };
const flush = () => new Promise(resolve => setImmediate(resolve));
const state = { image:null, images:[], loading:false, error:null, views:0 };
const pending = [];
const related = [];
function runFetch(id, passedState) {
  let cleanup;
  const context = {
    window:{addEventListener(){},removeEventListener(){}}, navigator:{onLine:true},
    AbortController, imageId:id, attempt:0, navigationState:passedState, locationWithState:{state:passedState},
    initialLocationStateRef:{current:passedState}, manuallySetImageRef:{current:null},
    useEffect:fn => {cleanup=fn();},
    setImage:value => {state.image=value;}, setImages:value => {state.images=value;},
    setLoading:value => {state.loading=value;}, setError:value => {state.error=value;},
    setImageSourceAndState:()=>{},
    imageService:{fetchImageById:(_id,signal)=>{const request=deferred();pending.push({...request,signal});return request.promise;},fetchImages:(_params,signal)=>{const request=deferred();related.push({...request,signal});return request.promise;}},
  };
  vm.runInNewContext(fetchEffect,context);
  return cleanup;
}
async function main() {
  const first={_id:'000000000000000000000001'}, second={_id:'000000000000000000000002'};
  const dispose=runFetch(first._id.slice(-12));
  dispose();
  assert.equal(pending[0].signal.aborted,true);
  runFetch(second._id.slice(-12));
  pending[1].resolve(second);
  await flush();
  assert.equal(state.image._id,second._id);
  assert.equal(state.loading,false,'related photos must not delay the selected photo');
  related[0].reject(new Error('related photos unavailable'));
  await flush();
  assert.equal(state.error,null,'related failure must not hide the selected photo');
  pending[0].resolve(first);
  await flush();
  assert.equal(state.image._id,second._id,'stale success must not replace the current image');
  const stale=runFetch(first._id.slice(-12));
  stale();
  runFetch(second._id.slice(-12),{image:second,images:[second]});
  pending[2].reject(new Error('late error'));
  await flush();
  assert.equal(state.error,null,'stale failure must not overwrite the current page');
  assert.equal(state.loading,false);
  const beforeInvalid=pending.length;
  runFetch('invalid');
  assert.equal(pending.length,beforeInvalid,'invalid slug must not request the API');
  const requests=new Map(), cache=new Map(), increments={current:new Set()}, stored=[];
  const runStats = image => {
    let cleanup;
    vm.runInNewContext(statsEffect,{
      image,incrementedViewIds:increments,apiStatsCache:cache,
      updateStats:(id,value)=>stored.push({id,value}),setViews:value=>{state.views=value;},
      useEffect:fn=>{cleanup=fn();},
      imageStatsService:{incrementView:id=>{const request=deferred();requests.set(id,request);return request.promise;}},
    });
    return cleanup;
  };
  const leave=runStats(first);
  leave();
  runStats(second);
  requests.get(second._id).resolve({views:222});
  await flush();
  requests.get(first._id).resolve({views:111});
  await flush();
  assert.equal(state.views,222,'late view tracking must not update another image');
  assert.equal(cache.get(first._id).views,111,'old image statistics may still update their own cache');
  assert.equal(stored.length,2);
  console.log('ImagePage lifecycle: stale success/error, abort, state fast path and view responses passed.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
