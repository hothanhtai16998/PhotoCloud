import mongoose from 'mongoose';

const anonymousActivitySchema = new mongoose.Schema(
    {
        // IP address for tracking anonymous users
        ipAddress: {
            type: String,
            required: true,
            index: true,
        },
        // User-Agent for browser fingerprinting
        userAgent: {
            type: String,
            index: true,
            sparse: true, // Allow null values
        },
        // Device fingerprint: hash of IP + User-Agent (stronger than IP alone)
        deviceFingerprint: {
            type: String,
            index: true,
            sparse: true, // Allow null values
        },
        // Session ID (from cookie) for additional tracking
        sessionId: {
            type: String,
            index: true,
            sparse: true, // Allow null values
        },
        imageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Image',
            required: true,
            index: true,
        },
        activityType: {
            type: String,
            enum: ['view', 'download'],
            required: true,
            index: true,
        },
        // Track when the activity occurred (for time-based rate limiting)
        lastActivityAt: {
            type: Date,
            required: true,
            index: true,
            default: Date.now,
        },
        // Count how many times this IP/session viewed/downloaded this image
        // Reset after rate limit window
        count: {
            type: Number,
            default: 1,
            min: 1,
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for efficient queries
// NOTE: Removed unique constraints to allow multiple activity events per image
// This enables proper pattern detection (rapid-fire, repetitive behavior)
// Track by IP + image + activity type (for queries, not unique)
anonymousActivitySchema.index({ ipAddress: 1, imageId: 1, activityType: 1 });

// Track by device fingerprint + image + activity type (stronger multi-browser protection)
anonymousActivitySchema.index({ deviceFingerprint: 1, imageId: 1, activityType: 1 }, { sparse: true });

// Track by session ID + image + activity type (for cookie-based tracking)
anonymousActivitySchema.index({ sessionId: 1, imageId: 1, activityType: 1 }, { sparse: true });

// Index for global rate limiting per IP (across all images)
anonymousActivitySchema.index({ ipAddress: 1, activityType: 1, lastActivityAt: 1 });

// Index for global rate limiting per device fingerprint
anonymousActivitySchema.index({ deviceFingerprint: 1, activityType: 1, lastActivityAt: 1 }, { sparse: true });

// Index for cleanup queries (remove old entries)
anonymousActivitySchema.index({ lastActivityAt: 1 });

// TTL index to auto-delete entries older than 7 days (for data cleanup)
// This prevents unbounded growth while keeping enough history for pattern detection
// Pattern detection windows are: 10s (rapid-fire), 2min (velocity), 1min (repetitive)
// 7 days is more than enough for cleanup while keeping data manageable
anonymousActivitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

const AnonymousActivity = mongoose.model('AnonymousActivity', anonymousActivitySchema);

export default AnonymousActivity;

