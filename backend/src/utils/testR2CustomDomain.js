import 'dotenv/config';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../libs/env.js';
import { logger } from './logger.js';

/**
 * Test R2 custom domain file access
 * This script checks if files are accessible via the custom domain
 */

const r2Client = new S3Client({
	region: 'auto',
	endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: env.R2_ACCESS_KEY_ID,
		secretAccessKey: env.R2_SECRET_ACCESS_KEY,
	},
	forcePathStyle: true,
});

const BUCKET_NAME = env.R2_BUCKET_NAME;
const CUSTOM_DOMAIN = env.R2_PUBLIC_URL || 'https://cdn.uploadanh.cloud';

async function testR2CustomDomain() {
	try {
		logger.info('🔍 Testing R2 Custom Domain File Access...');
		logger.info(`📦 Bucket: ${BUCKET_NAME}`);
		logger.info(`🌐 Custom Domain: ${CUSTOM_DOMAIN}`);

		// List first 10 files in the bucket
		logger.info('\n📋 Listing files in bucket...');
		const listCommand = new ListObjectsV2Command({
			Bucket: BUCKET_NAME,
			Prefix: 'photo-app-images/',
			MaxKeys: 10,
		});

		const listResponse = await r2Client.send(listCommand);
		
		if (!listResponse.Contents || listResponse.Contents.length === 0) {
			logger.warn('⚠️  No files found in bucket');
			return;
		}

		logger.info(`✅ Found ${listResponse.Contents.length} files\n`);

		// Test URLs for first few files
		for (const object of listResponse.Contents.slice(0, 5)) {
			const key = object.Key;
			const oldUrl = `https://pub-${env.R2_ACCOUNT_ID}.r2.dev/${key}`;
			const newUrl = `${CUSTOM_DOMAIN}/${key}`;

			logger.info(`📁 File: ${key}`);
			logger.info(`   Old URL: ${oldUrl}`);
			logger.info(`   New URL: ${newUrl}`);
			
			// Try to verify file exists
			try {
				const getCommand = new GetObjectCommand({
					Bucket: BUCKET_NAME,
					Key: key,
				});
				await r2Client.send(getCommand);
				logger.info(`   ✅ File exists in R2 bucket`);
			} catch (error) {
				logger.error(`   ❌ Error accessing file: ${error.message}`);
			}
			logger.info('');
		}

		logger.info('\n💡 Next steps:');
		logger.info('   1. Try accessing the "New URL" directly in your browser');
		logger.info('   2. Check if custom domain is properly configured in R2 dashboard');
		logger.info('   3. Verify the path structure matches what R2 expects');

	} catch (error) {
		logger.error('❌ Error:', error.message);
		process.exit(1);
	}
}

testR2CustomDomain();

