import { useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Image } from '@/types/image';
import { NoFlashGrid } from '@/components/NoFlashGrid/NoFlashGrid';
import { Button } from '@/components/ui/button';
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
  const gridRef = useRef<HTMLDivElement>(null);

  // Handle image click
  const handleImageClickWrapper = useCallback((image: Image, index: number) => {
    if (draggedImageId === image._id) return;
    handleImageClick(image);
  }, [draggedImageId, handleImageClick]);

  // Add collection-specific overlays
  useEffect(() => {
    if (!gridRef.current || images.length === 0) return;

    const timeoutId = setTimeout(() => {
      const gridItems = gridRef.current?.querySelectorAll('.grid-item-wrapper[data-image-id]');
      if (!gridItems) return;

      const cleanup: (() => void)[] = [];

      gridItems.forEach((item) => {
        const imageId = item.getAttribute('data-image-id');
        if (!imageId) return;

        const image = images.find(img => img._id === imageId);
        if (!image) return;

        const isCoverImage = coverImageId === imageId;
        const isDragging = draggedImageId === imageId;
        const isDragOver = dragOverImageId === imageId;
        const isSelected = selectedImageIds.has(imageId);

        // Remove existing overlay
        const existing = item.querySelector('.collection-grid-overlay');
        if (existing) existing.remove();

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = `collection-grid-overlay ${isCoverImage ? 'is-cover' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''} ${isSelected ? 'selected' : ''} ${selectionMode ? 'selection-mode' : ''}`;

        // Cover badge
        if (isCoverImage) {
          const badge = document.createElement('div');
          badge.className = 'collection-image-cover-badge';
          badge.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M9 3v18"/><path d="M3 9h18"/></svg><span>Ảnh bìa</span>';
          overlay.appendChild(badge);
        }

        // Selection checkbox
        if (selectionMode) {
          const checkbox = document.createElement('div');
          checkbox.className = `collection-image-checkbox ${isSelected ? 'checked' : ''}`;
          checkbox.innerHTML = isSelected 
            ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>'
            : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>';
          checkbox.onclick = (e) => {
            e.stopPropagation();
            toggleImageSelection(imageId);
          };
          overlay.appendChild(checkbox);
        }

        // Drag handle
        if (isOwner && !isReordering && !selectionMode) {
          const handle = document.createElement('div');
          handle.className = 'collection-image-drag-handle';
          handle.title = 'Kéo để sắp xếp lại';
          handle.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>';
          overlay.appendChild(handle);
        }

        // Set cover button
        if (isOwner) {
          const btnOverlay = document.createElement('div');
          btnOverlay.className = 'collection-image-overlay';
          const btn = document.createElement('button');
          btn.className = `collection-image-set-cover-btn ${isCoverImage ? 'is-cover' : ''}`;
          btn.disabled = isCoverImage || updatingCover === imageId;
          btn.innerHTML = !isCoverImage && updatingCover !== imageId
            ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M9 3v18"/><path d="M3 9h18"/></svg><span>Đặt làm ảnh bìa</span>'
            : '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg><span>Ảnh bìa</span>';
          btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSetCoverImage(imageId, e as any);
          };
          btnOverlay.appendChild(btn);
          overlay.appendChild(btnOverlay);
        }

        item.appendChild(overlay);

        // Drag handlers
        if (isOwner && !isReordering && !selectionMode) {
          (item as HTMLElement).draggable = true;
          const dragStart = (e: Event) => handleDragStart(imageId, e as DragEvent);
          const dragOver = (e: Event) => handleDragOver(imageId, e as DragEvent);
          const drop = (e: Event) => handleDrop(imageId, e as DragEvent);
          item.addEventListener('dragstart', dragStart);
          item.addEventListener('dragover', dragOver);
          item.addEventListener('dragleave', handleDragLeave);
          item.addEventListener('drop', drop);
          item.addEventListener('dragend', handleDragEnd);
          cleanup.push(() => {
            item.removeEventListener('dragstart', dragStart);
            item.removeEventListener('dragover', dragOver);
            item.removeEventListener('dragleave', handleDragLeave);
            item.removeEventListener('drop', drop);
            item.removeEventListener('dragend', handleDragEnd);
          });
        }
      });

      return () => {
        cleanup.forEach(fn => fn());
        gridRef.current?.querySelectorAll('.collection-grid-overlay').forEach(el => el.remove());
      };
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [images, coverImageId, isOwner, isReordering, selectionMode, draggedImageId, dragOverImageId, selectedImageIds, updatingCover, handleSetCoverImage, toggleImageSelection, handleDragStart, handleDragOver, handleDragLeave, handleDrop, handleDragEnd]);

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
    <div className="collection-detail-images" ref={gridRef}>
      <NoFlashGrid
        images={images}
        onImageClick={handleImageClickWrapper}
      />
    </div>
  );
};

