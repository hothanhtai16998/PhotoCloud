import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/services/adminService';
import { AdminHeading, AdminFeedback } from './components/AdminPrimitives';
import { useAdminResource, adminError } from './hooks/useAdminResource';
import { SitePaletteEditor } from './components/SitePaletteEditor';
import { normalizePalette, HEX_COLOR, type SitePalette } from '@/theme/sitePalette';
import { applySitePalette } from '@/theme/paletteRuntime';
import './AdminImagesPage.css';
import './AdminSettingsPage.css';
interface Draft {
  sitePalette: SitePalette;
  siteName: string;
  siteDescription: string;
  maxUploadSize: number;
  allowedFileTypes: string;
  maintenanceMode: boolean;
}
function toDraft(s: Record<string, unknown>): Draft {
  return {
    sitePalette: normalizePalette(s.sitePalette),
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
  const [section,setSection] = useState<'general' | 'appearance'>('general');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  useEffect(() => {
    if (data) setDraft(toDraft(data.settings));
  }, [data]);
  const dirty =
    !!draft &&
    !!data &&
    JSON.stringify(draft) !== JSON.stringify(toDraft(data.settings));
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent): void => { event.preventDefault(); event.returnValue = ''; };
    const navigate = (event: MouseEvent): void => {
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!link || link.getAttribute('href')?.startsWith('#')) return;
      if (!window.confirm('Có thay đổi chưa lưu. Rời trang và bỏ các thay đổi?')) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', navigate, true);
    return () => { window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('click', navigate, true); };
  }, [dirty]);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft || !dirty || saving) return;
    if (!draft.siteName.trim() || !Number.isFinite(draft.maxUploadSize) || draft.maxUploadSize < 1 || draft.maxUploadSize > 100) {
      setSection('general'); setSaveError('Nhập tên website và dung lượng tải ảnh từ 1 đến 100 MB.'); return;
    }
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
      setSection('general');
      setSaveError(
        'Chọn định dạng ảnh hợp lệ: jpg, jpeg, png, webp, gif hoặc avif.'
      );
      return;
    }
    if (Object.values(draft.sitePalette.light).concat(Object.values(draft.sitePalette.dark)).some(color => !HEX_COLOR.test(color))) { setSection('appearance'); setSaveError('Kiểm tra mã màu: cần dạng #77502E với sáu chữ số HEX.'); return; }
    setSaving(true);
    setSaveError(null);
    try {
      const result = await adminService.updateSettings({
        ...draft,
        siteName: draft.siteName.trim(),
        allowedFileTypes,
      });
      setData(result);
      applySitePalette(result.settings.sitePalette ?? draft.sitePalette);
      toast.success('Đã lưu cài đặt website');
    } catch (cause) {
      setSaveError(adminError(cause));
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="website-settings">
      <AdminHeading
        title="Cài đặt website"
        description="Thông tin, quy định tải ảnh và bảng màu của PhotoCloud."
      />
      <AdminFeedback error={error} retry={() => void reload()} />
      {!draft ? (
        loading && <div className="admin-skeleton tall" />
      ) : (
        <form onSubmit={save}>
          <div className="settings-navigation" role="group" aria-label="Phần cài đặt">
            <button type="button" aria-pressed={section==='general'} onClick={()=>setSection('general')}>Cài đặt chung<small>Thông tin, tải ảnh và bảo trì</small></button>
            <button type="button" aria-pressed={section==='appearance'} onClick={()=>setSection('appearance')}>Giao diện<small>Bảng màu sáng và tối</small></button>
          </div>
          <fieldset disabled={saving} className="admin-settings-form">
            {section==='general' && <div className="settings-general">
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
            </div>}
            <div hidden={section!=='appearance'}>
              <SitePaletteEditor savedValue={normalizePalette(data?.settings.sitePalette)} value={draft.sitePalette} onChange={sitePalette => setDraft({ ...draft, sitePalette })} />
            </div>
          </fieldset>
          <div className="settings-save-dock" aria-busy={saving}>
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
                  : 'Đã đồng bộ với bản lưu'}
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
          </div>
        </form>
      )}
    </section>
  );
}
