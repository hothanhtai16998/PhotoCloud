/** Optional public service content. No HTML is accepted or rendered. */
export const isPackagePhotoUrl = (value) => {
    if (typeof value !== 'string' || value.length > 2048) return false;
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
};
export const validatePackagePresentation = (body) => {
    if (body.detailDescription !== undefined && (typeof body.detailDescription !== 'string' || body.detailDescription.length > 5000)) return 'Mô tả chi tiết tối đa 5000 ký tự';
    if (body.coverUrl !== undefined && body.coverUrl !== '' && !isPackagePhotoUrl(body.coverUrl)) return 'Ảnh bìa cần đường dẫn HTTPS hợp lệ';
    if (body.includes !== undefined && (!Array.isArray(body.includes) || body.includes.length > 20 || body.includes.some(item => typeof item !== 'string' || !item.trim() || item.length > 300))) return 'Quyền lợi tối đa 20 dòng, mỗi dòng 300 ký tự';
    if (body.gallery !== undefined && (!Array.isArray(body.gallery) || body.gallery.length > 12 || body.gallery.some(url => !isPackagePhotoUrl(url)) || new Set(body.gallery.map(url => url.trim())).size !== body.gallery.length)) return 'Album tối đa 12 đường dẫn HTTPS khác nhau';
    return null;
};
export const readPackagePresentation = (body) => Object.fromEntries(['detailDescription', 'coverUrl', 'includes', 'gallery'].filter(key => body[key] !== undefined).map(key => [key, Array.isArray(body[key]) ? body[key].map(item => item.trim()) : body[key].trim()]));
