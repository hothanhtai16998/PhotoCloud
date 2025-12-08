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

    // Calculate brightness
    const brightness = (normalizedR + normalizedG + normalizedB) / 3;

    // Calculate saturation
    const max = Math.max(normalizedR, normalizedG, normalizedB);
    const min = Math.min(normalizedR, normalizedG, normalizedB);
    const saturation = max === 0 ? 0 : (max - min) / max;

    // Determine if it's black, white, or gray
    if (brightness < 0.1) return 'black';
    if (brightness > 0.9 && saturation < 0.1) return 'white';
    if (saturation < 0.2) return 'gray';

    // Calculate hue
    let hue = 0;
    if (max === normalizedR) {
        hue = ((normalizedG - normalizedB) / (max - min)) * 60;
    } else if (max === normalizedG) {
        hue = (2 + (normalizedB - normalizedR) / (max - min)) * 60;
    } else {
        hue = (4 + (normalizedR - normalizedG) / (max - min)) * 60;
    }
    if (hue < 0) hue += 360;

    // Map hue to color names
    if (hue >= 0 && hue < 15) return 'red';
    if (hue >= 15 && hue < 30) return 'orange';
    if (hue >= 30 && hue < 60) return 'yellow';
    if (hue >= 60 && hue < 150) return 'green';
    if (hue >= 150 && hue < 240) return 'blue';
    if (hue >= 240 && hue < 270) return 'purple';
    if (hue >= 270 && hue < 300) return 'pink';
    if (hue >= 300 && hue < 360) return 'red';

    return 'gray';
}

/**
 * Extract dominant colors from an image
 * @param {Buffer} imageBuffer - Image buffer
 * @param {number} maxColors - Maximum number of colors to extract (default: 3)
 * @returns {Promise<string[]>} Array of color names
 */
export async function extractDominantColors(imageBuffer, maxColors = 3) {
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

                // Skip very dark or very light pixels (likely background)
                const brightness = (r + g + b) / 3;
                if (brightness < 20 || brightness > 235) continue;

                const colorName = rgbToColorName(r, g, b);
                colorCounts.set(colorName, (colorCounts.get(colorName) || 0) + 1);
            }
        }

        // Get top colors by frequency
        const sortedColors = Array.from(colorCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxColors)
            .map(([color]) => color);

        // If no colors found, return empty array
        return sortedColors.length > 0 ? sortedColors : [];
    } catch (error) {
        console.error('Error extracting colors:', error);
        // Return empty array on error (don't fail upload)
        return [];
    }
}


