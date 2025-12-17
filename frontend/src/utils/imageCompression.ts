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

	// Adaptive defaults based on file size + connection type
	const bytes = file.size;
	const sizeMB = bytes / 1024 / 1024;

	// Try to detect connection quality (may be undefined on some browsers)
	type NetworkInfo = { effectiveType?: string };
	const effectiveType =
		typeof navigator !== 'undefined' &&
		'navigator' in window &&
		(navigator as any).connection
			? ((navigator as any).connection as NetworkInfo).effectiveType
			: undefined;

	const isSlowNetwork =
		effectiveType === '2g' || effectiveType === 'slow-2g' || effectiveType === '3g';

	// Base defaults
	let maxSizeMB = 4;
	let maxWidthOrHeight = 2560;

	// Heavier compression for very large files or slow networks
	if (sizeMB > 15 || isSlowNetwork) {
		maxSizeMB = 3; // aim smaller
		maxWidthOrHeight = 2200;
	} else if (sizeMB > 30) {
		maxSizeMB = 2.5;
		maxWidthOrHeight = 2000;
	}

	const defaultOptions: CompressionOptions = {
		maxSizeMB,
		maxWidthOrHeight,
		useWebWorker: true,
		fileType: file.type,
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

