import { asyncHandler } from '../middlewares/asyncHandler.js';
import User from '../models/User.js';
import Image from '../models/Image.js';
import Notification from '../models/Notification.js';
import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';
import { clearFavoritesCache } from '../middlewares/cacheMiddleware.js';

/**
 * Toggle favorite status for an image
 * POST /api/favorites/:imageId
 */
export const toggleFavorite = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { imageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(imageId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid image ID',
            errorCode: 'INVALID_ID',
        });
    }

    // Validate image exists
    const image = await Image.findById(imageId);
    if (!image) {
        return res.status(404).json({
            success: false,
            message: 'Ảnh không tồn tại',
            errorCode: 'IMAGE_NOT_FOUND',
        });
    }

    // Get user with favorites
    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
            errorCode: 'USER_NOT_FOUND',
        });
    }

    // Check if already favorited
    const isFavorited = user.favorites?.some(
        favId => favId.toString() === imageId
    ) || false;

    let updatedUser;
    let newFavoriteCount;
    
    if (isFavorited) {
        // Remove from favorites
        updatedUser = await User.findByIdAndUpdate(
            userId,
            { $pull: { favorites: imageId } },
            { new: true }
        ).select('favorites');

        // Decrement favorite count on image
        const updatedImage = await Image.findByIdAndUpdate(
            imageId,
            { $inc: { favoriteCount: -1 } },
            { new: true }
        ).select('favoriteCount');

        newFavoriteCount = updatedImage?.favoriteCount ?? 0;

        logger.info('Image removed from favorites', {
            userId,
            imageId,
            favoriteCount: newFavoriteCount,
        });
    } else {
        // Add to favorites
        updatedUser = await User.findByIdAndUpdate(
            userId,
            { $addToSet: { favorites: imageId } },
            { new: true }
        ).select('favorites');

        // Increment favorite count on image
        const updatedImage = await Image.findByIdAndUpdate(
            imageId,
            { $inc: { favoriteCount: 1 } },
            { new: true }
        ).select('favoriteCount');

        newFavoriteCount = updatedImage?.favoriteCount ?? 0;

        logger.info('Image added to favorites', {
            userId,
            imageId,
            favoriteCount: newFavoriteCount,
        });

        // Create notification for image owner (if different from user who favorited)
        if (image.uploadedBy && image.uploadedBy.toString() !== userId.toString()) {
            try {
                const { createAndEmitNotification } = await import('../utils/notificationEmitter.js');
                await createAndEmitNotification({
                    recipient: image.uploadedBy,
                    type: 'image_favorited',
                    image: imageId,
                    actor: userId,
                });
            } catch (notifError) {
                logger.error('Failed to create favorite notification:', notifError);
                // Don't fail the main operation if notification fails
            }
        }
    }

    // Emit WebSocket event for real-time favorite count updates
    try {
        const { emitImageFavoriteUpdate } = await import('../utils/socketServer.js');
        emitImageFavoriteUpdate(imageId, {
            imageId,
            favoriteCount: newFavoriteCount,
            actorId: userId.toString(),
            action: isFavorited ? 'unfavorited' : 'favorited',
        });
    } catch (wsError) {
        logger.error('Failed to emit favorite count update via WebSocket:', wsError);
        // Don't fail the request if WebSocket fails
    }

    // Clear cache for user's favorites endpoint to ensure fresh data on next fetch
    // This prevents stale cached data from being returned after toggling favorites
    // Use dedicated function that clears all favorites cache entries for this user
    try {
        const cleared = clearFavoritesCache(userId);
        if (cleared > 0) {
            logger.info('Cleared favorites cache', { 
                userId: userId.toString(), 
                entriesCleared: cleared 
            });
        }
    } catch (cacheError) {
        logger.error('Failed to clear favorites cache:', cacheError);
        // Don't fail the request if cache clear fails
    }

    res.status(200).json({
        success: true,
        isFavorited: !isFavorited,
        favoriteCount: newFavoriteCount,
        message: !isFavorited
            ? 'Image added to favorites'
            : 'Image removed from favorites',
    });
});

/**
 * Get user's favorite images
 * GET /api/favorites
 */
export const getFavorites = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100);
    const skip = (page - 1) * limit;

    // Get user with favorites
    const user = await User.findById(userId).select('favorites');
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
            errorCode: 'USER_NOT_FOUND',
        });
    }

    const favoriteIds = user.favorites || [];
    const total = favoriteIds.length;

    // Get favorite images with pagination
    // For favorites page, show ALL favorites regardless of category status
    // Users should be able to see all their saved favorites
    // IMPORTANT: Sort by the order in user.favorites array (most recently favorited first)
    // The favorites array maintains insertion order, so reverse it to get newest first
    const reversedFavoriteIds = [...favoriteIds].reverse();
    
    const images = await Image.find({
        _id: { $in: favoriteIds },
    })
        .populate('uploadedBy', 'username displayName avatarUrl')
        .populate({
            path: 'imageCategory',
            select: 'name description isActive',
            // Don't filter by isActive - show all favorites even if category is inactive
        })
        .lean();
    
    // Sort images by their position in the reversed favorites array (most recent first)
    // Create a map for O(1) lookup
    const idToIndex = new Map();
    reversedFavoriteIds.forEach((id, index) => {
        idToIndex.set(id.toString(), index);
    });
    
    // Sort images by their position in the favorites array
    const sortedImages = images.sort((a, b) => {
        const indexA = idToIndex.get(a._id.toString()) ?? Infinity;
        const indexB = idToIndex.get(b._id.toString()) ?? Infinity;
        return indexA - indexB;
    });
    
    // Apply pagination after sorting
    const paginatedImages = sortedImages.slice(skip, skip + limit);

    res.status(200).json({
        success: true,
        images: paginatedImages,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    });
});

/**
 * Check if images are favorited by user
 * POST /api/favorites/check
 * Body: { imageIds: [string] }
 */
export const checkFavorites = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { imageIds } = req.body;

    if (!Array.isArray(imageIds) || imageIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'imageIds must be a non-empty array',
            errorCode: 'INVALID_INPUT',
        });
    }

    // Validate MongoDB ObjectId format for all imageIds
    // Use regex to validate format before attempting Mongoose validation
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    const validImageIds = [];
    const invalidImageIds = [];

    imageIds.forEach((imageId) => {
        const idString = String(imageId).trim();
        const matchesRegex = objectIdRegex.test(idString);
        const isValidMongoose = mongoose.Types.ObjectId.isValid(idString);

        // First check format with regex, then validate with Mongoose
        if (matchesRegex && isValidMongoose) {
            validImageIds.push(idString);
        } else {
            invalidImageIds.push(idString);
            logger.warn('Invalid imageId format in checkFavorites', { imageId: idString });
        }
    });

    if (validImageIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'All imageIds must be valid MongoDB ObjectIds',
            errorCode: 'INVALID_ID',
            invalidIds: invalidImageIds,
        });
    }

    // Get user with favorites
    const user = await User.findById(userId).select('favorites');
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
            errorCode: 'USER_NOT_FOUND',
        });
    }

    const favoriteIds = (user.favorites || []).map(id => id.toString());

    // Create map of favorited image IDs (only for valid IDs)
    const favoritesMap = {};
    validImageIds.forEach(imageId => {
        // Compare as strings to avoid ObjectId casting issues
        favoritesMap[imageId] = favoriteIds.some(favId => favId === imageId || String(favId) === String(imageId));
    });

    // Include invalid IDs as false in the response
    invalidImageIds.forEach(imageId => {
        favoritesMap[imageId] = false;
    });

    res.status(200).json({
        success: true,
        favorites: favoritesMap,
    });
});

