import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

const images = new Map();
let downloads = 0, transfers = 0, notifications = 0;
await mock.module('../src/models/Image.js', { exports: { default: {
    findById: async id => images.get(String(id)),
    create: async data => { images.set(String(data._id), data);return data; },
} } });
await mock.module('../src/models/User.js', { exports: { default: { findById: () => ({ select: async () => null }) } } });
await mock.module('../src/models/Notification.js', { exports: { default: { create: async () => { notifications++; } } } });
await mock.module('../src/libs/s3.js', { exports: {
    getObjectFromR2: async () => { downloads++;return { Body: 'fixture', ContentType: 'image/jpeg' }; },
    uploadImageWithSizes: async () => { transfers++;return { publicId: 'fixture', imageUrl: 'fixture.jpg', thumbnailUrl: 'fixture-thumb.webp', avifPending: true }; },
    deleteObjectByKey: async () => {},
} });
await mock.module('../src/utils/imageHelpers.js', { exports: {
    streamToBuffer: async () => Buffer.from('fixture'),
    extractMetadata: async () => ({ dominantColors: [], exifData: {}, dimensions: { width: 100, height: 100 } }),
    parseTags: () => [], validateCoordinates: () => undefined,
} });
await mock.module('../src/middlewares/cacheMiddleware.js', { exports: { clearCache: async () => {} } });
await mock.module('../src/utils/emailAlerts.js', { exports: { sendImageProcessingCompleteEmail: async () => {} } });
await mock.module('../src/workers/aiTaggingQueue.js', { exports: { addAITaggingJob: () => {} } });
const { processUploadJob } = await import('../src/workers/imageProcessor.js');
const job = { uploadKey: 'photo-app-raw/image-123-abcdef12.jpg', imageId: '507f1f77bcf86cd799439012', userId: '507f1f77bcf86cd799439011', isAdmin: false };

test('replaying an upload after image creation reuses its ID and does not transfer or notify twice', async () => {
    const first = await processUploadJob(job);
    assert.equal(images.size, 1);
    assert.equal(images.get(job.imageId).moderationStatus, 'pending');
    assert.equal(first.avifPending, true);
    const second = await processUploadJob(job);
    assert.equal(first.imageId, second.imageId);
    assert.equal(downloads, 1);assert.equal(transfers, 1);assert.equal(notifications, 1);
    assert.equal(second.avifPending, true, 'a crash before AVIF enqueue can recover the child');
});

test('a worker that lost its lease cannot publish a new image', async () => {
    await assert.rejects(processUploadJob({ ...job, imageId: '507f1f77bcf86cd799439013' }, async () => { throw Error('Lease lost'); }), /Lease lost/);
    assert.equal(images.size, 1);
});
