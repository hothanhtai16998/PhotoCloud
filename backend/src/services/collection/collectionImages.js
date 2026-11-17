import { publicImageFilter } from '../../utils/publicImageFilter.js';
import { invalidateCollectionLists } from './collectionCache.js';
import mongoose from 'mongoose';
import Collection from '../../models/Collection.js';
import Image from '../../models/Image.js';
import Notification from '../../models/Notification.js';
import { logger } from '../../utils/logger.js';
import { createCollectionVersion } from './collectionVersionHelper.js';
import { getCollectionMemberIds, hasPermission } from '../../utils/collectionAccess.js';


export class CollectionImageError extends Error {
    constructor(status, details) {
        super(details.message);
        this.status = status;
        this.details = details;
    }
}

// Add/remove share the same response fields; reorder keeps its richer projection.
async function loadImageCollection(collectionId) {
    return Collection.findById(collectionId)
        .populate({ path: 'coverImage', select: 'thumbnailUrl smallUrl imageUrl imageTitle', match: publicImageFilter() })
        .populate({ path: 'images', select: 'thumbnailUrl smallUrl imageUrl imageTitle', match: publicImageFilter() })
        .lean();
}

export const addImageToCollection = async ({ collectionId, imageId, userId }) => {

    if (!imageId) {
        throw new CollectionImageError(400, {
            success: false,
            message: 'Image ID is required',
        });
    }

    if (!mongoose.Types.ObjectId.isValid(collectionId) || !mongoose.Types.ObjectId.isValid(imageId)) {
        throw new CollectionImageError(400, { success: false, message: 'Invalid collection ID or image ID' });
    }
    imageId = new mongoose.Types.ObjectId(imageId).toHexString();

    // Verify collection exists and belongs to user
    const collection = await Collection.findOne({
        _id: collectionId,
        createdBy: userId,
    });

    if (!collection) {
        throw new CollectionImageError(404, {
            success: false,
            message: 'Collection not found',
        });
    }

    // Verify image exists
    const image = await Image.findOne({ _id: imageId, ...publicImageFilter() });
    if (!image) {
        throw new CollectionImageError(404, {
            success: false,
            message: 'Image not found',
        });
    }

    // Check if image is already in collection
    if (collection.images.map(i => i.toString()).includes(String(imageId))) {
        throw new CollectionImageError(400, {
            success: false,
            message: 'Image is already in this collection',
        });
    }

    // Add image to collection
    collection.images.push(imageId);

    // Set as cover image if collection is empty
    if (!collection.coverImage && collection.images.length === 1) {
        collection.coverImage = imageId;
    }

    await collection.save();
    await invalidateCollectionLists(collection);

    // Create version
    await createCollectionVersion(
        collectionId,
        userId,
        'image_added',
        {
            imageId,
            description: `Image added to collection`,
        }
    );

    // Notify collaborators and owner (except the user who added the image)
    try {
        const notificationRecipients = getCollectionMemberIds(collection, userId);

        const { createAndEmitNotification } = await import('../realtime/notificationEmitter.js');
        const notificationPromises = notificationRecipients.map(recipientId =>
            createAndEmitNotification({
                recipient: recipientId,
                type: 'collection_image_added',
                collection: collectionId,
                actor: userId,
                image: imageId,
            })
        );
        await Promise.all(notificationPromises);
    } catch (notifError) {
        logger.error('Failed to create notifications for image added:', notifError);
    }

    const populatedCollection = await loadImageCollection(collection._id);

    // Emit WebSocket event for real-time collaboration
    try {
        const { emitCollectionUpdate } = await import('../realtime/socketServer.js');
        const image = await Image.findOne({ _id: imageId, ...publicImageFilter() })
            .select('thumbnailUrl smallUrl imageUrl imageTitle')
            .lean();

        if (image) {
            emitCollectionUpdate(collectionId, {
                type: 'image_added',
                collectionId,
                imageId,
                image,
                actorId: userId.toString(),
                imageCount: populatedCollection.images ? populatedCollection.images.length : 0,
            });
        }
    } catch (wsError) {
        logger.error('Failed to emit collection update via WebSocket:', wsError);
        // Don't fail the request if WebSocket fails
    }

    return {
        success: true,
        collection: {
            ...populatedCollection,
            imageCount: populatedCollection.images ? populatedCollection.images.length : 0,
        },
    };
};

export const removeImageFromCollection = async ({ collectionId, imageId, userId }) => {
    if (!mongoose.Types.ObjectId.isValid(collectionId) || !mongoose.Types.ObjectId.isValid(imageId)) {
        throw new CollectionImageError(400, { success: false, message: 'Invalid collection ID or image ID' });
    }
    imageId = new mongoose.Types.ObjectId(imageId).toHexString();


    // Verify collection exists and user has permission
    const collection = await Collection.findById(collectionId)
        .populate('collaborators.user');

    if (!collection) {
        throw new CollectionImageError(404, {
            success: false,
            message: 'Collection not found',
        });
    }

    // Check if user has permission to edit
    if (!hasPermission(collection, userId, 'edit')) {
        throw new CollectionImageError(403, {
            success: false,
            message: 'Bạn không có quyền chỉnh sửa bộ sưu tập này',
        });
    }


    // Remove image from collection
    collection.images = collection.images.filter(
        id => id.toString() !== String(imageId)
    );

    // If removed image was cover image, set new cover (first image or null)
    if (collection.coverImage && collection.coverImage.toString() === imageId) {
        collection.coverImage = collection.images.length > 0 ? collection.images[0] : null;
    }

    await collection.save();
    await invalidateCollectionLists(collection);

    // Create version
    await createCollectionVersion(
        collectionId,
        userId,
        'image_removed',
        {
            imageId,
            description: `Image removed from collection`,
        }
    );

    // Notify collaborators and owner (except the user who removed the image)
    try {
        const notificationRecipients = getCollectionMemberIds(collection, userId);

        const notificationPromises = notificationRecipients.map(recipientId =>
            Notification.create({
                recipient: recipientId,
                type: 'collection_image_removed',
                collection: collectionId,
                actor: userId,
                image: imageId,
            })
        );
        await Promise.all(notificationPromises);
    } catch (notifError) {
        logger.error('Failed to create notifications for image removed:', notifError);
    }

    const populatedCollection = await loadImageCollection(collection._id);

    // Emit WebSocket event for real-time collaboration
    try {
        const { emitCollectionUpdate } = await import('../realtime/socketServer.js');
        emitCollectionUpdate(collectionId, {
            type: 'image_removed',
            collectionId,
            imageId,
            actorId: userId.toString(),
            imageCount: populatedCollection.images ? populatedCollection.images.length : 0,
            coverImageId: populatedCollection.coverImage?._id?.toString() || null,
        });
    } catch (wsError) {
        logger.error('Failed to emit collection update via WebSocket:', wsError);
        // Don't fail the request if WebSocket fails
    }

    return {
        success: true,
        collection: {
            ...populatedCollection,
            imageCount: populatedCollection.images ? populatedCollection.images.length : 0,
        },
    };
};

export const getCollectionsContainingImage = async ({ imageId, userId }) => {

    if (!mongoose.Types.ObjectId.isValid(imageId)) {
        throw new CollectionImageError(400, { success: false, message: 'Invalid image ID' });
    }

    const collections = await Collection.find({
        createdBy: userId,
        images: imageId,
    })
        .select('name description coverImage images')
        .populate({ path: 'coverImage', select: 'thumbnailUrl smallUrl', match: publicImageFilter() })
        .lean();

    // Calculate image count for each collection
    const collectionsWithCount = collections.map(({ images, ...collection }) => ({
        ...collection,
        imageCount: images ? images.length : 0,
    }));

    return {
        success: true,
        collections: collectionsWithCount,
    };
};

export const reorderCollectionImages = async ({ collectionId, imageIds, userId }) => {

    if (!Array.isArray(imageIds)) {
        throw new CollectionImageError(400, {
            success: false,
            message: 'imageIds must be an array',
        });
    }

    if (!mongoose.Types.ObjectId.isValid(collectionId)) {
        throw new CollectionImageError(400, { success: false, message: 'Invalid collection ID' });
    }

    // Validate imageIds are valid ObjectIds
    const invalidIds = imageIds.filter(id => !mongoose.Types.ObjectId.isValid(String(id || '')));
    if (invalidIds.length > 0) {
        throw new CollectionImageError(400, { success: false, message: 'One or more imageIds are invalid', invalidIds });
    }

    imageIds = imageIds.map(id => new mongoose.Types.ObjectId(String(id)).toHexString());

    // A reorder must not replace a missing image with a duplicate reference.
    if (new Set(imageIds.map(String)).size !== imageIds.length) {
        throw new CollectionImageError(400, { success: false, message: 'Duplicate image IDs are not allowed' });
    }

    // Verify collection exists and belongs to user
    const collection = await Collection.findOne({
        _id: collectionId,
        createdBy: userId,
    });

    if (!collection) {
        throw new CollectionImageError(404, {
            success: false,
            message: 'Collection not found',
        });
    }

    // Verify all image IDs are in the collection
    const imagesById = new Map(collection.images.map(id => [id.toString(), id]));
    const allImagesInCollection = imageIds.every(id => imagesById.has(String(id)));

    if (!allImagesInCollection) {
        throw new CollectionImageError(400, {
            success: false,
            message: 'All image IDs must be in the collection',
        });
    }

    // Verify all collection images are in the new order
    if (imageIds.length !== collection.images.length) {
        throw new CollectionImageError(400, {
            success: false,
            message: 'Image count mismatch',
        });
    }

    // Reorder images
    collection.images = imageIds.map(id => imagesById.get(String(id)));

    await collection.save();
    await invalidateCollectionLists(collection);

    // Create version
    await createCollectionVersion(
        collectionId,
        userId,
        'reordered',
        {
            description: `Images reordered`,
        }
    );

    // Notify collaborators about reordering (not the owner)
    const recipients = getCollectionMemberIds(collection, userId, { includeOwner: false });

    if (recipients.length > 0) {
        try {
            const notificationPromises = recipients.map(recipientId =>
                Notification.create({
                    recipient: recipientId,
                    type: 'collection_reordered',
                    collection: collectionId,
                    actor: userId,
                    metadata: {
                        collectionName: collection.name,
                        imageCount: imageIds.length,
                    },
                })
            );
            await Promise.all(notificationPromises);
        } catch (notifError) {
            logger.error('Failed to create collection reorder notifications:', notifError);
            // Don't fail the reorder if notifications fail
        }
    }

    const populatedCollection = await Collection.findById(collection._id)
        .populate({ path: 'coverImage', select: 'thumbnailUrl smallUrl imageUrl imageTitle', match: publicImageFilter() })
        .populate({
            path: 'images',
            match: publicImageFilter(),
            select: 'thumbnailUrl smallUrl regularUrl imageUrl imageTitle location uploadedBy views downloads createdAt',
            populate: {
                path: 'uploadedBy',
                select: 'username displayName avatarUrl',
            },
        })
        .lean();

    // Emit WebSocket event for real-time collaboration
    try {
        const { emitCollectionUpdate } = await import('../realtime/socketServer.js');
        emitCollectionUpdate(collectionId, {
            type: 'images_reordered',
            collectionId,
            imageIds,
            actorId: userId.toString(),
        });
    } catch (wsError) {
        logger.error('Failed to emit collection update via WebSocket:', wsError);
        // Don't fail the request if WebSocket fails
    }

    return {
        success: true,
        collection: {
            ...populatedCollection,
            imageCount: populatedCollection.images ? populatedCollection.images.length : 0,
        },
    };
};
