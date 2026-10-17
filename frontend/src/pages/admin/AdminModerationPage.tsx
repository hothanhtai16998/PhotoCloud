import { getAdminIntlLocale, adminText, useAdminLocale } from '@/pages/admin/adminLocale';
import { useCallback, useState } from 'react';
import { Check, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/services/adminService';
import {
  AdminHeading,
  AdminFeedback,
  AdminEmpty,
  AdminPagination,
} from './components/AdminPrimitives';
import { AdminModal } from './components/AdminModal';
import { useAdminResource, adminError } from './hooks/useAdminResource';
import './AdminImagesPage.css';
export interface PendingContent {
  _id: string;
  title: string;
  imageUrl: string;
  uploadedBy?: { username: string; displayName?: string };
  category?: { name: string };
  createdAt: string;
}
export function AdminModerationPage() {
  useAdminLocale();
  const loader = useCallback(
    async () =>
      (await adminService.getPendingContent()).content as PendingContent[],
    []
  );
  const { data, loading, error, reload, setData } = useAdminResource(loader);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<PendingContent | null>(null);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const pages = Math.max(1, Math.ceil((data?.length || 0) / 12));
  const current = Math.min(page, pages);
  const act = async (item: PendingContent, reject: boolean) => {
    if (busy) return;
    setBusy(item._id);
    setActionError(null);
    try {
      if (reject) await adminService.rejectContent(item._id, reason.trim());
      else await adminService.approveContent(item._id);
      setData((previous) => previous?.filter((i) => i._id !== item._id) || []);
      setRejecting(null);
      toast.success(reject ? adminText("Đã từ chối ảnh") : adminText("Đã duyệt ảnh"));
    } catch (cause) {
      setActionError(adminError(cause));
    } finally {
      setBusy(null);
    }
  };
  return (
    <section>
      <AdminHeading
        title={adminText("Duyệt nội dung")}
        description={
          data
            ? data.length +
              adminText("ảnh chờ duyệt. Kiểm tra ảnh và thông tin trước khi xuất bản.")
            : adminText("Kiểm tra những ảnh mới được gửi lên PhotoCloud.")
        }
      >
        <button
          className="admin-btn"
          disabled={loading || !!busy}
          onClick={() => void reload()}
        >
          <RefreshCw size={16} />
           {adminText("Làm mới")} </button>
      </AdminHeading>
      <AdminFeedback error={error} retry={() => void reload()} />
      {actionError && !rejecting && (
        <p className="admin-form-error" role="alert">
          {actionError}
        </p>
      )}
      {loading && !data ? (
        <div className="admin-skeleton tall" />
      ) : !error && data?.length === 0 ? (
        <AdminEmpty
          title={adminText("Đã xử lý hết ảnh chờ duyệt")}
          description={adminText("Ảnh mới gửi lên sẽ xuất hiện tại đây để bạn kiểm tra.")}
        />
      ) : (
        <div className="admin-review-grid">
          {data?.slice((current - 1) * 12, current * 12).map((item) => (
            <article className="admin-review-item" key={item._id}>
              <a
                href={item.imageUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={adminText("Xem ảnh đầy đủ: ") + item.title}
              >
                <img
                  src={item.imageUrl}
                  alt={item.title || adminText("Ảnh chờ duyệt")}
                  loading="lazy"
                />
              </a>
              <div className="admin-review-info">
                <span className="admin-badge warning">{adminText("Chờ duyệt")}</span>
                <h2>{item.title || adminText("Chưa đặt tên")}</h2>
                <p>
                  {item.uploadedBy?.displayName ||
                    item.uploadedBy?.username ||
                    adminText("Chưa rõ tác giả")}{' '}
                  · {item.category?.name || adminText("Chưa phân loại")}
                </p>
                <small>
                  {new Date(item.createdAt).toLocaleDateString(getAdminIntlLocale())}
                </small>
                <div className="admin-review-actions">
                  <button
                    className="admin-btn primary"
                    disabled={!!busy}
                    onClick={() => void act(item, false)}
                  >
                    <Check size={16} />
                    {busy === item._id ? adminText("Đang xử lý…") : adminText("Duyệt ảnh")}
                  </button>
                  <button
                    className="admin-btn"
                    disabled={!!busy}
                    onClick={() => {
                      setReason('');
                      setActionError(null);
                      setRejecting(item);
                    }}
                  >
                    <X size={16} />
                     {adminText("Từ chối")} </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {!!data?.length && (
        <AdminPagination
          page={current}
          pages={pages}
          total={data.length}
          loading={loading}
          onChange={setPage}
        />
      )}
      {rejecting && (
        <AdminModal
          open
          title={adminText("Từ chối ảnh")}
          description={
            adminText("Ảnh “") + rejecting.title + adminText("” sẽ chuyển sang trạng thái từ chối.")
          }
          onClose={() => {
            if (!busy) setRejecting(null);
          }}
          footer={
            <>
              <button
                className="admin-btn"
                disabled={!!busy}
                onClick={() => setRejecting(null)}
              >
                 {adminText("Hủy")} </button>
              <button
                className="admin-btn danger"
                disabled={!!busy || !reason.trim()}
                onClick={() => void act(rejecting, true)}
              >
                {busy ? adminText("Đang xử lý…") : adminText("Xác nhận từ chối")}
              </button>
            </>
          }
        >
          <label className="admin-settings-field">
             {adminText("Lý do từ chối")} <textarea
              className="admin-input"
              rows={4}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={adminText("Giải thích ngắn gọn để tác giả có thể điều chỉnh ảnh.")}
            />
          </label>
          {actionError && (
            <p className="admin-form-error" role="alert">
              {actionError}
            </p>
          )}
        </AdminModal>
      )}
    </section>
  );
}
