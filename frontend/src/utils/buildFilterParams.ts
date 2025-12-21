import type { SearchFiltersType } from '@/components/SearchBar/hooks/useSearchFilters';

/**
 * Build fetch parameters from filters, optionally combining with category/search
 */
export function buildFilterParams(
  filters: SearchFiltersType,
  options?: {
    category?: string | undefined;
    search?: string | undefined;
    page?: number;
    limit?: number;
    _refresh?: boolean;
  }
): Record<string, any> {
  const fetchParams: any = {
    ...(options?.page !== undefined && { page: options.page }),
    ...(options?.limit !== undefined && { limit: options.limit }),
    ...(options?._refresh !== undefined && { _refresh: options._refresh }),
    ...(options?.search && { search: options.search }),
    ...(options?.category && { category: options.category }),
    // Color filter
    ...(filters.color !== 'all' && { color: filters.color }),
  };

  // Date range filters
  if (filters.dateFrom) {
    fetchParams.dateFrom = filters.dateFrom;
  }
  if (filters.dateTo) {
    fetchParams.dateTo = filters.dateTo;
  }

  // Orientation filter
  if (filters.orientation && filters.orientation !== 'all') {
    fetchParams.orientation = filters.orientation;
  }

  // Sorting - only include if not default values
  if (filters.sortBy && filters.sortBy !== 'date') {
    fetchParams.sortBy = filters.sortBy;
  }
  if (filters.order && filters.order !== 'desc') {
    fetchParams.order = filters.order;
  }

  // EXIF filters
  if (filters.cameraMake) {
    fetchParams.cameraMake = filters.cameraMake;
  }
  if (filters.cameraModel) {
    fetchParams.cameraModel = filters.cameraModel;
  }
  if (filters.focalLengthMin !== undefined) {
    fetchParams.focalLengthMin = filters.focalLengthMin;
  }
  if (filters.focalLengthMax !== undefined) {
    fetchParams.focalLengthMax = filters.focalLengthMax;
  }
  if (filters.apertureMin !== undefined) {
    fetchParams.apertureMin = filters.apertureMin;
  }
  if (filters.apertureMax !== undefined) {
    fetchParams.apertureMax = filters.apertureMax;
  }
  if (filters.isoMin !== undefined) {
    fetchParams.isoMin = filters.isoMin;
  }
  if (filters.isoMax !== undefined) {
    fetchParams.isoMax = filters.isoMax;
  }

  // Dimension filters
  if (filters.minWidth !== undefined) {
    fetchParams.minWidth = filters.minWidth;
  }
  if (filters.minHeight !== undefined) {
    fetchParams.minHeight = filters.minHeight;
  }
  if (filters.aspectRatio) {
    fetchParams.aspectRatio = filters.aspectRatio;
  }

  return fetchParams;
}

