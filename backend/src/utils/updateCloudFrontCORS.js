import 'dotenv/config';
import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import { env } from '../libs/env.js';
import { logger } from './logger.js';

/**
 * Updates S3 bucket CORS configuration to allow multiple origins
 * CloudFront will inherit these CORS settings
 * 
 * Usage: node src/utils/updateCloudFrontCORS.js
 */

const s3Client = new S3Client({
	region: env.AWS_REGION,
	credentials: {
		accessKeyId: env.AWS_ACCESS_KEY_ID,
		secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
	},
});

async function updateS3CORS() {
	try {
		logger.info('🔄 Updating S3 bucket CORS configuration...');
		logger.info(`📦 Bucket: ${env.AWS_S3_BUCKET_NAME}`);
		logger.info(`🌍 Region: ${env.AWS_REGION}`);

		// Collect all allowed origins
		const allowedOrigins = [
			'http://localhost:3000',
			'http://localhost:5173',
			env.CLIENT_URL,
			'https://uploadanh.cloud', // Production domain
		].filter(Boolean);

		// Remove duplicates
		const uniqueOrigins = [...new Set(allowedOrigins)];

		const corsConfiguration = {
			CORSRules: [
				{
					AllowedHeaders: ['*'],
					AllowedMethods: ['GET', 'HEAD'],
					AllowedOrigins: uniqueOrigins,
					ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type'],
					MaxAgeSeconds: 3600,
				},
			],
		};

		const command = new PutBucketCorsCommand({
			Bucket: env.AWS_S3_BUCKET_NAME,
			CORSConfiguration: corsConfiguration,
		});

		await s3Client.send(command);

		logger.info('✅ S3 bucket CORS configuration updated successfully!');
		logger.info('📋 Allowed origins:');
		corsConfiguration.CORSRules[0].AllowedOrigins.forEach(origin => {
			logger.info(`   - ${origin}`);
		});
		logger.info('\n⚠️  Note: If using CloudFront, you may also need to:');
		logger.info('   1. Create a Response Headers Policy in CloudFront Console');
		logger.info('   2. Set Access-Control-Allow-Origin to allow your origins');
		logger.info('   3. Attach the policy to your CloudFront distribution');
		logger.info('\n   Or use: AWS Console > CloudFront > Your Distribution > Behaviors > Edit > Response Headers Policy');

	} catch (error) {
		logger.error('❌ Failed to update S3 CORS configuration:', error.message);
		if (error.Code === 'AccessDenied') {
			logger.error('   Make sure your AWS credentials have s3:PutBucketCors permission');
		}
		process.exit(1);
	}
}

updateS3CORS();

