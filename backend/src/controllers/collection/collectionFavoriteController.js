import { asyncHandler } from '../../middlewares/asyncHandler.js';
import User from '../../models/User.js';
import Collection from '../../models/Collection.js';
import Notification from '../../models/Notification.js';
import mongoose from 'mongoose';
import { logger } from '../../utils/logger.js';
import { publicImageFilter } from '../../utils/publicImageFilter.js';
import { hasPermission } from '../../utils/collectionAccess.js';

/**
 * Toggle favorite status for a collection
 * POST /api/collection-favorites/:collectionId
 */
export const toggleCollectionFavorite = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    let { collectionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(collectionId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid collection ID',
            errorCode: 'INVALID_ID',
        });
    }

    collectionId = new mongoose.Types.ObjectId(collectionId).toHexString();
    // Being able to guess an ID must not grant access to a private collection.
    const collection = await Collection.findOne({
        _id: collectionId,
        $or: [{ isPublic: true }, { createdBy: userId }, { 'collaborators.user': userId }],
    });
    if (!collection) {
        return res.status(404).json({
            success: false,
            message: 'Collection not found',
            errorCode: 'COLLECTION_NOT_FOUND',
        });
    }

    const collectionObjectId = new mongoose.Types.ObjectId(collectionId);
    const favorites = { $ifNull: ['$favoriteCollections', []] };
    // Each toggle uses the state at the write itself, not a separate stale read.
    const user = await User.findByIdAndUpdate(userId, [{
        $set: {
            favoriteCollections: {
                $cond: [
                    { $in: [collectionObjectId, favorites] },
                    { $filter: { input: favorites, as: 'favoriteId', cond: { $ne: ['$$favoriteId', collectionObjectId] } } },
                    { $concatArrays: [favorites, [collectionObjectId]] },
                ],
            },
        },
    }], { new: false }).select('favoriteCollections');
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found', errorCode: 'USER_NOT_FOUND' });
    }
    const isFavorited = user.favoriteCollections?.some(id => id.toString() === collectionId) || false;
    if (!isFavorited) {
        // Create notification for collection owner (if different from user who favorited)
        if (collection.createdBy && collection.createdBy.toString() !== userId.toString()) {
            try {
                await Notification.create({
                    recipient: collection.createdBy,
                    type: 'collection_favorited',
                    collection: collectionId,
                    actor: userId,
                });
            } catch (notifError) {
                logger.error('Failed to create collection favorite notification:', notifError);
                // Don't fail the main operation if notification fails
            }
        }
    }

    res.status(200).json({
        success: true,
        isFavorited: !isFavorited,
        message: !isFavorited
            ? 'Collection added to favorites'
            : 'Collection removed from favorites',
    });
});

/**
 * Get user's favorite collections
 * GET /api/collection-favorites
 */
export const getFavoriteCollections = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100);
    const skip = (page - 1) * limit;

    // Get user with favorite collections
    const user = await User.findById(userId).select('favoriteCollections');
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
            errorCode: 'USER_NOT_FOUND',
        });
    }

    const favoriteIds = user.favoriteCollections || [];

    // Get favorite collections with pagination
    // IMPORTANT: Sort by the order in user.favoriteCollections array (most recently favorited first)
    // The favoriteCollections array maintains insertion order, so reverse it to get newest first
    const reversedFavoriteIds = [...favoriteIds].reverse();
    
    const collections = await Collection.find({
        _id: { $in: favoriteIds },
        $or: [{ isPublic: true }, { createdBy: userId }, { 'collaborators.user': userId }],
    })
        .populate('createdBy', 'username displayName avatarUrl')
        .populate({ path: 'coverImage', select: 'imageUrl regularUrl smallUrl', match: publicImageFilter() })
        .populate({ path: 'images', select: 'imageUrl regularUrl smallUrl', match: publicImageFilter() })
        .lean();
    
    // Sort collections by their position in the reversed favorites array (most recent first)
    // Create a map for O(1) lookup
    const idToIndex = new Map();
    reversedFavoriteIds.forEach((id, index) => {
        idToIndex.set(id.toString(), index);
    });
    
    // Sort collections by their position in the favorites array
    const sortedCollections = collections.sort((a, b) => {
        const indexA = idToIndex.get(a._id.toString()) ?? Infinity;
        const indexB = idToIndex.get(b._id.toString()) ?? Infinity;
        return indexA - indexB;
    });
    
    // Apply pagination after sorting
    const total = sortedCollections.length;
    const paginatedCollections = sortedCollections.slice(skip, skip + limit).map(collection => {
        const { collaborators, ...publicCollection } = collection;
        return {
            ...publicCollection,
            ...(hasPermission(collection, userId, 'view') ? { collaborators } : {}),
            imageCount: collection.images?.length || 0,
        };
    });

    res.status(200).json({
        success: true,
        collections: paginatedCollections,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    });
});

/**
 * Check if collections are favorited by user
 * POST /api/collection-favorites/check
 * Body: { collectionIds: [string] }
 */
export const checkCollectionFavorites = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { collectionIds } = req.body;

    if (!Array.isArray(collectionIds) || collectionIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'collectionIds must be a non-empty array',
            errorCode: 'INVALID_INPUT',
        });
    }

    // Validate MongoDB ObjectId format for all collectionIds
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    const validCollectionIds = [];
    const invalidCollectionIds = [];

    collectionIds.forEach((collectionId) => {
        const idString = String(collectionId).trim();
        const matchesRegex = objectIdRegex.test(idString);
        const isValidMongoose = mongoose.Types.ObjectId.isValid(idString);

        if (matchesRegex && isValidMongoose) {
            validCollectionIds.push({ key: idString, id: idString.toLowerCase() });
        } else {
            invalidCollectionIds.push(idString);
            logger.warn('Invalid collectionId format in checkCollectionFavorites', { collectionId: idString });
        }
    });

    if (validCollectionIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'All collectionIds must be valid MongoDB ObjectIds',
            errorCode: 'INVALID_ID',
            invalidIds: invalidCollectionIds,
        });
    }

    // Get user with favorite collections
    const user = await User.findById(userId).select('favoriteCollections');
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
            errorCode: 'USER_NOT_FOUND',
        });
    }

    const favoriteIds = new Set((user.favoriteCollections || []).map(id => id.toString().toLowerCase()));
    const requestedFavorites = [...new Set(validCollectionIds.map(entry => entry.id).filter(id => favoriteIds.has(id)))];
    const accessible = requestedFavorites.length ? await Collection.find({
        _id: { $in: requestedFavorites },
        $or: [{ isPublic: true }, { createdBy: userId }, { 'collaborators.user': userId }],
    }).select('_id').lean() : [];
    const accessibleIds = new Set(accessible.map(collection => collection._id.toString()));
    const favoritesMap = Object.fromEntries([
        ...validCollectionIds.map(({ key, id }) => [key, accessibleIds.has(id)]),
        ...invalidCollectionIds.map(key => [key, false]),
    ]);

    res.status(200).json({
        success: true,
        favorites: favoritesMap,
    });
});

