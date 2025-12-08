import { GRID_CONFIG } from '../constants/gridConfig';
import type { Image } from '@/types/image';

type ExtendedImage = Image & { categoryName?: string; category?: string };

// Calculate row span based on image aspect ratio
// Uses consistent row spanning for all images to prevent gaps
export function calculateImageLayout(
  image: ExtendedImage,
  columnWidth: number,
  baseRowHeight: number,
  dimensions?: { width: number; height: number } | null
): { rowSpan: number } {
  // Use provided dimensions, or image properties, or fallback
  let width: number;
  let height: number;

  if (dimensions) {
    width = dimensions.width;
    height = dimensions.height;
  } else if (image.width && image.height) {
    width = image.width;
    height = image.height;
  } else {
    // Fallback: assume 4:3 aspect ratio (common for photos)
    width = 1920;
    height = 1440;
  }

  // Calculate aspect ratio (width / height)
  const aspectRatio = width / height;

  // Calculate display height when image is displayed at column width
  // This is the natural height the image would have at this column width
  const displayHeight = columnWidth / aspectRatio;

  // Apply aspect ratio-based height ranges
  // Allow natural variation within ranges, only clamp if outside bounds
  // YES, this is AUTO-CALCULATING: if displayHeight is within range, it uses that exact height
  let targetHeight: number;
  let categoryMin: number;
  let categoryMax: number;

  // Safety check: ensure we have valid values
  if (!isFinite(displayHeight) || displayHeight <= 0) {
    // Fallback to a reasonable default
    targetHeight = 250;
    categoryMin = 240;
    categoryMax = 260;
  } else {
    if (aspectRatio > 2.0) {
      // Very wide landscape (aspectRatio > 2.0, e.g., 21:9)
      // Should be 200–230px tall - AUTO-CALCULATES within this range
      categoryMin = 200;
      categoryMax = 230;
      if (displayHeight < categoryMin) {
        targetHeight = categoryMin; // Too short, clamp to minimum
      } else if (displayHeight > categoryMax) {
        targetHeight = categoryMax; // Too tall, clamp to maximum
      } else {
        targetHeight = displayHeight; // Within range, use natural calculated height
      }
    } else if (aspectRatio >= 1.3 && aspectRatio <= 2.0) {
      // Standard landscape (1.3–2.0, e.g., 16:9, 4:3)
      // Should be 230–275px tall - AUTO-CALCULATES within this range
      categoryMin = 230;
      categoryMax = 275;
      if (displayHeight < categoryMin) {
        targetHeight = categoryMin; // Too short, clamp to minimum
      } else if (displayHeight > categoryMax) {
        targetHeight = categoryMax; // Too tall, clamp to maximum
      } else {
        targetHeight = displayHeight; // Within range, use natural calculated height
      }
    } else if (aspectRatio >= 0.9 && aspectRatio <= 1.1) {
      // Square (0.9–1.1, e.g., 1:1)
      // Should be 240–260px tall - AUTO-CALCULATES within this range
      categoryMin = 240;
      categoryMax = 260;
      if (displayHeight < categoryMin) {
        targetHeight = categoryMin; // Too short, clamp to minimum
      } else if (displayHeight > categoryMax) {
        targetHeight = categoryMax; // Too tall, clamp to maximum
      } else {
        targetHeight = displayHeight; // Within range, use natural calculated height
      }
    } else if (aspectRatio >= 0.6 && aspectRatio <= 0.75) {
      // Standard portrait (0.6–0.75, e.g., 3:4, 2:3)
      // Should be 400–600px tall - AUTO-CALCULATES within this range
      categoryMin = 400;
      categoryMax = 600;
      if (displayHeight < categoryMin) {
        targetHeight = categoryMin; // Too short, clamp to minimum
      } else if (displayHeight > categoryMax) {
        targetHeight = categoryMax; // Too tall, clamp to maximum
      } else {
        targetHeight = displayHeight; // Within range, use natural calculated height
      }
    } else if (aspectRatio < 0.6) {
      // Very tall portrait (< 0.6, e.g., 9:16, 1:2)
      // Should be 600–750px tall - AUTO-CALCULATES within this range
      categoryMin = 600;
      const absoluteMaxHeight = GRID_CONFIG.maxRowSpan * baseRowHeight;
      categoryMax = Math.min(750, absoluteMaxHeight); // Reduced from 800px to 750px
      if (displayHeight < categoryMin) {
        targetHeight = categoryMin; // Too short, clamp to minimum
      } else if (displayHeight > categoryMax) {
        targetHeight = categoryMax; // Too tall, clamp to maximum
      } else {
        targetHeight = displayHeight; // Within range, use natural calculated height
      }
    } else {
      // Fallback for edge cases (between 0.75-0.9 or 1.1-1.3, or 0.5-0.6)
      // Use standard portrait or landscape logic as fallback
      if (aspectRatio > 1) {
        // Closer to landscape
        categoryMin = 230;
        categoryMax = 275;
        targetHeight = Math.max(
          categoryMin,
          Math.min(categoryMax, displayHeight)
        );
      } else if (aspectRatio >= 0.5 && aspectRatio < 0.6) {
        // Between 0.5-0.6: treat as Very Tall Portrait
        categoryMin = 600;
        const absoluteMaxHeight = GRID_CONFIG.maxRowSpan * baseRowHeight;
        categoryMax = Math.min(750, absoluteMaxHeight); // Reduced from 800px to 750px
        targetHeight = Math.max(
          categoryMin,
          Math.min(categoryMax, displayHeight)
        );
      } else {
        // Closer to standard portrait (0.6-0.75)
        categoryMin = 400;
        categoryMax = 600;
        targetHeight = Math.max(
          categoryMin,
          Math.min(categoryMax, displayHeight)
        );
      }
    }
  } // End of safety check

  // Final safety clamp: ensure targetHeight is never unreasonably large
  // This prevents any calculation errors from creating huge images
  const absoluteMax = GRID_CONFIG.maxRowSpan * baseRowHeight; // 160 * 5 = 800px (plus gaps)
  targetHeight = Math.min(targetHeight, absoluteMax);

  // Compute row span in full row units (row height + row gap) so the grid area
  // height (rows*baseRowHeight + (rows-1)*gap) matches the target height closely.
  // Formula: targetHeight = rowSpan * baseRowHeight + (rowSpan - 1) * gap
  // Solving: rowSpan = (targetHeight + gap) / (baseRowHeight + gap)
  const rowUnit = baseRowHeight + GRID_CONFIG.gap;
  const exactRowsByUnit = (targetHeight + GRID_CONFIG.gap) / rowUnit;

  // Calculate all three rounding options
  const roundedRowSpan = Math.max(1, Math.round(exactRowsByUnit));
  const roundedHeight =
    roundedRowSpan * baseRowHeight + (roundedRowSpan - 1) * GRID_CONFIG.gap;

  const roundedUpRowSpan = Math.ceil(exactRowsByUnit);
  const roundedUpHeight =
    roundedUpRowSpan * baseRowHeight + (roundedUpRowSpan - 1) * GRID_CONFIG.gap;
  const roundedDownRowSpan = Math.floor(exactRowsByUnit);
  const roundedDownHeight =
    roundedDownRowSpan * baseRowHeight +
    (roundedDownRowSpan - 1) * GRID_CONFIG.gap;

  // Choose the option that best fits within the category range
  // Priority: within range > closest to range > within min/max bounds
  let bestRowSpan = roundedRowSpan;
  let bestScore = Infinity; // Lower is better

  // Score function: distance from ideal range (0 = perfect, higher = worse)
  const score = (height: number): number => {
    if (height >= categoryMin && height <= categoryMax) {
      // Within range - prefer closer to targetHeight
      return Math.abs(height - targetHeight);
    } else if (height < categoryMin) {
      // Below range - penalize by distance below min
      return (categoryMin - height) * 2; // Penalize more for being below
    } else {
      // Above range - penalize by distance above max
      return (height - categoryMax) * 2; // Penalize more for being above
    }
  };

  // Evaluate all three options
  const options = [
    { rowSpan: roundedRowSpan, height: roundedHeight },
    { rowSpan: roundedUpRowSpan, height: roundedUpHeight },
    { rowSpan: roundedDownRowSpan, height: roundedDownHeight },
  ];

  for (const option of options) {
    if (option.rowSpan < 1) continue; // Skip invalid
    const optionScore = score(option.height);
    if (optionScore < bestScore) {
      bestScore = optionScore;
      bestRowSpan = option.rowSpan;
    }
  }

  const rowSpan = bestRowSpan;

  const finalRowSpan = Math.max(
    GRID_CONFIG.minRowSpan,
    Math.min(GRID_CONFIG.maxRowSpan, rowSpan)
  );

  return {
    rowSpan: finalRowSpan,
  };
}

// Get column count based on viewport width
export function getColumnCount(width: number): number {
  if (width < GRID_CONFIG.breakpoints.tablet) {
    return GRID_CONFIG.columns.mobile;
  }
  if (width < GRID_CONFIG.breakpoints.desktop) {
    return GRID_CONFIG.columns.tablet;
  }
  return GRID_CONFIG.columns.desktop;
}
