import type { Category } from '../../services/categoryService';

export interface CategorySnapshot extends Category { translated: string }

// Public presentation data only. Always revalidate against the category API.
// This function is also embedded in the HTML startup script; keep it self-contained.
export function readExploreCategories(): CategorySnapshot[] {
  try {
    const locale = localStorage.getItem('app_locale') === 'en' ? 'en' : 'vi';
    const stored: unknown = JSON.parse(sessionStorage.getItem('explore.categories.' + locale) || 'null');
    if (!Array.isArray(stored) || stored.length > 100) return [];
    return stored.filter((item): item is CategorySnapshot =>
      item && typeof item === 'object' && typeof item._id === 'string' &&
      typeof item.name === 'string' && item.name.length <= 200 &&
      typeof item.translated === 'string' && item.translated.length <= 200 &&
      (item.imageCount === undefined || (Number.isFinite(item.imageCount) && item.imageCount >= 0)));
  } catch { return []; }
}

export function saveExploreCategories(categories: CategorySnapshot[], locale: 'vi' | 'en'): void {
  try { sessionStorage.setItem('explore.categories.' + locale, JSON.stringify(categories.map(
    ({ _id, name, imageCount, translated }) => ({ _id, name, imageCount, translated })))); } catch { /* Storage is optional. */ }
}
