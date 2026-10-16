import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UploadTrigger } from '@/components/UploadTrigger';
import {
  Search,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  FolderInput,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  adminService,
  type AdminImage,
  type User,
} from '@/services/adminService';
import {
  categoryService,
  clearCategoriesCache,
  type Category,
} from '@/services/categoryService';
import { usePermissions } from '@/hooks/usePermissions';
import { useUserStore } from '@/stores/useUserStore';
import { useImageStore } from '@/stores/useImageStore';
import { useAdminResource, adminError } from '../hooks/useAdminResource';
import {
  AdminHeading,
  AdminFeedback,
  AdminPagination,
  AdminEmpty,
} from './AdminPrimitives';
import { AdminModal } from './AdminModal';
import { CategoryModal } from './CategoryModal';
import { UserModal } from './UserModal';
import { AdminImageModal } from './AdminImageModal';
import '../AdminImagesPage.css';
import { AdminImagePreview } from './AdminImagePreview';
import { adminImageDate } from './adminRecordFormatting';

type Kind = 'images' | 'categories' | 'users';
type Row = AdminImage & User & Category;
const names = {
  images: 'Thư viện ảnh',
  categories: 'Danh mục',
  users: 'Người dùng',
};
export function AdminRecords({ kind }: { kind: Kind }) {
  const { hasPermission, isSuperAdmin } = usePermissions();
  const can = (permission: Parameters<typeof hasPermission>[0]) =>
    isSuperAdmin() || hasPermission(permission);
  const self = useUserStore((s) => s.user?._id);
  const [params, setParams] = useSearchParams();
  const requestedPage=Number(params.get('page'));
  const page = Number.isSafeInteger(requestedPage) && requestedPage>0 ? requestedPage : 1;
  const query = params.get('q') || '';
  const [search, setSearch] = useState(query);
  useEffect(() => {
    setSearch(query);
  }, [query]);
  const loader = useCallback(async () => {
    if (kind === 'images') {
      const r = await adminService.getAllImages({
        page,
        limit: 20,
        search: query || undefined,
      });
      return { rows: r.images as Row[], pagination: r.pagination, context:`${kind}:${page}:${query}` };
    }
    if (kind === 'users') {
      const r = await adminService.getAllUsers({
        page,
        limit: 20,
        search: query || undefined,
      });
      return { rows: r.users as Row[], pagination: r.pagination, context:`${kind}:${page}:${query}` };
    }
    const all = await categoryService.getAllCategoriesAdmin();
    const rows = all.filter((c) =>
      c.name.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi'))
    );
    return {
      context:`${kind}:${page}:${query}`,
      rows: rows as Row[],
      pagination: { page: 1, pages: 1, total: rows.length },
    };
  }, [kind, page, query]);
  const { data, loading, error, reload } = useAdminResource(loader);
  const currentData=data?.context===`${kind}:${page}:${query}` ? data : null;
  const rows = currentData?.rows || [];
  const pages = currentData?.pagination?.pages || 1;
  const [storedSelection, setSelection] = useState<string[]>([]);
  const selection=storedSelection.filter(id=>rows.some(row=>row._id===id));
  const categoryRequest=useRef(0);
  const [categoriesLoading,setCategoriesLoading]=useState(false);
  useEffect(()=>()=>{categoryRequest.current++;},[]);
  const [target, setTarget] = useState<Row | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulk, setBulk] = useState<'delete' | 'category' | null>(null);
  const [busy, setBusy] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState('');
  useEffect(() => {
    setSelection([]);
  }, [page, query]);
  useEffect(() => {
    if (currentData && !loading && page > pages) {
      const p = new URLSearchParams(params);
      p.set('page', String(pages));
      setParams(p, { replace: true });
    }
  }, [currentData, loading, page, pages, params, setParams]);
  const canDelete = can(
    kind === 'images'
      ? 'deleteImages'
      : kind === 'users'
        ? 'deleteUsers'
        : 'deleteCategories'
  );
  const canEdit = can(
    kind === 'images'
      ? 'editImages'
      : kind === 'users'
        ? 'editUsers'
        : 'editCategories'
  );
  const setPage = (n: number) => {
    const p = new URLSearchParams(params);
    p.set('page', String(n));
    setParams(p);
  };
  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (search.trim()) p.set('q', search.trim());
    setParams(p);
  };
  const close = () => {
    if (!busy) {
      categoryRequest.current++;
      setTarget(null);
      setBulk(null);
      setMutationError(null);
    }
  };
  const remove = async () => {
    if (!canDelete || busy) return;
    setBusy(true);
    setMutationError(null);
    const ids = target ? [target._id] : selection;
    const failed: string[] = [];
    for (const id of ids) {
      try {
        if (kind === 'images') {
          await adminService.deleteImage(id);
          useImageStore.getState().removeImage(id);
          window.dispatchEvent(
            new CustomEvent('imageDeleted', { detail: { imageId: id } })
          );
        } else if (kind === 'users') await adminService.deleteUser(id);
        else {
          await categoryService.deleteCategory(id);
          clearCategoriesCache();
          window.dispatchEvent(new CustomEvent('categoriesUpdated'));
        }
      } catch (cause) {
        failed.push(id);
        setMutationError(adminError(cause));
      }
    }
    setBusy(false);
    setSelection(failed);
    if (!failed.length) {
      setTarget(null);
      setBulk(null);
      toast.success('Đã xóa ' + ids.length + ' mục');
    } else if (failed.length < ids.length)
      toast.info(
        'Đã xóa ' +
          (ids.length - failed.length) +
          ' mục. Các mục lỗi vẫn được chọn.'
      );
    void reload();
  };
  const loadBulkCategories=async()=>{
    const request=++categoryRequest.current; setCategoriesLoading(true);setMutationError(null);
    try {const result=await categoryService.getAllCategoriesAdmin();if(request===categoryRequest.current) setCategories(result);}
    catch(cause){if(request===categoryRequest.current) setMutationError(adminError(cause));}
    finally {if(request===categoryRequest.current) setCategoriesLoading(false);}
  };
  const openBulkCategory=()=>{setCategory('');setCategories([]);setBulk('category');void loadBulkCategories();};
  const changeCategory = async () => {
    if (!canEdit || !category || busy || categoriesLoading) return;
    setBusy(true);
    setMutationError(null);
    const failed: string[] = [];
    for (const id of selection) {
      try {
        await adminService.updateImage(id, { imageCategory: category });
      } catch (cause) {
        failed.push(id);
        setMutationError(adminError(cause));
      }
    }
    setBusy(false);
    setSelection(failed);
    if (!failed.length) {
      setBulk(null);
      toast.success('Đã cập nhật danh mục');
    }
    void reload();
  };
  const title = (r: Row) =>
    kind === 'images'
      ? r.imageTitle?.trim() || 'Ảnh chưa có tiêu đề'
      : kind === 'users'
        ? r.displayName || r.username
        : r.name;
  const selectedAll =
    rows.length > 0 && rows.every((r) => selection.includes(r._id));
  return (
    <section className={kind==='images'?'admin-image-library':undefined}>
      <AdminHeading
        title={names[kind]}
        description={
          kind === 'images'
            ? 'Sắp xếp và quản lý những khung hình của PhotoCloud.'
            : kind === 'users'
              ? 'Thông tin tài khoản và trạng thái truy cập.'
              : 'Phân loại ảnh để thư viện luôn dễ khám phá.'
        }
      >
        <button
          className="admin-btn"
          onClick={() => void reload()}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Làm mới
        </button>
        {kind === 'images' && (
          <UploadTrigger
            className="admin-btn primary"
            onUploaded={() => void reload()}
          >
            <Plus size={16} />
            Tải ảnh lên
          </UploadTrigger>
        )}
        {kind === 'categories' && can('createCategories') && (
          <button
            className="admin-btn primary"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus size={16} />
            Tạo danh mục
          </button>
        )}
      </AdminHeading>
      {kind==='images' && <p className="admin-library-note" role="status">{loading ? 'Đang tải danh sách…' : error ? 'Chưa thể cập nhật danh sách. Hãy thử lại.' : `${currentData?.pagination?.total ?? 0} ảnh${query ? ` khớp “${query}”` : ' trong thư viện'}. Chọn tất cả chỉ áp dụng cho trang hiện tại.`}</p>}
      <AdminFeedback error={error} retry={() => void reload()} />
      <form className="admin-page-toolbar" onSubmit={submitSearch}>
        <label className="admin-page-search">
          <Search size={18} />
          <input
            type="search"
            aria-label="Tìm kiếm"
            placeholder={
              kind === 'users'
                ? 'Tìm tên hoặc email…'
                : kind === 'images'
                  ? 'Tìm tiêu đề hoặc mô tả ảnh…'
                  : 'Tìm danh mục…'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button className="admin-btn" type="submit">
          Tìm kiếm
        </button>
        {query && (
          <button
            className="admin-btn"
            type="button"
            onClick={() => setParams({})}
          >
            Xóa bộ lọc
          </button>
        )}
      </form>
      {kind === 'images' && selection.length > 0 && (
        <div className="admin-bulk-bar">
          <strong>{selection.length} ảnh đã chọn</strong>
          <div>
            {canEdit && can('viewCategories') && (
              <button
                className="admin-btn"
                disabled={loading || !!error}
                onClick={() => void openBulkCategory()}
              >
                <FolderInput size={16} />
                Đổi danh mục
              </button>
            )}
            {canDelete && (
              <button
                className="admin-btn danger"
                disabled={loading || !!error}
                onClick={() => setBulk('delete')}
              >
                <Trash2 size={16} />
                Xóa đã chọn
              </button>
            )}
            <button className="admin-btn" onClick={() => setSelection([])}>
              Bỏ chọn
            </button>
          </div>
        </div>
      )}
      <div
        className="admin-table-wrap"
        tabIndex={0}
        aria-label={names[kind] + ', có thể cuộn ngang'}
        aria-busy={loading}
      >
        <table className="admin-table">
          <thead>
            <tr>
              {kind === 'images' && (canDelete || canEdit) && (
                <th>
                  <input
                    type="checkbox"
                    aria-label="Chọn tất cả ảnh trên trang"
                    disabled={loading || !!error || rows.length===0}
                    ref={element=>{if(element) element.indeterminate=!selectedAll && selection.length>0;}}
                    checked={selectedAll}
                    onChange={() =>
                      setSelection(selectedAll ? [] : rows.map((r) => r._id))
                    }
                  />
                </th>
              )}
              <th>
                {kind === 'images'
                  ? 'Ảnh'
                  : kind === 'users'
                    ? 'Tài khoản'
                    : 'Danh mục'}
              </th>
              <th>
                {kind === 'images'
                  ? 'Danh mục'
                  : kind === 'users'
                    ? 'Email'
                    : 'Mô tả'}
              </th>
              <th>
                {kind === 'images'
                  ? 'Tác giả'
                  : kind === 'users'
                    ? 'Vai trò'
                    : 'Số ảnh'}
              </th>
              <th>{kind === 'categories' ? 'Hiển thị' : 'Trạng thái'}</th>
              <th>
                <span className="sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && !currentData
              ? Array.from({ length: 5 }, (_, i) => (
                  <tr key={i}>
                    <td colSpan={6}>
                      <div className="admin-skeleton" />
                    </td>
                  </tr>
                ))
              : rows.map((r) => (
                  <tr key={r._id}>
                    {kind === 'images' && (canDelete || canEdit) && (
                      <td>
                        <input
                          type="checkbox"
                          aria-label={'Chọn ' + title(r)}
                          disabled={loading || !!error}
                          checked={selection.includes(r._id)}
                          onChange={() =>
                            setSelection((s) =>
                              s.includes(r._id)
                                ? s.filter((id) => id !== r._id)
                                : [...s, r._id]
                            )
                          }
                        />
                      </td>
                    )}
                    <td>
                      <div className="admin-record-name">
                        {kind === 'images' ? (
                          <AdminImagePreview key={r.imageUrl} url={r.imageUrl} thumbnail={(r as Row & {thumbnailUrl?:string}).thumbnailUrl} title={title(r)} />
                        ) : kind === 'users' ? (
                          <span className="admin-avatar">
                            {(r.displayName || r.username || '?')
                              .slice(0, 1)
                              .toUpperCase()}
                          </span>
                        ) : null}
                        <div>
                          <strong>{title(r) || 'Chưa đặt tên'}</strong>
                          {kind === 'users' && <small>@{r.username}</small>}
                          {kind === 'images' && (
                            <small>
                              {adminImageDate(r.createdAt)}
                            </small>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {kind === 'images'
                        ? typeof r.imageCategory === 'object'
                          ? r.imageCategory?.name || 'Chưa phân loại'
                          : r.imageCategory || 'Chưa phân loại'
                        : kind === 'users'
                          ? r.email
                          : r.description || 'Chưa có mô tả'}
                    </td>
                    <td>
                      {kind === 'images'
                        ? r.uploadedBy?.displayName ||
                          r.uploadedBy?.username ||
                          '—'
                        : kind === 'users'
                          ? r.isSuperAdmin
                            ? 'Quản trị cấp cao'
                            : r.isAdmin
                              ? 'Quản trị viên'
                              : 'Thành viên'
                          : (r.imageCount ?? '—')}
                    </td>
                    <td>
                      <span
                        className={
                          'admin-badge ' +
                          ((kind === 'users' && r.isBanned) ||
                          (kind === 'images' &&
                            r.moderationStatus === 'rejected')
                            ? 'danger'
                            : kind === 'images' &&
                                r.moderationStatus !== 'approved'
                              ? 'warning'
                              : 'ok')
                        }
                      >
                        {kind === 'users'
                          ? r.isBanned
                            ? 'Đã khóa'
                            : 'Hoạt động'
                          : kind === 'categories'
                            ? r.isActive === false
                              ? 'Đã ẩn'
                              : 'Đang hiện'
                            : {
                                pending: 'Chờ duyệt',
                                approved: 'Đã duyệt',
                                rejected: 'Từ chối',
                                flagged: 'Gắn cờ',
                              }[r.moderationStatus || 'pending'] || 'Chưa rõ trạng thái'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        {canEdit && (
                          <button
                            className="admin-table-action"
                            disabled={loading || !!error}
                            aria-label={'Sửa ' + title(r)}
                            onClick={() => {
                              setEditing(r);
                              setModalOpen(true);
                            }}
                          >
                            <Pencil size={17} />
                          </button>
                        )}
                        {canDelete &&
                          !(
                            kind === 'users' &&
                            (r._id === self || r.isSuperAdmin)
                          ) && (
                            <button
                              className="admin-table-action danger"
                              disabled={loading || !!error}
                              aria-label={'Xóa ' + title(r)}
                              onClick={() => {
                                setMutationError(null);
                                setTarget(r);
                              }}
                            >
                              <Trash2 size={17} />
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        {!loading && !error && rows.length === 0 && (
          <AdminEmpty
            title={query ? 'Không tìm thấy kết quả' : 'Chưa có dữ liệu'}
            description={
              query
                ? 'Thử từ khóa khác hoặc xóa bộ lọc để xem toàn bộ danh sách.'
                : 'Dữ liệu mới sẽ xuất hiện tại đây khi được tạo.'
            }
          />
        )}
      </div>
      <AdminPagination
        page={page}
        pages={pages}
        total={currentData?.pagination?.total || 0}
        loading={loading}
        onChange={setPage}
      />
      {(target || bulk) && (
        <AdminModal
          open
          title={bulk === 'category' ? 'Đổi danh mục ảnh' : 'Xác nhận xóa'}
          description={
            bulk === 'category'
              ? 'Áp dụng cho ' + selection.length + ' ảnh đang chọn.'
              : 'Xóa vĩnh viễn ' +
                (target
                  ? '“' + title(target) + '”'
                  : selection.length + ' ảnh') +
                '. Thao tác này không thể hoàn tác.'
          }
          onClose={close}
          footer={
            <>
              <button className="admin-btn" disabled={busy} onClick={close}>
                Hủy
              </button>
              <button
                className={
                  'admin-btn ' + (bulk === 'category' ? 'primary' : 'danger')
                }
                disabled={busy || loading || !!error || (bulk === 'category' && (!category || categoriesLoading || categories.length===0))}
                onClick={() =>
                  void (bulk === 'category' ? changeCategory() : remove())
                }
              >
                {busy
                  ? 'Đang xử lý…'
                  : bulk === 'category'
                    ? 'Cập nhật'
                    : 'Xóa vĩnh viễn'}
              </button>
            </>
          }
        >
          {bulk === 'category' && (
            <label className="admin-settings-field">
              Danh mục mới
              <select
                className="admin-input"
                disabled={busy || categoriesLoading}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Chọn danh mục</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {bulk==='category' && categoriesLoading && <p role="status">Đang tải danh mục…</p>}
          {bulk==='category' && !categoriesLoading && categories.length===0 && <button type="button" className="admin-btn" onClick={()=>void loadBulkCategories()}>Tải lại danh mục</button>}
          {mutationError && (
            <p className="admin-form-error" role="alert">
              {mutationError}
            </p>
          )}
        </AdminModal>
      )}
      {kind === 'images' && modalOpen && editing && (
        <AdminImageModal
          image={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSuccess={() => void reload()}
        />
      )}
      {kind === 'categories' && (
        <CategoryModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          category={editing}
          onSuccess={() => void reload()}
        />
      )}
      {kind === 'users' && (
        <UserModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          user={editing}
          onSuccess={() => void reload()}
        />
      )}
    </section>
  );
}
