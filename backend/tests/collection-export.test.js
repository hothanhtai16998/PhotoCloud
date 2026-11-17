import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
const owner = '000000000000000000000001', viewer = '000000000000000000000002';
const id = '000000000000000000000003';
let collection, projection, notifications, downloads, failDownloads, fetchImage;
function matches(row, query) {
    return Object.entries(query).every(([key, value]) => {
        if (key === '$or') return value.some(part => matches(row, part));
        if (key === 'createdBy') return (row.createdBy?._id || row.createdBy) === value;
        if (key === 'collaborators.user') return (row.collaborators || []).some(entry => entry.user === value);
        if (value?.$exists !== undefined) return Object.hasOwn(row, key) === value.$exists;
        return value === null ? row[key] == null : row[key] === value;
    });
}
mock.module('../src/models/Collection.js', { defaultExport: {
    findOne(query) {
        let value = matches(collection, query) ? { ...collection } : null;
        return {
            populate(options) {
                if (options?.path === 'images') {
                    projection = options;
                    if (value) value.images = value.images.filter(image => matches(image, options.match));
                }
                return this;
            },
            lean: async () => value,
            then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
        };
    },
} });
mock.module('../src/models/Notification.js', { defaultExport: { create: async data => notifications.push(data) } });
mock.module('axios', { defaultExport: { get: async url => { downloads.push(url); if (fetchImage) return fetchImage(url); if (failDownloads) throw new Error('fixture download failure'); return { data: Buffer.from(url) }; } } });
const { exportCollection, trackCollectionShare } = await import('../src/controllers/collection/collectionExportController.js');
function reset() {
    notifications = []; downloads = []; projection = null; failDownloads = false; fetchImage = null;
    collection = { _id: id, name: 'fixture', createdBy: owner, isPublic: true, images: [] };
}
function invoke(handler, user = viewer, origin) {
    return new Promise((resolve, reject) => {
        const res = { code: 200, headers: {}, status(code) { this.code = code; return this; },
            setHeader(name, value) { this.headers[name] = value; }, json(body) { resolve({ ...this, body }); },
            send(body) { resolve({ ...this, body }); } };
        Promise.resolve(handler({ params: { collectionId: id }, user: { _id: user }, headers: { origin } }, res, reject)).catch(reject);
    });
}
test('ZIP retains images with equal sanitized titles and never fetches unpublished images', async () => {
    reset();
    collection.images = [
        { imageTitle: 'Same!', imageUrl: 'https://example.test/a.jpg', moderationStatus: 'approved' },
        { imageTitle: 'Same?', imageUrl: 'https://example.test/b.jpg' },
        { imageTitle: 'hidden', imageUrl: 'https://example.test/private.jpg', moderationStatus: 'pending' },
    ];
    const response = await invoke(exportCollection);
    assert.equal(response.code, 200);
    const zip = await JSZip.loadAsync(response.body);
    assert.equal(Object.keys(zip.files).length, 2);
    assert.equal(downloads.length, 2);
    assert.ok(projection.match);
    assert.equal(await zip.file('1_same_.jpg').async('string'), 'https://example.test/a.jpg');
    assert.equal(await zip.file('2_same_.jpg').async('string'), 'https://example.test/b.jpg');
});
test('sharing a private collection without access cannot create a notification', async () => {
    reset(); collection.isPublic = false;
    assert.equal((await invoke(trackCollectionShare)).code, 404);
    assert.deepEqual(notifications, []);
    collection.collaborators = [{ user: viewer }];
    assert.equal((await invoke(trackCollectionShare)).code, 200);
    assert.equal(notifications.length, 1);
});
test('public sharing tolerates deleted owners and own shares do not notify', async () => {
    reset(); collection.createdBy = null;
    assert.equal((await invoke(trackCollectionShare)).code, 200);
    assert.deepEqual(notifications, []);
    reset();
    assert.equal((await invoke(trackCollectionShare, owner)).code, 200);
    assert.deepEqual(notifications, []);
});

test('all image fetches failing returns 502 instead of a successful empty ZIP', async () => {
    reset(); failDownloads = true;
    collection.images = [{ imageTitle: 'fixture', imageUrl: 'https://example.test/a.jpg' }];
    const response = await invoke(exportCollection);
    assert.equal(response.code, 502);
    assert.equal(response.body.success, false);
});


test('ZIP preserves middleware CORS and private cache policy', async () => {
    reset();
    collection.images = [{ imageUrl: 'https://example.test/a.jpg' }];
    const response = await new Promise((resolve, reject) => {
        const res = {
            headers: { 'Cache-Control': 'private, no-store', 'Access-Control-Allow-Origin': 'https://allowed.test' },
            setHeader(name, value) { this.headers[name] = value; },
            status() { return this; },
            send(body) { resolve({ headers: this.headers, body }); },
        };
        exportCollection({ params: { collectionId: id }, user: { _id: owner },
            headers: { origin: 'https://denied.test' } }, res, reject);
    });
    assert.equal(response.headers['Access-Control-Allow-Origin'], 'https://allowed.test');
    assert.equal(response.headers['Access-Control-Allow-Credentials'], undefined);
    assert.equal(response.headers['Cache-Control'], 'private, no-store');
    assert.equal(response.headers['Content-Type'], 'application/zip');
});

test('export keeps owner/public access and denies private outsider and collaborator', async () => {
    reset();
    collection.isPublic = false;
    collection.images = [{ imageUrl: 'https://example.test/a.jpg' }];
    assert.equal((await invoke(exportCollection)).code, 404);
    collection.collaborators = [{ user: viewer }];
    assert.equal((await invoke(exportCollection)).code, 404);
    assert.deepEqual(downloads, []);
    assert.equal((await invoke(exportCollection, owner)).code, 200);
});

test('invalid IDs never reach persistence; collections without visible images return 400', async () => {
    reset();
    await new Promise((resolve, reject) => {
        trackCollectionShare({ params: { collectionId: 'invalid' } }, {
            status(code) { assert.equal(code, 400); return this; },
            json() { resolve(); },
        }, reject);
    });
    await new Promise((resolve, reject) => {
        exportCollection({ params: { collectionId: 'invalid' } }, {
            status(code) { assert.equal(code, 400); return this; },
            json() { resolve(); },
        }, reject);
    });
    collection.images = [{ imageUrl: 'https://example.test/hidden.jpg', moderationStatus: 'pending' }];
    assert.equal((await invoke(exportCollection)).code, 400);
    assert.deepEqual(downloads, []);
});

test('bounded workers continue after a failure and retain positional names across waves', async () => {
    reset();
    collection.images = Array.from({ length: 11 }, (_, index) => ({
        imageTitle: 'same', imageUrl: 'https://example.test/' + index + '.jpg',
    }));
    let active = 0, peak = 0;
    fetchImage = async url => {
        active++;
        peak = Math.max(peak, active);
        await new Promise(resolve => setImmediate(resolve));
        active--;
        if (url.endsWith('/2.jpg')) throw new Error('fixture failure');
        return { data: Buffer.from(url) };
    };
    const response = await invoke(exportCollection);
    assert.equal(response.code, 200);
    assert.equal(peak, 4);
    assert.equal(active, 0);
    assert.equal(downloads.length, 11);
    const zip = await JSZip.loadAsync(response.body);
    assert.equal(Object.keys(zip.files).length, 10);
    assert.equal(zip.file('3_same.jpg'), null);
    assert.equal(await zip.file('11_same.jpg').async('string'), 'https://example.test/10.jpg');
});

test('empty download bodies do not create successful empty image entries', async () => {
    reset();
    collection.images = [{ imageUrl: 'https://example.test/empty.jpg' }];
    fetchImage = async () => ({ data: Buffer.alloc(0) });
    assert.equal((await invoke(exportCollection)).code, 502);
});

test('export selects fallback URLs and downloads them when primary URL is missing', async () => {
    reset();
    collection.images = [{ regularUrl: 'https://example.test/regular.webp' },
        { smallUrl: 'https://example.test/small.png' }, {}];
    const response = await invoke(exportCollection);
    assert.equal(response.code, 200);
    assert.ok(projection.select.includes('regularUrl'));
    assert.ok(projection.select.includes('smallUrl'));
    const zip = await JSZip.loadAsync(response.body);
    assert.equal(Object.keys(zip.files).length, 2);
    assert.equal(await zip.file('1_image_1.webp').async('string'), 'https://example.test/regular.webp');
});
