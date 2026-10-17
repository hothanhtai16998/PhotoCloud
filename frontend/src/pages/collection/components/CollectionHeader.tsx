import { Heart, Download, CheckSquare2, X, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CollectionShare } from '@/components/collection/CollectionShare';
import { t } from '@/i18n';
import type { Collection } from '@/types/collection';

interface CollectionHeaderProps {
  collection: Collection | null;
  imagesCount: number;
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
      <Link className="collection-detail-back" to="/collections">
        <ArrowLeft size={16} aria-hidden="true" />
        <span>Quay lại bộ sưu tập</span>
      </Link>
      <div className="collection-detail-content">
        <div className="collection-detail-main">
          <div className="collection-detail-title-row">
            <h1>{collection?.name || 'Bộ sưu tập'}</h1>
            {(imagesCount > 0 || (collection?.views ?? 0) > 0) && (
              <span className="collection-detail-image-count">
                {imagesCount > 0 && (
                  <span>{imagesCount} {imagesCount === 1 ? t('collections.image') : t('collections.images')}</span>
                )}
                {imagesCount > 0 && (collection?.views ?? 0) > 0 && (
                  <span className="collection-detail-stat-dot" aria-hidden="true">•</span>
                )}
                {(collection?.views ?? 0) > 0 && (
                  <span>{collection?.views} lượt xem</span>
                )}
              </span>
            )}
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
        </div>

        <div className="collection-detail-actions">
          {/* Primary: yêu thích (mọi user) */}
          <Button
            variant={isFavorited ? 'default' : 'outline'}
            className={`collection-favorite-btn ${isFavorited ? 'favorited' : ''}`}
            onClick={handleToggleFavorite}
            loading={togglingFavorite}
            title={isFavorited ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
            aria-pressed={isFavorited}
          >
            <Heart size={18} fill={isFavorited ? 'currentColor' : 'none'} aria-hidden="true" />
            <span>{isFavorited ? 'Đã yêu thích' : 'Yêu thích'}</span>
          </Button>

          {/* Chia sẻ: hiện thẳng, không cần qua menu */}
          {collection?.isPublic && (
            <CollectionShare collection={collection} />
          )}

          {/* Xuất: hiện thẳng, không cần qua menu */}
          {imagesCount > 0 && collection && (
            <Button
              variant="outline"
              className="collection-export-btn"
              onClick={handleExportCollection}
              title="Xuất bộ sưu tập (ZIP)"
            >
              <Download size={18} aria-hidden="true" />
              <span>Xuất</span>
            </Button>
          )}

          {/* (Đã bỏ ReportButton khỏi header theo yêu cầu — viewer có thể báo cáo qua trang ảnh chi tiết.) */}

          {/* Chọn nhiều: primary cho owner */}
          {canEdit && imagesCount > 0 && (
            <Button
              variant={selectionMode ? 'default' : 'outline'}
              className={`collection-selection-mode-btn ${selectionMode ? 'active' : ''}`}
              onClick={toggleSelectionMode}
              title={selectionMode ? 'Thoát chế độ chọn' : 'Chọn nhiều ảnh'}
              aria-pressed={selectionMode}
            >
              {selectionMode ? (
                <>
                  <X size={18} aria-hidden="true" />
                  <span>Thoát</span>
                </>
              ) : (
                <>
                  <CheckSquare2 size={18} aria-hidden="true" />
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
