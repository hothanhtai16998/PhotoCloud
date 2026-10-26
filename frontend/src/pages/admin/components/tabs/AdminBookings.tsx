import { getAdminIntlLocale, adminText, useAdminLocale } from '@/pages/admin/adminLocale';
import { useEffect, useRef, useState } from 'react';
import { Save, Plus, Pencil, Eye, EyeOff, X, Clock3, Images, Users, CalendarCheck } from 'lucide-react';
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
import { AdminLanguageSelect } from '../AdminLanguageSelect';

type AdminPackage = BookingPackage & { active?: boolean; sortOrder?: number };

const emptyPackage: Omit<AdminPackage, '_id'> = {
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
  const locale = useAdminLocale();
  const [view, setView] = useState<
    'requests' | 'calendar' | 'packages' | 'availability' | 'reviews' | 'policy'
  >('requests');
  const [reviews, setReviews] = useState<BookingReview[]>([]);
  const [policyDirty, setPolicyDirty] = useState(false);
  const [availabilityDirty, setAvailabilityDirty] = useState(false);
  const [packages, setPackages] = useState<AdminPackage[]>([]);

  const [editingPackage, setEditingPackage] = useState<AdminPackage | null>(
    null
  );
  const [packageForm, setPackageForm] = useState(emptyPackage);
  const [packageEditorOpen, setPackageEditorOpen] = useState(false);
  const [packageBusy, setPackageBusy] = useState(false);
  const packageVisibilityLock = useRef(false);
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
      !window.confirm(adminText("Bỏ thay đổi chưa lưu và đóng biểu mẫu?"))) return;
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
      setPackagesError(getErrorMessage(error, adminText("Không thể tải gói chụp")));
    } finally {
      setPackagesLoading(false);
    }
  };
  const loadReviews = async () => {
    try {
      const result = await bookingService.getAdminReviews();
      setReviews(result.reviews);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, adminText("Không thể tải đánh giá")));
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
      const payload = { ...packageForm, includes: packageForm.includes?.map(line => line.trim()).filter(Boolean), gallery: packageForm.gallery?.map(line => line.trim()).filter(Boolean) };
      if (editingPackage?._id)
        await bookingService.updateAdminPackage(
          editingPackage._id,
          payload
        );
      else await bookingService.createAdminPackage(payload);
      toast.success(adminText("Đã lưu gói chụp"));
      setEditingPackage(null);
      setPackageForm(emptyPackage);
      setPackageEditorOpen(false);
      await loadPackages();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, adminText("Không thể lưu gói chụp")));
    } finally {
      setPackageBusy(false);
    }
  };
  const archivePackage = async (item: AdminPackage) => {
    if (!item._id || packageBusy || packageVisibilityLock.current) return;
    const restoring = item.active === false;
    if (!window.confirm(adminText("{0} gói “{1}”?", { 0: restoring ? adminText('Hiện lại') : adminText('Ẩn'), 1: item.name }))) return;
    packageVisibilityLock.current = true;
    setPackageBusy(true);
    try {
      if (restoring) {
        const restored: AdminPackage = { ...item, active: true };
        await bookingService.updateAdminPackage(item._id, restored);
      } else await bookingService.archiveAdminPackage(item._id);
      // The shared GET wrapper can reuse the pre-mutation response for one second.
      // Reflect the successful write locally instead of reloading that stale list.
      setPackages(current => current.map(row => row._id === item._id ? { ...row, active: restoring } : row));
      toast.success(restoring ? adminText("Đã hiện lại gói chụp") : adminText("Đã ẩn gói chụp"));
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, restoring ? adminText("Không thể hiện lại gói chụp") : adminText("Không thể ẩn gói chụp")));
    } finally {
      packageVisibilityLock.current = false;
      setPackageBusy(false);
    }
  };

  return (
    <div className="admin-bookings">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{adminText("Đặt lịch chụp")}</h1>
          <p className="admin-page-subtitle">
             {adminText("Từ yêu cầu đầu tiên đến buổi chụp hoàn tất, quản lý mọi việc tại đây.")} </p>
        </div>
      </header>
      <nav className="admin-booking-toolbar" aria-label={adminText("Quản lý lịch chụp")}>
        {(
          [
            ['requests', adminText("Yêu cầu")],
            ['calendar', adminText("Lịch")],
            ['availability', adminText("Lịch rảnh")],
            ['packages', adminText("Gói chụp")],
            ['reviews', adminText("Đánh giá")],
            ['policy', adminText("Chính sách")],
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
                  adminText("Có thay đổi chưa lưu. Bỏ thay đổi và chuyển tab?")
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
            <p>{adminText("Chưa có đánh giá nào.")}</p>
          ) : (
            reviews.map((item) => (
              <div className="admin-review-row" key={item._id}>
                <div>
                  <strong>
                    {item.rating}/5 ·{' '}
                    {(typeof item.booking === 'object'
                      ? item.booking?.bookingCode
                      : item.booking) || adminText("Lịch chụp")}
                  </strong>
                  <p>{item.comment || adminText("Không có bình luận.")}</p>
                  {item.adminReply && (
                    <small>{adminText("Phản hồi của bạn:")} {item.adminReply}</small>
                  )}
                  <div className="admin-review-reply">
                    <input
                      placeholder={adminText("Phản hồi cho khách...")}
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
                              getErrorMessage(error, adminText("Không thể gửi phản hồi"))
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
            <div><h2>{adminText("Gói chụp")}</h2><p>{adminText("Quản lý giá, thời lượng và quyền lợi của từng gói chụp.")}</p></div>
            <button type="button" className="admin-btn primary" disabled={packageBusy} onClick={() => {
              if (packageEditorOpen && !window.confirm(adminText("Bỏ nội dung đang nhập để thêm gói mới?"))) return;
              setEditingPackage(null); setPackageForm(emptyPackage); setPackageEditorOpen(true);
            }}><Plus size={18} />  {adminText("Thêm gói chụp")}</button>
          </header>
          {packageEditorOpen && <dialog lang={locale} ref={packageDialog} className="pc-package-dialog" aria-labelledby="package-dialog-title" onCancel={(event) => { event.preventDefault(); closePackageEditor(); }} onClick={(event) => { if (event.target === event.currentTarget) closePackageEditor(); }}>
          <form className="admin-package-form" onSubmit={(event) => { event.preventDefault(); void savePackage(); }}>
            <header className="pc-package-dialog-header">
              <div><h2 id="package-dialog-title">{editingPackage ? adminText("Chỉnh sửa gói chụp") : adminText("Thêm gói chụp")}</h2><p>{adminText("Thiết lập thông tin và quyền lợi dành cho khách đặt lịch.")}</p></div>
              <AdminLanguageSelect />
              <button type="button" className="admin-btn" aria-label={adminText("Đóng biểu mẫu gói chụp")} disabled={packageBusy} onClick={closePackageEditor}><X size={20} /></button>
            </header>
            <fieldset disabled={packageBusy} className="admin-package-fields">
              {(['name', 'slug', 'category', 'description'] as const).map(
                (key) => (
                  <label key={key}>
                    {key === 'slug'
                      ? adminText("Đường dẫn")
                      : key === 'name'
                        ? adminText("Tên gói")
                        : key === 'category'
                          ? adminText("Danh mục")
                          : adminText("Mô tả")}
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
                        placeholder={key === 'slug' ? 'vd: chan-dung-ca-nhan' : key === 'name' ? adminText("vd: Chân dung cá nhân") : undefined}
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
                 {adminText("Thời lượng (phút)")} <input
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
                 {adminText("Giá tham khảo")} <input
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
                 {adminText("Số ảnh")} <input
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
                 {adminText("Số người")} <input
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
                 {adminText("Ngày giao ảnh")} <input
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
              <label className="pc-package-content-field">Mô tả chi tiết trên trang Gói chụp
                <textarea rows={5} maxLength={5000} value={packageForm.detailDescription || ''} onChange={e => setPackageForm({ ...packageForm, detailDescription: e.target.value })} />
              </label>
              <label className="pc-package-content-field">Quyền lợi bổ sung — mỗi dòng một mục (tối đa 20)
                <textarea rows={4} value={(packageForm.includes || []).join('\n')} onChange={e => setPackageForm({ ...packageForm, includes: e.target.value.split('\n') })} />
                <small>Thời lượng, số ảnh, số người và ngày giao đã được hiển thị tự động từ thông số gói.</small>
              </label>
              <label className="pc-package-content-field">Đường dẫn ảnh bìa
                <input type="url" placeholder="https://..." value={packageForm.coverUrl || ''} onChange={e => setPackageForm({ ...packageForm, coverUrl: e.target.value })} />
                <small>Để trống nếu chưa có ảnh. Dùng URL HTTPS của ảnh studio có quyền công bố.</small>
              </label>
              <label className="pc-package-content-field">Ảnh buổi chụp — mỗi dòng một URL HTTPS (tối đa 12)
                <textarea rows={5} value={(packageForm.gallery || []).join('\n')} onChange={e => setPackageForm({ ...packageForm, gallery: e.target.value.split('\n') })} />
                <small>Giữ đúng thứ tự ảnh muốn xuất hiện. Có thể dán đường dẫn ảnh từ thư viện; chưa có ảnh thì để trống.</small>
              </label>
            </fieldset>
            <div className="admin-package-actions">
              <button type="submit" disabled={packageBusy}>
                <Save size={16} /> {packageBusy ? adminText("Đang lưu…") : adminText("Lưu gói chụp")}
              </button>
                <button
                  type="button" disabled={packageBusy}
                  onClick={closePackageEditor}
                >
                   {adminText("Đóng")} </button>
            </div>
          </form></dialog>}
          <div className="admin-package-list" aria-busy={packagesLoading}>
            {packagesLoading ? <p role="status">{adminText("Đang tải gói chụp…")}</p> : packagesError ? <div role="alert"><p>{packagesError}</p><button className="admin-btn" onClick={() => void loadPackages()}>{adminText("Thử lại")}</button></div> : packages.length === 0 ? <p>{adminText("Chưa có gói chụp. Thêm gói đầu tiên để khách có thể đặt lịch.")}</p> : packages.map((item) => (
              <div className="admin-package-row" key={item._id || item.slug}>
                <div>
                  <strong>{item.name}</strong>
                  <p className="pc-package-description">{item.active === false ? adminText("Đã ẩn — khách không thể chọn gói này. Bạn có thể hiện lại.") : adminText("Đang hiển thị")}</p>
                  {item.description && <p className="pc-package-description">{item.description}</p>}
                  <dl className="pc-package-specs">
                    <div><Clock3 size={17} aria-hidden="true" /><dt>{adminText("Thời lượng")}</dt><dd>{item.durationMinutes}  {adminText("phút")}</dd></div>
                    <div><Images size={17} aria-hidden="true" /><dt>{adminText("Số ảnh")}</dt><dd>{item.includedPhotos}  {adminText("ảnh")}</dd></div>
                    <div><Users size={17} aria-hidden="true" /><dt>{adminText("Số người")}</dt><dd>{item.includedPeople}  {adminText("người")}</dd></div>
                    <div><CalendarCheck size={17} aria-hidden="true" /><dt>{adminText("Giao ảnh")}</dt><dd>{item.deliveryDays}  {adminText("ngày")}</dd></div>
                  </dl>
                </div>
                <p className="pc-package-price">
                    {new Intl.NumberFormat(getAdminIntlLocale(), {
                      style: 'currency',
                      currency: 'VND',
                      maximumFractionDigits: 0,
                    }).format(item.basePrice)}
                  <span>{adminText("Giá tham khảo")}</span>
                </p>
                <div>
                  <button
                    disabled={packageBusy}
                    aria-label={adminText("Sửa gói {0}", { 0: item.name })}
                    onClick={() => {
                      if (packageEditorOpen && !window.confirm(adminText("Bỏ nội dung đang nhập để sửa gói này?"))) return;
                      setEditingPackage(item);
                      setPackageForm(item);
                      setPackageEditorOpen(true);
                    }}
                  >
                    <Pencil size={16} />  {adminText("Sửa")} </button>
                  <button disabled={packageBusy} aria-label={adminText("{0} gói {1}", { 0: item.active === false ? adminText('Hiện lại') : adminText('Ẩn'), 1: item.name })} onClick={() => archivePackage(item)}>{item.active === false ? <Eye size={16} /> : <EyeOff size={16} />} {item.active === false ? adminText("Hiện lại") : adminText("Ẩn")}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

