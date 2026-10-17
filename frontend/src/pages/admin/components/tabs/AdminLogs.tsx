import { getAdminIntlLocale, adminText, useAdminLocale } from '@/pages/admin/adminLocale';
import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/services/adminService';
import { usePermissions } from '@/hooks/usePermissions';
import { useUserStore } from '@/stores/useUserStore';
import { useAdminResource } from '../../hooks/useAdminResource';
import { AdminHeading, AdminFeedback, AdminEmpty, AdminPagination } from '../AdminPrimitives';
import { normalizeLog, logLevel, logTime, logUser, logEventLabel } from './adminLogFormatting';
import './AdminLogs.css';

const levels = ['info', 'warn', 'error', 'debug'] as const;
export function AdminLogs() {
  useAdminLocale();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const canView = isSuperAdmin() || hasPermission('viewLogs');
  const canExport = isSuperAdmin() || hasPermission('exportData');
  const account = useUserStore(s => s.user?._id);
  const [params, setParams] = useSearchParams();
  const requestedPage = Number(params.get('page'));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const query = params.get('q') || '';
  const rawLevel = params.get('level') || '';
  const level = levels.find(value => value === rawLevel) || '';
  const context = `${account}:${page}:${query}:${level}`;
  const loader = useCallback(async () => {
    if (!canView) return null;
    const result = await adminService.getSystemLogs({ page, limit: 50, search: query || undefined, level: level || undefined });
    if (!Array.isArray(result.logs) || !result.pagination || !Number.isSafeInteger(result.pagination.total)
      || result.pagination.total < 0 || !Number.isSafeInteger(result.pagination.pages) || result.pagination.pages < 0) {
      throw new Error('Invalid logs response');
    }
    return { rows: result.logs.map(normalizeLog), pagination: result.pagination, context: `${account}:${page}:${query}:${level}` };
  }, [account, canView, page, query, level]);
  const { data, loading, error, reload } = useAdminResource(loader);
  const current = data?.context === context ? data : null;
  const pages = Math.max(1, current?.pagination.pages || 1);
  const navigate = useCallback((nextPage: number, nextQuery = query, nextLevel = level, replace = false) => {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      if (nextPage > 1) next.set('page', String(nextPage)); else next.delete('page');
      if (nextQuery) next.set('q', nextQuery); else next.delete('q');
      if (nextLevel) next.set('level', nextLevel); else next.delete('level');
      return next;
    }, { replace });
  }, [query, level, setParams]);
  useEffect(() => {
    if (current && !loading && !error && page > pages) navigate(pages, query, level, true);
  }, [current, loading, error, page, pages, query, level, navigate]);
  function exportPage() {
    if (!current || loading || error || !canExport || !canView) return;
    let url: string | undefined;
    try {
      // Export only the four visible fields, not hidden API metadata.
      const payload = {
        page, search: query, level: level || null, scope: 'current_page',
        logs: current.rows.map(row => ({ timestamp: row.timestamp, level: row.level, message: row.message, user: logUser(row.userId) })),
      };
      url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url; link.download = `nhat-ky-trang-${page}.json`;
      document.body.appendChild(link); link.click(); link.remove();
    } catch { toast.error(adminText("Không thể tạo tệp nhật ký. Vui lòng thử lại.")); }
    finally { if (url) URL.revokeObjectURL(url); }
  }
  if (!canView) return <AdminEmpty title={adminText("Bạn chưa có quyền xem nhật ký")} description={adminText("Liên hệ quản trị cấp cao để được cấp quyền phù hợp.")} />;
  return <section className="pc-logs" aria-busy={loading}>
    <AdminHeading title={adminText("Nhật ký hệ thống")} description={adminText("Tra cứu các sự kiện đã được hệ thống ghi nhận. Thời gian hiển thị theo múi giờ Việt Nam.")}>
      <button className="admin-btn" disabled={loading} onClick={() => void reload()}><RefreshCw size={16} />{loading ? adminText("Đang tải…") : adminText("Làm mới")}</button>
      {canExport && <button className="admin-btn" disabled={loading || !!error || !current?.rows.length} onClick={exportPage}><Download size={16} />{adminText("Xuất trang JSON")}</button>}
    </AdminHeading>
    <form role="search" className="admin-page-toolbar" key={`${query}:${level}`} onSubmit={event => {
      event.preventDefault(); const values = new FormData(event.currentTarget);
      const nextLevel = levels.find(value => value === values.get('level')) || '';
      navigate(1, String(values.get('search') || '').trim(), nextLevel);
    }}>
      <label className="admin-page-search"><Search size={18} aria-hidden="true" /><input type="search" name="search" aria-label={adminText("Tìm thông điệp nhật ký")} placeholder={adminText("Tìm nội dung thông điệp…")} defaultValue={query} /></label>
      <label className="pc-log-filter">{adminText("Loại")}<select name="level" defaultValue={level}><option value="">{adminText("Tất cả")}</option>{levels.map(value => <option key={value} value={value}>{logLevel(value)}</option>)}</select></label>
      <button className="admin-btn">{adminText("Tìm kiếm")}</button>
      {(query || level) && <button type="button" className="admin-btn" onClick={() => navigate(1, '', '')}>{adminText("Xóa lọc")}</button>}
    </form>
    <AdminFeedback error={error} retry={() => void reload()} />
    {loading && <p role="status">{adminText("Đang tải nhật ký…")}</p>}
    {!loading && !error && current && <>
      <p className="pc-log-summary" role="status">{adminText('Số bản ghi: {0}{1}. {2}', { 0: current.pagination.total.toLocaleString(getAdminIntlLocale()), 1: query || level ? ' ' + adminText('phù hợp bộ lọc') : '', 2: canExport ? adminText('Tệp JSON chỉ chứa các bản ghi của trang đang xem.') : '' })}</p>
      {current.rows.length === 0 ? <AdminEmpty title={query || level ? adminText("Không tìm thấy nhật ký") : adminText("Chưa có nhật ký")} description={query || level ? adminText("Thử nội dung khác hoặc xóa bộ lọc.") : adminText("Sự kiện được ghi nhận sẽ xuất hiện tại đây.")} /> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{[adminText("Thời gian (Việt Nam)"), adminText("Loại"), adminText("Thông điệp"), adminText("Người dùng")].map(text => <th scope="col" key={text}>{text}</th>)}</tr></thead>
        <tbody>{current.rows.map((row, index) => <tr key={row.id || index}><td>{logTime(row.timestamp)}</td><td><span className="admin-badge">{logLevel(row.level)}</span></td><td className="pc-log-message">{logEventLabel(row) ? <><span>{logEventLabel(row)}</span><details><summary>{adminText('Thông điệp gốc')}</summary><p>{row.message || adminText('Chưa có thông điệp')}</p></details></> : row.message || adminText("Chưa có thông điệp")}</td><td>{logUser(row.userId)}</td></tr>)}</tbody>
      </table></div>}
      {pages > 1 && <AdminPagination page={page} pages={pages} total={current.pagination.total} loading={loading} onChange={nextPage => navigate(nextPage)} />}
    </>}
  </section>;
}
