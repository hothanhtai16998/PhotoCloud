import { getAdminIntlLocale, adminText } from '@/pages/admin/adminLocale';
export function adminImageDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString(getAdminIntlLocale(), { timeZone:'Asia/Ho_Chi_Minh' }) : adminText("Chưa rõ ngày");
}
