import type { Image } from '@/types/image';
import { getSessionItem, setSessionItem, removeSessionItem, getStoredJson, setStoredJson, removeStoredItem } from './safeStorage';
import { onLogout } from './authEvents';

const KEY = 'sidebarFavoritePreview:v2';
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
export type FavoriteThumbnail = Pick<Image, '_id' | 'imageUrl' | 'imageTitle'>;
export interface FavoritePreview {
  ownerId: string | null;
  thumbnail: FavoriteThumbnail | null;
  total: number;
}
export const EMPTY_PREVIEW: FavoritePreview = { ownerId: null, thumbnail: null, total: 0 };

export function toFavoriteThumbnail(image: Image | null): FavoriteThumbnail | null {
  return image ? { _id: image._id, imageUrl: image.thumbnailUrl || image.smallUrl || image.imageUrl, imageTitle: image.imageTitle } : null;
}

export function readFavoritePreview(): FavoritePreview {
  try {
    const value = getStoredJson<Record<string, unknown> | null>(KEY, null) ?? JSON.parse(getSessionItem(KEY) || 'null');
    if (!value || typeof value.savedAt !== 'number' || !Number.isFinite(value.savedAt) || value.savedAt > Date.now() || Date.now() - value.savedAt > MAX_AGE) return EMPTY_PREVIEW;
    if (!value || typeof value.ownerId !== 'string' || !value.ownerId || !Number.isInteger(value.total) || value.total < 0) return EMPTY_PREVIEW;
    const image = value.thumbnail;
    if (image !== null && (!image || typeof image._id !== 'string' || typeof image.imageUrl !== 'string' || (image.imageTitle !== undefined && typeof image.imageTitle !== 'string'))) return EMPTY_PREVIEW;
    return { ownerId: value.ownerId, total: value.total, thumbnail: image };
  } catch {
    return EMPTY_PREVIEW;
  }
}

export function saveFavoritePreview(preview: FavoritePreview): void {
  const cached = { ...preview, savedAt: Date.now() };
  if (!setStoredJson(KEY, cached)) setSessionItem(KEY, JSON.stringify(cached));
}
export function clearFavoritePreview(): void {
  removeStoredItem(KEY);
  removeSessionItem(KEY);
  removeSessionItem('sidebarFavoritePreview:v1');
}
// Clear even when Sidebar is not mounted (for example, on admin pages).
onLogout(clearFavoritePreview);
