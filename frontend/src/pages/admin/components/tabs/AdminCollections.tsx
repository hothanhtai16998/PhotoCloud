import { getAdminIntlLocale, adminText, useAdminLocale } from '@/pages/admin/adminLocale';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/services/adminService';
import { usePermissions } from '@/hooks/usePermissions';
import { useUserStore } from '@/stores/useUserStore';
import { useAdminResource, adminError } from '../../hooks/useAdminResource';
import { AdminHeading, AdminFeedback, AdminEmpty, AdminPagination } from '../AdminPrimitives';
import { AdminModal } from '../AdminModal';
import { adminImageDate } from '../adminRecordFormatting';
import '../../AdminImagesPage.css';
import './AdminCollections.css';

interface Collection {
  _id: string;
  name?: string;
  description?: string;
  createdBy?: { username?: string; displayName?: string } | null;
  images?: unknown[];
  imageCount?: number;
  isPublic: boolean;
  views?: number;
  createdAt?: string;
}
function isCollection(value: unknown): value is Collection {
  return typeof value === 'object' && value !== null && '_id' in value && typeof value._id === 'string'
    && 'isPublic' in value && typeof value.isPublic === 'boolean';
}
const nameOf = (row: Collection) => row.name?.trim() || adminText("Bộ sưu tập chưa có tên");
const countOf = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value.toLocaleString(getAdminIntlLocale()) : '—';

export function AdminCollections() {
  useAdminLocale();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const canManage = isSuperAdmin() || hasPermission('manageCollections');
  const account = useUserStore(s => s.user?._id);
  const [params, setParams] = useSearchParams();
  const requested = Number(params.get('page'));
  const page = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
  const query = params.get('q') || '';
  const context = `${account}:${page}:${query}`;
  const loader = useCallback(async () => {
    const result = await adminService.getAllCollections({ page, limit: 20, search: query || undefined });
    if (!Array.isArray(result.collections) || !result.collections.every(isCollection) || !result.pagination
      || !Number.isSafeInteger(result.pagination.total) || result.pagination.total < 0
      || !Number.isSafeInteger(result.pagination.pages) || result.pagination.pages < 0) {
      throw new Error('Invalid collection response');
    }
    return { rows: result.collections, pagination: result.pagination, context: `${account}:${page}:${query}` };
  }, [account, page, query]);
  const { data, loading, error, reload } = useAdminResource(loader);
  const current = data?.context === context ? data : null;
  const pages = Math.max(1, current?.pagination.pages || 1);
  const busy = loading || !current || !!error;
  const [target, setTarget] = useState<Collection | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const lock = useRef(false);
  const generation = useRef(0);
  useEffect(() => { const session = generation; session.current++; return () => { session.current++; }; }, [account]);
  const navigate = useCallback((nextPage: number, nextQuery = query, replace = false) => {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      if (nextPage > 1) next.set('page', String(nextPage)); else next.delete('page');
      if (nextQuery) next.set('q', nextQuery); else next.delete('q');
      return next;
    }, { replace });
  }, [query, setParams]);
  useEffect(() => {
    if (current && !loading && !error && page > pages) navigate(pages, query, true);
  }, [current, loading, error, page, pages, query, navigate]);
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(1, String(new FormData(event.currentTarget).get('search') || '').trim());
  }
  async function mutate(row: Collection, remove: boolean) {
    if (lock.current || !canManage || busy) return;
    lock.current = true;
    const token = generation.current;
    setPending(row._id);
    setActionError(null);
    try {
      if (remove) await adminService.deleteCollection(row._id);
      else await adminService.updateCollection(row._id, { isPublic: !row.isPublic });
      if (token !== generation.current) return;
      toast.success(remove ? adminText("Đã xóa bộ sưu tập.") : row.isPublic ? adminText("Đã chuyển bộ sưu tập sang riêng tư.") : adminText("Đã công khai bộ sưu tập."));
      setTarget(null);
      await reload();
    } catch (cause) {
      if (token === generation.current) setActionError(adminError(cause));
    } finally {
      lock.current = false;
      if (token === generation.current) setPending(null);
    }
  }
  const close = () => { if (!lock.current) { setTarget(null); setActionError(null); } };
  return (
    <section className="admin-collections-page" aria-busy={loading}>
      <AdminHeading title={adminText("Bộ sưu tập")} description={adminText("Tra cứu bộ sưu tập, quản lý trạng thái công khai và nội dung cần gỡ.")}>
        <button className="admin-btn" disabled={loading || !!pending} onClick={() => { setActionError(null); void reload(); }}><RefreshCw size={16} />{loading ? adminText("Đang tải…") : adminText("Làm mới")}</button>
      </AdminHeading>
      <form className="admin-page-toolbar" onSubmit={search} key={query} role="search">
        <label className="admin-page-search"><Search size={18} aria-hidden="true" /><input type="search" name="search" aria-label={adminText("Tìm bộ sưu tập")} placeholder={adminText("Tìm tên hoặc mô tả bộ sưu tập…")} defaultValue={query} /></label>
        <button className="admin-btn" disabled={!!pending}>{adminText("Tìm kiếm")}</button>
        {query && <button type="button" className="admin-btn" disabled={!!pending} onClick={() => navigate(1, '')}>{adminText("Xóa lọc")}</button>}
      </form>
      <AdminFeedback error={error} retry={() => void reload()} />
      {!target && actionError && <p className="admin-feedback" role="alert">{actionError}  {adminText("Vui lòng thử lại thao tác.")}</p>}
      {loading && <p role="status">{adminText("Đang tải bộ sưu tập…")}</p>}
      {!loading && !error && current && <>
        <p className="admin-collections-summary" role="status">{countOf(current.pagination.total)}  {adminText("bộ sưu tập")}{query ? adminText("khớp với “{0}”", { 0: query }) : adminText("trong hệ thống")}.{!canManage && adminText("Bạn có quyền xem danh sách.")}</p>
        {current.rows.length === 0 ? <AdminEmpty title={query ? adminText("Không tìm thấy bộ sưu tập") : adminText("Chưa có bộ sưu tập")} description={query ? adminText("Thử từ khóa khác hoặc xóa lọc để xem tất cả.") : adminText("Bộ sưu tập do người dùng tạo sẽ xuất hiện tại đây.")} /> : <div className="admin-table-wrap">
          <table className="admin-table"><thead><tr><th scope="col">{adminText("Bộ sưu tập")}</th><th scope="col">{adminText("Người tạo")}</th><th scope="col">{adminText("Số ảnh")}</th><th scope="col">{adminText("Lượt xem")}</th><th scope="col">{adminText("Trạng thái")}</th><th scope="col">{adminText("Ngày tạo")}</th>{canManage && <th scope="col">{adminText("Thao tác")}</th>}</tr></thead>
            <tbody>{current.rows.map(row => <tr key={row._id}>
              <td><div className="admin-collection-name"><strong>{nameOf(row)}</strong><span>{row.description?.trim() || adminText("Chưa có mô tả")}</span></div></td>
              <td>{row.createdBy?.displayName || row.createdBy?.username || adminText("Chưa rõ người tạo")}</td>
              <td>{countOf(row.imageCount ?? (Array.isArray(row.images) ? row.images.length : undefined))}</td><td>{countOf(row.views)}</td>
              <td><span className="admin-badge">{row.isPublic ? adminText("Công khai") : adminText("Riêng tư")}</span></td><td>{adminImageDate(row.createdAt || '')}</td>
              {canManage && <td><div className="admin-row-actions"><button className="admin-btn" disabled={busy || !!pending} aria-label={`${row.isPublic ? adminText("Ẩn") : adminText("Công khai")} ${nameOf(row)}`} onClick={() => void mutate(row, false)}>{pending === row._id ? adminText("Đang xử lý…") : row.isPublic ? adminText("Ẩn") : adminText("Công khai")}</button><button className="admin-table-action danger" disabled={busy || !!pending} aria-label={adminText("Xóa {0}", { 0: nameOf(row) })} onClick={() => { setTarget(row); setActionError(null); }}><Trash2 size={17} /></button></div></td>}
            </tr>)}</tbody></table>
        </div>}
        {current.pagination.total > 0 && <AdminPagination page={page} pages={pages} total={current.pagination.total} loading={busy || !!pending} onChange={navigate} />}
      </>}
      <AdminModal open={!!target} title={adminText("Xóa bộ sưu tập")} onClose={close} size="sm" footer={<><button className="admin-btn" disabled={!!pending} onClick={close}>{adminText("Hủy")}</button><button className="admin-btn danger" disabled={!!pending || busy} onClick={() => target && void mutate(target, true)}>{pending ? adminText("Đang xóa…") : adminText("Xóa bộ sưu tập")}</button></>}>
        <p>{adminText("Bạn muốn xóa “")}{target ? nameOf(target) : ''}{adminText("”? Thao tác này không thể hoàn tác.")}</p>
        {actionError && <p className="admin-feedback" role="alert">{actionError}  {adminText("Bạn có thể thử xóa lại.")}</p>}
      </AdminModal>
    </section>
  );
}
