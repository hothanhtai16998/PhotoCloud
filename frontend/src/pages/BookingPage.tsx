import { BookingTimePicker } from '@/components/booking/BookingTimePicker';
import { DataLoading } from '@/components/user/DataLoading';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Check, Clock3, MapPin, Users, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils';
import { bookingService } from '@/services/bookingService';
import { useUserStore } from '@/stores/useUserStore';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { BRAND } from '@/constants/brand';
import { BookingFAQ } from '@/components/booking/BookingFAQ';
import type { BookingPackage, BookingPayload, BookingLocationType } from '@/types/booking';
import './BookingPage.css';

const formatPrice = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
const today = new Date().toISOString().slice(0, 10);

const initialForm: BookingPayload = {
  packageSlug: '',
  requestedDate: '',
  requestedTimeSlot: 'flexible',
  alternativeDate: '',
  location: { type: 'outdoor', address: '', mapUrl: '' },
  participants: 1,
  contact: { name: '', email: '', phone: '', preferredChannel: 'email' },
  concept: '',
  notes: '',
};

function BookingPage() {
  const { user } = useUserStore();
  const [packages, setPackages] = useState<BookingPackage[]>([]);
  const [form, setForm] = useState<BookingPayload>(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);

  useDocumentMeta({
    title: 'Đặt lịch chụp',
    description: `Đặt lịch chụp ảnh theo yêu cầu tại ${BRAND.nameLong}. Chọn gói, chọn ngày, gửi yêu cầu — phản hồi trong 24h.`,
  });

  useEffect(() => {
    let active = true;
    bookingService.getPackages()
      .then((data) => { if (active) setPackages(data.packages); })
      .catch(() => toast.error('Không thể tải các gói chụp. Vui lòng thử lại.'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!user) return;
    setForm((current) => ({
      ...current,
      contact: {
        ...current.contact,
        name: current.contact.name || user.displayName || user.username,
        email: current.contact.email || user.email,
        phone: current.contact.phone || user.phone || '',
      },
    }));
  }, [user]);

  const selectedPackage = useMemo(() => packages.find((item) => item.slug === form.packageSlug), [packages, form.packageSlug]);
  const updateForm = <K extends keyof BookingPayload>(key: K, value: BookingPayload[K]) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPackage) return toast.error('Vui lòng chọn một gói chụp.');
    if (!form.requestedDate) return toast.error('Vui lòng chọn ngày mong muốn.');
    if (!form.location.address.trim()) return toast.error('Vui lòng nhập địa điểm chụp.');
    if (!form.contact.name.trim() || !form.contact.email.trim() || !form.contact.phone.trim()) return toast.error('Vui lòng điền đủ thông tin liên hệ.');

    setSubmitting(true);
    try {
      const result = await bookingService.create(form);
      setSubmittedCode(result.booking.bookingCode);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Không thể gửi yêu cầu. Vui lòng thử lại.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedCode) {
    return (
      <main className="booking-page booking-success-page">
        <section className="booking-success-card" aria-live="polite">
          <div className="booking-success-icon"><Check size={28} /></div>
          <p className="booking-eyebrow">ĐÃ GỬI YÊU CẦU</p>
          <h1>Yêu cầu đặt lịch đã được tiếp nhận</h1>
          <p>Chúng tôi sẽ xem xét thông tin và phản hồi cho bạn trong thời gian sớm nhất.</p>
          <div className="booking-code">Mã yêu cầu <strong>{submittedCode}</strong></div>
          <div className="booking-success-actions">
            <Link to="/profile" className="booking-primary-button">Xem trong hồ sơ <ArrowRight size={17} /></Link>
            <button type="button" className="booking-secondary-button" onClick={() => { setSubmittedCode(null); setForm(initialForm); }}>Tạo yêu cầu khác</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="booking-page">
      <header className="booking-hero">
        <div>
          <p className="booking-eyebrow">{BRAND.nameLong.toUpperCase()}</p>
          <h1>{BRAND.tagline}</h1>
          <p>Chọn gói phù hợp, chia sẻ ý tưởng và để {BRAND.nameLong} cùng bạn tạo nên một buổi chụp đáng nhớ.</p>
          <p className="booking-hero-tagline">{BRAND.subTagline}</p>
        </div>
        <div className="booking-hero-note"><CalendarDays size={19} /><span>Đây là yêu cầu đặt lịch. Lịch chỉ được xác nhận sau khi đội ngũ phản hồi.</span></div>
      </header>

      <div className="booking-layout">
        <form className="booking-form" onSubmit={handleSubmit}>
          <section className="booking-section">
            <div className="booking-section-heading"><span>01</span><div><h2>Chọn gói chụp</h2><p>Bạn có thể trao đổi thêm về gói sau khi gửi yêu cầu.</p></div></div>
            {loading ? <DataLoading message="Đang tải gói chụp" size="compact" /> : (
              <div className="booking-package-grid">
                {packages.map((item) => (
                  <button type="button" key={item.slug} className={`booking-package-card ${form.packageSlug === item.slug ? 'selected' : ''}`} onClick={() => updateForm('packageSlug', item.slug)}>
                    <span className="booking-package-check">{form.packageSlug === item.slug ? <Check size={15} /> : null}</span>
                    <strong>{item.name}</strong><span className="booking-package-price">{formatPrice(item.basePrice)}</span>
                    <p>{item.description}</p>
                    <div className="booking-package-meta"><span><Clock3 size={14} /> {item.durationMinutes} phút</span><span>{item.includedPhotos} ảnh chỉnh màu</span></div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="booking-section">
            <div className="booking-section-heading"><span>02</span><div><h2>Thời gian và địa điểm</h2><p>Ngày bạn chọn là ngày mong muốn, chưa phải lịch đã xác nhận.</p></div></div>
            <div className="booking-fields booking-fields-two">
              <label>Ngày mong muốn<input type="date" min={today} value={form.requestedDate} onChange={(e) => updateForm('requestedDate', e.target.value)} required /></label>
              <label>Ngày thay thế <em>Không bắt buộc</em><input type="date" min={today} value={form.alternativeDate} onChange={(e) => updateForm('alternativeDate', e.target.value)} /></label>
              <BookingTimePicker value={form.requestedStartTime} onChange={(time, slot) => setForm(current => ({...current, requestedStartTime: time, requestedTimeSlot: slot}))} />
              <label>Số người<input type="number" min={1} max={selectedPackage?.includedPeople || 50} value={form.participants} onChange={(e) => updateForm('participants', Number(e.target.value))} required /></label>
            </div>
            <div className="booking-fields booking-fields-two">
              <label>Loại địa điểm<select value={form.location.type} onChange={(e) => updateForm('location', { ...form.location, type: e.target.value as BookingLocationType })}><option value="outdoor">Ngoại cảnh</option><option value="studio">Studio</option><option value="home">Tại nhà</option><option value="other">Khác</option></select></label>
              <label>Địa chỉ / khu vực<input value={form.location.address} onChange={(e) => updateForm('location', { ...form.location, address: e.target.value })} placeholder="Ví dụ: Hồ Tây, Hà Nội" required /></label>
            </div>
          </section>

          <section className="booking-section">
            <div className="booking-section-heading"><span>03</span><div><h2>Thông tin liên hệ</h2><p>Thông tin này chỉ dùng để trao đổi về yêu cầu của bạn.</p></div></div>
            <div className="booking-fields booking-fields-two">
              <label>Họ và tên<input value={form.contact.name} onChange={(e) => updateForm('contact', { ...form.contact, name: e.target.value })} required /></label>
              <label>Email<input type="email" value={form.contact.email} onChange={(e) => updateForm('contact', { ...form.contact, email: e.target.value })} required /></label>
              <label>Số điện thoại<input type="tel" value={form.contact.phone} onChange={(e) => updateForm('contact', { ...form.contact, phone: e.target.value })} required /></label>
              <label>Kênh liên hệ ưu tiên<select value={form.contact.preferredChannel} onChange={(e) => updateForm('contact', { ...form.contact, preferredChannel: e.target.value as BookingPayload['contact']['preferredChannel'] })}><option value="email">Email</option><option value="phone">Điện thoại</option><option value="zalo">Zalo</option></select></label>
            </div>
          </section>

          <section className="booking-section">
            <div className="booking-section-heading"><span>04</span><div><h2>Chia sẻ ý tưởng</h2><p>Càng nhiều thông tin, chúng tôi càng dễ chuẩn bị cho bạn.</p></div></div>
            <div className="booking-fields"><label>Phong cách / concept mong muốn<textarea value={form.concept} onChange={(e) => updateForm('concept', e.target.value)} placeholder="Ví dụ: tự nhiên, tối giản, vintage..." rows={3} /></label><label>Ghi chú khác<textarea value={form.notes} onChange={(e) => updateForm('notes', e.target.value)} placeholder="Trang phục, đạo cụ, yêu cầu đặc biệt..." rows={4} /></label></div>
          </section>

          <button className="booking-submit-button" type="submit" disabled={submitting}>{submitting ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu đặt lịch'} <ArrowRight size={18} /></button>
        </form>

        <aside className="booking-summary">
          <div className="booking-summary-card">
            <p className="booking-eyebrow">TÓM TẮT</p>
            {selectedPackage ? <><h2>{selectedPackage.name}</h2><p>{selectedPackage.description}</p><div className="booking-summary-line"><span>Giá tham khảo</span><strong>{formatPrice(selectedPackage.basePrice)}</strong></div><div className="booking-summary-details"><span><Clock3 size={16} /> {selectedPackage.durationMinutes} phút</span><span><Users size={16} /> Tối đa {selectedPackage.includedPeople} người</span><span><MapPin size={16} /> Giao ảnh trong {selectedPackage.deliveryDays} ngày</span></div></> : <div className="booking-summary-empty"><CalendarDays size={22} /><p>Chọn một gói để xem tóm tắt dịch vụ.</p></div>}
          </div>
          <div className="booking-policy-note"><strong>Lưu ý</strong><p>Chưa cần thanh toán ở bước này. Đội ngũ sẽ liên hệ để xác nhận lịch, tư vấn chi tiết và báo giá cuối cùng nếu có phụ phí.</p></div>
        </aside>
      </div>

      <BookingFAQ />
    </main>
  );
}

export default BookingPage;
