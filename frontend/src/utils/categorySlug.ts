import { slugify } from '@/lib/utils';
import type { Category } from '@/services/categoryService';

/**
 * Convert category name to URL-friendly slug
 * Example: "Nature" -> "nature", "Street Photography" -> "street-photography"
 */
export function categoryNameToSlug(categoryName: string): string {
  if (!categoryName || categoryName.trim() === '') {
    return '';
  }
  return slugify(categoryName);
}

/**
 * Convert category slug back to category name
 * This requires fetching categories and matching by slug
 * Returns the category name if found, or null
 */
export async function categorySlugToName(
  slug: string,
  categories: Category[]
): Promise<string | null> {
  if (!slug || !categories || categories.length === 0) {
    return null;
  }

  // Find category where slug matches
  const category = categories.find(
    (cat) => categoryNameToSlug(cat.name) === slug
  );

  return category ? category.name : null;
}

/**
 * Get category name from slug synchronously (if categories are already loaded)
 */
export function getCategoryNameFromSlug(
  slug: string,
  categories: Category[]
): string | null {
  if (!slug || !categories || categories.length === 0) {
    return null;
  }

  const category = categories.find(
    (cat) => categoryNameToSlug(cat.name) === slug
  );

  return category ? category.name : null;
}

