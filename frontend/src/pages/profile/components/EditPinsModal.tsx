import { useState, useEffect, useCallback } from 'react';
import { X, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Image } from '@/types/image';
import { pinnedImagesService } from '@/services/pinnedImagesService';
import { imageService } from '@/services/imageService';
import { NoFlashGrid } from '@/components/NoFlashGrid';
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
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setPinnedImages(currentPinnedImages);
            setHasChanges(false);
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

    const handleTogglePin = useCallback((image: Image) => {
        const isPinned = pinnedImages.some(img => img._id === image._id);
        
        if (isPinned) {
            // Unpin
            setPinnedImages(prev => prev.filter(img => img._id !== image._id));
        } else {
            // Pin
            if (pinnedImages.length >= 6) {
                toast.error(t('profile.maxPinnedImages') || 'Maximum of 6 pinned images allowed');
                return;
            }
            setPinnedImages(prev => [...prev, image]);
        }
        setHasChanges(true);
    }, [pinnedImages]);

    const handleClearAll = () => {
        setPinnedImages([]);
        setHasChanges(true);
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            
            // Get current pinned image IDs
            const currentPinnedIds = new Set(currentPinnedImages.map(img => img._id));
            const newPinnedIds = new Set(pinnedImages.map(img => img._id));
            
            // Unpin removed images
            for (const image of currentPinnedImages) {
                if (!newPinnedIds.has(image._id)) {
                    await pinnedImagesService.unpinImage(image._id);
                }
            }
            
            // Pin new images
            for (const image of pinnedImages) {
                if (!currentPinnedIds.has(image._id)) {
                    await pinnedImagesService.pinImage(image._id);
                }
            }
            
            // Reorder if needed
            if (pinnedImages.length > 0) {
                const imageIds = pinnedImages.map(img => img._id);
                await pinnedImagesService.reorderPinnedImages(imageIds);
            }
            
            // Get updated list
            const updated = await pinnedImagesService.getPinnedImages();
            setPinnedImages(updated);
            onPinnedImagesUpdate(updated);
            setHasChanges(false);
            toast.success(t('profile.pinsSaved') || 'Pinned images saved successfully');
            onClose();
        } catch (error) {
            console.error('Failed to save pinned images:', error);
            toast.error(t('profile.saveFailed') || 'Failed to save pinned images');
        } finally {
            setSaving(false);
        }
    };

    // Mark images as pinned for styling
    const allImages = availableImages.map(img => ({
        ...img,
        isPinned: pinnedImages.some(pinned => pinned._id === img._id)
    }));
    const pinsLeft = 6 - pinnedImages.length;

    // Handle image click in NoFlashGrid - toggle pin status
    const handleImageClick = useCallback((image: Image, _index: number) => {
        handleTogglePin(image);
    }, [handleTogglePin]);

    // Load data callback for NoFlashGrid
    const loadData = useCallback(async () => {
        if (availableImages.length === 0 && !loading) {
            await loadAvailableImages();
        }
    }, [availableImages.length, loading, userId]);

    if (!isOpen) return null;

    return (
        <div className="edit-pins-modal-overlay" onClick={onClose}>
            <div className="edit-pins-modal" onClick={(e) => e.stopPropagation()}>
                <div className="edit-pins-modal-header">
                    <h2>{t('profile.editPins') || 'Edit pins'}</h2>
                    <div className="edit-pins-modal-header-right">
                        <span className="edit-pins-count">{pinsLeft} {t('profile.pinsLeft') || 'pins left'}</span>
                        <button className="edit-pins-modal-close" onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="edit-pins-modal-content">
                    {allImages.length === 0 && !loading ? (
                        <p className="edit-pins-empty">{t('profile.noAvailableImages') || 'No available images to pin.'}</p>
                    ) : (
                        <NoFlashGrid
                            images={allImages}
                            loading={loading}
                            onLoadData={loadData}
                            onImageClick={handleImageClick}
                            className="edit-pins-noflash-grid"
                        />
                    )}
                </div>

                <div className="edit-pins-modal-footer">
                    <button 
                        className="edit-pins-clear-all" 
                        onClick={handleClearAll}
                        disabled={pinnedImages.length === 0 || saving}
                    >
                        {t('profile.clearAll') || 'Clear all'}
                    </button>
                    <div className="edit-pins-modal-footer-right">
                        <Button variant="outline" onClick={onClose} disabled={saving}>
                            {t('common.cancel') || 'Cancel'}
                        </Button>
                        <Button 
                            variant="default" 
                            onClick={handleSave} 
                            disabled={saving || !hasChanges}
                        >
                            {saving ? (t('common.saving') || 'Saving...') : (t('common.save') || 'Save')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

