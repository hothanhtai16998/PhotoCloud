/**
 * Common utility types used across the application
 */

/**
 * Geographic coordinates
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Pagination metadata
 */
export interface Pagination {
  page: number;
  pages: number;
  total: number;
  limit: number;
}

