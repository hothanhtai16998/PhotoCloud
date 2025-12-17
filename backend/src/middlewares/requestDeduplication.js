/**
 * Request deduplication middleware
 * Prevents duplicate requests from the same user/IP within a short time window
 * Reduces unnecessary API calls and database queries
 */

import crypto from 'crypto';

// Store pending requests: key -> { promise, timestamp }
const pendingRequests = new Map();
const DEDUPLICATION_WINDOW = 1000; // 1 second window

/**
 * Generate a unique key for a request
 * @param {Object} req - Express request object
 * @returns {string} Unique request key
 */
function stableStringify(obj) {
    if (obj === null || obj === undefined) return '';
    if (typeof obj !== 'object') return String(obj);
    if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
    const keys = Object.keys(obj).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

function generateRequestKey(req) {
    const userId = req.user?._id || req.user?.id || 'anonymous';
    const method = req.method;
    const path = req.path || '/';
    const queryStable = stableStringify(req.query || {});
    const bodyStable = method === 'GET' ? '' : stableStringify(req.body || {});

    const raw = `${method}:${path}:${userId}:${queryStable}:${bodyStable}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Request deduplication middleware
 * If the same request is made within the deduplication window, return the cached response
 */
export const requestDeduplication = (req, res, next) => {
    // Only deduplicate GET and POST requests
    if (req.method !== 'GET' && req.method !== 'POST') {
        return next();
    }

    // Skip deduplication for file uploads
    if (req.path.includes('/upload') || req.file) {
        return next();
    }

    const key = generateRequestKey(req);
    const now = Date.now();

    // Check if there's a pending request for this key
    const pending = pendingRequests.get(key);

    if (pending && (now - pending.timestamp) < DEDUPLICATION_WINDOW) {
        // Duplicate request detected - wait for the original request to complete
        return pending.promise
            .then((result) => {
                // Return cached JSON response if available; otherwise proceed
                if (result && result.data !== undefined) {
                    return res.status(result.status).json(result.data);
                }

                // If original didn't produce JSON, fall through to normal handling
                return next();
            })
            .catch((error) => {
                // If original request failed, let this one proceed
                next();
            });
    }

    // Store original json method
    const originalJson = res.json.bind(res);
    const originalStatus = res.status.bind(res);

    let responseStatus = 200;
    let responseData = null;
    let requestResolve = null;
    let requestReject = null;

    // Create a promise for this request (without referencing itself)
    const requestPromise = new Promise((resolve, reject) => {
        requestResolve = resolve;
        requestReject = reject;
    });

    // Store the promise (now that it's created)
    pendingRequests.set(key, {
        promise: requestPromise,
        timestamp: now,
    });

    // Override json method to capture response
    res.json = function (data) {
        responseData = data;
        responseStatus = res.statusCode || 200;
        return originalJson(data);
    };

    res.status = function (code) {
        responseStatus = code;
        return originalStatus(code);
    };

    // Resolve when response finishes to ensure headers/body are complete
    res.on('finish', () => {
        if (requestResolve) {
            requestResolve({
                status: responseStatus,
                data: responseData,
            });
        }

        // Clean up after deduplication window
        setTimeout(() => {
            pendingRequests.delete(key);
        }, DEDUPLICATION_WINDOW);
    });

    // Handle errors
    res.on('error', (error) => {
        pendingRequests.delete(key);
        if (requestReject) {
            requestReject(error);
        }
    });

    // Call next to proceed with request
    next();
};

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

