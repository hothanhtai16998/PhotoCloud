import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { Category } from '@/services/categoryService';
import { t } from '@/i18n';

interface EditCategoryModalProps {
    category: Category;
    onClose: () => void;
    onSave: (categoryId: string, updates: { name?: string; description?: string; isActive?: boolean }) => Promise<boolean>;
}

export function EditCategoryModal({ category, onClose, onSave }: EditCategoryModalProps) {
    const [name, setName] = useState(category.name);
    const [description, setDescription] = useState(category.description || '');
    const [isActive, setIsActive] = useState(category.isActive !== false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error(t('admin.categoryNameRequired2'));
            return;
        }
        await onSave(category._id, {
            name: name.trim() !== category.name ? name.trim() : undefined,
            description: description.trim() || '',
            isActive,
        });
    };

    return (
        <div className="admin-modal-overlay" onClick={onClose}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                <div className="admin-modal-header">
                    <h2>{t('admin.modalEditCategory')}</h2>
                    <button onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit} className="admin-modal-form">
                    <div className="admin-form-group">
                        <label>{t('admin.categoryNameLabel')}</label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                        <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
                            {t('admin.categoryNameChangeNote')}
                        </small>
                    </div>
                    <div className="admin-form-group">
                        <label>{t('admin.categoryDescriptionLabel')}</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                        />
                    </div>
                    <div className="admin-form-group">
                        <label className="admin-checkbox-label">
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                            />
                            {t('admin.activeLabel')}
                        </label>
                    </div>
                    <div className="admin-modal-actions">
                        <Button type="button" variant="outline" onClick={onClose}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit">{t('admin.save')}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

