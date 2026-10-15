import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { adminService, type AdminImage } from '@/services/adminService';
import { categoryService, type Category } from '@/services/categoryService';
import { usePermissions } from '@/hooks/usePermissions';
import { AdminModal } from './AdminModal';
import { adminError } from '../hooks/useAdminResource';

export function AdminImageModal({
  image,
  onClose,
  onSuccess,
}: {
  image: AdminImage;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState(image.imageTitle);
  const originalCategory =
    typeof image.imageCategory === 'object'
      ? image.imageCategory?._id || ''
      : image.imageCategory || '';
  const [category, setCategory] = useState(originalCategory);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { hasPermission, isSuperAdmin } = usePermissions();
  const canCategories = isSuperAdmin() || hasPermission('viewCategories');
  useEffect(() => {
    let active = true;
    if (canCategories)
      categoryService
        .getAllCategoriesAdmin()
        .then((data) => {
          if (active) setCategories(data);
        })
        .catch((cause) => {
          if (active) setError(adminError(cause));
        });
    return () => {
      active = false;
    };
  }, [canCategories]);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await adminService.updateImage(image._id, {
        imageTitle: title.trim(),
        ...(category !== originalCategory
          ? { imageCategory: category || null }
          : {}),
      });
      toast.success('Đã cập nhật ảnh');
      onSuccess();
      onClose();
    } catch (cause) {
      setError(adminError(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <AdminModal
      open
      title="Chỉnh sửa ảnh"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={save}>
        <label className="admin-settings-field">
          Tiêu đề ảnh
          <input
            className="admin-input"
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        {canCategories && (
          <label className="admin-settings-field">
            Danh mục
            <select
              className="admin-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Chưa phân loại</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
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
