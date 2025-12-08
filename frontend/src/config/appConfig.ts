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
} as const;

