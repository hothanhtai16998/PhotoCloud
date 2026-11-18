import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
const collectionId = 'abcdefabcdefabcdefabcdef';
const owner = '507f1f77bcf86cd799439011', actor = '507f1f77bcf86cd799439022';
let collection, user, writes, notifications, missingAtWrite, query;
function matches(row, filter) {
    return Object.entries(filter).every(([key, value]) => {
        if (key === '$or') return value.some(rule => matches(row, rule));
        if (key === 'collaborators.user') return row.collaborators.some(member => member.user === value);
        return row[key] === value;
    });
}
mock.module('../src/models/Collection.js', { defaultExport: {
    findOne(filter) { query = filter; return Promise.resolve(collection && matches(collection, filter) ? collection : null); },
} });
// Evaluate the Mongo expressions used by the controller against the current fixture state.
function evaluate(value, row, variables = {}) {
    if (value?._bsontype === 'ObjectId') return value;
    if (typeof value === 'string' && value.startsWith('$$')) return variables[value.slice(2)];
    if (typeof value === 'string' && value.startsWith('$')) return row[value.slice(1)];
    if (Array.isArray(value)) return value.map(entry => evaluate(entry, row, variables));
    if (!value || typeof value !== 'object') return value;
    if (value.$ifNull) return evaluate(value.$ifNull[0], row, variables) ?? evaluate(value.$ifNull[1], row, variables);
    if (value.$in) return evaluate(value.$in[1], row, variables).some(id => String(id) === String(evaluate(value.$in[0], row, variables)));
    if (value.$ne) return String(evaluate(value.$ne[0], row, variables)) !== String(evaluate(value.$ne[1], row, variables));
    if (value.$cond) return evaluate(value.$cond[evaluate(value.$cond[0], row, variables) ? 1 : 2], row, variables);
    if (value.$concatArrays) return evaluate(value.$concatArrays, row, variables).flat();
    if (value.$filter) return evaluate(value.$filter.input, row, variables).filter(id =>
        evaluate(value.$filter.cond, row, { ...variables, [value.$filter.as]: id }));
    throw new Error('Unsupported fixture expression');
}
mock.module('../src/models/User.js', { defaultExport: {
    findByIdAndUpdate(id, update, options) {
        writes.push({ id, update });
        assert.equal(options.new, false);
        return { select: async fields => {
            assert.equal(fields, 'favoriteCollections');
            if (!user || missingAtWrite) return null;
            const previous = { favoriteCollections: user.favoriteCollections && [...user.favoriteCollections] };
            user.favoriteCollections = evaluate(update[0].$set.favoriteCollections, user);
            return previous;
        } };
    },
} });
mock.module('../src/models/Notification.js', { defaultExport: {
    create: async data => notifications.push(data),
} });
const { toggleCollectionFavorite } = await import('../src/controllers/collection/collectionFavoriteController.js');
function reset() {
    collection = { _id: collectionId, createdBy: owner, isPublic: true, collaborators: [] };
    user = { favoriteCollections: [] };
    writes = []; notifications = []; missingAtWrite = false; query = null;
}
function invoke(userId = actor, id = collectionId) {
    return new Promise((resolve, reject) => {
        const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { resolve({ code: this.code, ...body }); } };
        toggleCollectionFavorite({ user: { _id: userId }, params: { collectionId: id } }, res, reject);
    });
}
test('private outsider cannot favorite a collection or notify its owner', async () => {
    reset(); collection.isPublic = false;
    assert.equal((await invoke()).code, 404);
    assert.deepEqual(writes, []);
    assert.deepEqual(notifications, []);
    collection = null;
    assert.equal((await invoke()).code, 404);
});
test('public viewers, private owners and private members keep favorite access', async () => {
    for (const kind of ['public', 'owner', 'member']) {
        reset();
        collection.isPublic = kind === 'public';
        if (kind === 'member') collection.collaborators = [{ user: actor, permission: 'view' }];
        const result = await invoke(kind === 'owner' ? owner : actor);
        assert.equal(result.code, 200);
        assert.equal(result.isFavorited, true);
        assert.equal(String(user.favoriteCollections[0]), collectionId);
        assert.equal(writes.length, 1);
        assert.equal(writes[0].update[0].$set.favoriteCollections.$cond[0].$in[0]._bsontype, 'ObjectId');
        assert.equal(notifications.length, kind === 'owner' ? 0 : 1);
    }
});
test('uppercase reference to an already favorited collection removes the same item', async () => {
    reset(); user.favoriteCollections = [collectionId];
    const result = await invoke(actor, collectionId.toUpperCase());
    assert.equal(result.code, 200);
    assert.equal(result.isFavorited, false);
    assert.equal(query._id, collectionId);
    assert.deepEqual(user.favoriteCollections, []);
    assert.deepEqual(notifications, []);
});
test('account missing during read or write cannot produce favorite success or notification', async () => {
    reset(); user = null;
    assert.equal((await invoke()).code, 404);
    assert.equal(writes.length, 1);
    for (const existing of [false, true]) {
        reset();
        if (existing) user.favoriteCollections = [collectionId];
        missingAtWrite = true;
        const result = await invoke();
        assert.equal(result.code, 404);
        assert.equal(result.errorCode, 'USER_NOT_FOUND');
        assert.deepEqual(notifications, []);
    }
});
test('invalid collection reference does not access the database', async () => {
    reset();
    assert.equal((await invoke(actor, 'invalid')).code, 400);
    assert.equal(query, null);
    assert.deepEqual(writes, []);
});


test('competing toggles each observe their own write state and two toggles return to the original state', async () => {
    for (const initiallyFavorited of [false, true]) {
        reset();
        user.favoriteCollections = initiallyFavorited ? [collectionId] : [];
        const results = await Promise.all([invoke(), invoke()]);
        assert.deepEqual(results.map(result => result.isFavorited).sort(), [false, true]);
        assert.equal(user.favoriteCollections.some(id => String(id) === collectionId), initiallyFavorited);
        assert.equal(writes.length, 2);
        assert.equal(notifications.length, 1);
    }
});

test('toggle initializes null favorite lists and removes duplicate target IDs without touching other favorites', async () => {
    reset(); user.favoriteCollections = null;
    assert.equal((await invoke()).isFavorited, true);
    assert.equal(String(user.favoriteCollections[0]), collectionId);
    user.favoriteCollections = [collectionId, '000000000000000000000099', collectionId];
    assert.equal((await invoke()).isFavorited, false);
    assert.deepEqual(user.favoriteCollections, ['000000000000000000000099']);
});
