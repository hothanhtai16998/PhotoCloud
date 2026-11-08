import type { SlideData } from '@/stores/useSliderStore';
import type { HeroCollection } from '@/services/heroService';
import type { StudioPackage } from '@/constants/packages';

export function photoCaption(photo: Pick<SlideData, 'title' | 'author' | 'category'>): string {
  return `Bạn đang xem “${photo.title}”${photo.author ? ` của ${photo.author}` : ''}.${photo.category ? ` Chủ đề: ${photo.category}.` : ''}`;
}

export function photoFacts(photo: SlideData): [string, string][] {
  const image = photo.imageData;
  const facts: [string, string][] = [];
  const text = (label: string, value?: string): void => { if (value?.trim()) facts.push([label, value.trim()]); };
  const positive = (value: number | undefined): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;
  text('Tác giả', photo.author);
  text('Chủ đề', photo.category);
  text('Địa điểm', image?.location);
  text('Máy ảnh', [image?.cameraMake, image?.cameraModel].filter(Boolean).join(' '));
  if (positive(image?.focalLength)) facts.push(['Tiêu cự', `${image.focalLength} mm`]);
  if (positive(image?.aperture)) facts.push(['Khẩu độ', `f/${image.aperture}`]);
  text('Tốc độ', image?.shutterSpeed);
  if (positive(image?.iso)) facts.push(['ISO', String(image.iso)]);
  if (photo.width > 0 && photo.height > 0) facts.push(['Kích thước', `${photo.width} × ${photo.height} px`]);
  return facts;
}

export function collectionCaption(collection: HeroCollection): string {
  const count = typeof collection.imageCount === 'number' && Number.isFinite(collection.imageCount) && collection.imageCount >= 0 ? ` có ${collection.imageCount} ảnh` : '';
  return `Bộ sưu tập “${collection.name}”${count}.${collection.description?.trim() ? ` ${collection.description.trim()}` : ' Cùng xem những khung hình bên trong nhé.'}`;
}

export function packageCaption(pkg: StudioPackage): string {
  const facts = [Number.isFinite(pkg.priceFrom) && pkg.priceFrom >= 0 ? `giá từ ${pkg.priceFrom.toLocaleString('vi-VN')}đ` : '', Number.isFinite(pkg.duration) && pkg.duration > 0 ? `${pkg.duration} phút chụp` : '', Number.isFinite(pkg.photos) && pkg.photos >= 0 ? `${pkg.photos} ảnh chỉnh màu` : ''].filter(Boolean);
  return `Gói “${pkg.name}”${facts.length ? ': ' + facts.join(', ') : ''}.`;
}
