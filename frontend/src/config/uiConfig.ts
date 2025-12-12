/**
 * UI Configuration
 * 
 * Edit this file to customize UI-related settings (skeleton counts, display limits, etc.).
 */

export const uiConfig = {
    // Skeleton loading placeholders
    skeleton: {
        // Number of skeleton items for image grids
        gridSkeletonCount: 12,
        
        // Number of skeleton items for collection grids
        collectionGridCount: 6,
        
        // Number of skeleton items for analytics cards
        analyticsCardCount: 4,
    },
    
    // Tag input limits
    tags: {
        // Maximum number of tags allowed
        maxTags: 20,
        
        // Maximum length per tag
        maxTagLength: 50,
    },
    
    // Analytics date range options (in days)
    analytics: {
        dayOptions: [7, 30, 90, 180, 365] as const,
    },
} as const;

