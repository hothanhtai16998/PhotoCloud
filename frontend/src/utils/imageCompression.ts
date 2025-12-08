// ✅ OPTIMIZED: Lazy load browser-image-compression only when needed
// This saves ~50-80KB from initial bundle
let imageCompressionModule: typeof import('browser-image-compression') | null = null;

async function getImageCompression() {
	if (!imageCompressionModule) {
		imageCompressionModule = await import('browser-image-compression');
	}
	return imageCompressionModule.default;
}

export interface CompressionOptions {
	maxSizeMB?: number;
	maxWidthOrHeight?: number;
	useWebWorker?: boolean;
	fileType?: string;
	preserveQuality?: boolean; // If true, skip compression entirely
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
		console.log(`[COMPRESSION] Preserving original quality: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
		return file;
	}
	// Skip compression for GIFs - they should be uploaded as-is
	// Large GIFs (>2MB) will be converted to video on the backend
	if (file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif')) {
		console.log(`[COMPRESSION] Skipping compression for GIF: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
		return file;
	}

	// Skip compression for videos - they should be uploaded as-is
	if (file.type.startsWith('video/')) {
		console.log(`[COMPRESSION] Skipping compression for video: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
		return file;
	}

	// Set compression options
	// Default: compress more aggressively to save bandwidth (when preserveQuality is false)
	const defaultOptions: CompressionOptions = {
		maxSizeMB: 4, // Compress to max 4MB (good balance)
		maxWidthOrHeight: 2560, // Max 2K resolution (good for most displays)
		useWebWorker: true, // Use web worker for better performance
		fileType: file.type, // Preserve original file type
	};

	const compressionOptions = { ...defaultOptions, ...options };

	try {
		// Compress files larger than 2MB (aggressive compression to save bandwidth)
		const compressionThreshold = 2 * 1024 * 1024;
		
		if (file.size > compressionThreshold) {
			const imageCompression = await getImageCompression();
			const compressedFile = await imageCompression(
				file,
				compressionOptions
			);
			console.warn(
				`Image compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`
			);
			return compressedFile;
		}
		// For files under threshold, preserve original quality
		return file;
	} catch (error) {
		console.error('Image compression failed:', error);
		// Return original file if compression fails
		return file;
	}
}

