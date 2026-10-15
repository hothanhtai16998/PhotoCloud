import { useEffect, useRef, useState } from 'react';
import { Save, Plus, Pencil, EyeOff, X, Clock3, Images, Users, CalendarCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  bookingService,
} from '@/services/bookingService';
import type { BookingPackage } from '@/types/booking';
import type { BookingReview } from '@/types/bookingFinal';
import { getErrorMessage } from '@/lib/utils';
import { AdminBookingRequests } from '../bookings/AdminBookingRequests';
import { AdminBookingCalendar } from '../bookings/AdminBookingCalendar';
import { AdminBookingPolicy } from '../bookings/AdminBookingPolicy';
import { AdminBookingAvailability } from '../bookings/AdminBookingAvailability';
import '../bookings/AdminBookingPackages.css';

const emptyPackage: Omit<BookingPackage, '_id'> = {
  slug: '',
  name: '',
  description: '',
  durationMinutes: 60,
  basePrice: 0,
  includedPhotos: 10,
  includedPeople: 1,
  deliveryDays: 7,
  category: 'portrait',
};

export function AdminBookings() {
  const [view, setView] = useState<
    'requests' | 'calendar' | 'packages' | 'availability' | 'reviews' | 'policy'
  >('requests');
  const [reviews, setReviews] = useState<BookingReview[]>([]);
  const [policyDirty, setPolicyDirty] = useState(false);
  const [availabilityDirty, setAvailabilityDirty] = useState(false);
  const [packages, setPackages] = useState<BookingPackage[]>([]);

  const [editingPackage, setEditingPackage] = useState<BookingPackage | null>(
    null
  );
  const [packageForm, setPackageForm] = useState(emptyPackage);
  const [packageEditorOpen, setPackageEditorOpen] = useState(false);
  const [packageBusy, setPackageBusy] = useState(false);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packagesError, setPackagesError] = useState('');
  const packageDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!packageEditorOpen) return;
    packageDialog.current?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [packageEditorOpen]);
  const closePackageEditor = () => {
    if (packageBusy) return;
    const original = editingPackage || emptyPackage;
    if (JSON.stringify(packageForm) !== JSON.stringify(original) &&
      !window.confirm('Bỏ thay đổi chưa lưu và đóng biểu mẫu?')) return;
    setPackageEditorOpen(false);
    setEditingPackage(null);
    setPackageForm(emptyPackage);
  };

  const loadPackages = async () => {
    setPackagesLoading(true);
    setPackagesError('');
    try {
      const result = await bookingService.getAdminPackages();
      setPackages(result.packages);
    } catch (error: unknown) {
      setPackagesError(getErrorMessage(error, 'Không thể tải gói chụp'));
    } finally {
      setPackagesLoading(false);
    }
  };
  const loadReviews = async () => {
    try {
      const result = await bookingService.getAdminReviews();
      setReviews(result.reviews);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Không thể tải đánh giá'));
    }
  };
  useEffect(() => {
    if (view === 'packages') void loadPackages();

    if (view === 'reviews') void loadReviews();
  }, [view]);

  const savePackage = async () => {
    if (packageBusy) return;
    setPackageBusy(true);
    try {
      if (editingPackage?._id)
        await bookingService.updateAdminPackage(
          editingPackage._id,
          packageForm
        );
      else await bookingService.createAdminPackage(packageForm);
      toast.success('Đã lưu gói chụp');
      setEditingPackage(null);
      setPackageForm(emptyPackage);
      setPackageEditorOpen(false);
      await loadPackages();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Không thể lưu gói chụp'));
    } finally {
      setPackageBusy(false);
    }
  };
  const archivePackage = async (item: BookingPackage) => {
    if (!item._id || !window.confirm(`Ẩn gói “${item.name}”?`)) return;
    try {
      await bookingService.archiveAdminPackage(item._id);
      await loadPackages();
      toast.success('Đã ẩn gói chụp');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Không thể ẩn gói chụp'));
    }
  };

  return (
    <div className="admin-bookings">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Đặt lịch chụp</h1>
          <p className="admin-page-subtitle">
            Từ yêu cầu đầu tiên đến buổi chụp hoàn tất, quản lý mọi việc tại
            đây.
          </p>
        </div>
      </header>
      <nav className="admin-booking-toolbar" aria-label="Quản lý lịch chụp">
        {(
          [
            ['requests', 'Yêu cầu'],
            ['calendar', 'Lịch'],
            ['availability', 'Lịch rảnh'],
            ['packages', 'Gói chụp'],
            ['reviews', 'Đánh giá'],
            ['policy', 'Chính sách'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            className={view === key ? 'active' : ''}
            aria-pressed={view === key}
            onClick={() => {
              if (
                (policyDirty || availabilityDirty) &&
                !window.confirm(
                  'Có thay đổi chưa lưu. Bỏ thay đổi và chuyển tab?'
                )
              )
                return;
              setPolicyDirty(false);
              setAvailabilityDirty(false);
              setView(key);
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      {view === 'requests' && <AdminBookingRequests />}
      {view === 'calendar' && <AdminBookingCalendar />}
      {view === 'availability' && <AdminBookingAvailability onDirty={setAvailabilityDirty} />}
      {view === 'reviews' && (
        <div className="admin-reviews">
          {reviews.length === 0 ? (
            <p>Chưa có đánh giá nào.</p>
          ) : (
            reviews.map((item) => (
              <div className="admin-review-row" key={item._id}>
                <div>
                  <strong>
                    {item.rating}/5 ·{' '}
                    {(typeof item.booking === 'object'
                      ? item.booking?.bookingCode
                      : item.booking) || 'Lịch chụp'}
                  </strong>
                  <p>{item.comment || 'Không có bình luận.'}</p>
                  {item.adminReply && (
                    <small>Phản hồi của bạn: {item.adminReply}</small>
                  )}
                  <div className="admin-review-reply">
                    <input
                      placeholder="Phản hồi cho khách..."
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          try {
                            await bookingService.replyReview(
                              item._id,
                              (e.target as HTMLInputElement).value
                            );
                            loadReviews();
                          } catch (error: unknown) {
                            toast.error(
                              getErrorMessage(error, 'Không thể gửi phản hồi')
                            );
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      {view === 'policy' && <AdminBookingPolicy onDirty={setPolicyDirty} />}
      {view === 'packages' && (
        <div className={`pc-packages ${packageEditorOpen ? 'is-editing' : ''}`}>
          <header className="pc-packages-header">
            <div><h2>Gói chụp</h2><p>Quản lý giá, thời lượng và quyền lợi của từng gói chụp.</p></div>
            <button type="button" className="admin-btn primary" disabled={packageBusy} onClick={() => {
              if (packageEditorOpen && !window.confirm('Bỏ nội dung đang nhập để thêm gói mới?')) return;
              setEditingPackage(null); setPackageForm(emptyPackage); setPackageEditorOpen(true);
            }}><Plus size={18} /> Thêm gói chụp</button>
          </header>
          {packageEditorOpen && <dialog ref={packageDialog} className="pc-package-dialog" aria-labelledby="package-dialog-title" onCancel={(event) => { event.preventDefault(); closePackageEditor(); }} onClick={(event) => { if (event.target === event.currentTarget) closePackageEditor(); }}>
          <form className="admin-package-form" onSubmit={(event) => { event.preventDefault(); void savePackage(); }}>
            <header className="pc-package-dialog-header">
              <div><h2 id="package-dialog-title">{editingPackage ? 'Chỉnh sửa gói chụp' : 'Thêm gói chụp'}</h2><p>Thiết lập thông tin và quyền lợi dành cho khách đặt lịch.</p></div>
              <button type="button" className="admin-btn" aria-label="Đóng biểu mẫu gói chụp" disabled={packageBusy} onClick={closePackageEditor}><X size={20} /></button>
            </header>
            <fieldset disabled={packageBusy} className="admin-package-fields">
              {(['name', 'slug', 'category', 'description'] as const).map(
                (key) => (
                  <label key={key}>
                    {key === 'slug'
                      ? 'Đường dẫn'
                      : key === 'name'
                        ? 'Tên gói'
                        : key === 'category'
                          ? 'Danh mục'
                          : 'Mô tả'}
                    {key === 'description' ? (
                      <textarea
                        required maxLength={1000}
                        rows={3}
                        value={packageForm[key]}
                        onChange={(e) =>
                          setPackageForm({
                            ...packageForm,
                            [key]: e.target.value,
                          })
                        }
                      />
                    ) : (
                      <input
                        required
                        placeholder={key === 'slug' ? 'vd: chan-dung-ca-nhan' : key === 'name' ? 'vd: Chân dung cá nhân' : undefined}
                        value={packageForm[key]}
                        onChange={(e) =>
                          setPackageForm({
                            ...packageForm,
                            [key]: e.target.value,
                          })
                        }
                      />
                    )}
                  </label>
                )
              )}
              <label>
                Thời lượng (phút)
                <input
                  type="number"
                  required min={15} max={1440}
                  value={packageForm.durationMinutes}
                  onChange={(e) =>
                    setPackageForm({
                      ...packageForm,
                      durationMinutes: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                Giá tham khảo
                <input
                  type="number"
                  required min={0}
                  value={packageForm.basePrice}
                  onChange={(e) =>
                    setPackageForm({
                      ...packageForm,
                      basePrice: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                Số ảnh
                <input
                  type="number"
                  required min={0}
                  value={packageForm.includedPhotos}
                  onChange={(e) =>
                    setPackageForm({
                      ...packageForm,
                      includedPhotos: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                Số người
                <input
                  type="number"
                  required min={1} max={100}
                  value={packageForm.includedPeople}
                  onChange={(e) =>
                    setPackageForm({
                      ...packageForm,
                      includedPeople: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                Ngày giao ảnh
                <input
                  type="number"
                  required min={1} max={365}
                  value={packageForm.deliveryDays}
                  onChange={(e) =>
                    setPackageForm({
                      ...packageForm,
                      deliveryDays: Number(e.target.value),
                    })
                  }
                />
              </label>
            </fieldset>
            <div className="admin-package-actions">
              <button type="submit" disabled={packageBusy}>
                <Save size={16} /> {packageBusy ? 'Đang lưu…' : 'Lưu gói chụp'}
              </button>
                <button
                  type="button" disabled={packageBusy}
                  onClick={closePackageEditor}
                >
                  Đóng
                </button>
            </div>
          </form></dialog>}
          <div className="admin-package-list" aria-busy={packagesLoading}>
            {packagesLoading ? <p role="status">Đang tải gói chụp…</p> : packagesError ? <div role="alert"><p>{packagesError}</p><button className="admin-btn" onClick={() => void loadPackages()}>Thử lại</button></div> : packages.length === 0 ? <p>Chưa có gói chụp. Thêm gói đầu tiên để khách có thể đặt lịch.</p> : packages.map((item) => (
              <div className="admin-package-row" key={item._id || item.slug}>
                <div>
                  <strong>{item.name}</strong>
                  {item.description && <p className="pc-package-description">{item.description}</p>}
                  <dl className="pc-package-specs">
                    <div><Clock3 size={17} aria-hidden="true" /><dt>Thời lượng</dt><dd>{item.durationMinutes} phút</dd></div>
                    <div><Images size={17} aria-hidden="true" /><dt>Số ảnh</dt><dd>{item.includedPhotos} ảnh</dd></div>
                    <div><Users size={17} aria-hidden="true" /><dt>Số người</dt><dd>{item.includedPeople} người</dd></div>
                    <div><CalendarCheck size={17} aria-hidden="true" /><dt>Giao ảnh</dt><dd>{item.deliveryDays} ngày</dd></div>
                  </dl>
                </div>
                <p className="pc-package-price">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                      maximumFractionDigits: 0,
                    }).format(item.basePrice)}
                  <span>Giá tham khảo</span>
                </p>
                <div>
                  <button
                    disabled={packageBusy}
                    aria-label={`Sửa gói ${item.name}`}
                    onClick={() => {
                      if (packageEditorOpen && !window.confirm('Bỏ nội dung đang nhập để sửa gói này?')) return;
                      setEditingPackage(item);
                      setPackageForm(item);
                      setPackageEditorOpen(true);
                    }}
                  >
                    <Pencil size={16} /> Sửa
                  </button>
                  <button disabled={packageBusy} aria-label={`Ẩn gói ${item.name}`} onClick={() => archivePackage(item)}><EyeOff size={16} /> Ẩn</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

