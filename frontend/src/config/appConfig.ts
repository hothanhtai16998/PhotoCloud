/**
 * General Application Configuration
 * 
 * Edit this file to customize general app settings.
 */

export const appConfig = {
    // Responsive breakpoints in pixels
    // Use these to detect device layouts and conditionally render modal vs page.
    breakpoints: {
        // Phones (portrait)
        xs: 480,
        // Small tablets / large phones
        sm: 640,
        // Tablets (portrait)
        md: 768,
        // Tablets (landscape) / small laptops
        lg: 1024,
        // Desktops
        xl: 1280,
        // Large desktops / 2K
        xxl: 1536,
    },
    // Backward-compatible mobile breakpoint (use md by default)
    mobileBreakpoint: 768,
    
    // API timeout in milliseconds (2 minutes for file uploads)
    apiTimeout: 120000,
    
    // Storage keys
    storage: {
        // Search history localStorage key
        searchHistoryKey: 'photoApp_searchHistory',
        
        // Image page navigation flag (sessionStorage)
        imagePageFromGridKey: 'imagePage_fromGrid',
        
        // Profile view tracking (sessionStorage) - format: `profile_view_${userId}_${viewerId}`
        profileViewKeyPrefix: 'profile_view_',
    },
    
    // Refresh behavior configuration
    refresh: {
        // Delay before refresh (in milliseconds)
        // Fixed delay used by Unsplash, Gmail, X, Facebook (1-3 seconds)
        // This is NOT dynamic based on network speed - it's a UX feature
        // Purpose: Give users time to cancel + prevent rapid refresh spam
        delayMs: 1500, // 1.5 seconds - faster UX while still allowing cancellation
        
        // Minimum delay (safety net)
        minDelayMs: 1500, // 1.5 seconds minimum
        
        // Maximum delay (safety net)
        maxDelayMs: 5000, // 5 seconds maximum
    },
} as const;

