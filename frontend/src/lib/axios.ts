import { useAuthStore } from '@/stores/useAuthStore';
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { appConfig } from '@/config/appConfig';

// Helper to get the API base URL
const getApiBaseURL = () => {
  if (import.meta.env.MODE === 'development') {
    return 'http://localhost:3000/api';
  }
  
  // In production, use VITE_API_URL if set
  if (import.meta.env.VITE_API_URL) {
    const apiUrl = import.meta.env.VITE_API_URL.trim();
    // If it already ends with /api, use it as is; otherwise append /api
    return apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`;
  }
  
  // Fallback to relative path (same domain)
  return '/api';
};

const api = axios.create({
  baseURL: getApiBaseURL(),
  withCredentials: true,
  timeout: appConfig.apiTimeout,
});

/**
 * Helper: Get CSRF token from cookie
 * The backend sets XSRF-TOKEN cookie, we read it and send it back in header
 */
const getCsrfTokenFromCookie = (): string | null => {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'XSRF-TOKEN' && value) {
      return decodeURIComponent(value);
    }
  }
  return null;
};

/**
 * Request Interceptor #1: Add Authorization header
 * Every request gets the access token in Authorization header
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState();

    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Request Interceptor #2: Add CSRF token for state-changing requests
 * POST, PUT, DELETE, PATCH requests must include X-XSRF-TOKEN header
 * The token comes from the XSRF-TOKEN cookie set by backend
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const isStateChangingMethod = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(
      config.method?.toUpperCase() ?? ''
    );

    if (isStateChangingMethod) {
      const csrfToken = getCsrfTokenFromCookie();
      if (csrfToken && config.headers) {
        config.headers['X-XSRF-TOKEN'] = csrfToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response Interceptor: Handle token expiration and CSRF errors
 * If access token expires (401), refresh it and retry the request
 * If CSRF token is invalid (403), refresh it and retry the request
 */
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retryCount?: number;
    };

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Skip retries for certain endpoints
    const skipRetryPaths = ['/auth/signin', '/auth/signup', '/auth/refresh'];

    if (skipRetryPaths.some((path) => originalRequest.url?.includes(path))) {
      return Promise.reject(error);
    }

    // Handle 429 - rate limit with exponential backoff (Unsplash-style)
    if (error.response?.status === 429) {
      // Rate limited - respect Retry-After header if present
      const retryAfter = error.response?.headers?.['retry-after'];
      if (retryAfter && originalRequest._retryCount === undefined) {
        // First 429 for this request - wait for Retry-After period
        const delay = parseInt(retryAfter, 10) * 1000;
        return new Promise((resolve) => {
          setTimeout(() => {
            originalRequest._retryCount = 0;
            resolve(api(originalRequest));
          }, delay);
        });
      }
      // Don't retry if already retried or no Retry-After header
      // Silently fail to prevent console spam
      return Promise.reject(error);
    }

    // Handle 401 - access token expired, try to refresh
    // Use a module-level promise to prevent multiple simultaneous refresh requests
    if (error.response?.status === 401) {
      originalRequest._retryCount = originalRequest._retryCount ?? 0;

      if (originalRequest._retryCount < 3) {
        originalRequest._retryCount += 1;

        // Check if a refresh is already in progress (module-level variable)
        if ((api as any)._refreshPromise) {
          // Wait for the existing refresh to complete, then retry
          return (api as any)._refreshPromise.then(() => {
            if (originalRequest.headers) {
              const currentToken = useAuthStore.getState().accessToken;
              if (currentToken) {
                originalRequest.headers.Authorization = `Bearer ${currentToken}`;
              }
            }
            return api(originalRequest);
          }).catch(() => Promise.reject(error));
        }

        // Create a new refresh promise
        const refreshPromise = (async () => {
          try {
            const refreshResponse = await api.post(
              '/auth/refresh',
              {},
              { withCredentials: true }
            );

            const newAccessToken = refreshResponse.data.accessToken;
            useAuthStore.getState().setAccessToken(newAccessToken);

            return newAccessToken;
          } catch (refreshError) {
            useAuthStore.getState().clearAuth();
            throw refreshError;
          } finally {
            // Clear the refresh promise after completion
            (api as any)._refreshPromise = null;
          }
        })();

        // Store the promise so other requests can wait for it
        (api as any)._refreshPromise = refreshPromise;

        try {
          const newAccessToken = await refreshPromise;

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }

          return api(originalRequest);
        } catch (refreshError) {
          return Promise.reject(refreshError);
        }
      }
    }

    // Handle 403 - CSRF token might be invalid
    if (error.response?.status === 403) {
      const responseData = error.response?.data as
        | Record<string, unknown>
        | undefined;
      const errorCode = responseData?.errorCode as string | undefined;
      if (
        errorCode === 'CSRF_TOKEN_MISSING' ||
        errorCode === 'CSRF_TOKEN_INVALID'
      ) {
        originalRequest._retryCount = originalRequest._retryCount ?? 0;

        if (originalRequest._retryCount < 1) {
          originalRequest._retryCount += 1;

          try {
            // GET request refreshes CSRF token cookie
            await api.get('/csrf-token');
            // Retry original request with new CSRF token
            return api(originalRequest);
          } catch {
            return Promise.reject(error);
          }
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
