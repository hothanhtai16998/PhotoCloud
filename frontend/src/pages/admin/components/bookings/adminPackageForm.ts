import type { BookingPackage } from '@/types/booking';

export type AdminPackage = BookingPackage & { active?: boolean; sortOrder?: number };
export type PackageDraft = Omit<AdminPackage, '_id'>;
export type PackageErrors = Partial<Record<keyof PackageDraft, string>>;
export const packageTabs = [{ id: 'info', label: 'Thông tin' }, { id: 'pricing', label: 'Giá và thông số' }, { id: 'content', label: 'Nội dung' }, { id: 'media', label: 'Ảnh' }] as const;
export type PackageTab = typeof packageTabs[number]['id'];
export function packageTabForField(key: string): PackageTab {
    if (key === 'coverUrl' || key === 'gallery') return 'media';
    if (key === 'detailDescription' || key === 'includes') return 'content';
    if (packageNumbers.some(field => field.key === key)) return 'pricing';
    return 'info';
}
export const packageNumbers = [
    { key: 'durationMinutes', label: 'Thời lượng (phút)', min: 15, max: 1440 },
    { key: 'basePrice', label: 'Giá tham khảo', min: 0, max: Number.MAX_SAFE_INTEGER },
    { key: 'includedPhotos', label: 'Số ảnh', min: 0, max: Number.MAX_SAFE_INTEGER },
    { key: 'includedPeople', label: 'Số người', min: 1, max: 100 },
    { key: 'deliveryDays', label: 'Ngày giao ảnh', min: 1, max: 365 },
    { key: 'sortOrder', label: 'Thứ tự hiển thị', min: Number.MIN_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER },
] as const;

export function isPackagePhotoUrl(value: string): boolean {
    try { const url = new URL(value); return value.length <= 2048 && url.protocol === 'https:' && !url.username && !url.password; }
    catch { return false; }
}

export function normalizePackage(form: PackageDraft): PackageDraft {
    return { ...form, name: form.name.trim(), slug: form.slug.trim(), category: form.category.trim(), description: form.description.trim(),
        detailDescription: (form.detailDescription || '').trim(), coverUrl: (form.coverUrl || '').trim(),
        includes: (form.includes || []).map(line => line.trim()).filter(Boolean), gallery: (form.gallery || []).map(line => line.trim()).filter(Boolean),
        active: form.active !== false, sortOrder: form.sortOrder ?? 0 };
}

export function validatePackageForm(raw: PackageDraft): PackageErrors {
    const form = normalizePackage(raw);
    const errors: PackageErrors = {};
    if (!form.name || form.name.length > 120) errors.name = 'Tên gói bắt buộc, tối đa 120 ký tự.';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) errors.slug = 'Đường dẫn chỉ gồm chữ thường không dấu, số và dấu gạch nối.';
    if (!form.category || form.category.length > 60) errors.category = 'Danh mục bắt buộc, tối đa 60 ký tự.';
    if (!form.description || form.description.length > 1000) errors.description = 'Mô tả bắt buộc, tối đa 1000 ký tự.';
    for (const field of packageNumbers) {
        const value = form[field.key];
        if (!Number.isSafeInteger(value) || value === undefined || value < field.min || value > field.max) errors[field.key] = 'Nhập số nguyên trong giới hạn của trường này.';
    }
    if ((form.detailDescription?.length || 0) > 5000) errors.detailDescription = 'Mô tả chi tiết tối đa 5000 ký tự.';
    if (form.coverUrl && !isPackagePhotoUrl(form.coverUrl)) errors.coverUrl = 'Ảnh bìa cần đường dẫn HTTPS hợp lệ.';
    if ((form.includes?.length || 0) > 20 || form.includes?.some(line => line.length > 300)) errors.includes = 'Quyền lợi tối đa 20 dòng, mỗi dòng 300 ký tự.';
    if ((form.gallery?.length || 0) > 12 || form.gallery?.some(url => !isPackagePhotoUrl(url)) || new Set(form.gallery).size !== form.gallery?.length) errors.gallery = 'Album tối đa 12 đường dẫn HTTPS khác nhau.';
    return errors;
}
