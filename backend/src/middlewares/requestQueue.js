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

/** Finish and close may both fire; release one slot exactly once. */
function releaseRequestOnCompletion(ip, res) {
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    res.removeListener('finish', release);
    res.removeListener('close', release);
    const remaining = Math.max(0, (activeRequests.get(ip) || 1) - 1);
    if (remaining) activeRequests.set(ip, remaining);
    else activeRequests.delete(ip);
    processQueue(ip);
  };
  res.once('finish', release);
  res.once('close', release);
  return release;
}

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
  // Expire waiting requests even when every active slot is still occupied.
  for (let index = queue.length - 1; index >= 0; index--) {
    const waiting = queue[index];
    if (
      waiting.res.destroyed ||
      waiting.res.writableEnded ||
      Date.now() - waiting.timestamp > QUEUE_TIMEOUT
    ) {
      queue.splice(index, 1);
      waiting.detach();
      if (!waiting.res.destroyed && !waiting.res.writableEnded) {
        waiting.res
          .status(429)
          .json({ message: 'Request timeout. Please try again.' });
      }
    }
  }
  // Ensure we don't exceed concurrent limit
  while (queue.length > 0 && (activeRequests.get(ip) || 0) < CONCURRENT_LIMIT) {
    const queuedRequest = queue.shift();
    if (!queuedRequest) break;

    const { res, next, detach } = queuedRequest;
    detach();
    if (res.destroyed || res.writableEnded) continue;

    // Mark as active
    activeRequests.set(ip, (activeRequests.get(ip) || 0) + 1);

    // Attach finish/close handlers to decrement active count and continue processing
    const clearActive = releaseRequestOnCompletion(ip, res);

    // Proceed with the request
    try {
      next();
    } catch (e) {
      // Ensure the slot is released when a downstream handler throws
      clearActive();
    }
  }

  // If queue is empty, remove it
  if (!queue || queue.length === 0) {
    requestQueues.delete(ip);
  }
}

/** The queue owns the close listener only while the request is waiting. */
function addWaitingRequest(ip, queue, res, next) {
  const onClose = () => {
    const waiting = requestQueues.get(ip);
    if (!waiting) return;
    const index = waiting.indexOf(queued);
    if (index !== -1) waiting.splice(index, 1);
    if (!waiting.length) requestQueues.delete(ip);
  };
  const queued = {
    res,
    next,
    timestamp: Date.now(),
    detach: () => res.removeListener('close', onClose),
  };
  res.once('close', onClose);
  queue.push(queued);
  requestQueues.set(ip, queue);
}

/**
 * Process all queues periodically
 */
const queueTimer = setInterval(() => {
  for (const ip of requestQueues.keys()) {
    processQueue(ip);
  }
}, PROCESS_INTERVAL);
queueTimer.unref?.();

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
  const ip =
    req.ip ||
    req.headers['x-forwarded-for'] ||
    req.connection?.remoteAddress ||
    'unknown';

  // If under concurrency limit, proceed immediately and mark active
  const active = activeRequests.get(ip) || 0;
  if (active < CONCURRENT_LIMIT) {
    activeRequests.set(ip, active + 1);

    releaseRequestOnCompletion(ip, res);

    return next();
  }

  // Otherwise, enqueue the request if queue not full
  const queue = requestQueues.get(ip) || [];
  if (queue.length >= MAX_QUEUE_SIZE) {
    return res
      .status(429)
      .json({ message: 'Too many requests. Please try again later.' });
  }

  addWaitingRequest(ip, queue, res, next);

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

  const ip =
    req.ip ||
    req.headers['x-forwarded-for'] ||
    req.connection?.remoteAddress ||
    'unknown';

  const active = activeRequests.get(ip) || 0;
  if (active < CONCURRENT_LIMIT) {
    activeRequests.set(ip, active + 1);

    releaseRequestOnCompletion(ip, res);

    // Immediately proceed
    next();
    return true;
  }

  const queue = requestQueues.get(ip) || [];
  if (queue.length >= MAX_QUEUE_SIZE) {
    return false;
  }

  addWaitingRequest(ip, queue, res, next);

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
