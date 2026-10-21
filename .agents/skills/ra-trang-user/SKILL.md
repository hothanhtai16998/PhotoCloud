---
name: ra-trang-user
description: Rà soát, sửa và kiểm tra hồi quy một trang user PhotoCloud theo AGENTS.md và inventory khi được giao rà và sửa hoặc tiếp tục trang đang làm. Không tự bắt đầu trang chỉ vì mở chat; yêu cầu chỉ đánh giá không cho phép sửa code. Không dùng cho admin.
---

# Rà trang user PhotoCloud

Quy trình chuẩn khi được yêu cầu rà/sửa một trang user. Mỗi lần rà là một vòng độc lập: đọc lại inventory, đọc code hiện tại, chạy audit, sửa, kiểm tra, ghi kết quả. Không lặp vòng cũ, không tự ý chuyển trạng thái nghiệm thu.

> **Phạm vi:** Chỉ áp dụng cho 29 trang user trong `PAGE_INVENTORY_AND_ANALYSIS.md` mục 2. **Không áp dụng cho admin** (xem `ADMIN_PAGE_INVENTORY_AND_ANALYSIS.md`).

## Khi nào dùng skill này

- User giao rà+sửa hoặc đơn giản hóa trang X. Yêu cầu chỉ kiểm tra/đánh giá không mặc nhiên cho phép sửa.
- User yêu cầu làm trang tiếp theo: chọn theo inventory hiện tại, không dùng ví dụ cố định làm trạng thái.
- User yêu cầu dừng giữa chừng và quay lại rà tiếp một trang.

**Không dùng khi:** Chỉ đánh giá không sửa (dùng `$impeccable audit` thẳng), tối ưu hiệu năng (dùng `$impeccable optimize`), xử lý tình huống lỗi (dùng `$impeccable harden`).

## 7 bước

### Bước 1 — Đọc inventory và xác định phạm vi

**Mục tiêu:** Biết chính xác trang nào, đã đạt gì, còn thiếu gì, ca nào đang `o`.

1. Đọc `AGENTS.md` (toàn bộ) trước.
2. Đọc `PAGE_INVENTORY_AND_ANALYSIS.md`, tìm theo ID trang/tên/route. Bảng dưới chỉ là chỉ dẫn lịch sử, cần đối chiếu heading hiện tại, không dùng làm trạng thái nghiệm thu:
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
   - **Đã nghiệm thu** (dấu `x` / `~~gạch ngang~~`, kể cả khoảng trắng/chữ hoa) — giữ hành vi đã duyệt khi refactor trong phạm vi được giao.
   - **Còn `o`** (chưa đạt) — đây là phạm vi ưu tiên.
   - **Ca mới (EXP-F, COL-, PKG-, ABT-, v.v.)** chưa được user tick.
   - **Bug đã thấy trong mã** (mục 5.A–5.F) nếu áp dụng.
4. Xác định rõ yêu cầu là rà+sửa, chỉ audit hay đơn giản hóa. Không biến yêu cầu chỉ đánh giá thành sửa code. Kiểm `git status` và diff liên quan để bảo vệ công việc chưa commit.

**Báo cáo đầu phiên:** Liệt kê ngắn các ca `o` và lỗi đã biết rồi tiếp tục khi yêu cầu đã rõ. Chỉ hỏi khi thiếu quyết định thực chất hoặc cần sửa phần chung có admin phụ thuộc theo AGENTS.md.

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

**Lưu ý phạm vi:** Theo AGENTS.md, không đọc các khu vực sau để sửa hoặc refactor:
- `frontend/src/pages/admin/**`
- `frontend/src/components/admin/**`
- `frontend/src/pages/admin/components/**`
- `backend/src/controllers/admin/**`
- `frontend/src/hooks/useSiteSettings.ts` (admin dùng để cấu hình site)

Được tra cứu import trong admin để xác định phụ thuộc chung theo ngoại lệ của AGENTS.md; không mở rộng thành audit admin. File chung có admin dùng phải hỏi trước khi sửa. Hook riêng cho user có thể tạo mới hoặc fork theo AGENTS.md, không sửa hook bị bảo vệ.

### Bước 3 — Audit Impeccable

**Mục tiêu:** Tìm vấn đề có bằng chứng trong mã, xếp mức P0–P3.

1. Đọc `.agents/skills/impeccable/SKILL.md`, làm setup theo skill. `$impeccable audit` là yêu cầu cho agent đọc code và kiểm runtime, không phải lệnh CLI. Khi hoàn tất sửa UI, quét bổ trợ một lần trên target thực tế:
   ```bash
   .agents/skills/impeccable/scripts/impeccable detect --json frontend/src/pages/<TenTrang>.tsx
   ```
   Trên Windows dùng `.agents/skills/impeccable/scripts/impeccable.cmd detect --json <path>`. Detector `[]` không chứng minh chức năng, accessibility, theme hoặc hiệu năng đều đạt. Launcher lỗi thì báo rõ và dùng fallback của skill.
2. Đọc `.agents/skills/impeccable/reference/audit.md` để audit; đọc `reference/craft-floor.md` ngay trước khi sửa UI. Chỉ audit thì không sửa.
3. Phân loại kết quả:
   - **P0** chặn nhiệm vụ/mất dữ liệu → sửa ngay.
   - **P1** lớn, cần xong trước phát hành → sửa trong vòng này.
   - **P2** bất tiện có cách vòng → sửa nếu còn thời gian.
   - **P3** tinh chỉnh → ghi nhận, để vòng sau.
4. Mỗi vấn đề phải có: **vị trí** (file:line), **bước tái hiện** (nếu là lỗi), **ảnh hưởng** (ai bị ảnh hưởng, khi nào), **bằng chứng** (snippet code, console, hoặc đường dẫn fixture).
5. **Không suy đoán thành lỗi đã xác nhận.** Nếu chỉ là rủi ro tiềm ẩn, ghi "cần xác minh".

**Báo cáo bước 3:** Danh sách P0–P3 có bằng chứng. Sửa lỗi trong phạm vi đã giao; mức P0 tự nó không yêu cầu xin phép lại. Chỉ hỏi khi thay đổi nghiệp vụ/phạm vi hoặc phụ thuộc chung cần quyết định. Không coi vấn đề thẩm mỹ là P0.

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
npx tsc -b                   # kiểm các project references, gồm source ứng dụng
npm run lint                 # ESLint — 0 error mục tiêu
npm run build                # Vite build PASS
```

**Ghi nhận:**
- Ghi baseline trước sửa khi cần phân biệt lỗi có sẵn. Không mặc định luôn có lỗi legacy; so sánh diagnostic trước/sau, gồm lỗi mới ở caller ngoài file sửa. Báo riêng lỗi có sẵn/ngoài phạm vi, không sửa admin để làm sạch toàn repo.
- `tsconfig.json` gốc có `files: []` và project references: `tsc --noEmit` đơn lẻ có thể exit 0 mà không kiểm source. Không dùng làm bằng chứng typecheck. Chạy ba lệnh độc lập, lưu exit code; một lệnh lỗi không bỏ mất kết quả lint/build.
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
   - Đọc script trước khi chạy; tái sử dụng fixture phù hợp. Chỉ tạo mới khi hành vi quan trọng chưa được cover, không thêm test chỉ để khớp implementation.
2. Kiểm dependency/browser/runtime và server/port script cần. Một số fixture dùng đường dẫn Playwright tuyệt đối trên máy Fenn; không coi là khả dụng trên mọi máy. Chạy desktop sáng/tối (ưu tiên Edge headless 1440×900 khi có), ghi môi trường thực tế; bị chặn thì báo chưa chạy, không ghi PASS.
3. Chọn ca hồi quy theo hành vi bị ảnh hưởng; không bắt trang không có form/pagination chạy ca không áp dụng. Kiểm thêm quyền, đổi tài khoản/request cũ nếu liên quan:
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

**Báo cáo bước 6:** PASS/FAIL/chưa kiểm cho từng ca, có log và phân biệt artifact local bị ignore với artifact trong Git. Theo vòng xác minh hữu hạn của Impeccable: một lượt kiểm gộp, sửa một batch, xác nhận tối đa một lượt nữa. Lỗi chặn còn lại phải báo rõ, không gọi là đã đạt hoặc lặp đánh bóng vô hạn.

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
.agents/skills/impeccable/scripts/impeccable detect --json frontend/src/pages/<TenTrang>.tsx

# Bước 5: Build, lint, typecheck
cd frontend
npx tsc -b
npm run lint
npm run build

# Bước 6: Fixture (ví dụ)
node frontend/scripts/test-<trang>-page.cjs
```

## Phụ lục — Phạm vi quyết định

| Tình huống | Hành động |
|---|---|
| Phát hiện bug admin khi đang rà user | Ghi nhận, **không sửa**, đề xuất phiên admin |
| Cần sửa hook dùng chung (vd `useSiteSettings`) | Dừng, hỏi user vì admin có thể phụ thuộc |
| Trang chưa có fixture | Tìm fixture có thể tái sử dụng; chỉ thêm khi cần kiểm hành vi quan trọng, dùng API giả lập |
| Trang > 1.000 dòng | Đơn giản hóa trước, tách theo trách nhiệm, không cắt cơ học |
| Có P0 chặn release | Ưu tiên P0, hoãn P1–P3 |
| Có lỗi legacy TypeScript ngoài file sửa | Ghi "diagnostic ngoài phạm vi", không cố sửa |
| Thiếu thiết bị thật (responsive) | Tiếp tục phần code/giả lập được giao, ghi giới hạn; chờ kết quả thật trước nghiệm thu theo rule |
| User chưa rõ phạm vi | Hỏi lại 1 câu: rà+sửa, chỉ audit, hay đơn giản hóa? |

## Tài liệu liên quan

- `AGENTS.md` — quy tắc chung, phạm vi user/admin, tiêu chuẩn.
- `PAGE_INVENTORY_AND_ANALYSIS.md` — nguồn chính của checklist và trạng thái nghiệm thu.
- `.agents/skills/impeccable/SKILL.md` — skill Impeccable, dùng ở bước 3.
- `.agents/skills/impeccable/reference/audit.md` — tiêu chí audit.
- `.agents/skills/impeccable/reference/craft-floor.md` — sàn chất lượng UI.
- `.agents/skills/impeccable/reference/harden.md` — tình huống lỗi (dùng khi user yêu cầu "harden").
- `.agents/skills/impeccable/reference/optimize.md` — tối ưu hiệu năng (dùng khi user yêu cầu "optimize").
- [responsive.md](../../../responsive.md) — tiêu chuẩn responsive tại repository root, dùng ở vòng cuối.
- `.cursor/rules/responsive-real-device-testing.mdc` — rule test thiết bị thật.
