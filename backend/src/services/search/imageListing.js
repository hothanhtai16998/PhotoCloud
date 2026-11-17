import Category from '../../models/Category.js';
import { logger } from '../../utils/logger.js';
import { PAGINATION } from '../../utils/constants.js';
import { safeTrim, escapeRegex } from '../../utils/inputUtils.js';
import { normalizeListedImages } from '../../utils/imageListingResponse.js';
import { buildSortQuery } from '../../utils/imageSort.js';
import { fetchImagePage } from './imagePage.js';
import { publicImageFilter } from '../../utils/publicImageFilter.js';

export async function listImages(params) {
  const page = Math.max(1, parseInt(params.page) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(
    Math.max(1, parseInt(params.limit) || PAGINATION.DEFAULT_LIMIT),
    PAGINATION.MAX_LIMIT
  );
  const skip = (page - 1) * limit;
  const search = safeTrim(params.search);
  const category = safeTrim(params.category);
  const location = safeTrim(params.location);
  const color = safeTrim(params.color); // Color filter
  const tag = safeTrim(params.tag); // Single tag filter (legacy)
  const tags = params.tags
    ? Array.isArray(params.tags)
      ? params.tags
      : params.tags.split(',')
    : null; // Multiple tags
  const dateFrom = safeTrim(params.dateFrom);
  const dateTo = safeTrim(params.dateTo);
  const orientation = safeTrim(params.orientation); // portrait, landscape, square
  const sortBy = safeTrim(params.sortBy) || 'date'; // date, views, downloads, favorites, relevance
  const order = safeTrim(params.order) || 'desc'; // asc, desc

  // EXIF filters
  const cameraMake = safeTrim(params.cameraMake);
  const cameraModel = safeTrim(params.cameraModel);
  const focalLengthMin = params.focalLengthMin
    ? parseFloat(params.focalLengthMin)
    : null;
  const focalLengthMax = params.focalLengthMax
    ? parseFloat(params.focalLengthMax)
    : null;
  const apertureMin = params.apertureMin
    ? parseFloat(params.apertureMin)
    : null;
  const apertureMax = params.apertureMax
    ? parseFloat(params.apertureMax)
    : null;
  const isoMin = params.isoMin ? parseInt(params.isoMin) : null;
  const isoMax = params.isoMax ? parseInt(params.isoMax) : null;

  // Image dimensions filters
  const minWidth = params.minWidth ? parseInt(params.minWidth) : null;
  const minHeight = params.minHeight ? parseInt(params.minHeight) : null;
  const aspectRatio = safeTrim(params.aspectRatio); // e.g., "16:9", "4:3", "1:1"

  // Build query
  const query = {};
  let useTextSearch = false;

  if (search) {
    // Search in all text fields: title, location, description, and tags
    // Use regex for reliable search across all fields (including tags which aren't in text index)
    const escapedSearch = escapeRegex(search);
    query.$or = [
      { imageTitle: { $regex: new RegExp(escapedSearch, 'i') } },
      { location: { $regex: new RegExp(escapedSearch, 'i') } },
      { description: { $regex: new RegExp(escapedSearch, 'i') } },
      { tags: { $regex: new RegExp(escapedSearch, 'i') } },
    ];
    useTextSearch = false; // Using regex, not text search
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
      return {
        missingCategory: true,
        images: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0,
        },
      };
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
    const escapedTags = tags
      .map((t) => escapeRegex(safeTrim(t)))
      .filter((t) => t);
    if (escapedTags.length > 0) {
      query.tags = { $all: escapedTags.map((t) => new RegExp(`^${t}$`, 'i')) };
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
        $expr: { $gt: ['$height', '$width'] },
      });
    } else if (orientation === 'landscape') {
      query.$and.push({
        $expr: { $gt: ['$width', '$height'] },
      });
    } else if (orientation === 'square') {
      query.$and.push({
        $expr: { $eq: ['$width', '$height'] },
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
                {
                  $abs: {
                    $subtract: [
                      { $divide: ['$width', '$height'] },
                      targetRatio,
                    ],
                  },
                },
                tolerance,
              ],
            },
          ],
        },
      });
    }
  }

  // Only show approved images on homepage (or images with no moderation status for backward compatibility)
  // This ensures unapproved images don't appear until admin approves them
  // Use $or for moderation status check, but combine with existing query properly
  const moderationFilter = publicImageFilter();

  // Combine all conditions - need to handle $or (search) with other conditions
  // Build the main conditions object (everything except $and)
  const mainConditions = {};
  const existingAndConditions = query.$and || [];

  // Collect all non-$and conditions
  Object.keys(query).forEach((key) => {
    if (key !== '$and' && key !== '$text') {
      mainConditions[key] = query[key];
    }
  });

  // If we have any main conditions or existing $and conditions, combine with moderation filter
  const hasMainConditions = Object.keys(mainConditions).length > 0;
  const hasAndConditions = existingAndConditions.length > 0;

  if (hasMainConditions || hasAndConditions) {
    // Build the final $and array
    query.$and = [];

    // Add main conditions if they exist
    if (hasMainConditions) {
      query.$and.push(mainConditions);
    }

    // Add existing $and conditions
    if (hasAndConditions) {
      query.$and.push(...existingAndConditions);
    }

    // Always add moderation filter
    query.$and.push(moderationFilter);

    // Clear the original query object (all conditions are now in $and)
    Object.keys(query).forEach((key) => {
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

  // Debug: log the final query structure for troubleshooting
  if (search) {
    logger.info('Search query:', search);
    logger.info('Final query structure:', JSON.stringify(query, null, 2));
  }

  try {
    [imagesRaw, total] = await fetchImagePage(
      query,
      buildSortQuery(sortBy, order, useTextSearch),
      skip,
      limit
    );
  } catch (error) {
    logger.error('Error fetching images:', error);

    // If text search fails (e.g., text index doesn't exist), fallback to regex search
    if (
      error.message &&
      (error.message.includes('text index') || error.message.includes('$text'))
    ) {
      logger.warn(
        'Text index not found or text search failed, falling back to regex search'
      );
      // Remove $text search and use regex instead
      if (search) {
        const escapedSearch = escapeRegex(search);
        // Replace $or with regex search in all fields
        query.$or = [
          { imageTitle: { $regex: new RegExp(escapedSearch, 'i') } },
          { location: { $regex: new RegExp(escapedSearch, 'i') } },
          { description: { $regex: new RegExp(escapedSearch, 'i') } },
          { tags: { $regex: new RegExp(escapedSearch, 'i') } },
        ];
        // Rebuild query with moderation filter
        query.$and = [{ $or: query.$or }, moderationFilter];
        delete query.$text;
        useTextSearch = false;
      }

      // Retry with regex search
      try {
        [imagesRaw, total] = await fetchImagePage(
          query,
          buildSortQuery(sortBy, order, useTextSearch),
          skip,
          limit
        );
      } catch (retryError) {
        logger.error('Error fetching images with regex fallback:', retryError);
        throw retryError;
      }
    } else {
      // Other errors - try without populating category
      [imagesRaw, total] = await fetchImagePage(
        query,
        buildSortQuery(sortBy, order, useTextSearch),
        skip,
        limit
      );
    }
  }

  // Handle images with invalid or missing category references
  // If category populate failed (null or invalid), set to null
  const images = normalizeListedImages(imagesRaw, category);

  return {
    images,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}
