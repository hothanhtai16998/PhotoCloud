import { useCallback, useState } from 'react';
import { adminService, type AdminImage } from '@/services/adminService';
import { useAdminResource } from '../../hooks/useAdminResource';
import { adminText } from '@/pages/admin/adminLocale';
import { isPackagePhotoUrl } from './adminPackageForm';

export function PackageImageLibrary({ selected, onSelect, onClose }: { selected: string[]; onSelect: (url: string) => void; onClose: () => void }) {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const loader = useCallback(() => adminService.getAllImages({ page, limit: 16, search: query }), [page, query]);
    const { data, loading, error, reload } = useAdminResource(loader);
    const images: (AdminImage & { thumbnailUrl?: string })[] = data?.images || [];
    const applySearch = () => { setPage(1); setQuery(search.trim()); };
    return <section className="pc-package-library" aria-label={adminText('Chọn ảnh từ thư viện')}>
        <div className="pc-package-media-toolbar"><input aria-label={adminText('Tìm ảnh trong thư viện')} placeholder={adminText('Tìm ảnh trong thư viện')} value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); applySearch(); } }} /><button type="button" onClick={applySearch}>{adminText('Tìm kiếm')}</button><button type="button" onClick={onClose}>{adminText('Xong')}</button></div>
        {loading ? <p role="status">{adminText('Đang tải ảnh…')}</p> : error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => void reload()}>{adminText('Thử lại')}</button></div> : !images.length ? <p>{adminText('Không có ảnh phù hợp. Bạn có thể tải ảnh từ máy tính.')}</p> : <div className="pc-package-library-grid">{images.map(image => <button key={image._id} type="button" disabled={!isPackagePhotoUrl(image.imageUrl)} aria-pressed={selected.includes(image.imageUrl)} onClick={() => onSelect(image.imageUrl)}><img src={image.thumbnailUrl || image.imageUrl} alt="" loading="lazy" /><span>{image.imageTitle || adminText('Ảnh không có tên')}</span>{selected.includes(image.imageUrl) && <strong>{adminText('Đã chọn')}</strong>}</button>)}</div>}
        {!loading && !error && data && data.pagination.pages > 1 && <div className="pc-package-media-toolbar"><button type="button" disabled={page === 1} onClick={() => setPage(value => value - 1)}>{adminText('Trang trước')}</button><span>{page} / {data.pagination.pages}</span><button type="button" disabled={page >= data.pagination.pages} onClick={() => setPage(value => value + 1)}>{adminText('Trang sau')}</button></div>}
    </section>;
}
