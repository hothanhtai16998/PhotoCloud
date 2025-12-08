import 'dotenv/config';
import mongoose from 'mongoose';
import { CONNECT_DB } from '../configs/db.js';
import Image from '../models/Image.js';
import { env } from '../libs/env.js';
import { logger } from '../utils/logger.js';

/**
 * Migrates CloudFront URLs to R2 URLs
 * 
 * This script:
 * 1. Finds all images with CloudFront URLs
 * 2. Converts them to R2 URLs (using R2_PUBLIC_URL)
 * 3. Updates the database
 * 
 * Usage: npm run migrate:cloudfront-to-r2
 */

// Get R2 public URL base
const getR2PublicUrlBase = () => {
	return env.R2_PUBLIC_URL || `https://pub-${env.R2_ACCOUNT_ID}.r2.dev`;
};

const r2PublicUrlBase = getR2PublicUrlBase();

if (!r2PublicUrlBase) {
	logger.error('❌ R2_PUBLIC_URL is not set in environment variables');
	logger.info('Please set R2_PUBLIC_URL in your .env file');
	process.exit(1);
}

logger.info(`📦 R2 Public URL Base: ${r2PublicUrlBase}`);

// CloudFront URL patterns to match
const cloudfrontPatterns = [
	// Standard CloudFront URL: https://dxxx.cloudfront.net/path
	new RegExp(/https?:\/\/[a-z0-9]+\.cloudfront\.net\/(.+)/i),
	// Any CloudFront domain
	new RegExp(/https?:\/\/.*\.cloudfront\.net\/(.+)/i),
];

/**
 * Converts CloudFront URL to R2 URL
 * @param {string} cloudfrontUrl - Original CloudFront URL
 * @returns {string|null} - R2 URL or null if already R2 or invalid
 */
function convertToR2Url(cloudfrontUrl) {
	if (!cloudfrontUrl || typeof cloudfrontUrl !== 'string') {
		return null;
	}

	// Skip if already using R2
	if (cloudfrontUrl.includes('r2.dev') || cloudfrontUrl.includes('uploadanh.cloud')) {
		return null;
	}

	// Try to match CloudFront pattern
	for (const pattern of cloudfrontPatterns) {
		const match = cloudfrontUrl.match(pattern);
		if (match && match[1]) {
			const path = match[1];
			// Remove leading slash if present
			const cleanPath = path.startsWith('/') ? path.substring(1) : path;
			return `${r2PublicUrlBase}/${cleanPath}`;
		}
	}

	return null;
}

async function migrateCloudFrontToR2() {
	try {
		await CONNECT_DB();
		logger.info('🚀 Starting CloudFront to R2 URL migration...');
		logger.info(`📦 R2 Public URL: ${r2PublicUrlBase}`);

		// Find all images with CloudFront URLs
		const images = await Image.find({
			$or: [
				{ imageUrl: /cloudfront\.net/i },
				{ regularUrl: /cloudfront\.net/i },
				{ smallUrl: /cloudfront\.net/i },
				{ thumbnailUrl: /cloudfront\.net/i },
				{ imageAvifUrl: /cloudfront\.net/i },
				{ regularAvifUrl: /cloudfront\.net/i },
				{ smallAvifUrl: /cloudfront\.net/i },
				{ thumbnailAvifUrl: /cloudfront\.net/i },
			],
		});

		if (images.length === 0) {
			logger.info('✅ No images with CloudFront URLs found');
			await mongoose.disconnect();
			return;
		}

		logger.info(`📸 Found ${images.length} images with CloudFront URLs`);

		let updated = 0;
		let skipped = 0;
		const urlFields = [
			'imageUrl',
			'regularUrl',
			'smallUrl',
			'thumbnailUrl',
			'imageAvifUrl',
			'regularAvifUrl',
			'smallAvifUrl',
			'thumbnailAvifUrl',
		];

		// Process each image
		for (const image of images) {
			const updates = {};
			let hasUpdates = false;

			// Check each URL field
			for (const field of urlFields) {
				if (image[field] && image[field].includes('cloudfront.net')) {
					const r2Url = convertToR2Url(image[field]);
					if (r2Url) {
						updates[field] = r2Url;
						hasUpdates = true;
						logger.info(`  ${field}: ${image[field]} → ${r2Url}`);
					}
				}
			}

			if (hasUpdates) {
				await Image.updateOne(
					{ _id: image._id },
					{ $set: updates }
				);
				updated++;
			} else {
				skipped++;
			}
		}

		logger.info(`\n✅ Migration complete!`);
		logger.info(`   ✅ Updated: ${updated} images`);
		logger.info(`   ⏭️  Skipped: ${skipped} images (already R2 or no CloudFront URLs)`);

		if (updated > 0) {
			logger.info('\n🔄 All CloudFront URLs have been updated to use R2');
		} else {
			logger.info('\nℹ️  No images needed updating (all already using R2 or no CloudFront URLs found)');
		}

	} catch (error) {
		logger.error('❌ Migration failed:', error);
		throw error;
	} finally {
		await mongoose.disconnect();
		logger.info('✅ Database disconnected');
	}
}

// Run migration
migrateCloudFrontToR2()
	.then(() => {
		logger.info('\n✅ Migration completed successfully\n');
		process.exit(0);
	})
	.catch(error => {
		logger.error('\n❌ Migration failed:', error);
		process.exit(1);
	});

