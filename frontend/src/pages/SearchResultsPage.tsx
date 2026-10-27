import { DataLoading } from '@/components/user/DataLoading';
import { useCallback, useContext, useRef } from 'react';
import { useLocation, useNavigate, useNavigationType, useParams } from 'react-router-dom';
import { Camera, RefreshCw } from 'lucide-react';
import { useGlobalKeyboardShortcuts } from '@/hooks/useGlobalKeyboardShortcuts';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { triggerSearchFocus } from '@/utils/searchFocusEvent';
import { ActualLocationContext } from '@/contexts/ActualLocationContext';
import { NoFlashGrid } from '@/components/NoFlashGrid';
import { SearchBar } from '@/components/SearchBar';
import { ActiveFiltersIndicator } from '@/components/ActiveFiltersIndicator';
import { SearchResultsTags } from '@/components/SearchResultsTags';
import { generateImageSlug } from '@/lib/utils';
import type { Image } from '@/types/image';
import { saveScrollPosition, prepareModalNavigationState, setModalActive } from '@/utils/modalNavigation';
import { saveImagePageScroll } from '@/utils/imagePageScroll';
import { useImagePageScrollRestore } from '@/hooks/useImagePageScrollRestore';
import { useSearchResultsData } from './search/useSearchResultsData';
import './SearchResultsPage.css';

export default function SearchResultsPage() {
  // React Router already decodes route parameters. Decoding again breaks '%' searches.
  const { query: routeQuery = '' } = useParams<{ query: string }>();
  const query = routeQuery.trim();
  const data = useSearchResultsData(query);
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();
  const actualLocation = useContext(ActualLocationContext);
  const isMobile = useIsMobile();
  const pageRef = useRef<HTMLElement | null>(null);
  useDocumentMeta({ title: query ? `Tìm ảnh: ${query}` : 'Tìm kiếm ảnh',
    description: 'Tìm ảnh theo từ khóa và bộ lọc trên PhotoCloud.' });
  useGlobalKeyboardShortcuts({ onFocusSearch: triggerSearchFocus,
    isModalOpen: actualLocation?.pathname.startsWith('/photos/') || false });
  useImagePageScrollRestore(location, pageRef,
    navigationType === 'POP' && data.ready && !data.loading, false, undefined, data.images.length);

  const handleImageClick = useCallback((image: Image) => {
    const target = `/photos/${generateImageSlug(image.imageTitle || 'Untitled', image._id)}`;
    const state = { images: data.images, image, fromGrid: true };
    if (isMobile) {
      saveImagePageScroll(location, null);
      navigate(target, { state });
      return;
    }
    saveScrollPosition();
    setModalActive();
    const background = { pathname: location.pathname, search: location.search,
      hash: location.hash, state: null, key: location.key };
    navigate(target, { state: { ...prepareModalNavigationState(background), ...state } });
  }, [navigate, data.images, location, isMobile]);

  return (
    <main ref={pageRef} className="search-results-page" data-loading-scope="local">
      <div className="page-photo-search"><SearchBar filterButtonLabel="Bộ lọc tìm kiếm" /></div>
      <header className="search-results-content">
        <h1 className="search-results-heading">{query ? `Kết quả cho “${query}”` : 'Tìm kiếm ảnh'}</h1>
        <p className="search-results-summary" role="status">
          {data.loading || (!data.ready && !data.error && query) ? (data.images.length ? 'Đang tìm ảnh…' : '') : data.error
            ? 'Chưa tải được kết quả mới.' : `${new Intl.NumberFormat('vi-VN').format(data.pagination?.total ?? data.images.length)} ảnh phù hợp`}
        </p>
        {query && <SearchResultsTags query={query} />}
      </header>
      <ActiveFiltersIndicator filters={data.filters} />
      {data.loading && data.images.length > 0 && <DataLoading size="inline" message="Đang cập nhật kết quả ảnh" />}
      {data.error && <div className="search-results-error" role="alert">
        <p>{data.error}</p>
        <button type="button" disabled={data.loading} onClick={() => void data.retry()}><RefreshCw size={16} /> Thử lại tải ảnh</button>
      </div>}
      {!query ? <div className="search-results-empty"><Camera size={32} aria-hidden="true" />
        <p>Nhập từ khóa vào ô tìm kiếm để bắt đầu.</p>
      </div> : data.images.length ? <div className="search-results-grid-container">
        <NoFlashGrid images={data.images} loading={data.loading} onLoadData={data.refresh}
          onImageClick={handleImageClick} pagination={data.error ? null : data.pagination} onLoadMore={data.loadMore} />
      </div> : data.ready && !data.loading && !data.error ? <div className="search-results-empty">
        <Camera size={36} aria-hidden="true" />
        <h2>Chưa tìm thấy ảnh phù hợp</h2>
        <p>Thử từ khóa khác hoặc xóa bớt bộ lọc đang chọn.</p>
      </div> : !data.error ? <div className="search-results-grid-wrapper"><DataLoading message="Đang tìm ảnh" /></div> : null}
    </main>
  );
}
