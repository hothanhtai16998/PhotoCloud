import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../libs/env.js';
import { CONNECT_DB } from '../configs/db.js';
import Image from '../models/Image.js';
import { logger } from '../utils/logger.js';

/**
 * Migrates existing S3 image URLs to CloudFront URLs
 * 
 * This script:
 * 1. Finds all images with S3 URLs
 * 2. Converts them to CloudFront URLs
 * 3. Updates the database
 * 
 * Usage: npm run migrate:cloudfront
 * 
 * Note: This is a one-time migration script. Safe to run multiple times.
 */

// CloudFront URL from environment
const CLOUDFRONT_URL = env.AWS_CLOUDFRONT_URL;
const S3_BUCKET_NAME = env.AWS_S3_BUCKET_NAME;
const AWS_REGION = env.AWS_REGION;

if (!CLOUDFRONT_URL) {
    logger.error('❌ AWS_CLOUDFRONT_URL is not set in .env file');
    logger.info('Please add: AWS_CLOUDFRONT_URL=https://d105lv7u7nltvk.cloudfront.net');
    process.exit(1);
}

// Remove trailing slash if present
const cloudfrontBase = CLOUDFRONT_URL.replace(/\/$/, '');

// Build S3 URL patterns to match
const s3Patterns = [
    // Standard S3 URL: https://bucket.s3.region.amazonaws.com/path
    new RegExp(`https://${S3_BUCKET_NAME}\\.s3\\.${AWS_REGION}\\.amazonaws\\.com/(.+)`, 'i'),
    // Alternative S3 URL: https://bucket.s3.amazonaws.com/path
    new RegExp(`https://${S3_BUCKET_NAME}\\.s3\\.amazonaws\\.com/(.+)`, 'i'),
    // S3 URL with region in path: https://s3.region.amazonaws.com/bucket/path
    new RegExp(`https://s3\\.${AWS_REGION}\\.amazonaws\\.com/${S3_BUCKET_NAME}/(.+)`, 'i'),
    // Generic S3 URL pattern
    new RegExp(`https://.*\\.s3\\.(?:${AWS_REGION}\\.)?amazonaws\\.com/(.+)`, 'i'),
];

/**
 * Converts S3 URL to CloudFront URL
 * @param {string} s3Url - Original S3 URL
 * @returns {string|null} - CloudFront URL or null if already CloudFront or invalid
 */
function convertToCloudFrontUrl(s3Url) {
    if (!s3Url || typeof s3Url !== 'string') {
        return null;
    }

    // Skip if already using CloudFront
    if (s3Url.includes('cloudfront.net')) {
        return null;
    }

    // Try to match S3 URL patterns
    for (const pattern of s3Patterns) {
        const match = s3Url.match(pattern);
        if (match) {
            const s3Key = match[1]; // Extract the path/key
            return `${cloudfrontBase}/${s3Key}`;
        }
    }

    // If no pattern matched, return null
    return null;
}

/**
 * Main migration function
 */
async function migrateToCloudFront() {
    try {
        logger.info('🚀 Starting CloudFront URL migration...');
        logger.info(`📦 CloudFront URL: ${cloudfrontBase}`);
        logger.info(`📦 S3 Bucket: ${S3_BUCKET_NAME}`);
        logger.info(`📦 AWS Region: ${AWS_REGION}`);

        // Connect to database
        await CONNECT_DB();

        // Find all images
        const images = await Image.find({});
        logger.info(`📊 Found ${images.length} images to check`);

        let updated = 0;
        let skipped = 0;
        let errors = 0;

        // Process each image
        for (let i = 0; i < images.length; i++) {
            const image = images[i];
            let needsUpdate = false;
            const updates = {};

            // Check and convert each URL field
            const urlFields = ['imageUrl', 'thumbnailUrl', 'smallUrl', 'regularUrl'];
            
            for (const field of urlFields) {
                if (image[field]) {
                    const cloudfrontUrl = convertToCloudFrontUrl(image[field]);
                    if (cloudfrontUrl) {
                        updates[field] = cloudfrontUrl;
                        needsUpdate = true;
                        logger.info(`  ${field}: ${image[field]} → ${cloudfrontUrl}`);
                    }
                }
            }

            // Update if needed
            if (needsUpdate) {
                try {
                    await Image.updateOne(
                        { _id: image._id },
                        { $set: updates }
                    );
                    updated++;
                    if ((i + 1) % 10 === 0) {
                        logger.info(`✅ Processed ${i + 1}/${images.length} images (${updated} updated, ${skipped} skipped)`);
                    }
                } catch (error) {
                    logger.error(`❌ Error updating image ${image._id}: ${error.message}`);
                    errors++;
                }
            } else {
                skipped++;
            }
        }

        // Summary
        logger.info('\n📈 Migration Summary:');
        logger.info(`   ✅ Updated: ${updated} images`);
        logger.info(`   ⏭️  Skipped: ${skipped} images (already CloudFront or no S3 URLs)`);
        logger.info(`   ❌ Errors: ${errors} images`);
        logger.info(`   📊 Total: ${images.length} images`);

        if (updated > 0) {
            logger.info('\n✅ Migration completed successfully!');
            logger.info('🔄 All image URLs have been updated to use CloudFront CDN');
        } else {
            logger.info('\nℹ️  No images needed updating (all already using CloudFront or no S3 URLs found)');
        }

    } catch (error) {
        logger.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        // Close database connection
        await mongoose.connection.close();
        logger.info('🔌 Database connection closed');
        process.exit(0);
    }
}

// Run migration
migrateToCloudFront();

