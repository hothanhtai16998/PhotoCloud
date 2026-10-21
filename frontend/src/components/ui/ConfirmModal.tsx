import { useEffect, useRef, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { t } from '@/i18n';
import './ConfirmModal.css';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
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
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = useCallback(() => {
    if (!submitting.current) { setError(null); onClose(); }
  }, [onClose]);

  // ESC + focus trap
  useEffect(() => {
    if (!isOpen) return;

    const previousActive = document.activeElement as HTMLElement | null;
    // Focus the dialog so screen readers announce it
    dialogRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) {
          e.preventDefault();
          dialogRef.current.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      if (previousActive?.isConnected) previousActive.focus();
    };
  }, [isOpen, close]);

  const handleConfirm = useCallback(async () => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Không thể hoàn tất. Vui lòng thử lại.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }, [onConfirm, onClose]);

  if (!isOpen) return null;

  const Icon = variant === 'danger' ? AlertTriangle : variant === 'warning' ? AlertCircle : Info;
  const isDanger = variant === 'danger';

  return (
    <div className="confirm-modal-overlay" onClick={close}>
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-message"
        aria-busy={busy}
        tabIndex={-1}
        className={`confirm-modal confirm-modal-${variant}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-modal-header">
          <Icon size={20} aria-hidden="true" className={`confirm-modal-icon confirm-modal-icon-${variant}`} />
          <h2 id="confirm-modal-title" className="confirm-modal-title">{title}</h2>
        </div>
        <p id="confirm-modal-message" className="confirm-modal-message">{message}</p>
        {error && <p role="alert">{error}</p>}
        <div className="confirm-modal-actions">
          <Button type="button" variant="ghost" onClick={close} disabled={busy} className="confirm-modal-cancel">
            {cancelText || t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            loading={busy}
            className={isDanger ? 'confirm-modal-confirm-danger' : 'confirm-modal-confirm-primary'}
          >
            {confirmText || t('common.confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
}
