import mongoose from 'mongoose';
import crypto from 'crypto';
import Image from '../models/Image.js';
import UserActivity from '../models/UserActivity.js';
import AnonymousActivity from '../models/AnonymousActivity.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { getClientIp } from '../utils/auditLogger.js';

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

/**
 * Generate device fingerprint from IP and User-Agent
 */
const generateDeviceFingerprint = (ipAddress, userAgent) => {
    if (!userAgent) return null;
    return crypto
        .createHash('sha256')
        .update(`${ipAddress}-${userAgent}`)
        .digest('hex');
};

/**
 * Check for abuse patterns instead of strict counts
 * Returns { allowed: boolean, reason?: string, pattern?: string }
 */
const checkAbusePatterns = async (ipAddress, deviceFingerprint, activityType, currentImageId = null, userId = null) => {
    try {
        const now = new Date();

        // Pattern detection windows
        const RAPID_FIRE_WINDOW_MS = 10 * 1000; // 10 seconds - detect rapid-fire
        const VELOCITY_WINDOW_MS = 2 * 60 * 1000; // 2 minutes - detect unnatural velocity
        const REPETITIVE_WINDOW_MS = 1 * 60 * 1000; // 1 minute - detect repetitive behavior

        // Thresholds based on authentication status
        // Authenticated users get higher limits (more permissive)
        const isAuthenticated = !!userId;
        const RAPID_FIRE_THRESHOLD = isAuthenticated ? 20 : 5; // 20 requests in 10 seconds for auth, 5 for anonymous
        const VELOCITY_THRESHOLD = isAuthenticated ? 100 : 30; // 100 requests in 2 minutes for auth, 30 for anonymous
        const REPETITIVE_THRESHOLD = isAuthenticated ? 20 : 5; // Same image 20 times in 1 minute for auth, 5 for anonymous

        // Get recent activities for pattern analysis
        // For authenticated users, also check UserActivity
        let recentActivities = [];

    if (userId) {
        // Authenticated users: Check both AnonymousActivity (by IP) and UserActivity (by userId)
        // For UserActivity, use createdAt for time-based queries (more accurate than date string)
        const [anonymousActivities, userActivities] = await Promise.all([
            AnonymousActivity.find({
                $or: [
                    { ipAddress, activityType, lastActivityAt: { $gte: new Date(now - VELOCITY_WINDOW_MS) } },
                    ...(deviceFingerprint ? [{ deviceFingerprint, activityType, lastActivityAt: { $gte: new Date(now - VELOCITY_WINDOW_MS) } }] : []),
                ],
            }).sort({ lastActivityAt: -1 }).limit(100),
            UserActivity.find({
                userId,
                activityType,
                createdAt: { $gte: new Date(now - VELOCITY_WINDOW_MS) },
            }).sort({ createdAt: -1 }).limit(100),
        ]);

        // Combine and convert UserActivity to similar format for pattern analysis
        // Use createdAt as lastActivityAt for UserActivity
        const convertedUserActivities = userActivities.map(activity => {
            // Ensure lastActivityAt is a proper Date object
            let lastActivityAt = now;
            if (activity.createdAt) {
                lastActivityAt = activity.createdAt instanceof Date ? activity.createdAt : new Date(activity.createdAt);
            } else if (activity.updatedAt) {
                lastActivityAt = activity.updatedAt instanceof Date ? activity.updatedAt : new Date(activity.updatedAt);
            }
            return {
                imageId: activity.imageId,
                lastActivityAt,
                activityType: activity.activityType,
            };
        });

        recentActivities = [...anonymousActivities, ...convertedUserActivities]
            .filter(activity => activity.lastActivityAt) // Filter out any with null dates
            .sort((a, b) => {
                const aTime = a.lastActivityAt instanceof Date ? a.lastActivityAt : new Date(a.lastActivityAt);
                const bTime = b.lastActivityAt instanceof Date ? b.lastActivityAt : new Date(b.lastActivityAt);
                return bTime - aTime; // Sort descending (newest first)
            })
            .slice(0, 200); // Limit to most recent 200
    } else {
        // Anonymous users: Only check AnonymousActivity
        // Query for activities in the last 2 minutes (velocity window) to catch all patterns
        const query = {
            activityType,
            lastActivityAt: { $gte: new Date(now - VELOCITY_WINDOW_MS) },
            $or: [
                { ipAddress },
                ...(deviceFingerprint ? [{ deviceFingerprint }] : []),
            ],
        };
        
        recentActivities = await AnonymousActivity.find(query)
            .sort({ lastActivityAt: -1 })
            .limit(100);
        
        // Debug: Log query results
        console.log(`[Pattern Detection] Found ${recentActivities.length} recent activities for IP: ${ipAddress?.substring(0, 15)}...`);
    }

    // IMPORTANT: Include the current request in the count
    // This ensures we catch rapid-fire patterns correctly
    // Count recent activities + current request = total count
    const totalActivityCount = recentActivities.length + 1;

    // Pattern 1: Rapid-fire detection (requests too close together)
    // Count activities in the last 10 seconds (including current request)
    const rapidFireActivities = recentActivities.filter(activity => {
        if (!activity.lastActivityAt) return false;
        // Ensure lastActivityAt is a Date object
        const lastActivity = activity.lastActivityAt instanceof Date 
            ? activity.lastActivityAt 
            : new Date(activity.lastActivityAt);
        const timeDiff = now - lastActivity;
        return timeDiff >= 0 && timeDiff < RAPID_FIRE_WINDOW_MS;
    });

    // Include current request in rapid-fire count
    const rapidFireCount = rapidFireActivities.length + 1;

    // Debug logging
    console.log(`[Pattern Detection] Rapid-fire check: ${rapidFireCount}/${RAPID_FIRE_THRESHOLD} activities in last 10s (found ${rapidFireActivities.length} in DB + 1 current)`);

    if (rapidFireCount >= RAPID_FIRE_THRESHOLD) {
        const oldestRapidFire = rapidFireActivities[rapidFireActivities.length - 1];
        if (!oldestRapidFire || !oldestRapidFire.lastActivityAt) {
            return { allowed: true };
        }
        const lastActivity = oldestRapidFire.lastActivityAt instanceof Date 
            ? oldestRapidFire.lastActivityAt 
            : new Date(oldestRapidFire.lastActivityAt);
        const timeUntilNext = RAPID_FIRE_WINDOW_MS - (now - lastActivity);
        const remainingSeconds = Math.ceil(timeUntilNext / 1000);
        return {
            allowed: false,
            pattern: 'rapid-fire',
            reason: isAuthenticated
                ? `You're viewing images too quickly. Please slow down and wait ${remainingSeconds} second(s).`
                : `You're viewing images too quickly. Please slow down and wait ${remainingSeconds} second(s). Sign in for higher limits!`,
            remainingSeconds,
        };
    }

    // Pattern 2: Unnatural velocity (too many requests in short time)
    // Include current request in velocity count
    if (totalActivityCount >= VELOCITY_THRESHOLD) {
        // Find the oldest activity to calculate wait time
        if (recentActivities.length === 0) {
            return { allowed: true };
        }
        
        // Sort by lastActivityAt (oldest first)
        const sortedActivities = [...recentActivities].sort((a, b) => {
            const aTime = a.lastActivityAt instanceof Date ? a.lastActivityAt : new Date(a.lastActivityAt);
            const bTime = b.lastActivityAt instanceof Date ? b.lastActivityAt : new Date(b.lastActivityAt);
            return aTime - bTime;
        });
        
        const oldestActivity = sortedActivities[0];
        if (!oldestActivity || !oldestActivity.lastActivityAt) {
            return { allowed: true };
        }
        const lastActivity = oldestActivity.lastActivityAt instanceof Date 
            ? oldestActivity.lastActivityAt 
            : new Date(oldestActivity.lastActivityAt);
        const timeUntilNext = VELOCITY_WINDOW_MS - (now - lastActivity);
        const remainingMinutes = Math.max(1, Math.ceil(timeUntilNext / (60 * 1000)));
        
        console.log(`[Pattern Detection] BLOCKED - Velocity: ${totalActivityCount} requests in 2min`);
        
        return {
            allowed: false,
            pattern: 'velocity',
            reason: isAuthenticated
                ? `You've viewed many images recently. Please wait ${remainingMinutes} minute(s).`
                : `You've viewed many images recently. Please wait ${remainingMinutes} minute(s) or sign in for higher limits!`,
            remainingMinutes,
        };
    }

    // Pattern 3: Repetitive behavior (same image multiple times)
    // Only check if currentImageId is provided (for the specific image being requested)
    if (currentImageId) {
        const currentImageIdStr = currentImageId.toString();
        const repetitiveActivities = recentActivities.filter(activity => {
            if (!activity.imageId || !activity.lastActivityAt) return false;
            const imageIdStr = activity.imageId.toString();
            const lastActivity = activity.lastActivityAt instanceof Date 
                ? activity.lastActivityAt 
                : new Date(activity.lastActivityAt);
            const timeDiff = now - lastActivity;
            return imageIdStr === currentImageIdStr && timeDiff >= 0 && timeDiff < REPETITIVE_WINDOW_MS;
        });

        // Include current request in repetitive count
        const repetitiveCount = repetitiveActivities.length + 1;
        
        // Debug logging
        if (repetitiveCount > 1) {
            console.log(`[Pattern Detection] Repetitive: ${repetitiveCount}/${REPETITIVE_THRESHOLD} views of same image in last 1min (Image: ${currentImageId.toString().substring(0, 8)}...)`);
        }
        
        if (repetitiveCount >= REPETITIVE_THRESHOLD) {
            const mostRecent = repetitiveActivities.sort((a, b) => {
                const aTime = a.lastActivityAt instanceof Date ? a.lastActivityAt : new Date(a.lastActivityAt);
                const bTime = b.lastActivityAt instanceof Date ? b.lastActivityAt : new Date(b.lastActivityAt);
                return bTime - aTime;
            })[0];
            if (mostRecent && mostRecent.lastActivityAt) {
                const lastActivity = mostRecent.lastActivityAt instanceof Date 
                    ? mostRecent.lastActivityAt 
                    : new Date(mostRecent.lastActivityAt);
                const timeUntilNext = REPETITIVE_WINDOW_MS - (now - lastActivity);
                const remainingSeconds = Math.max(1, Math.ceil(timeUntilNext / 1000));
                return {
                    allowed: false,
                    pattern: 'repetitive',
                    reason: `You've viewed this image multiple times. Please wait ${remainingSeconds} second(s) before viewing again.`,
                    remainingSeconds,
                };
            }
        }
        }

        // No abuse pattern detected - allow
        return { allowed: true };
    } catch (error) {
        // If pattern detection fails, log error but allow the request (fail open)
        console.error('Error in checkAbusePatterns:', error);
        return { allowed: true };
    }
};

/**
 * Check if user can perform activity (pattern-based detection)
 * Works for both authenticated and anonymous users
 * Returns { allowed: boolean, reason?: string, pattern?: string }
 */
const checkUserActivity = async (ipAddress, sessionId, userAgent, imageId, activityType, userId = null) => {
    try {
        const now = new Date();

        // Generate device fingerprint (IP + User-Agent)
        const deviceFingerprint = generateDeviceFingerprint(ipAddress, userAgent);

        // IMPORTANT: Check patterns BEFORE creating the activity
        // This prevents the activity from being created if it would exceed thresholds
        // The pattern check includes +1 for the current request in the count
        console.log(`[checkUserActivity] Checking patterns for IP: ${ipAddress?.substring(0, 15)}..., Image: ${imageId?.toString().substring(0, 8)}..., Type: ${activityType}, User: ${userId ? 'authenticated' : 'anonymous'}`);
        const patternCheck = await checkAbusePatterns(ipAddress, deviceFingerprint, activityType, imageId, userId);
        console.log(`[checkUserActivity] Pattern check result: allowed=${patternCheck.allowed}, pattern=${patternCheck.pattern || 'none'}`);
        if (!patternCheck.allowed) {
            console.log(`[checkUserActivity] BLOCKED - Reason: ${patternCheck.reason}`);
            return patternCheck;
        }

        // Pattern check passed - create the activity record
        // Create a NEW activity record for EACH event
        // This allows pattern detection to see multiple views of the same image
        // and rapid-fire detection when swapping between different images
        try {
            const activity = await AnonymousActivity.create({
                ipAddress,
                deviceFingerprint: deviceFingerprint || null,
                userAgent: userAgent || null,
                sessionId: sessionId || null,
                imageId,
                activityType,
                lastActivityAt: now,
                count: 1, // Each record represents one activity event
            });
            console.log(`[Activity Created] IP: ${ipAddress?.substring(0, 15)}..., Image: ${imageId?.toString().substring(0, 8)}..., Type: ${activityType}`);
        } catch (error) {
            // Log error but continue (fail open)
            console.error('Error creating anonymous activity:', error);
        }

        return { allowed: true };
    } catch (error) {
        // If check fails, log error but allow the request (fail open)
        console.error('Error in checkUserActivity:', error);
        return { allowed: true };
    }
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

