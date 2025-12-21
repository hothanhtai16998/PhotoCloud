import sharp from 'sharp';

/**
 * Convert RGB to color name
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {string} Color name
 */
function rgbToColorName(r, g, b) {
    // Normalize RGB values
    const normalizedR = r / 255;
    const normalizedG = g / 255;
    const normalizedB = b / 255;

    // Calculate brightness (lightness)
    const brightness = (normalizedR + normalizedG + normalizedB) / 3;

    // Calculate saturation
    const max = Math.max(normalizedR, normalizedG, normalizedB);
    const min = Math.min(normalizedR, normalizedG, normalizedB);
    const delta = max - min;
    const saturation = max === 0 ? 0 : delta / max;

    // === Step 1: Handle achromatic colors (black, white, gray) ===
    // Black: very dark (brightness < 0.15 for better detection)
    if (brightness < 0.15) return 'black';
    
    // White: bright pixels with very low saturation (relaxed slightly from 0.98 to 0.95 for better detection)
    // Require: brightness > 0.95 AND saturation < 0.05
    // This prevents light gray from being classified as white while allowing more white detection
    if (brightness > 0.95 && saturation < 0.05) return 'white';
    
    // Gray: low saturation (includes light gray that didn't meet white threshold)
    // Use stricter threshold: saturation < 0.15 (was 0.2) to better distinguish gray from muted colors
    if (saturation < 0.15) return 'gray';

    // === Step 2: Calculate hue ===
    let hue = 0;
    if (delta === 0) {
        // No hue (achromatic), but we already handled this above
        return 'gray';
    } else if (max === normalizedR) {
        hue = 60 * (((normalizedG - normalizedB) / delta) % 6);
    } else if (max === normalizedG) {
        hue = 60 * ((normalizedB - normalizedR) / delta + 2);
    } else {
        hue = 60 * ((normalizedR - normalizedG) / delta + 4);
    }
    if (hue < 0) hue += 360;

    // === Step 3: Handle brown (special case - needs brightness + saturation + hue) ===
    // Brown: low-medium brightness, low-medium saturation, orange/red/yellow hue range
    // Improved brown detection for better accuracy
    if (brightness >= 0.2 && brightness < 0.6 && saturation >= 0.15 && saturation < 0.7) {
        // Brown covers orange-red to yellow-orange range
        if (hue >= 10 && hue < 50) {
            return 'brown';
        }
        // Also catch dark reds that look brown
        if ((hue >= 0 && hue < 10 || hue >= 350) && brightness < 0.45) {
            return 'brown';
        }
    }

    // === Step 4: Map hue to color names (optimized for photography) ===
    // Standard HSV hue ranges optimized for accurate color detection in photos
    
    // Red: 0-15 and 345-360 (wraps around)
    if (hue >= 0 && hue < 15) return 'red';
    if (hue >= 345 && hue < 360) return 'red';
    
    // Orange: 15-30
    if (hue >= 15 && hue < 30) return 'orange';
    
    // Yellow: 30-60
    if (hue >= 30 && hue < 60) return 'yellow';
    
    // Green: 60-150 (covers all green shades including yellow-green and blue-green)
    if (hue >= 60 && hue < 150) return 'green';
    
    // Blue: 150-240 (covers cyan-blue to blue-purple)
    if (hue >= 150 && hue < 240) return 'blue';
    
    // Purple: 240-270 (violet/purple range)
    if (hue >= 240 && hue < 270) return 'purple';
    
    // Pink: 270-345 (magenta to pink-red range)
    // This covers the gap between purple and red for pink/magenta colors
    if (hue >= 270 && hue < 345) return 'pink';

    // Fallback (shouldn't reach here, but safety net)
    return 'gray';
}

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
        const totalPixels = Array.from(colorCounts.values()).reduce((sum, count) => sum + count, 0);
        if (totalPixels === 0) return [];
        
        const MIN_COLOR_PERCENTAGE = 0.08; // 8% minimum to be considered dominant
        const MIN_WHITE_BLACK_PERCENTAGE = 0.12; // 12% minimum for white/black (they need more presence)
        
        const filteredColors = sortedColors.filter(color => {
            const colorCount = colorCounts.get(color) || 0;
            const colorPercentage = colorCount / totalPixels;
            
            // Special handling for white and black (they need higher threshold)
            if (color === 'white' || color === 'black') {
                return colorPercentage >= MIN_WHITE_BLACK_PERCENTAGE;
            }
            
            // For other colors, use standard threshold
            return colorPercentage >= MIN_COLOR_PERCENTAGE;
        });
        
        // If we filtered out colors, try to fill back to maxColors with remaining valid colors
        if (filteredColors.length < maxColors && filteredColors.length < sortedColors.length) {
            const remainingColors = Array.from(colorCounts.entries())
                .filter(([color]) => !filteredColors.includes(color))
                .map(([color, count]) => {
                    const percentage = count / totalPixels;
                    // Apply same thresholds
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
        
        // If no colors found after filtering, return empty array
        return filteredColors.length > 0 ? filteredColors : [];
    } catch (error) {
        console.error('Error extracting colors:', error);
        // Return empty array on error (don't fail upload)
        return [];
    }
}


