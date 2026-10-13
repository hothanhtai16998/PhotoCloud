import { FormEvent, useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, MapPin, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { bookingService } from '@/services/bookingService';
import { useUserStore } from '@/stores/useUserStore';
import { getErrorMessage } from '@/lib/utils';
import { BOOKING_MODAL_EVENT, getBookingModalDetail, type BookingModalMode } from '@/utils/bookingModalEvent';
import { CORE_PACKAGES } from '@/constants/packages';
import type { BookingPackage, BookingPayload, BookingTimeSlot, BookingLocationType } from '@/types/booking';
import './BookingModal.css';

const today = new Date().toISOString().slice(0, 10);
const blankForm: BookingPayload = {
  packageSlug: '',
  requestedDate: '',
  requestedTimeSlot: 'flexible',
  alternativeDate: '',
  location: { type: 'outdoor', address: '' },
  participants: 1,
  contact: { name: '', email: '', phone: '', preferredChannel: 'email' },
  concept: '',
  notes: '',
};

const formatPrice = (value: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(value);

/** Map a CORE_PACKAGES id ("portrait", "couple", …) to the matching API slug. */
const matchPackageSlug = (packages: BookingPackage[], selectedId?: string) => {
  if (!selectedId) return '';
  const studioPkg = CORE_PACKAGES.find((p) => p.id === selectedId);
  if (!studioPkg) return '';
  const match = packages.find(
    (p) => p.slug === studioPkg.slug || p.slug === selectedId
  );
  return match?.slug ?? studioPkg.slug;
};

export function BookingModal() {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [packages, setPackages] = useState<BookingPackage[]>([]);
  const [form, setForm] = useState<BookingPayload>(blankForm);
  const [loading, setLoading] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [mode, setMode] = useState<BookingModalMode>('package');
  const [pendingPackageId, setPendingPackageId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const openHandler = (event: Event) => {
      const detail = getBookingModalDetail(event);
      if (!open) triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setOpen(true);
      setStep(1);
      setSubmittedCode(null);
      setMode(detail.mode ?? 'package');
      setPendingPackageId(detail.selectedPackageId);
    };
    window.addEventListener(BOOKING_MODAL_EVENT, openHandler);
    return () => window.removeEventListener(BOOKING_MODAL_EVENT, openHandler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    bookingService
      .getPackages()
      .then((data) => {
        setPackages(data.packages);
        if (pendingPackageId) {
          const slug = matchPackageSlug(data.packages, pendingPackageId);
          if (slug) setForm((current) => ({ ...current, packageSlug: slug }));
        }
      })
      .catch((error: unknown) => toast.error(getErrorMessage(error, 'Không thể tải gói chụp')));
    if (user) {
      setForm((current) => ({
        ...current,
        contact: {
          ...current.contact,
          name: current.contact.name || user.displayName || user.username,
          email: current.contact.email || user.email,
          phone: current.contact.phone || user.phone || '',
        },
      }));
    }
  }, [open, user, pendingPackageId]);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus({ preventScroll: true });
  }, [open, step, submittedCode]);

  const selectedPackage = packages.find((item) => item.slug === form.packageSlug);
  const update = <K extends keyof BookingPayload>(key: K, value: BookingPayload[K]) => setForm((current) => ({ ...current, [key]: value }));
  const close = () => {
    setOpen(false);
    setStep(1);
    setMode('package');
    setPendingPackageId(undefined);
  };

  const isCustomQuote = mode === 'custom-quote';
  const totalSteps = isCustomQuote ? 3 : 4;

  const contactError = () => {
    if (!form.contact.name.trim()) return 'Vui lòng nhập họ và tên.';
    if (!/^\S+@\S+\.\S+$/.test(form.contact.email.trim())) return 'Vui lòng nhập email hợp lệ.';
    if (form.contact.phone.trim().length < 7) return 'Vui lòng nhập số điện thoại có ít nhất 7 ký tự.';
    return null;
  };

  const next = () => {
    if (isCustomQuote) {
      if (step === 1 && (!form.requestedDate || !form.location.address.trim())) return toast.error('Vui lòng chọn ngày và nhập địa điểm.');
      if (step === 2) { const message = contactError(); if (message) return toast.error(message); }
      setStep((current) => current + 1);
      return;
    }
    if (step === 1 && !selectedPackage) return toast.error('Vui lòng chọn một gói chụp.');
    if (step === 2 && (!form.requestedDate || !form.location.address.trim())) return toast.error('Vui lòng chọn ngày và nhập địa điểm.');
    if (step === 3) { const message = contactError(); if (message) return toast.error(message); }
    setStep((current) => current + 1);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    const message = contactError();
    if (message) { toast.error(message); return; }
    if (!user) {
      close();
      navigate('/signin');
      return;
    }
    setLoading(true);
    try {
      const result = await bookingService.create(form);
      setSubmittedCode(result.booking.bookingCode);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Không thể gửi yêu cầu đặt lịch'));
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Portal>
    <Dialog.Overlay className="booking-modal-backdrop">
      <Dialog.Content asChild aria-describedby={undefined}
        onOpenAutoFocus={(event) => { event.preventDefault(); dialogRef.current?.focus({ preventScroll: true }); }}
        onCloseAutoFocus={(event) => { event.preventDefault(); if (triggerRef.current?.isConnected) triggerRef.current.focus({ preventScroll: true }); }}>
      <section ref={dialogRef} className="booking-modal" tabIndex={-1}>
        <header className="booking-modal-header">
          <div>
            <p className="booking-modal-eyebrow">{isCustomQuote ? 'BÁO GIÁ RIÊNG' : 'PHOTO CLOUD SERVICES'}</p>
            <Dialog.Title asChild><h2>{isCustomQuote ? 'Nhận báo giá riêng' : 'Đặt lịch chụp'}</h2></Dialog.Title>
          </div>
          <button type="button" className="booking-modal-close" onClick={close} aria-label="Đóng"><X size={20} /></button>
        </header>

        {submittedCode ? (
          <div className="booking-modal-success">
            <div className="booking-modal-success-icon"><Check size={26} /></div>
            <h3>Đã gửi yêu cầu</h3>
            <p>Chúng tôi sẽ liên hệ để xác nhận lịch của bạn trong 24h.</p>
            <strong>{submittedCode}</strong>
            <div className="booking-modal-success-actions">
              <button type="button" onClick={() => { close(); navigate('/profile'); }}>Xem chi tiết booking <ArrowRight size={16} /></button>
              <button type="button" className="secondary" onClick={() => toast.success('Bạn có thể thêm lịch sau khi booking được xác nhận.')}>Thêm vào lịch</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="booking-modal-progress" aria-label={`Bước ${step}/${totalSteps}`}>
              {isCustomQuote ? (
                <>
                  <span className="active">01 Thời gian & địa điểm</span>
                  <span className={step >= 2 ? 'active' : ''}>02 Liên hệ</span>
                  <span className={step >= 3 ? 'active' : ''}>03 Mô tả yêu cầu</span>
                  <small>{Array.from({ length: totalSteps }, (_, index) => <i key={index} className={step >= index + 1 ? 'active' : ''} />)} Bước {step}/{totalSteps}</small>
                </>
              ) : (
                <>
                  <span className="active">01 Gói chụp</span>
                  <span className={step >= 2 ? 'active' : ''}>02 Thời gian</span>
                  <span className={step >= 3 ? 'active' : ''}>03 Liên hệ</span>
                  <span className={step >= 4 ? 'active' : ''}>04 Xác nhận</span>
                  <small>{Array.from({ length: totalSteps }, (_, index) => <i key={index} className={step >= index + 1 ? 'active' : ''} />)} Bước {step}/{totalSteps}</small>
                </>
              )}
            </div>

            <div className="booking-modal-content">
              {!isCustomQuote && step === 1 && (
                <div className="booking-modal-step">
                  <h3>Chọn gói phù hợp</h3>
                  <p className="booking-modal-help">Bạn có thể trao đổi thêm về gói sau khi gửi yêu cầu.</p>
                  <div className="booking-modal-packages">
                    {packages.map((item, index) => (
                      <button type="button" key={item.slug} className={form.packageSlug === item.slug ? 'selected' : ''} onClick={() => update('packageSlug', item.slug)}>
                        <span className="booking-package-thumb" data-tone={index % 4} aria-hidden="true" />
                        <strong>{item.name}</strong>
                        <span>{formatPrice(item.basePrice)}</span>
                        <small><Clock3 size={13} /> {item.durationMinutes} phút · {item.includedPhotos} ảnh</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {((!isCustomQuote && step === 2) || (isCustomQuote && step === 1)) && (
                <div className="booking-modal-step">
                  <h3>Thời gian và địa điểm</h3>
                  <p className="booking-modal-help">Ngày bạn chọn là ngày mong muốn, chưa phải lịch đã xác nhận.</p>
                  <div className="booking-modal-fields">
                    <label><CalendarDays size={15} /> Ngày mong muốn<input type="date" min={today} value={form.requestedDate} onChange={(event) => update('requestedDate', event.target.value)} /></label>
                    <label>Khung giờ<select value={form.requestedTimeSlot} onChange={(event) => update('requestedTimeSlot', event.target.value as BookingTimeSlot)}><option value="morning">Buổi sáng</option><option value="afternoon">Buổi chiều</option><option value="evening">Buổi tối</option><option value="flexible">Linh hoạt</option></select></label>
                    <label>Loại địa điểm<select value={form.location.type} onChange={(event) => update('location', { ...form.location, type: event.target.value as BookingLocationType })}><option value="outdoor">Ngoại cảnh</option><option value="studio">Studio</option><option value="home">Tại nhà</option><option value="other">Khác</option></select></label>
                    <label><MapPin size={15} /> Địa chỉ / khu vực<input value={form.location.address} onChange={(event) => update('location', { ...form.location, address: event.target.value })} placeholder="Ví dụ: Hồ Tây, Hà Nội" /></label>
                  </div>
                </div>
              )}

              {((!isCustomQuote && step === 3) || (isCustomQuote && step === 2)) && (
                <div className="booking-modal-step">
                  <h3>Thông tin liên hệ</h3>
                  <p className="booking-modal-help">Chúng tôi chỉ dùng thông tin này để trao đổi về yêu cầu của bạn.</p>
                  <div className="booking-modal-fields">
                    <label>Họ và tên<input value={form.contact.name} onChange={(event) => update('contact', { ...form.contact, name: event.target.value })} /></label>
                    <label>Email<input type="email" value={form.contact.email} onChange={(event) => update('contact', { ...form.contact, email: event.target.value })} /></label>
                    <label>Số điện thoại<input type="tel" value={form.contact.phone} onChange={(event) => update('contact', { ...form.contact, phone: event.target.value })} /></label>
                    <label>Số người<input type="number" min={1} max={selectedPackage?.includedPeople || 50} value={form.participants} onChange={(event) => update('participants', Number(event.target.value))} /></label>
                  </div>
                </div>
              )}

              {!isCustomQuote && step === 4 && (
                <div className="booking-modal-step">
                  <h3>Xác nhận yêu cầu</h3>
                  <p className="booking-modal-help">Kiểm tra lại thông tin trước khi gửi. Chưa cần thanh toán ở bước này.</p>
                  <div className="booking-modal-summary">
                    <div><span>Gói chụp</span><strong>{selectedPackage?.name}</strong></div>
                    <div><span>Giá tham khảo</span><strong>{selectedPackage ? formatPrice(selectedPackage.basePrice) : 'Đang cập nhật'}</strong></div>
                    <div><span>Ngày / khung giờ</span><strong>{form.requestedDate} · {form.requestedTimeSlot}</strong></div>
                    <div><span>Địa điểm</span><strong>{form.location.address}</strong></div>
                    <div><span>Liên hệ</span><strong>{form.contact.name} · {form.contact.phone}</strong></div>
                  </div>
                  <div className="booking-modal-policy"><Check size={14} /> Chưa cần thanh toán · Phản hồi trong 24h · Được tư vấn concept trước buổi chụp</div>
                  <label className="booking-modal-notes">Concept hoặc ghi chú ngắn<textarea rows={3} value={form.notes} onChange={(event) => update('notes', event.target.value)} /></label>
                </div>
              )}

              {isCustomQuote && step === 3 && (
                <div className="booking-modal-step">
                  <h3>Mô tả yêu cầu của bạn</h3>
                  <p className="booking-modal-help">Càng cụ thể càng giúp PhotoCloud báo giá chính xác hơn.</p>
                  <div className="booking-modal-fields">
                    <label>Loại buổi chụp
                      <input value={form.concept} onChange={(event) => update('concept', event.target.value)} placeholder="Ví dụ: Đám cưới ngoài trời, 4 tiếng, 2 photographer" />
                    </label>
                    <label className="booking-modal-notes">Ghi chú thêm<textarea rows={5} value={form.notes} onChange={(event) => update('notes', event.target.value)} placeholder="Số người tham gia, địa điểm mong muốn, ngân sách dự kiến, yêu cầu đặc biệt..." /></label>
                  </div>
                  <div className="booking-modal-policy"><Sparkles size={14} /> PhotoCloud sẽ phản hồi báo giá trong vòng 24h qua email/SĐT bạn cung cấp.</div>
                </div>
              )}
            </div>

            <footer className="booking-modal-footer">
              {step > 1 ? <button type="button" className="booking-modal-back" onClick={() => setStep((current) => current - 1)}><ArrowLeft size={16} /> Quay lại</button> : <button type="button" className="booking-modal-full-page" onClick={() => { close(); navigate('/booking'); }}>{isCustomQuote ? 'Mở form báo giá đầy đủ' : 'Đặt lịch đầy đủ'}</button>}
              {step < totalSteps ? <button key="next-step" type="button" className="booking-modal-next" onClick={(event) => { event.preventDefault(); next(); }}>Tiếp tục <ArrowRight size={16} /></button> : <button key="submit-request" type="submit" className="booking-modal-next" disabled={loading}>{loading && <span className="booking-modal-spinner" />} {loading ? 'Đang gửi' : (isCustomQuote ? 'Gửi yêu cầu báo giá' : 'Gửi yêu cầu')} <Check size={16} /></button>}
            </footer>
          </form>
        )}
      </section>
      </Dialog.Content>
    </Dialog.Overlay>
    </Dialog.Portal>
    </Dialog.Root>
  );
}
