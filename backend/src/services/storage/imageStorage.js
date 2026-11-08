import { createBlurThumbnail } from '../media/blurThumbnail.js';
import sharp from 'sharp';
import { logger } from '../../utils/logger.js';
import { uploadToR2 } from './r2Objects.js';

export async function uploadImageWithSizes(
  buffer,
  bucket,
  filename,
  mimetype = null
) {
  try {
    const fileSizeMB = buffer.length / (1024 * 1024);
    logger.info(
      `[UPLOAD] Processing file: ${filename}, mimetype: ${mimetype || 'unknown'}, size: ${fileSizeMB.toFixed(2)}MB`
    );

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
        logger.warn(
          '[UPLOAD] Could not detect image format from buffer:',
          err?.message
        );
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
        logger.info(
          `[GIF] GIF is ${gifSizeMB.toFixed(2)}MB, attempting conversion to video...`
        );
        try {
          const { convertGifToVideo } =
            await import('../media/videoConverter.js');
          logger.info(`[GIF] Starting conversion for ${filename}...`);
          const videoResult = await convertGifToVideo(buffer, filename, bucket);

          if (videoResult) {
            logger.info(
              `[GIF] Successfully converted to video: ${videoResult.videoUrl}`
            );
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
          logger.error(
            `[GIF] GIF to video conversion failed, uploading as GIF:`,
            error
          );
          // Fall through to upload as GIF
        }
      } else if (gifSizeMB > 2 && !enableGifConversion) {
        logger.info(
          `[GIF] GIF is ${gifSizeMB.toFixed(2)}MB, but conversion is disabled (ENABLE_GIF_TO_VIDEO=false). Uploading as GIF.`
        );
      } else {
        logger.info(
          `[GIF] GIF is ${gifSizeMB.toFixed(2)}MB, keeping as GIF (no conversion needed)`
        );
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
      const base64Thumbnail = await createBlurThumbnail(buffer);

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
    if (
      imageFormat === 'svg' ||
      imageFormat === 'bmp' ||
      imageFormat === 'ico'
    ) {
      // Upload original file directly without processing
      const originalUrl = await uploadToR2(
        buffer,
        `${bucket}/${filename}.${imageFormat}`,
        contentType || `image/${imageFormat}`
      );

      // Generate tiny base64 PNG for instant blur-up (even for SVGs/BMPs/ICOs)
      // Using PNG instead of BMP since Sharp doesn't support BMP output
      // Preserve aspect ratio to prevent distortion when stretching
      const base64Thumbnail = await createBlurThumbnail(buffer);

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
    const originalExtension =
      imageFormat === 'png' ? 'png' : imageFormat === 'jpeg' ? 'jpg' : 'jpg';
    const originalContentType =
      contentType || (imageFormat === 'png' ? 'image/png' : 'image/jpeg');

    // Generate tiny base64 PNG for instant blur-up (like PHOTOCLOUD uses BMP)
    // Generate tiny thumbnail preserving aspect ratio (max 20px on longest side)
    // Very small file size (1-2 KB), loads instantly
    // Using PNG instead of BMP since Sharp doesn't support BMP output
    // Preserve aspect ratio to prevent distortion when stretching to container
    const { queueSharpOperation } = await import('../media/sharpQueue.js');
    const base64Thumbnail = await queueSharpOperation(() =>
      createBlurThumbnail(buffer)
    );

    // PHASE 1: Generate critical formats (WebP + original) for immediate display
    logger.info(
      `[UPLOAD] Phase 1: Generating critical formats (WebP + original)...`
    );
    const criticalStart = Date.now();

    // Use queue to limit concurrent Sharp operations (prevents CPU overload)
    // queueSharpOperation already imported above

    const [
      thumbnailWebpBuffer,
      smallWebpBuffer,
      regularWebpBuffer,
      webpFullBuffer,
      originalBuffer,
    ] = await Promise.all([
      // WebP sizes (critical for display) - queued to limit concurrency
      queueSharpOperation(() =>
        sharp(buffer).resize(200, 200, { fit: 'cover' }).webp().toBuffer()
      ),
      queueSharpOperation(() =>
        sharp(buffer).resize(500, 500, { fit: 'cover' }).webp().toBuffer()
      ),
      queueSharpOperation(() =>
        sharp(buffer).resize(1000, 1000, { fit: 'inside' }).webp().toBuffer()
      ),
      queueSharpOperation(() => sharp(buffer).webp().toBuffer()), // WebP version for display
      // Original buffer (unchanged) - no processing needed
      Promise.resolve(buffer), // Keep original buffer for true original file
    ]);

    // Upload critical formats to R2
    const [
      thumbWebp,
      smallWebp,
      regularWebp, // Full WebP remains uploaded for existing consumers; URL is not returned.
      ,
      original,
    ] = await Promise.all([
      uploadToR2(
        thumbnailWebpBuffer,
        `${bucket}/${filename}-thumbnail.webp`,
        'image/webp'
      ),
      uploadToR2(
        smallWebpBuffer,
        `${bucket}/${filename}-small.webp`,
        'image/webp'
      ),
      uploadToR2(
        regularWebpBuffer,
        `${bucket}/${filename}-regular.webp`,
        'image/webp'
      ),
      uploadToR2(webpFullBuffer, `${bucket}/${filename}.webp`, 'image/webp'), // WebP for display
      uploadToR2(
        originalBuffer,
        `${bucket}/${filename}-original.${originalExtension}`,
        originalContentType
      ), // True original
    ]);

    const criticalMs = Date.now() - criticalStart;
    logger.info(
      `[UPLOAD] Phase 1 complete in ${criticalMs}ms - Critical formats uploaded`
    );

    // Log file sizes for debugging
    logger.info(
      `[UPLOAD] File sizes - Original: ${(originalBuffer.length / 1024 / 1024).toFixed(2)}MB, WebP Full: ${(webpFullBuffer.length / 1024 / 1024).toFixed(2)}MB`
    );
    logger.info(
      `[UPLOAD] Original URL: ${original}, Extension: ${originalExtension}`
    );

    // Return critical formats immediately (image can appear now)
    // AVIF formats will be generated in background (Phase 2)
    return {
      publicId: filename,
      // WebP variants (used as universal modern fallback) - CRITICAL
      thumbnailUrl: thumbWebp,
      smallUrl: smallWebp,
      regularUrl: regularWebp,
      imageUrl: original, // True original file (JPG/PNG)
      base64Thumbnail, // Tiny base64 PNG for instant blur-up (like PHOTOCLOUD)
      // AVIF variants will be null initially, generated in background
      imageAvifUrl: null,
      thumbnailAvifUrl: null,
      smallAvifUrl: null,
      regularAvifUrl: null,
      // Flag to indicate AVIF generation is pending
      avifPending: true,
    };
  } catch (err) {
    console.error('uploadImageWithSizes failed:', err?.message);
    throw err;
  }
}

export async function generateAvifFormats(buffer, bucket, filename) {
  try {
    const { queueSharpOperation } = await import('../media/sharpQueue.js');
    logger.info(
      `[AVIF] Phase 2: Generating AVIF formats in background for ${filename}...`
    );
    const avifStart = Date.now();

    // Generate AVIF variants in parallel (optimized effort: 2-3 for faster encoding)
    const [
      thumbnailAvifBuffer,
      smallAvifBuffer,
      regularAvifBuffer,
      avifFullBuffer,
    ] = await Promise.all([
      // AVIF sizes (optimized effort: 2 for faster encoding, still good quality)
      queueSharpOperation(() =>
        sharp(buffer)
          .resize(200, 200, { fit: 'cover' })
          .avif({ quality: 50, effort: 2 })
          .toBuffer()
      ),
      queueSharpOperation(() =>
        sharp(buffer)
          .resize(500, 500, { fit: 'cover' })
          .avif({ quality: 50, effort: 2 })
          .toBuffer()
      ),
      queueSharpOperation(() =>
        sharp(buffer)
          .resize(1000, 1000, { fit: 'inside' })
          .avif({ quality: 50, effort: 2 })
          .toBuffer()
      ),
      queueSharpOperation(() =>
        sharp(buffer).avif({ quality: 55, effort: 3 }).toBuffer()
      ),
    ]);

    // Upload AVIF formats to R2
    const [thumbAvif, smallAvif, regularAvif, avifFull] = await Promise.all([
      uploadToR2(
        thumbnailAvifBuffer,
        `${bucket}/${filename}-thumbnail.avif`,
        'image/avif'
      ),
      uploadToR2(
        smallAvifBuffer,
        `${bucket}/${filename}-small.avif`,
        'image/avif'
      ),
      uploadToR2(
        regularAvifBuffer,
        `${bucket}/${filename}-regular.avif`,
        'image/avif'
      ),
      uploadToR2(avifFullBuffer, `${bucket}/${filename}.avif`, 'image/avif'),
    ]);

    const avifMs = Date.now() - avifStart;
    logger.info(
      `[AVIF] Phase 2 complete in ${avifMs}ms - AVIF formats uploaded for ${filename}`
    );

    return {
      imageAvifUrl: avifFull,
      thumbnailAvifUrl: thumbAvif,
      smallAvifUrl: smallAvif,
      regularAvifUrl: regularAvif,
    };
  } catch (err) {
    logger.error(
      `[AVIF] Failed to generate AVIF formats for ${filename}:`,
      err?.message
    );
    // Don't throw - AVIF is optional, WebP will be used as fallback
    return {
      imageAvifUrl: null,
      thumbnailAvifUrl: null,
      smallAvifUrl: null,
      regularAvifUrl: null,
    };
  }
}
