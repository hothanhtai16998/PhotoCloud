import { Trash2 } from 'lucide-react';

interface CollectionBulkActionsProps {
  selectionMode: boolean;
  selectedImageIds: Set<string>;
  totalImages: number;
  isBulkRemoving: boolean;
  onBulkRemove: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export const CollectionBulkActions = ({
  selectionMode,
  selectedImageIds,
  totalImages,
  isBulkRemoving,
  onBulkRemove,
  onSelectAll,
  onDeselectAll,
}: CollectionBulkActionsProps) => {
  if (!selectionMode || selectedImageIds.size === 0) {
    return null;
  }

  return (
    <div className="collection-bulk-action-bar">
      <div className="bulk-action-info">
        <span className="bulk-action-count">
          Đã chọn {selectedImageIds.size} ảnh
        </span>
        <button
          className="bulk-action-link-btn"
          onClick={selectedImageIds.size === totalImages ? onDeselectAll : onSelectAll}
        >
          {selectedImageIds.size === totalImages ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
        </button>
      </div>
      <div className="bulk-action-buttons">
        <button
          className="bulk-action-btn bulk-action-remove"
          onClick={onBulkRemove}
          disabled={isBulkRemoving}
        >
          <Trash2 size={18} />
          <span>Xóa khỏi bộ sưu tập</span>
        </button>
      </div>
    </div>
  );
};





