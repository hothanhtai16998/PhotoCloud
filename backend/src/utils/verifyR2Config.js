import 'dotenv/config';
import { env } from '../libs/env.js';
import { r2Client, getBucketName } from '../libs/s3.js';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { logger } from './logger.js';

/**
 * Verifies R2 configuration and public access
 * 
 * Usage: node src/utils/verifyR2Config.js
 */

async function verifyR2Config() {
	console.log('\n🔍 Verifying R2 Configuration...\n');

	// Check environment variables
	console.log('📋 Environment Variables:');
	const requiredVars = [
		'R2_ACCOUNT_ID',
		'R2_ACCESS_KEY_ID',
		'R2_SECRET_ACCESS_KEY',
		'R2_BUCKET_NAME',
	];
	
	const missing = requiredVars.filter(key => !process.env[key]);
	
	if (missing.length > 0) {
		console.error('❌ Missing required environment variables:');
		missing.forEach(key => console.error(`   - ${key}`));
		return false;
	}
	
	requiredVars.forEach(key => {
		const value = process.env[key];
		// Mask sensitive values
		if (key.includes('SECRET') || key.includes('KEY')) {
			console.log(`   ✅ ${key}: ${value ? '***' + value.slice(-4) : 'NOT SET'}`);
		} else {
			console.log(`   ✅ ${key}: ${value}`);
		}
	});

	// Check R2_PUBLIC_URL
	const publicUrl = env.R2_PUBLIC_URL || `https://pub-${env.R2_ACCOUNT_ID}.r2.dev`;
	console.log(`   ${env.R2_PUBLIC_URL ? '✅' : '⚠️ '} R2_PUBLIC_URL: ${publicUrl}`);
	if (!env.R2_PUBLIC_URL) {
		console.log('   ℹ️  Using default R2.dev subdomain');
	}

	// Test R2 connection
	console.log('\n🔌 Testing R2 Connection...');
	try {
		const bucketName = getBucketName();
		console.log(`   📦 Bucket: ${bucketName}`);
		
		const command = new ListObjectsV2Command({
			Bucket: bucketName,
			MaxKeys: 1, // Just check if we can list objects
		});

		await r2Client.send(command);
		console.log('   ✅ R2 connection successful');
	} catch (error) {
		console.error('   ❌ R2 connection failed:');
		console.error(`      ${error.message}`);
		if (error.Code === 'AccessDenied') {
			console.error('\n   💡 Tip: Check your R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY');
		} else if (error.Code === 'NoSuchBucket') {
			console.error('\n   💡 Tip: Check your R2_BUCKET_NAME');
		}
		return false;
	}

	// Test public URL accessibility
	console.log('\n🌐 Testing Public URL Access...');
	try {
		// Try to fetch a test file (this will fail if public access is not enabled)
		const testUrl = `${publicUrl}/test-file-that-does-not-exist.webp`;
		console.log(`   🔗 Testing: ${testUrl}`);
		
		const response = await fetch(testUrl, { method: 'HEAD' });
		
		if (response.status === 404) {
			console.log('   ✅ Public URL is accessible (404 is expected for non-existent file)');
			console.log('   ✅ Public access appears to be enabled');
		} else if (response.status === 403) {
			console.error('   ❌ Public access is NOT enabled on your R2 bucket');
			console.error('\n   💡 To fix:');
			console.error('      1. Go to Cloudflare Dashboard → R2 → Your Bucket');
			console.error('      2. Click "Settings" → "Public Access"');
			console.error('      3. Click "Allow Access"');
			return false;
		} else {
			console.log(`   ⚠️  Unexpected status: ${response.status}`);
			console.log('   ℹ️  This might indicate a custom domain configuration issue');
		}
	} catch (error) {
		console.error('   ❌ Failed to test public URL:');
		console.error(`      ${error.message}`);
		console.error('\n   💡 Possible issues:');
		console.error('      - Custom domain not configured correctly');
		console.error('      - DNS not propagated yet');
		console.error('      - R2_PUBLIC_URL is incorrect');
		return false;
	}

	// Summary
	console.log('\n✅ R2 Configuration Verification Complete!\n');
	console.log('📝 Summary:');
	console.log(`   - Bucket: ${getBucketName()}`);
	console.log(`   - Public URL: ${publicUrl}`);
	console.log('   - Connection: ✅ Working');
	console.log('   - Public Access: ✅ Enabled');
	
	return true;
}

// Run verification
verifyR2Config()
	.then(success => {
		if (!success) {
			console.error('\n❌ Verification failed. Please fix the issues above.\n');
			process.exit(1);
		}
		process.exit(0);
	})
	.catch(error => {
		console.error('\n❌ Verification error:', error);
		process.exit(1);
	});

