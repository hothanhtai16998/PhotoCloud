import { useEffect, useState } from 'react';
import type { Image } from '@/types/image';
import { detectAvifSupport } from '@/utils/avifSupport';
import { getRegularImageUrl } from '@/components/NoFlashGrid/components/BlurUpImage';
import { preloadImage } from '@/components/NoFlashGrid/utils/imagePreloader';

// Keep the current grid visible until the next grid's priority photos are ready.
export function usePreparedGridImages(images: Image[]) {
  const [visibleImages, setVisibleImages] = useState(images);
  useEffect(() => {
    if (images === visibleImages) return;
    let cancelled = false;
    const commit = () => { if (!cancelled) setVisibleImages(images); };
    if (!images.length) { commit(); return; }
    // Slow or failed images must not hold up category navigation indefinitely.
    const timeout = setTimeout(commit, 3000);
    void (async () => {
      const avif = await detectAvifSupport().catch(() => false);
      if (cancelled) return;
      const urls = [...new Set(images.slice(0, 12).map(image => getRegularImageUrl(image, avif)).filter(Boolean))];
      await Promise.allSettled(urls.map(url => preloadImage(url, false)));
      clearTimeout(timeout);
      commit();
    })();
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [images, visibleImages]);
  return visibleImages;
}
