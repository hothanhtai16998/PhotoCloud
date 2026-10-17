# Trang chi tiết bộ sưu tập — Round 2 (Header, Hero, Cleanup) 16/10/2026

## Phạm vi

- `frontend/src/pages/collection/components/CollectionHeader.tsx` — redesign
- `frontend/src/pages/collection/CollectionDetailPage.tsx` — thêm hero + import ConfirmModal
- `frontend/src/pages/collection/CollectionDetailPage.css` — hero CSS + overflow CSS + sửa padding-top
- `frontend/src/components/ui/ConfirmModal.tsx` (NEW) — promote shared
- `frontend/src/components/ui/ConfirmModal.css` (NEW) — từ admin
- `frontend/src/pages/admin/components/modals/ConfirmModal.tsx` — re-export backward-compat
- `frontend/src/pages/collection/components/CollectionCollaborators.tsx` (DELETED)
- `frontend/src/pages/collection/components/CollectionCollaborators.css` (DELETED)
- `frontend/src/pages/collection/components/CollectionImageGrid.tsx` (DELETED)

## Thay đổi

### P3-9 — Promote ConfirmModal lên shared (admin boundary)
Trước: user page import `ConfirmModal` từ `@/pages/admin/components/modals` — vi phạm ranh giới admin (AGENTS.md).
Sau:
- `frontend/src/components/ui/ConfirmModal.tsx` (mới) — implementation đầy đủ
- `frontend/src/components/ui/ConfirmModal.css` (mới) — copy từ admin
- `frontend/src/pages/admin/components/modals/ConfirmModal.tsx` — đổi thành `export { ConfirmModal } from '@/components/ui/ConfirmModal';` (re-export, không phá admin)
- `CollectionDetailPage.tsx` import từ `@/components/ui/ConfirmModal`

### P2-8 — Xóa dead code orphan
3 file không ai import (xác nhận bằng grep `from.*CollectionCollaborators`/`from.*CollectionImageGrid` → 0 match):
- `CollectionCollaborators.tsx` (565 dòng)
- `CollectionCollaborators.css` (540 dòng)
- `CollectionImageGrid.tsx` (174 dòng)
Xóa sạch. Tiết kiệm 1.279 dòng code + 2 file CSS không còn ai dùng.

### P3-10 — Hardcoded `padding-top: 80px`
- Cũ: `padding-top: 80px;`
- Mới: `padding-top: var(--header-height, 80px);`
- `--header-height` đã có sẵn ở `index.css:199` (80px desktop, 52px mobile tại `index.css:495`).

### P1-4 — Wall-of-options header → primary + kebab
Trước: 4 outline button đều nhau (Yêu thích / Chia sẻ / Xuất / Chọn).
Sau:
- Primary: **Yêu thích** (cho tất cả user)
- Primary phụ: **Chọn** (chỉ owner, ẩn khi `imagesCount === 0`)
- Kebab ⋯ → menu overflow chứa: **Chia sẻ** (public), **Báo cáo** (viewer không phải owner), **Xuất bộ sưu tập** (khi có ảnh)
- Thêm `aria-pressed` cho Yêu thích / Chọn
- Thêm `aria-haspopup` + `aria-expanded` cho trigger
- Click outside + Escape đóng menu
- Hidden `CollectionShare` div giữ logic share, được trigger từ menu item bằng cách click nội bộ
- Border-radius thống nhất 8px cho mọi nút

### P1-5 — Cover image hero
Thêm block hero full-bleed ở đầu grid:
- Lấy `coverImage` từ `images.find(img => img._id === coverImageId)`
- Aspect ratio 21:9 desktop, 4:3 mobile
- `loading="eager"` + `fetchPriority="high"` (LCP image)
- Nếu `collection.description` có → overlay description box ở dưới ảnh
- Ẩn khi `images.length <= 1` (masonry đã đủ)

CSS responsive: margin 24px desktop, 16px mobile; border-radius 16px desktop, 12px mobile.

## Bằng chứng

- `npx tsc --noEmit` → không lỗi
- `npm run build` → pass
  - `CollectionDetailPage-C7F3Rwzf.css` 29.39 kB (gzip 4.69 kB)
  - `CollectionDetailPage-CiMGaYnD.js` 28.84 kB (gzip 8.93 kB)
- `impeccable detect` cả 2 thư mục → `[]` sạch
- Browser verify tại `/collections/6942c5c4c9e11d0ebf75e66f`:
  - Tab title: "PhotoCloud Studio — Nho" ✅
  - Header chỉ 2 nút (Yêu thích + ⋯ kebab) — không còn 4 nút đều nhau ✅
  - Cover hero ẩn (1 ảnh), đúng rule

## Ảnh chụp

- `frontend/qa-policy-checkbox/collection-detail-header-after.png` — sau redesign

## Chưa làm (theo yêu cầu "làm tiếp cho xong", đã hết P0–P3 của assessment)

Không còn issue nào từ report $impeccable critique round 1. Để vào round mới cần user chạy lại critique hoặc xác định ưu tiên tiếp theo.

## Ghi chú kỹ thuật

- `ConfirmModal` ở admin re-export để admin code không vỡ. Round sau nên migrate `AdminCollections.tsx` + `ActiveSessions.tsx` sang import trực tiếp từ shared để gỡ bỏ re-export.
- Hero dùng `coverImage.regularUrl || coverImage.url` — nếu image object không có URL thì hero ẩn. Đúng kỳ vọng.
- `CollectionShare` được render trong `.collection-detail-share-hidden` (0×0 opacity:0) để giữ state, khi click menu item "Chia sẻ" tìm nút con đầu tiên rồi `.click()`. Đây là hack tạm — nếu có thời gian nên refactor `CollectionShare` để nhận `isOpen` controlled.
