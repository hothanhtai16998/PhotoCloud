/**
 * Search Bar Configuration
 * 
 * Edit this file to customize search functionality settings.
 */

export const searchConfig = {
    // Maximum number of search history items to store
    maxHistoryItems: 5,
    
    // Debounce delay for search input in milliseconds
    searchDebounceMs: 300,
    
    // Debounce delay for search suggestions (faster than main search)
    suggestionsDebounceMs: 200,
    
    // LocalStorage key for search filters
    filtersStorageKey: 'photoApp_searchFilters',
} as const;

