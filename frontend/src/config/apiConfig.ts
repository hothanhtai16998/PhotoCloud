/**
 * API Configuration
 * 
 * Edit this file to customize API-related settings.
 */

export const apiConfig = {
    // Retry configuration
    retry: {
        // Maximum number of retry attempts
        maxRetries: 3,
        
        // Initial delay between retries in milliseconds
        initialDelayMs: 1000,
        
        // Backoff strategy: 'exponential' or 'linear'
        backoff: 'exponential' as const,
    },
    
    // Geocoding service configuration
    geocoding: {
        // Default language for location search
        defaultLanguage: 'vi',
        
        // Default limit for location suggestions
        defaultLimit: 8,
    },
    
    // Service Worker configuration
    serviceWorker: {
        // Service worker script path
        scriptPath: '/sw.js',
    },
    
    // API endpoint paths
    endpoints: {
        // Authentication endpoints
        auth: {
            signin: '/auth/signin',
            signup: '/auth/signup',
            refresh: '/auth/refresh',
            googleCallback: '/auth/google/callback',
        },
        
        // CSRF token endpoint
        csrfToken: '/csrf-token',
        
        // Image endpoints
        images: {
            base: '/images',
            download: (id: string) => `/images/${id}/download`,
        },
        
        // User endpoints
        users: {
            base: '/users',
        },
        
        // Admin endpoints
        admin: {
            base: '/admin',
        },
        
        // Collection endpoints
        collections: {
            base: '/collections',
        },
    },
} as const;

