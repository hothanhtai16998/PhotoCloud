/**
 * Calculate image download times for initial page load
 * 
 * This script analyzes:
 * - How many images are loaded initially
 * - What image sizes are used
 * - Download times for different connection speeds
 */

// Image size estimates (based on typical photo sizes)
// These are approximate sizes for different image dimensions
const IMAGE_SIZE_ESTIMATES = {
  // Base64 thumbnail: ~1-2 KB (20x20px, very small)
  base64Thumbnail: 1.5, // KB
  
  // Network thumbnail: ~5-15 KB (200x200px, compressed)
  thumbnail: 10, // KB
  
  // Small image: ~30-80 KB (400x400px, compressed)
  small: 50, // KB
  
  // Regular image: ~150-400 KB (1080px width, optimized for display)
  regular: 250, // KB
  
  // Original image: ~500 KB - 5 MB (full resolution, varies greatly)
  original: 2000, // KB (2 MB average)
};

// Connection speeds (in Mbps, converted to KB/s)
const CONNECTION_SPEEDS = {
  '3G': 0.4, // 400 Kbps = 50 KB/s
  '4G': 4, // 4 Mbps = 500 KB/s
  '5G': 50, // 50 Mbps = 6250 KB/s
  'Fast 4G': 10, // 10 Mbps = 1250 KB/s
  'WiFi': 25, // 25 Mbps = 3125 KB/s
  'Fast WiFi': 100, // 100 Mbps = 12500 KB/s
};

// Convert Mbps to KB/s
function mbpsToKBps(mbps) {
  return (mbps * 1000) / 8; // Convert to KB/s
}

// Calculate download time
function calculateDownloadTime(sizeKB, speedKBps) {
  return sizeKB / speedKBps; // Time in seconds
}

// API configuration
const API_DEFAULT_LIMIT = 20; // Default limit from backend
const API_MAX_LIMIT = 100; // Maximum limit
const INITIAL_PAGE = 1; // First page loaded
const INITIAL_IMAGES_COUNT = API_DEFAULT_LIMIT; // Typically 20 images on first load (default)
const MAX_IMAGES_COUNT = API_MAX_LIMIT; // Maximum 100 images if limit is increased

// Image loading strategy
// Based on code analysis:
// 1. Base64 thumbnails are used for instant display (no download needed)
// 2. Regular images (regularUrl) are loaded for grid view (lazy loaded)
// 3. First 12 images are priority loaded (above the fold)
// 4. Images load 500px before entering viewport
// 5. Slider loads 10 images (if not searching)

console.log('='.repeat(80));
console.log('IMAGE DOWNLOAD TIME ANALYSIS');
console.log('='.repeat(80));

console.log('\n📊 INITIAL LOAD SCENARIO');
console.log('-'.repeat(80));
console.log(`API Request: Page ${INITIAL_PAGE}, Limit: ${API_DEFAULT_LIMIT} images (default)`);
console.log(`Images returned: ${INITIAL_IMAGES_COUNT} images (can be up to ${MAX_IMAGES_COUNT})`);
console.log(`Image metadata size: ~${(INITIAL_IMAGES_COUNT * 2).toFixed(0)} KB (JSON, gzipped)`);

console.log('\n🖼️  IMAGE LOADING STRATEGY');
console.log('-'.repeat(80));
console.log('1. Base64 thumbnails: Instant display (no download, embedded in JSON)');
console.log('2. Priority images (first 12): Load regularUrl immediately');
console.log('3. Lazy loaded images: Load regularUrl when 500px before viewport');
console.log('4. Slider images (if visible): Load 10 images with regularUrl');

console.log('\n📦 IMAGE SIZES USED');
console.log('-'.repeat(80));
console.log(`Base64 thumbnail:     ${IMAGE_SIZE_ESTIMATES.base64Thumbnail} KB (embedded, no download)`);
console.log(`Network thumbnail:    ${IMAGE_SIZE_ESTIMATES.thumbnail} KB (fallback only)`);
console.log(`Small image:          ${IMAGE_SIZE_ESTIMATES.small} KB (fallback only)`);
console.log(`Regular image:         ${IMAGE_SIZE_ESTIMATES.regular} KB (grid view - PRIMARY)`);
console.log(`Original image:        ${IMAGE_SIZE_ESTIMATES.original} KB (full view only)`);

// Calculate download scenarios
console.log('\n⏱️  DOWNLOAD TIME CALCULATIONS');
console.log('='.repeat(80));

// Scenario 1: Initial API response (JSON metadata)
const apiResponseSize = INITIAL_IMAGES_COUNT * 2; // ~2 KB per image metadata (gzipped)
console.log('\n📡 API Response (Image Metadata)');
console.log('-'.repeat(80));
console.log(`Size: ${apiResponseSize} KB (gzipped JSON)`);
Object.entries(CONNECTION_SPEEDS).forEach(([name, mbps]) => {
  const speedKBps = mbpsToKBps(mbps);
  const time = calculateDownloadTime(apiResponseSize, speedKBps);
  console.log(`${name.padEnd(12)}: ${time.toFixed(2)}s (${speedKBps.toFixed(0)} KB/s)`);
});

// Scenario 2: Priority images (first 12, above the fold)
const priorityImagesCount = 12;
const priorityImagesSize = priorityImagesCount * IMAGE_SIZE_ESTIMATES.regular;
console.log(`\n🎯 Priority Images (First ${priorityImagesCount} - Above the Fold)`);
console.log('-'.repeat(80));
console.log(`Count: ${priorityImagesCount} images`);
console.log(`Total size: ${priorityImagesSize} KB (${(priorityImagesSize / 1024).toFixed(2)} MB)`);
console.log(`Note: Loaded in parallel, so time = slowest single image`);
const singleImageTime = IMAGE_SIZE_ESTIMATES.regular;
Object.entries(CONNECTION_SPEEDS).forEach(([name, mbps]) => {
  const speedKBps = mbpsToKBps(mbps);
  const time = calculateDownloadTime(singleImageTime, speedKBps);
  console.log(`${name.padEnd(12)}: ${time.toFixed(2)}s per image (parallel load)`);
});

// Scenario 3: Full initial grid (all images on first page)
const fullGridSize = INITIAL_IMAGES_COUNT * IMAGE_SIZE_ESTIMATES.regular;
const maxGridSize = MAX_IMAGES_COUNT * IMAGE_SIZE_ESTIMATES.regular;
console.log(`\n📸 Full Initial Grid (All ${INITIAL_IMAGES_COUNT} Images - Default)`);
console.log('-'.repeat(80));
console.log(`Count: ${INITIAL_IMAGES_COUNT} images (default), up to ${MAX_IMAGES_COUNT} if limit increased`);
console.log(`Total size: ${fullGridSize} KB (${(fullGridSize / 1024).toFixed(2)} MB) - Default`);
console.log(`Total size: ${maxGridSize} KB (${(maxGridSize / 1024).toFixed(2)} MB) - Maximum`);
console.log(`Note: Lazy loaded progressively as user scrolls`);
console.log(`Note: Images load 500px before viewport, so user sees them before scrolling`);

// Calculate sequential vs parallel loading
console.log('\n   Sequential loading (worst case - one at a time):');
console.log('   Default (20 images):');
Object.entries(CONNECTION_SPEEDS).forEach(([name, mbps]) => {
  const speedKBps = mbpsToKBps(mbps);
  const time = calculateDownloadTime(fullGridSize, speedKBps);
  console.log(`     ${name.padEnd(10)}: ${time.toFixed(1)}s`);
});

console.log('\n   Parallel loading (best case - 6 concurrent connections):');
const concurrentConnections = 6; // Browser default
const imagesPerBatch = Math.ceil(INITIAL_IMAGES_COUNT / concurrentConnections);
const batchSize = imagesPerBatch * IMAGE_SIZE_ESTIMATES.regular;
console.log(`   Default (${INITIAL_IMAGES_COUNT} images, ${concurrentConnections} parallel, ~${imagesPerBatch} images per batch):`);
Object.entries(CONNECTION_SPEEDS).forEach(([name, mbps]) => {
  const speedKBps = mbpsToKBps(mbps);
  const timePerBatch = calculateDownloadTime(batchSize, speedKBps);
  const totalTime = timePerBatch * concurrentConnections;
  console.log(`     ${name.padEnd(10)}: ~${totalTime.toFixed(1)}s`);
});

// Scenario 4: Slider images (if visible)
const sliderImagesCount = 10;
const sliderImagesSize = sliderImagesCount * IMAGE_SIZE_ESTIMATES.regular;
console.log(`\n🎠 Slider Images (${sliderImagesCount} images, if visible)`);
console.log('-'.repeat(80));
console.log(`Count: ${sliderImagesCount} images`);
console.log(`Total size: ${sliderImagesSize} KB (${(sliderImagesSize / 1024).toFixed(2)} MB)`);
console.log(`Note: Loaded when slider is visible (lazy loaded)`);
Object.entries(CONNECTION_SPEEDS).forEach(([name, mbps]) => {
  const speedKBps = mbpsToKBps(mbps);
  const time = calculateDownloadTime(sliderImagesSize, speedKBps);
  console.log(`${name.padEnd(12)}: ${time.toFixed(1)}s (parallel load)`);
});

// Summary
console.log('\n' + '='.repeat(80));
console.log('📊 SUMMARY - INITIAL PAGE LOAD IMAGE DOWNLOAD');
console.log('='.repeat(80));

console.log('\n🎯 CRITICAL PATH (What user sees immediately):');
console.log('-'.repeat(80));
const criticalPathSize = apiResponseSize + priorityImagesSize;
console.log(`API metadata:        ${apiResponseSize} KB`);
console.log(`Priority images (12): ${priorityImagesSize} KB`);
console.log(`Total critical:       ${criticalPathSize} KB (${(criticalPathSize / 1024).toFixed(2)} MB)`);

console.log('\n⏱️  Time to First Contentful Paint (FCP):');
Object.entries(CONNECTION_SPEEDS).forEach(([name, mbps]) => {
  const speedKBps = mbpsToKBps(mbps);
  const time = calculateDownloadTime(criticalPathSize, speedKBps);
  console.log(`${name.padEnd(12)}: ${time.toFixed(2)}s`);
});

console.log('\n📈 Progressive Loading (Full grid visible):');
const fullLoadSize = apiResponseSize + fullGridSize;
console.log(`Total size: ${fullLoadSize} KB (${(fullLoadSize / 1024).toFixed(2)} MB)`);
console.log(`Note: Images load progressively as user scrolls`);
console.log(`Note: User sees content immediately, images enhance as they load`);

console.log('\n💡 OPTIMIZATION NOTES:');
console.log('-'.repeat(80));
console.log('✓ Base64 thumbnails provide instant visual feedback (0ms download)');
console.log('✓ Regular images (250 KB) are optimized for grid display');
console.log('✓ Lazy loading prevents downloading off-screen images');
console.log('✓ 500px preload margin ensures smooth scrolling');
console.log('✓ Priority loading for above-the-fold content');
console.log('✓ Parallel downloads (6 concurrent) maximize bandwidth usage');

console.log('\n🌐 CDN BENEFITS:');
console.log('-'.repeat(80));
console.log('✓ Images served from CDN (cdn.uploadanh.cloud)');
console.log('✓ Global edge locations reduce latency');
console.log('✓ HTTP/2 multiplexing enables parallel downloads');
console.log('✓ Browser caching reduces repeat downloads');

console.log('\n' + '='.repeat(80));

