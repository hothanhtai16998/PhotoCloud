import { useCallback, useSyncExternalStore } from 'react';
import { favoriteService } from '@/services/favoriteService';
import { useAuthStore } from '@/stores/useAuthStore';
import { LRUCache } from '@/utils/lruCache';
import type { Image } from '@/types/image';

const favoriteCache = new LRUCache<boolean>(1000);
const listeners = new Map<string, Set<() => void>>();
const pendingChecks = new Set<string>();
const inFlight = new Map<string, symbol>();
let batchTimer: ReturnType<typeof setTimeout> | undefined;
let sessionToken: string | null = null;
let sessionVersion = 0;
let unsubscribeAuth: (() => void) | undefined;

function notify(imageId: string): void {
  listeners.get(imageId)?.forEach(listener => listener());
}

function syncSession(token: string | null): void {
  if (token === sessionToken) return;
  sessionToken = token;
  sessionVersion += 1;
  favoriteCache.clear();
  pendingChecks.clear();
  inFlight.clear();
  if (batchTimer !== undefined) clearTimeout(batchTimer);
  batchTimer = undefined;
  for (const imageId of listeners.keys()) {
    notify(imageId);
    if (token) pendingChecks.add(imageId);
  }
  scheduleBatch();
}

function scheduleBatch(): void {
  if (!sessionToken || batchTimer !== undefined || pendingChecks.size === 0) return;
  // One timer belongs to the batch, rather than to an individual mounted card.
  batchTimer = setTimeout(() => {
    batchTimer = undefined;
    void checkBatch();
  }, 100);
}

async function checkBatch(): Promise<void> {
  syncSession(useAuthStore.getState().accessToken);
  if (!sessionToken) return;
  const version = sessionVersion;
  const token = sessionToken;
  const ticket = Symbol('favorite check');
  const imageIds = [...pendingChecks].filter(id => listeners.has(id) && !inFlight.has(id));
  pendingChecks.clear();
  if (imageIds.length === 0) return;
  imageIds.forEach(id => inFlight.set(id, ticket));
  try {
    // The axios interceptor already obtains and adds the CSRF token.
    const response = await favoriteService.checkFavorites(imageIds);
    if (version !== sessionVersion || token !== useAuthStore.getState().accessToken) return;
    if (!response?.favorites || typeof response.favorites !== 'object') return;
    for (const id of imageIds) {
      // A toggle invalidates this ticket so an older check cannot undo it.
      if (inFlight.get(id) !== ticket) continue;
      favoriteCache.set(id, response.favorites[id] === true);
      notify(id);
    }
  } catch {
    // Leave the current value intact. A subsequent mount can retry failed checks.
  } finally {
    for (const id of imageIds) {
      if (inFlight.get(id) === ticket) inFlight.delete(id);
    }
  }
}

function setFavorite(imageId: string, isFavorited: boolean): void {
  syncSession(useAuthStore.getState().accessToken);
  if (!sessionToken) return;
  pendingChecks.delete(imageId);
  inFlight.delete(imageId);
  favoriteCache.set(imageId, isFavorited);
  notify(imageId);
}

function handleCacheUpdate(event: Event): void {
  const detail = (event as CustomEvent<{ imageId?: string; isFavorited?: boolean }>).detail;
  if (detail?.imageId && typeof detail.isFavorited === 'boolean') {
    setFavorite(String(detail.imageId).trim(), detail.isFavorited);
  }
}

export function updateFavoriteCache(imageId: string, isFavorited: boolean, image?: Image): void {
  const id = String(imageId).trim();
  syncSession(useAuthStore.getState().accessToken);
  const previousIsFavorited = favoriteCache.get(id);
  setFavorite(id, isFavorited);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('favoriteCacheUpdated', {
      detail: { imageId: id, isFavorited, previousIsFavorited, image: isFavorited ? image : undefined },
    }));
  }
}

function subscribe(imageId: string, listener: () => void): () => void {
  if (!imageId) return () => {};
  syncSession(useAuthStore.getState().accessToken);
  if (listeners.size === 0) {
    unsubscribeAuth = useAuthStore.subscribe(state => syncSession(state.accessToken));
    window.addEventListener('favoriteCacheUpdated', handleCacheUpdate);
  }
  let callbacks = listeners.get(imageId);
  if (!callbacks) {
    callbacks = new Set();
    listeners.set(imageId, callbacks);
  }
  callbacks.add(listener);
  if (sessionToken && !favoriteCache.has(imageId) && !inFlight.has(imageId)) {
    pendingChecks.add(imageId);
    scheduleBatch();
  }
  return () => {
    callbacks.delete(listener);
    if (callbacks.size === 0) {
      listeners.delete(imageId);
      pendingChecks.delete(imageId);
    }
    if (listeners.size === 0) {
      unsubscribeAuth?.();
      unsubscribeAuth = undefined;
      window.removeEventListener('favoriteCacheUpdated', handleCacheUpdate);
      if (batchTimer !== undefined) clearTimeout(batchTimer);
      batchTimer = undefined;
    }
  };
}

export function useBatchedFavoriteCheck(imageId: string | undefined): boolean {
  const accessToken = useAuthStore(state => state.accessToken);
  const id = imageId?.trim() ?? '';
  const validId = accessToken && /^[0-9a-fA-F]{24}$/.test(id) ? id : '';
  const subscribeToImage = useCallback((listener: () => void) => subscribe(validId, listener), [validId]);
  const getSnapshot = useCallback(() => {
    if (!validId || accessToken !== sessionToken) return false;
    return favoriteCache.get(validId) ?? false;
  }, [validId, accessToken]);
  return useSyncExternalStore(subscribeToImage, getSnapshot, () => false);
}
