// Unsplash-style grid configuration
export const GRID_CONFIG = {
  baseRowHeight: 5, // Very fine-grained control for precise height ranges (5px = 1 row)
  gap: 24, // Gap between grid items
  columns: {
    desktop: 3,
    tablet: 2,
    mobile: 1,
  },
  breakpoints: {
    tablet: 768,
    desktop: 1280,
  },
  minRowSpan: 1,
  maxRowSpan: 160, // Maximum rows (5px * 160 = 800px max for very tall portraits, plus gaps)
} as const;

