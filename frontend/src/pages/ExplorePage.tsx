import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { useImageStore } from '@/stores/useImageStore';
import { categoryService, type Category } from '@/services/categoryService';
import { categoryNameToSlug, getCategoryNameFromSlug } from '@/utils/categorySlug';
import { NoFlashGrid } from '@/components/NoFlashGrid';
import { ActualLocationContext } from '@/contexts/ActualLocationContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import { generateImageSlug } from '@/lib/utils';
import { saveScrollPosition, setModalActive, prepareModalNavigationState } from '@/utils/modalNavigation';
import type { Image } from '@/types/image';
import { SearchBar } from '@/components/SearchBar';
import { DEFAULT_FILTERS, useSearchFilters } from '@/components/SearchBar/hooks/useSearchFilters';
import { buildFilterParams } from '@/utils/buildFilterParams';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { BRAND } from '@/constants/brand';
import { getLocale } from '@/i18n';
import { getTranslatedCategoryName } from '@/utils/categoryTranslations';
import './ExplorePage.css';
import '@/components/user/DataLoading.css';
import { DataLoading } from '@/components/user/DataLoading';
import { ExploreLoading, ExploreToolbar } from './explore/ExploreToolbar';
import { readExploreCategories, saveExploreCategories } from './explore/categorySnapshot';
import { saveImagePageScroll } from '@/utils/imagePageScroll';
import { useImagePageScrollRestore } from '@/hooks/useImagePageScrollRestore';

const returnCategories = new Map<string, string>();

export default function ExplorePage() {
  useLayoutEffect(() => { document.getElementById('public-explore-startup')?.remove(); }, []);
  const navigate = useNavigate();
  const actualLocation = useContext(ActualLocationContext);
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigationType = useNavigationType();
  const pageRef = useRef<HTMLElement | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>(() =>
    navigationType === 'POP' ? returnCategories.get(location.key) || 'all' : 'all');
  useDocumentMeta({
    title: 'Khám phá',
    description: `Khám phá bộ sưu tập ảnh từ cộng đồng ${BRAND.nameLong}. Lọc theo danh mục, bố cục và phong cách.`,
  });

  const fetchImages = useImageStore((s) => s.fetchImages);
  const images = useImageStore((s) => s.images);
  const loading = useImageStore((s) => s.loading);
  const pagination = useImageStore((s) => s.pagination);
  const error = useImageStore((s) => s.error);
  const [requestedPage, setRequestedPage] = useState(1);
  const [hasLoadedResults, setHasLoadedResults] = useState(false);
  useImagePageScrollRestore(location, pageRef,
    navigationType === 'POP' && !loading && images.length > 0, false, undefined, images.length);

  const handleImageClick = useCallback((image: Image) => {
    const targetPath = `/photos/${generateImageSlug(image.imageTitle || 'Untitled', image._id)}`;
    const imageState = { images, image, fromGrid: true };
    if (isMobile) {
      saveImagePageScroll(location, null);
      returnCategories.delete(location.key);
      returnCategories.set(location.key, activeCategory);
      if (returnCategories.size > 50) returnCategories.delete(returnCategories.keys().next().value!);
      navigate(targetPath, { state: imageState });
      return;
    }

    saveScrollPosition();
    setModalActive();
    const background = {
      pathname: actualLocation?.pathname || '/explore',
      search: actualLocation?.search || '',
      hash: actualLocation?.hash || '',
      state: null,
      key: actualLocation?.key || 'default',
    };
    navigate(targetPath, {
      state: { ...prepareModalNavigationState(background), ...imageState },
    });
  }, [navigate, images, actualLocation, isMobile, location, activeCategory]);

  const [categories, setCategories] = useState<Category[]>(readExploreCategories);
  const { filters, setFilters, resetFilters } = useSearchFilters();
  const sort = filters.sortBy || 'date';
  const [locale, setLocale] = useState<'vi' | 'en'>(getLocale());
  const [categoryError, setCategoryError] = useState(false);
  const [categoryAttempt, setCategoryAttempt] = useState(0);
  const hasActiveFilters = activeCategory !== 'all' || JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);
  // Sorting changes order, not whether a category contains matching images.
  const hasResultFilters = Object.keys(buildFilterParams(filters)).some(key => key !== 'sortBy' && key !== 'order');
  const clearFilters = () => { setActiveCategory('all'); resetFilters(); };

  // Load categories
  useEffect(() => {
    let active = true;
    categoryService
      .fetchCategories()
      .then((data) => { if (active) {
        setCategories(data || []); setCategoryError(false);
        const currentLocale = getLocale();
        saveExploreCategories((data || []).map(category => ({ ...category,
          translated: getTranslatedCategoryName(category.name, currentLocale) })), currentLocale);
      } })
      .catch(() => { if (active) setCategoryError(true); });
    return () => { active = false; };
  }, [categoryAttempt]);

  // Locale change
  useEffect(() => {
    const handle = () => setLocale(getLocale());
    window.addEventListener('localeChange', handle);
    return () => window.removeEventListener('localeChange', handle);
  }, []);

  const categoryName = activeCategory === 'all'
    ? undefined : getCategoryNameFromSlug(activeCategory, categories) ?? undefined;
  const params = useMemo(() => {
    return {
      ...buildFilterParams(filters, { page: 1, category: categoryName }),
      sortBy: sort,
      order: filters.order || 'desc',
      page: 1,
      limit: 30,
    };

  }, [categoryName, sort, filters]);
  useEffect(() => {
    let active = true;
    setRequestedPage(1);
    void fetchImages(params).then(() => {
      if (active && !useImageStore.getState().error) setHasLoadedResults(true);
    });
    return () => { active = false; };
  }, [params, fetchImages]);
  const loadNextPage = async () => {
    const state = useImageStore.getState();
    if (state.loading || state.error || !state.pagination || state.pagination.page >= state.pagination.pages) return;
    const nextPage = state.pagination.page + 1; setRequestedPage(nextPage);
    await fetchImages({ ...params, page: nextPage });
  };

  const translatedCategories = useMemo(
    () =>
      categories.map((c) => ({
        slug: categoryNameToSlug(c.name),
        name: c.name,
        translated: getTranslatedCategoryName(c.name, locale),
        count: c.imageCount ?? 0,
      })),
    [categories, locale],
  );
  const selectedCategoryLabel = translatedCategories.find(category => category.slug === activeCategory)?.translated;
  const emptyTitle = hasResultFilters ? 'Chưa có ảnh phù hợp' : selectedCategoryLabel ? 'Danh mục này chưa có ảnh' : 'Chưa có ảnh';
  const emptyDescription = hasResultFilters
    ? 'Không tìm thấy ảnh với bộ lọc hiện tại. Thử bỏ bộ lọc hoặc chọn danh mục khác.'
    : selectedCategoryLabel ? `Danh mục ${selectedCategoryLabel} chưa có ảnh. Bạn có thể chọn danh mục khác.`
    : 'Hiện chưa có ảnh để hiển thị. Bạn có thể quay lại sau.';

  return (
    <main ref={pageRef} className="explore-page" data-loading-scope="local">
      <ExploreToolbar search={<SearchBar filterButtonLabel="Bộ lọc nâng cao" />}
        activeCategory={activeCategory} translatedCategories={translatedCategories}
        filters={filters} setFilters={setFilters} setActiveCategory={setActiveCategory}
        categoryError={categoryError} onRetryCategories={() => setCategoryAttempt(value => value + 1)}
        hasActiveFilters={hasActiveFilters} clearFilters={clearFilters} />

      <section className="explore-grid-wrap">
        {hasLoadedResults && !loading && <p className="explore-results" role="status">{error ? 'Chưa tải được kết quả mới.' : `${new Intl.NumberFormat('vi-VN').format(pagination?.total ?? images.length)} ảnh${activeCategory !== 'all' ? ` · ${translatedCategories.find(category => category.slug === activeCategory)?.translated || ''}` : ''}`}</p>}
        {error && <div className="explore-error" role="alert"><p>Không thể tải ảnh. Bạn có thể thử lại.</p><button type="button" onClick={() => void fetchImages({ ...params, page: requestedPage, _refresh: true })}>Thử lại tải ảnh</button></div>}
        {loading && hasLoadedResults && images.length > 0 && <DataLoading size="inline" message={requestedPage > 1 ? 'Đang tải thêm ảnh' : 'Đang cập nhật ảnh'} />}
        {!error && (!hasLoadedResults || (loading && images.length === 0)) ? (
          <ExploreLoading />
        ) : !hasLoadedResults ? null : !error && images.length === 0 ? (
          <div className="explore-empty">
            <Camera size={48} aria-hidden />
            <h2>{emptyTitle}</h2>
            <p>{emptyDescription}</p>
            {hasResultFilters ? <button type="button" className="explore-reset" onClick={resetFilters}>Bỏ bộ lọc</button>
              : activeCategory !== 'all' && <button type="button" className="explore-reset" onClick={clearFilters}>Xem tất cả ảnh</button>}
          </div>
        ) : (
          <NoFlashGrid
            images={images}
            pagination={error ? null : pagination}
            loading={loading}
            onLoadMore={loadNextPage}
            onImageClick={handleImageClick}
          />
        )}
      </section>
    </main>
  );
}

