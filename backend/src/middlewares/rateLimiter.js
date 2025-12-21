import rateLimit from 'express-rate-limit';
import { env } from '../libs/env.js';
import { enqueueRequest } from './requestQueue.js';

/**
 * General API rate limiter
 * More lenient in development to allow for rapid development/testing
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: env.NODE_ENV === 'development' ? 1000 : 100, // Much higher limit in development
    message: 'Too many requests from this IP, please try again later.',
    // Custom handler: try to enqueue GET requests instead of immediately rejecting
    // Unsplash-style: Include Retry-After header for better client handling
    handler: (req, res, next, options) => {
        try {
            const enqueued = enqueueRequest(req, res, next);
            if (!enqueued) {
                // Calculate retry after time (remaining window time in seconds)
                const resetTime = res.get('X-RateLimit-Reset');
                const retryAfter = resetTime 
                    ? Math.ceil((new Date(resetTime).getTime() - Date.now()) / 1000)
                    : Math.ceil(options.windowMs / 1000); // Fallback to full window
                
                // Set Retry-After header (Unsplash-style)
                res.set('Retry-After', Math.max(1, retryAfter));
                return res.status(429).json({ 
                    message: options.message || 'Too many requests',
                    retryAfter: retryAfter
                });
            }
            // If enqueued or accepted, do nothing; the enqueueRequest either called next() or will process later
            return;
        } catch (err) {
            // Fallback: set basic Retry-After header
            res.set('Retry-After', Math.ceil(options.windowMs / 1000));
            return res.status(429).json({ message: options.message || 'Too many requests' });
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for health checks or specific paths in development
        return env.NODE_ENV === 'development' && req.path === '/health';
    },
});

/**
 * Strict rate limiter for auth endpoints (prevent brute force)
 * 
 * Rate limit: 15 attempts per 15 minutes (~1 per minute average)
 * 
 * Industry comparison:
 * - Okta: 100-600 requests/min (enterprise auth provider)
 * - Instagram: 200 attempts/min/IP (considered too lenient)
 * - Common practices: 5-10 attempts per minute
 * - Many sites: 72% don't implement effective rate limiting
 * 
 * Our limit is conservative but reasonable since:
 * - Only failed attempts count (skipSuccessfulRequests: true)
 * - Legitimate users with correct credentials won't hit the limit
 * - Provides strong protection against brute force attacks
 * - Refresh delays reduce request frequency naturally
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // Limit each IP to 15 requests per windowMs (increased from 5)
    message: 'Too many authentication attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Upload rate limiter (prevent abuse)
 * Skips rate limiting for admin users
 */
export const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 uploads per hour
    message: 'Too many uploads, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for admin users
        const isAdmin = req.user?.isAdmin === true || req.user?.isSuperAdmin === true;
        return isAdmin;
    },
});

