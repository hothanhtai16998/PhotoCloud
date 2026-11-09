import { createPeriodicTask } from './periodicTask.js';
import Session from '../../models/Session.js';
import { logger } from '../../utils/logger.js';

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

// Starting again replaces the schedule; long-running cleanup never overlaps itself.
const cleanupTask = createPeriodicTask({
    run: cleanupExpiredSessions, intervalMs: 60 * 60 * 1000,
    onError: error => logger.error('Cleanup scheduler failed', error),
});
export const startSessionCleanup = cleanupTask.start;
export const stopSessionCleanup = cleanupTask.stop;
