import { clearPermissionCache } from '../../services/realtime/roomPermissions.js';
import Collection from '../../models/Collection.js';
import Notification from '../../models/Notification.js';
import { logger } from '../../utils/logger.js';
import { safeTrim, isValidObjectId } from '../../utils/inputUtils.js';
import { createCollectionVersion } from '../../services/collection/collectionVersionHelper.js';
import { getUserId, hasPermission } from './collectionHelpers.js';
import mongoose from 'mongoose';
import { invalidateCollectionLists } from '../../services/collection/collectionCache.js';

export const createCollection = async (req, res) => {
    if (!req.user.isAdmin && !req.user.isSuperAdmin) return res.status(403).json({ success: false, message: 'Chỉ quản trị viên được tạo bộ sưu tập.' });
    try {
        const userId = req.user._id;
        const { name, description, isPublic, tags } = req.body;

        if (!name || safeTrim(name).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Collection name is required',
            });
        }

        if (safeTrim(name).length > 100) {
            return res.status(400).json({
                success: false,
                message: 'Collection name must be 100 characters or less',
            });
        }

        // Process tags: normalize, remove empty, deduplicate
        let processedTags = [];
        if (Array.isArray(tags)) {
            processedTags = tags
                .map(tag => safeTrim(tag).toLowerCase())
                .filter(tag => tag.length > 0)
                .filter((tag, index, self) => self.indexOf(tag) === index) // Remove duplicates
                .slice(0, 10); // Limit to 10 tags
        }

        const collection = new Collection({
            name: safeTrim(name),
            description: safeTrim(description) || '',
            createdBy: userId,
            images: [],
            isPublic: isPublic !== undefined ? isPublic : true,
            tags: processedTags,
        });

        await collection.save();
        clearPermissionCache('collection', collection._id.toString());

        // Create initial version
        // Invalidate cache for this user's collections (both queryCache and cacheMiddleware)
        await invalidateCollectionLists(collection);

        await createCollectionVersion(
            collection._id,
            userId,
            'created',
            { description: 'Collection created' }
        );

        const populatedCollection = await Collection.findById(collection._id)
            .populate('coverImage', 'thumbnailUrl smallUrl imageUrl imageTitle')
            .lean();

        res.status(201).json({
            success: true,
            collection: {
                ...populatedCollection,
                imageCount: 0,
            },
        });
    } catch (error) {
        logger.error('Error creating collection:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create collection',
        });
    }
};

/**
 * Update a collection
 */
export const updateCollection = async (req, res) => {
    try {
        const { collectionId } = req.params;
        const userId = req.user._id;
        const { name, description, isPublic, coverImage, tags } = req.body;

        // Find collection and populate collaborators
        if (!isValidObjectId(collectionId)) {
            return res.status(400).json({ success: false, message: 'Invalid collection ID' });
        }

        const collection = await Collection.findById(collectionId)
            .populate('collaborators.user');

        if (!collection) {
            return res.status(404).json({
                success: false,
                message: 'Collection not found',
            });
        }

        // Check if user has permission to edit (owner or collaborator with edit/admin permission)
        if (!hasPermission(collection, userId, 'edit')) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền chỉnh sửa bộ sưu tập này',
            });
        }

        // Capture original values before applying updates so we can create accurate change records
        const original = {
            name: collection.name,
            description: collection.description,
            isPublic: collection.isPublic,
            coverImage: collection.coverImage ? collection.coverImage.toString() : null,
            tags: Array.isArray(collection.tags) ? [...collection.tags] : [],
        };

        if (name !== undefined) {
            const trimmedName = safeTrim(name);
            if (trimmedName.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Collection name cannot be empty',
                });
            }
            if (trimmedName.length > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Collection name must be 100 characters or less',
                });
            }
            collection.name = trimmedName;
        }

        if (description !== undefined) {
            collection.description = safeTrim(description);
        }

        if (isPublic !== undefined) {
            collection.isPublic = isPublic;
        }

        if (coverImage !== undefined) {
            // Verify the cover image is in the collection
            if (coverImage && !collection.images.map(i => i.toString()).includes(String(coverImage))) {
                return res.status(400).json({
                    success: false,
                    message: 'Cover image must be in the collection',
                });
            }
            collection.coverImage = coverImage || null;
        }

        if (tags !== undefined) {
            // Process tags: normalize, remove empty, deduplicate
            let processedTags = [];
            if (Array.isArray(tags)) {
                processedTags = tags
                    .map(tag => safeTrim(tag).toLowerCase())
                    .filter(tag => tag.length > 0)
                    .filter((tag, index, self) => self.indexOf(tag) === index) // Remove duplicates
                    .slice(0, 10); // Limit to 10 tags
            }
            collection.tags = processedTags;
        }

        // Track what changed for versioning (compare original -> new values)
        const changes = [];
        if (name !== undefined && original.name !== collection.name) {
            changes.push({ field: 'name', oldValue: original.name, newValue: collection.name });
        }
        if (description !== undefined && original.description !== collection.description) {
            changes.push({ field: 'description', oldValue: original.description, newValue: collection.description });
        }
        if (isPublic !== undefined && original.isPublic !== collection.isPublic) {
            changes.push({ field: 'isPublic', oldValue: original.isPublic, newValue: collection.isPublic });
        }
        if (coverImage !== undefined && String(original.coverImage) !== (collection.coverImage ? collection.coverImage.toString() : null)) {
            changes.push({ field: 'coverImage', oldValue: original.coverImage, newValue: collection.coverImage });
        }
        if (tags !== undefined && JSON.stringify(original.tags) !== JSON.stringify(collection.tags)) {
            changes.push({ field: 'tags', oldValue: original.tags, newValue: collection.tags });
        }

        await collection.save();
        clearPermissionCache('collection', collection._id.toString());

        // Invalidate cache for this user's collections (both queryCache and cacheMiddleware)
        await invalidateCollectionLists(collection);

        // Create version for each change
        if (changes.length > 0) {
            for (const change of changes) {
                await createCollectionVersion(
                    collectionId,
                    userId,
                    'updated',
                    {
                        fieldChanged: change.field,
                        oldValue: change.oldValue,
                        newValue: change.newValue,
                        description: `Updated ${change.field}`,
                    }
                );
            }

            // Notify collaborators and owner about collection updates
            // If owner updates, notify collaborators
            // If collaborator updates, notify owner and other collaborators
            const collaborators = collection.collaborators || [];
            const notificationRecipients = new Set();

            const isOwner = collection.createdBy.toString() === userId.toString();

            if (isOwner) {
                // Owner updated - notify all collaborators
                collaborators.forEach(collab => {
                    const collabUserId = getUserId(collab.user);
                    if (collabUserId && collabUserId !== userId.toString()) {
                        notificationRecipients.add(collabUserId);
                    }
                });
            } else {
                // Collaborator updated - notify owner and other collaborators
                if (collection.createdBy.toString() !== userId.toString()) {
                    notificationRecipients.add(collection.createdBy.toString());
                }

                collaborators.forEach(collab => {
                    const collabUserId = getUserId(collab.user);
                    if (collabUserId && collabUserId !== userId.toString()) {
                        notificationRecipients.add(collabUserId);
                    }
                });
            }

            if (notificationRecipients.size > 0) {
                const recipients = Array.from(notificationRecipients);
                // Check if cover image was changed
                const coverChanged = changes.some(c => c.field === 'coverImage');
                const nameChanged = changes.some(c => c.field === 'name');
                const descriptionChanged = changes.some(c => c.field === 'description');
                const otherChanges = changes.filter(c =>
                    c.field !== 'coverImage' &&
                    c.field !== 'name' &&
                    c.field !== 'description' &&
                    c.field !== 'tags'
                );

                // Create notifications for each collaborator
                const notificationPromises = [];

                // Create specific notifications
                if (coverChanged) {
                    recipients.forEach(recipientId => {
                        notificationPromises.push(
                            Notification.create({
                                recipient: recipientId,
                                type: 'collection_cover_changed',
                                collection: collectionId,
                                actor: userId,
                                metadata: {
                                    collectionName: collection.name,
                                },
                            })
                        );
                    });
                }

                // Create general update notification for other changes
                if (nameChanged || descriptionChanged || otherChanges.length > 0) {
                    recipients.forEach(recipientId => {
                        notificationPromises.push(
                            Notification.create({
                                recipient: recipientId,
                                type: 'collection_updated',
                                collection: collectionId,
                                actor: userId,
                                metadata: {
                                    collectionName: collection.name,
                                    changes: changes.map(c => c.field),
                                },
                            })
                        );
                    });
                }

                // Create all notifications in parallel
                try {
                    await Promise.all(notificationPromises);
                } catch (notifError) {
                    logger.error('Failed to create collection update notifications:', notifError);
                    // Don't fail the update if notifications fail
                }
            }
        }

        const populatedCollection = await Collection.findById(collection._id)
            .populate('coverImage', 'thumbnailUrl smallUrl imageUrl imageTitle')
            .populate('images', 'thumbnailUrl smallUrl imageUrl imageTitle')
            .lean();

        // Emit WebSocket event for real-time collaboration
        try {
            const { emitCollectionUpdate } = await import('../../services/realtime/socketServer.js');
            const updateData = {
                type: 'collection_updated',
                collectionId,
                actorId: userId.toString(),
                changes: changes.map(c => c.field),
            };

            // Include specific changes if relevant
            if (changes.some(c => c.field === 'coverImage')) {
                updateData.coverImageId = populatedCollection.coverImage?._id?.toString() || null;
            }
            if (changes.some(c => c.field === 'name')) {
                updateData.name = populatedCollection.name;
            }
            if (changes.some(c => c.field === 'description')) {
                updateData.description = populatedCollection.description;
            }

            emitCollectionUpdate(collectionId, updateData);
        } catch (wsError) {
            logger.error('Failed to emit collection update via WebSocket:', wsError);
            // Don't fail the request if WebSocket fails
        }

        res.json({
            success: true,
            collection: {
                ...populatedCollection,
                imageCount: populatedCollection.images ? populatedCollection.images.length : 0,
            },
        });
    } catch (error) {
        logger.error('Error updating collection:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update collection',
        });
    }
}

/**
 * Delete a collection
 */
export const deleteCollection = async (req, res) => {
    try {
        const { collectionId } = req.params;
        const userId = req.user._id;
        if (!mongoose.Types.ObjectId.isValid(collectionId)) {
            return res.status(400).json({ success: false, message: 'Invalid collection ID' });
        }

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

        await Collection.findByIdAndDelete(collectionId);
        clearPermissionCache('collection', collectionId);

        // Invalidate cache for this user's collections (both queryCache and cacheMiddleware)
        await invalidateCollectionLists(collection);

        res.json({
            success: true,
            message: 'Collection deleted successfully',
        });
    } catch (error) {
        logger.error('Error deleting collection:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete collection',
        });
    }
};
