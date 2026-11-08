import { safeTrim } from './inputUtils.js';

export function normalizeListedImages(imagesRaw, category) {
  let images = imagesRaw.map((img) => {
    // Check if imageCategory is populated correctly
    const hasValidCategory =
      img.imageCategory &&
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
  images = images.filter((img) => img.imageCategory !== null);

  // Additional validation: If category filter was applied, ensure populated category name matches
  // This catches any edge cases where ObjectId might match but category name doesn't
  // This is a safety net to ensure images only appear in their correct category
  if (category) {
    const normalizedCategory = safeTrim(category).toLowerCase();

    images = images.filter((img) => {
      // Strict validation: imageCategory must be a valid object with name
      if (
        !img.imageCategory ||
        typeof img.imageCategory !== 'object' ||
        !img.imageCategory.name ||
        img.imageCategory.isActive === false
      ) {
        return false; // Filter out images with invalid or inactive categories
      }
      // Case-insensitive exact match to ensure category name matches
      const imageCategoryName = safeTrim(img.imageCategory.name).toLowerCase();
      return imageCategoryName === normalizedCategory;
    });
  }

  return images;
}
