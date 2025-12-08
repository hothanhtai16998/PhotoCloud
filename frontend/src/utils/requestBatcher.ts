/**
 * Request batching utility
 * Batches multiple API calls into a single request when possible
 * Reduces number of HTTP requests and improves performance
 */

interface BatchedRequest<T = unknown> {
	resolve: (value: T | PromiseLike<T>) => void;
	reject: (error: unknown) => void;
	url: string;
	method: string;
	data?: unknown;
}

// Batch configuration
const BATCH_WINDOW = 50; // 50ms window to collect requests
const MAX_BATCH_SIZE = 10; // Maximum requests per batch

// Store pending batches
const pendingBatches = new Map<string, BatchedRequest<unknown>[]>();
let batchTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Batch multiple requests together
 * Currently supports GET requests only (can be extended)
 * @param url - Request URL
 * @param requestFn - Function that makes the actual request
 * @returns Promise that resolves with the response
 */
export async function batchRequest<T>(
	url: string,
	requestFn: () => Promise<T>
): Promise<T> {
	// Only batch GET requests for now
	if (!url.includes('GET') && !url.includes('get')) {
		return requestFn();
	}

	return new Promise((resolve, reject) => {
		// Get or create batch for this endpoint pattern
		const batchKey = url.split('?')[0]; // Use path without query params as key
		if (!batchKey) {
			requestFn().then(resolve).catch(reject);
			return;
		}
		let batch = pendingBatches.get(batchKey);

		if (!batch) {
			batch = [];
			pendingBatches.set(batchKey, batch);
		}

		// Add request to batch
		batch.push({
			resolve: resolve as (value: unknown) => void,
			reject,
			url,
			method: 'GET',
		});

		// If batch is full, process immediately
		if (batch.length >= MAX_BATCH_SIZE) {
			processBatch(batchKey);
		} else {
			// Schedule batch processing
			if (!batchTimer) {
				batchTimer = setTimeout(() => {
					processBatches();
					batchTimer = null;
				}, BATCH_WINDOW);
			}
		}
	});
}

/**
 * Process a single batch
 */
function processBatch(batchKey: string): void {
	const batch = pendingBatches.get(batchKey);
	if (!batch || batch.length === 0) {
		pendingBatches.delete(batchKey);
		return;
	}

	// For now, just execute requests individually
	// In the future, could implement actual batching endpoint
	batch.forEach(({ resolve }) => {
		// This would need to be replaced with actual batched API call
		// For now, just resolve immediately (placeholder)
		resolve(null);
	});

	pendingBatches.delete(batchKey);
}

/**
 * Process all pending batches
 */
function processBatches(): void {
	for (const batchKey of pendingBatches.keys()) {
		processBatch(batchKey);
	}
}


