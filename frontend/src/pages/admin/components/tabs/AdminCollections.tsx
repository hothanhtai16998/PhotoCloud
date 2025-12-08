import { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Trash2, FolderDot } from 'lucide-react';
import { t } from '@/i18n';
import { ConfirmModal } from '@/pages/admin/components/modals';
import type { Pagination } from '@/types/common';

interface Collection {
    _id: string;
    name: string;
    description?: string;
    createdBy: {
        _id: string;
        username: string;
        displayName: string;
    };
    images: string[];
    isPublic: boolean;
    views: number;
    createdAt: string;
    updatedAt: string;
}

export function AdminCollections() {
    const [, setLoading] = useState(true);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, pages: 1, total: 0, limit: 20 });
    const [search, setSearch] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [collectionToDelete, setCollectionToDelete] = useState<{ id: string; name: string } | null>(null);

    const loadCollections = async (page: number = 1) => {
        try {
            // Don't block UI on initial load - only show loading for subsequent loads
            if (collections.length > 0) {
            setLoading(true);
            }
            const data = await adminService.getAllCollections({
                page,
                limit: 20,
                search: search.trim() || undefined,
            });
            setCollections((data.collections as Collection[]) || []);
            setPagination(data.pagination);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Lỗi khi tải danh sách bộ sưu tập'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCollections(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const handleDeleteClick = (collectionId: string, name: string) => {
        setCollectionToDelete({ id: collectionId, name });
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!collectionToDelete) return;

        try {
            await adminService.deleteCollection(collectionToDelete.id);
            toast.success(t('admin.deleteCollectionSuccess'));
            loadCollections(pagination.page);
            setShowDeleteModal(false);
            setCollectionToDelete(null);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Lỗi khi xóa bộ sưu tập'));
        }
    };

    const handleTogglePublic = async (collection: Collection) => {
        try {
            await adminService.updateCollection(collection._id, {
                isPublic: !collection.isPublic,
            });
            toast.success(!collection.isPublic ? t('admin.collectionMadePublic') : t('admin.collectionMadePrivate'));
            loadCollections(pagination.page);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Lỗi khi cập nhật bộ sưu tập'));
        }
    };

    // Show UI immediately - don't block initial load
    // if (loading && collections.length === 0) {
    //     return <div className="admin-loading">Đang tải danh sách bộ sưu tập...</div>;
    // }

    return (
        <div className="admin-collections">
            <div className="admin-header">
                <h1 className="admin-title">
                    <FolderDot size={24} />
                    {t('admin.collections')}
                </h1>
                <div className="admin-search">
                    <Search size={18} />
                    <Input
                        type="text"
                        placeholder={t('admin.searchCollections')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                loadCollections(1);
                            }
                        }}
                    />
                </div>
            </div>

            {collections.length === 0 ? (
                <div className="admin-empty">{t('admin.noCollections')}</div>
            ) : (
                <>
                    <div className="admin-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>{t('admin.collectionName')}</th>
                                    <th>{t('admin.description')}</th>
                                    <th>{t('admin.creator')}</th>
                                    <th>{t('admin.imageCount')}</th>
                                    <th>{t('admin.views')}</th>
                                    <th>{t('admin.status')}</th>
                                    <th>{t('admin.createdDate')}</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {collections.map((collection) => (
                                    <tr key={collection._id}>
                                        <td>{collection.name}</td>
                                        <td>{collection.description || '-'}</td>
                                        <td>
                                            {collection.createdBy?.displayName || collection.createdBy?.username || '-'}
                                        </td>
                                        <td>{collection.images?.length || 0}</td>
                                        <td>{collection.views || 0}</td>
                                        <td>
                                            <span
                                                className={`admin-status-badge ${collection.isPublic ? 'active' : 'banned'}`}
                                            >
                                                {collection.isPublic ? t('admin.public') : t('admin.private')}
                                            </span>
                                        </td>
                                        <td>{new Date(collection.createdAt).toLocaleDateString('vi-VN')}</td>
                                        <td>
                                            <div className="admin-actions">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleTogglePublic(collection)}
                                                    title={collection.isPublic ? t('admin.hideCollection') : t('admin.showCollection')}
                                                    className="admin-action-edit"
                                                >
                                                    {collection.isPublic ? t('admin.hide') : t('admin.show')}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDeleteClick(collection._id, collection.name)}
                                                    title="Xóa bộ sưu tập"
                                                    className="admin-action-delete"
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="admin-pagination">
                            <Button
                                variant="outline"
                                onClick={() => loadCollections(pagination.page - 1)}
                                disabled={pagination.page === 1}
                            >
                                Trước
                            </Button>
                            <span>
                                Trang {pagination.page} / {pagination.pages} (Tổng: {pagination.total})
                            </span>
                            <Button
                                variant="outline"
                                onClick={() => loadCollections(pagination.page + 1)}
                                disabled={pagination.page === pagination.pages}
                            >
                                Sau
                            </Button>
                        </div>
                    )}
                </>
            )}

            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setCollectionToDelete(null);
                }}
                onConfirm={handleDeleteConfirm}
                title="Xóa bộ sưu tập"
                message={collectionToDelete ? t('admin.deleteCollectionConfirm', { name: collectionToDelete.name }) : ''}
                confirmText={t('admin.delete')}
                cancelText={t('common.cancel')}
                variant="danger"
            />
        </div>
    );
}

