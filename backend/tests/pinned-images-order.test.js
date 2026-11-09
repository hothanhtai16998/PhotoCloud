import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
const owner='507f1f77bcf86cd799439011';
const first='507f1f77bcf86cd799439012',second='507f1f77bcf86cd799439013';
let images=[],saves=0;
const user={pinnedImages:[first],save:async()=>saves++,populate:async()=>{}};
mock.module('../src/models/User.js',{defaultExport:{findById:async()=>user}});
mock.module('../src/models/Image.js',{defaultExport:{find:async()=>images}});
const {reorderPinnedImages}=await import('../src/controllers/user/userPinnedImagesController.js');
function run(imageIds){return new Promise((resolve,reject)=>{
 const res={status(code){this.code=code;return this;},json(body){resolve({code:this.code,body});}};
 reorderPinnedImages({user:{_id:owner},body:{imageIds}},res,reject);
});}
test('pinned order rejects duplicate, missing and foreign IDs before saving',async()=>{
 assert.equal((await run([first,first])).code,400);assert.equal(saves,0);
 images=[{_id:first,uploadedBy:owner}];assert.equal((await run([first,second])).code,404);assert.equal(saves,0);
 images=[{_id:first,uploadedBy:'other'}];assert.equal((await run([first])).code,403);assert.equal(saves,0);
 images=[{_id:first,uploadedBy:owner},{_id:second,uploadedBy:owner}];
 assert.equal((await run([second,first])).code,200);assert.deepEqual(user.pinnedImages,[second,first]);assert.equal(saves,1);
 images=[];assert.equal((await run([])).code,200);assert.deepEqual(user.pinnedImages,[]);
});
