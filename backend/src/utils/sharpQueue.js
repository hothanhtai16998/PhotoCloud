/**
 * Sharp Operation Queue
 * Limits concurrent Sharp operations to prevent CPU overload
 */

import sharp from 'sharp';
import { logger } from './logger.js';

// Maximum concurrent Sharp operations (prevents CPU overload)
const MAX_CONCURRENT_SHARP_OPS = 2;
const queue = [];
let activeCount = 0;

/**
 * Process Sharp operations with concurrency limit
 * @param {Function} operation - Function that returns a Sharp operation promise
 * @returns {Promise} Promise that resolves when operation completes
 */
export async function queueSharpOperation(operation) {
    return new Promise((resolve, reject) => {
        queue.push({ operation, resolve, reject });
        processQueue();
    });
}

/**
 * Process queue items up to concurrency limit
 */
async function processQueue() {
    if (activeCount >= MAX_CONCURRENT_SHARP_OPS || queue.length === 0) {
        return;
    }

    const { operation, resolve, reject } = queue.shift();
    activeCount++;

    try {
        const result = await operation();
        resolve(result);
    } catch (error) {
        logger.error('[Sharp Queue] Operation failed:', error);
        reject(error);
    } finally {
        activeCount--;
        // Process next item in queue
        setImmediate(processQueue);
    }
}

/**
 * Get queue status
 */
export function getQueueStatus() {
    return {
        queueLength: queue.length,
        activeCount,
        maxConcurrent: MAX_CONCURRENT_SHARP_OPS,
    };
}

