import { MapPin, ExternalLink, Tag, Heart, FolderPlus, Edit2 } from 'lucide-react';
import type { Image } from '@/types/image';
import type { User } from '@/types/user';
import { useFormattedDate } from '@/hooks/useFormattedDate';
import { useNavigate } from 'react-router-dom';
import { useImageStore } from '@/stores/useImageStore';
import { ImageModalInfo } from './ImageModalInfo';
import { ImageModalShare } from './ImageModalShare';
import ReportButton from '../ReportButton';
import { t, getLocale } from '@/i18n';

interface ImageModalSidebarProps {
  image: Image;
  views: number;
  downloads: number;
  isFavorited: boolean;
  isTogglingFavorite: boolean;
  user: User | null;
  handleToggleFavorite: () => void;
  handleOpenCollection: () => void;
  handleEdit: () => void;
  onClose: () => void;
}

export const ImageModalSidebar = ({
  image,
  views,
  downloads,
  isFavorited,
  isTogglingFavorite,
  user,
  handleToggleFavorite,
  handleOpenCollection,
  handleEdit,
  onClose,
}: ImageModalSidebarProps) => {
  const navigate = useNavigate();
  const locale = getLocale();
  const formattedDate = useFormattedDate(image.createdAt, {
    locale: locale === 'vi' ? 'vi-VN' : 'en-US',
    format: 'long',
  });

  return (
    <div className="image-modal-footer">
      {/* Left: Stats */}
      <div className="modal-footer-left">
        <div className="modal-footer-left-stats">
          <div className="modal-stat">
            <span className="stat-label">{t('image.views')}</span>
            <span className="stat-value">{views.toLocaleString()}</span>
          </div>
          <div className="modal-stat">
            <span className="stat-label">{t('image.downloads')}</span>
            <span className="stat-value">{downloads.toLocaleString()}</span>
          </div>
        </div>
        {/* Image Info */}
        <div className="modal-image-info">
          {image.imageTitle && (
            <div className="image-info-title">{image.imageTitle}</div>
          )}
          {(image.location || image.cameraModel) && (
            <div className="image-info-details">
              {image.location && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} style={{ flexShrink: 0 }} />
                  {image.coordinates ? (
                    <a
                      href={`https://www.google.com/maps?q=${image.coordinates.latitude},${image.coordinates.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: 'inherit',
                        textDecoration: 'none',
                        transition: 'opacity 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      title={t('image.viewOnMaps')}
                    >
                      {image.location}
                      <ExternalLink size={12} style={{ flexShrink: 0, opacity: 0.7 }} />
                    </a>
                  ) : (
                    <span>{image.location}</span>
                  )}
                </span>
              )}
              {image.location && image.cameraModel && <span> • </span>}
              {image.cameraModel && <span>{image.cameraModel}</span>}
            </div>
          )}
          {formattedDate && (
            <div className="image-info-date">
              {formattedDate}
            </div>
          )}
          {image.tags && Array.isArray(image.tags) && image.tags.length > 0 && (
            <div className="image-info-tags">
              <div className="image-info-tags-list">
                {image.tags.map((tag, index) => (
                  <button
                    key={index}
                    type="button"
                    className="image-info-tag"
                    onClick={() => {
                      onClose();
                      navigate('/');
                      setTimeout(() => {
                        useImageStore.getState().fetchImages({ tag });
                      }, 100);
                    }}
                    title={t('image.searchTag', { tag })}
                  >
                    <Tag size={12} />
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="modal-footer-right">
        {user && (
          <button
            className={`modal-footer-btn ${isFavorited ? 'favorited' : ''}`}
            onClick={handleToggleFavorite}
            disabled={isTogglingFavorite}
            aria-label={isFavorited ? t('image.unfavorite') : t('image.favorite')}
            title={`${isFavorited ? t('image.unfavorite') : t('image.favorite')} (F)`}
          >
            <Heart
              size={18}
              fill={isFavorited ? 'currentColor' : 'none'}
              className={isFavorited ? 'favorite-icon-filled' : ''}
            />
            <span>{isFavorited ? t('image.saved') : t('image.save')}</span>
            <kbd className="keyboard-hint">F</kbd>
          </button>
        )}
        {user && (
          <button
            className="modal-footer-btn"
            onClick={handleOpenCollection}
            aria-label={t('image.addToCollection')}
            title={t('image.addToCollection')}
          >
            <FolderPlus size={18} />
            <span>{t('image.collection')}</span>
          </button>
        )}
        <ImageModalShare image={image} />
        <ImageModalInfo image={image} />
        {user && user._id !== image.uploadedBy._id && (
          <ReportButton
            type="image"
            targetId={image._id}
            targetName={image.imageTitle}
            className="modal-footer-btn"
          />
        )}
        {user && (user._id === image.uploadedBy._id || user.isAdmin || user.isSuperAdmin) && (
          <button
            className="modal-footer-btn"
            onClick={handleEdit}
            aria-label="Edit image"
            title="Edit image"
          >
            <Edit2 size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

