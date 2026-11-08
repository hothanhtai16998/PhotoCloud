// Share presence filtering while retaining algorithm-specific white/black thresholds.
export function selectDominantColors(colorCounts, sortedColors, maxColors, achromaticPresence, minimumPresence = 0.08) {
        const totalPixels = Array.from(colorCounts.values()).reduce((sum, count) => sum + count, 0);
        if (totalPixels === 0) return [];


        const filteredColors = sortedColors.filter(color => {
            const colorCount = colorCounts.get(color) || 0;
            const colorPercentage = colorCount / totalPixels;

            // Special handling for white and black (they need higher threshold)
            if (color === 'white' || color === 'black') {
                return colorPercentage >= achromaticPresence;
            }

            // For other colors, use standard threshold
            return colorPercentage >= minimumPresence;
        });

        // If we filtered out colors, try to fill back to maxColors with remaining valid colors
        if (filteredColors.length < maxColors && filteredColors.length < sortedColors.length) {
            const remainingColors = Array.from(colorCounts.entries())
                .filter(([color]) => !filteredColors.includes(color))
                .map(([color, count]) => {
                    const percentage = count / totalPixels;
                    // Apply same thresholds
                    if (color === 'white' || color === 'black') {
                        return percentage >= achromaticPresence ? { color, count, percentage } : null;
                    }
                    return percentage >= minimumPresence ? { color, count, percentage } : null;
                })
                .filter(item => item !== null)
                .sort((a, b) => b.count - a.count)
                .slice(0, maxColors - filteredColors.length)
                .map(item => item.color);

            return [...filteredColors, ...remainingColors];
        }

        // If no colors found after filtering, return empty array
        return filteredColors.length > 0 ? filteredColors : [];
}
