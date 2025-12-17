/**
 * Utility functions for grid calculation
 */

export interface GridSize {
  cols: number;
  rows: number;
}

/**
 * Calculate grid size based on image aspect ratio
 * Returns number of columns and rows
 * CRITICAL: Always uses odd numbers for both cols and rows to ensure:
 * - Center cell is truly centered
 * - Center cell is the last cell in hide order (outside-in)
 * - Center cell is the first cell in show order (inside-out)
 * 
 * Strategy: Use odd numbers that maintain aspect ratio while ensuring perfect center alignment
 */
export function calculateGridSize(width: number, height: number): GridSize {
  const aspectRatio = width / height;
  
  // Base grid size - always use odd numbers
  // For perfect center-outward animation, we want:
  // - Both cols and rows to be odd
  // - Grid size that roughly matches aspect ratio
  // - Similar cell sizes (not too rectangular)
  
  let cols = 9; // Odd number for clear center
  let rows = 9; // Odd number for clear center
  
  // Adjust based on aspect ratio while maintaining odd numbers
  // Try to keep cells roughly square-ish for better animation
  if (aspectRatio > 1.8) {
    // Very wide landscape (ultrawide) - 21:9, etc.
    // Use more cols, fewer rows, but keep both odd
    cols = 15; // Odd
    rows = 7;  // Odd (ratio ~2.14:1)
  } else if (aspectRatio > 1.5) {
    // Wide landscape (16:9, 16:10)
    cols = 13; // Odd
    rows = 7;  // Odd (ratio ~1.86:1)
  } else if (aspectRatio > 1.3) {
    // Landscape (4:3, 3:2)
    cols = 11; // Odd
    rows = 7;  // Odd (ratio ~1.57:1)
  } else if (aspectRatio > 1.1) {
    // Slightly landscape
    cols = 9;  // Odd
    rows = 7;  // Odd (ratio ~1.29:1)
  } else if (aspectRatio > 0.9) {
    // Square or near square (1:1) - perfect for center-outward animation
    // Use same number for both to ensure perfect center
    cols = 9;  // Odd
    rows = 9;  // Odd (ratio 1:1)
  } else if (aspectRatio > 0.7) {
    // Slightly portrait (3:4)
    cols = 7;  // Odd
    rows = 9;  // Odd (ratio ~0.78:1)
  } else if (aspectRatio > 0.6) {
    // Portrait (2:3, 3:4)
    cols = 7;  // Odd
    rows = 11; // Odd (ratio ~0.64:1)
  } else if (aspectRatio > 0.5) {
    // Tall portrait (9:16)
    cols = 7;  // Odd
    rows = 13; // Odd (ratio ~0.54:1)
  } else {
    // Very tall portrait
    cols = 5;  // Odd
    rows = 13; // Odd (ratio ~0.38:1)
  }
  
  // CRITICAL: Verify both are odd (should always be true with above logic)
  // But add safety check to ensure center cell exists
  if (cols % 2 === 0) cols += 1;
  if (rows % 2 === 0) rows += 1;
  
  return { cols, rows };
}

/**
 * Calculate animation duration based on grid size
 * More cells = longer duration for smooth animation
 * @param gridSize - Grid size with cols and rows
 * @returns Duration in milliseconds
 */
export function calculateAnimationDuration(gridSize: GridSize): number {
  const totalCells = gridSize.cols * gridSize.rows;
  
  // Base time per cell (in milliseconds)
  // Adjust this value to control animation speed
  const timePerCell = 20; // 20ms per cell
  
  // Calculate total duration
  const duration = totalCells * timePerCell;
  
  // Clamp between min and max duration
  const minDuration = 1000; // Minimum 1 second
  const maxDuration = 2500; // Maximum 2.5 seconds
  
  return Math.max(minDuration, Math.min(maxDuration, duration));
}

/**
 * Calculate delay between each cell animation
 * Used for staggered animation effect
 * @param gridSize - Grid size with cols and rows
 * @param duration - Total animation duration in milliseconds
 * @returns Delay in milliseconds between each cell
 */
export function calculateCellDelay(gridSize: GridSize, duration: number): number {
  const totalCells = gridSize.cols * gridSize.rows;
  // Distribute duration evenly across all cells
  return duration / totalCells;
}

/**
 * Generate spiral order (clockwise from top-left, outside to inside)
 * Returns array of [row, col] positions in spiral order
 * Starting from top-left corner, ending at center cell
 * 
 * CRITICAL: With odd cols and rows, the center cell will naturally be the last cell
 * This ensures perfect center-outward animation (center is last to hide, first to show)
 */
export function generateSpiralOrder(cols: number, rows: number): Array<[number, number]> {
  const order: Array<[number, number]> = [];
  const visited = new Set<string>();
  
  // Calculate center position
  const centerRow = Math.floor((rows - 1) / 2);
  const centerCol = Math.floor((cols - 1) / 2);
  
  let top = 0, bottom = rows - 1, left = 0, right = cols - 1;
  
  // Spiral from outside to inside, clockwise
  while (top <= bottom && left <= right) {
    // Top row: left to right
    for (let col = left; col <= right; col++) {
      const key = `${top},${col}`;
      if (!visited.has(key)) {
        order.push([top, col]);
        visited.add(key);
      }
    }
    top++;
    
    // Right column: top to bottom
    for (let row = top; row <= bottom; row++) {
      const key = `${row},${right}`;
      if (!visited.has(key)) {
        order.push([row, right]);
        visited.add(key);
      }
    }
    right--;
    
    // Bottom row: right to left
    if (top <= bottom) {
      for (let col = right; col >= left; col--) {
        const key = `${bottom},${col}`;
        if (!visited.has(key)) {
          order.push([bottom, col]);
          visited.add(key);
        }
      }
      bottom--;
    }
    
    // Left column: bottom to top
    if (left <= right) {
      for (let row = bottom; row >= top; row--) {
        const key = `${row},${left}`;
        if (!visited.has(key)) {
          order.push([row, left]);
          visited.add(key);
        }
      }
      left++;
    }
  }
  
  // CRITICAL: Verify all cells are included
  const totalCells = cols * rows;
  if (order.length !== totalCells) {
    // Fill in any missing cells (shouldn't happen with correct logic, but safety check)
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const key = `${row},${col}`;
        if (!visited.has(key)) {
          // Add missing cells - try to maintain spiral order by inserting near end
          // But ensure center is last
          const isCenter = (row === centerRow && col === centerCol);
          if (isCenter) {
            // Center should be last
            order.push([row, col]);
          } else {
            // Insert before center if center exists, otherwise append
            const centerIndex = order.findIndex(([r, c]) => r === centerRow && c === centerCol);
            if (centerIndex >= 0) {
              order.splice(centerIndex, 0, [row, col]);
            } else {
              order.push([row, col]);
            }
          }
          visited.add(key);
        }
      }
    }
  }
  
  // Final verification: center should be last
  if (order.length > 0) {
    const lastCell = order[order.length - 1];
    if (lastCell && (lastCell[0] !== centerRow || lastCell[1] !== centerCol)) {
      // Move center to last position
      const centerIndex = order.findIndex(([r, c]) => r === centerRow && c === centerCol);
      if (centerIndex >= 0 && centerIndex !== order.length - 1) {
        order.splice(centerIndex, 1);
        order.push([centerRow, centerCol]);
      }
    }
  }
  
  return order;
}

/**
 * Generate reverse spiral order (counter-clockwise from center, inside to outside)
 * For new image appearing from center outward
 * This simply reverses the spiral order (from outside-in clockwise to inside-out counter-clockwise)
 */
export function generateReverseSpiralOrder(cols: number, rows: number): Array<[number, number]> {
  const spiralOrder = generateSpiralOrder(cols, rows);
  return spiralOrder.reverse();
}

/**
 * Generate spiral order from center outward, counter-clockwise
 * Starts from the center cell(s) and spirals outward counter-clockwise
 * Counter-clockwise direction: left -> bottom -> right -> top (opposite of clockwise)
 * For new image appearing from center outward
 * 
 * Strategy: Build layers from center outward, going counter-clockwise
 */
export function generateCenterOutwardCounterClockwise(cols: number, rows: number): Array<[number, number]> {
  const order: Array<[number, number]> = [];
  const visited = new Set<string>();
  
  // Calculate center position (use floor to get center or left/top of center for even dimensions)
  const centerRow = Math.floor((rows - 1) / 2);
  const centerCol = Math.floor((cols - 1) / 2);
  
  // Helper to add cell if valid and not visited
  const addCell = (row: number, col: number) => {
    if (row >= 0 && row < rows && col >= 0 && col < cols) {
      const key = `${row},${col}`;
      if (!visited.has(key)) {
        order.push([row, col]);
        visited.add(key);
      }
    }
  };
  
  // Start from center cell
  addCell(centerRow, centerCol);
  
  // Spiral outward layer by layer, counter-clockwise
  // Counter-clockwise: left -> bottom -> right -> top
  let layer = 1;
  const maxLayer = Math.max(Math.ceil(rows / 2), Math.ceil(cols / 2));
  
  while (layer <= maxLayer) {
    const minRow = centerRow - layer;
    const maxRow = centerRow + layer;
    const minCol = centerCol - layer;
    const maxCol = centerCol + layer;
    
    // Left side: from top-left to bottom-left (top to bottom)
    for (let row = minRow; row <= maxRow; row++) {
      addCell(row, minCol);
    }
    
    // Bottom side: from bottom-left to bottom-right (left to right, skip corner already added)
    for (let col = minCol + 1; col <= maxCol; col++) {
      addCell(maxRow, col);
    }
    
    // Right side: from bottom-right to top-right (bottom to top, skip corner)
    for (let row = maxRow - 1; row >= minRow; row--) {
      addCell(row, maxCol);
    }
    
    // Top side: from top-right to top-left (right to left, skip corners)
    for (let col = maxCol - 1; col > minCol; col--) {
      addCell(minRow, col);
    }
    
    layer++;
  }
  
  // CRITICAL: Safety check - remove duplicates and ensure exact cell count
  const uniqueCells = new Map<string, [number, number]>();
  const seenKeys = new Set<string>();
  
  // Remove duplicates and build unique map
  for (const [row, col] of order) {
    const key = `${row},${col}`;
    if (!seenKeys.has(key) && row >= 0 && row < rows && col >= 0 && col < cols) {
      uniqueCells.set(key, [row, col]);
      seenKeys.add(key);
    }
  }
  
  // Add any missing cells
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const key = `${row},${col}`;
      if (!uniqueCells.has(key)) {
        uniqueCells.set(key, [row, col]);
      }
    }
  }
  
  // Rebuild order: center first, then others in counter-clockwise spiral
  const newOrder: Array<[number, number]> = [];
  
  // Add center first
  const centerKey = `${centerRow},${centerCol}`;
  if (uniqueCells.has(centerKey)) {
    newOrder.push([centerRow, centerCol]);
    uniqueCells.delete(centerKey);
  }
  
  // Add remaining cells in counter-clockwise spiral order (layer by layer)
  let rebuildLayer = 1;
  const rebuildMaxLayer = Math.max(Math.ceil(rows / 2), Math.ceil(cols / 2));
  
  while (rebuildLayer <= rebuildMaxLayer && uniqueCells.size > 0) {
    const minRow = centerRow - rebuildLayer;
    const maxRow = centerRow + rebuildLayer;
    const minCol = centerCol - rebuildLayer;
    const maxCol = centerCol + rebuildLayer;
    
    // Left side: top to bottom
    for (let row = minRow; row <= maxRow; row++) {
      const key = `${row},${minCol}`;
      if (uniqueCells.has(key)) {
        newOrder.push(uniqueCells.get(key)!);
        uniqueCells.delete(key);
      }
    }
    
    // Bottom side: left to right
    for (let col = minCol + 1; col <= maxCol; col++) {
      const key = `${maxRow},${col}`;
      if (uniqueCells.has(key)) {
        newOrder.push(uniqueCells.get(key)!);
        uniqueCells.delete(key);
      }
    }
    
    // Right side: bottom to top
    for (let row = maxRow - 1; row >= minRow; row--) {
      const key = `${row},${maxCol}`;
      if (uniqueCells.has(key)) {
        newOrder.push(uniqueCells.get(key)!);
        uniqueCells.delete(key);
      }
    }
    
    // Top side: right to left
    for (let col = maxCol - 1; col > minCol; col--) {
      const key = `${minRow},${col}`;
      if (uniqueCells.has(key)) {
        newOrder.push(uniqueCells.get(key)!);
        uniqueCells.delete(key);
      }
    }
    
    rebuildLayer++;
  }
  
  // Add any remaining cells (shouldn't happen, but safety)
  uniqueCells.forEach((cell) => {
    newOrder.push(cell);
  });
  
  // Final verification: ensure exact count and center is first
  // Note: newOrder should have exactly totalCells at this point
  
  if (newOrder.length > 0) {
    const firstCell = newOrder[0];
    if (firstCell && (firstCell[0] !== centerRow || firstCell[1] !== centerCol)) {
      // Move center to first position
      const centerIndex = newOrder.findIndex(([r, c]) => r === centerRow && c === centerCol);
      if (centerIndex >= 0 && centerIndex !== 0) {
        newOrder.splice(centerIndex, 1);
        newOrder.unshift([centerRow, centerCol]);
      }
    }
  }
  
  return newOrder;
}

