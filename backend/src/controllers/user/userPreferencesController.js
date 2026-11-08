import { asyncHandler } from "../../middlewares/asyncHandler.js";
import User from "../../models/User.js";
import UserActivity from "../../models/UserActivity.js";
import { buildNotificationPreferencesUpdate } from '../../utils/notificationPreferences.js';

export const getDownloadHistory = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100);
    const skip = (page - 1) * limit;

    // Get download activities for the user, sorted by most recent first
    const downloadActivities = await UserActivity.find({
        userId,
        activityType: 'download',
    })
        .populate({
            path: 'imageId',
            select: '_id imageTitle imageUrl thumbnailUrl smallUrl regularUrl width height uploadedBy',
            populate: {
                path: 'uploadedBy',
                select: 'username displayName avatarUrl',
            },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    // Get total count for pagination
    const total = await UserActivity.countDocuments({
        userId,
        activityType: 'download',
    });

    // Filter out activities where image was deleted (imageId is null)
    const validDownloads = downloadActivities.filter(activity => activity.imageId !== null);

    // Format response
    const downloads = validDownloads.map(activity => ({
        _id: activity._id,
        image: activity.imageId,
        downloadedAt: activity.createdAt,
        date: activity.date, // YYYY-MM-DD format
    }));

    res.status(200).json({
        success: true,
        downloads,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasMore: page * limit < total,
        },
    });
});

export const getNotificationPreferences = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const user = await User.findById(userId).select('notificationPreferences').lean();

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
        success: true,
        preferences: user.notificationPreferences ?? {
            email: { comments: true, likes: true, follows: true, bookings: true, newsletters: false },
            push: { comments: true, likes: true, follows: false, bookings: true },
        },
    });
});

export const updateNotificationPreferences = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    let update;
    try {
        update = buildNotificationPreferencesUpdate(req.body);
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
    const user = await User.findByIdAndUpdate(
        userId,
        { $set: update },
        { new: true, runValidators: true }
    ).select('notificationPreferences').lean();

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
        success: true,
        preferences: user.notificationPreferences,
    });
});
