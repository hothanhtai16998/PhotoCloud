import { useCallback, useRef, useState, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { t } from '@/i18n';
import api from '@/lib/axios';
import { generateImageSlug } from '@/lib/utils';
import { updateFavoriteCache, useBatchedFavoriteCheck } from '@/hooks/useBatchedFavoriteCheck';
import { favoriteService } from '@/services/favoriteService';
import { imageStatsService } from '@/services/imageStatsService';
import { useImageStatsStore } from '@/stores/useImageStatsStore';
import { useImageFavoriteCountStore } from '@/stores/useImageFavoriteCountStore';
import { useUserStore } from '@/stores/useUserStore';
import '@/stores/useDownloadHistoryStore';
import { captureImageActionSession } from '@/utils/imageActionSession';
import { sharePhotoLink } from '@/utils/sharePhotoLink';
import type { Image } from '@/types/image';

interface Props {
  image: Image | null;
  pageActiveRef: RefObject<boolean>;
  currentImageIdRef: RefObject<string | null>;
  closeDownloadMenu: () => void;
}

export function useImagePageActions({ image, pageActiveRef, currentImageIdRef, closeDownloadMenu }: Props) {
  const navigate = useNavigate();
  const user = useUserStore(state => state.user);
  const updateStats = useImageStatsStore(state => state.updateStats);
  const updateFavoriteCount = useImageFavoriteCountStore(state => state.updateFavoriteCount);
  const isFavorited = useBatchedFavoriteCheck(image?._id || '');
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const favoritePendingRef = useRef(false);
  const downloadPendingRef = useRef(false);
  const sharePendingRef = useRef(false);

  const handleDownload = useCallback(async (size: 'small' | 'medium' | 'large' | 'original') => {
    if (!image?._id || downloadPendingRef.current) return;
    downloadPendingRef.current = true;
    setIsDownloading(true);
    closeDownloadMenu();
    const session = captureImageActionSession();
    const isCurrentPhoto = () => pageActiveRef.current && currentImageIdRef.current === image._id;
    try {
      const response = await api.get('/images/' + image._id + '/download?size=' + size, {
        responseType: 'blob', withCredentials: true,
      });
      const contentType = response.headers['content-type'];
      const blob = new Blob([response.data], { type: typeof contentType === 'string' ? contentType : 'image/webp' });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const disposition = response.headers['content-disposition'];
      const serverName = typeof disposition === 'string' ? disposition.match(/filename="([^"\r\n]+)"|filename=([^;\r\n]+)/i) : null;
      const sanitizedTitle = (image.imageTitle || t('image.photo')).replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const extension = image.imageUrl?.match(/\.([a-z]+)(?:\?|$)/i)?.[1] || 'webp';
      link.href = blobUrl;
      link.download = (serverName?.[1] || serverName?.[2]?.trim() || sanitizedTitle + '.' + extension).replace(/[\\/]/g, '_');
      try {
        document.body.appendChild(link);
        link.click();
      } finally {
        link.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      }
      // Count only a completed transfer handed to the browser, in its original session.
      // Browser APIs cannot confirm whether the user ultimately saves the file.
      if (session.isCurrent()) {
        if (session.authenticated) {
          // The history store already listens to this event; do not add it twice.
          window.dispatchEvent(new CustomEvent('downloadCompleted', { detail: { image } }));
        }
        if (isCurrentPhoto()) toast.success(t('image.downloadSuccess'));
        try {
          const stats = await imageStatsService.incrementDownload(image._id);
          updateStats(image._id, { downloads: stats.downloads, dailyDownloads: stats.dailyDownloads });
        } catch (error: unknown) {
          const limited = error as { response?: { status?: number; data?: { downloads?: number } } };
          const count = limited.response?.data?.downloads;
          if (limited.response?.status === 429 && count !== undefined) {
            updateStats(image._id, { downloads: count });
          }
          // A statistics failure does not turn a delivered file into a failed download.
        }
      }
    } catch {
      if (session.isCurrent() && isCurrentPhoto()) toast.error(t('image.downloadFailed'));
    } finally {
      session.dispose();
      downloadPendingRef.current = false;
      if (pageActiveRef.current) setIsDownloading(false);
    }
  }, [image, updateStats, closeDownloadMenu, pageActiveRef, currentImageIdRef]);

  const handleToggleFavorite = useCallback(async () => {
    if (!image?._id || favoritePendingRef.current) return;
    if (!user) {
      navigate('/signin');
      return;
    }
    // Lock before any await. Axios owns CSRF fetching and its specific CSRF retry.
    favoritePendingRef.current = true;
    setIsTogglingFavorite(true);
    const session = captureImageActionSession();
    const imageId = image._id;
    const previousState = isFavorited;
    const publish = (favorited: boolean) => {
      updateFavoriteCache(imageId, favorited, favorited ? image : undefined);
    };
    publish(!previousState);
    try {
      const response = await favoriteService.toggleFavorite(imageId);
      if (!session.isCurrent()) return;
      publish(response.isFavorited);
      if (response.favoriteCount !== undefined) updateFavoriteCount(imageId, response.favoriteCount);
      const { useFavoriteStore } = await import('@/stores/useFavoriteStore');
      if (!session.isCurrent()) return;
      const store = useFavoriteStore.getState();
      if (!store.pagination && store.images.length === 0) {
        void store.fetchFavorites(1, true).catch(() => {});
      }
      if (pageActiveRef.current && currentImageIdRef.current === imageId) {
        toast.success(t(response.isFavorited ? 'favorites.added' : 'favorites.removed'));
      }
    } catch {
      if (session.isCurrent()) {
        publish(previousState);
        if (pageActiveRef.current && currentImageIdRef.current === imageId) toast.error(t('favorites.updateFailed'));
      }
    } finally {
      session.dispose();
      favoritePendingRef.current = false;
      if (pageActiveRef.current) setIsTogglingFavorite(false);
    }
  }, [user, image, updateFavoriteCount, isFavorited, navigate, pageActiveRef, currentImageIdRef]);

  const handleShare = useCallback(async () => {
    if (!image?._id || sharePendingRef.current) return;
    sharePendingRef.current = true;
    setIsSharing(true);
    const selectedId = image._id;
    const slug = generateImageSlug(image.imageTitle || t('image.untitled'), selectedId);
    try {
      const result = await sharePhotoLink({
        title: image.imageTitle || t('image.photo'),
        text: t('imagePage.shareText', { title: image.imageTitle || t('image.untitled') }),
        url: window.location.origin + '/photos/' + slug,
      });
      if (!pageActiveRef.current || currentImageIdRef.current !== selectedId) return;
      if (result === 'copied') toast.success(t('share.linkCopied'));
      if (result === 'failed') toast.error(t('share.linkCopyFailed'));
    } finally {
      sharePendingRef.current = false;
      if (pageActiveRef.current) setIsSharing(false);
    }
  }, [image, pageActiveRef, currentImageIdRef]);

  return { handleDownload, handleToggleFavorite, handleShare, isTogglingFavorite, isFavorited, isDownloading, isSharing };
}
