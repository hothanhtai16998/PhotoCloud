import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { publicImageFilter } from '../src/utils/publicImageFilter.js';

const owner = '507f1f77bcf86cd799439011';
let pipelines = [], records, members;
const visible = (row, filter) => filter.$or.some(rule => Object.entries(rule).every(([key, value]) =>
    value?.$exists !== undefined ? Object.hasOwn(row, key) === value.$exists :
        value === null ? row[key] == null : row[key] === value));
mock.module('../src/models/Collection.js', { defaultExport: {
    async aggregate(pipeline) {
        pipelines.push(pipeline);
        const imageLookups = pipeline.filter(stage => stage.$lookup?.from === 'images').map(stage => stage.$lookup);
        assert.equal(imageLookups.length, 3);
        for (const lookup of imageLookups) assert.deepEqual(lookup.pipeline[0], { $match: publicImageFilter() });
        // Model fixture applies the supplied lookup predicates; not a MongoDB integration test.
        const existing = records.filter(row => visible(row, imageLookups[0].pipeline[0].$match));
        const cover = existing.find(row => row._id === 'approved') || existing[0] || null;
        if (!existing.length && pipeline.some(stage => stage.$match?.['validImageIds.0'])) return [];
        return [{
            _id: 'fixture', coverImage: cover && visible(cover, imageLookups[1].pipeline[0].$match) ? cover : null,
            sampleImages: existing.slice(0, 3).filter(row => visible(row, imageLookups[2].pipeline[0].$match)),
            imageCount: existing.length, createdBy: { _id: owner, username: "owner-fixture" }, collaborators: members,
        }];
    },
} });
const { getUserCollections } = await import('../src/controllers/collection/collectionReadController.js');
function reset() {
    pipelines = []; members = [];
    records = [
        { _id: 'approved', moderationStatus: 'approved', imageUrl: 'approved.jpg' },
        { _id: 'pending', moderationStatus: 'pending', imageUrl: 'private.jpg' },
        { _id: 'rejected', moderationStatus: 'rejected', imageUrl: 'rejected.jpg' },
        { _id: 'flagged', moderationStatus: 'flagged', imageUrl: 'flagged.jpg' },
        { _id: 'legacy', imageUrl: 'legacy.jpg' },
        { _id: 'null', moderationStatus: null, imageUrl: 'null.jpg' },
    ];
}
async function invoke(scope, userId) {
    let result;
    const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { result = { code: this.code, ...body }; } };
    await getUserCollections({ query: { scope }, user: userId ? { _id: userId } : undefined }, res);
    return result;
}
test('all list image lookups filter moderation and retain approved and legacy records', async () => {
    reset();
    for (const [scope, user] of [['browse', undefined], ['browse', owner], ['mine', owner]]) {
        const result = await invoke(scope, user);
        assert.equal(result.code, 200);
        assert.equal(result.collections[0].imageCount, 3);
        assert.deepEqual(result.collections[0].sampleImages.map(row => row._id), ['approved', 'legacy', 'null']);
        assert.equal(JSON.stringify(result).includes('private.jpg'), false);
    }
});
test('personal list rereads visibility after a formerly approved image is hidden', async () => {
    reset();
    assert.equal((await invoke('mine', owner)).collections[0].coverImage._id, 'approved');
    records[0].moderationStatus = 'pending';
    const result = await invoke('mine', owner);
    assert.equal(pipelines.length, 2);
    assert.equal(result.collections[0].coverImage._id, 'legacy');
    assert.equal(result.collections[0].imageCount, 2);
    assert.equal(JSON.stringify(result).includes('approved.jpg'), false);
});
test('browse omits collections without visible images but personal picker retains an empty collection', async () => {
    reset();
    records = records.filter(row => row.moderationStatus === 'pending');
    assert.deepEqual((await invoke('browse')).collections, []);
    const personal = await invoke('mine', owner);
    assert.equal(personal.collections.length, 1);
    assert.equal(personal.collections[0].imageCount, 0);
    assert.equal(personal.collections[0].coverImage, null);
    const calls = pipelines.length;
    assert.equal((await invoke('mine')).code, 401);
    assert.equal(pipelines.length, calls);
});


test('logging in alone never reveals collaborators of unrelated public collections', async () => {
    reset();
    const member = '507f1f77bcf86cd799439022', outsider = '507f1f77bcf86cd799439099';
    members = [
        { user: { _id: member, username: 'private-membership' }, permission: 'view', invitedBy: owner, invitedAt: 'fixture-date' },
        { user: null, permission: 'edit', invitedBy: owner },
    ];
    for (const identity of [undefined, outsider]) {
        const result = await invoke('browse', identity);
        assert.equal(result.code, 200);
        assert.equal(Object.hasOwn(result.collections[0], 'collaborators'), false);
        assert.equal(JSON.stringify(result).includes('private-membership'), false);
        assert.equal(JSON.stringify(result).includes('fixture-date'), false);
        assert.equal(result.collections[0].imageCount, 3);
        assert.equal(result.collections[0].createdBy._id, owner);
    }
    for (const identity of [owner, member]) {
        const result = await invoke('browse', identity);
        assert.deepEqual(result.collections[0].collaborators, members);
    }
});
