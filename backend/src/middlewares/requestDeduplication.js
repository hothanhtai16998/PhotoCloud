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
    // This middleware runs before authentication. Never share private responses
    // or mutations: replaying JSON also drops authentication Set-Cookie headers.
    if (req.method !== 'GET' || req.headers.authorization || req.headers.cookie || req.user ||
        /^\/(?:auth|users\/me|csrf-token)(?:\/|$)/.test(req.path)) {
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
        return pending.promise.then((result) => {
            if (res.destroyed || res.writableEnded) return;
            if (result && result.data !== undefined) {
                return res.status(result.status).json(result.data);
            }
            return next();
        });
    }

    const originalJson = res.json.bind(res);
    let responseData;
    let resolveRequest;
    const entry = {
        timestamp: now,
        promise: new Promise(resolve => { resolveRequest = resolve; }),
    };
    pendingRequests.set(key, entry);
    const removeEntry = () => {
        // An older response must not delete a replacement request's entry.
        if (pendingRequests.get(key) === entry) pendingRequests.delete(key);
    };
    let settled = false;
    let timer;
    const settle = (result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolveRequest(result);
        if (result) {
            timer = setTimeout(removeEntry, Math.max(0, DEDUPLICATION_WINDOW - (Date.now() - now)));
            timer.unref?.();
        } else {
            removeEntry();
        }
    };
    // Bound waiting even if the upstream handler never finishes or emits close.
    timer = setTimeout(() => settle(null), DEDUPLICATION_WINDOW * 2);
    timer.unref?.();
    res.json = function (data) {
        responseData = data;
        return originalJson(data);
    };
    res.once('finish', () => settle(responseData === undefined ? null : {
        status: res.statusCode || 200, data: responseData,
    }));
    res.once('close', () => settle(null));
    // Resolve rather than reject: originals may have no duplicate subscriber.
    res.once('error', () => settle(null));

    // Call next to proceed with request
    next();
};

/**
 * Cleanup old pending requests periodically
 */
const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of pendingRequests.entries()) {
        if (now - value.timestamp > DEDUPLICATION_WINDOW * 2) {
            pendingRequests.delete(key);
        }
    }
}, 5000); // Cleanup every 5 seconds
cleanupTimer.unref?.();

