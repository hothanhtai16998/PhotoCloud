# Trang bộ sưu tập — Visual overhaul (16/10/2026)

## Phạm vi

- `frontend/src/pages/CollectionsPage.tsx`
- `frontend/src/pages/CollectionsPage.css`
- `frontend/src/components/collection/CollectionCard.tsx`
- `frontend/src/components/collection/CollectionsGridSkeleton.tsx` (mới)
- `frontend/src/i18n/locales/{vi,en}/gallery.ts` (thêm key)

## Thay đổi chính

### 1. Hệ elevation thống nhất từ palette
- Bỏ tất cả `rgba(0,0,0,...)` cứng — thay bằng `color-mix(in srgb, var(--button-primary-bg) X%, transparent)`.
- Bỏ `hsl(var(--border))` / `hsl(var(--muted-foreground))` không tồn tại — dùng `var(--border-color)`, `var(--text-secondary)`.
- Card shadow có 2 tầng: ambient `6%` + elevate `18%` ở hover, dùng cùng tone với màu chính.
- Focus ring thống nhất: `outline: 2px solid var(--button-focus); outline-offset: 3px`.

### 2. Visual rhythm
- Grid: `minmax(320px, 1fr)` + `gap: 20px` (cũ 420/32).
- Card cover `aspect-ratio: 3/2` (cũ 4/3) cho cảm giác cân đối hơn với thumbnails 96px bên phải.
- Padding card: `16px 18px 18px` thay vì `20px` đều.
- Header có `border-bottom: 1px solid var(--border-color)`, `padding-bottom: 24px`, `margin-bottom: 24px`.

### 3. Header có hierarchy
- Eyebrow nhỏ (count), H1 lớn, subtitle hỗ trợ — 3 tầng thay vì 1.
- Nút "Tạo bộ sưu tập" align bottom với title block.
- Mobile: header stack dọc.

### 4. Filter bar — một surface
- Tất cả control nằm trong card `bg-card`, `border-color`, `border-radius: 14px`, `padding: 14px 16px`.
- Border system nhất quán: input/button/select đều 1px `border-color` → hover `border-strong` → focus `accent + ring`.
- Search có icon leading + clear button trailing.
- Tag pill dùng `--button-selected-bg/border/fg` khi active.

### 5. Card có chiều sâu
- Hover: `translateY(-3px)` + shadow tăng rõ + ảnh `scale(1.04)`.
- Gradient overlay nhẹ ở cover khi hover.
- Cover badges góc trên trái: count + lock — pill style với backdrop blur.
- Action buttons góc phải: mặc định ẩn → hiện khi hover/focus card; có backdrop blur; danger variant dùng `button-danger-soft`.
- Title 2 dòng (`-webkit-line-clamp: 2`), meta 1 dòng.

### 6. Skeleton loading
- Component `CollectionsGridSkeleton` mới, 6 cards giả với shimmer animation 1.4s.
- Shimmer dùng `linear-gradient` giữa `--hover-bg` và `--bg-card` — palette-driven.
- `prefers-reduced-motion` tắt animation.

### 7. Empty state dạy
- Có illustration box 96×96 với icon Folder (vi) hoặc Search (khi không match filter).
- Có H2 + description ngắn dưới 38ch.
- Có action rõ: "Khám phá" cho empty hoàn toàn, "Xóa bộ lọc" cho no-match.
- Riêng 2 trạng thái: empty (chưa có bộ sưu tập nào) và no-match (có bộ sưu tập nhưng filter rỗng).

### 8. i18n
- Thêm keys: `emptyHintPublic`, `emptyTitle`, `totalCount`, `totalCountOne`, `subtitle`, `privateBadge`, `modalLoading`, `sortAriaLabel`.
- Mọi key mới có bản Vi + En.

## Không thay đổi

- Không động đến `useCollectionsListStore` (logic nghiệp vụ).
- Không động đến API client.
- Không động đến modal/dialog (CSS của dialog vẫn dùng style cũ inline — chấp nhận được vì là dialog tạm).
- Không động đến responsive breakpoint ý nghĩa (chỉnh spacing, giữ logic 1024/720).

## Bằng chứng

- `npx tsc --noEmit` → không lỗi ở file sửa.
- `npm run build` → pass, CSS `CollectionsPage` 15.6 kB (gzip 2.91 kB).
- `npx eslint` → không lỗi.
- `impeccable detect` → `[]` sạch.

## Chưa kiểm

- Visual thật trên browser (MCP browser render trắng khi navigate, có thể session khác). Khi bạn vào `/collections` sẽ thấy skeleton ngay khi tải, card list có hover nâng rõ, empty state có illustration.
- Dark mode visual: mọi biến đã dùng là palette token nên sẽ auto adapt. Bạn cần toggle theme để xác nhận.
- RTL: không áp dụng cho trang này.
- Touch target: action button 32×32 trên card hơi nhỏ cho touch, có thể cần 36×36 ở vòng responsive.
