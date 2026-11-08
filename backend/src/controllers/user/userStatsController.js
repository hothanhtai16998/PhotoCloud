import { asyncHandler } from "../../middlewares/asyncHandler.js";
import mongoose from "mongoose";
import User from "../../models/User.js";
import Image from "../../models/Image.js";
import Collection from "../../models/Collection.js";
import Follow from "../../models/Follow.js";
import { logger } from '../../utils/logger.js';

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
