import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Camera } from 'lucide-react';
import { useImageStore } from '@/stores/useImageStore';
import { categoryService, type Category } from '@/services/categoryService';
import { categoryNameToSlug, getCategoryNameFromSlug } from '@/utils/categorySlug';
import { NoFlashGrid } from '@/components/NoFlashGrid';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { BRAND } from '@/constants/brand';
import { t, getLocale } from '@/i18n';
import { getTranslatedCategoryName } from '@/utils/categoryTranslations';
import './ExplorePage.css';

const ORIENTATIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'landscape', label: 'Ngang' },
  { value: 'portrait', label: 'Dọc' },
  { value: 'square', label: 'Vuông' },
];

const SORTS = [
  { value: 'popular', label: 'Phổ biến' },
  { value: 'date', label: 'Mới nhất' },
  { value: 'likes', label: 'Nhiều lượt thích' },
];

export default function ExplorePage() {
  const navigate = useNavigate();
  useDocumentMeta({
    title: 'Khám phá',
    description: `Khám phá bộ sưu tập ảnh từ cộng đồng ${BRAND.nameLong}. Lọc theo danh mục, bố cục và phong cách.`,
  });

  const fetchImages = useImageStore((s) => s.fetchImages);
  const images = useImageStore((s) => s.images);
  const loading = useImageStore((s) => s.loading);
  const hasMore = useImageStore((s) => s.hasMore);

  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [orientation, setOrientation] = useState<string>('all');
  const [sort, setSort] = useState<string>('popular');
  const [locale, setLocale] = useState<'vi' | 'en'>(getLocale());

  // Load categories
  useEffect(() => {
    let active = true;
    categoryService
      .getCategories()
      .then((data) => { if (active) setCategories(data.categories || []); })
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

    const params: Record<string, string | number | undefined> = {
      sortBy: sort === 'popular' ? 'popular' : sort,
      order: sort === 'date' ? 'desc' : 'desc',
      page: 1,
      limit: 30,
    };
    if (categoryName) params.category = categoryName;
    if (orientation !== 'all') params.orientation = orientation;

    fetchImages(params);
  }, [activeCategory, orientation, sort, categories, fetchImages]);

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
    <main className="explore-page">
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
                  onClick={() => setOrientation(opt.value)}
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
              onChange={(e) => setSort(e.target.value)}
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
            onImageClick={(image) => navigate(`/photos/${(image as { slug?: string }).slug ?? image._id}`)}
          />
        )}
      </section>
    </main>
  );
}
