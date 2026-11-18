import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
const actor = '507f1f77bcf86cd799439011', owner = '507f1f77bcf86cd799439022';
const ids = ['abcdefabcdefabcdefabcdef', '000000000000000000000002', '000000000000000000000003', '000000000000000000000004', '000000000000000000000005'];
let rows, user, queries;
function matches(row, filter) {
    return Object.entries(filter).every(([key, value]) => {
        if (key === '$or') return value.some(rule => matches(row, rule));
        if (key === 'collaborators.user') return row.collaborators.some(member => member.user === value);
        return value?.$in ? value.$in.includes(row[key]) : row[key] === value;
    });
}
mock.module('../src/models/User.js', { defaultExport: { findById: () => ({ select: async () => user }) } });
mock.module('../src/models/Collection.js', { defaultExport: {
    find(filter) {
        queries.push(filter);
        return { select(fields) { assert.equal(fields, '_id'); return this; }, lean: async () => rows.filter(row => matches(row, filter)) };
    },
} });
mock.module('../src/models/Notification.js', { defaultExport: {} });
const { checkCollectionFavorites } = await import('../src/controllers/collection/collectionFavoriteController.js');
function reset() {
    queries = [];
    rows = [
        { _id: ids[0], isPublic: true, createdBy: owner, collaborators: [] },
        { _id: ids[1], isPublic: false, createdBy: actor, collaborators: [] },
        { _id: ids[2], isPublic: false, createdBy: owner, collaborators: [{ user: actor }] },
        { _id: ids[3], isPublic: false, createdBy: owner, collaborators: [] },
    ];
    user = { favoriteCollections: [...ids] };
}
function invoke(collectionIds) {
    return new Promise((resolve, reject) => {
        const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { resolve({ code: this.code, ...body }); } };
        checkCollectionFavorites({ user: { _id: actor }, body: { collectionIds } }, res, reject);
    });
}
test('favorite status requires current access and an existing collection', async () => {
    reset();
    const result = await invoke(ids);
    assert.equal(result.code, 200);
    assert.deepEqual(Object.values(result.favorites), [true, true, true, false, false]);
    rows[2].collaborators = [];
    assert.equal((await invoke([ids[2]])).favorites[ids[2]], false);
});
test('uppercase and trimmed IDs keep request keys but match the same stored favorite', async () => {
    reset();
    const uppercase = ids[0].toUpperCase();
    const result = await invoke([' ' + uppercase + ' ', ids[0]]);
    assert.equal(result.favorites[uppercase], true);
    assert.equal(result.favorites[ids[0]], true);
    assert.deepEqual(queries[0]._id.$in, [ids[0]]);
});
test('invalid keys are own false properties rather than object prototype assignments', async () => {
    reset();
    const result = await invoke([ids[0], '__proto__', 'constructor', 'toString']);
    assert.equal(result.code, 200);
    for (const key of ['__proto__', 'constructor', 'toString']) {
        assert.equal(Object.hasOwn(result.favorites, key), true);
        assert.equal(result.favorites[key], false);
    }
    assert.equal(Object.getPrototypeOf(result.favorites), Object.prototype);
});
test('nonfavorite IDs stay false without a collection query', async () => {
    reset(); user.favoriteCollections = [];
    assert.equal((await invoke([ids[0]])).favorites[ids[0]], false);
    assert.deepEqual(queries, []);
});
test('empty or wholly invalid input and a missing account do not query collection access', async () => {
    reset();
    assert.equal((await invoke([])).code, 400);
    assert.equal((await invoke(['bad'])).code, 400);
    user = null;
    assert.equal((await invoke([ids[0]])).code, 404);
    assert.deepEqual(queries, []);
});
