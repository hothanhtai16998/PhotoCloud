import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

const records = new Map();
const match = (row, query) => row && Object.entries(query).every(([key, value]) => String(row[key]) === String(value));
const Job = {
    async create(row) { records.set(row._id, { ...row, kind: 'upload', status: 'staged' }); },
    findOne(query) {
        const value = [...records.values()].find(row => match(row, query)) || null;
        return { lean: async () => value, then: (resolve, reject) => Promise.resolve(value).then(resolve, reject) };
    },
    async findOneAndDelete(query) { const row = [...records.values()].find(row => match(row, query));if (row) records.delete(row._id);return row; },
};
const images = new Map();
await mock.module('../src/models/UploadJob.js', { defaultExport: Job });
await mock.module('../src/models/Image.js', { defaultExport: { findById: id => ({ populate() { return this; }, lean: async () => images.get(id) || null }) } });
await mock.module('../src/models/Category.js', { defaultExport: {} });
await mock.module('../src/models/Notification.js', { defaultExport: {} });
await mock.module('../src/models/Settings.js', { defaultExport: { findOne: async () => null } });
let enqueueGate = Promise.resolve();
await mock.module('../src/workers/jobQueue.js', { namedExports: { addJob: async data => {
    await enqueueGate;
    const row = records.get(data.uploadId);
    if (!match(row, { userId: data.userId, uploadKey: data.uploadKey })) return null;
    row.status = 'queued';return row;
} } });
const deleted = [];
await mock.module('../src/libs/s3.js', { namedExports: {
    generatePresignedUploadUrl: async () => 'https://storage.example.test/upload',
    deleteObjectByKey: async key => deleted.push(key),
    uploadImageWithSizes: async () => ({}), uploadVideo: async () => ({}), deleteImageFromR2: async () => {},
} });
await mock.module('../src/utils/imageHelpers.js', { namedExports: {
    findCategory: async () => ({}), parseTags: value => value, validateCoordinates: value => value, streamToBuffer: async () => Buffer.alloc(0),
} });
await mock.module('../src/utils/colorExtractor.js', { namedExports: { extractDominantColors: async () => [] } });
await mock.module('../src/utils/exifExtractor.js', { namedExports: { extractExifData: async () => ({}) } });
const { preUploadImage, finalizeImageUpload, deletePreUploadedFile } = await import('../src/controllers/image/imageUploadController.js');
const { getUploadStatus } = await import('../src/controllers/image/uploadStatusController.js');

test('upload endpoints await persistence, isolate owners and protect accepted sources', async () => {
    const app = express();app.use(express.json());
    app.use((req, res, next) => { req.user = { _id: req.headers['x-user'] || 'owner' };next(); });
    app.post('/pre-upload', preUploadImage);app.post('/finalize', finalizeImageUpload);
    app.delete('/pre-upload', deletePreUploadedFile);app.get('/uploads/:uploadId', getUploadStatus);
    app.use((err, req, res, next) => res.status(500).json({ message: err.message }));
    const server = app.listen(0, '127.0.0.1');await new Promise(resolve => server.once('listening', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const request = (path, method = 'GET', body, user = 'owner') => fetch(origin + path, {
        method, headers: { 'Content-Type': 'application/json', 'x-user': user }, body: body ? JSON.stringify(body) : undefined,
    });
    try {
        const staged = await (await request('/pre-upload', 'POST', { fileName: 'photo.jpg', fileType: 'image/jpeg', fileSize: 100 })).json();
        assert.equal(records.get(staged.uploadId).userId, 'owner');
        const payload = { uploadId: staged.uploadId, uploadKey: staged.uploadKey, imageCategory: '' };
        assert.equal((await request('/finalize', 'POST', payload, 'other')).status, 404);
        assert.equal((await request('/uploads/' + staged.uploadId, 'GET', undefined, 'other')).status, 404);
        assert.equal((await request('/pre-upload', 'DELETE', { uploadKey: staged.uploadKey }, 'other')).status, 404);
        let release;enqueueGate = new Promise(resolve => { release = resolve; });
        let replied = false;
        const pending = request('/finalize', 'POST', payload).then(res => { replied = true;return res; });
        await new Promise(resolve => setTimeout(resolve, 15));assert.equal(replied, false, '202 must wait for durable enqueue');
        release();
        const response = await pending;assert.equal(response.status, 202);assert.equal((await response.json()).status, 'queued');
        await request('/pre-upload', 'DELETE', { uploadKey: staged.uploadKey });assert.deepEqual(deleted, []);
        let status = await request('/uploads/' + staged.uploadId);
        assert.match(status.headers.get('cache-control'), /no-store/);assert.equal((await status.json()).image, undefined);
        Object.assign(records.get(staged.uploadId), { status: 'completed', imageId: 'image' });
        images.set('image', { _id: 'image', moderationStatus: 'pending' });
        status = await request('/uploads/' + staged.uploadId);
        assert.equal((await status.json()).image.moderationStatus, 'pending', 'completion never means moderation approved');
        images.clear();assert.equal((await request('/uploads/' + staged.uploadId)).status, 410);
    } finally { await new Promise(resolve => server.close(resolve)); }
});
