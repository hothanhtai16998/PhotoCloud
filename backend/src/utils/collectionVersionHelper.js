import CollectionVersion from '../models/CollectionVersion.js';
import Collection from '../models/Collection.js';
import { logger } from './logger.js';

/**
 * Create a version snapshot of a collection
 */
export const createCollectionVersion = async (collectionId, changedBy, changeType, changeDetails = {}) => {
    try {
        // Get the current collection
        const collection = await Collection.findById(collectionId)
            .populate('coverImage')
            .populate('images')
            .populate('collaborators.user')
            .populate('collaborators.invitedBy')
            .lean();

        if (!collection) {
            logger.warn(`Collection not found for versioning: ${collectionId}`);
            return null;
        }

        // Get the next version number
        const lastVersion = await CollectionVersion.findOne({ collection: collectionId })
            .sort({ versionNumber: -1 })
            .select('versionNumber')
            .lean();

        const nextVersionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

        // Create snapshot
        const snapshot = {
            name: collection.name,
            description: collection.description,
            isPublic: collection.isPublic,
            tags: collection.tags || [],
            coverImage: collection.coverImage?._id || collection.coverImage || null,
            images: (collection.images || []).map(img => img._id || img),
            collaborators: (collection.collaborators || []).map(collab => ({
                user: collab.user?._id || collab.user,
                permission: collab.permission,
                invitedBy: collab.invitedBy?._id || collab.invitedBy || null,
                invitedAt: collab.invitedAt || null,
            })),
        };

        // Create version document
        const version = await CollectionVersion.create({
            collection: collectionId,
            versionNumber: nextVersionNumber,
            snapshot,
            changes: {
                type: changeType,
                description: changeDetails.description || getChangeDescription(changeType, changeDetails),
                fieldChanged: changeDetails.fieldChanged,
                oldValue: changeDetails.oldValue,
                newValue: changeDetails.newValue,
                imageId: changeDetails.imageId,
                collaboratorId: changeDetails.collaboratorId,
            },
            changedBy,
            note: changeDetails.note,
        });

        logger.info(`Created version ${nextVersionNumber} for collection ${collectionId}`, {
            changeType,
            changedBy,
        });

        return version;
    } catch (error) {
        logger.error('Error creating collection version:', error);
        // Don't throw - versioning is non-critical
        return null;
    }
};

/**
 * Get a human-readable description of the change
 */
const getChangeDescription = (changeType, changeDetails) => {
    const descriptions = {
        created: 'Collection created',
        updated: 'Collection updated',
        image_added: `Image added: ${changeDetails.imageId || ''}`,
        image_removed: `Image removed: ${changeDetails.imageId || ''}`,
        reordered: 'Images reordered',
        collaborator_added: `Collaborator added: ${changeDetails.collaboratorId || ''}`,
        collaborator_removed: `Collaborator removed: ${changeDetails.collaboratorId || ''}`,
        permission_changed: `Permission changed for collaborator: ${changeDetails.collaboratorId || ''}`,
    };

    return descriptions[changeType] || 'Collection changed';
};

