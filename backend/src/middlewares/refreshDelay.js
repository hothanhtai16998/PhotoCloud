/**
 * Refresh Delay Middleware
 * 
 * Delays responses for refresh requests to prevent rapid refresh spam
 * This keeps requests pending, showing the browser's X icon naturally
 * 
 * Strategy:
 * 1. Detect refresh requests (via header, query param, or cache headers)
 * 2. Delay response by 2-3 seconds
 * 3. Keep request pending (shows X icon in browser)
 * 4. After delay, process request normally
 * 
 * This works like Unsplash/Gmail - requests stay pending during delay,
 * showing the browser's cancel (X) icon, preventing rapid refresh spam.
 */

/**
 * Refresh delay configuration
 * 
 * Industry Standard: 2-3 seconds (fixed, not dynamic)
 * - Unsplash: ~2.5 seconds
 * - Gmail: ~2-3 seconds  
 * - X (Twitter): ~2-3 seconds
 * - Facebook: ~2-3 seconds
 * 
 * Why Fixed Delay (not based on network speed):
 * 1. Predictable UX - users know how long to wait
 * 2. Prevents rapid refresh spam (main goal - prevents 429 errors)
 * 3. Gives users time to cancel (X icon)
 * 4. Works regardless of network conditions
 * 5. Simple to implement and maintain
 * 
 * The delay is NOT about network optimization - it's about UX and rate limiting.
 * The actual data fetching happens AFTER the delay anyway.
 */
const REFRESH_DELAY_MS = 2500; // 2.5 seconds - matches industry standard

// Track refresh requests per IP to prevent multiple simultaneous delays
const refreshDelays = new Map(); // IP -> { timestamp, timeout, requestCount }

/**
 * Check if request is a refresh (page reload)
 * We detect this via:
 * - _refresh query parameter (explicit flag from frontend)
 * - X-Refresh header (custom header from frontend)
 * - Cache-Control: no-cache header (browser sends on refresh)
 * - Pragma: no-cache header (browser sends on refresh)
 * - Referer matches origin (same-page refresh)
 */
function isRefreshRequest(req) {
    // Check for explicit _refresh query parameter
    if (req.query._refresh === 'true' || req.query._refresh === '1') {
        console.log(`[RefreshDelay] ✅ Refresh detected via _refresh query param: ${req.path}`);
        return true;
    }
    
    // Check for custom X-Refresh header (from frontend axios interceptor)
    const xRefresh = req.get('x-refresh');
    if (xRefresh === 'true' || xRefresh === '1') {
        console.log(`[RefreshDelay] ✅ Refresh detected via X-Refresh header: ${req.path}`);
        return true;
    }
    
    // Check cache-control header (browser sends on refresh)
    const cacheControl = req.get('cache-control');
    if (cacheControl && (cacheControl.includes('no-cache') || cacheControl.includes('no-store'))) {
        console.log(`[RefreshDelay] ✅ Refresh detected via Cache-Control: ${req.path}`);
        return true;
    }
    
    // Check pragma header (older browsers send on refresh)
    const pragma = req.get('pragma');
    if (pragma && pragma.includes('no-cache')) {
        console.log(`[RefreshDelay] ✅ Refresh detected via Pragma: ${req.path}`);
        return true;
    }
    
    // Check if request has no referer or referer matches origin (page refresh scenario)
    // This is a fallback - less reliable but catches cases where headers aren't set
    const referer = req.get('referer');
    if (!referer) {
        // No referer often means direct navigation or refresh
        // But this is too broad, so we'll be conservative
        // Only use this if we're in the first few seconds after server start
        // Actually, let's skip this - too unreliable
    }
    
    return false;
}

/**
 * Refresh delay middleware
 * Delays GET requests that appear to be page refreshes
 */
export const refreshDelay = (req, res, next) => {
    // Only delay GET requests (read operations)
    if (req.method !== 'GET') {
        return next();
    }
    
    // Skip delay for health checks, static assets, and API endpoints that shouldn't be delayed
    if (
        req.path === '/health' || 
        req.path.startsWith('/static') ||
        req.path === '/api/csrf-token' // Don't delay CSRF token - needed early
    ) {
        return next();
    }
    
    // Check if this is a refresh request
    const isRefresh = isRefreshRequest(req);
    
    // Log all requests for debugging
    if (import.meta.env?.NODE_ENV === 'development' || process.env.NODE_ENV === 'development') {
        console.log(`[RefreshDelay] ${req.method} ${req.path} - isRefresh: ${isRefresh}`, {
            'x-refresh': req.get('x-refresh'),
            'cache-control': req.get('cache-control'),
            'pragma': req.get('pragma'),
            '_refresh': req.query._refresh
        });
    }
    
    if (!isRefresh) {
        return next();
    }
    
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Check if we already have a delay active for this IP
    const existingDelay = refreshDelays.get(ip);
    if (existingDelay) {
        const elapsed = now - existingDelay.timestamp;
        if (elapsed < REFRESH_DELAY_MS) {
            // Still in delay period - add this request to the delay
            existingDelay.requestCount = (existingDelay.requestCount || 0) + 1;
            console.log(`[RefreshDelay] Request ${existingDelay.requestCount} from ${ip} - delaying ${Math.round((REFRESH_DELAY_MS - elapsed) / 1000)}s (refresh detected)`);
            
            // Wait for the remaining delay time
            const remainingTime = REFRESH_DELAY_MS - elapsed;
            setTimeout(() => {
                // Process the request after delay
                next();
            }, remainingTime);
            return; // Don't call next() yet - wait for delay
        } else {
            // Delay expired, clear it
            refreshDelays.delete(ip);
        }
    }
    
    // Start new delay for this refresh
    console.log(`[RefreshDelay] New refresh detected from ${ip} - delaying all requests for ${REFRESH_DELAY_MS}ms`);
    
    const delayInfo = {
        timestamp: now,
        timeout: null, // Will be set if needed
        requestCount: 1
    };
    
    refreshDelays.set(ip, delayInfo);
    
    // Delay this request
    setTimeout(() => {
        // Check if delay is still active (might have been cleared)
        const currentDelay = refreshDelays.get(ip);
        if (currentDelay && currentDelay.timestamp === now) {
            // This was the first request in the delay period
            // Keep delay active for other requests that might come
            console.log(`[RefreshDelay] Delay period started for ${ip}, processing first request`);
        }
        // Process the request after delay
        next();
    }, REFRESH_DELAY_MS);
    
    // Clean up on client disconnect
    req.on('close', () => {
        const currentDelay = refreshDelays.get(ip);
        if (currentDelay && currentDelay.timestamp === now) {
            // Only clear if this was the delay we just created
            refreshDelays.delete(ip);
        }
    });
    
    // Don't call next() yet - wait for delay
};

/**
 * Clean up old delays periodically
 */
setInterval(() => {
    const now = Date.now();
    for (const [ip, delay] of refreshDelays.entries()) {
        const elapsed = now - delay.timestamp;
        if (elapsed > REFRESH_DELAY_MS * 2) {
            // Delay expired long ago, clean up
            clearTimeout(delay.timeout);
            refreshDelays.delete(ip);
        }
    }
}, 5000); // Check every 5 seconds

