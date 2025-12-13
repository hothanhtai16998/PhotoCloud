import { useMemo, useCallback } from 'react';
import type { Image } from '@/types/image';
import { ImageModal } from '@/components/NoFlashGrid/components/ImageModal';

interface ImageModalAdapterProps {
  image: Image;
  images: Image[];
  onClose: () => void;
  onImageSelect: (image: Image) => void;
  onDownload?: (image: Image, e: React.MouseEvent) => void;
  imageTypes?: Map<string, 'portrait' | 'landscape'>;
  onImageLoad?: (imageId: string, img: HTMLImageElement) => void;
  currentImageIds?: Set<string>;
  processedImages?: React.MutableRefObject<Set<string>>;
  renderAsPage?: boolean;
  lockBodyScroll?: boolean;
}

/**
 * Adapter component to bridge the old ImageModal interface to the new NoFlashGrid ImageModal
 */
export default function ImageModalAdapter({
  image,
  images,
  onClose,
  onImageSelect,
  onDownload,
  imageTypes,
  onImageLoad,
  currentImageIds,
  processedImages,
  renderAsPage = false,
  lockBodyScroll = true,
}: ImageModalAdapterProps) {
  // Find the index of the current image
  const currentIndex = useMemo(() => {
    const index = images.findIndex(img => img._id === image._id);
    return index >= 0 ? index : 0;
  }, [image._id, images]);

  // Handle navigation - update the selected image
  const handleNavigate = useCallback((nextIndex: number) => {
    const nextImage = images[nextIndex];
    if (nextImage) {
      onImageSelect(nextImage);
    }
  }, [images, onImageSelect]);

  // Handle index selection
  const handleSelectIndex = useCallback((idx: number) => {
    const selectedImage = images[idx];
    if (selectedImage) {
      onImageSelect(selectedImage);
    }
  }, [images, onImageSelect]);

  // Convert images to ExtendedImage format (add categoryName if needed)
  const extendedImages = useMemo(() => {
    return images.map(img => ({
      ...img,
      categoryName: img.categoryName || img.category,
    }));
  }, [images]);

  return (
    <ImageModal
      images={extendedImages}
      index={currentIndex}
      onClose={onClose}
      onNavigate={handleNavigate}
      onSelectIndex={handleSelectIndex}
    />
  );
}

