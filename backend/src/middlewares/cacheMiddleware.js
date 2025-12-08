/**
 * Enhanced in-memory cache middleware for frequently accessed endpoints
 * Features:
 * - Smart cache key generation
 * - Variable TTL based on endpoint type
 * - Cache invalidation strategies
 * - Memory-efficient cleanup
 * Note: For production, consider using Redis for distributed caching
 */

const cache = new Map();
const DEFAULT_TTL = 60 * 1000; // 1 minute default TTL

// TTL configuration by endpoint pattern
const TTL_CONFIG = {
    '/api/images': 30 * 1000, // 30 seconds for image lists (frequently updated)
    '/api/categories': 5 * 60 * 1000, // 5 minutes for categories (rarely change)
    '/api/users': 2 * 60 * 1000, // 2 minutes for user data
    '/api/favorites': 10 * 1000, // 10 seconds for favorites (user-specific)
    '/api/collections': 30 * 1000, // 30 seconds for collections
    default: DEFAULT_TTL,
};

/**
 * Generate smart cache key from request
 * Includes user ID for user-specific endpoints
 * @param {Object} req - Express request object
 * @returns {string} Cache key
 */
function generateCacheKey(req) {
    // Use path without query string; fall back to url
    const path = req.path || (req.originalUrl && req.originalUrl.split('?')[0]) || req.url || '/';

    // Stable user id extraction
    const userId = req.user?._id ?? req.user?.id ?? 'anonymous';

    // Stable query serialization: sort keys to avoid different key orderings
    const queryObj = req.query || {};
    const sortedQuery = Object.keys(queryObj).sort().reduce((acc, k) => { acc[k] = queryObj[k]; return acc; }, {});
    const query = JSON.stringify(sortedQuery);

    // For user-specific endpoints, include user ID in key
    const userSpecificPaths = ['/api/favorites', '/favorites', '/api/collections', '/collections', '/profile'];
    const isUserSpecific = userSpecificPaths.some(p => path.includes(p));

    if (isUserSpecific) {
        return `${path}:${userId}:${query}`;
    }

    return `${path}:${query}`;
}

/**
 * Get TTL for a specific endpoint
 * @param {string} path - Request path
 * @returns {number} TTL in milliseconds
 */
function getTTLForPath(path) {
    for (const [pattern, ttl] of Object.entries(TTL_CONFIG)) {
        if (path.includes(pattern)) {
            return ttl;
        }
    }
    return TTL_CONFIG.default;
}

/**
 * Enhanced cache middleware factory
 * @param {number} ttl - Time to live in milliseconds (optional, auto-detected if not provided)
 * @param {Function} keyGenerator - Function to generate cache key from request (optional)
 * @returns {Function} Express middleware
 */
export const cacheMiddleware = (ttl = null, keyGenerator = null) => {
    return (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Skip caching for certain endpoints
        const skipCachePaths = ['/health', '/csrf-token'];
        if (skipCachePaths.some(p => req.path.includes(p))) {
            return next();
        }

        // Generate cache key
        const key = keyGenerator 
            ? keyGenerator(req)
            : generateCacheKey(req);

        // Get TTL for this endpoint
        const endpointTTL = ttl || getTTLForPath(req.path);

        // Check cache
        const cached = cache.get(key);
        if (cached && Date.now() < cached.expiresAt) {
            // Set cache headers
            res.set('X-Cache', 'HIT');
            res.set('X-Cache-Age', Math.floor((Date.now() - cached.timestamp) / 1000).toString());
            return res.status(cached.status).json(cached.data);
        }

        // Store original json method
        const originalJson = res.json.bind(res);

        // Override json method to cache response
        res.json = function(data) {
            // Cache successful responses (status 200-299)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                cache.set(key, {
                    data,
                    status: res.statusCode,
                    expiresAt: Date.now() + endpointTTL,
                    timestamp: Date.now(),
                });
            }

            // Call original json method
            return originalJson(data);
        };

        // Set cache header
        res.set('X-Cache', 'MISS');

        next();
    };
};

/**
 * Clear cache for a specific key pattern
 * @param {string} pattern - Pattern to match cache keys
 */
export const clearCache = (pattern) => {
    if (pattern) {
        for (const key of cache.keys()) {
            if (key.includes(pattern)) {
                cache.delete(key);
            }
        }
    } else {
        cache.clear();
    }
};

/**
 * Cleanup expired cache entries periodically
 * More aggressive cleanup to prevent memory leaks
 */
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, value] of cache.entries()) {
        if (now >= value.expiresAt) {
            cache.delete(key);
            cleaned++;
        }
    }
    
    // If cache is getting too large (> 1000 entries), remove oldest 20%
    if (cache.size > 1000) {
        const entries = Array.from(cache.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        const toRemove = Math.floor(cache.size * 0.2);
        for (let i = 0; i < toRemove; i++) {
            cache.delete(entries[i][0]);
        }
    }
}, 1 * 60 * 1000); // Cleanup every 1 minute (more frequent)

