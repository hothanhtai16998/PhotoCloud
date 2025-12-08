import api from '@/lib/axios';

export interface ProfileCompletionCriteria {
  hasAvatar: boolean;
  hasBio: boolean;
  hasPhone: boolean;
  hasImages: boolean;
  hasCollections: boolean;
}

export interface ProfileCompletion {
  percentage: number;
  completed: number;
  total: number;
  criteria: ProfileCompletionCriteria;
}

export interface UserStats {
  totalImages: number;
  totalCollections: number;
  totalFavorites: number; // Likes received (favorites on user's images)
  totalDownloads: number;
  totalViews: number;
  followersCount: number;
  followingCount: number;
  profileViews: number;
  joinDate: string;
  verifiedBadge: boolean; // Future feature
  profileCompletion: ProfileCompletion;
}

export const userStatsService = {
  /**
   * Get user profile statistics
   * @param userId User ID to get stats for
   * @param signal Optional AbortSignal for request cancellation
   */
  getUserStats: async (userId: string, signal?: AbortSignal): Promise<UserStats> => {
    const res = await api.get(`/users/${userId}/stats`, {
      withCredentials: true,
      signal, // Pass abort signal for request cancellation
    });
    return res.data;
  },

  /**
   * Track profile view (increment profileViews counter)
   * @param userId User ID whose profile was viewed
   */
  trackProfileView: async (userId: string): Promise<{ profileViews: number }> => {
    const res = await api.post(`/users/${userId}/view`, {}, {
      withCredentials: true,
    });
    return res.data;
  },
};

