import { useAuthStore } from '@/stores/useAuthStore';
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { appConfig } from '@/config/appConfig';

// Support environment variable for API URL, fallback to /api (for proxy) or localhost in dev
const getBaseURL = () => {
  // If VITE_API_URL is set, use it (for direct backend connection)
  // This is required for Cloudflare Pages since _redirects only works for GET requests
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In development, use localhost
  if (import.meta.env.MODE === 'development') {
    return 'http://localhost:3000/api';
  }
  // In production, detect if we're on Cloudflare Pages
  // HTTP 530 errors occur when Cloudflare Pages can't reach the backend via _redirects
  // So we MUST use direct backend URL on Cloudflare Pages
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  if (hostname.includes('.pages.dev') || hostname.includes('uploadanh.cloud')) {
    // On Cloudflare Pages, use direct backend URL to avoid 530 errors
    // Fallback to known backend URL if VITE_API_URL not set
    const fallbackBackendUrl = 'https://api.uploadanh.cloud/api';
    console.warn(
      'VITE_API_URL not set. Using fallback direct backend URL to avoid 530 errors.\n' +
      'Set VITE_API_URL=https://api.uploadanh.cloud/api in Cloudflare Pages environment variables for better control.'
    );
    return fallbackBackendUrl;
  }
  // For other platforms (Vercel, etc.), try /api proxy first
  return '/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
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

    // Handle 401 - access token expired, try to refresh
    if (error.response?.status === 401) {
      originalRequest._retryCount = originalRequest._retryCount ?? 0;

      if (originalRequest._retryCount < 3) {
        originalRequest._retryCount += 1;

        try {
          const refreshResponse = await api.post(
            '/auth/refresh',
            {},
            { withCredentials: true }
          );

          const newAccessToken = refreshResponse.data.accessToken;
          useAuthStore.getState().setAccessToken(newAccessToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }

          return api(originalRequest);
        } catch (refreshError) {
          useAuthStore.getState().clearAuth();
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

    // Handle 530 - Cloudflare error: origin server unreachable
    // This happens when Cloudflare Pages can't reach the backend via _redirects
    if (error.response?.status === 530 || error.code === 'ERR_BAD_RESPONSE') {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
      if (hostname.includes('.pages.dev') && !import.meta.env.VITE_API_URL) {
        console.error(
          'HTTP 530 Error: Cloudflare Pages cannot reach backend.\n' +
          'Solution: Set VITE_API_URL=https://api.uploadanh.cloud/api in Cloudflare Pages environment variables.\n' +
          'This will make the frontend connect directly to the backend instead of using _redirects proxy.'
        );
      }
    }

    return Promise.reject(error);
  }
);

export default api;
