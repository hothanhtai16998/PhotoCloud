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
  images?: Array<{ dominantColors?: string[] }>; // Optional: for showing color counts
}

// Helper function to get default filter values
const getDefaultFilters = (): SearchFilters => ({
  orientation: 'all',
  color: 'all',
  dateFrom: '',
  dateTo: '',
  sortBy: 'date',
  order: 'desc',
  cameraMake: undefined,
  cameraModel: undefined,
  focalLengthMin: undefined,
  focalLengthMax: undefined,
  apertureMin: undefined,
  apertureMax: undefined,
  isoMin: undefined,
  isoMax: undefined,
  minWidth: undefined,
  minHeight: undefined,
  aspectRatio: undefined,
});

// Helper function to count active filters
const countActiveFilters = (filterObj: SearchFilters): number => {
  let count = 0;
  if (filterObj.orientation !== 'all') count++;
  if (filterObj.color !== 'all') count++;
  if (filterObj.dateFrom) count++;
  if (filterObj.dateTo) count++;
  if (filterObj.sortBy && filterObj.sortBy !== 'date') count++;
  if (filterObj.order && filterObj.order !== 'desc') count++;
  if (filterObj.cameraMake) count++;
  if (filterObj.cameraModel) count++;
  if (filterObj.focalLengthMin !== undefined) count++;
  if (filterObj.focalLengthMax !== undefined) count++;
  if (filterObj.apertureMin !== undefined) count++;
  if (filterObj.apertureMax !== undefined) count++;
  if (filterObj.isoMin !== undefined) count++;
  if (filterObj.isoMax !== undefined) count++;
  if (filterObj.minWidth !== undefined) count++;
  if (filterObj.minHeight !== undefined) count++;
  if (filterObj.aspectRatio) count++;
  return count;
};

// Helper function to normalize filters for comparison (handles undefined vs empty string)
const normalizeFilter = (filter: SearchFilters): SearchFilters => {
  return {
    orientation: filter.orientation || 'all',
    color: filter.color || 'all',
    dateFrom: filter.dateFrom || '',
    dateTo: filter.dateTo || '',
    sortBy: filter.sortBy || 'date',
    order: filter.order || 'desc',
    cameraMake: filter.cameraMake || undefined,
    cameraModel: filter.cameraModel || undefined,
    focalLengthMin: filter.focalLengthMin !== undefined ? filter.focalLengthMin : undefined,
    focalLengthMax: filter.focalLengthMax !== undefined ? filter.focalLengthMax : undefined,
    apertureMin: filter.apertureMin !== undefined ? filter.apertureMin : undefined,
    apertureMax: filter.apertureMax !== undefined ? filter.apertureMax : undefined,
    isoMin: filter.isoMin !== undefined ? filter.isoMin : undefined,
    isoMax: filter.isoMax !== undefined ? filter.isoMax : undefined,
    minWidth: filter.minWidth !== undefined ? filter.minWidth : undefined,
    minHeight: filter.minHeight !== undefined ? filter.minHeight : undefined,
    aspectRatio: filter.aspectRatio || undefined,
  };
};

// Helper function to check if filters are equal
const areFiltersEqual = (a: SearchFilters, b: SearchFilters): boolean => {
  const normalizedA = normalizeFilter(a);
  const normalizedB = normalizeFilter(b);
  return JSON.stringify(normalizedA) === JSON.stringify(normalizedB);
};

export default function SearchFiltersComponent({
  filters,
  onFiltersChange,
  onReset,
  images,
}: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);

  // Sync localFilters with props when panel opens
  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters);
    }
  }, [isOpen, filters]);

  // Handle filter changes (staged, not applied until Apply is clicked)
  const handleFilterChange = useCallback((key: keyof SearchFilters, value: string | number | undefined) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Apply staged filters
  const handleApply = useCallback(() => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  }, [localFilters, onFiltersChange]);

  // Reset all filters to defaults
  const handleReset = useCallback(() => {
    const defaultFilters = getDefaultFilters();
    setLocalFilters(defaultFilters);
    // Auto-apply reset immediately and close modal
    onFiltersChange(defaultFilters);
    setIsOpen(false);
  }, [onFiltersChange]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = !areFiltersEqual(filters, localFilters);

  // Count active filters
  const activeFilterCount = countActiveFilters(filters);
  const hasActiveFilters = activeFilterCount > 0;

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        // Revert to original filters (will be synced when panel reopens)
        setLocalFilters(filters);
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleApply();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filters, handleApply]);

  // Prevent body scroll when filter is open
  // Using class-based approach to avoid layout shifts
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('search-filters-open');
    } else {
      document.body.classList.remove('search-filters-open');
    }

    // Cleanup
    return () => {
      document.body.classList.remove('search-filters-open');
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
        {hasActiveFilters && (
          <span className="filter-badge">
            {activeFilterCount > 9 ? '9+' : activeFilterCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="search-filters-overlay" 
            onClick={() => {
              setIsOpen(false);
              // Revert to original filters if there are unsaved changes
              if (hasUnsavedChanges) {
                setLocalFilters(filters);
              }
            }} 
          />
          <div 
            className={`search-filters-panel ${hasUnsavedChanges ? 'has-changes' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="search-filters-header">
              <h3>{t('search.filterTitle')}</h3>
              <button
                className="search-filters-close"
                onClick={() => {
                  setIsOpen(false);
                  // Revert to original filters if there are unsaved changes
                  if (hasUnsavedChanges) {
                    setLocalFilters(filters);
                  }
                }}
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
                  ] as { value: ColorFilter; label: string; color: string }[]).map((colorOption) => {
                    return (
                      <button
                        key={colorOption.value}
                        className={`filter-color-option ${localFilters.color === colorOption.value ? 'active' : ''}`}
                        onClick={() => {
                          // Just update local state - user needs to click Apply to apply changes
                          handleFilterChange('color', colorOption.value);
                        }}
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
                    );
                  })}
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
                  className={`filter-advanced-toggle ${showAdvanced ? 'active' : ''}`}
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <Settings size={16} />
                  <span>{showAdvanced ? (t('search.hideAdvanced') || 'Hide Advanced') : (t('search.showAdvanced') || 'Show Advanced')}</span>
                </button>
              </div>

              {/* Advanced Filters (EXIF & Dimensions) */}
              {showAdvanced && (
                <div className="filter-advanced-filters">
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
                </div>
              )}
            </div>

            <div className="search-filters-footer">
              <button
                className="filter-reset-btn"
                onClick={() => {
                  const defaultFilters = getDefaultFilters();
                  setLocalFilters(defaultFilters);
                  // Auto-apply reset immediately and close modal
                  onFiltersChange(defaultFilters);
                  setIsOpen(false);
                }}
                disabled={areFiltersEqual(localFilters, getDefaultFilters())}
              >
                {t('search.reset')}
              </button>
              <button
                className="filter-apply-btn"
                onClick={handleApply}
                disabled={!hasUnsavedChanges}
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


