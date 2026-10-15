import { memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '@/i18n';
import { watchDecodedImage } from '@/utils/watchDecodedImage';
import { loadedImages } from './NoFlashGrid/utils/imagePreloader';
import { ImageProgressBar } from './NoFlashGrid/components/ImageProgressBar';
import './ImagePagePhoto.css';

interface Props {
  src: string;
  fallback: string;
  preview?: string;
  alt: string;
}

// The parent keys this component by image ID and URLs to dispose pending decode.
export const ImagePagePhoto = memo(function ImagePagePhoto({ src, fallback, preview, alt }: Props) {
  const [activeSrc, setActiveSrc] = useState(src || fallback);
  const [readySrc, setReadySrc] = useState(() => loadedImages.has(src || fallback) ? src || fallback : '');
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const imageRef = useRef<HTMLImageElement>(null);
  const ready = Boolean(activeSrc) && readySrc === activeSrc;
  // Refresh public URLs on explicit retry; preserve signed/query URLs verbatim.
  const requestSrc = attempt && activeSrc && !/[?#]/.test(activeSrc) && !/^(data:|blob:)/i.test(activeSrc)
    ? `${activeSrc}?_photoRetry=${attempt}` : activeSrc;

  useEffect(() => {
    if (!activeSrc || !imageRef.current) return;
    let settled = false;
    const fail = () => {
      if (settled) return;
      settled = true;
      loadedImages.delete(activeSrc);
      setReadySrc('');
      setFailed(true);
    };
    const timeout = window.setTimeout(fail, 15000);
    window.addEventListener('offline', fail);
    const unwatch = watchDecodedImage(imageRef.current, () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      setFailed(false);
      loadedImages.add(activeSrc);
      setReadySrc(activeSrc);
    }, () => {
      if (settled) return;
      window.clearTimeout(timeout);
      loadedImages.delete(activeSrc);
      setReadySrc('');
      if (activeSrc !== fallback && fallback) setActiveSrc(fallback);
      else fail();
    });
    if (!navigator.onLine && !imageRef.current.complete) fail();
    return () => {
      settled = true;
      window.clearTimeout(timeout);
      window.removeEventListener('offline', fail);
      unwatch();
    };
  }, [activeSrc, fallback, attempt]);

  const error = failed || !activeSrc;
  return <>
    {createPortal(<ImageProgressBar visible={!ready && !error} />, document.body)}
    {preview && !ready && <img src={preview} alt="" aria-hidden="true" className="image-page-photo-preview" draggable={false} />}
    {activeSrc && <img key={`${activeSrc}:${attempt}`} ref={imageRef} src={requestSrc} alt={alt}
      className={`image-modal-image image-page-photo ${ready ? 'is-ready' : ''}`}
      decoding="async" fetchPriority="high" draggable={false} />}
    {error && <div className="image-page-photo-error" role="status">
      <span>{t('imagePage.loadError')}</span>
      <button onClick={() => {
        setFailed(false);
        setReadySrc('');
        setActiveSrc(src || fallback);
        setAttempt(Date.now());
      }}>{t('imagePage.retry')}</button>
    </div>}
  </>;
});
