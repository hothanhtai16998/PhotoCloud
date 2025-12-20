/**
 * Hook to batch favorite status checks for multiple images
 * Reduces API calls by checking all images in one request
 */

import { useEffect, useState, useRef } from 'react';
import { favoriteService } from '@/services/favoriteService';
import { useAuthStore } from '@/stores/useAuthStore';
import { LRUCache } from '@/utils/lruCache';

// Global batching state
const pendingChecks = new Map<string, Set<(result: boolean) => void>>();
const checkTimeoutRef: { current: ReturnType<typeof setTimeout> | null } = { current: null };
const BATCH_DELAY = 100; // Wait 100ms to collect all requests

// Cache for favorite status to allow immediate updates
// Uses LRU cache to prevent memory leaks from unbounded growth
const MAX_CACHE_SIZE = 1000;
const favoriteCache = new LRUCache<boolean>(MAX_CACHE_SIZE);

/**
 * Manually update favorite status in cache (called after toggle)
 */
export function updateFavoriteCache(imageId: string, isFavorited: boolean) {
  const validImageId = String(imageId).trim();
  favoriteCache.set(validImageId, isFavorited);
  
  // Immediately notify all callbacks for this image
  const callbacks = pendingChecks.get(validImageId);
  if (callbacks && callbacks.size > 0) {
    // Create a copy of the set to avoid issues during iteration
    const callbacksCopy = new Set(callbacks);
    callbacksCopy.forEach(cb => {
      try {
        cb(isFavorited);
      } catch (error) {
        // Silently handle callback errors
      }
    });
  }
  
  // Also dispatch a custom event for components that might not have registered callbacks yet
  window.dispatchEvent(new CustomEvent('favoriteCacheUpdated', {
    detail: { imageId: validImageId, isFavorited }
  }));
}

/**
 * Compute initial favorite state based on inputs
 * Extracted to avoid setting state in effect
 */
function computeFavoriteState(
  imageId: string | undefined,
  accessToken: string | null
): { isValid: boolean; validId: string | null; isFavorited: boolean } {
  if (!accessToken || !imageId) {
    return { isValid: false, validId: null, isFavorited: false };
  }

  const validId = String(imageId).trim();
  const isValidMongoId = /^[0-9a-fA-F]{24}$/.test(validId);

  if (!isValidMongoId) {
    return { isValid: false, validId: null, isFavorited: false };
  }

  const cachedValue = favoriteCache.get(validId);
  return {
    isValid: true,
    validId,
    isFavorited: cachedValue ?? false,
  };
}

/**
 * Hook to get favorite status for an image (batched)
 * @param imageId - Image ID to check
 * @returns Favorite status
 */
export function useBatchedFavoriteCheck(imageId: string | undefined): boolean {
  const { accessToken } = useAuthStore();
  const validImageIdRef = useRef<string | null>(null);

  // Compute initial state synchronously (not in effect)
  const initialState = computeFavoriteState(imageId, accessToken);

  const [isFavorited, setIsFavorited] = useState<boolean>(initialState.isFavorited);
  const callbackRef = useRef<((result: boolean) => void) | null>(null);

  // Track previous values to detect changes
  const prevAccessToken = useRef(accessToken);
  const prevImageId = useRef(imageId);

  // Handle prop changes that should reset state
  // This is done synchronously in render, not in effect
  if (prevAccessToken.current !== accessToken || prevImageId.current !== imageId) {
    prevAccessToken.current = accessToken;
    prevImageId.current = imageId;

    const newState = computeFavoriteState(imageId, accessToken);
    if (!newState.isValid && isFavorited) {
      // State needs reset - will happen on next render via useState
      // We just update the ref here
      validImageIdRef.current = null;
    }
  }

  useEffect(() => {
    const state = computeFavoriteState(imageId, accessToken);

    if (!state.isValid) {
      validImageIdRef.current = null;
      // Only set state if it differs to avoid unnecessary renders
      setIsFavorited(prev => prev !== false ? false : prev);
      return;
    }

    const validImageId = state.validId!;
    validImageIdRef.current = validImageId;

    // Check cache first for immediate updates
    const cachedValue = favoriteCache.get(validImageId);
    if (cachedValue !== undefined) {
      setIsFavorited(cachedValue);
    }

    // Create callback for this image
    const callback = (result: boolean) => {
      setIsFavorited(result);
      // Update cache when we get a result
      favoriteCache.set(validImageId, result);
    };
    callbackRef.current = callback;

    // Add to pending checks
    if (!pendingChecks.has(validImageId)) {
      pendingChecks.set(validImageId, new Set());
    }
    pendingChecks.get(validImageId)!.add(callback);

    // Clear existing timeout
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    // Schedule batch check
    checkTimeoutRef.current = setTimeout(async () => {
      const imageIds = Array.from(pendingChecks.keys());
      
      if (imageIds.length > 0) {
        // Double-check authentication before making request
        const { accessToken } = useAuthStore.getState();
        if (!accessToken) {
          // Not authenticated - clear pending checks and set all to false
          for (const id of imageIds) {
            const callbacks = pendingChecks.get(id);
            if (callbacks) {
              callbacks.forEach(cb => cb(false));
              pendingChecks.delete(id);
            }
          }
          return;
        }

        // Ensure CSRF token is available before making POST request
        // This prevents critical request chaining
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

        let csrfToken = getCsrfTokenFromCookie();
        if (!csrfToken) {
          // Fetch CSRF token first to avoid chaining and 403 errors
          try {
            const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
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
            // If CSRF fetch fails, still try the request (interceptor will handle retry)
          }
        }

        // Make batch request
        favoriteService.checkFavorites(imageIds)
          .then((response) => {
            if (response?.favorites && typeof response.favorites === 'object') {
              // Distribute results to all callbacks
              for (const id of imageIds) {
                const callbacks = pendingChecks.get(id);
                if (callbacks) {
                  const isFav = response.favorites[id] === true ||
                    response.favorites[String(id)] === true;
                  
                  const favoritedStatus = !!isFav;
                  // Update cache
                  favoriteCache.set(id, favoritedStatus);
                  // Notify all callbacks
                  callbacks.forEach(cb => cb(favoritedStatus));
                  pendingChecks.delete(id);
                }
              }
            }
          })
          .catch((error: any) => {
            // Silently handle 403 errors (not authenticated or CSRF issues)
            // Only log other errors in development
            const is403 = error?.response?.status === 403;
            const is401 = error?.response?.status === 401;
            
            // Silently handle auth errors (403/401)
            
            // For auth errors, set all to false and clear cache
            if (is403 || is401) {
              for (const id of imageIds) {
                const callbacks = pendingChecks.get(id);
                if (callbacks) {
                  callbacks.forEach(cb => cb(false));
                  pendingChecks.delete(id);
                }
                // Clear cache for these images
                favoriteCache.delete(id);
              }
            } else {
              // For other errors, just clear pending checks
              pendingChecks.clear();
            }
          });
      }
    }, BATCH_DELAY);

    // Cleanup
    return () => {
      const callbacks = pendingChecks.get(validImageId);
      if (callbacks && callbackRef.current) {
        callbacks.delete(callbackRef.current);
        if (callbacks.size === 0) {
          pendingChecks.delete(validImageId);
        }
      }
      validImageIdRef.current = null;
    };
  }, [imageId, accessToken]);

  // Listen for cache updates via custom event (for immediate UI updates)
  useEffect(() => {
    if (!validImageIdRef.current) return;

    const handleCacheUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ imageId: string; isFavorited: boolean }>;
      if (customEvent.detail && customEvent.detail.imageId === validImageIdRef.current) {
        setIsFavorited(customEvent.detail.isFavorited);
      }
    };

    window.addEventListener('favoriteCacheUpdated', handleCacheUpdate);
    return () => {
      window.removeEventListener('favoriteCacheUpdated', handleCacheUpdate);
    };
  }, [imageId]);

  return isFavorited;
}
