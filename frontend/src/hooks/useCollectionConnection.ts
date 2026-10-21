import { useEffect, useRef } from 'react';

/** Recover once per offline period; a failed API response still needs manual retry. */
export function useCollectionConnection(onOffline: () => void, reconnect: () => Promise<void>, blocked = false): void {
  const pending = useRef(typeof navigator !== 'undefined' && !navigator.onLine);
  useEffect(() => {
    const recover = (): void => {
      if (!pending.current || blocked || !navigator.onLine) return;
      pending.current = false;
      void reconnect().catch(() => {});
    };
    const offline = (): void => { pending.current = true; onOffline(); };
    window.addEventListener('offline', offline);
    window.addEventListener('online', recover);
    recover();
    return () => {
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', recover);
    };
  }, [onOffline, reconnect, blocked]);
}
