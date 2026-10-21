import { useCallback, useEffect, useState, startTransition } from 'react';
import { Heart, X, Download } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { Link } from 'react-router-dom';
import { useFavoriteStore } from '@/stores/useFavoriteStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserStore } from '@/stores/useUserStore';
import { useIsMobile } from '@/hooks/useIsMobile';
import { t } from '@/i18n';
import { readFavoritePreview, saveFavoritePreview, clearFavoritePreview } from '@/utils/sidebarFavoriteCache';
import { getSessionItem, setSessionItem, removeSessionItem } from '@/utils/safeStorage';
import { generateImageSlug } from '@/lib/utils';

/**
 * Hai mục tiện ích nằm trong UserMenu (mỗi mục một dòng, có icon + nhãn):
 *  - "Yêu thích" → mở dialog xem nhanh giống icon ♡ trên header cũ.
 *  - "Lịch sử tải" → liên kết tới trang downloads.
 *
 * Tách riêng để UserMenu không phải kéo theo toàn bộ ImagePageSidebar,
 * nhưng vẫn dùng chung store + favorite cache với thanh header.
 */
export function HeaderLibraryMenuItems({ onNavigate }: { onNavigate?: () => void }) {
  const isMobile = useIsMobile();
  const accessToken = useAuthStore(state => state.accessToken);
  const isInitializing = useAuthStore(state => state.isInitializing);
  const userId = useUserStore(state => state.user?._id);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryReady, setLibraryReady] = useState(false);
  useEffect(() => {
    if (!libraryOpen) return;
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 280;
    const timer = window.setTimeout(() => startTransition(() => setLibraryReady(true)), delay);
    return () => window.clearTimeout(timer);
  }, [libraryOpen]);
  const changeLibraryOpen = useCallback((open: boolean) => {
    setLibraryReady(false);
    setLibraryOpen(open);
  }, []);
  const [libraryError, setLibraryError] = useState(false);
  const favoriteImages = useFavoriteStore(state => state.images);
  const favoritesLoading = useFavoriteStore(state => state.loading);
  const [hadAuthOnMount] = useState(() => getSessionItem('hasAuth') === 'true');
  useEffect(() => {
    if (accessToken) setSessionItem('hasAuth', 'true');
    else if (!isInitializing) removeSessionItem('hasAuth');
  }, [accessToken, isInitializing]);
  const showAuthIcons = Boolean(accessToken) || (isInitializing && hadAuthOnMount);
  const [preview] = useState(readFavoritePreview);
  const favoriteTotal = !userId || preview.ownerId === userId ? preview.total : 0;
  useEffect(() => {
    if (!showAuthIcons) clearFavoritePreview();
  }, [showAuthIcons]);
  useEffect(() => {
    if (!libraryOpen) return;
    let active = true;
    setLibraryError(false);
    const store = useFavoriteStore.getState();
    const fetch = store.hasLoaded ? store.checkAndRefreshIfStale() : store.fetchFavorites();
    void fetch.catch(() => { if (active) setLibraryError(true); });
    return () => { active = false; };
  }, [libraryOpen]);
  // Giữ preview đồng bộ với session
  useEffect(() => {
    if (userId && preview.ownerId === userId) saveFavoritePreview(preview);
  }, [userId, preview]);
  useEffect(() => () => clearFavoritePreview(), []);

  if (!showAuthIcons) return null;

  return (
    <>
      <Dialog.Root modal={false} open={libraryOpen} onOpenChange={changeLibraryOpen}>
        <Dialog.Trigger asChild>
          <button
            type="button"
            className="header-library-action header-library-action-row"
            onClick={onNavigate}
            aria-label={isMobile ? `${t('header.favorites')} (${favoriteTotal})` : undefined}
          >
            <Heart size={18} />
            <span>{t('header.favorites')}</span>
            {favoriteTotal > 0 && <span className="header-library-count">{favoriteTotal}</span>}
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <div className="header-library-overlay" aria-hidden="true" onClick={() => setLibraryOpen(false)} />
          <Dialog.Content className="header-library-panel" aria-describedby={undefined}>
            <div className="header-library-heading">
              <Dialog.Title>{t('header.favorites')}</Dialog.Title>
              <Dialog.Close className="header-library-action" aria-label="Đóng" title="Đóng"><X size={20} /></Dialog.Close>
            </div>
            <div className="header-library-grid">
              {(favoritesLoading || !libraryReady) && <p role="status">Đang tải ảnh…</p>}
              {libraryError && <p role="alert">Không tải được ảnh. Vui lòng mở lại để thử lại.</p>}
              {libraryReady && !favoritesLoading && !libraryError && favoriteImages.length === 0 && <p>Chưa có ảnh yêu thích.</p>}
              {libraryReady && favoriteImages.slice(0, 20).map(image => <Link key={image._id} to={`/photos/${generateImageSlug(image.imageTitle || 'Untitled', image._id)}`} onClick={() => setLibraryOpen(false)}>
                <img src={image.thumbnailAvifUrl || image.thumbnailUrl || image.smallAvifUrl || image.smallUrl || image.imageUrl} alt={image.imageTitle || 'Ảnh yêu thích'} loading="lazy" decoding="async" width={160} height={160} />
              </Link>)}
            </div>
            <Link className="header-library-view-all" to="/favorites" onClick={() => setLibraryOpen(false)}>Xem tất cả ảnh yêu thích</Link>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Link to="/downloads" className="header-library-action header-library-action-row" onClick={onNavigate} aria-label={isMobile ? t('profile.downloadHistory') : undefined}>
        <Download size={18} />
        <span>{t('profile.downloadHistory')}</span>
      </Link>
    </>
  );
}
