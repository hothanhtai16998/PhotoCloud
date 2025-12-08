import mongoose from 'mongoose';
import Image from '../models/Image.js';
import UserActivity from '../models/UserActivity.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

// Increment view count for an image
export const incrementView = asyncHandler(async (req, res) => {
    const imageId = req.params.imageId;
    const userId = req.user?._id; // Get current user (if authenticated)

    if (!mongoose.Types.ObjectId.isValid(imageId)) {
        return res.status(400).json({ message: 'Invalid image ID' });
    }

    // Get current date in UTC as YYYY-MM-DD string
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD

    // Check if this user has already viewed this image today
    let isFirstTimeToday = true;
    if (userId) {
        const existingActivity = await UserActivity.findOne({
            userId,
            imageId,
            activityType: 'view',
            date: todayStr,
        });

        isFirstTimeToday = !existingActivity;
    }

    // Only increment image views if this is the first time today (or if no user)
    if (isFirstTimeToday || !userId) {
        // Increment both total views and daily views on the image
        const image = await Image.findByIdAndUpdate(
            imageId,
            {
                $inc: {
                    views: 1,
                    [`dailyViews.${todayStr}`]: 1,
                },
            },
            { new: true, runValidators: true }
        );

        if (!image) {
            return res.status(404).json({
                message: 'Không tìm thấy ảnh',
            });
        }

        // Track user-specific activity (for profile analytics)
        if (userId) {
            try {
                await UserActivity.findOneAndUpdate(
                    {
                        userId,
                        imageId,
                        activityType: 'view',
                        date: todayStr,
                    },
                    {
                        userId,
                        imageId,
                        activityType: 'view',
                        date: todayStr,
                        isFirstTime: isFirstTimeToday,
                    },
                    {
                        upsert: true,
                        new: true,
                    }
                );
            } catch (error) {
                // Ignore duplicate key errors (shouldn't happen but handle gracefully)
                if (error.code !== 11000) {
                    console.error('Error tracking user activity:', error);
                }
            }
        }

        // Convert dailyViews (Map or plain object) to plain object for JSON response
        let dailyViewsObj = {};
        if (image.dailyViews) {
            if (image.dailyViews instanceof Map) {
                dailyViewsObj = Object.fromEntries(image.dailyViews);
            } else if (typeof image.dailyViews === 'object') {
                dailyViewsObj = image.dailyViews;
            }
        }

        res.status(200).json({
            views: image.views,
            dailyViews: dailyViewsObj,
        });
    } else {
        // User already viewed today, return current image stats without incrementing
        const image = await Image.findById(imageId);
        if (!image) {
            return res.status(404).json({
                message: 'Không tìm thấy ảnh',
            });
        }

        let dailyViewsObj = {};
        if (image.dailyViews) {
            if (image.dailyViews instanceof Map) {
                dailyViewsObj = Object.fromEntries(image.dailyViews);
            } else if (typeof image.dailyViews === 'object') {
                dailyViewsObj = image.dailyViews;
            }
        }

        res.status(200).json({
            views: image.views,
            dailyViews: dailyViewsObj,
        });
    }
});

// Increment download count for an image
export const incrementDownload = asyncHandler(async (req, res) => {
    const imageId = req.params.imageId;
    const userId = req.user?._id; // Get current user (if authenticated)

    if (!mongoose.Types.ObjectId.isValid(imageId)) {
        return res.status(400).json({ message: 'Invalid image ID' });
    }

    // Get current date in UTC as YYYY-MM-DD string
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD

    // Check if this user has already downloaded this image today
    let isFirstTimeToday = true;
    if (userId) {
        const existingActivity = await UserActivity.findOne({
            userId,
            imageId,
            activityType: 'download',
            date: todayStr,
        });

        isFirstTimeToday = !existingActivity;
    }

    // Only increment image downloads if this is the first time today (or if no user)
    if (isFirstTimeToday || !userId) {
        // Increment both total downloads and daily downloads on the image
        const image = await Image.findByIdAndUpdate(
            imageId,
            {
                $inc: {
                    downloads: 1,
                    [`dailyDownloads.${todayStr}`]: 1,
                },
            },
            { new: true, runValidators: true }
        );

        if (!image) {
            return res.status(404).json({
                message: 'Không tìm thấy ảnh',
            });
        }

        // Track user-specific activity (for profile analytics)
        if (userId) {
            try {
                await UserActivity.findOneAndUpdate(
                    {
                        userId,
                        imageId,
                        activityType: 'download',
                        date: todayStr,
                    },
                    {
                        userId,
                        imageId,
                        activityType: 'download',
                        date: todayStr,
                        isFirstTime: isFirstTimeToday,
                    },
                    {
                        upsert: true,
                        new: true,
                    }
                );
            } catch (error) {
                // Ignore duplicate key errors (shouldn't happen but handle gracefully)
                if (error.code !== 11000) {
                    console.error('Error tracking user activity:', error);
                }
            }
        }

        // Convert dailyDownloads (Map or plain object) to plain object for JSON response
        let dailyDownloadsObj = {};
        if (image.dailyDownloads) {
            if (image.dailyDownloads instanceof Map) {
                dailyDownloadsObj = Object.fromEntries(image.dailyDownloads);
            } else if (typeof image.dailyDownloads === 'object') {
                dailyDownloadsObj = image.dailyDownloads;
            }
        }

        res.status(200).json({
            downloads: image.downloads,
            dailyDownloads: dailyDownloadsObj,
        });
    } else {
        // User already downloaded today, return current image stats without incrementing
        const image = await Image.findById(imageId);
        if (!image) {
            return res.status(404).json({
                message: 'Không tìm thấy ảnh',
            });
        }

        let dailyDownloadsObj = {};
        if (image.dailyDownloads) {
            if (image.dailyDownloads instanceof Map) {
                dailyDownloadsObj = Object.fromEntries(image.dailyDownloads);
            } else if (typeof image.dailyDownloads === 'object') {
                dailyDownloadsObj = image.dailyDownloads;
            }
        }

        res.status(200).json({
            downloads: image.downloads,
            dailyDownloads: dailyDownloadsObj,
        });
    }
});

