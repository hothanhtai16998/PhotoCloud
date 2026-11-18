import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { publicImageFilter } from '../src/utils/publicImageFilter.js';
const actor = '507f1f77bcf86cd799439011', owner = '507f1f77bcf86cd799439022';
let rows, favorites, queryFilter, projections;
function matches(row, query) {
    return Object.entries(query).every(([key, value]) => {
        if (key === '$or') return value.some(rule => matches(row, rule));
        if (key === 'collaborators.user') return row.collaborators?.some(member => member.user === value);
        if (value?.$in) return value.$in.includes(row[key]);
        if (value?.$exists !== undefined) return Object.hasOwn(row, key) === value.$exists;
        return value === null ? row[key] == null : row[key] === value;
    });
}
mock.module('../src/models/User.js', { defaultExport: {
    findById() { return { select: async () => ({ favoriteCollections: favorites }) }; },
} });
mock.module('../src/models/Collection.js', { defaultExport: {
    find(filter) {
        queryFilter = filter;
        const selected = rows.filter(row => matches(row, filter)).map(row => ({ ...row, images: [...row.images] }));
        return {
            populate(options) {
                if (options?.path) {
                    projections.push(options);
                    for (const row of selected) {
                        if (options.path === 'images') row.images = row.images.filter(image => matches(image, options.match));
                        if (options.path === 'coverImage' && row.coverImage && !matches(row.coverImage, options.match)) row.coverImage = null;
                    }
                }
                return this;
            },
            lean: async () => selected,
        };
    },
} });
mock.module('../src/models/Notification.js', { defaultExport: {} });
const { getFavoriteCollections } = await import('../src/controllers/collection/collectionFavoriteController.js');
function reset() {
    const approved = { _id: 'approved', imageUrl: 'visible.jpg', moderationStatus: 'approved' };
    const pending = { _id: 'pending', imageUrl: 'private.jpg', moderationStatus: 'pending' };
    rows = [
        { _id: 'public', createdBy: owner, isPublic: true, collaborators: [{ user: owner, permission: 'admin', invitedAt: 'private-date' }], images: [approved, pending], coverImage: pending },
        { _id: 'hidden', createdBy: owner, isPublic: false, collaborators: [], images: [approved] },
        { _id: 'member', createdBy: owner, isPublic: false, collaborators: [{ user: actor, permission: 'view' }], images: [approved] },
        { _id: 'owned', createdBy: actor, isPublic: false, collaborators: [], images: [approved] },
    ];
    favorites = ['missing', ...rows.map(row => row._id)];
    projections = [];
}
async function invoke(page = '1', limit = '20') {
    return new Promise((resolve, reject) => {
        const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { resolve({ code: this.code, ...body }); } };
        getFavoriteCollections({ user: { _id: actor }, query: { page, limit } }, res, reject);
    });
}
test('favorite history never grants access to a collection that is private or no longer shared', async () => {
    reset();
    const result = await invoke();
    assert.equal(result.code, 200);
    assert.deepEqual(result.collections.map(row => row._id), ['owned', 'member', 'public']);
    assert.equal(result.pagination.total, 3);
    assert.equal(result.pagination.pages, 1);
    rows[2].collaborators = [];
    const revoked = await invoke();
    assert.deepEqual(revoked.collections.map(row => row._id), ['owned', 'public']);
    assert.equal(revoked.pagination.total, 2);
    assert.ok(queryFilter.$or);
});
test('favorite collection images and member details follow current visibility rules', async () => {
    reset();
    const result = await invoke();
    const publicRow = result.collections.find(row => row._id === 'public');
    assert.equal(publicRow.coverImage, null);
    assert.equal(publicRow.imageCount, 1);
    assert.equal(publicRow.images.length, 1);
    assert.equal(Object.hasOwn(publicRow, 'collaborators'), false);
    assert.equal(JSON.stringify(result).includes('private.jpg'), false);
    assert.equal(JSON.stringify(result).includes('private-date'), false);
    assert.equal(result.collections.find(row => row._id === 'member').collaborators.length, 1);
    for (const projection of projections) assert.deepEqual(projection.match, publicImageFilter());
});
test('pagination totals count only accessible existing favorites and preserve favorite order', async () => {
    reset();
    const first = await invoke('1', '2');
    const second = await invoke('2', '2');
    assert.deepEqual(first.collections.map(row => row._id), ['owned', 'member']);
    assert.deepEqual(second.collections.map(row => row._id), ['public']);
    assert.equal(second.pagination.total, 3);
    assert.equal(second.pagination.pages, 2);
    rows = rows.filter(row => row._id === 'hidden');
    const result = await invoke();
    assert.deepEqual(result.collections, []);
    assert.equal(result.pagination.total, 0);
    assert.equal(result.pagination.pages, 0);
});
