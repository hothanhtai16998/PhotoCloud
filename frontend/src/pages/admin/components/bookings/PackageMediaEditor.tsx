import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ImageOff, Upload, Images, X } from 'lucide-react';
import { imageUploadService } from '@/services/imageUploadService';
import type { PreUploadResponse } from '@/types/image';
import { getErrorMessage } from '@/lib/utils';
import { adminText } from '@/pages/admin/adminLocale';
import { isPackagePhotoUrl, type PackageDraft, type PackageErrors } from './adminPackageForm';
import { PackageImageLibrary } from './PackageImageLibrary';

function Preview({ url }: { url: string }) {
    const [failed, setFailed] = useState('');
    return isPackagePhotoUrl(url) && failed !== url ? <img src={url} alt={adminText('Ảnh xem trước gói chụp')} onError={() => setFailed(url)} referrerPolicy="no-referrer" /> : <span className="pc-package-photo-empty"><ImageOff size={24} />{adminText('Chưa có ảnh xem trước')}</span>;
}
type Target = 'cover' | 'gallery';
export function PackageMediaEditor({ form, onChange, errors, onBusyChange }: { form: PackageDraft; onChange: (form: PackageDraft) => void; errors: PackageErrors; onBusyChange: (busy: boolean) => void }) {
    const [library, setLibrary] = useState<Target | null>(null);
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState('');
    const [error, setError] = useState('');
    const [failedFiles, setFailedFiles] = useState<{ files: File[]; target: Target } | null>(null);
    const current = useRef(form);
    const mounted = useRef(true);
    const lock = useRef(false);
    const pending = useRef(new Map<File, PreUploadResponse>());
    const coverInput = useRef<HTMLInputElement>(null);
    const galleryInput = useRef<HTMLInputElement>(null);
    const advanced = useRef<HTMLDetailsElement>(null);
    useLayoutEffect(() => { if ((errors.coverUrl || errors.gallery) && advanced.current) advanced.current.open = true; }, [errors.coverUrl, errors.gallery]);
    useEffect(() => { current.current = form; }, [form]);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    const commit = (next: PackageDraft) => { current.current = next; onChange(next); };
    const gallery = (form.gallery || []).map(url => url.trim()).filter(Boolean);
    const select = (target: Target, url: string) => {
        const value = current.current;
        if (target === 'cover') { commit({ ...value, coverUrl: url }); setLibrary(null); return; }
        const urls = (value.gallery || []).map(item => item.trim()).filter(Boolean);
        if (urls.includes(url)) commit({ ...value, gallery: urls.filter(item => item !== url) });
        else if (urls.length < 12) commit({ ...value, gallery: [...urls, url] });
        else setError(adminText('Album tối đa 12 ảnh. Bỏ một ảnh trước khi thêm.'));
    };
    const upload = async (files: File[], target: Target) => {
        if (lock.current || !files.length) return;
        const available = target === 'cover' ? 1 : 12 - (current.current.gallery || []).filter(Boolean).length;
        if (files.length > available) { setError(adminText('Số ảnh đã chọn vượt quá số chỗ còn lại.')); return; }
        lock.current = true; setBusy(true); onBusyChange(true); setError(''); setFailedFiles(null);
        const failed: File[] = [];
        const failures: string[] = [];
        try {
            for (const file of files) {
                if (!mounted.current) break;
                try {
                    if (!file.type.startsWith('image/')) throw new Error(adminText('Vui lòng chọn tệp ảnh.'));
                    let staged = pending.current.get(file);
                    if (!staged) {
                        staged = await imageUploadService.preUploadImage(file, percent => { if (mounted.current) setProgress(`${file.name} · ${percent}%`); });
                        pending.current.set(file, staged);
                    }
                    if (mounted.current) setProgress(`${file.name} · ${adminText('Đang xử lý ảnh…')}`);
                    const result = await imageUploadService.finalizeImageUpload({ uploadId: staged.uploadId, uploadKey: staged.uploadKey, imageTitle: file.name });
                    if (!result.image || !isPackagePhotoUrl(result.image.imageUrl)) throw new Error(adminText('Chưa nhận được ảnh hợp lệ. Bạn thử lại nhé.'));
                    if (!mounted.current) break;
                    const value = current.current;
                    if (target === 'cover') commit({ ...value, coverUrl: result.image.imageUrl });
                    else commit({ ...value, gallery: [...new Set([...(value.gallery || []).map(url => url.trim()).filter(Boolean), result.image.imageUrl])] });
                    pending.current.delete(file);
                } catch (cause) { failed.push(file); failures.push(`${file.name}: ${getErrorMessage(cause, adminText('Không thể tải ảnh lên'))}`); }
            }
            if (mounted.current && failed.length) { setFailedFiles({ files: failed, target }); setError(failures.join('\n')); }
        } finally {
            lock.current = false;
            if (mounted.current) { setBusy(false); setProgress(''); onBusyChange(false); }
        }
    };
    const move = (index: number, delta: number) => {
        const next = [...gallery]; [next[index], next[index + delta]] = [next[index + delta], next[index]];
        commit({ ...current.current, gallery: next });
    };
    return <fieldset disabled={busy} className="pc-package-media-editor">
        <p className="pc-package-media-help">{adminText('Chọn ảnh có sẵn hoặc tải từ máy tính. Ảnh chỉ được gắn vào gói sau khi lưu; ảnh tải lên vẫn được giữ trong thư viện.')}</p>
        {error && <div role="alert" className="pc-package-field-error">{error}{failedFiles && <button type="button" disabled={busy} onClick={() => void upload(failedFiles.files, failedFiles.target)}>{adminText('Thử lại ảnh lỗi')}</button>}</div>}
        {busy && <p role="status">{progress}</p>}
        <input ref={coverInput} hidden type="file" accept="image/*" onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ''; void upload(files, 'cover'); }} />
        <input ref={galleryInput} hidden type="file" accept="image/*" multiple onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ''; void upload(files, 'gallery'); }} />
        <h3>{adminText('Ảnh bìa')}</h3>
        <div className="pc-package-cover-preview"><Preview url={form.coverUrl || ''} /></div>
        <div className="pc-package-media-toolbar"><button type="button" disabled={busy} onClick={() => coverInput.current?.click()}><Upload size={16} />{adminText('Tải ảnh bìa')}</button><button type="button" disabled={busy} onClick={() => setLibrary(library === 'cover' ? null : 'cover')}><Images size={16} />{adminText('Chọn ảnh bìa từ thư viện')}</button>{form.coverUrl && <button type="button" disabled={busy} onClick={() => commit({ ...current.current, coverUrl: '' })}>{adminText('Bỏ ảnh bìa')}</button>}</div>
        {errors.coverUrl && <small id="package-coverUrl-error" role="alert" className="pc-package-field-error">{adminText(errors.coverUrl)}</small>}
        {library === 'cover' && <PackageImageLibrary selected={form.coverUrl ? [form.coverUrl] : []} onSelect={url => select('cover', url)} onClose={() => setLibrary(null)} />}
        <h3>{adminText('Album')} <small>{gallery.length}/12</small></h3>
        <div className="pc-package-media-toolbar"><button type="button" disabled={busy || gallery.length >= 12} onClick={() => galleryInput.current?.click()}><Upload size={16} />{adminText('Tải ảnh album')}</button><button type="button" disabled={busy} onClick={() => setLibrary(library === 'gallery' ? null : 'gallery')}><Images size={16} />{adminText('Chọn ảnh album từ thư viện')}</button></div>
        {library === 'gallery' && <PackageImageLibrary selected={gallery} onSelect={url => select('gallery', url)} onClose={() => setLibrary(null)} />}
        {errors.gallery && <small id="package-gallery-error" role="alert" className="pc-package-field-error">{adminText(errors.gallery)}</small>}
        <div className="pc-package-gallery-preview">{gallery.map((url, index) => <figure key={`${index}-${url}`}><Preview url={url} /><figcaption>{index + 1}</figcaption><div className="pc-package-photo-actions"><button type="button" disabled={busy || !index} aria-label={adminText('Đưa ảnh {0} lên trước', { 0: index + 1 })} onClick={() => move(index, -1)}><ArrowLeft size={16} /></button><button type="button" disabled={busy || index === gallery.length - 1} aria-label={adminText('Đưa ảnh {0} ra sau', { 0: index + 1 })} onClick={() => move(index, 1)}><ArrowRight size={16} /></button><button type="button" disabled={busy} aria-label={adminText('Bỏ ảnh {0} khỏi album', { 0: index + 1 })} onClick={() => commit({ ...current.current, gallery: gallery.filter((_, item) => item !== index) })}><X size={16} /></button></div></figure>)}</div>
        <details ref={advanced} className="pc-package-url-advanced"><summary>{adminText('Nhập URL nâng cao')}</summary><label>{adminText('Đường dẫn ảnh bìa')}<input disabled={busy} data-package-field="coverUrl" type="url" value={form.coverUrl || ''} onChange={event => commit({ ...current.current, coverUrl: event.target.value })} aria-invalid={Boolean(errors.coverUrl)} aria-describedby={errors.coverUrl ? 'package-coverUrl-error' : undefined} /></label><label>{adminText('Ảnh buổi chụp — mỗi dòng một URL HTTPS (tối đa 12)')}<textarea disabled={busy} data-package-field="gallery" rows={3} value={(form.gallery || []).join('\n')} onChange={event => commit({ ...current.current, gallery: event.target.value.split('\n') })} aria-invalid={Boolean(errors.gallery)} aria-describedby={errors.gallery ? 'package-gallery-error' : undefined} /></label></details>
    </fieldset>;
}
