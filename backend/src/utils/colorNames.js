// Shared RGB naming for sampled pixels and clustered centroids.
export function rgbToColorName(r, g, b) {
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
