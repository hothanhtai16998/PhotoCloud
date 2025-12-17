import { useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { CreateCategoryModal, EditCategoryModal } from '../modals';
import { ConfirmModal } from '@/pages/admin/components/modals';
import type { Category } from '@/services/categoryService';
import { PermissionButton } from '../PermissionButton';
import { t } from '@/i18n';

interface AdminCategoriesProps {
    categories: Category[];
    creatingCategory: boolean;
    editingCategory: Category | null;
    onCreateClick: () => void;
    onEdit: (category: Category) => void;
    onDelete: (categoryId: string, categoryName: string) => void;
    onCloseCreate: () => void;
    onCloseEdit: () => void;
    onSaveCreate: (data: { name: string; description?: string }) => Promise<boolean>;
    onSaveEdit: (categoryId: string, updates: { name?: string; description?: string; isActive?: boolean }) => Promise<boolean>;
}

export function AdminCategories({
    categories,
    creatingCategory,
    editingCategory,
    onCreateClick,
    onEdit,
    onDelete,
    onCloseCreate,
    onCloseEdit,
    onSaveCreate,
    onSaveEdit,
}: AdminCategoriesProps) {
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null);

    const handleDeleteClick = (categoryId: string, categoryName: string) => {
        setCategoryToDelete({ id: categoryId, name: categoryName });
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!categoryToDelete) return;
        await onDelete(categoryToDelete.id, categoryToDelete.name);
        setShowDeleteModal(false);
        setCategoryToDelete(null);
    };

    return (
        <div className="admin-categories">
            <div className="admin-header">
                <h1 className="admin-title">{t('admin.manageCategories')}</h1>
                <PermissionButton
                    permission="createCategories"
                    action={t('admin.createCategory')}
                    onClick={onCreateClick}
                    className="admin-add-category-btn"
                >
                    {t('admin.addCategory')}
                </PermissionButton>
            </div>

            <div className="admin-table">
                <table>
                    <thead>
                        <tr>
                            <th>{t('admin.name')}</th>
                            <th>{t('admin.description')}</th>
                            <th>{t('admin.currentImageCount')}</th>
                            <th>{t('admin.status')}</th>
                            <th>{t('admin.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map((cat) => (
                            <tr key={cat._id}>
                                <td><strong>{cat.name}</strong></td>
                                <td>{cat.description || '-'}</td>
                                <td>{cat.imageCount || 0}</td>
                                <td>
                                    <span className={`admin-status-badge ${cat.isActive ? 'admin' : 'none'}`}>
                                        {cat.isActive ? t('admin.activeStatus') : t('admin.inactive')}
                                    </span>
                                </td>
                                <td>
                                    <div className="admin-actions">
                                        <PermissionButton
                                            permission="editCategories"
                                            action={t('admin.editCategory')}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onEdit(cat)}
                                            className="admin-action-edit"
                                        >
                                            <Edit2 size={16} />
                                        </PermissionButton>
                                        <PermissionButton
                                            permission="deleteCategories"
                                            action={t('admin.deleteCategory')}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDeleteClick(cat._id, cat.name)}
                                            className="admin-action-delete"
                                        >
                                            <Trash2 size={16} />
                                        </PermissionButton>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {categories.length === 0 && (
                <div className="admin-empty-state">
                    <p>{t('admin.noCategories')}</p>
                </div>
            )}

            {creatingCategory && (
                <CreateCategoryModal
                    onClose={onCloseCreate}
                    onSave={onSaveCreate}
                />
            )}

            {editingCategory && (
                <EditCategoryModal
                    category={editingCategory}
                    onClose={onCloseEdit}
                    onSave={onSaveEdit}
                />
            )}

            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setCategoryToDelete(null);
                }}
                onConfirm={handleDeleteConfirm}
                title={t('admin.deleteCategory')}
                message={categoryToDelete ? t('admin.deleteCategoryConfirm', { name: categoryToDelete.name }) : ''}
                confirmText={t('admin.delete')}
                cancelText={t('common.cancel')}
                variant="danger"
            />
        </div>
    );
}

