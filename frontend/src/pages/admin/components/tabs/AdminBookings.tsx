import { AdminPackageEditorFields } from '../bookings/AdminPackageEditorFields';
import { normalizePackage, validatePackageForm, packageTabs, packageTabForField, type PackageTab, type AdminPackage, type PackageErrors } from '../bookings/adminPackageForm';
import { getAdminIntlLocale, adminText, useAdminLocale } from '@/pages/admin/adminLocale';
import { useEffect, useRef, useState } from 'react';
import { Save, Plus, Pencil, Eye, EyeOff, X, Clock3, Images, Users, CalendarCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  bookingService,
} from '@/services/bookingService';

import type { BookingReview } from '@/types/bookingFinal';
import { getErrorMessage } from '@/lib/utils';
import { AdminBookingRequests } from '../bookings/AdminBookingRequests';
import { AdminBookingCalendar } from '../bookings/AdminBookingCalendar';
import { AdminBookingPolicy } from '../bookings/AdminBookingPolicy';
import { AdminBookingAvailability } from '../bookings/AdminBookingAvailability';
import '../bookings/AdminBookingPackages.css';
import { AdminLanguageSelect } from '../AdminLanguageSelect';



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
  active: true, sortOrder: 0,
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
  const packageRequest = useRef(0);
  const packageMounted = useRef(true);
  const [packageErrors, setPackageErrors] = useState<PackageErrors>({});
  const [packageSaveError, setPackageSaveError] = useState('');
  const [packageTab, setPackageTab] = useState<PackageTab>('info');
  const [packageMediaBusy, setPackageMediaBusy] = useState(false);
  const packageMediaLock = useRef(false);
  useEffect(() => { packageMounted.current = true; return () => { packageMounted.current = false; }; }, []);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packagesError, setPackagesError] = useState('');
  const packageDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!packageEditorOpen || (!packageMediaBusy && JSON.stringify(packageForm) === JSON.stringify(editingPackage || emptyPackage))) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [packageEditorOpen, packageForm, editingPackage, packageMediaBusy]);
  useEffect(() => {
    if (!packageEditorOpen) return;
    const trigger = document.activeElement;
    packageDialog.current?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus(); };
  }, [packageEditorOpen]);
  const closePackageEditor = () => {
    if (packageBusy || packageMediaLock.current) return;
    const original = editingPackage || emptyPackage;
    if (JSON.stringify(packageForm) !== JSON.stringify(original) &&
      !window.confirm(adminText("Bỏ thay đổi chưa lưu và đóng biểu mẫu?"))) return;
    setPackageEditorOpen(false);
    setEditingPackage(null);
    setPackageForm(emptyPackage);
  };

  const loadPackages = async () => {
    const request = ++packageRequest.current;
    setPackagesLoading(true);
    setPackagesError('');
    try {
      const result = await bookingService.getAdminPackages();
      if (request === packageRequest.current && packageMounted.current) setPackages(result.packages);
    } catch (error: unknown) {
      if (request === packageRequest.current && packageMounted.current) setPackagesError(getErrorMessage(error, adminText("Không thể tải gói chụp")));
    } finally {
      if (request === packageRequest.current && packageMounted.current) setPackagesLoading(false);
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
    if (packageBusy || packageMediaLock.current || packageVisibilityLock.current) return;
    const errors = validatePackageForm(packageForm);
    setPackageErrors(errors);
    setPackageSaveError('');
    if (Object.keys(errors).length) {
      setPackageTab(packageTabForField(Object.keys(errors)[0]));
      requestAnimationFrame(() => packageDialog.current?.querySelector<HTMLElement>('[aria-invalid=true]')?.focus());
      return;
    }
    packageVisibilityLock.current = true;
    packageRequest.current++;
    setPackageBusy(true);
    try {
      const payload = normalizePackage(packageForm);
      const result = editingPackage?._id
        ? await bookingService.updateAdminPackage(editingPackage._id, payload)
        : await bookingService.createAdminPackage(payload);
      if (!packageMounted.current) return;
      const saved: AdminPackage = result.package;
      setPackages(current => (current.some(item => item._id === saved._id)
        ? current.map(item => item._id === saved._id ? saved : item)
        : [...current, saved]).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
      setPackagesLoading(false);
      setPackagesError('');
      toast.success(adminText("Đã lưu gói chụp"));
      setEditingPackage(null);
      setPackageForm(emptyPackage);
      setPackageEditorOpen(false);
    } catch (error: unknown) {
      if (packageMounted.current) setPackageSaveError(getErrorMessage(error, adminText("Không thể lưu gói chụp")));
    } finally {
      packageVisibilityLock.current = false;
      if (packageMounted.current) setPackageBusy(false);
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
      if (!packageMounted.current) return;
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
            <button type="button" className="admin-btn primary" disabled={packageBusy || packagesLoading} onClick={() => {
              if (packageEditorOpen && !window.confirm(adminText("Bỏ nội dung đang nhập để thêm gói mới?"))) return;
              setEditingPackage(null); setPackageForm(emptyPackage); setPackageErrors({}); setPackageSaveError(''); setPackageTab('info'); setPackageEditorOpen(true);
            }}><Plus size={18} />  {adminText("Thêm gói chụp")}</button>
          </header>
          {packageEditorOpen && <dialog lang={locale} ref={packageDialog} className="pc-package-dialog" aria-labelledby="package-dialog-title" onCancel={(event) => { event.preventDefault(); closePackageEditor(); }} onClick={(event) => { if (event.target === event.currentTarget) closePackageEditor(); }}>
          <form className="admin-package-form" noValidate onSubmit={(event) => { event.preventDefault(); void savePackage(); }}>
            <header className="pc-package-dialog-header">
              <div><h2 id="package-dialog-title">{editingPackage ? adminText("Chỉnh sửa gói chụp") : adminText("Thêm gói chụp")}</h2><p>{adminText("Thiết lập thông tin và quyền lợi dành cho khách đặt lịch.")}</p></div>
              <AdminLanguageSelect />
              <button type="button" className="admin-btn" aria-label={adminText("Đóng biểu mẫu gói chụp")} disabled={packageBusy || packageMediaBusy} onClick={closePackageEditor}><X size={20} /></button>
            </header>
            <div className="pc-package-tabs" role="tablist" aria-label={adminText('Chỉnh sửa gói chụp')}>
              {packageTabs.map((item, index) => <button type="button" role="tab" id={`package-tab-${item.id}`} aria-controls={`package-panel-${item.id}`} aria-selected={packageTab === item.id} tabIndex={packageTab === item.id ? 0 : -1} key={item.id} disabled={packageBusy || packageMediaBusy} onClick={() => { setPackageTab(item.id); packageDialog.current?.querySelector('.pc-package-fields-scroll')?.scrollTo(0, 0); }} onKeyDown={event => {
                const next = event.key === 'ArrowRight' ? (index + 1) % packageTabs.length : event.key === 'ArrowLeft' ? (index + packageTabs.length - 1) % packageTabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? packageTabs.length - 1 : -1;
                if (next >= 0) { event.preventDefault(); setPackageTab(packageTabs[next].id); packageDialog.current?.querySelector<HTMLElement>(`#package-tab-${packageTabs[next].id}`)?.focus(); }
              }}>{adminText(item.label)}{Object.keys(packageErrors).some(key => packageTabForField(key) === item.id) && <span aria-label={adminText('Có lỗi')}>!</span>}</button>)}
            </div>
            {packageSaveError && <p role="alert" className="pc-package-save-error">{packageSaveError}</p>}
            <div className="pc-package-fields-scroll"><fieldset disabled={packageBusy} className="admin-package-fields"><AdminPackageEditorFields form={packageForm} onChange={next => { setPackageForm(next); if (Object.keys(packageErrors).length) setPackageErrors(validatePackageForm(next)); setPackageSaveError(''); }} errors={packageErrors} tab={packageTab} onMediaBusyChange={busy => { packageMediaLock.current = busy; setPackageMediaBusy(busy); }} /></fieldset></div>
            <div className="admin-package-actions">
              <button type="submit" disabled={packageBusy || packageMediaBusy}>
                <Save size={16} /> {packageBusy ? adminText("Đang lưu…") : adminText("Lưu gói chụp")}
              </button>
                <button
                  type="button" disabled={packageBusy || packageMediaBusy}
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
                  <p className="pc-package-content-summary">{adminText(item.coverUrl ? 'Có ảnh bìa' : 'Chưa có ảnh bìa')} · {adminText('Album: {0} ảnh', { 0: item.gallery?.length || 0 })} · {adminText('Thứ tự: {0}', { 0: item.sortOrder || 0 })}</p>
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
                    disabled={packageBusy || packageMediaBusy}
                    aria-label={adminText("Sửa gói {0}", { 0: item.name })}
                    onClick={() => {
                      if (packageEditorOpen && !window.confirm(adminText("Bỏ nội dung đang nhập để sửa gói này?"))) return;
                      setEditingPackage(item);
                      setPackageForm(item);
                      setPackageErrors({}); setPackageSaveError(''); setPackageTab('info'); setPackageEditorOpen(true);
                    }}
                  >
                    <Pencil size={16} />  {adminText("Sửa")} </button>
                  <button disabled={packageBusy || packageMediaBusy} aria-label={adminText("{0} gói {1}", { 0: item.active === false ? adminText('Hiện lại') : adminText('Ẩn'), 1: item.name })} onClick={() => archivePackage(item)}>{item.active === false ? <Eye size={16} /> : <EyeOff size={16} />} {item.active === false ? adminText("Hiện lại") : adminText("Ẩn")}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

