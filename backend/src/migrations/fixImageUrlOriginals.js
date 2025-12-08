import 'dotenv/config';
import mongoose from 'mongoose';
import Image from '../models/Image.js';
import { logger } from '../utils/logger.js';

/**
 * Connect to MongoDB directly (bypasses env.js validation)
 * Migration scripts only need MONGODB_URI
 */
const connectDB = async () => {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error('MONGODB_URI environment variable is required');
    }
    
    try {
        const options = {
            maxPoolSize: 10,
            minPoolSize: 5,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 10000,
        };

        await mongoose.connect(mongoUri, options);
        logger.info('✅ MongoDB connected successfully');
    } catch (error) {
        logger.error(`❌ Error connecting to MongoDB: ${error.message}`, error);
        throw error;
    }
};

/**
 * Migration: Identify images where imageUrl points to WebP (original file not saved)
 * 
 * This script:
 * 1. Finds all images where imageUrl ends with .webp (indicating original wasn't saved)
 * 2. Logs them for review
 * 3. Optionally marks them (if needed in future)
 * 
 * Note: We cannot recover the original files as they weren't saved.
 * New uploads will save the original correctly.
 * 
 * Usage: node src/migrations/fixImageUrlOriginals.js [--dry-run]
 */

const DRY_RUN = process.argv.includes('--dry-run');

async function findImagesWithWebPOriginal() {
    try {
        logger.info('🔍 Starting migration: Finding images with WebP as imageUrl...');
        
        // Find all images where imageUrl ends with .webp
        // This indicates the original file wasn't saved (old upload behavior)
        const images = await Image.find({
            imageUrl: { $regex: /\.webp(\?|$)/i }
        }).select('_id imageTitle imageUrl publicId createdAt').lean();

        logger.info(`📊 Found ${images.length} images with WebP as imageUrl`);

        if (images.length === 0) {
            logger.info('✅ No images need migration. All images have original files saved.');
            return;
        }

        // Group by date to see when this issue occurred
        const byDate = {};
        images.forEach(img => {
            const date = img.createdAt ? new Date(img.createdAt).toISOString().split('T')[0] : 'unknown';
            if (!byDate[date]) byDate[date] = [];
            byDate[date].push(img);
        });

        logger.info('\n📅 Images grouped by upload date:');
        Object.keys(byDate).sort().forEach(date => {
            logger.info(`  ${date}: ${byDate[date].length} images`);
        });

        // Show sample images
        logger.info('\n📋 Sample images (first 10):');
        images.slice(0, 10).forEach((img, idx) => {
            logger.info(`  ${idx + 1}. ${img.imageTitle || 'Untitled'} (${img._id})`);
            logger.info(`     URL: ${img.imageUrl.substring(0, 80)}...`);
        });

        if (images.length > 10) {
            logger.info(`  ... and ${images.length - 10} more`);
        }

        // Summary
        logger.info('\n📝 Summary:');
        logger.info(`  Total images affected: ${images.length}`);
        logger.info(`  These images have WebP as "original" (original file was not saved)`);
        logger.info(`  For downloads, these will serve the WebP version (best available)`);
        logger.info(`  New uploads will save the original file correctly`);

        if (!DRY_RUN) {
            // Optionally, we could add a flag to mark these images
            // For now, we just log them
            logger.info('\n✅ Migration complete. Images logged for review.');
            logger.info('💡 To fix these images, users would need to re-upload them.');
        } else {
            logger.info('\n🔍 DRY RUN: No changes made. Run without --dry-run to proceed.');
        }

        return {
            total: images.length,
            images: images.map(img => ({
                _id: img._id,
                imageTitle: img.imageTitle,
                publicId: img.publicId,
                createdAt: img.createdAt
            }))
        };

    } catch (error) {
        logger.error('❌ Migration failed:', error);
        throw error;
    }
}

async function main() {
    try {
        logger.info('🚀 Starting image URL migration...');
        
        // Connect to database
        await connectDB();
        logger.info('✅ Connected to database');

        // Run migration
        const result = await findImagesWithWebPOriginal();

        logger.info('\n✅ Migration completed successfully');
        
        // Close database connection
        await mongoose.connection.close();
        logger.info('✅ Database connection closed');
        
        process.exit(0);
    } catch (error) {
        logger.error('❌ Migration failed:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

// Run migration
main();

