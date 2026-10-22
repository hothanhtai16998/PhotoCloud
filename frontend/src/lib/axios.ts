import { useAuthStore } from '@/stores/useAuthStore';
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { appConfig } from '@/config/appConfig';
import { getAuthSessionVersion } from '@/utils/authSessionVersion';
import { isPageDeparting, setPageDeparting } from '@/utils/pageDeparture';

// Helper to get the API base URL
const getApiBaseURL = (): string => {
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
 * PHOTOCLOUD-style: Global request cancellation on page refresh
 * Track all pending requests and cancel them when page is about to unload
 */
const pendingRequests = new Set<AbortController>();

// Cancel all pending requests when page is about to unload (refresh/navigation)
export const cancelAllPendingRequests = (): number => {
  const count = pendingRequests.size;
  if (count > 0) {
    pendingRequests.forEach((controller) => {
      try {
        controller.abort();
      } catch {
        // Ignore errors when aborting
      }
    });
    pendingRequests.clear();
  }
  return count; // Return count for debugging
};

// Listen for page unload events (refresh, navigation, close)
// Use pagehide instead of unload (unload is deprecated and prevents bfcache)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    setPageDeparting(true);
    cancelAllPendingRequests();
  });
  // Use pagehide instead of unload - works with bfcache
  window.addEventListener('pagehide', () => {
    setPageDeparting(true);
    cancelAllPendingRequests();
  });

  window.addEventListener('pageshow', () => setPageDeparting(false));

}

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
 * Request Interceptor #0: Add AbortController for request cancellation (PHOTOCLOUD-style)
 * Every request gets an AbortController that can be cancelled on page refresh
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (isPageDeparting()) throw new axios.CanceledError('Page is leaving');
    const sessionConfig = config as InternalAxiosRequestConfig & { _authSessionVersion?: number };
    sessionConfig._authSessionVersion ??= getAuthSessionVersion();
    if (sessionConfig._authSessionVersion !== getAuthSessionVersion()) throw new axios.CanceledError('Session changed');
    // Create AbortController if not already provided
    if (!config.signal) {
      const controller = new AbortController();
      config.signal = controller.signal;
      // Track this request for cancellation on page unload
      pendingRequests.add(controller);
      
      // Remove from tracking when request completes (success or error)
      const originalSignal = config.signal;
      const cleanup = (): void => {
        pendingRequests.delete(controller);
        if (originalSignal) {
          originalSignal.removeEventListener?.('abort', cleanup);
        }
      };
      
      // Clean up when request is aborted or completes
      originalSignal.addEventListener?.('abort', cleanup);
      
      // Also clean up on response (handled in response interceptor)
      Object.assign(config, { _cleanupAbort: cleanup, _ownedAbortController: controller });
    }

    return config;
  },
  (error) => Promise.reject(error)
);

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
 * If token is missing, fetch it first to avoid 403 errors
 */
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (isPageDeparting()) throw new axios.CanceledError('Page is leaving');
    const sessionConfig = config as InternalAxiosRequestConfig & { _authSessionVersion?: number };
    sessionConfig._authSessionVersion ??= getAuthSessionVersion();
    const isStateChangingMethod = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(
      config.method?.toUpperCase() ?? ''
    );

    if (isStateChangingMethod) {
      let csrfToken = getCsrfTokenFromCookie();
      
      // If no CSRF token, fetch it first to avoid 403 errors
      if (!csrfToken) {
        try {
          // Use a simple fetch to avoid circular dependency with axios
          const baseURL = config.baseURL || getApiBaseURL();
          const url = baseURL.startsWith('http') 
            ? `${baseURL}/csrf-token`
            : `${window.location.origin}${baseURL}/csrf-token`;
          
          const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
          });
          
          if (response.ok) {
            const data = await response.json();
            csrfToken = data.csrfToken || getCsrfTokenFromCookie();
          }
        } catch {
          // If fetch fails, continue without token - response interceptor will handle retry
        }
      }
      
      if (csrfToken && config.headers) {
        config.headers['X-XSRF-TOKEN'] = csrfToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response Interceptor: Clean up AbortController tracking and handle errors
 */
api.interceptors.response.use(
  (response) => {
    // Clean up AbortController tracking on successful response
    const config = response.config as InternalAxiosRequestConfig & {
      _cleanupAbort?: () => void;
    };
    if (config._cleanupAbort) {
      config._cleanupAbort();
    }
    if ((config as typeof config & { _authSessionVersion?: number })._authSessionVersion !== getAuthSessionVersion()) {
      return Promise.reject(new axios.CanceledError('Session changed'));
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _authSessionVersion?: number;
      _retryCount?: number;
      _ownedAbortController?: AbortController;
      _cleanupAbort?: () => void;
    };

    // Clean up AbortController tracking on error (unless it's an abort)
    if (originalRequest?._cleanupAbort && error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
      originalRequest._cleanupAbort();
    }

    // Silently ignore aborted requests (PHOTOCLOUD-style: no console spam)
    if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED' || error.message === 'canceled') {
      return Promise.reject(error);
    }

    if (!originalRequest) {
      return Promise.reject(error);
    }
    if (originalRequest._authSessionVersion !== getAuthSessionVersion()) return Promise.reject(new axios.CanceledError('Session changed'));

    // Skip retries for certain endpoints
    const skipRetryPaths = ['/auth/signin', '/auth/signup', '/auth/refresh'];

    if (skipRetryPaths.some((path) => originalRequest.url?.includes(path))) {
      return Promise.reject(error);
    }

    // Handle 429 - rate limit with exponential backoff (PHOTOCLOUD-style)
    if (error.response?.status === 429) {
      // Profile recovery is explicit; do not hold a route guard for a potentially
      // very long Retry-After interval or disguise this failure as missing auth.
      if (originalRequest.url?.split('?')[0] === '/users/me') return Promise.reject(error);
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

    // Refresh is owned by authService (single flight), including startup and sockets.
    // Preserve a temporary refresh failure; returning the original 401 would log
    // callers out even though their cookie has not been rejected.
    if (error.response?.status === 401 && !originalRequest._retryCount) {
      originalRequest._retryCount = 1;
      await useAuthStore.getState().refresh();
      if (originalRequest._authSessionVersion !== getAuthSessionVersion()) throw new axios.CanceledError('Session changed');
      const token = useAuthStore.getState().accessToken;
      if (!token) return Promise.reject(error);
      if (originalRequest.signal?.aborted) throw new axios.CanceledError('Request cancelled');
      originalRequest.headers.Authorization = `Bearer ${token}`;
      if (originalRequest._ownedAbortController) {
        originalRequest.signal = undefined;
        originalRequest._ownedAbortController = undefined;
      }
      return api(originalRequest);
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
