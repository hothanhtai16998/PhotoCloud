import { useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
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

/**
 * Compact confirm dialog phong cách inline-action:
 * - Card 360px, padding gọn (20px)
 * - Không shadow nặng, không gradient, không slideUp kịch tính
 * - Icon variant để phân biệt danger/warning/info chỉ bằng 1 dấu hiệu
 * - Action buttons theo pattern giống các nút Like/Share: ghost + filled, không đè outline
 */
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
  const dialogRef = useRef<HTMLDivElement>(null);

  // ESC + focus trap
  useEffect(() => {
    if (!isOpen) return;

    const previousActive = document.activeElement as HTMLElement | null;
    // Focus the dialog so screen readers announce it
    dialogRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
      previousActive?.focus();
    };
  }, [isOpen, onClose]);

  const handleConfirm = useCallback(() => {
    onConfirm();
    onClose();
  }, [onConfirm, onClose]);

  if (!isOpen) return null;

  const Icon = variant === 'danger' ? AlertTriangle : variant === 'warning' ? AlertCircle : Info;
  const isDanger = variant === 'danger';

  return (
    <div className="confirm-modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-message"
        tabIndex={-1}
        className={`confirm-modal confirm-modal-${variant}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-modal-header">
          <Icon size={20} aria-hidden="true" className={`confirm-modal-icon confirm-modal-icon-${variant}`} />
          <h2 id="confirm-modal-title" className="confirm-modal-title">{title}</h2>
        </div>
        <p id="confirm-modal-message" className="confirm-modal-message">{message}</p>
        <div className="confirm-modal-actions">
          <Button type="button" variant="ghost" onClick={onClose} className="confirm-modal-cancel">
            {cancelText || t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className={isDanger ? 'confirm-modal-confirm-danger' : 'confirm-modal-confirm-primary'}
          >
            {confirmText || t('common.confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
}
