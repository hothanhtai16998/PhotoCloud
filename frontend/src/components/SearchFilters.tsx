import { useState, useCallback, useEffect } from 'react';
import { X, Filter, Calendar, Palette, Image as ImageIcon, ArrowUpDown, Camera, Settings } from 'lucide-react';
import { t } from '@/i18n';
import type { SearchFiltersType } from '@/components/SearchBar/hooks/useSearchFilters';
import './SearchFilters.css';

export type Orientation = 'all' | 'portrait' | 'landscape' | 'square';
export type ColorFilter = 'all' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'brown' | 'black' | 'white' | 'gray';

// Re-export SearchFiltersType as SearchFilters for backward compatibility
export type SearchFilters = SearchFiltersType;

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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);

  const handleFilterChange = useCallback((key: keyof SearchFilters, value: string | number | undefined) => {
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
      sortBy: 'date',
      order: 'desc',
    };
    setLocalFilters(defaultFilters);
    onFiltersChange(defaultFilters);
    onReset();
  }, [onFiltersChange, onReset]);

  const hasActiveFilters = filters.orientation !== 'all' || 
    filters.color !== 'all' || 
    filters.dateFrom || 
    filters.dateTo ||
    filters.sortBy !== 'date' ||
    filters.order !== 'desc' ||
    filters.cameraMake ||
    filters.cameraModel ||
    filters.focalLengthMin !== undefined ||
    filters.focalLengthMax !== undefined ||
    filters.apertureMin !== undefined ||
    filters.apertureMax !== undefined ||
    filters.isoMin !== undefined ||
    filters.isoMax !== undefined ||
    filters.minWidth !== undefined ||
    filters.minHeight !== undefined ||
    filters.aspectRatio !== undefined;

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

              {/* Sort Options */}
              <div className="filter-group">
                <label className="filter-label">
                  <ArrowUpDown size={16} />
                  {t('search.sortBy') || 'Sort by'}
                </label>
                <div className="filter-sort-container">
                  <select
                    value={localFilters.sortBy || 'date'}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="filter-select"
                  >
                    <option value="date">{t('search.sortDate') || 'Date'}</option>
                    <option value="views">{t('search.sortViews') || 'Views'}</option>
                    <option value="downloads">{t('search.sortDownloads') || 'Downloads'}</option>
                    <option value="favorites">{t('search.sortFavorites') || 'Favorites'}</option>
                    <option value="relevance">{t('search.sortRelevance') || 'Relevance'}</option>
                  </select>
                  <select
                    value={localFilters.order || 'desc'}
                    onChange={(e) => handleFilterChange('order', e.target.value)}
                    className="filter-select"
                  >
                    <option value="desc">{t('search.sortDesc') || 'Descending'}</option>
                    <option value="asc">{t('search.sortAsc') || 'Ascending'}</option>
                  </select>
                </div>
              </div>

              {/* Advanced Filters Toggle */}
              <div className="filter-group">
                <button
                  type="button"
                  className="filter-advanced-toggle"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <Settings size={16} />
                  <span>{showAdvanced ? (t('search.hideAdvanced') || 'Hide Advanced') : (t('search.showAdvanced') || 'Show Advanced')}</span>
                </button>
              </div>

              {/* Advanced Filters (EXIF & Dimensions) */}
              {showAdvanced && (
                <>
                  {/* Camera Filters */}
                  <div className="filter-group">
                    <label className="filter-label">
                      <Camera size={16} />
                      {t('search.camera') || 'Camera'}
                    </label>
                    <div className="filter-input-group">
                      <input
                        type="text"
                        placeholder={t('search.cameraMake') || 'Make (e.g., Canon)'}
                        value={localFilters.cameraMake || ''}
                        onChange={(e) => handleFilterChange('cameraMake', e.target.value || undefined)}
                        className="filter-input"
                      />
                      <input
                        type="text"
                        placeholder={t('search.cameraModel') || 'Model (e.g., EOS R5)'}
                        value={localFilters.cameraModel || ''}
                        onChange={(e) => handleFilterChange('cameraModel', e.target.value || undefined)}
                        className="filter-input"
                      />
                    </div>
                  </div>

                  {/* Focal Length */}
                  <div className="filter-group">
                    <label className="filter-label">
                      {t('search.focalLength') || 'Focal Length (mm)'}
                    </label>
                    <div className="filter-range-group">
                      <input
                        type="number"
                        placeholder={t('search.min') || 'Min'}
                        value={localFilters.focalLengthMin || ''}
                        onChange={(e) => handleFilterChange('focalLengthMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                        className="filter-number-input"
                        min="0"
                      />
                      <span>-</span>
                      <input
                        type="number"
                        placeholder={t('search.max') || 'Max'}
                        value={localFilters.focalLengthMax || ''}
                        onChange={(e) => handleFilterChange('focalLengthMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                        className="filter-number-input"
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Aperture */}
                  <div className="filter-group">
                    <label className="filter-label">
                      {t('search.aperture') || 'Aperture (f/stop)'}
                    </label>
                    <div className="filter-range-group">
                      <input
                        type="number"
                        placeholder={t('search.min') || 'Min'}
                        value={localFilters.apertureMin || ''}
                        onChange={(e) => handleFilterChange('apertureMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                        className="filter-number-input"
                        min="0"
                        step="0.1"
                      />
                      <span>-</span>
                      <input
                        type="number"
                        placeholder={t('search.max') || 'Max'}
                        value={localFilters.apertureMax || ''}
                        onChange={(e) => handleFilterChange('apertureMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                        className="filter-number-input"
                        min="0"
                        step="0.1"
                      />
                    </div>
                  </div>

                  {/* ISO */}
                  <div className="filter-group">
                    <label className="filter-label">
                      {t('search.iso') || 'ISO'}
                    </label>
                    <div className="filter-range-group">
                      <input
                        type="number"
                        placeholder={t('search.min') || 'Min'}
                        value={localFilters.isoMin || ''}
                        onChange={(e) => handleFilterChange('isoMin', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="filter-number-input"
                        min="0"
                      />
                      <span>-</span>
                      <input
                        type="number"
                        placeholder={t('search.max') || 'Max'}
                        value={localFilters.isoMax || ''}
                        onChange={(e) => handleFilterChange('isoMax', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="filter-number-input"
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Image Dimensions */}
                  <div className="filter-group">
                    <label className="filter-label">
                      {t('search.dimensions') || 'Minimum Dimensions'}
                    </label>
                    <div className="filter-range-group">
                      <input
                        type="number"
                        placeholder={t('search.width') || 'Width (px)'}
                        value={localFilters.minWidth || ''}
                        onChange={(e) => handleFilterChange('minWidth', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="filter-number-input"
                        min="0"
                      />
                      <span>x</span>
                      <input
                        type="number"
                        placeholder={t('search.height') || 'Height (px)'}
                        value={localFilters.minHeight || ''}
                        onChange={(e) => handleFilterChange('minHeight', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="filter-number-input"
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Aspect Ratio */}
                  <div className="filter-group">
                    <label className="filter-label">
                      {t('search.aspectRatio') || 'Aspect Ratio'}
                    </label>
                    <select
                      value={localFilters.aspectRatio || ''}
                      onChange={(e) => handleFilterChange('aspectRatio', e.target.value || undefined)}
                      className="filter-select"
                    >
                      <option value="">{t('common.all') || 'All'}</option>
                      <option value="16:9">16:9</option>
                      <option value="4:3">4:3</option>
                      <option value="3:2">3:2</option>
                      <option value="1:1">1:1</option>
                      <option value="21:9">21:9</option>
                    </select>
                  </div>
                </>
              )}
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


