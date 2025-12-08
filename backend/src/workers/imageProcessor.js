import os from 'os';
import sharp from 'sharp';
import mongoose from 'mongoose';
import Image from '../models/Image.js';
import Notification from '../models/Notification.js';
import { getObjectFromR2, uploadImageWithSizes, deleteObjectByKey } from '../libs/s3.js';
import { streamToBuffer, extractMetadata } from '../utils/imageHelpers.js';
import { parseTags, validateCoordinates } from '../utils/imageHelpers.js';
import { clearCache } from '../middlewares/cacheMiddleware.js';

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

        // === Upload processed sizes ===
        log(`📤 Uploading resized images to R2...`);
        const uploadStart = Date.now();
        const filename = uploadKey.replace(/[\/\\]/g, '-').replace(/^photo-app-raw-/, '').replace(/\.(gif|jpg|jpeg|png|webp|mp4|webm)$/i, '');
        const uploadResult = await uploadImageWithSizes(buffer, 'photo-app-images', filename, mimetype);
        const uploadMs = Date.now() - uploadStart;
        log(`✅ Uploaded to R2 in ${uploadMs}ms`);

        // === Create DB document ===
        log(`💾 Creating database record...`);
        const dbStart = Date.now();
        const parsedTags = parseTags(tags);
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
        
        const newImage = await Image.create({
            imageUrl: uploadResult.imageUrl,
            base64Thumbnail: uploadResult.base64Thumbnail,
            thumbnailUrl: uploadResult.thumbnailUrl,
            smallUrl: uploadResult.smallUrl,
            regularUrl: uploadResult.regularUrl,
            imageAvifUrl: uploadResult.imageAvifUrl,
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
            tags: parsedTags?.length ? parsedTags : undefined,
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

        const totalMs = Date.now() - jobStart;
        log(`🎉 COMPLETE! Total: ${totalMs}ms (download: ${downloadMs}ms, metadata: ${metadataMs}ms, upload: ${uploadMs}ms, db: ${dbMs}ms)`);

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