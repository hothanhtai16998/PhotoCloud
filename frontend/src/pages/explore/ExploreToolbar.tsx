import React, { type ReactNode } from 'react';
import { Compass, RotateCcw, Search, Filter } from 'lucide-react';
import { BRAND } from '../../constants/brand';
import type { SearchFiltersType } from '../../components/SearchBar/hooks/useSearchFilters';
import { DataLoadingFrame } from '../../components/user/DataLoadingFrame';
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

interface ExploreToolbarProps {
 search?: ReactNode;
 activeCategory?: string;
 translatedCategories?: { slug: string; translated: string; count: number }[];
 filters?: SearchFiltersType;
 setFilters?: (filters: SearchFiltersType) => void;
 setActiveCategory?: (category: string) => void;
 categoryError?: boolean;
 onRetryCategories?: () => void;
 hasActiveFilters?: boolean;
 clearFilters?: () => void;
}
export function ExploreToolbar({ search = <div className="search-bar-container"><div className="header-search">
 <div className="search-icon-left"><Search size={20} /></div>
 <input className="search-input" placeholder="Tìm ảnh chụp..." readOnly aria-label="Tìm ảnh chụp" />
 <div className="search-filters-wrapper"><div className="search-filters-container">
 <button type="button" className="search-filters-toggle"><Filter size={18} /><span>Bộ lọc nâng cao</span></button>
 </div></div></div></div>,
 activeCategory = 'all', translatedCategories = [],
 filters = { orientation: 'all', color: 'all', dateFrom: '', dateTo: '', sortBy: 'date', order: 'desc' },
 setFilters = () => {}, setActiveCategory = () => {}, categoryError = false,
 onRetryCategories = () => {}, hasActiveFilters = false, clearFilters = () => {},
}: ExploreToolbarProps) {
 const orientation = filters.orientation;
 const sort = filters.sortBy || 'date';
 return <React.Fragment>
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
          {search}
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
        {categoryError && <p className="explore-category-error" role="alert">Không tải được danh mục. <button type="button" onClick={onRetryCategories}>Thử lại</button></p>}

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

 </React.Fragment>;
}
export function ExploreStartup() {
 return <main className="explore-page" data-loading-scope="local"><ExploreToolbar />
 <section className="explore-grid-wrap"><ExploreLoading /></section></main>;
}

export function ExploreLoading() {
 return <DataLoadingFrame message="Đang tải ảnh" />;
}
