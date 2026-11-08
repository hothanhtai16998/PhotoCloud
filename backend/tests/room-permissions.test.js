import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
let queries = 0,
  collection = null,
  image = {},
  user = {};
mock.module('../src/models/Collection.js', {
  defaultExport: {
    findOne: () => ({
      lean: async () => {
        queries++;
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
