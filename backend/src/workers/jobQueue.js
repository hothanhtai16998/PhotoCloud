import UploadJob from '../models/UploadJob.js';
import Image from '../models/Image.js';
import Notification from '../models/Notification.js';
import { logger } from '../utils/logger.js';
import { processUploadJob } from './imageProcessor.js';
import { createUploadJobRunner } from './uploadJobRunner.js';
import { getObjectFromR2, generateAvifFormats, deleteObjectByKey } from '../libs/s3.js';
import { streamToBuffer } from '../utils/imageHelpers.js';

const runner = createUploadJobRunner({
    Job: UploadJob, logger,
    processUpload: processUploadJob,
    async processAvif(job, assertLease) {
        const source = await getObjectFromR2(job.uploadKey);
        const buffer = await streamToBuffer(source.Body);
        const formats = await generateAvifFormats(buffer, 'photo-app-images', job.payload.filename);
        if (!formats.imageAvifUrl || !formats.thumbnailAvifUrl || !formats.smallAvifUrl || !formats.regularAvifUrl) {
            throw new Error('AVIF generation did not complete');
        }
        await assertLease();
        await Image.updateOne({ _id: job.imageId }, { $set: formats });
        await deleteObjectByKey(job.uploadKey);
        return { imageId: job.imageId };
    },
    async onFailure(job) {
        await Notification.create({ recipient: job.userId, type: 'upload_failed',
            metadata: { imageTitle: job.payload?.imageTitle, error: 'Không xử lý được ảnh. Vui lòng thử lại.' } });
    },
});

export async function addJob(jobData) {
    const { uploadId, uploadKey, userId, ...payload } = jobData;
    // A user retry reuses the same image ID and accepted metadata.
    await UploadJob.updateOne({ _id: uploadId, userId, uploadKey, kind: 'upload', status: 'failed' },
        { $set: { status: 'queued', attempts: 0, nextAttemptAt: new Date(), lastError: null } });
    const job = await UploadJob.findOneAndUpdate({ _id: uploadId, userId, uploadKey, status: 'staged' },
        { $set: { payload, status: 'queued', nextAttemptAt: new Date() } }, { new: true });
    const accepted = job || await UploadJob.findOne({ _id: uploadId, userId, uploadKey, kind: 'upload' });
    if (!accepted) return null;
    void runner.wake();
    return accepted;
}

export const startUploadQueue = () => runner.start();
export const stopUploadQueue = () => runner.stop();
