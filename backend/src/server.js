import express from 'express';
import helmet from 'helmet';
import { env } from './libs/env.js';
import { CONNECT_DB } from './configs/db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoute from './routes/authRoute.js';
import cookieParser from 'cookie-parser';
import userRoute from './routes/userRoute.js';
import cors from 'cors';
import compression from 'compression';
import imageRoute from './routes/imageRoute.js';
import adminRoute from './routes/adminRoute.js';
import { trackPageView } from './controllers/admin/index.js';
import { asyncHandler } from './middlewares/asyncHandler.js';
import categoryRoute from './routes/categoryRoute.js';
import favoriteRoute from './routes/favoriteRoute.js';
import collectionRoute from './routes/collectionRoute.js';
import collectionFavoriteRoute from './routes/collectionFavoriteRoute.js';
import notificationRoute from './routes/notificationRoute.js';
import collectionTemplateRoute from './routes/collectionTemplateRoute.js';
import collectionVersionRoute from './routes/collectionVersionRoute.js';
import reportRoute from './routes/reportRoute.js';
import followRoute from './routes/followRoute.js';
import searchRoute from './routes/searchRoute.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { apiLimiter } from './middlewares/rateLimiter.js';
import { requestDeduplication } from './middlewares/requestDeduplication.js';
import { requestQueue } from './middlewares/requestQueue.js';
import { csrfToken, validateCsrf, getCsrfToken } from './middlewares/csrfMiddleware.js';
import { logger } from './utils/logger.js';
import { startSessionCleanup, stopSessionCleanup } from './utils/sessionCleanup.js';
import { startPreUploadCleanup, stopPreUploadCleanup } from './utils/preUploadCleanup.js';
import { checkSocialScraper } from './controllers/socialShareController.js';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust proxy for secure cookies in production
if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// Security middleware - Helmet helps secure Express apps by setting various HTTP headers
// In development, disable CSP to allow Vite's HMR and dev server features
// In production, use strict CSP for security
if (env.NODE_ENV === 'production') {
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:", "blob:"],
                // Production: use nonce for inline scripts instead of unsafe-inline
                scriptSrc: ["'self'", "data:"],
                // Allow inline styles and event handlers (needed for some libraries)
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                // Allow inline event handlers (needed for some libraries)
                scriptSrcAttr: ["'unsafe-inline'"],
                connectSrc: [
                    "'self'",
                    // Backend API URL (for frontend deployed separately)
                    "https://api.uploadanh.cloud",
                    // Frontend URL (for same-origin requests)
                    env.CLIENT_URL,
                    env.FRONTEND_URL,
                    // R2 storage URL
                    env.R2_PUBLIC_URL || `https://pub-${env.R2_ACCOUNT_ID}.r2.dev`,
                    "https://nominatim.openstreetmap.org",
                    "https://uploadanh.cloud",
                    "https://fonts.googleapis.com",
                    "https://fonts.gstatic.com"
                ].filter(Boolean), // Remove any undefined/null values
                fontSrc: ["'self'", "data:", "https://fonts.gstatic.com", "https://fonts.googleapis.com"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
            },
        },
        crossOriginEmbedderPolicy: false,
    }));
} else {
    // Development: Use less strict CSP or disable it for Vite dev server
    app.use(helmet({
        contentSecurityPolicy: false, // Disable CSP in development for Vite HMR
        crossOriginEmbedderPolicy: false,
    }));
}

// Middleware
// Compression middleware - reduces response size for better performance
// Optimized compression settings for better performance
app.use(compression({
    level: 6, // Optimal compression level (balance between speed and size)
    threshold: 1024, // Only compress responses > 1KB (small responses don't benefit)
    filter: (req, res) => {
        // Don't compress images, videos, or other binary files (they're already compressed)
        if (req.path.match(/\.(jpg|jpeg|png|gif|webp|avif|svg|ico|mp4|webm|mov)$/i)) {
            return false;
        }
        // Skip compression if client explicitly requests it
        if (req.headers['x-no-compression']) {
            return false;
        }
        // Use default compression filter for other requests
        return compression.filter(req, res);
    }
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());
app.use(
    cors({
        origin: (origin, callback) => {
            // Allow no Origin (same-origin navigation, curl, server-side requests)
            if (!origin) return callback(null, true);

            // Allow literal "null" in dev (file://, sandboxed frames)
            if (origin === 'null' && env.NODE_ENV === 'development') {
                return callback(null, true);
            }

            try {
                const parsed = new URL(origin);
                const hostname = parsed.hostname;

                // Allow localhost / 127.0.0.1 on any port (development)
                if (hostname === 'localhost' || hostname === '127.0.0.1') {
                    return callback(null, true);
                }

                // Allow configured exact origins (CLIENT_URL, FRONTEND_URL)
                const allowedOrigins = [env.CLIENT_URL, env.FRONTEND_URL].filter(Boolean);
                if (allowedOrigins.includes(origin)) {
                    return callback(null, true);
                }

                // Allow common preview hosts / custom domain patterns
                if (
                    hostname.endsWith('.onrender.com') ||
                    hostname.endsWith('.vercel.app') ||
                    hostname.endsWith('uploadanh.cloud')
                ) {
                    return callback(null, true);
                }

                // Don't throw an Error here (that triggers a 500 JSON error response).
                // Return false so CORS headers aren't set and the browser will block cross-origin requests.
                logger.warn(`CORS: Rejected origin: ${origin}`);
                return callback(null, false);
            } catch (err) {
                logger.warn('CORS: Error parsing origin', { origin, err: err.message });
                return callback(null, false);
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-XSRF-TOKEN', 'X-CSRF-Token'],
        optionsSuccessStatus: 204,
    })
);

// Apply request deduplication (before rate limiting)
app.use('/api', requestDeduplication);

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Apply request queuing (after rate limiting, for GET requests that hit limits)
app.use('/api', requestQueue);

// CSRF protection - generate token for ALL requests
app.use('/api', csrfToken);

// Apply CSRF validation for state-changing requests (POST, PUT, DELETE, PATCH)
app.use('/api', validateCsrf);

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const { getSystemStatus } = await import('./utils/systemMetrics.js');
        const systemStatus = await getSystemStatus();
        
        res.status(200).json({
            status: systemStatus.status === 'critical' ? 'error' : 'ok',
            timestamp: new Date().toISOString(),
            version: '1.0.0-cors-fix',
            system: {
                database: systemStatus.databaseStatus,
                storage: systemStatus.storageStatus,
            },
        });
    } catch (error) {
        res.status(200).json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            version: '1.0.0-cors-fix',
        });
    }
});

// CSRF token endpoint (for frontend to retrieve token)
app.get('/api/csrf-token', getCsrfToken);

// Public settings endpoint (no authentication required)
app.get('/api/settings', async (req, res, next) => {
    const { getPublicSettings } = await import('./controllers/admin/adminSystemController.js');
    getPublicSettings(req, res, next);
});

// API Routes
app.use('/api/auth', authRoute);
app.use('/api/users', userRoute);
app.use('/api/images', imageRoute);
// Public route for tracking page views (accessible to both authenticated and anonymous users)
// Try to authenticate if token is present, but don't require it
app.post('/api/admin/analytics/track', async (req, res, next) => {
    // Try to authenticate if token is present
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
        try {
            const jwt = await import("jsonwebtoken");
            const { env } = await import('./libs/env.js');
            const User = (await import('./models/User.js')).default;
            const { enrichUserWithAdminStatus } = await import('./utils/adminUtils.js');

            const decoded = jwt.default.verify(token, env.ACCESS_TOKEN_SECRET);
            const user = await User.findById(decoded.userId).select("-hashedPassword").lean();

            if (user) {
                const enrichedUser = await enrichUserWithAdminStatus(user);
                req.user = enrichedUser;
            }
        } catch (error) {
            // Ignore auth errors - allow anonymous tracking
        }
    }
    next();
}, asyncHandler(trackPageView));
app.use('/api/admin', adminRoute);
app.use('/api/categories', categoryRoute);
app.use('/api/favorites', favoriteRoute);
app.use('/api/collections', collectionRoute);
app.use('/api/collection-favorites', collectionFavoriteRoute);
app.use('/api/notifications', notificationRoute);
app.use('/api/collection-templates', collectionTemplateRoute);
app.use('/api/collection-versions', collectionVersionRoute);
app.use('/api/reports', reportRoute);
app.use('/api/follows', followRoute);
app.use('/api/search', searchRoute);

// Social media sharing route - must be before static file serving
// This handles /photos/:slug for social media scrapers (Facebook, Twitter, etc.)
// Works in both development and production
// IMPORTANT: This must be before the SPA fallback route
app.get('/photos/:slug', checkSocialScraper);

// Serve static files in production
if (env.NODE_ENV === 'production') {
    // __dirname is backend/src, so go up two levels to root, then into frontend/dist
    const frontendDistPath = path.join(__dirname, '../../frontend/dist');

    // Configure static file serving with proper MIME types and aggressive caching
    app.use(express.static(frontendDistPath, {
        maxAge: '1y', // Cache static assets for 1 year
        immutable: true, // Files with hash in name are immutable
        setHeaders: (res, filePath) => {
            // Set correct MIME type for JavaScript modules
            if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
                res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            }
            // Set correct MIME type for TypeScript files (if any)
            if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
                res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            }
            
            // Aggressive caching for hashed assets (they're immutable)
            if (filePath.match(/[a-f0-9]{8,}\.(js|css|png|jpg|jpeg|gif|webp|svg|woff|woff2)$/i)) {
                res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            } else if (filePath.endsWith('.html')) {
                // HTML files should not be cached (always get latest)
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
            } else {
                // Other static files (images, fonts, etc.)
                res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
            }
        }
    }));

    app.get('*', (req, res) => {
        // Don't serve index.html for API routes
        if (req.path.startsWith('/api')) {
            return res.status(404).json({ message: 'API route not found' });
        }
        res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
}

// Error handling middleware (must be last)
app.use(errorHandler);

// Detailed error handler for local debugging only
if (process.env.NODE_ENV === 'development') {
    app.use((err, req, res, next) => {
        console.error('DEV ERROR:', err);
        res.status(err.status || 500).json({
            success: false,
            message: err.message || 'Internal Server Error',
            errorCode: err.code || 'INTERNAL_ERROR',
            stack: err.stack,
        });
    });
} else {
    // Production: generic error response
    app.use((err, req, res, next) => {
        console.error(err);
        res.status(err.status || 500).json({
            success: false,
            message: 'Something went wrong. Please try again later.',
            errorCode: 'INTERNAL_ERROR',
        });
    });
}

// Start server and connect to database
const startServer = async () => {
    try {
        await CONNECT_DB();

        // Start session cleanup scheduler
        startSessionCleanup();
        
        // Start pre-upload cleanup scheduler
        startPreUploadCleanup();
        
        // Start system monitoring and alerting
        const { startMonitoring } = await import('./utils/alertMonitor.js');
        startMonitoring();

        const PORT = env.PORT;
        app.listen(PORT, '0.0.0.0', () => {
            logger.info(`🚀 Server is running on port ${PORT}`);
            logger.info(`📦 Environment: ${env.NODE_ENV}`);
        });

        // Graceful shutdown handlers
        process.on('SIGTERM', async () => {
            logger.info('SIGTERM received, shutting down gracefully...');
            stopSessionCleanup();
            stopPreUploadCleanup();
            const { stopMonitoring } = await import('./utils/alertMonitor.js');
            stopMonitoring();
            process.exit(0);
        });

        process.on('SIGINT', async () => {
            logger.info('SIGINT received, shutting down gracefully...');
            stopSessionCleanup();
            stopPreUploadCleanup();
            const { stopMonitoring } = await import('./utils/alertMonitor.js');
            stopMonitoring();
            process.exit(0);
        });
    } catch (error) {
        logger.error('❌ Failed to start server', error);
        process.exit(1);
    }
};

startServer();



