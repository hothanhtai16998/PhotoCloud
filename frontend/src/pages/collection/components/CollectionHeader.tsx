import { useNavigate } from 'react-router-dom';
import { Heart, Download, CheckSquare2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CollectionShare } from '@/components/collection/CollectionShare';
import ReportButton from '@/components/ReportButton';
import type { Collection } from '@/types/collection';
import type { User } from '@/types/user';

interface CollectionHeaderProps {
  collection: Collection | null;
  imagesCount: number;
  user: User | null;
  isFavorited: boolean;
  togglingFavorite: boolean;
  selectionMode: boolean;
  canEdit: boolean;
  handleToggleFavorite: () => void;
  handleExportCollection: () => void;
  toggleSelectionMode: () => void;
}

export const CollectionHeader = ({
  collection,
  imagesCount,
  user,
  isFavorited,
  togglingFavorite,
  selectionMode,
  canEdit,
  handleToggleFavorite,
  handleExportCollection,
  toggleSelectionMode,
}: CollectionHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="collection-detail-header">
      <Button
        variant="ghost"
        className="collection-detail-back"
        onClick={() => navigate('/collections')}
      >
        ← Quay lại
      </Button>
      <div className="collection-detail-info">
        <div className="collection-detail-title-row">
          <div>
            <h1>{collection?.name || 'Bộ sưu tập'}</h1>
            {collection?.description && (
              <p className="collection-detail-description">
                {collection.description}
              </p>
            )}
            <div className="collection-detail-meta">
              <span>{imagesCount} ảnh</span>
              {collection?.views !== undefined && collection.views > 0 && (
                <span>{collection.views} lượt xem</span>
              )}
              {typeof collection?.createdBy === 'object' &&
                collection.createdBy && (
                  <span>
                    bởi {collection.createdBy.displayName || collection.createdBy.username}
                  </span>
                )}
            </div>
          </div>
          <div className="collection-detail-actions">
            <Button
              variant={isFavorited ? "default" : "outline"}
              className={`collection-favorite-btn ${isFavorited ? 'favorited' : ''}`}
              onClick={handleToggleFavorite}
              loading={togglingFavorite}
              title={isFavorited ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
            >
              <Heart size={18} fill={isFavorited ? 'currentColor' : 'none'} />
              <span>{isFavorited ? 'Đã yêu thích' : 'Yêu thích'}</span>
            </Button>
            {collection?.isPublic && (
              <div onClick={(e) => e.stopPropagation()}>
                <CollectionShare collection={collection} />
                {user && user._id !== (typeof collection.createdBy === 'object' ? collection.createdBy._id : collection.createdBy) && (
                  <ReportButton
                    type="collection"
                    targetId={collection._id}
                    targetName={collection.name}
                  />
                )}
              </div>
            )}
            {imagesCount > 0 && collection && (
              <Button
                variant="outline"
                className="collection-export-btn"
                onClick={handleExportCollection}
                title="Xuất bộ sưu tập (ZIP)"
              >
                <Download size={18} />
                <span>Xuất</span>
              </Button>
            )}
            {canEdit && imagesCount > 0 && (
              <Button
                variant={selectionMode ? "default" : "outline"}
                className={`collection-selection-mode-btn ${selectionMode ? 'active' : ''}`}
                onClick={toggleSelectionMode}
                title={selectionMode ? 'Thoát chế độ chọn' : 'Chọn nhiều ảnh'}
              >
                {selectionMode ? (
                  <>
                    <X size={18} />
                    <span>Thoát</span>
                  </>
                ) : (
                  <>
                    <CheckSquare2 size={18} />
                    <span>Chọn</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

