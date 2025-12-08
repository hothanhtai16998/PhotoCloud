/**
 * Frontend request deduplication utility
 * Prevents duplicate API calls from being made simultaneously
 * Reduces unnecessary network requests and improves performance
 */

interface PendingRequest {
	promise: Promise<unknown>;
	timestamp: number;
}

// Store pending requests: key -> { promise, timestamp }
const pendingRequests = new Map<string, PendingRequest>();
const DEDUPLICATION_WINDOW = 1000; // 1 second window

/**
 * Generate a unique key for a request
 * @param method - HTTP method
 * @param url - Request URL
 * @param data - Request data (for POST/PUT)
 * @returns Unique request key
 */
function generateRequestKey(method: string, url: string, data?: unknown): string {
	const dataStr = data ? JSON.stringify(data) : '';
	return `${method}:${url}:${dataStr}`;
}

/**
 * Deduplicate API requests
 * If the same request is made within the deduplication window, return the cached promise
 * @param method - HTTP method
 * @param url - Request URL
 * @param requestFn - Function that makes the actual request
 * @param data - Request data (optional)
 * @returns Promise that resolves with the response
 */
export async function deduplicateRequest<T>(
	method: string,
	url: string,
	requestFn: () => Promise<T>,
	data?: unknown
): Promise<T> {
	const key = generateRequestKey(method, url, data);
	const now = Date.now();

	// Check if there's a pending request for this key
	const pending = pendingRequests.get(key);

	if (pending && (now - pending.timestamp) < DEDUPLICATION_WINDOW) {
		// Duplicate request detected - return the existing promise
		return pending.promise as Promise<T>;
	}

	// Create new request promise
	const requestPromise = requestFn()
		.then((result) => {
			// Clean up after a delay
			setTimeout(() => {
				pendingRequests.delete(key);
			}, DEDUPLICATION_WINDOW);
			return result;
		})
		.catch((error) => {
			// Remove from pending on error
			pendingRequests.delete(key);
			throw error;
		});

	// Store the promise
	pendingRequests.set(key, {
		promise: requestPromise,
		timestamp: now,
	});

	return requestPromise;
}

/**
 * Cleanup old pending requests periodically
 */
setInterval(() => {
	const now = Date.now();
	for (const [key, value] of pendingRequests.entries()) {
		if (now - value.timestamp > DEDUPLICATION_WINDOW * 2) {
			pendingRequests.delete(key);
		}
	}
}, 5000); // Cleanup every 5 seconds


