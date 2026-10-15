const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const events=new Map(),deleted=[];let networkCalls=0,cacheReads=0;
const self={location:{origin:'http://localhost'},clients:{claim(){}},skipWaiting(){},addEventListener:(name,handler)=>events.set(name,handler)};
vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../public/sw.js'),'utf8'),{self,URL,Response,console,fetch:async()=>{networkCalls++;throw new Error('offline');},caches:{keys:async()=>['photo-app-api-v3','photo-app-images-v3'],delete:async key=>deleted.push(key),match:async()=>{cacheReads++;return new Response('cached user111');}}});
(async()=>{
  let activation;events.get('activate')({waitUntil:promise=>{activation=promise;}});await activation;
  assert.ok(deleted.includes('photo-app-api-v3'));assert.ok(!deleted.includes('photo-app-images-v3'));
  let response;events.get('fetch')({request:{url:'http://localhost/api/users/me',method:'GET',headers:new Headers()},respondWith:promise=>{response=promise;}});
  await assert.rejects(response,/offline/);assert.equal(networkCalls,1);assert.equal(cacheReads,0,'Never return cached account while offline');
  for (const pathname of ['/src/components/ui/GlobalLoadingOverlay.css', '/src/main.tsx', '/@vite/client', '/node_modules/.vite/deps/react.js']) {
    events.get('fetch')({request:{url:'http://localhost'+pathname,method:'GET',headers:new Headers()},respondWith:promise=>{response=promise;}});
    await assert.rejects(response,/offline/);
    assert.equal(cacheReads,0,'Vite source must never use stale static cache');
  }
  console.log('PASS: old API cache removed, image cache preserved, offline /me never replays account');
  console.log('PASS: Vite CSS, source, HMR and dependency modules bypass stale cache');
})().catch(error=>{console.error(error);process.exitCode=1;});
