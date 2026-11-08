import { VALIDATION_RULES, validateInputLength, buildProfileFieldsUpdate } from '../../utils/profileFields.js';
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import crypto from "crypto";
import User from "../../models/User.js";
import Notification from "../../models/Notification.js";
import { uploadAvatar, deleteAvatarFromR2 } from "../../config/storage.js";
import { logger } from '../../utils/logger.js';

export const changeInfo = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { firstName, lastName, email } = req.body;

    // Get current user
    const currentUser = await User.findById(userId);
    if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
    }

    const updateData = {};
    const changedFields = [];

    // Validate and update displayName
    if (firstName !== undefined || lastName !== undefined) {
        try {
            const firstNameValue = String(firstName || '').trim();
            const lastNameValue = String(lastName || '').trim();
            const newDisplayName = `${firstNameValue} ${lastNameValue}`.trim();

            validateInputLength('Display name', newDisplayName, VALIDATION_RULES.displayName);

            if (newDisplayName !== currentUser.displayName) {
                updateData.displayName = newDisplayName;
                changedFields.push('displayName');
            }
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    // Validate and update email
    if (email !== undefined) {
        try {
            const newEmail = String(email || '').toLowerCase().trim();
            const oldEmail = String(currentUser.email || '').toLowerCase().trim();

            if (newEmail !== oldEmail) {
                // Prevent OAuth users from changing email
                if (currentUser.isOAuthUser) {
                    return res.status(403).json({
                        message: "Cannot change email linked to Google account",
                    });
                }

                // Validate email format (basic)
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(newEmail)) {
                    return res.status(400).json({
                        message: "Invalid email format",
                    });
                }

                // Check for duplicate email with unique constraint handling
                try {
                    const existingEmail = await User.findOne({
                        email: newEmail,
                        _id: { $ne: userId }
                    });

                    if (existingEmail) {
                        return res.status(409).json({
                            message: "Email already in use",
                        });
                    }
                } catch (dbError) {
                    logger.error('Database error checking email uniqueness', { userId });
                    return res.status(500).json({
                        message: "Server error",
                    });
                }

                updateData.email = newEmail;
                changedFields.push('email');

                // Create notification
                try {
                    await Notification.create({
                        recipient: userId,
                        type: 'email_changed',
                        metadata: {
                            timestamp: new Date().toISOString(),
                        },
                    });
                } catch (notifError) {
                    logger.error('Failed to create email changed notification', { userId });
                }
            }
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    try {
        const fields = buildProfileFieldsUpdate(currentUser, req.body);
        Object.assign(updateData, fields.updateData);
        changedFields.push(...fields.changedFields);
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }

    // Handle avatar upload
    if (req.file && currentUser.isOAuthUser) {
        return res.status(403).json({
            message: "Cannot change avatar linked to Google account",
        });
    }

    if (req.file) {
        try {
            // Use crypto for secure random filename
            const randomBytes = crypto.randomBytes(16).toString('hex');
            const timestamp = Date.now();
            const filename = `avatar-${timestamp}-${randomBytes}`;

            // Upload avatar to S3
            const uploadResult = await uploadAvatar(
                req.file.buffer,
                'photo-app-avatars',
                filename
            );

            // Delete old avatar if exists
            if (currentUser.avatarId) {
                try {
                    await deleteAvatarFromR2(currentUser.avatarId);
                } catch (deleteError) {
                    logger.warn('Failed to delete old avatar', { userId, avatarId: currentUser.avatarId });
                }
            }

            updateData.avatarUrl = uploadResult.avatarUrl;
            updateData.avatarId = uploadResult.publicId;
            // Use avatarUrl as the user-facing changed field so notification filter works
            changedFields.push('avatarUrl');
        } catch (error) {
            logger.error('Avatar upload failed', { userId, error: error.message });
            return res.status(500).json({
                message: "Avatar upload failed",
            });
        }
    }

    // Update user in database
    try {
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-hashedPassword');

        // Create profile update notification
        try {
            const userFacingFields = changedFields.filter(field =>
                field !== 'avatarUrl' && field !== 'avatarId'
            );
            if (userFacingFields.length > 0) {
                await Notification.create({
                    recipient: userId,
                    type: 'profile_updated',
                    metadata: {
                        changedFields: userFacingFields,
                        timestamp: new Date().toISOString(),
                    },
                });
            }
        } catch (notifError) {
            logger.error('Failed to create profile updated notification', { userId });
        }

        return res.status(200).json({
            message: "Profile updated successfully",
            user: updatedUser,
        });
    } catch (error) {
        logger.error('Profile update failed', { userId, error: error.message });
        return res.status(500).json({
            message: "Profile update failed",
        });
    }
});
