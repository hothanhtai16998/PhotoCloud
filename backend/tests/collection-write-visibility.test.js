import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

const id = '507f1f77bcf86cd799439012';
const owner = '507f1f77bcf86cd799439011';
let row, selections, saved, versions, notifications, notificationFailure;
const images = [
    { _id: 'approved', imageUrl: 'https://example.test/approved.jpg', moderationStatus: 'approved' },
    { _id: 'legacy', imageUrl: 'https://example.test/legacy.jpg' },
    { _id: 'pending', imageUrl: 'https://example.test/private.jpg', moderationStatus: 'pending' },
    { _id: 'rejected', imageUrl: 'https://example.test/rejected.jpg', moderationStatus: 'rejected' },
];
function visible(image, filter) {
    return filter.$or.some(rule => Object.entries(rule).every(([key, value]) =>
        value?.$exists !== undefined ? Object.hasOwn(image, key) === value.$exists :
            value === null ? image[key] == null : image[key] === value));
}
function query() {
    const populate = [];
    return {
        populate(options) { if (options?.path) { selections.push(options); populate.push(options); } return this; },
        then(resolve, reject) { return Promise.resolve(row).then(resolve, reject); },
        async lean() {
            const result = { ...row, images: [...images], coverImage: images[2] };
            for (const options of populate) {
                if (options.path === 'images') result.images = images.filter(image => visible(image, options.match));
                if (options.path === 'coverImage' && !visible(result.coverImage, options.match)) result.coverImage = null;
            }
            return result;
        },
    };
}
class Collection {
    constructor(data) { Object.assign(this, data); this._id = id; row = this; }
    async save() { saved++; }
    static findById() { return query(); }
}
mock.module('../src/models/Collection.js', { defaultExport: Collection });
mock.module('../src/models/Notification.js', { defaultExport: { create: data => {
    if (notificationFailure === 'sync' || (notificationFailure === 'mixed' && notifications.length > 0)) throw new Error('fixture sync notification failure');
    notifications.push(data);
    return (notificationFailure === 'async' || notificationFailure === 'mixed') ? Promise.reject(new Error('fixture async notification failure')) : Promise.resolve(data);
} } });
mock.module('../src/services/collection/collectionVersionHelper.js', { namedExports: { createCollectionVersion: async (...args) => { versions.push(args); } } });
mock.module('../src/services/collection/collectionCache.js', { namedExports: { invalidateCollectionLists: async () => {} } });
mock.module('../src/services/realtime/roomPermissions.js', { namedExports: { clearPermissionCache: () => {} } });
mock.module('../src/services/realtime/socketServer.js', { namedExports: { emitCollectionUpdate: () => {} } });
const { createCollection, updateCollection } = await import('../src/controllers/collection/collectionWriteController.js');
function reset() {
    selections = []; saved = 0; versions = []; notifications = []; notificationFailure = null;
    row = new Collection({ name: 'fixture', description: '', createdBy: owner, isPublic: true,
        images: images.map(image => image._id), coverImage: null, collaborators: [], tags: [] });
}
async function invoke(handler, body, user = { _id: owner, isAdmin: true }) {
    let response;
    const res = { code: 200, status(code) { this.code = code; return this; }, json(data) { response = { code: this.code, ...data }; } };
    await handler({ params: { collectionId: id }, user, body }, res);
    return response;
}
test('editing metadata never returns pending or rejected image URLs and hides a non-public cover', async () => {
    reset();
    const result = await invoke(updateCollection, { name: 'updated' });
    assert.equal(result.code, 200);
    assert.equal(result.collection.name, 'updated');
    assert.equal(result.collection.coverImage, null);
    assert.deepEqual(result.collection.images.map(image => image._id), ['approved', 'legacy']);
    assert.equal(result.collection.imageCount, 2);
    assert.equal(JSON.stringify(result).includes('private.jpg'), false);
    assert.equal(saved, 1);
    assert.deepEqual(row.images, ['approved', 'legacy', 'pending', 'rejected']);
    assert.deepEqual(selections.map(option => option.path).sort(), ['coverImage', 'images']);
});
test('creating a collection retains validation and owner without exposing a non-public populated cover', async () => {
    reset();
    const result = await invoke(createCollection, { name: 'new collection' });
    assert.equal(result.code, 201);
    assert.equal(result.collection.createdBy, owner);
    assert.equal(result.collection.coverImage, null);
    assert.equal(result.collection.imageCount, 0);
    assert.equal(saved, 1);
    assert.deepEqual(selections.map(option => option.path), ['coverImage']);
});


test('invalid metadata cannot silently erase tags, coerce names or change visibility', async () => {
    const invalidInputs = [
        { name: { value: 'bad' } }, { name: 123 }, { description: {} }, { description: null },
        { description: 'x'.repeat(501) }, { isPublic: 'false' }, { isPublic: 0 }, { isPublic: null },
        { tags: 'landscape' }, { tags: null }, { tags: ['good', {}] }, { tags: [1] },
    ];
    for (const invalid of invalidInputs) {
        reset();
        row.tags = ['keep'];
        const before = JSON.stringify(row);
        const updated = await invoke(updateCollection, { name: 'should not be saved', ...invalid });
        assert.equal(updated.code, 400, JSON.stringify(invalid));
        assert.equal(saved, 0);
        assert.equal(JSON.stringify(row), before);
        const created = await invoke(createCollection, { name: 'fixture', ...invalid });
        assert.equal(created.code, 400, JSON.stringify(invalid));
        assert.equal(saved, 0);
    }
});

test('valid metadata still normalizes tags and allows explicit clearing and false visibility', async () => {
    reset();
    assert.equal((await invoke(updateCollection, {
        tags: [' Landscape ', 'landscape', '', 'Portrait'], description: ' x ', isPublic: false,
    })).code, 200);
    assert.deepEqual(row.tags, ['landscape', 'portrait']);
    assert.equal(row.description, 'x');
    assert.equal(row.isPublic, false);
    assert.equal((await invoke(updateCollection, { tags: [], description: '' })).code, 200);
    assert.deepEqual(row.tags, []);
    assert.equal(row.description, '');
    const created = await invoke(createCollection, {
        name: ' fixture ', description: 'x'.repeat(500), isPublic: false,
        tags: Array.from({ length: 12 }, (_, index) => 'tag' + index),
    });
    assert.equal(created.code, 201);
    assert.equal(row.name, 'fixture');
    assert.equal(row.tags.length, 10);
    assert.equal(row.description.length, 500);
    assert.equal(row.isPublic, false);
});

test('metadata validation does not grant editing or creation to unauthorized users', async () => {
    reset();
    assert.equal((await invoke(updateCollection, { tags: 'bad' }, { _id: '507f1f77bcf86cd799439099' })).code, 403);
    assert.equal((await invoke(createCollection, { name: 'fixture' }, { _id: owner })).code, 403);
    assert.equal(saved, 0);
});


test('cover ObjectId case does not alter membership or create a false version', async () => {
    reset();
    const imageId = 'abcdefabcdefabcdefabcdef';
    row.images = [imageId];
    row.coverImage = imageId;
    const result = await invoke(updateCollection, { coverImage: imageId.toUpperCase() });
    assert.equal(result.code, 200);
    assert.equal(row.coverImage, imageId);
    assert.equal(saved, 1);
    assert.deepEqual(versions, []);
});

test('clearing an already empty cover creates no false change while a real clear creates one', async () => {
    reset();
    assert.equal((await invoke(updateCollection, { coverImage: null })).code, 200);
    assert.deepEqual(versions, []);
    row.coverImage = 'abcdefabcdefabcdefabcdef';
    assert.equal((await invoke(updateCollection, { coverImage: '' })).code, 200);
    assert.equal(row.coverImage, null);
    assert.equal(versions.length, 1);
    assert.equal(versions[0][3].fieldChanged, 'coverImage');
});

test('invalid and foreign cover references are rejected before changing other fields', async () => {
    for (const coverImage of [false, 0, {}, [], 'not-an-id', 'abcdefabcdefabcdefabcdef']) {
        reset();
        const before = JSON.stringify(row);
        const result = await invoke(updateCollection, { name: 'should stay unchanged', coverImage });
        assert.equal(result.code, 400);
        assert.equal(saved, 0);
        assert.deepEqual(versions, []);
        assert.equal(JSON.stringify(row), before);
    }
});

test('a new uppercase cover reference saves the canonical ID and records the actual change', async () => {
    reset();
    const imageId = 'abcdefabcdefabcdefabcdef';
    row.images = [imageId];
    const result = await invoke(updateCollection, { coverImage: imageId.toUpperCase() });
    assert.equal(result.code, 200);
    assert.equal(row.coverImage, imageId);
    assert.equal(versions.length, 1);
    assert.equal(versions[0][3].oldValue, null);
    assert.equal(versions[0][3].newValue, imageId);
});


test('update notification recipients exclude actor and missing users and deduplicate remaining members', async () => {
    reset();
    const member = '507f1f77bcf86cd799439099';
    row.collaborators = [{ user: null }, { user: member }, { user: { _id: member } }, { user: owner }];
    assert.equal((await invoke(updateCollection, { name: 'changed' })).code, 200);
    assert.deepEqual(notifications.map(data => data.recipient), [member]);
    assert.equal(notifications[0].type, 'collection_updated');
    assert.equal(saved, 1);
});

test('legacy missing owner does not turn a permitted editor update into a post-save failure', async () => {
    reset();
    const editor = '507f1f77bcf86cd799439099', member = '507f1f77bcf86cd799439088';
    row.createdBy = null;
    row.collaborators = [{ user: editor, permission: 'edit' }, { user: null }, { user: member }];
    const result = await invoke(updateCollection, { name: 'changed' }, { _id: editor });
    assert.equal(result.code, 200);
    assert.equal(saved, 1);
    assert.deepEqual(notifications.map(data => data.recipient), [member]);
});

test('notification failure never reports a successfully saved update as failed', async () => {
    for (const failure of ['sync', 'async', 'mixed']) {
        reset();
        notificationFailure = failure;
        row.collaborators = [{ user: '507f1f77bcf86cd799439099' }, { user: '507f1f77bcf86cd799439088' }];
        const result = await invoke(updateCollection, { name: 'changed' });
        assert.equal(result.code, 200);
        assert.equal(result.collection.name, 'changed');
        assert.equal(saved, 1);
        assert.equal(versions.length, 1);
    }
});

test('cover and general notices keep distinct rules and tag-only changes add no general notice', async () => {
    reset();
    const imageId = 'abcdefabcdefabcdefabcdef';
    row.images = [imageId];
    row.collaborators = [{ user: '507f1f77bcf86cd799439099' }];
    assert.equal((await invoke(updateCollection, { name: 'changed', coverImage: imageId })).code, 200);
    assert.deepEqual(notifications.map(data => data.type).sort(), ['collection_cover_changed', 'collection_updated']);
    notifications = [];
    assert.equal((await invoke(updateCollection, { tags: ['new-tag'] })).code, 200);
    assert.deepEqual(notifications, []);
});
