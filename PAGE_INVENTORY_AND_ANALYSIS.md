# PhotoCloud — Danh sách trang và phân tích hệ thống

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
| 3 | Kết quả tìm kiếm | `/s/photos/:query` | Truy vấn → danh sách → chi tiết. URL và kết quả phải đồng bộ; xử lý dấu tiếng Việt, truy vấn rỗng/dài và phản hồi đến sai thứ tự. |
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
- 39 trang còn lại trong danh sách không được tự coi là đã PASS chỉ vì có route hoặc build được.
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

**Trang:** `/explore` — mục số 2 trong danh sách. **Trạng thái: ĐÃ SỬA, CHỜ NGƯỜI DÙNG KIỂM TRA.**

### 11.1. Quy ước xác nhận

- Người dùng đánh `[x]` khi đạt; giữ `[ ]` và ghi mô tả lỗi khi chưa đạt. Chưa kiểm tra cũng để trống, không coi là thất bại đã tái hiện.
- Chưa gạch ngang trang Khám phá hoặc các lỗi bên dưới. Chỉ khi tất cả ca chức năng đạt và không còn lỗi mở mới đổi nhãn thành `~~Khám phá — chức năng~~ · ĐÃ XÁC NHẬN XONG`, kèm ngày và build được kiểm tra.
- Responsive được kiểm và xác nhận độc lập ở mục 12. Đạt chức năng không tự đồng nghĩa đạt responsive. Chỉ gạch ngang mục trang tổng thể `~~Khám phá~~` khi cả chức năng và responsive đều được người dùng xác nhận đạt.
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

- [ ] EXP-F01 — Vào `/explore` trực tiếp và F5: tiêu đề/mô tả mới đúng, không câu “hàng nghìn”/“tuyển chọn”; header không che phần đầu.
- [ ] EXP-F02 — Ban đầu hiển thị đúng danh mục và các lựa chọn được lưu; tổng kết quả bằng `pagination.total` API, không phải chỉ số ảnh của trang 1.
- [ ] EXP-F03 — Chọn từng danh mục rồi Tất cả: trạng thái chọn đúng, request category đúng và ảnh thuộc đúng nhóm; nhãn tổng kết quả đổi theo.
- [ ] EXP-F04 — Chọn Ngang/Dọc/Vuông/Tất cả: request orientation và kết quả đúng; nút được chọn đọc/nhìn rõ.
- [ ] EXP-F05 — Đổi từng cách sắp xếp: request sortBy đúng, dữ liệu theo thứ tự server; không tự bỏ danh mục hoặc bố cục.
- [ ] EXP-F06 — Mở Bộ lọc nâng cao, thay màu/khoảng ngày/thông số có trên panel, Áp dụng: giữ draft trước áp dụng, áp dụng xong kết quả và hàng lọc nhanh đồng bộ.
- [ ] EXP-F07 — Có hơn 30 ảnh: cuộn cuối danh sách gọi page 2 rồi trang tiếp theo, không gọi lại page 1, không mất ảnh đầu hoặc thêm ảnh trùng ID.
- [ ] EXP-F08 — Kết hợp danh mục + bố cục + sort + filter nâng cao rồi tải thêm: mọi request trang sau giữ đủ params và cùng limit, chỉ tăng page.
- [ ] EXP-F09 — Hết trang: không có request tải tiếp vô hạn hoặc spinner đứng mãi; tổng ảnh giữ đúng.
- [ ] EXP-F10 — Đổi filter nhanh khi request cũ chưa xong: kết quả cuối theo lựa chọn cuối, không bị response cũ ghi đè; không còn ảnh cũ dưới nhãn mới trong lúc đang tải trang đầu.
- [ ] EXP-F11 — Bộ lọc không có kết quả: hiện “Chưa có ảnh phù hợp”, hướng dẫn và nút xóa filter; không nhầm lỗi mạng thành danh sách rỗng.
- [ ] EXP-F12 — Xóa bộ lọc từ toolbar hoặc empty: danh mục Tất cả, bố cục Tất cả, sort Mới nhất, màu/ngày/nâng cao về mặc định; kết quả tải lại tương ứng.
- [ ] EXP-F13 — Giả lập lỗi ảnh trang đầu: hiện thông báo và Thử lại tải ảnh; phục hồi mạng và thử lại thành công, không bị request lặp vô hạn.
- [ ] EXP-F14 — Giả lập lỗi trang 2: ảnh đã tải không mất; retry đúng page 2 với đủ filter; thành công nối thêm và có thể tiếp tục tải trang sau.
- [ ] EXP-F15 — Giả lập lỗi categories: thông báo có thử lại; khôi phục mạng tải được danh mục, không chặn việc xem ảnh không lọc.
- [ ] EXP-F16 — Tìm kiếm từ ô tìm: Enter/gợi ý mở đúng `/s/photos/:query`, tiếng Việt được giữ đúng, filter không tự mất ngoài dự kiến; Back quay về Khám phá.
- [ ] EXP-F17 — Desktop mở ảnh dạng modal: đóng/Esc/Back đúng ảnh và vị trí cuộn, danh mục và filter đang chọn không tự reset.
- [ ] EXP-F18 — Link trực tiếp chi tiết ảnh và F5 không hiện modal với nền sai; quay lại Khám phá không hiển thị dữ liệu từ nguồn khác.
- [ ] EXP-F19 — Tab/Shift+Tab/Enter/Space chọn được danh mục, bố cục, sort, xóa và retry; label/focus/aria-pressed phản ánh đúng trạng thái.
- [ ] EXP-F20 — Sáng/tối trên desktop: chữ/ảnh/nút/focus rõ, không gradient chữ hoặc màu bị mất tương phản; không phát sinh lỗi console chưa xử lý.

### 11.4. Bằng chứng kỹ thuật và nhật ký lỗi

Script tham khảo: `frontend/scripts/test-explore-page.cjs`. Đã chạy PASS trên Edge desktop 1440×900, sáng/tối: request page 2 giữ category/orientation/sort, lỗi trang đầu và retry, empty, reset về truy vấn mặc định; không có pageerror. Vite build PASS, ESLint ba file UI sửa không có error. Fixture nội bộ dùng API giả lập, không sửa dữ liệu thật. Đây không thay thế kiểm tra dữ liệu thật trên staging, ca lỗi page 2 hoặc nghiệm thu responsive và các ca người dùng ở trên.

| Ca | Đạt/chưa đạt | Mô tả lỗi, bước tái hiện | Bằng chứng/build | Ngày kiểm |
|---|---|---|---|---|
| EXP-F… | Chưa kiểm | — | — | — |

**Xác nhận chức năng:** Chưa xác nhận. Người kiểm: __________. Ngày/build: __________.

## 12. Responsive — nghiệm thu riêng

Theo yêu cầu, responsive không gộp vào các ô chức năng và không tự xác nhận sau kiểm thử desktop. Mục này bắt đầu với Khám phá; có thể thêm trang khác dưới cùng phần khi đến lượt kiểm.

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
