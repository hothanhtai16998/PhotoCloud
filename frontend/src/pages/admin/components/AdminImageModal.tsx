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
  const [title, setTitle] = useState(image.imageTitle || '');
  const originalCategory =
    typeof image.imageCategory === 'object'
      ? image.imageCategory?._id || ''
      : image.imageCategory || '';
  const [category, setCategory] = useState(originalCategory);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [categoryError,setCategoryError]=useState<string | null>(null);
  const [categoriesLoading,setCategoriesLoading]=useState(false);
  const [categoryAttempt,setCategoryAttempt]=useState(0);
  const [busy, setBusy] = useState(false);
  const { hasPermission, isSuperAdmin } = usePermissions();
  const canCategories = isSuperAdmin() || hasPermission('viewCategories');
  useEffect(() => {
    let active = true;
    if (canCategories) {
      setCategoriesLoading(true);setCategoryError(null);
      categoryService
        .getAllCategoriesAdmin()
        .then((data) => {
          if (active) setCategories(data);
        })
        .catch((cause) => {
          if (active) setCategoryError(adminError(cause));
        }).finally(()=>{if(active) setCategoriesLoading(false);});
    }
    return () => {
      active = false;
    };
  }, [canCategories,categoryAttempt]);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if(!title.trim()) {setError('Nhập tiêu đề ảnh, không chỉ khoảng trắng.');return;}
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
            aria-describedby={error ? 'image-edit-error' : undefined}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        {canCategories && (
          <label className="admin-settings-field">
            Danh mục
            <select
              className="admin-input"
              disabled={busy || categoriesLoading || !!categoryError}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Chưa phân loại</option>
              {originalCategory && !categories.some(item=>item._id===originalCategory) && <option value={originalCategory}>{typeof image.imageCategory==='object' ? image.imageCategory?.name || 'Danh mục hiện tại' : 'Danh mục hiện tại'}</option>}
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {canCategories && categoriesLoading && <p role="status">Đang tải danh mục…</p>}
        {categoryError && <div className="admin-form-error" role="alert">{categoryError} <button type="button" className="admin-btn" disabled={busy} onClick={()=>setCategoryAttempt(value=>value+1)}>Tải lại danh mục</button></div>}
        {error && (
          <p id="image-edit-error" className="admin-form-error" role="alert">
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
