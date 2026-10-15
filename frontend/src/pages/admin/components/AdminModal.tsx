import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import './AdminModal.css';
export function AdminModal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = 'md',
  className = '',
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = oldOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  if (!open) return null;
  return createPortal(
    <dialog
      ref={ref}
      className={'admin-modal size-' + size + ' ' + className}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <header className="admin-modal-header">
        <div>
          <h2 id={titleId}>{title}</h2>
          {description && <p id={descId}>{description}</p>}
        </div>
        <button
          type="button"
          className="admin-table-action"
          onClick={onClose}
          aria-label="Đóng hộp thoại"
        >
          <X size={21} />
        </button>
      </header>
      <div className="admin-modal-body">{children}</div>
      {footer && <footer className="admin-modal-footer">{footer}</footer>}
    </dialog>,
    document.body
  );
}
