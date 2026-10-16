export function adminImageDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('vi-VN', { timeZone:'Asia/Ho_Chi_Minh' }) : 'Chưa rõ ngày';
}
