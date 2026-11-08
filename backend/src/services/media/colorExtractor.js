import { selectDominantColors } from '../../utils/dominantColorSelection.js';
import { rgbToColorName } from '../../utils/colorNames.js';
import sharp from 'sharp';

/**
 * Convert RGB to color name
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {string} Color name
 */


/**
 * Extract dominant colors from an image using improved algorithm
 * Uses k-means clustering for better accuracy, with performance optimization
 * @param {Buffer} imageBuffer - Image buffer
 * @param {number} maxColors - Maximum number of colors to extract (default: 3)
 * @param {boolean|string} useAdvanced - Use advanced algorithm: true (fast mode), 'accurate' (slower but more accurate), false (simple method)
 * @returns {Promise<string[]>} Array of color names
 */
export async function extractDominantColors(imageBuffer, maxColors = 3, useAdvanced = true) {
    // Performance optimization: For very large images, use simple method to avoid slowdown
    const imageSizeMB = imageBuffer.length / (1024 * 1024);
    const isLargeImage = imageSizeMB > 5; // Images larger than 5MB
    
    // Use advanced k-means algorithm for better accuracy
    if (useAdvanced && !isLargeImage) {
        try {
            const { extractDominantColorsAdvanced } = await import('./colorExtractorAdvanced.js');
            // Use 'fast' mode by default (optimized k-means), 'accurate' for maximum quality
            const mode = useAdvanced === 'accurate' ? 'accurate' : 'fast';
            const result = await extractDominantColorsAdvanced(imageBuffer, maxColors, mode);
            // Only return if we got valid results, otherwise fallback to simple method
            if (result && result.length > 0) {
                return result;
            }
        } catch (error) {
            console.warn('Advanced color extraction failed, using simple method:', error.message);
            // Fall through to simple method
        }
    }
    
    // Fallback to simple method (original implementation) - faster for large images
    return extractDominantColorsSimple(imageBuffer, maxColors);
}

/**
 * Simple color extraction (original implementation - kept as fallback)
 * @param {Buffer} imageBuffer - Image buffer
 * @param {number} maxColors - Maximum number of colors to extract (default: 3)
 * @returns {Promise<string[]>} Array of color names
 */
async function extractDominantColorsSimple(imageBuffer, maxColors = 3) {
    try {
        // Resize image to small size for faster processing (100x100 is enough)
        const resized = await sharp(imageBuffer)
            .resize(100, 100, { fit: 'inside', withoutEnlargement: true })
            .raw()
            .toBuffer({ resolveWithObject: true });

        const { data, info } = resized;
        const width = info.width;
        const height = info.height;
        const channels = info.channels;

        // Count color occurrences
        const colorCounts = new Map();

        // Sample pixels (every 5th pixel for performance)
        for (let y = 0; y < height; y += 5) {
            for (let x = 0; x < width; x += 5) {
                const index = (y * width + x) * channels;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];

                // Skip very dark pixels (likely background or shadows)
                // Brightness < 20 (normalized < 0.08) - too dark to be meaningful
                // Also skip very bright pixels (brightness > 249 = normalized > 0.98)
                // This helps prevent light gray/overexposed areas from being classified as white
                // Only true white pixels (RGB values very close to 255) will pass
                const brightness = (r + g + b) / 3;
                if (brightness < 20 || brightness > 249) continue;
                
                // Additional check: Skip pixels with very low saturation AND medium brightness
                // These are likely just desaturated/gray areas, not meaningful colors
                // This improves accuracy by focusing on vibrant colors
                const normalizedR = r / 255;
                const normalizedG = g / 255;
                const normalizedB = b / 255;
                const max = Math.max(normalizedR, normalizedG, normalizedB);
                const min = Math.min(normalizedR, normalizedG, normalizedB);
                const saturation = max === 0 ? 0 : (max - min) / max;
                const normalizedBrightness = brightness / 255;
                
                // Skip very desaturated pixels in middle brightness range (they're just gray)
                // Only keep if: very dark (black), very bright (white), or has some saturation (actual color)
                if (saturation < 0.1 && normalizedBrightness > 0.15 && normalizedBrightness < 0.9) {
                    continue;
                }

                const colorName = rgbToColorName(r, g, b);
                colorCounts.set(colorName, (colorCounts.get(colorName) || 0) + 1);
            }
        }

        // Get top colors by frequency
        const sortedColors = Array.from(colorCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxColors)
            .map(([color]) => color);

        // === Post-processing: Filter out colors with insufficient presence ===
        // This prevents small highlights, reflections, or noise from being classified as dominant
        return selectDominantColors(colorCounts, sortedColors, maxColors, 0.12);
    } catch (error) {
        console.error('Error extracting colors:', error);
        // Return empty array on error (don't fail upload)
        return [];
    }
}


