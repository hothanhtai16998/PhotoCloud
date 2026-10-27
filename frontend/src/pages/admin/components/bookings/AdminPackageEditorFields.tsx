import { adminText } from '@/pages/admin/adminLocale';
import { packageNumbers, type PackageDraft, type PackageErrors, type PackageTab } from './adminPackageForm';
import { PackageMediaEditor } from './PackageMediaEditor';

export function AdminPackageEditorFields({ form, onChange, errors, tab, onMediaBusyChange }: { form: PackageDraft; onChange: (form: PackageDraft) => void; errors: PackageErrors; tab: PackageTab; onMediaBusyChange: (busy: boolean) => void }) {
    const change = <K extends keyof PackageDraft>(key: K, value: PackageDraft[K]) => onChange({ ...form, [key]: value });
    const attrs = (key: keyof PackageDraft) => ({ 'data-package-field': key, 'aria-invalid': Boolean(errors[key]), 'aria-describedby': errors[key] ? `package-${key}-error` : undefined });
    const error = (key: keyof PackageDraft) => errors[key] && <small id={`package-${key}-error`} className="pc-package-field-error">{adminText(errors[key])}</small>;
    return <>
        <fieldset className="pc-package-section" role="tabpanel" id="package-panel-info" aria-labelledby="package-tab-info" hidden={tab !== 'info'}><legend>{adminText('Thông tin gói')}</legend>
            {(['name', 'slug', 'category', 'description'] as const).map(key => <label key={key} className={key === 'name' || key === 'description' ? 'pc-package-span' : ''}>
                {adminText({ name: 'Tên gói', slug: 'Đường dẫn', category: 'Danh mục', description: 'Mô tả' }[key])}
                {key === 'description' ? <textarea {...attrs(key)} rows={3} maxLength={1000} value={form[key]} onChange={event => change(key, event.target.value)} /> : <input {...attrs(key)} maxLength={key === 'name' ? 120 : key === 'category' ? 60 : undefined} value={form[key]} onChange={event => change(key, event.target.value)} />}
                {error(key)}
                {key === 'slug' && <small>{adminText('Đường dẫn dùng cho trang chi tiết; đổi đường dẫn sẽ làm link cũ không còn đúng.')}</small>}
            </label>)}
        </fieldset>
        <fieldset className="pc-package-section" role="tabpanel" id="package-panel-pricing" aria-labelledby="package-tab-pricing" hidden={tab !== 'pricing'}><legend>{adminText('Giá và thông số')}</legend>
            {packageNumbers.map(field => <label key={field.key}>{adminText(field.label)}<input aria-label={adminText(field.label)} {...attrs(field.key)} type="number" inputMode="numeric" min={field.min} max={field.max} step={1} value={Number.isNaN(form[field.key]) ? '' : (form[field.key] ?? 0)} onChange={event => change(field.key, event.target.value === '' ? NaN : Number(event.target.value))} /><small>{field.max < Number.MAX_SAFE_INTEGER ? adminText('Từ {0} đến {1}', { 0: field.min, 1: field.max }) : field.min === 0 ? adminText('Nhập số nguyên từ 0 trở lên.') : adminText('Số nhỏ hơn được hiển thị trước.')}</small>{error(field.key)}</label>)}
            <label className="pc-package-visibility pc-package-span"><input type="checkbox" checked={form.active !== false} onChange={event => change('active', event.target.checked)} />{adminText('Hiển thị gói trên website')}</label>
            <small className="pc-package-span">{adminText('Số thứ tự nhỏ hơn được hiển thị trước. Gói ẩn vẫn được giữ trong quản trị.')}</small>
        </fieldset>
        <fieldset className="pc-package-section" role="tabpanel" id="package-panel-content" aria-labelledby="package-tab-content" hidden={tab !== 'content'}><legend>{adminText('Nội dung trên website')}</legend>
            <label className="pc-package-span">{adminText('Mô tả chi tiết trên trang Gói chụp')}<textarea {...attrs('detailDescription')} rows={5} maxLength={5000} value={form.detailDescription || ''} onChange={event => change('detailDescription', event.target.value)} />{error('detailDescription')}</label>
            <label className="pc-package-span">{adminText('Quyền lợi bổ sung — mỗi dòng một mục (tối đa 20)')}<textarea {...attrs('includes')} rows={4} value={(form.includes || []).join('\n')} onChange={event => change('includes', event.target.value.split('\n'))} />{error('includes')}<small>{adminText('Thời lượng, số ảnh, số người và ngày giao đã được hiển thị tự động từ thông số gói.')}</small></label>
        </fieldset>
        <fieldset className="pc-package-section" role="tabpanel" id="package-panel-media" aria-labelledby="package-tab-media" hidden={tab !== 'media'}><legend>{adminText('Ảnh bìa và album')}</legend>
            <PackageMediaEditor form={form} onChange={onChange} errors={errors} onBusyChange={onMediaBusyChange} />
        </fieldset>
    </>;
}
