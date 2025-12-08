import { logger } from '../utils/logger.js';
import { processUploadJob } from './imageProcessor.js';

const CONCURRENCY = 2; // tune based on CPU/RAM
const queue = [];
let activeCount = 0;

export function addJob(jobData) {
    queue.push(jobData);
    processQueue();
    return { enqueued: true, queueLength: queue.length };
}

async function processQueue() {
    if (activeCount >= CONCURRENCY || queue.length === 0) return;

    const job = queue.shift();
    activeCount++;

    try {
        await processUploadJob(job);
    } catch (err) {
        logger.error('Job failed (will retry on next server start if needed)', {
            error: err?.message,
            jobId: job?.uploadId,
        });
    } finally {
        activeCount--;
        setImmediate(processQueue); // avoid deep recursion
    }
}