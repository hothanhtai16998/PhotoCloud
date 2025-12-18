import os from 'os';
import sharp from 'sharp';
import mongoose from 'mongoose';
import Image from '../models/Image.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { getObjectFromR2, uploadImageWithSizes, generateAvifFormats, deleteObjectByKey } from '../libs/s3.js';
import { streamToBuffer, extractMetadata } from '../utils/imageHelpers.js';
import { parseTags, validateCoordinates } from '../utils/imageHelpers.js';
import { clearCache } from '../middlewares/cacheMiddleware.js';
// AI tagging moved to background queue - see aiTaggingQueue.js
import { sendImageProcessingCompleteEmail } from '../utils/emailAlerts.js';

// Safe logger fallback
const log = (msg, data) => console.log(`[UPLOAD] ${msg}`, data || '');
const logError = (msg, data) => console.error(`[ERROR] ${msg}`, data || '');

// Configure sharp
const threadCount = Math.max(1, Math.floor(os.cpus().length / 2));
sharp.concurrency(threadCount);
log(`Sharp concurrency: ${threadCount} threads`);

export async function processUploadJob(job) {
    const jobStart = Date.now();
    const { uploadKey, userId, isAdmin, imageTitle, imageCategory, location, cameraModel, coordinates, tags } = job;

    try {
        // === Download raw file from R2 ===
        log(`📥 Downloading ${uploadKey}...`);
        const downloadStart = Date.now();
        const rawStream = await getObjectFromR2(uploadKey);
        if (!rawStream?.Body) throw new Error('Raw upload not found in R2');
        const buffer = await streamToBuffer(rawStream.Body);
        const downloadMs = Date.now() - downloadStart;
        log(`✅ Downloaded ${(buffer.length / 1024).toFixed(2)}KB in ${downloadMs}ms`);

        // Detect mimetype from file extension first (more reliable than R2 ContentType)
        // R2 ContentType can be incorrect, especially for GIFs
        const ext = uploadKey.split('.').pop()?.toLowerCase();
        const extToMime = {
            'gif': 'image/gif',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'webp': 'image/webp',
            'svg': 'image/svg+xml',
            'bmp': 'image/bmp',
            'ico': 'image/x-icon',
            'mp4': 'video/mp4',
            'webm': 'video/webm',
        };
        let mimetype = extToMime[ext] || rawStream.ContentType || null;
        
        // Log both detected values for debugging
        const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
        log(`📋 File: ${uploadKey}, Size: ${fileSizeMB}MB, Extension: ${ext || 'none'}, R2 ContentType: ${rawStream.ContentType || 'none'}, Final mimetype: ${mimetype || 'unknown'}`);

        // === Extract metadata ===
        log(`🔍 Extracting metadata...`);
        const metadataStart = Date.now();
        // Skip metadata extraction for videos and large GIFs (will be converted to video)
        const isVideoFile = mimetype?.startsWith('video/');
        const isLargeGif = mimetype === 'image/gif' && (buffer.length / (1024 * 1024)) > 2;
        const { dominantColors, exifData, dimensions } = (isVideoFile || isLargeGif) 
            ? { dominantColors: [], exifData: {}, dimensions: { width: null, height: null } }
            : await extractMetadata(buffer);
        const metadataMs = Date.now() - metadataStart;
        log(`✅ Metadata extracted in ${metadataMs}ms`);

        // === PHASE 1: Upload critical formats (WebP + original) ===
        log(`📤 Phase 1: Uploading critical formats (WebP + original)...`);
        const uploadStart = Date.now();
        const filename = uploadKey.replace(/[\/\\]/g, '-').replace(/^photo-app-raw-/, '').replace(/\.(gif|jpg|jpeg|png|webp|mp4|webm)$/i, '');
        const uploadResult = await uploadImageWithSizes(buffer, 'photo-app-images', filename, mimetype);
        const uploadMs = Date.now() - uploadStart;
        log(`✅ Phase 1 complete in ${uploadMs}ms - Critical formats uploaded (image can appear now)`);

        // === Create DB document ===
        log(`💾 Creating database record...`);
        const dbStart = Date.now();
        const parsedTags = parseTags(tags);
        // Use only user tags initially (AI tags will be added in background)
        const mergedTags = parsedTags;
        const parsedCoords = validateCoordinates(coordinates);

        const isVideo = uploadResult.isVideo || mimetype?.startsWith('video/') || false;
        
        // Convert category string to ObjectId if provided
        let categoryObjectId = undefined;
        if (imageCategory) {
            if (mongoose.Types.ObjectId.isValid(imageCategory)) {
                categoryObjectId = new mongoose.Types.ObjectId(imageCategory);
            } else {
                logError('Invalid category ObjectId:', imageCategory);
                categoryObjectId = undefined;
            }
        }
        
        // Convert userId string to ObjectId
        const userIdObjectId = mongoose.Types.ObjectId.isValid(userId) 
            ? new mongoose.Types.ObjectId(userId) 
            : userId;
        
        // Create image with critical formats first (WebP URLs, AVIF will be null initially)
        const newImage = await Image.create({
            imageUrl: uploadResult.imageUrl,
            base64Thumbnail: uploadResult.base64Thumbnail,
            thumbnailUrl: uploadResult.thumbnailUrl,
            smallUrl: uploadResult.smallUrl,
            regularUrl: uploadResult.regularUrl,
            // AVIF URLs will be null initially, updated in Phase 2
            imageAvifUrl: uploadResult.imageAvifUrl || null,
            thumbnailAvifUrl: uploadResult.thumbnailAvifUrl || null,
            smallAvifUrl: uploadResult.smallAvifUrl || null,
            regularAvifUrl: uploadResult.regularAvifUrl || null,
            publicId: uploadResult.publicId,
            imageTitle: imageTitle?.substring(0, 255) || undefined,
            imageCategory: categoryObjectId,
            uploadedBy: userIdObjectId,
            location: location?.trim() || undefined,
            coordinates: parsedCoords,
            // Image dimensions (extracted from Sharp metadata)
            width: dimensions?.width || undefined,
            height: dimensions?.height || undefined,
            cameraMake: exifData.cameraMake || undefined,
            cameraModel: exifData.cameraModel || cameraModel?.trim() || undefined,
            focalLength: exifData.focalLength || undefined,
            aperture: exifData.aperture || undefined,
            shutterSpeed: exifData.shutterSpeed || undefined,
            iso: exifData.iso || undefined,
            dominantColors: dominantColors?.length ? dominantColors : undefined,
            tags: mergedTags?.length ? mergedTags : undefined,
            moderationStatus: isAdmin ? 'approved' : 'pending',
            isModerated: !!isAdmin,
            // Video fields
            isVideo: isVideo,
            ...(isVideo && uploadResult.videoUrl ? {
                videoUrl: uploadResult.videoUrl,
                videoThumbnail: uploadResult.videoThumbnail || uploadResult.thumbnailUrl,
                videoDuration: uploadResult.videoDuration || undefined,
            } : {}),
            ...(isAdmin ? { moderatedAt: new Date(), moderatedBy: userId } : {}),
        });
        const dbMs = Date.now() - dbStart;
        log(`✅ Database record created in ${dbMs}ms`);

        // === Cleanup ===
        Promise.resolve(clearCache('/api/images')).catch(() => { });
        Promise.resolve(deleteObjectByKey(uploadKey)).catch(() => { });

        // === Notify user ===
        Promise.resolve(Notification.create({
            recipient: userId,
            type: 'upload_completed',
            image: newImage._id,
            metadata: { imageTitle },
        })).catch(() => { });

        // Send email notification (async, don't block)
        (async () => {
            try {
                const user = await User.findById(userId).select('email displayName username');
                if (user) {
                    await sendImageProcessingCompleteEmail(user, newImage);
                }
            } catch (error) {
                logError('Failed to send processing email', error);
            }
        })().catch(() => { });

        // === Schedule AI tagging in background ===
        if (!isVideoFile && !isLargeGif) {
            try {
                const { addAITaggingJob } = await import('./aiTaggingQueue.js');
                addAITaggingJob({
                    imageId: newImage._id.toString(),
                    buffer: buffer, // Keep buffer for AI tagging
                    mimetype: mimetype,
                    userTags: parsedTags,
                });
                log(`📋 AI tagging job queued for background processing`);
            } catch (error) {
                logError('Failed to queue AI tagging job (non-fatal)', error);
                // Continue - image upload succeeded
            }
        }

        const totalMs = Date.now() - jobStart;
        log(`🎉 PHASE 1 COMPLETE! Total: ${totalMs}ms (download: ${downloadMs}ms, metadata: ${metadataMs}ms, upload: ${uploadMs}ms, db: ${dbMs}ms)`);
        log(`📸 Image ${newImage._id} is now visible with WebP formats`);

        // === PHASE 2: Generate AVIF formats in background (non-blocking) ===
        // Only generate AVIF if not a video and not already generated
        if (!isVideo && !uploadResult.isVideo && uploadResult.avifPending) {
            // Generate AVIF formats asynchronously (don't block response)
            generateAvifFormats(buffer, 'photo-app-images', filename)
                .then((avifResult) => {
                    // Update image with AVIF URLs when ready
                    Image.findByIdAndUpdate(
                        newImage._id,
                        {
                            imageAvifUrl: avifResult.imageAvifUrl,
                            thumbnailAvifUrl: avifResult.thumbnailAvifUrl,
                            smallAvifUrl: avifResult.smallAvifUrl,
                            regularAvifUrl: avifResult.regularAvifUrl,
                        },
                        { new: true }
                    )
                        .then(() => {
                            log(`✅ PHASE 2 COMPLETE: AVIF formats generated and saved for image ${newImage._id}`);
                        })
                        .catch((err) => {
                            logError('Failed to update image with AVIF URLs', err);
                        });
                })
                .catch((err) => {
                    logError('Failed to generate AVIF formats (non-fatal)', err);
                    // Continue - WebP will be used as fallback
                });
        }

        return { ok: true, imageId: newImage._id };
    } catch (err) {
        // Notify user of failure (safe wrap)
        Promise.resolve(Notification.create({
            recipient: userId,
            type: 'upload_failed',
            metadata: { imageTitle, error: err?.message || 'Unknown error' },
        })).catch(() => { });

        throw err;
    }
}