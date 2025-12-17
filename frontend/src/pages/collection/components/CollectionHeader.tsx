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
  return (
    <div className="collection-detail-header">
      <div className="collection-detail-content">
        <div className="collection-detail-main">
          <div className="collection-detail-title-row">
            <h1>{collection?.name || 'Bộ sưu tập'}</h1>
            <span className="collection-detail-image-count">
              {imagesCount} {imagesCount === 1 ? 'ảnh' : 'ảnh'}
            </span>
          </div>
          {typeof collection?.createdBy === 'object' &&
            collection.createdBy && (
              <div className="collection-detail-author">
                {collection.createdBy.avatarUrl ? (
                  <img
                    src={collection.createdBy.avatarUrl}
                    alt={collection.createdBy.displayName || collection.createdBy.username || ''}
                    className="collection-detail-author-avatar"
                  />
                ) : (
                  <div className="collection-detail-author-avatar-placeholder">
                    {((collection.createdBy.displayName || collection.createdBy.username) || 'U')[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <span className="collection-detail-author-name">
                  {collection.createdBy.displayName || collection.createdBy.username}
                </span>
              </div>
            )}
          {collection?.description && (
            <p className="collection-detail-description">
              {collection.description}
            </p>
          )}
          {collection?.views !== undefined && collection.views > 0 && (
            <div className="collection-detail-views">
              {collection.views} lượt xem
            </div>
          )}
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
            <>
              <CollectionShare collection={collection} />
              {user && user._id !== (typeof collection.createdBy === 'object' ? collection.createdBy._id : collection.createdBy) && (
                <ReportButton
                  type="collection"
                  targetId={collection._id}
                  targetName={collection.name}
                />
              )}
            </>
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
  );
};

