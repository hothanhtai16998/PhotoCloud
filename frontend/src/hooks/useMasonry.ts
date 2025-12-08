import { useState, useEffect } from 'react';
import { masonryConfig } from '../config/masonry.config';
import type { Image } from '../types/image';

interface MasonryColumn {
  images: Image[];
  height: number;
}

export const useMasonry = (
  images: Image[],
  columnCount: number,
  gap: number
) => {
  const [columns, setColumns] = useState<Image[][]>([]);

  useEffect(() => {
    if (!images || images.length === 0 || columnCount <= 0) {
      setColumns([]);
      return;
    }

    const newColumns: MasonryColumn[] = Array.from(
      { length: columnCount },
      () => ({
        images: [],
        height: 0,
      })
    );

    images.forEach((image) => {
      const hasDimensions = image.height && image.width;
      const isPortrait = hasDimensions ? image.height > image.width : false;
      let aspectRatio = hasDimensions ? image.width / image.height : 1; // Default aspect ratio

      if (isPortrait) {
        const [numStr, denStr] = masonryConfig.portraitAspectRatio?.split('/') || [];
        const numerator = Number(numStr);
        const denominator = Number(denStr);

        if (!isNaN(numerator) && !isNaN(denominator) && denominator > 0) {
          aspectRatio = numerator / denominator;
        }
      }

      // Find the shortest column
      const shortestColumn = newColumns.reduce((prev, curr) =>
        prev.height <= curr.height ? prev : curr
      );

      // Add image to the shortest column
      shortestColumn.images.push(image);

      // Update column height
      // Assuming column width is 1 unit, height is 1 / aspectRatio
      shortestColumn.height += 1 / aspectRatio + gap;
    });

    setColumns(newColumns.map((col) => col.images));
  }, [images, columnCount, gap]);

  return columns;
};
