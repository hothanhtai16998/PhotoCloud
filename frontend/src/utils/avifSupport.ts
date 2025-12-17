/**
 * Detects if the browser supports AVIF image format
 * @returns Promise<boolean> - true if AVIF is supported
 */
export async function detectAvifSupport(): Promise<boolean> {
	// Check if already cached
	if (typeof window !== 'undefined' && 'avifSupport' in window) {
		return (window as { avifSupport?: boolean }).avifSupport ?? false;
	}

	// Create a test image to check AVIF support
	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () => {
			if (typeof window !== 'undefined') {
				(window as { avifSupport?: boolean }).avifSupport = true;
			}
			resolve(true);
		};
		img.onerror = () => {
			if (typeof window !== 'undefined') {
				(window as { avifSupport?: boolean }).avifSupport = false;
			}
			resolve(false);
		};
		// Use a 1x1 AVIF test image (data URI)
		// This is a minimal valid AVIF image
		img.src =
			'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
	});
}

/**
 * Get the best image URL based on browser support
 * @param image - Image object with WebP and AVIF URLs
 * @param size - Size variant: 'thumbnail' | 'small' | 'regular' | 'original'
 * @returns Promise<string> - Best URL for the browser
 */
export async function getBestImageUrl(
	image: {
		thumbnailUrl?: string;
		smallUrl?: string;
		regularUrl?: string;
		imageUrl?: string;
		thumbnailAvifUrl?: string;
		smallAvifUrl?: string;
		regularAvifUrl?: string;
		imageAvifUrl?: string;
	},
	size: 'thumbnail' | 'small' | 'regular' | 'original' = 'regular'
): Promise<string> {
	const supportsAvif = await detectAvifSupport();

	const urlMap = {
		thumbnail: supportsAvif ? image.thumbnailAvifUrl : image.thumbnailUrl,
		small: supportsAvif ? image.smallAvifUrl : image.smallUrl,
		regular: supportsAvif ? image.regularAvifUrl : image.regularUrl,
		original: supportsAvif ? image.imageAvifUrl : image.imageUrl,
	};

	return urlMap[size] || image.imageUrl || '';
}

