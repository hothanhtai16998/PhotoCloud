import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
mock.module('../src/middlewares/cacheMiddleware.js',{namedExports:{clearCollectionsCache:()=>0}});
const {invalidateCollectionLists}=await import('../src/services/collection/collectionCache.js');
const {cached,getCache,setCache,generateCacheKey,clearCache}=await import('../src/services/cache/queryCache.js');
const key=userId=>generateCacheKey('userCollections',{userId});
test('membership invalidation removes all affected lists and blocks stale pending repopulation',async()=>{
 clearCache();setCache(key('owner'),['old']);setCache(key('unrelated'),['untouched']);
 let resolve;const pending=cached(key('removed'),()=>new Promise(r=>{resolve=r;}));await Promise.resolve();
 await invalidateCollectionLists({createdBy:'owner',collaborators:[{user:'new-member'}]},['removed']);
 resolve(['private-old-data']);await pending;
 assert.equal(getCache(key('owner')),null);assert.equal(getCache(key('removed')),null);
 assert.deepEqual(getCache(key('unrelated')),['untouched']);
 assert.deepEqual(await cached(key('removed'),()=>[]),[]);
});
