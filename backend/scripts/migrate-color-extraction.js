/**
 * Migration Script: Re-process dominant colors for all existing images
 * 
 * This script updates all existing images with improved color extraction algorithm.
 * Run with: node backend/scripts/migrate-color-extraction.js
 * 
 * Features:
 * - Processes images in batches
 * - Handles errors gracefully (continues on failure)
 * - Shows progress and statistics
 * - Skips images without imageUrl
 * - Can resume from where it left off (optional)
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env') });

// Import required modules
import Image from '../src/models/Image.js';
import { getImageFromR2 } from '../src/libs/s3.js';
import { extractDominantColors } from '../src/utils/colorExtractor.js';
import { streamToBuffer } from '../src/utils/imageHelpers.js';
import { logger } from '../src/utils/logger.js';
import { env } from '../src/libs/env.js';

// Configuration
const BATCH_SIZE = 50; // Process 50 images at a time
const CONCURRENT_PROCESSING = 5; // Process 5 images concurrently per batch
const DRY_RUN = process.argv.includes('--dry-run'); // Don't actually update database
const RESUME_FROM = process.argv.find(arg => arg.startsWith('--resume='))?.split('=')[1]; // Resume from image ID

// Statistics
let stats = {
    total: 0,
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    unchanged: 0,
    startTime: Date.now(),
};

/**
 * Process a single image
 */
async function processImage(image) {
    try {
        // Skip if no imageUrl
        if (!image.imageUrl) {
            logger.warn(`[MIGRATION] Skipping image ${image._id}: No imageUrl`);
            stats.skipped++;
            return { success: false, reason: 'no_imageUrl' };
        }

        // Skip videos
        if (image.isVideo) {
            logger.info(`[MIGRATION] Skipping video ${image._id}`);
            stats.skipped++;
            return { success: false, reason: 'is_video' };
        }

        // Download image from R2
        logger.info(`[MIGRATION] Processing image ${image._id}: ${image.imageUrl}`);
        const imageStream = await getImageFromR2(image.imageUrl);
        if (!imageStream?.Body) {
            logger.warn(`[MIGRATION] Failed to download image ${image._id}: No body in response`);
            stats.errors++;
            return { success: false, reason: 'download_failed' };
        }

        // Convert stream to buffer
        const imageBuffer = await streamToBuffer(imageStream.Body);

        // Extract colors with improved algorithm
        const newColors = await extractDominantColors(imageBuffer, 3);

        // Compare with existing colors
        const existingColors = image.dominantColors || [];
        const colorsChanged = JSON.stringify(existingColors.sort()) !== JSON.stringify(newColors.sort());

        if (!colorsChanged) {
            logger.info(`[MIGRATION] Image ${image._id}: Colors unchanged`);
            stats.unchanged++;
            return { success: true, updated: false, reason: 'unchanged' };
        }

        // Update database (if not dry run)
        if (!DRY_RUN) {
            await Image.findByIdAndUpdate(image._id, {
                dominantColors: newColors.length > 0 ? newColors : undefined,
                updatedAt: new Date(),
            });
            logger.info(`[MIGRATION] Updated image ${image._id}: ${JSON.stringify(existingColors)} → ${JSON.stringify(newColors)}`);
        } else {
            logger.info(`[MIGRATION] [DRY RUN] Would update image ${image._id}: ${JSON.stringify(existingColors)} → ${JSON.stringify(newColors)}`);
        }

        stats.updated++;
        return { success: true, updated: true, oldColors: existingColors, newColors };

    } catch (error) {
        logger.error(`[MIGRATION] Error processing image ${image._id}:`, error.message);
        stats.errors++;
        return { success: false, reason: 'error', error: error.message };
    }
}

/**
 * Process images in batches
 */
async function processBatch(images, batchNumber) {
    logger.info(`[MIGRATION] Processing batch ${batchNumber} (${images.length} images)`);
    
    const results = [];
    
    // Process images concurrently (but limit concurrency)
    for (let i = 0; i < images.length; i += CONCURRENT_PROCESSING) {
        const batch = images.slice(i, i + CONCURRENT_PROCESSING);
        const batchResults = await Promise.all(
            batch.map(image => processImage(image))
        );
        results.push(...batchResults);
        stats.processed += batch.length;
        
        // Log progress
        const progress = ((stats.processed / stats.total) * 100).toFixed(1);
        logger.info(`[MIGRATION] Progress: ${stats.processed}/${stats.total} (${progress}%) | Updated: ${stats.updated} | Errors: ${stats.errors} | Skipped: ${stats.skipped}`);
    }
    
    return results;
}

/**
 * Main migration function
 */
async function runMigration() {
    try {
        // Connect to database
        const dbUrl = env.MONGODB_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
        if (!dbUrl) {
            throw new Error('MONGODB_URI environment variable is required');
        }

        logger.info('[MIGRATION] Connecting to database...');
        await mongoose.connect(dbUrl, {
            maxPoolSize: 10,
            minPoolSize: 2,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        logger.info('[MIGRATION] Database connected');

        // Get total count
        const baseQuery = {};
        let lastId = null;
        
        if (RESUME_FROM) {
            lastId = new mongoose.Types.ObjectId(RESUME_FROM);
            baseQuery._id = { $gt: lastId };
            logger.info(`[MIGRATION] Resuming from image ID: ${RESUME_FROM}`);
        }

        stats.total = await Image.countDocuments(baseQuery);
        logger.info(`[MIGRATION] Found ${stats.total} images to process`);

        if (DRY_RUN) {
            logger.warn('[MIGRATION] DRY RUN MODE - No database updates will be made');
        }

        // Process in batches
        let batchNumber = 1;

        while (true) {
            // Build query for batch
            const batchQuery = { ...baseQuery };
            if (lastId) {
                batchQuery._id = { $gt: lastId };
            }

            // Fetch batch
            const images = await Image.find(batchQuery)
                .select('_id imageUrl dominantColors isVideo')
                .sort({ _id: 1 })
                .limit(BATCH_SIZE)
                .lean();

            if (images.length === 0) {
                logger.info('[MIGRATION] No more images to process');
                break;
            }

            // Process batch
            await processBatch(images, batchNumber);

            // Update lastId for next batch
            lastId = images[images.length - 1]._id;
            batchNumber++;

            // Small delay between batches to avoid overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Print final statistics
        const duration = ((Date.now() - stats.startTime) / 1000).toFixed(1);
        logger.info('\n[MIGRATION] ===== Migration Complete =====');
        logger.info(`[MIGRATION] Total images: ${stats.total}`);
        logger.info(`[MIGRATION] Processed: ${stats.processed}`);
        logger.info(`[MIGRATION] Updated: ${stats.updated}`);
        logger.info(`[MIGRATION] Unchanged: ${stats.unchanged}`);
        logger.info(`[MIGRATION] Skipped: ${stats.skipped}`);
        logger.info(`[MIGRATION] Errors: ${stats.errors}`);
        logger.info(`[MIGRATION] Duration: ${duration}s`);
        
        if (DRY_RUN) {
            logger.warn('[MIGRATION] This was a DRY RUN - no changes were made');
        }

    } catch (error) {
        logger.error('[MIGRATION] Fatal error:', error);
        throw error;
    } finally {
        // Close database connection
        await mongoose.connection.close();
        logger.info('[MIGRATION] Database connection closed');
    }
}

// Run migration
runMigration()
    .then(() => {
        logger.info('[MIGRATION] Migration script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        logger.error('[MIGRATION] Migration script failed:', error);
        process.exit(1);
    });

