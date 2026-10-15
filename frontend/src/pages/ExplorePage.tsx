import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { Compass, Camera, RotateCcw } from 'lucide-react';
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
import { saveImagePageScroll } from '@/utils/imagePageScroll';
import { useImagePageScrollRestore } from '@/hooks/useImagePageScrollRestore';

const returnCategories = new Map<string, string>();

const ORIENTATIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'landscape', label: 'Ngang' },
  { value: 'portrait', label: 'Dọc' },
  { value: 'square', label: 'Vuông' },
];

const SORTS = [
  { value: 'views', label: 'Phổ biến' },
  { value: 'date', label: 'Mới nhất' },
  { value: 'favorites', label: 'Nhiều lượt thích' },
  { value: 'downloads', label: 'Nhiều lượt tải' },
  { value: 'relevance', label: 'Liên quan' },
];

export default function ExplorePage() {
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

  const [categories, setCategories] = useState<Category[]>([]);
  const { filters, setFilters, resetFilters } = useSearchFilters();
  const orientation = filters.orientation;
  const sort = filters.sortBy || 'date';
  const [locale, setLocale] = useState<'vi' | 'en'>(getLocale());
  const [categoryError, setCategoryError] = useState(false);
  const [categoryAttempt, setCategoryAttempt] = useState(0);
  const hasActiveFilters = activeCategory !== 'all' || JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);
  const clearFilters = () => { setActiveCategory('all'); resetFilters(); };

  // Load categories
  useEffect(() => {
    let active = true;
    categoryService
      .fetchCategories()
      .then((data) => { if (active) { setCategories(data || []); setCategoryError(false); } })
      .catch(() => { if (active) setCategoryError(true); });
    return () => { active = false; };
  }, [categoryAttempt]);

  // Locale change
  useEffect(() => {
    const handle = () => setLocale(getLocale());
    window.addEventListener('localeChange', handle);
    return () => window.removeEventListener('localeChange', handle);
  }, []);

  const params = useMemo(() => {
    const categoryName =
      activeCategory === 'all'
        ? undefined
        : getCategoryNameFromSlug(activeCategory, categories) ?? undefined;

    return {
      ...buildFilterParams(filters, { page: 1, category: categoryName }),
      sortBy: sort,
      order: filters.order || 'desc',
      page: 1,
      limit: 30,
    };

  }, [activeCategory, sort, filters, categories]);
  useEffect(() => {
    setRequestedPage(1);
    void fetchImages(params);
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

  return (
    <main ref={pageRef} className="explore-page">
      <section className="explore-hero">
        <div className="explore-hero-inner">
          <h1>
            Khám phá <em>những khung hình</em>
          </h1>
          <p>
            Tìm cảm hứng từ những bức ảnh tại {BRAND.nameLong}. Chọn chủ đề và bố cục bạn yêu thích.
          </p>
        </div>
      </section>

      <section className="explore-filters">
        <div className="page-photo-search">
          <SearchBar filterButtonLabel="Bộ lọc nâng cao" />
        </div>
        <div className="explore-filter-row">
          <h2 className="explore-filter-label">
            <Compass size={15} aria-hidden /> Danh mục
          </h2>
          <div className="explore-categories" role="group" aria-label="Danh mục ảnh">
            <button
              type="button"
              aria-pressed={activeCategory === 'all'}
              className={`explore-chip${activeCategory === 'all' ? ' is-active' : ''}`}
              onClick={() => setActiveCategory('all')}
            >
              Tất cả
            </button>
            {translatedCategories.map((cat) => (
              <button
                key={cat.slug}
                type="button"
                aria-pressed={activeCategory === cat.slug}
                className={`explore-chip${activeCategory === cat.slug ? ' is-active' : ''}`}
                onClick={() => setActiveCategory(cat.slug)}
              >
                {cat.translated}
                {cat.count > 0 && <span className="explore-chip-count">{cat.count}</span>}
              </button>
            ))}
          </div>
        </div>
        {categoryError && <p className="explore-category-error" role="alert">Không tải được danh mục. <button type="button" onClick={() => setCategoryAttempt(value => value + 1)}>Thử lại</button></p>}

        <div className="explore-filter-row explore-filter-row--compact">
          <div className="explore-filter-group">
            <span className="explore-filter-label">Bố cục</span>
            <div className="explore-segmented">
              {ORIENTATIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`explore-segmented-btn${orientation === opt.value ? ' is-active' : ''}`}
                  aria-pressed={orientation === opt.value}
                  onClick={() => setFilters({ ...filters, orientation: opt.value as typeof filters.orientation })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="explore-filter-group">
            <label htmlFor="explore-sort" className="explore-filter-label">Sắp xếp</label>
            <select
              id="explore-sort"
              className="explore-select"
              value={sort}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as typeof filters.sortBy })}
            >
              {SORTS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {hasActiveFilters && <button className="explore-reset" type="button" onClick={clearFilters}><RotateCcw size={15} /> Xóa bộ lọc</button>}
        </div>
      </section>

      <section className="explore-grid-wrap">
        <p className="explore-results" role="status">{loading ? 'Đang tải ảnh…' : error ? 'Chưa tải được kết quả mới.' : `${new Intl.NumberFormat('vi-VN').format(pagination?.total ?? images.length)} ảnh${activeCategory !== 'all' ? ` · ${translatedCategories.find(category => category.slug === activeCategory)?.translated || ''}` : ''}`}</p>
        {error && <div className="explore-error" role="alert"><p>Không thể tải ảnh. Bạn có thể thử lại.</p><button type="button" onClick={() => void fetchImages({ ...params, page: requestedPage, _refresh: true })}>Thử lại tải ảnh</button></div>}
        {loading && requestedPage === 1 ? (
          <div className="explore-empty" aria-hidden="true">Đang chuẩn bị những khung hình…</div>
        ) : !error && images.length === 0 ? (
          <div className="explore-empty">
            <Camera size={48} aria-hidden />
            <h3>Chưa có ảnh phù hợp</h3>
            <p>Thử chọn danh mục khác hoặc bỏ bộ lọc bố cục.</p>
            {hasActiveFilters && <button type="button" className="explore-reset" onClick={clearFilters}>Xóa bộ lọc</button>}
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

