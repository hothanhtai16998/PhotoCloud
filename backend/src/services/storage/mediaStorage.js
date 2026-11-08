import sharp from 'sharp';
import { logger } from '../../utils/logger.js';
import { uploadToR2 } from './r2Objects.js';
import { getSingleExtensionFromMimeType } from '../../utils/fileTypeUtils.js';

export async function uploadVideo(videoBuffer, bucket, filename, mimetype) {
  try {
    // Extract format from MIME type
    const extension = getSingleExtensionFromMimeType(mimetype);
    const contentType = mimetype || 'video/mp4';

    // Import video utilities
    const { generateVideoThumbnail, getVideoDuration } =
      await import('../media/videoConverter.js');

    // Upload video directly to R2
    const videoUrl = await uploadToR2(
      videoBuffer,
      `${bucket}/${filename}.${extension}`,
      contentType
    );

    // Generate thumbnail and get duration in parallel
    const [thumbnailUrl, duration] = await Promise.all([
      generateVideoThumbnail(videoBuffer, filename, bucket).catch((err) => {
        logger.warn('Failed to generate video thumbnail:', err.message);
        return videoUrl; // Fallback to video URL
      }),
      getVideoDuration(videoBuffer).catch((err) => {
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

export const uploadAvatar = async (
  imageBuffer,
  folder = 'photo-app-avatars',
  filename
) => {
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
