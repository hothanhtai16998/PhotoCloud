import { NoFlashGrid, type NoFlashGridProps } from '@/components/NoFlashGrid/NoFlashGrid';
import { Button } from '@/components/ui/button';
import { DataLoading } from '@/components/user/DataLoading';
import { t } from '@/i18n';

interface Props {
  grid: NoFlashGridProps;
  firstLoad: boolean;
  isOwnProfile: boolean;
  onUpload: () => void;
}

export function ProfilePhotosPanel({ grid, firstLoad, isOwnProfile, onUpload }: Props) {
  if (firstLoad) return <DataLoading message="Đang tải ảnh hồ sơ" />;
  return <>
    {grid.loading && grid.images.length > 0 && <DataLoading size="inline" message="Đang cập nhật ảnh hồ sơ" />}
    {grid.images.length === 0 ? <div className="empty-state" role="status">
      <p>{t('profile.noPhotos')}</p>
      {isOwnProfile && <Button variant="outline" className="mt-4" onClick={event => {
        event.preventDefault(); event.stopPropagation(); onUpload();
      }}>{t('upload.addImage')}</Button>}
    </div> : <NoFlashGrid {...grid} />}
  </>;
}
