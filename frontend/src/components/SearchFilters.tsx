import { useState, useCallback, useEffect } from 'react';
import { X, Filter, Calendar, Palette, Image as ImageIcon } from 'lucide-react';
import { t } from '@/i18n';
import './SearchFilters.css';

export type Orientation = 'all' | 'portrait' | 'landscape' | 'square';
export type ColorFilter = 'all' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'brown' | 'black' | 'white' | 'gray';

export interface SearchFilters {
  orientation: Orientation;
  color: ColorFilter;
  dateFrom: string;
  dateTo: string;
}

interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onReset: () => void;
}

export default function SearchFiltersComponent({
  filters,
  onFiltersChange,
  onReset,
}: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);

  const handleFilterChange = useCallback((key: keyof SearchFilters, value: string) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  }, [localFilters, onFiltersChange]);

  const handleReset = useCallback(() => {
    const defaultFilters: SearchFilters = {
      orientation: 'all',
      color: 'all',
      dateFrom: '',
      dateTo: '',
    };
    setLocalFilters(defaultFilters);
    onFiltersChange(defaultFilters);
    onReset();
  }, [onFiltersChange, onReset]);

  const hasActiveFilters = filters.orientation !== 'all' || 
    filters.color !== 'all' || 
    filters.dateFrom || 
    filters.dateTo;

  // Prevent body scroll when filter is open
  useEffect(() => {
    if (isOpen) {
      // Calculate scrollbar width to prevent layout shift
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      // Save current scroll position and padding
      const scrollY = window.scrollY;
      const originalPaddingRight = document.body.style.paddingRight;
      // Lock body scroll
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      // Add padding to compensate for scrollbar width to prevent layout shift
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      
      // Cleanup
      return () => {
        // Restore body scroll and padding
        const savedScrollY = document.body.style.top;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        document.body.style.paddingRight = originalPaddingRight || '';
        if (savedScrollY) {
          window.scrollTo(0, parseInt(savedScrollY || '0') * -1);
        }
      };
    } else {
      // Restore body scroll
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }

    // Cleanup on unmount
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  return (
    <div className="search-filters-container">
      <button
        className={`search-filters-toggle ${hasActiveFilters ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('search.openFilter')}
        title={t('search.advancedFilter')}
      >
        <Filter size={18} />
        <span>{t('search.filter')}</span>
        {hasActiveFilters && <span className="filter-badge" />}
      </button>

      {isOpen && (
        <>
          <div className="search-filters-overlay" onClick={() => setIsOpen(false)} />
          <div className="search-filters-panel" onClick={(e) => e.stopPropagation()}>
            <div className="search-filters-header">
              <h3>{t('search.filterTitle')}</h3>
              <button
                className="search-filters-close"
                onClick={() => setIsOpen(false)}
                aria-label={t('common.close')}
              >
                <X size={20} />
              </button>
            </div>

            <div className="search-filters-content">
              {/* Orientation Filter */}
              <div className="filter-group">
                <label className="filter-label">
                  <ImageIcon size={16} />
                  {t('search.imageOrientation')}
                </label>
                <div className="filter-options">
                  {(['all', 'portrait', 'landscape', 'square'] as Orientation[]).map((orientation) => (
                    <button
                      key={orientation}
                      className={`filter-option ${localFilters.orientation === orientation ? 'active' : ''}`}
                      onClick={() => handleFilterChange('orientation', orientation)}
                    >
                      {orientation === 'all' ? t('common.all') : 
                       orientation === 'portrait' ? t('search.portrait') :
                       orientation === 'landscape' ? t('search.landscape') : t('search.square')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Filter */}
              <div className="filter-group">
                <label className="filter-label">
                  <Palette size={16} />
                  {t('search.color')}
                </label>
                <div className="filter-color-options">
                  {([
                    { value: 'all', label: t('common.all'), color: 'transparent' },
                    { value: 'red', label: t('search.red'), color: '#ef4444' },
                    { value: 'orange', label: t('search.orange'), color: '#f97316' },
                    { value: 'yellow', label: t('search.yellow'), color: '#eab308' },
                    { value: 'green', label: t('search.green'), color: '#22c55e' },
                    { value: 'blue', label: t('search.blue'), color: '#3b82f6' },
                    { value: 'purple', label: t('search.purple'), color: '#a855f7' },
                    { value: 'pink', label: t('search.pink'), color: '#ec4899' },
                    { value: 'brown', label: t('search.brown'), color: '#a16207' },
                    { value: 'black', label: t('search.black'), color: '#000000' },
                    { value: 'white', label: t('search.white'), color: '#ffffff' },
                    { value: 'gray', label: t('search.gray'), color: '#6b7280' },
                  ] as { value: ColorFilter; label: string; color: string }[]).map((colorOption) => (
                    <button
                      key={colorOption.value}
                      className={`filter-color-option ${localFilters.color === colorOption.value ? 'active' : ''}`}
                      onClick={() => handleFilterChange('color', colorOption.value)}
                      title={colorOption.label}
                    >
                      <span
                        className="filter-color-swatch"
                        style={{
                          backgroundColor: colorOption.color,
                          border: colorOption.value === 'white' ? '1px solid #e5e5e5' : 'none',
                        }}
                      />
                      <span className="filter-color-label">{colorOption.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range Filter */}
              <div className="filter-group">
                <label className="filter-label">
                  <Calendar size={16} />
                  {t('search.dateRange')}
                </label>
                <div className="filter-date-inputs">
                  <div className="filter-date-input-group">
                    <label>{t('search.fromDate')}</label>
                    <input
                      type="date"
                      value={localFilters.dateFrom}
                      onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                      max={localFilters.dateTo || new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="filter-date-input-group">
                    <label>{t('search.toDate')}</label>
                    <input
                      type="date"
                      value={localFilters.dateTo}
                      onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                      min={localFilters.dateFrom}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="search-filters-footer">
              <button
                className="filter-reset-btn"
                onClick={handleReset}
                disabled={!hasActiveFilters}
              >
                {t('search.reset')}
              </button>
              <button
                className="filter-apply-btn"
                onClick={() => setIsOpen(false)}
              >
                {t('search.apply')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


