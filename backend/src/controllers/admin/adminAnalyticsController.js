import User from '../../models/User.js';
import Image from '../../models/Image.js';
import PageView from '../../models/PageView.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';

// Statistics
export const getDashboardStats = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('viewDashboard') middleware
    const [totalUsers, totalImages, recentUsers, recentImages] = await Promise.all([
        User.countDocuments(),
        Image.countDocuments(),
        User.find().sort({ createdAt: -1 }).limit(5).select('username email displayName createdAt isAdmin').lean(),
        Image.find().sort({ createdAt: -1 }).limit(10).populate('uploadedBy', 'username displayName').populate('imageCategory', 'name').select('imageTitle imageCategory createdAt uploadedBy').lean(),
    ]);

    // Count images by category (using lookup to get category names)
    const categoryStats = await Image.aggregate([
        { $group: { _id: '$imageCategory', count: { $sum: 1 } } },
        {
            $lookup: {
                from: 'categories',
                localField: '_id',
                foreignField: '_id',
                as: 'category'
            }
        },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 1,
                count: 1,
                name: { $ifNull: ['$category.name', 'Unknown'] }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
    ]);

    res.status(200).json({
        stats: {
            totalUsers,
            totalImages,
            categoryStats,
        },
        recentUsers,
        recentImages,
    });
});

// Analytics
export const getAnalytics = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('viewAnalytics') middleware

    // Get date range from query (default to last 30 days)
    const days = parseInt(req.query.days) || 30;
    const now = new Date();

    // For Vietnam timezone (UTC+7), we need to adjust the date range
    // Vietnam "today" in UTC terms: from 17:00 UTC yesterday to 16:59:59 UTC today
    // To include all of today, we'll use "now + 1 day" as the upper bound
    // This ensures any record created "today" in Vietnam timezone is included

    // Start date: (days) days ago
    // We'll use a simple approach: subtract days from now, set to start of that day in UTC
    // Then adjust for Vietnam timezone offset
    const startDateUTC = new Date(now);
    startDateUTC.setUTCDate(startDateUTC.getUTCDate() - days);
    startDateUTC.setUTCHours(0, 0, 0, 0);

    // End date: Use now + 24 hours to ensure we include all of today in Vietnam timezone
    const endDateUTC = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Calculate comparison period (previous period of same length)
    const comparisonStartDateUTC = new Date(startDateUTC);
    comparisonStartDateUTC.setUTCDate(comparisonStartDateUTC.getUTCDate() - days);

    const comparisonEndDateUTC = new Date(startDateUTC);
    comparisonEndDateUTC.setUTCMilliseconds(comparisonEndDateUTC.getUTCMilliseconds() - 1);

    // User analytics
    const totalUsers = await User.countDocuments();
    const newUsers = await User.countDocuments({ createdAt: { $gte: startDateUTC } });
    const bannedUsers = await User.countDocuments({ isBanned: true });

    // Image analytics
    const totalImages = await Image.countDocuments();
    const newImages = await Image.countDocuments({ createdAt: { $gte: startDateUTC } });
    const moderatedImages = await Image.countDocuments({ isModerated: true });
    const pendingModeration = await Image.countDocuments({ moderationStatus: 'pending' });
    const approvedImages = await Image.countDocuments({ moderationStatus: 'approved' });
    const rejectedImages = await Image.countDocuments({ moderationStatus: 'rejected' });
    const flaggedImages = await Image.countDocuments({ moderationStatus: 'flagged' });

    // Category analytics
    const categoryStats = await Image.aggregate([
        { $group: { _id: '$imageCategory', count: { $sum: 1 } } },
        {
            $lookup: {
                from: 'categories',
                localField: '_id',
                foreignField: '_id',
                as: 'category'
            }
        },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 1,
                count: 1,
                name: { $ifNull: ['$category.name', 'Unknown'] }
            }
        },
        { $sort: { count: -1 } },
    ]);

    // Daily uploads for the last 30 days (current period)
    const dailyUploads = await Image.aggregate([
        { $match: { createdAt: { $gte: startDateUTC, $lte: endDateUTC } } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Ho_Chi_Minh' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } },
    ]);

    // Daily uploads for comparison period (previous period)
    const dailyUploadsComparison = await Image.aggregate([
        { $match: { createdAt: { $gte: comparisonStartDateUTC, $lte: comparisonEndDateUTC } } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Ho_Chi_Minh' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } },
    ]);

    // Daily users for trend chart (current period)
    const dailyUsers = await User.aggregate([
        { $match: { createdAt: { $gte: startDateUTC, $lte: endDateUTC } } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Ho_Chi_Minh' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } },
    ]);

    // Daily users for comparison period (previous period)
    const dailyUsersComparison = await User.aggregate([
        { $match: { createdAt: { $gte: comparisonStartDateUTC, $lte: comparisonEndDateUTC } } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Ho_Chi_Minh' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } },
    ]);

    // Daily pending images for trend chart (current period)
    const dailyPending = await Image.aggregate([
        {
            $match: {
                createdAt: { $gte: startDateUTC, $lte: endDateUTC },
                moderationStatus: 'pending'
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Ho_Chi_Minh' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } },
    ]);

    // Daily pending images for comparison period
    const dailyPendingComparison = await Image.aggregate([
        {
            $match: {
                createdAt: { $gte: comparisonStartDateUTC, $lte: comparisonEndDateUTC },
                moderationStatus: 'pending'
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Ho_Chi_Minh' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } },
    ]);

    // Daily approved images for trend chart (current period)
    const dailyApproved = await Image.aggregate([
        {
            $match: {
                createdAt: { $gte: startDateUTC, $lte: endDateUTC },
                moderationStatus: 'approved'
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Ho_Chi_Minh' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } },
    ]);

    // Daily approved images for comparison period
    const dailyApprovedComparison = await Image.aggregate([
        {
            $match: {
                createdAt: { $gte: comparisonStartDateUTC, $lte: comparisonEndDateUTC },
                moderationStatus: 'approved'
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Ho_Chi_Minh' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } },
    ]);

    // Top uploaders
    const topUploaders = await Image.aggregate([
        { $match: { createdAt: { $gte: startDateUTC } } },
        { $group: { _id: '$uploadedBy', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'user'
            }
        },
        { $unwind: '$user' },
        {
            $project: {
                userId: '$_id',
                username: '$user.username',
                displayName: '$user.displayName',
                uploadCount: '$count'
            }
        },
    ]);

    // Aggregate views and downloads from all images for admin analytics
    const allImages = await Image.find({})
        .select('views downloads dailyViews dailyDownloads')
        .lean();

    // Aggregate daily views and downloads across all images
    const viewsOverTime = {};
    const downloadsOverTime = {};

    allImages.forEach(image => {
        // Process dailyViews
        if (image.dailyViews) {
            const dailyViewsObj = image.dailyViews instanceof Map
                ? Object.fromEntries(image.dailyViews)
                : image.dailyViews;

            Object.entries(dailyViewsObj).forEach(([date, count]) => {
                const startDateStr = startDateUTC.toISOString().split('T')[0];
                const endDateStr = endDateUTC.toISOString().split('T')[0];
                if (date >= startDateStr && date <= endDateStr) {
                    viewsOverTime[date] = (viewsOverTime[date] || 0) + count;
                }
            });
        }

        // Process dailyDownloads
        if (image.dailyDownloads) {
            const dailyDownloadsObj = image.dailyDownloads instanceof Map
                ? Object.fromEntries(image.dailyDownloads)
                : image.dailyDownloads;

            Object.entries(dailyDownloadsObj).forEach(([date, count]) => {
                const startDateStr = startDateUTC.toISOString().split('T')[0];
                const endDateStr = endDateUTC.toISOString().split('T')[0];
                if (date >= startDateStr && date <= endDateStr) {
                    downloadsOverTime[date] = (downloadsOverTime[date] || 0) + count;
                }
            });
        }
    });

    // Find first date with actual data (for views and downloads separately)
    const startDateStr = startDateUTC.toISOString().split('T')[0];
    const endDateStr = endDateUTC.toISOString().split('T')[0];
    
    const viewsDates = Object.keys(viewsOverTime)
        .filter(date => {
            return viewsOverTime[date] > 0 && 
                   date >= startDateStr && 
                   date <= endDateStr;
        })
        .sort();
    
    const downloadsDates = Object.keys(downloadsOverTime)
        .filter(date => {
            return downloadsOverTime[date] > 0 && 
                   date >= startDateStr && 
                   date <= endDateStr;
        })
        .sort();
    
    const firstViewsDate = viewsDates.length > 0 ? viewsDates[0] : null;
    const firstDownloadsDate = downloadsDates.length > 0 ? downloadsDates[0] : null;
    
    // For views: start from first date with data (within period), or startDate if no data
    const viewsStartDate = firstViewsDate && firstViewsDate >= startDateStr 
        ? new Date(firstViewsDate + 'T00:00:00.000Z') 
        : startDateUTC;
    
    // For downloads: start from first date with data (within period), or startDate if no data
    const downloadsStartDate = firstDownloadsDate && firstDownloadsDate >= startDateStr
        ? new Date(firstDownloadsDate + 'T00:00:00.000Z')
        : startDateUTC;

    // Fill in missing dates from first data date (not from period start)
    const viewsDatesToFill = [];
    for (let d = new Date(viewsStartDate); d <= endDateUTC; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        viewsDatesToFill.push(dateStr);
        if (!viewsOverTime[dateStr]) viewsOverTime[dateStr] = 0;
    }

    const downloadsDatesToFill = [];
    for (let d = new Date(downloadsStartDate); d <= endDateUTC; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        downloadsDatesToFill.push(dateStr);
        if (!downloadsOverTime[dateStr]) downloadsOverTime[dateStr] = 0;
    }

    // Convert to array format for charting - only include dates from first data date
    const viewsData = viewsDatesToFill.map(date => ({
        date,
        value: viewsOverTime[date] || 0
    }));

    const downloadsData = downloadsDatesToFill.map(date => ({
        date,
        value: downloadsOverTime[date] || 0
    }));

    // Calculate total views and downloads in period
    const totalViewsInPeriod = viewsData.reduce((sum, d) => sum + d.value, 0);
    const totalDownloadsInPeriod = downloadsData.reduce((sum, d) => sum + d.value, 0);

    // User Engagement Metrics
    const activeUsersLast7Days = await User.countDocuments({
        lastLoginAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });
    const activeUsersLast30Days = await User.countDocuments({
        lastLoginAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    
    // Image Performance Analytics
    const mostViewedImages = await Image.find({})
        .select('imageTitle imageUrl views downloads favorites uploadedBy createdAt')
        .populate('uploadedBy', 'username displayName')
        .sort({ views: -1 })
        .limit(10)
        .lean();
    
    const mostDownloadedImages = await Image.find({})
        .select('imageTitle imageUrl views downloads favorites uploadedBy createdAt')
        .populate('uploadedBy', 'username displayName')
        .sort({ downloads: -1 })
        .limit(10)
        .lean();
    
    const mostFavoritedImages = await Image.find({})
        .select('imageTitle imageUrl views downloads favorites uploadedBy createdAt')
        .populate('uploadedBy', 'username displayName')
        .sort({ favorites: -1 })
        .limit(10)
        .lean();
    
    // Trending images (high views/downloads in the last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const trendingImages = await Image.aggregate([
        {
            $match: {
                createdAt: { $gte: sevenDaysAgo }
            }
        },
        {
            $project: {
                imageTitle: 1,
                imageUrl: 1,
                views: 1,
                downloads: 1,
                favorites: 1,
                uploadedBy: 1,
                createdAt: 1,
                engagementScore: {
                    $add: [
                        { $multiply: ['$views', 1] },
                        { $multiply: ['$downloads', 3] },
                        { $multiply: ['$favorites', 5] }
                    ]
                }
            }
        },
        { $sort: { engagementScore: -1 } },
        { $limit: 10 },
        {
            $lookup: {
                from: 'users',
                localField: 'uploadedBy',
                foreignField: '_id',
                as: 'user'
            }
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                imageTitle: 1,
                imageUrl: 1,
                views: 1,
                downloads: 1,
                favorites: 1,
                createdAt: 1,
                engagementScore: 1,
                uploadedBy: {
                    _id: '$user._id',
                    username: '$user.username',
                    displayName: '$user.displayName'
                }
            }
        }
    ]);
    
    // Content Analytics - Popular Tags
    const popularTags = await Image.aggregate([
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
        {
            $project: {
                tag: '$_id',
                count: 1,
                _id: 0
            }
        }
    ]);
    
    // Content Analytics - Popular Locations
    const popularLocations = await Image.aggregate([
        { $match: { location: { $exists: true, $ne: null, $ne: '' } } },
        { $group: { _id: '$location', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
        {
            $project: {
                location: '$_id',
                count: 1,
                _id: 0
            }
        }
    ]);
    
    // Calculate user retention (users who logged in in both periods)
    const previousPeriodUsers = await User.find({
        createdAt: { $gte: comparisonStartDateUTC, $lte: comparisonEndDateUTC }
    }).select('_id').lean();
    
    const currentPeriodActiveUsers = await User.find({
        lastLoginAt: { $gte: startDateUTC, $lte: endDateUTC }
    }).select('_id').lean();
    
    const previousPeriodUserIds = new Set(previousPeriodUsers.map(u => u._id.toString()));
    const retainedUsers = currentPeriodActiveUsers.filter(u => 
        previousPeriodUserIds.has(u._id.toString())
    ).length;
    
    const retentionRate = previousPeriodUsers.length > 0 
        ? (retainedUsers / previousPeriodUsers.length) * 100 
        : 0;

    res.status(200).json({
        period: {
            days,
            startDate: startDateUTC,
            endDate: endDateUTC,
        },
        users: {
            total: totalUsers,
            new: newUsers,
            banned: bannedUsers,
            activeLast7Days: activeUsersLast7Days,
            activeLast30Days: activeUsersLast30Days,
            retentionRate: Math.round(retentionRate * 100) / 100,
        },
        images: {
            total: totalImages,
            new: newImages,
            moderated: moderatedImages,
            pendingModeration,
            approved: approvedImages,
            rejected: rejectedImages,
            flagged: flaggedImages,
        },
        categories: categoryStats,
        dailyUploads,
        dailyUploadsComparison,
        dailyUsers,
        dailyUsersComparison,
        dailyPending,
        dailyPendingComparison,
        dailyApproved,
        dailyApprovedComparison,
        topUploaders,
        viewsOverTime: viewsData,
        downloadsOverTime: downloadsData,
        totalViews: totalViewsInPeriod,
        totalDownloads: totalDownloadsInPeriod,
        // New engagement metrics
        mostViewedImages,
        mostDownloadedImages,
        mostFavoritedImages,
        trendingImages,
        popularTags,
        popularLocations,
    });
});

// Traffic Analytics
export const getTrafficAnalytics = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('viewAnalytics') middleware
    
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // Page views by route
    const pageViewsByRoute = await PageView.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        { $group: { _id: '$path', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
        {
            $project: {
                path: '$_id',
                views: '$count',
                _id: 0
            }
        }
    ]);
    
    // Peak usage times (by hour of day)
    const peakUsageTimes = await PageView.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        {
            $group: {
                _id: { $hour: { date: '$timestamp', timezone: 'Asia/Ho_Chi_Minh' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } },
        {
            $project: {
                hour: '$_id',
                views: '$count',
                _id: 0
            }
        }
    ]);
    
    // Daily page views trend
    const dailyPageViews = await PageView.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp', timezone: 'Asia/Ho_Chi_Minh' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } },
        {
            $project: {
                date: '$_id',
                views: '$count',
                _id: 0
            }
        }
    ]);
    
    // Unique visitors (by sessionId or userId)
    const uniqueVisitors = await PageView.distinct('sessionId', {
        timestamp: { $gte: startDate },
        sessionId: { $exists: true, $ne: null }
    });
    
    const uniqueAuthenticatedUsers = await PageView.distinct('userId', {
        timestamp: { $gte: startDate },
        userId: { $exists: true, $ne: null }
    });
    
    res.status(200).json({
        period: { days, startDate },
        pageViewsByRoute,
        peakUsageTimes,
        dailyPageViews,
        uniqueVisitors: uniqueVisitors.length,
        uniqueAuthenticatedUsers: uniqueAuthenticatedUsers.length,
    });
});

// Real-time Analytics
export const getRealtimeAnalytics = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('viewAnalytics') middleware

    // Get users online (users who have viewed a page in the last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const activeUsers = await PageView.distinct('userId', {
        timestamp: { $gte: fiveMinutesAgo },
        userId: { $exists: true, $ne: null }, // Only count authenticated users
    });

    const usersOnline = activeUsers.length;

    // Get page views in the last 60 seconds (for "pages views / second" chart)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentPageViews = await PageView.find({
        timestamp: { $gte: oneMinuteAgo },
    }).sort({ timestamp: 1 }).lean();

    // Group by second for the chart
    const viewsPerSecond = {};
    recentPageViews.forEach((view) => {
        const timestamp = view.timestamp instanceof Date ? view.timestamp : new Date(view.timestamp);
        const second = Math.floor(timestamp.getTime() / 1000);
        viewsPerSecond[second] = (viewsPerSecond[second] || 0) + 1;
    });

    // Convert to array format for chart
    const viewsPerSecondData = Object.entries(viewsPerSecond)
        .map(([second, count]) => ({
            second: parseInt(second),
            count: count,
        }))
        .sort((a, b) => a.second - b.second)
        .slice(-60); // Last 60 seconds

    // Get most active pages (last 5 minutes)
    const mostActivePages = await PageView.aggregate([
        {
            $match: {
                timestamp: { $gte: fiveMinutesAgo },
            },
        },
        {
            $group: {
                _id: '$path',
                userCount: { $addToSet: '$userId' }, // Unique users per page
            },
        },
        {
            $project: {
                path: '$_id',
                userCount: { $size: '$userCount' },
            },
        },
        { $sort: { userCount: -1 } },
        { $limit: 6 },
    ]);

    res.status(200).json({
        usersOnline,
        viewsPerSecond: viewsPerSecondData,
        mostActivePages: mostActivePages.map((page) => ({
            path: page.path,
            userCount: page.userCount,
        })),
    });
});

// Track page view (called from frontend)
export const trackPageView = asyncHandler(async (req, res) => {
    const { path } = req.body;
    const userId = req.user?._id || null;
    const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId || null;

    if (!path) {
        return res.status(400).json({
            message: 'Path is required',
        });
    }

    // Create page view record
    await PageView.create({
        userId: userId || undefined,
        path: path,
        sessionId: sessionId || undefined,
        timestamp: new Date(),
    });

    res.status(200).json({
        message: 'Page view tracked',
    });
});

