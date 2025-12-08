import { S3Client, GetObjectCommand, DeleteObjectCommand, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from './env.js';
import { Upload } from '@aws-sdk/lib-storage';
import sharp from 'sharp';
import { logger } from '../utils/logger.js';
import { getSingleExtensionFromMimeType } from '../utils/fileTypeUtils.js';

// Initialize R2 storage client
// R2 is S3-compatible, so we use the AWS S3 SDK
const r2Client = new S3Client({
	region: 'auto', // R2 uses 'auto' as region
	endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: env.R2_ACCESS_KEY_ID,
		secretAccessKey: env.R2_SECRET_ACCESS_KEY,
	},
	forcePathStyle: true, // Required for R2
});

// Get bucket name
export const getBucketName = () => env.R2_BUCKET_NAME;

// Get public URL base
const getPublicUrlBase = () => {
	// R2: Use custom domain or R2.dev subdomain
	return env.R2_PUBLIC_URL || `https://pub-${env.R2_ACCOUNT_ID}.r2.dev`;
};

// Get public URL for uploaded file
// Note: R2 custom domains serve files directly from bucket root, so we keep the full key path
const getPublicUrl = (key) => {
	const publicUrlBase = getPublicUrlBase();

	// For R2 storage, include the full key
	// The key already includes the folder structure (e.g., "photo-app-images/filename.webp")
	return `${publicUrlBase}/${key}`;
};

/**
 * Upload a single file to R2
 * @param {Buffer} buffer - File buffer
 * @param {string} key - R2 object key (path)
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} Public URL of uploaded file
 */
export const uploadToR2 = async (buffer, key, contentType) => {
	try {
		const command = new PutObjectCommand({
			Bucket: getBucketName(),
			Key: key,
			Body: buffer,
			ContentType: contentType,
			CacheControl: 'public, max-age=31536000, immutable', // Cache for 1 year, immutable for better performance
		});

		await r2Client.send(command);

		// Return public URL (handles custom domain bucket name stripping)
		return getPublicUrl(key);
	} catch (error) {
		// Provide more detailed error information
		const errorMessage = error.message || 'Unknown error';
		const errorCode = error.Code || error.code || 'UNKNOWN';
		console.error('R2 Upload Error:', {
			code: errorCode,
			message: errorMessage,
			bucket: getBucketName(),
			key: key,
		});
		throw new Error(`Failed to upload to R2 (${errorCode}): ${errorMessage}`);
	}
};

/**
 * Upload image with multiple sizes to R2
 * For GIFs and other formats that shouldn't be processed, upload directly
 */
export async function uploadImageWithSizes(buffer, bucket, filename, mimetype = null) {
	try {
		const fileSizeMB = buffer.length / (1024 * 1024);
		logger.info(`[UPLOAD] Processing file: ${filename}, mimetype: ${mimetype || 'unknown'}, size: ${fileSizeMB.toFixed(2)}MB`);

		// Detect image format from buffer or use provided mimetype
		let imageFormat = null;
		let contentType = 'image/webp';

		if (mimetype) {
			// Extract format from MIME type
			const mimeToFormat = {
				'image/gif': 'gif',
				'image/svg+xml': 'svg',
				'image/webp': 'webp',
				'image/jpeg': 'jpeg',
				'image/jpg': 'jpeg',
				'image/png': 'png',
				'image/bmp': 'bmp',
				'image/x-icon': 'ico',
				'image/vnd.microsoft.icon': 'ico',
			};
			imageFormat = mimeToFormat[mimetype.toLowerCase()];
			contentType = mimetype;
			logger.info(`[UPLOAD] Detected format from mimetype: ${imageFormat}`);
		}

		// For GIFs, skip Sharp processing (it can be slow for large GIFs)
		// If not detected from mimetype, try to detect from buffer
		if (!imageFormat && mimetype && !mimetype.toLowerCase().includes('gif')) {
			try {
				const metadata = await sharp(buffer).metadata();
				imageFormat = metadata.format;
				logger.info(`[UPLOAD] Detected format from buffer: ${imageFormat}`);
			} catch (err) {
				// If Sharp can't read it, it might be a format we need to handle specially
				logger.warn('[UPLOAD] Could not detect image format from buffer:', err?.message);
			}
		}

		// For GIFs: Check if large, convert to video; otherwise upload as-is
		if (imageFormat === 'gif') {
			const gifSizeMB = buffer.length / (1024 * 1024);
			logger.info(`[GIF] Detected GIF file: ${gifSizeMB.toFixed(2)}MB`);

			// Check if GIF-to-video conversion is enabled (skip on free tier hosting)
			const enableGifConversion = process.env.ENABLE_GIF_TO_VIDEO !== 'false';

			// Convert large GIFs (>2MB) to video for better performance
			if (gifSizeMB > 2 && enableGifConversion) {
				logger.info(`[GIF] GIF is ${gifSizeMB.toFixed(2)}MB, attempting conversion to video...`);
				try {
					const { convertGifToVideo } = await import('../utils/videoConverter.js');
					logger.info(`[GIF] Starting conversion for ${filename}...`);
					const videoResult = await convertGifToVideo(buffer, filename, bucket);

					if (videoResult) {
						logger.info(`[GIF] Successfully converted to video: ${videoResult.videoUrl}`);
						// Successfully converted to video
						return {
							publicId: filename,
							videoUrl: videoResult.videoUrl,
							thumbnailUrl: videoResult.thumbnailUrl,
							videoDuration: videoResult.duration,
							imageUrl: videoResult.videoUrl, // For backward compatibility
							smallUrl: videoResult.videoUrl,
							regularUrl: videoResult.videoUrl,
							imageAvifUrl: videoResult.videoUrl,
							thumbnailAvifUrl: videoResult.thumbnailUrl,
							smallAvifUrl: videoResult.videoUrl,
							regularAvifUrl: videoResult.videoUrl,
							isVideo: true, // Mark as video
						};
					} else {
						logger.warn(`[GIF] Conversion returned null, uploading as GIF`);
					}
					// If conversion fails, fall through to upload as GIF
				} catch (error) {
					logger.error(`[GIF] GIF to video conversion failed, uploading as GIF:`, error);
					// Fall through to upload as GIF
				}
			} else if (gifSizeMB > 2 && !enableGifConversion) {
				logger.info(`[GIF] GIF is ${gifSizeMB.toFixed(2)}MB, but conversion is disabled (ENABLE_GIF_TO_VIDEO=false). Uploading as GIF.`);
			} else {
				logger.info(`[GIF] GIF is ${gifSizeMB.toFixed(2)}MB, keeping as GIF (no conversion needed)`);
			}

			// Upload GIF directly (small GIFs or if conversion failed)
			const originalUrl = await uploadToR2(
				buffer,
				`${bucket}/${filename}.gif`,
				contentType || 'image/gif'
			);

			// Generate tiny base64 PNG for instant blur-up
			// Using PNG instead of BMP since Sharp doesn't support BMP output
			// Preserve aspect ratio to prevent distortion
			const tinyPngBuffer = await sharp(buffer)
				.resize(20, 20, { 
					fit: 'inside', // Preserve aspect ratio, fit inside 20x20 box
					withoutEnlargement: true
				})
				.png({ compressionLevel: 9, quality: 80 }) // High compression for tiny image
				.toBuffer();
			const base64Thumbnail = `data:image/png;base64,${tinyPngBuffer.toString('base64')}`;

			return {
				publicId: filename,
				thumbnailUrl: originalUrl,
				smallUrl: originalUrl,
				regularUrl: originalUrl,
				imageUrl: originalUrl,
				imageAvifUrl: originalUrl,
				thumbnailAvifUrl: originalUrl,
				smallAvifUrl: originalUrl,
				regularAvifUrl: originalUrl,
				base64Thumbnail, // Tiny base64 BMP for instant blur-up
			};
		}

		// For SVGs, BMPs, and ICOs, upload directly without processing
		// SVGs are vector graphics, BMP/ICO are legacy formats
		if (imageFormat === 'svg' || imageFormat === 'bmp' || imageFormat === 'ico') {
			// Upload original file directly without processing
			const originalUrl = await uploadToR2(
				buffer,
				`${bucket}/${filename}.${imageFormat}`,
				contentType || `image/${imageFormat}`
			);

			// Generate tiny base64 PNG for instant blur-up (even for SVGs/BMPs/ICOs)
			// Using PNG instead of BMP since Sharp doesn't support BMP output
			// Preserve aspect ratio to prevent distortion when stretching
			const tinyPngBuffer = await sharp(buffer)
				.resize(20, 20, { 
					fit: 'inside', // Preserve aspect ratio, fit inside 20x20 box
					withoutEnlargement: true
				})
				.png({ compressionLevel: 9, quality: 80 }) // High compression for tiny image
				.toBuffer();
			const base64Thumbnail = `data:image/png;base64,${tinyPngBuffer.toString('base64')}`;

			// For these formats, use the same URL for all sizes (they handle their own scaling)
			return {
				publicId: filename,
				thumbnailUrl: originalUrl,
				smallUrl: originalUrl,
				regularUrl: originalUrl,
				imageUrl: originalUrl,
				imageAvifUrl: originalUrl,
				thumbnailAvifUrl: originalUrl,
				smallAvifUrl: originalUrl,
				regularAvifUrl: originalUrl,
				base64Thumbnail, // Tiny base64 BMP for instant blur-up
			};
		}

		// For other formats (JPEG, PNG, etc.), process with Sharp
		// Determine original file extension from detected format or default to jpg
		const originalExtension = imageFormat === 'png' ? 'png' : imageFormat === 'jpeg' ? 'jpg' : 'jpg';
		const originalContentType = contentType || (imageFormat === 'png' ? 'image/png' : 'image/jpeg');
		
		// Generate tiny base64 PNG for instant blur-up (like Unsplash uses BMP)
		// Generate tiny thumbnail preserving aspect ratio (max 20px on longest side)
		// Very small file size (1-2 KB), loads instantly
		// Using PNG instead of BMP since Sharp doesn't support BMP output
		// Preserve aspect ratio to prevent distortion when stretching to container
		const tinyPngBuffer = await sharp(buffer)
			.resize(20, 20, { 
				fit: 'inside', // Preserve aspect ratio, fit inside 20x20 box
				withoutEnlargement: true
			})
			.png({ compressionLevel: 9, quality: 80 }) // High compression for tiny image
			.toBuffer();
		const base64Thumbnail = `data:image/png;base64,${tinyPngBuffer.toString('base64')}`;
		
		const [thumbnailBuffer, smallBuffer, regularBuffer, webpFullBuffer, originalBuffer] = await Promise.all([
			sharp(buffer).resize(200, 200, { fit: 'cover' }).webp().toBuffer(),
			sharp(buffer).resize(500, 500, { fit: 'cover' }).webp().toBuffer(),
			sharp(buffer).resize(1000, 1000, { fit: 'inside' }).webp().toBuffer(),
			sharp(buffer).webp().toBuffer(), // WebP version for display
			Promise.resolve(buffer), // Keep original buffer for true original file
		]);

		// Upload all sizes in parallel to R2
		const [thumb, small, regular, webpFull, original] = await Promise.all([
			uploadToR2(thumbnailBuffer, `${bucket}/${filename}-thumbnail.webp`, 'image/webp'),
			uploadToR2(smallBuffer, `${bucket}/${filename}-small.webp`, 'image/webp'),
			uploadToR2(regularBuffer, `${bucket}/${filename}-regular.webp`, 'image/webp'),
			uploadToR2(webpFullBuffer, `${bucket}/${filename}.webp`, 'image/webp'), // WebP for display
			uploadToR2(originalBuffer, `${bucket}/${filename}-original.${originalExtension}`, originalContentType), // True original
		]);
		
		// Log file sizes for debugging
		logger.info(`[UPLOAD] File sizes - Original: ${(originalBuffer.length / 1024 / 1024).toFixed(2)}MB, WebP: ${(webpFullBuffer.length / 1024 / 1024).toFixed(2)}MB`);
		logger.info(`[UPLOAD] Original URL: ${original}, Extension: ${originalExtension}`);

		return {
			publicId: filename,
			thumbnailUrl: thumb,
			smallUrl: small,
			regularUrl: regular,
			imageUrl: original, // True original file (JPG/PNG)
			imageAvifUrl: webpFull, // WebP version for display
			thumbnailAvifUrl: thumb,
			smallAvifUrl: small,
			regularAvifUrl: regular,
			base64Thumbnail, // Tiny base64 BMP for instant blur-up (like Unsplash)
		};
	} catch (err) {
		console.error('uploadImageWithSizes failed:', err?.message);
		throw err;
	}
}

/**
 * Upload video to R2 with thumbnail generation
 * @param {Buffer} videoBuffer - Video file buffer
 * @param {string} bucket - R2 bucket name
 * @param {string} filename - Base filename (without extension)
 * @param {string} mimetype - MIME type (e.g., 'video/mp4', 'video/webm')
 * @returns {Promise<Object>} Object with video URL and thumbnail URL
 */

export async function uploadVideo(videoBuffer, bucket, filename, mimetype) {
	try {
		// Extract format from MIME type
		const extension = getSingleExtensionFromMimeType(mimetype);
		const contentType = mimetype || 'video/mp4';

		// Import video utilities
		const { generateVideoThumbnail, getVideoDuration } = await import('../utils/videoConverter.js');

		// Upload video directly to R2
		const videoUrl = await uploadToR2(
			videoBuffer,
			`${bucket}/${filename}.${extension}`,
			contentType
		);

		// Generate thumbnail and get duration in parallel
		const [thumbnailUrl, duration] = await Promise.all([
			generateVideoThumbnail(videoBuffer, filename, bucket).catch(err => {
				logger.warn('Failed to generate video thumbnail:', err.message);
				return videoUrl; // Fallback to video URL
			}),
			getVideoDuration(videoBuffer).catch(err => {
				logger.warn('Failed to get video duration:', err.message);
				return null;
			}),
		]);

		return {
			publicId: filename,
			videoUrl,
			thumbnailUrl: thumbnailUrl || videoUrl,
			videoDuration: duration,
			imageUrl: videoUrl, // For backward compatibility
			smallUrl: videoUrl,
			regularUrl: videoUrl,
		};
	} catch (err) {
		console.error('uploadVideo failed:', err?.message);
		throw err;
	}
}

/**
 * Upload avatar to R2 (single size, 200x200)
 * @param {Buffer} imageBuffer - Original image buffer
 * @param {string} folder - Folder path in R2 (e.g., 'photo-app-avatars')
 * @param {string} filename - Base filename (without extension)
 * @returns {Promise<Object>} Object with URL and publicId
 */
export const uploadAvatar = async (imageBuffer, folder = 'photo-app-avatars', filename) => {
	try {
		// Generate unique filename with timestamp
		const timestamp = Date.now();
		const baseFilename = filename || `avatar-${timestamp}`;
		const extension = 'webp';

		// Process avatar with Sharp: 200x200, face detection, WebP
		const avatar = await sharp(imageBuffer, { failOnError: false })
			.rotate() // Auto-rotate based on EXIF orientation
			.resize(200, 200, {
				fit: 'cover',
				position: 'center',
			})
			.webp({ quality: 85 })
			.toBuffer();

		// Upload to R2
		const avatarUrl = await uploadToR2(
			avatar,
			`${folder}/${baseFilename}.${extension}`,
			'image/webp'
		);

		return {
			publicId: `${folder}/${baseFilename}`,
			avatarUrl,
		};
	} catch (error) {
		throw new Error(`Failed to process and upload avatar: ${error.message}`);
	}
};

/**
 * Delete image from R2 (all sizes)
 * @param {string} publicId - Base public ID (without size suffix)
 * @param {string} folder - Folder path
 */
export const deleteImageFromR2 = async (publicId, folder = 'photo-app-images') => {
	try {
		const sizes = ['thumbnail', 'small', 'regular', 'original'];
		const formats = ['webp', 'avif']; // Delete both WebP and AVIF versions

		const deletePromises = sizes.flatMap((size) =>
			formats.map((format) => {
				const key = `${folder}/${publicId}-${size}.${format}`;
				const command = new DeleteObjectCommand({
					Bucket: getBucketName(),
					Key: key,
				});
				return r2Client.send(command);
			})
		);

		await Promise.all(deletePromises);
	} catch (error) {
		// Log error but don't throw - deletion is not critical
		console.error(`Failed to delete image from R2: ${error.message}`);
	}
};

/**
 * Delete avatar from R2
 * @param {string} publicId - Public ID (with folder prefix)
 */
export const deleteAvatarFromR2 = async (publicId) => {
	try {
		const extension = 'webp';
		const key = `${publicId}.${extension}`;
		const command = new DeleteObjectCommand({
			Bucket: getBucketName(),
			Key: key,
		});
		await r2Client.send(command);
	} catch (error) {
		// Log error but don't throw - deletion is not critical
		console.error(`Failed to delete avatar from R2: ${error.message}`);
	}
};

/**
 * Get image from R2 as a stream
 * @param {string} imageUrl - Full R2 URL or R2 key
 * @returns {Promise<{Body: ReadableStream, ContentType: string, ContentLength: number}>}
 */
export const getImageFromR2 = async (imageUrl) => {
	try {
		// Extract R2 key from URL
		// Handle both full URLs and keys
		let key;
		if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
			// Extract key from URL
			// Format: https://custom-domain.com/bucket/key or https://pub-account-id.r2.dev/bucket/key
			const url = new URL(imageUrl);
			key = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
		} else {
			key = imageUrl;
		}

		const command = new GetObjectCommand({
			Bucket: getBucketName(),
			Key: key,
		});

		const response = await r2Client.send(command);
		return {
			Body: response.Body,
			ContentType: response.ContentType || 'image/webp',
			ContentLength: response.ContentLength,
		};
	} catch (error) {
		console.error('R2 Get Error:', {
			message: error.message,
			code: error.Code || error.code,
			imageUrl,
		});
		throw new Error(`Failed to get image from R2: ${error.message}`);
	}
};

export { r2Client };
export default r2Client;

/**
 * Generate a pre-signed URL that allows uploading directly to R2
 * @param {string} key - Target R2 object key
 * @param {string} contentType - MIME type of the object
 * @param {number} expiresIn - Expiration in seconds (default 5 minutes)
 */
export const generatePresignedUploadUrl = async (key, contentType, expiresIn = 300) => {
	const command = new PutObjectCommand({
		Bucket: getBucketName(),
		Key: key,
		ContentType: contentType || 'application/octet-stream',
	});

	return getSignedUrl(r2Client, command, { expiresIn });
};

/**
 * Get object from R2 and return the stream/body
 */
export async function getObjectFromR2(key) {
	const params = {
		Bucket: getBucketName(),
		Key: key,
	};
	const command = new GetObjectCommand(params);
	return await r2Client.send(command);
}

/**
 * Delete object from R2 by key
 */
export async function deleteObjectByKey(key) {
	const params = {
		Bucket: getBucketName(),
		Key: key,
	};
	const command = new DeleteObjectCommand(params);
	return await r2Client.send(command);
}
