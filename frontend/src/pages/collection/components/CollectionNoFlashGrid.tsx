import { useCallback, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Image } from '@/types/image';
import { NoFlashGrid } from '@/components/NoFlashGrid/NoFlashGrid';
import { Button } from '@/components/ui/button';
import { CollectionImageItem } from './CollectionImageItem';
import './CollectionNoFlashGrid.css';

interface CollectionNoFlashGridProps {
  images: Image[];
  coverImageId: string | null;
  isOwner: boolean;
  isReordering: boolean;
  selectionMode: boolean;
  draggedImageId: string | null;
  dragOverImageId: string | null;
  selectedImageIds: Set<string>;
  updatingCover: string | null;
  handleImageClick: (image: Image) => void;
  handleSetCoverImage: (imageId: string, e: React.MouseEvent) => void;
  toggleImageSelection: (imageId: string) => void;
  handleDragStart: (imageId: string, e: React.DragEvent) => void;
  handleDragOver: (imageId: string, e: React.DragEvent) => void;
  handleDragLeave: () => void;
  handleDrop: (targetImageId: string, e: React.DragEvent) => void;
  handleDragEnd: () => void;
}

// React owns the overlays; delegated drag events also cover the image below them.
export const CollectionNoFlashGrid = ({
  images,
  coverImageId,
  isOwner,
  isReordering,
  selectionMode,
  draggedImageId,
  dragOverImageId,
  selectedImageIds,
  updatingCover,
  handleImageClick,
  handleSetCoverImage,
  toggleImageSelection,
  handleDragStart,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleDragEnd,
}: CollectionNoFlashGridProps) => {
  const navigate = useNavigate();
  const dragTarget = (event: DragEvent<HTMLDivElement>) =>
    event.target instanceof Element ? event.target.closest<HTMLElement>('.grid-item-wrapper[data-image-id]')?.dataset.imageId : undefined;

  const renderItemOverlay = useCallback(
    (image: Image) => (
      <CollectionImageItem
        image={image}
        isCover={coverImageId === image._id}
        isDragging={draggedImageId === image._id}
        isDragOver={dragOverImageId === image._id}
        isSelected={selectedImageIds.has(image._id)}
        isOwner={isOwner}
        isReordering={isReordering}
        isUpdatingCover={updatingCover === image._id}
        selectionMode={selectionMode}
        onToggleSelect={toggleImageSelection}
        onSetCover={handleSetCoverImage}
        onDragStart={handleDragStart}
      />
    ),
    [
      coverImageId,
      draggedImageId,
      dragOverImageId,
      selectedImageIds,
      isOwner,
      isReordering,
      updatingCover,
      selectionMode,
      toggleImageSelection,
      handleSetCoverImage,
      handleDragStart,
    ]
  );

  if (images.length === 0) {
    return (
      <div className="collection-detail-empty">
        <p>Bộ sưu tập này chưa có ảnh nào</p>
        <Button onClick={() => navigate('/')} variant="outline">
          {isOwner ? 'Khám phá ảnh để thêm vào bộ sưu tập' : 'Khám phá ảnh khác'}
        </Button>
      </div>
    );
  }

  return (
    <div className="collection-detail-images"
      onDragOver={event => { const id = dragTarget(event); if (id) handleDragOver(id, event); }}
      onDrop={event => { const id = dragTarget(event); if (id) handleDrop(id, event); }}
      onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) handleDragLeave(); }}
      onDragEnd={handleDragEnd}
    >
      <NoFlashGrid images={images} onImageClick={image => { if (!draggedImageId) handleImageClick(image); }} renderItemOverlay={renderItemOverlay} />
    </div>
  );
};
