import mongoose from 'mongoose';
import Image from '../../models/Image.js';
import Category from '../../models/Category.js';
import User from '../../models/User.js';
import Notification from '../../models/Notification.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { logger } from '../../utils/logger.js';
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
import { deleteImageFromR2 } from '../../libs/s3.js';
import { clearCache } from '../../middlewares/cacheMiddleware.js';

// Image Management
export const getAllImagesAdmin = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('viewImages') middleware

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100);
    const skip = (page - 1) * limit;
    const search = String(req.query.search || '').trim();
    const category = String(req.query.category || '').trim();
    const userId = String(req.query.userId || '').trim();

    const query = {};

    if (search) {
        const esc = escapeRegex(String(search || '').trim());
        query.$or = [
            { imageTitle: { $regex: esc, $options: 'i' } },
            { location: { $regex: esc, $options: 'i' } },
        ];
    }

    if (category) {
        // Find category by name (case-insensitive)
        const escaped = escapeRegex(String(category || '').trim());
        const categoryDoc = await Category.findOne({
            name: { $regex: new RegExp(`^${escaped}$`, 'i') },
            isActive: true,
        });
        if (categoryDoc) {
            // Strictly match only this category ID
            query.imageCategory = categoryDoc._id;
        } else {
            // If category not found, return empty results
            return res.status(200).json({
                images: [],
                pagination: {
                    page,
                    limit,
                    total: 0,
                    pages: 0,
                },
            });
        }
    }
    // For admin page, show all images including pending ones without categories
    // Only filter by category if a specific category filter is applied
    // This allows admins to see pending images that need category assignment

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        query.uploadedBy = userId;
    }

    const [imagesRaw, total] = await Promise.all([
        Image.find(query)
            .populate('uploadedBy', 'username displayName email')
            .populate('imageCategory', 'name description')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Image.countDocuments(query),
    ]);

    // Handle images with invalid or missing category references
    let images = imagesRaw.map(img => ({
        ...img,
        // Ensure imageCategory is either an object with name or null
        imageCategory: (img.imageCategory && typeof img.imageCategory === 'object' && img.imageCategory.name)
            ? img.imageCategory
            : null
    }));

    // Additional validation: If category filter was applied, ensure populated category name matches
    // This catches any edge cases where ObjectId might match but category name doesn't
    // This is a safety net to ensure images only appear in their correct category
    if (category) {
        const normalizedCategory = String(category || '').toLowerCase().trim();
        images = images.filter(img => {
            if (!img.imageCategory || typeof img.imageCategory !== 'object' || !img.imageCategory.name) {
                return false; // Filter out images with invalid categories
            }
            // Case-insensitive match to ensure exact category match
            return String(img.imageCategory.name || '').toLowerCase().trim() === normalizedCategory;
        });
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

export const deleteImage = asyncHandler(async (req, res) => {
    const { imageId } = req.params;

    // Permission check is handled by requirePermission('deleteImages') middleware

    if (!mongoose.Types.ObjectId.isValid(imageId)) {
        return res.status(400).json({ message: 'Invalid image ID' });
    }

    const image = await Image.findById(imageId);

    if (!image) {
        return res.status(404).json({
            message: 'Không tìm thấy ảnh',
        });
    }

    // Delete from R2
    try {
        await deleteImageFromR2(image.publicId, 'photo-app-images');
    } catch (error) {
        logger.warn(`Lỗi không thể xoá ảnh ${image.publicId} từ S3:`, error);
    }

    // Remove image from all users' favorites
    await User.updateMany(
        { favorites: imageId },
        { $pull: { favorites: imageId } }
    );

    // Create image_removed_admin notification for image owner
    if (image.uploadedBy) {
        try {
            await Notification.create({
                recipient: image.uploadedBy,
                type: 'image_removed_admin',
                image: imageId,
                actor: req.user._id,
                metadata: {
                    imageTitle: image.imageTitle,
                    reason: 'Removed by admin',
                },
            });
        } catch (notifError) {
            logger.error('Failed to create image removed notification:', notifError);
            // Don't fail the deletion if notification fails
        }
    }

    // Delete from database
    await Image.findByIdAndDelete(imageId);

    // Clear ALL cache entries for images endpoint (including all query variations)
    // This ensures deleted image doesn't appear in any cached responses
    clearCache('/api/images');

    res.status(200).json({
        message: 'Xoá ảnh thành công',
    });
});

// Update image (location, title, etc.)
export const updateImage = asyncHandler(async (req, res) => {
    const { imageId } = req.params;
    const { location, coordinates, imageTitle, cameraModel, imageCategory } = req.body;

    // Permission check is handled by requirePermission('editImages') middleware

    if (!mongoose.Types.ObjectId.isValid(imageId)) {
        return res.status(400).json({ message: 'Invalid image ID' });
    }

    const image = await Image.findById(imageId);

    if (!image) {
        return res.status(404).json({
            message: 'Không tìm thấy ảnh',
        });
    }

    // Build update object
    const updateData = {};

    if (location !== undefined) {
        const loc = String(location || '').trim();
        updateData.location = loc.length ? loc : null;
    }

    if (coordinates !== undefined) {
        // Parse and validate coordinates if provided
        let parsedCoordinates;
        if (coordinates) {
            try {
                parsedCoordinates = typeof coordinates === 'string' ? JSON.parse(coordinates) : coordinates;
                const latRaw = parsedCoordinates?.latitude;
                const lngRaw = parsedCoordinates?.longitude;
                const lat = latRaw !== undefined ? parseFloat(latRaw) : NaN;
                const lng = lngRaw !== undefined ? parseFloat(lngRaw) : NaN;
                if (!Number.isNaN(lat) && !Number.isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                    updateData.coordinates = { latitude: lat, longitude: lng };
                }
            } catch (error) {
                logger.warn('Invalid coordinates format:', error);
            }
        } else {
            updateData.coordinates = null;
        }
    }

    if (imageTitle !== undefined) {
        updateData.imageTitle = String(imageTitle || image.imageTitle).trim();
    }

    if (cameraModel !== undefined) {
        const cm = String(cameraModel || '').trim();
        updateData.cameraModel = cm.length ? cm : null;
    }

    if (imageCategory !== undefined) {
        // Handle category update: can be ObjectId string, null, or empty string
        if (imageCategory === null || imageCategory === '') {
            updateData.imageCategory = null;
        } else if (mongoose.Types.ObjectId.isValid(imageCategory)) {
            // Verify category exists and is active
            const category = await Category.findById(imageCategory);
            if (!category) {
                return res.status(400).json({ message: 'Category not found' });
            }
            if (!category.isActive) {
                return res.status(400).json({ message: 'Category is not active' });
            }
            updateData.imageCategory = new mongoose.Types.ObjectId(imageCategory);
        } else {
            return res.status(400).json({ message: 'Invalid category ID' });
        }
    }

    // Update image
    const updatedImage = await Image.findByIdAndUpdate(
        imageId,
        { $set: updateData },
        { new: true, runValidators: true }
    )
        .populate('uploadedBy', 'username displayName avatarUrl')
        .populate('imageCategory', 'name description')
        .lean();

    // Clear cache for images endpoint
    clearCache('/api/images');

    res.status(200).json({
        message: 'Cập nhật ảnh thành công',
        image: updatedImage,
    });
});

// Moderate Image
export const moderateImage = asyncHandler(async (req, res) => {
    const { imageId } = req.params;
    const { status, notes } = req.body; // status: 'approved', 'rejected', 'flagged'

    // Permission check is handled by requirePermission('moderateImages') middleware

    if (!['approved', 'rejected', 'flagged'].includes(status)) {
        return res.status(400).json({
            message: 'Trạng thái kiểm duyệt không hợp lệ. Phải là: approved, rejected, hoặc flagged',
        });
    }

    if (!mongoose.Types.ObjectId.isValid(imageId)) {
        return res.status(400).json({ message: 'Invalid image ID' });
    }

    const image = await Image.findById(imageId);

    if (!image) {
        return res.status(404).json({
            message: 'Không tìm thấy ảnh',
        });
    }

    // Update moderation status
    image.isModerated = true;
    image.moderationStatus = status;
    image.moderatedAt = new Date();
    image.moderatedBy = req.user._id;
    image.moderationNotes = notes !== undefined ? String(notes).trim() || undefined : undefined;
    await image.save();

    res.status(200).json({
        message: 'Kiểm duyệt ảnh thành công',
        image: {
            _id: image._id,
            imageTitle: image.imageTitle,
            moderationStatus: image.moderationStatus,
            moderatedAt: image.moderatedAt,
            moderationNotes: image.moderationNotes,
        },
    });
});

