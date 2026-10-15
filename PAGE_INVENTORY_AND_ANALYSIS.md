# PhotoCloud — Danh sách trang và phân tích hệ thống

## 🔴 LỖI QUAN TRỌNG ĐANG MỞ — XEM TRƯỚC KHI NGHIỆM THU

<span style="color: #d32f2f;">**[o] IMG-01 — Bấm ảnh mở modal chậm.** Đã chỉnh luồng mở ảnh, ưu tiên ảnh chính và tách module; fixture đo click → có DOM modal khoảng35–47ms, không chờ API chi tiết bị làm chậm1,2giây. Chưa đo hiệu năng production; **NGƯỜI DÙNG KIỂM LẠI VẪN CHƯA ĐẠT** ở PHO-01, mục15, không tự đóng lỗi.</span>

<span style="color: #d32f2f;">**[o] PHO-21 / PHO-22 — Lỗi mở link ảnh và tải file ảnh lớn chưa đạt.** Người dùng đã đánh o; cần sửa và kiểm lại. **PHO-10:** Lưu đúng chức năng nhưng phản hồi còn chậm.</span>

<span style="color: #d32f2f;">**[o] EXP-F05 — Khám phá: sắp xếp chưa đạt.** Người dùng đã đánh o trong checklist. Cần đối chiếu từng lựa chọn với thứ tự ảnh thực tế và API; chưa tự suy ra nguyên nhân hoặc đánh dấu đã sửa.</span>

**Đã đóng theo xác nhận người dùng:** SEA-11, SEA-12, SEA-17 và IMG-02 (PHO-03 đã đạt). Toàn bộ mục14 về chức năng tìm kiếm đã đạt; không còn là lỗi mở. Responsive vẫn chưa nghiệm thu.

**Quy ước chung:** `x` = ĐẠT · `o` = CHƯA ĐẠT · để trống = CHƯA KIỂM. Chấp nhận chữ hoa/thường và khoảng trắng khi đọc kết quả. Màu đỏ dùng HTML trong trình xem hỗ trợ; biểu tượng 🔴 vẫn chỉ rõ mức ưu tiên ở trình xem không hỗ trợ màu.

**Thứ tự hiện tại:** Trang chủ để sau → Khám phá còn EXP-F05 → ~~Kết quả tìm kiếm (#3) — chức năng đạt~~ → **Chi tiết ảnh (#4), còn PHO-01/21/22 chưa đạt ở mục15**. **Responsive test sau cùng, khi xong chức năng tất cả các trang.**

Ngày đối chiếu: 15/10/2026. Cơ sở: route và mã nguồn hiện tại, không phải kết quả nghiệm thu production.

## 1. Có bao nhiêu trang?

**39 mục trang: 29 phía người dùng và 10 admin.** Đây là cách nhóm để quản lý phạm vi sản phẩm, không phải số URL hay số component độc lập tuyệt đối.

- Gộp trang chủ/danh mục, gói danh sách/chi tiết, hai hành động nhận tin và các URL cài đặt thành từng mục.
- Tách sửa hồ sơ khỏi cài đặt vì có route riêng, dù cài đặt tái sử dụng chính form sửa hồ sơ.
- Tách bốn trang công cụ admin dù cùng đi qua `AdminToolsPage`, vì chức năng khác nhau.
- Tính callback Google và 404 để không bỏ sót luồng kỹ thuật; không tính route chỉ chuyển hướng hoặc wrapper layout.
- Modal, tab và từng giá trị ID/slug không tăng số trang. Chúng vẫn là các bề mặt phải test riêng.

Vì vậy không nên dùng số 39 làm ước lượng công sức: chi tiết lịch có nhiều nhánh hơn nhiều trang nội dung cộng lại.

## 2. Danh sách 29 trang phía người dùng

Quyền “công khai” chỉ nói về mở trang; các thao tác cá nhân bên trong vẫn có thể yêu cầu đăng nhập. “Cần xác minh guard” nghĩa route không nằm trong `ProtectedRoute` tại `App.tsx`, không khẳng định API bị hở.

| # | Trang | URL chính | Chức năng và trọng tâm phân tích |
|---|---|---|---|
| 1 | Trang chủ / danh mục | `/`, `/t/:categorySlug` | Khám phá ảnh theo nhóm, vào chi tiết, tìm kiếm và đặt lịch. Cần giữ vị trí cuộn khi quay lại, tải ảnh ổn định, danh mục khớp dữ liệu admin. |
| 2 | Khám phá | `/explore` | Cửa vào nội dung theo các nhóm hiển thị. Cần phân biệt vai trò với trang chủ, tránh hai trang đưa cùng nội dung mà không có mục đích rõ. |
| 3 | ~~Kết quả tìm kiếm~~ — chức năng đã xác nhận | `/s/photos/:query` | Truy vấn → danh sách → chi tiết. URL và kết quả phải đồng bộ; xử lý dấu tiếng Việt, truy vấn rỗng/dài và phản hồi đến sai thứ tự. |
| 4 | Chi tiết ảnh | `/photos/:slug` | Xem ảnh, thông tin và các tương tác được cung cấp. Một nội dung có chế độ toàn trang và modal; Back/F5, tải ảnh, quyền tương tác là phần phức tạp nhất. |
| 5 | Danh sách bộ sưu tập | `/collections` | Khám phá bộ sưu tập công khai và vào chi tiết. Cần xác minh tìm/lọc/phân trang theo UI thực tế, không để nội dung riêng lọt vào danh sách. |
| 6 | Chi tiết bộ sưu tập | `/collections/:collectionId` | Xem ảnh và tương tác theo quyền. Trọng tâm: quyền chủ sở hữu, nội dung riêng, ảnh đã xóa và đồng bộ thay đổi. |
| 7 | Giới thiệu | `/about` | Trình bày studio và dẫn tới hành động liên hệ/đặt lịch. Chủ yếu kiểm nội dung, ảnh, liên kết và responsive. |
| 8 | Liên hệ | `/contact` | Thông tin liên hệ và form mở ứng dụng email bằng `mailto:`. Đây không phải form gửi mail từ server; cần phản ánh đúng kỳ vọng và thử thiết bị không có ứng dụng email. |
| 9 | Gói chụp | `/packages`, `/packages/:slug` | Danh sách và chi tiết dịch vụ, CTA mở đặt lịch. Hiện đọc `CORE_PACKAGES`, cần đối soát với dữ liệu gói trong API/admin. |
| 10 | Danh sách bài viết | `/blog` | Dẫn vào bài viết. Kiểm nội dung thật, điều hướng và các bộ lọc đang có; không suy từ tên trang rằng có CMS admin. |
| 11 | Chi tiết bài viết | `/blog/:slug` | Đọc bài, ảnh, liên kết và nội dung liên quan. Kiểm slug sai, nội dung dài, metadata và nguồn dữ liệu bài viết. |
| 12 | Đăng nhập | `/signin` | Xác thực và đi tới đích sau đăng nhập. Kiểm phiên cũ, sai thông tin, gửi trùng và trạng thái khởi tạo. |
| 13 | Đăng ký | `/signup` | Tạo tài khoản và kiểm dữ liệu. Kiểm email trùng, mật khẩu, gửi trùng và đường đi tiếp sau thành công. |
| 14 | Callback Google | `/auth/google/callback` | Hoàn thành xác thực bên ngoài. Không phải màn hình nội dung; vẫn phải test lỗi/hủy và callback domain host. |
| 15 | Quên mật khẩu | `/forgot-password` | Yêu cầu link khôi phục. Phụ thuộc SMTP, giới hạn gửi và thông báo không lộ tài khoản. |
| 16 | Đặt lại mật khẩu | `/reset-password` | Nhận token và đổi mật khẩu. Token hết hạn/đã dùng, phiên cũ và đăng nhập lại là trọng tâm. |
| 17 | Hồ sơ | `/profile/user/:userId`, `/@username` | Ảnh, bộ sưu tập, theo dõi và tab riêng theo chủ hồ sơ. `/profile` là route chuyển hướng. Có thêm các suffix following/followers/collections/stats. |
| 18 | Chỉnh sửa hồ sơ | `/profile/edit` | Thông tin cá nhân và các form liên quan. Được bảo vệ route; cần đồng bộ avatar/username ở mọi vị trí sau lưu. |
| 19 | Cài đặt tài khoản | `/settings`, `/settings/profile`, `/settings/notifications` | Chứa tab Hồ sơ và Thông báo; tái sử dụng `EditProfilePage`. Hiện chọn tab bằng state nội bộ, chưa đọc pathname. |
| 20 | Không gian cá nhân | `/me` | Tổng quan tài khoản, số liệu và điểm vào thao tác cá nhân. Cần làm rõ với hồ sơ công khai, không hiển thị dữ liệu người khác. |
| 21 | Ảnh yêu thích | `/favorites`, `/favorites/photos` | Danh sách cá nhân và bỏ yêu thích. Cần xác minh guard trong trang/component và quyền API vì route không bọc `ProtectedRoute`. |
| 22 | Bộ sưu tập yêu thích | `/favorites/collections`, `/favorite-collections` | Cùng loại nội dung qua hai URL. Kiểm tính nhất quán, dữ liệu riêng và bộ sưu tập không còn công khai. |
| 23 | Lịch sử tải xuống | `/downloads` | Theo dõi tải ảnh của tài khoản. Cần xác minh guard trong component, quyền API, file và link hết hiệu lực. |
| 24 | Thông báo | `/notifications` | Danh sách, đọc thông báo và điều hướng. Kiểm số chưa đọc, kết nối lại và guard/quyền dữ liệu cá nhân. |
| 25 | Đặt lịch | `/booking` | Nhận gói, ngày, địa điểm, liên hệ và gửi yêu cầu. Có trang và modal; phải cùng nguồn gói, validation và quy tắc server. Route trang được bảo vệ. |
| 26 | Lịch của tôi | `/profile/bookings` | Tra cứu yêu cầu cá nhân và vào chi tiết. Cần xác minh guard nội bộ, quyền sở hữu, trạng thái rỗng và cập nhật sau admin xử lý. |
| 27 | Chi tiết lịch | `/booking/:bookingId` | Thông tin, lịch sử, hủy/đổi lịch và đánh giá khi đủ điều kiện. Được bảo vệ route; cần kiểm quyền sở hữu từng ID và các mốc giờ. |
| 28 | Xác nhận / hủy nhận tin | `/newsletter/confirm`, `/newsletter/unsubscribe` | Một component cho hai hành động, token lấy từ URL fragment. Cần bấm nút mới thực hiện; kiểm token thiếu/sai/hết hạn và email thật. |
| 29 | Không tồn tại | `/404` | Trang lỗi riêng. Catch-all hiện chỉ nhận mẫu hồ sơ, các URL khác chuyển về `/`, nên chưa phải mọi URL sai đều vào 404. |

## 3. Danh sách 10 trang admin

Nguồn quyền menu hiện hành: `frontend/src/pages/admin/adminNavigation.ts`. `AdminRoute` kiểm quyền vào khu vực, `AdminAccess` kiểm mục cụ thể. Backend vẫn phải tự kiểm quyền; guard frontend không thay thế được điều đó.

| # | Trang | URL | Quyền frontend theo menu hiện tại | Trọng tâm |
|---|---|---|---|---|
| 30 | Tổng quan | `/admin` | `viewDashboard` hoặc super admin | Dữ liệu thống kê, khoảng thời gian, ý nghĩa số liệu, loading/error. |
| 31 | Thư viện ảnh | `/admin/images` | `viewImages` hoặc super admin | Upload, danh sách, tìm kiếm, sửa/xóa và chọn hàng loạt; quyền ghi phải kiểm riêng ở API. |
| 32 | Danh mục | `/admin/categories` | `viewCategories` hoặc super admin | Quản lý tên/mô tả/hiển thị; liên kết ảnh và cache danh mục công khai. |
| 33 | Bộ sưu tập | `/admin/collections` | `viewCollections` hoặc super admin | Nội dung, chủ sở hữu, quyền công khai và các thao tác quản trị thực có. |
| 34 | Duyệt nội dung | `/admin/moderation` | `moderateContent` hoặc super admin | Quyết định duyệt/từ chối, lý do, hành động hàng loạt và đồng bộ thư viện. |
| 35 | Lịch chụp & dịch vụ | `/admin/bookings` | `isAdmin()` theo nhánh `adminOnly` | Sáu tab vận hành studio; cần kiểm cách `isAdmin()` xử lý super admin trong hook và quyền API từng hành động. |
| 36 | Người dùng | `/admin/users` | `viewUsers` hoặc super admin | Tra cứu/quản lý tài khoản theo UI, giới hạn thao tác quản trị nhạy cảm. |
| 37 | Phân quyền | `/admin/roles` | Super admin | Cấp/sửa/thu hồi quyền, tác động lên menu và endpoint; không cho tự nâng quyền trái phép. |
| 38 | Nhật ký | `/admin/logs` | `viewLogs` hoặc super admin | Tìm/lọc, ngày giờ, truy vết thay đổi; không để log lộ bí mật. |
| 39 | Cài đặt website | `/admin/settings` | `manageSettings` hoặc super admin | Thông tin website, tải ảnh, bảo trì và các trường đang hiện; không mặc định có mọi cấu hình studio/email trong trang này. |

Không đưa các component admin cũ vào thành trang mới nếu không có route/menu hiện hành. Ví dụ tên file `AdminFavorites` hoặc `AdminWebSocketMetrics` không tự chứng minh sản phẩm có một trang độc lập tương ứng.

## 4. Phân tích luồng sản phẩm

### 4.1. Khám phá và tương tác ảnh

Trang chủ / Khám phá / Tìm kiếm → Chi tiết ảnh → tác giả hoặc bộ sưu tập → yêu thích / tải xuống / theo dõi theo thao tác được cung cấp.

Điểm quan trọng không nằm ở số trang mà ở việc quay lại đúng ngữ cảnh. Một ảnh có thể được mở từ nhiều nguồn; modal desktop, trang mobile và mở link trực tiếp phải thống nhất dữ liệu, trạng thái yêu thích và lịch sử trình duyệt. Test một trang ảnh đơn lẻ chưa đủ chứng minh toàn luồng ổn định.

### 4.2. Chuyển đổi thành khách đặt lịch

Giới thiệu / Gói chụp / CTA toàn site → trang hoặc modal đặt lịch → đăng nhập khi cần → gửi yêu cầu → lịch cá nhân → admin xác nhận → khách xem ngày/giờ đã chốt.

Giá và quyền lợi ở nơi giới thiệu phải khớp lúc chọn gói. Nếu có snapshot gói tại thời điểm đặt, lịch cũ cần giữ snapshot thay vì đổi theo giá mới. Cần phân biệt rõ yêu cầu của khách, lịch đã xác nhận và đề nghị đổi đang chờ; hiển thị một ngày duy nhất không có nhãn dễ gây hiểu lầm.

### 4.3. Vận hành studio

Lịch rảnh + gói + chính sách là cấu hình đầu vào; Yêu cầu là nơi ra quyết định; Lịch là kết quả theo thời gian; Đánh giá là phản hồi sau dịch vụ.

Các tab này nên tiếp tục ở chung một trang admin vì cùng phục vụ một nghiệp vụ. Tách thành sáu trang chỉ để giảm số tab không giải quyết vấn đề về dữ liệu hoặc quy tắc. Thứ cần chốt trước host là tác động thật của cấu hình lên API khách và tính nhất quán sau thao tác.

### 4.4. Quản trị nội dung và tài khoản

Upload → phân loại → duyệt → hiển thị công khai; người dùng → vai trò/quyền → khả năng thao tác; nhật ký hỗ trợ truy vết. Xóa hoặc ẩn phải được hiểu theo từng đối tượng: ẩn gói, xóa liên kết ảnh và xóa file ảnh không phải cùng hành động.

## 5. Những điểm đã thấy trực tiếp trong mã nguồn

Các mục dưới là phân tích tĩnh tại thời điểm lập file. Chưa tự sửa và chưa coi là lỗi runtime đã tái hiện, trừ hành vi được chỉ ra rõ bởi nhánh mã.

### A. Nguồn gói công khai và nguồn gói đặt lịch khác nhau — ưu tiên cao

- Bằng chứng: `pages/PackagesPage.tsx` lấy danh sách/chi tiết từ `constants/packages.ts` (`CORE_PACKAGES`). `pages/BookingPage.tsx` và `components/BookingModal.tsx` lấy gói qua `bookingService.getPackages()`. Modal còn ánh xạ ID marketing sang slug API.
- Hệ quả: cập nhật giá/quyền lợi/ẩn gói ở admin không tự chứng minh trang marketing đã đổi theo. Có khả năng khách thấy giá cũ hoặc CTA chọn gói không còn tồn tại.
- Việc cần làm: so từng slug và trường thực tế; thống nhất nguồn dữ liệu hoặc quy định rõ nguồn marketing và cách đồng bộ. Tiêu chí đạt: sửa/ẩn gói test rồi kiểm cả danh sách, chi tiết, modal, trang booking và request tạo lịch.

### B. Deep link cài đặt chưa chọn đúng tab — lỗi logic thấy từ mã

- Bằng chứng: `pages/profile/SettingsPage.tsx` khởi tạo `useState<Tab>('profile')`, không đọc location; cả `/settings/profile` và `/settings/notifications` đều render component này trong `App.tsx`.
- Hệ quả: mở trực tiếp URL thông báo vẫn khởi tạo tab hồ sơ; chọn tab không cập nhật URL. Đây là phần chưa khớp giữa route và giao diện.
- Hướng xử lý: dùng pathname làm nguồn tab hoặc đồng bộ điều hướng khi chọn tab. Tiêu chí đạt: F5, Back/Forward và mở link mới đều giữ đúng tab.

### C. Trang 404 có route nhưng URL sai thường về trang chủ — hành vi thấy từ mã

- Bằng chứng: `pages/profile/ProfileRouteHandler.tsx` chỉ chấp nhận mẫu `/@username` và các suffix được khai báo; không khớp thì `<Navigate to="/" replace />`.
- Hệ quả: link hỏng bị che bằng trang chủ; khó biết tài nguyên không tồn tại. Đây là hành vi hiện tại, không khẳng định server trả HTTP 404.
- Hướng xử lý: phân biệt URL hồ sơ hợp lệ và URL không tồn tại; thống nhất UX 404 và cấu hình host. Tiêu chí đạt: URL bất kỳ không tồn tại có màn hình rõ, không vòng redirect, tài nguyên/API không bị rewrite sai.

### D. Một số trang cá nhân không bọc guard tại route — cần kiểm tra tiếp

- Bằng chứng: `/favorites*`, `/downloads`, `/notifications`, `/profile/bookings` nằm ngoài nhóm `ProtectedRoute` trong `App.tsx`.
- Chưa kết luận: chưa có bằng chứng rằng dữ liệu riêng bị lộ; trang con/hook/backend có thể đã chặn.
- Việc cần làm: đối chiếu guard của component và quyền server; thử khách, user A/B, phiên hết hạn và thay ID. Chọn một quy ước nhất quán cho trang bắt buộc đăng nhập, giữ công khai những trang được chủ ý cho khách xem.

### E. Liên hệ dùng ứng dụng email, không gửi qua server — đặc tính sản phẩm

- Bằng chứng: `pages/ContactPage.tsx` dựng `mailto:` và gán `window.location.href`; toast mô tả mở ứng dụng email.
- Hệ quả: không thể lấy việc bấm nút làm bằng chứng email đã gửi hoặc studio đã nhận yêu cầu. Cần xác định đây có đúng trải nghiệm mong muốn khi phát hành hay không.
- Nếu giữ hiện trạng: test email client trên mobile/desktop và có email/điện thoại dễ sao chép. Chỉ xây form gửi server nếu thực sự cần nhận và theo dõi yêu cầu tập trung.

### F. Cùng chức năng xuất hiện ở nhiều điểm vào — cần nhất quán

- Sửa hồ sơ có route riêng và được nhúng trong Cài đặt; lịch cá nhân có trang và tab hồ sơ; ảnh có modal/toàn trang; đặt lịch có modal/trang.
- Đây không tự động là dư thừa cần xóa. Rủi ro là khác validation, state hoặc quyền giữa các điểm vào.
- Việc cần làm: lập cùng một bộ ca cho dữ liệu đầu vào và chạy ở mọi điểm vào, ưu tiên phần xử lý dùng chung thay vì viết hai quy tắc độc lập.

## 6. Độ phức tạp và thứ tự kiểm tra

| Nhóm | Độ phức tạp tương đối | Vì sao | Thứ tự |
|---|---|---|---|
| Xác thực, phiên và phân quyền | Cao | Đi qua hầu hết thao tác, phụ thuộc cookie/domain/backend | 1 |
| Đặt lịch khách ↔ admin | Rất cao | Trạng thái, deadline, lịch, cấu hình, snapshot, quyền sở hữu | 2 |
| Ảnh/upload/duyệt/xóa | Cao | File thật, lưu trữ, nhiều điểm hiển thị và hành động hàng loạt | 3 |
| Hồ sơ/bộ sưu tập/yêu thích | Vừa–cao | Dữ liệu cá nhân, liên kết nội dung và cập nhật chéo | 4 |
| Thông báo/email | Cao về tích hợp | Có thể PASS fixture nhưng hỏng SMTP/domain/realtime | 5 |
| Trang nội dung/marketing | Vừa | Nội dung, SEO, nguồn gói và CTA | 6 |
| Nhật ký/thống kê/cấu hình | Vừa–cao | Độ đúng dữ liệu, quyền và tác động toàn site | Kiểm song song theo luồng liên quan |

Không đánh giá nhóm theo số lượng nút. Một nút hủy lịch có thể thay đổi tiền cọc và lịch sử, trong khi nhiều liên kết nội dung chỉ điều hướng.

## 7. Responsive cần phân tích theo loại bề mặt

| Bề mặt | Trang tiêu biểu | Điều phải chứng minh |
|---|---|---|
| Lưới nội dung | Trang chủ, khám phá, bộ sưu tập | Ảnh không nhảy bố cục, không mất vị trí, không tải quá nhiều, tên dài không tràn. |
| Ảnh lớn/đọc bài | Chi tiết ảnh, blog | Tỷ lệ ảnh, chữ, điều hướng, modal/toàn trang và Back đúng trên mobile. |
| Form dài | Booking, hồ sơ, modal gói | Cuộn đến trường cuối, bàn phím không che nút, label và lỗi liên kết rõ, giữ draft. |
| Danh sách quản trị | Thư viện, người dùng, yêu cầu | Giữ thông tin ưu tiên trên mobile, không biến thành bảng quá rộng không dùng được. |
| Lịch | Admin Lịch | Ngày/tuần/tháng có cách xem phù hợp, sự kiện không bị cắt, chọn ngày và empty rõ. |
| Cấu hình | Lịch rảnh, chính sách, cài đặt | Công tắc/giờ/số dễ bấm, nhãn nhiều dòng không lệch, dirty/save luôn hiểu được. |
| Điều hướng toàn app | Header/sidebar/tab/footer | Focus, overlay, vùng cuộn, safe area và mục active không lỗi khi đổi kích thước. |

Ma trận tối thiểu: 320/390/768/1280/1440px, màn hình thấp 568/720px, sáng/tối và zoom 200%. Giả lập viewport không thay thế hoàn toàn Safari iPhone hoặc bàn phím thiết bị thật.

## 8. Tình trạng và giới hạn kết luận

- Lịch chụp & dịch vụ: hoàn tất đợt chỉnh sửa UI/luồng theo yêu cầu; có kiểm thử fixture được ghi trong `PRODUCT.md`. Vẫn cần nghiệm thu tích hợp thật, đặc biệt tab Đánh giá và việc cấu hình được API khách thực thi.
- Các trang trong danh sách không được tự coi là đã PASS chỉ vì có route hoặc build được.
- Phân tích này tập trung cấu trúc trang, nguồn dữ liệu và điểm cần nghiệm thu; chưa phải audit bảo mật đầy đủ, đo hiệu năng hoặc rà soát từng endpoint backend.
- Chưa thực hiện deploy, cập nhật dữ liệu thật hoặc gửi email để lập tài liệu này.

## 9. Việc nên làm tiếp theo

1. Chốt và đối soát nguồn gói public/API; đây là điểm ảnh hưởng trực tiếp đến lời chào giá và đặt lịch.
2. Sửa deep link Cài đặt và thống nhất cách xử lý 404; đây là hai sai khác cụ thể thấy từ mã.
3. Kiểm guard và endpoint của các trang cá nhân, quyền xem/ghi admin; xác minh bằng A/B và phiên hết hạn.
4. Chạy checklist toàn luồng trên staging theo thứ tự ở mục 6; ghi lỗi và bằng chứng, không đánh PASS theo suy đoán.
5. Hoàn tất cấu hình host, SMTP/OAuth/lưu trữ, backup/rollback rồi smoke test sau triển khai.

Checklist tổng thể được giữ tại [FINAL_FUNCTIONAL_TEST_CHECKLIST.md](FINAL_FUNCTIONAL_TEST_CHECKLIST.md). Từ đợt sửa Khám phá, checklist nghiệm thu chi tiết của trang được ghi ngay trong file này theo yêu cầu người dùng (mục 11); đây là nơi quyết định đạt/chưa đạt của đợt sửa. Checklist tổng thể chỉ tham chiếu kết quả, không tự đánh dấu thay người dùng.

## 10. Nguồn mã đã đối chiếu

- `frontend/src/App.tsx`: route chính, guard, redirect, ảnh modal.
- `frontend/src/pages/admin/adminNavigation.ts`: menu admin và yêu cầu quyền.
- `frontend/src/pages/admin/AdminToolsPage.tsx`: bốn công cụ dùng chung wrapper.
- `frontend/src/components/auth/AdminRoute.tsx`, `ProtectedRoute.tsx`, `frontend/src/pages/admin/components/AdminAccess.tsx`: các lớp chặn frontend.
- `frontend/src/pages/profile/SettingsPage.tsx`, `ProfileRouteHandler.tsx`, `components/ProfileTabs.tsx`: tab và URL tài khoản/hồ sơ.
- `frontend/src/pages/PackagesPage.tsx`, `frontend/src/constants/packages.ts`, `frontend/src/pages/BookingPage.tsx`, `frontend/src/components/BookingModal.tsx`: nguồn gói và điểm vào booking.
- `frontend/src/pages/ContactPage.tsx`, `NewsletterPage.tsx`: liên hệ và hành động nhận tin.

Khi thêm/xóa route hoặc thay nguồn dữ liệu, cập nhật bản đồ này cùng checklist nghiệm thu.

## 11. Khám phá — checklist nghiệm thu chi tiết sau chỉnh sửa

**Trang:** `/explore` — mục số 2. **Người dùng đã kiểm: 19/20 ca đạt; EXP-F05 chưa đạt.** Có thêm hai lỗi dùng chung khi mở ảnh (xem đầu file), vì vậy chưa gạch ngang xác nhận xong.

### 11.1. Quy ước xác nhận

- Quy ước: `[x]` hoặc `x` = ĐẠT; `[o]` hoặc `o` = CHƯA ĐẠT; `[ ]` = CHƯA KIỂM. Không dùng ô trống thay cho ca đã kiểm nhưng thất bại. Không tự đổi `o` thành `x` sau khi sửa; chờ người dùng kiểm lại.
- Chưa gạch ngang trang Khám phá hoặc các lỗi bên dưới. Chỉ khi tất cả ca chức năng đạt và không còn lỗi mở mới đổi nhãn thành `~~Khám phá — chức năng~~ · ĐÃ XÁC NHẬN XONG`, kèm ngày và build được kiểm tra.
- Responsive làm SAU CÙNG, khi đã test chức năng hết tất cả các trang. Chức năng có thể được gạch ngang xác nhận riêng khi mọi ca đạt và lỗi liên quan đã đóng; không bắt chờ responsive mới chuyển sang trang kế tiếp. Responsive giữ trạng thái chưa kiểm ở mục 12 cho đến vòng cuối.
- Kết quả fixture do Codex chạy là bằng chứng kỹ thuật tham khảo, không tự tích các ô nghiệm thu của người dùng.

### 11.2. Các điểm đã sửa và cách kiểm tra lỗi

| ID | Điểm trước khi sửa | Thay đổi và kết quả mong đợi |
|---|---|---|
| EXP-01 | Phần giới thiệu cao, ảnh xuất hiện muộn; chữ “chọn” xuống dòng riêng | Thu gọn hero, tiêu đề “Khám phá những khung hình”, căn trái theo vùng nội dung; ảnh được ưu tiên hơn. |
| EXP-02 | Nội dung khẳng định “hàng nghìn ảnh”, “được tuyển chọn” chưa có căn cứ | Mô tả trung tính, không đưa số lượng hoặc cam kết tuyển chọn không có dữ liệu. |
| EXP-03 | Trang đọc `hasMore` không có trong image store và không truyền pagination vào grid | Dùng pagination thật từ store để lưới biết còn trang; tải trang 2, 3… nối tiếp thay vì gọi lại trang 1. |
| EXP-04 | Callback tải thêm bỏ danh mục/bố cục và ép thứ tự desc | Trang tiếp theo giữ đầy đủ params của truy vấn hiện tại: danh mục, bố cục, màu, ngày, nâng cao, sort và order. |
| EXP-05 | Không có số kết quả và thao tác xóa bộ lọc chung | Hiện tổng ảnh từ API, nhãn danh mục; nút Xóa bộ lọc đưa danh mục và mọi filter về mặc định. |
| EXP-06 | Tải danh mục lỗi bị bỏ qua; thiếu retry ảnh tại trang | Hiện lỗi danh mục kèm thử lại; lỗi ảnh có nút thử lại đúng trang lỗi, không tự retry liên tục. |
| EXP-07 | Filter trông như tab nhưng thiếu hành vi bàn phím đầy đủ; sort thiếu label liên kết | Danh mục là nhóm nút aria-pressed, bố cục có aria-pressed, sort có label; focus rõ. |
| EXP-08 | Nút Bộ lọc trong tìm kiếm khó phân biệt với bộ lọc nhanh bên ngoài | Đổi tên thành Bộ lọc nâng cao ở Khám phá; vẫn giữ các chức năng của panel dùng chung. Đây là panel đầy đủ, vẫn có thể điều chỉnh bố cục/sort giống hàng nhanh, không phải hai nguồn state độc lập. |

### 11.3. Kiểm tra chức năng — người dùng tích

- [x] EXP-F01 — Vào `/explore` trực tiếp và F5: tiêu đề/mô tả mới đúng, không câu “hàng nghìn”/“tuyển chọn”; header không che phần đầu.
- [x] EXP-F02 — Ban đầu hiển thị đúng danh mục và các lựa chọn được lưu; tổng kết quả bằng `pagination.total` API, không phải chỉ số ảnh của trang 1.
- [x] EXP-F03 — Chọn từng danh mục rồi Tất cả: trạng thái chọn đúng, request category đúng và ảnh thuộc đúng nhóm; nhãn tổng kết quả đổi theo.
- [x] EXP-F04 — Chọn Ngang/Dọc/Vuông/Tất cả: request orientation và kết quả đúng; nút được chọn đọc/nhìn rõ.
- [o] EXP-F05 — Đổi từng cách sắp xếp: request sortBy đúng, dữ liệu theo thứ tự server; không tự bỏ danh mục hoặc bố cục.
- [x] EXP-F06 — Mở Bộ lọc nâng cao, thay màu/khoảng ngày/thông số có trên panel, Áp dụng: giữ draft trước áp dụng, áp dụng xong kết quả và hàng lọc nhanh đồng bộ.
- [x] EXP-F07 — Có hơn 30 ảnh: cuộn cuối danh sách gọi page 2 rồi trang tiếp theo, không gọi lại page 1, không mất ảnh đầu hoặc thêm ảnh trùng ID.
- [x] EXP-F08 — Kết hợp danh mục + bố cục + sort + filter nâng cao rồi tải thêm: mọi request trang sau giữ đủ params và cùng limit, chỉ tăng page.
- [x] EXP-F09 — Hết trang: không có request tải tiếp vô hạn hoặc spinner đứng mãi; tổng ảnh giữ đúng.
- [x] EXP-F10 — Đổi filter nhanh khi request cũ chưa xong: kết quả cuối theo lựa chọn cuối, không bị response cũ ghi đè; không còn ảnh cũ dưới nhãn mới trong lúc đang tải trang đầu.
- [x] EXP-F11 — Bộ lọc không có kết quả: hiện “Chưa có ảnh phù hợp”, hướng dẫn và nút xóa filter; không nhầm lỗi mạng thành danh sách rỗng.
- [x] EXP-F12 — Xóa bộ lọc từ toolbar hoặc empty: danh mục Tất cả, bố cục Tất cả, sort Mới nhất, màu/ngày/nâng cao về mặc định; kết quả tải lại tương ứng.
- [x] EXP-F13 — Giả lập lỗi ảnh trang đầu: hiện thông báo và Thử lại tải ảnh; phục hồi mạng và thử lại thành công, không bị request lặp vô hạn.
- [x] EXP-F14 — Giả lập lỗi trang 2: ảnh đã tải không mất; retry đúng page 2 với đủ filter; thành công nối thêm và có thể tiếp tục tải trang sau.
- [x] EXP-F15 — Giả lập lỗi categories: thông báo có thử lại; khôi phục mạng tải được danh mục, không chặn việc xem ảnh không lọc.
- [x] EXP-F16 — Tìm kiếm từ ô tìm: Enter/gợi ý mở đúng `/s/photos/:query`, tiếng Việt được giữ đúng, filter không tự mất ngoài dự kiến; Back quay về Khám phá.
- [x] EXP-F17 — Desktop mở ảnh dạng modal: đóng/Esc/Back đúng ảnh và vị trí cuộn, danh mục và filter đang chọn không tự reset.
- [x] EXP-F18 — Link trực tiếp chi tiết ảnh và F5 không hiện modal với nền sai; quay lại Khám phá không hiển thị dữ liệu từ nguồn khác.
- [x] EXP-F19 — Tab/Shift+Tab/Enter/Space chọn được danh mục, bố cục, sort, xóa và retry; label/focus/aria-pressed phản ánh đúng trạng thái.
- [x] EXP-F20 — Sáng/tối trên desktop: chữ/ảnh/nút/focus rõ, không gradient chữ hoặc màu bị mất tương phản; không phát sinh lỗi console chưa xử lý.

### 11.4. Bằng chứng kỹ thuật và nhật ký lỗi

Script tham khảo: `frontend/scripts/test-explore-page.cjs`. Đã chạy PASS trên Edge desktop 1440×900, sáng/tối: request page 2 giữ category/orientation/sort, lỗi trang đầu và retry, empty, reset về truy vấn mặc định; không có pageerror. Vite build PASS, ESLint ba file UI sửa không có error. Fixture nội bộ dùng API giả lập, không sửa dữ liệu thật. Đây không thay thế kiểm tra dữ liệu thật trên staging, ca lỗi page 2 hoặc nghiệm thu responsive và các ca người dùng ở trên.

Kết quả người dùng mới nhất: **19 dấu x, 1 dấu o (EXP-F05)**. Chuẩn hóa khoảng trắng/chữ hoa trong dấu đánh giá, không thay đổi ý nghĩa. Giữ dấu x ở EXP-F17/F18 theo lần kiểm trước, IMG-01 còn mở; IMG-02 đã được kiểm lại đạt tại PHO-03.

| Ca | Đạt/chưa đạt | Mô tả lỗi, bước tái hiện | Bằng chứng/build | Ngày kiểm |
|---|---|---|---|---|
| EXP-F… | Chưa kiểm | — | — | — |

**Xác nhận chức năng:** Chưa hoàn tất: EXP-F05 = o; lỗi mở ảnh chậm và F5 nháy modal còn mở. Người kiểm: __________. Ngày/build: __________.

## 12. Responsive — nghiệm thu riêng

**LÀM SAU CÙNG, SAU KHI TEST CHỨC NĂNG TẤT CẢ CÁC TRANG.** Không chạy hoặc yêu cầu người dùng nghiệm thu responsive ở từng lượt trang hiện tại. Giữ riêng danh sách bên dưới để dùng ở vòng cuối.

### 12.1. Khám phá — CHƯA NGHIỆM THU RESPONSIVE

- [ ] EXP-R01 — 320×568 và 390×844: không tràn ngang toàn trang; hero không che ảnh; chữ dài không bị cắt.
- [ ] EXP-R02 — 768×1024: danh mục, hàng bố cục/sort và lưới chuyển bố cục hợp lý, không chồng nhau.
- [ ] EXP-R03 — 1280×720 và 1440×900: vùng nội dung căn thẳng, ảnh đầu xuất hiện sớm, khoảng trắng vừa phải.
- [ ] EXP-R04 — Mobile danh mục cuộn ngang tới được mục cuối; tab chọn không mất khỏi vùng có thể thao tác.
- [ ] EXP-R05 — Bộ lọc sticky không chiếm gần hết màn hình thấp; header, filter và grid không đè lên nhau khi cuộn.
- [ ] EXP-R06 — Tìm kiếm, gợi ý và panel filter nâng cao vừa viewport, cuộn đến hết, bàn phím không che nút cần thao tác; đóng xong cuộn trang bình thường.
- [ ] EXP-R07 — Ảnh mobile mở trang riêng, Back về đúng vị trí/filter; desktop vẫn dùng modal đúng viewport và trả focus.
- [ ] EXP-R08 — Zoom 200%, xoay màn hình và chữ dài: nút/tổng kết quả/lưới vẫn đọc và thao tác được.
- [ ] EXP-R09 — Sáng/tối trên Safari iPhone và Chrome Android thật: chữ, time/date picker nếu có, popup, safe area và vùng bấm đúng.
- [ ] EXP-R10 — Mạng chậm trên mobile: ảnh giữ chỗ đúng tỷ lệ, tải thêm không nhảy cuộn bất thường, không tải lặp vô hạn.

**Xác nhận responsive:** Chưa xác nhận. Người kiểm: __________. Thiết bị/build: __________.

## 13. Dọn mã cũ và kiểm tra khả năng bảo trì — 15/10/2026

### 13.1. Quy trình đi từng trang

- Thứ tự theo danh sách mục 2–3, bắt đầu **Khám phá (#2)**. **Trang chủ (#1) để làm sau**, không chỉnh hoặc nghiệm thu trong lượt này.
- Mỗi trang: đối chiếu chức năng và lỗi → kiểm dependency/file dài → tách file trên 1.000 dòng theo trách nhiệm → build/lint/kiểm thử phù hợp → người dùng nghiệm thu.
- **Responsive để sau cùng khi đã test chức năng toàn bộ trang**, không phải điều kiện bắt người dùng dừng ở từng trang. Checklist mới viết ngắn theo “thao tác → kết quả cần thấy”; thuật ngữ API chỉ để ở phần bằng chứng kỹ thuật.
- Không tách file máy móc thành các đoạn số dòng hoặc đổi hành vi chỉ để giảm độ dài; giữ API/import ổn định khi chia module.
- Ca chức năng do người dùng xác nhận ở mục 11; responsive riêng ở mục 12. Chưa chuyển trang Khám phá thành đã hoàn tất và không tự tích checklist.
- Trang tiếp theo sau Khám phá theo danh sách: **Kết quả tìm kiếm (#3)**. Chưa bắt đầu chỉnh trang này trong lượt hiện tại.

### 13.2. Đã dọn mã admin không còn dùng

Đã kiểm đồ thị import từ `frontend/src/main.tsx`, gồm import tĩnh, lazy import literal, re-export và CSS; đối chiếu thêm các tham chiếu trong source/scripts. Đã xóa **24 file** không còn được ứng dụng hiện hành dùng:

- Entry/layout cũ: `AdminPage.tsx`, `AdminPage.css`, `AdminAppRoutes.tsx`, `components/AdminSidebar.tsx`.
- Component cũ: `components/AdminForm.tsx`, `PermissionBadge.tsx`, `PermissionButton.tsx`, `PermissionMatrix.tsx`, `PermissionTooltip.tsx`.
- Tab cũ: `AdminAnalytics`, `AdminCategories`, `AdminDashboard`, `AdminFavorites`, `AdminImages`, `AdminModeration`, `AdminSettings`, `AdminTrafficAnalytics`, `AdminUsers`, `AdminWebSocketMetrics` trong `components/tabs/`, cùng barrel `index.ts` cũ.
- Hook cũ: `hooks/useAdminCategories.ts`, `useAdminDashboard.ts`, `useAdminImages.ts` và barrel `hooks/index.ts`.

Giữ lại `AdminLayout`, `AdminAccess`, các trang admin mới, tab Bookings/Collections/Roles/Logs, hook users/roles/resource, modal và CSS còn được dùng. Đặc biệt **`AdminForm.css` vẫn được UserModal/CategoryModal sử dụng**, nên chỉ xóa component `AdminForm.tsx`, không xóa CSS này. Shared CSS vẫn có thể chứa selector cũ; chưa bóc từng selector trong lượt dọn module để tránh làm hỏng giao diện mới.

Script đọc dependency: `frontend/scripts/audit-admin-dependencies.cjs` (chỉ báo cáo, không tự xóa). Sau dọn, không còn file admin không được entry hiện hành truy cập theo đồ thị import đã quét. Tải module bằng đường dẫn động không literal cần kiểm thủ công nếu được thêm sau này.

### 13.3. Khám phá — độ dài và chia module

- `ExplorePage.tsx`: **263 dòng**, không vượt 1.000 nên giữ nguyên cấu trúc trang.
- Đã kiểm toàn bộ dependency trong `src` của trang. Hai file bản dịch `vi.ts`/`en.ts` trước đây lần lượt khoảng 1.146/1.147 dòng, đã tách theo nhóm `common`, `account`, `gallery`, `admin` dưới `frontend/src/i18n/locales/vi/` và `en/`.
- Entry `vi.ts`/`en.ts`, export `vi`/`en` và type `TranslationKeys` giữ nguyên. Đã so sánh toàn bộ object bản dịch trước/sau bằng deep equality: cả hai ngôn ngữ giữ nguyên 20 namespace và nội dung.
- Sau chia, không còn dependency nào của Khám phá vượt 1.000 dòng. Việc chia bản dịch dùng chung không thay nội dung hay layout trang chủ.

### 13.4. Bằng chứng kiểm tra của lượt dọn code

- Vite build sau dọn: **PASS**; còn cảnh báo bundle/dynamic import từ dự án.
- ESLint Khám phá và các module locale: **không có error**.
- TypeScript toàn dự án vẫn còn diagnostic ngoài phạm vi; không có diagnostic ở ExplorePage, locale hoặc các trang admin trong lần kiểm này. Không coi toàn dự án đã type-check PASS.
- Fixture admin: **PASS** mutation payloads, moderation endpoints, hủy xóa, lỗi/thử lại và route thiếu quyền. Không cập nhật dữ liệu thật.
- Fixture Khám phá, Edge desktop sáng/tối: **PASS** tải page 2 giữ category/orientation/sort, **thứ tự asc + minWidth**, lỗi page 2 giữ grid và retry đúng trang, lỗi danh mục và retry, lỗi trang đầu/retry, empty/reset; không có pageerror.
- Script fixture: `frontend/scripts/test-explore-page.cjs` và `test-admin-actions.cjs`. Kết quả kỹ thuật không thay thế người dùng tích các ca EXP-F; chưa thực hiện nghiệm thu responsive trong lượt này.

## 14. ~~Kết quả tìm kiếm (#3) — chức năng ĐẠT (16 ca + SEA-17)~~

**Đường dẫn:** gõ từ khóa rồi Enter, hoặc mở `/s/photos/chan%20dung`. **Trạng thái: người dùng xác nhận đủ 16/16 ca đạt. Lỗi bổ sung SEA-17 (nút ×) cũng đã được người dùng xác nhận đạt.**

Điền `x` nếu đúng, `o` nếu sai, để trống nếu chưa thử. Nếu sai, ghi ngay dưới ca: đã gõ gì/bấm gì, lỗi đang thấy, ảnh chụp nếu có. Không cần xem request/API để làm các bước này. **Chưa test responsive ở lượt này.**

### 14.1. Những điểm đã xử lý

- Từ khóa có ký tự `%` không còn bị giải mã thêm lần nữa gây lỗi hoặc biến thành từ khóa khác.
- Bỏ bước chờ tải và giải mã tất cả ảnh trước khi hiện lưới. Ảnh có thể hiện dần theo cơ chế grid hiện có; không hứa đã giải quyết lỗi modal dùng chung IMG-01.
- Bỏ cache riêng chỉ dựa trên từ khóa, tránh lấy lại kết quả không khớp bộ lọc. Request trang đầu/tải thêm dùng chung từ khóa và filter.
- Đổi bộ lọc chỉ có một nơi gửi request; trang không tự giữ danh mục cũ từ Khám phá ngoài ý muốn.
- Tải lỗi có nút thử lại, lỗi trang tiếp theo giữ ảnh đã tải; kết quả rỗng có thông báo tiếng Việt.
- Đổi từ khóa không hiện ảnh của truy vấn cũ; gợi ý trả về chậm không ghi đè gợi ý của từ khóa mới.
- Gỡ khoảng chừa sidebar cũ trên desktop; tiêu đề, số kết quả, ô tìm và ảnh dùng tông chung.
- Mã trang và dữ liệu tách thành `SearchResultsPage.tsx` và `pages/search/useSearchResultsData.ts`; mỗi file dưới 1.000 dòng.

### 14.2. Checklist dễ thao tác

- [x] SEA-01 — Gõ **chân dung**, nhấn Enter → tiêu đề hiện đúng từ đã gõ, có số ảnh và lưới kết quả; không trắng trang.
- [x] SEA-02 — Thử từ có dấu và ký tự đặc biệt, ví dụ **100% Việt**, **a & b**, **%20** → không báo lỗi, tiêu đề vẫn đúng chữ bạn nhập; không biến `%20` thành khoảng trắng.
- [x] SEA-03 — Đang xem kết quả, nhập từ khác rồi Enter → tiêu đề và ảnh đổi theo từ mới, không còn ảnh cũ nằm dưới tiêu đề mới.
- [x] SEA-04 — Đổi nhanh hai từ khóa liên tiếp → kết quả cuối theo từ gõ sau, không tự nhảy ngược về từ trước.
- [x] SEA-05 — Mở **Bộ lọc tìm kiếm**, chọn **Dọc**, bấm **Áp dụng** → lựa chọn có hiệu lực, phần nhãn lọc hiển thị đúng; kết quả vẫn thuộc từ khóa đang tìm.
- [x] SEA-06 — Đổi màu/khoảng ngày/cách sắp xếp trong bộ lọc → kết quả thay đổi phù hợp; đóng panel khi chưa Áp dụng không tự đổi kết quả.
- [x] SEA-07 — Bấm **Xóa tất cả** ở hàng bộ lọc → xóa điều kiện đang chọn, vẫn giữ từ khóa tìm kiếm; ảnh tải lại.
- [x] SEA-08 — Với từ khóa có nhiều ảnh, cuộn xuống cuối → ảnh mới nối tiếp, ảnh đầu không biến mất, không lặp đi lặp lại cùng một nhóm ảnh.
- [x] SEA-09 — Có lọc Dọc/màu hoặc cách sắp xếp rồi cuộn tải thêm → ảnh mới vẫn tuân theo điều kiện đã chọn.
- [x] SEA-10 — Tìm một chuỗi không có ảnh → hiện **Chưa tìm thấy ảnh phù hợp** và gợi ý đổi từ/xóa lọc; không quay spinner mãi.
- [x] SEA-11 — Ngắt mạng rồi đổi từ khóa → hiện thông báo tải lỗi và nút **Thử lại tải ảnh**. Bật mạng rồi bấm thử lại → tải được đúng từ khóa hiện tại.
- [x] SEA-12 — Nếu mất mạng lúc tải thêm → ảnh đang xem không bị xóa. Có mạng rồi thử lại → nối thêm đúng phần còn thiếu.
- [x] SEA-13 — Nếu có các từ gợi ý dưới tiêu đề, bấm một từ → sang kết quả của đúng từ đó; không hiển thị gợi ý cũ sau khi đổi từ mới.
- [x] SEA-14 — Bấm ảnh rồi đóng/Back → trở về đúng từ khóa và bộ lọc. Nếu modal chậm, ghi thêm vào IMG-01 ở đầu file, không bỏ qua vì ảnh cuối cùng vẫn mở được.
- [x] SEA-15 — F5 ngay trên trang kết quả → vẫn giữ đúng từ khóa và tải được kết quả. F5 khi đang trong modal theo dõi riêng ở IMG-02.
- [x] SEA-16 — Chuyển sáng/tối trên desktop và dùng Tab/Enter → chữ/nút đọc được, focus rõ, không có nút cần dùng bị che. Đây chưa phải vòng responsive.

### 14.3. Bằng chứng kỹ thuật và kết quả người dùng

Script: `frontend/scripts/test-search-results.cjs`. Edge desktop 1440×900 sáng/tối: **PASS** từ khóa `100% Việt %20`, một request khi áp dụng filter, page 2 lỗi/retry giữ 20 ảnh và nối thành 21 ảnh, giữ order asc/minWidth, empty, lỗi truy vấn, đổi từ khóa và F5 trang kết quả. Không có pageerror. Vite build PASS; ESLint phần sửa không error. Đây là fixture API giả lập, chưa chứng minh thứ tự xếp hạng dữ liệu thật hoặc hiệu năng modal. Không sửa dữ liệu thật, không tự tích checklist của người dùng.

Mã sau chỉnh: `SearchResultsPage.tsx` khoảng 100 dòng và `pages/search/useSearchResultsData.ts` dưới 100 dòng. Không có file trang tìm kiếm vượt 1.000 dòng. TypeScript toàn dự án còn lỗi legacy, được theo dõi riêng; không coi build Vite là type-check toàn dự án đạt.

**Người dùng xác nhận:** 16/16 ca ban đầu đạt, bao gồm SEA-11/SEA-12 sau sửa. Đã gạch ngang phạm vi 16 ca này. SEA-17 đã được người dùng kiểm lại đạt; IMG-01 và EXP-F05 vẫn mở; IMG-02 đã đạt theo PHO-03. Responsive chưa kiểm, làm vòng cuối.

### 14.4. Kết quả người dùng và bản sửa hai ca mất mạng

**Lịch sử:** lần đầu người dùng kiểm được 14 ca x, 2 ca o là SEA-11 và SEA-12. Sau bản sửa bên dưới, người dùng xác nhận phần 14 đạt hết; hai ca đã đổi x theo xác nhận trực tiếp.

Ảnh đính kèm: trình duyệt chọn Offline, từ khóa `fdsfj`, hiện “0 ảnh phù hợp / Chưa tìm thấy ảnh phù hợp”; tab Network trống. Ảnh đủ chứng minh UI chưa báo mất mạng tại thời điểm chụp, nhưng chưa chứng minh có request mới thất bại. Trước sửa, trang chỉ báo lỗi từ request, không theo dõi sự kiện mất mạng khi đang đứng ở một kết quả đã tải.

Đã sửa:

- Chuyển Offline → hiện thông báo kết nối bị gián đoạn ngay, không tiếp tục báo 0 ảnh/empty như dữ liệu mới vừa kiểm tra.
- Hủy request ảnh đang chờ khi mất mạng; không để nút thử lại bị khóa theo timeout dài của request.
- Đổi từ khóa khi Offline → giữ đúng từ khóa trên tiêu đề, hiện lỗi mạng, không báo không có ảnh.
- Giữ ảnh đã tải nếu mất mạng khi xem hoặc tải trang tiếp theo. Bật mạng rồi Thử lại → request đúng trang lỗi, cùng từ khóa/bộ lọc; chỉ bỏ lỗi khi tải thành công.

**Kiểm lại bằng thao tác đơn giản:**

1. SEA-11: Tìm một từ bất kỳ khi Online → chọn Offline → phải thấy thông báo mạng. Gõ từ khác, Enter khi vẫn Offline → vẫn thấy thông báo mạng. Chuyển No throttling/Online → bấm **Thử lại tải ảnh** → kết quả của từ mới hiện đúng. Không cần F5; F5 khi Offline còn phụ thuộc việc tải lại toàn bộ ứng dụng.
2. SEA-12: Tìm từ có hơn một trang ảnh. Nếu muốn ngắt đúng giữa request, chọn Slow 3G, cuộn gần cuối để tải thêm rồi chọn Offline trong lúc đang chờ → ảnh cũ còn nguyên, hiện lỗi mạng. Chuyển lại Online, bấm **Thử lại tải ảnh** → nối đúng phần tiếp theo, không mất/lặp ảnh đầu. Nếu từ khóa chỉ có 0 hoặc ít ảnh thì không đủ dữ liệu để kết luận ca tải thêm.

Bằng chứng mới: `frontend/scripts/test-search-offline.cjs` dùng HTTP ảnh nội bộ thật với `context.setOffline(true/false)` (không mock thành công request ảnh lúc Offline), abort request page 2 đang chờ và reconnect/retry. **PASS desktop sáng/tối**: empty không hiện như kết quả mới khi mất mạng; đổi query offline/retry; giữ20 ảnh và retry page2 nối thành21 ảnh. Script hồi quy `test-search-results.cjs` PASS cả hai theme. Build/lint phần sửa không error; không có diagnostic TypeScript ở hai file trang/hook sửa (toàn dự án vẫn còn lỗi ngoài phạm vi).

**Trạng thái mới nhất: SEA-11 = x, SEA-12 = x — NGƯỜI DÙNG ĐÃ XÁC NHẬN ĐẠT.** Các dấu x khác giữ nguyên. Đây là test chức năng kết nối, không phải nghiệm thu responsive dù ảnh người dùng chụp bằng chế độ mobile.

### 14.5. Lỗi bổ sung — nút × trong ô tìm kiếm

Người dùng đã xác nhận **16 ca ban đầu của mục 14 đạt hết**. Giữ xác nhận đó, bổ sung lỗi riêng này thay vì đổi ngược các ca cũ thành chưa đạt.

Nguyên nhân tìm thấy trong `SearchBar.tsx`: `handleClear` gọi `navigate('/', { replace: true })`. Ngoài ra, Enter khi ô trống cũng điều hướng về `/`; cơ chế đồng bộ URL cũ có thể điền lại chữ vừa xóa khi mất focus.

Đã sửa nút × chỉ xóa chữ và đưa con trỏ vào ô nhập, giữ trang/kết quả/bộ lọc đang xem. Bấm ra ngoài không tự điền lại chữ cũ. Enter khi ô trống không chuyển trang; nhập từ mới rồi Enter mới cập nhật kết quả.

- [x] SEA-17 — Đang ở trang kết quả, bấm **×** → chữ trong ô biến mất, con trỏ vẫn ở ô, không về trang chủ; tiêu đề/kết quả/bộ lọc cũ giữ nguyên để chờ tìm từ mới. Bấm ra ngoài rồi quay lại → ô vẫn trống. Enter khi trống → không chuyển trang. Nhập từ mới, Enter → tìm đúng từ mới.

**SEA-17 = x — người dùng xác nhận “đạt rồi”.** Phần chức năng tìm kiếm đã được xác nhận đủ 16 ca gốc và ca bổ sung SEA-17. Responsive vẫn làm sau cùng.

Bằng chứng: build/lint phần sửa đạt; `test-search-results.cjs` PASS Edge desktop sáng/tối, có assertion xóa trống, giữ focus/URL, blur không điền lại, Enter trống không điều hướng và không phát request ảnh mới. Các ca hồi quy tìm kiếm trước đó vẫn PASS.

## 15. Chi tiết ảnh (#4) — CÒN 3 CA CHƯA ĐẠT

**Cách vào:** từ Khám phá hoặc Kết quả tìm kiếm, bấm một bức ảnh. Trên desktop ảnh mở dạng modal; sao chép URL hoặc F5 để kiểm chế độ trang ảnh riêng. **Responsive để vòng cuối**, không cần đổi kích thước màn hình khi test mục này.

Điền `x` = đạt, `o` = chưa đạt; để trống = chưa kiểm. Các ca dưới đây chưa được tự đánh dấu theo kết quả máy. Nếu lỗi, ghi ảnh nào, vào từ trang nào, nút/phím đã bấm và hiện tượng cụ thể.

### 15.1. Đã sửa và những điểm cần chú ý

- **IMG-02 / F5 nháy modal:** trước đây App và ImagePage tự quyết định cách hiển thị riêng. App đã chọn trang sau reload nhưng ImagePage có thể đọc cờ modal cũ trước khi effect dọn state chạy. Nay chỉ route overlay được cấp context modal; route thường luôn render trang, không phụ thuộc thời điểm dọn cờ.
- **IMG-01 / mở ảnh chậm:** giữ luồng mở bằng dữ liệu ảnh từ lưới, không chờ API chi tiết; ưu tiên ảnh chính bằng fetchPriority, rê chuột bắt đầu tải trước ảnh chính nếu cần cùng ảnh bên cạnh. Đã đo thời gian tạo DOM modal trong fixture; vẫn cần bạn kiểm độ phản hồi trên ảnh thật và máy đang dùng, chưa coi là hết lag production.
- **Bấm tác giả bị quay lại:** bỏ việc vừa điều hướng sang hồ sơ vừa gọi đóng modal điều hướng về nền. Bấm tác giả giờ đi một đích rõ ràng.
- **Lỗi tải thông tin ảnh:** thêm nút Thử lại ngay tại màn hình lỗi; không chỉ còn nút về trang chủ.
- **Nút trong editor bị header chặn:** kiểm thử desktop phát hiện header nhận click thay nút Hủy trong editor. Modal sửa ảnh nay được portal ra document.body để nằm trên header thay vì mắc trong stacking context của app-body.
- Nhãn lượt xem/lượt tải/chỉnh sửa dùng bản dịch chung; không đổi ảnh, giá trị thống kê hay dữ liệu thật.

### 15.2. Checklist — làm gì và cần thấy gì

- [o] PHO-01 — Từ Khám phá, bấm một ảnh → khung modal và thanh nút xuất hiện nhanh, không phải đợi màn hình đứng vài giây. Đây là ca kiểm lại IMG-01; ghi lại nếu vẫn lag.
- [x] PHO-02 — Mở một ảnh từ Kết quả tìm kiếm → đúng ảnh/tên/tác giả, không nhầm ảnh khác; thanh nút có thể thao tác khi ảnh lớn còn đang tải.
- [x] PHO-03 — Đang ở modal, nhấn **F5** → mở thẳng giao diện trang ảnh, **không hiện modal khoảng 2 giây rồi mới đổi**. Đây là ca kiểm lại IMG-02.
- [x] PHO-04 — Sao chép URL ảnh, mở tab mới → trang ảnh hoạt động độc lập, không cần mở lưới trước, không có nền của một trang khác.
- [x] PHO-05 — Đóng modal bằng nút ×, thử lại bằng **Esc** → về đúng trang xuất phát, bộ lọc/từ khóa và vị trí đang xem được giữ; trang cuộn lại bình thường.
- [x] PHO-06 — Trong modal có nhiều ảnh, dùng mũi tên trái/phải và phím **←/→** → đổi đúng ảnh, URL/thông tin đổi cùng ảnh; không tạo hai modal chồng lên nhau.
- [x] PHO-07 — Sau F5 thành trang riêng, mở một ảnh liên quan rồi đóng → trở về đúng ảnh/trang trước đó; sau đó mở modal mới vẫn hoạt động.
- [x] PHO-08 — Bấm tên/avatar tác giả → đến đúng hồ sơ tác giả, không tự quay ngược về trang lưới hoặc ảnh cũ.
- [x] PHO-09 — Rê vào nút thông tin tác giả hoặc bấm nút **i** cạnh tác giả → thông tin hiện đúng; đưa chuột vào popup vẫn đọc được; Esc/bấm ngoài đóng được.
- [x] PHO-10 — Khi đã đăng nhập, bấm **Lưu** → đổi trạng thái yêu thích; bấm lại bỏ lưu. Bấm liên tục không tăng/giảm sai nhiều lần; trang Yêu thích đồng bộ sau khi tải lại. (tuy nhiên thao tác khá chậm)
- [x] PHO-11 — Khi chưa đăng nhập, thử Lưu/Bộ sưu tập → đi theo luồng yêu cầu đăng nhập phù hợp, không báo đã lưu khi chưa thực hiện được.
- [x] PHO-12 — Bấm **Bộ sưu tập** → thấy danh sách phù hợp tài khoản, thêm/bỏ ảnh đúng bộ sưu tập; đóng xong vẫn ở ảnh hiện tại. Chỉ dùng bộ sưu tập test để thử thay đổi.
- [x] PHO-13 — Bấm **Tải xuống**, chọn một kích thước → trình duyệt nhận file đúng ảnh. Mỗi lượt bấm có phản hồi, bấm nhanh không tạo nhiều lượt tải ngoài ý muốn; lỗi tải không báo thành công.
- [x] PHO-14 — Bấm **Chia sẻ** → mở chia sẻ của thiết bị hoặc sao chép đúng URL ảnh. Dán vào tab khác → mở đúng ảnh; hủy chia sẻ không báo lỗi giả.
- [x] PHO-15 — Kiểm tra tên, ngày đăng, vị trí, máy ảnh/EXIF và tag khi ảnh có dữ liệu → hiện đúng; thiếu thông tin không sinh chữ undefined/NaN hoặc ô trống khó hiểu.
- [x] PHO-16 — Bấm **Thông tin** cạnh Chia sẻ → popup thống kê đúng ảnh; chuyển tab lượt xem/lượt tải và đóng popup không đổi ảnh đang xem.
- [x] PHO-17 — Chủ ảnh/admin thấy nút **Chỉnh sửa**; tài khoản thường không phải chủ ảnh không thấy hoặc không được phép sửa. Thử sửa dữ liệu ảnh test, lưu rồi tải lại → đúng dữ liệu; lỗi lưu giữ nội dung đã nhập.
- N/A — PHO-18: đã bỏ tính năng chỉnh pixel theo yêu cầu; không cần kiểm lại.
- N/A — PHO-19: đã bỏ tính năng chỉnh pixel theo yêu cầu; không cần kiểm lại.
- [x] PHO-20 — Ảnh liên quan ở cuối trang → bấm đúng ảnh được chọn, có thể quay lại; ảnh liên quan lỗi không làm mất ảnh chính.
- [ o] PHO-21 — Mở link ảnh không tồn tại hoặc ngắt mạng trước khi mở link mới → thấy trạng thái lỗi rõ, không spinner mãi. Có mạng rồi **Thử lại** tải được nếu ảnh vẫn tồn tại.
- [ o] PHO-22 — Khi file ảnh lớn tải lỗi → có phản hồi và nút thử lại trên vùng ảnh; thử lại không đổi URL ảnh đang xem hoặc cập nhật nhầm ảnh khác.
- [x] PHO-23 — Trên desktop sáng/tối: các nút và chữ đọc được. Dùng Tab/Enter ở modal: focus ở trong modal, đóng xong trở về vùng thao tác phù hợp. Khi gõ trong form sửa ảnh, phím mũi tên/F không tự đổi ảnh hoặc yêu thích.

### 15.3. Tách file để dễ bảo trì

- `pages/ImagePage.tsx`: khoảng705 dòng, chỉ phần hiển thị/ghép component.
- `pages/image/useImagePageController.ts`: khoảng973 dòng, trạng thái và điều khiển trang.
- `pages/image/useImagePageData.ts`: khoảng100 dòng, tải ảnh/cancel/retry và ảnh liên quan.
- Trình chỉnh pixel đã được xóa theo yêu cầu; chỉ giữ form sửa thông tin.
- `CollectionModal.css` trước đây1.375 dòng tách thành base/list và forms/picker; entry giữ nguyên import và thứ tự cascade. Đã so nội dung ghép lại bằng đúng CSS gốc; thuật toán pixel filter cũng được so AST trước/sau tách, không thay tính toán trong lượt này.
- Audit dependency của Chi tiết ảnh hiện không còn file vượt1.000 dòng. Ngưỡng này áp dụng cho file nguồn, không phải bundle build.

### 15.4. Bằng chứng kỹ thuật — không thay người dùng tích x

- Vite build và ESLint phần sửa không có error; TypeScript không có diagnostic tại các file trang ảnh/editor vừa sửa. Toàn dự án vẫn còn diagnostic ngoài phạm vi.
- `test-image-page-browser.cjs`: Edge desktop1440×900, sáng/tối, API giả lập. Modal mở từ grid không gọi/chờ API chi tiết (API này được cố ý delay1.200ms); click → DOM modal đo được khoảng35–47ms qua các lượt fixture. Đây không phải số đo từ ảnh production hoặc thiết bị người dùng.
- Theo dõi DOM từ lúc reload: không bắt gặp `.image-page-modal` ở frame trung gian trước trang riêng. Kiểm tra được đóng/Esc/mũi tên, mở modal mới sau reload, đi hồ sơ tác giả và lỗi chi tiết/thử lại.
- Editor sau chia module đã test bằng canvas thật: tải ảnh, chỉnh độ sáng làm đổi pixel, bấm Hủy và đóng form. Chưa dùng fixture để khẳng định toàn bộ nhánh crop/watermark/export lên server đã nghiệm thu; đây là bằng chứng lịch sử, editor hiện đã bỏ.
- Các script navigation, lifecycle, actions, share/keyboard, BlurUpImage, dialog-focus, image-card-hooks và decoded-image PASS. Cập nhật đường dẫn harness theo module mới và mock còn thiếu; không gọi database/SMTP hoặc sửa ảnh thật.

**Người dùng xác nhận:** 18/21 ca còn áp dụng đạt; PHO-01/21/22 chưa đạt. PHO-10 đạt chức năng nhưng còn chậm. IMG-02 đã đóng theo PHO-03. PHO-18/19 không còn áp dụng vì đã bỏ editor. **Responsive vẫn để cuối.** Sau khi xong chức năng Chi tiết ảnh, trang tiếp theo theo inventory là Danh sách bộ sưu tập (#5).





### 15.5. Bỏ trình chỉnh ảnh pixel theo yêu cầu (15/10/2026)

- Đã bỏ tab Chỉnh ảnh, canvas, cắt/xoay, bộ lọc, watermark, undo/redo và xuất ảnh đã chỉnh. Các mô tả editor ở mục 15.3/15.4 là lịch sử trước khi bỏ tính năng.
- Xóa module editor/CSS, state/handler lưu pixel, service thay file và hai API replace đơn/hàng loạt cùng controller riêng. Upload ảnh mới và cập nhật metadata vẫn giữ.
- Form còn ba tab: Chi tiết, Tags, Exif; PHO-17 vẫn áp dụng. PHO-18/19 chuyển N/A, không tính vào kết quả nghiệm thu hiện tại.
- Responsive kiểm riêng sau khi hoàn tất chức năng tất cả trang.
