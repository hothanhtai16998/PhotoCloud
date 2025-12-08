import api from '@/lib/axios';
import type {
  FavoriteResponse,
  FavoritesCheckResponse,
  FavoritesListResponse,
} from '@/types/favorite';

// Re-export for backward compatibility
export type {
  FavoriteResponse,
  FavoritesCheckResponse,
  FavoritesListResponse,
} from '@/types/favorite';

export const favoriteService = {
  /**
   * Toggle favorite status for an image
   */
  toggleFavorite: async (imageId: string): Promise<FavoriteResponse> => {
    const res = await api.post(
      `/favorites/${imageId}`,
      {},
      {
        withCredentials: true,
      }
    );
    return res.data;
  },

  /**
   * Get user's favorite images
   */
  getFavorites: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<FavoritesListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.page) {
      queryParams.append('page', params.page.toString());
    }
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }

    const queryString = queryParams.toString();
    const url = queryString ? `/favorites?${queryString}` : '/favorites';

    const res = await api.get(url, {
      withCredentials: true,
    });
    return res.data;
  },

  /**
   * Check if multiple images are favorited
   * CSRF token is automatically added by axios interceptor
   */
  checkFavorites: async (
    imageIds: string[]
  ): Promise<FavoritesCheckResponse> => {
    // Ensure imageIds is a non-empty array
    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      throw new Error('imageIds must be a non-empty array');
    }

    // Validate MongoDB ObjectId format (24 hex characters)
    const isValidMongoId = (id: string): boolean => {
      return /^[0-9a-fA-F]{24}$/.test(String(id));
    };

    // Ensure all IDs are strings and valid MongoDB ObjectIds
    const stringIds = imageIds
      .map((id) => String(id).trim())
      .filter((id) => id && isValidMongoId(id));

    if (stringIds.length === 0) {
      throw new Error(
        'imageIds must contain at least one valid MongoDB ObjectId'
      );
    }

    // No need for manual CSRF - axios interceptor handles it automatically
    const res = await api.post('/favorites/check', { imageIds: stringIds });
    return res.data;
  },
};
