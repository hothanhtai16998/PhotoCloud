import mongoose from 'mongoose';
import Image from '../../models/Image.js';
import UserActivity from '../../models/UserActivity.js';
import User from '../../models/User.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';

/**
 * Get all image IDs and user IDs for testing
 * GET /api/admin/test-utils/list-ids
 * Returns list of all users and images with their IDs for easy copy-paste
 */
export const listTestIds = asyncHandler(async (req, res) => {
    try {
        // Get all users
        const users = await User.find()
            .select('_id username email displayName')
            .lean()
            .limit(100); // Limit to prevent huge responses

        // Get all images
        const images = await Image.find()
            .select('_id imageTitle uploadedBy')
            .populate('uploadedBy', 'username')
            .lean()
            .limit(100); // Limit to prevent huge responses

        // Format for easy use
        const formattedUsers = users.map(user => ({
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            displayName: user.displayName || user.username,
        }));

        const formattedImages = images.map(image => ({
            id: image._id.toString(),
            title: image.imageTitle,
            uploadedBy: image.uploadedBy?.username || 'Unknown',
            uploadedById: image.uploadedBy?._id?.toString() || null,
        }));

        res.status(200).json({
            users: formattedUsers,
            images: formattedImages,
            count: {
                users: formattedUsers.length,
                images: formattedImages.length,
            },
            note: 'Limited to first 100 users and 100 images. Use specific IDs if you need more.',
        });
    } catch (error) {
        console.error('Error listing test IDs:', error);
        res.status(500).json({
            message: 'Failed to list test IDs',
            error: error.message,
        });
    }
});

/**
 * Reset all view and download counts (global and user activity)
 * POST /api/admin/test-utils/reset-all-views-downloads
 * WARNING: This will delete all view/download data!
 */
export const resetAllViewDownloadCounts = asyncHandler(async (req, res) => {
    try {
        // Reset all image view/download counts
        const imageResult = await Image.updateMany(
            {},
            {
                $set: {
                    views: 0,
                    downloads: 0,
                    dailyViews: {},
                    dailyDownloads: {},
                },
            }
        );

        // Delete all user activity records
        const activityResult = await UserActivity.deleteMany({});

        res.status(200).json({
            message: 'All view and download counts have been reset',
            imagesUpdated: imageResult.modifiedCount,
            activitiesDeleted: activityResult.deletedCount,
        });
    } catch (error) {
        console.error('Error resetting view/download counts:', error);
        res.status(500).json({
            message: 'Failed to reset view/download counts',
            error: error.message,
        });
    }
});

/**
 * Add test views/downloads for specific dates
 * POST /api/admin/test-utils/add-test-data
 * Body: {
 *   userId: string (optional - if not provided, uses first user found),
 *   imageId: string (optional - default image if not specified per date),
 *   dates: Array<{ 
 *     date: string (YYYY-MM-DD), 
 *     views: number, 
 *     downloads: number,
 *     imageId?: string (optional - specific image for this date, overrides default)
 *   }>,
 *   activityType?: 'view' | 'download' | 'both' (default: 'both')
 * }
 * 
 * Note: You can specify a different imageId for each date, or use a default imageId for all dates
 */
export const addTestViewDownloadData = asyncHandler(async (req, res) => {
    try {
        const { userId, imageId: defaultImageId, dates, activityType = 'both' } = req.body;

        // Debug logging
        console.log('Received request body:', JSON.stringify(req.body, null, 2));
        console.log('Dates type:', typeof dates);
        console.log('Dates is array:', Array.isArray(dates));
        console.log('Dates value:', dates);

        if (!dates) {
            return res.status(400).json({
                message: 'dates field is required',
                received: req.body,
            });
        }

        if (!Array.isArray(dates)) {
            return res.status(400).json({
                message: 'dates must be an array',
                received: typeof dates,
                value: dates,
            });
        }

        if (dates.length === 0) {
            return res.status(400).json({
                message: 'dates array cannot be empty',
            });
        }

        // Get or find user
        let targetUserId = userId;
        if (!targetUserId) {
            const firstUser = await User.findOne().select('_id').lean();
            if (!firstUser) {
                return res.status(404).json({
                    message: 'No users found. Please provide userId or create a user first.',
                });
            }
            targetUserId = firstUser._id;
        } else if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
            return res.status(400).json({
                message: 'Invalid userId format',
            });
        }

        // Verify user exists
        const user = await User.findById(targetUserId);
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
            });
        }

        // Get default image if provided
        let defaultImage = null;
        if (defaultImageId) {
            if (!mongoose.Types.ObjectId.isValid(defaultImageId)) {
                return res.status(400).json({
                    message: 'Invalid default imageId format',
                });
            }
            defaultImage = await Image.findById(defaultImageId);
            if (!defaultImage) {
                return res.status(404).json({
                    message: 'Default image not found',
                });
            }
        }

        // Process each date
        let totalViewsAdded = 0;
        let totalDownloadsAdded = 0;
        const activitiesCreated = [];
        const processedImages = new Set();

        for (const dateData of dates) {
            const { date, views = 0, downloads = 0, imageId: dateSpecificImageId } = dateData;

            // Validate date format (YYYY-MM-DD)
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return res.status(400).json({
                    message: `Invalid date format: ${date}. Expected format: YYYY-MM-DD`,
                });
            }

            // Determine which image to use for this date
            let targetImageId = dateSpecificImageId || (defaultImage ? defaultImage._id : null);
            
            // If no image specified, find first available image
            if (!targetImageId) {
                const firstImage = await Image.findOne().select('_id').lean();
                if (!firstImage) {
                    return res.status(404).json({
                        message: `No images found. Please provide imageId for date ${date} or set a default imageId.`,
                    });
                }
                targetImageId = firstImage._id;
            }

            // Validate imageId format
            if (!mongoose.Types.ObjectId.isValid(targetImageId)) {
                return res.status(400).json({
                    message: `Invalid imageId format for date ${date}: ${targetImageId}`,
                });
            }

            // Verify image exists
            const image = await Image.findById(targetImageId);
            if (!image) {
                return res.status(404).json({
                    message: `Image not found for date ${date}: ${targetImageId}`,
                });
            }

            processedImages.add(targetImageId.toString());

            // Add views
            if ((activityType === 'both' || activityType === 'view') && views > 0) {
                // Update image global counts (increment by the full amount)
                await Image.findByIdAndUpdate(
                    targetImageId,
                    {
                        $inc: {
                            views: views,
                            [`dailyViews.${date}`]: views,
                        },
                    }
                );

                // Create/update user activity record (one per day due to unique constraint)
                // This tracks that the user viewed the image on this date
                try {
                    const existingActivity = await UserActivity.findOne({
                        userId: targetUserId,
                        imageId: targetImageId,
                        activityType: 'view',
                        date: date,
                    });

                    if (!existingActivity) {
                        await UserActivity.create({
                            userId: targetUserId,
                            imageId: targetImageId,
                            activityType: 'view',
                            date: date,
                            isFirstTime: true,
                            count: views, // Store the actual count
                        });
                        activitiesCreated.push({ date, imageId: targetImageId, type: 'view', created: true });
                    } else {
                        // Update existing activity with new count
                        existingActivity.count = views;
                        await existingActivity.save();
                        activitiesCreated.push({ date, imageId: targetImageId, type: 'view', created: false, message: 'Activity updated with new count' });
                    }
                } catch (error) {
                    // Ignore duplicate key errors
                    if (error.code !== 11000) {
                        throw error;
                    }
                }

                totalViewsAdded += views;
            }

            // Add downloads
            if ((activityType === 'both' || activityType === 'download') && downloads > 0) {
                // Update image global counts (increment by the full amount)
                await Image.findByIdAndUpdate(
                    targetImageId,
                    {
                        $inc: {
                            downloads: downloads,
                            [`dailyDownloads.${date}`]: downloads,
                        },
                    }
                );

                // Create/update user activity record (one per day due to unique constraint)
                try {
                    let existingActivity = await UserActivity.findOne({
                        userId: targetUserId,
                        imageId: targetImageId,
                        activityType: 'download',
                        date: date,
                    });

                    if (!existingActivity) {
                        existingActivity = await UserActivity.create({
                            userId: targetUserId,
                            imageId: targetImageId,
                            activityType: 'download',
                            date: date,
                            isFirstTime: true,
                            count: downloads, // Store the actual count
                        });
                        activitiesCreated.push({ date, imageId: targetImageId, type: 'download', created: true });
                    } else {
                        // Update existing activity with new count
                        existingActivity.count = downloads;
                        await existingActivity.save();
                        activitiesCreated.push({ date, imageId: targetImageId, type: 'download', created: false, message: 'Activity updated with new count' });
                    }
                } catch (error) {
                    // Ignore duplicate key errors
                    if (error.code !== 11000) {
                        throw error;
                    }
                }

                totalDownloadsAdded += downloads;
            }
        }

        res.status(200).json({
            message: 'Test data added successfully',
            userId: targetUserId,
            defaultImageId: defaultImageId || null,
            datesProcessed: dates.length,
            imagesUsed: Array.from(processedImages),
            totalViewsAdded,
            totalDownloadsAdded,
            activitiesCreated: activitiesCreated.length,
            details: activitiesCreated,
        });
    } catch (error) {
        console.error('Error adding test data:', error);
        res.status(500).json({
            message: 'Failed to add test data',
            error: error.message,
        });
    }
});

