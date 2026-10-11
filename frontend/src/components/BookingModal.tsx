import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, MapPin, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { bookingService } from '@/services/bookingService';
import { useUserStore } from '@/stores/useUserStore';
import { getErrorMessage } from '@/lib/utils';
import { BOOKING_MODAL_EVENT } from '@/utils/bookingModalEvent';
import type { BookingPackage, BookingPayload, BookingTimeSlot, BookingLocationType } from '@/types/booking';
import './BookingModal.css';

const today = new Date().toISOString().slice(0, 10);
const blankForm: BookingPayload = { packageSlug: '', requestedDate: '', requestedTimeSlot: 'flexible', alternativeDate: '', location: { type: 'outdoor', address: '' }, participants: 1, contact: { name: '', email: '', phone: '', preferredChannel: 'email' }, concept: '', notes: '' };

export function BookingModal() {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [packages, setPackages] = useState<BookingPackage[]>([]);
  const [form, setForm] = useState<BookingPayload>(blankForm);
  const [loading, setLoading] = useState(false);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);

  useEffect(() => {
    const openHandler = () => { setOpen(true); setStep(1); setSubmittedCode(null); };
    window.addEventListener(BOOKING_MODAL_EVENT, openHandler);
    return () => window.removeEventListener(BOOKING_MODAL_EVENT, openHandler);
  }, []);

  useEffect(() => {
    if (!open) return;
    bookingService.getPackages().then((data) => setPackages(data.packages)).catch((error: unknown) => toast.error(getErrorMessage(error, 'Không thể tải gói chụp')));
    if (user) setForm((current) => ({ ...current, contact: { ...current.contact, name: current.contact.name || user.displayName || user.username, email: current.contact.email || user.email, phone: current.contact.phone || user.phone || '' } }));
  }, [open, user]);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = originalOverflow; document.removeEventListener('keydown', onKeyDown); };
  }, [open]);

  const selectedPackage = packages.find((item) => item.slug === form.packageSlug);
  const update = <K extends keyof BookingPayload>(key: K, value: BookingPayload[K]) => setForm((current) => ({ ...current, [key]: value }));
  const close = () => { setOpen(false); setStep(1); };
  const next = () => { if (step === 1 && !selectedPackage) return toast.error('Vui lòng chọn một gói chụp.'); if (step === 2 && (!form.requestedDate || !form.location.address.trim())) return toast.error('Vui lòng chọn ngày và nhập địa điểm.'); if (step === 3 && (!form.contact.name.trim() || !form.contact.email.trim() || !form.contact.phone.trim())) return toast.error('Vui lòng điền đủ thông tin liên hệ.'); setStep((current) => current + 1); };
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!user) { close(); navigate('/signin'); return; } setLoading(true); try { const result = await bookingService.create(form); setSubmittedCode(result.booking.bookingCode); } catch (error: unknown) { toast.error(getErrorMessage(error, 'Không thể gửi yêu cầu đặt lịch')); } finally { setLoading(false); } };

  if (!open) return null;
  return <div className="booking-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><section className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title"><header className="booking-modal-header"><div><p className="booking-modal-eyebrow">PHOTO CLOUD SERVICES</p><h2 id="booking-modal-title">Đặt lịch chụp</h2></div><button type="button" className="booking-modal-close" onClick={close} aria-label="Đóng"><X size={20} /></button></header>{submittedCode ? <div className="booking-modal-success"><div className="booking-modal-success-icon"><Check size={26} /></div><h3>Đã gửi yêu cầu</h3><p>Chúng tôi sẽ liên hệ để xác nhận lịch của bạn.</p><strong>{submittedCode}</strong><button type="button" onClick={() => { close(); navigate('/profile'); }}>Xem chi tiết booking <ArrowRight size={16} /></button></div> : <form onSubmit={submit}><div className="booking-modal-progress"><span className="active">01 Gói chụp</span><span className={step >= 2 ? 'active' : ''}>02 Thời gian</span><span className={step >= 3 ? 'active' : ''}>03 Liên hệ</span><span className={step >= 4 ? 'active' : ''}>04 Xác nhận</span></div><div className="booking-modal-content">{step === 1 && <div className="booking-modal-step"><h3>Chọn gói phù hợp</h3><p className="booking-modal-help">Bạn có thể trao đổi thêm về gói sau khi gửi yêu cầu.</p><div className="booking-modal-packages">{packages.map((item) => <button type="button" key={item.slug} className={form.packageSlug === item.slug ? 'selected' : ''} onClick={() => update('packageSlug', item.slug)}><strong>{item.name}</strong><span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(item.basePrice)}</span><small><Clock3 size={13} /> {item.durationMinutes} phút · {item.includedPhotos} ảnh</small></button>)}</div></div>}{step === 2 && <div className="booking-modal-step"><h3>Thời gian và địa điểm</h3><p className="booking-modal-help">Ngày bạn chọn là ngày mong muốn, chưa phải lịch đã xác nhận.</p><div className="booking-modal-fields"><label><CalendarDays size={15} /> Ngày mong muốn<input type="date" min={today} value={form.requestedDate} onChange={(e) => update('requestedDate', e.target.value)} /></label><label>Khung giờ<select value={form.requestedTimeSlot} onChange={(e) => update('requestedTimeSlot', e.target.value as BookingTimeSlot)}><option value="morning">Buổi sáng</option><option value="afternoon">Buổi chiều</option><option value="evening">Buổi tối</option><option value="flexible">Linh hoạt</option></select></label><label>Loại địa điểm<select value={form.location.type} onChange={(e) => update('location', { ...form.location, type: e.target.value as BookingLocationType })}><option value="outdoor">Ngoại cảnh</option><option value="studio">Studio</option><option value="home">Tại nhà</option><option value="other">Khác</option></select></label><label><MapPin size={15} /> Địa chỉ / khu vực<input value={form.location.address} onChange={(e) => update('location', { ...form.location, address: e.target.value })} placeholder="Ví dụ: Hồ Tây, Hà Nội" /></label></div></div>}{step === 3 && <div className="booking-modal-step"><h3>Thông tin liên hệ</h3><p className="booking-modal-help">Chúng tôi chỉ dùng thông tin này để trao đổi về yêu cầu của bạn.</p><div className="booking-modal-fields"><label>Họ và tên<input value={form.contact.name} onChange={(e) => update('contact', { ...form.contact, name: e.target.value })} /></label><label>Email<input type="email" value={form.contact.email} onChange={(e) => update('contact', { ...form.contact, email: e.target.value })} /></label><label>Số điện thoại<input type="tel" value={form.contact.phone} onChange={(e) => update('contact', { ...form.contact, phone: e.target.value })} /></label><label>Số người<input type="number" min={1} max={selectedPackage?.includedPeople || 50} value={form.participants} onChange={(e) => update('participants', Number(e.target.value))} /></label></div></div>}{step === 4 && <div className="booking-modal-step"><h3>Xác nhận yêu cầu</h3><p className="booking-modal-help">Kiểm tra lại thông tin trước khi gửi. Chưa cần thanh toán ở bước này.</p><div className="booking-modal-summary"><div><span>Gói chụp</span><strong>{selectedPackage?.name}</strong></div><div><span>Ngày / khung giờ</span><strong>{form.requestedDate} · {form.requestedTimeSlot}</strong></div><div><span>Địa điểm</span><strong>{form.location.address}</strong></div><div><span>Liên hệ</span><strong>{form.contact.name} · {form.contact.phone}</strong></div></div><label className="booking-modal-notes">Concept hoặc ghi chú ngắn<textarea rows={3} value={form.notes} onChange={(e) => update('notes', e.target.value)} /></label></div>}</div><footer className="booking-modal-footer">{step > 1 ? <button type="button" className="booking-modal-back" onClick={() => setStep((current) => current - 1)}><ArrowLeft size={16} /> Quay lại</button> : <button type="button" className="booking-modal-full-page" onClick={() => { close(); navigate('/booking'); }}>Đặt lịch đầy đủ</button>}{step < 4 ? <button type="button" className="booking-modal-next" onClick={next}>Tiếp tục <ArrowRight size={16} /></button> : <button type="submit" className="booking-modal-next" disabled={loading}>{loading ? 'Đang gửi...' : 'Gửi yêu cầu'} <Check size={16} /></button>}</footer></form>}</section></div>;
}
