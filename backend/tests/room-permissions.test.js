import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
let pendingRead;
let queries = 0,
  collection = null,
  image = {},
  user = {};
mock.module('../src/models/Collection.js', {
  defaultExport: {
    findOne: () => ({
      lean: async () => {
        queries++;
        if (pendingRead) return pendingRead;
        return collection;
      },
    }),
  },
});
mock.module('../src/models/Image.js', {
  defaultExport: { findById: () => ({ lean: async () => image }) },
});
mock.module('../src/models/User.js', {
  defaultExport: { findById: () => ({ lean: async () => user }) },
});
const rooms = await import('../src/services/realtime/roomPermissions.js');
test('room permission cache keeps allow/deny decisions and invalidates the resource', async () => {
  const owner = '507f1f77bcf86cd799439011',
    id = '507f1f77bcf86cd799439012';
  assert.equal(await rooms.canJoinCollectionRoom(owner, 'bad-id'), false);
  assert.equal(await rooms.canJoinCollectionRoom(owner, id), false);
  assert.equal(queries, 1);
  collection = {};
  assert.equal(await rooms.canJoinCollectionRoom(owner, id), false);
  assert.equal(queries, 1);
  rooms.clearPermissionCache('collection', id);
  assert.equal(await rooms.canJoinCollectionRoom(owner, id), true);
  assert.equal(queries, 2);
  assert.equal(await rooms.canJoinImageRoom(owner, id), true);
  assert.equal(await rooms.canJoinProfileRoom(owner, id), true);
  user = null;
  assert.equal(await rooms.canJoinProfileRoom(owner, id), false);
});

test('an in-flight permission query cannot recreate cache after resource invalidation', async () => {
 const owner='507f1f77bcf86cd799439021',id='507f1f77bcf86cd799439022';
 let resolve;pendingRead=new Promise(r=>{resolve=r;});
 const old=rooms.canJoinCollectionRoom(owner,id);
 rooms.clearPermissionCache('collection',id);pendingRead=undefined;collection=null;
 assert.equal(await rooms.canJoinCollectionRoom(owner,id),false);
 resolve({});assert.equal(await old,true);
 assert.equal(await rooms.canJoinCollectionRoom(owner,id),false);
});
