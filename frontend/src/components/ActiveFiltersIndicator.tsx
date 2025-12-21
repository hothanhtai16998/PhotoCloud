import { X } from 'lucide-react';
import { useSearchFilters } from '@/components/SearchBar/hooks/useSearchFilters';
import { t } from '@/i18n';
import type { SearchFilters } from '@/components/SearchFilters';
import './ActiveFiltersIndicator.css';

interface ActiveFiltersIndicatorProps {
  filters: SearchFilters;
}

/**
 * Get a human-readable label for a filter value
 */
function getFilterLabel(key: keyof SearchFilters, value: any): string {
  if (value === undefined || value === null || value === '' || value === 'all') {
    return '';
  }

  switch (key) {
    case 'orientation':
      switch (value) {
        case 'portrait':
          return t('search.portrait');
        case 'landscape':
          return t('search.landscape');
        case 'square':
          return t('search.square');
        default:
          return String(value);
      }
    case 'color':
      const colorLabels: Record<string, string> = {
        red: t('search.red'),
        orange: t('search.orange'),
        yellow: t('search.yellow'),
        green: t('search.green'),
        blue: t('search.blue'),
        purple: t('search.purple'),
        pink: t('search.pink'),
        brown: t('search.brown'),
        black: t('search.black'),
        white: t('search.white'),
        gray: t('search.gray'),
      };
      return colorLabels[value] || String(value);
    case 'sortBy':
      const sortLabels: Record<string, string> = {
        date: t('search.sortDate') || 'Date',
        views: t('search.sortViews') || 'Views',
        downloads: t('search.sortDownloads') || 'Downloads',
        favorites: t('search.sortFavorites') || 'Favorites',
        relevance: t('search.sortRelevance') || 'Relevance',
      };
      return sortLabels[value] || String(value);
    case 'order':
      return value === 'asc' ? (t('search.sortAsc') || 'Ascending') : (t('search.sortDesc') || 'Descending');
    case 'dateFrom':
    case 'dateTo':
      return new Date(value).toLocaleDateString();
    case 'aspectRatio':
      return `${value}`;
    default:
      return String(value);
  }
}

/**
 * Get filter display name
 */
function getFilterDisplayName(key: keyof SearchFilters): string {
  const labels: Record<string, string> = {
    orientation: t('search.orientation') || 'Orientation',
    color: t('search.color') || 'Color',
    dateFrom: t('search.fromDate') || 'From Date',
    dateTo: t('search.toDate') || 'To Date',
    sortBy: t('search.sortBy') || 'Sort By',
    order: t('search.order') || 'Order',
    cameraMake: t('search.cameraMake') || 'Camera Make',
    cameraModel: t('search.cameraModel') || 'Camera Model',
    focalLengthMin: t('search.focalLength') || 'Focal Length',
    focalLengthMax: t('search.focalLength') || 'Focal Length',
    apertureMin: t('search.aperture') || 'Aperture',
    apertureMax: t('search.aperture') || 'Aperture',
    isoMin: t('search.iso') || 'ISO',
    isoMax: t('search.iso') || 'ISO',
    minWidth: t('search.width') || 'Width',
    minHeight: t('search.height') || 'Height',
    aspectRatio: t('search.aspectRatio') || 'Aspect Ratio',
  };
  return labels[key] || String(key);
}

export function ActiveFiltersIndicator({ filters }: ActiveFiltersIndicatorProps) {
  const { resetFilters } = useSearchFilters();

  // Collect all active filters
  const activeFilters: Array<{ key: keyof SearchFilters; label: string; value: string }> = [];

  // Orientation
  if (filters.orientation && filters.orientation !== 'all') {
    activeFilters.push({
      key: 'orientation',
      label: getFilterDisplayName('orientation'),
      value: getFilterLabel('orientation', filters.orientation),
    });
  }

  // Color
  if (filters.color && filters.color !== 'all') {
    activeFilters.push({
      key: 'color',
      label: getFilterDisplayName('color'),
      value: getFilterLabel('color', filters.color),
    });
  }

  // Date From
  if (filters.dateFrom) {
    activeFilters.push({
      key: 'dateFrom',
      label: getFilterDisplayName('dateFrom'),
      value: getFilterLabel('dateFrom', filters.dateFrom),
    });
  }

  // Date To
  if (filters.dateTo) {
    activeFilters.push({
      key: 'dateTo',
      label: getFilterDisplayName('dateTo'),
      value: getFilterLabel('dateTo', filters.dateTo),
    });
  }

  // Sort By (only show if not default)
  if (filters.sortBy && filters.sortBy !== 'date') {
    activeFilters.push({
      key: 'sortBy',
      label: getFilterDisplayName('sortBy'),
      value: getFilterLabel('sortBy', filters.sortBy),
    });
  }

  // Order (only show if not default)
  if (filters.order && filters.order !== 'desc') {
    activeFilters.push({
      key: 'order',
      label: getFilterDisplayName('order'),
      value: getFilterLabel('order', filters.order),
    });
  }

  // Camera Make
  if (filters.cameraMake) {
    activeFilters.push({
      key: 'cameraMake',
      label: getFilterDisplayName('cameraMake'),
      value: String(filters.cameraMake),
    });
  }

  // Camera Model
  if (filters.cameraModel) {
    activeFilters.push({
      key: 'cameraModel',
      label: getFilterDisplayName('cameraModel'),
      value: String(filters.cameraModel),
    });
  }

  // Focal Length Range
  if (filters.focalLengthMin !== undefined || filters.focalLengthMax !== undefined) {
    const min = filters.focalLengthMin !== undefined ? `${filters.focalLengthMin}mm` : '';
    const max = filters.focalLengthMax !== undefined ? `${filters.focalLengthMax}mm` : '';
    const rangeValue = min && max ? `${min} - ${max}` : min || max;
    activeFilters.push({
      key: 'focalLengthMin',
      label: getFilterDisplayName('focalLengthMin'),
      value: rangeValue,
    });
  }

  // Aperture Range
  if (filters.apertureMin !== undefined || filters.apertureMax !== undefined) {
    const min = filters.apertureMin !== undefined ? `f/${filters.apertureMin}` : '';
    const max = filters.apertureMax !== undefined ? `f/${filters.apertureMax}` : '';
    const rangeValue = min && max ? `${min} - ${max}` : min || max;
    activeFilters.push({
      key: 'apertureMin',
      label: getFilterDisplayName('apertureMin'),
      value: rangeValue,
    });
  }

  // ISO Range
  if (filters.isoMin !== undefined || filters.isoMax !== undefined) {
    const min = filters.isoMin !== undefined ? `ISO ${filters.isoMin}` : '';
    const max = filters.isoMax !== undefined ? `ISO ${filters.isoMax}` : '';
    const rangeValue = min && max ? `${min} - ${max}` : min || max;
    activeFilters.push({
      key: 'isoMin',
      label: getFilterDisplayName('isoMin'),
      value: rangeValue,
    });
  }

  // Width
  if (filters.minWidth !== undefined) {
    activeFilters.push({
      key: 'minWidth',
      label: getFilterDisplayName('minWidth'),
      value: `≥ ${filters.minWidth}px`,
    });
  }

  // Height
  if (filters.minHeight !== undefined) {
    activeFilters.push({
      key: 'minHeight',
      label: getFilterDisplayName('minHeight'),
      value: `≥ ${filters.minHeight}px`,
    });
  }

  // Aspect Ratio
  if (filters.aspectRatio) {
    activeFilters.push({
      key: 'aspectRatio',
      label: getFilterDisplayName('aspectRatio'),
      value: getFilterLabel('aspectRatio', filters.aspectRatio),
    });
  }

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className="active-filters-indicator">
      <div className="active-filters-content">
        <span className="active-filters-label">
          {t('search.activeFilters') || 'Active Filters'}: {activeFilters.length}
        </span>
        <div className="active-filters-chips">
          {activeFilters.map((filter) => (
            <span key={String(filter.key)} className="active-filter-chip">
              <span className="filter-chip-label">{filter.label}:</span>
              <span className="filter-chip-value">{filter.value}</span>
            </span>
          ))}
        </div>
        <button
          className="active-filters-clear"
          onClick={resetFilters}
          title={t('search.clearFilters') || 'Clear all filters'}
        >
          <X size={16} />
          <span>{t('search.clearAll') || 'Clear All'}</span>
        </button>
      </div>
    </div>
  );
}

