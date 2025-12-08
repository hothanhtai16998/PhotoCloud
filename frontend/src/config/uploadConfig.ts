/**
 * Upload Page Configuration
 * 
 * Edit this file to customize upload page settings.
 */

export const uploadConfig = {
    // Categories to display on upload page
    categories: ['Nature', 'Portrait', 'Architecture', 'Travel', 'Street', 'Abstract'] as const,
    
    // Number of images to show per category
    imagesPerCategory: 4,
    
    // Number of categories to display
    maxCategories: 3,
    
    // Minimum images required to show a category
    minImagesPerCategory: 2,
} as const;

