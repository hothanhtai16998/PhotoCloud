import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
const owner = '000000000000000000000001', id = '000000000000000000000002';
const a = '000000000000000000000003', b = '000000000000000000000004';
const member = '000000000000000000000005';
let collection, order, selected, reads = 0, failNotifications = false, imageStatus, imageRecordId = b;
const projections = [];
function matches(row, filter) {
    return Object.entries(filter).every(([key, value]) => {
        if (key === '$or') return value.some(part => matches(row, part));
        if (value?.$exists !== undefined) return Object.hasOwn(row, key) === value.$exists;
        return value === null ? row[key] == null : row[key] === value;
    });
}
const notifications = [], socketEvents = [];
function query(value) {
    return {
        populate(options) { projections.push(options); return this; },
        select(fields) { selected = fields; return this; },
        lean: async () => value,
        then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
    };
}
class Collection {
    constructor(data) { Object.assign(this, data, { _id: id }); collection = this; }
    async save() { order.push('save'); }
    static findOne() { return query(collection); }
    static findById() { reads++; return query(collection); }
    static find() {
        const result = query(null);
        result.lean = async () => [{ name: 'fixture', ...(selected.split(' ').includes('images') ? { images: [a, b] } : {}) }];
        return result;
    }
}
mock.module('../src/models/Collection.js', { defaultExport: Collection });
mock.module('../src/models/Image.js', { defaultExport: { findOne: filter => { const row = { _id: imageRecordId, uploadedBy: member, ...(imageStatus === undefined ? {} : { moderationStatus: imageStatus }) }; return query(matches(row, filter) ? row : null); } } });
mock.module('../src/models/Notification.js', { defaultExport: { create: async data => { if (failNotifications) throw new Error("fixture notification failure"); notifications.push(data); } } });
mock.module('../src/models/CollectionTemplate.js', { defaultExport: {
    findOne: () => query({ templateName: 'fixture', defaultTags: [], defaultIsPublic: false }),
    findByIdAndUpdate: async () => { order.push('usage'); },
} });
mock.module('../src/services/collection/collectionVersionHelper.js', { namedExports: {
    createCollectionVersion: async () => { order.push('version'); },
} });
mock.module('../src/services/realtime/socketServer.js', { namedExports: { emitCollectionUpdate: (id, event) => { socketEvents.push(event); } } });
mock.module('../src/services/realtime/notificationEmitter.js', { namedExports: { createAndEmitNotification: async data => { if (failNotifications) throw new Error("fixture notification failure"); notifications.push(data); } } });
mock.module('../src/middlewares/cacheMiddleware.js', { namedExports: { clearCollectionsCache: () => 0 } });
const { setCache, getCache, generateCacheKey } = await import('../src/services/cache/queryCache.js');
const { reorderCollectionImages, getCollectionsContainingImage, addImageToCollection, removeImageFromCollection } = await import('../src/controllers/collection/collectionImageController.js');
const { createCollectionFromTemplate } = await import('../src/controllers/collection/collectionTemplateController.js');
const key = userId => generateCacheKey('userCollections', { userId });
function reset(images = [a, b]) {
    imageRecordId = b; imageStatus = undefined; projections.length = 0; order = []; reads = 0; failNotifications = false; notifications.length = 0; socketEvents.length = 0;
    collection = new Collection({ createdBy: owner, images, coverImage: a, collaborators: [{ user: member, permission: 'edit' }] });
    for (const user of [owner, member]) setCache(key(user), ['old']);
}
async function invoke(handler, imageIds) {
    return new Promise((resolve, reject) => {
        const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; resolve(this); } };
        Promise.resolve(handler({ params: { collectionId: id, imageId: a, templateId: id }, body: { imageIds, imageId: b }, user: { _id: owner, isAdmin: true } }, res, reject)).catch(reject);
    });
}
test('reorder rejects duplicates, missing and foreign images without saving or clearing cache', async () => {
    for (const input of [[a, a], [a], [a, member], [null, b]]) {
        reset();
        assert.equal((await invoke(reorderCollectionImages, input)).code, 400);
        assert.deepEqual(collection.images, [a, b]);
        assert.deepEqual(order, []);
        assert.deepEqual(getCache(key(owner)), ['old']);
    }
});
test('valid reorder preserves references and clears owner/member list caches', async () => {
    reset();
    assert.equal((await invoke(reorderCollectionImages, [b, a])).code, 200);
    assert.deepEqual(collection.images, [b, a]);
    for (const user of [owner, member]) assert.equal(getCache(key(user)), null);
    assert.deepEqual(order, ['save', 'version']);
});
test('add and remove images clear cached lists for owner and collaborators', async () => {
    for (const handler of [addImageToCollection, removeImageFromCollection]) {
        reset(handler === addImageToCollection ? [a] : [a, b]);
        assert.equal((await invoke(handler)).code, 200);
        assert.deepEqual(collection.images, handler === addImageToCollection ? [a, b] : [b]);
        for (const user of [owner, member]) assert.equal(getCache(key(user)), null);
    }
});
test('containing-image count uses selected images without exposing the array', async () => {
    reset();
    const res = await invoke(getCollectionsContainingImage);
    assert.equal(res.code, 200);
    assert.equal(res.body.collections[0].imageCount, 2);
    assert.equal('images' in res.body.collections[0], false);
});
test('creation from template clears the owner list cache', async () => {
    reset();
    const res = await invoke(createCollectionFromTemplate);
    assert.equal(res.code, 201);
    assert.equal(getCache(key(owner)), null);
    assert.equal(res.body.collection.imageCount, 0);
    assert.deepEqual(order, ['save', 'usage', 'version']);
});

test('invalid removal IDs are rejected before database reads', async () => {
    reset();
    const { removeImageFromCollection: remove } = await import('../src/services/collection/collectionImages.js');
    await assert.rejects(remove({ collectionId: 'invalid', imageId: a, userId: owner }), error => error.status === 400);
    assert.equal(reads, 0);
    assert.deepEqual(order, []);
});
test('viewer cannot remove images and changes nothing', async () => {
    reset();
    collection.collaborators[0].permission = 'view';
    const { removeImageFromCollection: remove } = await import('../src/services/collection/collectionImages.js');
    await assert.rejects(remove({ collectionId: id, imageId: a, userId: member }), error => error.status === 403);
    assert.deepEqual(collection.images, [a, b]);
    assert.deepEqual(order, []);
});
test('removal notifies unique members excluding actor and emits new cover', async () => {
    reset();
    collection.collaborators.push({ user: member, permission: 'edit' }, { user: null });
    assert.equal((await invoke(removeImageFromCollection)).code, 200);
    assert.equal(collection.coverImage, b);
    assert.deepEqual(notifications.map(entry => entry.recipient), [member]);
    assert.equal(socketEvents[0].type, 'image_removed');
});
test('notification failure does not undo saved changes or prevent socket update', async () => {
    reset(); failNotifications = true;
    assert.equal((await invoke(removeImageFromCollection)).code, 200);
    assert.deepEqual(collection.images, [b]);
    assert.equal(getCache(key(owner)), null);
    assert.equal(socketEvents[0].type, 'image_removed');
});

test('collection add rejects unpublished images before mutation; allows approved and legacy', async () => {
    for (const state of ['pending', 'rejected', 'flagged', 'approved', null, undefined]) {
        reset([a]); imageStatus = state;
        const res = await invoke(addImageToCollection);
        const hidden = ['pending', 'rejected', 'flagged'].includes(state);
        assert.equal(res.code, hidden ? 404 : 200);
        assert.deepEqual(collection.images, hidden ? [a] : [a, b]);
        if (hidden) assert.deepEqual(order, []);
        else for (const path of ['images', 'coverImage']) {
            const projection = projections.find(options => options?.path === path);
            assert.ok(projection?.match);
            assert.equal(matches({ moderationStatus: 'pending' }, projection.match), false);
            assert.equal(matches({ moderationStatus: 'approved' }, projection.match), true);
        }
    }
});

test('hex ID casing cannot add duplicates, block removal or bypass reorder uniqueness', async () => {
    const alpha = 'abcdefabcdefabcdefabcdef';
    const services = await import('../src/services/collection/collectionImages.js');
    reset([alpha]); imageRecordId = alpha;
    await assert.rejects(services.addImageToCollection({ collectionId: id, imageId: alpha.toUpperCase(), userId: owner }), error => error.status === 400);
    assert.deepEqual(order, []);
    reset([alpha, b]); collection.coverImage = alpha;
    await services.removeImageFromCollection({ collectionId: id, imageId: alpha.toUpperCase(), userId: owner });
    assert.deepEqual(collection.images, [b]);
    assert.equal(collection.coverImage, b);
    reset([alpha, b]);
    assert.equal((await invoke(reorderCollectionImages, [b, alpha.toUpperCase()])).code, 200);
    assert.deepEqual(collection.images, [b, alpha]);
    reset([alpha, b]);
    assert.equal((await invoke(reorderCollectionImages, [alpha, alpha.toUpperCase()])).code, 400);
    assert.deepEqual(order, []);
});
