import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import { env } from '../libs/env.js';

/**
 * CSRF Protection Middleware - Double-Submit Cookie Pattern
 * 
 * Flow:
 * 1. Frontend makes ANY request -> Server generates CSRF token if missing
 * 2. Token stored in cookie (auto-sent by browser) + sent in response header
 * 3. Frontend reads token from response header or cookie
 * 4. Frontend includes token in X-XSRF-TOKEN header on POST/PUT/DELETE/PATCH
 * 5. Server validates: cookie token === header token
 * 
 * Why this works:
 * - Cookies are auto-sent by browser (attacker can read from their own request)
 * - Headers are NOT auto-sent by browser (attacker cannot read due to Same-Origin Policy)
 * - Only legitimate frontend code can read the response and send token back in header
 */

const CSRF_TOKEN_COOKIE = 'XSRF-TOKEN';
const CSRF_TOKEN_HEADER = 'X-XSRF-TOKEN';

/**
 * Generate a secure random token
 */
const generateToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * CSRF Token Generation Middleware
 * Applied to ALL requests - generates token if it doesn't exist
 * This ensures every authenticated user always has a valid token
 */
export const csrfToken = (req, res, next) => {
    // Determine current token (cookie may not reflect newly-set token until next request)
    let currentToken = req.cookies && req.cookies[CSRF_TOKEN_COOKIE];

    if (!currentToken) {
        // Generate new token
        const token = generateToken();
        const isProduction = env.NODE_ENV === 'production';

        // Set cookie (will be auto-sent on all future requests)
        res.cookie(CSRF_TOKEN_COOKIE, token, {
            httpOnly: false, // JavaScript must be able to read for double-submit
            secure: isProduction, // HTTPS only in production
            sameSite: isProduction ? 'strict' : 'lax', // Prevent cross-site cookie sending
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            path: '/', // Available to entire app
        });

        logger.info('CSRF token generated', { path: req.path });

        // Use newly generated token immediately for header
        currentToken = token;
    }

    // Send token in response header for frontend convenience
    // Frontend can use this immediately without reading cookie
    if (currentToken) {
        res.setHeader('X-CSRF-Token', currentToken);
    }

    next();
};

/**
 * CSRF Token Validation Middleware
 * Applied to state-changing requests (POST, PUT, DELETE, PATCH)
 * Validates that header token matches cookie token
 */
export const validateCsrf = (req, res, next) => {
    // Skip validation for safe HTTP methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // Skip validation for public endpoints (no authentication required)
    const fullPath = req.originalUrl.split('?')[0];
    const publicPaths = [
        '/api/auth/signup',
        '/api/auth/signin',
        '/api/auth/refresh',
        '/api/admin/analytics/track',
    ];

    // Skip CSRF validation for test utility endpoints (used with API clients like Postman)
    // These are protected by super admin authentication instead
    if (fullPath.startsWith('/api/admin/test-utils/')) {
        return next();
    }

    if (publicPaths.some((path) => fullPath.startsWith(path))) {
        return next();
    }

    // For protected endpoints: validate CSRF token
    const cookieToken = req.cookies[CSRF_TOKEN_COOKIE];
    const headerToken = req.get(CSRF_TOKEN_HEADER) || req.get('x-csrf-token');

    // Both must exist
    if (!cookieToken) {
        logger.warn('CSRF validation failed - no cookie token', {
            path: fullPath,
            method: req.method,
        });
        return res.status(403).json({
            success: false,
            message: 'CSRF token missing. Please refresh and try again.',
            errorCode: 'CSRF_TOKEN_MISSING',
        });
    }

    if (!headerToken) {
        logger.warn('CSRF validation failed - no header token', {
            path: fullPath,
            method: req.method,
        });
        return res.status(403).json({
            success: false,
            message: 'CSRF token missing in request. Please refresh and try again.',
            errorCode: 'CSRF_TOKEN_MISSING',
        });
    }

    // Tokens must match
    if (cookieToken !== headerToken) {
        logger.warn('CSRF validation failed - token mismatch', {
            path: fullPath,
            method: req.method,
        });
        return res.status(403).json({
            success: false,
            message: 'Invalid CSRF token. Please refresh and try again.',
            errorCode: 'CSRF_TOKEN_INVALID',
        });
    }

    // Valid - continue
    next();
};

/**
 * Endpoint to retrieve current CSRF token
 * Used by frontend to initialize token on page load
 */
export const getCsrfToken = (req, res) => {
    const token = req.cookies[CSRF_TOKEN_COOKIE];

    if (token) {
        return res.status(200).json({
            success: true,
            csrfToken: token,
        });
    }

    // If no token exists, generate one
    const newToken = generateToken();
    const isProduction = env.NODE_ENV === 'production';

    res.cookie(CSRF_TOKEN_COOKIE, newToken, {
        httpOnly: false,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge: 24 * 60 * 60 * 1000,
        path: '/',
    });

    res.status(200).json({
        success: true,
        csrfToken: newToken,
    });
};

