export const defaultCancellationRules = [
 { minimumHoursBefore: 168, refundPercent: 100, label: 'Từ 7 ngày trước buổi chụp' },
 { minimumHoursBefore: 72, refundPercent: 50, label: 'Từ 3 đến dưới 7 ngày trước buổi chụp' },
 { minimumHoursBefore: 0, refundPercent: 0, label: 'Dưới 3 ngày trước buổi chụp' },
];
export const defaultBookingPolicy = { allowClientCancellation: true, allowOneReschedule: true, rescheduleDeadlineHours: 24, weatherRescheduleAllowed: true, cancellationRules: defaultCancellationRules };
export function scheduledTime(booking) {
 const day = new Date(booking.confirmedDate || booking.requestedDate).toISOString().slice(0,10);
 // Without a confirmed hour use the start of the civil day; do not invent a shooting time.
 return new Date(`${day}T${booking.confirmedStartTime || '00:00'}:00+07:00`).getTime();
}
export function reschedulePolicyError(booking, policy, reason, now = Date.now()) {
 const p = { ...defaultBookingPolicy, ...policy };
 if (scheduledTime(booking) <= now) return 'Buổi chụp đã bắt đầu hoặc đã qua. Vui lòng liên hệ studio.';
 if (reason === 'weather') {
   if (!p.weatherRescheduleAllowed) return 'Studio hiện không nhận yêu cầu đổi lịch vì thời tiết.';
   return null; // Exception is a request only; the studio must review it.
 }
 if (!p.allowOneReschedule) return 'Studio hiện không nhận yêu cầu đổi lịch cá nhân.';
 if (booking.statusHistory?.some(item => item.to === 'rescheduled' && item.reason !== 'weather' && item.action !== 'reschedule_declined')) return 'Bạn đã sử dụng lượt đổi lịch cá nhân. Vui lòng liên hệ studio.';
 if ((scheduledTime(booking) - now) / 3600000 < p.rescheduleDeadlineHours) return `Cần yêu cầu đổi lịch trước buổi chụp ít nhất ${p.rescheduleDeadlineHours} giờ.`;
 return null;
}
export function cancellationRefundPercent(booking, policy, now = Date.now()) {
 const hours = Math.max(0, (scheduledTime(booking) - now) / 3600000);
 const rules = [...(policy?.cancellationRules || defaultCancellationRules)].sort((a,b) => b.minimumHoursBefore - a.minimumHoursBefore);
 return rules.find(rule => hours >= rule.minimumHoursBefore)?.refundPercent || 0;
}
export function validateBookingPolicy(body) {
 const keys = ['allowClientCancellation','allowOneReschedule','weatherRescheduleAllowed'];
 if (keys.some(key => typeof body[key] !== 'boolean')) return 'Tùy chọn chính sách không hợp lệ.';
 if (!Number.isInteger(body.rescheduleDeadlineHours) || body.rescheduleDeadlineHours < 0 || body.rescheduleDeadlineHours > 720) return 'Giới hạn đổi lịch phải từ 0 đến 720 giờ.';
 const rules = body.cancellationRules;
 if (!Array.isArray(rules) || !rules.length || rules.length > 10) return 'Cần từ 1 đến 10 mức hoàn cọc.';
 if (rules.some(r => !Number.isFinite(r.minimumHoursBefore) || r.minimumHoursBefore < 0 || !Number.isFinite(r.refundPercent) || r.refundPercent < 0 || r.refundPercent > 100)) return 'Mốc giờ phải không âm và tỷ lệ hoàn cọc phải từ 0 đến 100%.';
 const sorted = [...rules].sort((a,b) => b.minimumHoursBefore - a.minimumHoursBefore);
 if (sorted.at(-1).minimumHoursBefore !== 0 || new Set(sorted.map(r => r.minimumHoursBefore)).size !== sorted.length) return 'Các mốc giờ phải khác nhau và có mốc 0 giờ.';
 if (sorted.some((r,i) => i && r.refundPercent > sorted[i-1].refundPercent)) return 'Hủy sát giờ không thể có tỷ lệ hoàn cao hơn hủy sớm.';
 return null;
}
