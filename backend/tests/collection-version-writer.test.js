import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
let source, versions, failures, calls;
const collectionId = '000000000000000000000001';
mock.module('../src/models/Collection.js', { defaultExport: {
    findById: () => ({ lean: async () => source }),
} });
mock.module('../src/models/CollectionVersion.js', { defaultExport: {
    findOne: () => ({ sort() { return this; }, select() { return this; },
        lean: async () => versions.length ? { versionNumber: Math.max(...versions.map(v => v.versionNumber)) } : null }),
    create: async data => {
        calls++;
        if (failures.length) throw failures.shift();
        if (versions.some(v => v.versionNumber === data.versionNumber)) {
            throw { code: 11000, keyPattern: { collection: 1, versionNumber: 1 } };
        }
        versions.push(data); return data;
    },
} });
const { createCollectionVersion } = await import('../src/services/collection/collectionVersionHelper.js');
function reset() {
    source = { name: 'fixture', images: ['deleted-image-id'], coverImage: 'deleted-cover-id',
        collaborators: [{ user: 'deleted-user-id', permission: 'view' }] };
    versions = []; failures = []; calls = 0;
}
test('snapshot retains raw references, change metadata and sequential numbering', async () => {
    reset();
    const result = await createCollectionVersion(collectionId, 'actor', 'updated', { note: 'note' });
    assert.deepEqual(result.snapshot.images, ['deleted-image-id']);
    assert.equal(result.snapshot.coverImage, 'deleted-cover-id');
    assert.equal(result.snapshot.collaborators[0].user, 'deleted-user-id');
    assert.equal(result.note, 'note');
    assert.equal((await createCollectionVersion(collectionId, 'actor', 'updated')).versionNumber, 2);
});
test('concurrent version writers retry number collision and both retain a snapshot', async () => {
    reset();
    const results = await Promise.all([createCollectionVersion(collectionId, 'actor-a', 'updated'),
        createCollectionVersion(collectionId, 'actor-b', 'image_removed')]);
    assert.ok(results.every(Boolean));
    assert.deepEqual(versions.map(v => v.versionNumber).sort(), [1, 2]);
    assert.equal(calls, 3);
});
test('retry is bounded and unrelated duplicate/database errors remain non-critical', async () => {
    for (const error of [{ code: 11000, keyPattern: { collection: 1, versionNumber: 1 } },
        { code: 11000, keyPattern: { other: 1 } }, new Error('fixture DB unavailable')]) {
        reset(); failures = [error, error, error];
        assert.equal(await createCollectionVersion(collectionId, 'actor', 'updated'), null);
        assert.equal(calls, error.keyPattern?.versionNumber ? 3 : 1);
    }
});
test('missing collection produces no version writes', async () => {
    reset(); source = null;
    assert.equal(await createCollectionVersion(collectionId, 'actor', 'updated'), null);
    assert.equal(calls, 0);
});
