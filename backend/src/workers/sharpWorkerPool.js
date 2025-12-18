/**
 * Sharp Worker Thread Pool
 * Processes all Sharp operations in worker threads to avoid blocking main thread
 */

import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Worker pool configuration
const WORKER_COUNT = Math.max(1, Math.min(4, Math.floor(os.cpus().length / 2)));
const workerPool = [];
let nextWorkerIndex = 0;

/**
 * Initialize worker pool
 */
function initializeWorkers() {
    for (let i = 0; i < WORKER_COUNT; i++) {
        const worker = new Worker(join(__dirname, 'imageResizeWorker.js'));
        workerPool.push({
            worker,
            busy: false,
            id: i,
        });
    }
    console.log(`[Sharp Worker Pool] Initialized ${WORKER_COUNT} workers`);
}

/**
 * Get next available worker (round-robin)
 */
function getAvailableWorker() {
    // Find first available worker
    for (let i = 0; i < workerPool.length; i++) {
        const index = (nextWorkerIndex + i) % workerPool.length;
        const workerInfo = workerPool[index];
        if (!workerInfo.busy) {
            nextWorkerIndex = (index + 1) % workerPool.length;
            return workerInfo;
        }
    }
    // All busy, use round-robin
    const workerInfo = workerPool[nextWorkerIndex];
    nextWorkerIndex = (nextWorkerIndex + 1) % workerPool.length;
    return workerInfo;
}

/**
 * Process Sharp operation in worker thread
 * @param {Buffer} buffer - Image buffer
 * @param {Object} operations - Array of Sharp operations
 * @returns {Promise<Object>} Processed buffers
 */
export async function processInWorker(buffer, operations) {
    return new Promise((resolve, reject) => {
        const workerInfo = getAvailableWorker();
        workerInfo.busy = true;

        const timeout = setTimeout(() => {
            workerInfo.busy = false;
            reject(new Error('Worker operation timeout'));
        }, 60000); // 60 second timeout

        workerInfo.worker.once('message', (result) => {
            clearTimeout(timeout);
            workerInfo.busy = false;

            if (result.error) {
                reject(new Error(result.error));
            } else {
                resolve(result.result);
            }
        });

        workerInfo.worker.once('error', (error) => {
            clearTimeout(timeout);
            workerInfo.busy = false;
            reject(error);
        });

        // Send job to worker
        workerInfo.worker.postMessage({ buffer, operations });
    });
}

/**
 * Process multiple Sharp operations in parallel using worker pool
 * @param {Buffer} buffer - Image buffer
 * @param {Array<Object>} operationsList - Array of operation configs
 * @returns {Promise<Array>} Array of processed buffers
 */
export async function processBatchInWorkers(buffer, operationsList) {
    const promises = operationsList.map(ops => processInWorker(buffer, ops));
    return Promise.all(promises);
}

// Initialize workers on module load
initializeWorkers();

// Cleanup on process exit
process.on('exit', () => {
    workerPool.forEach(({ worker }) => {
        worker.terminate();
    });
});

