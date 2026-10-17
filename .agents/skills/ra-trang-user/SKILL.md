---
name: ra-trang-user
description: Rà soát và sửa một trang user PhotoCloud theo quy trình 7 bước chuẩn. Dùng khi user yêu cầu rà/sửa một trang user cụ thể, khi chat mới nhận nhiệm vụ "rà trang X theo chuẩn PhotoCloud", hoặc khi bắt đầu trang tiếp theo trong PAGE_INVENTORY_AND_ANALYSIS.md theo thứ tự ưu tiên. Skill này mô tả workflow end-to-end (đọc inventory → đọc code → audit Impeccable → sửa → build/lint → test fixture → ghi checklist), dành riêng cho 29 trang user do Cursor phụ trách — không dùng cho admin.
---

# Rà trang user PhotoCloud

Quy trình chuẩn khi được yêu cầu rà/sửa một trang user. Mỗi lần rà là một vòng độc lập: đọc lại inventory, đọc code hiện tại, chạy audit, sửa, kiểm tra, ghi kết quả. Không lặp vòng cũ, không tự ý chuyển trạng thái nghiệm thu.

> **Phạm vi:** Chỉ áp dụng cho 29 trang user trong `PAGE_INVENTORY_AND_ANALYSIS.md` mục 2. **Không áp dụng cho admin** (xem `ADMIN_PAGE_INVENTORY_AND_ANALYSIS.md`).

## Khi nào dùng skill này

- User viết: "rà trang X theo chuẩn PhotoCloud", "sửa trang X", "đơn giản hóa trang X", "kiểm tra trang X".
- Bắt đầu phiên mới và inventory chỉ định trang tiếp theo (ví dụ: "Trang tiếp theo: Bộ sưu tập (#5)").
- User yêu cầu dừng giữa chừng và quay lại rà tiếp một trang.

**Không dùng khi:** Chỉ đánh giá không sửa (dùng `$impeccable audit` thẳng), tối ưu hiệu năng (dùng `$impeccable optimize`), xử lý tình huống lỗi (dùng `$impeccable harden`).

## 7 bước

### Bước 1 — Đọc inventory và xác định phạm vi

**Mục tiêu:** Biết chính xác trang nào, đã đạt gì, còn thiếu gì, ca nào đang `o`.

1. Đọc `AGENTS.md` (toàn bộ) trước.
2. Đọc `PAGE_INVENTORY_AND_ANALYSIS.md` mục tương ứng với trang:
   - #1 Trang chủ → mục 1
   - #2 Khám phá → mục 11
   - #3 Tìm kiếm → mục 14
   - #4 Chi tiết ảnh → mục 15
   - #5 Bộ sưu tập → mục 16
   - #6 Chi tiết bộ sưu tập → mục 16
   - #7 Giới thiệu → mục 18
   - #8 Liên hệ → mục 5 mục E
   - #9 Gói chụp → mục 20
   - #10–11 Blog → chưa có mục riêng
   - #12–16 Auth → mục 23.2 (đã có sửa responsive)
   - #17–24 Cá nhân → chưa có mục riêng, đọc mục 5.D (guard)
   - #25–27 Booking → mục 6 (độ phức tạp)
   - #28 Newsletter → mục 10
   - #29 404 → mục 5.C
3. Ghi nhận các mục sau:
   - **Đã nghiệm thu** (dấu `x` / `~~gạch ngang~~`) — **không tự ý sửa lại trừ khi user yêu cầu**.
   - **Còn `o`** (chưa đạt) — đây là phạm vi ưu tiên.
   - **Ca mới (EXP-F, COL-, PKG-, ABT-, v.v.)** chưa được user tick.
   - **Bug đã thấy trong mã** (mục 5.A–5.F) nếu áp dụng.
4. Xác định rõ: trang này user muốn **rà+sửa**, **chỉ audit**, hay **đơn giản hóa**? Mặc định là rà+sửa.

**Báo cáo đầu phiên:** Liệt kê 1 dòng các ca `o` còn mở và lỗi đã biết. Không sửa gì trước khi user xác nhận phạm vi.

### Bước 2 — Đọc code hiện tại

**Mục tiêu:** Hiểu thật sự trang làm gì, không suy từ tên file.

1. Tìm file trang qua route. Ví dụ: route `/explore` → `frontend/src/pages/ExplorePage.tsx`. Có thể nằm trong thư mục con (`pages/explore/`, `pages/profile/`).
2. Đọc **toàn bộ** file trang và các hook/component phụ thuộc trực tiếp (cùng thư mục, hoặc nằm trong dependency chain).
3. Với mỗi file > 1.000 dòng: ghi nhận để tách, không tự tách trước khi audit.
4. Xác định:
   - **Nguồn dữ liệu:** API nào, store nào, prop nào.
   - **Tác dụng phụ:** useEffect, listener, timer, observer.
   - **Điểm phức tạp:** nhánh điều kiện, setState lặp, memo sai chỗ.
   - **CSS liên quan:** file `.css` cùng tên, token dùng, media query.
5. **Không chạy build ở bước này.** Chỉ đọc hiểu.

**Lưu ý phạm vi:** Theo AGENTS.md, **tuyệt đối không đọc/sửa**:
- `frontend/src/pages/admin/**`
- `frontend/src/components/admin/**`
- `frontend/src/pages/admin/components/**`
- `backend/src/controllers/admin/**`
- `frontend/src/hooks/useSiteSettings.ts` (admin dùng để cấu hình site)

Nếu cần hook tương tự cho user → tạo mới trong thư mục user, không fork/sửa hook dùng chung.

### Bước 3 — Audit Impeccable

**Mục tiêu:** Tìm vấn đề có bằng chứng trong mã, xếp mức P0–P3.

1. Chạy:
   ```bash
   .agents/skills/impeccable/scripts/impeccable audit frontend/src/pages/<TenTrang>.tsx
   ```
   Trên Windows shell không có `sh`, dùng `.agents/skills/impeccable/scripts/impeccable.cmd audit <path>`.
2. Đọc thêm `.agents/skills/impeccable/reference/audit.md` và `.agents/skills/impeccable/reference/craft-floor.md` để hiểu tiêu chí.
3. Phân loại kết quả:
   - **P0** chặn nhiệm vụ/mất dữ liệu → sửa ngay.
   - **P1** lớn, cần xong trước phát hành → sửa trong vòng này.
   - **P2** bất tiện có cách vòng → sửa nếu còn thời gian.
   - **P3** tinh chỉnh → ghi nhận, để vòng sau.
4. Mỗi vấn đề phải có: **vị trí** (file:line), **bước tái hiện** (nếu là lỗi), **ảnh hưởng** (ai bị ảnh hưởng, khi nào), **bằng chứng** (snippet code, console, hoặc đường dẫn fixture).
5. **Không suy đoán thành lỗi đã xác nhận.** Nếu chỉ là rủi ro tiềm ẩn, ghi "cần xác minh".

**Báo cáo bước 3:** Danh sách P0–P3 có bằng chứng. Hỏi user trước khi sang bước 4 nếu có P0 hoặc phạm vi sửa lớn.

### Bước 4 — Sửa

**Mục tiêu:** Giải quyết nguyên nhân, không đổi hành vi đã nghiệm thu, không tự bịa nội dung.

1. Sửa trong phạm vi user, **không chạm** khu vực admin.
2. Nguyên tắc sửa (rút gọn từ AGENTS.md):
   - **Một nơi sở hữu dữ liệu** — không nhân bản state.
   - **Đơn giản hóa trước khi tách file** — bỏ nhánh lặp, state chết, effect đồng bộ bản sao.
   - **Tách theo trách nhiệm** — trình bày / tải / thao tác / điều hướng.
   - **File > 1.000 dòng → tách.** Không cắt cơ học.
   - **Tái sử dụng component/hook/utility** đã có khi đúng ngữ nghĩa. Không tổng quát hóa trước nhu cầu.
   - **Không tự bịa/suy diễn** số liệu, danh tính, giá, cam kết. Để `null`/rỗng khi chưa có dữ liệu thật, UI ẩn phần đó.
   - **Không thay hành vi đã nghiệm thu** trừ khi user yêu cầu. Nếu cần đổi, nêu rõ.
   - **Dọn tài nguyên khi component ngừng dùng:** class, import, hook, listener, timer, observer, CSS thừa.
3. Sau mỗi thay đổi lớn, tự review: có bằng chứng hiệu năng không, có kết luận từ số trước/sau chưa đo không, có sửa đúng nguyên nhân không.
4. **Không kết luận hiệu năng** khi chỉ thấy số build/lint/fixture pass. Ghi rõ điều kiện đo.

### Bước 5 — Build, lint, typecheck

**Mục tiêu:** Bắt lỗi cú pháp, type, style trước khi test.

Chạy theo thứ tự:

```bash
cd frontend
npx tsc --noEmit             # typecheck — xem có diagnostic mới tại file vừa sửa không
npm run lint                 # ESLint — 0 error mục tiêu
npm run build                # Vite build PASS
```

**Ghi nhận:**
- TypeScript toàn dự án **luôn còn lỗi legacy** (theo AGENTS.md mục "Giới hạn" và nhiều mục trong inventory). **Chỉ quan tâm diagnostic mới phát sinh từ file vừa sửa.**
- ESLint: ghi riêng error và warning. Warning có sẵn từ trước → không tính là mới.
- Build: PASS là điều kiện cần, không phải đủ.

**Báo cáo bước 5:** Tóm tắt 1 dòng cho mỗi lệnh. Nếu có diagnostic mới → dừng, sửa, chạy lại.

### Bước 6 — Test fixture (Edge desktop, sáng/tối)

**Mục tiêu:** Bắt lỗi runtime mà build/lint không thấy, với API giả lập.

1. Kiểm tra có script fixture cho trang không. Tìm trong `frontend/scripts/`:
   - `test-explore-page.cjs`
   - `test-search-results.cjs`
   - `test-image-page-browser.cjs`
   - `test-collections-browser.cjs`
   - `test-collection-followup-browser.cjs`
   - `test-search-offline.cjs`
   - Hoặc tạo mới nếu trang chưa có.
2. Chạy fixture với Edge headless 1440×900, **cả sáng và tối**.
3. Các ca tối thiểu cần cover:
   - Tải trang đầu + F5 (cache rỗng).
   - Tương tác chính (bấm, mở modal, search).
   - Cuộn tải thêm nếu có pagination.
   - Lỗi mạng → retry → thành công.
   - Empty state.
   - Tab/Enter/Escape trên dialog và filter.
   - Theme sáng/tối.
4. **Lưu log** vào `frontend/qa-policy-checkbox/<trang>-<date>.txt` hoặc tương đương.
5. **Lưu ý giới hạn:**
   - Fixture dùng API giả lập, không phải dữ liệu thật → không kết luận production từ số fixture.
   - Emulation viewport không thay thế thiết bị thật (xem rule `.cursor/rules/responsive-real-device-testing.mdc`).
   - Không sửa dữ liệu thật để chứng minh thao tác hoạt động.

**Báo cáo bước 6:** PASS/FAIL cho từng ca, có log. FAIL → quay lại bước 4 sửa, không bỏ qua.

### Bước 7 — Ghi kết quả vào checklist

**Mục tiêu:** Cập nhật `PAGE_INVENTORY_AND_ANALYSIS.md` đúng quy ước, không tự nghiệm thu thay user.

1. Mở mục trang trong inventory (mục 11 cho Khám phá, 14 cho Tìm kiếm, 15 cho Chi tiết ảnh, v.v.).
2. Cập nhật các phần sau nếu có thay đổi:
   - **Bảng "điểm đã sửa"** (nếu có): thêm ID mới, ghi nguyên nhân, sửa, bằng chứng.
   - **Checklist ca chức năng** (EXP-F, COL-, PKG-, ABT-, v.v.):
     - **Không tự đánh `[x]`.** Chỉ thêm ca mới dạng `[ ]` cho user tích sau khi kiểm.
     - Nếu ca cũ đang `o` và đã sửa xong → giữ `o`, ghi chú "đã sửa ngày YYYY-MM-DD, chờ user xác nhận".
   - **Mục "bằng chứng kỹ thuật"**: thêm build/lint/fixture pass, link log/screenshot.
   - **Không tự gạch ngang** tiêu đề mục. Chỉ gạch ngang khi user xác nhận tất cả ca đạt.
3. **Nguyên tắc nghiệm thu (AGENTS.md mục 9):**
   - `x` = user xác nhận đạt.
   - `o` = chưa đạt.
   - Trống = chưa kiểm.
   - **Không đổi `o` thành `x` dựa trên fixture.** Chỉ user mới có quyền.
4. **Responsive** làm vòng cuối riêng (mục 23 inventory), không đánh trong vòng chức năng.
5. Phân loại thay đổi theo nhóm khi liệt kê:
   - **User:** file trong `frontend/src/pages/<user>/**` (trừ admin).
   - **Admin:** báo "không đụng" — chỉ liệt kê nếu có lý do.
   - **Chung:** `index.css`, `main.tsx`, hook dùng chung — phải `grep "from '@/<...>'"` trong `frontend/src/pages/admin/` trước khi sửa, hỏi user nếu admin cũng dùng.

**Báo cáo cuối:** Tóm tắt 5 dòng:
1. Trang + số ca `[x]` mới (nếu có) / `[o]` còn lại.
2. File đã sửa, phân loại user/admin/chung.
3. Bằng chứng kỹ thuật (build/lint/fixture).
4. Phần chưa kiểm (responsive, thiết bị thật, dữ liệu thật).
5. Đề xuất trang tiếp theo theo thứ tự inventory.

## Phụ lục — Lệnh nhanh

```bash
# Bước 1: Đọc inventory
$EDITOR PAGE_INVENTORY_AND_ANALYSIS.md

# Bước 2: Tìm file trang
rg -l "export default function" frontend/src/pages/<TenTrang>*.tsx

# Bước 3: Audit Impeccable
.agents/skills/impeccable/scripts/impeccable audit frontend/src/pages/<TenTrang>.tsx

# Bước 5: Build, lint, typecheck
cd frontend && npx tsc --noEmit && npm run lint && npm run build

# Bước 6: Fixture (ví dụ)
node frontend/scripts/test-<trang>-page.cjs
```

## Phụ lục — Phạm vi quyết định

| Tình huống | Hành động |
|---|---|
| Phát hiện bug admin khi đang rà user | Ghi nhận, **không sửa**, đề xuất phiên admin |
| Cần sửa hook dùng chung (vd `useSiteSettings`) | Dừng, hỏi user vì admin có thể phụ thuộc |
| Trang chưa có fixture | Tạo fixture mới trong `frontend/scripts/`, dùng API giả lập |
| Trang > 1.000 dòng | Tách theo trách nhiệm trước khi sửa, không cắt cơ học |
| Có P0 chặn release | Ưu tiên P0, hoãn P1–P3 |
| Có lỗi legacy TypeScript ngoài file sửa | Ghi "diagnostic ngoài phạm vi", không cố sửa |
| Cần test thiết bị thật (responsive) | Theo rule `.cursor/rules/responsive-real-device-testing.mdc`, dừng và yêu cầu user test |
| User chưa rõ phạm vi | Hỏi lại 1 câu: rà+sửa, chỉ audit, hay đơn giản hóa? |

## Tài liệu liên quan

- `AGENTS.md` — quy tắc chung, phạm vi user/admin, tiêu chuẩn.
- `PAGE_INVENTORY_AND_ANALYSIS.md` — nguồn chính của checklist và trạng thái nghiệm thu.
- `.agents/skills/impeccable/SKILL.md` — skill Impeccable, dùng ở bước 3.
- `.agents/skills/impeccable/reference/audit.md` — tiêu chí audit.
- `.agents/skills/impeccable/reference/craft-floor.md` — sàn chất lượng UI.
- `.agents/skills/impeccable/reference/harden.md` — tình huống lỗi (dùng khi user yêu cầu "harden").
- `.agents/skills/impeccable/reference/optimize.md` — tối ưu hiệu năng (dùng khi user yêu cầu "optimize").
- `responsive.md` — tiêu chuẩn responsive, dùng ở vòng cuối.
- `.cursor/rules/responsive-real-device-testing.mdc` — rule test thiết bị thật.
