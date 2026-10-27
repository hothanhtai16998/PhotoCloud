const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const code = ts.transpileModule(fs.readFileSync('src/stores/useSliderStore.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const slide = { id: 'one', title: 'One', image: '/small.jpg', fullImage: '/original.jpg', width: 1200, height: 800 };

function loadStore(cached, fetchImages = async () => { throw new Error('offline'); }) {
  let saved = cached;
  const exports = {};
  vm.runInNewContext(code, {
    exports, Date, JSON, Number,
    require(name) {
      if (name === '@/services/imageService') return { imageService: { fetchImages } };
      if (name === '@/utils/safeStorage') return {
        getSessionItem: () => saved,
        setSessionItem: (_, value) => { saved = value; },
        removeSessionItem: () => { saved = null; },
      };
      return require(name);
    },
  });
  return { store: exports.useSliderStore, cached: () => saved };
}

(async () => {
  const fresh = JSON.stringify({ slides: [slide], lastFetchedAt: Date.now() });
  const restored = loadStore(fresh);
  assert.equal(restored.store.getState().slides[0].id, 'one');
  assert.equal(restored.store.getState().hasLoaded, true);
  await restored.store.getState().fetchSlides();
  assert.equal(restored.store.getState().slides.length, 1, 'API failure keeps visible slides');
  const failed = loadStore(null);
  await failed.store.getState().fetchSlides();
  assert.equal(failed.store.getState().error,true,'Network failure must differ from empty');
  assert.equal(failed.store.getState().loading,false);
  const empty = loadStore(null,async()=>({images:[]}));
  await empty.store.getState().fetchSlides();
  assert.equal(empty.store.getState().error,false,'Successful empty response is not an error');
  let attempt=0;
  const retry=loadStore(null,async()=>{if(attempt++===0)throw new Error('offline');return {images:[{_id:'retry',imageUrl:'/test.jpg',width:100,height:100}]};});
  await retry.store.getState().fetchSlides();
  assert.equal(retry.store.getState().error,true);
  await retry.store.getState().fetchSlides();
  assert.equal(retry.store.getState().error,false);
  assert.equal(retry.store.getState().slides[0].id,'retry');
  restored.store.getState().clearSlides();
  assert.equal(restored.cached(), null);
  for (const invalid of ['{broken', 'null', JSON.stringify({ slides: [null], lastFetchedAt: Date.now() }), JSON.stringify({ slides: [slide], lastFetchedAt: Date.now() - 16 * 60 * 1000 })]) {
    assert.equal(loadStore(invalid).store.getState().slides.length, 0);
  }
  const fetched = loadStore(null, async () => ({ images: [{ _id: 'one', imageUrl: '/original.jpg', regularUrl: '/regular.jpg', width: 1200, height: 800 }] }));
  await fetched.store.getState().fetchSlides();
  assert.equal(fetched.store.getState().slides[0].image, '/regular.jpg');
  assert.equal(loadStore(fetched.cached()).store.getState().slides.length, 1, 'next refresh restores fetched metadata');
  const requests=[];
  const racing=loadStore(null,()=>new Promise((resolve,reject)=>requests.push({resolve,reject})));
  const old=racing.store.getState().fetchSlides();
  const latest=racing.store.getState().fetchSlides();
  requests[1].resolve({images:[{_id:'latest',imageUrl:'/latest.jpg',width:100,height:100}]});await latest;
  requests[0].resolve({images:[{_id:'old',imageUrl:'/old.jpg',width:100,height:100}]});await old;
  assert.equal(racing.store.getState().slides[0].id,'latest','late response cannot replace newer slides');
  const clearing=racing.store.getState().fetchSlides();racing.store.getState().clearSlides();
  requests[2].resolve({images:[{_id:'cleared',imageUrl:'/cleared.jpg',width:100,height:100}]});await clearing;
  assert.equal(racing.store.getState().slides.length,0,'cleared slides cannot be restored by stale request');
  console.log('Slider refresh checks passed: restore, expiry, corrupt cache, fetch, failure, clear.');
})().catch(error => { console.error(error); process.exitCode = 1; });
