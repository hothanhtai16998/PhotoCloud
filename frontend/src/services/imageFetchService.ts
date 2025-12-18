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
    if (params?.tags && params.tags.length > 0) {
      params.tags.forEach(tag => queryParams.append('tags', tag));
    }
    if (params?.dateFrom) {
      queryParams.append('dateFrom', params.dateFrom);
    }
    if (params?.dateTo) {
      queryParams.append('dateTo', params.dateTo);
    }
    if (params?.orientation && params.orientation !== 'all') {
      queryParams.append('orientation', params.orientation);
    }
    if (params?.sortBy) {
      queryParams.append('sortBy', params.sortBy);
    }
    if (params?.order) {
      queryParams.append('order', params.order);
    }
    // EXIF filters
    if (params?.cameraMake) {
      queryParams.append('cameraMake', params.cameraMake);
    }
    if (params?.cameraModel) {
      queryParams.append('cameraModel', params.cameraModel);
    }
    if (params?.focalLengthMin !== undefined) {
      queryParams.append('focalLengthMin', params.focalLengthMin.toString());
    }
    if (params?.focalLengthMax !== undefined) {
      queryParams.append('focalLengthMax', params.focalLengthMax.toString());
    }
    if (params?.apertureMin !== undefined) {
      queryParams.append('apertureMin', params.apertureMin.toString());
    }
    if (params?.apertureMax !== undefined) {
      queryParams.append('apertureMax', params.apertureMax.toString());
    }
    if (params?.isoMin !== undefined) {
      queryParams.append('isoMin', params.isoMin.toString());
    }
    if (params?.isoMax !== undefined) {
      queryParams.append('isoMax', params.isoMax.toString());
    }
    // Image dimensions
    if (params?.minWidth !== undefined) {
      queryParams.append('minWidth', params.minWidth.toString());
    }
    if (params?.minHeight !== undefined) {
      queryParams.append('minHeight', params.minHeight.toString());
    }
    if (params?.aspectRatio) {
      queryParams.append('aspectRatio', params.aspectRatio);
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





