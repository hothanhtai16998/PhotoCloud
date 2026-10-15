import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/services/adminService';
import { AdminHeading, AdminFeedback } from './components/AdminPrimitives';
import { useAdminResource, adminError } from './hooks/useAdminResource';
import './AdminImagesPage.css';
interface Draft {
  siteName: string;
  siteDescription: string;
  maxUploadSize: number;
  allowedFileTypes: string;
  maintenanceMode: boolean;
}
function toDraft(s: Record<string, unknown>): Draft {
  return {
    siteName: String(s.siteName || ''),
    siteDescription: String(s.siteDescription || ''),
    maxUploadSize: Number(s.maxUploadSize || 10),
    allowedFileTypes: Array.isArray(s.allowedFileTypes)
      ? s.allowedFileTypes.join(', ')
      : String(s.allowedFileTypes || ''),
    maintenanceMode: s.maintenanceMode === true,
  };
}
export function AdminSettingsPage() {
  const loader = useCallback(() => adminService.getSettings(), []);
  const { data, loading, error, reload, setData } = useAdminResource(loader);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  useEffect(() => {
    if (data) setDraft(toDraft(data.settings));
  }, [data]);
  const dirty =
    !!draft &&
    !!data &&
    JSON.stringify(draft) !== JSON.stringify(toDraft(data.settings));
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft || !dirty || saving) return;
    const allowedFileTypes = draft.allowedFileTypes
      .split(',')
      .map((t) => t.trim().toLowerCase().replace(/^\./, ''))
      .filter(Boolean);
    if (
      !allowedFileTypes.length ||
      allowedFileTypes.some(
        (t) => !['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(t)
      )
    ) {
      setSaveError(
        'Chọn định dạng ảnh hợp lệ: jpg, jpeg, png, webp, gif hoặc avif.'
      );
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const result = await adminService.updateSettings({
        ...draft,
        siteName: draft.siteName.trim(),
        allowedFileTypes,
      });
      setData(result);
      toast.success('Đã lưu cài đặt website');
    } catch (cause) {
      setSaveError(adminError(cause));
    } finally {
      setSaving(false);
    }
  };
  return (
    <section>
      <AdminHeading
        title="Cài đặt website"
        description="Thông tin chung và quy định tải ảnh của PhotoCloud."
      />
      <AdminFeedback error={error} retry={() => void reload()} />
      {!draft ? (
        loading && <div className="admin-skeleton tall" />
      ) : (
        <form onSubmit={save}>
          <fieldset disabled={saving} className="admin-settings-form">
            <section className="admin-settings-section">
              <div>
                <h2>Thông tin website</h2>
                <p>Tên và mô tả được dùng trên giao diện công khai.</p>
              </div>
              <div>
                <label className="admin-settings-field">
                  Tên website
                  <input
                    className="admin-input"
                    required
                    maxLength={100}
                    value={draft.siteName}
                    onChange={(e) =>
                      setDraft({ ...draft, siteName: e.target.value })
                    }
                  />
                </label>
                <label className="admin-settings-field">
                  Mô tả
                  <textarea
                    className="admin-input"
                    rows={3}
                    maxLength={500}
                    value={draft.siteDescription}
                    onChange={(e) =>
                      setDraft({ ...draft, siteDescription: e.target.value })
                    }
                  />
                </label>
              </div>
            </section>
            <section className="admin-settings-section">
              <div>
                <h2>Tải ảnh</h2>
                <p>Giới hạn áp dụng cho ảnh tải lên thư viện.</p>
              </div>
              <div>
                <label className="admin-settings-field">
                  Dung lượng tối đa (MB)
                  <input
                    className="admin-input"
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={draft.maxUploadSize}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        maxUploadSize: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="admin-settings-field">
                  Định dạng cho phép
                  <input
                    className="admin-input"
                    required
                    value={draft.allowedFileTypes}
                    onChange={(e) =>
                      setDraft({ ...draft, allowedFileTypes: e.target.value })
                    }
                  />
                  <small>Phân cách bằng dấu phẩy, ví dụ: jpg, png, webp.</small>
                </label>
              </div>
            </section>
            <section className="admin-settings-section">
              <div>
                <h2>Bảo trì</h2>
                <p>Chỉ bật khi website cần được bảo trì.</p>
              </div>
              <label className="admin-check-row">
                <input
                  type="checkbox"
                  checked={draft.maintenanceMode}
                  onChange={(e) =>
                    setDraft({ ...draft, maintenanceMode: e.target.checked })
                  }
                />
                <span>Bật chế độ bảo trì</span>
              </label>
            </section>
          </fieldset>
          {saveError && (
            <p className="admin-form-error" role="alert">
              {saveError}
            </p>
          )}
          <div className="admin-save-bar">
            <span role="status">
              {saving
                ? 'Đang lưu…'
                : dirty
                  ? 'Có thay đổi chưa lưu'
                  : 'Các thay đổi đã được lưu'}
            </span>
            <div>
              <button
                className="admin-btn"
                type="button"
                disabled={!dirty || saving}
                onClick={() => {
                  if (data) setDraft(toDraft(data.settings));
                  setSaveError(null);
                }}
              >
                <RotateCcw size={16} />
                Hoàn tác
              </button>
              <button className="admin-btn primary" disabled={!dirty || saving}>
                <Save size={16} />
                {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </form>
      )}
    </section>
  );
}
