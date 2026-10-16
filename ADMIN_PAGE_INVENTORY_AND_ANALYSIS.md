# PhotoCloud — Inventory và nghiệm thu admin

**Phạm vi riêng:** 10 trang admin #30–39. Phiên phụ trách admin chỉ cập nhật file này; Cursor phụ trách user không sửa, gộp, định dạng lại hoặc ghi đè file này trừ khi người dùng yêu cầu trực tiếp. Inventory user: [PAGE_INVENTORY_AND_ANALYSIS.md](PAGE_INVENTORY_AND_ANALYSIS.md).

Đọc AGENTS.md và file này trước khi sửa admin. Giữ ID trang và số mục lịch sử để các tham chiếu cũ còn dùng được. `x` = người dùng xác nhận đạt; `o` = chưa đạt; trống = chưa kiểm. Không dùng fixture thay xác nhận người dùng. Responsive nghiệm thu vòng cuối riêng.

## Trạng thái hiện tại

- **Cài đặt website (#39): chức năng đã nghiệm thu**, xác nhận người dùng tại mục 20.3; chức năng bổ sung tương lai là phạm vi mới.
- **Tổng quan (#30) và Lịch chụp & dịch vụ (#35): chức năng đã được người dùng xác nhận nghiệm thu.** Responsive vẫn để vòng cuối.
- Các trang admin khác chưa được tự đánh dấu hoàn tất. Tiếp tục theo ưu tiên người dùng, mặc định thứ tự #30–39.
- Chưa đối soát DB/quyền thật và production cho các ca chỉ có bằng chứng fixture; giới hạn chi tiết nằm ở từng mục.

## 3. Danh sách 10 trang admin

Nguồn quyền menu hiện hành: `frontend/src/pages/admin/adminNavigation.ts`. `AdminRoute` kiểm quyền vào khu vực, `AdminAccess` kiểm mục cụ thể. Backend vẫn phải tự kiểm quyền; guard frontend không thay thế được điều đó.

| # | Trang | URL | Quyền frontend theo menu hiện tại | Trọng tâm |
|---|---|---|---|---|
| 30 | ~~Tổng quan — chức năng đã nghiệm thu~~ | `/admin` | `viewDashboard` hoặc super admin | Dữ liệu thống kê, khoảng thời gian, ý nghĩa số liệu, loading/error. |
| 31 | Thư viện ảnh | `/admin/images` | `viewImages` hoặc super admin | Upload, danh sách, tìm kiếm, sửa/xóa và chọn hàng loạt; quyền ghi phải kiểm riêng ở API. |
| 32 | Danh mục | `/admin/categories` | `viewCategories` hoặc super admin | Quản lý tên/mô tả/hiển thị; liên kết ảnh và cache danh mục công khai. |
| 33 | Bộ sưu tập | `/admin/collections` | `viewCollections` hoặc super admin | Nội dung, chủ sở hữu, quyền công khai và các thao tác quản trị thực có. |
| 34 | Duyệt nội dung | `/admin/moderation` | `moderateContent` hoặc super admin | Quyết định duyệt/từ chối, lý do, hành động hàng loạt và đồng bộ thư viện. |
| 35 | ~~Lịch chụp & dịch vụ — chức năng đã nghiệm thu~~ | `/admin/bookings` | `isAdmin()` theo nhánh `adminOnly` | Sáu tab vận hành studio; cần kiểm cách `isAdmin()` xử lý super admin trong hook và quyền API từng hành động. |
| 36 | Người dùng | `/admin/users` | `viewUsers` hoặc super admin | Tra cứu/quản lý tài khoản theo UI, giới hạn thao tác quản trị nhạy cảm. |
| 37 | Phân quyền | `/admin/roles` | Super admin | Cấp/sửa/thu hồi quyền, tác động lên menu và endpoint; không cho tự nâng quyền trái phép. |
| 38 | Nhật ký | `/admin/logs` | `viewLogs` hoặc super admin | Tìm/lọc, ngày giờ, truy vết thay đổi; không để log lộ bí mật. |
| 39 | ~~Cài đặt website — chức năng đã nghiệm thu~~ | `/admin/settings` | `manageSettings` hoặc super admin | Thông tin website, tải ảnh, bảo trì và các trường đang hiện; không mặc định có mọi cấu hình studio/email trong trang này. |

Không đưa các component admin cũ vào thành trang mới nếu không có route/menu hiện hành. Ví dụ tên file `AdminFavorites` hoặc `AdminWebSocketMetrics` không tự chứng minh sản phẩm có một trang độc lập tương ứng.

## Lịch sử bảo trì admin

### 13.2. Đã dọn mã admin không còn dùng

Đã kiểm đồ thị import từ `frontend/src/main.tsx`, gồm import tĩnh, lazy import literal, re-export và CSS; đối chiếu thêm các tham chiếu trong source/scripts. Đã xóa **24 file** không còn được ứng dụng hiện hành dùng:

- Entry/layout cũ: `AdminPage.tsx`, `AdminPage.css`, `AdminAppRoutes.tsx`, `components/AdminSidebar.tsx`.
- Component cũ: `components/AdminForm.tsx`, `PermissionBadge.tsx`, `PermissionButton.tsx`, `PermissionMatrix.tsx`, `PermissionTooltip.tsx`.
- Tab cũ: `AdminAnalytics`, `AdminCategories`, `AdminDashboard`, `AdminFavorites`, `AdminImages`, `AdminModeration`, `AdminSettings`, `AdminTrafficAnalytics`, `AdminUsers`, `AdminWebSocketMetrics` trong `components/tabs/`, cùng barrel `index.ts` cũ.
- Hook cũ: `hooks/useAdminCategories.ts`, `useAdminDashboard.ts`, `useAdminImages.ts` và barrel `hooks/index.ts`.

Giữ lại `AdminLayout`, `AdminAccess`, các trang admin mới, tab Bookings/Collections/Roles/Logs, hook users/roles/resource, modal và CSS còn được dùng. Đặc biệt **`AdminForm.css` vẫn được UserModal/CategoryModal sử dụng**, nên chỉ xóa component `AdminForm.tsx`, không xóa CSS này. Shared CSS vẫn có thể chứa selector cũ; chưa bóc từng selector trong lượt dọn module để tránh làm hỏng giao diện mới.

Script đọc dependency: `frontend/scripts/audit-admin-dependencies.cjs` (chỉ báo cáo, không tự xóa). Sau dọn, không còn file admin không được entry hiện hành truy cập theo đồ thị import đã quét. Tải module bằng đường dẫn động không literal cần kiểm thủ công nếu được thêm sau này.

## 19. Bảng màu admin — 16/10/2026

Ưu tiên theo yêu cầu mới của người dùng. Giữ nguyên mọi x/o ở trên; không tự gạch ngang hoặc nghiệm thu responsive. Mục 18 là ghi nhận từ lượt Cursor; đánh giá độc lập bổ sung ở ABOUT_REVIEW.md, không coi checklist cũ là bằng chứng đã đạt.

### 19.1. Bảng màu đã nối

- Admin → Cài đặt website → Bảng màu website: ba nhóm Nền & chữ, Nút & tương tác, Trạng thái; chỉnh riêng sáng/tối. Mỗi màu có tên vai trò, ví dụ vị trí sử dụng, mã HEX và bộ chọn màu. Khung xem trước có header, thẻ, Đặt lịch, Chia sẻ, Đã yêu thích, Xóa, Chấp thuận và thông báo.
- Chỉnh màu chỉ sửa bản nháp; Lưu mới gọi API/ap dụng website. Lỗi lưu giữ bản nháp để thử lại. Hoàn tác quay về bản đã lưu; Khôi phục mặc định cũng chờ Lưu. Cảnh báo khi cặp chữ/nền dưới 4,5:1; invalid HEX chặn lưu. Cảnh báo rời trang khi click link/F5, chưa kiểm Back của router.
- Mặc định tập trung shared/sitePalette.json; CSS fallback được sinh khi dev/build. Runtime nối token nền/chữ/nút/trạng thái với alias HSL, studio và admin. Không hardcode màu trong component. API cũ giữ kiểm quyền manageSettings và CSRF; server chỉ nhận khóa màu cho phép + HEX, không nhận CSS tùy ý.
- Dùng request settings công khai hiện có, chia sẻ request đang chạy; không fetch theo color picker hoặc polling. Cache palette áp dụng trước mount; response ban đầu cũ không ghi đè màu vừa lưu. Chưa đo hiệu năng production; không tuyên bố toàn website đã đổi mọi mã màu legacy. Ảnh/logo/biểu đồ/màu nhà cung cấp không thuộc bảng màu ngữ nghĩa.

### 19.2. Kết quả kiểm tra

- Build PASS, cảnh báo chunk lớn/import động và annotation zod còn tồn tại. Lint phần sửa 0 error, 2 warning effect đồng bộ state tại settings/hook. Typecheck toàn dự án FAIL với lỗi legacy; không diagnostic trong theme/palette/editor/settings vừa sửa. Log palette-build.txt, palette-lint.txt, palette-types.txt trong frontend/qa-policy-checkbox.
- test-button-tokens.cjs PASS: token đủ khai báo, cặp nút thường/hover đạt >=4,5:1 với mặc định sáng/tối.
- test-site-palette.cjs PASS: backend từ chối palette thiếu/thừa khóa, sai version, chèn CSS; fallback mặc định. Edge headless 1440×1000 + API fixture: preview không đổi global/không gọi PUT, save lỗi giữ draft, retry thành công, reset chưa áp dụng, undo, HEX sai chặn request, reload giữ màu. Chỉ 2 PUT chủ động (1 lỗi + 1 thành công), không sửa dữ liệu thật. Chưa test endpoint thật với DB/quyền/CSRF; đã đọc middleware hiện hữu.

### 19.3. Người dùng kiểm lại

- [x] ~~PAL-01 — Mở admin settings; mỗi màu có giải thích và ví dụ đúng phần giao diện.~~
- [x] ~~PAL-02 — Đổi sáng/tối và nhóm màu; màu bản nháp chỉ hiện ở khung mẫu cho tới khi lưu.~~
- [x] ~~PAL-03 — Lưu rồi mở/F5 trang public và admin: màu token đã chọn áp dụng; ảnh giữ nguyên.~~
- [x] ~~PAL-04 — Ngắt mạng khi lưu: giữ bản nháp, có lỗi; bật mạng thử lại thành công. Mã HEX sai không gửi request.~~
- [x] ~~PAL-05 — Hoàn tác/Khôi phục mặc định đúng ý nghĩa; cặp màu khó đọc có cảnh báo.~~
- [ ] PAL-R01 — Responsive/touch/thiết bị thật để vòng cuối, chưa nghiệm thu.
- Hồi quy bổ sung: test-admin-actions.cjs PASS payload thao tác, moderation endpoint, hủy xóa, lỗi/thử lại và route hạn quyền bằng fixture. Không thay thế kiểm DB/quyền thật.

### 19.4. Chọn màu trực tiếp từ khung mẫu

- Bấm nút/chữ/thông báo mẫu hoặc nhãn nền: tự mở nhóm đúng, cuộn tới ô HEX, focus và chọn sẵn mã. Vùng nền trống cũng chọn được bằng chuột; nhãn nền là button dùng được bằng bàn phím. Không gửi thao tác đặt lịch/xóa hoặc lưu màu.
- [x] ~~PAL-06 — Bấm Đặt lịch/Xóa/thông báo/chữ/nhãn nền trong mẫu: đến đúng ô màu, giữ đúng theme đang chỉnh; Tab + Enter cũng chọn được.~~
- Kiểm bổ sung PASS: build; lint editor 0 error/warning; fixture Edge click Xóa chuyển nhóm Trạng thái và focus đúng HEX, Enter nút chính chuyển nhóm Nút, nhãn Nền trang quay lại Nền & chữ. Hồi quy lưu/lỗi/thử lại/hoàn tác vẫn PASS; responsive chưa kiểm.


## 20. UI/UX Cài đặt website admin — 16/10/2026

Theo phân công mới: tập trung admin; phần public do Cursor phụ trách. Không đổi dấu x/o hoặc nghiệm thu thay người dùng.

### Thay đổi

- Chia Cài đặt chung và Giao diện bằng điều khiển chọn rõ trạng thái, có mô tả ngắn. Cài đặt chung giữ tên/mô tả, giới hạn tải ảnh và bảo trì; Giao diện dành toàn vùng cho bảng màu. Chuyển mục giữ bản nháp, không gọi API hoặc tự lưu.
- Thanh Hoàn tác/Lưu bám dưới vùng nhìn thấy, kèm trạng thái và lỗi lưu cùng nhóm. Bổ sung kiểm tên trống/dung lượng sai khi form chung đang ở mục khác; giữ API, quyền và nghiệp vụ.
- Bảng màu có tìm kiếm theo tên/mô tả trong nhóm và thông báo không có kết quả. Chọn mẫu tự xóa tìm kiếm, chuyển đúng nhóm, focus/chọn HEX. Hàng đang chọn có viền dẫn hướng và nền nhẹ.
- Danh sách màu cuộn riêng ở desktop để giữ mẫu bên cạnh; trạng thái sáng/tối và nhóm màu rõ hơn; tăng cỡ chữ/hint form, dùng token hiện hữu. CSS riêng AdminSettingsPage.css, không ghi đè layout các trang admin khác.

### Kiểm tra

- Build PASS, giữ cảnh báo chunk/import động/zod hiện hữu. Lint 2 TSX sửa: 0 error, 1 warning effect setDraft đã có. Typecheck toàn dự án vẫn FAIL do legacy; không diagnostic ở AdminSettingsPage/SitePaletteEditor.
- Edge headless 1440×1000, API fixture riêng: kiểm hai mục, giữ draft khi chuyển, tìm đúng 1 màu/không kết quả, click mẫu/Enter chọn đúng ô, lỗi lưu giữ draft, thử lại, khôi phục/hoàn tác, HEX sai chặn request, reload. test-site-palette.cjs PASS; test-admin-actions.cjs PASS hồi quy payload/quyền route/lỗi-thử lại/hủy xóa. Đã xem screenshot cài đặt chung sáng/tối và editor; xác nhận computed nút phụ dark bg/fg đúng palette sau transition. Không sửa DB thật.
- Chưa kiểm DB/CSRF/quyền thật, chưa đo hiệu năng production, chưa kiểm mọi cặp tương phản tùy chỉnh, responsive/touch/thiết bị thật để vòng cuối.

### Checklist người dùng

- [x] ~~SET-01 — Chuyển Cài đặt chung/Giao diện dễ tìm; nội dung đang sửa vẫn còn khi chuyển qua lại.~~
- [x] ~~SET-02 — Tìm tên màu trong nhóm; không có kết quả có hướng dẫn; chọn mẫu đến đúng ô dù đang tìm từ khác.~~
- [x] ~~SET-03 — Cuộn danh sách màu vẫn thấy mẫu; ô đang chọn rõ; thao tác bằng bàn phím được.~~
- [x] ~~SET-04 — Lưu/Hoàn tác và trạng thái dễ thấy khi cuộn; lỗi mạng giữ nội dung, thử lại thành công.~~
- [x] ~~SET-05 — Sáng/tối: form, chữ, nút và mẫu đọc rõ, đúng bảng màu đã lưu.~~
- [ ] SET-R01 — Responsive để vòng cuối, chưa nghiệm thu.

### 20.1. Nhóm màu theo thành phần

- Nút chính, nút phụ, đã chọn, nút xóa, icon xóa nhẹ, chấp thuận có nhóm riêng, gom nền/chữ/viền/rê chuột liên quan. Nền, chữ/viền chung, thương hiệu và thông báo cũng được phân nhóm. Không thêm bản sao token: viền nút chính đang dùng chung màu nền, có giải thích ngay trong nhóm.
- Build PASS; lint editor/metadata 0 error/warning; test-site-palette.cjs PASS chọn mẫu, tìm kiếm, chuyển nhóm, lưu/lỗi/thử lại/hoàn tác/reload bằng Edge fixture; đã xem screenshot dark. Không tự đánh dấu responsive hoặc x/o của người dùng.
- [x] ~~SET-06 — Trong Nút & tương tác, nhóm Nút chính có nền/chữ/rê chuột cạnh nhau; nhóm Nút phụ có thêm viền. Bấm mẫu vẫn đến đúng ô, chỉnh nhiều màu rồi lưu một lần.~~

### 20.2. Editor theo thành phần

- Chọn thành phần bằng danh sách hoặc bấm mẫu: bên trái chỉ hiển thị bộ màu của thành phần đang chọn, ô màu xếp cạnh nhau. Nhóm lớn và tìm kiếm dùng để lọc danh sách thành phần; không giấu các thuộc tính liên quan khi đang chỉnh một bộ.
- Có mẫu nút nhỏ và cảnh báo tương phản cục bộ. Hoàn tác thành phần trả các màu của thành phần ở theme đang chỉnh về bản đã lưu; giữ draft thành phần/theme khác. Lưu chung vẫn áp dụng toàn bộ draft. Viền nút chính tiếp tục dùng chung nền theo hợp đồng token hiện có.
- Build PASS; lint editor 0 error/warning. Edge fixture PASS: click/Enter chọn đúng thành phần, chỉ 3 ô của nút chính, chỉnh nền/chữ cùng màu hiện cảnh báo, hoàn tác riêng phục hồi cả hai và giữ draft nền trang; lưu/lỗi/thử lại/hoàn tác toàn bộ/reload tiếp tục PASS. Đã xem screenshot sáng/tối, chưa kiểm responsive hoặc DB thật.
- [x] ~~SET-07 — Chọn nút trong mẫu/danh sách: chỉ hiện bộ màu đúng nút, không cần cuộn qua các nút khác; chỉnh nhiều ô rồi lưu chung.~~
- [x] ~~SET-08 — Hoàn tác thành phần chỉ phục hồi thành phần/theme đang chỉnh; màu draft khác vẫn còn. Cặp nút khó đọc có cảnh báo tại chỗ.~~


### 20.3. Người dùng nghiệm thu Cài đặt website

Người dùng xác nhận: “phần setting hiện tại đã hoàn thành (có thể thêm chức năng trong tương lai nhưng giờ ổn rồi)”. Đánh x và gạch ngang checklist chức năng PAL-01–06, SET-01–08 theo xác nhận này. Phạm vi hiện tại gồm cài đặt chung và bảng màu theo thành phần. Chức năng bổ sung tương lai là phạm vi mới; responsive PAL-R01/SET-R01 vẫn chưa nghiệm thu và để vòng cuối. Không thay đổi nghiệm thu trang public hoặc Giới thiệu.

## 21. ~~Tổng quan admin (#30) — chức năng đã nghiệm thu~~

Theo ưu tiên người dùng, tập trung admin; giữ nguyên phần Cài đặt website đã nghiệm thu và code public Cursor đang sửa. Người dùng đã yêu cầu gạch trang Tổng quan; xác nhận này thay thế trạng thái chờ nghiệm thu trước đó.

### Sửa và giới hạn

- Số liệu ghi rõ tổng toàn hệ thống, không giới hạn thời gian; thời điểm cập nhật là lần client nhận dữ liệu thành công, không phải thời điểm đồng bộ DB. Làm mới có nhãn đang cập nhật/disabled. Lỗi làm mới giữ dữ liệu và thời gian cũ, báo rõ đang dùng lần tải trước; lỗi lần đầu không hiện nhầm trạng thái rỗng.
- Gom ba mục thống kê qua cùng quy tắc hiển thị số; thiếu/sai số hiện dấu — thay vì 0 giả. Không thêm đồ thị, tỷ lệ tăng trưởng hoặc bộ lọc thời gian khi API chưa hỗ trợ.
- Tách DashboardRecentImages theo trách nhiệm: tối đa 6 ảnh, tiêu đề dài xuống dòng, tiêu đề/tác giả/ngày thiếu có lời thay thế; ảnh lỗi có icon. Ưu tiên thumbnail/smallUrl khi có; backend dashboard bổ sung hai trường đã có trong model vào projection. Không kết luận đã sửa nguyên nhân ảnh trắng trên dữ liệu thật chỉ từ screenshot.
- Tăng độ rõ chữ/hint/link, dùng token sáng/tối; danh sách dùng ul/li, ngày hợp lệ dùng time theo múi giờ Việt Nam; focus có viền. Giữ lối tắt theo quyền; tài khoản chỉ có viewDashboard thấy lời giải thích thay cho danh sách trống.
- Phạm vi file: admin frontend components và adminAnalyticsController backend. Không sửa shared client/hook hoặc trang public. useAdminResource và AdminHeading/Feedback/Empty hiện có tiếp tục được tái sử dụng, giữ cơ chế bỏ response cũ. Không thêm thư viện/request/polling. Chưa đo hiệu năng production, không tuyên bố tối ưu tốc độ.

### Bằng chứng kiểm

- Build PASS (cảnh báo chunk/import động/zod cũ). Lint dashboard/recent-images 0 error/warning. Typecheck toàn repo còn lỗi legacy, không diagnostic ở 2 component vừa sửa. node --check adminAnalyticsController PASS.
- Edge headless 1440×1000 + API fixture riêng: số lớn, tiêu đề dài tiếng Việt, ảnh lỗi/thiếu URL, thiếu tác giả/ngày, refresh lỗi giữ dữ liệu, retry thành công, danh sách rỗng, lỗi tải đầu không giả rỗng, tài khoản chỉ xem tổng quan không có lối tắt vượt quyền PASS; không pageerror. Đã xem screenshot sáng/tối. Script test-admin-dashboard.cjs; ảnh/log dashboard-* trong frontend/qa-policy-checkbox.
- Chưa kiểm DB thật, endpoint quyền thật, timeout/offline trình duyệt đầy đủ, điều hướng từng lối tắt tới nghiệp vụ hoàn chỉnh, số liệu đối soát production, responsive/touch/thiết bị thật. Không sửa dữ liệu thật để kiểm.

### Checklist người dùng

- [x] ~~DASH-01 — Mở/F5 /admin: số ảnh/thành viên/danh mục đúng dữ liệu thực, ghi rõ phạm vi tổng và lần cập nhật.~~
- [x] ~~DASH-02 — Làm mới: khóa gửi khi đang tải; lỗi giữ dữ liệu cũ, có giải thích; Thử lại thành công cập nhật dữ liệu.~~
- [x] ~~DASH-03 — Ảnh gần đây: có thumbnail khi URL hợp lệ; thiếu/hỏng ảnh có icon, tiêu đề/tác giả/ngày thiếu không vỡ giao diện.~~
- [x] ~~DASH-04 — Không có ảnh hiện lời hướng dẫn; mất kết nối tải đầu hiện lỗi và thử lại, không báo nhầm chưa có ảnh.~~
- [x] ~~DASH-05 — Lối tắt đi đúng nơi và chỉ hiện theo quyền; tài khoản chỉ xem tổng quan có thông báo rõ.~~
- [x] ~~DASH-06 — Sáng/tối và bàn phím: chữ/nút/link/focus rõ, tiêu đề dài không đẩy tràn.~~
- [ ] DASH-R01 — Responsive kiểm vòng cuối, chưa nghiệm thu.

## Quy tắc cập nhật file riêng

Ngày 16/10/2026, người dùng yêu cầu tách admin để tránh xung đột với Cursor. Dữ liệu được chuyển từ inventory cũ, không làm lại nghiệm thu. Chỉ có một bản checklist admin trong file này; thông tin dùng chung ở inventory user chỉ dẫn link. Không sửa inventory user khi làm admin, trừ yêu cầu trực tiếp của người dùng.

## 23. Xác nhận nghiệm thu của người dùng — 16/10/2026

Theo yêu cầu “gạch trang tổng quan, lịch chụp, setting”: gạch ngang ba trang #30, #35, #39 trong danh sách admin và ghi nhận chức năng hiện tại đã đạt. DASH-01–06 được gạch ngang; PAL/SET giữ nguyên x đã nghiệm thu. Lịch chụp & dịch vụ được xác nhận ở cấp trang, không tạo thêm các ca test giả hoặc tuyên bố đã chạy kiểm mới. Responsive của cả ba trang vẫn chưa nghiệm thu, tiếp tục vòng cuối riêng.
