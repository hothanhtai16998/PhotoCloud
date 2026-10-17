import { getAdminIntlLocale, adminText } from '@/pages/admin/adminLocale';
interface LogUser { displayName?: string; username?: string }
interface LogRow { id: string; timestamp: string | null; level: string | null; message: string; action: string | null; userId: string | LogUser | null }
function object(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null; }
export function normalizeLog(value: unknown): LogRow {
  if (!object(value)) throw new Error('Invalid log entry');
  const user = value.userId;
  return {
    id: typeof value._id === 'string' ? value._id : '',
    timestamp: typeof value.timestamp === 'string' ? value.timestamp : null,
    level: typeof value.level === 'string' ? value.level : null,
    message: typeof value.message === 'string' ? value.message : '',
    action: typeof value.action === 'string' ? value.action : null,
    userId: typeof user === 'string' ? user : object(user) ? {
      displayName: typeof user.displayName === 'string' ? user.displayName : undefined,
      username: typeof user.username === 'string' ? user.username : undefined,
    } : null,
  };
}
/** Localize stable event codes while preserving the original audit message. */
export function logEventLabel(row: LogRow): string | null {
  const events: Record<string, string> = {
    updateSettings: adminText('Cài đặt hệ thống đã được cập nhật'),
    createAnnouncement: adminText('Đã tạo thông báo hệ thống'),
    permission_create: adminText('Đã thêm quyền quản trị'),
    permission_update: adminText('Đã sửa quyền quản trị'),
    permission_delete: adminText('Đã thu hồi quyền quản trị'),
    deleteFavorite: adminText('Đã xóa mục yêu thích'),
    approveContent: adminText('Đã duyệt ảnh'),
    rejectContent: adminText('Đã từ chối ảnh'),
  };
  const source = row.action ? events[row.action] : row.message === 'System settings updated' ? events.updateSettings : null;
  return source ? adminText(source) : null;
}
export function logUser(user: LogRow['userId']): string {
  return typeof user === 'string' ? user || adminText("Không có thông tin người dùng") : user?.displayName || user?.username || adminText("Không có thông tin người dùng");
}
export function logLevel(value: string | null): string {
  const labels: Record<string, string> = { info: adminText("Thông tin"), warn: adminText("Cảnh báo"), warning: adminText("Cảnh báo"), error: adminText("Lỗi"), debug: adminText("Chẩn đoán"), critical: adminText("Nghiêm trọng") };
  return value ? labels[value] || adminText("Khác ({0})", { 0: value }) : adminText("Chưa rõ loại");
}
export function logTime(value: string | null): string {
  if (!value) return adminText("Chưa rõ thời gian");
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString(getAdminIntlLocale(), { timeZone: 'Asia/Ho_Chi_Minh' }) : adminText("Chưa rõ thời gian");
}
