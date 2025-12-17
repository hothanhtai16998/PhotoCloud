import { asyncHandler } from '../middlewares/asyncHandler.js';
import mongoose from 'mongoose';
import CollectionVersion from '../models/CollectionVersion.js';
import Collection from '../models/Collection.js';
import { logger } from '../utils/logger.js';
import { createCollectionVersion } from '../utils/collectionVersionHelper.js';

/**
 * Get version history for a collection
 */
export const getCollectionVersions = asyncHandler(async (req, res) => {
    const { collectionId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(collectionId)) {
        return res.status(400).json({ success: false, message: 'Invalid collection ID' });
    }

    // Check if user has access to this collection
    const collection = await Collection.findOne({
        _id: collectionId,
        $or: [
            { createdBy: userId },
            { 'collaborators.user': userId },
        ],
    });

    if (!collection) {
        return res.status(404).json({
            success: false,
            message: 'Collection not found or you do not have access',
        });
    }

    const versions = await CollectionVersion.find({ collection: collectionId })
        .populate('changedBy', 'username displayName avatarUrl')
        .populate('changes.imageId', 'thumbnailUrl imageTitle')
        .populate('changes.collaboratorId', 'username displayName avatarUrl')
        .sort({ versionNumber: -1 })
        .lean();

    res.json({
        success: true,
        versions,
    });
});

/**
 * Get a specific version by version number
 */
export const getVersionByNumber = asyncHandler(async (req, res) => {
    const { collectionId, versionNumber } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(collectionId)) {
        return res.status(400).json({ success: false, message: 'Invalid collection ID' });
    }

    const parsedVersion = parseInt(versionNumber, 10);
    if (Number.isNaN(parsedVersion) || parsedVersion < 0) {
        return res.status(400).json({ success: false, message: 'Invalid version number' });
    }

    // Check if user has access to this collection
    const collection = await Collection.findOne({
        _id: collectionId,
        $or: [
            { createdBy: userId },
            { 'collaborators.user': userId },
        ],
    });

    if (!collection) {
        return res.status(404).json({
            success: false,
            message: 'Collection not found or you do not have access',
        });
    }

    const version = await CollectionVersion.findOne({
        collection: collectionId,
        versionNumber: parseInt(versionNumber, 10),
    })
        .populate('changedBy', 'username displayName avatarUrl')
        .populate('snapshot.coverImage', 'thumbnailUrl imageUrl imageTitle')
        .populate('snapshot.images', 'thumbnailUrl imageUrl imageTitle')
        .populate('snapshot.collaborators.user', 'username displayName avatarUrl')
        .lean();

    if (!version) {
        return res.status(404).json({
            success: false,
            message: 'Version not found',
        });
    }

    res.json({
        success: true,
        version,
    });
});

/**
 * Restore a collection to a specific version
 */
export const restoreCollectionVersion = asyncHandler(async (req, res) => {
    const { collectionId, versionNumber } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(collectionId)) {
        return res.status(400).json({ success: false, message: 'Invalid collection ID' });
    }

    const parsedVersion = parseInt(versionNumber, 10);
    if (Number.isNaN(parsedVersion) || parsedVersion < 0) {
        return res.status(400).json({ success: false, message: 'Invalid version number' });
    }

    // Check if user has permission to edit this collection
    const collection = await Collection.findById(collectionId)
        .populate('createdBy')
        .populate('collaborators.user');

    if (!collection) {
        return res.status(404).json({
            success: false,
            message: 'Collection not found',
        });
    }

    // Check permissions
    const isOwner = collection.createdBy._id.toString() === userId.toString();
    const collaborator = collection.collaborators?.find(
        c => c.user._id.toString() === userId.toString()
    );
    const canEdit = isOwner || collaborator?.permission === 'admin' || collaborator?.permission === 'edit';

    if (!canEdit) {
        return res.status(403).json({
            success: false,
            message: 'You do not have permission to restore this collection',
        });
    }

    // Get the version to restore
    const version = await CollectionVersion.findOne({
        collection: collectionId,
        versionNumber: parseInt(versionNumber, 10),
    }).lean();

    if (!version) {
        return res.status(404).json({
            success: false,
            message: 'Version not found',
        });
    }

    // Restore collection from snapshot
    collection.name = version.snapshot.name;
    collection.description = version.snapshot.description;
    collection.isPublic = version.snapshot.isPublic;
    collection.tags = version.snapshot.tags || [];
    collection.coverImage = version.snapshot.coverImage || null;
    collection.images = version.snapshot.images || [];
    collection.collaborators = version.snapshot.collaborators || [];

    await collection.save();

    // Create a new version documenting the restore
    await createCollectionVersion(
        collectionId,
        userId,
        'updated',
        {
            description: `Collection restored to version ${versionNumber}`,
            note: `Restored from version ${versionNumber} (created ${new Date(version.createdAt).toLocaleString()})`,
        }
    );

    // Get updated collection with populated fields
    const updatedCollection = await Collection.findById(collectionId)
        .populate('createdBy', 'username displayName avatarUrl')
        .populate('coverImage', 'thumbnailUrl smallUrl imageUrl imageTitle')
        .populate({
            path: 'images',
            select: 'thumbnailUrl smallUrl regularUrl imageUrl imageTitle location uploadedBy views downloads createdAt',
            populate: {
                path: 'uploadedBy',
                select: 'username displayName avatarUrl',
            },
        })
        .populate({
            path: 'collaborators.user',
            select: 'username displayName avatarUrl email',
        })
        .lean();

    res.json({
        success: true,
        message: `Collection restored to version ${versionNumber}`,
        collection: {
            ...updatedCollection,
            imageCount: updatedCollection.images ? updatedCollection.images.length : 0,
        },
    });
});

