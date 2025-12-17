import mongoose from 'mongoose';
import crypto from 'crypto';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import Image from '../../models/Image.js';
import Settings from '../../models/Settings.js';
import { uploadImageWithSizes, deleteImageFromR2 } from '../../libs/s3.js';
import { extractDominantColors } from '../../utils/colorExtractor.js';
import { clearCache } from '../../middlewares/cacheMiddleware.js';
import { logger } from '../../utils/logger.js';

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB
const CONCURRENCY = 5; // batch concurrency

import { getExtensionsFromMimeType, validateFileType } from '../../utils/fileTypeUtils.js';

async function replaceSingleImage({ imageId, fileBuffer, mimetype, fileSize, userId, isAdmin, index, allowedFileTypes }) {
    if (!mongoose.Types.ObjectId.isValid(imageId)) {
        return { ok: false, imageId, error: 'Invalid imageId' };
    }

    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
        return { ok: false, imageId, error: 'No file buffer provided' };
    }

    if (!mimetype || !mimetype.startsWith('image/')) {
        return { ok: false, imageId, error: 'Invalid file type' };
    }

    // Validate file type against settings (if provided)
    if (allowedFileTypes) {
        if (!validateFileType(mimetype, `image.${mimetype.split('/')[1] || 'jpg'}`, allowedFileTypes)) {
            const allowedExtensions = Array.isArray(allowedFileTypes) 
                ? allowedFileTypes.map(t => t.toLowerCase())
                : allowedFileTypes.split(',').map(t => t.trim().toLowerCase());
            return { ok: false, imageId, error: `File type not allowed. Allowed types: ${allowedExtensions.join(', ')}` };
        }
    }

    if (typeof fileSize === 'number' && fileSize > MAX_FILE_BYTES) {
        return { ok: false, imageId, error: 'File too large' };
    }

    const image = await Image.findById(imageId).select('uploadedBy publicId').lean();
    if (!image) return { ok: false, imageId, error: 'Image not found' };

    const isOwner = image.uploadedBy?.toString() === userId?.toString();
    if (!isOwner && !isAdmin) return { ok: false, imageId, error: 'No permission to replace this image' };

    let uploadResult;
    try {
        // Best-effort: delete old S3 object (don't fail replace if delete fails)
        if (image.publicId) {
            deleteImageFromR2(image.publicId, 'photo-app-images').catch(err => {
                logger.warn('Failed to delete old image from R2 (non-fatal):', err.message);
            });
        }

        const filename = `image-${Date.now()}-${crypto.randomBytes(8).toString('hex')}-${index}`;

        // Upload and extract colors in parallel
        const [uploadRes, colors] = await Promise.all([
            uploadImageWithSizes(fileBuffer, 'photo-app-images', filename, mimetype),
            extractDominantColors(fileBuffer, 3).catch(err => {
                logger.warn('Color extraction failed (non-fatal):', err.message);
                return [];
            })
        ]);

        uploadResult = uploadRes;

        const update = {
            imageUrl: uploadResult.imageUrl,
            thumbnailUrl: uploadResult.thumbnailUrl,
            smallUrl: uploadResult.smallUrl,
            regularUrl: uploadResult.regularUrl,
            imageAvifUrl: uploadResult.imageAvifUrl,
            thumbnailAvifUrl: uploadResult.thumbnailAvifUrl,
            smallAvifUrl: uploadResult.smallAvifUrl,
            regularAvifUrl: uploadResult.regularAvifUrl,
            publicId: uploadResult.publicId,
            width: uploadResult.width,
            height: uploadResult.height,
            dominantColors: Array.isArray(colors) && colors.length ? colors : undefined,
            updatedAt: new Date(),
        };

        const updated = await Image.findByIdAndUpdate(
            imageId,
            { $set: update },
            { new: true, runValidators: true }
        )
            .populate('uploadedBy', 'username displayName avatarUrl')
            .populate({ path: 'imageCategory', select: 'name description', justOne: true })
            .lean();

        // Clear caches for this image
        clearCache(`/api/images/${imageId}`).catch(() => { });
        clearCache('/api/images').catch(() => { }); // update listing caches as well

        return { ok: true, image: updated };
    } catch (err) {
        logger.error('replaceSingleImage error', { imageId, error: err.message });

        // rollback uploaded assets if any
        if (uploadResult?.publicId) {
            deleteImageFromR2(uploadResult.publicId, 'photo-app-images').catch(e => {
                logger.error('Rollback delete failed', { publicId: uploadResult.publicId, error: e.message });
            });
        }

        return { ok: false, imageId, error: err.message || 'Unknown error' };
    }
}

export const replaceImage = asyncHandler(async (req, res) => {
    const imageId = req.params.imageId;
    const userId = req.user?._id;
    const isAdmin = req.user?.isAdmin || req.user?.isSuperAdmin;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Quick validation of imageId format
    if (!mongoose.Types.ObjectId.isValid(imageId)) {
        return res.status(400).json({ success: false, message: 'Invalid imageId' });
    }

    // Get settings for file type validation
    const systemSettings = await Settings.findOne({ key: 'system' });
    const allowedFileTypes = systemSettings?.value?.allowedFileTypes || ['jpg', 'jpeg', 'png', 'webp'];

    const result = await replaceSingleImage({
        imageId,
        fileBuffer: file.buffer,
        mimetype: file.mimetype,
        fileSize: file.size,
        userId,
        isAdmin,
        index: 0,
        allowedFileTypes
    });

    if (!result.ok) {
        return res.status(400).json({ success: false, message: result.error });
    }

    res.json({ success: true, message: 'Image replaced', image: result.image });
});

export const batchReplaceImages = asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    const isAdmin = req.user?.isAdmin || req.user?.isSuperAdmin;
    const files = req.files || [];
    let imageIds = req.body.imageIds || req.body.ids || req.body.imageIdList;

    // Normalize imageIds to array
    if (typeof imageIds === 'string') {
        try {
            imageIds = JSON.parse(imageIds);
        } catch {
            imageIds = imageIds.split(',').map(s => s.trim()).filter(Boolean);
        }
    }
    if (!Array.isArray(imageIds)) imageIds = [];

    // Pre-validate imageIds to avoid starting work on malformed ids
    const invalidIds = imageIds.filter(id => !mongoose.Types.ObjectId.isValid(String(id || '')));
    if (invalidIds.length > 0) {
        return res.status(400).json({ success: false, message: 'One or more imageIds are invalid', invalidIds });
    }

    if (imageIds.length === 0 || files.length === 0) {
        return res.status(400).json({ success: false, message: 'imageIds and files are required' });
    }

    if (files.length !== imageIds.length) {
        return res.status(400).json({ success: false, message: 'Number of files must match number of imageIds' });
    }

    // Get settings for file type validation (once for all files)
    const systemSettings = await Settings.findOne({ key: 'system' });
    const allowedFileTypes = systemSettings?.value?.allowedFileTypes || ['jpg', 'jpeg', 'png', 'webp'];

    const tasks = [];
    for (let i = 0; i < files.length; i++) {
        tasks.push({
            imageId: imageIds[i],
            file: files[i],
            index: i
        });
    }

    const results = [];
    // Process in chunks to limit concurrency
    for (let i = 0; i < tasks.length; i += CONCURRENCY) {
        const chunk = tasks.slice(i, i + CONCURRENCY);
        const promises = chunk.map(t =>
            replaceSingleImage({
                imageId: t.imageId,
                fileBuffer: t.file.buffer,
                mimetype: t.file.mimetype,
                fileSize: t.file.size,
                userId,
                isAdmin,
                index: t.index,
                allowedFileTypes
            })
        );
        // wait for chunk
        // use allSettled to ensure all in chunk complete
        // then push results
        //noinspection ES6MissingAwait
        const settled = await Promise.allSettled(promises);
        for (const r of settled) {
            if (r.status === 'fulfilled') results.push(r.value);
            else results.push({ ok: false, error: r.reason?.message || String(r.reason) });
        }
    }

    const successes = results.filter(r => r.ok).map(r => r.image);
    const failures = results.filter(r => !r.ok).map(r => ({ imageId: r.imageId, error: r.error }));

    // Clear listing cache once more to ensure UI sees updates
    clearCache('/api/images').catch(() => { });

    res.json({
        success: true,
        summary: {
            total: results.length,
            updated: successes.length,
            failed: failures.length,
        },
        updated: successes,
        failures,
    });
});

