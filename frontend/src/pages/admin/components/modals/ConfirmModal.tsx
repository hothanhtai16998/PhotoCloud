import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { t } from '@/i18n';
import './ConfirmModal.css';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText,
    cancelText,
    variant = 'danger',
}: ConfirmModalProps) {
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

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <div className="confirm-modal-overlay" onClick={onClose}>
            <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="confirm-modal-header">
                    <h2>{title}</h2>
                    <button
                        className="confirm-modal-close"
                        onClick={onClose}
                        aria-label={t('common.close')}
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="confirm-modal-content">
                    <p>{message}</p>
                </div>
                <div className={`confirm-modal-actions confirm-modal-actions-${variant}`}>
                    <Button type="button" variant="outline" onClick={onClose}>
                        {cancelText || t('common.cancel')}
                    </Button>
                    <Button 
                        type="button" 
                        onClick={handleConfirm}
                        className={variant === 'danger' ? 'confirm-btn-danger' : variant === 'warning' ? 'confirm-btn-warning' : ''}
                    >
                        {confirmText || t('common.confirm')}
                    </Button>
                </div>
            </div>
        </div>
    );
}

