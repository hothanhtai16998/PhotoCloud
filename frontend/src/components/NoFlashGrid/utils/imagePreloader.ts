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

// Progress callback type
export type ProgressCallback = (progress: number) => void;

// Store active XHR requests for cancellation
const activeXhrRequests = new Map<string, XMLHttpRequest>();

// Preload image with progress tracking using XMLHttpRequest
// Returns promise with image URL and calls progress callback
export const preloadImageWithProgress = (
  src: string,
  onProgress?: ProgressCallback,
  skipDecode = false
): Promise<string> => {
  if (!src) {
    return Promise.reject(new Error('Empty image source'));
  }
  
  // If already loaded, return immediately (use original src, not object URL)
  if (loadedImages.has(src)) {
    onProgress?.(100);
    // Return original src since it's already cached by browser
    return Promise.resolve(src);
  }
  
  // Check if already loading (return existing promise, but still call progress)
  if (imageLoadCache.has(src)) {
    // If we have progress callback, we can't track progress of existing request
    // Just return the promise
    return imageLoadCache.get(src)!;
  }

  const promise = new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // Store XHR for potential cancellation
    activeXhrRequests.set(src, xhr);
    
    console.log('[preloadImageWithProgress] Starting XHR request for:', src);
    
    xhr.open('GET', src, true);
    xhr.responseType = 'blob';
    
    // Track progress
    xhr.onprogress = (e) => {
      console.log('[preloadImageWithProgress] Progress event:', {
        lengthComputable: e.lengthComputable,
        loaded: e.loaded,
        total: e.total
      });
      if (e.lengthComputable && e.total > 0) {
        const progress = Math.round((e.loaded / e.total) * 100);
        console.log('[preloadImageWithProgress] Progress:', progress, '%', `(${e.loaded}/${e.total} bytes)`);
        onProgress?.(progress);
      } else {
        // If length not computable, show indeterminate progress
        console.log('[preloadImageWithProgress] Indeterminate progress, loaded:', e.loaded);
        // Show progress based on loaded bytes (estimate)
        if (e.loaded > 0) {
          onProgress?.(Math.min(90, Math.round((e.loaded / 1000000) * 10))); // Rough estimate
        } else {
          onProgress?.(10); // Start at 10% to show something
        }
      }
    };
    
    xhr.onload = () => {
      console.log('[preloadImageWithProgress] XHR onload, status:', xhr.status);
      activeXhrRequests.delete(src);
      if (xhr.status === 200) {
        const blob = xhr.response;
        const objectUrl = URL.createObjectURL(blob);
        
        // Always call progress 100% on load
        console.log('[preloadImageWithProgress] Loaded, calling onProgress(100)');
        onProgress?.(100);
        
        // Decode image if needed
        if (skipDecode) {
          loadedImages.add(src);
          imageLoadCache.delete(src);
          resolve(objectUrl);
        } else {
          // Create image to decode
          const img = new Image();
          img.onload = () => {
            img.decode()
              .then(() => {
                loadedImages.add(src);
                imageLoadCache.delete(src);
                resolve(objectUrl);
              })
              .catch(() => {
                // Even if decode fails, image is loaded
                loadedImages.add(src);
                imageLoadCache.delete(src);
                resolve(objectUrl);
              });
          };
          img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            imageLoadCache.delete(src);
            activeXhrRequests.delete(src);
            reject(new Error(`Failed to decode image: ${src}`));
          };
          img.src = objectUrl;
        }
      } else {
        imageLoadCache.delete(src);
        activeXhrRequests.delete(src);
        reject(new Error(`Failed to load image: ${src} (status: ${xhr.status})`));
      }
    };
    
    xhr.onerror = () => {
      console.error('[preloadImageWithProgress] XHR error');
      imageLoadCache.delete(src);
      activeXhrRequests.delete(src);
      reject(new Error(`Network error loading image: ${src}`));
    };
    
    xhr.onerror = () => {
      imageLoadCache.delete(src);
      activeXhrRequests.delete(src);
      reject(new Error(`Network error loading image: ${src}`));
    };
    
    xhr.ontimeout = () => {
      imageLoadCache.delete(src);
      activeXhrRequests.delete(src);
      reject(new Error(`Timeout loading image: ${src}`));
    };
    
    xhr.onabort = () => {
      imageLoadCache.delete(src);
      activeXhrRequests.delete(src);
      reject(new Error(`Request aborted: ${src}`));
    };
    
    // Set timeout (30 seconds)
    xhr.timeout = 30000;
    
    xhr.send();
  });
  
  imageLoadCache.set(src, promise);
  return promise;
};

// Cancel image loading (for cleanup)
export const cancelImageLoad = (src: string) => {
  const xhr = activeXhrRequests.get(src);
  if (xhr) {
    xhr.abort();
    activeXhrRequests.delete(src);
    imageLoadCache.delete(src);
  }
};



