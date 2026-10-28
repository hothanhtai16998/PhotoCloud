import { useEffect, useState } from 'react';

// Wait only for the initial reveal; later slide updates stay inside the live slider.
export function useInitialSlideImage(source: string | undefined, enabled: boolean) {
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [failure, setFailure] = useState<{ source: string; attempt: number } | null>(null);
  useEffect(() => {
    if (ready || !source || !enabled) return;
    let cancelled = false;
    const photo = new Image();
    photo.fetchPriority = 'high';
    const fail = () => { if (!cancelled) setFailure({ source, attempt }); };
    const timer = window.setTimeout(fail, 12000);
    photo.src = source;
    void photo.decode().then(() => {
      clearTimeout(timer);
      if (!cancelled) {
        if (photo.naturalWidth) setReady(true);
        else fail();
      }
    }, () => { clearTimeout(timer); fail(); });
    return () => { cancelled = true; clearTimeout(timer); photo.removeAttribute('src'); };
  }, [source, enabled, ready, attempt]);
  return {
    ready: ready || !enabled,
    failed: enabled && !ready && Boolean(source && failure?.source === source && failure.attempt === attempt),
    retry: () => setAttempt(value => value + 1),
  };
}
