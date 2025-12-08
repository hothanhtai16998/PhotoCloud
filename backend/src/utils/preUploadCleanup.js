import { logger } from './logger.js';
import { r2Client, getBucketName, deleteObjectByKey } from '../libs/s3.js';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { RAW_UPLOAD_FOLDER } from './constants.js';
const MAX_AGE_HOURS = 24; // Delete pre-uploaded files older than 24 hours
const MAX_AGE_MS = MAX_AGE_HOURS * 60 * 60 * 1000;

/**
 * Cleanup old pre-uploaded files that were never finalized
 * This handles cases where:
 * - User refreshed the page before finalizing
 * - Browser crashed
 * - Network issues prevented finalization
 * - User abandoned the upload
 */
export const cleanupOldPreUploadedFiles = async () => {
    try {
        const bucketName = getBucketName();
        const prefix = `${RAW_UPLOAD_FOLDER}/`;
        const now = Date.now();
        let deletedCount = 0;
        let continuationToken = null;

        do {
            const listParams = {
                Bucket: bucketName,
                Prefix: prefix,
                MaxKeys: 1000, // Process in batches
            };

            if (continuationToken) {
                listParams.ContinuationToken = continuationToken;
            }

            const listCommand = new ListObjectsV2Command(listParams);
            const listResponse = await r2Client.send(listCommand);

            if (!listResponse.Contents || listResponse.Contents.length === 0) {
                break;
            }

            // Filter files older than MAX_AGE_HOURS
            const oldFiles = listResponse.Contents.filter((object) => {
                if (!object.LastModified) return false;
                const fileAge = now - object.LastModified.getTime();
                return fileAge > MAX_AGE_MS;
            });

            // Delete old files in parallel
            if (oldFiles.length > 0) {
                const deletePromises = oldFiles.map(async (object) => {
                    try {
                        await deleteObjectByKey(object.Key);
                        deletedCount++;
                    } catch (error) {
                        logger.error(`Failed to delete old pre-uploaded file ${object.Key}:`, error.message);
                    }
                });

                await Promise.all(deletePromises);
            }

            continuationToken = listResponse.NextContinuationToken;
        } while (continuationToken);

        if (deletedCount > 0) {
            logger.info(`🧹 Cleaned up ${deletedCount} old pre-uploaded file(s) (older than ${MAX_AGE_HOURS} hours)`);
        }

        return deletedCount;
    } catch (error) {
        logger.error('Error cleaning up old pre-uploaded files:', error);
        return 0;
    }
};

// Store interval ID so it can be cleared on shutdown
let cleanupIntervalId = null;

/**
 * Start periodic pre-upload cleanup
 * Runs every 6 hours
 */
export const startPreUploadCleanup = () => {
    // Run immediately on startup
    cleanupOldPreUploadedFiles();

    // Then run every 6 hours
    cleanupIntervalId = setInterval(() => {
        cleanupOldPreUploadedFiles();
    }, 6 * 60 * 60 * 1000); // 6 hours

    logger.info('Pre-upload cleanup scheduler started (runs every 6 hours)');
};

/**
 * Stop periodic pre-upload cleanup
 * Should be called on graceful shutdown
 */
export const stopPreUploadCleanup = () => {
    if (cleanupIntervalId) {
        clearInterval(cleanupIntervalId);
        cleanupIntervalId = null;
        logger.info('Pre-upload cleanup scheduler stopped');
    }
};

