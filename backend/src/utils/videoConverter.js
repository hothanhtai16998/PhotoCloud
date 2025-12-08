import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import sharp from 'sharp';
import { logger } from './logger.js';
import { uploadToR2 } from '../libs/s3.js';

const execAsync = promisify(exec);

/**
 * Convert GIF to MP4 using ffmpeg
 * @param {Buffer} gifBuffer - GIF file buffer
 * @param {string} filename - Base filename (without extension)
 * @param {string} bucket - S3 bucket name
 * @returns {Promise<{videoUrl: string, thumbnailUrl: string, duration: number} | null>}
 */
export async function convertGifToVideo(gifBuffer, filename, bucket = 'photo-app-images') {
    const gifSizeMB = gifBuffer.length / (1024 * 1024);
    logger.info(`[VIDEO CONVERTER] Starting GIF to video conversion: ${filename} (${gifSizeMB.toFixed(2)}MB)`);
    
    try {
        // Check if ffmpeg is available
        try {
            await execAsync('ffmpeg -version');
            logger.info('[VIDEO CONVERTER] ffmpeg is available');
        } catch (error) {
            logger.warn('[VIDEO CONVERTER] ffmpeg not available, skipping GIF to video conversion');
            return null;
        }

        // Only convert GIFs larger than 2MB (smaller ones are fine as GIFs)
        if (gifSizeMB < 2) {
            logger.info(`[VIDEO CONVERTER] GIF is ${gifSizeMB.toFixed(2)}MB, keeping as GIF (no conversion needed)`);
            return null;
        }

        // Skip conversion for very large GIFs (>50MB) to prevent resource exhaustion
        // These are likely too large to convert efficiently
        if (gifSizeMB > 50) {
            logger.warn(`[VIDEO CONVERTER] GIF is ${gifSizeMB.toFixed(2)}MB, too large to convert (max 50MB). Uploading as GIF.`);
            return null;
        }

        // Create temporary files
        const tempDir = tmpdir();
        const gifPath = join(tempDir, `${filename}.gif`);
        const mp4Path = join(tempDir, `${filename}.mp4`);
        const thumbnailPath = join(tempDir, `${filename}-thumb.jpg`);

        try {
            // Write GIF to temp file
            logger.info(`[VIDEO CONVERTER] Writing GIF to temp file: ${gifPath}`);
            await writeFile(gifPath, gifBuffer);
            logger.info(`[VIDEO CONVERTER] GIF written, starting conversion...`);

            // Convert GIF to MP4 using ffmpeg
            // -y: overwrite output file
            // -i: input file
            // -vf: video filters (scale to max 1080p, fps=15 for smooth playback)
            // -c:v libx264: use H.264 codec
            // -preset medium: encoding speed/quality balance
            // -crf 23: quality (lower = better quality, 23 is good balance)
            // -pix_fmt yuv420p: ensure compatibility
            // -movflags +faststart: enable streaming
            logger.info(`[VIDEO CONVERTER] Running ffmpeg conversion...`);
            // Add timeout: 5 minutes max for conversion (prevents hanging on very large/complex GIFs)
            const conversionTimeout = 5 * 60 * 1000; // 5 minutes
            await Promise.race([
                execAsync(
                    `ffmpeg -y -i "${gifPath}" -vf "scale='min(1080,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease,fps=15" -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p -movflags +faststart "${mp4Path}"`
                ),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Conversion timeout after 5 minutes')), conversionTimeout)
                )
            ]);
            logger.info(`[VIDEO CONVERTER] Conversion complete, generating thumbnail...`);

            // Generate thumbnail from first frame
            await execAsync(
                `ffmpeg -y -i "${gifPath}" -vf "scale='min(500,iw)':'min(500,ih)':force_original_aspect_ratio=decrease" -frames:v 1 "${thumbnailPath}"`
            );
            logger.info(`[VIDEO CONVERTER] Thumbnail generated, extracting duration...`);

            // Get video duration
            const { stdout } = await execAsync(
                `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${mp4Path}"`
            );
            const duration = parseFloat(stdout.trim()) || 0;
            logger.info(`[VIDEO CONVERTER] Duration: ${duration}s`);

            // Read converted files
            const [mp4Buffer, thumbnailBuffer] = await Promise.all([
                readFile(mp4Path),
                readFile(thumbnailPath).catch(() => null), // Thumbnail is optional
            ]);

            // Upload to R2
            const [videoUrl, thumbnailUrl] = await Promise.all([
                uploadToR2(mp4Buffer, `${bucket}/${filename}.mp4`, 'video/mp4'),
                thumbnailBuffer
                    ? uploadToR2(thumbnailBuffer, `${bucket}/${filename}-thumb.jpg`, 'image/jpeg')
                    : Promise.resolve(null),
            ]);

            // Cleanup temp files
            await Promise.all([
                unlink(gifPath).catch(() => {}),
                unlink(mp4Path).catch(() => {}),
                unlink(thumbnailPath).catch(() => {}),
            ]);

            logger.info(`[VIDEO CONVERTER] Upload complete: video=${videoUrl}, thumbnail=${thumbnailUrl || videoUrl}`);
            return {
                videoUrl,
                thumbnailUrl: thumbnailUrl || videoUrl, // Fallback to video URL if thumbnail fails
                duration,
            };
        } catch (conversionError) {
            logger.error(`[VIDEO CONVERTER] Error during conversion:`, conversionError);
            // Cleanup on error
            await Promise.all([
                unlink(gifPath).catch(() => {}),
                unlink(mp4Path).catch(() => {}),
                unlink(thumbnailPath).catch(() => {}),
            ]);
            throw conversionError;
        }
    } catch (error) {
        logger.error(`[VIDEO CONVERTER] Error converting GIF to video for ${filename}:`, error);
        return null;
    }
}

/**
 * Generate thumbnail from video buffer using ffmpeg
 * @param {Buffer} videoBuffer - Video file buffer
 * @param {string} filename - Base filename
 * @param {string} bucket - S3 bucket name
 * @returns {Promise<string | null>} Thumbnail URL or null
 */
export async function generateVideoThumbnail(videoBuffer, filename, bucket = 'photo-app-images') {
    try {
        // Check if ffmpeg is available
        try {
            await execAsync('ffmpeg -version');
        } catch (error) {
            logger.warn('ffmpeg not available, skipping video thumbnail generation');
            return null;
        }

        // Create temporary files
        const tempDir = tmpdir();
        const videoPath = join(tempDir, `${filename}-temp.mp4`);
        const thumbnailPath = join(tempDir, `${filename}-thumb.jpg`);

        try {
            // Write video to temp file
            await writeFile(videoPath, videoBuffer);

            // Extract thumbnail from video (1 second in, or first frame if video is shorter)
            await execAsync(
                `ffmpeg -y -i "${videoPath}" -vf "scale='min(500,iw)':'min(500,ih)':force_original_aspect_ratio=decrease" -frames:v 1 "${thumbnailPath}"`
            );

            // Read thumbnail
            const thumbnailBuffer = await readFile(thumbnailPath);

            // Upload thumbnail to R2
            const thumbnailUrl = await uploadToR2(
                thumbnailBuffer,
                `${bucket}/${filename}-thumb.jpg`,
                'image/jpeg'
            );

            // Cleanup temp files
            await Promise.all([
                unlink(videoPath).catch(() => {}),
                unlink(thumbnailPath).catch(() => {}),
            ]);

            return thumbnailUrl;
        } catch (thumbnailError) {
            // Cleanup on error
            await Promise.all([
                unlink(videoPath).catch(() => {}),
                unlink(thumbnailPath).catch(() => {}),
            ]);
            throw thumbnailError;
        }
    } catch (error) {
        logger.error('Error generating video thumbnail:', error.message);
        return null;
    }
}

/**
 * Get video duration using ffprobe
 * @param {Buffer} videoBuffer - Video file buffer
 * @returns {Promise<number | null>} Duration in seconds or null
 */
export async function getVideoDuration(videoBuffer) {
    try {
        // Check if ffprobe is available
        try {
            await execAsync('ffprobe -version');
        } catch (error) {
            logger.warn('ffprobe not available, skipping video duration extraction');
            return null;
        }

        // Create temporary file
        const tempDir = tmpdir();
        const videoPath = join(tempDir, `video-${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`);

        try {
            // Write video to temp file
            await writeFile(videoPath, videoBuffer);

            // Get duration using ffprobe
            const { stdout } = await execAsync(
                `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
            );

            const duration = parseFloat(stdout.trim());
            
            // Cleanup
            await unlink(videoPath).catch(() => {});

            return isNaN(duration) ? null : duration;
        } catch (durationError) {
            // Cleanup on error
            await unlink(videoPath).catch(() => {});
            throw durationError;
        }
    } catch (error) {
        logger.error('Error getting video duration:', error.message);
        return null;
    }
}
