import os from 'os';
import { logger } from '../utils/logger.js';
import { processUploadJob } from './imageProcessor.js';

// Derive concurrency from CPU count, but cap to avoid overloading the server
const CPU_COUNT = os.cpus()?.length || 2;
const CONCURRENCY = Math.max(1, Math.min(4, Math.floor(CPU_COUNT / 2))) || 2;
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