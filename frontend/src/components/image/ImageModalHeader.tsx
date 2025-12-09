import { CheckCircle2, Heart, FolderPlus, X } from 'lucide-react';
import type { Image } from '@/types/image';
import type { User } from '@/types/user';
import { Avatar } from '../Avatar';
import { DownloadSizeSelector, type DownloadSize } from './DownloadSizeSelector';
import { getDisplayName, AVATAR_SIZE, ICON_SIZE } from './imageModalUtils';
import { t } from '@/i18n';

interface ImageModalHeaderProps {
  image: Image;
  user: User | null;
  isMobile: boolean;
  renderAsPage: boolean;
  isFavorited: boolean;
  handleToggleFavorite: () => void;
  handleDownloadWithSize: (size: DownloadSize) => void;
  handleViewProfile: (e: React.MouseEvent) => void;
  handleOpenCollection: () => void;
  onClose: () => void;
  modalContentRef: React.RefObject<HTMLDivElement | null>;
  onImageSelect: (image: Image) => void;
  isHeaderHidden?: boolean;
}

export const ImageModalHeader = ({
  image,
  user,
  isMobile,
  renderAsPage,
  isFavorited,
  handleToggleFavorite,
  handleDownloadWithSize,
  handleViewProfile,
  handleOpenCollection,
  onClose,
  modalContentRef,
  onImageSelect,
  isHeaderHidden = false,
}: ImageModalHeaderProps) => {
  const displayName = getDisplayName(image.uploadedBy);

  // Desktop Header
  if (!isMobile && !renderAsPage) {
    return (
      <div className="image-modal-header">
        {/* Left: User Info */}
        <div
          className="modal-header-left clickable-user-info"
          onClick={handleViewProfile}
          title={t('image.viewProfile')}
        >
          <Avatar
            user={image.uploadedBy}
            size={AVATAR_SIZE.MEDIUM}
            className="modal-user-avatar"
            fallbackClassName="modal-user-avatar-placeholder"
          />
          <div className="modal-user-info">
            <div className="modal-user-name hoverable">
              {displayName}
              <CheckCircle2 className="verified-badge" size={ICON_SIZE.SMALL} />
            </div>
            <div className="modal-user-status">{t('image.availableForHire')}</div>
          </div>
        </div>

        {/* Right: Download Button and Close Button */}
        <div className="modal-header-right">
          <DownloadSizeSelector
            image={image}
            onDownload={handleDownloadWithSize}
          />
          <button
            className="modal-close-btn-header"
            onClick={onClose}
            title={t('image.close')}
            aria-label={t('common.close')}
          >
            <X size={ICON_SIZE.MEDIUM} />
          </button>
        </div>
      </div>
    );
  }

  // Mobile/Page Author Banner
  if (isMobile || renderAsPage) {
    return (
      <div className={`image-modal-author-banner ${isHeaderHidden ? 'header-hidden' : ''}`}>
        <div
          className="modal-author-banner-left clickable-user-info"
          onClick={handleViewProfile}
          title={t('image.viewProfile')}
        >
          <Avatar
            user={image.uploadedBy}
            size={AVATAR_SIZE.MEDIUM}
            className="modal-user-avatar"
            fallbackClassName="modal-user-avatar-placeholder"
          />
          <div className="modal-user-info">
            <div className="modal-user-name hoverable">
              {displayName}
              <CheckCircle2 className="verified-badge" size={ICON_SIZE.SMALL} />
            </div>
            <div className="modal-user-status">{t('image.availableForHire')}</div>
          </div>
        </div>

        <div className="modal-author-banner-right">
          <button
            className="modal-action-btn"
            onClick={handleToggleFavorite}
            title={isFavorited ? t('image.unfavorite') : t('image.favorite')}
            aria-label={isFavorited ? t('image.unfavorite') : t('image.favorite')}
          >
            <Heart
              size={ICON_SIZE.MEDIUM}
              fill={isFavorited ? 'currentColor' : 'none'}
              className={isFavorited ? 'favorite-icon-filled' : ''}
            />
          </button>
          <button
            className="modal-action-btn"
            onClick={handleOpenCollection}
            title={t('image.addToCollection')}
            aria-label={t('image.addToCollection')}
          >
            <FolderPlus size={ICON_SIZE.MEDIUM} />
          </button>
          <DownloadSizeSelector
            image={image}
            onDownload={handleDownloadWithSize}
          />
        </div>
      </div>
    );
  }

  return null;
};

