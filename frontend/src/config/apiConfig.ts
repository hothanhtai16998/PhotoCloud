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
} as const;

