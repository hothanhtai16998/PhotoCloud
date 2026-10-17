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
| 33 | ~~Bộ sưu tập — chức năng đã nghiệm thu~~ | `/admin/collections` | `viewCollections` hoặc super admin | Nội dung, chủ sở hữu, quyền công khai và các thao tác quản trị thực có. |
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

## 24. Thư viện ảnh admin (#31) — rà và sửa 16/10/2026

Theo yêu cầu người dùng, làm phần admin; giữ nguyên nghiệm thu Tổng quan, Lịch chụp và Cài đặt. Các dấu dưới đây chờ người dùng kiểm, không tự đánh x.

### Thay đổi và trách nhiệm

- AdminRecords vẫn dùng chung CRUD/search/pagination cho ảnh, danh mục, người dùng; không tạo bản sao bảng CRUD. Dữ liệu gắn với kind/page/query, không dựng hàng cũ dưới truy vấn mới. Chuẩn hóa page về số nguyên dương; chỉ clamp trang theo pagination đúng ngữ cảnh. Chặn checkbox/sửa/xóa trong lúc tải/lỗi để tránh thao tác trên dữ liệu chưa đối soát.
- Selection chỉ gồm ID còn trong trang hiện tại; checkbox đầu bảng có trạng thái chọn một phần, ghi rõ chọn tất cả áp dụng cho trang hiện tại. Lỗi xóa một phần giữ ID thất bại và retry chỉ gửi lại các ID này. Giữ hộp xác nhận, khóa thao tác đang chạy và cách cập nhật store/sự kiện cũ.
- Tách AdminImagePreview (ảnh thay thế khi URL hỏng/thiếu, ưu tiên thumbnail nếu có; tên link nói rõ mở tab mới) và adminRecordFormatting (ngày Việt Nam hợp lệ hoặc lời thay thế). Tiêu đề trống có tên rõ cho cả nút/checkbox. Trạng thái lạ không lọt undefined; cột ghi Người tải lên đúng ý nghĩa uploadedBy.
- Hộp đổi danh mục hàng loạt có trạng thái tải, retry khi lỗi, bỏ response cũ sau đóng/unmount. Hộp sửa giữ bản nháp khi save lỗi, chặn tiêu đề chỉ khoảng trắng, có lỗi/retry tải danh mục riêng và giữ lựa chọn gốc khi danh sách chưa tải được; vẫn sửa được tiêu đề khi không tải được danh mục.
- API admin ảnh sửa escape ký tự regex để tìm literal (dấu chấm, ngoặc, cộng, backslash…), giữ cùng contract. Placeholder nêu tìm tiêu đề/mô tả đúng truy vấn backend. Chỉ thay file admin và script test; không sửa public hoặc shared service/hook của Cursor.
- Chữ/hint/bảng rõ hơn, dùng token hiện hữu, thanh thao tác hàng loạt dễ thấy, focus rõ sáng/tối. Không thêm dependency hoặc memo đại trà. Chưa đo tốc độ production; không tuyên bố tăng tốc.

### Bằng chứng và giới hạn

- Build PASS, còn cảnh báo zod/chunk/import động có sẵn. Lint phần sửa 0 error, 3 warning effect đồng bộ state; log library-lint.txt. Typecheck toàn repo còn lỗi legacy, không diagnostic tại AdminRecords/AdminImageModal/AdminImagePreview/adminRecordFormatting. Backend node --check PASS.
- test-admin-library.cjs PASS bằng Edge headless 1440×1000, API fixture riêng: literal regex, thiếu tiêu đề/ngày/tác giả/ảnh, checkbox chọn một phần, tải lại danh mục, save lỗi giữ draft rồi retry, xóa một phần chỉ retry ID lỗi, empty/lỗi/thử lại, tìm kiếm và response cũ chậm không ghi đè truy vấn mới, mạng lỗi giả lập qua abort + offline/online, Back/Forward. Đã xem screenshot library-light/dark.
- test-admin-actions.cjs PASS hồi quy upload mở/đóng (không đổi route), payload sửa ảnh, hủy xóa, lỗi/thử lại, quyền hạn và các trang dùng chung. Không upload/xóa dữ liệu thật để kiểm.
- Chưa kiểm upload file thành công với storage/DB thật, CSRF/quyền backend thật, batch lớn/quá hạn request/đổi tài khoản khi đang mutation, đối soát cache public sau sửa danh mục, responsive/touch/thiết bị thật. Backend regex được kiểm hàm literal, không thay thế truy vấn MongoDB thật. Chi tiết test tại frontend/qa-policy-checkbox/library-*.

### Checklist người dùng

- [ x] LIB-01 — Mở/F5 Thư viện ảnh: tổng, ngày, tên, người tải và trạng thái đúng dữ liệu; thiếu ảnh/nội dung có lời thay thế dễ hiểu.
- [ ] LIB-02 — Tìm tiếng Việt/ký tự đặc biệt, xóa lọc; đổi nhanh từ khóa: URL/kết quả đúng từ cuối, không nháy dữ liệu cũ.
- [ x] LIB-03 — Sau/Trước/Back/Forward/F5 giữ truy vấn và trang; số trang/kết quả đúng, không giữ selection từ trang trước.
- [ x] LIB-04 — Chọn một/vài/tất cả: checkbox đầu bảng đúng trạng thái; phạm vi là trang hiện tại; Bỏ chọn hoạt động.
- [x ] LIB-05 — Sửa tiêu đề/danh mục: lưu đúng; mất mạng giữ nội dung để thử lại; danh mục tải lỗi có retry, không tự mất danh mục gốc.
- [ x] LIB-06 — Đổi danh mục hàng loạt: tải danh mục/thử lại đúng; lỗi một phần giữ những ảnh lỗi, không báo thành công toàn bộ.
- [x ] LIB-07 — Xóa một/nhiều: Hủy không gửi xóa; xử lý không gửi trùng; lỗi một phần thử lại chỉ các ảnh lỗi; xóa hết trang về trang hợp lệ. (đạt nhưng phản hồi lâu quá)
- [ ] LIB-08 — Tải ảnh lên mở/đóng đúng, sau upload thành công danh sách làm mới. Kiểm file thật bằng dữ liệu test được phép.
- [ ] LIB-09 — Loading/rỗng/không kết quả/lỗi phân biệt rõ; Thử lại hoạt động. Tài khoản chỉ xem không có sửa/xóa/chọn vượt quyền.
- [ x] LIB-10 — Sáng/tối, Tab/Enter/Escape: focus và tên nút rõ; modal đóng trả focus, chữ dài không tràn.
- [ ] LIB-R01 — Responsive để vòng cuối, chưa nghiệm thu.

### Khôi phục ranh giới ConfirmModal — 16/10/2026

Theo yêu cầu sửa hồi quy trang Bộ sưu tập: ConfirmModal ở admin/components/modals được trả về bản admin riêng từ Git, bỏ re-export tới component user mới. Không thay đổi nghiệp vụ hoặc các dấu nghiệm thu admin. Build PASS; không tuyên bố đã kiểm riêng toàn bộ thao tác admin dùng modal trong lượt này.

### Kiểm hồi quy tiếp nối — 16/10/2026

- Build hiện tại PASS; log `frontend/qa-policy-checkbox/admin-continuation-build.txt`. Lint AdminRecords và ConfirmModal: 0 lỗi, 2 cảnh báo setState trong effect ở AdminRecords (đồng bộ từ khóa URL và xóa selection khi đổi trang/truy vấn).
- Chạy lại `test-admin-library.cjs` PASS: tìm literal, chọn một phần, tải lại danh mục, giữ draft khi lưu lỗi/thử lại, xóa một phần chỉ gửi lại ID lỗi, rỗng/lỗi/tìm kiếm, response cũ, offline/online, Back/Forward và phân trang. `test-admin-actions.cjs` PASS: payload mutation, endpoint duyệt, hủy xóa, lỗi/thử lại và route hạn quyền; bao gồm hồi quy sau khôi phục ConfirmModal admin riêng.
- Môi trường: Edge headless 1440×1000, bản build hiện tại, API fixture cục bộ. Edge không khởi động được trong sandbox; hai script chạy thành công ngoài sandbox. Không kiểm DB/storage/quyền backend thật hoặc responsive trong lượt này. Không có thay đổi mã nguồn ứng dụng; giữ nguyên LIB-01–10 chờ người dùng nghiệm thu.

## 25. Bộ sưu tập admin (#33) — rà và sửa 16/10/2026

Theo ưu tiên mới của người dùng từ ảnh /admin/collections. Giữ phong cách kem/nâu hiện hành, responsive kiểm riêng vòng cuối.

### Thay đổi

- Dùng lại AdminHeading, AdminFeedback, AdminEmpty, AdminPagination, AdminModal, useAdminResource và định dạng ngày admin. Đầu trang có mô tả/Làm mới; tìm kiếm có icon trong ô, nút gửi và Xóa lọc. Gom tên/mô tả vào một cột, cho nội dung dài xuống dòng; CSS riêng sửa màu phân trang tối, không sửa shared CSS hoặc public.
- Bỏ loading bị bỏ qua, effect gửi request theo từng ký tự và state modal trùng. Tìm kiếm gửi khi Enter/bấm nút; q/page ở URL để mở trực tiếp/F5/Back/Forward. Response được gắn ngữ cảnh truy vấn/trang/tài khoản; request cũ không thay kết quả mới. Xóa hết trang sẽ điều hướng về trang hợp lệ theo pagination mới.
- Phân biệt đang tải, không có dữ liệu, không có kết quả và lỗi có Thử lại. Thiếu tên/người tạo/ngày/số liệu có lời thay thế hoặc dấu —; không hiển thị 0 giả cho số lượt xem thiếu.
- Chỉ hiện thao tác với manageCollections/super admin. Khóa mutation bằng ref và disabled; xóa lỗi giữ dialog để thử lại, Hủy không gửi request. AdminModal hiện hữu quản lý focus/ Escape và trả focus; không cho đóng khi đang mutation. Bỏ kết quả mutation sau đổi tài khoản/unmount; không tuyên bố request backend đã hủy.
- Phạm vi: admin frontend (AdminCollections.tsx, CSS riêng), script fixture và inventory admin. Không thay API/backend, public, shared service/hook hoặc nghiệm thu các trang khác.

### Bằng chứng và giới hạn

- Build PASS, còn cảnh báo chunk/import động/zod hiện hữu. Lint AdminCollections: 0 lỗi/cảnh báo. Typecheck toàn dự án vẫn có lỗi ngoài phạm vi; không diagnostic AdminCollections trong log admin-collections-types.txt. Detector Impeccable trả [] trước sửa CSS phân trang cuối.
- test-admin-collections.cjs PASS: dữ liệu thiếu/nội dung dài, sáng/tối, payload ẩn/hiện, Hủy không xóa, xóa lỗi giữ dialog rồi retry, lỗi tải/thử lại, tìm kiếm/URL/F5/Back/Forward. Edge headless 1440×1000, API fixture cục bộ; đã xem screenshot sáng/tối và xác minh lại sau sửa nền phân trang dark. Không sửa dữ liệu thật.
- Chưa kiểm endpoint/DB/CSRF/quyền backend thật, đổi tài khoản trong mutation bằng browser, xóa trang cuối với DB thật, phân trang nhiều trang và offline/timeout đầy đủ. Fixture phản hồi tìm kiếm chậm được dùng nhưng chưa có assertion riêng chờ phản hồi cũ xong để chứng minh mọi race. Không đo hiệu năng production hoặc kiểm responsive/touch/thiết bị thật.

### Checklist người dùng

- [x] ~~COL-01 — Mở/F5 Bộ sưu tập: tên/mô tả, người tạo, số ảnh/lượt xem/trạng thái/ngày đúng dữ liệu thật; phần thiếu có lời thay thế.~~
- [x] ~~COL-02 — Tìm bằng Enter/nút, Xóa lọc; F5/Back/Forward giữ truy vấn và kết quả tương ứng.~~
- [x] ~~COL-03 — Nhiều trang: Trước/Sau đúng; xóa hết trang cuối quay về trang hợp lệ.~~
- [x] ~~COL-04 — Ẩn/Công khai cập nhật đúng; đang xử lý không gửi trùng; lỗi cho phép thử lại thao tác.~~
- [x] ~~COL-05 — Xóa: Hủy không xóa; lỗi giữ hộp thoại; thử lại thành công mới đóng. Chỉ dùng bộ sưu tập test được phép xóa.~~
- [x] ~~COL-06 — Tải/rỗng/không kết quả/lỗi phân biệt rõ; Thử lại hoạt động. Tài khoản chỉ xem không có thao tác quản lý.~~
- [x] ~~COL-07 — Sáng/tối, nội dung dài, Tab/Enter/Escape và focus hộp xóa dùng được.~~
- [ ] COL-R01 — Responsive để vòng cuối, chưa nghiệm thu.


## 26. Nghiệm thu Bộ sưu tập và sửa ẩn/hiện gói chụp — 16/10/2026

- Người dùng xác nhận Bộ sưu tập “đẹp rồi, gọn gàng dễ nhìn, gạch ngang đi”: gạch trang #33 và COL-01–07 theo xác nhận, giữ COL-R01 chưa nghiệm thu. Đây là xác nhận của người dùng, không bổ sung tuyên bố kiểm production.
- Gói chụp admin trước đây chỉ có nút Ẩn, không thể hiện active=false và không có nút khôi phục. API admin hiện hành đã liệt kê cả gói ẩn. Thêm trạng thái Đang hiển thị/Đã ẩn và nút Hiện lại; dùng PATCH hiện hữu với active=true, giữ thông số và sortOrder. Gói ẩn vẫn sửa được và vẫn ở danh sách admin.
- Khóa thao tác ẩn/hiện trong khi gửi bằng ref/disabled. Chỉ cập nhật trạng thái danh sách sau khi mutation thành công; lỗi giữ trạng thái để thử lại. Không reload ngay sau thao tác vì shared GET có thể dùng lại response cũ trong cửa sổ một giây; không sửa shared wrapper/service/type hoặc public.
- Phạm vi mã ứng dụng: chỉ AdminBookings.tsx (admin); thêm script test-package-visibility.cjs và bằng chứng QA. Build PASS; lint 0 lỗi, 1 cảnh báo effect có sẵn; typecheck toàn dự án có lỗi ngoài phạm vi, không diagnostic AdminBookings tại log. Impeccable detector [] trước lần chỉnh xử lý GET cũ.
- Edge headless 1440×1000, API fixture riêng PASS: ẩn giữ hàng admin, F5 vẫn có Hiện lại, hiện lại lỗi giữ trạng thái, retry thành công, payload active=true giữ sortOrder, ẩn lần nữa. Có screenshot sáng/tối; đã xem dark. Không sửa DB thật; chưa kiểm production/CSRF/đổi tài khoản khi mutation, responsive/touch/thiết bị thật. Nghiệm thu cũ của Lịch chụp giữ nguyên; lỗi bổ sung này chờ kiểm lại.

- [x ] PKG-V01 — Ẩn gói test: gói vẫn nằm trong admin, ghi Đã ẩn và có Hiện lại; F5 vẫn khôi phục được.
- [ x] PKG-V02 — Hiện lại: trạng thái đổi sau API thành công; trang đặt lịch public có thể chọn lại gói sau tải lại; thông số/giá/thứ tự giữ nguyên.
- [x ] PKG-V03 — Mất mạng khi ẩn/hiện: không báo thành công, trạng thái không đổi; kết nối lại thử được, đang gửi không gửi trùng.

## 27. Phân quyền quản trị (#37) — rà và sửa 16/10/2026

Theo ưu tiên người dùng từ ảnh danh sách và hộp thêm quyền. Chưa đánh x hoặc gạch trang; responsive để vòng cuối.

### Thay đổi và phạm vi

- Bảng gọn hơn: tài khoản/email, vai trò & trạng thái, quyền hạn, người cấp và thao tác. Thay hàng loạt tag quyền bằng tóm tắt và details/summary mở xem theo nhóm. Quản trị cấp cao ghi toàn quyền theo middleware hiện hữu; giữ danh sách quyền cờ để đối chiếu. Tài khoản bị thiếu không bị lọc âm thầm; hiển thị lời thay thế và không cho thao tác khi không có ID.
- Tái sử dụng AdminHeading/Feedback/Empty, thêm Làm mới và trạng thái tải/rỗng/lỗi/thử lại. Hạn quyền hiển thị giờ thiết bị theo locale Việt Nam; cập nhật trạng thái hết hạn mỗi 30 giây và dọn timer khi unmount. Giữ bảo vệ quyền hệ thống và khóa tự thu hồi ở UI như trước.
- CreateRoleModal/EditRoleModal dùng chung RoleEditor và AdminModal: native dialog/focus/ESC, header/footer riêng, phần nội dung cuộn; label gắn input, fieldset/legend chia trách nhiệm. Bỏ emoji, inline màu cứng và effect cộng dồn quyền. Màu lấy token sáng/tối; CSS riêng trang/form.
- Quyền hiệu lực suy ra từ quyền người dùng chọn + quyền kế thừa, giới hạn theo tập quyền backend của moderator/admin/super_admin hiện hành. Quyền ngoài vai trò bị khóa và gửi false; viewDashboard luôn bật. Chuyển vai trò không cộng quyền kế thừa vào state lựa chọn qua effect. Không sửa policy/guard/validator backend.
- Chọn tài khoản qua API tìm kiếm/phân trang 20 mục, không giới hạn ở trang đầu như trước; giữ tài khoản đã chọn khi chuyển trang/tìm kiếm. Ngày hết hạn phải tương lai, gửi ISO từ giờ thiết bị; IP tách phẩy, trim/bỏ trùng, vẫn do backend kiểm hợp lệ.
- useAdminRoles dùng lại useAdminResource: bỏ any/response shape suy diễn, tránh response cũ; mutation khóa bằng ref, giữ draft/dialog khi API lỗi, chỉ đóng sau thành công; danh sách tải lại lỗi có feedback riêng. Phiên tài khoản đổi được remount để không dùng state phân quyền của phiên cũ; bỏ kết quả mutation khi unmount/đổi tài khoản, không tuyên bố hủy thao tác backend đang chạy.
- Chỉ thay admin frontend: AdminToolsPage (nối props role, không đổi các tab khác), hook useAdminRoles, AdminRoles/CSS và CreateRoleModal/EditRoleModal/RoleEditor/CSS. Script fixture và inventory admin đi kèm. Không sửa public, shared service/hook/type/util hoặc backend. Tái sử dụng PERMISSION_GROUPS/roleInheritance; hai form cũ đã được thay bằng wrapper gọi một form chung, không giữ hai bản logic.

### Bằng chứng kiểm tra

- Build PASS (còn cảnh báo chunk/import động/zod hiện hữu). Lint 6 TS/TSX sửa: 0 lỗi/cảnh báo. Typecheck toàn dự án còn lỗi legacy, không diagnostic tại AdminToolsPage/useAdminRoles/AdminRoles/RoleEditor/CreateRoleModal/EditRoleModal. Detector Impeccable [] tại các UI vừa sửa.
- test-admin-roles.cjs PASS bằng Edge headless 1440×1000, API fixture cục bộ: quyền hệ thống không có sửa/thu hồi, tài khoản thiếu, screenshot sáng/tối; chọn tài khoản trang 2, quyền kế thừa bị khóa, quyền ngoài vai trò bị khóa, ngày quá khứ chặn request, lưu lỗi giữ draft/retry, payload thêm/sửa với active/IP/ISO expiry, Hủy không thu hồi, thu hồi lỗi giữ dialog rồi retry, lỗi tải không giả rỗng/thử lại và danh sách rỗng. Không pageerror.
- test-admin-actions.cjs PASS hồi quy payload, moderation endpoint, hủy xóa, lỗi/thử lại và route hạn quyền. Đã xem hai lượt screenshot hữu hạn của danh sách/form sáng/tối. Log/ảnh roles-* tại frontend/qa-policy-checkbox.
- Chưa cấp/thu hồi quyền thật, chưa kiểm DB/quyền backend/CSRF/audit log thật, hiệu lực IP/CIDR tại middleware, hết hạn theo đồng hồ server, quyền sau đăng nhập lại, đổi tài khoản trong mutation bằng browser, tìm kiếm tài khoản API lỗi bằng assertion riêng, kiểm bàn phím/screen reader đầy đủ hoặc responsive/touch/thiết bị thật. Fixture không thay đối soát bảo mật production; không đo/tuyên bố tăng tốc production.

### Checklist người dùng

- [ x] ROLE-01 — Mở/F5 Phân quyền: tài khoản/email, vai trò, trạng thái, người cấp đúng; quyền hệ thống ghi bảo vệ, tài khoản mình có nhãn rõ.
- [x ] ROLE-02 — Mở Xem quyền chi tiết: nhóm và quyền đúng; danh sách gọn khi thu lại; sáng/tối dễ đọc.
- [x ] ROLE-03 — Thêm quyền: tìm tài khoản theo tên/email, chuyển trang; lựa chọn không mất khi đổi trang/từ khóa.
- [x ] ROLE-04 — Đổi vai trò: quyền kế thừa bật/khóa đúng, quyền ngoài vai trò không chọn được; thêm/sửa lưu đúng trên tài khoản test được phép.
- [x ] ROLE-05 — Kích hoạt/tạm ngưng, hết hạn, IP: lưu và mở lại giữ giá trị; ngày quá khứ bị chặn; IP sai do máy chủ từ chối và giữ bản nháp.
- [ x] ROLE-06 — Mất mạng khi lưu: không đóng form, giữ nội dung, kết nối lại thử thành công; không gửi trùng khi đang xử lý.
- [x ] ROLE-07 — Thu hồi: Hủy không gửi, lỗi giữ dialog/thử lại; thành công chỉ mất quyền quản trị, tài khoản vẫn tồn tại. Chỉ dùng tài khoản test được phép.
- [x ] ROLE-08 — Loading/rỗng/lỗi có thông báo đúng; Làm mới/Thử lại hoạt động; Tab/Enter/Escape và focus dialog dùng được.
- [ ] ROLE-R01 — Responsive/touch/thiết bị thật để vòng cuối, chưa nghiệm thu.

### 27.1. Sửa theo ảnh dữ liệu thực — 16/10/2026

- Ảnh người dùng cho thấy nhiều bản ghi không có userId đã populate, nhưng UI ghi “Tài khoản không còn tồn tại” và tính tất cả là tài khoản quản trị. Nhãn trước đó suy diễn quá mức. Đổi thành “Chưa có thông tin tài khoản”, hiển thị mã bản ghi để đối soát, đếm riêng bản ghi có tài khoản liên kết và bản ghi thiếu thông tin; thêm lời giải thích rằng chưa xác nhận tài khoản đã bị xóa. Không xóa/ẩn các bản ghi hoặc sửa DB. Hàng không có ID tài khoản ghi thiếu liên kết để thao tác, không tự gán nhãn hệ thống bảo vệ.
- Phần quyền chi tiết giới hạn vùng nội dung 280px, cuộn riêng bằng chuột/bàn phím, có focus và tên region; giữ details/summary. Mở quyền không còn làm hàng dài gần toàn bộ trang. CSS chỉ thuộc AdminRoles.
- Build PASS; lint AdminRoles 0 lỗi/cảnh báo; detector []. test-admin-roles.cjs PASS lại toàn bộ fixture, bổ sung bộ quyền dài: vùng hiển thị <=290px tính cả padding, có overflow và End cuộn khi focus. Đã xem screenshot sáng; fixture tạo lại ảnh sáng/tối. Không đối soát DB thật để xác nhận nguyên nhân thiếu liên kết; responsive vẫn chưa nghiệm thu. ROLE-01/02 vẫn chờ người dùng kiểm lại.

## 28. Nhật ký hệ thống (#38) — rà và sửa 16/10/2026

Theo ảnh người dùng yêu cầu chuyển sang Nhật ký; chưa nghiệm thu hoặc gạch trang Phân quyền/Nhật ký. Responsive vẫn để vòng cuối.

### Thay đổi

- Đồng bộ AdminHeading/Feedback/Empty/Pagination hiện hữu; thanh tìm kiếm có icon trong ô, nút gửi, lọc Loại và Xóa lọc. Tìm theo thông điệp đúng contract backend; bộ lọc dùng các loại enum info/warn/error/debug của SystemLog. Giữ nội dung log gốc, không dịch/suy diễn thông điệp nghiệp vụ.
- Bỏ hai effect tải trùng và loading bị bỏ qua, dùng useAdminResource. page/q/level nằm trên URL, gửi khi Enter/bấm Tìm kiếm, query/level mới về trang 1. Response gắn ngữ cảnh trang/bộ lọc/tài khoản; response cũ không thay kết quả mới. Có loading/rỗng/không kết quả/lỗi và Thử lại; không dựng dữ liệu truy vấn cũ dưới truy vấn mới.
- Tách adminLogFormatting chuẩn hóa dữ liệu ngoài API: ngày hợp lệ theo Asia/Ho_Chi_Minh, dữ liệu ngày/loại/thông điệp/người dùng thiếu có lời thay thế; loại lạ ghi Khác thay vì giả Thông tin. userId null không đủ xác nhận do hệ thống tạo nên ghi không có thông tin người dùng. Nội dung dài xuống dòng, HTML được React hiển thị như văn bản.
- Nút Xuất trước đây chỉ toast đang phát triển. Thay bằng Xuất trang JSON, chỉ cho super admin/exportData khi có quyền viewLogs; tải đúng trang đang xem (tối đa 50 bản ghi), ghi rõ phạm vi. Chỉ bốn trường hiển thị timestamp/level/message/user; bỏ metadata ẩn và không tải tất cả log hoặc gọi exportData toàn hệ thống. Blob URL và link được dọn sau dùng. Không gửi mutation.
- Backend adminSystemController chỉ sửa escapeRegex dùng tìm log: regex cũ không escape a.b/[x]/a+b. Giữ API/quyền/query còn lại, không thay phần settings. CSS riêng AdminLogs sửa nút phân trang tối; override có !important cục bộ vì CSS pagination legacy đã ép màu với !important.
- Phạm vi: admin frontend AdminLogs/CSS/adminLogFormatting và backend adminSystemController, script test và inventory admin. Không sửa trang user hoặc shared hook/service/CSS.

### Bằng chứng và giới hạn

- Build PASS với cảnh báo chunk/import động/zod cũ; lint AdminLogs/adminLogFormatting 0 lỗi/cảnh báo. Typecheck toàn dự án còn lỗi legacy, không diagnostic trong hai module này ở logs-types.txt. node --check adminSystemController PASS. Detector Impeccable [] trước chỉnh màu phân trang cuối.
- test-admin-logs.cjs PASS (Edge headless 1440×1000, API fixture cục bộ): regex literal, đúng 1 GET đầu, dữ liệu thiếu/ngày sai/loại lạ/thông điệp dài/HTML như text; tải và đọc JSON thật, giữ thông điệp/bỏ metadata; phân trang/F5/Back/Forward, tìm kiếm/lọc loại reset trang, lỗi/thử lại không giả rỗng, response cũ chậm không ghi đè kết quả mới, rỗng và tài khoản chỉ xem không có nút xuất. Không pageerror. Đã xem sáng/tối, xác minh dark lần cuối sau sửa màu nút.
- Chưa kiểm MongoDB/query literal trên DB thật, quyền/CSRF/session backend thật, mọi dữ liệu nhạy cảm trong message log thật, tải tệp trên các browser khác, offline/timeout đầy đủ, clamp trang khi dữ liệu thật giảm và responsive/touch/thiết bị thật. JSON chỉ xuất trang hiện tại, không phải tính năng xuất toàn bộ/audit archive. Không đo hoặc tuyên bố tối ưu production.

### Checklist người dùng

- [ ] LOG-01 — Mở/F5 Nhật ký: thời gian Việt Nam, loại, thông điệp, người dùng đúng dữ liệu; thiếu thông tin có nhãn phù hợp.
- [ ] LOG-02 — Tìm bằng Enter/nút, thử tiếng Việt/dấu chấm/ngoặc/dấu cộng; lọc loại và Xóa lọc đúng; URL giữ bộ lọc.
- [ ] LOG-03 — Trước/Sau/F5/Back/Forward giữ trang và bộ lọc; đổi truy vấn về trang 1, không hiện kết quả cũ.
- [ ] LOG-04 — Loading/rỗng/không kết quả/lỗi phân biệt rõ; Làm mới/Thử lại hoạt động sau mất mạng.
- [ ] LOG-05 — Xuất trang JSON chứa đúng trang hiện tại và bốn trường hiển thị; không có metadata ẩn; đang tải/lỗi/rỗng không xuất. Tài khoản thiếu exportData không có nút.
- [ ] LOG-06 — Sáng/tối và Tab/Enter: tìm kiếm/lọc/nút phân trang rõ; thông điệp dài hoặc HTML dạng chữ không phá bảng.
- [ ] LOG-R01 — Responsive/touch/thiết bị thật để vòng cuối, chưa nghiệm thu.

## 29. Chuyển ngôn ngữ khu vực admin — 16–17/10/2026

Người dùng yêu cầu thêm đổi ngôn ngữ và áp dụng admin trước. Ngày 17/10 xác nhận cho phép sửa UploadTrigger/UploadModal dùng chung trong phạm vi nối ngôn ngữ riêng từ admin, giữ ngôn ngữ/hành vi public. Chưa tự nghiệm thu checklist hoặc thay dấu các trang đã có.

### Phạm vi và cách sử dụng

- Có bộ chọn Tiếng Việt/English trên thanh admin. Lựa chọn lưu riêng ở photocloud_admin_locale, không ghi app_locale của public; F5 và mở lại vẫn giữ. Chuyển ngay qua external store, không reload/remount trang hoặc gửi API chỉ vì đổi ngôn ngữ. Container admin và dialog được gắn lang tương ứng. Bộ chọn cũng có trong AdminModal và form gói chụp/tải ảnh để đổi khi đang giữ bản nháp.
- adminLocale/adminMessages sở hữu bản dịch dành riêng admin: 741 câu nguồn trong catalog cùng các khóa i18n cũ được tái sử dụng qua adminT, không thay locale toàn cục. Các component subscribe để cập nhật kể cả component memo. Menu/breadcrumb, bảng, nhãn/placeholder/ARIA, hộp thoại, trạng thái, thông báo do frontend tạo, lịch chụp và bảng màu được nối bộ dịch. Ngày/số hiển thị theo vi-VN hoặc en-GB, giữ VND và các múi giờ đã quy định; enum/ID/payload nghiệp vụ giữ nguyên.
- Sửa chữ dính nhau do khoảng trắng khi nối tên nút/dữ liệu; xác minh lại tên truy cập Sửa/Chọn/Xóa ảnh bằng bài hồi quy cũ. Nhãn metadata bảng màu được dịch ở nơi hiển thị, giữ giá trị select/khóa lựa chọn ổn định khi đổi ngôn ngữ.
- Tên người dùng, tên/mô tả gói/bộ sưu tập, nội dung khách nhập không tự dịch. Nhật ký có mã sự kiện đã biết (settings, announcement, permission, favorite, approve/reject) có mô tả theo ngôn ngữ và phần Thông điệp gốc mở xem; log lạ vẫn giữ nội dung gốc. Trường hợp cũ có thông điệp chính xác System settings updated được nhận diện riêng. Không dịch đoán hoặc ghi lại DB/log, JSON export vẫn giữ message gốc. Thông báo lỗi nghiệp vụ tùy ý từ backend có thể còn nguyên ngôn ngữ nguồn.

### Phân loại file

- **Admin:** adminLocale.ts, i18n/adminMessages.json, AdminLanguageSelect và các trang/component/hook dưới pages/admin, các component trong components/admin. Tái sử dụng các dictionary vi/en hiện hữu ở chế độ đọc; không sửa shared i18n index, useSiteSettings hoặc inventory user.
- **Chung, đã được người dùng cho phép:** UploadTrigger nhận translate/language/languageControl tùy chọn; UploadModal bọc UploadLocaleProvider; UploadForm/Preview/Progress và hai hook upload dùng context translator. UploadTranslationContext không import admin; khi không truyền tùy chọn vẫn dùng translator/public fallback cũ. Admin truyền adminUploadT và lựa chọn riêng. Thêm nhãn trạng thái/validation/partial-result theo locale admin, tên PhotoCloud trong tiêu đề upload admin. Bỏ ref tiến độ luôn bằng 0 và trả giá trị 0 trực tiếp, giữ cách tiến độ đang dựa vào uploadingIndex; không thay pipeline upload/finalize/storage.
- Script kiểm: check-admin-language.cjs, test-admin-language.cjs, test-admin-upload-language.cjs. Script chuyển đổi tạm đã xóa sau khi hoàn tất, catalog là nguồn duy trì. Không sửa code backend trong lượt i18n này; thay đổi regex adminSystemController thuộc mục 28 trước đó.

### Bằng chứng

- Build PASS; lint phạm vi admin + upload chung: 0 lỗi, 25 cảnh báo còn lại (effect/dependency/ref legacy, optional chaining và any ở hook cũ); không có cảnh báo thiếu dependency t mới. Typecheck toàn repo vẫn lỗi ngoài phạm vi, không diagnostic ở module admin hoặc upload được sửa trong log admin-i18n-types.txt. check-admin-language PASS: 885 lời gọi literal, 741 entry, không thiếu bản dịch hoặc lệch placeholder.
- test-admin-language PASS bằng Edge headless 1440×1000 + API fixture: cả 10 route có heading tiếng Anh, menu/breadcrumb đổi, lưu ngôn ngữ/F5, app_locale public vẫn vi, đổi ngôn ngữ tại log không phát sinh request; cài đặt/gói chụp/phân quyền giữ bản nháp hoặc vai trò đã chọn. Không mutation nghiệp vụ do đổi ngôn ngữ (analytics theo điều hướng hiện hữu được phân biệt).
- test-admin-upload-language PASS: admin English ↔ Việt giữ cùng ảnh đã chọn và tiêu đề; chỉ một POST pre-upload fixture, không finalize; mở hộp upload từ public vẫn tiếng Việt với app_locale=vi dù admin en. Không gửi lên R2/storage thật. Có ảnh admin-language-upload-en-dark, đã xem; ảnh 1px trắng là fixture kiểm luồng, không phải ảnh production.
- Hồi quy PASS trong đợt i18n: test-admin-library, test-admin-actions, test-admin-roles, test-admin-logs, test-admin-collections, test-package-visibility, test-site-palette. Đã xem ảnh English danh sách log/form gói (sáng) và upload (tối). Detector admin báo 3 cảnh báo viền màu dày ở AdminToolsSettingsFeedback.css có sẵn; không đổi thiết kế cài đặt đã nghiệm thu chỉ để xóa cảnh báo.
- Giới hạn: chưa kiểm mọi câu trong mọi trạng thái dữ liệu thật, chưa audit toàn bộ thông điệp/backend legacy, chưa kiểm end-to-end upload/finalize/storage thật, lỗi lưu storage ngôn ngữ/quyền riêng tư trình duyệt hoặc đồng bộ tab bằng browser đầy đủ, chưa thử mọi trình duyệt/screen reader. Responsive/touch/thiết bị thật tiếp tục vòng riêng. Các ca fixture không thay đối soát quyền/DB/production; không tuyên bố tối ưu hiệu năng.

### Checklist người dùng

- [ ] LNG-01 — Chọn Tiếng Việt/English trên thanh admin: menu, breadcrumb, nội dung và tên nút đổi tương ứng; F5 vẫn giữ lựa chọn.
- [ ] LNG-02 — Đi qua 10 trang admin; mở form/hộp thoại, xem thông báo tải/rỗng/lỗi và thử lại bằng cả hai ngôn ngữ.
- [ ] LNG-03 — Đang sửa cài đặt/gói/quyền, đổi ngôn ngữ: dữ liệu đang nhập và lựa chọn không mất; không tự lưu hoặc gửi thao tác.
- [ ] LNG-04 — Tải ảnh từ admin: chọn ảnh test, nhập tiêu đề, đổi ngôn ngữ trong hộp; ảnh/nội dung vẫn giữ, không tự upload lặp/finalize.
- [ ] LNG-05 — Public giữ lựa chọn ngôn ngữ riêng, kể cả hộp tải ảnh mở từ public. Tên/nội dung khách nhập giữ nguyên.
- [ ] LNG-06 — Nhật ký có mô tả sự kiện theo ngôn ngữ; mở Thông điệp gốc vẫn thấy đúng log nguồn. Tìm kiếm vẫn theo message gốc và JSON giữ nguồn.
- [ ] LNG-07 — Sáng/tối, bàn phím và nội dung dài tiếng Anh: bộ chọn ngôn ngữ, tên trường/nút và focus dùng được; các chức năng đã nghiệm thu không hồi quy.
- [ ] LNG-R01 — Responsive/touch/thiết bị thật chưa nghiệm thu, để vòng cuối.
