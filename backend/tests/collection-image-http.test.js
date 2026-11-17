import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

class CollectionImageError extends Error {
    constructor(status, details) { super(details.message); this.status = status; this.details = details; }
}
let failure, received;
const handlers = ['addImageToCollection', 'removeImageFromCollection', 'getCollectionsContainingImage', 'reorderCollectionImages'];
mock.module('../src/services/collection/collectionImages.js', { namedExports: {
    CollectionImageError,
    ...Object.fromEntries(handlers.map(name => [name, async input => {
        received = input;
        if (failure) throw failure;
        return { success: true, fixture: name };
    }])),
} });
const controllers = await import('../src/controllers/collection/collectionImageController.js');
function invoke(name) {
    return new Promise((resolve, reject) => {
        const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { resolve({ code: this.code, body }); } };
        controllers[name]({ params: { collectionId: 'collection', imageId: 'path-image' },
            body: { imageId: 'body-image', imageIds: ['first', 'second'], userId: 'forged' },
            user: { _id: 'authenticated' } }, res, reject);
    });
}
test('HTTP adapters extract path/body inputs and use authenticated identity', async () => {
    failure = null;
    for (const name of handlers) {
        const response = await invoke(name);
        assert.deepEqual(response, { code: 200, body: { success: true, fixture: name } });
        assert.equal(received.userId, 'authenticated');
        if (name === 'reorderCollectionImages') assert.deepEqual(received.imageIds, ['first', 'second']);
        else assert.equal(received.imageId, name === 'addImageToCollection' ? 'body-image' : 'path-image');
    }
});
test('HTTP adapters preserve domain error status and response', async () => {
    for (const name of handlers) for (const status of [400, 403, 404]) {
        failure = new CollectionImageError(status, { success: false, message: 'fixture refusal' });
        assert.deepEqual(await invoke(name), { code: status, body: failure.details });
    }
});
test('unexpected service failures become 500 without exposing error details', async () => {
    failure = new Error('fixture internal failure');
    for (const name of handlers) {
        const response = await invoke(name);
        assert.equal(response.code, 500);
        assert.equal(response.body.success, false);
        assert.equal(response.body.message.includes('fixture internal failure'), false);
    }
});
