import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
const owner = '507f1f77bcf86cd799439011', id = '507f1f77bcf86cd799439012';
let template, created, saves, countFailure, versions, reads, invalidations;
mock.module('../src/models/CollectionTemplate.js', { defaultExport: {
    async findOne(filter) {
        reads++;
        return template && template._id === filter._id && filter.$or.some(rule =>
            Object.entries(rule).every(([key, value]) => template[key] === value)) ? template : null;
    },
    async findByIdAndUpdate(_id, update) {
        assert.deepEqual(update, { $inc: { usageCount: 1 } });
        if (countFailure) throw new Error('fixture counter failure');
    },
} });
class Collection {
    constructor(data) { Object.assign(this, data); this._id = id; created = this; }
    async save() { saves++; }
    static findById() { return { populate() { return this; }, lean: async () => ({ ...created }) }; }
}
mock.module('../src/models/Collection.js', { defaultExport: Collection });
mock.module('../src/services/collection/collectionCache.js', { namedExports: {
    invalidateCollectionLists: async () => { invalidations++; },
} });
mock.module('../src/services/collection/collectionVersionHelper.js', { namedExports: {
    createCollectionVersion: async () => { versions++; },
} });
const { createCollectionFromTemplate } = await import('../src/controllers/collection/collectionTemplateController.js');
function reset() {
    template = { _id: id, createdBy: owner, isSystemTemplate: false, templateName: 'fixture',
        description: 'Mô tả mẫu', defaultIsPublic: false, defaultTags: ['fixture'] };
    saves = 0; versions = 0; reads = 0; invalidations = 0; countFailure = false; created = null;
}
function invoke(body = {}, user = { _id: owner, isAdmin: true }) {
    return new Promise((resolve, reject) => {
        const res = { code: 200, status(code) { this.code = code; return this; }, json(data) { resolve({ code: this.code, ...data }); } };
        createCollectionFromTemplate({ params: { templateId: id }, body, user }, res, reject);
    });
}
test('template description is used only when omitted and explicit empty description stays empty', async () => {
    for (const [body, expected] of [[{}, 'Mô tả mẫu'], [{ description: '' }, ''], [{ description: '  ' }, ''], [{ description: ' Mô tả mới ' }, 'Mô tả mới']]) {
        reset();
        const result = await invoke(body);
        assert.equal(result.code, 201);
        assert.equal(created.description, expected);
        assert.equal(created.isPublic, false);
        assert.equal(created.createdBy, owner);
        assert.equal(saves, 1);
        assert.equal(versions, 1);
    }
});
test('invalid descriptions do not create a collection or update side effects', async () => {
    for (const description of [null, {}, 123, 'x'.repeat(501)]) {
        reset();
        assert.equal((await invoke({ description })).code, 400);
        assert.equal(saves, 0);
        assert.equal(created, null);
        assert.equal(invalidations, 0);
        assert.equal(versions, 0);
    }
});
test('failed usage statistic does not turn a saved collection into a failed creation', async () => {
    reset(); countFailure = true;
    const result = await invoke();
    assert.equal(result.code, 201);
    assert.equal(result.success, true);
    assert.equal(saves, 1);
    assert.equal(invalidations, 1);
    assert.equal(versions, 1);
});
test('creation still requires an administrator and a system or owned template', async () => {
    reset();
    assert.equal((await invoke({}, { _id: owner })).code, 403);
    assert.equal(reads, 0);
    template.createdBy = '507f1f77bcf86cd799439099';
    assert.equal((await invoke()).code, 404);
    assert.equal(saves, 0);
    template.isSystemTemplate = true;
    assert.equal((await invoke()).code, 201);
});
