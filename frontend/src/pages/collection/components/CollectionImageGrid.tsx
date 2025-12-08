import { useNavigate } from 'react-router-dom';
import type { Image } from '@/types/image';
import ProgressiveImage from '@/components/ProgressiveImage';
import { Button } from '@/components/ui/button';
import { ImageIcon, Check, GripVertical, Square, CheckSquare2 } from 'lucide-react';

interface CollectionImageGridProps {
  images: Image[];
  imageTypes: Map<string, 'portrait' | 'landscape'>;
  coverImageId: string | null;
  isOwner: boolean;
  isReordering: boolean;
  selectionMode: boolean;
  draggedImageId: string | null;
  dragOverImageId: string | null;
  selectedImageIds: Set<string>;
  updatingCover: string | null;
  currentImageIds: Set<string>;
  processedImages: React.MutableRefObject<Set<string>>;
  handleImageLoad: (imageId: string, img: HTMLImageElement) => void;
  handleDragStart: (imageId: string, e: React.DragEvent) => void;
  handleDragOver: (imageId: string, e: React.DragEvent) => void;
  handleDragLeave: () => void;
  handleDrop: (targetImageId: string, e: React.DragEvent) => void;
  handleDragEnd: () => void;
  handleImageClick: (image: Image) => void;
  handleSetCoverImage: (imageId: string, e: React.MouseEvent) => void;
  toggleImageSelection: (imageId: string) => void;
  isMobile: boolean;
}

export const CollectionImageGrid = ({
  images,
  imageTypes,
  coverImageId,
  isOwner,
  isReordering,
  selectionMode,
  draggedImageId,
  dragOverImageId,
  selectedImageIds,
  updatingCover,
  currentImageIds,
  processedImages,
  handleImageLoad,
  handleDragStart,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleDragEnd,
  handleImageClick,
  handleSetCoverImage,
  toggleImageSelection,
}: CollectionImageGridProps) => {
  const navigate = useNavigate();

  if (images.length === 0) {
    return (
      <div className="collection-detail-empty">
        <p>Bộ sưu tập này chưa có ảnh nào</p>
        <Button onClick={() => navigate('/')} variant="outline">
          Khám phá ảnh để thêm vào bộ sưu tập
        </Button>
      </div>
    );
  }

  return (
    <div className="collection-detail-images">
      <div className="collection-images-grid">
        {images.map((image) => {
          const imageType = imageTypes.get(image._id) || 'landscape';
          const isCoverImage = coverImageId === image._id;
          const isDragging = draggedImageId === image._id;
          const isDragOver = dragOverImageId === image._id;
          const isSelected = selectedImageIds.has(image._id);

          return (
            <div
              key={image._id}
              className={`collection-image-item ${imageType} ${isCoverImage ? 'is-cover' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''} ${isSelected ? 'selected' : ''} ${selectionMode ? 'selection-mode' : ''}`}
              draggable={isOwner && !isReordering && !selectionMode}
              onDragStart={(e) => handleDragStart(image._id, e)}
              onDragOver={(e) => handleDragOver(image._id, e)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(image._id, e)}
              onDragEnd={handleDragEnd}
              onClick={() => {
                if (isDragging) return; // Don't open modal if dragging
                handleImageClick(image);
              }}
            >
              <ProgressiveImage
                src={image.imageUrl}
                thumbnailUrl={image.thumbnailUrl}
                smallUrl={image.smallUrl}
                regularUrl={image.regularUrl}
                alt={image.imageTitle || 'Photo'}
                onLoad={(img) => {
                  if (!processedImages.current.has(image._id) && currentImageIds.has(image._id)) {
                    handleImageLoad(image._id, img);
                  }
                }}
              />
              {/* Cover Image Badge */}
              {isCoverImage && (
                <div className="collection-image-cover-badge">
                  <ImageIcon size={14} />
                  <span>Ảnh bìa</span>
                </div>
              )}
              {/* Selection Checkbox */}
              {selectionMode && (
                <div
                  className={`collection-image-checkbox ${isSelected ? 'checked' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleImageSelection(image._id);
                  }}
                >
                  {isSelected ? (
                    <CheckSquare2 size={20} />
                  ) : (
                    <Square size={20} />
                  )}
                </div>
              )}
              {/* Drag Handle */}
              {isOwner && !isReordering && !selectionMode && (
                <div className="collection-image-drag-handle" title="Kéo để sắp xếp lại">
                  <GripVertical size={16} />
                </div>
              )}
              {/* Hover Overlay with Set Cover Button */}
              {isOwner && (
                <div className="collection-image-overlay">
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`collection-image-set-cover-btn ${isCoverImage ? 'is-cover' : ''}`}
                    onClick={(e) => handleSetCoverImage(image._id, e)}
                    disabled={isCoverImage || updatingCover === image._id}
                    loading={updatingCover === image._id}
                    title={isCoverImage ? 'Đây là ảnh bìa' : 'Đặt làm ảnh bìa'}
                  >
                    {!isCoverImage && updatingCover !== image._id && (
                      <>
                        <ImageIcon size={16} />
                        <span>Đặt làm ảnh bìa</span>
                      </>
                    )}
                    {isCoverImage && (
                      <>
                        <Check size={16} />
                        <span>Ảnh bìa</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};


