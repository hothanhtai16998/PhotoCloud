import { get } from '@/lib/api';
import type { SearchSuggestion, SearchSuggestionsResponse, PopularSearchesResponse } from '@/types/search';

// Re-export for backward compatibility
export type { SearchSuggestion, SearchSuggestionsResponse, PopularSearchesResponse } from '@/types/search';

export const searchService = {
  /**
   * Get search suggestions based on query
   */
  getSuggestions: async (
    query: string,
    limit: number = 10,
    signal?: AbortSignal
  ): Promise<SearchSuggestion[]> => {
    if (!query || query.trim().length < 1) {
      return [];
    }

    try {
      const res = await get(`/search/suggestions?q=${encodeURIComponent(query.trim())}&limit=${limit}`, {
        withCredentials: true,
        signal, // Pass abort signal for request cancellation
      });

      return (res.data as SearchSuggestionsResponse).suggestions || [];
    } catch (error) {
      // Ignore cancelled requests
      if ((error as { code?: string })?.code === 'ERR_CANCELED' || (error as { name?: string })?.name === 'CanceledError') {
        return [];
      }
      console.error('Failed to fetch search suggestions:', error);
      return [];
    }
  },

  /**
   * Get popular searches
   */
  getPopularSearches: async (): Promise<SearchSuggestion[]> => {
    try {
      const res = await get('/search/popular', {
        withCredentials: true,
      });

      return (res.data as PopularSearchesResponse).popular || [];
    } catch (error) {
      console.error('Failed to fetch popular searches:', error);
      return [];
    }
  },
};

