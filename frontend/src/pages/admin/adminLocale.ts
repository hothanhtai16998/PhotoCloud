import { useSyncExternalStore } from 'react';
import { vi, en } from '@/i18n/locales';
import messages from './i18n/adminMessages.json';

export type AdminLocale = 'vi' | 'en';
const storageKey = 'photocloud_admin_locale';
function readLocale(): AdminLocale {
  try { return localStorage.getItem(storageKey) === 'en' ? 'en' : 'vi'; } catch { return 'vi'; }
}
let locale: AdminLocale = readLocale();
const listeners = new Set<() => void>();
export const getAdminLocale = (): AdminLocale => locale;
export const getAdminIntlLocale = (): string => locale === 'vi' ? 'vi-VN' : 'en-GB';
export function subscribeAdminLocale(listener: () => void): () => void {
  listeners.add(listener);
  const storage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) { locale = readLocale(); listener(); }
  };
  window.addEventListener('storage', storage);
  return () => { listeners.delete(listener); window.removeEventListener('storage', storage); };
}
export function setAdminLocale(value: AdminLocale): void {
  locale = value;
  try { localStorage.setItem(storageKey, value); } catch { /* Keep the in-memory choice when storage is unavailable. */ }
  listeners.forEach(listener => listener());
}
export function useAdminLocale(): AdminLocale {
  return useSyncExternalStore(subscribeAdminLocale, getAdminLocale, () => 'vi');
}
const catalog: Record<string, string> = messages;
const reverse = new Map(Object.entries(catalog).map(([source, translated]) => [translated, source]));
function interpolate(text: string, values?: Record<string, unknown>): string {
  return text.replace(/\{([^{}]+)\}/g, (token, key: string) => values && key in values ? String(values[key] ?? '') : token);
}
/** Source text is the stable key; only authored UI copy is passed here, never user content. */
export function adminText(text: string | null | undefined, values?: Record<string, unknown>): string {
  if (typeof text !== 'string') return '';
  const key = text.replace(/\s+/g, ' ').trim();
  const source = key in catalog ? key : reverse.get(key) || key;
  const result = locale === 'en' ? catalog[source] || key : source;
  const leading = /^\s/.test(text) ? ' ' : '';
  const trailing = /\s$/.test(text) ? ' ' : '';
  return leading + interpolate(result, values) + trailing;
}
function nested(value: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((entry, part) => typeof entry === 'object' && entry !== null && part in entry ? (entry as Record<string, unknown>)[part] : undefined, value);
}
/** Legacy dictionary keys use the admin locale without changing the public locale. */
export function adminT(key: string, values?: Record<string, string | number>): string {
  const vietnameseOverrides: Record<string, string> = {
    'admin.adminRole': 'Quyền quản trị',
    'admin.editAdminRole': 'Sửa quyền quản trị',
    'admin.superAdminAllPermissions': 'Quản trị cấp cao có tất cả quyền hạn',
    'admin.createAdmins': 'Thêm quản trị viên',
    'admin.editAdmins': 'Chỉnh sửa quản trị viên',
    'admin.deleteAdmins': 'Xóa quản trị viên',
    'admin.manageAdmins': 'Quản lý quản trị viên',
    'admin.dashboardAnalytics': 'Tổng quan & phân tích',
    'admin.maxUploadSize': 'Dung lượng tải lên tối đa (MB)',
  };
  if (locale === 'vi' && key in vietnameseOverrides) return interpolate(vietnameseOverrides[key], values);
  const result = nested(locale === 'vi' ? vi : en, key) ?? nested(vi, key);
  return typeof result === 'string' ? interpolate(result, values) : key;
}

/** Optional translator passed only to the shared upload flow opened from admin. */
export function adminUploadT(key: string, values?: Record<string, string | number>, fallback?: string): string {
  const uploadCopy: Record<string, [string, string]> = {
    'upload.title': ['Thêm ảnh vào PhotoCloud', 'Add photos to PhotoCloud'],
    'upload.selected': ['Đã chọn {count} ảnh', 'Selected photos: {count}'],
    'upload.localUploaded': ['Đã tải lên', 'Uploaded'],
    'upload.localError': ['Lỗi', 'Error'],
    'upload.localPartial': ['{success} ảnh đã tải lên thành công. {failed} ảnh thất bại: {titles}', '{success} images uploaded successfully. {failed} images failed: {titles}'],
    'upload.localSize': ['Kích thước tệp vượt quá giới hạn {size} MB', 'File size exceeds maximum allowed size of {size} MB'],
    'upload.localType': ['Định dạng tệp không được phép. Các định dạng cho phép: {types}', 'File type not allowed. Allowed types: {types}'],
    'upload.localAccepted': ['Đã chấp nhận {accepted} trong {total} tệp', '{accepted} of {total} files were accepted'],
  };
  const copy = uploadCopy[key];
  if (copy) return interpolate(copy[locale === 'vi' ? 0 : 1], values);
  const translated = adminT(key, values);
  return translated === key && fallback !== undefined ? interpolate(fallback, values) : translated;
}
