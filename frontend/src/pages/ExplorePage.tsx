import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { Compass, Camera } from 'lucide-react';
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
import { useSearchFilters } from '@/components/SearchBar/hooks/useSearchFilters';
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
  const hasMore = useImageStore((s) => s.hasMore);
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
  const { filters, setFilters } = useSearchFilters();
  const orientation = filters.orientation;
  const sort = filters.sortBy || 'date';
  const [locale, setLocale] = useState<'vi' | 'en'>(getLocale());

  // Load categories
  useEffect(() => {
    let active = true;
    categoryService
      .fetchCategories()
      .then((data) => { if (active) setCategories(data || []); })
      .catch(() => {/* ignore */});
    return () => { active = false; };
  }, []);

  // Locale change
  useEffect(() => {
    const handle = () => setLocale(getLocale());
    window.addEventListener('localeChange', handle);
    return () => window.removeEventListener('localeChange', handle);
  }, []);

  // Fetch images on filter change
  useEffect(() => {
    const categoryName =
      activeCategory === 'all'
        ? undefined
        : getCategoryNameFromSlug(activeCategory, categories) ?? undefined;

    const params = {
      ...buildFilterParams(filters, { page: 1, category: categoryName }),
      sortBy: sort,
      order: filters.order || 'desc',
      page: 1,
      limit: 30,
    };

    fetchImages(params);
  }, [activeCategory, orientation, sort, filters, categories, fetchImages]);

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
          <p className="booking-eyebrow">KHÁM PHÁ</p>
          <h1>
            Bộ sưu tập ảnh <em>được tuyển chọn</em>
          </h1>
          <p>
            Duyệt qua hàng nghìn bức ảnh từ cộng đồng {BRAND.nameLong}. Lọc theo danh mục, bố cục hoặc sắp xếp theo phong cách bạn yêu thích.
          </p>
        </div>
      </section>

      <section className="explore-filters">
        <div className="page-photo-search">
          <SearchBar />
        </div>
        <div className="explore-filter-row">
          <h2 className="explore-filter-label">
            <Compass size={15} aria-hidden /> Danh mục
          </h2>
          <div className="explore-categories" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeCategory === 'all'}
              className={`explore-chip${activeCategory === 'all' ? ' is-active' : ''}`}
              onClick={() => setActiveCategory('all')}
            >
              Tất cả
            </button>
            {translatedCategories.map((cat) => (
              <button
                key={cat.slug}
                type="button"
                role="tab"
                aria-selected={activeCategory === cat.slug}
                className={`explore-chip${activeCategory === cat.slug ? ' is-active' : ''}`}
                onClick={() => setActiveCategory(cat.slug)}
              >
                {cat.translated}
                {cat.count > 0 && <span className="explore-chip-count">{cat.count}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="explore-filter-row explore-filter-row--compact">
          <div className="explore-filter-group">
            <span className="explore-filter-label">Bố cục</span>
            <div className="explore-segmented">
              {ORIENTATIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`explore-segmented-btn${orientation === opt.value ? ' is-active' : ''}`}
                  onClick={() => setFilters({ ...filters, orientation: opt.value as typeof filters.orientation })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="explore-filter-group">
            <span className="explore-filter-label">Sắp xếp</span>
            <select
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
        </div>
      </section>

      <section className="explore-grid-wrap">
        {loading && images.length === 0 ? (
          <div className="explore-empty">Đang tải ảnh...</div>
        ) : images.length === 0 ? (
          <div className="explore-empty">
            <Camera size={48} aria-hidden />
            <h3>Chưa có ảnh phù hợp</h3>
            <p>Thử chọn danh mục khác hoặc bỏ bộ lọc bố cục.</p>
          </div>
        ) : (
          <NoFlashGrid
            images={images}
            hasMore={hasMore}
            loading={loading}
            onLoadMore={async () => {
              await fetchImages({ sortBy: sort, order: 'desc', page: 1, limit: 30 });
            }}
            onImageClick={handleImageClick}
          />
        )}
      </section>
    </main>
  );
}
