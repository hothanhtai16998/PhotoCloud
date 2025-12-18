/**
 * Cache Headers Middleware
 * Adds appropriate cache headers to GET responses
 */

/**
 * Set cache headers based on endpoint type
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next
 */
export const setCacheHeaders = (req, res, next) => {
    // Only apply to GET requests
    if (req.method !== 'GET') {
        return next();
    }

    const path = req.path;

    // Static/immutable data - long cache
    if (path.includes('/categories') || path.includes('/settings/public')) {
        res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400'); // 1 hour cache, 24h stale
        res.setHeader('ETag', `"${Date.now()}"`); // Simple ETag
        return next();
    }

    // User-specific data - short cache or no cache
    if (path.includes('/notifications') || 
        path.includes('/favorites') || 
        path.includes('/collections') ||
        path.includes('/follow') ||
        path.includes('/users/') ||
        path.includes('/profile')) {
        // Short cache for user data (5 minutes)
        res.setHeader('Cache-Control', 'private, max-age=300, must-revalidate');
        return next();
    }

    // Admin endpoints - no cache
    if (path.includes('/admin/')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        return next();
    }

    // Analytics/metrics - short cache
    if (path.includes('/analytics') || path.includes('/metrics') || path.includes('/stats')) {
        res.setHeader('Cache-Control', 'private, max-age=60, must-revalidate'); // 1 minute
        return next();
    }

    // Image data - medium cache (images can change)
    if (path.includes('/images') && !path.includes('/upload')) {
        res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600'); // 5 minutes
        return next();
    }

    // Search results - short cache
    if (path.includes('/search')) {
        res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300'); // 1 minute
        return next();
    }

    // Default: short cache for other GET requests
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    return next();
};

/**
 * Helper to set custom cache headers in controllers
 * @param {Object} res - Express response
 * @param {number} maxAge - Max age in seconds
 * @param {boolean} isPrivate - Whether response is private
 */
export const setCustomCacheHeaders = (res, maxAge = 300, isPrivate = false) => {
    const privacy = isPrivate ? 'private' : 'public';
    res.setHeader('Cache-Control', `${privacy}, max-age=${maxAge}, stale-while-revalidate=${maxAge * 2}`);
};

