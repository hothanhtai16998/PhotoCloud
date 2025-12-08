import { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Trash2, Search } from 'lucide-react';
import { ConfirmModal } from '@/pages/admin/components/modals';
import { t } from '@/i18n';

interface Favorite {
    _id: string;
    user: {
        _id: string;
        displayName?: string;
        username?: string;
        email?: string;
    };
    image: {
        _id: string;
        imageTitle?: string;
    };
    createdAt: string;
}

export function AdminFavorites() {
    const { hasPermission, isSuperAdmin } = usePermissions();
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [favoriteToDelete, setFavoriteToDelete] = useState<{ userId: string; imageId: string } | null>(null);

    useEffect(() => {
        if (!isSuperAdmin() && !hasPermission('manageFavorites')) {
            toast.error(t('admin.noPermission'));
            return;
        }
        loadFavorites(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

    const loadFavorites = async (page = 1) => {
        try {
            // Don't block UI - load in background
            // setLoading(true);
            const data = await adminService.getAllFavorites({ page, limit: 20, search });
            setFavorites((data.favorites as Favorite[]) || []);
            setPagination(data.pagination);
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || t('admin.loadFailed'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFavorites(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const handleDeleteClick = (userId: string, imageId: string) => {
        setFavoriteToDelete({ userId, imageId });
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!favoriteToDelete) return;

        try {
            await adminService.deleteFavorite(favoriteToDelete.userId, favoriteToDelete.imageId);
            toast.success(t('admin.deleteSuccess'));
            loadFavorites(pagination.page);
            setShowDeleteModal(false);
            setFavoriteToDelete(null);
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || t('admin.deleteFailed'));
        }
    };

    // Show UI immediately - don't block
    // if (loading) {
    //     return <div className="admin-loading">{t('admin.loading')}</div>;
    // }

    return (
        <div className="admin-favorites">
            <div className="admin-header">
                <h1 className="admin-title">{t('admin.manageFavorites')}</h1>
            </div>

            <div className="admin-search">
                <div className="admin-search-input-wrapper">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder={t('admin.searchFavorites')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="admin-search-input"
                    />
                </div>
            </div>

            <div className="admin-table">
                <table>
                    <thead>
                        <tr>
                            <th>{t('admin.username')}</th>
                            <th>{t('admin.imageTitle')}</th>
                            <th>{t('admin.uploadDateLabel')}</th>
                            <th>{t('admin.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                            {favorites.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', padding: '40px' }}>
                                        {t('admin.noFavoritesData')}
                                    </td>
                                </tr>
                            ) : (
                                favorites.map((fav) => (
                                    <tr key={fav._id}>
                                        <td>{fav.user?.displayName || fav.user?.username || fav.user?.email}</td>
                                        <td>{fav.image?.imageTitle || 'N/A'}</td>
                                        <td>{new Date(fav.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDeleteClick(fav.user._id, fav.image._id)}
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setFavoriteToDelete(null);
                }}
                onConfirm={handleDeleteConfirm}
                title="Xóa yêu thích"
                message={t('admin.deleteConfirm')}
                confirmText="Xóa"
                cancelText="Hủy"
                variant="danger"
            />
        </div>
    );
}

