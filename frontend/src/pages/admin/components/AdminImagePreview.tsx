import { useState } from 'react';
import { ImageOff } from 'lucide-react';

export function AdminImagePreview({ url, thumbnail, title }: { url?: string; thumbnail?: string; title: string }) {
  const [failed, setFailed] = useState(false);
  const preview = !failed && (thumbnail || url)
    ? <img src={thumbnail || url} alt="" width={64} height={52} loading="lazy" onError={() => setFailed(true)} />
    : <ImageOff size={21} aria-label="Không có ảnh xem trước" />;
  return url ? <a href={url} target="_blank" rel="noreferrer" className="admin-table-thumb" aria-label={`Xem ảnh ${title} (mở tab mới)`}>{preview}</a>
    : <span className="admin-table-thumb">{preview}</span>;
}

