import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
const owner='000000000000000000000001',editor='000000000000000000000002',removed='000000000000000000000003',outsider='000000000000000000000004',id='000000000000000000000005';
let collection,snapshot,order,priorMembers,readProjection;
function query(value){return {populate(path,fields){if(path?.path==='collaborators.user')readProjection=path.select;return this;},lean:async()=>value,then(resolve,reject){return Promise.resolve(value).then(resolve,reject);}};}
mock.module('../src/models/Collection.js',{defaultExport:{findById:()=>query(collection),findOne:()=>query(collection),findByIdAndUpdate:async()=>{}}});
mock.module('../src/models/CollectionVersion.js',{defaultExport:{findOne:()=>query({snapshot,createdAt:new Date(0)})}});
mock.module('../src/services/collection/collectionVersionHelper.js',{namedExports:{createCollectionVersion:async()=>order.push('version')}});
mock.module('../src/services/realtime/roomPermissions.js',{namedExports:{clearPermissionCache:()=>order.push('room')}});
mock.module('../src/services/collection/collectionCache.js',{namedExports:{invalidateCollectionLists:async(c,previous)=>{order.push('lists');priorMembers=previous;}}});
const {restoreCollectionVersion}=await import('../src/controllers/collection/collectionVersionController.js');
const {getCollectionById}=await import('../src/controllers/collection/collectionReadController.js');
const {hasPermission,sameCollaboratorGrants}=await import('../src/controllers/collection/collectionHelpers.js');
function reset(){order=[];priorMembers=null;collection={_id:id,createdBy:{_id:owner},isPublic:false,collaborators:[{user:{_id:editor},permission:'edit'},{user:{_id:removed},permission:'view'}],images:[],save:async()=>order.push('save')};snapshot={name:'snapshot',isPublic:false,images:[],collaborators:[]};}
function invoke(handler,user){return new Promise((resolve,reject)=>{const res={status(code){this.code=code;return this;},json(body){resolve({code:this.code||200,body});}};Promise.resolve(handler({params:{collectionId:id,versionNumber:'1'},user:user?{_id:user}:undefined},res,reject)).catch(reject);});}
test('editor cannot restore historical admin grant or remove memberships, but can restore content with same grants',async()=>{
 reset();snapshot.collaborators=[{user:editor,permission:'admin'}];assert.equal((await invoke(restoreCollectionVersion,editor)).code,403);assert.deepEqual(order,[]);assert.equal(hasPermission(collection,editor,'admin'),false);
 snapshot.collaborators=[{user:removed,permission:'view'},{user:editor,permission:'edit'}];const original=collection.collaborators;
 assert.equal((await invoke(restoreCollectionVersion,editor)).code,200);assert.equal(collection.collaborators,original);assert.equal(collection.name,'snapshot');
});
test('owner restores access and invalidates both room and list caches including removed members before version logging',async()=>{
 reset();assert.equal((await invoke(restoreCollectionVersion,owner)).code,200);assert.deepEqual(collection.collaborators,[]);
 assert.deepEqual(order,['save','room','lists','version']);assert.deepEqual(priorMembers,[editor,removed]);
});
test('public collection details never select member email; outsiders and anonymous receive no collaborator list',async()=>{
 for(const viewer of [null,outsider,editor,owner]){reset();collection.isPublic=true;const result=await invoke(getCollectionById,viewer);assert.equal(result.code,200);assert.equal(readProjection.includes('email'),false);if(!viewer||viewer===outsider)assert.deepEqual(result.body.collection.collaborators,[]);else assert.equal(result.body.collection.collaborators.length,2);}
});
test('grant comparison handles populated IDs, order and differing permissions',()=>{
 assert.equal(sameCollaboratorGrants([{user:{_id:editor},permission:'edit'}],[{user:editor,permission:'edit'}]),true);
 assert.equal(sameCollaboratorGrants([{user:editor,permission:'edit'}],[{user:editor,permission:'admin'}]),false);
});
