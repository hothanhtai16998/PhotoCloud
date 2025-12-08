import 'dotenv/config';
import mongoose from 'mongoose';
import { CONNECT_DB } from '../configs/db.js';
import Image from '../models/Image.js';
import { env } from '../libs/env.js';
import { r2Client, getBucketName } from '../libs/s3.js';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { logger } from './logger.js';

/**
 * Debug R2 image URLs and check if files exist
 * 
 * Usage: node src/utils/debugR2Images.js
 */

async function debugR2Images() {
	console.log('\n🔍 Debugging R2 Images...\n');

	try {
		// Connect to database
		console.log('📦 Connecting to database...');
		await CONNECT_DB();
		console.log('✅ Database connected\n');

		// Get a sample image from database
		console.log('📸 Fetching sample images from database...');
		const sampleImages = await Image.find().limit(5).select('imageUrl regularUrl smallUrl thumbnailUrl imageTitle');
		
		if (sampleImages.length === 0) {
			console.log('⚠️  No images found in database');
			return;
		}

		console.log(`✅ Found ${sampleImages.length} sample images\n`);

		// Check R2 bucket contents
		console.log('📦 Checking R2 bucket contents...');
		const bucketName = getBucketName();
		const listCommand = new ListObjectsV2Command({
			Bucket: bucketName,
			MaxKeys: 10,
		});
		
		const bucketContents = await r2Client.send(listCommand);
		console.log(`✅ Found ${bucketContents.Contents?.length || 0} objects in bucket\n`);

		// Show sample bucket objects
		if (bucketContents.Contents && bucketContents.Contents.length > 0) {
			console.log('📋 Sample objects in bucket:');
			bucketContents.Contents.slice(0, 5).forEach((obj, idx) => {
				console.log(`   ${idx + 1}. ${obj.Key} (${(obj.Size / 1024).toFixed(2)} KB)`);
			});
			console.log('');
		}

		// Analyze each sample image
		console.log('🔍 Analyzing sample images:\n');
		
		for (let i = 0; i < sampleImages.length; i++) {
			const image = sampleImages[i];
			console.log(`\n📸 Image ${i + 1}: ${image.imageTitle || 'Untitled'}`);
			console.log(`   ID: ${image._id}`);
			
			// Check each URL type
			const urlTypes = [
				{ name: 'imageUrl', url: image.imageUrl },
				{ name: 'regularUrl', url: image.regularUrl },
				{ name: 'smallUrl', url: image.smallUrl },
				{ name: 'thumbnailUrl', url: image.thumbnailUrl },
			];

			for (const { name, url } of urlTypes) {
				if (!url) {
					console.log(`   ⚠️  ${name}: Not set`);
					continue;
				}

				console.log(`   🔗 ${name}: ${url}`);
				
				// Extract key from URL
				let key = null;
				try {
					if (url.startsWith('http://') || url.startsWith('https://')) {
						const urlObj = new URL(url);
						key = urlObj.pathname.startsWith('/') ? urlObj.pathname.substring(1) : urlObj.pathname;
					} else {
						key = url;
					}
					
					// Remove bucket name from key if present
					if (key.startsWith(`${bucketName}/`)) {
						key = key.substring(bucketName.length + 1);
					}
					
					console.log(`      Key: ${key}`);
					
					// Check if file exists in bucket
					const exists = bucketContents.Contents?.some(obj => obj.Key === key);
					if (exists) {
						console.log(`      ✅ File exists in bucket`);
					} else {
						console.log(`      ❌ File NOT found in bucket`);
					}
					
					// Test public URL
					const publicUrl = url;
					try {
						const response = await fetch(publicUrl, { method: 'HEAD' });
						if (response.ok) {
							console.log(`      ✅ Public URL accessible (${response.status})`);
						} else if (response.status === 404) {
							console.log(`      ❌ Public URL returns 404`);
						} else {
							console.log(`      ⚠️  Public URL returns ${response.status}`);
						}
					} catch (error) {
						console.log(`      ❌ Public URL error: ${error.message}`);
					}
				} catch (error) {
					console.log(`      ⚠️  Could not parse URL: ${error.message}`);
				}
			}
		}

		// Summary
		console.log('\n\n📊 Summary:');
		console.log(`   - Database images: ${sampleImages.length}`);
		console.log(`   - Bucket objects: ${bucketContents.Contents?.length || 0}`);
		console.log(`   - Public URL base: ${env.R2_PUBLIC_URL || `https://pub-${env.R2_ACCOUNT_ID}.r2.dev`}`);
		console.log(`   - Bucket name: ${bucketName}`);
		
		// Check URL format
		console.log('\n💡 URL Format Check:');
		const publicUrlBase = env.R2_PUBLIC_URL || `https://pub-${env.R2_ACCOUNT_ID}.r2.dev`;
		const expectedFormat = `${publicUrlBase}/photo-app-images/filename.webp`;
		console.log(`   Expected format: ${expectedFormat}`);
		
		if (sampleImages[0]?.imageUrl) {
			const actualUrl = sampleImages[0].imageUrl;
			console.log(`   Actual format: ${actualUrl}`);
			
			if (!actualUrl.startsWith(publicUrlBase)) {
				console.log(`   ⚠️  URL doesn't match public URL base!`);
				console.log(`   💡 This might be the issue - URLs should start with: ${publicUrlBase}`);
			}
		}

	} catch (error) {
		console.error('\n❌ Error:', error.message);
		console.error(error.stack);
	} finally {
		await mongoose.disconnect();
		console.log('\n✅ Database disconnected\n');
	}
}

// Run debug
debugR2Images()
	.then(() => {
		process.exit(0);
	})
	.catch(error => {
		console.error('\n❌ Debug failed:', error);
		process.exit(1);
	});

