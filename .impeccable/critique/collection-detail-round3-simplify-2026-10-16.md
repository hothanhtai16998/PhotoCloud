# Collection detail — Round 3 (Simplify) 16/10/2026

## Yêu cầu user
> "k cần ảnh to đùng này đâu, cái UI UX của modal cũng xấu nữa" / "làm nó giống cái nút like là được rồi, k cần nút báo cáo lẫn nút 3 chấm đâu, cứ hiện ra bên ngoài đi"

## Thay đổi

### 1. Bỏ cover hero (P1-5 revert)
- Trước: full-bleed ảnh 21:9 ở đầu grid
- Sau: không có hero. Grid masonry là surface duy nhất
- Xóa `collection-detail-hero` block khỏi `CollectionDetailPage.tsx`
- Xóa toàn bộ CSS hero khỏi `CollectionDetailPage.css`

### 2. Bỏ kebab menu (P1-4 revert)
- Trước: 1 primary (Yêu thích) + 1 kebab ⋯ chứa Chia sẻ / Báo cáo / Xuất
- Sau: tất cả action hiện ra ngoài theo hàng ngang
  - **Yêu thích** (primary, mọi user)
  - **Chia sẻ** (secondary, public collection)
  - **Xuất** (secondary, có ảnh)
  - **Chọn / Thoát** (primary cho owner có ảnh)
- Bỏ `ReportButton` khỏi header (user nói "k cần")
- Bỏ import `ReportButton`, icon `Flag`, prop `user` không dùng

### 3. Redesign ConfirmModal giống inline-action (phong cách Like button)
Vấn đề cũ:
- Box 450px tối đa, padding 24px mỗi bên → quá to
- Shadow nặng `0 20px 25px` 10% + 0 10px 10px 4% → cứng, generic
- Overlay đen 0.5 → đặc, không khớp light mode studio
- slideUp 0.2s + Header riêng + close icon riêng → nặng nề
- 2 nút `outline` cùng kiểu, hierarchy mờ

Style mới (phong cách nút Like 18px trên thumbnail):
- **Card gọn 360px**, padding 20px, gap 14px
- **Overlay**: 35% dark (mix bằng color-mix), fade 120ms
- **Shadow**: `0 4px 12px` 8% — nhẹ, không kịch tính
- **Fade** thay slideUp — không có chuyển động dọc
- **Header inline**: icon variant + title cùng hàng, gap 10px
  - Danger: AlertTriangle (đỏ)
  - Warning: AlertCircle (amber)
  - Info: Info (accent)
- **Message**: muted-foreground, 0.875rem
- **Actions**: ghost (cancel) + filled (confirm), height 36px, radius 6px
  - Cancel: `variant="ghost"` — chỉ hover đổi nền, không viền
  - Confirm danger: `var(--button-danger-bg)`
  - Confirm primary: `var(--accent)`
- **Focus trap**: Tab/Shift+Tab vòng quanh trong dialog
- **A11y**: `role="alertdialog"`, `aria-modal`, `aria-labelledby`, `aria-describedby`, focus dialog, ESC đóng, body scroll lock, trả focus về trigger

## Bằng chứng

- `npx tsc --noEmit` → pass
- `npm run build` → ✓ built in 10.39s
- `impeccable detect` → `[]` sạch
- Browser verify `/collections/6942c5c4c9e11d0ebf75e66f` (visitor): header có **Yêu thích + Chia sẻ + Xuất** (3 nút cùng hàng, không còn Báo cáo, không còn ⋯)
- Browser verify `/collections/6ad156380f3760adcff48ee4` (admin owner): header có **Yêu thích + Chia sẻ + Xuất + Chọn** (4 nút)
- Tab title vẫn đúng: "PhotoCloud Studio — bộ sưu tập 1" / "PhotoCloud Studio — Nho"

## Files changed

- `frontend/src/pages/collection/components/CollectionHeader.tsx` — bỏ kebab, bỏ ReportButton, bỏ prop `user`
- `frontend/src/pages/collection/CollectionDetailPage.tsx` — bỏ hero block, bỏ prop `user` khỏi CollectionHeader
- `frontend/src/pages/collection/CollectionDetailPage.css` — bỏ hero CSS, bỏ overflow CSS
- `frontend/src/components/ui/ConfirmModal.tsx` — viết lại hoàn toàn
- `frontend/src/components/ui/ConfirmModal.css` — viết lại hoàn toàn
