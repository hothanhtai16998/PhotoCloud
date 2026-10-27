import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { useEffect, useRef, useState } from 'react';

export function SliderZoomImage({src, preview, alt, close}: {
  src: string; preview: string; alt: string; close: () => void;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;
    let disposed = false;
    const loaded = async () => {
      try { await image.decode(); } catch { /* A loaded image can still be displayed if decode is unsupported. */ }
      if (!disposed) setStatus(image.naturalWidth ? 'ready' : 'error');
    };
    const failed = () => { if (!disposed) setStatus('error'); };
    image.addEventListener('load', loaded);
    image.addEventListener('error', failed);
    if (image.complete) {
      if (image.naturalWidth) void loaded();
      else failed();
    }
    return () => {
      disposed = true;
      image.removeEventListener('load', loaded);
      image.removeEventListener('error', failed);
    };
  }, [src]);

  return <>
    {status === 'loading' && <div className="slider-zoom-loading"><LoadingIndicator label="Đang tải ảnh gốc" /></div>}
    <button className="slider-zoom-image-button" aria-label="Thu nhỏ ảnh" aria-busy={status === 'loading'} onClick={close}>
      {status !== 'ready' && <img className="zoom-image zoom-preview" src={preview} alt="" aria-hidden="true" />}
      <img ref={imageRef} className="zoom-image zoom-original" src={src} alt={alt} style={{visibility: status === 'ready' ? 'visible' : 'hidden'}} />
    </button>
    {status === 'error' && <span className="slider-zoom-error" role="status">Không tải được ảnh gốc. Đang hiển thị bản xem trước.</span>}
  </>;
}
