/**
 * Request queuing middleware
 * Queues requests when rate limit is hit instead of immediately rejecting
 * Provides better user experience during high traffic
 */

// Request queue: stores queued requests
const requestQueues = new Map(); // IP -> Queue
const activeRequests = new Map(); // IP -> active count

// Queue configuration
const MAX_QUEUE_SIZE = 10; // Maximum requests in queue per IP
const QUEUE_TIMEOUT = 30000; // 30 seconds timeout for queued requests
const PROCESS_INTERVAL = 100; // Process queue every 100ms
const CONCURRENT_LIMIT = 3; // Max concurrent requests per IP

/**
 * Process queued requests for an IP
 * @param {string} ip - IP address
 */
function processQueue(ip) {
    const queue = requestQueues.get(ip);
    if (!queue || queue.length === 0) {
        requestQueues.delete(ip);
        return;
    }
    // Ensure we don't exceed concurrent limit
    const active = activeRequests.get(ip) || 0;
    while (queue.length > 0 && activeRequests.get(ip) < CONCURRENT_LIMIT) {
        const queuedRequest = queue.shift();
        if (!queuedRequest) break;

        const { req, res, next, resolve, timestamp } = queuedRequest;

        // Check if request has timed out
        if (Date.now() - timestamp > QUEUE_TIMEOUT) {
            try {
                res.status(429).json({ message: 'Request timeout. Please try again.' });
            } catch (e) { }
            resolve();
            continue;
        }

        // Mark as active
        activeRequests.set(ip, (activeRequests.get(ip) || 0) + 1);

        // Attach finish/close handlers to decrement active count and continue processing
        const clearActive = () => {
            const cur = activeRequests.get(ip) || 1;
            activeRequests.set(ip, Math.max(0, cur - 1));
            // Process next queued requests
            processQueue(ip);
        };

        res.once('finish', clearActive);
        res.once('close', clearActive);

        // Proceed with the request
        try {
            next();
        } catch (e) {
            // Ensure we still resolve and decrement
            clearActive();
        }

        resolve();
    }

    // If queue is empty, remove it
    if (!queue || queue.length === 0) {
        requestQueues.delete(ip);
    }
}

/**
 * Process all queues periodically
 */
setInterval(() => {
    for (const ip of requestQueues.keys()) {
        processQueue(ip);
    }
}, PROCESS_INTERVAL);

/**
 * Request queuing middleware
 * Note: This works in conjunction with rate limiter
 * When rate limit is hit, express-rate-limit will reject with 429
 * This middleware provides a way to handle queuing for future enhancements
 * For now, it processes requests normally but can be extended
 */
export const requestQueue = (req, res, next) => {
    // Only queue GET requests (read operations)
    // POST/PUT/DELETE should fail fast to prevent data issues
    if (req.method !== 'GET') {
        return next();
    }

    // Skip queuing for health checks and static assets
    if (req.path === '/health' || req.path.startsWith('/static')) {
        return next();
    }

    // Determine IP (respecting Express trust proxy if configured)
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';

    // If under concurrency limit, proceed immediately and mark active
    const active = activeRequests.get(ip) || 0;
    if (active < CONCURRENT_LIMIT) {
        activeRequests.set(ip, active + 1);

        const clearActive = () => {
            const cur = activeRequests.get(ip) || 1;
            activeRequests.set(ip, Math.max(0, cur - 1));
            processQueue(ip);
        };

        res.once('finish', clearActive);
        res.once('close', clearActive);

        return next();
    }

    // Otherwise, enqueue the request if queue not full
    const queue = requestQueues.get(ip) || [];
    if (queue.length >= MAX_QUEUE_SIZE) {
        return res.status(429).json({ message: 'Too many requests. Please try again later.' });
    }

    let resolved = false;
    const timestamp = Date.now();

    const queued = {
        req,
        res,
        next,
        timestamp,
        resolve: () => { resolved = true; },
    };

    // Ensure we remove queued item if client disconnects
    const onClose = () => {
        const q = requestQueues.get(ip) || [];
        const idx = q.indexOf(queued);
        if (idx !== -1) q.splice(idx, 1);
        requestQueues.set(ip, q);
        queued.resolve();
    };

    res.once('close', onClose);

    queue.push(queued);
    requestQueues.set(ip, queue);

    // Do not call next() now; it will be called when dequeued via processQueue
};

/**
 * Enqueue a request programmatically (for use by rate limiter handler)
 * Returns true if enqueued or accepted for immediate processing, false if rejected
 */
export const enqueueRequest = (req, res, next) => {
    // Only queue GET requests (read operations)
    if (req.method !== 'GET') {
        return false;
    }

    if (req.path === '/health' || req.path.startsWith('/static')) {
        return false;
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';

    const active = activeRequests.get(ip) || 0;
    if (active < CONCURRENT_LIMIT) {
        activeRequests.set(ip, active + 1);

        const clearActive = () => {
            const cur = activeRequests.get(ip) || 1;
            activeRequests.set(ip, Math.max(0, cur - 1));
            processQueue(ip);
        };

        res.once('finish', clearActive);
        res.once('close', clearActive);

        // Immediately proceed
        next();
        return true;
    }

    const queue = requestQueues.get(ip) || [];
    if (queue.length >= MAX_QUEUE_SIZE) {
        return false;
    }

    const timestamp = Date.now();
    const queued = {
        req,
        res,
        next,
        timestamp,
        resolve: () => { },
    };

    const onClose = () => {
        const q = requestQueues.get(ip) || [];
        const idx = q.indexOf(queued);
        if (idx !== -1) q.splice(idx, 1);
        requestQueues.set(ip, q);
    };

    res.once('close', onClose);

    queue.push(queued);
    requestQueues.set(ip, queue);

    return true;
};

/**
 * Get queue status for monitoring
 */
export const getQueueStatus = () => {
    const status = {};
    for (const [ip, queue] of requestQueues.entries()) {
        status[ip] = {
            queueLength: queue.length,
            oldestRequest: queue.length > 0 ? Date.now() - queue[0].timestamp : 0,
            active: activeRequests.get(ip) || 0,
        };
    }
    return status;
};

