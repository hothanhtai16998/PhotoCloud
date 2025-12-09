// Global image loading cache to prevent duplicate requests
const imageLoadCache = new Map<string, Promise<string>>();
const loadedImages = new Set<string>();

// Preload an image and cache the promise
// skipDecode: true for grid images (faster), false for modal images (prevents flash)
export const preloadImage = (
  src: string,
  skipDecode = false
): Promise<string> => {
  if (!src) {
    return Promise.reject(new Error('Empty image source'));
  }
  if (loadedImages.has(src)) {
    return Promise.resolve(src);
  }
  if (imageLoadCache.has(src)) {
    return imageLoadCache.get(src)!;
  }
  const promise = new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (skipDecode) {
        // For grid images, skip decode for faster loading
        loadedImages.add(src);
        imageLoadCache.delete(src);
        resolve(src);
      } else {
        // For modal images, decode to ensure it's ready for display (prevents flash)
        img
          .decode()
          .then(() => {
            loadedImages.add(src);
            imageLoadCache.delete(src);
            resolve(src);
          })
          .catch(() => {
            // Even if decode fails, image is loaded
            loadedImages.add(src);
            imageLoadCache.delete(src);
            resolve(src);
          });
      }
    };
    img.onerror = () => {
      imageLoadCache.delete(src);
      reject(new Error(`Failed to load image: ${src}`));
    };
    img.src = src;
  });
  imageLoadCache.set(src, promise);
  return promise;
};

// Preload multiple images with priority
// skipDecode: true for background preloading (faster), false for critical images
export const preloadImages = (
  sources: string[],
  priority = false,
  skipDecode = true
) => {
  const validSources = sources.filter(Boolean);
  if (validSources.length === 0) return;

  if (priority) {
    // Load first image immediately, then queue others
    if (validSources[0]) {
      preloadImage(validSources[0], skipDecode).catch(() => {});
    }
    // Queue rest with slight delay to not block
    if (validSources.length > 1) {
      setTimeout(() => {
        validSources.slice(1).forEach((src) => {
          if (src) preloadImage(src, skipDecode).catch(() => {});
        });
      }, 50);
    }
  } else {
    // Load all with slight stagger to avoid overwhelming
    validSources.forEach((src, i) => {
      setTimeout(() => {
        preloadImage(src, skipDecode).catch(() => {});
      }, i * 10);
    });
  }
};

// Check if an image is already loaded
export const isImageLoaded = (src: string): boolean => {
  return loadedImages.has(src);
};

// Export loadedImages set for direct access (used in ImageModal)
export { loadedImages };

