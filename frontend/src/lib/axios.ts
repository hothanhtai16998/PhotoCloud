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
 * Unsplash-style: Global request cancellation on page refresh
 * Track all pending requests and cancel them when page is about to unload
 */
const pendingRequests = new Set<AbortController>();

// Cancel all pending requests when page is about to unload (refresh/navigation)
export const cancelAllPendingRequests = () => {
  const count = pendingRequests.size;
  if (count > 0) {
    pendingRequests.forEach((controller) => {
      try {
        controller.abort();
      } catch (error) {
        // Ignore errors when aborting
      }
    });
    pendingRequests.clear();
    
    // Log in dev mode so user can see it's working
    if (import.meta.env.DEV) {
      console.log(`[Axios] Cancelled ${count} pending request(s) on refresh`);
    }
  }
  return count; // Return count for debugging
};

// Listen for page unload events (refresh, navigation, close)
// Use pagehide instead of unload (unload is deprecated and prevents bfcache)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    cancelAllPendingRequests();
  });
  // Use pagehide instead of unload - works with bfcache
  window.addEventListener('pagehide', () => {
    cancelAllPendingRequests();
  });
  // Also handle visibility change (tab switch) - cancel if page is being unloaded
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // Don't cancel on tab switch, only on actual unload
      // The beforeunload event will handle refresh/navigation
    }
  });
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
 * Request Interceptor #0: Add AbortController for request cancellation (Unsplash-style)
 * Every request gets an AbortController that can be cancelled on page refresh
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Create AbortController if not already provided
    if (!config.signal) {
      const controller = new AbortController();
      config.signal = controller.signal;
      // Track this request for cancellation on page unload
      pendingRequests.add(controller);
      
      // Remove from tracking when request completes (success or error)
      const originalSignal = config.signal;
      const cleanup = () => {
        pendingRequests.delete(controller);
        if (originalSignal) {
          originalSignal.removeEventListener('abort', cleanup);
        }
      };
      
      // Clean up when request is aborted or completes
      originalSignal.addEventListener('abort', cleanup);
      
      // Also clean up on response (handled in response interceptor)
      (config as any)._abortController = controller;
      (config as any)._cleanupAbort = cleanup;
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
        } catch (error) {
          // If fetch fails, continue without token - response interceptor will handle retry
          // Don't log in production to avoid console spam
          if (import.meta.env.DEV) {
            console.warn('Failed to fetch CSRF token:', error);
          }
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
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retryCount?: number;
      _cleanupAbort?: () => void;
    };

    // Clean up AbortController tracking on error (unless it's an abort)
    if (originalRequest?._cleanupAbort && error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
      originalRequest._cleanupAbort();
    }

    // Silently ignore aborted requests (Unsplash-style: no console spam)
    if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED' || error.message === 'canceled') {
      return Promise.reject(error);
    }

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
          }).catch((refreshError: any) => {
            // If refresh failed due to rate limit (429), don't fail the original request
            // Just reject with the original 401 error so user stays logged in
            if (refreshError?.response?.status === 429) {
              return Promise.reject(error); // Return original 401, not 429
            }
            // For other refresh errors, reject with refresh error
            return Promise.reject(refreshError);
          });
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
          } catch (refreshError: any) {
            // Don't sign out user on rate limit (429) or cancelled requests
            // Only clear auth for actual auth failures (401, 403, etc.)
            const status = refreshError?.response?.status;
            const isCancelled = 
              refreshError?.name === 'CanceledError' || 
              refreshError?.code === 'ERR_CANCELED' ||
              refreshError?.message === 'canceled' ||
              axios.isCancel(refreshError);
            
            if (status === 429 || isCancelled) {
              // Rate limited or cancelled - don't clear auth, just throw error
              // The request will fail but user stays logged in
              throw refreshError;
            }
            // Only clear auth for actual authentication failures
            if (status === 401 || status === 403 || !status) {
              useAuthStore.getState().clearAuth();
            }
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
        } catch (refreshError: any) {
          // If refresh failed due to rate limit (429) or was cancelled, don't sign user out
          // Just fail the request - user stays logged in and can retry later
          const isCancelled = 
            refreshError?.name === 'CanceledError' || 
            refreshError?.code === 'ERR_CANCELED' ||
            refreshError?.message === 'canceled' ||
            axios.isCancel(refreshError);
          
          if (refreshError?.response?.status === 429 || isCancelled) {
            // Return original 401 error instead of 429/cancelled to avoid confusion
            // User stays logged in
            return Promise.reject(error);
          }
          // For other refresh errors (auth failures), reject normally
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
