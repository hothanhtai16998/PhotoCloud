// ✅ OPTIMIZED: Lazy load browser-image-compression only when needed
// This saves ~50-80KB from initial bundle
let imageCompressionModule: typeof import('browser-image-compression') | null = null;

async function getImageCompression() {
	if (!imageCompressionModule) {
		imageCompressionModule = await import('browser-image-compression');
	}
	return imageCompressionModule.default;
}

/**
 * Get image dimensions without loading full image into memory
 */
async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(file);
		
		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve({ width: img.width, height: img.height });
		};
		
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Failed to load image dimensions'));
		};
		
		img.src = url;
	});
}

export interface CompressionOptions {
	maxSizeMB?: number;
	maxWidthOrHeight?: number;
	useWebWorker?: boolean;
	fileType?: string;
	preserveQuality?: boolean; // If true, skip compression entirely
	// High quality settings (passed to browser-image-compression)
	initialQuality?: number; // Initial JPEG quality (0-1, default 0.92 for high quality)
	maxIteration?: number; // Max iterations to find quality/size balance
	alwaysKeepResolution?: boolean; // Never reduce resolution dimensions
}

/**
 * Compress an image file before upload
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Compressed file (or original if preserveQuality is true)
 */
export async function compressImage(
	file: File,
	options: CompressionOptions = {}
): Promise<File> {
	// Skip compression if preserveQuality is true
	if (options.preserveQuality) {
		return file;
	}
	// Skip compression for GIFs - they should be uploaded as-is
	// Large GIFs (>2MB) will be converted to video on the backend
	if (file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif')) {
		return file;
	}

	// Skip compression for videos - they should be uploaded as-is
	if (file.type.startsWith('video/')) {
		return file;
	}

	// Set compression options
	// Highest quality settings: Preserve maximum quality, only compress very large files
	const defaultOptions: CompressionOptions = {
		maxSizeMB: 15, // Compress to max 15MB (only for very large files)
		maxWidthOrHeight: 7680, // Max 8K resolution (preserves original resolution for most images)
		useWebWorker: true, // Use web worker for better performance (doesn't block UI)
		fileType: file.type, // Preserve original file type
		// Highest quality settings - near lossless compression
		initialQuality: 0.98, // 98% quality - highest quality (near lossless)
		maxIteration: 15, // More iterations to find best quality/size balance
		alwaysKeepResolution: true, // Never reduce resolution
	};

	const compressionOptions = { ...defaultOptions, ...options };

	try {
		// Only compress very large files (>20MB) with highest quality settings
		// This preserves maximum quality for most images
		const compressionThreshold = 20 * 1024 * 1024; // 20MB - only compress very large files
		
		if (file.size > compressionThreshold) {
			// Get original image dimensions to preserve resolution
			const originalDimensions = await getImageDimensions(file);
			
			const imageCompression = await getImageCompression();
			
			// Use highest quality settings (98% quality - near lossless)
			const highestQualityOptions = {
				...compressionOptions,
				maxWidthOrHeight: Math.max(originalDimensions.width, originalDimensions.height),
				initialQuality: 0.98, // 98% quality - highest quality (near lossless)
				maxIteration: 15, // More iterations to find best quality
				alwaysKeepResolution: true, // Never reduce resolution
			};
			
			const compressedFile = await imageCompression(
				file,
				highestQualityOptions
			);
			
			// Verify resolution was preserved
			const compressedDimensions = await getImageDimensions(compressedFile);
			const resolutionChanged = 
				compressedDimensions.width !== originalDimensions.width ||
				compressedDimensions.height !== originalDimensions.height;
			
			if (resolutionChanged) {
				// Resolution was reduced - don't use compressed version
				console.warn('Compression would reduce resolution - using original file');
				return file;
			}
			
			// Only use compressed version if it's significantly smaller (at least 20% reduction)
			// This ensures we're actually making uploads faster while maintaining highest quality
			const sizeReduction = (file.size - compressedFile.size) / file.size;
			if (sizeReduction > 0.20) {
				console.log(
					`Image optimized (highest quality, resolution preserved): ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB (${(sizeReduction * 100).toFixed(1)}% smaller)`
				);
				return compressedFile;
			}
			// If compression didn't help much, use original
			return file;
		}
		// For files under 20MB, preserve original quality (no compression)
		return file;
	} catch (error) {
		console.error('Image compression failed:', error);
		// Return original file if compression fails
		return file;
	}
}

