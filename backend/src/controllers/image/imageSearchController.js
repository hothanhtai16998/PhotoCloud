import Image from '../../models/Image.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { logger } from '../../utils/logger.js';
import { listImages } from '../../services/search/imageListing.js';

export const getAllImages = asyncHandler(async (req, res) => {
  const { missingCategory, ...result } = await listImages(req.query);
  // An inactive/missing category historically returns early without cache headers.
  if (!missingCategory) {
    res.set(
      'Cache-Control',
      req.query._t
        ? 'no-cache, no-store, must-revalidate'
        : 'public, max-age=300'
    );
  }
  res.status(200).json(result);
});

// Get unique locations for suggestions/filtering
export const getLocations = asyncHandler(async (req, res) => {
  try {
    // Get unique locations from images (case-insensitive, sorted by popularity)
    const locations = await Image.aggregate([
      {
        $match: {
          location: { $exists: true, $ne: null, $ne: '' },
        },
      },
      {
        $group: {
          _id: { $toLower: '$location' }, // Case-insensitive grouping
          originalLocation: { $first: '$location' }, // Keep original case for first occurrence
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 }, // Sort by popularity (most images first)
      },
      {
        $limit: 50, // Limit to top 50 locations
      },
      {
        $project: {
          _id: 0,
          location: '$originalLocation',
          count: 1,
        },
      },
    ]);

    res.status(200).json({
      locations: locations.map((loc) => loc.location),
    });
  } catch (error) {
    logger.error('Error fetching locations:', error);
    res.status(500).json({
      message: 'Lỗi khi lấy danh sách địa điểm',
    });
  }
});
