import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
let fail=false, calls=[];
mock.module('../src/services/cache/queryCache.js',{namedExports:{generateCacheKey:(name,params)=>`${name}:${params.userId}`,deleteCache:key=>calls.push(['query',key])}});
mock.module('../src/middlewares/cacheMiddleware.js',{namedExports:{clearCollectionsCache:id=>{calls.push(['response',String(id)]);if(fail)throw new Error('cache unavailable');return 2;}}});
mock.module('../src/utils/logger.js',{namedExports:{logger:{info(){},error(){}}}});
const {invalidateUserCollections}=await import('../src/services/collection/collectionCache.js');
test('collection mutations invalidate both caches in order and tolerate response-cache errors',async()=>{
 const id={toString:()=> 'owner'};
 await invalidateUserCollections(id);
 assert.deepEqual(calls,[['query','userCollections:owner'],['response','owner']]);
 fail=true;calls=[];await assert.doesNotReject(invalidateUserCollections(id));
 assert.deepEqual(calls,[['query','userCollections:owner'],['response','owner']]);
});
