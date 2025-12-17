import Session from '../models/Session.js';
import { logger } from './logger.js';

/**
 * Cleanup expired sessions
 * This is a safety mechanism in case MongoDB TTL index doesn't run
 * Should be called periodically (e.g., via cron job or setInterval)
 */
export const cleanupExpiredSessions = async () => {
    try {
        const result = await Session.deleteMany({
            expiresAt: { $lt: new Date() },
        });

        if (result.deletedCount > 0) {
            logger.info(`Cleaned up ${result.deletedCount} expired session(s)`);
        }
    } catch (error) {
        logger.error('Error cleaning up expired sessions', error);
    }
};

// Store interval ID so it can be cleared on shutdown
let cleanupIntervalId = null;

/**
 * Start periodic session cleanup
 * Runs every hour
 */
export const startSessionCleanup = () => {
    // Run immediately on startup
    cleanupExpiredSessions();

    // Then run every hour
    cleanupIntervalId = setInterval(() => {
        cleanupExpiredSessions();
    }, 60 * 60 * 1000); // 1 hour

    logger.info('Session cleanup scheduler started');
};

/**
 * Stop periodic session cleanup
 * Should be called on graceful shutdown
 */
export const stopSessionCleanup = () => {
    if (cleanupIntervalId) {
        clearInterval(cleanupIntervalId);
        cleanupIntervalId = null;
        logger.info('Session cleanup scheduler stopped');
    }
};

