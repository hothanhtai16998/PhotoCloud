import 'dotenv/config';
import mongoose from 'mongoose';
import { CONNECT_DB } from '../configs/db.js';
import Image from '../models/Image.js';
import { env } from '../libs/env.js';
import { logger } from '../utils/logger.js';
import { getObjectFromR2, uploadToR2 } from '../libs/s3.js';
import sharp from 'sharp';
import { streamToBuffer } from '../utils/imageHelpers.js';

/**
 * Migration: Generate AVIF versions for existing images
 * 
 * This script:
 * 1. Finds all images that need AVIF conversion
 * 2. Downloads original images from R2
 * 3. Generates AVIF versions (thumbnail, small, regular, full)
 * 4. Uploads AVIF files to R2
 * 5. Updates database with AVIF URLs
 * 
 * Usage: node src/migrations/generateAvifForExistingImages.js [--dry-run] [--limit=N]
 * 
 * Options:
 *   --dry-run: Show what would be done without making changes
 *   --limit=N: Process only N images (for testing)
 */

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT_ARG = process.argv.find(arg => arg.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1]) : null;

logger.info(`🚀 Starting AVIF generation migration`);
logger.info(`   Dry run: ${DRY_RUN ? 'YES' : 'NO'}`);
logger.info(`   Limit: ${LIMIT || 'ALL'}`);

/**
 * Check if image needs AVIF conversion
 * An image needs conversion if:
 * - It has regularUrl but regularAvifUrl is missing or points to WebP
 * - It's not a video
 */
function needsAvifConversion(image) {
    // Skip videos
    if (image.isVideo) {
        return false;
    }

    // Check if AVIF URLs are missing or point to WebP files
    const hasRegularUrl = image.regularUrl && !image.regularUrl.includes('.gif');
    const needsRegularAvif = hasRegularUrl && (
        !image.regularAvifUrl || 
        image.regularAvifUrl.includes('.webp') ||
        image.regularAvifUrl === image.regularUrl
    );

    return needsRegularAvif;
}

/**
 * Extract filename from URL
 */
function extractFilenameFromUrl(url) {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        // Remove leading slash and bucket name if present
        const parts = pathname.split('/');
        const filename = parts[parts.length - 1];
        // Remove extension
        return filename.replace(/\.(webp|jpg|jpeg|png)$/i, '');
    } catch {
        // If URL parsing fails, try to extract from string
        const match = url.match(/\/([^\/]+)\.(webp|jpg|jpeg|png)(\?|$)/i);
        return match ? match[1] : null;
    }
}

/**
 * Generate AVIF files for an image
 */
async function generateAvifForImage(image) {
    try {
        logger.info(`📸 Processing image: ${image._id} - ${image.imageTitle || 'Untitled'}`);

        // Get original image URL (prefer regularUrl, fallback to imageUrl)
        const originalUrl = image.regularUrl || image.imageUrl;
        if (!originalUrl) {
            logger.warn(`   ⚠️  No image URL found, skipping`);
            return { success: false, reason: 'No image URL' };
        }

        // Extract filename from URL
        const filename = extractFilenameFromUrl(originalUrl);
        if (!filename) {
            logger.warn(`   ⚠️  Could not extract filename from URL: ${originalUrl}`);
            return { success: false, reason: 'Could not extract filename' };
        }

        // Extract key from URL (remove domain, keep path)
        // Handle both custom domain (cdn.uploadanh.cloud) and R2 public URLs (pub-*.r2.dev)
        let key;
        try {
            const urlObj = new URL(originalUrl);
            let pathname = urlObj.pathname;
            
            // Remove leading slash
            if (pathname.startsWith('/')) {
                pathname = pathname.substring(1);
            }
            
            // For custom domain, pathname is the key
            // For R2 public URLs, pathname might include bucket name, so we need to handle it
            // Example: cdn.uploadanh.cloud/photo-app-images/filename.webp
            // Example: pub-xxx.r2.dev/photo-app-images/filename.webp
            key = pathname;
        } catch {
            // If URL parsing fails, try to extract key from string
            const match = originalUrl.match(/\/(photo-app-images\/[^\/]+\.(webp|jpg|jpeg|png))(\?|$)/i);
            key = match ? match[1] : originalUrl.replace(/^https?:\/\/[^\/]+\//, '');
        }

        logger.info(`   📥 Downloading: ${key}`);

        // Download original image from R2
        const objectStream = await getObjectFromR2(key);
        if (!objectStream?.Body) {
            logger.warn(`   ⚠️  Could not download from R2: ${key}`);
            return { success: false, reason: 'Download failed' };
        }

        const buffer = await streamToBuffer(objectStream.Body);
        logger.info(`   ✅ Downloaded ${(buffer.length / 1024).toFixed(2)} KB`);

        // Check if it's a format we can process
        const metadata = await sharp(buffer).metadata();
        if (metadata.format === 'gif' || metadata.format === 'svg') {
            logger.info(`   ⚠️  Skipping ${metadata.format} format (not supported for AVIF)`);
            return { success: false, reason: `Format ${metadata.format} not supported` };
        }

        // Generate AVIF versions
        logger.info(`   🎨 Generating AVIF files...`);
        const [thumbnailAvifBuffer, smallAvifBuffer, regularAvifBuffer, fullAvifBuffer] = await Promise.all([
            sharp(buffer).resize(200, 200, { fit: 'cover' }).avif({ quality: 80 }).toBuffer(),
            sharp(buffer).resize(500, 500, { fit: 'cover' }).avif({ quality: 80 }).toBuffer(),
            sharp(buffer).resize(1000, 1000, { fit: 'inside' }).avif({ quality: 85 }).toBuffer(),
            sharp(buffer).avif({ quality: 85 }).toBuffer(),
        ]);

        logger.info(`   ✅ Generated AVIF files - Thumb: ${(thumbnailAvifBuffer.length / 1024).toFixed(2)} KB, Small: ${(smallAvifBuffer.length / 1024).toFixed(2)} KB, Regular: ${(regularAvifBuffer.length / 1024).toFixed(2)} KB, Full: ${(fullAvifBuffer.length / 1024).toFixed(2)} KB`);

        if (DRY_RUN) {
            logger.info(`   🔍 DRY RUN: Would upload AVIF files and update database`);
            return { success: true, dryRun: true };
        }

        // Upload AVIF files to R2
        const bucket = 'photo-app-images';
        const [thumbAvif, smallAvif, regularAvif, fullAvif] = await Promise.all([
            uploadToR2(thumbnailAvifBuffer, `${bucket}/${filename}-thumbnail.avif`, 'image/avif'),
            uploadToR2(smallAvifBuffer, `${bucket}/${filename}-small.avif`, 'image/avif'),
            uploadToR2(regularAvifBuffer, `${bucket}/${filename}-regular.avif`, 'image/avif'),
            uploadToR2(fullAvifBuffer, `${bucket}/${filename}.avif`, 'image/avif'),
        ]);

        logger.info(`   ✅ Uploaded AVIF files to R2`);

        // Update database
        await Image.updateOne(
            { _id: image._id },
            {
                $set: {
                    thumbnailAvifUrl: thumbAvif,
                    smallAvifUrl: smallAvif,
                    regularAvifUrl: regularAvif,
                    imageAvifUrl: fullAvif,
                }
            }
        );

        logger.info(`   ✅ Updated database with AVIF URLs`);
        return { success: true };
    } catch (error) {
        logger.error(`   ❌ Error processing image ${image._id}:`, error.message);
        return { success: false, reason: error.message };
    }
}

/**
 * Main migration function
 */
async function runMigration() {
    try {
        // Connect to database
        await CONNECT_DB();
        logger.info(`✅ Connected to database`);

        // Find images that need AVIF conversion
        // We'll filter in JavaScript since MongoDB can't compare fields directly in $or
        const baseQuery = {
            isVideo: { $ne: true }, // Not a video
            regularUrl: { $exists: true, $ne: null }, // Has regularUrl
        };

        // Get all candidate images (we'll filter in JavaScript)
        const allImages = await Image.find(baseQuery)
            .select('_id imageTitle regularUrl imageUrl regularAvifUrl thumbnailAvifUrl smallAvifUrl imageAvifUrl isVideo')
            .lean();

        // Filter images that actually need conversion
        const imagesToProcess = allImages.filter(needsAvifConversion);
        const totalImages = imagesToProcess.length;
        
        logger.info(`📊 Found ${totalImages} images that need AVIF conversion (out of ${allImages.length} total)`);

        if (totalImages === 0) {
            logger.info(`✅ No images need conversion. Migration complete!`);
            process.exit(0);
        }

        // Process images in batches
        const batchSize = 10;
        let processed = 0;
        let successful = 0;
        let failed = 0;
        const limit = LIMIT || totalImages;
        const imagesToProcessLimited = imagesToProcess.slice(0, limit);

        for (let i = 0; i < imagesToProcessLimited.length; i += batchSize) {
            const batch = imagesToProcessLimited.slice(i, i + batchSize);

            if (batch.length === 0) break;

            logger.info(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} images)...`);

            // Process images in parallel (but limit concurrency)
            const results = await Promise.allSettled(
                batch.map(image => generateAvifForImage(image))
            );

            results.forEach((result, index) => {
                processed++;
                if (result.status === 'fulfilled' && result.value.success) {
                    successful++;
                } else {
                    failed++;
                    const image = batch[index];
                    logger.error(`   ❌ Failed: ${image._id} - ${result.status === 'rejected' ? result.reason : result.value.reason}`);
                }
            });

            logger.info(`   Progress: ${processed}/${limit} (${successful} successful, ${failed} failed)`);

            // Small delay between batches to avoid overwhelming the system
            if (i + batchSize < imagesToProcessLimited.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        logger.info(`\n🎉 Migration complete!`);
        logger.info(`   Total processed: ${processed}`);
        logger.info(`   Successful: ${successful}`);
        logger.info(`   Failed: ${failed}`);

        if (DRY_RUN) {
            logger.info(`\n⚠️  This was a DRY RUN. No changes were made.`);
            logger.info(`   Run without --dry-run to apply changes.`);
        }

        process.exit(0);
    } catch (error) {
        logger.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
runMigration();

