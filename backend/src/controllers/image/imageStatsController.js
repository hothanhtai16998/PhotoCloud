import mongoose from 'mongoose';
import crypto from 'crypto';
import Image from '../../models/Image.js';
import UserActivity from '../../models/UserActivity.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { getClientIp } from '../../services/audit/auditLogger.js';
import { logger } from '../../utils/logger.js';

import { checkUserActivity } from '../../services/media/activityGuard.js';

/**
 * Get or create session ID from cookies
 */
const getOrCreateSessionId = (req, res) => {
    const SESSION_COOKIE_NAME = 'photo_session_id';
    let sessionId = req.cookies?.[SESSION_COOKIE_NAME];

    if (!sessionId) {
        // Generate new session ID using crypto (similar to CSRF token)
        sessionId = crypto.randomBytes(32).toString('hex');
        // Set cookie (expires in 30 days, httpOnly for security)
        res.cookie(SESSION_COOKIE_NAME, sessionId, {
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // HTTPS only in production
            sameSite: 'lax',
        });
    }

    return sessionId;
};

// Increment view count for an image
export const incrementView = asyncHandler(async (req, res) => {
    console.log('[incrementView] ENDPOINT CALLED - Starting view increment');
    const imageId = req.params.imageId;
    const userId = req.user?._id; // Get current user (if authenticated)

    console.log(`[incrementView] ImageId: ${imageId}, UserId: ${userId || 'anonymous'}`);

    if (!mongoose.Types.ObjectId.isValid(imageId)) {
        console.log('[incrementView] Invalid image ID');
        return res.status(400).json({ message: 'Invalid image ID' });
    }

    // Get current date in UTC as YYYY-MM-DD string
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD

    // Check if this user has already viewed this image today
    // Both authenticated and anonymous users: Pattern-based detection (allows legitimate use, blocks abuse)
    let isFirstTimeToday = true;

    // Get IP and session info for pattern detection (works for both authenticated and anonymous)
    const ipAddress = getClientIp(req);
    const sessionId = getOrCreateSessionId(req, res);
    const userAgent = req.headers['user-agent'] || null;

    // Check for abuse patterns (for both authenticated and anonymous users)
    const activityCheck = await checkUserActivity(ipAddress, sessionId, userAgent, imageId, 'view', userId);

    if (!activityCheck.allowed) {
        // Pattern detected - return current stats without incrementing
        const image = await Image.findById(imageId);
        if (!image) {
            return res.status(404).json({
                message: 'Không tìm thấy ảnh',
            });
        }

        let dailyViewsObj = {};
        if (image.dailyViews) {
            if (image.dailyViews instanceof Map) {
                dailyViewsObj = Object.fromEntries(image.dailyViews);
            } else if (typeof image.dailyViews === 'object') {
                dailyViewsObj = image.dailyViews;
            }
        }

        return res.status(429).json({
            views: image.views,
            dailyViews: dailyViewsObj,
            message: activityCheck.reason || 'Please slow down your requests.',
            rateLimited: true,
            pattern: activityCheck.pattern,
            remainingSeconds: activityCheck.remainingSeconds,
            remainingMinutes: activityCheck.remainingMinutes,
        });
    }

    // Check if this is first time today (for authenticated users)
    if (userId) {
        const existingActivity = await UserActivity.findOne({
            userId,
            imageId,
            activityType: 'view',
            date: todayStr,
        });
        isFirstTimeToday = !existingActivity;
    }

    // Only increment image views if this is the first time today (or if no user)
    if (isFirstTimeToday || !userId) {
        // Increment both total views and daily views on the image
        const image = await Image.findByIdAndUpdate(
            imageId,
            {
                $inc: {
                    views: 1,
                    [`dailyViews.${todayStr}`]: 1,
                },
            },
            { new: true, runValidators: true }
        );

        if (!image) {
            return res.status(404).json({
                message: 'Không tìm thấy ảnh',
            });
        }

        // Track user-specific activity (for profile analytics)
        if (userId) {
            try {
                await UserActivity.findOneAndUpdate(
                    {
                        userId,
                        imageId,
                        activityType: 'view',
                        date: todayStr,
                    },
                    {
                        userId,
                        imageId,
                        activityType: 'view',
                        date: todayStr,
                        isFirstTime: isFirstTimeToday,
                    },
                    {
                        upsert: true,
                        new: true,
                    }
                );
            } catch (error) {
                // Ignore duplicate key errors (shouldn't happen but handle gracefully)
                if (error.code !== 11000) {
                    console.error('Error tracking user activity:', error);
                }
            }
        }

        // Convert dailyViews (Map or plain object) to plain object for JSON response
        let dailyViewsObj = {};
        if (image.dailyViews) {
            if (image.dailyViews instanceof Map) {
                dailyViewsObj = Object.fromEntries(image.dailyViews);
            } else if (typeof image.dailyViews === 'object') {
                dailyViewsObj = image.dailyViews;
            }
        }

        // Emit WebSocket event for real-time view count updates
        try {
            const { emitImageStatsUpdate } = await import('../../services/realtime/socketServer.js');
            emitImageStatsUpdate(imageId, {
                imageId,
                views: image.views,
                downloads: image.downloads,
                dailyViews: dailyViewsObj,
                action: 'view_incremented',
            });
        } catch (wsError) {
            console.error('Failed to emit view count update via WebSocket:', wsError);
            // Don't fail the request if WebSocket fails
        }

        res.status(200).json({
            views: image.views,
            dailyViews: dailyViewsObj,
        });
    } else {
        // User already viewed today, return current image stats without incrementing
        const image = await Image.findById(imageId);
        if (!image) {
            return res.status(404).json({
                message: 'Không tìm thấy ảnh',
            });
        }

        let dailyViewsObj = {};
        if (image.dailyViews) {
            if (image.dailyViews instanceof Map) {
                dailyViewsObj = Object.fromEntries(image.dailyViews);
            } else if (typeof image.dailyViews === 'object') {
                dailyViewsObj = image.dailyViews;
            }
        }

        res.status(200).json({
            views: image.views,
            dailyViews: dailyViewsObj,
        });
    }
});

// Increment download count for an image
export const incrementDownload = asyncHandler(async (req, res) => {
    const imageId = req.params.imageId;
    const userId = req.user?._id; // Get current user (if authenticated)

    if (!mongoose.Types.ObjectId.isValid(imageId)) {
        return res.status(400).json({ message: 'Invalid image ID' });
    }

    // Get current date in UTC as YYYY-MM-DD string
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD

    // Check if this user has already downloaded this image today
    // Both authenticated and anonymous users: Pattern-based detection (allows legitimate use, blocks abuse)
    let isFirstTimeToday = true;

    // Get IP and session info for pattern detection (works for both authenticated and anonymous)
    const ipAddress = getClientIp(req);
    const sessionId = getOrCreateSessionId(req, res);
    const userAgent = req.headers['user-agent'] || null;

    // Check for abuse patterns (for both authenticated and anonymous users)
    const activityCheck = await checkUserActivity(ipAddress, sessionId, userAgent, imageId, 'download', userId);

    if (!activityCheck.allowed) {
        // Pattern detected - return current stats without incrementing
        // Rate limited - return current stats without incrementing
        const image = await Image.findById(imageId);
        if (!image) {
            return res.status(404).json({
                message: 'Không tìm thấy ảnh',
            });
        }

        let dailyDownloadsObj = {};
        if (image.dailyDownloads) {
            if (image.dailyDownloads instanceof Map) {
                dailyDownloadsObj = Object.fromEntries(image.dailyDownloads);
            } else if (typeof image.dailyDownloads === 'object') {
                dailyDownloadsObj = image.dailyDownloads;
            }
        }

        return res.status(429).json({
            downloads: image.downloads,
            dailyDownloads: dailyDownloadsObj,
            message: activityCheck.reason || 'Please slow down your requests.',
            rateLimited: true,
            pattern: activityCheck.pattern,
            remainingSeconds: activityCheck.remainingSeconds,
            remainingMinutes: activityCheck.remainingMinutes,
        });
    }

    // Check if this is first time today (for authenticated users)
    if (userId) {
        const existingActivity = await UserActivity.findOne({
            userId,
            imageId,
            activityType: 'download',
            date: todayStr,
        });
        isFirstTimeToday = !existingActivity;
    }

    // Only increment image downloads if this is the first time today (or if no user)
    if (isFirstTimeToday || !userId) {
    // Increment both total downloads and daily downloads on the image
    const image = await Image.findByIdAndUpdate(
        imageId,
        {
            $inc: {
                downloads: 1,
                [`dailyDownloads.${todayStr}`]: 1,
            },
        },
        { new: true, runValidators: true }
    );

    if (!image) {
        return res.status(404).json({
            message: 'Không tìm thấy ảnh',
        });
    }

    // Track user-specific activity (for profile analytics)
    if (userId) {
        try {
            await UserActivity.findOneAndUpdate(
                {
                    userId,
                    imageId,
                    activityType: 'download',
                    date: todayStr,
                },
                {
                    userId,
                    imageId,
                    activityType: 'download',
                    date: todayStr,
                    isFirstTime: isFirstTimeToday,
                },
                {
                    upsert: true,
                    new: true,
                }
            );
        } catch (error) {
            // Ignore duplicate key errors (shouldn't happen but handle gracefully)
            if (error.code !== 11000) {
                console.error('Error tracking user activity:', error);
            }
        }
    }

    // Convert dailyDownloads (Map or plain object) to plain object for JSON response
    let dailyDownloadsObj = {};
    if (image.dailyDownloads) {
        if (image.dailyDownloads instanceof Map) {
            dailyDownloadsObj = Object.fromEntries(image.dailyDownloads);
        } else if (typeof image.dailyDownloads === 'object') {
            dailyDownloadsObj = image.dailyDownloads;
        }
    }

    // Emit WebSocket event for real-time download count updates
    try {
        const { emitImageStatsUpdate } = await import('../../services/realtime/socketServer.js');
        emitImageStatsUpdate(imageId, {
            imageId,
            views: image.views,
            downloads: image.downloads,
            dailyDownloads: dailyDownloadsObj,
            action: 'download_incremented',
        });
    } catch (wsError) {
        console.error('Failed to emit download count update via WebSocket:', wsError);
        // Don't fail the request if WebSocket fails
    }

    // Clear download history cache for user to ensure fresh data on next fetch
    // This prevents stale cached data from being returned after downloading
    if (userId) {
        try {
            const { clearDownloadHistoryCache } = await import('../../middlewares/cacheMiddleware.js');
            const cleared = clearDownloadHistoryCache(userId);
            if (cleared > 0) {
                logger.info('Cleared download history cache', { 
                    userId: userId.toString(), 
                    entriesCleared: cleared 
                });
            }
        } catch (cacheError) {
            logger.error('Failed to clear download history cache:', cacheError);
            // Don't fail the request if cache clear fails
        }
    }

    res.status(200).json({
        downloads: image.downloads,
        dailyDownloads: dailyDownloadsObj,
    });
} else {
    // User already downloaded today, return current image stats without incrementing
    const image = await Image.findById(imageId);
    if (!image) {
        return res.status(404).json({
            message: 'Không tìm thấy ảnh',
        });
    }

    let dailyDownloadsObj = {};
    if (image.dailyDownloads) {
        if (image.dailyDownloads instanceof Map) {
            dailyDownloadsObj = Object.fromEntries(image.dailyDownloads);
        } else if (typeof image.dailyDownloads === 'object') {
            dailyDownloadsObj = image.dailyDownloads;
        }
    }

    res.status(200).json({
        downloads: image.downloads,
        dailyDownloads: dailyDownloadsObj,
    });
}
});

