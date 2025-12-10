import mongoose from 'mongoose';
import { getImageFromR2 } from '../../libs/s3.js';
import Image from '../../models/Image.js';
import Notification from '../../models/Notification.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { logger } from '../../utils/logger.js';
import { PAGINATION } from '../../utils/constants.js';
import { clearCache } from '../../middlewares/cacheMiddleware.js';

// Validation constants
const FOCAL_LENGTH_MAX = 10000; // mm
const APERTURE_MAX = 128; // f-stop
const ISO_MAX = 25600; // typical max
const TAG_MAX_LENGTH = 50;
const TAG_MAX_COUNT = 20;

export const getImagesByUserId = asyncHandler(async (req, res) => {
    const userId = req.params.userId;

    // Validate userId is ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
    }

    const page = Math.max(1, parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE);
    const limit = Math.min(
        Math.max(1, parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT),
        PAGINATION.MAX_LIMIT
    );
    const skip = (page - 1) * limit;

    const [imagesRaw, total] = await Promise.all([
        Image.find({ uploadedBy: userId })
            .populate('uploadedBy', 'username displayName avatarUrl')
            .populate({
                path: 'imageCategory',
                select: 'name description',
                justOne: true
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Image.countDocuments({ uploadedBy: userId }),
    ]);

    // Handle images with invalid or missing category references
    const images = imagesRaw.map(img => {
        // Convert dailyViews and dailyDownloads Maps to plain objects
        let dailyViewsObj = {};
        if (img.dailyViews) {
            dailyViewsObj = img.dailyViews instanceof Map
                ? Object.fromEntries(img.dailyViews)
                : img.dailyViews;
        }

        let dailyDownloadsObj = {};
        if (img.dailyDownloads) {
            dailyDownloadsObj = img.dailyDownloads instanceof Map
                ? Object.fromEntries(img.dailyDownloads)
                : img.dailyDownloads;
        }

        return {
            ...img,
            imageCategory: (img.imageCategory && typeof img.imageCategory === 'object' && img.imageCategory.name)
                ? img.imageCategory
                : null,
            dailyViews: dailyViewsObj,
            dailyDownloads: dailyDownloadsObj,
        };
    });

    // Set cache headers
    const hasCacheBust = req.query._t;
    if (hasCacheBust) {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
        res.set('Cache-Control', 'public, max-age=30');
    }

    res.status(200).json({
        images,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    });
});

// Get a single image by ID
export const getImageById = asyncHandler(async (req, res) => {
    const imageId = req.params.imageId;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(imageId)) {
        return res.status(400).json({
            message: 'Invalid image ID format',
        });
    }

    // Always use ObjectId lookup (more efficient than aggregation)
    const image = await Image.findById(imageId)
        .populate('uploadedBy', 'username displayName avatarUrl')
        .populate({
            path: 'imageCategory',
            select: 'name description',
            justOne: true
        })
        .lean();

    if (!image) {
        return res.status(404).json({
            message: 'Image not found',
        });
    }

    res.status(200).json({
        image,
    });
});

// Download image - proxy from R2 to avoid CORS issues
export const downloadImage = asyncHandler(async (req, res) => {
    const imageId = req.params.imageId;
    const userId = req.user?._id;
    const size = req.query.size || 'medium';

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(imageId)) {
        return res.status(400).json({
            message: 'Invalid image ID',
        });
    }

    // Find the image (only fetch needed fields)
    const image = await Image.findById(imageId)
        .select('imageTitle imageUrl regularUrl smallUrl uploadedBy')
        .lean();

    if (!image) {
        return res.status(404).json({
            message: 'Image not found',
        });
    }

    try {
        // Map size parameter to image URL
        let imageUrl;
        switch (size.toLowerCase()) {
            case 'small':
                imageUrl = image.smallUrl || image.regularUrl || image.imageUrl;
                break;
            case 'medium':
                imageUrl = image.regularUrl || image.imageUrl || image.smallUrl;
                break;
            case 'large':
            case 'original':
                imageUrl = image.imageUrl || image.regularUrl || image.smallUrl;
                break;
            default:
                imageUrl = image.regularUrl || image.imageUrl || image.smallUrl;
        }

        if (!imageUrl) {
            return res.status(404).json({
                message: 'Image URL not found',
            });
        }

        // Get image from R2
        const r2Response = await getImageFromR2(imageUrl);

        // Set response headers
        const sanitizedTitle = (image.imageTitle || 'photo').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const urlExtension = imageUrl.match(/\.([a-z]+)(?:\?|$)/i)?.[1] || 'webp';
        const fileName = `${sanitizedTitle}.${urlExtension}`;

        res.setHeader('Content-Type', r2Response.ContentType);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        if (r2Response.ContentLength) {
            res.setHeader('Content-Length', r2Response.ContentLength);
        }
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

        // Create notification for image owner (async, don't wait)
        if (userId && image.uploadedBy) {
            const uploadedById = image.uploadedBy.toString();
            if (uploadedById !== userId.toString()) {
                Notification.create({
                    recipient: uploadedById,
                    type: 'image_downloaded',
                    image: imageId,
                    actor: userId,
                }).catch(err => {
                    logger.error('Failed to create download notification', { err: err.message });
                });
            }
        }

        // Stream the image to response
        r2Response.Body.pipe(res);

        // Handle stream errors (only if headers not sent)
        r2Response.Body.on('error', (streamError) => {
            logger.error('Stream error', { imageId, error: streamError.message });
            if (!res.headersSent) {
                res.status(500).json({ message: 'Failed to download image' });
            } else {
                res.destroy(); // Destroy response if headers already sent
            }
        });

        // Handle client disconnect
        res.on('close', () => {
            if (r2Response.Body?.destroy) {
                r2Response.Body.destroy();
            }
        });
    } catch (error) {
        logger.error('Download error', { imageId, error: error.message });
        if (!res.headersSent) {
            res.status(500).json({ message: 'Failed to download image' });
        }
    }
});

// Update image information
export const updateImage = asyncHandler(async (req, res) => {
    const imageId = req.params.imageId;
    const userId = req.user?._id;
    const { imageTitle, description, location, coordinates, cameraModel, cameraMake, focalLength, aperture, shutterSpeed, iso, tags } = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(imageId)) {
        return res.status(400).json({
            message: 'Invalid image ID',
        });
    }

    // Find the image
    const image = await Image.findById(imageId).select('uploadedBy');
    if (!image) {
        return res.status(404).json({
            message: 'Image not found',
        });
    }

    // Check permissions
    const isOwner = image.uploadedBy.toString() === userId?.toString();
    const isAdmin = req.user?.isAdmin || req.user?.isSuperAdmin;

    if (!isOwner && !isAdmin) {
        return res.status(403).json({
            message: 'Unauthorized to edit this image',
        });
    }

    // Build update object with validation
    const updateData = {};

    if (imageTitle !== undefined) {
        updateData.imageTitle = String(imageTitle || '').trim().substring(0, 255);
    }

    if (description !== undefined) {
        const desc = String(description || '').trim();
        updateData.description = desc.length ? desc.substring(0, 600) : null;
    }

    if (location !== undefined) {
        const loc = String(location || '').trim();
        updateData.location = loc.length ? loc.substring(0, 200) : null;
    }

    if (coordinates !== undefined) {
        const latRaw = coordinates?.latitude;
        const lonRaw = coordinates?.longitude;
        const lat = latRaw !== undefined ? parseFloat(latRaw) : NaN;
        const lon = lonRaw !== undefined ? parseFloat(lonRaw) : NaN;

        if (!Number.isNaN(lat) && !Number.isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            updateData.coordinates = { latitude: lat, longitude: lon };
        } else {
            updateData.coordinates = null;
        }
    }

    if (cameraMake !== undefined) {
        const make = String(cameraMake || '').trim();
        updateData.cameraMake = make.length ? make.substring(0, 100) : null;
    }

    if (cameraModel !== undefined) {
        const model = String(cameraModel || '').trim();
        updateData.cameraModel = model.length ? model.substring(0, 100) : null;
    }

    if (focalLength !== undefined) {
        const focalValue = typeof focalLength === 'string' ? parseFloat(focalLength) : focalLength;
        if (!Number.isNaN(focalValue) && focalValue > 0 && focalValue <= FOCAL_LENGTH_MAX) {
            updateData.focalLength = Math.round(focalValue * 10) / 10;
        } else {
            updateData.focalLength = null;
        }
    }

    if (aperture !== undefined) {
        const apertureValue = typeof aperture === 'string' ? parseFloat(aperture) : aperture;
        if (!Number.isNaN(apertureValue) && apertureValue > 0 && apertureValue <= APERTURE_MAX) {
            updateData.aperture = Math.round(apertureValue * 10) / 10;
        } else {
            updateData.aperture = null;
        }
    }

    if (shutterSpeed !== undefined) {
        const s = String(shutterSpeed || '').trim();
        updateData.shutterSpeed = s.length ? s.substring(0, 50) : null;
    }

    if (iso !== undefined) {
        const isoValue = typeof iso === 'string' ? parseInt(iso, 10) : iso;
        if (!Number.isNaN(isoValue) && isoValue > 0 && isoValue <= ISO_MAX) {
            updateData.iso = Math.round(isoValue);
        } else {
            updateData.iso = null;
        }
    }

    if (tags !== undefined) {
        // Parse tags with efficient duplicate removal using Set
        let tagsArray = [];

        if (Array.isArray(tags)) {
            tagsArray = tags;
        } else if (typeof tags === 'string') {
            try {
                tagsArray = JSON.parse(tags);
                if (!Array.isArray(tagsArray)) tagsArray = [];
            } catch {
                tagsArray = [];
            }
        }

        // Clean tags: trim, lowercase, remove duplicates (using Set for O(n)), max 20
        const uniqueTags = new Set();
        const parsedTags = tagsArray
            .map(tag => (typeof tag === 'string' ? tag : String(tag)).trim().toLowerCase())
            .filter(tag => tag.length > 0 && tag.length <= TAG_MAX_LENGTH)
            .filter(tag => {
                if (uniqueTags.has(tag)) return false;
                uniqueTags.add(tag);
                return true;
            })
            .slice(0, TAG_MAX_COUNT);

        updateData.tags = parsedTags;
    }

    // Update the image
    const updatedImage = await Image.findByIdAndUpdate(
        imageId,
        { $set: updateData },
        { new: true, runValidators: true }
    )
        .populate('uploadedBy', 'username displayName avatarUrl')
        .populate({
            path: 'imageCategory',
            select: 'name description',
            justOne: true
        })
        .lean();

    // Clear caches (user's images and this specific image)
    clearCache(`/api/images/${imageId}`);
    clearCache(`/api/images/user/${userId}`);

    res.status(200).json({
        message: 'Image updated successfully',
        image: updatedImage,
    });
});

