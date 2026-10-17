import { getAdminIntlLocale, adminText, useAdminLocale } from '@/pages/admin/adminLocale';
import { useState } from 'react';
import { Images } from 'lucide-react';
import type { AdminImage } from '@/services/adminService';

function RecentThumbnail({ src }: { src?: string }) {
  useAdminLocale();
  const [failed, setFailed] = useState(false);
  return <span className="admin-recent-photo">
    {src && !failed ? <img src={src} alt="" width={80} height={64} loading="lazy" onError={() => setFailed(true)} /> : <Images size={22} aria-label={adminText("Không có ảnh xem trước")} />}
  </span>;
}

export function DashboardRecentImages({ images }: { images: AdminImage[] }) {
  useAdminLocale();
  return <ul className="admin-recent-list">
    {images.slice(0, 6).map(image => {
      const date = new Date(image.createdAt);
      const validDate = Number.isFinite(date.getTime());
      const thumbnail = (image as AdminImage & { thumbnailUrl?: string; smallUrl?: string }).thumbnailUrl || (image as AdminImage & { smallUrl?: string }).smallUrl || image.imageUrl;
      return <li key={image._id} className="admin-recent-row">
        <RecentThumbnail key={thumbnail} src={thumbnail} />
        <div><strong>{image.imageTitle?.trim() || adminText("Ảnh chưa có tiêu đề")}</strong><small>{image.uploadedBy?.displayName || image.uploadedBy?.username || adminText("Chưa rõ người tải lên")}</small></div>
        {validDate ? <time className="admin-recent-date" dateTime={date.toISOString()}>{date.toLocaleDateString(getAdminIntlLocale(), { timeZone: 'Asia/Ho_Chi_Minh' })}</time> : <span className="admin-recent-date">{adminText("Chưa rõ ngày")}</span>}
      </li>;
    })}
  </ul>;
}
