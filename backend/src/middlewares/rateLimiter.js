import rateLimit from 'express-rate-limit';
import { env } from '../libs/env.js';
import { enqueueRequest } from './requestQueue.js';

/**
 * General API rate limiter
 * More lenient in development to allow for rapid development/testing
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: env.NODE_ENV === 'development' ? 1000 : 300, // Increased from 100 to 300 for production
    message: 'Too many requests from this IP, please try again later.',
    // Custom handler: try to enqueue GET requests instead of immediately rejecting
    handler: (req, res, next, options) => {
        try {
            const enqueued = enqueueRequest(req, res, next);
            if (!enqueued) {
                return res.status(429).json({ message: options.message || 'Too many requests' });
            }
            // If enqueued or accepted, do nothing; the enqueueRequest either called next() or will process later
            return;
        } catch (err) {
            return res.status(429).json({ message: options.message || 'Too many requests' });
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for health checks or specific paths in development
        if (env.NODE_ENV === 'development' && req.path === '/health') {
            return true;
        }
        // Skip global limiter for auth routes - they have their own stricter authLimiter
        // Note: req.path is relative to the mount point (/api), so it's /auth not /api/auth
        if (req.path.startsWith('/auth')) {
            return true;
        }
        return false;
    },
});

/**
 * Strict rate limiter for auth endpoints (prevent brute force)
 * Note: skipSuccessfulRequests is true, so only failed attempts count
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Increased from 5 to 10 failed attempts per window (successful logins don't count)
    message: 'Too many authentication attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Upload rate limiter (prevent abuse)
 */
export const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 uploads per hour
    message: 'Too many uploads, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

