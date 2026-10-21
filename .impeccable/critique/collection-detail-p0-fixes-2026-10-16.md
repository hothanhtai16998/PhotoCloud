# Trang chi tiết bộ sưu tập — P0 quick wins (16/10/2026)

> **Đính chính 18/10/2026:** Đây là nhật ký lịch sử, không phải checklist nghiệm thu hoặc chỉ dẫn tự áp dụng lại. Các nhãn P0 bên dưới là nhãn cũ; đổi màu, bỏ nhánh chữ trùng và metadata chưa có bằng chứng chặn tác vụ/mất dữ liệu nên không được coi là P0 theo AGENTS.md. `npx tsc --noEmit` với cấu hình gốc `files: []` không kiểm source; dòng kết quả cũ không chứng minh typecheck đạt, cần `npx tsc -b` và đối chiếu baseline khi kiểm code. Detector `[]` chỉ là kết quả quét cơ học, không xác nhận toàn bộ chất lượng. Trạng thái hiện tại theo PAGE_INVENTORY_AND_ANALYSIS.md.

## Phạm vi

- `frontend/src/pages/collection/components/CollectionNoFlashGrid.css`
- `frontend/src/pages/collection/CollectionDetailPage.css`
- `frontend/src/pages/collection/components/CollectionHeader.tsx`
- `frontend/src/pages/collection/CollectionDetailPage.tsx`
- `frontend/src/i18n/locales/{vi,en}/gallery.ts` (thêm `noImages`)

## Thay đổi

### P0-1 — Selection xanh dương + rgba cứng → palette tokens
Thay thế:
- `#0066cc` (3 chỗ) → `var(--accent)`
- `rgba(0, 0, 0, X)` (12 chỗ) → `color-mix(in srgb, var(--text-primary) X%, transparent)`
- `#111` (drag-over border) → `var(--border-strong)`
- `#fff` trên badge → `var(--bg-card)`
- `rgba(255, 255, 255, X)` → `color-mix(in srgb, var(--bg-card) X%, transparent)`

Giờ selection state, drag-over, cover badge đều retint theo palette (cả light/dark, cả admin palette swap).

### P0-2 — Singular/plural copy-paste bug
`CollectionHeader.tsx:42`:
- Cũ: `{imagesCount} {imagesCount === 1 ? 'ảnh' : 'ảnh'}` (2 branch giống nhau)
- Mới: `{imagesCount > 0 ? \`${imagesCount} ảnh\` : t('collections.noImages')}` (i18n key)

Thêm `noImages: 'Chưa có ảnh' | 'No images yet'` cho cả vi/en.

### P0-3 — `useDocumentMeta`
`CollectionDetailPage.tsx`:
- Import `useDocumentMeta` từ `@/hooks/useDocumentMeta`
- Gọi với `title = collection?.name`, `description = collection?.description?.slice(0, 160)`, `noIndex = !collection?.isPublic`
- Theo `AGENTS.md`: page-level hook là nguồn chính cho `document.title` và thẻ meta. Trước đây tab luôn hiện "PhotoCloud Studio — Chụp ảnh theo cách của bạn", không phân biệt được bộ sưu tập nào.

### Bonus — Bounce easing + `prefers-reduced-motion`
5 chỗ `cubic-bezier(0.34, 1.56, 0.64, 1)` ở `CollectionDetailPage.css` (line 399, 558, 559, 583, 594) → `cubic-bezier(0.22, 0.61, 0.36, 1)` (ease-out-quart, mượt hơn).

4 chỗ tương ứng ở `CollectionNoFlashGrid.css` cũng đã sửa.

Tất cả transition/animation wrap trong `@media (prefers-reduced-motion: no-preference) { ... }` để tôn trọng user setting.

## Bằng chứng

- `npx tsc --noEmit` → không lỗi
- `npm run build` → pass, CSS `CollectionDetailPage` 26.87 kB (gzip 4.34 kB) — tăng nhẹ do thêm `prefers-reduced-motion` wrappers
- `impeccable detect frontend/src/pages/collection/` → `[]` sạch
- `impeccable detect frontend/src/pages/collection/components/` → `[]` sạch

## Chưa sửa (theo lựa chọn của user, để dành cho round sau)

- **P1-4 Wall-of-options header** — 4 nút outline đều nhau (Yêu thích / Chia sẻ / Xuất / Chọn). Cần redesign thành 1 primary + overflow menu.
- **P1-5 Cover image không phải hero** — Cover chỉ là 16px tag góc. Cần render full-bleed hero ở đầu trang.
- **P2-7 `prefers-reduced-motion` đã xử lý xong** trong P0 bonus.
- **P2-8 Dead code** — `CollectionCollaborators.tsx` (565 dòng) + `.css` (540 dòng) + `CollectionImageGrid.tsx` (174 dòng) không import trên route này. Cần xác nhận có dùng ở đâu khác không trước khi xóa.
- **P3-9 Admin boundary** — `CollectionDetailPage.tsx:10` import `ConfirmModal` từ `@/pages/admin/components/modals`. Cần promote lên `@/components/ui/ConfirmModal.tsx`.
- **P3-10 Hardcoded `padding-top: 80px`** ở `CollectionDetailPage.css:6`. Cần đọc header height qua CSS variable.

## Kiểm thử thủ công

- F5 trang `/collections/6ad156380f3760adcff48ee4` (id test bạn đã cung cấp) sẽ thấy:
  - Tab title đổi thành "PhotoCloud Studio — bộ sưu tập 1"
  - Click chọn 1 ảnh → border chuyển sang màu copper (var(--accent)) thay vì xanh dương
  - Cover badge có nền đậm theo palette
  - 0 ảnh → "Chưa có ảnh" thay vì "0 ảnh ảnh"
