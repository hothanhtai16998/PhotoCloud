import 'dotenv/config';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { env } from '../libs/env.js';
import { logger } from './logger.js';

/**
 * Verify R2 file paths and test custom domain access
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

async function verifyFileAccess() {
	try {
		logger.info('🔍 Checking R2 file structure...');
		
		// List files
		const command = new ListObjectsV2Command({
			Bucket: env.R2_BUCKET_NAME,
			Prefix: 'photo-app-images/',
			MaxKeys: 3,
		});

		const response = await r2Client.send(command);
		
		if (!response.Contents || response.Contents.length === 0) {
			logger.warn('⚠️  No files found');
			return;
		}

		logger.info(`\n📁 Found ${response.Contents.length} files:\n`);
		
		for (const obj of response.Contents) {
			const key = obj.Key;
			const oldUrl = `https://pub-${env.R2_ACCOUNT_ID}.r2.dev/${key}`;
			const customUrl = `https://cdn.uploadanh.cloud/${key}`;
			
			logger.info(`Key: ${key}`);
			logger.info(`  Old URL: ${oldUrl}`);
			logger.info(`  Custom Domain URL: ${customUrl}`);
			logger.info('');
		}

		logger.info('💡 Test these URLs in your browser to see which one works');

	} catch (error) {
		logger.error('❌ Error:', error.message);
	}
}

verifyFileAccess();

