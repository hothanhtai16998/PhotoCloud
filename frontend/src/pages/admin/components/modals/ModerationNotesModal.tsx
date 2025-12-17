import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';
import { t } from '@/i18n';
import './ModerationNotesModal.css';

interface ModerationNotesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (notes: string | undefined) => void;
    title?: string;
    placeholder?: string;
    isOptional?: boolean;
}

export function ModerationNotesModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    placeholder,
    isOptional = true,
}: ModerationNotesModalProps) {
    const [notes, setNotes] = useState('');

    // Reset notes when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setNotes('');
        }
    }, [isOpen]);

    // Handle ESC key
    useEffect(() => {
        if (!isOpen) return;
        
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedNotes = notes.trim();
        onConfirm(isOptional && !trimmedNotes ? undefined : trimmedNotes || undefined);
    };

    const handleCancel = () => {
        setNotes('');
        onClose();
    };

    return (
        <div className="moderation-notes-modal-overlay" onClick={handleCancel}>
            <div className="moderation-notes-modal" onClick={(e) => e.stopPropagation()}>
                <div className="moderation-notes-modal-header">
                    <h2>{title || t('admin.moderationNotes')}</h2>
                    <button
                        className="moderation-notes-modal-close"
                        onClick={handleCancel}
                        aria-label={t('common.close')}
                    >
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="moderation-notes-modal-form">
                    <div className="moderation-notes-form-group">
                        <label>
                            {t('admin.moderationNotes')}
                            {isOptional && <span className="optional-label"> ({t('common.optional')})</span>}
                        </label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={placeholder || t('admin.moderationNotesPlaceholder') || 'Nhập ghi chú kiểm duyệt (tùy chọn)...'}
                            rows={4}
                            className="moderation-notes-textarea"
                            autoFocus
                        />
                    </div>
                    <div className="moderation-notes-modal-actions">
                        <Button type="button" variant="outline" onClick={handleCancel}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit">
                            {t('common.confirm') || 'Xác nhận'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

