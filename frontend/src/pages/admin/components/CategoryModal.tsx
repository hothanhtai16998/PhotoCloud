import { useId, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { AdminModal } from './AdminModal';
import {
  categoryService,
  clearCategoriesCache,
  type Category,
} from '@/services/categoryService';
import { adminError } from '../hooks/useAdminResource';
import './AdminForm.css';

interface Props {
  open: boolean;
  onClose: () => void;
  category: Category | null;
  onSuccess?: () => void;
}
export function CategoryModal(props: Props) {
  if (!props.open) return null;
  return <CategoryEditor key={props.category?._id || 'create'} {...props} />;
}
function CategoryEditor({ onClose, category, onSuccess }: Props) {
  const formId = useId();
  const [name, setName] = useState(category?.name || '');
  const [description, setDescription] = useState(category?.description || '');
  const [active, setActive] = useState(category?.isActive !== false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (name.trim().length < 2) {
      setError('Tên danh mục cần ít nhất 2 ký tự.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const values = { name: name.trim(), description: description.trim() };
      if (category)
        await categoryService.updateCategory(category._id, {
          ...values,
          isActive: active,
        });
      else await categoryService.createCategory(values);
      clearCategoriesCache();
      window.dispatchEvent(new CustomEvent('categoriesUpdated'));
      toast.success(category ? 'Đã cập nhật danh mục' : 'Đã tạo danh mục');
      onSuccess?.();
      onClose();
    } catch (cause) {
      setError(adminError(cause));
    } finally {
      setSaving(false);
    }
  };
  return (
    <AdminModal
      open
      title={category ? 'Sửa danh mục' : 'Tạo danh mục'}
      description="Dùng chủ đề ảnh rõ ràng để người xem dễ khám phá thư viện."
      size="sm"
      onClose={() => {
        if (!saving) onClose();
      }}
      footer={
        <>
          <button
            type="button"
            className="admin-btn"
            disabled={saving}
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            type="submit"
            form={formId}
            className="admin-btn primary"
            disabled={saving}
          >
            {saving ? 'Đang lưu…' : category ? 'Lưu thay đổi' : 'Tạo danh mục'}
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={save}>
        <fieldset className="admin-form-fields" disabled={saving}>
          <label className="admin-settings-field">
            Tên danh mục
            <input
              id="cat-name"
              className="admin-input"
              required
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Chân dung, Phong cảnh"
              autoFocus
            />
          </label>
          <label className="admin-settings-field">
            Mô tả
            <textarea
              id="cat-desc"
              className="admin-input"
              rows={4}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả bằng tiếng Việt, đúng với chủ đề ảnh."
            />
            <small>Mô tả ngắn gọn giúp phân biệt các danh mục.</small>
          </label>
          {category && (
            <label className="admin-check-row">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              <span>Hiển thị trong thư viện</span>
            </label>
          )}
        </fieldset>
        {error && (
          <p className="admin-form-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </AdminModal>
  );
}
