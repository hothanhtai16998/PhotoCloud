import { useEffect, useLayoutEffect, useState } from 'react';
import { useSliderStore } from '@/stores/useSliderStore';
import './HomeLoadingGate.css';

// Only the first reveal waits for the hero. Background refreshes keep the page visible.
export function HomeLoadingGate() {
  const { slides, loading, error, hasLoaded, fetchSlides } = useSliderStore();
  const source = slides[0]?.image;
  const desktop = window.matchMedia('(min-width: 769px)').matches;
  const [released, setReleased] = useState(false);
  const [pageMounted, setPageMounted] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [image, setImage] = useState<{ source?: string; attempt: number; status: 'ready' | 'error' } | null>(null);

  useLayoutEffect(() => {
    document.documentElement.dataset.homeLoading = 'pending';
    return () => { delete document.documentElement.dataset.homeLoading; };
  }, []);

  useEffect(() => {
    const check = () => {
      if (document.querySelector('#root .homepage .travel-stage,#root .homepage .travel-empty')) {
        setPageMounted(true);
        observer.disconnect();
      }
    };
    const observer = new MutationObserver(check);
    observer.observe(document.getElementById('root')!, { childList: true, subtree: true });
    check();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (released || !source || !desktop) return;
    let cancelled = false;
    const photo = new Image();
    photo.fetchPriority = 'high';
    const complete = (status: 'ready' | 'error') => {
      if (!cancelled) setImage({ source, attempt, status });
    };
    const timer = window.setTimeout(() => complete('error'), 12000);
    photo.src = source;
    void photo.decode().then(() => {
      clearTimeout(timer);
      complete(photo.naturalWidth ? 'ready' : 'error');
    }, () => { clearTimeout(timer); complete('error'); });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      photo.removeAttribute('src');
    };
  }, [source, attempt, desktop, released]);

  const imageReady = image?.source === source && image?.attempt === attempt && image?.status === 'ready';
  const imageFailed = (desktop && slides.length > 0 && !source) || (image?.source === source && image?.attempt === attempt && image?.status === 'error');
  useLayoutEffect(() => {
    if (released) return;
    if (pageMounted && (!desktop || imageReady || (hasLoaded && !loading && !error && !slides.length))) {
      setReleased(true);
      delete document.documentElement.dataset.homeLoading;
    }
  }, [pageMounted, desktop, imageReady, hasLoaded, loading, error, slides.length, released]);

  if (released || (!imageFailed && !(error && !slides.length))) return null;
  return <div className="home-loading-error" role="alert">
    <h1>Chưa tải được ảnh trang chủ</h1>
    <p>Vui lòng kiểm tra kết nối và thử lại.</p>
    <button type="button" onClick={() => {
      setAttempt(value => value + 1);
      if (!slides.length || !source) void fetchSlides();
    }}>Thử lại</button>
  </div>;
}
