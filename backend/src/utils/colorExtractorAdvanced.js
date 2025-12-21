/**
 * Advanced Color Extraction using K-Means Clustering
 * This provides more accurate color detection than simple pixel sampling
 */

import sharp from 'sharp';

/**
 * Convert RGB to LAB color space (more perceptually uniform than HSV)
 * This better matches human color perception
 */
function rgbToLab(r, g, b) {
    // Normalize to 0-1
    let rn = r / 255;
    let gn = g / 255;
    let bn = b / 255;

    // Convert to linear RGB
    rn = rn > 0.04045 ? Math.pow((rn + 0.055) / 1.055, 2.4) : rn / 12.92;
    gn = gn > 0.04045 ? Math.pow((gn + 0.055) / 1.055, 2.4) : gn / 12.92;
    bn = bn > 0.04045 ? Math.pow((bn + 0.055) / 1.055, 2.4) : bn / 12.92;

    // Convert to XYZ
    let x = (rn * 0.4124564 + gn * 0.3575761 + bn * 0.1804375) / 0.95047;
    let y = (rn * 0.2126729 + gn * 0.7151522 + bn * 0.0721750) / 1.00000;
    let z = (rn * 0.0193339 + gn * 0.1191920 + bn * 0.9503041) / 1.08883;

    // Convert to LAB
    x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x + 16/116);
    y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116);
    z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z + 16/116);

    const L = (116 * y) - 16;
    const a = 500 * (x - y);
    const b = 200 * (y - z);

    return { L, a, b };
}

/**
 * Calculate Euclidean distance in LAB color space
 */
function labDistance(lab1, lab2) {
    const dL = lab1.L - lab2.L;
    const da = lab1.a - lab2.a;
    const db = lab1.b - lab2.b;
    return Math.sqrt(dL * dL + da * da + db * db);
}

/**
 * Convert RGB to color name (same as original, but optimized)
 */
function rgbToColorName(r, g, b) {
    const normalizedR = r / 255;
    const normalizedG = g / 255;
    const normalizedB = b / 255;

    const brightness = (normalizedR + normalizedG + normalizedB) / 3;
    const max = Math.max(normalizedR, normalizedG, normalizedB);
    const min = Math.min(normalizedR, normalizedG, normalizedB);
    const delta = max - min;
    const saturation = max === 0 ? 0 : delta / max;

    // Achromatic colors
    if (brightness < 0.15) return 'black';
    // White: bright pixels with very low saturation (relaxed slightly from 0.98 to 0.95 for better detection)
    if (brightness > 0.95 && saturation < 0.05) return 'white';
    if (saturation < 0.15) return 'gray';

    // Calculate hue
    let hue = 0;
    if (delta === 0) return 'gray';
    if (max === normalizedR) {
        hue = 60 * (((normalizedG - normalizedB) / delta) % 6);
    } else if (max === normalizedG) {
        hue = 60 * ((normalizedB - normalizedR) / delta + 2);
    } else {
        hue = 60 * ((normalizedR - normalizedG) / delta + 4);
    }
    if (hue < 0) hue += 360;

    // Brown detection
    if (brightness >= 0.2 && brightness < 0.6 && saturation >= 0.15 && saturation < 0.7) {
        if (hue >= 10 && hue < 50) return 'brown';
        if ((hue >= 0 && hue < 10 || hue >= 350) && brightness < 0.45) return 'brown';
    }

    // Color mapping
    if (hue >= 0 && hue < 15) return 'red';
    if (hue >= 345 && hue < 360) return 'red';
    if (hue >= 15 && hue < 30) return 'orange';
    if (hue >= 30 && hue < 60) return 'yellow';
    if (hue >= 60 && hue < 150) return 'green';
    if (hue >= 150 && hue < 240) return 'blue';
    if (hue >= 240 && hue < 270) return 'purple';
    if (hue >= 270 && hue < 345) return 'pink';

    return 'gray';
}

/**
 * Simple K-Means clustering for colors
 * Groups similar colors together for more accurate dominant color detection
 */
function kMeansClustering(pixels, k, maxIterations = 10) {
    if (pixels.length === 0 || k === 0) return [];

    // Initialize centroids evenly distributed across pixels
    const centroids = [];
    const step = Math.max(1, Math.floor(pixels.length / k));
    for (let i = 0; i < k; i++) {
        const idx = Math.min(i * step, pixels.length - 1);
        centroids.push({
            lab: { ...pixels[idx].lab },
            count: 0,
        });
    }

    // K-means iterations
    for (let iter = 0; iter < maxIterations; iter++) {
        // Assign pixels to nearest centroid
        const clusters = Array(k).fill(null).map(() => []);
        
        for (const pixel of pixels) {
            let minDist = Infinity;
            let nearestIdx = 0;
            
            for (let i = 0; i < centroids.length; i++) {
                const dist = labDistance(pixel.lab, centroids[i].lab);
                if (dist < minDist) {
                    minDist = dist;
                    nearestIdx = i;
                }
            }
            
            clusters[nearestIdx].push(pixel);
        }

        // Update centroids
        let changed = false;
        for (let i = 0; i < k; i++) {
            if (clusters[i].length === 0) continue;

            // Calculate mean LAB values
            let sumL = 0, sumA = 0, sumB = 0;
            for (const pixel of clusters[i]) {
                sumL += pixel.lab.L;
                sumA += pixel.lab.a;
                sumB += pixel.lab.b;
            }

            const newL = sumL / clusters[i].length;
            const newA = sumA / clusters[i].length;
            const newB = sumB / clusters[i].length;

            // Check if centroid changed significantly (lower threshold for faster convergence)
            const dist = labDistance(centroids[i].lab, { L: newL, a: newA, b: newB });
            if (dist > 0.5) changed = true; // Lower threshold = faster convergence

            centroids[i].lab = { L: newL, a: newA, b: newB };
            centroids[i].count = clusters[i].length;
        }

        // Early termination: If centroids didn't change much, we're done
        if (!changed) break;
    }

    // Sort by cluster size (largest first)
    return centroids
        .filter(c => c.count > 0)
        .sort((a, b) => b.count - a.count);
}

/**
 * Advanced color extraction using K-Means clustering
 * @param {Buffer} imageBuffer - Image buffer
 * @param {number} maxColors - Maximum number of colors to extract
 * @param {string} mode - 'fast' (optimized) or 'accurate' (slower but better)
 */
export async function extractDominantColorsAdvanced(imageBuffer, maxColors = 3, mode = 'fast') {
    try {
        // Performance optimization: Adjust resize and sampling based on mode
        const resizeSize = mode === 'accurate' ? 250 : 150; // Smaller for fast mode
        const sampleStep = mode === 'accurate' ? 1 : 3; // Sample every 3rd pixel in fast mode
        const maxIterations = mode === 'accurate' ? 15 : 8; // Fewer iterations in fast mode
        
        // Resize for processing (smaller in fast mode for better performance)
        const resized = await sharp(imageBuffer)
            .resize(resizeSize, resizeSize, { fit: 'inside', withoutEnlargement: true })
            .raw()
            .toBuffer({ resolveWithObject: true });

        const { data, info } = resized;
        const width = info.width;
        const height = info.height;
        const channels = info.channels;

        // Collect all valid pixels with their LAB values
        const pixels = [];
        
        // Sample pixels (density depends on mode)
        for (let y = 0; y < height; y += sampleStep) {
            for (let x = 0; x < width; x += sampleStep) {
                const index = (y * width + x) * channels;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];

                // Calculate saturation first to properly handle white
                const normalizedR = r / 255;
                const normalizedG = g / 255;
                const normalizedB = b / 255;
                const max = Math.max(normalizedR, normalizedG, normalizedB);
                const min = Math.min(normalizedR, normalizedG, normalizedB);
                const saturation = max === 0 ? 0 : (max - min) / max;
                const brightness = (r + g + b) / 3;
                const normalizedBrightness = brightness / 255;

                // Skip very dark pixels (shadows)
                if (brightness < 25) continue;

                // For very bright pixels, only skip if they're overexposed (high saturation)
                // Allow white/low-saturation bright pixels through for proper white detection
                if (brightness > 248 && saturation > 0.1) continue;

                // Skip very desaturated pixels in middle brightness (they're just gray)
                if (saturation < 0.12 && normalizedBrightness > 0.2 && normalizedBrightness < 0.85) {
                    continue;
                }

                // Convert to LAB color space
                const lab = rgbToLab(r, g, b);

                pixels.push({
                    r, g, b,
                    lab,
                    brightness: normalizedBrightness,
                    saturation,
                });
            }
        }

        if (pixels.length === 0) return [];

        // Use k-means clustering to find dominant colors
        // Use maxColors + 1 to have some buffer, then filter down
        // In fast mode, use fewer clusters for better performance
        const maxClusters = mode === 'accurate' ? 8 : 6;
        const k = Math.min(maxColors + 1, Math.max(2, Math.min(maxClusters, Math.floor(pixels.length / 50))));
        const clusters = kMeansClustering(pixels, k, maxIterations);

        if (clusters.length === 0) return [];

        // Group pixels by their clusters and convert to color names
        // Assign each pixel to its nearest cluster
        const clusterPixels = Array(clusters.length).fill(null).map(() => []);
        
        for (const pixel of pixels) {
            let minDist = Infinity;
            let nearestClusterIdx = 0;
            
            for (let i = 0; i < clusters.length; i++) {
                const dist = labDistance(pixel.lab, clusters[i].lab);
                if (dist < minDist) {
                    minDist = dist;
                    nearestClusterIdx = i;
                }
            }
            
            clusterPixels[nearestClusterIdx].push(pixel);
        }
        
        // Count color names in each cluster
        const colorCounts = new Map();
        
        for (let i = 0; i < clusters.length; i++) {
            const pixelsInCluster = clusterPixels[i];
            if (pixelsInCluster.length === 0) continue;
            
            // Count color names in this cluster
            const clusterColorCounts = new Map();
            for (const pixel of pixelsInCluster) {
                const colorName = rgbToColorName(pixel.r, pixel.g, pixel.b);
                clusterColorCounts.set(colorName, (clusterColorCounts.get(colorName) || 0) + 1);
            }
            
            // Get the most common color in this cluster
            const sortedClusterColors = Array.from(clusterColorCounts.entries())
                .sort((a, b) => b[1] - a[1]);
            
            if (sortedClusterColors.length > 0) {
                const dominantColorInCluster = sortedClusterColors[0][0];
                const currentCount = colorCounts.get(dominantColorInCluster) || 0;
                // Weight by actual cluster size (number of pixels in cluster)
                colorCounts.set(dominantColorInCluster, currentCount + pixelsInCluster.length);
            }
        }

        // Get top colors by frequency
        const sortedColors = Array.from(colorCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxColors)
            .map(([color]) => color);

        // Filter by minimum presence
        const totalPixels = Array.from(colorCounts.values()).reduce((sum, count) => sum + count, 0);
        if (totalPixels === 0) return [];

        const MIN_COLOR_PERCENTAGE = 0.08;
        // Lower threshold for white/black (was 0.12) since they can be background/highlight colors
        const MIN_WHITE_BLACK_PERCENTAGE = 0.08;

        const filteredColors = sortedColors.filter(color => {
            const colorCount = colorCounts.get(color) || 0;
            const colorPercentage = colorCount / totalPixels;
            
            if (color === 'white' || color === 'black') {
                return colorPercentage >= MIN_WHITE_BLACK_PERCENTAGE;
            }
            return colorPercentage >= MIN_COLOR_PERCENTAGE;
        });

        // Fill back to maxColors if needed
        if (filteredColors.length < maxColors && filteredColors.length < sortedColors.length) {
            const remainingColors = Array.from(colorCounts.entries())
                .filter(([color]) => !filteredColors.includes(color))
                .map(([color, count]) => {
                    const percentage = count / totalPixels;
                    if (color === 'white' || color === 'black') {
                        return percentage >= MIN_WHITE_BLACK_PERCENTAGE ? { color, count, percentage } : null;
                    }
                    return percentage >= MIN_COLOR_PERCENTAGE ? { color, count, percentage } : null;
                })
                .filter(item => item !== null)
                .sort((a, b) => b.count - a.count)
                .slice(0, maxColors - filteredColors.length)
                .map(item => item.color);

            return [...filteredColors, ...remainingColors];
        }

        return filteredColors.length > 0 ? filteredColors : [];
    } catch (error) {
        console.error('Error in advanced color extraction:', error);
        // Fallback to simple extraction if advanced fails
        return [];
    }
}

