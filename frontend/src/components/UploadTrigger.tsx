import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import type { UploadTranslator } from './upload/UploadTranslationContext';

const UploadModal = lazy(() => import('./UploadModal'));

/** Open the existing upload flow without leaving the current workspace. */
export function UploadTrigger({
  children,
  className,
  onUploaded,
  translate,
  language,
  languageControl,
}: {
  children: ReactNode;
  className?: string;
  onUploaded?: () => void;
  translate?: UploadTranslator;
  language?: 'vi' | 'en';
  languageControl?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // Custom workspace buttons keep their own layout and palette. The shared
  // Button adds global primary styles and wraps children, stacking the icon.
  const Trigger = className ? 'button' : Button;
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open || !onUploaded) return;
    window.addEventListener('imageUploaded', onUploaded);
    return () => window.removeEventListener('imageUploaded', onUploaded);
  }, [open, onUploaded]);
  return (
    <>
      <Trigger
        type="button"
        ref={trigger}
        className={className}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {children}
      </Trigger>
      {open &&
        createPortal(
          <Suspense fallback={null}>
            <UploadModal
              isOpen
              translate={translate}
              language={language}
              languageControl={languageControl}
              onClose={() => {
                setOpen(false);
                trigger.current?.focus();
              }}
            />
          </Suspense>,
          document.body
        )}
    </>
  );
}
