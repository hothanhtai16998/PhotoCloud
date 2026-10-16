import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { imageStatsService } from '@/services/imageStatsService';
import { useImageFavoriteCountStore } from '@/stores/useImageFavoriteCountStore';
import { useImageStatsStore } from '@/stores/useImageStatsStore';
import type { Image } from '@/types/image';

// API responses and websocket events update the same store, always keyed by image ID.
export function useImagePageStats(image: Image | null, userId?: string) {
  const updateStats = useImageStatsStore(state => state.updateStats);
  const liveStats = useImageStatsStore(state => image ? state.imageStats.get(image._id) : undefined);
  const updateFavoriteCount = useImageFavoriteCountStore(state => state.updateFavoriteCount);
  const storedFavoriteCount = useImageFavoriteCountStore(state => image ? state.favoriteCounts.get(image._id) : undefined);
  const incrementedViewIds = useRef(new Set<string>());
  const previousImageId = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (!image) return;
    if (previousImageId.current !== image._id) {
      previousImageId.current = image._id;
      incrementedViewIds.current.delete(image._id);
    }
    // Reconnecting must not replace newer API/socket values with old grid data.
    if (!useImageStatsStore.getState().getStats(image._id)) {
      updateStats(image._id, {
        views: image.views ?? 0, downloads: image.downloads ?? 0,
        dailyViews: image.dailyViews, dailyDownloads: image.dailyDownloads,
      });
    }
    if (!useImageFavoriteCountStore.getState().favoriteCounts.has(image._id) && image.favoriteCount !== undefined) {
      updateFavoriteCount(image._id, image.favoriteCount);
    }
  }, [image, updateStats, updateFavoriteCount]);

  const { isConnected, joinImageRoom, leaveImageRoom } = useWebSocket({
    onImageFavoriteUpdate: useCallback(update => {
      if (update.imageId === image?._id && update.actorId !== userId) {
        updateFavoriteCount(update.imageId, update.favoriteCount);
      }
    }, [image?._id, userId, updateFavoriteCount]),
    onImageStatsUpdate: useCallback(update => {
      if (update.imageId !== image?._id) return;
      updateStats(update.imageId, {
        views: update.views, downloads: update.downloads,
        dailyViews: update.dailyViews, dailyDownloads: update.dailyDownloads,
      });
    }, [image?._id, updateStats]),
  });

  useEffect(() => {
    if (!image?._id || !isConnected) return;
    joinImageRoom(image._id);
    return () => leaveImageRoom(image._id);
  }, [image?._id, isConnected, joinImageRoom, leaveImageRoom]);

  // Increment view count when image is viewed
  useEffect(() => {
    if (!image?._id || incrementedViewIds.current.has(image._id)) return;
    const imageId = image._id;
    incrementedViewIds.current.add(imageId);
    void imageStatsService.incrementView(imageId).then(response => {
      updateStats(imageId, { views: response.views, dailyViews: response.dailyViews });
    }).catch((error: unknown) => {
      const limited = error as { response?: { status?: number; data?: { views?: number } } };
      const views = limited.response?.data?.views;
      if (limited.response?.status === 429 && views !== undefined) {
        updateStats(imageId, { views });
      } else {
        incrementedViewIds.current.delete(imageId);
      }
    });
  }, [image?._id, updateStats]);

  const views = liveStats?.views ?? image?.views ?? 0;
  const downloads = liveStats?.downloads ?? image?.downloads ?? 0;
  return {
    views, downloads,
    favoriteCount: storedFavoriteCount ?? image?.favoriteCount ?? 0,
    chartImage: image ? {
      ...image, views, downloads,
      dailyViews: liveStats?.dailyViews ?? image.dailyViews,
      dailyDownloads: liveStats?.dailyDownloads ?? image.dailyDownloads,
    } : null,
  };
}
