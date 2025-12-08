import 'dotenv/config';
import mongoose from 'mongoose';
import { CONNECT_DB } from '../configs/db.js';
import Image from '../models/Image.js';
import { env } from '../libs/env.js';
import { logger } from '../utils/logger.js';

/**
 * Migrates R2 public URLs (pub-*.r2.dev) to custom domain (cdn.uploadanh.cloud)
 * 
 * This script:
 * 1. Finds all images with pub-*.r2.dev URLs
 * 2. Converts them to cdn.uploadanh.cloud URLs
 * 3. Updates the database
 * 
 * Usage: node src/migrations/migrateR2ToCustomDomain.js
 */

// Custom domain URL base
const CUSTOM_DOMAIN = 'https://cdn.uploadanh.cloud';

logger.info(`📦 Custom Domain: ${CUSTOM_DOMAIN}`);

// R2 public URL patterns to match
const r2PublicPatterns = [
	// Standard R2 public URL: https://pub-{account-id}.r2.dev/path
	new RegExp(/https?:\/\/pub-[a-f0-9]+\.r2\.dev\/(.+)/i),
	// Any pub-*.r2.dev URL
	new RegExp(/https?:\/\/pub-[^\/]+\.r2\.dev\/(.+)/i),
];

/**
 * Converts R2 public URL to custom domain URL
 * @param {string} r2Url - Original R2 public URL
 * @returns {string|null} - Custom domain URL or null if already custom domain or invalid
 */
function convertToCustomDomainUrl(r2Url) {
	if (!r2Url || typeof r2Url !== 'string') {
		return null;
	}

	// Skip if already using custom domain
	if (r2Url.includes('cdn.uploadanh.cloud')) {
		return null;
	}

	// Try to match R2 public URL pattern
	for (const pattern of r2PublicPatterns) {
		const match = r2Url.match(pattern);
		if (match && match[1]) {
			const path = match[1];
			// Remove leading slash if present
			const cleanPath = path.startsWith('/') ? path.substring(1) : path;
			return `${CUSTOM_DOMAIN}/${cleanPath}`;
		}
	}

	return null;
}

async function migrateR2ToCustomDomain() {
	try {
		await CONNECT_DB();
		logger.info('🚀 Starting R2 public URL to custom domain migration...');
		logger.info(`📦 Custom Domain: ${CUSTOM_DOMAIN}`);

		// Find all images with R2 public URLs (pub-*.r2.dev)
		const images = await Image.find({
			$or: [
				{ imageUrl: /pub-.*\.r2\.dev/i },
				{ regularUrl: /pub-.*\.r2\.dev/i },
				{ smallUrl: /pub-.*\.r2\.dev/i },
				{ thumbnailUrl: /pub-.*\.r2\.dev/i },
				{ imageAvifUrl: /pub-.*\.r2\.dev/i },
				{ regularAvifUrl: /pub-.*\.r2\.dev/i },
				{ smallAvifUrl: /pub-.*\.r2\.dev/i },
				{ thumbnailAvifUrl: /pub-.*\.r2\.dev/i },
				{ videoUrl: /pub-.*\.r2\.dev/i },
				{ videoThumbnail: /pub-.*\.r2\.dev/i },
			],
		});

		if (images.length === 0) {
			logger.info('✅ No images with R2 public URLs (pub-*.r2.dev) found');
			logger.info('   All images are already using custom domain or have no URLs');
			await mongoose.disconnect();
			return;
		}

		logger.info(`📸 Found ${images.length} images with R2 public URLs`);

		let updated = 0;
		let skipped = 0;
		let totalUrlUpdates = 0;
		
		// All URL fields that might need updating
		const urlFields = [
			'imageUrl',
			'regularUrl',
			'smallUrl',
			'thumbnailUrl',
			'imageAvifUrl',
			'regularAvifUrl',
			'smallAvifUrl',
			'thumbnailAvifUrl',
			'videoUrl',
			'videoThumbnail',
		];

		// Process each image
		for (const image of images) {
			const updates = {};
			let hasUpdates = false;

			// Check each URL field
			for (const field of urlFields) {
				if (image[field] && typeof image[field] === 'string' && image[field].includes('pub-') && image[field].includes('.r2.dev')) {
					const customDomainUrl = convertToCustomDomainUrl(image[field]);
					if (customDomainUrl) {
						updates[field] = customDomainUrl;
						hasUpdates = true;
						totalUrlUpdates++;
						logger.info(`  ${field}: ${image[field].substring(0, 60)}... → ${customDomainUrl.substring(0, 60)}...`);
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
		logger.info(`   🔄 Total URL updates: ${totalUrlUpdates} URLs`);
		logger.info(`   ⏭️  Skipped: ${skipped} images (already using custom domain)`);

		if (updated > 0) {
			logger.info(`\n🔄 All R2 public URLs (pub-*.r2.dev) have been updated to use custom domain (${CUSTOM_DOMAIN})`);
			logger.info('   ✅ Images should now load without CORS errors!');
		} else {
			logger.info('\nℹ️  No images needed updating (all already using custom domain)');
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
migrateR2ToCustomDomain()
	.then(() => {
		logger.info('\n✅ Migration completed successfully\n');
		process.exit(0);
	})
	.catch(error => {
		logger.error('\n❌ Migration failed:', error);
		process.exit(1);
	});

