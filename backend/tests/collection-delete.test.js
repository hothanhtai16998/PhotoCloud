import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

const id = '507f1f77bcf86cd799439012', owner = '507f1f77bcf86cd799439011', other = '507f1f77bcf86cd799439099';
let stored, calls, effects, fail;
mock.module('../src/models/Collection.js', { defaultExport: {
    async findOneAndDelete(filter) {
        calls.push(filter);
        if (fail) throw new Error('fixture database failure');
        if (!stored || stored._id !== filter._id || stored.createdBy !== filter.createdBy) return null;
        const deleted = stored;
        stored = null;
        effects.push('deleted');
        return deleted;
    },
} });
mock.module('../src/models/Notification.js', { defaultExport: {} });
mock.module('../src/services/collection/collectionVersionHelper.js', { namedExports: { createCollectionVersion: async () => {} } });
mock.module('../src/services/realtime/roomPermissions.js', { namedExports: {
    clearPermissionCache: (type, resource) => { assert.equal(type, 'collection'); assert.equal(resource, id); effects.push('permission-cache'); },
} });
mock.module('../src/services/collection/collectionCache.js', { namedExports: {
    invalidateCollectionLists: async collection => {
        assert.equal(collection.createdBy, owner);
        assert.deepEqual(collection.collaborators, [{ user: other }]);
        effects.push('list-cache');
    },
} });
const { deleteCollection } = await import('../src/controllers/collection/collectionWriteController.js');
function reset() {
    calls = []; effects = []; fail = false;
    stored = { _id: id, createdBy: owner, collaborators: [{ user: other }] };
}
async function invoke(userId = owner, collectionId = id) {
    let result;
    const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { result = { code: this.code, ...body }; } };
    await deleteCollection({ params: { collectionId }, user: { _id: userId } }, res);
    return result;
}
test('delete validates ID before DB and refuses non-owners without side effects', async () => {
    reset();
    assert.equal((await invoke(owner, 'invalid')).code, 400);
    assert.deepEqual(calls, []);
    assert.equal((await invoke(other)).code, 404);
    assert.ok(stored);
    assert.deepEqual(effects, []);
    assert.deepEqual(calls, [{ _id: id, createdBy: other }]);
});
test('successful delete checks ownership in the deletion itself and invalidates using the deleted members', async () => {
    reset();
    const result = await invoke();
    assert.equal(result.code, 200);
    assert.equal(result.success, true);
    assert.equal(stored, null);
    assert.deepEqual(calls, [{ _id: id, createdBy: owner }]);
    assert.deepEqual(effects, ['deleted', 'permission-cache', 'list-cache']);
});
test('two competing deletes report only the request that actually removed the collection as successful', async () => {
    reset();
    const results = await Promise.all([invoke(), invoke()]);
    assert.deepEqual(results.map(result => result.code).sort(), [200, 404]);
    assert.equal(results.filter(result => result.success).length, 1);
    assert.deepEqual(effects, ['deleted', 'permission-cache', 'list-cache']);
});
test('a changed owner is checked at deletion time and a missing collection is not reported as deleted', async () => {
    reset();
    stored.createdBy = other;
    assert.equal((await invoke()).code, 404);
    assert.equal(stored.createdBy, other);
    assert.deepEqual(effects, []);
    stored = null;
    assert.equal((await invoke()).code, 404);
    assert.deepEqual(effects, []);
});
test('database failure returns an error without invalidating or claiming deletion', async () => {
    reset(); fail = true;
    const result = await invoke();
    assert.equal(result.code, 500);
    assert.equal(result.success, false);
    assert.ok(stored);
    assert.deepEqual(effects, []);
});
