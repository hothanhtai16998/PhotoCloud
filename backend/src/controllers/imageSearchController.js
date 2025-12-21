import Image from '../models/Image.js';
import Category from '../models/Category.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { logger } from '../utils/logger.js';
import { PAGINATION } from '../utils/constants.js';
import { safeTrim, escapeRegex } from '../utils/inputUtils.js';

/**
 * Build sort query based on sortBy parameter
 */
function buildSortQuery(sortBy, order, useTextSearch) {
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortQuery = {};
    
    switch (sortBy) {
        case 'relevance':
            if (useTextSearch) {
                sortQuery.score = { $meta: 'textScore' };
            }
            sortQuery.createdAt = -1; // Fallback
            break;
        case 'views':
            sortQuery.views = sortOrder;
            sortQuery.createdAt = -1; // Secondary sort
            break;
        case 'downloads':
            sortQuery.downloads = sortOrder;
            sortQuery.createdAt = -1; // Secondary sort
            break;
        case 'favorites':
            sortQuery.favorites = sortOrder;
            sortQuery.createdAt = -1; // Secondary sort
            break;
        case 'date':
        default:
            sortQuery.createdAt = sortOrder;
            break;
    }
    
    return sortQuery;
}

export const getAllImages = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE);
    const limit = Math.min(
        Math.max(1, parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT),
        PAGINATION.MAX_LIMIT
    );
    const skip = (page - 1) * limit;
    const search = safeTrim(req.query.search);
    const category = safeTrim(req.query.category);
    const location = safeTrim(req.query.location);
    const color = safeTrim(req.query.color); // Color filter
    const tag = safeTrim(req.query.tag); // Single tag filter (legacy)
    const tags = req.query.tags ? (Array.isArray(req.query.tags) ? req.query.tags : req.query.tags.split(',')) : null; // Multiple tags
    const dateFrom = safeTrim(req.query.dateFrom);
    const dateTo = safeTrim(req.query.dateTo);
    const orientation = safeTrim(req.query.orientation); // portrait, landscape, square
    const sortBy = safeTrim(req.query.sortBy) || 'date'; // date, views, downloads, favorites, relevance
    const order = safeTrim(req.query.order) || 'desc'; // asc, desc
    
    // EXIF filters
    const cameraMake = safeTrim(req.query.cameraMake);
    const cameraModel = safeTrim(req.query.cameraModel);
    const focalLengthMin = req.query.focalLengthMin ? parseFloat(req.query.focalLengthMin) : null;
    const focalLengthMax = req.query.focalLengthMax ? parseFloat(req.query.focalLengthMax) : null;
    const apertureMin = req.query.apertureMin ? parseFloat(req.query.apertureMin) : null;
    const apertureMax = req.query.apertureMax ? parseFloat(req.query.apertureMax) : null;
    const isoMin = req.query.isoMin ? parseInt(req.query.isoMin) : null;
    const isoMax = req.query.isoMax ? parseInt(req.query.isoMax) : null;
    
    // Image dimensions filters
    const minWidth = req.query.minWidth ? parseInt(req.query.minWidth) : null;
    const minHeight = req.query.minHeight ? parseInt(req.query.minHeight) : null;
    const aspectRatio = safeTrim(req.query.aspectRatio); // e.g., "16:9", "4:3", "1:1"

    // Build query
    const query = {};
    let useTextSearch = false;

    if (search) {
        // Use text search for better performance (requires text index)
        // Text search is much faster than regex for large collections
        // Note: If text index doesn't exist, MongoDB will throw an error
        // In that case, the error handler will catch it and you should create the index
        query.$text = { $search: search };
        useTextSearch = true;
    }
    if (category) {
        // Find category by name (case-insensitive) - must be active
        const escaped = escapeRegex(category);
        const categoryDoc = await Category.findOne({
            name: { $regex: new RegExp(`^${escaped}$`, 'i') },
            isActive: true,
        });
        if (categoryDoc && categoryDoc._id) {
            // Strictly match only this category ID - use the ObjectId directly from the document
            query.imageCategory = categoryDoc._id;
        } else {
            // If category not found or inactive, return empty results
            return res.status(200).json({
                images: [],
                pagination: {
                    page,
                    limit,
                    total: 0,
                    pages: 0,
                },
            });
        }
    } else {
        // When no category filter, only show images with a category (approved images)
        // Pending images without category won't appear on homepage until admin adds category
        query.imageCategory = { $exists: true, $ne: null };
    }
    if (location) {
        // Filter by location (case-insensitive partial match)
        const escapedLocation = escapeRegex(location);
        query.location = { $regex: new RegExp(escapedLocation, 'i') };
    }
    if (color && color !== 'all') {
        // Filter by dominant color
        // For MongoDB array fields, assigning a value directly checks if it exists in the array
        query.dominantColors = color;
    }
    // Tag filtering - support both single tag (legacy) and multiple tags
    if (tags && tags.length > 0) {
        // Multiple tags - all must match (AND logic)
        const escapedTags = tags.map(t => escapeRegex(safeTrim(t))).filter(t => t);
        if (escapedTags.length > 0) {
            query.tags = { $all: escapedTags.map(t => new RegExp(`^${t}$`, 'i')) };
        }
    } else if (tag) {
        // Single tag filter (legacy support)
        const escapedTag = escapeRegex(tag);
        query.tags = { $regex: new RegExp(`^${escapedTag}$`, 'i') };
    }
    
    // Date range filter
    if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) {
            const fromDate = new Date(dateFrom);
            fromDate.setHours(0, 0, 0, 0); // Start of day
            query.createdAt.$gte = fromDate;
        }
        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999); // End of day
            query.createdAt.$lte = toDate;
        }
    }
    
    // Orientation filter (portrait, landscape, square)
    if (orientation && orientation !== 'all') {
        if (!query.$and) query.$and = [];
        
        if (orientation === 'portrait') {
            query.$and.push({
                $expr: { $gt: ['$height', '$width'] }
            });
        } else if (orientation === 'landscape') {
            query.$and.push({
                $expr: { $gt: ['$width', '$height'] }
            });
        } else if (orientation === 'square') {
            query.$and.push({
                $expr: { $eq: ['$width', '$height'] }
            });
        }
    }
    
    // EXIF filters
    if (cameraMake) {
        const escapedMake = escapeRegex(cameraMake);
        query.cameraMake = { $regex: new RegExp(escapedMake, 'i') };
    }
    if (cameraModel) {
        const escapedModel = escapeRegex(cameraModel);
        query.cameraModel = { $regex: new RegExp(escapedModel, 'i') };
    }
    if (focalLengthMin !== null || focalLengthMax !== null) {
        query.focalLength = {};
        if (focalLengthMin !== null) query.focalLength.$gte = focalLengthMin;
        if (focalLengthMax !== null) query.focalLength.$lte = focalLengthMax;
    }
    if (apertureMin !== null || apertureMax !== null) {
        query.aperture = {};
        if (apertureMin !== null) query.aperture.$gte = apertureMin;
        if (apertureMax !== null) query.aperture.$lte = apertureMax;
    }
    if (isoMin !== null || isoMax !== null) {
        query.iso = {};
        if (isoMin !== null) query.iso.$gte = isoMin;
        if (isoMax !== null) query.iso.$lte = isoMax;
    }
    
    // Image dimensions filters
    if (minWidth !== null) {
        query.width = { ...(query.width || {}), $gte: minWidth };
    }
    if (minHeight !== null) {
        query.height = { ...(query.height || {}), $gte: minHeight };
    }
    if (aspectRatio) {
        // Parse aspect ratio (e.g., "16:9" -> 16/9 = 1.777...)
        const [width, height] = aspectRatio.split(':').map(Number);
        if (width && height && !isNaN(width) && !isNaN(height)) {
            const targetRatio = width / height;
            const tolerance = 0.01; // Allow small tolerance for floating point
            if (!query.$and) query.$and = [];
            query.$and.push({
                $expr: {
                    $and: [
                        { $ne: ['$width', null] },
                        { $ne: ['$height', null] },
                        {
                            $lte: [
                                { $abs: { $subtract: [{ $divide: ['$width', '$height'] }, targetRatio] } },
                                tolerance
                            ]
                        }
                    ]
                }
            });
        }
    }

    // Only show approved images on homepage (or images with no moderation status for backward compatibility)
    // This ensures unapproved images don't appear until admin approves them
    // Use $or for moderation status check, but combine with existing query properly
    const moderationFilter = {
        $or: [
            { moderationStatus: 'approved' },
            { moderationStatus: { $exists: false } }, // Backward compatibility - show old images without moderation status
            { moderationStatus: null }, // Also handle null values
        ]
    };

    // Combine all conditions - if query has other conditions, use $and
    const hasOtherConditions = Object.keys(query).length > 0 && !query.$text;
    if (hasOtherConditions) {
        // Wrap existing conditions and moderation filter in $and
        const existingConditions = { ...query };
        query.$and = [
            existingConditions,
            moderationFilter
        ];
        // Remove original conditions (they're now in $and)
        Object.keys(existingConditions).forEach(key => {
            if (key !== '$and' && key !== '$text') {
                delete query[key];
            }
        });
    } else {
        // No other conditions, just use moderation filter
        Object.assign(query, moderationFilter);
    }

    // Get images with pagination
    // Use estimatedDocumentCount for better performance on large collections
    // Only use countDocuments if we need exact count (e.g., with filters)
    let imagesRaw, total;
    try {
        [imagesRaw, total] = await Promise.all([
            Image.find(query)
                .populate('uploadedBy', 'username displayName avatarUrl')
                .populate({
                    path: 'imageCategory',
                    select: 'name description isActive',
                    // Handle missing categories gracefully (for legacy data or deleted categories)
                    justOne: true,
                    match: { isActive: true } // Only populate if category is active
                })
                // Sort based on sortBy parameter
                .sort(buildSortQuery(sortBy, order, useTextSearch))
                .skip(skip)
                .limit(limit)
                .lean(),
            // For filtered queries, we need exact count. For unfiltered, estimated is faster
            Object.keys(query).length > 0
                ? Image.countDocuments(query)
                : Image.estimatedDocumentCount(),
        ]);
    } catch (error) {
        logger.error('Error fetching images (populate may have failed):', error);
        // If populate fails (e.g., invalid category references), try without populating category
        // But we still need to populate category to validate it
        [imagesRaw, total] = await Promise.all([
            Image.find(query)
                .populate('uploadedBy', 'username displayName avatarUrl')
                .populate({
                    path: 'imageCategory',
                    select: 'name description isActive',
                    justOne: true,
                    match: { isActive: true }
                })
                .sort(buildSortQuery(sortBy, order, useTextSearch))
                .skip(skip)
                .limit(limit)
                .lean(),
            Object.keys(query).length > 0
                ? Image.countDocuments(query)
                : Image.estimatedDocumentCount(),
        ]);
    }

    // Handle images with invalid or missing category references
    // If category populate failed (null or invalid), set to null
    let images = imagesRaw.map(img => {
        // Check if imageCategory is populated correctly
        const hasValidCategory = img.imageCategory &&
            typeof img.imageCategory === 'object' &&
            img.imageCategory.name &&
            img.imageCategory.isActive !== false; // Ensure category is active

        // Convert dailyViews and dailyDownloads Maps to plain objects
        // When using .lean(), Maps are already plain objects, so we need to handle both cases
        let dailyViewsObj = {};
        if (img.dailyViews) {
            if (img.dailyViews instanceof Map) {
                dailyViewsObj = Object.fromEntries(img.dailyViews);
            } else {
                // Already a plain object from .lean()
                dailyViewsObj = img.dailyViews;
            }
        }

        let dailyDownloadsObj = {};
        if (img.dailyDownloads) {
            if (img.dailyDownloads instanceof Map) {
                dailyDownloadsObj = Object.fromEntries(img.dailyDownloads);
            } else {
                // Already a plain object from .lean()
                dailyDownloadsObj = img.dailyDownloads;
            }
        }

        return {
            ...img,
            // Ensure imageCategory is either an object with name or null
            imageCategory: hasValidCategory ? img.imageCategory : null,
            // Include daily views and downloads
            dailyViews: dailyViewsObj,
            dailyDownloads: dailyDownloadsObj,
        };
    });

    // Filter out images with invalid or inactive categories
    images = images.filter(img => img.imageCategory !== null);

    // Additional validation: If category filter was applied, ensure populated category name matches
    // This catches any edge cases where ObjectId might match but category name doesn't
    // This is a safety net to ensure images only appear in their correct category
    if (category) {
        const normalizedCategory = safeTrim(category).toLowerCase();
        const originalCount = images.length;

        images = images.filter(img => {
            // Strict validation: imageCategory must be a valid object with name
            if (!img.imageCategory ||
                typeof img.imageCategory !== 'object' ||
                !img.imageCategory.name ||
                img.imageCategory.isActive === false) {
                return false; // Filter out images with invalid or inactive categories
            }
            // Case-insensitive exact match to ensure category name matches
            const imageCategoryName = safeTrim(img.imageCategory.name).toLowerCase();
            return imageCategoryName === normalizedCategory;
        });
    }

    // Set cache headers for better performance (like Unsplash)
    // Check if there's a cache-busting parameter
    const hasCacheBust = req.query._t;
    if (hasCacheBust) {
        // If cache-busting is requested, use no-cache
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
        // Otherwise, cache API responses for 5 minutes, images themselves are cached by S3/CDN
        res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
    }

    res.status(200).json({
        images,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    });
});

// Get unique locations for suggestions/filtering
export const getLocations = asyncHandler(async (req, res) => {
    try {
        // Get unique locations from images (case-insensitive, sorted by popularity)
        const locations = await Image.aggregate([
            {
                $match: {
                    location: { $exists: true, $ne: null, $ne: '' }
                }
            },
            {
                $group: {
                    _id: { $toLower: '$location' }, // Case-insensitive grouping
                    originalLocation: { $first: '$location' }, // Keep original case for first occurrence
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 } // Sort by popularity (most images first)
            },
            {
                $limit: 50 // Limit to top 50 locations
            },
            {
                $project: {
                    _id: 0,
                    location: '$originalLocation',
                    count: 1
                }
            }
        ]);

        res.status(200).json({
            locations: locations.map(loc => loc.location)
        });
    } catch (error) {
        logger.error('Error fetching locations:', error);
        res.status(500).json({
            message: 'Lỗi khi lấy danh sách địa điểm',
        });
    }
});

