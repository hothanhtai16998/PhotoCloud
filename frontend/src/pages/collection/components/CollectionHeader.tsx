import { Heart, X, ArrowLeft, SquareCheckBig, ArrowUpFromLine } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/ui/IconTooltip';
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
  isExporting: boolean;
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
  isExporting,
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
          <IconTooltip label={isFavorited ? 'Bỏ yêu thích' : 'Yêu thích'}>
            <Button
              variant={isFavorited ? 'default' : 'outline'}
              iconOnly
              className="collection-action-btn"
              onClick={handleToggleFavorite}
              loading={togglingFavorite}
              aria-label={isFavorited ? 'Bỏ yêu thích' : 'Yêu thích'}
              aria-pressed={isFavorited}
            >
              <Heart size={20} className="size-5" fill={isFavorited ? 'currentColor' : 'none'} aria-hidden="true" />
            </Button>
          </IconTooltip>

          {collection?.isPublic && (
            <CollectionShare collection={collection} />
          )}

          {imagesCount > 0 && collection && (
            <IconTooltip label="Xuất bộ sưu tập">
              <Button
                variant="outline"
                iconOnly
                className="collection-action-btn"
                onClick={handleExportCollection}
                loading={isExporting}
                aria-label="Xuất bộ sưu tập"
              >
                <ArrowUpFromLine size={20} className="size-5" aria-hidden="true" />
              </Button>
            </IconTooltip>
          )}

          {canEdit && imagesCount > 0 && (
            <IconTooltip label={selectionMode ? 'Thoát chế độ chọn' : 'Chọn nhiều ảnh'}>
              <Button
                variant={selectionMode ? 'default' : 'outline'}
                iconOnly
                className="collection-action-btn"
                onClick={toggleSelectionMode}
                aria-label={selectionMode ? 'Thoát chế độ chọn' : 'Chọn nhiều ảnh'}
                aria-pressed={selectionMode}
              >
                {selectionMode ? (
                  <X size={20} className="size-5" aria-hidden="true" />
                ) : (
                  <SquareCheckBig size={20} className="size-5" aria-hidden="true" />
                )}
              </Button>
            </IconTooltip>
          )}
        </div>
      </div>
    </div>
  );
};
