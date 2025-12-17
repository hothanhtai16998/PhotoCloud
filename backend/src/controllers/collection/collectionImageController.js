import mongoose from 'mongoose';
import Collection from '../../models/Collection.js';
import Image from '../../models/Image.js';
import Notification from '../../models/Notification.js';
import { logger } from '../../utils/logger.js';
import { createCollectionVersion } from '../../utils/collectionVersionHelper.js';
import { getUserId, hasPermission } from './collectionHelpers.js';

/**
 * Add image to collection
 */
export const addImageToCollection = async (req, res) => {
    try {
        const { collectionId } = req.params;
        const { imageId } = req.body;
        const userId = req.user._id;

        if (!imageId) {
            return res.status(400).json({
                success: false,
                message: 'Image ID is required',
            });
        }

        if (!mongoose.Types.ObjectId.isValid(collectionId) || !mongoose.Types.ObjectId.isValid(imageId)) {
            return res.status(400).json({ success: false, message: 'Invalid collection ID or image ID' });
        }

        // Verify collection exists and belongs to user
        const collection = await Collection.findOne({
            _id: collectionId,
            createdBy: userId,
        });

        if (!collection) {
            return res.status(404).json({
                success: false,
                message: 'Collection not found',
            });
        }

        // Verify image exists
        const image = await Image.findById(imageId);
        if (!image) {
            return res.status(404).json({
                success: false,
                message: 'Image not found',
            });
        }

        // Check if image is already in collection
        if (collection.images.map(i => i.toString()).includes(String(imageId))) {
            return res.status(400).json({
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
            const collaborators = collection.collaborators || [];
            const notificationRecipients = new Set();

            // Add owner if not the current user
            const ownerId = getUserId(collection.createdBy);
            if (ownerId && ownerId !== userId.toString()) {
                notificationRecipients.add(ownerId);
            }

            // Add collaborators
            collaborators.forEach(collab => {
                const collabUserId = getUserId(collab.user);
                if (collabUserId && collabUserId !== userId.toString()) {
                    notificationRecipients.add(collabUserId);
                }
            });

            const notificationPromises = Array.from(notificationRecipients).map(recipientId =>
                Notification.create({
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

        const populatedCollection = await Collection.findById(collection._id)
            .populate('coverImage', 'thumbnailUrl smallUrl imageUrl imageTitle')
            .populate('images', 'thumbnailUrl smallUrl imageUrl imageTitle')
            .lean();

        res.json({
            success: true,
            collection: {
                ...populatedCollection,
                imageCount: populatedCollection.images ? populatedCollection.images.length : 0,
            },
        });
    } catch (error) {
        logger.error('Error adding image to collection:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add image to collection',
        });
    }
};

/**
 * Remove image from collection
 */
export const removeImageFromCollection = async (req, res) => {
    try {
        const { collectionId, imageId } = req.params;
        const userId = req.user._id;

        // Verify collection exists and user has permission
        const collection = await Collection.findById(collectionId)
            .populate('collaborators.user');

        if (!collection) {
            return res.status(404).json({
                success: false,
                message: 'Collection not found',
            });
        }

        // Check if user has permission to edit
        if (!hasPermission(collection, userId, 'edit')) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền chỉnh sửa bộ sưu tập này',
            });
        }

        if (!mongoose.Types.ObjectId.isValid(collectionId) || !mongoose.Types.ObjectId.isValid(imageId)) {
            return res.status(400).json({ success: false, message: 'Invalid collection ID or image ID' });
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
            const collaborators = collection.collaborators || [];
            const notificationRecipients = new Set();

            // Add owner if not the current user
            const ownerId = getUserId(collection.createdBy);
            if (ownerId && ownerId !== userId.toString()) {
                notificationRecipients.add(ownerId);
            }

            // Add collaborators
            collaborators.forEach(collab => {
                const collabUserId = getUserId(collab.user);
                if (collabUserId && collabUserId !== userId.toString()) {
                    notificationRecipients.add(collabUserId);
                }
            });

            const notificationPromises = Array.from(notificationRecipients).map(recipientId =>
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

        const populatedCollection = await Collection.findById(collection._id)
            .populate('coverImage', 'thumbnailUrl smallUrl imageUrl imageTitle')
            .populate('images', 'thumbnailUrl smallUrl imageUrl imageTitle')
            .lean();

        res.json({
            success: true,
            collection: {
                ...populatedCollection,
                imageCount: populatedCollection.images ? populatedCollection.images.length : 0,
            },
        });
    } catch (error) {
        logger.error('Error removing image from collection:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove image from collection',
        });
    }
};

/**
 * Get collections that contain a specific image
 */
export const getCollectionsContainingImage = async (req, res) => {
    try {
        const { imageId } = req.params;
        const userId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(imageId)) {
            return res.status(400).json({ success: false, message: 'Invalid image ID' });
        }

        const collections = await Collection.find({
            createdBy: userId,
            images: imageId,
        })
            .select('name description coverImage imageCount')
            .populate('coverImage', 'thumbnailUrl smallUrl')
            .lean();

        // Calculate image count for each collection
        const collectionsWithCount = collections.map((collection) => ({
            ...collection,
            imageCount: collection.images ? collection.images.length : 0,
        }));

        res.json({
            success: true,
            collections: collectionsWithCount,
        });
    } catch (error) {
        logger.error('Error fetching collections containing image:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch collections',
        });
    }
};

/**
 * Reorder images in a collection
 */
export const reorderCollectionImages = async (req, res) => {
    try {
        const { collectionId } = req.params;
        const { imageIds } = req.body; // Array of image IDs in new order
        const userId = req.user._id;

        if (!Array.isArray(imageIds)) {
            return res.status(400).json({
                success: false,
                message: 'imageIds must be an array',
            });
        }

        if (!mongoose.Types.ObjectId.isValid(collectionId)) {
            return res.status(400).json({ success: false, message: 'Invalid collection ID' });
        }

        // Validate imageIds are valid ObjectIds
        const invalidIds = (Array.isArray(imageIds) ? imageIds : []).filter(id => !mongoose.Types.ObjectId.isValid(String(id || '')));
        if (invalidIds.length > 0) {
            return res.status(400).json({ success: false, message: 'One or more imageIds are invalid', invalidIds });
        }

        // Verify collection exists and belongs to user
        const collection = await Collection.findOne({
            _id: collectionId,
            createdBy: userId,
        });

        if (!collection) {
            return res.status(404).json({
                success: false,
                message: 'Collection not found',
            });
        }

        // Verify all image IDs are in the collection
        const collectionImageIds = collection.images.map(id => id.toString());
        const allImagesInCollection = imageIds.every(id =>
            collectionImageIds.includes(id.toString())
        );

        if (!allImagesInCollection) {
            return res.status(400).json({
                success: false,
                message: 'All image IDs must be in the collection',
            });
        }

        // Verify all collection images are in the new order
        if (imageIds.length !== collection.images.length) {
            return res.status(400).json({
                success: false,
                message: 'Image count mismatch',
            });
        }

        // Reorder images
        collection.images = imageIds.map(id =>
            collection.images.find(imgId => imgId.toString() === id.toString())
        ).filter(Boolean);

        await collection.save();

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
        const collaborators = collection.collaborators || [];
        const recipients = collaborators
            .map(c => getUserId(c.user))
            .filter(id => id && id !== userId.toString());

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
            .populate('coverImage', 'thumbnailUrl smallUrl imageUrl imageTitle')
            .populate({
                path: 'images',
                select: 'thumbnailUrl smallUrl regularUrl imageUrl imageTitle location uploadedBy views downloads createdAt',
                populate: {
                    path: 'uploadedBy',
                    select: 'username displayName avatarUrl',
                },
            })
            .lean();

        res.json({
            success: true,
            collection: {
                ...populatedCollection,
                imageCount: populatedCollection.images ? populatedCollection.images.length : 0,
            },
        });
    } catch (error) {
        logger.error('Error reordering collection images:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reorder images',
        });
    }
};

