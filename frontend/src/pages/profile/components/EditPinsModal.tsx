import { useState, useEffect } from 'react';
import { X, GripVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { Image } from '@/types/image';
import { pinnedImagesService } from '@/services/pinnedImagesService';
import { imageService } from '@/services/imageService';
import ProgressiveImage from '@/components/ProgressiveImage';
import { t } from '@/i18n';
import './EditPinsModal.css';

interface EditPinsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPinnedImages: Image[];
    onPinnedImagesUpdate: (images: Image[]) => void;
    userId: string;
}

export function EditPinsModal({
    isOpen,
    onClose,
    currentPinnedImages,
    onPinnedImagesUpdate,
    userId,
}: EditPinsModalProps) {
    const [pinnedImages, setPinnedImages] = useState<Image[]>(currentPinnedImages);
    const [availableImages, setAvailableImages] = useState<Image[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            setPinnedImages(currentPinnedImages);
            loadAvailableImages();
        }
    }, [isOpen, currentPinnedImages]);

    const loadAvailableImages = async () => {
        try {
            setLoading(true);
            const response = await imageService.fetchUserImages(userId);
            setAvailableImages(response.images || []);
        } catch (error) {
            console.error('Failed to load images:', error);
            toast.error(t('profile.loadImagesFailed') || 'Failed to load images');
        } finally {
            setLoading(false);
        }
    };

    const handlePinImage = async (image: Image) => {
        if (pinnedImages.length >= 6) {
            toast.error(t('profile.maxPinnedImages') || 'Maximum of 6 pinned images allowed');
            return;
        }

        if (pinnedImages.some(img => img._id === image._id)) {
            toast.error(t('profile.imageAlreadyPinned') || 'Image is already pinned');
            return;
        }

        try {
            setSaving(true);
            const updated = await pinnedImagesService.pinImage(image._id);
            setPinnedImages(updated);
            onPinnedImagesUpdate(updated);
            toast.success(t('profile.imagePinned') || 'Image pinned successfully');
        } catch (error) {
            console.error('Failed to pin image:', error);
            toast.error(t('profile.pinImageFailed') || 'Failed to pin image');
        } finally {
            setSaving(false);
        }
    };

    const handleUnpinImage = async (imageId: string) => {
        try {
            setSaving(true);
            const updated = await pinnedImagesService.unpinImage(imageId);
            setPinnedImages(updated);
            onPinnedImagesUpdate(updated);
            toast.success(t('profile.imageUnpinned') || 'Image unpinned successfully');
        } catch (error) {
            console.error('Failed to unpin image:', error);
            toast.error(t('profile.unpinImageFailed') || 'Failed to unpin image');
        } finally {
            setSaving(false);
        }
    };

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newPinnedImages = [...pinnedImages];
        const draggedItem = newPinnedImages[draggedIndex];
        if (!draggedItem) return;
        newPinnedImages.splice(draggedIndex, 1);
        newPinnedImages.splice(index, 0, draggedItem);
        setPinnedImages(newPinnedImages);
        setDraggedIndex(index);
    };

    const handleDragEnd = async () => {
        if (draggedIndex === null) return;

        try {
            setSaving(true);
            const imageIds = pinnedImages.map(img => img._id);
            const updated = await pinnedImagesService.reorderPinnedImages(imageIds);
            setPinnedImages(updated);
            onPinnedImagesUpdate(updated);
            toast.success(t('profile.pinsReordered') || 'Pinned images reordered');
        } catch (error) {
            console.error('Failed to reorder pinned images:', error);
            toast.error(t('profile.reorderFailed') || 'Failed to reorder pinned images');
            // Reload to get correct order
            const current = await pinnedImagesService.getPinnedImages();
            setPinnedImages(current);
            onPinnedImagesUpdate(current);
        } finally {
            setSaving(false);
            setDraggedIndex(null);
        }
    };

    const unpinnedImages = availableImages.filter(
        img => !pinnedImages.some(pinned => pinned._id === img._id)
    );

    if (!isOpen) return null;

    return (
        <div className="edit-pins-modal-overlay" onClick={onClose}>
            <div className="edit-pins-modal" onClick={(e) => e.stopPropagation()}>
                <div className="edit-pins-modal-header">
                    <h2>{t('profile.editPins') || 'Edit Pinned Images'}</h2>
                    <button className="edit-pins-modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="edit-pins-modal-content">
                    {/* Current Pinned Images */}
                    <div className="edit-pins-section">
                        <h3>{t('profile.pinnedImages') || 'Pinned Images'} ({pinnedImages.length}/6)</h3>
                        {pinnedImages.length === 0 ? (
                            <p className="edit-pins-empty">{t('profile.noPinnedImages') || 'No pinned images. Select images below to pin them.'}</p>
                        ) : (
                            <div className="edit-pins-grid">
                                {pinnedImages.map((image, index) => (
                                    <div
                                        key={image._id}
                                        className="edit-pins-item"
                                        draggable
                                        onDragStart={() => handleDragStart(index)}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <div className="edit-pins-item-drag">
                                            <GripVertical size={16} />
                                        </div>
                                        <ProgressiveImage
                                            src={image.imageUrl}
                                            thumbnailUrl={image.thumbnailUrl}
                                            smallUrl={image.smallUrl}
                                            regularUrl={image.regularUrl}
                                            alt={image.imageTitle || 'Pinned image'}
                                            className="edit-pins-item-image"
                                        />
                                        <button
                                            className="edit-pins-item-remove"
                                            onClick={() => handleUnpinImage(image._id)}
                                            disabled={saving}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <div className="edit-pins-item-number">{index + 1}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Available Images to Pin */}
                    <div className="edit-pins-section">
                        <h3>{t('profile.availableImages') || 'Available Images'}</h3>
                        {loading ? (
                            <div className="edit-pins-grid">
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <Skeleton key={i} className="edit-pins-item-skeleton" />
                                ))}
                            </div>
                        ) : unpinnedImages.length === 0 ? (
                            <p className="edit-pins-empty">{t('profile.noAvailableImages') || 'No available images to pin.'}</p>
                        ) : (
                            <div className="edit-pins-grid">
                                {unpinnedImages.map((image) => (
                                    <div
                                        key={image._id}
                                        className="edit-pins-item edit-pins-item-available"
                                        onClick={() => handlePinImage(image)}
                                    >
                                        <ProgressiveImage
                                            src={image.imageUrl}
                                            thumbnailUrl={image.thumbnailUrl}
                                            smallUrl={image.smallUrl}
                                            regularUrl={image.regularUrl}
                                            alt={image.imageTitle || 'Image'}
                                            className="edit-pins-item-image"
                                        />
                                        <div className="edit-pins-item-add">
                                            <span>+</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="edit-pins-modal-footer">
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        {t('common.close') || 'Close'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

