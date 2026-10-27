import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { DataLoading } from '@/components/user/DataLoading';
import { ImagePagePhoto } from '@/components/ImagePagePhoto';
import { ImageRelatedGrid } from '@/components/ImageRelatedGrid';
import '@/components/NoFlashGrid/components/ImageModal.css';
import { ImageModalInfo } from '@/components/NoFlashGrid/components/ImageModalInfo';
import '@/components/NoFlashGrid/components/modal-footer.css';
import '@/components/NoFlashGrid/components/modal-info.css';
import { t } from '@/i18n';
import '@/stores/useDownloadHistoryStore';
import { ArrowLeft,CalendarDays,Camera,ChevronDown,ChevronLeft,ChevronRight,Download,Edit2,ExternalLink,FolderPlus,Heart,Info,MapPin,Share2,Tag,X } from 'lucide-react';
import { lazy,Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useImagePageController } from './image/useImagePageController';
import './ImagePage.css';
import './image/ImagePageTheme.css';

const EditImageModal = lazy(() => import('@/components/EditImageModal'));
const CollectionModal = lazy(() => import('@/components/collection/CollectionModal'));

function ImagePage() {
  const {
    loading,
    error,
    image,
    navigate,
    scrollRef,
    isImageChangingRef,
    scrollPosRef,
    showModalStyle,
    setShouldAnimate,
    setIsScrolled,
    scrollAnimationTimerRef,
    modalRef,
    topInfoRef,
    isImageChanging,
    handleClose,
    authorAreaRef,
    openAuthorPopup,
    scheduleAuthorHide,
    authorName,
    showAuthorTooltip,
    clearAuthorTimers,
    setShowAuthorTooltip,
    handleViewProfile,
    authorTooltipRef,
    tooltipAnimating,
    authorTooltipPosition,
    cancelAuthorHide,
    authorImages,
    handleImageSelect,
    handleToggleFavorite,
    isTogglingFavorite,
    isFavorited,
    favoriteCount,
    user,
    setShowCollectionModal,
    showCollectionModal,
    downloadButtonRef,
    setShowDownloadMenu,
    showDownloadMenu,
    isDownloading,
    downloadMenuRef,
    handleDownloadMenuKeyDown,
    handleDownload,
    imageContainerRef,
    displayHeight,
    getRegularUrl,
    getOriginalUrl,
    views,
    downloads,
    handleShare,
    isSharing,
    chartImage,
    setShowEditModal,
    formattedDate,
    displayTags,
    relatedImages,
    images,
    handleRelatedImageHover,
    imageDialogRef,
    handleOverlayClick,
    isScrolled,
    shouldAnimate,
    currentImageIndex,
    showEditModal,
    setImage,
    setImages,
    retryImage
  } = useImagePageController();
  // Loading state - check AFTER all hooks are called
  // GlobalLoadingOverlay handles the spinner, so we return null to prevent duplicate
  if (loading) {
    return (
      <>
        <div className="image-page" data-loading-scope="local">
          <DataLoading message="Đang tải thông tin ảnh" />
        </div>
      </>
    );
  }

  // Error state - check AFTER all hooks are called
  if (error || !image) {
    return (
      <>
        <div className="image-page-error" role="alert">
          <p>{error || t('imagePage.notFound')}</p>
          <button onClick={retryImage}>{t('imagePage.retry')}</button>
          <button onClick={() => navigate('/')}>{t('imagePage.backToHome')}</button>
        </div>
      </>
    );
  }

  // Shared content - extracted to avoid duplication
  const modalContent = (
    <div
      ref={scrollRef}
      className="image-modal-scroll-area"
      onScroll={(e) => {
        // Skip scroll handling during image change to prevent race conditions
        if (isImageChangingRef.current) {
          return;
        }
        
        const top = (e.currentTarget as HTMLDivElement).scrollTop;
        const prevTop = scrollPosRef.current;
        const wasScrolled = showModalStyle ? prevTop >= 16 : prevTop > 0;
        scrollPosRef.current = top;

        // Check if scrolled past the initial spacer (16px)
        const nowScrolled = showModalStyle ? top >= 16 : top > 0;

        // Only update state if it actually changed
        if (nowScrolled !== wasScrolled) {
          setShouldAnimate(true);
          setIsScrolled(nowScrolled);

          if (scrollAnimationTimerRef.current) clearTimeout(scrollAnimationTimerRef.current);
          scrollAnimationTimerRef.current = setTimeout(() => {
            setShouldAnimate(false);
          }, 150);
        } else {
          setIsScrolled(nowScrolled);
        }
      }}
    >
      <div ref={modalRef} className="image-modal-surface">
      {/* Top info - Sticky: starts with space, sticks to viewport top when scrolling */}
      <div 
        ref={topInfoRef} 
        className={`image-modal-top-info ${isImageChanging ? 'no-transition' : ''}`}
        style={isImageChanging ? { transition: 'none' } : undefined}
      >
        {!showModalStyle && <button type="button" className="image-page-back-button" onClick={handleClose} aria-label="Trở về" title="Trở về"><ArrowLeft size={20} /></button>}
        <div
          ref={authorAreaRef}
          className="image-modal-author-area"
          onMouseEnter={() => openAuthorPopup()}
          onFocus={event => { if (event.target === event.currentTarget) openAuthorPopup(); }}
          onBlur={scheduleAuthorHide}
          role="link"
          tabIndex={0}
          aria-label={authorName}
          onKeyDown={event => {
            if (event.key === 'Escape' && showAuthorTooltip) {
              event.preventDefault(); event.stopPropagation(); clearAuthorTimers(); setShowAuthorTooltip(false);
              return;
            }
            if (event.target === event.currentTarget && event.key === 'Enter') handleViewProfile(event);
          }}
          onMouseLeave={scheduleAuthorHide}
          onClick={handleViewProfile}
          style={{ cursor: 'pointer' }}
        >
          <div className="image-modal-author-avatar">
            {authorName ? authorName[0]?.toUpperCase() : 'A'}
          </div>
          <div>
            <div className="image-modal-author-name">{authorName}</div>
            <div className="image-modal-author-title">{image.imageTitle || t('imagePage.topInfo')}</div>
          </div>
          <button
            className="image-author-info-trigger"
            aria-label={`${t('image.info')} ${authorName}`}
            aria-expanded={showAuthorTooltip}
            onClick={event => {
              event.stopPropagation();
              if (showAuthorTooltip) { clearAuthorTimers(); setShowAuthorTooltip(false); }
              else openAuthorPopup(0);
            }}
          ><Info size={18} aria-hidden="true" /></button>

          {/* Author tooltip/popup */}
          {showAuthorTooltip && (
              <div
                ref={authorTooltipRef}
                data-author-tooltip
                onKeyDown={event => {
                  if (event.key === 'Escape') {
                    event.preventDefault(); event.stopPropagation(); clearAuthorTimers();
                    setShowAuthorTooltip(false); authorAreaRef.current?.focus({ preventScroll: true }); clearAuthorTimers();
                  }
                }}
                className={`image-modal-author-tooltip ${tooltipAnimating ? 'animating' : ''}`}
                style={authorTooltipPosition}
                onMouseEnter={cancelAuthorHide}
                onMouseLeave={scheduleAuthorHide}
                onFocus={cancelAuthorHide}
                onBlur={scheduleAuthorHide}
              >
                <div className="image-modal-author-tooltip-header">
                  <div className="image-modal-author-tooltip-avatar">
                    {authorName ? authorName[0]?.toUpperCase() : 'A'}
                  </div>
                  <div>
                    <div className="image-modal-author-tooltip-name">
                      {authorName}
                    </div>
                    <div className="image-modal-author-tooltip-bio">
                      {(image.uploadedBy as any)?.bio || t('image.photographer')}
                    </div>
                  </div>
                </div>
                <div className="image-modal-author-tooltip-location">
                  {(image.uploadedBy as any)?.location || t('imagePage.noLocation')}
                </div>
                {authorImages.length > 0 && (
                  <div className="image-modal-author-images-section">
                    <div className="image-modal-author-images-grid">
                      {authorImages.slice(0, 3).map((authorImg, idx) => (
                        <div
                          key={authorImg._id || idx}
                          className="image-modal-author-image-item"
                          role="button"
                          tabIndex={0}
                          aria-label={authorImg.imageTitle || t('image.photo')}
                          onKeyDown={event => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault(); event.stopPropagation(); handleImageSelect(authorImg);
                            }
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleImageSelect(authorImg);
                          }}
                        >
                          {authorImg.thumbnailUrl || authorImg.smallUrl || authorImg.imageUrl ? (
                            <img
                              src={authorImg.thumbnailUrl || authorImg.smallUrl || authorImg.imageUrl}
                              alt={authorImg.imageTitle || t('image.photo')}
                              className="image-modal-author-image"
                            />
                          ) : (
                            <div className="image-modal-author-image-placeholder">
                              {t('image.noImage')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewProfile(e as any);
                    setShowAuthorTooltip(false);
                  }}
                  className="image-modal-view-profile-button"
                >
                  {t('image.viewProfile')}
                </button>
              </div>
          )}
        </div>
        <div className="image-modal-actions">
          {/* Save/Favorite button */}
          <button
            onClick={handleToggleFavorite}
            disabled={isTogglingFavorite}
            aria-busy={isTogglingFavorite}
            aria-pressed={isFavorited}
            aria-label={t('image.save')}
            title={t('image.save')}
            className="image-modal-favorite-button"
          >
            <Heart size={16} fill={isFavorited ? 'currentColor' : 'none'} aria-hidden="true" />
            <span className="image-action-label">{t('image.save')}</span>
            {favoriteCount > 0 && (
              <span className="image-modal-favorite-count">{favoriteCount.toLocaleString()}</span>
            )}
            <kbd className="image-modal-kbd">F</kbd>
          </button>

          {/* Add to Collection button with dropdown */}
          {(user?.isAdmin || user?.isSuperAdmin) && <div className="image-modal-collection-menu-wrapper" data-collection-menu>
            <button
              onClick={() => {
                // If user is not logged in, redirect to sign-in page
                if (!user) {
                  navigate('/signin');
                  return;
                }
                setShowCollectionModal(!showCollectionModal);
              }}
              className="image-modal-favorite-button"
              aria-label={t('image.addToCollection')}
              title={t('image.addToCollection')}
            >
              <FolderPlus size={16} />
              <span className="image-action-label">{t('image.collection')}</span>
            </button>
            {showCollectionModal && image && (
              <Suspense fallback={null}>
              <CollectionModal
                isOpen={showCollectionModal}
                onClose={() => setShowCollectionModal(false)}
                imageId={image._id}
                onCollectionUpdate={() => {
                  // Optionally refresh data or show success message
                }}
              />
              </Suspense>
            )}
          </div>}

          {/* Download button with dropdown */}
          <div className="image-modal-download-menu-wrapper" data-download-menu>
            <button
              ref={downloadButtonRef}
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              onKeyDown={(event) => {
                if (!isDownloading && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
                  event.preventDefault();
                  event.stopPropagation();
                  setShowDownloadMenu(true);
                }
              }}
              disabled={isDownloading}
              aria-busy={isDownloading}
              aria-expanded={showDownloadMenu}
              aria-haspopup="menu"
              aria-label={t('image.download')}
              title={t('image.download')}
              className="image-modal-download-button"
            >
              <Download size={18} className="image-download-mobile-icon" aria-hidden="true" />
              <span className="image-action-label">{t('image.download')}</span>
              {isDownloading ? <LoadingIndicator size="small" aria-hidden="true" /> : <ChevronDown size={16} />}
            </button>
            {showDownloadMenu && (
              <div
                ref={downloadMenuRef}
                role="menu"
                aria-label={t('image.download')}
                onKeyDown={handleDownloadMenuKeyDown}
                className="image-modal-download-menu"
                onClick={(e) => e.stopPropagation()}
              >
                {[
                  { value: 'small' as const, label: t('image.small'), dimension: '640px' },
                  { value: 'medium' as const, label: t('image.medium'), dimension: '1920px' },
                  { value: 'large' as const, label: t('image.large'), dimension: '2400px' },
                  { value: 'original' as const, label: t('image.original'), dimension: t('imagePage.fullSize') },
                ].map((option) => (
                  <button
                    key={option.value}
                    role="menuitem"
                    onClick={() => void handleDownload(option.value)}
                    disabled={isDownloading}
                    className="image-modal-download-menu-item"
                  >
                    <div>
                      <div className="image-modal-download-option-label">{option.label}</div>
                      <div className="image-modal-download-option-dimension">{option.dimension}</div>
                    </div>
                    {option.value === 'medium' && (
                      <span className="image-modal-download-option-default">{t('imagePage.default')}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Middle image with gutters */}
      <div className="image-modal-middle-container">
        <div className="image-modal-image-wrapper">
          <div
            ref={imageContainerRef}
            className={`image-modal-image-container ${image.width && image.height ? 'has-aspect-ratio' : 'no-aspect-ratio'}`}
            style={{
              height: displayHeight,
              minHeight: displayHeight,
              maxHeight: displayHeight,
              overflow: 'hidden',
            }}
          >
            <ImagePagePhoto
              key={`${image._id}:${getRegularUrl(image)}:${getOriginalUrl(image)}`}
              src={getRegularUrl(image)}
              fallback={getOriginalUrl(image)}
              preview={image.base64Thumbnail || image.thumbnailUrl || image.smallUrl}
              alt={image.imageTitle || t('image.photo')}
            />
          </div>
        </div>
      </div>

      {/* Bottom info (scrolls with content) */}
      <div className="image-modal-bottom-info">
        <div className="image-modal-bottom-info-row">
          {/* Left: image info */}
          <div className="image-modal-image-info">
            {/* Views and Downloads Stats with Share/Info buttons */}
            <div className="image-modal-stats-row">
              <div className="image-modal-stats-header">
                <div className="image-modal-stat-item">
                  <div className="image-modal-stat-label">{t('image.views')}</div>
                  <div className="image-modal-stat-value">{views.toLocaleString()}</div>
                </div>
                <div className="image-modal-stat-item">
                  <div className="image-modal-stat-label">{t('image.downloads')}</div>
                  <div className="image-modal-stat-value">{downloads.toLocaleString()}</div>
                </div>
              </div>

              {/* Right: Share and Info buttons */}
              <div className="image-modal-actions-container">
                <button
                  onClick={handleShare}
                  disabled={isSharing}
                  aria-busy={isSharing}
                  aria-label={t('share.share')}
                  title={t('share.share')}
                  className="image-modal-share-button"
                >
                  {isSharing ? <LoadingIndicator size="small" aria-hidden="true" /> : <Share2 size={16} />}
                  <span>{t('share.share')}</span>
                </button>
                <ImageModalInfo image={chartImage || image} />
                {/* Edit button - only show if user is owner or admin */}
                {user && image && (
                  (user._id === (image.uploadedBy as any)?._id ||
                    (user as any)?.isAdmin ||
                    (user as any)?.isSuperAdmin) && (
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="image-modal-share-button"
                      aria-label={t('common.edit')}
                      title={t('common.edit')}
                    >
                      <Edit2 size={16} />
                      <span>{t('common.edit')}</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {image.imageTitle && (
              <div className="image-modal-image-title">
                {image.imageTitle}
              </div>
            )}

            {/* Location and Camera Info */}
            {(image.location || image.cameraModel) && (
              <div className="image-modal-image-details">
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
                {image.cameraModel && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Camera size={14} aria-hidden="true" />
                    {image.cameraModel}
                  </span>
                )}
              </div>
            )}

            {/* Camera EXIF Info */}
            {(image.focalLength || image.aperture || image.shutterSpeed || image.iso) && (
              <div className="image-modal-image-exif">
                {image.focalLength && <span>{image.focalLength}mm</span>}
                {image.focalLength && image.aperture && <span> • </span>}
                {image.aperture && <span>f/{image.aperture}</span>}
                {image.aperture && image.shutterSpeed && <span> • </span>}
                {image.shutterSpeed && <span>{image.shutterSpeed}</span>}
                {image.shutterSpeed && image.iso && <span> • </span>}
                {image.iso && <span>ISO {image.iso}</span>}
              </div>
            )}

            {/* Date */}
            {formattedDate && (
              <div className="image-modal-image-date">
                <CalendarDays size={14} aria-hidden="true" />
                {formattedDate}
              </div>
            )}

            {/* Tags */}
            {displayTags.length > 0 && (
              <div className="image-modal-image-tags">
                {displayTags.map((tag, idx) => (
                  <span key={idx} className="image-modal-image-tag">
                    <Tag size={14} />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            {image.description && (
              <div className="image-modal-image-description">
                {image.description}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Related images section */}
      {relatedImages.length > 0 && (
        <div className="image-modal-related-section">
          <div className="image-modal-related-inner">
            <h2 className="image-modal-related-title">
              {t('image.relatedImages')}
            </h2>
            <ImageRelatedGrid
              key={image._id}
              scrollRoot={scrollRef}
              compactMobile
              images={relatedImages}
              loading={false}
              onImageClick={handleImageSelect}
              onImageHover={handleRelatedImageHover}
            />
          </div>
        </div>
      )}

      </div>
    </div>
  );

  return (
    <>
      {/* Progress bar at top of viewport */}

      {showModalStyle ? (
        // Modal-style: Overlay with container inside (like NoFlashGrid ImageModal)
        createPortal(
        <div
          ref={imageDialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={image.imageTitle || t('image.photo')}
          tabIndex={-1}
          onClick={handleOverlayClick}
          className="image-modal-overlay image-page-modal"
        >
          <div
            className={`image-modal-container ${isScrolled ? 'scrolled' : ''} ${shouldAnimate ? 'animate' : ''} ${isImageChanging ? 'image-changing' : ''}`}
          >
            {modalContent}
          </div>
      {/* Close button - only in modal-style */}
      {showModalStyle && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="image-modal-close-button image-page-close"
          aria-label={t('common.close')}
        >
          <X size={22} aria-hidden="true" />
        </button>
      )}

      {/* Left navigation button - only in modal-style */}
      {showModalStyle && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (currentImageIndex > 0) {
              const prevImage = images[currentImageIndex - 1];
              if (prevImage) {
                handleImageSelect(prevImage);
              }
            }
          }}
          disabled={currentImageIndex === 0}
          className="image-modal-nav-button left"
          aria-label={t('common.previous')}
        >
          <ChevronLeft size={28} aria-hidden="true" />
        </button>
      )}

      {/* Right navigation button - only in modal-style */}
      {showModalStyle && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (currentImageIndex < images.length - 1) {
              const nextImage = images[currentImageIndex + 1];
              if (nextImage) {
                handleImageSelect(nextImage);
              }
            }
          }}
          disabled={currentImageIndex === images.length - 1}
          className="image-modal-nav-button right"
          aria-label={t('common.next')}
        >
          <ChevronRight size={28} aria-hidden="true" />
        </button>
      )}

        </div>, document.body)
       ) : (
         // Regular page: Wrapper (sidebar is now rendered globally in App.tsx)
         <div className="image-page" data-loading-scope="local">
           <div
            className={`image-modal-container ${isScrolled ? 'scrolled' : ''} ${shouldAnimate ? 'animate' : ''} ${isImageChanging ? 'image-changing' : ''}`}
          >
            {modalContent}
          </div>
        </div>
      )}

      {/* Edit Image Modal */}
      {image && showEditModal && (
        <Suspense fallback={null}>
        <EditImageModal
          image={image}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onUpdate={(updatedImage) => {
            setImage(updatedImage);
            setShowEditModal(false);
            // Update in images array if it exists there
            setImages(prev => prev.map(img =>
              img._id === updatedImage._id ? updatedImage : img
            ));
          }}
        />
        </Suspense>
      )}

    </>
  );
}

export default ImagePage;
