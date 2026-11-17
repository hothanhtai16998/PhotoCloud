import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
const id='507f1f77bcf86cd799439012',owner='507f1f77bcf86cd799439011',collab='507f1f77bcf86cd799439013';
let order=[];
const collection={_id:id,name:'fixture',collaborators:[{user:collab}],save:async()=>order.push('save')};
const result={then(resolve,reject){return Promise.resolve(collection).then(resolve,reject);},populate(){return this;},lean:async()=>collection};
mock.module('../src/models/Collection.js',{defaultExport:{findById:()=>result}});
mock.module('../src/models/User.js',{defaultExport:{}});
mock.module('../src/models/Notification.js',{defaultExport:{create:async()=>order.push('notification')}});
mock.module('../src/controllers/collection/collectionHelpers.js',{namedExports:{getUserId:x=>String(x),hasPermission:()=>true}});
mock.module('../src/services/realtime/roomPermissions.js',{namedExports:{clearPermissionCache:(type,resource)=>{assert.equal(type,'collection');assert.equal(resource,id);order.push('invalidate');}}});
mock.module('../src/services/collection/collectionCache.js',{namedExports:{invalidateCollectionLists:async(collection,extra)=>{assert.deepEqual(extra,[collab]);order.push('list-cache');}}});
const {removeCollaborator}=await import('../src/controllers/collection/collectionCollaboratorController.js');
test('collaborator removal invalidates room permissions after save and before notifications',async()=>{
 const res={status(code){this.code=code;return this;},json(){}};
 await new Promise((resolve,reject)=>{res.json=body=>{assert.equal(body.success,true);resolve();};removeCollaborator({params:{collectionId:id,collaboratorId:collab},user:{_id:owner}},res,reject);});
 assert.deepEqual(order,['save','invalidate','list-cache','notification']);assert.deepEqual(collection.collaborators,[]);
});
