/**
 * Utility functions for spiral grid animation
 */

export interface GridSize {
  cols: number;
  rows: number;
}

/**
 * Calculate grid size based on image aspect ratio
 */
export function calculateGridSize(width: number, height: number): GridSize {
  const aspectRatio = width / height;
  
  // Base grid size
  let cols = 5;
  let rows = 5;
  
  // Adjust based on aspect ratio
  if (aspectRatio > 1.5) {
    // Landscape (wide)
    cols = 6;
    rows = 4;
  } else if (aspectRatio > 1.2) {
    // Landscape (moderate)
    cols = 6;
    rows = 5;
  } else if (aspectRatio > 0.8) {
    // Square or near square
    cols = 5;
    rows = 5;
  } else if (aspectRatio > 0.6) {
    // Portrait (moderate)
    cols = 4;
    rows = 6;
  } else {
    // Portrait (tall)
    cols = 4;
    rows = 7;
  }
  
  return { cols, rows };
}

/**
 * Generate spiral order (clockwise from top-left, outside to inside)
 * Returns array of [row, col] positions in spiral order
 */
export function generateSpiralOrder(cols: number, rows: number): Array<[number, number]> {
  const order: Array<[number, number]> = [];
  const visited = new Set<string>();
  
  let top = 0, bottom = rows - 1, left = 0, right = cols - 1;
  
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
  
  return order;
}

/**
 * Generate reverse spiral order (counter-clockwise from center, inside to outside)
 */
export function generateReverseSpiralOrder(cols: number, rows: number): Array<[number, number]> {
  const spiralOrder = generateSpiralOrder(cols, rows);
  return spiralOrder.reverse();
}

/**
 * Generate clip-path polygon for spiral animation
 * Creates a polygon that includes only visible cells
 * Cells are removed/added one by one in spiral order
 */
export function generateSpiralClipPath(
  progress: number, // 0 to 1
  cols: number,
  rows: number,
  reverse: boolean = false
): string {
  // Normalize progress
  const p = Math.max(0, Math.min(1, progress));
  
  // Get spiral order of cells
  const spiralOrder = reverse 
    ? generateReverseSpiralOrder(cols, rows)
    : generateSpiralOrder(cols, rows);
  
  const totalCells = cols * rows;
  
  // Calculate how many cells should be visible
  const visibleCellsCount = reverse
    ? Math.ceil(p * totalCells)
    : Math.floor((1 - p) * totalCells);
  
  if (visibleCellsCount === 0) {
    // All cells hidden - collapse to center
    return 'polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)';
  }
  
  if (visibleCellsCount >= totalCells) {
    // All cells visible
    return 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
  }
  
  // Get visible cells
  const visibleCells = reverse
    ? spiralOrder.slice(0, visibleCellsCount)
    : spiralOrder.slice(totalCells - visibleCellsCount);
  
  // Calculate cell dimensions
  const cellWidth = 100 / cols;
  const cellHeight = 100 / rows;
  
  // Create a set for quick lookup
  const visibleSet = new Set(visibleCells.map(([r, c]) => `${r},${c}`));
  
  // Collect all corner points of visible cells
  const cornerSet = new Set<string>();
  
  visibleCells.forEach(([row, col]) => {
    const x1 = col * cellWidth;
    const y1 = row * cellHeight;
    const x2 = (col + 1) * cellWidth;
    const y2 = (row + 1) * cellHeight;
    
    // Add all 4 corners
    cornerSet.add(`${x1},${y1}`); // top-left
    cornerSet.add(`${x2},${y1}`); // top-right
    cornerSet.add(`${x2},${y2}`); // bottom-right
    cornerSet.add(`${x1},${y2}`); // bottom-left
  });
  
  // Convert to array
  const corners: Array<[number, number]> = Array.from(cornerSet).map(str => {
    const [x, y] = str.split(',').map(Number);
    return [x ?? 0, y ?? 0];
  });
  
  // Filter corners that are on the boundary (not shared by 4 visible cells)
  const boundaryCorners: Array<[number, number]> = [];
  
  corners.forEach(([cx, cy]) => {
    // Check which cells share this corner
    const cellRow = Math.floor(cy / cellHeight);
    const cellCol = Math.floor(cx / cellWidth);
    
    // Check all 4 possible cells that could share this corner
    const possibleCells: Array<[number, number]> = [
      [cellRow, cellCol],
      [cellRow - 1, cellCol],
      [cellRow, cellCol - 1],
      [cellRow - 1, cellCol - 1],
    ];
    
    // Count how many of these cells are visible
    const visibleCount = possibleCells.filter(([r, c]) => {
      if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
      return visibleSet.has(`${r},${c}`);
    }).length;
    
    // If not all 4 cells are visible, this corner is on the boundary
    if (visibleCount < 4) {
      boundaryCorners.push([cx, cy]);
    }
  });
  
  // If we have boundary corners, create polygon
  if (boundaryCorners.length > 0) {
    // Sort corners by angle from center to create proper polygon path
    const centerX = 50;
    const centerY = 50;
    
    boundaryCorners.sort((a, b) => {
      const angleA = Math.atan2(a[1] - centerY, a[0] - centerX);
      const angleB = Math.atan2(b[1] - centerY, b[0] - centerX);
      return angleA - angleB;
    });
    
    // Limit vertices for performance
    const maxVertices = 60;
    let selectedCorners = boundaryCorners;
    
    if (boundaryCorners.length > maxVertices) {
      // Sample evenly
      const step = Math.ceil(boundaryCorners.length / maxVertices);
      selectedCorners = boundaryCorners.filter((_, i) => i % step === 0);
    }
    
    const polygonPoints = selectedCorners.map(([x, y]) => `${x}% ${y}%`).join(', ');
    return `polygon(${polygonPoints})`;
  }
  
  // Fallback: simple bounding box
  if (visibleCells.length > 0) {
    const minX = Math.min(...visibleCells.map(([, c]) => c * cellWidth));
    const maxX = Math.max(...visibleCells.map(([, c]) => (c + 1) * cellWidth));
    const minY = Math.min(...visibleCells.map(([r]) => r * cellHeight));
    const maxY = Math.max(...visibleCells.map(([r]) => (r + 1) * cellHeight));
    
    return `polygon(${minX}% ${minY}%, ${maxX}% ${minY}%, ${maxX}% ${maxY}%, ${minX}% ${maxY}%)`;
  }
  
  return 'polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)';
}

