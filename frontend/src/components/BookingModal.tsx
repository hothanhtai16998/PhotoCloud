import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { BookingContactFields } from '@/components/booking/BookingContactFields';
import { normalizeBookingContact, validateBookingContact } from '@/components/booking/bookingContact';
import { BookingDatePicker } from '@/components/booking/BookingDatePicker';
import { getBookingToday } from '@/components/booking/bookingDate';
import { BookingLocationPicker } from '@/components/booking/BookingLocationPicker';
import { BookingTimePicker } from '@/components/booking/BookingTimePicker';
import { formatRequestedTime } from '@/utils/bookingTime';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, ArrowRight, Check, Clock3, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { bookingService } from '@/services/bookingService';
import { useUserStore } from '@/stores/useUserStore';
import { getErrorMessage } from '@/lib/utils';
import { BOOKING_MODAL_EVENT, getBookingModalDetail, type BookingModalMode } from '@/utils/bookingModalEvent';
import { CORE_PACKAGES } from '@/constants/packages';
import type { BookingPackage, BookingPayload } from '@/types/booking';
import './BookingModal.css';


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
  const direct = packages.find(pkg => pkg.slug === selectedId || pkg._id === selectedId);
  if (direct) return direct.slug;
  const studioPkg = CORE_PACKAGES.find((p) => p.id === selectedId);
  if (!studioPkg) return '';
  const match = packages.find(
    (p) => p.slug === studioPkg.slug || p.slug === selectedId
  );
  return match?.slug ?? '';
};

export function BookingModal() {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [skipPackage, setSkipPackage] = useState(false);
  const [packages, setPackages] = useState<BookingPackage[]>([]);
  const [form, setForm] = useState<BookingPayload>(blankForm);
  const [loading, setLoading] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [stepError, setStepError] = useState('');
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
      setShowErrors(false);
      setStepError('');
      const preselected = Boolean(detail.selectedPackageId && detail.mode !== 'custom-quote');
      setSkipPackage(preselected);
      setStep(preselected ? 2 : 1);
      setSubmittedCode(null);
      setMode(detail.mode ?? 'package');
      setPendingPackageId(detail.selectedPackageId);
      const today = getBookingToday();
      setForm(current => ({
        ...current,
        requestedDate: current.requestedDate >= today ? current.requestedDate : today,
        packageSlug: detail.selectedPackageId ? '' : current.packageSlug,
      }));
    };
    window.addEventListener(BOOKING_MODAL_EVENT, openHandler);
    return () => window.removeEventListener(BOOKING_MODAL_EVENT, openHandler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    bookingService
      .getPackages()
      .then((data) => {
        if (cancelled) return;
        setPackages(data.packages);
        if (pendingPackageId) {
          const slug = matchPackageSlug(data.packages, pendingPackageId);
          if (slug) setForm((current) => ({ ...current, packageSlug: slug }));
          else { setSkipPackage(false);setStep(1);setForm(current => ({...current,packageSlug:''})); }
        }
      })
      .catch((error: unknown) => { if (!cancelled) { setSkipPackage(false);setStep(1);toast.error(getErrorMessage(error, 'Không thể tải gói chụp')); } });
    if (user) {
      setForm((current) => ({
        ...current,
        contact: {
          ...current.contact,
          name: current.contact.name || user.displayName || user.username || '',
          email: current.contact.email || user.email || '',
          phone: current.contact.phone || user.phone || '',
        },
      }));
    }
    return () => { cancelled = true; };
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
  const visibleStep = skipPackage && !isCustomQuote ? step - 1 : step;
  const visibleTotal = skipPackage && !isCustomQuote ? 3 : totalSteps;

  const maxPeople = selectedPackage?.includedPeople || 50;
  const contactError = () => Object.values(validateBookingContact(form, maxPeople))[0];

  const rejectStep = (message: string) => {
    setStepError(message);
    setShowErrors(true);
    requestAnimationFrame(() => {
      const field = dialogRef.current?.querySelector<HTMLElement>('[aria-invalid=true]');
      field?.focus();
      field?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    });
  };

  const next = () => {
    setStepError('');
    if (isCustomQuote) {
      if (step === 1 && !form.requestedDate) return rejectStep('Bạn chọn ngày muốn chụp nhé.');
      if (step === 2) { const message = contactError(); if (message) return rejectStep(message); }
      if (step === 2) setForm(current => normalizeBookingContact(current));
      setStep((current) => current + 1);
      return;
    }
    if ((step === 1 || step === 2) && !selectedPackage) return rejectStep('Bạn chọn một gói chụp để tiếp tục nhé.');
    if (step === 2 && !form.requestedDate) return rejectStep('Bạn chọn ngày muốn chụp nhé.');
    if (step === 3) { const message = contactError(); if (message) return rejectStep(message); }
    if (step === 3) setForm(current => normalizeBookingContact(current));
    setStep((current) => current + 1);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    const message = contactError();
    if (message) { rejectStep(message); return; }
    if (!user) {
      close();
      navigate('/signin');
      return;
    }
    setLoading(true);
    try {
      const result = await bookingService.create(normalizeBookingContact(form));
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
          <button type="button" className="booking-modal-close" onClick={close} aria-label="Đóng đặt lịch" title="Đóng đặt lịch"><X size={24} /></button>
        </header>

        {submittedCode ? (
          <div className="booking-modal-success">
            <div className="booking-modal-success-icon"><Check size={26} /></div>
            <h3>Đã gửi yêu cầu</h3>
            <p>Chúng tôi sẽ liên hệ để xác nhận lịch của bạn trong 24h.</p>
            <strong>{submittedCode}</strong>
            <div className="booking-modal-success-actions">
              <button type="button" onClick={() => { close(); navigate('/my-bookings'); }}>Theo dõi lịch chụp <ArrowRight size={16} /></button>
              <button type="button" className="secondary" onClick={() => toast.success('Bạn có thể thêm lịch sau khi booking được xác nhận.')}>Thêm vào lịch</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <ol className="booking-stepper" aria-label={`Bước ${visibleStep}/${visibleTotal}`} style={{ '--step-count': visibleTotal } as React.CSSProperties}>
              {(isCustomQuote ? ['Thời gian', 'Liên hệ', 'Yêu cầu'] : skipPackage ? ['Thời gian', 'Liên hệ', 'Xác nhận'] : ['Gói chụp', 'Thời gian', 'Liên hệ', 'Xác nhận']).map((label, index) => {
                const completed = visibleStep > index + 1;
                const current = visibleStep === index + 1;
                return <li key={label} className={completed ? 'completed' : current ? 'current' : ''} aria-current={current ? 'step' : undefined} aria-label={`${label}${completed ? ': Đã hoàn thành' : ''}`}>
                  <div className="booking-step-marker" aria-hidden="true">{completed ? <Check size={16} /> : index + 1}</div>
                  <span>{label}</span>
                </li>;
              })}
            </ol>

            <div className="booking-modal-content">
              {stepError && !(isCustomQuote ? step === 2 : step === 3) && <p className="booking-inline-error" role="alert">{stepError}</p>}
              {!isCustomQuote && step === 1 && (
                <div className="booking-modal-step">
                  <h3>Chọn gói phù hợp</h3>
                  <p className="booking-modal-help">Bạn có thể trao đổi thêm về gói sau khi gửi yêu cầu.</p>
                  <div className="booking-modal-packages">
                    {packages.map((item, index) => (
                      <button type="button" key={item.slug} aria-pressed={form.packageSlug === item.slug} className={form.packageSlug === item.slug ? 'selected' : ''} onClick={() => update('packageSlug', item.slug)}>
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
                  <div className="booking-schedule-heading">
                    <h3>Thời gian và địa điểm</h3>
                  </div>
                  <div className="booking-schedule">
                    <BookingDatePicker value={form.requestedDate} onChange={(date) => update('requestedDate', date)} />
                    <BookingTimePicker value={form.requestedStartTime} onChange={(time, slot) => setForm(current => ({...current, requestedStartTime: time, requestedTimeSlot: slot}))} />
                  </div>
                  <div className="booking-modal-fields booking-location-fields">
                    <BookingLocationPicker value={form.location.type} onChange={(type) => update('location', { ...form.location, type })} />
                  </div>
                </div>
              )}

              {((!isCustomQuote && step === 3) || (isCustomQuote && step === 2)) && (
                <div className="booking-modal-step">
                  <h3>Thông tin liên hệ</h3>
                  <p className="booking-modal-help">Chúng tôi chỉ dùng thông tin này để trao đổi về yêu cầu của bạn.</p>
                  <BookingContactFields form={form} maxPeople={maxPeople} showErrors={showErrors} onChange={setForm} />
                </div>
              )}

              {!isCustomQuote && step === 4 && (
                <div className="booking-modal-step">
                  <h3>Xác nhận yêu cầu</h3>
                  <p className="booking-modal-help">Kiểm tra lại thông tin trước khi gửi. Chưa cần thanh toán ở bước này.</p>
                  <div className="booking-modal-summary">
                    <div><span>Gói chụp</span><strong>{selectedPackage?.name}</strong></div>
                    <div><span>Giá tham khảo</span><strong>{selectedPackage ? formatPrice(selectedPackage.basePrice) : 'Đang cập nhật'}</strong></div>
                    <div><span>Ngày / khung giờ</span><strong>{form.requestedDate} · {formatRequestedTime(form)}</strong></div>
                    <div><span>Địa điểm</span><strong>{{ outdoor: 'Ngoại cảnh', studio: 'Studio', home: 'Tại nhà', other: 'Khác' }[form.location.type]} · {form.location.address}</strong></div>
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
              {visibleStep > 1 ? <button type="button" className="booking-modal-back" onClick={() => setStep((current) => current - 1)}><ArrowLeft size={16} /> Quay lại</button> : <button type="button" className="booking-modal-full-page" onClick={() => { close(); navigate('/booking'); }}>{isCustomQuote ? 'Mở form báo giá đầy đủ' : 'Đặt lịch đầy đủ'}</button>}
              {step < totalSteps ? <button key="next-step" type="button" className="booking-modal-next" onClick={(event) => { event.preventDefault(); next(); }}>Tiếp tục <ArrowRight size={16} /></button> : <button key="submit-request" type="submit" className="booking-modal-next" disabled={loading}>{loading && <LoadingIndicator size="small" aria-hidden="true" />} {loading ? 'Đang gửi' : (isCustomQuote ? 'Gửi yêu cầu báo giá' : 'Gửi yêu cầu')} <Check size={16} /></button>}
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
