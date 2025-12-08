import mongoose from 'mongoose';
import { env } from '../libs/env.js';
import Image from '../models/Image.js';
import { logger } from './logger.js';

/**
 * Fix old R2 image URLs that are missing the bucket name prefix
 * Old format: https://uploadanh.cloud/filename.webp
 * New format: https://uploadanh.cloud/photo-app-images/filename.webp
 */
async function fixR2ImageUrls() {
    try {
        await mongoose.connect(env.MONGODB_URI);
        logger.info('✅ Connected to MongoDB');

        const bucketName = 'photo-app-images';
        const r2Domain = 'uploadanh.cloud';
        
        // Find images with old URL format (missing bucket name prefix)
        const oldUrlPattern = new RegExp(`^https://${r2Domain}/[^/]+\\.(webp|gif|mp4|webm)$`);
        
        const images = await Image.find({
            $or: [
                { imageUrl: oldUrlPattern },
                { regularUrl: oldUrlPattern },
                { thumbnailUrl: oldUrlPattern },
                { smallUrl: oldUrlPattern },
            ],
        });

        logger.info(`📊 Found ${images.length} images with old URL format`);

        if (images.length === 0) {
            logger.info('✅ No images need updating');
            await mongoose.disconnect();
            return;
        }

        let updated = 0;
        for (const image of images) {
            let needsUpdate = false;
            const update = {};

            // Fix each URL field
            const urlFields = ['imageUrl', 'regularUrl', 'thumbnailUrl', 'smallUrl', 'imageAvifUrl', 'thumbnailAvifUrl', 'smallAvifUrl', 'regularAvifUrl'];
            
            for (const field of urlFields) {
                if (image[field] && oldUrlPattern.test(image[field])) {
                    // Extract filename from URL
                    const url = new URL(image[field]);
                    const filename = url.pathname.substring(1); // Remove leading /
                    
                    // Add bucket name prefix
                    update[field] = `https://${r2Domain}/${bucketName}/${filename}`;
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                await Image.updateOne({ _id: image._id }, { $set: update });
                updated++;
                if (updated % 10 === 0) {
                    logger.info(`📝 Updated ${updated}/${images.length} images...`);
                }
            }
        }

        logger.info(`✅ Successfully updated ${updated} images`);
        logger.info(`📋 Sample updated URLs:`);
        
        // Show a sample of updated images
        const samples = await Image.find({
            imageUrl: new RegExp(`^https://${r2Domain}/${bucketName}/`)
        }).limit(3).select('imageUrl').lean();
        
        samples.forEach((img, idx) => {
            logger.info(`   ${idx + 1}. ${img.imageUrl?.substring(0, 80)}...`);
        });

        await mongoose.disconnect();
        logger.info('✅ Disconnected from MongoDB');
    } catch (error) {
        logger.error('❌ Error:', error.message);
        process.exit(1);
    }
}

fixR2ImageUrls();

