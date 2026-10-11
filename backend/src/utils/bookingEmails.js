import User from '../models/User.js';
import { sendUserEmail } from './emailAlerts.js';

const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

export async function sendBookingEmail(event, booking) {
    const client = await User.findById(booking.client).select('email displayName username').lean();
    const email = client?.email || booking.contact?.email;
    if (!email) return false;
    const name = client?.displayName || client?.username || booking.contact?.name || 'bạn';
    const subjects = { created: 'Đã tiếp nhận yêu cầu đặt lịch chụp', status_changed: `Cập nhật booking ${booking.bookingCode}`, reminder: `Nhắc lịch chụp ${booking.bookingCode}` };
    const messages = { created: 'Yêu cầu đặt lịch của bạn đã được tiếp nhận. Đội ngũ sẽ liên hệ để xác nhận.', status_changed: 'Trạng thái yêu cầu đặt lịch của bạn vừa được cập nhật.', reminder: 'Buổi chụp của bạn sắp diễn ra. Vui lòng kiểm tra lại thời gian và địa điểm.' };
    const date = booking.confirmedDate || booking.requestedDate;
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222"><h2>${escapeHtml(subjects[event] || subjects.status_changed)}</h2><p>Xin chào ${escapeHtml(name)},</p><p>${escapeHtml(messages[event] || messages.status_changed)}</p><div style="background:#f6f6f1;padding:16px"><strong>${escapeHtml(booking.packageSnapshot.name)}</strong><br>Mã booking: ${escapeHtml(booking.bookingCode)}<br>Ngày: ${new Date(date).toLocaleDateString('vi-VN')}<br>Địa điểm: ${escapeHtml(booking.location.address)}</div><p>Trân trọng,<br>PhotoCloud</p></div>`;
    const text = `${subjects[event] || subjects.status_changed}\n\nXin chào ${name},\n${messages[event] || messages.status_changed}\nMã booking: ${booking.bookingCode}\nNgày: ${new Date(date).toLocaleDateString('vi-VN')}\nĐịa điểm: ${booking.location.address}`;
    return sendUserEmail(email, subjects[event] || subjects.status_changed, html, text);
}
