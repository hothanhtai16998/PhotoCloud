import { adminText, useAdminLocale, adminT as t } from '@/pages/admin/adminLocale';
import { useCallback, useId, useRef, useState, type FormEvent } from 'react';
import { adminService, type AdminRole, type AdminRolePermissions } from '@/services/adminService';
import { PERMISSION_GROUPS, getAllPermissionKeys } from '@/utils/permissionGroups';
import { getInheritedPermissions } from '@/utils/roleInheritance';
import { AdminModal } from '../AdminModal';
import { AdminFeedback, AdminPagination } from '../AdminPrimitives';
import { useAdminResource } from '../../hooks/useAdminResource';
import type { RoleCreateData, RoleUpdateData } from '../../hooks/useAdminRoles';
import './RoleEditor.css';

const keys = PERMISSION_GROUPS.flatMap(group => group.permissions.map(p => p.key));
function effectivePermissions(role: AdminRole['role'], selected: AdminRolePermissions) {
  const allowed = role === 'super_admin' ? keys : getInheritedPermissions(role === 'admin' ? 'super_admin' : 'admin');
  const inherited = getInheritedPermissions(role);
  return Object.fromEntries(keys.map(key => [key, allowed.includes(key) && (key === 'viewDashboard' || inherited.includes(key) || selected[key] === true)]));
}
function localDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
interface Props {
  initial?: AdminRole;
  onClose: () => void;
  onSave: (data: RoleCreateData) => Promise<boolean>;
}
export function RoleEditor({ initial, onClose, onSave }: Props) {
  useAdminLocale();
  const formId = useId();
  const [role, setRole] = useState<AdminRole['role']>(initial?.role || 'admin');
  const [selected, setSelected] = useState<AdminRolePermissions>(() => ({ ...getAllPermissionKeys(), ...initial?.permissions }));
  const [userId, setUserId] = useState(initial ? typeof initial.userId === 'string' ? initial.userId : initial.userId?._id || '' : '');
  const [expires, setExpires] = useState(localDate(initial?.expiresAt));
  const [active, setActive] = useState(initial?.active !== false);
  const [ips, setIps] = useState(initial?.allowedIPs?.join(', ') || '');
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [query, setQuery] = useState('');
  const [accountPage, setAccountPage] = useState(1);
  const lock = useRef(false);
  const loader = useCallback(async () => {
    if (initial) return null;
    const result = await adminService.getAllUsers({ page: accountPage, limit: 20, search: query || undefined });
    return { ...result, context: `${accountPage}:${query}` };
  }, [initial, accountPage, query]);
  const accounts = useAdminResource(loader);
  const currentAccounts = accounts.data?.context === `${accountPage}:${query}` ? accounts.data : null;
  const effective = effectivePermissions(role, selected);
  const inherited = getInheritedPermissions(role);
  const allowed = role === 'super_admin' ? keys : getInheritedPermissions(role === 'admin' ? 'super_admin' : 'admin');
  const protectedRole = initial && !initial.grantedBy;
  const close = () => { if (!lock.current) onClose(); };
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || protectedRole) return;
    setSaveError('');
    if (!userId) { setSaveError(adminText("Chọn tài khoản trước khi lưu.")); return; }
    const expiry = expires ? new Date(expires) : null;
    if (expiry && (!Number.isFinite(expiry.getTime()) || expiry.getTime() <= Date.now())) { setSaveError(adminText("Ngày hết hạn phải ở tương lai.")); return; }
    lock.current = true; setBusy(true);
    try {
      const ok = await onSave({ userId, role, permissions: effective, expiresAt: expiry?.toISOString() || null, active, allowedIPs: [...new Set(ips.split(',').map(ip => ip.trim()).filter(Boolean))] });
      if (!ok) setSaveError(adminText("Chưa lưu được quyền. Bản nháp vẫn được giữ; kiểm tra thông báo lỗi và thử lại."));
    } catch {
      setSaveError(adminText("Không thể lưu quyền. Vui lòng thử lại."));
    } finally { lock.current = false; setBusy(false); }
  }
  return <AdminModal open title={initial ? adminText("Sửa quyền quản trị") : adminText("Thêm quyền quản trị")} description={adminText("Chọn tài khoản và vai trò, sau đó kiểm tra các quyền trước khi lưu.")} size="lg" className="pc-role-editor" onClose={close} footer={<><button className="admin-btn" disabled={busy} onClick={close}>{adminText("Hủy")}</button><button className="admin-btn primary" type="submit" form={formId} disabled={busy || !!protectedRole}>{busy ? adminText("Đang lưu…") : initial ? adminText("Lưu thay đổi") : adminText("Thêm quyền")}</button></>}>
    <form id={formId} onSubmit={submit} className="pc-role-form">
      {protectedRole ? <p role="alert">{adminText("Quyền do hệ thống tạo được bảo vệ, không thể chỉnh sửa.")}</p> : <>
        <div className="pc-role-settings"><fieldset disabled={busy}><legend>{adminText("Tài khoản & vai trò")}</legend>
          {initial ? <p>{typeof initial.userId === 'object' ? initial.userId?.displayName || initial.userId?.username : initial.userId}</p> : <>
            <label htmlFor={formId + '-search'}>{adminText("Tìm tài khoản theo tên hoặc email")}</label><div className="pc-role-account-search"><input id={formId + '-search'} type="search" name="accountSearch" placeholder={adminText("Nhập từ khóa rồi bấm Tìm")} /><button className="admin-btn" type="button" onClick={e => { const form = e.currentTarget.form; if (form) { setQuery(String(new FormData(form).get('accountSearch') || '').trim()); setAccountPage(1); } }}>{adminText("Tìm")}</button></div>
            <AdminFeedback error={accounts.error} retry={() => void accounts.reload()} />
            {accounts.loading ? <p role="status">{adminText("Đang tải tài khoản…")}</p> : <>
              <label htmlFor={formId + '-account'}>{adminText("Chọn tài khoản")}</label><select id={formId + '-account'} value={userId} onChange={e => setUserId(e.target.value)} required><option value="">{adminText("Chọn tài khoản…")}</option>{userId && !currentAccounts?.users.some(u => u._id === userId) && <option value={userId}>{adminText("Tài khoản đã chọn (")}{userId})</option>}{currentAccounts?.users.filter(u => !u.isAdmin && !u.isSuperAdmin).map(u => <option value={u._id} key={u._id}>{u.displayName || u.username} ({u.email || u.username})</option>)}</select>
              {currentAccounts && <><p className="pc-role-help">{adminText("Danh sách chỉ cho chọn tài khoản chưa có quyền quản trị. Có thể tìm hoặc chuyển trang.")}</p>{currentAccounts.pagination.pages > 1 && <AdminPagination page={accountPage} pages={currentAccounts.pagination.pages} total={currentAccounts.pagination.total} loading={accounts.loading} onChange={setAccountPage} />}</>}
            </>}
          </>}
          <label htmlFor={formId + '-role'}>{adminText("Vai trò")}</label><select id={formId + '-role'} value={role} onChange={e => { const value = e.target.value; if (value === 'admin' || value === 'moderator' || value === 'super_admin') setRole(value); }}><option value="admin">{adminText("Quản trị viên")}</option><option value="moderator">{adminText("Kiểm duyệt viên")}</option><option value="super_admin">{adminText("Quản trị cấp cao")}</option></select>
          {role === 'super_admin' && <p className="pc-role-help">{adminText("Quản trị cấp cao có toàn quyền truy cập theo cơ chế phân quyền của hệ thống.")}</p>}
        </fieldset>
        <fieldset disabled={busy}><legend>{adminText("Điều kiện truy cập")}</legend>
          <label className="pc-role-check"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /><span>{adminText("Kích hoạt quyền")}<small>{adminText("Bỏ chọn để tạm ngưng quyền quản trị.")}</small></span></label>
          <label htmlFor={formId + '-expiry'}>{adminText("Ngày hết hạn (giờ trên thiết bị)")}</label><input id={formId + '-expiry'} type="datetime-local" value={expires} onChange={e => setExpires(e.target.value)} /><p className="pc-role-help">{adminText("Để trống nếu không giới hạn thời gian.")}</p>
          <label htmlFor={formId + '-ips'}>{adminText("IP / dải IP được phép")}</label><textarea id={formId + '-ips'} rows={3} value={ips} onChange={e => setIps(e.target.value)} /><p className="pc-role-help">{adminText("Ngăn cách bằng dấu phẩy. Để trống nếu không giới hạn IP. Máy chủ kiểm tra địa chỉ khi lưu.")}</p>
        </fieldset></div>
        <div className="pc-role-permissions"><h3>{adminText("Quyền hạn")}</h3><p className="pc-role-help">{adminText("Quyền kế thừa được bật tự động. Các quyền ngoài phạm vi vai trò không thể chọn.")}</p>
          {PERMISSION_GROUPS.map(group => <fieldset key={group.labelKey} disabled={busy}><legend>{t(`admin.${group.labelKey}`)}</legend>{group.permissions.map(({ key }) => {
            const fixed = key === 'viewDashboard' || inherited.includes(key);
            const unavailable = !allowed.includes(key);
            return <label className="pc-role-check" key={key}><input type="checkbox" checked={effective[key] === true} disabled={fixed || unavailable} onChange={e => setSelected(previous => ({ ...previous, [key]: e.target.checked }))} /><span>{t(`admin.${key}`)}{fixed ? <small>{key === 'viewDashboard' ? adminText("Quyền mặc định") : adminText("Kế thừa")}</small> : unavailable ? <small>{adminText("Không thuộc vai trò này")}</small> : null}</span></label>;
          })}</fieldset>)}
        </div>
      </>}
      {saveError && <p className="pc-role-save-error" role="alert">{adminText(saveError)}</p>}
    </form>
  </AdminModal>;
}
export function EditRoleEditor({ role, onClose, onSave }: { role: AdminRole; onClose: () => void; onSave: (id: string, updates: RoleUpdateData) => Promise<boolean> }) {
  useAdminLocale();
  return <RoleEditor initial={role} onClose={onClose} onSave={({ userId, ...updates }) => onSave(userId, updates)} />;
}
