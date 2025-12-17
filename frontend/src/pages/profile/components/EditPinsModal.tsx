import { useState, useEffect, useCallback, useMemo } from 'react';
import { X } from 'lucide-react';
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
    const [originalPinnedImages, setOriginalPinnedImages] = useState<Image[]>(currentPinnedImages);

    useEffect(() => {
        if (isOpen) {
            // Fetch fresh pinned images from server to avoid stale data
            const loadPinnedImages = async () => {
                try {
                    // Pass userId explicitly to avoid authentication issues
                    const freshPinned = await pinnedImagesService.getPinnedImages(userId);
                    setPinnedImages(freshPinned);
                    setOriginalPinnedImages(freshPinned);
                } catch (error) {
                    console.error('Failed to load pinned images:', error);
                    // Fallback to currentPinnedImages if fetch fails
                    setPinnedImages(currentPinnedImages);
                    setOriginalPinnedImages(currentPinnedImages);
                }
            };
            loadPinnedImages();
            loadAvailableImages();
        }
    }, [isOpen, currentPinnedImages, userId]);

    // Compute hasChanges by comparing current state with original state
    const hasChanges = useMemo(() => {
        if (pinnedImages.length !== originalPinnedImages.length) {
            return true;
        }
        const currentIds = new Set(pinnedImages.map(img => img._id));
        const originalIds = new Set(originalPinnedImages.map(img => img._id));
        if (currentIds.size !== originalIds.size) {
            return true;
        }
        for (const id of currentIds) {
            if (!originalIds.has(id)) {
                return true;
            }
        }
        return false;
    }, [pinnedImages, originalPinnedImages]);

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
    }, [pinnedImages]);

    const handleClearAll = () => {
        setPinnedImages([]);
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            
            // Validate: pinned images should not exceed 6
            if (pinnedImages.length > 6) {
                toast.error(t('profile.maxPinnedImages') || 'Maximum of 6 pinned images allowed');
                setSaving(false);
                return;
            }
            
            // Get current pinned image IDs
            const currentPinnedIds = new Set(currentPinnedImages.map(img => img._id));
            const newPinnedIds = new Set(pinnedImages.map(img => img._id));
            
            // Step 1: Unpin removed images FIRST (to free up slots)
            for (const image of currentPinnedImages) {
                if (!newPinnedIds.has(image._id)) {
                    await pinnedImagesService.unpinImage(image._id);
                }
            }
            
            // Step 2: Pin new images (after unpinning, we should have space)
            for (const image of pinnedImages) {
                if (!currentPinnedIds.has(image._id)) {
                    try {
                        await pinnedImagesService.pinImage(image._id);
                    } catch (error: any) {
                        // If max limit reached, it means we couldn't unpin enough or there's a race condition
                        if (error?.response?.status === 400) {
                            const errorMessage = error.response?.data?.message || '';
                            if (errorMessage.includes('Maximum of 6')) {
                                toast.error(t('profile.maxPinnedImages') || 'Maximum of 6 pinned images allowed');
                                setSaving(false);
                                return; // Stop the save operation
                            } else if (errorMessage.includes('already pinned')) {
                                // Image is already pinned, continue
                                console.warn(`Image ${image._id} is already pinned`);
                            } else {
                                console.warn(`Failed to pin image ${image._id}:`, errorMessage);
                            }
                            // Continue with other images
                            continue;
                        }
                        throw error; // Re-throw other errors
                    }
                }
            }
            
            // Step 3: Reorder pinned images to match the desired order
            if (pinnedImages.length > 0) {
                const imageIds = pinnedImages.map(img => img._id);
                await pinnedImagesService.reorderPinnedImages(imageIds);
            }
            
            // Step 4: Get updated list from server
            const updated = await pinnedImagesService.getPinnedImages(userId);
            setPinnedImages(updated);
            setOriginalPinnedImages(updated);
            onPinnedImagesUpdate(updated);
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
                            disabled={saving || !hasChanges || (pinnedImages.length === 0 && originalPinnedImages.length === 0)}
                        >
                            {saving ? (t('common.saving') || 'Saving...') : (t('common.save') || 'Save')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

