import { get } from '@/lib/api';
import type {
  Image,
  FetchImagesParams,
  FetchImagesResponse,
  FetchLocationsResponse,
} from '@/types/image';

export const imageFetchService = {
  fetchImages: async (
    params?: FetchImagesParams,
    signal?: AbortSignal
  ): Promise<FetchImagesResponse> => {
    const queryParams = new URLSearchParams();

    if (params?.page) {
      queryParams.append('page', params.page.toString());
    }
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params?.search) {
      queryParams.append('search', params.search);
    }
    if (params?.category) {
      queryParams.append('category', params.category);
    }
    if (params?.location) {
      queryParams.append('location', params.location);
    }
    if (params?.color) {
      queryParams.append('color', params.color);
    }
    if (params?.tag) {
      queryParams.append('tag', params.tag);
    }

    // Add cache-busting timestamp if refresh is requested
    if (params?._refresh) {
      queryParams.append('_t', Date.now().toString());
    }

    const queryString = queryParams.toString();
    const url = queryString ? `/images?${queryString}` : '/images';

    const res = await get(url, {
      withCredentials: true,
      signal, // Pass abort signal for request cancellation
      // Cache busting is handled by timestamp query parameter (_t)
    });

    // Handle both old format (just images array) and new format (with pagination)
    const data = res.data as FetchImagesResponse | Image[];
    if (Array.isArray(data)) {
      return { images: data };
    }
    if (data.images) {
      return data;
    }
    return { images: [] };
  },

  fetchUserImages: async (
    userId: string,
    params?: FetchImagesParams,
    signal?: AbortSignal
  ): Promise<FetchImagesResponse> => {
    const queryParams = new URLSearchParams();

    if (params?.page) {
      queryParams.append('page', params.page.toString());
    }
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }

    // Add cache-busting timestamp if refresh is requested
    if (params?._refresh) {
      queryParams.append('_t', Date.now().toString());
    }

    const queryString = queryParams.toString();
    const url = queryString
      ? `/images/user/${userId}?${queryString}`
      : `/images/user/${userId}`;

    const res = await get(url, {
      withCredentials: true,
      signal, // Pass abort signal for request cancellation
      // Cache busting is handled by timestamp query parameter (_t)
    });

    const data = res.data as FetchImagesResponse | Image[];
    if (Array.isArray(data)) {
      return { images: data };
    }
    if (data.images) {
      return data;
    }
    return { images: [] };
  },

  fetchLocations: async (forceRefresh = false): Promise<string[]> => {
    // Simple cache to prevent duplicate requests
    const cacheKey = 'imageLocationsCache';
    if (!forceRefresh) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          const now = Date.now();
          if (now - timestamp < 5 * 60 * 1000) {
            // 5 minutes cache
            return data;
          }
        } catch {
          // Invalid cache, continue to fetch
        }
      }
    }

    const res = await get<FetchLocationsResponse>('/images/locations', {
      withCredentials: true,
    });

    const locations = res.data.locations || [];

    // Update cache
    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({
        data: locations,
        timestamp: Date.now(),
      })
    );

    return locations;
  },
};





