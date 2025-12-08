import Image from '../models/Image.js';
import UserActivity from '../models/UserActivity.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { logger } from '../utils/logger.js';

/**
 * Get analytics data for a user's viewing/downloading activity
 * Returns: views/downloads over time, most popular images viewed, etc.
 * NOTE: This tracks what the USER viewed/downloaded, not views on the user's images
 */
export const getUserAnalytics = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { days = 30 } = req.query; // Default to last 30 days

    // Validate days parameter
    const daysNum = Math.min(Math.max(1, parseInt(days) || 30), 365); // Between 1 and 365 days

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get user's viewing/downloading activities in the date range
    const userActivities = await UserActivity.find({
        userId,
        date: { $gte: startDateStr, $lte: endDateStr },
    })
        .populate({
            path: 'imageId',
            select: 'imageTitle imageUrl thumbnailUrl smallUrl location imageCategory views downloads dailyViews dailyDownloads createdAt',
            populate: {
                path: 'imageCategory',
                select: 'name',
            },
        })
        .lean();

    // 1. Views/Downloads over time (aggregate daily data from user activities)
    // Use actual counts from images' dailyViews/dailyDownloads for dates when user viewed them
    const viewsOverTime = {};
    const downloadsOverTime = {};

    // Aggregate daily data from user activities
    // Use the count field if available, otherwise default to 1
    userActivities.forEach(activity => {
        if (!activity.imageId) return;
        
        const date = activity.date;
        if (date >= startDateStr && date <= endDateStr) {
            const count = activity.count || 1; // Use count field if available, default to 1
            
            if (activity.activityType === 'view') {
                viewsOverTime[date] = (viewsOverTime[date] || 0) + count;
            } else if (activity.activityType === 'download') {
                downloadsOverTime[date] = (downloadsOverTime[date] || 0) + count;
            }
        }
    });

    // Find first date with actual data (for views and downloads separately)
    const viewsDates = Object.keys(viewsOverTime)
        .filter(date => viewsOverTime[date] > 0 && date >= startDateStr && date <= endDateStr)
        .sort();
    
    const downloadsDates = Object.keys(downloadsOverTime)
        .filter(date => downloadsOverTime[date] > 0 && date >= startDateStr && date <= endDateStr)
        .sort();
    
    const firstViewsDate = viewsDates.length > 0 ? viewsDates[0] : null;
    const firstDownloadsDate = downloadsDates.length > 0 ? downloadsDates[0] : null;
    
    // For views: start from first date with data (within period), or startDate if no data
    const viewsStartDate = firstViewsDate && firstViewsDate >= startDateStr ? firstViewsDate : startDateStr;
    
    // For downloads: start from first date with data (within period), or startDate if no data
    const downloadsStartDate = firstDownloadsDate && firstDownloadsDate >= startDateStr ? firstDownloadsDate : startDateStr;

    // Fill in missing dates from first data date (not from period start)
    const viewsDatesToFill = [];
    for (let d = new Date(viewsStartDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        viewsDatesToFill.push(dateStr);
        if (!viewsOverTime[dateStr]) viewsOverTime[dateStr] = 0;
    }

    const downloadsDatesToFill = [];
    for (let d = new Date(downloadsStartDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        downloadsDatesToFill.push(dateStr);
        if (!downloadsOverTime[dateStr]) downloadsOverTime[dateStr] = 0;
    }

    // Convert to array format for charting
    const viewsData = viewsDatesToFill.map(date => ({
        date,
        value: viewsOverTime[date] || 0
    }));

    const downloadsData = downloadsDatesToFill.map(date => ({
        date,
        value: downloadsOverTime[date] || 0
    }));

    // 2. Most popular images (images this user viewed/downloaded most)
    const imageActivityCounts = {};
    userActivities.forEach(activity => {
        if (!activity.imageId) return; // Skip if image was deleted
        
        const imageId = activity.imageId._id?.toString() || activity.imageId.toString();
        if (!imageActivityCounts[imageId]) {
            imageActivityCounts[imageId] = {
                image: activity.imageId,
                views: 0,
                downloads: 0,
            };
        }
        
        if (activity.activityType === 'view') {
            imageActivityCounts[imageId].views += 1;
        } else if (activity.activityType === 'download') {
            imageActivityCounts[imageId].downloads += 1;
        }
    });

    const mostPopularImages = Object.values(imageActivityCounts)
        .map(item => ({
            _id: item.image._id,
            imageTitle: item.image.imageTitle || 'Untitled',
            imageUrl: item.image.imageUrl,
            thumbnailUrl: item.image.thumbnailUrl || item.image.smallUrl || item.image.imageUrl,
            smallUrl: item.image.smallUrl || item.image.imageUrl,
            views: item.views,
            downloads: item.downloads,
            totalEngagement: item.views + item.downloads * 2, // Downloads weighted 2x
            createdAt: item.image.createdAt,
        }))
        .sort((a, b) => b.totalEngagement - a.totalEngagement)
        .slice(0, 10); // Top 10

    // 3. Geographic distribution (locations of images user viewed/downloaded)
    const geographicDistribution = {};
    userActivities.forEach(activity => {
        if (!activity.imageId || !activity.imageId.location) return;
        
        const location = activity.imageId.location;
        const locationParts = (location || '').split(',').map(s => String(s || '').trim());
        const country = locationParts[locationParts.length - 1] || location;

        if (!geographicDistribution[country]) {
            geographicDistribution[country] = {
                location: country,
                imageCount: 0,
                totalViews: 0,
                totalDownloads: 0,
            };
        }

        geographicDistribution[country].imageCount += 1;
        if (activity.activityType === 'view') {
            geographicDistribution[country].totalViews += 1;
        } else if (activity.activityType === 'download') {
            geographicDistribution[country].totalDownloads += 1;
        }
    });

    const geographicData = Object.values(geographicDistribution)
        .sort((a, b) => b.totalViews - a.totalViews)
        .slice(0, 10); // Top 10 locations

    // 4. Best performing categories (categories of images user viewed/downloaded)
    const categoryPerformance = {};
    userActivities.forEach(activity => {
        if (!activity.imageId) return;
        
        // Need to populate category if not already populated
        const categoryName = activity.imageId.imageCategory?.name || 'Unknown';

        if (!categoryPerformance[categoryName]) {
            categoryPerformance[categoryName] = {
                category: categoryName,
                imageCount: 0,
                totalViews: 0,
                totalDownloads: 0,
                avgViews: 0,
            };
        }

        categoryPerformance[categoryName].imageCount += 1;
        if (activity.activityType === 'view') {
            categoryPerformance[categoryName].totalViews += 1;
        } else if (activity.activityType === 'download') {
            categoryPerformance[categoryName].totalDownloads += 1;
        }
    });

    // Calculate averages
    Object.values(categoryPerformance).forEach(cat => {
        cat.avgViews = cat.imageCount > 0 ? Math.round(cat.totalViews / cat.imageCount) : 0;
    });

    const categoryData = Object.values(categoryPerformance)
        .sort((a, b) => b.totalViews - a.totalViews)
        .slice(0, 10); // Top 10 categories

    // Calculate summary stats - count unique images viewed/downloaded
    const uniqueImagesViewed = new Set(
        userActivities
            .filter(a => a.activityType === 'view' && a.imageId)
            .map(a => a.imageId._id?.toString() || a.imageId.toString())
    ).size;
    
    const uniqueImagesDownloaded = new Set(
        userActivities
            .filter(a => a.activityType === 'download' && a.imageId)
            .map(a => a.imageId._id?.toString() || a.imageId.toString())
    ).size;

    const totalViews = viewsData.reduce((sum, item) => sum + item.value, 0);
    const totalDownloads = downloadsData.reduce((sum, item) => sum + item.value, 0);
    const totalImages = uniqueImagesViewed; // Total unique images viewed
    const avgViewsPerImage = totalImages > 0 ? Math.round(totalViews / totalImages) : 0;
    const avgDownloadsPerImage = uniqueImagesDownloaded > 0 ? Math.round(totalDownloads / uniqueImagesDownloaded) : 0;

    res.status(200).json({
        summary: {
            totalImages,
            totalViews,
            totalDownloads,
            avgViewsPerImage,
            avgDownloadsPerImage,
            period: `${daysNum} days`,
        },
        viewsOverTime: viewsData,
        downloadsOverTime: downloadsData,
        mostPopularImages,
        geographicDistribution: geographicData,
        bestPerformingCategories: categoryData,
    });
});


