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
    
    // Layout constants
    layout: {
        // Header height fallback (desktop) - used when dynamic calculation fails
        headerHeightFallbackPx: 100,
        
        // Image preload viewport margin (how far before viewport to start loading)
        imagePreloadMarginPx: 500,
        
        // Common modal/modal max widths
        modalMaxWidthPx: 500,
        
        // Common avatar/thumbnail sizes
        avatarSizePx: 100,
    },
} as const;

