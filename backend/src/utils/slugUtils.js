/**
 * Utility functions for handling image slugs
 * Matches frontend implementation in frontend/src/lib/utils.ts
 */

/**
 * Extract image ID from slug
 * Slug format: "title-slug-{shortId}" where shortId is last 12 chars of MongoDB ObjectId
 * @param {string} slug - The image slug
 * @returns {string|null} - The short ID (last 12 chars) or null if invalid
 */
export function extractIdFromSlug(slug) {
  if (!slug || typeof slug !== 'string') return null;
  
  // Extract the last part after the last hyphen (should be 12 hex characters)
  const parts = slug.split('-');
  if (parts.length === 0) return null;
  
  const shortId = parts[parts.length - 1];
  
  // Validate: should be exactly 12 hex characters
  if (!/^[0-9a-fA-F]{12}$/.test(shortId)) {
    return null;
  }
  
  return shortId;
}

/**
 * Find image by short ID (last 12 characters of MongoDB ObjectId)
 * @param {string} shortId - The short ID (12 hex characters)
 * @returns {Promise<Object|null>} - The image document or null if not found
 */
export async function findImageByShortId(shortId) {
  if (!shortId || shortId.length !== 12) return null;
  
  const Image = (await import('../models/Image.js')).default;
  
  // More efficient approach: Use aggregation with $expr to match last 12 chars
  // Convert ObjectId to string and use $substr to get last 12 characters
  const images = await Image.aggregate([
    {
      $addFields: {
        shortId: {
          $substr: [{ $toString: '$_id' }, -12, 12]
        }
      }
    },
    {
      $match: {
        shortId: shortId.toLowerCase()
      }
    },
    {
      $limit: 1
    }
  ]);
  
  if (images.length === 0) {
    return null;
  }
  
  // Populate uploadedBy and imageCategory
  const image = images[0];
  const User = (await import('../models/User.js')).default;
  const Category = (await import('../models/Category.js')).default;
  
  // Populate uploadedBy
  if (image.uploadedBy) {
    const user = await User.findById(image.uploadedBy)
      .select('username displayName')
      .lean();
    image.uploadedBy = user;
  }
  
  // Populate imageCategory
  if (image.imageCategory) {
    const category = await Category.findById(image.imageCategory)
      .select('name')
      .lean();
    image.imageCategory = category;
  }
  
  return image;
}

