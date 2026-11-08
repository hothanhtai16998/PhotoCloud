import test from 'node:test';
import assert from 'node:assert/strict';
import { cached, deleteCache, clearCache, getCache, setCache } from '../src/services/cache/queryCache.js';
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}

test('concurrent cache misses share one read; failed reads can be retried',async()=>{
 clearCache();const read=deferred();let calls=0;
 const first=cached('shared',()=>{calls++;return read.promise;});
 const second=cached('shared',()=>{calls++;return 'unexpected';});
 await Promise.resolve();assert.equal(calls,1);read.resolve('value');
 assert.deepEqual(await Promise.all([first,second]),['value','value']);assert.equal(getCache('shared'),'value');
 await assert.rejects(cached('failure',()=>{throw new Error('fixture');}),/fixture/);
 assert.equal(await cached('failure',()=> 'retry'),'retry');
});

test('invalidation during a read prevents stale data replacing a newer cached result',async()=>{
 clearCache();const oldRead=deferred();const old=cached('collection',()=>oldRead.promise);
 await Promise.resolve();deleteCache('collection');
 assert.equal(await cached('collection',()=> 'updated'),'updated');
 oldRead.resolve('outdated');assert.equal(await old,'outdated');
 assert.equal(getCache('collection'),'updated');
});

test('clear and explicit writes also invalidate in-flight ownership',async()=>{
 for(const action of [()=>clearCache(),()=>setCache('entry','manual')]){
  clearCache();const read=deferred();const pending=cached('entry',()=>read.promise);await Promise.resolve();action();
  read.resolve('old');await pending;assert.notEqual(getCache('entry'),'old');
 }
});
