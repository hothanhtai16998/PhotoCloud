import mongoose from 'mongoose';
import Collection from '../../models/Collection.js';
import User from '../../models/User.js';
import Notification from '../../models/Notification.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { logger } from '../../utils/logger.js';
import { getUserId, hasPermission } from './collectionHelpers.js';

/**
 * Add collaborator to collection
 */
export const addCollaborator = asyncHandler(async (req, res) => {
    try {
        const { collectionId } = req.params;
        const userId = req.user._id;
        const { userEmail, permission = 'view' } = req.body;

        if (!userEmail) {
            return res.status(400).json({
                success: false,
                message: 'Email người dùng là bắt buộc',
            });
        }

        if (!['view', 'edit', 'admin'].includes(permission)) {
            return res.status(400).json({
                success: false,
                message: 'Quyền không hợp lệ. Phải là: view, edit, hoặc admin',
            });
        }

        if (!mongoose.Types.ObjectId.isValid(collectionId)) {
            return res.status(400).json({ success: false, message: 'Invalid collection ID' });
        }

        const collection = await Collection.findById(collectionId);

        if (!collection) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bộ sưu tập',
            });
        }

        // Check if user is owner or admin collaborator
        if (!hasPermission(collection, userId, 'admin')) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền thêm cộng tác viên',
            });
        }

        // Find user by email
        const userToAdd = await User.findOne({ email: userEmail.toLowerCase().trim() });

        if (!userToAdd) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng với email này',
            });
        }

        // Can't add owner as collaborator
        if (collection.createdBy.toString() === userToAdd._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Chủ sở hữu bộ sưu tập không thể được thêm làm cộng tác viên',
            });
        }

        // Check if user is already a collaborator
        const existingCollaborator = collection.collaborators?.find(
            collab => getUserId(collab.user) === userToAdd._id.toString()
        );

        if (existingCollaborator) {
            return res.status(400).json({
                success: false,
                message: 'Người dùng này đã là cộng tác viên',
            });
        }

        // Add collaborator
        collection.collaborators = collection.collaborators || [];
        collection.collaborators.push({
            user: userToAdd._id,
            permission,
            invitedBy: userId,
            invitedAt: new Date(),
        });

        await collection.save();

        // Create notification for the invited user
        try {
            await Notification.create({
                recipient: userToAdd._id,
                type: 'collection_invited',
                collection: collectionId,
                actor: userId,
                metadata: {
                    permission,
                    collectionName: collection.name,
                },
            });
        } catch (notifError) {
            // Log error but don't fail the request
            logger.error('Failed to create notification:', notifError);
        }

        // Populate and return updated collection
        const updatedCollection = await Collection.findById(collectionId)
            .populate('createdBy', 'username displayName avatarUrl')
            .populate({
                path: 'collaborators.user',
                select: 'username displayName avatarUrl email',
            })
            .populate({
                path: 'collaborators.invitedBy',
                select: 'username displayName avatarUrl',
            })
            .lean();

        res.json({
            success: true,
            message: 'Đã thêm cộng tác viên thành công',
            collection: updatedCollection,
        });
    } catch (error) {
        logger.error('Error adding collaborator:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể thêm cộng tác viên. Vui lòng thử lại.',
        });
    }
});

/**
 * Remove collaborator from collection
 */
export const removeCollaborator = asyncHandler(async (req, res) => {
    try {
        const { collectionId, collaboratorId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(collectionId) || !mongoose.Types.ObjectId.isValid(collaboratorId)) {
            return res.status(400).json({ success: false, message: 'Invalid collection ID or collaborator ID' });
        }
        const userId = req.user._id;

        const collection = await Collection.findById(collectionId);

        if (!collection) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bộ sưu tập',
            });
        }

        // Check if user is owner or admin collaborator
        if (!hasPermission(collection, userId, 'admin')) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền xóa cộng tác viên',
            });
        }

        // Find collaborator before removing
        const collaboratorToRemove = collection.collaborators?.find(
            collab => getUserId(collab.user) === collaboratorId
        );

        // Remove collaborator
        collection.collaborators = collection.collaborators?.filter(
            collab => getUserId(collab.user) !== collaboratorId
        ) || [];

        await collection.save();

        // Notify the removed collaborator
        if (collaboratorToRemove) {
            try {
                await Notification.create({
                    recipient: collaboratorId,
                    type: 'collection_removed',
                    collection: collectionId,
                    actor: userId,
                    metadata: {
                        collectionName: collection.name,
                    },
                });
            } catch (notifError) {
                logger.error('Failed to create notification for collaborator removal:', notifError);
            }
        }

        // Populate and return updated collection
        const updatedCollection = await Collection.findById(collectionId)
            .populate('createdBy', 'username displayName avatarUrl')
            .populate({
                path: 'collaborators.user',
                select: 'username displayName avatarUrl email',
            })
            .populate({
                path: 'collaborators.invitedBy',
                select: 'username displayName avatarUrl',
            })
            .lean();

        res.json({
            success: true,
            message: 'Đã xóa cộng tác viên thành công',
            collection: updatedCollection,
        });
    } catch (error) {
        logger.error('Error removing collaborator:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể xóa cộng tác viên. Vui lòng thử lại.',
        });
    }
});

/**
 * Update collaborator permission
 */
export const updateCollaboratorPermission = asyncHandler(async (req, res) => {
    try {
        const { collectionId, collaboratorId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(collectionId) || !mongoose.Types.ObjectId.isValid(collaboratorId)) {
            return res.status(400).json({ success: false, message: 'Invalid collection ID or collaborator ID' });
        }
        const userId = req.user._id;
        const { permission } = req.body;

        if (!['view', 'edit', 'admin'].includes(permission)) {
            return res.status(400).json({
                success: false,
                message: 'Quyền không hợp lệ. Phải là: view, edit, hoặc admin',
            });
        }

        const collection = await Collection.findById(collectionId);

        if (!collection) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bộ sưu tập',
            });
        }

        // Check if user is owner or admin collaborator
        if (!hasPermission(collection, userId, 'admin')) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền cập nhật quyền cộng tác viên',
            });
        }

        // Find and update collaborator
        const collaborator = collection.collaborators?.find(
            collab => getUserId(collab.user) === collaboratorId
        );

        if (!collaborator) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy cộng tác viên',
            });
        }

        collaborator.permission = permission;
        await collection.save();

        // Notify the collaborator whose permission was changed
        try {
            await Notification.create({
                recipient: collaboratorId,
                type: 'collection_permission_changed',
                collection: collectionId,
                actor: userId,
                metadata: {
                    permission,
                    collectionName: collection.name,
                },
            });
        } catch (notifError) {
            logger.error('Failed to create notification for permission change:', notifError);
        }

        // Populate and return updated collection
        const updatedCollection = await Collection.findById(collectionId)
            .populate('createdBy', 'username displayName avatarUrl')
            .populate({
                path: 'collaborators.user',
                select: 'username displayName avatarUrl email',
            })
            .populate({
                path: 'collaborators.invitedBy',
                select: 'username displayName avatarUrl',
            })
            .lean();

        res.json({
            success: true,
            message: 'Đã cập nhật quyền cộng tác viên thành công',
            collection: updatedCollection,
        });
    } catch (error) {
        logger.error('Error updating collaborator permission:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể cập nhật quyền cộng tác viên. Vui lòng thử lại.',
        });
    }
});

