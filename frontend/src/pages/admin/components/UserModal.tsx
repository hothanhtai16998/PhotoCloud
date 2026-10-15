import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { AdminModal } from './AdminModal';
import { adminService, type User } from '@/services/adminService';
import { adminError } from '../hooks/useAdminResource';
import './AdminForm.css';
export function UserModal({
  open,
  onClose,
  user,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onSuccess?: () => void;
}) {
  const [displayName, setName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open && user) {
      setName(user.displayName || '');
      setEmail(user.email || '');
      setBio(user.bio || '');
      setError(null);
    }
  }, [open, user]);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || busy) return;
    setBusy(true);
    setError(null);
    try {
      await adminService.updateUser(user._id, {
        displayName: displayName.trim(),
        email: email.trim(),
        bio: bio.trim(),
      });
      toast.success('Đã cập nhật người dùng');
      onSuccess?.();
      onClose();
    } catch (cause) {
      setError(adminError(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <AdminModal
      open={open}
      title="Sửa thông tin người dùng"
      description={'Tài khoản @' + (user?.username || '')}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={save}>
        <fieldset disabled={busy} className="admin-form-fields">
          <label className="admin-settings-field">
            Tên hiển thị
            <input
              className="admin-input"
              maxLength={100}
              value={displayName}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="admin-settings-field">
            Email
            <input
              type="email"
              required
              className="admin-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="admin-settings-field">
            Giới thiệu
            <textarea
              className="admin-input"
              rows={3}
              maxLength={500}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </label>
        </fieldset>
        <p className="admin-field-hint">
          Vai trò quản trị được quản lý riêng trong mục Phân quyền.
        </p>
        {error && (
          <p className="admin-form-error" role="alert">
            {error}
          </p>
        )}
        <div className="admin-modal-form-footer">
          <button
            type="button"
            className="admin-btn"
            disabled={busy}
            onClick={onClose}
          >
            Hủy
          </button>
          <button className="admin-btn primary" disabled={busy}>
            {busy ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
