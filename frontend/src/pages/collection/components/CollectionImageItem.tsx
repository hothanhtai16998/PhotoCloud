import type { DragEvent } from 'react';
import type { Image } from '@/types/image';

interface CollectionImageItemProps {
  image: Image;
  isCover: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  isSelected: boolean;
  isOwner: boolean;
  isReordering: boolean;
  isUpdatingCover: boolean;
  selectionMode: boolean;
  onToggleSelect: (imageId: string) => void;
  onSetCover: (imageId: string, e: React.MouseEvent) => void;
  onDragStart: (imageId: string, e: DragEvent) => void;
}

// Pointer-transparent decoration; only its controls intercept image clicks.
export const CollectionImageItem = ({
  image,
  isCover,
  isDragging,
  isDragOver,
  isSelected,
  isOwner,
  isReordering,
  isUpdatingCover,
  selectionMode,
  onToggleSelect,
  onSetCover,
  onDragStart,
}: CollectionImageItemProps) => {
  const showDragHandle = isOwner && !isReordering && !selectionMode;
  const showCoverButton = isOwner;
  const showSelectionCheckbox = selectionMode;

  const overlayClass = [
    'collection-grid-overlay',
    isCover ? 'is-cover' : '',
    isDragging ? 'dragging' : '',
    isDragOver ? 'drag-over' : '',
    isSelected ? 'selected' : '',
    selectionMode ? 'selection-mode' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={overlayClass}
    >
      {isCover && (
        <div className="collection-image-cover-badge" aria-label="Ảnh bìa">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <path d="M9 3v18" />
            <path d="M3 9h18" />
          </svg>
          <span>Ảnh bìa</span>
        </div>
      )}

      {showSelectionCheckbox && (
        <button
          type="button"
          className={`collection-image-checkbox ${isSelected ? 'checked' : ''}`}
          aria-pressed={isSelected}
          aria-label={`${isSelected ? 'Bỏ chọn ảnh' : 'Chọn ảnh'} ${image.imageTitle || ''}`.trim()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(image._id);
          }}
        >
          {isSelected ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            </svg>
          )}
        </button>
      )}

      {showDragHandle && (
        <div
          className="collection-image-drag-handle"
          title="Kéo để sắp xếp lại"
          draggable
          onDragStart={(e) => onDragStart(image._id, e)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="9" cy="5" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="9" cy="19" r="1.5" />
            <circle cx="15" cy="5" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="15" cy="19" r="1.5" />
          </svg>
        </div>
      )}

      {showCoverButton && (
        <div className="collection-image-overlay">
          <button
            type="button"
            className={`collection-image-set-cover-btn ${isCover ? 'is-cover' : ''}`}
            disabled={isCover || isUpdatingCover || isReordering}
            aria-busy={isUpdatingCover}
            onClick={(e) => onSetCover(image._id, e)}
          >
            {!isCover && !isUpdatingCover ? (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <path d="M9 3v18" />
                  <path d="M3 9h18" />
                </svg>
                <span>Đặt làm ảnh bìa</span>
              </>
            ) : (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                <span>{isUpdatingCover ? 'Đang đặt ảnh bìa…' : 'Ảnh bìa'}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

