import { getAdminIntlLocale, adminText, useAdminLocale, adminT as t } from '@/pages/admin/adminLocale';
import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import type { AdminRole } from '@/services/adminService';
import type { User as AuthUser } from '@/types/user';
import type { RoleCreateData, RoleUpdateData } from '../../hooks/useAdminRoles';
import { PERMISSION_GROUPS } from '@/utils/permissionGroups';
import { CreateRoleModal, EditRoleModal } from '../modals';
import { AdminHeading, AdminFeedback, AdminEmpty } from '../AdminPrimitives';
import { AdminModal } from '../AdminModal';
import './AdminRoles.css';

interface Props {
  roles: AdminRole[]; currentUser: AuthUser | null; loading: boolean; error: string | null; busy: boolean;
  creatingRole: boolean; editingRole: AdminRole | null;
  onReload: () => void; onCreateClick: () => void; onEdit: (role: AdminRole) => void;
  onDelete: (id: string, name: string) => Promise<boolean>;
  onCloseCreate: () => void; onCloseEdit: () => void;
  onSaveCreate: (value: RoleCreateData) => Promise<boolean>;
  onSaveEdit: (id: string, value: RoleUpdateData) => Promise<boolean>;
}
const roleLabel = (value: AdminRole['role']) => value === 'super_admin' ? adminText("Quản trị cấp cao") : value === 'admin' ? adminText("Quản trị viên") : adminText("Kiểm duyệt viên");
export function AdminRoles(props: Props) {
  useAdminLocale();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState(false);
  const disabled = props.loading || props.busy || !!props.error;
  const missingAccounts = props.roles.filter(role => !role.userId).length;
  return <section className="pc-roles">
    <AdminHeading title={adminText("Phân quyền quản trị")} description={adminText("Quản lý vai trò, quyền truy cập và điều kiện sử dụng của từng tài khoản.")}>
      <button className="admin-btn" disabled={props.loading || props.busy} onClick={props.onReload}><RefreshCw size={16} />{props.loading ? adminText("Đang tải…") : adminText("Làm mới")}</button>
      <button className="admin-btn primary" disabled={disabled} onClick={props.onCreateClick}><Plus size={16} />{adminText("Thêm quyền quản trị")}</button>
    </AdminHeading>
    <AdminFeedback error={props.error} retry={props.onReload} />
    {props.loading && <p role="status">{adminText("Đang tải danh sách phân quyền…")}</p>}
    {!props.loading && !props.error && (props.roles.length === 0 ? <AdminEmpty title={adminText("Chưa có quyền quản trị")} description={adminText("Thêm quyền cho tài khoản cần tham gia quản lý website.")} /> : <>
      <p className="pc-role-summary">{(props.roles.length - missingAccounts).toLocaleString(getAdminIntlLocale())}  {adminText("bản ghi có tài khoản liên kết")}{missingAccounts > 0 ? adminText("· {0} bản ghi chưa có thông tin tài khoản", { 0: missingAccounts }) : ''}{adminText(". Mở phần quyền hạn để xem chi tiết.")}</p>
      {missingAccounts > 0 && <p className="pc-role-data-note">{adminText("Một số bản ghi chưa có thông tin tài khoản liên kết trong dữ liệu trả về. Chưa đủ thông tin để xác nhận tài khoản đã bị xóa; các bản ghi này cần được đối soát.")}</p>}
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{[adminText("Tài khoản"), adminText("Vai trò & trạng thái"), adminText("Quyền hạn"), adminText("Người cấp"), adminText("Thao tác")].map(text => <th scope="col" key={text}>{text}</th>)}</tr></thead>
        <tbody>{props.roles.map(role => {
          const user = typeof role.userId === 'object' ? role.userId : null;
          const id = typeof role.userId === 'string' ? role.userId : user?._id;
          const name = user?.displayName || user?.username || id || adminText("Chưa có thông tin tài khoản");
          const expiry = role.expiresAt ? new Date(role.expiresAt) : null;
          const expired = expiry && Number.isFinite(expiry.getTime()) && expiry.getTime() <= now;
          const granted = Object.values(role.permissions || {}).filter(value => value === true).length;
          return <tr key={role._id}><td><strong>{name}</strong>{!id && <small>{adminText("Mã bản ghi:")} {role._id}</small>}{user?.email && <small>{user.email}</small>}{id && id === props.currentUser?._id && <small>{adminText("Tài khoản của bạn")}</small>}</td>
            <td><strong>{roleLabel(role.role)}</strong><small>{role.active === false ? adminText("Tạm ngưng") : expired ? adminText("Đã hết hạn") : adminText("Hoạt động")}</small>{expiry && <small>{Number.isFinite(expiry.getTime()) ? adminText("Hết hạn: {0}", { 0: expiry.toLocaleString(getAdminIntlLocale()) }) : adminText("Ngày hết hạn không hợp lệ")}</small>}{!!role.allowedIPs?.length && <small>{adminText("Giới hạn")} {role.allowedIPs.length}  {adminText("IP / dải IP")}</small>}</td>
            <td>{role.role === 'super_admin' ? <p>{adminText("Toàn quyền quản trị")}</p> : <p>{granted}  {adminText("quyền được cấp")}</p>}
              <details><summary>{adminText("Xem quyền chi tiết")}</summary><div className="pc-role-permission-summary" tabIndex={0} role="region" aria-label={adminText("Quyền của {0}", { 0: name })}>{PERMISSION_GROUPS.map(group => {
                const enabled = group.permissions.filter(p => role.permissions?.[p.key]);
                return enabled.length ? <div key={group.labelKey}><strong>{t(`admin.${group.labelKey}`)}</strong><span>{enabled.map(p => t(`admin.${p.key}`)).join(', ')}</span></div> : null;
              })}</div></details>
            </td><td>{role.grantedBy?.displayName || role.grantedBy?.username || adminText("Hệ thống")}</td>
            <td>{!id ? <span>{adminText("Chưa thể thao tác: thiếu tài khoản liên kết")}</span> : !role.grantedBy ? <span className="pc-role-protected">{adminText("Được hệ thống bảo vệ")}</span> : <div className="admin-row-actions"><button className="admin-table-action" aria-label={adminText("Sửa quyền {0}", { 0: name })} disabled={disabled} onClick={() => props.onEdit(role)}><Pencil size={17} /></button><button className="admin-table-action danger" aria-label={adminText("Thu hồi quyền {0}", { 0: name })} title={id === props.currentUser?._id ? adminText("Không thể tự thu hồi quyền tại đây") : adminText("Thu hồi quyền quản trị")} disabled={disabled || id === props.currentUser?._id} onClick={() => { setDeleteError(false); setTarget({ id, name }); }}><Trash2 size={17} /></button></div>}</td>
          </tr>;
        })}</tbody></table></div>
    </>)}
    {props.creatingRole && <CreateRoleModal onClose={props.onCloseCreate} onSave={props.onSaveCreate} />}
    {props.editingRole && <EditRoleModal key={props.editingRole._id} role={props.editingRole} onClose={props.onCloseEdit} onSave={props.onSaveEdit} />}
    <AdminModal open={!!target} title={adminText("Thu hồi quyền quản trị")} onClose={() => { if (!props.busy) setTarget(null); }} size="sm" footer={<><button className="admin-btn" disabled={props.busy} onClick={() => setTarget(null)}>{adminText("Hủy")}</button><button className="admin-btn danger" disabled={disabled} onClick={async () => { if (target) { const ok = await props.onDelete(target.id, target.name); if (ok) setTarget(null); else setDeleteError(true); } }}>{props.busy ? adminText("Đang thu hồi…") : adminText("Thu hồi quyền")}</button></>}>
      <p>{adminText("Thu hồi quyền quản trị của “")}{target?.name}{adminText("”? Tài khoản người dùng vẫn được giữ lại.")}</p>{deleteError && <p role="alert">{adminText("Chưa thu hồi được quyền. Kiểm tra thông báo lỗi và thử lại.")}</p>}
    </AdminModal>
  </section>;
}
