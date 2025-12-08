import mongoose from 'mongoose';
import { env } from '../libs/env.js';
import Image from '../models/Image.js';
import { logger } from './logger.js';

async function checkOldImageUrls() {
    try {
        await mongoose.connect(env.MONGODB_URI);
        logger.info('✅ Connected to MongoDB');

        // Find images with old URLs (CloudFront, uploadcdn, or S3)
        const oldUrlPatterns = [
            /cloudfront\.net/,
            /uploadcdn\.cloud/,
            /\.s3\./,
            /amazonaws\.com/,
        ];

        const query = {
            $or: [
                { imageUrl: { $regex: oldUrlPatterns.join('|'), $options: 'i' } },
                { regularUrl: { $regex: oldUrlPatterns.join('|'), $options: 'i' } },
                { thumbnailUrl: { $regex: oldUrlPatterns.join('|'), $options: 'i' } },
                { smallUrl: { $regex: oldUrlPatterns.join('|'), $options: 'i' } },
            ],
        };

        const count = await Image.countDocuments(query);
        logger.info(`📊 Found ${count} images with old URLs`);

        if (count > 0) {
            const samples = await Image.find(query).limit(5).select('imageUrl regularUrl thumbnailUrl createdAt').lean();
            logger.info('\n📋 Sample old URLs:');
            samples.forEach((img, idx) => {
                logger.info(`${idx + 1}. Image URL: ${img.imageUrl?.substring(0, 80)}...`);
                logger.info(`   Created: ${img.createdAt}`);
            });
        }

        // Check for images with new R2 URLs
        const r2Count = await Image.countDocuments({
            $or: [
                { imageUrl: { $regex: 'uploadanh\.cloud', $options: 'i' } },
                { regularUrl: { $regex: 'uploadanh\.cloud', $options: 'i' } },
                { thumbnailUrl: { $regex: 'uploadanh\.cloud', $options: 'i' } },
            ],
        });
        logger.info(`\n✅ Found ${r2Count} images with R2 URLs (uploadanh.cloud)`);

        await mongoose.disconnect();
        logger.info('✅ Disconnected from MongoDB');
    } catch (error) {
        logger.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkOldImageUrls();

