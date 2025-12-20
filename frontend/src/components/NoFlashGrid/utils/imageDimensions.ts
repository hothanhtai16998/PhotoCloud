// Load image dimensions if not available
export async function loadImageDimensions(
  src: string
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      resolve(null);
    };
    img.src = src;
  });
}

// Check if image dimensions are available synchronously (for cached images)
// Returns dimensions if image is cached, null otherwise
export function getCachedImageDimensions(
  src: string
): { width: number; height: number } | null {
  if (!src) return null;
  
  try {
    const img = new Image();
    img.src = src;
    
    // If image is cached, it will be complete immediately
    if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
      return { width: img.naturalWidth, height: img.naturalHeight };
    }
  } catch {
    // Ignore errors
  }
  
  return null;
}





