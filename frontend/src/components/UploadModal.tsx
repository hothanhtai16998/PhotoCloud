import { useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserStore } from '@/stores/useUserStore';
import { useNavigate } from 'react-router-dom';
import { X, Upload, ArrowRight, Plus } from 'lucide-react';
import { useImageUpload } from './upload/hooks/useImageUpload';
import { useUploadModalState } from './upload/hooks/useUploadModalState';
import { UploadProgress } from './upload/UploadProgress';
import { UploadPreview } from './upload/UploadPreview';
import { UploadForm } from './upload/UploadForm';
import { t } from '@/i18n';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { imageService } from '@/services/imageService';
import { appConfig } from '@/config/appConfig';
import './UploadModal.css';

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
}

function UploadModal({ isOpen, onClose }: UploadModalProps) {
    const { accessToken } = useAuthStore();
    const { user } = useUserStore();
    const isAdmin = user?.isAdmin === true || user?.isSuperAdmin === true;
    const navigate = useNavigate();
    const { settings } = useSiteSettings();

    // Track image orientations for masonry layout (future feature)
    // Currently only set but not read - kept for future implementation
    const [, setImageOrientations] = useState<Map<number, boolean>>(new Map());

    // Preserve quality toggle with localStorage persistence
    const [preserveQuality, setPreserveQuality] = useState<boolean>(() => {
        const saved = localStorage.getItem(appConfig.storage.uploadPreserveQualityKey);
        return saved === 'true';
    });

    const handlePreserveQualityChange = (checked: boolean) => {
        setPreserveQuality(checked);
        localStorage.setItem(appConfig.storage.uploadPreserveQualityKey, checked.toString());
    };

    const {
        categories,
        loadingCategories,
        loadCategories,
        showProgress,
        validateImagesWithErrors,
        showSuccess,
        uploadingIndex,
        totalUploads,
        uploadProgress,
        loading,
        handleSubmitAll,
        resetUploadState,
        preUploadAllImages,
    } = useImageUpload({
        onSuccess: () => {
            // Success handling is done in the hook
        },
    });

    // Use modal state hook
    const {
        dragActive,
        selectedFiles,
        setSelectedFiles,
        imagesData,
        setImagesData,
        showTooltip,
        setShowTooltip,
        fileInputRef,
        handleDrag,
        handleDrop,
        handleFileInput,
        updateImageData,
        updateImageCoordinates,
        resetState,
    } = useUploadModalState({ preUploadAllImages, preserveQuality });

    // Fetch categories when modal opens
    useEffect(() => {
        if (isOpen) {
            loadCategories();
        }
    }, [isOpen, loadCategories]);

    // Auto-select first category for admin users when categories are loaded and images are selected
    useEffect(() => {
        if (!isAdmin || categories.length === 0 || imagesData.length === 0) return;
        
        const firstCategoryId = categories[0]?._id;
        if (!firstCategoryId) return;

        setImagesData(prev => {
            if (!prev.some(img => !img.category?.trim())) return prev;
            return prev.map(img => 
                !img.category?.trim() ? { ...img, category: firstCategoryId } : img
            );
        });
    }, [isAdmin, categories, imagesData.length]);

    // Check if all images have required fields filled AND all are pre-uploaded
    // Title is no longer required, category is only required for admin users
    const isFormValid = imagesData.length > 0 &&
        imagesData.every(img =>
            (isAdmin ? img.category.trim().length > 0 : true) && // Category only required for admin
            img.preUploadData && // Must be pre-uploaded
            !img.isUploading && // Not currently uploading
            !img.uploadError // No upload errors
        );

    const handleSubmit = async () => {
        // Use shared validation function to avoid duplication (only requires category for admin)
        const validatedImages = validateImagesWithErrors(imagesData, isAdmin);
        setImagesData(validatedImages);

        // Check if all images are valid
        if (!validatedImages.every(img => Object.keys(img.errors).length === 0)) {
            return;
        }

        await handleSubmitAll(imagesData, isAdmin);
    };

    const handleViewProfile = () => {
        resetState();
        resetUploadState();
        onClose();
        // Dispatch custom event to trigger image refresh
        window.dispatchEvent(new CustomEvent('refreshProfile'));
        navigate('/profile');
    };

    const handleCancel = async () => {
        if (showProgress || showSuccess) return;
        
        // Cleanup pre-uploaded files before closing
        const preUploadedImages = imagesData.filter(img => img.preUploadData?.uploadKey);
        if (preUploadedImages.length > 0) {
            await Promise.all(
                preUploadedImages.map(img =>
                    imageService.deletePreUploadedFile(img.preUploadData!.uploadKey).catch(console.error)
                )
            );
        }

        resetState();
        resetUploadState();
        onClose();
    };

    const handleCloseAfterSuccess = () => {
        if (!showSuccess) return;
        resetState();
        resetUploadState();
        onClose();
    };

    // Handle ESC key
    useEffect(() => {
        if (!isOpen) return;
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleCancel();
            }
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [isOpen, handleCancel]);

    // Prevent body scroll when modal is open (without hiding content)
    useEffect(() => {
        if (!isOpen) return;

        // Store scroll position
        const scrollY = window.scrollY;
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';

        return () => {
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
            window.scrollTo(0, scrollY);
        };
    }, [isOpen]);

    // Cleanup pre-uploaded files when modal closes (only if upload wasn't successful)
    useEffect(() => {
        if (!isOpen && imagesData.length > 0 && !showSuccess && !showProgress) {
            const preUploadedImages = imagesData.filter(img => img.preUploadData?.uploadKey);
            if (preUploadedImages.length > 0) {
                Promise.all(
                    preUploadedImages.map(img =>
                        imageService.deletePreUploadedFile(img.preUploadData!.uploadKey).catch(console.error)
                    )
                );
            }
        }
    }, [isOpen, imagesData, showSuccess, showProgress]);

    // Redirect to sign-in if not authenticated
    useEffect(() => {
        if (isOpen && !accessToken) {
            onClose();
            navigate('/signin');
        }
    }, [isOpen, accessToken, onClose, navigate]);

    // Confetti effect
    useEffect(() => {
        if (showSuccess) {
            const container = document.getElementById('confetti-container');
            if (!container) return undefined;

            const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181'];
            const confettiCount = 50;

            for (let i = 0; i < confettiCount; i++) {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = `${Math.random() * 100}%`;
                const color = colors[Math.floor(Math.random() * colors.length)];
                if (color) {
                    confetti.style.background = color;
                }
                confetti.style.animationDelay = `${Math.random() * 2}s`;
                confetti.style.animationDuration = `${2 + Math.random() * 2}s`;
                container.appendChild(confetti);
            }

            return () => {
                container.innerHTML = '';
            };
        }
        return undefined;
    }, [showSuccess]);

    if (!isOpen || !accessToken) return null;

    // MIME type mapping for file input accept attribute
    const MIME_TYPE_MAP: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'bmp': 'image/bmp',
        'ico': 'image/x-icon',
        'mp4': 'video/mp4',
        'webm': 'video/webm',
    };

    // Reusable drag handlers for modal container
    const modalDragHandlers = {
        onDragEnter: handleDrag,
        onDragLeave: handleDrag,
        onDragOver: (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            handleDrag(e);
        },
        onDrop: (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            handleDrop(e);
        },
    };

    // Reusable header section with quality toggle
    const renderModalHeader = (showQualityToggle: boolean) => (
        <div className="upload-modal-header">
            <h2 className="upload-modal-title">{t('upload.title')}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {showQualityToggle && selectedFiles.length > 0 && (
                    <label
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            cursor: imagesData.some(img => img.preUploadData) ? 'not-allowed' : 'pointer',
                            fontSize: 14,
                            color: imagesData.some(img => img.preUploadData) ? '#999' : '#666',
                            opacity: imagesData.some(img => img.preUploadData) ? 0.6 : 1,
                        }}
                        title={
                            imagesData.some(img => img.preUploadData)
                                ? t('upload.waitForUpload')
                                : preserveQuality
                                    ? t('upload.preserveQualityHint')
                                    : t('upload.compressImagesHint')
                        }
                    >
                        <input
                            type="checkbox"
                            checked={preserveQuality}
                            onChange={(e) => handlePreserveQualityChange(e.target.checked)}
                            disabled={imagesData.some(img => img.preUploadData)}
                            style={{ cursor: imagesData.some(img => img.preUploadData) ? 'not-allowed' : 'pointer' }}
                        />
                        <span>{preserveQuality ? t('upload.preserveQuality') : t('upload.compressImages')}</span>
                    </label>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className="upload-modal-close"
                    onClick={handleCancel}
                    aria-label="Close upload modal"
                >
                    <X size={20} />
                </Button>
            </div>
        </div>
    );

    // Progress Screen (finalize phase)
    if (showProgress) {
        return createPortal(
            <UploadProgress
                uploadingIndex={uploadingIndex}
                totalUploads={totalUploads}
                uploadProgress={uploadProgress}
            />,
            document.body
        );
    }

    // Success Screen
    if (showSuccess) {
        return createPortal(
            <div className="upload-modal-overlay" onClick={handleCloseAfterSuccess}>
                <div className="upload-success-screen" onClick={(e) => e.stopPropagation()}>
                    <div className="confetti-container" id="confetti-container"></div>
                    <div className="success-content">
                        <div className="success-header">
                            <h1 className="success-title">{t('upload.success')}</h1>
                            <p className="success-subtitle">{t('upload.successHint')}</p>
                        </div>
                        <Button
                            className="success-button"
                            onClick={handleViewProfile}
                            size="lg"
                        >
                            {t('upload.viewProfile')}
                            <ArrowRight size={20} />
                        </Button>
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    // Upload Screen (when no images selected)
    if (selectedFiles.length === 0) {
        return createPortal(
            <div className="upload-modal-overlay" onClick={handleCancel}>
                <div
                    className={`upload-modal ${dragActive ? 'drag-active' : ''}`}
                    onClick={(e) => e.stopPropagation()}
                    {...modalDragHandlers}
                >
                    {renderModalHeader(false)}

                    {/* Upload Area */}
                    <div className="upload-modal-content">
                        <div
                            className={`upload-dropzone ${dragActive ? 'drag-active' : ''}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="upload-icon-large">
                                <Upload size={64} />
                            </div>
                            <div className="upload-text">
                                <span className="upload-main-text">{t('upload.addImage')}</span>
                                <span className="upload-tag">JPEG</span>
                            </div>
                            <div className="upload-text">
                                <span className="upload-main-text">{t('upload.orIllustration')}</span>
                                <span className="upload-tag">SVG</span>
                            </div>
                            <p className="upload-instruction">{t('upload.dragDrop')}</p>
                            <p className="upload-browse">
                                <Button
                                    type="button"
                                    variant="link"
                                    className="upload-browse-link"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        fileInputRef.current?.click();
                                    }}
                                >
                                    {t('upload.browse')}
                                </Button> {t('upload.browseHint')}
                            </p>
                            <p className="upload-max-size">
                                {t('upload.maxSize')}: {settings.maxUploadSize} MB
                            </p>
                            <input
                                type="file"
                                accept={settings.allowedFileTypes.map(type => 
                                    MIME_TYPE_MAP[type] || `image/${type}`
                                ).join(',')}
                                capture="environment"
                                className="upload-file-input"
                                multiple={true}
                                onChange={handleFileInput}
                                ref={fileInputRef}
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="upload-modal-footer">
                        <div className="footer-buttons">
                            <Button type="button" variant="outline" onClick={handleCancel}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="button" disabled>
                                {t('common.next')}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    // Form View (when image is selected)
    return createPortal(
        <div className="upload-modal-overlay" onClick={handleCancel}>
            <div
                className={`upload-modal ${dragActive ? 'drag-active' : ''}`}
                onClick={(e) => e.stopPropagation()}
                {...modalDragHandlers}
            >
                {renderModalHeader(true)}

                {/* Content - Scrollable container with all images and their forms */}
                <div className="upload-modal-content upload-modal-content--scrollable">
                    {/* Header */}
                    <div className="upload-images-header">
                        <h3>
                            {t('upload.selected', { count: imagesData.length })}
                        </h3>
                    </div>

                    {/* Add More Images Card - Unsplash Style */}
                    {imagesData.length < 10 && (
                        <div
                            className="upload-add-more-card"
                            onClick={(e) => {
                                e.stopPropagation();
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.setAttribute('capture', 'environment');
                                input.multiple = true;
                                input.onchange = (event) => {
                                    const target = event.target as HTMLInputElement;
                                    if (target.files && target.files.length > 0) {
                                        const newFiles = Array.from(target.files);
                                        setSelectedFiles([...selectedFiles, ...newFiles]);
                                    }
                                };
                                input.click();
                            }}
                        >
                            <div className="upload-add-more-icon">
                                <Plus size={24} />
                            </div>
                            <p className="upload-add-more-text">
                                {t('upload.addMore') || 'Add more'}
                            </p>
                        </div>
                    )}

                    {/* Grid of images with individual forms */}
                    <div className="upload-images-grid">
                        {imagesData.map((imgData, index) => {
                            return (
                                <div
                                    key={`${imgData.file.name}-${imgData.file.size}-${index}`}
                                    className="upload-image-card"
                                    draggable={false}
                                    onDragEnter={(e) => e.stopPropagation()}
                                    onDragOver={(e) => e.stopPropagation()}
                                    onDragLeave={(e) => e.stopPropagation()}
                                >
                                    {/* Image Preview */}
                                    <UploadPreview
                                        imageData={imgData}
                                        index={index}
                                        onOrientationChange={(isPortrait) => {
                                            setImageOrientations((prev) => {
                                                const newMap = new Map(prev);
                                                newMap.set(index, isPortrait);
                                                return newMap;
                                            });
                                        }}
                                        onRemove={async () => {
                                            // If image was pre-uploaded, delete it from S3/R2
                                            if (imgData.preUploadData?.uploadKey) {
                                                try {
                                                    await imageService.deletePreUploadedFile(imgData.preUploadData.uploadKey);
                                                } catch (error) {
                                                    console.error('Failed to delete pre-uploaded file:', error);
                                                    // Continue with removal even if delete fails
                                                }
                                            }
                                            const newFiles = selectedFiles.filter((_, i) => i !== index);
                                            setSelectedFiles(newFiles);
                                            setImagesData(prev => prev.filter((_, i) => i !== index));
                                        }}
                                        onLocationUpdate={(location) => {
                                            updateImageData(index, 'location', location);
                                        }}
                                    />

                                    {/* Form Fields for this image */}
                                    <UploadForm
                                        imageData={imgData}
                                        index={index}
                                        categories={categories}
                                        loadingCategories={loadingCategories}
                                        onUpdate={updateImageData}
                                        onUpdateCoordinates={updateImageCoordinates}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer with Submit Button */}
                <div className="upload-modal-footer upload-modal-footer--form">
                    <div className="footer-buttons">
                        <Button type="button" variant="outline" onClick={handleCancel}>
                            {t('common.cancel')}
                        </Button>
                        <div
                            className="upload-submit-wrapper"
                            onMouseEnter={() => {
                                if (!isFormValid && !loading) {
                                    setShowTooltip(true);
                                }
                            }}
                            onMouseLeave={() => {
                                setShowTooltip(false);
                            }}
                        >
                            <Button
                                type="button"
                                onClick={handleSubmit}
                                disabled={loading || !isFormValid}
                                className="upload-submit-btn"
                            >
                                {loading ? t('upload.uploading') : t('upload.submit', { count: imagesData.length })}
                            </Button>
                            {showTooltip && !isFormValid && !loading && (
                                <div className="upload-submit-tooltip">
                                    {t('upload.fillRequired')} <span className="required-marker">*</span>
                                    <div className="upload-submit-tooltip-arrow" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default UploadModal;
