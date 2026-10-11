import { useLayoutEffect, useRef, type RefObject } from 'react';

export function useImageDialogFocus(ref: RefObject<HTMLDivElement | null>, enabled: boolean, paused = false): void {
  const pausedRef = useRef(paused);
  useLayoutEffect(() => { pausedRef.current = paused; }, [paused]);
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!enabled || !dialog) return;
    const previous = document.activeElement;
    const focusable = (): HTMLElement[] => Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    )).filter(node => node.tabIndex >= 0 && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden' && !node.closest('[inert], [hidden], [aria-hidden="true"]'));
    (dialog.querySelector<HTMLElement>('.image-page-close') || focusable()[0] || dialog).focus({ preventScroll: true });
    const keydown = (event: KeyboardEvent): void => {
      if (pausedRef.current || event.key !== 'Tab' || event.defaultPrevented) return;
      const active = document.activeElement;
      // Portalled child dialogs own their keyboard handling.
      const childDialog = active instanceof HTMLElement ? active.closest('[role="dialog"]') : null;
      if (childDialog && childDialog !== dialog) return;
      const nodes = focusable();
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (!first) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
      } else if (!dialog.contains(active) || (event.shiftKey ? active === first : active === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus({ preventScroll: true });
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      // Do not take focus away from another dialog or navigation destination.
      const active = document.activeElement;
      if (previous instanceof HTMLElement && previous.isConnected && (dialog.contains(active) || active === document.body)) {
        previous.focus({ preventScroll: true });
      }
    };
  }, [ref, enabled]);
}
