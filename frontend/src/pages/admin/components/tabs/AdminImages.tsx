import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Trash2, CheckCircle, XCircle, Flag, X } from 'lucide-react';
import { adminService, type AdminImage } from '@/services/adminService';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils';
import { PermissionButton } from '../PermissionButton';
import { t } from '@/i18n';
import type { Category } from '@/services/categoryService';
import { ModerationNotesModal } from '../modals/ModerationNotesModal';
import { ConfirmModal } from '@/pages/admin/components/modals';

interface AdminImagesProps {
    images: AdminImage[];
    pagination: { page: number; pages: number; total: number };
    search: string;
    onSearchChange: (value: string) => void;
    onSearch: () => void;
    onPageChange: (page: number) => void;
    onDelete: (imageId: string, imageTitle: string) => void;
    onImageUpdated?: () => void;
    categories?: Category[];
}

export function AdminImages({
    images,
    pagination,
    search,
    onSearchChange,
    onSearch,
    onPageChange,
    onDelete,
    onImageUpdated,
    categories = [],
}: AdminImagesProps) {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [updatingCategory, setUpdatingCategory] = useState<string | null>(null);
    const [moderationModal, setModerationModal] = useState<{
        isOpen: boolean;
        imageId: string;
        status: 'approved' | 'rejected' | 'flagged';
    } | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [imageToDelete, setImageToDelete] = useState<{ id: string; title: string } | null>(null);

    // Close modal on ESC key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedImage(null);
            }
        };
        if (selectedImage) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [selectedImage]);

    const handleModerate = (imageId: string, status: 'approved' | 'rejected' | 'flagged', imageCategory?: string | { _id: string; name: string } | null) => {
        // Check if trying to approve without category
        if (status === 'approved') {
            const hasCategory = imageCategory && (
                typeof imageCategory === 'string' ||
                (typeof imageCategory === 'object' && imageCategory._id)
            );
            if (!hasCategory) {
                toast.error(t('admin.approveRequiresCategory'));
                return;
            }
        }

        // Open modal for notes (optional for approve, required for reject/flag)
        setModerationModal({
            isOpen: true,
            imageId,
            status,
        });
    };

    const handleModerationConfirm = async (notes: string | undefined) => {
        if (!moderationModal) return;

        try {
            await adminService.moderateImage(moderationModal.imageId, moderationModal.status, notes);
            const successMessage = moderationModal.status === 'approved'
                ? t('admin.approveSuccess')
                : moderationModal.status === 'rejected'
                    ? t('admin.rejectSuccess')
                    : t('admin.flagSuccess');
            toast.success(successMessage);
            setModerationModal(null);
            onImageUpdated?.();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, t('admin.moderationFailed')));
        }
    };

    const handleCategoryChange = async (imageId: string, categoryId: string | null) => {
        setUpdatingCategory(imageId);
        try {
            await adminService.updateImage(imageId, { imageCategory: categoryId });
            toast.success(t('admin.categoryUpdateSuccess') || 'Category updated successfully');
            onImageUpdated?.();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, t('admin.categoryUpdateFailed') || 'Failed to update category'));
        } finally {
            setUpdatingCategory(null);
        }
    };

    const getCurrentCategoryId = (img: AdminImage): string | null => {
        if (!img.imageCategory) return null;
        if (typeof img.imageCategory === 'string') return img.imageCategory;
        return img.imageCategory._id || null;
    };
    return (
        <div className="admin-images">
            <div className="admin-header">
                <h1 className="admin-title">{t('admin.manageImages')}</h1>
                <div className="admin-search">
                    <Search size={20} />
                    <Input
                        placeholder={t('admin.searchImage')}
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                onSearch();
                            }
                        }}
                    />
                    <Button onClick={onSearch}>{t('admin.search')}</Button>
                </div>
            </div>

            <div className="admin-images-grid">
                {images.map((img) => (
                    <div key={img._id} className="admin-image-card">
                        <img
                            src={img.imageUrl}
                            alt={img.imageTitle}
                            onClick={() => setSelectedImage(img.imageUrl)}
                            style={{ cursor: 'pointer' }}
                        />
                        <div className="admin-image-info">
                            <h3>{img.imageTitle}</h3>
                            <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap' }}>
                                    {t('admin.categoryLabel2')}
                                    {!getCurrentCategoryId(img) && (
                                        <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
                                    )}
                                </label>
                                <select
                                    value={getCurrentCategoryId(img) || ''}
                                    onChange={(e) => handleCategoryChange(img._id, e.target.value || null)}
                                    disabled={updatingCategory === img._id}
                                    style={{
                                        flex: '1',
                                        maxWidth: '200px',
                                        padding: '6px 8px',
                                        border: '1px solid #e5e5e5',
                                        borderRadius: '4px',
                                        fontSize: '14px',
                                        backgroundColor: updatingCategory === img._id ? '#f5f5f5' : 'white',
                                        cursor: updatingCategory === img._id ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    <option value="">{t('admin.addCategory')}</option>
                                    {categories
                                        .filter(cat => cat.isActive !== false)
                                        .map(cat => (
                                            <option key={cat._id} value={cat._id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                </select>
                            </div>
                            <p>{t('admin.uploaderLabel')} {img.uploadedBy.displayName || img.uploadedBy.username}</p>
                            <p>{t('admin.uploadDateLabel')} {img.createdAt}</p>
                            {img.moderationStatus && (
                                <p className="moderation-status">
                                    {t('admin.moderationStatus')} <span className={`moderation-badge ${img.moderationStatus}`}>
                                        {img.moderationStatus === 'approved' ? t('admin.approved') :
                                            img.moderationStatus === 'rejected' ? t('admin.rejected') :
                                                img.moderationStatus === 'flagged' ? t('admin.flagged') : t('admin.pending')}
                                    </span>
                                </p>
                            )}
                            <div className="admin-image-actions">
                                {/* Show Approve button only if status is NOT approved (pending, rejected, or flagged) */}
                                {img.moderationStatus !== 'approved' && (
                                    <PermissionButton
                                        permission="moderateImages"
                                        action={t('admin.approveImage')}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleModerate(img._id, 'approved', img.imageCategory)}
                                        className="admin-action-approve"
                                    >
                                        <CheckCircle size={16} /> {t('admin.approve')}
                                    </PermissionButton>
                                )}
                                {/* Show Reject button only if status is NOT rejected (pending, approved, or flagged) */}
                                {img.moderationStatus !== 'rejected' && (
                                    <PermissionButton
                                        permission="moderateImages"
                                        action={t('admin.rejectImage')}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleModerate(img._id, 'rejected')}
                                        className="admin-action-reject"
                                    >
                                        <XCircle size={16} /> {t('admin.reject')}
                                    </PermissionButton>
                                )}
                                {/* Show Flag button only if status is NOT flagged (pending, approved, or rejected) */}
                                {img.moderationStatus !== 'flagged' && (
                                    <PermissionButton
                                        permission="moderateImages"
                                        action={t('admin.flagImage')}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleModerate(img._id, 'flagged')}
                                        className="admin-action-flag"
                                    >
                                        <Flag size={16} /> {t('admin.flag')}
                                    </PermissionButton>
                                )}
                                <PermissionButton
                                    permission="deleteImages"
                                    action={t('admin.deleteImage')}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setImageToDelete({ id: img._id, title: img.imageTitle });
                                        setShowDeleteModal(true);
                                    }}
                                    className="admin-action-delete"
                                >
                                    <Trash2 size={16} /> {t('admin.deleteImage')}
                                </PermissionButton>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {pagination.pages > 1 && (
                <div className="admin-pagination">
                    <Button
                        variant="outline"
                        disabled={pagination.page === 1}
                        onClick={() => onPageChange(pagination.page - 1)}
                    >
                        {t('admin.previous')}
                    </Button>
                    <span>
                        {t('admin.pageOf', { current: pagination.page, total: pagination.pages })}
                    </span>
                    <Button
                        variant="outline"
                        disabled={pagination.page === pagination.pages}
                        onClick={() => onPageChange(pagination.page + 1)}
                    >
                        {t('admin.next')}
                    </Button>
                </div>
            )}

            {/* Fullscreen Image Viewer */}
            {selectedImage && (
                <div
                    className="admin-image-viewer-overlay"
                    onClick={() => setSelectedImage(null)}
                >
                    <button
                        className="admin-image-viewer-close"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImage(null);
                        }}
                        aria-label="Close"
                    >
                        <X size={24} />
                    </button>
                    <img
                        src={selectedImage}
                        alt="Fullscreen view"
                        className="admin-image-viewer-image"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            {/* Delete Image Modal */}
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setImageToDelete(null);
                }}
                onConfirm={async () => {
                    if (imageToDelete) {
                        await onDelete(imageToDelete.id, imageToDelete.title);
                        setShowDeleteModal(false);
                        setImageToDelete(null);
                    }
                }}
                title={t('admin.deleteImage')}
                message={imageToDelete ? t('admin.deleteImageConfirm', { title: imageToDelete.title || t('image.untitled') }) : ''}
                confirmText={t('admin.delete')}
                cancelText={t('common.cancel')}
                variant="danger"
            />

            {/* Moderation Notes Modal */}
            {moderationModal && (
                <ModerationNotesModal
                    isOpen={moderationModal.isOpen}
                    onClose={() => setModerationModal(null)}
                    onConfirm={handleModerationConfirm}
                    title={
                        moderationModal.status === 'approved'
                            ? t('admin.approveImage')
                            : moderationModal.status === 'rejected'
                                ? t('admin.rejectImage')
                                : t('admin.flagImage')
                    }
                    placeholder={t('admin.moderationNotesPlaceholder') || 'Nhập ghi chú kiểm duyệt (tùy chọn)...'}
                    isOptional={moderationModal.status === 'approved'}
                />
            )}
        </div>
    );
}

