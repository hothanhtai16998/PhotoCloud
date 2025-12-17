import { asyncHandler } from "../middlewares/asyncHandler.js";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import crypto from "crypto";
import User from "../models/User.js";
import Image from "../models/Image.js";
import Collection from "../models/Collection.js";
import Follow from "../models/Follow.js";
import Notification from "../models/Notification.js";
import Settings from "../models/Settings.js";
import { uploadAvatar, deleteAvatarFromR2 } from "../libs/s3.js";
import { logger } from '../utils/logger.js';

// Input validation constants
const VALIDATION_RULES = {
    bio: { max: 500 },
    location: { max: 100 },
    website: { max: 255 },
    instagram: { max: 30 },
    twitter: { max: 15 },
    facebook: { max: 50 },
    phone: { max: 20 },
    displayName: { max: 100 },
    password: { min: 8, max: 128 },
};

// Helper function to validate input length
const validateInputLength = (field, value, rules) => {
    if (!value) return true;
    const trimmed = String(value).trim();
    if (rules.max && trimmed.length > rules.max) {
        throw new Error(`${field} exceeds maximum length of ${rules.max}`);
    }
    if (rules.min && trimmed.length < rules.min) {
        throw new Error(`${field} must be at least ${rules.min} characters`);
    }
    return true;
};

/**
 * Search users by email, username, or displayName
 * Public endpoint for collaboration features
 */
export const searchUsers = asyncHandler(async (req, res) => {
    const search = String(req.query.search || '').trim();
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 10), 20);
    const skip = Math.max(0, parseInt(req.query.skip) || 0);

    if (!search || search.length < 2) {
        return res.status(200).json({
            users: [],
            total: 0,
            skip,
            limit,
        });
    }

    // Validate search length
    if (search.length > 100) {
        return res.status(400).json({
            message: "Search query is too long",
        });
    }

    // Escape special regex characters for safety
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escapedSearch, 'i');

    const query = {
        $or: [
            { username: searchRegex },
            { email: searchRegex },
            { displayName: searchRegex },
        ],
    };

    // Get total count for pagination
    const total = await User.countDocuments(query);

    // Use lean() for faster queries
    const users = await User.find(query)
        .select('username displayName avatarUrl')
        .skip(skip)
        .limit(limit)
        .lean();

    res.status(200).json({
        users,
        total,
        skip,
        limit,
    });
});

export const authMe = asyncHandler(async (req, res) => {
    const user = req.user;

    return res.status(200).json({
        user: {
            _id: user._id,
            username: user.username,
            email: user.email,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            bio: user.bio,
            phone: user.phone,
            location: user.location,
            website: user.website,
            instagram: user.instagram,
            twitter: user.twitter,
            facebook: user.facebook,
            isOAuthUser: user.isOAuthUser,
            isAdmin: user.isAdmin || false,
            isSuperAdmin: user.isSuperAdmin || false,
            permissions: user.permissions || null,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        },
    });
});

export const changePassword = asyncHandler(async (req, res) => {
    const { password, newPassword, newPasswordMatch } = req.body;
    const userId = req.user._id;

    if (!password || !newPassword || !newPasswordMatch) {
        return res.status(400).json({
            message: "Password fields cannot be empty",
        });
    }

    // Get password requirements from settings
    let passwordRequirements = {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumber: true,
        requireSpecialChar: false,
    };

    try {
        const settings = await Settings.findOne({ key: 'system' });
        if (settings && settings.value) {
            passwordRequirements = {
                minLength: settings.value.passwordMinLength || 8,
                requireUppercase: settings.value.passwordRequireUppercase ?? true,
                requireLowercase: settings.value.passwordRequireLowercase ?? true,
                requireNumber: settings.value.passwordRequireNumber ?? true,
                requireSpecialChar: settings.value.passwordRequireSpecialChar ?? false,
            };
        }
    } catch (error) {
        logger.warn('Could not load password requirements from settings, using defaults', { error: error.message });
    }

    // Validate password length
    if (newPassword.length < passwordRequirements.minLength) {
        return res.status(400).json({
            message: `Mật khẩu phải có ít nhất ${passwordRequirements.minLength} ký tự`,
        });
    }

    // Validate password complexity
    const regexParts = [];
    if (passwordRequirements.requireLowercase) regexParts.push('(?=.*[a-z])');
    if (passwordRequirements.requireUppercase) regexParts.push('(?=.*[A-Z])');
    if (passwordRequirements.requireNumber) regexParts.push('(?=.*\\d)');
    if (passwordRequirements.requireSpecialChar) regexParts.push('(?=.*[^a-zA-Z0-9])');

    if (regexParts.length > 0) {
        const passwordRegex = new RegExp(`^${regexParts.join('')}.{${passwordRequirements.minLength},}$`);
        if (!passwordRegex.test(newPassword)) {
            const messageParts = [];
            if (passwordRequirements.requireLowercase) messageParts.push('chữ thường');
            if (passwordRequirements.requireUppercase) messageParts.push('chữ hoa');
            if (passwordRequirements.requireNumber) messageParts.push('số');
            if (passwordRequirements.requireSpecialChar) messageParts.push('ký tự đặc biệt');
            return res.status(400).json({
                message: `Mật khẩu phải có ${messageParts.join(', ')}`,
            });
        }
    }

    if (newPassword !== newPasswordMatch) {
        return res.status(400).json({
            message: "New passwords do not match",
        });
    }

    // Fetch user with hashedPassword
    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isPasswordMatch = await bcrypt.compare(password, user.hashedPassword);
    if (!isPasswordMatch) {
        return res.status(401).json({
            message: "Current password is incorrect",
        });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await User.findByIdAndUpdate(userId, { hashedPassword });

    // Create notification
    try {
        await Notification.create({
            recipient: userId,
            type: 'password_changed',
            metadata: {
                timestamp: new Date().toISOString(),
                ipAddress: req.ip || req.headers['x-forwarded-for'] || 'Unknown',
            },
        });
    } catch (notifError) {
        logger.error('Failed to create password changed notification', { userId });
    }

    return res.status(200).json({
        message: "Password changed successfully",
    });
});

export const forgotPassword = asyncHandler(async (req, res) => {
    // TODO: Implement forgot password
});

export const changeInfo = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { firstName, lastName, email, bio, location, website, instagram, twitter, facebook, phone } = req.body;

    // Get current user
    const currentUser = await User.findById(userId);
    if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
    }

    const updateData = {};
    const changedFields = [];

    // Helper function to normalize values
    const normalizeValue = (value) => {
        if (value === null || value === undefined) return undefined;
        const trimmed = String(value).trim();
        return trimmed === '' ? undefined : trimmed;
    };

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

    // Validate and update bio
    if (bio !== undefined) {
        try {
            validateInputLength('Bio', bio, VALIDATION_RULES.bio);
            const newBio = normalizeValue(bio);
            const oldBio = normalizeValue(currentUser.bio);
            if (newBio !== oldBio) {
                updateData.bio = newBio;
                changedFields.push('bio');
            }
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    // Validate and update location
    if (location !== undefined) {
        try {
            validateInputLength('Location', location, VALIDATION_RULES.location);
            const newLocation = normalizeValue(location);
            const oldLocation = normalizeValue(currentUser.location);
            if (newLocation !== oldLocation) {
                updateData.location = newLocation;
                changedFields.push('location');
            }
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    // Validate and update phone
    if (phone !== undefined) {
        try {
            validateInputLength('Phone', phone, VALIDATION_RULES.phone);
            const newPhone = normalizeValue(phone);
            const oldPhone = normalizeValue(currentUser.phone);
            if (newPhone !== oldPhone) {
                updateData.phone = newPhone;
                changedFields.push('phone');
            }
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    // Validate and update website
    if (website !== undefined) {
        try {
            validateInputLength('Website', website, VALIDATION_RULES.website);
            let websiteValue = normalizeValue(website);
            if (websiteValue && !websiteValue.startsWith('http://') && !websiteValue.startsWith('https://')) {
                websiteValue = `https://${websiteValue}`;
            }
            const oldWebsite = normalizeValue(currentUser.website);
            if (websiteValue !== oldWebsite) {
                updateData.website = websiteValue;
                changedFields.push('website');
            }
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    // Validate and update social links
    if (instagram !== undefined) {
        try {
            validateInputLength('Instagram', instagram, VALIDATION_RULES.instagram);
            const rawInstagram = String(instagram || '').trim().replace(/^@/, '');
            const newInstagram = normalizeValue(rawInstagram);
            const oldInstagram = normalizeValue(currentUser.instagram);
            if (newInstagram !== oldInstagram) {
                updateData.instagram = newInstagram;
                changedFields.push('instagram');
            }
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    if (twitter !== undefined) {
        try {
            validateInputLength('Twitter', twitter, VALIDATION_RULES.twitter);
            const rawTwitter = String(twitter || '').trim().replace(/^@/, '');
            const newTwitter = normalizeValue(rawTwitter);
            const oldTwitter = normalizeValue(currentUser.twitter);
            if (newTwitter !== oldTwitter) {
                updateData.twitter = newTwitter;
                changedFields.push('twitter');
            }
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    if (facebook !== undefined) {
        try {
            validateInputLength('Facebook', facebook, VALIDATION_RULES.facebook);
            const newFacebook = normalizeValue(facebook);
            const oldFacebook = normalizeValue(currentUser.facebook);
            if (newFacebook !== oldFacebook) {
                updateData.facebook = newFacebook;
                changedFields.push('facebook');
            }
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
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

/**
 * Get user profile statistics
 * GET /api/users/:userId/stats
 */
export const getUserStats = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findById(userId)
        .select('profileViews createdAt avatarUrl bio phone displayName')
        .lean();

    if (!user) {
        return res.status(404).json({
            message: 'User not found',
        });
    }

    try {
        // Use aggregation for all stats
        const [imageStats, totalCollections, totalImages] = await Promise.all([
            Image.aggregate([
                { $match: { uploadedBy: new mongoose.Types.ObjectId(userId) } },
                {
                    $group: {
                        _id: null,
                        totalViews: { $sum: { $ifNull: ['$views', 0] } },
                        totalDownloads: { $sum: { $ifNull: ['$downloads', 0] } },
                        totalLikes: { $sum: { $size: { $ifNull: ['$likedBy', []] } } },
                    }
                }
            ]),
            Collection.countDocuments({ createdBy: userId }),
            Image.countDocuments({ uploadedBy: userId }),
        ]);

        const statsResult = imageStats[0] || { totalViews: 0, totalDownloads: 0, totalLikes: 0 };

        // Get followers/following count
        const [followersCount, followingCount] = await Promise.all([
            Follow.countDocuments({ following: userId }),
            Follow.countDocuments({ follower: userId }),
        ]);

        // Calculate profile completion
        const completionCriteria = {
            hasAvatar: !!(user.avatarUrl && String(user.avatarUrl).trim() !== ''),
            hasBio: !!(user.bio && String(user.bio).trim() !== ''),
            hasPhone: !!(user.phone && String(user.phone).trim() !== ''),
            hasImages: totalImages > 0,
            hasCollections: totalCollections > 0,
        };

        const completedCount = Object.values(completionCriteria).filter(Boolean).length;
        const totalCriteria = Object.keys(completionCriteria).length;
        const completionPercentage = Math.round((completedCount / totalCriteria) * 100);

        res.status(200).json({
            totalImages,
            totalCollections,
            totalFavorites: statsResult.totalLikes,
            totalDownloads: statsResult.totalDownloads,
            totalViews: statsResult.totalViews,
            followersCount,
            followingCount,
            profileViews: user.profileViews || 0,
            joinDate: user.createdAt,
            verifiedBadge: false,
            profileCompletion: {
                percentage: completionPercentage,
                completed: completedCount,
                total: totalCriteria,
                criteria: completionCriteria,
            },
        });
    } catch (error) {
        logger.error('Failed to get user stats', { userId, error: error.message });
        return res.status(500).json({
            message: 'Failed to retrieve statistics',
        });
    }
});

/**
 * Track profile view
 * POST /api/users/:userId/view
 */
export const trackProfileView = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const viewerId = req.user?._id;

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Don't count self-views
    if (viewerId && viewerId.toString() === userId) {
        return res.status(200).json({
            message: 'Self-view not counted',
            profileViews: 0,
        });
    }

    const user = await User.findByIdAndUpdate(
        userId,
        {
            $inc: { profileViews: 1 },
            $set: { lastProfileView: new Date() },
        },
        { new: true }
    ).select('profileViews');

    if (!user) {
        return res.status(404).json({
            message: 'User not found',
        });
    }

    res.status(200).json({
        message: 'Profile view tracked',
        profileViews: user.profileViews,
    });
});

/**
 * Get public user data by username
 * GET /api/users/username/:username
 */
export const getUserByUsername = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username) {
        return res.status(400).json({ message: 'Username is required' });
    }

    const normalizedUsername = username.toLowerCase();

    const user = await User.findOne({ username: normalizedUsername })
        .select('username displayName avatarUrl bio location website instagram twitter facebook createdAt pinnedImages')
        .populate({
            path: 'pinnedImages',
            select: '_id imageTitle imageUrl thumbnailUrl smallUrl regularUrl width height',
        })
        .lean();

    if (!user) {
        return res.status(404).json({
            message: 'User not found',
        });
    }

    res.status(200).json({
        user: {
            _id: user._id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl || '',
            bio: user.bio || '',
            location: user.location || '',
            website: user.website || '',
            instagram: user.instagram || '',
            twitter: user.twitter || '',
            facebook: user.facebook || '',
            createdAt: user.createdAt,
            pinnedImages: user.pinnedImages || [],
        },
    });
});

/**
 * Get public user data by userId
 * GET /api/users/:userId
 */
export const getUserById = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findById(userId)
        .select('username displayName avatarUrl bio location website instagram twitter facebook createdAt pinnedImages')
        .populate({
            path: 'pinnedImages',
            select: '_id imageTitle imageUrl thumbnailUrl smallUrl regularUrl width height',
        })
        .lean();

    if (!user) {
        return res.status(404).json({
            message: 'User not found',
        });
    }

    res.status(200).json({
        user: {
            _id: user._id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl || '',
            bio: user.bio || '',
            location: user.location || '',
            website: user.website || '',
            instagram: user.instagram || '',
            twitter: user.twitter || '',
            facebook: user.facebook || '',
            createdAt: user.createdAt,
            pinnedImages: user.pinnedImages || [],
        },
    });
});

/**
 * Pin an image to user's profile
 * POST /api/users/pinned-images
 */
export const pinImage = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { imageId } = req.body;

    if (!imageId) {
        return res.status(400).json({ message: 'Image ID is required' });
    }

    // Validate imageId format
    if (!mongoose.Types.ObjectId.isValid(imageId)) {
        return res.status(400).json({ message: 'Invalid image ID' });
    }

    // Check if image exists and belongs to user
    const image = await Image.findById(imageId);
    if (!image) {
        return res.status(404).json({ message: 'Image not found' });
    }

    if (image.uploadedBy.toString() !== userId.toString()) {
        return res.status(403).json({ message: 'You can only pin your own images' });
    }

    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    // Check if already pinned
    if (user.pinnedImages.includes(imageId)) {
        return res.status(400).json({ message: 'Image is already pinned' });
    }

    // Limit to 6 pinned images
    if (user.pinnedImages.length >= 6) {
        return res.status(400).json({ message: 'Maximum of 6 pinned images allowed' });
    }

    // Add to pinned images
    user.pinnedImages.push(imageId);
    await user.save();

    // Populate pinned images for response
    await user.populate({
        path: 'pinnedImages',
        select: '_id imageTitle imageUrl thumbnailUrl smallUrl regularUrl width height',
    });

    res.status(200).json({
        success: true,
        message: 'Image pinned successfully',
        pinnedImages: user.pinnedImages,
    });
});

/**
 * Unpin an image from user's profile
 * DELETE /api/users/pinned-images/:imageId
 */
export const unpinImage = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { imageId } = req.params;

    if (!imageId) {
        return res.status(400).json({ message: 'Image ID is required' });
    }

    // Validate imageId format
    if (!mongoose.Types.ObjectId.isValid(imageId)) {
        return res.status(400).json({ message: 'Invalid image ID' });
    }

    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    // Check if image is pinned
    if (!user.pinnedImages.includes(imageId)) {
        return res.status(400).json({ message: 'Image is not pinned' });
    }

    // Remove from pinned images
    user.pinnedImages = user.pinnedImages.filter(
        id => id.toString() !== imageId
    );
    await user.save();

    // Populate pinned images for response
    await user.populate({
        path: 'pinnedImages',
        select: '_id imageTitle imageUrl thumbnailUrl smallUrl regularUrl width height',
    });

    res.status(200).json({
        success: true,
        message: 'Image unpinned successfully',
        pinnedImages: user.pinnedImages,
    });
});

/**
 * Get user's pinned images
 * GET /api/users/pinned-images
 */
export const getPinnedImages = asyncHandler(async (req, res) => {
    const userId = req.params.userId || req.user?._id;

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    const user = await User.findById(userId)
        .select('pinnedImages')
        .populate({
            path: 'pinnedImages',
            select: '_id imageTitle imageUrl thumbnailUrl smallUrl regularUrl width height',
        })
        .lean();

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
        success: true,
        pinnedImages: user.pinnedImages || [],
    });
});

/**
 * Reorder pinned images
 * PATCH /api/users/pinned-images/reorder
 */
export const reorderPinnedImages = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { imageIds } = req.body;

    if (!Array.isArray(imageIds)) {
        return res.status(400).json({ message: 'imageIds must be an array' });
    }

    if (imageIds.length > 6) {
        return res.status(400).json({ message: 'Maximum of 6 pinned images allowed' });
    }

    // Validate all image IDs
    for (const imageId of imageIds) {
        if (!mongoose.Types.ObjectId.isValid(imageId)) {
            return res.status(400).json({ message: `Invalid image ID: ${imageId}` });
        }
    }

    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    // Verify all images belong to user
    const images = await Image.find({ _id: { $in: imageIds } });
    for (const image of images) {
        if (image.uploadedBy.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'You can only reorder your own images' });
        }
    }

    // Update pinned images order
    user.pinnedImages = imageIds;
    await user.save();

    // Populate pinned images for response
    await user.populate({
        path: 'pinnedImages',
        select: '_id imageTitle imageUrl thumbnailUrl smallUrl regularUrl width height',
    });

    res.status(200).json({
        success: true,
        message: 'Pinned images reordered successfully',
        pinnedImages: user.pinnedImages,
    });
});