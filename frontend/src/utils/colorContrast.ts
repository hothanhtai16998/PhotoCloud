/**
 * WCAG AA Color Contrast Utilities
 * Ensures text meets WCAG AA compliance (4.5:1 for normal text, 3:1 for large text)
 */

/**
 * Calculate relative luminance of a color
 * @param r Red value (0-255)
 * @param g Green value (0-255)
 * @param b Blue value (0-255)
 * @returns Relative luminance (0-1)
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((val) => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * (rs ?? 0) + 0.7152 * (gs ?? 0) + 0.0722 * (bs ?? 0);
}

/**
 * Convert hex color to RGB
 * @param hex Hex color string (e.g., "#ffffff" or "ffffff")
 * @returns RGB values [r, g, b] or null if invalid
 */
function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1]!, 16),
        parseInt(result[2]!, 16),
        parseInt(result[3]!, 16),
      ]
    : null;
}

/**
 * Convert HSL to RGB
 * @param h Hue (0-360)
 * @param s Saturation (0-100)
 * @param l Lightness (0-100)
 * @returns RGB values [r, g, b]
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;

  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return [r, g, b];
}

/**
 * Parse HSL string (e.g., "240 15% 18%")
 * @param hsl HSL string
 * @returns HSL values [h, s, l] or null if invalid
 */
function parseHsl(hsl: string): [number, number, number] | null {
  const match = hsl.match(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  if (!match) return null;
  return [
    parseFloat(match[1]!),
    parseFloat(match[2]!),
    parseFloat(match[3]!),
  ];
}

/**
 * Calculate contrast ratio between two colors
 * @param color1 First color (hex, hsl, or rgb)
 * @param color2 Second color (hex, hsl, or rgb)
 * @returns Contrast ratio (1-21)
 */
export function getContrastRatio(
  color1: string,
  color2: string
): number | null {
  let rgb1: [number, number, number] | null = null;
  let rgb2: [number, number, number] | null = null;

  // Parse color1
  if (color1.startsWith('#')) {
    rgb1 = hexToRgb(color1);
  } else if (color1.startsWith('hsl(')) {
    const hslMatch = color1.match(/hsl\(([^)]+)\)/);
    if (hslMatch) {
      const hsl = parseHsl(hslMatch[1]!);
      if (hsl) rgb1 = hslToRgb(hsl[0], hsl[1], hsl[2]);
    }
  } else if (color1.startsWith('rgb(')) {
    const rgbMatch = color1.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      rgb1 = [
        parseInt(rgbMatch[1]!),
        parseInt(rgbMatch[2]!),
        parseInt(rgbMatch[3]!),
      ];
    }
  }

  // Parse color2
  if (color2.startsWith('#')) {
    rgb2 = hexToRgb(color2);
  } else if (color2.startsWith('hsl(')) {
    const hslMatch = color2.match(/hsl\(([^)]+)\)/);
    if (hslMatch) {
      const hsl = parseHsl(hslMatch[1]!);
      if (hsl) rgb2 = hslToRgb(hsl[0], hsl[1], hsl[2]);
    }
  } else if (color2.startsWith('rgb(')) {
    const rgbMatch = color2.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      rgb2 = [
        parseInt(rgbMatch[1]!),
        parseInt(rgbMatch[2]!),
        parseInt(rgbMatch[3]!),
      ];
    }
  }

  if (!rgb1 || !rgb2) return null;

  const lum1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const lum2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast meets WCAG AA standards
 * @param foreground Foreground color
 * @param background Background color
 * @param isLargeText Whether text is large (18pt+ or 14pt+ bold)
 * @returns true if meets WCAG AA (4.5:1 for normal, 3:1 for large)
 */
export function meetsWCAGAA(
  foreground: string,
  background: string,
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  if (!ratio) return false;
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Check if contrast meets WCAG AAA standards
 * @param foreground Foreground color
 * @param background Background color
 * @param isLargeText Whether text is large (18pt+ or 14pt+ bold)
 * @returns true if meets WCAG AAA (7:1 for normal, 4.5:1 for large)
 */
export function meetsWCAGAAA(
  foreground: string,
  background: string,
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  if (!ratio) return false;
  return isLargeText ? ratio >= 4.5 : ratio >= 7;
}

/**
 * Get contrast ratio with human-readable label
 * @param foreground Foreground color
 * @param background Background color
 * @returns Object with ratio and compliance level
 */
export function getContrastInfo(
  foreground: string,
  background: string
): {
  ratio: number | null;
  level: 'AAA' | 'AA' | 'AA Large' | 'Fail';
  meetsAA: boolean;
  meetsAAA: boolean;
} {
  const ratio = getContrastRatio(foreground, background);
  if (!ratio) {
    return {
      ratio: null,
      level: 'Fail',
      meetsAA: false,
      meetsAAA: false,
    };
  }

  const meetsAANormal = ratio >= 4.5;
  const meetsAALarge = ratio >= 3;
  const meetsAAANormal = ratio >= 7;
  const meetsAAALarge = ratio >= 4.5;

  let level: 'AAA' | 'AA' | 'AA Large' | 'Fail';
  if (meetsAAANormal) {
    level = 'AAA';
  } else if (meetsAANormal) {
    level = 'AA';
  } else if (meetsAALarge) {
    level = 'AA Large';
  } else {
    level = 'Fail';
  }

  return {
    ratio,
    level,
    meetsAA: meetsAANormal || meetsAALarge,
    meetsAAA: meetsAAANormal || meetsAAALarge,
  };
}

