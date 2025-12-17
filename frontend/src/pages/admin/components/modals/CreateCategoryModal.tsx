import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { t } from '@/i18n';

interface CreateCategoryModalProps {
    onClose: () => void;
    onSave: (data: { name: string; description?: string }) => Promise<boolean>;
}

export function CreateCategoryModal({ onClose, onSave }: CreateCategoryModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error(t('admin.categoryNameRequired'));
            return;
        }
        await onSave({ name: name.trim(), description: description.trim() || undefined });
    };

    return (
        <div className="admin-modal-overlay" onClick={onClose}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                <div className="admin-modal-header">
                    <h2>{t('admin.modalAddCategory')}</h2>
                    <button onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit} className="admin-modal-form">
                    <div className="admin-form-group">
                        <label>{t('admin.categoryNameLabel')}</label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder={t('admin.categoryNamePlaceholder')}
                        />
                    </div>
                    <div className="admin-form-group">
                        <label>{t('admin.categoryDescriptionLabel')}</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            placeholder={t('admin.categoryDescriptionPlaceholder')}
                        />
                    </div>
                    <div className="admin-modal-actions">
                        <Button type="button" variant="outline" onClick={onClose}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit">{t('admin.create')}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

