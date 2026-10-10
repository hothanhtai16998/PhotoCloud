import type { Location } from 'react-router-dom';

export interface ImagePageScrollPosition {
  windowY: number;
  contentY: number;
}

const positions = new Map<string, ImagePageScrollPosition>();
const entryKey = (location: Pick<Location, 'key' | 'pathname' | 'search' | 'hash'>): string =>
  `${location.key}:${location.pathname}${location.search}${location.hash}`;

export function saveImagePageScroll(location: Location, scroller: HTMLElement | null): void {
  const key = entryKey(location);
  positions.delete(key);
  positions.set(key, {
    windowY: Math.max(0, window.scrollY),
    contentY: Math.max(0, scroller?.scrollTop || 0),
  });
  if (positions.size > 50) positions.delete(positions.keys().next().value!);
}

export function getImagePageScroll(location: Location): ImagePageScrollPosition | undefined {
  return positions.get(entryKey(location));
}
