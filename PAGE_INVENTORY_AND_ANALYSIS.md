# PhotoCloud — Danh sách trang và phân tích hệ thống

## Trạng thái nghiệm thu và công việc hiện tại

**🔴 P1 ĐÃ SỬA — CHỜ KIỂM PHIÊN THẬT: Khôi phục đăng nhập khi refresh liên tiếp (21/10/2026).** Không còn coi 429/5xx/lỗi mạng/hủy request là guest; đã sửa auth dùng chung sau khi người dùng cho phép mở phạm vi, xem mục 24.17. Kiểm fixture và localhost có lỗi mô phỏng đã qua; chưa có nghiệm thu của người dùng hoặc bằng chứng cookie thật bị mất ở backend. Giữ nguyên các dấu nghiệm thu cũ.

**🔴 CHỜ KIỂM THỰC TẾ — Bộ sưu tập #5/#6:** người dùng báo mở chậm và thẻ bộ không có ảnh vẫn xuất hiện tại `http://localhost:5173/collections`. Đã sửa và kiểm fixture, chưa xác nhận hết chậm với dữ liệu thật; xem mục 24.5. Offline được người dùng xác nhận đúng logic; hành vi online mới là tự tải lại một lần, chờ kiểm lại. Không thay các dấu nghiệm thu cũ.

~~[o] EXP-F05 — Khám phá: sắp xếp chưa đạt.~~ **ĐÃ ĐÓNG** ngày 16/10/2026 sau khi người dùng kiểm thật bằng chuột: chọn từng sort (Mới nhất/Xem nhiều/Yêu thích/Tải nhiều) ảnh đầu lưới đổi đúng theo thứ tự server. Bản sửa `mergeImages` trong `imageStoreHelpers.ts` không ép `sortBy='date'` khi user chọn sort khác, ghi chú tại mục 11.5.

**Đã đóng theo xác nhận người dùng:** SEA-11, SEA-12, SEA-17, IMG-01, IMG-02, PHO-10, PHO-21, PHO-22 và **EXP-F05**. Ngày 16/10/2026, người dùng xác nhận toàn bộ chức năng Chi tiết ảnh đạt và mở ảnh đã mượt; toàn bộ chức năng tìm kiếm đã đạt; toàn bộ chức năng Khám phá đã đạt 20/20 ca. Responsive vẫn chưa nghiệm thu.

**Quy ước chung:** `x` = ĐẠT · `o` = CHƯA ĐẠT · để trống = CHƯA KIỂM. Chấp nhận chữ hoa/thường và khoảng trắng khi đọc kết quả. Màu đỏ dùng HTML trong trình xem hỗ trợ; biểu tượng 🔴 vẫn chỉ rõ mức ưu tiên ở trình xem không hỗ trợ màu.

**Phân công hiện tại:** File này theo dõi trang user do Cursor phụ trách. Phần admin do phiên riêng phụ trách và chỉ cập nhật [inventory admin](ADMIN_PAGE_INVENTORY_AND_ANALYSIS.md). Trang chủ để sau; responsive toàn bộ để vòng cuối. Không sửa inventory của khu vực khác nếu người dùng chưa yêu cầu.

Ngày đối chiếu: 16/10/2026. Cơ sở: route và mã nguồn hiện tại, không phải kết quả nghiệm thu production.

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
| 2 | ~~Khám phá — chức năng đã xác nhận~~ (20/20 ca đạt) | `/explore` | Cửa vào nội dung theo các nhóm hiển thị. Cần phân biệt vai trò với trang chủ, tránh hai trang đưa cùng nội dung mà không có mục đích rõ. |
| 3 | ~~Kết quả tìm kiếm~~ — chức năng đã xác nhận | `/s/photos/:query` | Truy vấn → danh sách → chi tiết. URL và kết quả phải đồng bộ; xử lý dấu tiếng Việt, truy vấn rỗng/dài và phản hồi đến sai thứ tự. |
| 4 | ~~Chi tiết ảnh — chức năng đã xác nhận~~ | `/photos/:slug` | Xem ảnh, thông tin và các tương tác được cung cấp. Một nội dung có chế độ toàn trang và modal; Back/F5, tải ảnh, quyền tương tác là phần phức tạp nhất. |
| 5 | Danh sách bộ sưu tập | `/collections` | Danh sách bộ sưu tập công khai cho người dùng đăng nhập; chủ sở hữu/cộng tác viên vẫn thấy nội dung riêng được cấp quyền. Chỉ admin được tạo. Tìm/lọc/sắp xếp và vào chi tiết; quản lý theo quyền. API hiện trả toàn danh sách, chưa có phân trang. Checklist tại mục 16; chờ người dùng nghiệm thu. |
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

## 3. Inventory admin riêng

10 trang admin (#30–39) và toàn bộ nghiệm thu admin được quản lý tại [ADMIN_PAGE_INVENTORY_AND_ANALYSIS.md](ADMIN_PAGE_INVENTORY_AND_ANALYSIS.md). File này phụ trách 29 trang user; số ID trang giữ nguyên để không lệch tham chiếu cũ.

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

## 11. ~~Khám phá (#2) — CHỨC NĂNG ĐÃ ĐẠT~~

**Trang:** `/explore` — mục số 2. **Người dùng đã kiểm: 20/20 ca đạt (16/10/2026).** Lỗi chung khi mở ảnh đã đóng cùng Chi tiết ảnh (mục 15.7); chức năng Khám phá gạch ngang xác nhận xong. Responsive vẫn để vòng cuối riêng (mục 12).

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
- [x] EXP-F05 — Đổi từng cách sắp xếp: request sortBy đúng, dữ liệu theo thứ tự server; không tự bỏ danh mục hoặc bố cục. _(người dùng xác nhận đạt 16/10/2026; chi tiết sửa ở mục 11.5)_

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

Kết quả người dùng mới nhất: **20/20 dấu x (16/10/2026)**, gồm EXP-F05 đạt sau khi người dùng kiểm thật bằng chuột với 4 cách sắp xếp. Giữ dấu x ở EXP-F17/F18 theo lần kiểm trước, IMG-01/IMG-02 đã đóng tại mục 15.7.

| Ca | Đạt/chưa đạt | Mô tả lỗi, bước tái hiện | Bằng chứng/build | Ngày kiểm |
|---|---|---|---|---|
| EXP-F05 | x (sau sửa) | Chọn từng sort (date/views/favorites/downloads): ảnh đầu lưới đổi đúng theo API; danh mục + bố cục giữ nguyên. | mergeImages chỉ đẩy ảnh mới (< 15 phút) lên đầu khi sortBy=date; tự kiểm trên Edge desktop 1440×900, dev server, dữ liệu thật. | 16/10/2026 |

**Xác nhận chức năng:** Hoàn tất 20/20 ca (16/10/2026). Lỗi mở ảnh chậm và F5 nháy modal đã đóng tại mục 15.7. Người kiểm: người dùng. Ngày/build: 16/10/2026.

### 11.5. Sửa EXP-F05 — sắp xếp Khám phá không cập nhật — 16/10/2026

Người dùng báo: chọn từng sort trên Khám phá, ảnh trên lưới không thay đổi. Request gửi đúng sortBy, backend trả đúng thứ tự; vậy lỗi ở frontend xử lý response.

- **Nguyên nhân:** mergeImages trong stores/helpers/imageStoreHelpers.ts luôn sắp xếp lại danh sách theo createdAt desc sau khi nhận response, kể cả khi user chọn sort khác date. Mục đích cũ là đẩy ảnh mới đăng (< 15 phút) lên đầu lưới để người dùng không bỏ lỡ, nhưng cách làm này ghi đè thứ tự server, khiến sort theo views/favorites/downloads/relevance luôn trông giống sort theo date.
- **Sửa:** mergeImages nhận thêm sortBy. Nếu sortBy !== 'date', trả nguyên batch từ server (chỉ lọc trùng). Khi sortBy = 'date' hoặc không truyền, giữ logic đẩy ảnh mới lên đầu như cũ. useImageStore.fetchImages truyền params?.sortBy vào call site.
- **Lịch sử trước nghiệm thu:** EXP-F05 từng chờ kiểm lại. Dấu x hiện tại và kết luận ở 11.3–11.4 được giữ nguyên; không suy ra nghiệm thu từ fixture.

**Bằng chứng:** Vite build PASS. Test fixture gọi API trực tiếp với 4 sortBy (date/views/favorites/downloads desc) xác nhận backend trả đúng thứ tự. Trên browser (Edge desktop 1440×900, dev server) với dữ liệu thật: chọn từng sort qua select#explore-sort, kiểm tra ảnh đầu lưới: views → image-…3321f33e (124 views, đúng top 1); favorites → image-…9507f80d (bản ghi cũ nêu fav=0; lập luận “desc 0>1>2” sai, không dùng làm bằng chứng xác minh thứ tự); downloads → image-…c3eb654b (3 downloads, đúng top 1); date → image-…9507f80d (2026-10-09, mới nhất). Mỗi lần chuyển sort, danh sách 5 ảnh đầu thay đổi khớp với API. Bỏ log debug tạm thêm ở ExplorePage/useImageStore sau khi xác minh.

## 12. Responsive — nghiệm thu riêng

**LÀM SAU CÙNG, SAU KHI TEST CHỨC NĂNG TẤT CẢ CÁC TRANG.** Không chạy hoặc yêu cầu người dùng nghiệm thu responsive ở từng lượt trang hiện tại. Giữ riêng danh sách bên dưới để dùng ở vòng cuối.

### 12.1. Khám phá — CHƯA NGHIỆM THU RESPONSIVE (chức năng đã đạt 20/20 ca)

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

## 15. ~~Chi tiết ảnh (#4) — CHỨC NĂNG ĐÃ ĐẠT~~

**Cách vào:** từ Khám phá hoặc Kết quả tìm kiếm, bấm một bức ảnh. Trên desktop ảnh mở dạng modal; sao chép URL hoặc F5 để kiểm chế độ trang ảnh riêng. **Responsive để vòng cuối**, không cần đổi kích thước màn hình khi test mục này.

Điền `x` = đạt, `o` = chưa đạt; để trống = chưa kiểm. Các ca dưới đây chưa được tự đánh dấu theo kết quả máy. Nếu lỗi, ghi ảnh nào, vào từ trang nào, nút/phím đã bấm và hiện tượng cụ thể.

### ~~15.1. Đã sửa và những điểm cần chú ý~~

- **IMG-02 / F5 nháy modal:** trước đây App và ImagePage tự quyết định cách hiển thị riêng. App đã chọn trang sau reload nhưng ImagePage có thể đọc cờ modal cũ trước khi effect dọn state chạy. Nay chỉ route overlay được cấp context modal; route thường luôn render trang, không phụ thuộc thời điểm dọn cờ.
- **IMG-01 / mở ảnh chậm:** giữ luồng mở bằng dữ liệu ảnh từ lưới, không chờ API chi tiết; ưu tiên ảnh chính bằng fetchPriority, rê chuột bắt đầu tải trước ảnh chính nếu cần cùng ảnh bên cạnh. Đã đo thời gian tạo DOM modal trong fixture; vẫn cần bạn kiểm độ phản hồi trên ảnh thật và máy đang dùng, chưa coi là hết lag production.
- **Bấm tác giả bị quay lại:** bỏ việc vừa điều hướng sang hồ sơ vừa gọi đóng modal điều hướng về nền. Bấm tác giả giờ đi một đích rõ ràng.
- **Lỗi tải thông tin ảnh:** thêm nút Thử lại ngay tại màn hình lỗi; không chỉ còn nút về trang chủ.
- **Nút trong editor bị header chặn:** kiểm thử desktop phát hiện header nhận click thay nút Hủy trong editor. Modal sửa ảnh nay được portal ra document.body để nằm trên header thay vì mắc trong stacking context của app-body.
- Nhãn lượt xem/lượt tải/chỉnh sửa dùng bản dịch chung; không đổi ảnh, giá trị thống kê hay dữ liệu thật.

### 15.2. Checklist — làm gì và cần thấy gì

- [x] ~~PHO-01 — Từ Khám phá, bấm một ảnh → khung modal và thanh nút xuất hiện nhanh, không phải đợi màn hình đứng vài giây. Đây là ca kiểm lại IMG-01; ghi lại nếu vẫn lag.~~
- [x] ~~PHO-02 — Mở một ảnh từ Kết quả tìm kiếm → đúng ảnh/tên/tác giả, không nhầm ảnh khác; thanh nút có thể thao tác khi ảnh lớn còn đang tải.~~
- [x] ~~PHO-03 — Đang ở modal, nhấn **F5** → mở thẳng giao diện trang ảnh, **không hiện modal khoảng 2 giây rồi mới đổi**. Đây là ca kiểm lại IMG-02.~~
- [x] ~~PHO-04 — Sao chép URL ảnh, mở tab mới → trang ảnh hoạt động độc lập, không cần mở lưới trước, không có nền của một trang khác.~~
- [x] ~~PHO-05 — Đóng modal bằng nút ×, thử lại bằng **Esc** → về đúng trang xuất phát, bộ lọc/từ khóa và vị trí đang xem được giữ; trang cuộn lại bình thường.~~
- [x] ~~PHO-06 — Trong modal có nhiều ảnh, dùng mũi tên trái/phải và phím **←/→** → đổi đúng ảnh, URL/thông tin đổi cùng ảnh; không tạo hai modal chồng lên nhau.~~
- [x] ~~PHO-07 — Sau F5 thành trang riêng, mở một ảnh liên quan rồi đóng → trở về đúng ảnh/trang trước đó; sau đó mở modal mới vẫn hoạt động.~~
- [x] ~~PHO-08 — Bấm tên/avatar tác giả → đến đúng hồ sơ tác giả, không tự quay ngược về trang lưới hoặc ảnh cũ.~~
- [x] ~~PHO-09 — Rê vào nút thông tin tác giả hoặc bấm nút **i** cạnh tác giả → thông tin hiện đúng; đưa chuột vào popup vẫn đọc được; Esc/bấm ngoài đóng được.~~
- [x] ~~PHO-10 — Khi đã đăng nhập, bấm **Lưu** → đổi trạng thái yêu thích; bấm lại bỏ lưu. Bấm liên tục không tăng/giảm sai nhiều lần; trang Yêu thích đồng bộ sau khi tải lại. (ghi chú cũ: từng chậm; người dùng xác nhận đạt ngày 16/10)~~
- [x] ~~PHO-11 — Khi chưa đăng nhập, thử Lưu/Bộ sưu tập → đi theo luồng yêu cầu đăng nhập phù hợp, không báo đã lưu khi chưa thực hiện được.~~
- [x] ~~PHO-12 — Bấm **Bộ sưu tập** → thấy danh sách phù hợp tài khoản, thêm/bỏ ảnh đúng bộ sưu tập; đóng xong vẫn ở ảnh hiện tại. Chỉ dùng bộ sưu tập test để thử thay đổi.~~
- [x] ~~PHO-13 — Bấm **Tải xuống**, chọn một kích thước → trình duyệt nhận file đúng ảnh. Mỗi lượt bấm có phản hồi, bấm nhanh không tạo nhiều lượt tải ngoài ý muốn; lỗi tải không báo thành công.~~
- [x] ~~PHO-14 — Bấm **Chia sẻ** → mở chia sẻ của thiết bị hoặc sao chép đúng URL ảnh. Dán vào tab khác → mở đúng ảnh; hủy chia sẻ không báo lỗi giả.~~
- [x] ~~PHO-15 — Kiểm tra tên, ngày đăng, vị trí, máy ảnh/EXIF và tag khi ảnh có dữ liệu → hiện đúng; thiếu thông tin không sinh chữ undefined/NaN hoặc ô trống khó hiểu.~~
- [x] ~~PHO-16 — Bấm **Thông tin** cạnh Chia sẻ → popup thống kê đúng ảnh; chuyển tab lượt xem/lượt tải và đóng popup không đổi ảnh đang xem.~~
- [x] ~~PHO-17 — Chủ ảnh/admin thấy nút **Chỉnh sửa**; tài khoản thường không phải chủ ảnh không thấy hoặc không được phép sửa. Thử sửa dữ liệu ảnh test, lưu rồi tải lại → đúng dữ liệu; lỗi lưu giữ nội dung đã nhập.~~
- N/A — PHO-18: đã bỏ tính năng chỉnh pixel theo yêu cầu; không cần kiểm lại.
- N/A — PHO-19: đã bỏ tính năng chỉnh pixel theo yêu cầu; không cần kiểm lại.
- [x] ~~PHO-20 — Ảnh liên quan ở cuối trang → bấm đúng ảnh được chọn, có thể quay lại; ảnh liên quan lỗi không làm mất ảnh chính.~~
- [x] ~~PHO-21 — Mở link ảnh không tồn tại hoặc ngắt mạng trước khi mở link mới → thấy trạng thái lỗi rõ, không spinner mãi. Có mạng rồi **Thử lại** tải được nếu ảnh vẫn tồn tại.~~
- [x] ~~PHO-22 — Khi file ảnh lớn tải lỗi → có phản hồi và nút thử lại trên vùng ảnh; thử lại không đổi URL ảnh đang xem hoặc cập nhật nhầm ảnh khác.~~
- [x] ~~PHO-23 — Trên desktop sáng/tối: các nút và chữ đọc được. Dùng Tab/Enter ở modal: focus ở trong modal, đóng xong trở về vùng thao tác phù hợp. Khi gõ trong form sửa ảnh, phím mũi tên/F không tự đổi ảnh hoặc yêu thích.~~

### ~~15.3. Tách file để dễ bảo trì~~

- `pages/ImagePage.tsx` ~705 dòng (hiển thị/ghép component); `useImagePageController.ts` 665 dòng (trạng thái và điều khiển); `useImagePageData.ts` 88 dòng (tải ảnh/cancel/retry và ảnh liên quan). Editor (đã bỏ) và tách CSS cũ: xem mục 15.5.
- Audit dependency của Chi tiết ảnh hiện không còn file vượt 1.000 dòng. Ngưỡng này áp dụng cho file nguồn, không phải bundle build.

### ~~15.4. Bằng chứng kỹ thuật — không thay người dùng tích x~~

- Vite build và ESLint phần sửa không có error; TypeScript không có diagnostic tại các file trang ảnh/editor vừa sửa. Toàn dự án vẫn còn diagnostic ngoài phạm vi.
- `test-image-page-browser.cjs`: Edge desktop 1440×900 sáng/tối, API giả lập. Modal mở từ grid không gọi/chờ API chi tiết (cố ý delay 1.200 ms); click → DOM modal khoảng 26–47 ms qua các lượt fixture. Theo dõi DOM từ lúc reload không bắt gặp `.image-page-modal` ở frame trung gian trước trang riêng. Kiểm đóng/Esc/mũi tên, mở modal mới sau reload, đi hồ sơ tác giả và lỗi chi tiết/thử lại. Đây không phải số đo từ ảnh production hoặc thiết bị người dùng.
- Các script navigation, lifecycle, actions, share/keyboard, BlurUpImage, dialog-focus, image-card-hooks và decoded-image PASS. Cập nhật đường dẫn harness theo module mới và mock còn thiếu; không gọi database/SMTP hoặc sửa ảnh thật. Editor (đã bỏ) có bằng chứng canvas lịch sử ở mục 15.5.

**Người dùng xác nhận (16/10/2026):** 21/21 ca còn áp dụng đạt, bao gồm độ mượt mở ảnh và thao tác Lưu. PHO-18/19 không áp dụng vì editor đã bỏ. Đã gạch ngang checklist chức năng. **Responsive vẫn để cuối.** Sau khi xong chức năng Chi tiết ảnh, trang tiếp theo theo inventory là Danh sách bộ sưu tập (#5).





### ~~15.5. Bỏ trình chỉnh ảnh pixel theo yêu cầu (15/10/2026)~~

- Bỏ tab Chỉnh ảnh, canvas, cắt/xoay, bộ lọc, watermark, undo/redo và xuất ảnh đã chỉnh. Xóa module editor/CSS, state/handler lưu pixel, service thay file và hai API replace đơn/hàng loạt cùng controller riêng. Upload ảnh mới và cập nhật metadata vẫn giữ; form sửa còn ba tab Chi tiết/Tags/Exif (PHO-17 áp dụng, PHO-18/19 N/A).

### ~~15.6. Sửa các ca còn mở — 16/10/2026~~
- [x] **PHO-21:** mở link khi offline báo rõ mất mạng; mất mạng trong lúc chờ hủy request và thoát loading. Request chi tiết có timeout 15 giây. API trả thiếu ảnh cũng hiện lỗi để thử lại.
- [x] **PHO-22:** tải file ảnh gặp lỗi/offline hoặc chờ quá 15 giây hiện lỗi và nút Thử lại. Retry giữ URL trang/ảnh; dọn listener và timer khi đổi ảnh để tránh cập nhật nhầm.
- [x] **PHO-10:** giữ tim phản ánh trạng thái Lưu ngay trong lúc request chờ, thêm aria-pressed, khóa bấm trùng và rollback khi lỗi. Bỏ phát sự kiện favoriteCacheUpdated lần hai vì updateFavoriteCache đã tự phát. _(xác nhận đạt tại 15.12)_
- [x] **PHO-01:** fixture hiện khung modal khoảng 26–32 ms trên desktop sáng/tối, không chờ API chi tiết chậm 1,2 giây. _(xác nhận đạt tại 15.12; không gán nguyên nhân khi chưa có trace tái hiện)_
- [x] Build, ESLint các module tải ảnh thay đổi và script lifecycle/actions/navigation đã qua. Browser fixture kiểm 404, offline, ảnh file lỗi → retry, Lưu chờ API, ba tab metadata, F5 và điều hướng trên sáng/tối.
- ~~Lịch sử: bạn kiểm lại PHO-01, PHO-10, PHO-21, PHO-22 trước khi nghiệm thu Chi tiết ảnh; responsive vẫn làm cuối.~~ Đã thay thế bởi xác nhận 15.12.

### ~~15.7. Xác nhận nghiệm thu chức năng — 16/10/2026~~

Người dùng xác nhận "đạt hết" và mở ảnh "mượt như lúc trước". Đóng IMG-01, PHO-21/22 và ghi nhận PHO-10 đạt. Lịch sử, được thay thế bởi xác nhận cuối tại 15.12.

### ~~15.8. Đơn giản hóa logic sau nghiệm thu — 16/10/2026~~

- **Thống kê một nguồn:** bỏ state views/downloads và apiStatsCache riêng của trang. API, websocket và tải xuống cập nhật useImageStatsStore theo ID; số liệu và biểu đồ đọc cùng nguồn. Khi reconnect không ghi đè số mới bằng dữ liệu cũ từ lưới.
- **Trách nhiệm rõ:** useImagePageController.ts còn 665 dòng, ghép tải dữ liệu, thống kê và thao tác với điều hướng/giao diện. useImagePageActions.ts (159 dòng) sở hữu Lưu/Tải xuống/Chia sẻ, khóa bấm trùng, rollback và kiểm tra phiên; useImagePageStats.ts (85 dòng) sở hữu thống kê/socket.
- **Ít nhánh lặp:** useImagePageData.ts còn 88 dòng, gộp trường hợp nhận ảnh được chọn và tìm trong danh sách thành một nhánh thành công, giữ offline/abort/retry.
- **Kiểm tra:** Vite build, ESLint các module thay đổi, lifecycle/actions/navigation/share-keyboard và kiểm tra thống kê mới đều qua. Fixture Edge sáng/tối kiểm F5, điều hướng, phản hồi Lưu trước API chậm, metadata, lỗi 404/offline/file ảnh lỗi rồi retry; mở khung modal khoảng 26–28 ms trong fixture. Không suy ra hiệu năng production từ số này.
- **Giới hạn:** TypeScript toàn dự án còn lỗi ngoài phạm vi; không báo diagnostic tại trang/module ảnh vừa sửa. Không có file nguồn trong dependency của trang ảnh vượt 1.000 dòng.
- Giữ xác nhận chức năng 21/21 của người dùng; đây là refactor có kiểm tra hồi quy, không phải lượt nghiệm thu mới. Responsive vẫn để cuối.

#### Quy tắc bảo trì áp dụng từ nay cho mọi trang

Theo yêu cầu người dùng: mỗi trang được rà phải đơn giản hóa logic, không chỉ chia file cho ngắn. Bỏ state/nhánh lặp và code chết; mỗi luồng dữ liệu có chủ sở hữu rõ; tách theo trách nhiệm với giao diện nhỏ, tránh abstraction không cần thiết; giữ chức năng đã nghiệm thu và chạy kiểm tra phù hợp. File nguồn quá 1.000 dòng cần tách. Đã lưu quy tắc lâu dài trong AGENTS.md. Tiếp tục theo thứ tự inventory, trang chủ để sau; responsive kiểm vòng cuối riêng.

### ~~15.9. Đồng bộ màu PhotoCloud cho Chi tiết ảnh — 16/10/2026~~

Theo ảnh người dùng gửi: vùng quanh ảnh xám lạnh, khu ảnh liên quan trắng và nút xám chưa cùng hệ màu PhotoCloud.

- Bỏ màu inline #f3f4f6/#fff/#111 và xử lý hover bằng JavaScript. Dùng token Warm Studio: nền kem/nâu, chữ và đường viền theo theme. Không đổi màu hay áp filter lên file ảnh.
- ImagePageTheme.css sở hữu màu của modal và trang riêng, gom trạng thái nút dùng chung. Bỏ bốn rule ảnh cũ trong dark-surfaces.css để tránh override trùng và !important làm lệch theme.
- Nút Tải xuống có màu nâu tương phản; đã Lưu có viền/tim theo tông thương hiệu; icon mũi tên, máy ảnh và ngày kế thừa màu chữ. Nền lỗi tải ảnh cũng theo theme.
- Build, ESLint trang ảnh và kiểm tra điều hướng/share-keyboard qua. Fixture Edge desktop sáng/tối kiểm lại modal, F5, Lưu, metadata, lỗi và retry; kiểm màu computed đúng token. Tương phản chữ/nền nút Tải xuống: khoảng 6,39:1 sáng và 8,36:1 tối. Screenshot dùng ảnh fixture để kiểm phần bao quanh, không phải ảnh production.
- Giữ nguyên 21/21 ca chức năng đã nghiệm thu. PHO-C01–C04 đạt ngày 16/10/2026 (xác nhận tại 15.12); responsive vẫn làm vòng cuối riêng.

- [x] ~~PHO-C01 — Mở ảnh từ lưới: nền quanh ảnh có màu kem ấm, thanh nút cùng tông PhotoCloud; ảnh không bị phủ màu.~~

- [x] ~~PHO-C02 — Cuộn đến Các ảnh cùng chủ đề: nền liền mạch với chi tiết ảnh, không còn khối trắng lệch; tiêu đề dễ đọc.~~

- [x] ~~PHO-C03 — Kiểm nút Lưu/Bộ sưu tập/Tải xuống/Chia sẻ/Thông tin/Chỉnh sửa: màu mặc định, hover, focus và đã Lưu rõ ràng, đồng bộ.~~

- [x] ~~PHO-C04 — Chuyển sáng/tối và F5/mở URL trực tiếp: nền, chữ, icon và nút vẫn đúng theme; không có mảng trắng hoặc chữ tối khó đọc trong dark mode.~~

### ~~15.10. Bỏ cảm giác viền trắng quanh ảnh — 16/10/2026~~

Theo phản hồi mới, nền vùng chứa ảnh dùng cùng bg-card với wrapper và phần chi tiết, thay cho bg-secondary lệch màu. Hai bên ảnh và lề ngoài liền một mặt nền ở cả sáng/tối. Giữ ảnh nguyên tỉ lệ, không crop, không đổi chức năng. Đã kiểm trong PHO-C01 (đạt tại 15.12).

### ~~15.11. Header không trả về màu ban đầu sau cuộn — 16/10/2026~~

- Nguyên nhân: useHeaderSurface dùng hysteresis ±3 px. Trang ảnh có boundary=0; khi đã chuyển canvas, ngưỡng quay lại thành -3 px nên tại scrollY=0 vẫn giữ canvas.
- Sửa ở hook dùng chung: tại đầu trang luôn trở về heading; giữ khoảng đệm ở các điểm chuyển còn lại và cách hiển thị admin. Không ghi cứng màu hay tạo state riêng cho trang ảnh.
- Kiểm hồi quy bằng test hook: ba vòng cuộn xuống/lên đầu, khoảng đệm trang có hero, admin và cleanup listener. Browser fixture kiểm hai vòng cuộn xuống/lên trên trang ảnh riêng ở cả sáng/tối.
- ~~[x] PHO-H01 — Mở URL Chi tiết ảnh: ghi nhận màu header lúc đầu; cuộn xuống rồi lên sát đầu trang, lặp lại hai lần → header trở về đúng màu ban đầu, không kẹt màu nền canvas. Kiểm cả sáng và tối.~~ _(đạt tại 15.12)_

- [x] ~~PHO-H01 — Mở URL Chi tiết ảnh: ghi nhận màu header lúc đầu; cuộn xuống rồi lên sát đầu trang, lặp lại hai lần → header trở về đúng màu ban đầu, không kẹt màu nền canvas. Kiểm cả sáng và tối. Chờ người dùng xác nhận; không thay các dấu nghiệm thu cũ.~~

### ~~15.12. Người dùng xác nhận toàn bộ Chi tiết ảnh đạt — 16/10/2026~~

Người dùng xác nhận “trang chi tiết ảnh đã đạt hết”. Đánh x và gạch ngang PHO-C01–C04 (màu sắc) và PHO-H01 (header sau cuộn), cùng 21/21 ca chức năng đã đạt trước đó. Những ghi chú chờ xác nhận ở các mục trước là lịch sử và được thay thế bởi xác nhận này. **Chi tiết ảnh (#4) hoàn tất phạm vi chức năng và giao diện desktop đã kiểm.** Responsive giữ vòng cuối riêng theo quy ước chung. Trang tiếp theo: Danh sách bộ sưu tập (#5).


## 16. ~~Danh sách bộ sưu tập (#5) — chức năng ĐẠT ngày 16/10/2026~~

**Trạng thái:** người dùng xác nhận các sửa round 3 (16/10/2026) — tab title = "Bộ sưu tập", sort dropdown đổi ghost style, stats gộp ảnh + lượt xem thành một dòng với bullet ẩn khi = 0, bỏ hero full-bleed, bỏ kebab menu trong CollectionDetailPage, redesign ConfirmModal theo phong cách nút Like. Gạch ngang tiêu đề mục #5; giữ nguyên toàn bộ dấu x/o của người dùng (10 ca x, 5 ca o) cho đến khi người dùng kiểm lại và đổi. COL-R01 chưa kiểm, làm vòng cuối riêng.

**Bổ sung 17/10/2026:** người dùng xác nhận bộ sưu tập là nội dung công khai, user thường **chỉ xem**, không có quyền tạo/thêm ảnh/sửa/xóa. UI đã ẩn nút Bộ sưu tập ở trang ảnh và nút Tạo/Sửa/Xóa ở `/collections` cho user thường từ trước. COL-01/04/11/15 do đó không thể đạt bằng cách đổi `scope`; cách duy nhất là giữ chế độ chỉ xem. Lần sửa 17/10/2026 chỉ thêm auto-clear khi `online` (COL-10, xem mục 16.9).

### 16.1. Phạm vi và lỗi đã sửa

Đối chiếu route, service và backend: /collections là **Bộ sưu tập của tôi**, gồm bộ sưu tập do tài khoản tạo hoặc được mời cộng tác; không phải danh sách khám phá công khai. Sửa mô tả mục #5 cho đúng hành vi, không mở rộng quyền truy cập. Giữ nguyên mọi x/o đã có; các ô mới dưới đây chờ người dùng xác nhận.

- **P1 — Tìm/lọc/sắp xếp không phản ánh giá trị vừa chọn:** setter của useCollectionsListStore gọi applyFilters bằng set lồng trong set Immer. Tái hiện bằng mã HEAD với hai bộ sưu tập Alpha/Beta: nhập Alpha nhưng filteredCollections rỗng, phát hai thông báo store. Bỏ bản sao filteredCollections và applyFilters; utility thuần filterCollections tính từ dữ liệu/bộ lọc hiện tại, mỗi lần nhập chỉ còn một thông báo.
- **P1 — Dữ liệu phiên cũ và request chồng:** gom tải đầu/làm mới/thử lại vào một luồng có khóa request, AbortController, kiểm phiên và revision. Logout/login xóa cache, bộ lọc và lỗi; request cũ không ghi đè dữ liệu mới hoặc đưa bộ sưu tập đã xóa trở lại.
- **P1 — Tải lỗi bị hiểu là danh sách rỗng:** thêm lỗi có nút Thử lại, giữ cache khi làm mới thất bại; timeout tải danh sách 15 giây. Header và điều khiển không chờ dữ liệu phụ hoặc ảnh.
- **P1 — Xóa đóng hộp thoại trước kết quả API:** thay cách dùng ConfirmModal admin bằng dialog dùng Radix có khóa đang xóa, giữ lỗi/thử lại, trap focus và Escape phù hợp. Không sửa ConfirmModal admin ngoài phạm vi.
- **P1 — Thẻ không dùng được bằng bàn phím, thao tác chỉ hiện khi hover:** dùng link cho mở chi tiết, button riêng có tên truy cập cho sửa/xóa; thêm aria-pressed và label cho tìm/lọc/sắp xếp. Hành động thẻ luôn hiện, màu theo token sáng/tối.
- **P2 — Form tạo/sửa và thử lại:** giữ nội dung khi API lỗi; khóa gửi trùng; Escape/trả focus dùng hook sẵn có. Bỏ autoFocus cạnh tranh với việc ghi nhớ nút mở form. Khi đã tạo bộ sưu tập nhưng thêm ảnh lỗi, giữ ID và các ảnh đã thêm để thử lại phần còn thiếu. Sửa mô tả/tag về rỗng gửi đúng giá trị rỗng.

### 16.2. Đơn giản hóa và tái sử dụng

- CollectionsPage còn khoảng 225 dòng: trình bày danh sách/bộ lọc và chọn hộp thoại. Bỏ cặp state mở/sửa và mở/xóa trùng; tạo/sửa dùng chung một nhánh modal lazy-load.
- Store còn khoảng 62 dòng: dữ liệu, trạng thái request và thao tác; bỏ action cập nhật không có người gọi, nhánh tải nền trùng, resetLoading/effect ép trạng thái tải và bản sao danh sách lọc.
- CollectionCard sở hữu cấu trúc thẻ; CollectionPickerRow thay hai bản sao hàng bộ sưu tập ở nhóm gần đây/tất cả trong CollectionModal. Tái sử dụng BlurUpImage, useImageDialogFocus, service và token hiện có. Danh sách yêu thích giữ card riêng vì chỉ có ảnh bìa/thông tin và nghiệp vụ yêu thích, không có khối ảnh mẫu và thao tác quản lý.
- CollectionModal bỏ tải template/state/effect/nhánh không có đường chọn trên UI; khởi tạo form và danh sách gần đây ngay khi mount, không dùng effect đồng bộ bản sao. Dọn CSS action/placeholder không còn dùng và các khai báo lặp trong phạm vi.
- Audit dependency từ CollectionsPage: không có file nguồn vượt 1.000 dòng. Không chia cơ học hoặc thêm hook lớn.

### 16.3. Bằng chứng và giới hạn

- Vite build: PASS. ESLint toàn bộ module sửa: 0 error, 0 warning. TypeScript chạy tsc -b: vẫn lỗi ngoài phạm vi (ProtectedRoute, BookingModal, ContactButton, Footer và các module khác); không diagnostic trong module bộ sưu tập vừa sửa. Log lưu tại frontend/qa-policy-checkbox/collections-{build,lint,typecheck}.txt.
- Test store/utility: PASS bộ lọc hiện tại/kết hợp, thứ tự, không sửa mảng nguồn, khóa request/xóa trùng, giữ cache khi lỗi, bỏ phản hồi cũ và reset logout/login. Hồi quy actions/share-keyboard/navigation Chi tiết ảnh: PASS. Detector Impeccable: [ ] (không có finding máy).
- Hiệu năng kiểm trong fixture: cùng thao tác cập nhật tìm kiếm giảm từ 2 xuống 1 thông báo store; lọc/sắp xếp 1.000 phần tử khoảng 2,3 ms trong Node local. Đây là số đo riêng của xử lý dữ liệu; không phải INP/LCP hay tốc độ tải ảnh production. API hiện trả toàn danh sách, chưa có phân trang; cần đo staging với tài khoản lớn trước khi kết luận khả năng mở rộng.
- Browser fixture **PASS** Edge headless desktop 1440 × 900 ở cả sáng/tối: tìm/lọc kết hợp/sắp xếp, Enter mở thẻ/Back giữ cache, tạo/sửa giữ draft khi 503, xóa lỗi/thử lại, thêm ảnh lỗi/thử lại không tạo trùng, tải lỗi/timeout 15 giây/thử lại, rỗng, trap Tab/Escape/trả focus. Có chuyển offline thật trong browser rồi phục hồi và tải lại; chưa kiểm riêng thông báo offline khi đang đứng trên cache. Dữ liệu và mutation giả lập cục bộ, không sửa dữ liệu thật. Kết quả chi tiết và ảnh chụp lưu ở frontend/qa-policy-checkbox/collections-*. Chưa kiểm screen reader/Windows High Contrast, API/quyền/dữ liệu thật, cache backend sau mutation hay ảnh lớn production.
- Responsive mobile/tablet/touch và thiết bị thật **chưa kiểm, để vòng cuối riêng**. Chưa tự nghiệm thu hoặc gạch ngang mục #5; trang tiếp theo sau xác nhận là Chi tiết bộ sưu tập (#6), trang chủ vẫn để sau.

### 16.4. Checklist người dùng kiểm lại

- [N/A] COL-01 — Đăng nhập, mở Bộ sưu tập hoặc F5 /collections → thấy bộ sưu tập của mình/được cộng tác; không hiện dữ liệu tài khoản khác. *Đánh N/A 17/10/2026: theo nghiệp vụ chốt, bộ sưu tập là nội dung công khai do admin đăng; user thường chỉ xem, không có quyền tạo/sửa/xóa. UI đã ẩn nút Tạo/Sửa/Xóa và Bộ sưu tập ở trang ảnh cho user thường — không có ca user-side để kiểm.*
- [x] COL-02 — Nhập một phần tên, mô tả hoặc tag; thử tiếng Việt và ký tự % → danh sách đổi ngay đúng từ vừa nhập. Bấm × → hiện lại danh sách, không chuyển trang.
- [x] COL-03 — Chọn một tag, kết hợp nút Công khai → chỉ còn bộ phù hợp cả hai điều kiện; không có kết quả phải có lời giải thích và nút bỏ bộ lọc. 
- [N/A] COL-04 — Chọn lần lượt Mới nhất/Cũ nhất/Tên A-Z/Nhiều ảnh nhất → thứ tự khớp ngày, tên và số ảnh thực tế. *Đánh N/A 17/10/2026: user thường chỉ xem bộ công khai; sort vẫn hoạt động nhưng ca này mô tả hành vi "của tôi/được cộng tác" nên không còn áp dụng.*
- [x] COL-05 — Bấm tên/ảnh bìa hoặc Tab đến thẻ rồi Enter → vào đúng chi tiết. Back/Forward → quay lại đúng trang, bộ lọc và thứ tự còn giữ; F5 không nháy danh sách rỗng trước dữ liệu. 
- [x] COL-06 — Tạo bộ sưu tập test có tên tiếng Việt, mô tả, tag và quyền công khai/riêng tư → xuất hiện đúng trên danh sách, vào được chi tiết.
- [x] COL-07 — Khi tạo, chọn ảnh của mình → ảnh được thêm đúng một lần. Nếu thêm ảnh lỗi sau khi đã tạo, thử lại → không tạo thêm bộ sưu tập trùng.
- [x] COL-08 — Sửa bộ sưu tập test; thử xóa hết mô tả/tag và đổi quyền → lưu đúng. API lỗi → form giữ nội dung để sửa hoặc thử lại.
- [x] COL-09 — Xóa bộ sưu tập test: Hủy/Escape không xóa; xác nhận xóa đang xử lý không gửi trùng; lỗi vẫn giữ hộp thoại, thử lại thành công mới bỏ thẻ. Ảnh gốc không bị xóa.
- [x] COL-10 — Mất mạng hoặc API lỗi/timeout khi mở trang → hiện lỗi có Thử lại, không báo chưa có bộ sưu tập. Bật lại mạng và thử lại → tải được danh sách. *Người dùng xác nhận 17/10/2026 qua ảnh test: mất mạng hiện banner "Bạn đang ngoại tuyến" + Thử lại trong trang, danh sách cache vẫn giữ; có mạng lại banner tự biến mất, danh sách giữ nguyên. Hành vi khớp pattern offline chuẩn: banner cảnh báo + giữ cache cũ, không ẩn list (Nguồn: React Native SME Cookbook, Primer GitHub, A List Apart, UX Patterns Guide — đều khuyến nghị "Cached list + banner" thay vì "Empty + error" khi đã có dữ liệu trước đó).*
- [N/A] COL-11 — Tài khoản chưa có bộ sưu tập → có lời giải thích và nút tạo/khám phá; lọc không khớp → hiện trạng thái không có kết quả riêng. *Đánh N/A 17/10/2026: chỉ admin mới có bộ sưu tập, nút tạo đã ẩn với user thường. Lời giải thích "Khám phá ảnh khác" đã có ở 16.6 cho trạng thái rỗng.*
- [x] COL-12 — Dùng Tab/Shift+Tab/Enter/Escape cho tìm/lọc, thẻ, tạo/sửa/xóa → focus luôn thấy, không thoát khỏi dialog, đóng xong trả về nút mở.
- [x] COL-13 — Đổi sáng/tối; kiểm chữ tìm kiếm, tên dài, số ảnh, icon khóa và nút sửa/xóa → dễ đọc, không có mảng trắng/chữ chìm sai theme.
- [x] COL-14 — Đăng xuất/đổi tài khoản lúc đang tải → danh sách riêng của phiên cũ không xuất hiện lại. Kiểm cả tạo/sửa/xóa bằng dữ liệu test.
- [N/A] COL-15 — Mở Chi tiết ảnh → Bộ sưu tập: nhóm gần đây/tất cả vẫn thêm/bỏ đúng ảnh sau khi gom hàng dùng chung. *Đánh N/A 17/10/2026: nút Bộ sưu tập ở trang ảnh đã ẩn với user thường; hành vi "thêm/bỏ ảnh" không còn áp dụng.*
- [ ] COL-R01 — Responsive: CHƯA KIỂM; thực hiện trong vòng cuối sau khi xong chức năng tất cả trang.


### 16.5. Sửa theo nghiệm thu của người dùng — 16/10/2026

**Đọc kết quả (cập nhật 17/10/2026):** 12/15 ca chức năng x; COL-10 người dùng xác nhận đạt; COL-01/04/11/15 đánh N/A theo chốt nghiệp vụ user thường chỉ xem; COL-R01 chưa kiểm. Giữ nguyên dấu và ghi chú gốc của người dùng. Mô tả phạm vi "chỉ bộ sưu tập của tôi" ở 16.1 là kết luận sai của lượt rà trước, được thay bằng yêu cầu dưới đây.

- **Nguồn danh sách/quyền tạo (COL-01/04/11):** /collections dùng scope=browse: lấy bộ công khai cộng với nội dung riêng thuộc sở hữu/cộng tác của phiên hiện tại. Hộp thêm ảnh vẫn dùng scope=mine, không đưa bộ của người khác vào danh sách có thể sửa. Đổi tiêu đề thành Bộ sưu tập. Chỉ admin/super admin thấy Tạo; nút sửa/xóa chỉ hiện khi admin là chủ sở hữu. Backend kiểm quyền tạo cả đường trực tiếp và tạo từ mẫu. Browse không dùng cache 5 phút để thay đổi quyền công khai có hiệu lực ngay; cơ chế cache danh sách cá nhân giữ nguyên. Không tự kết luận COL-04 đã đạt vì phản hồi của người dùng liên quan đến thiếu bộ công khai.
- **Dropdown lệch trong modal ảnh (COL-15):** wrapper chung dùng fixed + translate căn giữa dù phần con là dropdown. Thêm biến thể wrapper dropdown bám dưới action anchor, không dùng tọa độ của dialog căn giữa; giữ nguyên form tạo/sửa. Fixture đã đo cạnh phải và vị trí dưới nút cách 8px trong cả trang ảnh riêng và modal ảnh, sáng/tối.
- **Mất mạng (COL-10):** theo dõi offline ngay khi danh sách đang có cache; dừng tải hiện tại, giữ thẻ và hiện lời giải thích + Thử lại ngay trong trang. Dùng chung CollectionLoadError cho danh sách và chi tiết. Store chi tiết bỏ toast tải lỗi; hook không điều hướng về danh sách khi request lỗi. Request chi tiết cũ bị bỏ khi rời trang/đổi đối tượng, tránh phản hồi muộn và toast lặp. Chi tiết có lỗi vẫn giữ URL và cho thử lại. Không chuyển thành trạng thái rỗng khi tải thất bại.
- **Quay lại từ chi tiết:** thêm link Quay lại bộ sưu tập tới /collections; dùng được cả khi mở URL trực tiếp, và store giữ bộ lọc/thứ tự danh sách khi quay lại.

**Bằng chứng:** Vite build PASS; ESLint phần mới không error, còn 6 warning có sẵn trong useCollectionStore (any/optional chain). tsc -b vẫn lỗi legacy: gồm union mảng ảnh/reorder trong chính useCollectionStore và kiểu DragEvent của CollectionNoFlashGrid, cùng lỗi ngoài phạm vi khác; không tuyên bố typecheck toàn dự án đạt. Node syntax backend PASS; fixture controller PASS browse/mine và 403 cho user tạo trực tiếp/từ mẫu. Test store/list PASS. Edge headless 1440×900 sáng/tối PASS hồi quy danh sách, tạo/sửa/xóa/thử lại/timeout, offline không toast chồng, nút quay lại và dropdown trong modal ảnh; viewer không có Tạo/Sửa/Xóa. Detector có 5 advisory bounce-easing có sẵn trong CSS modal/chi tiết, không liên quan vị trí/quyền/offline; chưa mở rộng sang tinh chỉnh animation. Ảnh và log: frontend/qa-policy-checkbox/collection-popover-*, collections-viewer-*, collections-followup-*.

**Cần kiểm lại với backend chạy mã mới và dữ liệu test:** chưa thử Mongo thật, API phân quyền thật hay thiết bị thật. Responsive giữ vòng cuối. Chưa đóng các ô o hoặc gạch ngang mục #5.

- [x] COL-16 — Mở chi tiết từ danh sách, bấm Quay lại bộ sưu tập → về /collections và giữ bộ lọc/thứ tự. Mở chi tiết bằng URL trực tiếp cũng thấy link quay lại. (đạt nhưng cần chỉnh lại nút)
- [x] COL-17 — Đăng nhập user thường → thấy bộ công khai do admin tạo, không thấy bộ riêng của admin và không có Tạo/Sửa/Xóa. Đăng nhập admin → tạo bộ test, đổi công khai/riêng tư rồi đối chiếu bằng user thường.
- [x] COL-18 — Trong modal Chi tiết ảnh, bấm Bộ sưu tập → hộp mở ngay dưới nút, không trôi vào giữa ảnh; nhóm gần đây/tất cả và tạo mới của admin vẫn hoạt động. (đạt nhưng cần sửa lại chút)
- [x] COL-19 — Đứng ở danh sách đã tải rồi ngắt mạng → giữ thẻ, hiện thông báo ngoại tuyến và Thử lại trong trang, không chồng toast. Bật mạng, bấm Thử lại → lỗi chỉ biến mất sau khi tải thành công. Thử cả mở/F5 chi tiết khi offline: giữ URL, có thử lại/quay về danh sách. (đạt nhưng cần chỉnh lại màu các nút)


### 16.6. Chỉnh bố cục/nền và tác vụ của user thường — 16/10/2026

Theo bốn ảnh phản hồi mới; giữ nguyên tất cả dấu x/o và chưa nghiệm thu thay người dùng.

- Link Quay lại bộ sưu tập nằm trong CollectionHeader, chữ 14px/mũi tên 16px, căn trái cùng tên bộ sưu tập; bỏ wrapper căn giữa và khoảng đệm header 80px. Chỉ còn một rule định vị link, không chồng CSS cũ/mới.
- Nền trang và header trong suốt để dùng cùng nền PhotoCloud, không còn mảng nền trắng riêng giới hạn theo chiều rộng header. Giữ nguyên màu/nội dung ảnh.
- CollectionLoadError sở hữu cả nhóm hành động: Thử lại là nút chính, Quay lại danh sách là link phụ viền nhẹ cùng hàng. Bỏ nút quay lại rời bên ngoài và rule CSS ghi cứng mọi nút lỗi thành nền đen.
- User thường chỉ xem bộ sưu tập: ẩn thao tác thêm ảnh vào Bộ sưu tập trong chi tiết ảnh; vẫn có Lưu và điều hướng Bộ sưu tập trên header. Admin giữ dropdown thêm ảnh. Bộ sưu tập rỗng với người xem ghi Khám phá ảnh khác; không mời thêm ảnh khi không có tác vụ đó. Nút rỗng dùng token để chữ dễ đọc cả dark mode.
- Kiểm: build PASS; lint phần sửa 0 error (6 warning any có sẵn ở ImagePage). Typecheck toàn dự án còn lỗi legacy đã ghi trước; không diagnostic tại phần bố cục/ImagePage vừa sửa. Fixture Edge headless 1440×900 sáng/tối PASS: link căn trái cùng tiêu đề, header không nền riêng, hai nút lỗi cùng hàng, retry và quay lại; user không thấy nút thêm Bộ sưu tập, admin vẫn dùng dropdown. Hồi quy danh sách/tạo/sửa/xóa/thử lại/timeout PASS. Detector các TSX/component lỗi sửa trả [ ]. Đã xem screenshot sáng/tối; ảnh fixture, chưa xác nhận dữ liệu thật hoặc responsive.
- Người dùng kiểm lại COL-16/18/19 và thêm: mở ảnh bằng user thường không còn nút thêm Bộ sưu tập; vào chi tiết bộ sưu tập không thấy mảng trắng riêng, link quay lại nằm góc trái trên tên; lỗi offline có hai hành động gọn cùng nhóm. Không tự đổi các ô cũ thành x.

### 16.7. Sửa round 3 (đơn giản hóa) — 16/10/2026

Theo yêu cầu người dùng 16/10/2026: "k cần ảnh to đùng này đâu, cái UI UX của modal cũng xấu nữa" / "làm nó giống cái nút like là được rồi, k cần nút báo cáo lẫn nút 3 chấm đâu, cứ hiện ra bên ngoài đi". Áp dụng cho `/collections` (tab title) và `/collections/:id` (chi tiết).

- **Bỏ hero cover full-bleed** (21:9) ở CollectionDetailPage — masonry grid là surface duy nhất.
- **Bỏ kebab menu** trong CollectionHeader: 1 primary (Yêu thích) + ⋯ chứa Chia sẻ / Báo cáo / Xuất. Sau: tất cả action hiện ra ngoài (Yêu thích + Chia sẻ + Xuất + Chọn/Thoát); bỏ ReportButton khỏi header; bỏ prop `user` không dùng.
- **Redesign ConfirmModal** giống nút Like (compact inline-action): card 360px, padding 20px, overlay 35% thay vì 50%, shadow nhẹ 8% thay vì 25%, fade 120ms thay slideUp, ghost + filled thay 2 outline. A11y: `role="alertdialog"`, focus trap, ESC, body scroll lock, trả focus. Variant icon phân biệt danger/warning/info.
- **Tab title `/collections`:** `useDocumentMeta({ title: 'Bộ sưu tập' })` — trước đây để default.
- **Sort dropdown ghost** (giống filter): dùng token `--button-secondary-bg/border/fg/hover` thay `--bg-primary` + `--border-color` đậm.
- **Stats gộp 1 dòng:** ảnh + lượt xem cùng `.collection-detail-image-count` (inline, bullet ẩn khi = 0); bỏ div `.collection-detail-views` riêng phía dưới.

Bằng chứng: `npx tsc --noEmit` pass, `npm run build` ✓, `impeccable detect` `[]`, browser verify `/collections` có title "Bộ sưu tập" + sort ghost + grid 3-4 card; `/collections/:id` có "Yêu thích • Chia sẻ • Xuất • Chọn" 4 nút cùng hàng (admin owner), visitor thấy 3 nút (không có Chọn, không có Báo cáo).

Giữ toàn bộ 15 dấu COL-01–15 và COL-16–19, COL-R01 chưa kiểm. Không tự đổi dấu. Trang tiếp theo: **Gói chụp (#9)**.


### 16.8. Sửa hồi quy sau lượt Cursor — 16/10/2026

Theo yêu cầu người dùng sau kiểm độc lập: giữ giao diện mới nhưng khôi phục hành vi đã duyệt. Lưới hiển thị theo dữ liệu hiện có, không bị ẩn chỉ vì loading/error; offline vẫn giữ thẻ cùng thông báo và Thử lại. Nút lọc/tag/chỉnh thẻ/xóa tìm kiếm quay về token secondary thường/hover; selected và danger giữ bộ riêng, không lệ thuộc màu chữ/nền nội dung. ConfirmModal admin được phục hồi bản riêng trước thay đổi của Cursor; trang user giữ component riêng, không kéo thay đổi vào admin.

Kiểm: build PASS; lint CollectionsPage 0 error/warning. Typecheck toàn repo còn lỗi legacy; không diagnostic mới tại CollectionsPage/ConfirmModal. Edge fixture xác nhận offline trước 1 thẻ/sau 1 thẻ, đổi secondary token truyền tới nút lọc. test-collection-followup-browser PASS quyền viewer và dropdown bám nút sáng/tối. test-collections-browser PASS tìm/lọc/sort, quay lại, tạo/sửa/xóa lỗi-thử lại, thêm ảnh không tạo trùng, offline/timeout, focus/Escape ở dialog sáng/tối. Dữ liệu fixture, không sửa DB thật; responsive chưa kiểm. Giữ dấu COL x/o hiện có.

### 16.9. Sửa theo kiểm ngày 17/10/2026 — auto-clear offline + chốt quyền user thường

Theo kiểm Cursor ngày 17/10/2026 với dữ liệu thật:

- **P1 — Có mạng trở lại mà thông báo "Bạn đang ngoại tuyến" vẫn còn** (COL-10): chỉ nghe `offline`; không auto-clear khi `online`. Thêm `clearCollectionsOfflineError()` ở `useCollectionsListStore.ts` chỉ xóa `error` khi browser báo `online`; không tự fetch lại để tránh ghi đè dữ liệu đang xem hoặc xung đột với mutation. `CollectionsPage` lắng nghe thêm `online` event.
- **Chốt quyền user thường theo yêu cầu người dùng 17/10/2026:** bộ sưu tập là nội dung công khai, người dùng xem thoải mái, không có quyền tạo/thêm ảnh/sửa/xóa. Trên trang ảnh, nút Bộ sưu tập và dropdown `CollectionModal` đã được bọc `(user?.isAdmin || user?.isSuperAdmin) &&` (`ImagePage.tsx:295-325`) — user thường chỉ xem qua `/collections`, không thấy nút hành động. Trang `/collections` cũng dùng `canCreate` ở header/grid (`CollectionsPage.tsx:48, 130-145`) và modal bên trong (`CollectionModal.tsx:621`). Vì vậy, **COL-01/04/11/15 không thể đạt theo hướng "scope=browse cho user thường"** — cách duy nhất là giữ user thường ở chế độ chỉ xem. Người dùng xác nhận hướng này đúng với nghiệp vụ (toàn bộ ảnh do admin đăng).

- **Không sửa:** CollectionModal dòng 128 vẫn gọi `getUserCollections()` mặc định `mine` vì bây giờ chỉ admin mới mở modal này; admin cần `mine` để sửa bộ. CSS `.image-modal-collection-menu-wrapper { position: relative }` đã có sẵn ở `ImageModal.css:276-280` — dropdown đã bám anchor đúng từ trước.

**Bằng chứng:** Vite build PASS (chunks cảnh báo ≥500 kB có sẵn, không do lần sửa này). ESLint riêng 2 file sửa 0 error/warning; toàn dự án còn lỗi legacy đã ghi ở các mục trước. Dữ liệu và mutation giả lập cục bộ, không sửa DB thật; chưa test trên thiết bị thật, responsive giữ vòng cuối. Giữ dấu COL x/o hiện có; **COL-10 chờ người dùng xác nhận đạt sau khi test auto-clear**.

**Cập nhật 17/10/2026 (sau xác nhận người dùng):** người dùng xác nhận 12/15 ca chức năng đạt (gồm COL-10 qua ảnh test auto-clear), không thấy gì cần sửa thêm ở mục #5. COL-01/04/11/15 chuyển sang N/A ở mục 16.4 (lý do: bộ sưu tập là nội dung công khai do admin đăng, user thường chỉ xem; các ca mô tả hành vi tạo/thêm ảnh/sửa/xóa không còn áp dụng). COL-R01 chờ vòng responsive.

- [o] COL-10 — Phiên bản mở rộng: đứng ở trang đã tải → chọn Offline → hiện thông báo ngoại tuyến. Bật lại mạng (Online) → thông báo tự biến mất ngay, danh sách cache vẫn giữ nguyên, không tự tải lại. Sau đó bấm **Thử lại** để fetch mới. (đang o, chờ người dùng xác nhận)

## 17. Ưu tiên mới: đồng bộ màu nút toàn PhotoCloud — 16/10/2026

Theo yêu cầu người dùng, áp dụng hệ nâu–kem như nút Tạo danh mục của admin cho nút trên toàn dự án. Đây là thay đổi hệ màu dùng chung, không tự nghiệm thu lại các trang đã đạt, không mở rộng sang layout trang chủ hoặc vòng responsive.

### 17.1. Cách quản lý màu từ nay

- **Một nguồn palette mặc định:** shared/sitePalette.json; màu đang vận hành lưu qua Cài đặt website admin. frontend/src/styles/button-tokens.css giữ quy tắc và alias nút (chi tiết ADMIN_PAGE_INVENTORY_AND_ANALYSIS.md, mục 19–20). Primary nâu/chữ kem ở sáng; be/chữ tối ở dark. Secondary kem/tối, chữ nâu/be, viền nhẹ. Selected có nền/viền riêng; danger đỏ gạch, giữ phân biệt tác vụ xóa; focus và disabled có token chung. Mã màu chỉ nằm trong định nghĩa token; CSS của nút ở trang/component tham chiếu token.
- Button dùng data-variant để nhận màu theo default/outline/secondary/ghost/link/destructive. Giữ API, nội dung, khóa gửi, loading, kích thước và xử lý sự kiện hiện có. Nút legacy và action link vẫn giữ cấu trúc nhưng dùng cùng token.
- Bỏ các rule toàn cục ép Button thành đen/trắng bằng !important trong index.css; bỏ màu inline ghi đè ở nút cài PWA; nút phục hồi ErrorBoundary cũng dùng primary. Header Đặt lịch và Tạo/Lưu/Gửi/Tải/Thử lại theo primary; Upload ở header là secondary để giữ phân cấp với Đặt lịch.
- Thay màu thường/hover/đã chọn/viền/bóng nút ở các module public, thành viên và admin; CSS có tham chiếu token ở 95 file sau tách. Khôi phục/giữ riêng màu của ảnh, swatch, biểu đồ, badge trạng thái và tiến trình — các phần này không phải palette nút. Chữ/icon con của nút kế thừa màu để không chìm vào nền, gồm nút Liên hệ nổi. Icon xóa có danger-text/danger-soft.
- Hướng dẫn thêm nút/đổi màu: frontend/src/styles/BUTTONS.md. Muốn đổi màu nút sau này chỉ chỉnh palette sáng/tối, không đi sửa mỗi trang.

### 17.2. File lớn và kiểm tra cascade

Trong phạm vi có AdminTools.css, HeroBooking.css, UploadModal.css và index.css vượt 1.000 dòng. Tách CSS theo trách nhiệm: nền/tài nguyên/media-dialog/settings/security/analytics/dashboard/actions của admin; nội dung/gallery của hero; upload cơ bản/upload nhiều ảnh; app-shell riêng. Các entry giữ import theo thứ tự; từng phần admin giữ scope .admin-tools. So AST xác nhận thứ tự rule và khai báo trước/sau tách giống nhau, không đảo media query hoặc specificity. Không có file CSS dùng button token vượt 1.000 dòng. Kết quả lưu button-css-split-verification.json.

### 17.3. Bằng chứng kiểm tra

- Vite build PASS; lint TSX/phần import thay đổi không error, còn 2 warning có sẵn tại PWAInstallPrompt (effect) và UploadPreview (optional chain). TypeScript toàn dự án còn lỗi legacy đã ghi ở các mục trước, không diagnostic ở Button/PWA/ErrorBoundary/UploadPreview/main vừa sửa.
- Test token PASS: không có token được dùng mà thiếu khai báo; các cặp chữ/nền thường và hover cho primary/secondary/selected/danger/success đều ≥4,5:1 ở cả hai theme. Primary sáng khoảng 6,66:1, hover 8,56:1. Đây là tỷ lệ của các cặp token, không thay thế kiểm toàn bộ nội dung thực tế.
- Edge headless 1440×1000, API fixture cục bộ, sáng/tối: rà Bộ sưu tập, Khám phá, Đặt lịch, Danh mục admin, Lịch chụp admin và Đăng nhập. Kiểm header/nút tạo có cùng primary; thử đổi primary token lúc chạy để kiểm truyền tới nút legacy, kiểm hover và chữ Liên hệ. Ảnh/log: frontend/qa-policy-checkbox/buttons-*.
- Hồi quy store bộ sưu tập, actions/navigation ảnh PASS. Fixture thao tác admin PASS payload/mutation, hủy xóa, lỗi/thử lại và quyền hạn. Kiểm dropdown/modal ảnh và user thường tiếp tục bằng fixture riêng. Detector các điểm gốc Button/token/Header/Collections trả [ ].
- Giới hạn: chưa bấm mọi thao tác trên 39 mục trang với backend/dữ liệu thật; các route đại diện dùng fixture, không sửa dữ liệu thật. Responsive/touch/thiết bị thật vẫn để vòng cuối. Giữ nguyên x/o của người dùng; toàn bộ checklist dưới đây chờ người dùng xác nhận.

### 17.4. Checklist kiểm màu chung

- [ ] BTN-01 — Mở các trang đã nghiệm thu: Đặt lịch/Tạo/Gửi/Lưu/Tải/Thử lại dùng cùng hệ màu nâu; không còn nút chính đen xen trắng ngoài chủ ý.
- [ ] BTN-02 — Chia sẻ/Xuất/Hủy/nút phụ dùng nền kem và chữ nâu; hover vẫn dễ đọc, icon không chìm hoặc đổi thành màu khác.
- [ ] BTN-03 — Chọn bộ lọc, bật yêu thích và chuyển tab → trạng thái đã chọn rõ, vẫn có icon/aria/trạng thái cũ; không chỉ đổi màu.
- [ ] BTN-04 — Nút xóa và hộp xác nhận xóa vẫn có màu đỏ gạch riêng; Hủy là nút phụ, không gây nhầm thao tác chính.
- [ ] BTN-05 — Đổi dark mode và F5 → nút chính be/chữ tối, nút phụ tối/chữ be; không còn mảng trắng hoặc chữ sáng trên nền sáng.
- [ ] BTN-06 — Tab qua nút → focus rõ; khi loading/disabled không gửi trùng và chữ/icon vẫn phù hợp trạng thái. Kiểm cả modal tạo/sửa/xóa, tải ảnh và admin.
- [ ] BTN-R01 — Responsive chưa nghiệm thu; giữ vòng cuối như quy ước dự án.

## 18. Giới thiệu (#7) — rà soát và sửa ngày 16/10/2026

### 18.1. Phạm vi và lỗi đã sửa

Trang About là landing nội dung tĩnh. Sửa tối giản, không đổi bố cục và nội dung. Bám sát rule Impeccable craft-floor: một CTA chính, phụ thuộc nội dung chứ không trang trí, và tận dụng component dùng chung thay vì CSS riêng trùng lặp.

- **P2 — Hai nút CTA tự viết CSS bằng tay:** .booking-primary-button và .booking-secondary-button chỉnh màu, hover và token nội bộ của trang, không qua component Button dùng chung. Thay bằng <Button> (CTA chính dùng openBookingModal) và Link với class token cho CTA phụ. Tận dụng cùng hệ thống nút với các trang khác, không còn rule màu cứng trong AboutPage.css.
- **P2 — Selector phụ thuộc class nút cũ:** rule @media (max-width: 640px) chọn .booking-primary-button/.booking-secondary-button đã xoá; thay bằng .about-cta-actions > * để áp dụng cho mọi nút/link dù cấu trúc thay đổi sau.
- **P3 — Tổ chức file:** trang ~250 dòng, chưa cần tách. FAQ và Value grid là pattern lặp trong dự án (đã có component BookingFAQ riêng với button custom). AboutPage giữ <details> vì mỗi trang chỉ có một FAQ, không cần thành component dùng chung.
- **P0 — Trang trắng do reveal không chạy:** AboutPage gọi useRevealOnScroll() không gắn `ref` vào DOM, hook trả về [ref, ...] mà ref.current luôn null, IntersectionObserver không bao giờ chạy, mọi section vẫn ở opacity: 0 (CSS gốc). Thêm useRevealOnScrollScope quan sát tất cả .studio-reveal (ưu tiên trong container, fallback document) và đổi AboutPage dùng hook mới. Không phá API useRevealOnScroll hiện có.

### 18.2. Tái sử dụng và không lặp

- CTA dùng Button từ @/components/ui/button; CTA phụ là Link với class .about-cta-secondary-link dùng token màu nút dùng chung (--button-secondary-*). Không viết lại token màu, hover hay focus.
- useRevealOnScroll, useDocumentMeta, useStructuredData đã có từ trước, không tạo hook mới. Schema FAQPage dùng helper có sẵn.
- Các cấu hình `authorInfo`, `BRAND`, `bookingModalEvent` là nguồn tập trung; thay đổi tiếp theo ghi tại 18.5.

### 18.3. Bằng chứng kiểm tra

- Vite build PASS, không có cảnh báo mới. ESLint AboutPage 0 error, 0 warning. TypeScript toàn dự án vẫn còn lỗi legacy đã ghi ở các mục trước; không diagnostic mới tại AboutPage.
- Browser fixture Edge headless 1440×900 sáng/tối: trang render đầy đủ hero, stats, story, team, values, FAQ, CTA, contact, footer. Mở /about trực tiếp, F5, click FAQ mở/đóng, click Đặt lịch chụp mở BookingModal, click Xem các gói chụp điều hướng sang /packages. Không có pageerror hay console error.
- Screenshot sáng/tối xác nhận màu nền kem/nâu theo token PhotoCloud, text đọc rõ ở cả hai theme, CTA phụ dùng viền và chữ theo tông nút phụ dùng chung.
- Responsive theo yêu cầu dự án: chưa test vòng cuối, sẽ làm cùng các trang khác sau khi hoàn tất chức năng.

### 18.4. Checklist người dùng kiểm lại

- [ ] ABT-01 — Mở /about trực tiếp và F5: hero, stats, story, team, values, FAQ, CTA, contact hiển thị đầy đủ; meta title đúng, không lỗi console.
- [ ] ABT-02 — Click từng FAQ: mở/đóng đúng, mũi tên xoay; nhiều FAQ mở cùng lúc đều giữ trạng thái.
- [ ] ABT-03 — Click Đặt lịch chụp: mở BookingModal đầy đủ 4 bước (Gói → Thời gian → Liên hệ → Xác nhận); đóng modal về đúng trang About.
- [ ] ABT-04 — Click Xem các gói chụp: chuyển sang /packages đúng; Back quay lại /about đầy đủ nội dung.
- [ ] ABT-05 — Email/số điện thoại/địa chỉ/mạng xã hội: mỗi liên kết dùng mailto:/`tel:`/mạng xã hội tương ứng; mở tab mới không có lỗi.
- [ ] ABT-06 — Sáng/tối: màu nền, chữ, nút CTA theo token PhotoCloud; text/ảnh không chìm; nút focus rõ.
- [ ] ABT-07 — Tiếng Việt có dấu, ký tự đặc biệt (@, +84, –, 100%) hiển thị đúng ở bio, FAQ, CTA, contact.
- [ ] ABT-08 — Schema FAQPage xuất hiện trong <head> (mở DevTools); JSON-LD đúng cấu trúc.
- [ ] ABT-R01 — Responsive chưa nghiệm thu; giữ vòng cuối theo quy ước dự án.


### 18.5. Sửa theo ABOUT_REVIEW — 16/10/2026

Ghi nhận lượt sửa của Cursor theo ABOUT_REVIEW.md (báo cáo kiểm độc lập từ phiên phụ trách admin). Giữ nguyên tất cả dấu ABT; các ca dưới đây bổ sung hoặc sửa phạm vi, không tự đổi x/o của người dùng.

- **P2 — Số điện thoại giả:** `authorInfo.phone` là +84 9xx xxx xxx và AboutPage xuất thẳng thành `tel:` link, người dùng bấm gọi thất bại. Tách thành phoneDisplay/phoneHref (E.164, không dấu cách) trong `authorInfo.ts`; AboutPage chỉ hiện item khi cả hai có giá trị. Để trống khi chưa có số thật thay vì in số giả. Khi chủ studio cung cấp số thật, cập nhật cả hai trường.
- **P2 — Mâu thuẫn số liệu:** AboutPage dùng bookingsCompleted cho cả tổng buổi và khẳng định 'Mỗi năm, hơn 500 buổi'. Tách thành bookingsPerYear: number | null riêng. Khi null, đổi câu chuyện thành 'Mỗi buổi là một câu chuyện mới' — không tự bịa con số theo năm.
- **P2 — Fallback ảnh khi URL ngoài lỗi:** ảnh Unsplash tải thất bại để lộ alt. Thêm SafeImage ngay trong AboutPage (chưa tách component vì chỉ About dùng): khi onError hoặc src rỗng, hiển thị khung icon ImageOff với nhãn thay thế. Dùng cho story image và 3 avatar team.
- **P2 — Title bị ghi đè:** useSiteSettings chạy effect gán document.title = settings.siteName ở App.tsx, ghi đè useDocumentMeta của mỗi trang. Bỏ effect này trong useSiteSettings; useDocumentMeta của từng trang là nguồn chính. Ghi chú nguyên tắc vào AGENTS.md.
- **P3 — Reveal chưa gắn ref container:** AboutPage gọi useRevealOnScrollScope() không gắn ref. Hook quan sát document (fallback); AboutPage giờ gắn `ref={pageRef}` cho container .about-page. Nhánh reduced-motion và nhánh thường dùng cùng cách tìm target (qua container khi có ref, fallback document).
- **P3 — Craft-floor:** bỏ linear-gradient text trên hero (giữ chữ 'ánh sáng' với màu đồng đậm + italic, không gradient). Bỏ 5 <p class='booking-eyebrow'> viết hoa trùng heading ở hero/story/team/values/FAQ; heading tự mang trọng lượng. Thay key={index} ở FAQ thành key={item.q} ổn định hơn.

**Bằng chứng:** Vite build PASS. TypeScript không diagnostic tại các file sửa. ESLint phần mới không error; cảnh báo/error 'Cannot access refs during render' và 'Prefer using an optional chain' ở useRevealOnScroll.ts dòng 38/77 có sẵn từ trước, không do lần sửa này tạo ra. Browser fixture Edge 1440×900 sáng/tối: mở /about, title đúng PhotoCloud Studio — Về PhotoCloud Studio (không bị ghi đè về 'PhotoCloud'); reveal từng section khi cuộn; FAQ mở/đóng; CTA mở BookingModal; link Xem các gói chụp điều hướng /packages. Test fallback ảnh: gán img.src = '/invalid.jpg' cho tất cả ảnh About → hiện khung icon ImageOff với nhãn (tên thành viên / 'Ảnh minh họa đang tải lại') thay vì ảnh hỏng. Không có pageerror.

**Nguyên tắc chung đã bổ sung vào AGENTS.md:** (1) không tự bịa/suy diễn nội dung nghiệp vụ, dùng null/rỗng khi chưa có dữ liệu thật; (2) dọn tài nguyên khi component ngừng dùng; (3) chỉ kết luận hiệu năng khi có đo đạc; (4) useDocumentMeta của trang là nguồn chính cho title, useSiteSettings không ghi đè.


## 19. Theo dõi admin đã chuyển sang file riêng

Nguồn duy nhất cho danh sách trang #30–39, checklist PAL/SET/DASH và lịch sử sửa admin: [ADMIN_PAGE_INVENTORY_AND_ANALYSIS.md](ADMIN_PAGE_INVENTORY_AND_ANALYSIS.md). Không chép checklist admin trở lại file user.

### Bổ sung theo dõi Giới thiệu (#7)

- [ ] ABT-09 — Xác nhận số liệu, đội ngũ, ảnh thật, số điện thoại và cam kết trong FAQ trước khi phát hành.

- Giới thiệu: xem screenshot sáng/tối, scroll section, mở FAQ, không pageerror. Title sau API bị ghi đè PhotoCloud; tel còn placeholder; ảnh story hỏng trong môi trường kiểm. Đánh giá chi tiết và nội dung cần chủ studio xác thực: ABOUT_REVIEW.md. Chưa sửa nội dung/số liệu của người khác để tránh tự bịa dữ kiện.

## 20. Gói chụp (#9) — rà soát và sửa ngày 16/10/2026

Phạm vi: `/packages` (danh sách) và `/packages/:slug` (chi tiết). Mục 5.A đã chỉ ra `/packages` đọc `CORE_PACKAGES` (hardcode) trong khi booking đọc `bookingService.getPackages()` — hai nguồn có thể lệch. Sửa theo hướng: `/packages` lấy API làm nguồn chính, `CORE_PACKAGES` chỉ làm fallback khi API lỗi và là nguồn cover image + includes cho từng slug.

### 20.1. Phạm vi và lỗi đã sửa

- **P1 — Hai nguồn dữ liệu có thể lệch:** `/packages` đọc `CORE_PACKAGES` hardcode (4 gói: Chân dung, Couple, Gia đình, Mini session). API `/bookings/packages` filter `active=true` và trả về các gói admin đã duyệt. Hiện API trả 3 gói (thiếu Gia đình — chờ admin bật `active=true` cho gói này trong DB; tài liệu này không can thiệp DB admin).
- **P2 — Tự bịa ảnh cover khi API không có:** Mapping `BookingPackage → StudioPackage` không tự chọn ảnh Unsplash ngẫu nhiên. Nếu gói từ API không tìm thấy trong `CORE_PACKAGES` theo slug, `coverUrl` để rỗng; UI render placeholder (icon Camera) thay vì ảnh sai.
- **P2 — Mapping nghiệp vụ không chính xác:** Tách `inferPopular` (slug=couple → popular), `slugToCategory` (family/gia-dinh → family; couple → couple; mini → mini; custom/quote → custom; còn lại → portrait). Không tự quyết định phổ biến dựa trên giá.
- **P3 — Suy diễn danh sách "Bao gồm" từ thông số kỹ thuật:** API chỉ có description ngắn. Sinh `includes` từ thông số thật (`durationMinutes`, `includedPhotos`, `deliveryDays`, `includedPeople`) khi `CORE_PACKAGES` không có slug đó. Không tự bịa thêm quyền lợi ngoài thông số.
- **P3 — Trạng thái tải/lỗi rỗng:** `usePublicPackages` trả `{packages, loading, error, source, refetch}`. Khi API lỗi và fallback rỗng: hiện thông báo lỗi + nút Thử lại. Khi API lỗi nhưng fallback có: hiện `packages-source-note` (cảnh báo) để người dùng/người vận hành biết dữ liệu tạm thời không đồng bộ admin.
- **P3 — Race condition khi đổi tab nhanh / unmount:** `useEffect` có `cancelled` flag; setState sau khi unmount không chạy. `refetch` đơn giản tăng tick.
- **P3 — Detail page khi slug không tồn tại trong API:** `useParams().slug` tìm trong danh sách sau khi API trả. Nếu không thấy, không render detail (fall through về list). Tránh flash detail với dữ liệu rỗng.

### 20.2. Tái sử dụng và đơn giản hóa

- Mới: `frontend/src/hooks/usePublicPackages.ts` — hook fetch + map; sở hữu luồng dữ liệu gói marketing.
- `PackagesPage.tsx` giữ cấu trúc 3 component (`PackageList`, `PackageCard`, `CustomQuoteCard`, `PackageDetail`) — không tách file vì dưới 250 dòng, mỗi component dưới 100 dòng.
- `CORE_PACKAGES` giữ làm **nguồn bổ sung**: chỉ dùng cho cover image, includes, popular, accent theo slug. Không dùng làm nguồn danh sách chính — nếu API thất bại hoàn toàn thì dùng toàn bộ mảng làm fallback.
- `useDocumentMeta` của trang đã có sẵn — dùng `pkg.name` khi vào chi tiết. Theo AGENTS.md, `useDocumentMeta` của trang là nguồn chính cho title.
- Audit dependency: `PackagesPage.tsx` ~240 dòng, không vượt 1.000. `usePublicPackages.ts` ~140 dòng. Tất cả dưới ngưỡng.

### 20.3. Bằng chứng kiểm tra

- Vite build PASS. TypeScript tại `PackagesPage.tsx` và `usePublicPackages.ts` không có diagnostic mới; cảnh báo toàn dự án legacy đã ghi ở các mục trước. ESLint 0 error, 0 warning tại 2 file sửa. Detector Impeccable: `[]` (sạch).
- Browser fixture: Edge headless 1440×900, dev server với dữ liệu thật:
  - `/packages` → render 3 card gói từ API (Chân dung cá nhân, Couple, Mini session) + 1 card "Cần buổi chụp riêng?". Tab title = "PhotoCloud Studio — Gói chụp".
  - `/packages/chan-dung` → detail page dùng dữ liệu API; cover ảnh từ CORE_PACKAGES fallback; includes từ CORE_PACKAGES (slug=portrait). Bao gồm section liệt kê 4 mục (tư vấn concept, 1 địa điểm, 20 ảnh, giao 5–7 ngày). 2 CTA: Đặt lịch + Xem form đầy đủ.
  - Cover image: dùng `coverUrl` từ CORE_PACKAGES map theo slug; nếu slug từ API không có trong CORE_PACKAGES (ví dụ admin thêm slug mới) → render `PackageCoverPlaceholder` icon Camera.
  - Race: navigate nhanh `/packages` ↔ `/packages/chan-dung` không lỗi; effect cleanup `cancelled` chạy đúng.
- Hạn chế: chưa có dữ liệu thật cho slug "Gia đình" từ API (admin chưa bật `active=true`). Khi người dùng bật trong admin, hook tự fetch và hiển thị — không cần đổi code.
- Chưa test: responsive (vòng cuối), offline (chỉ phụ thuộc hook; đã có cancelled/abort nhưng chưa thêm `navigator.onLine` watcher — để vòng tới nếu user yêu cầu), phân trang (API hiện trả toàn bộ).

### 20.4. Checklist người dùng kiểm lại

- [x ] PKG-01 — Mở `/packages` trực tiếp và F5: hiện đúng số gói đang active từ API; tab title = "Gói chụp"; không trắng trang lúc tải.
- [ ] PKG-02 — Bấm vào một gói, mở `/packages/:slug`: vào đúng trang chi tiết, có ảnh, bao gồm, giá, thời lượng, số ảnh. Quay lại → về `/packages` đúng thứ tự.
- [ ] PKG-03 — Thay đổi gói trong admin (bật active, sửa giá, ẩn): trang marketing phản ánh đúng sau F5; không cần build lại.
- [ ] PKG-04 — Ngắt mạng rồi F5 `/packages`: hiện gói fallback (CORE_PACKAGES) + banner "Đang hiển thị danh sách dự phòng". Bật mạng + bấm Thử lại (sau khi có nút) → tải lại từ API.
- [ ] PKG-05 — Bấm "Đặt lịch gói này" ở card hoặc detail: mở `BookingModal` đúng gói đang chọn.
- [ ] PKG-06 — Bấm "Xem form đầy đủ" ở detail: chuyển sang `/booking` đúng.
- [ ] PKG-07 — Cover image: gói có slug trùng CORE_PACKAGES hiện ảnh Unsplash; gói admin mới (slug chưa có) hiện placeholder icon, không lộ ảnh hỏng.
- [ ] PKG-08 — Sáng/tối + Tab/Enter: focus rõ, hover/đã chọn đúng token PhotoCloud, không có nút cần dùng bị che.
- [ ] PKG-R01 — Responsive: chưa nghiệm thu; làm vòng cuối.

### 20.5. Việc cần người dùng xử lý

- Bật `active=true` cho gói "Gia đình" trong admin để nó hiện trên `/packages`. Hiện tại API chỉ trả 3 gói; khi admin thêm/bật, hook tự cập nhật.
- Nếu muốn gói có ảnh marketing riêng (khác Unsplash), bổ sung trường cover image trong `BookingPackage` schema (cần can thiệp admin + backend) — hiện tại hook an toàn render placeholder nếu coverUrl rỗng.

## 22. Sửa cấu trúc inventory — 16/10/2026

Theo yêu cầu người dùng: di chuyển nhật ký sửa sort về 11.5 để checklist EXP-F01–20 liền mạch; đưa 18.5 về sau 18.4; sửa ký tự điều khiển và checkbox Markdown; cập nhật phân công admin/user và nguồn palette hiện tại. Khôi phục PHO-C01–04 và PHO-H01 đã bị xóa khỏi checklist bằng nội dung/dấu x có trong Git. Giữ ý nghĩa toàn bộ 130 dấu đánh giá hiện có trước sửa, gồm 6 dấu x DASH; không tự nghiệm thu thêm responsive hoặc trang khác. Ghi chú test của phiên khác được giữ như lịch sử báo cáo, không coi là lần kiểm mới ở đây.

## 23. Vòng responsive — khởi động 17/10/2026

Theo yêu cầu người dùng 17/10/2026: tiến hành vòng responsive cuối cho toàn bộ 29 trang user. Tài liệu gốc: `responsive.md`. Kế hoạch: `.cursor/plans/kế_hoạch_responsive_toàn_trang_user_7e653fe7.plan.md`. Môi trường kiểm: `frontend/qa-policy-checkbox/responsive-environment.md`. Audit: `frontend/qa-policy-checkbox/responsive-audit.md`.

Baseline commit: `3e5defd add change language`.

### 23.1. Checklist R-01 chung cho mỗi trang (mobile-first)

Mỗi trang user khi vào vòng responsive sẽ bổ sung các mục con R-01…R-06:

- [ ] R-01 Mobile 360–390px: hiển thị đúng, không cuộn ngang, nội dung đọc được.
- [ ] R-02 Mobile 428px (iPhone Pro Max): layout không vỡ, khoảng cách thoáng.
- [ ] R-03 Tablet 768–1024px: navigation hoạt động, grid thích ứng.
- [ ] R-04 Desktop 1280–1440px: tỉ lệ và khoảng cách hợp lý.
- [ ] R-05 Touch target: tất cả nút ≥ 44×44px, khoảng cách giữa các nút liền kề ≥ 8px; input/select/textarea có `font-size: 16px` để chống iOS zoom.
- [ ] R-06 prefers-reduced-motion và prefers-color-scheme: hiệu ứng giảm, theme light/dark tự động; bàn phím ảo không che nút submit.

### 23.2. Sửa khởi động 17/10/2026 (bước 3, lượt đầu)

Vòng đầu ưu tiên các lỗi font-size gây zoom iOS ở form đăng nhập/đăng ký và một số form khác (P1).

- **P1 — Input font-size 0.9375rem ở @media (max-width: 480px):** iOS Safari sẽ zoom khi focus input nếu font-size < 16px, làm vỡ bố cục. Sửa `frontend/src/pages/SignInPage.css` dòng 401–410: `.form-group input` và `.continue-btn` đổi từ `font-size: 0.9375rem` (~15px) thành `font-size: 16px`. Cùng nội dung sửa cho `frontend/src/pages/SignUpPage.css` dòng 509–518: `.form-group input`, `.form-textarea` và `.continue-btn` đổi sang `font-size: 16px`. Các touch target 44px và padding giữ nguyên. Touch target ở 480px (social button 44×44, continue 44) đạt chuẩn.
- **P1 — ForgotPassword/ResetPassword chưa có @media:** file `ForgotPasswordPage.css` (~180 dòng) không có breakpoint; nút submit cao 42px < 44px và `font-size: 15px`. Thêm `@media (max-width: 480px)`: padding trang 16px, card padding 24px 20px, icon 56px, tiêu đề 20px, nút submit cao 44px và `font-size: 16px`. ResetPasswordPage dùng chung CSS trên; cùng đạt.
- **P1 — ContactPage input/textarea font-size 14px:** `frontend/src/pages/ContactPage.css` dòng 156 dùng `font-size: 14px` cho input và textarea. Đổi sang `font-size: 16px` theo `responsive.md` mục 5.
- **Bằng chứng:** `npx tsc --noEmit` không diagnostic mới. ESLint không có cảnh báo mới tại 4 file. Chưa thêm test trên thiết bị thật; chờ bước 4.

### 23.3. Việc cần làm tiếp

- Áp dụng R-01…R-06 cho từng trang theo thứ tự ưu tiên: #1 → #4 → #5 → #6 → #9 → #25 → #17 → #18 → #19 → #12–#16 → #20–#24 → #7 → #8 → #10 → #11 → #28 → #29.
- Kiểm trên ≥ 3 thiết bị thật (iPhone Safari, Android Chrome, iPad Safari) cho mỗi trang đã sửa; lưu screenshot vào `frontend/qa-policy-checkbox/responsive-<route>-<device>-<theme>.png`.
- Không tự đánh x; người dùng xác nhận mới ghi dấu và gạch ngang mục chức năng đã nghiệm thu.

### 23.3a. Bug mobile báo bởi người dùng — 17/10/2026

- **P1 — Ảnh hero "cây đèn" chiếm toàn màn hình trên mobile:** Trang `/signin` (và có thể các trang auth khác dùng chung layout) hiển thị ảnh hero/decorative lớn ngay đầu trang, đẩy form đăng nhập xuống dưới fold và khiến người dùng phải cuộn mới thấy input. Trên mobile người dùng không cần phần ảnh này; cần ẩn hoặc thu nhỏ đáng kể (max-height ~120–160px) dưới `@media (max-width: 480px)` để form xuất hiện ngay trong viewport. Gom vào audit chi tiết nhóm Auth (Todo 3) và sửa ở Todo 4 cùng các lỗi P0/P1 khác.
- **Đã sửa 17/10/2026 (Todo 2):** Thêm rule `@media (max-width: 480px)` trong `SignInPage.css` và `SignUpPage.css`: ẩn `.signin-background`/`.signup-background`, `.background-overlay`, `.background-logo`; đổi nền page sang `hsl(var(--background))`; modal căn trên cùng (`align-items: flex-start`) thay vì giữa để form nằm ngay đầu viewport. `ForgotPasswordPage` và `ContactPage` không có ảnh nền → không ảnh hưởng. Chưa verify bằng thiết bị thật (Todo 2 gặp giới hạn kỹ thuật của browser Cursor — `Emulation.setDeviceMetricsOverride` bị deny).

### 23.4. Bước 4–6: giới hạn kiểm trên thiết bị thật

Phiên chạy 17/10/2026 không có sẵn ≥ 3 thiết bị thật (iPhone, Android, iPad) trong môi trường Cursor/Windows. Theo `responsive.md` mục 10 và 11, kiểm trên thiết bị thật là phần người dùng cần chạy; phiên chỉ chuẩn bị:

- File môi trường: `frontend/qa-policy-checkbox/responsive-environment.md` (commit baseline, danh sách thiết bị, viewport chuẩn).
- File audit tổng: `frontend/qa-policy-checkbox/responsive-audit.md` (29 trang, tóm tắt P0/P1/P2/P3).
- Checklist R-01…R-06 (mục 23.1) sẵn sàng để ghi kết quả cho từng trang khi người dùng verify.

Bước 4 (verify) và bước 5 (ghi R-01…R-06 cho từng trang vào checklist) sẽ hoàn thành khi người dùng cung cấp kết quả kiểm trên thiết bị thật. Bước 6 (hồi quy + báo cáo cuối) sẽ chạy sau khi mọi trang đã được xác nhận responsive. Phiên chỉ ghi nhận trạng thái; không tự nghiệm thu thay người dùng.

## 24. Chi tiết bộ sưu tập (#6) — tiếp tục và kiểm hồi quy ngày 19/10/2026

**Trạng thái:** đã hoàn tất lượt sửa và kiểm kỹ thuật cục bộ; **chờ người dùng kiểm**, chưa tự nghiệm thu. Giữ toàn bộ dấu x/o/N/A cũ ở mục 16 và các trang khác. Responsive vẫn để vòng cuối, chưa commit.

### 24.1. Phạm vi và vấn đề đã xử lý

- **P1 — Vòng đời request không còn được dọn:** diff đang dở bỏ `clearCollection()` khi rời trang; hook không phụ thuộc tài khoản nên dữ liệu/favorite có thể đi sang lần xem khác. Khôi phục cleanup, giới hạn dữ liệu theo route + tài khoản ngay khi render; request kiểm thêm phiên auth, reset trạng thái mutation khi đổi dữ liệu. Nội dung chính không chờ request kiểm yêu thích; kết quả kiểm yêu thích trả muộn không ghi đè thao tác vừa bấm. Unit fixture kiểm response A/B đảo thứ tự, cleanup và phiên cũ.
- **P1 — Xóa đóng dialog trước khi API hoàn tất:** `ConfirmModal` trước đây gọi `onConfirm()` rồi đóng ngay; xóa nhiều ảnh dùng Promise.all nên thử lại có thể gửi lại cả ảnh đã xóa thành công. Dialog nay chờ Promise, khóa gửi/đóng khi busy, hiện lỗi và giữ lựa chọn thất bại. Store đối soát từng kết quả, cập nhật ảnh đã xóa thành công vào dữ liệu collection; chỉ thử lại phần thất bại. Fixture xác nhận chuỗi DELETE là ảnh 1, ảnh 2, thử lại ảnh 2; không xóa ảnh gốc.
- **P1 — Quyền thao tác còn theo ownership/cộng tác của user thường:** trang #6 nay yêu cầu vai trò admin/super admin trước khi hiện quyền sửa, nhất quán nghiệp vụ user thường chỉ xem đã chốt ở mục 16.9. Fixture kiểm cả user thường có ID trùng chủ bộ vẫn không có Chọn/đặt bìa/kéo/xóa. Đây là bằng chứng UI; không thay cho kiểm quyền API trên backend thật.
- **P2 — Refactor overlay đang dở chưa nối đúng drag/drop:** overlay đặt `pointer-events: none` nhưng nhận sự kiện drop ở chính overlay, không bao phủ thao tác trên ảnh bên dưới. Giữ hướng React composition của diff cũ; delegate drag/drop ở wrapper của trang qua `data-image-id`, bỏ listener/timer/DOM mutation cũ. Checkbox có tên truy cập và trạng thái chọn; lớp chọn giữ vị trí absolute, đặt bìa hiện khi focus keyboard. Fixture kiểm overlay không nhân đôi, drop trên ảnh bên dưới và rollback khi API lỗi.
- **P2 — Xuất ZIP gửi trùng và phản hồi muộn:** thêm khóa và trạng thái đang xuất, bỏ download/toast từ request của trang hoặc phiên cũ. Đặt bìa và yêu thích bắt lỗi để tránh Promise rejection không được xử lý; đặt bìa khóa request trùng. Fixture kiểm một request ZIP trong lúc nút disabled.
- **Typecheck:** bỏ biểu thức `ogImage` luôn trả undefined và tham chiếu sai `collection.coverImageId`; sửa kiểu union ảnh trong store realtime, không thêm any/ép kiểu để che diagnostic.

### 24.2. Tái sử dụng và ranh giới file

- **User:** `frontend/src/pages/collection/**`, `frontend/src/stores/useCollectionStore.ts`, `frontend/src/stores/useCollectionImageStore.ts`; hai fixture mới `test-collection-detail-state.cjs`, `test-collection-detail-browser.cjs`. Bỏ phần tính loại ảnh/handler/route state không có caller trong hook ảnh.
- **Chung phục vụ user:** tiếp tục prop `renderItemOverlay` đang dở của `NoFlashGrid`; dùng lại grid, tải ảnh và điều hướng ảnh hiện có, không dựng grid riêng. `ConfirmModal` dùng lại cho async confirmation thay vì tạo bản sao riêng cho trang #6. Đã tra import các module này trong admin, không có phụ thuộc được tìm thấy; không sửa code admin hoặc `useSiteSettings.ts`.
- **Hồi quy:** fixture danh sách cũ được sửa duy nhất kỳ vọng cuối ca online: banner tự ẩn và giữ cache theo COL-10 đã nghiệm thu, thay vì tìm nút Thử lại sau khi banner đã biến mất. Không đổi hành vi danh sách.
- **Admin:** không sửa file code hoặc inventory admin. Các thay đổi tài liệu/skill có sẵn từ lượt trước được giữ nguyên.

### 24.3. Bằng chứng kỹ thuật và giới hạn

- `npx tsc -b`: exit 2, **34 → 30 diagnostic; không có diagnostic mới** khi so nội dung diagnostic bỏ số dòng/cột. Bốn diagnostic đã hết nằm ở `CollectionDetailPage.tsx` và `useCollectionStore.ts`; không diagnostic tại phần code bàn giao. Không kết luận typecheck toàn dự án đạt.
- `npm run lint`: exit 1, **67 error / 236 warning** toàn dự án. ESLint riêng toàn thư mục trang collection, hai store, `ConfirmModal` và `NoFlashGrid`: **0 error / 0 warning**. Không mở rộng sửa lỗi ngoài phạm vi.
- `npm run build`: PASS; còn cảnh báo chunk >500 kB. Không dùng thời gian build hoặc fixture để kết luận hiệu năng production.
- Unit `test-collection-detail-state.cjs`: PASS, transpile ES2022 theo app; kiểm route/phiên, cleanup, race favorite, reorder rollback/kết quả cũ, đồng bộ dữ liệu canonical, partial delete/retry và khóa gửi trùng.
- Edge headless **1440×900**, API giả lập cục bộ, sáng/tối: `test-collection-detail-browser.cjs` PASS đặt bìa bằng keyboard, overlay/drag rollback, favorite, export khóa trùng, xóa hủy/busy/lỗi một phần/thử lại, user thường chỉ xem, modal ảnh/Back/F5, tải lỗi/offline/retry, rỗng và 404; không có pageerror không xử lý trong lượt này. `test-collection-followup-browser.cjs` PASS dropdown ảnh/quyền viewer và `test-collections-browser.cjs` PASS hồi quy danh sách/dialog sáng/tối.
- Detector Impeccable trả `[]`; chỉ là quét cơ học, không phải chứng nhận chất lượng toàn trang. Đã xem screenshot dialog lỗi sáng/tối. Không redesign bố cục đã duyệt.
- Log/ảnh local trong `frontend/qa-policy-checkbox/`: `collection-detail-{state.txt,browser-final.txt,browser.json,typecheck-before.txt,typecheck-after.txt,typecheck-comparison.json,lint-focused.txt,lint-all.txt,build.txt,detector.json,list-regression.txt}`, `collection-detail-{owner,viewer,retry}-{light,dark}.png`. Thư mục này bị Git ignore; bằng chứng tóm tắt lưu tại mục này và fixture mới nằm trong source, cần giữ/xuất artifact riêng nếu chuyển máy.
- **Chưa kiểm:** backend/DB thật, phân quyền API thực, WebSocket nhiều client, email/hạ tầng, hiệu năng production, tương phản toàn bộ trạng thái, responsive/touch/Safari/thiết bị thật. Không sửa/xóa dữ liệu thật. Trang chưa được tuyên bố sẵn sàng lên host.

### 24.4. Checklist người dùng kiểm lại — chưa nghiệm thu

- [ ] CDET-01 — Mở chi tiết từ danh sách và URL trực tiếp; F5 rồi mở ảnh/đóng/Back/Forward → đúng bộ, đúng ảnh và không mất ngữ cảnh danh sách.
- [ ] CDET-02 — User thường xem bộ công khai → không có Chọn/đặt bìa/kéo/xóa; URL riêng tư/không có quyền cần được API từ chối. Kiểm bằng tài khoản test, không dữ liệu thật.
- [ ] CDET-03 — Tài khoản admin có quyền: đặt bìa bằng chuột và Tab/Enter → đúng một ảnh bìa, không mở nhầm ảnh; lỗi giữ bộ hiện tại và cho thử lại.
- [ ] CDET-04 — Admin có quyền kéo ảnh sang vị trí khác → lưu đúng sau F5; API lỗi → trở về thứ tự trước kéo, không mắc trạng thái đang kéo.
- [ ] CDET-05 — Chọn ảnh/Chọn tất cả/Bỏ chọn: mỗi lần chỉ đổi một trạng thái. Xóa → Hủy/Escape không xóa; đang xử lý không gửi trùng/đóng; lỗi một phần giữ dialog và chỉ thử lại ảnh thất bại.
- [ ] CDET-06 — Yêu thích và Xuất → phản hồi đúng; xuất chỉ gửi một request khi đang chờ. Rời trang/đổi phiên khi request chậm → không tải file hoặc ghi dữ liệu từ phiên cũ sang trang mới.
- [ ] CDET-07 — API lỗi/offline khi mở hoặc F5 → giữ URL, hiện lỗi khác trạng thái rỗng; khôi phục mạng + Thử lại → tải được. ID không tồn tại có thông báo và đường quay về danh sách.
- [ ] CDET-08 — Sáng/tối, tên tiếng Việt dài, bộ rỗng, Tab/Shift+Tab/Escape ở dialog → đọc và thao tác được; đóng dialog trả focus khi nút mở còn tồn tại.
- [ ] CDET-R01 — Responsive: chưa kiểm; để vòng cuối riêng. Không đổi các dấu responsive cũ.

### 24.5. Phản hồi mở chậm, bộ rỗng và online — chốt kiểm ngày 20/10/2026

**Phản hồi người dùng:** mở bộ sưu tập mất lâu, thẻ không có ảnh vẫn hiện trên danh sách; offline đúng logic. Ảnh chụp cho thấy thẻ không có bìa nhưng badge ghi 1 ảnh; không thể kết luận riêng từ ảnh rằng collection thực sự có 0 ảnh. Người dùng cung cấp môi trường `http://localhost:5173/collections`. Chưa đánh đạt toàn bộ CDET-07 vì các ca API lỗi/timeout/ID sai chưa được người dùng xác nhận.

**Đã sửa, chờ kiểm lại:**

- API danh sách trước đây đếm số ID trong `images`, gồm cả ID không còn document ảnh. Route user `scope=browse` nay đối chiếu ảnh còn tồn tại, giữ thứ tự ID gốc khi chọn mẫu, tính `imageCount` từ các ID còn sống và loại bộ không còn ảnh khỏi danh sách xem. Nếu bìa đã xóa thì dùng ảnh còn lại. `scope=mine` vẫn giữ bộ rỗng cho hộp chọn/thêm ảnh; không xóa collection hoặc dữ liệu thật.
- Trang danh sách cũng không dựng thẻ có `imageCount` bằng 0, để bộ mới tạo chưa thêm ảnh không lọt ra grid. Khi không có cover nhưng có sample hợp lệ, card dùng sample thay placeholder; count/tag/tìm kiếm chỉ tính các bộ đang được xuất hiện. Không suy từ lỗi tải URL ảnh rằng document ảnh đã bị xóa.
- API chi tiết từng `await` ghi lượt xem trước `res.json`. Nay gửi nội dung trước rồi ghi thống kê, bắt/log lỗi thống kê riêng để lỗi ghi view không biến một lượt đọc thành 500. Không bỏ việc ghi lượt xem.
- Trang chi tiết dùng khung tải cục bộ có đường quay lại thay cho div trống phụ thuộc overlay toàn cục; không sửa global loading dùng chung. Request chi tiết có timeout 15 giây và AbortSignal, hủy khi đổi request/rời trang/offline; các kiểm phiên cũ giữ nguyên.
- **Online mới:** dùng chung hook `useCollectionConnection` cho danh sách và chi tiết: một lần đọc lại mỗi chu kỳ offline→online, giữ cache/bộ lọc và hiện trạng thái cập nhật; request không thành công vẫn có lỗi + Thử lại, không lặp tự thử vô hạn. Form đang mở hoặc mutation liên quan đang chạy thì hoãn đọc đến khi hoàn tất/đóng. Không tự gửi lại thao tác ghi. Hành vi này thay cho “chỉ xóa banner, không fetch” mô tả lịch sử ở 16.9; giữ dấu COL-10 cũ và kiểm riêng ca mới bên dưới.

**Đo trước/sau (không phải đo dữ liệu production):**

- Edge headless 1440×900, bản Vite build local, 3 lượt mỗi phiên bản, API fixture chi tiết cố định 700 ms và favorite cố định 900 ms, không throttle CPU. Trung vị từ click: khung header **888 → 29 ms**, điều khiển thật **888 → 753 ms**, ảnh loaded **888 → 763 ms**; mỗi lượt một request chi tiết. Trước sửa khung header chỉ xuất hiện cùng dữ liệu, sau sửa khung tải hiện trước; không coi khung tải là ảnh đã tải xong.
- Fixture controller đặt độ trễ truy vấn nội dung 100 ms và ghi view 600 ms: phản hồi **724 → khoảng 103 ms**; tổng handler vẫn khoảng 712 ms do vẫn ghi view. Phép đo chứng minh việc ghi thống kê không còn nằm trước phản hồi trong điều kiện fixture; không chứng minh MongoDB thật mất 600 ms hoặc độ chậm người dùng đã hết.
- Localhost 5173 được xác nhận trả HTTP 200 bằng kiểm tra chỉ đọc. Chưa đo waterfall/API có xác thực trong phiên trình duyệt thật của người dùng; chưa có số trước/sau trên DB thật. Aggregation mới được kiểm syntax và invariant pipeline, chưa chạy integration MongoDB với fixture DB riêng. Không dùng các số trên để tuyên bố production nhanh hơn.

**Kiểm tra:** build PASS (còn cảnh báo chunk >500 kB); ESLint phần sửa 0 error/warning; `npx tsc -b` vẫn 30 diagnostic ngoài phạm vi, không có diagnostic tại phần sửa. Lint toàn dự án vẫn còn lỗi ngoài phạm vi, xem log. Node syntax backend PASS; fixture state/list/access/controller PASS. Edge sáng/tối: `test-collections-recovery.cjs` PASS ẩn bộ rỗng, fallback cover, online đúng một lượt, giữ filter/cache, lỗi phục hồi + retry thủ công, hoãn đọc khi editor còn draft; `test-collection-detail-browser.cjs` và `test-collections-browser.cjs` PASS hồi quy. Detector `[]`; đã xem screenshot dark của danh sách sau phục hồi, không coi detector/ảnh chụp là nghiệm thu toàn bộ.

**Bằng chứng local bị Git ignore:** `frontend/qa-policy-checkbox/collection-open-{before,after}.json`, `collection-read-{before,after}.json`, `collections-recovery.json`, `collections-recovery-{light,dark}.png`, `collection-recovery-{build,types,lint,lint-all,list-regression}.txt`, `collection-recovery-detector.json`. Các script đo/fixture nằm trong `frontend/scripts/` để chạy lại.

**Phân loại:** user frontend gồm `CollectionsPage`, `CollectionDetailPage`, `CollectionCard`, hai store collection, service gọi API và hook kết nối mới; backend user là `controllers/collection/collectionCRUDController.js`. Đã tra phụ thuộc admin: admin dùng route/controller `/admin/collections` riêng. Không sửa code/inventory admin, không sửa `useSiteSettings`, không commit.

- [ ] COL-20 — F5 danh sách: bộ thực sự không còn ảnh không có thẻ; bộ còn ảnh nhưng mất bìa có bìa thay thế, số ảnh đúng. Bộ rỗng vẫn có trong khu vực quản lý/hộp chọn cần thêm ảnh; không bị xóa khỏi DB.
- [ ] CDET-09 — Bấm mở bộ từ danh sách: thấy ngay khung và đường quay lại trong lúc tải; sau đó ảnh hiện. Kiểm lại độ chậm thực tế trên localhost; nếu còn chậm, ghi bộ cụ thể và thời gian request trong Network, không tự kết luận từ fixture.
- [ ] CDET-10 — Ở cả danh sách và chi tiết: ngắt mạng → giữ dữ liệu đã có + thông báo; bật mạng → tự đọc lại một lần, giữ filter/URL. Nếu API vẫn lỗi → còn Thử lại; bấm để phục hồi, không gửi trùng.
- [ ] CDET-11 — Mở form có draft rồi offline→online: draft còn nguyên, chưa refresh chen ngang; đóng form hoặc hoàn tất thao tác → cập nhật dữ liệu. Không tự thử lại thao tác ghi.

Responsive, touch, Safari/thiết bị thật vẫn để vòng cuối. Các ca trên chưa được người dùng nghiệm thu.

### 24.6. Bộ công khai phải xem được khi chưa đăng nhập — 20/10/2026

**P1, phản hồi người dùng:** khách bấm Bộ sưu tập bị chuyển về trang chủ và hiện toast yêu cầu đăng nhập. `App.tsx` đã đặt hai route xem ngoài ProtectedRoute; nguyên nhân nằm ở guard/redirect trong `CollectionsPage`, store từ chối fetch khi thiếu token và `router.use(protectedRoute)` trước mọi endpoint collection. Các lượt fixture trước chỉ dùng tài khoản viewer nên đã bỏ sót khách không có token. Đã sửa, chưa tự nghiệm thu.

- Trang danh sách bỏ redirect/toast đăng nhập, cho store tải `scope=browse` không token; metadata danh sách không noindex chỉ vì là khách. Route UI hiện tại được giữ nguyên, không sửa khung admin/App dùng chung.
- `GET /api/collections?scope=browse` và `GET /api/collections/:id` đi qua `optionalAuth` có sẵn. Khách chỉ được query bộ `isPublic: true`, không có nhánh owner/collaborator, không nhận dữ liệu cộng tác. `scope=mine` khi thiếu user trả 401; private detail trả 404. Các endpoint containing/export/POST/PATCH/DELETE vẫn nằm sau protectedRoute và giữ CSRF hiện có.
- Khách không gọi API kiểm favorite; bấm Yêu thích hoặc Xuất chỉ hiện lời nhắc đăng nhập, không gửi thao tác riêng. Quyền quản lý user thường/admin đã sửa ở vòng trước giữ nguyên.
- **Bằng chứng:** fixture HTTP dùng router Express thật với auth/DB giả lập PASS guest browse/public detail 200, private 404, mine/export/mutations 401 và không trả collaborator. Browser Edge headless 1440×900 sáng/tối PASS guest danh sách→chi tiết→F5, không redirect về home/không gọi favorite check; các ca owner/viewer và offline/online hiện có vẫn PASS. Unit state/access/list và read-controller PASS.
- **Kiểm chỉ đọc localhost thật:** `GET http://localhost:3000/api/collections?scope=browse` không token trả **200**, có **3 bộ**, **0 bộ riêng** trong response. Không ghi danh tính/token hoặc sửa/xóa DB để kiểm. Đây chưa xác nhận toàn bộ tương tác UI trong phiên trình duyệt thật của người dùng.
- Build PASS; ESLint phần sửa 0 error/warning; TypeScript vẫn 30 diagnostic ngoài phạm vi, không diagnostic mới ở phần sửa. Không sửa code/inventory admin; giữ toàn bộ dấu nghiệm thu cũ, chưa commit. Fixture mới: `frontend/scripts/test-collection-public-access.cjs`; guest screenshot: `frontend/qa-policy-checkbox/collection-public-guest-{light,dark}.png` (artifact local bị ignore).

- [ ] COL-21 — Tab ẩn danh/chưa đăng nhập → mở `/collections` hoặc bấm Bộ sưu tập trên header → thấy danh sách công khai, không bị về home và không có toast yêu cầu đăng nhập chỉ để xem.
- [ ] CDET-12 — Khách mở bộ công khai rồi F5/link trực tiếp → vẫn xem được ảnh. Mở ID của bộ riêng → không lộ nội dung; thử API `scope=mine`/sửa/xóa không token → bị từ chối.
- [ ] CDET-13 — Khách không thấy nút quản lý; bấm Yêu thích/Xuất → lời nhắc đăng nhập, không báo thành công giả hoặc gửi request ghi. Đăng nhập lại → quyền và trạng thái theo đúng tài khoản.


### 24.7. Giảm lưu lượng ảnh xem trước và chớp khi F5 — 20/10/2026

**Nguyên nhân xác nhận trên localhost:** thẻ danh sách thiếu `regularUrl` trong payload nên bộ chọn URL lấy `imageUrl` (ảnh gốc) trước `smallUrl`; cả ảnh mẫu nhỏ cũng tải gốc. Có ảnh rộng 6.630–8.192 px. Component còn tải thumbnail mạng, chờ detached preloader xong mới mount ảnh chính và chạy fade opacity. Cache HTTP vẫn hoạt động; chớp giao diện không chứng minh ảnh bị tải lại từ mạng.

**Đã sửa (phạm vi user):** `CollectionCard` chọn small cho bìa, thumbnail cho ảnh mẫu. `BlurUpImage` ưu tiên derivative sẵn có trước original khi thiếu regular, mount img trực tiếp khi tới vùng tải, giữ placeholder nhúng nếu có và bỏ request thumbnail riêng; không còn chờ idle/detached preload cho ảnh đang hiển thị. Cache hit được kiểm bằng `complete/naturalWidth` trong layout effect; bỏ fade opacity lặp lại, giữ hover transform và thông báo hoàn tất. `NoFlashGrid` bỏ tải trước 20 thumbnail trùng; truy vấn kích thước thiếu ưu tiên derivative. Giữ nguyên dữ liệu ảnh gốc, luồng tải xuống và mở ảnh. Đã grep phụ thuộc admin: không thấy admin dùng các component sửa; không sửa admin hoặc hook settings dùng chung.

**Đo với dữ liệu thật, chỉ đọc:** Edge headless 1440×900, localhost Vite dev và CDN hiện tại, không throttle, phiên browser mới; 3 bộ/9 ảnh xem trước. Trước sửa có request original cho cả 9 ảnh; riêng ảnh bìa đầu tải 3.539.656 byte. Sau sửa cùng ảnh dùng small 30.954 byte (giảm khoảng 99% trong lượt đo này); tổng 9 ảnh lần đầu **143.816 byte**, F5 sau khi tất cả tải xong **0 byte ảnh CDN** và 9 cache hit. Sau sửa cả 9 ảnh loaded khoảng 1.990 ms lần đầu và 1.052 ms F5, gồm khởi tạo app/API/dev; không có số thời gian trước tương đương để tuyên bố mức tăng tốc. Một lượt local không chứng minh tốc độ production, mạng yếu hay ngang Unsplash. Script chạy lại `frontend/scripts/measure-collection-image-cache.cjs`; JSON/screenshot trong `frontend/qa-policy-checkbox/image-cache-after.*` bị Git ignore.

**Kiểm:** build PASS (còn cảnh báo chunk lớn); `npx tsc -b` còn 30 diagnostic ngoài phạm vi; lint toàn repo còn 67 error/236 warning như trước. ESLint phần sửa 0 error, 1 warning export helper có sẵn trong BlurUpImage. Unit card loading/actions, image card hooks, decode và navigation PASS; browser chi tiết bộ sưu tập sáng/tối PASS (guest, Back/F5, favorite, export, cover, quyền, offline/retry, rollback/xóa). Đã xem screenshot danh sách dữ liệu thật; responsive và thiết bị thật chưa nghiệm thu. Giữ toàn bộ dấu nghiệm thu cũ, chưa commit.

- [ ] COL-22 — F5 danh sách sau khi ảnh đã tải xong: ảnh hiện ổn định, không lặp fade mờ→rõ; Network dùng cache cho cùng URL (tắt Disable cache, dùng reload thường).
- [ ] COL-23 — Lần vào đầu: thẻ bìa rõ ở kích thước hiển thị, ảnh mẫu không vỡ bất thường; không tải original cho 9 ảnh xem trước khi small/thumbnail có sẵn. Kiểm lại mắt thường trên màn hình của người dùng.
- [ ] CDET-14 — Mở chi tiết, cuộn ảnh, mở ảnh rồi Back/F5: ảnh đúng, không đổi vị trí/bộ; yêu thích, chọn bìa và tải xuống vẫn đúng. Ảnh ngoài vùng tải chưa bắt đầu tải chính chỉ vì dựng grid.


### 24.8. Khung danh sách hiện trước dữ liệu/ảnh khi F5 — 20/10/2026

Phạm vi user: chỉ `CollectionsPage.tsx` và script fixture. Bỏ `return null` khi auth đang khởi tạo; tiêu đề, mô tả khách, tìm kiếm, lọc/sắp xếp và skeleton dùng sẵn xuất hiện ngay khi module trang mount, không chờ API. Chừa dòng số lượng để khi có dữ liệu không đẩy tiêu đề xuống. Bộ lọc luôn xuất hiện cả khi danh sách rỗng/lỗi. Trong lúc auth chưa rõ, khóa input/lọc/sắp xếp ngắn hạn để reset phiên không xóa chữ vừa gõ; auth xong có thể nhập ngay khi API danh sách còn chờ. Không nháy “chưa có bộ sưu tập” trước lần tải đầu. API xong hiện metadata thẻ, ảnh hoàn tất độc lập; refresh nền giữ grid cũ. Không sửa App/global overlay dùng chung admin: tải chunk/khởi động ứng dụng vẫn có độ trễ, không hứa body xuất hiện trước JavaScript.

Bằng chứng: fixture Edge 1440×900 sáng/tối giữ riêng ba promise auth/API/ảnh, PASS shell + skeleton trước auth, không có empty giả, tìm kiếm giữ chữ khi API trả về, thẻ và tên hiện trước ảnh chậm; recovery sáng/tối PASS giữ cache/filter và draft khi offline→online. Đã xem screenshot skeleton sáng. Build PASS; ESLint file sửa 0 lỗi/cảnh báo; `npx tsc -b` vẫn 30 diagnostic ngoài phạm vi, lint repo vẫn 67 error/236 warning. Không nghiệm thu responsive, không thay dấu cũ, chưa commit.

- [ ] COL-24 — F5 `/collections`: tiêu đề và thanh tìm kiếm/bộ lọc hiện ngay khi trang mount, dưới là skeleton; không trắng body chờ auth/API, không thoáng hiện thông báo rỗng. Auth xong nhập tìm kiếm khi dữ liệu còn tải; chữ còn nguyên sau khi tải xong.
- [ ] COL-25 — Mạng ảnh chậm: tên bộ và thẻ xuất hiện trước ảnh; khi ảnh hiện không đẩy khung. Offline/lỗi vẫn có thông báo + thử lại; cập nhật nền giữ thẻ đang xem. Các điều khiển hiện cả khi danh sách rỗng.


### 24.9. Sửa body còn bị global loader che — 20/10/2026

Người dùng kiểm lại 24.8 và báo body vẫn load nguyên khối; giữ ca COL-24/25 chưa nghiệm thu. Lần trước chỉ kiểm shell khi chờ auth/API, chưa ép trạng thái `global-loading-active`: bỏ sót CSS `GlobalLoadingOverlay.css` đặt visibility hidden/opacity 0 lên `.collections-page`, rồi fade lại sau khi global loader tắt. Đã thêm thuộc tính `data-loading-scope="local"` và quy tắc trong CSS riêng trang để shell luôn visible/opacity 1, không transition toàn trang ở cả hai trạng thái global loader. Không sửa App, overlay/store chung hoặc admin. Lazy route vẫn cần thời gian tải JavaScript trước khi component mount.

Fixture `test-collection-shell.cjs` nay ép class global loader và kiểm computed visibility/opacity: trước sửa FAIL opacity, sau sửa PASS sáng/tối; các ca shell/auth/API/ảnh và recovery offline/online PASS. Kiểm đọc localhost Edge 1440×900: header xuất hiện ~303 ms, module trang mount ~433 ms với visibility visible/opacity 1 trong lúc global loader còn bật; loader tắt ~682 ms mà visibility/opacity của trang không thay đổi. Đây là một lượt dev, không phải benchmark production hoặc cam kết body/header xuất hiện cùng một frame. Đã xem screenshot local. Build PASS, lint file sửa 0; TypeScript còn 30 diagnostic và lint repo còn lỗi cũ ngoài phạm vi. Chưa commit; responsive vẫn vòng cuối.

- [ ] COL-26 — F5 danh sách khi mạng chậm: sau khi khung trang xuất hiện, nó không bị ẩn hoặc fade nguyên body vì request/global loader khác; chỉ skeleton/dữ liệu/ảnh thay đổi cục bộ. Kiểm lại trên trình duyệt người dùng.


### 24.10. Tách khung trang khỏi module danh sách — 20/10/2026

Người dùng yêu cầu thực hiện tách hai vùng sau khi 24.8–24.9 vẫn chưa đạt cảm nhận khi F5. `App.tsx` đổi riêng import route user `/collections` từ lazy sang eager để khung trang được dựng cùng lượt với header; không thay logic/route admin. `CollectionsPage` giữ tiêu đề, bộ lọc, state editor và luồng đọc/reconnect hiện có. Phần kết quả được chuyển sang `components/collection/CollectionsResults.tsx`, lazy trong Suspense cục bộ; dùng lại store, filter utility, card, skeleton và error component, không nhân đôi dữ liệu. Props truyền danh sách browse đã đối chiếu và callback sửa/xóa. Boundary riêng giữ lỗi tải module ở vùng kết quả, có tải lại trang; không làm mất khung phía trên. Dữ liệu API và ảnh vẫn tải độc lập; số lượng/tag chỉ bổ sung khi biết dữ liệu.

**Bằng chứng:** fixture Edge 1440×900 sáng/tối chặn riêng request chunk CollectionsResults, auth, API và ảnh: shell visible/opacity 1 trước khi release chunk; node header giữ nguyên sau khi thẻ hiện; nội dung tìm kiếm không mất khi API xong; metadata thẻ hiện trước ảnh. Giả lập abort chunk: lỗi cục bộ, tiêu đề và bộ lọc còn hiển thị. Recovery offline/online sáng/tối PASS. Hồi quy toàn danh sách sáng/tối PASS tạo/sửa/xóa, lỗi/retry, timeout, dialog focus/Escape, offline/online, rỗng và Back; lượt đầu timeout chờ dialog trong lúc build lại dist, lượt chạy riêng sau build ổn định PASS. Đo chỉ đọc localhost dev sau sửa: header và `.collections-page` cùng xuất hiện tại frame khoảng 472 ms, opacity 1; lượt trước header 303 ms, trang 433 ms. Chỉ đối chiếu thứ tự xuất hiện trong các lượt riêng, không kết luận tổng thời gian nhanh hơn từ hai phép đo khác phiên. Build entry gzip tăng khoảng 331,72 → 335,06 kB do nạp sớm khung (~3,34 kB); results chunk riêng ~1,88 kB gzip. Còn cảnh báo entry lớn có sẵn.

Build PASS; ESLint hai file user 0; `npx tsc -b` còn 30 diagnostic ngoài phần sửa; lint toàn repo còn 67 error/236 warning như trước. Đã xem screenshot khung đang chờ chunk. Không sửa code/inventory admin, hook settings hoặc overlay chung. Chưa commit, giữ dấu nghiệm thu trước; responsive vẫn vòng cuối.

- [ ] COL-27 — F5 `/collections` trên trình duyệt đang dùng: vùng đỏ (tiêu đề/tìm kiếm/sắp xếp) hiện cùng header và giữ nguyên; chỉ vùng kết quả bên dưới chờ module/dữ liệu/ảnh. Kiểm cả lần cache lạnh và reload thường.
- [ ] COL-28 — Khi kết quả đang tải, nhập tìm kiếm sau khi auth xong: dữ liệu về vẫn giữ chữ; tạo/sửa/xóa, mở bộ rồi Back, offline/online vẫn đúng. Nếu module danh sách không tải được, chỉ vùng kết quả báo lỗi + Tải lại trang.


### 24.11. Chống chớp màu trước JavaScript khi refresh — 20/10/2026

Người dùng yêu cầu xử lý sau khi đối chiếu cảm nhận header Unsplash. **Nguyên nhân đã tái hiện trên localhost:** giữ request `/src/main.tsx` chưa hoàn tất, chọn theme dark nhưng trước CSS/JS body/root vẫn có nền `rgb(250,248,244)` (#FAF8F4). Script đầu chỉ đặt class dark, chưa cung cấp màu; cache palette chỉ được khôi phục trong main. Đây là bằng chứng chớp màu khởi động, không xác nhận kiến trúc Unsplash.

**Sửa:** `frontend/index.html` (file khởi động chung, nhánh mới chỉ cho public, bỏ qua `/admin`): trước lần vẽ đầu cung cấp 4 màu nền/header/chữ/border của hai theme hoặc cache hợp lệ; chỉ nhận HEX 6 chữ số, fallback theo bảng mặc định trong shared/sitePalette.json. Dùng lại style `site-palette` để runtime thay thế/tiếp quản, không sửa paletteRuntime/useSiteSettings. Đưa meta theme-color trước bootstrap và chọn đúng màu ngay. Riêng `/collections` và chi tiết: lúc root còn rỗng, thay camera có animation bằng canvas + dải màu header tĩnh, biến mất tự nhiên khi React mount. Không cache HTML tài khoản, không giữ DOM cũ, không giả SSR. Logo/chữ/nút header vẫn đợi JS; chưa giải quyết khoảng chờ do dựng header bằng client rendering.

**Đối chiếu:** sau sửa cùng điều kiện localhost giữ main chưa tải, dark body/root là `rgb(36,32,23)` (#242017), light vẫn #FAF8F4. Có screenshot dev trước JS: `frontend/qa-policy-checkbox/public-startup-dev-before-js.png`. Fixture bản build Edge 1440×900 `test-public-startup.cjs` chặn entry JS và CSS, PASS light/dark/cache palette riêng, JSON cache hỏng, màu sai định dạng/sai kiểu, storage bị chặn và nhánh bootstrap admin không đổi. Sau giải phóng tài nguyên: màu body và header khớp trước/sau, chuyển theme vẫn đúng. Đây không phải benchmark thời gian production hoặc nghiệm thu mobile.

Build PASS; `npx tsc -b` còn 30 diagnostic cũ, lint repo còn 67 error/236 warning. Header surface unit PASS; shell/module/API/ảnh và recovery bộ sưu tập sáng/tối PASS. **Ca cũ ngoài sửa chưa PASS:** `test-header-scroll.cjs:20` đòi homepage cinematic-active tại scrollY=700, trong khi code ImmersiveHomeChrome hiện chỉ bật ở scrollY<=12; cả script và component đó không được sửa trong lượt này. Không đổi hành vi trang chủ để làm test cũ qua. Đã xem screenshot trước JS; responsive để vòng cuối. Chưa commit, giữ dấu nghiệm thu.

- [ ] COL-29 — Chọn sáng/tối rồi F5 `/collections`: không lóe nền sáng sai theme; vùng header và canvas giữ đúng màu ngay cả lúc bundle chậm. Logo/chữ vẫn hiện khi JS sẵn sàng, không coi đây là HTML render sẵn trên server.
- [ ] CDET-15 — Kiểm tương tự khi F5 chi tiết bộ; sau tải xong đổi theme qua lại vẫn đúng. Kiểm lần đầu không cache, reload thường và settings đổi bảng màu thật.


### 24.12. Header còn chớp và nhãn đổi vị trí khi F5 — 21/10/2026

**Phản hồi người dùng:** 24.11 chưa đạt: header còn chớp và các nhãn đổi vị trí. Không đổi dấu nghiệm thu cũ. **Đo trước sửa:** Edge headless 1705×900 và 1200×900, build local, auth fixture chậm 900 ms, cold load + F5. Nhóm actions tăng từ 44 lên ~295 px khi guest auth kết thúc; nhãn đầu dịch **125,7 px** ở 1705 và **82,4 px** ở 1200. Font loading→loaded không thay đổi vị trí trong các lượt này. HTML lúc đầu chưa chứa logo/nhãn, nên chỉ chống chớp màu như 24.11 chưa giải quyết được việc chúng biến mất rồi xuất hiện.

**Sửa:** thêm plugin Vite `vite-plugin-public-header.ts` render sẵn logo và điều hướng công khai vào HTML cho vùng startup collections. Nội dung dùng một nguồn `src/config/publicHeader.ts`, được cả Header/LOGO_CONFIG và plugin dùng lại; CSS `HeaderFrame.css` dùng chung cho HTML startup/React và inline vào head. Không nhân bản HTML tài khoản. Startup chrome `aria-hidden` + inert, không có thao tác/tài khoản giả; Header bỏ nó trong layout effect khi React đã có chrome thật. Đây là prerender phần chrome công khai, không phải chuyển cả app sang SSR/hydration.

Header chia track rõ, menu không còn bị chiều rộng auth/actions kéo qua lại. Chọn font hệ thống Arial cho chrome để hình học ổn định trước bundle/font; giữ link/menu/hover/focus. Ở desktop hẹp, phần actions có vùng riêng và nút đặt lịch thu gọn còn icon có tên truy cập; icon vẫn rõ cả dark. Dưới 1280 track dành chỗ cho bộ nút nhiều quyền, nav có thể cuộn nếu chật để không đè nhau (chưa nghiệm thu responsive). CSS cố định header theo 100vw: đã phát hiện riêng trên Vite dev còn lệch **4 px** do header đổi 1705→1697 px khi CSS chứa gutter được áp dụng; đã sửa và thêm kiểm trước-CSS→sau-CSS.

**Kết quả:** `test-header-refresh.cjs` PASS 6 ca guest light/dark, member, admin trong user header, phiên hết hạn; viewport 1705/1200 và kiểm tránh đè ở 1000. Giữ entry JS rồi giải phóng, auth chậm và font chậm 700 ms: logo ổn định, nhãn **0 px dịch**, không frame trống ở chuyển giao HTML→React, cùng màu header và không đè actions. `test-public-startup.cjs` nay kiểm cả tọa độ trước khi CSS ứng dụng tải, PASS theme/cache/error cases và nhánh admin bootstrap cũ. Đối chiếu localhost dev cold+F5 ở 1705 và 1200 với API guest fixture: **0 px** qua tất cả giai đoạn, màu header không thay đổi. Đây là dữ liệu local/fixture, không phải đo mọi trình duyệt/production hoặc xác nhận thay người dùng. Đã xem ảnh static light + ready dark và xác nhận icon đặt lịch sau lượt sửa.

**Hồi quy/check:** shell/module/API/ảnh, startup theme, collection recovery sáng/tối và toàn bộ danh sách sáng/tối PASS (tạo/sửa/xóa/retry/timeout/dialog/offline/Back). Header surface unit PASS. Build PASS (chunk lớn cũ); ESLint phần sửa 0 error/warning; lint repo còn 67 error/236 warning cũ. `npx tsc -b` giảm 30→28 diagnostic do sửa kiểu native PointerEvent cho listener pointerdown đang nằm trong Header; 28 diagnostic còn lại ngoài thay đổi. Test cuộn homepage cũ ở 24.11 chưa sửa vì ngoài phạm vi.

**Phân loại:** user: Header/HeaderFrame/publicHeader/logo config và script kiểm; chung phục vụ build/khởi động: index.html, vite.config.ts/plugin, tsconfig.node.json và override ESLint chỉ cho plugin mới. Không sửa mã/inventory admin, useSiteSettings hoặc paletteRuntime; đã tra phụ thuộc admin. HTML startup chỉ hiện tại collections, các route khác vẫn dùng Header React; không tự bật prerender cho hero/home/auth. Giữ dấu cũ, responsive vòng cuối, chưa commit. Bằng chứng local bị ignore: `header-refresh-{before,after-local}.json`, `header-refresh-regression.json`, `header-{static,ready}-{light,dark}.png`, `header-stable-{build,types,focused,lint}.txt`.

- [ ] COL-30 — F5 `/collections` ở sáng/tối: logo/nhãn đã có ngay trong HTML, không lóe/mất rồi hiện lại khi React tiếp quản; nhãn giữ vị trí khi đăng nhập xong, guest/member/admin hoặc cookie hết hạn.
- [ ] COL-31 — Kiểm cache lạnh và reload thường; các link header vẫn điều hướng đúng, theme toggle đúng, nút Đặt lịch chụp mở/đóng dialog. Menu không đè nhóm tài khoản. Responsive riêng chưa đánh đạt.


### 24.13. Đánh giá áp dụng logic menu đã đạt cho logo/actions/body — 21/10/2026

Người dùng xác nhận riêng menu điều hướng ở ảnh 3 đã đạt (không chớp/không xê dịch). Logo, ba nút bên phải và vùng tiêu đề/bộ lọc ảnh 2 vẫn chưa đạt. Không đánh đạt cả COL-30/31 vì chúng còn gồm các phần chưa được xác nhận.

Kiểm chỉ đọc localhost Edge 1705×900, giữ main chưa tải rồi giải phóng, API guest fixture: trước main menu có 5 nhãn; logo width 135,015625 px, text-rendering auto, ligatures normal, font smoothing auto. Sau main logo width 135,9375 px, text-rendering optimizelegibility, ligatures common-ligatures, smoothing antialiased. Chênh lệch glyph/chiều rộng này chưa được ca đo chỉ tọa độ sau CSS trước đây bao phủ. Trước main có 0 right controls và chưa có collections-header; sau main có 3 controls và có collections-header. Không suy ảnh chụp tĩnh thành bằng chứng toàn bộ animation; các khác biệt lifecycle/style trên được đo thực.

Đánh giá khả thi: logo cần đồng nhất đầy đủ typography từ CSS critical; theme/booking là phần public có thể render sớm, còn Đăng nhập/account cần giải quyết auth chưa biết để không lóe sai trạng thái. Vùng title/subtitle/search/sort có thể prerender như menu; count/tags là dữ liệu động, phải bổ sung sau API hoặc dùng cache public có kiểm tra/hạn dùng và đối soát, không bịa count/tag hoặc cache thông tin riêng. Các vùng nên dùng cùng source trình bày/critical CSS để tránh hai bản markup lệch nhau. Lượt này đánh giá, chưa sửa thêm source; fixture đo local `frontend/qa-policy-checkbox/assess-remaining-flash.cjs` bị ignore. Responsive chưa nghiệm thu.

- [x] ~~COL-32 — Riêng menu điều hướng ở ảnh 3: người dùng xác nhận không chớp và không xê dịch khi refresh. Giữ nguyên hành vi đã đạt; không mở rộng dấu này sang logo/actions/body hoặc responsive.~~

### 24.14. Đồng nhất logo, nút public và khung tiêu đề trước/sau React — 21/10/2026

Theo yêu cầu triển khai tiếp: dùng chung component thuần `PublicHeaderActions` và `CollectionsToolbar` cho HTML startup do Vite render và React. CSS critical lấy cùng nguồn với CSS runtime; đồng nhất typography logo (ligatures, text rendering, smoothing), control font và hình học khung. Giữ menu COL-32 đã nghiệm thu. Title/subtitle/search/sort hiện trước JavaScript; count/tag chỉ bổ sung từ API, có vùng dành sẵn để không đẩy điều khiển. Grid/ảnh tiếp tục tải độc lập. Startup markup inert/aria-hidden được bỏ trong layout effect khi React tiếp quản, không giữ DOM hoặc dữ liệu riêng của phiên cũ.

Theme/đặt lịch là public nên hiện sớm. Lần đầu chưa biết auth, chừa chỗ Đăng nhập đến khi xác định guest; guest đã xác định trong cùng phiên có hint sessionStorage để reload không mất nhãn. Hint không chứa danh tính/token và không cấp quyền. Account hoặc phiên hết hạn vẫn chuyển trạng thái theo auth thật. Dùng bảng màu mặc định từ shared/sitePalette.json tại build, không nhân bản bảng màu hoặc sửa hook settings.

**Bằng chứng:** Edge headless, bản build local và localhost:5173 (API fixture chặn riêng auth/data), viewport 1705/1200, vi/en, light/dark, guest đã biết và lần đầu chưa biết: trước entry → React → auth → API, các vùng đo dịch **0 px**; crop logo trước/sau có hash pixel giống hệt. Đối chiếu localhost trước đây logo rộng 135,015625→135,9375 px; nay cùng 135,9375 px. Đã xem ảnh trước JS sáng và sau dữ liệu tối. Test `test-public-toolbar.cjs` PASS cả 4 ca, kiểm thêm theme, booking dialog, tìm kiếm và guest reload. Header regression PASS 6 ca guest/member/admin/expired, delayed font và tránh đè ở 1000 px; startup palette/storage/admin bootstrap PASS; collection recovery và toàn danh sách sáng/tối PASS tạo/sửa/xóa/retry/timeout/dialog/offline/Back. Fixture không chứng minh tốc độ production; responsive và thiết bị thật chưa nghiệm thu.

**Chi phí/check:** HTML gzip 4,76→9,28 kB, entry JS gzip 335,11→335,80 kB, tổng tăng khoảng **5,21 kB gzip** so với bản trước lượt này. Không thêm request API/ảnh cho startup. Build PASS (cảnh báo chunk lớn có sẵn); ESLint phần sửa 0; `npx tsc -b` vẫn 28 diagnostic ngoài phần sửa; lint repo còn 67 error/236 warning cũ. `git diff --check` PASS. Ca homepage scroll cũ nêu ở 24.11 vẫn ngoài phạm vi.

**Phạm vi:** user: Header/HeaderFrame, PublicHeaderActions, CollectionsToolbar và CollectionsPage cùng CSS/script kiểm; chung phục vụ khởi động/build: index.html, plugin public header, tsconfig.node.json. Không sửa admin, inventory admin hoặc useSiteSettings. Giữ dấu nghiệm thu cũ, chưa commit. Log/ảnh đo ở frontend/qa-policy-checkbox/toolbar-* bị Git ignore.

- [ ] COL-33 — Reload thường `/collections` sau khi trang đã tải: logo giữ nguyên nét/vị trí, menu đã đạt vẫn ổn định; thử sáng và tối.
- [ ] COL-34 — Guest reload: theme/Đăng nhập/Đặt lịch không mất rồi hiện lại; nút vẫn hoạt động. Lần đầu chưa biết auth được chừa vị trí Đăng nhập đến khi xác định phiên; đăng nhập/đăng xuất và cookie hết hạn phải hiện đúng quyền.
- [ ] COL-35 — F5 khi mạng chậm: tiêu đề/mô tả/tìm kiếm/sắp xếp giữ vị trí; count/tag xuất hiện theo dữ liệu thật, chỉ phần kết quả/ảnh chờ tải. Nhập tìm kiếm sau auth vẫn giữ chữ khi API xong. Kiểm lại bằng mắt trên trình duyệt người dùng, chưa nghiệm thu responsive.

### 24.15. Sửa chớp cụm tài khoản, nút tạo và hình dạng tag; chuyển số lượng về kết quả — 21/10/2026

Người dùng báo tương đối ổn nhưng các phần trên còn chớp, chưa xác nhận đạt COL-33–35. Xác nhận CSS global áp `border-radius:8px!important` sau khi critical CSS đã vẽ tag dạng pill và theme/booking 6px; kiểm localhost trước/sau main tái hiện radius 6→8 ở nút header. Kiểm trước chỉ tọa độ/logo chưa bao phủ hình dạng nút. Đã đồng nhất radius ngay trong critical CSS, giới hạn transition tag vào màu/border. Không sửa CSS global dùng chung admin.

HTML ban đầu trước đây chỉ có guest controls, trong khi React khôi phục cụm tài khoản; create chỉ xuất hiện sau profile. Nay dùng chung `AccountHeaderFrame` cho startup/React, có slot booking/quản trị/chuông/avatar cố định. Hint `publicChromeHint` chỉ chứa guest/member/manager/admin trong sessionStorage, dùng để giữ hình khung; không chứa tên, ảnh, token hoặc số thông báo và không cấp quyền. Avatar thật vẫn chờ profile/ảnh trong ô cố định; badge thông báo từ dữ liệu thật. Nút tạo nhớ hình khung admin nhưng disabled cho đến khi auth/profile thật xác nhận quyền. Hết phiên hoặc đổi quyền thì gỡ đúng nút; các link/thao tác có quyền chỉ dựa vào dữ liệu thật. Khách không còn chờ auth để thấy nhãn Đăng nhập. Bỏ hint guest cũ và nhánh CSS pending không còn dùng. Việc khôi phục trạng thái tài khoản lần đầu chưa có hint vẫn có thể đổi giao diện khi xác định phiên; không hứa dựng trước danh tính cá nhân.

Chuyển số lượng khỏi dòng eyebrow trên tiêu đề sang dòng phụ ngay trên kết quả, dưới bộ lọc; đếm danh sách đã lọc thực tế (kể cả 0 sau khi tải thành công). Vị trí này gắn với kết quả tìm kiếm/lọc, tránh dữ liệu đến muộn xuất hiện phía trên heading. Giữ tiêu đề/mô tả không phụ thuộc dữ liệu. Startup toolbar được gỡ trong layout effect khi React commit để tránh cùng tồn tại thêm một frame do effect/requestAnimationFrame. Markup/CSS trình bày dùng chung, không cache bản sao danh sách.

**Kiểm:** Edge headless bản build local và localhost:5173 với API fixture; guest sáng/tối, vi/en, 1705/1200: logo vẫn giống pixel, vị trí 0 px dịch, kiểm thêm radius/background của tag và nút. Account member/admin/cookie hết hạn tại 1705: startup→React→profile giữ hình học/màu/radius các slot và nút tạo; expired chuyển guest, bỏ create và cập nhật hint; admin đã xác nhận mới bật và mở được dialog tạo. Đã xem batch ảnh startup admin, ready admin và guest tối. Hồi quy header 6 ca và startup palette/storage/admin bootstrap PASS. Toàn danh sách sáng/tối PASS tạo/sửa/xóa, retry, timeout, focus/Escape, Back, offline/online; recovery PASS. Script browser cũ từng đọc title boundingBox khi link Back của loading shell vừa xuất hiện: sửa điểm chờ thành heading chi tiết thật, không sửa hành vi trang chi tiết.

Build PASS (cảnh báo chunk lớn có sẵn); focused ESLint 0; `npx tsc -b` còn 28 diagnostic ngoài phần sửa; lint repo còn 67 error/237 warning ngoài phần sửa. Không dùng kết quả fixture để tuyên bố tốc độ production. Phạm vi user: Header/PublicHeaderActions/AccountHeaderFrame, CollectionsToolbar/Results/Page, utility hint và script kiểm; chung khởi động/build: index.html/plugin public header. Không sửa admin, inventory admin hoặc useSiteSettings. Giữ dấu nghiệm thu, responsive vòng cuối, chưa commit.

- [ ] COL-36 — Sau khi trang xác định phiên, F5 khi guest/member/admin: cụm phải giữ đúng kiểu khung, không đổi nguyên cụm guest→account khi phiên không thay đổi. Avatar và badge được bổ sung từ dữ liệu thật trong vị trí cố định; cookie hết hạn phải chuyển guest đúng.
- [ ] COL-37 — Admin F5: nút Tạo bộ sưu tập có khung sẵn, chưa bấm được khi chưa xác nhận quyền; xác nhận xong mở/đóng dialog được. Guest/member không có nút tạo sau khi auth hoàn tất; đổi hoặc hết quyền không giữ nút cũ có thể thao tác.
- [ ] COL-38 — F5 cache lạnh và thường: tag Tất cả giữ cùng hình bo góc trước/sau CSS; theme/booking cũng không đổi radius. Chọn tag, lọc và sắp xếp vẫn đúng.
- [ ] COL-39 — Số lượng dưới bộ lọc, ngay trước kết quả: tìm kiếm/chọn tag cập nhật theo số bộ đang thấy; khi chưa tải không in số giả, lỗi không bị mô tả là 0 kết quả. Kiểm lại bố cục bằng mắt, chưa nghiệm thu responsive.

### 24.16. Rà lỗi refresh thỉnh thoảng mất nút khi đã đăng nhập — 21/10/2026

Người dùng báo còn khoảng 10% và xác nhận cả cụm header lẫn nút Tạo khi đã đăng nhập; không đánh đạt các ca liên quan. Đã tìm được một nguyên nhân tái hiện: HTML startup mặc định chứa guest actions/toolbar không có create, rồi script activation phía sau thay DOM theo hint. Khi HTML đến nhiều phần, browser có thể vẽ phần mặc định trước khi nhận script, nên kiểm chỉ sau activation bỏ sót. Edge headless, localhost:5173 qua proxy chỉ phục vụ đo, API fixture admin, 1705×900: 10 lượt, trong đó 2 lượt cố ý chia HTML trước script activation và giữ 160 ms; cả 2 lượt đó ghi frame guest/create thiếu trước khung admin. Tỷ lệ 2/10 của phép thử có chủ đích không phải ước lượng tỷ lệ lỗi thật người dùng.

**Sửa:** startup chứa sẵn các biến thể trình bày public; CSS critical chọn guest/member/admin theo hint ở head, không còn script replaceChildren/replaceWith để đổi cụm actions hoặc thêm create. Toolbar dùng một bản, nút create disabled được CSS chọn ngay; bỏ template toolbar admin trùng. Header React chọn giao diện từ cùng `publicChromeHint`, không đọc thêm `hasAuth` làm nguồn chọn cụm khác với startup. Legacy hasAuth vẫn được ghi cho consumer thông báo hiện có; không sửa store/auth chung. Trước token dùng bell placeholder trong slot sẵn, tránh truyền component có thể return null. Không cache danh tính/ảnh/token, không dùng hint cấp quyền; hết phiên thật vẫn chuyển guest và bỏ create.

**Đối chiếu trên mã cuối:** 60 lượt refresh liên tiếp localhost với API fixture, 12 lượt cố ý chia HTML, luân phiên độ trễ refresh 0/15/70/180 ms và profile 150/0/40 ms; ghi **10.629 frame, 0 frame sai/mất cụm account hoặc create** trong điều kiện đo. Đây là kiểm DOM/computed visibility từng requestAnimationFrame; không phải video thiết bị thật hoặc bằng chứng loại hết mọi nguyên nhân ngoài môi trường này. Lượt 40 lần trước đó cũng PASS; không cộng gộp để tăng số mẫu của mã cuối. Script `frontend/scripts/test-refresh-race.cjs`, JSON trước/sau trong frontend/qa-policy-checkbox/refresh-race-{before,}.json bị ignore.

Hồi quy build và localhost PASS guest sáng/tối vi/en, member/admin/expired, theme/booking/search, đúng quyền tạo, logo pixel và vị trí; header 6 ca, startup màu/storage/admin bootstrap và recovery bộ sưu tập PASS. Đã xem batch startup admin/guest. Build PASS, focused lint 0; `npx tsc -b` vẫn 28 diagnostic ngoài phần sửa; lint repo 67 error/237 warning ngoài phần sửa; diff check PASS. Thay đổi bổ sung user: Header, HeaderFrame CSS và script kiểm; chung build: plugin public header. Không sửa admin, useSiteSettings hoặc auth store chung. Giữ toàn bộ dấu nghiệm thu, responsive vòng cuối, chưa commit.

- [ ] COL-40 — Khi đã đăng nhập, refresh thường nhiều lần (kể cả mạng chậm): cụm tài khoản và Tạo bộ sưu tập không mất rồi hiện lại khi phiên giữ nguyên; menu đã đạt vẫn ổn định. Nếu cookie thực sự hết hạn, giao diện phải chuyển guest đúng. Kiểm lại trên trình duyệt người dùng; không tự nghiệm thu từ 60 lượt fixture.


### 24.17. Sửa luồng khôi phục đăng nhập khi refresh liên tiếp — 21/10/2026

Người dùng cho phép sửa auth dùng chung vì lỗi quan trọng. **Trước sửa:** fixture Edge/bản build trả refresh 429 hoặc 503 đều hiện Đăng nhập, gỡ create và ghi hint guest giống 401. Store kết thúc isInitializing dù chưa xác định phiên; Header suy token rỗng thành guest. Interceptor còn clearAuth khi lỗi không có status, đổi lỗi refresh 429 thành 401 gốc, và chỉ gom request interceptor với nhau, chưa gom với startup/socket. WebSocket có nhánh clearAuth và yêu cầu đăng nhập lại với mọi lỗi refresh. Guard user dùng timeout 15 giây như bằng chứng cần chuyển signin; guard admin cũng chuyển signin khi chưa tải được hồ sơ. Đây là lỗi logic đã tái hiện; chưa kết luận phản hồi/cookie nào xuất hiện trong phiên thật người dùng. Backend refresh không rotate cookie theo mỗi request; không sửa backend hoặc dữ liệu thật.

**Đã sửa:** auth có sessionError để phân biệt chưa xác minh với guest; HTTP refresh dùng một promise theo phiên tại authService, dùng chung cho startup/interceptor/socket. Khởi tạo thử tối đa 3 lần, có khoảng chờ và đọc Retry-After; cooldown dài không tạo vòng tự thử lại. Hủy điều hướng không tự thử tiếp; đăng xuất hủy timer chờ, request/kết quả cũ bị chặn theo version phiên. Lỗi tạm thời giữ token nếu đang có, giữ hint trình bày nhưng không cấp quyền. Chỉ 401/403 xác nhận phiên bị từ chối mới xóa auth; mã lỗi CSRF không được xem là từ chối phiên. Interceptor trả nguyên lỗi tạm thời, không đổi thành 401; request retry được đăng ký lại để hủy khi reload.

Sau khi hết số lần tự thử, có thông báo Chưa xác minh được phiên + Thử lại; online/hiện lại tab có thể thử phục hồi, không có spinner vô hạn. Header không ghi guest khi chưa xác minh, create giữ khung nhưng disabled đến khi quyền thật có. Profile lỗi 429/503/dữ liệu sai có phản hồi và retry; không giữ guard chờ Retry-After dài hoặc lặp fetch vô hạn vì thiếu user. Dữ liệu profile vẫn có version và chống request trùng. ProtectedRoute/AdminRoute dùng chung SessionGate: chờ xác minh, có phục hồi, không redirect chỉ vì lỗi mạng/timeout; chỉ render Outlet sau token + profile thật, admin cần quyền thật. Thành viên vào admin vẫn bị chuyển về trang chủ và giữ đăng nhập. AuthInitializer bỏ AbortController giả vốn không truyền vào request; có cleanup listener online/visibility. WebSocket không clearAuth/đòi đăng nhập lại vì lỗi tạm thời, và kiểm version trước dùng token/clearAuth để tránh phiên cũ ảnh hưởng phiên mới.

**Bằng chứng:**
- Unit client/interceptor dùng Axios thật với adapter fixture: 8 request 401 đồng thời chỉ 1 HTTP refresh; startup/interceptor/service cũng cùng flight; 429/503/network/timeout/200 sai payload giữ token + version và trả đúng lỗi; 401 thật xóa phiên; logout trong lúc đợi retry hủy lịch; request/profile/token cũ không ghi đè tài khoản mới, sign-in chờ sign-out cookie cũ hoàn tất. Guest 401 không hủy request public. PASS `test-auth-refresh-client.cjs`, `test-auth-account-switch.cjs`.
- Edge headless 1440×900, localhost:5173 và bản build local, API/Socket.IO fixture: 429→thành công sau 3 lần; 503 kéo dài rồi manual retry; lỗi mạng rồi online; hồ sơ 503/429 có Retry-After dài/200 sai dữ liệu rồi retry; guard admin gặp 503 giữ URL và phục hồi; member bị từ chối admin vẫn giữ phiên; 401/403 thật chuyển guest. Socket.IO mô phỏng auth error rồi HTTP refresh 503 giữ phiên. 10 lần reload khi request còn chờ không ghi guest. PASS `test-auth-recovery.cjs`; đã xem ảnh lỗi sáng/tối. Không dùng tài khoản thật hay ghi dữ liệu thật để thử.
- Mã cuối trên localhost qua proxy đo, admin fixture 1705×900: **40 lượt refresh**, xen kẽ thành công, 2 lần 429 trước thành công, network abort hoặc 503 trước thành công; 8 lượt cố ý chia HTML trước activation, đổi thứ tự/độ trễ profile; **13.726 frame rAF, 0 frame mất account/create hoặc vẽ guest sai**. Socket mạng thật được chặn trong phép đo. `test-refresh-race.cjs` với REFRESH_FAULTS=1, JSON `frontend/qa-policy-checkbox/auth-refresh-race.json` bị ignore. Không cộng với 60 lượt chỉ thành công ở 24.16, không tuyên bố tỷ lệ lỗi production bằng phép đo fixture.
- Hồi quy header 6 ca, toolbar guest vi/en sáng/tối, member/admin/expired, theme/booking/search PASS; toàn danh sách sáng/tối tạo/sửa/xóa/retry/timeout/focus/Back/offline và recovery PASS. Cache test PASS: API tài khoản không replay tài khoản cũ khi offline, cache ảnh giữ nguyên.

Build PASS (cảnh báo chunk lớn cũ); focused ESLint auth/store/service/guard/header/axios/utility 0. `npx tsc -b` còn **25 diagnostic** ngoài phần sửa (28 trước lượt này; sửa lỗi kiểu guard và cleanup signal đang chạm). Hook WebSocket vẫn có diagnostic so sánh reason cũ; không tuyên bố toàn hook sạch lỗi cũ. Lint toàn repo còn 65 error/220 warning sẵn có ngoài phần auth vừa sửa, kết quả ghi tại auth-lint.txt. Diff check PASS. Log/ảnh fixture trong frontend/qa-policy-checkbox/auth-* bị ignore. Không dùng build/lint hoặc fixture làm nghiệm thu production.

**Phạm vi được người dùng cho phép:** user: Header, CollectionsPage; **chung có admin phụ thuộc:** auth/user store, authService, axios, AuthInitializer, ProtectedRoute/AdminRoute/SessionGate, panel phục hồi, useWebSocket (chỉ nhánh auth), types/store, utility sessionRecovery. Dùng một nguồn refresh, một guard và một panel thay các nhánh trùng. Không sửa frontend/src/pages/admin, components/admin, backend/controllers/admin, inventory admin hoặc useSiteSettings. Giữ các dấu nghiệm thu; responsive vẫn vòng cuối; chưa commit.

- [ ] AUTH-R01 — Đã đăng nhập, refresh liên tiếp cả lúc request chưa xong: không bị đưa thành guest hoặc yêu cầu đăng nhập lại khi chỉ lỗi mạng/rate limit; khung nút giữ nguyên, thao tác cần quyền chưa xác minh phải khóa.
- [ ] AUTH-R02 — Lỗi tạm thời kéo dài: thấy thông báo khôi phục phiên và Thử lại, không tự chuyển signin. Có mạng/Thử lại thành công thì avatar, quyền và thao tác phục hồi; không cần đăng nhập lại nếu cookie còn hợp lệ.
- [ ] AUTH-R03 — Cookie thật hết hạn/đã bị thu hồi hoặc người dùng đăng xuất: chuyển guest đúng, bỏ nút có quyền; không dùng hint để mở trang/thao tác riêng.
- [ ] AUTH-R04 — Vào URL cần đăng nhập khi mạng chậm/lỗi hồ sơ: URL giữ nguyên để thử lại; không render nội dung riêng trước khi xác minh. Thành viên không có quyền không vào được admin.
- [ ] AUTH-R05 — Đổi tài khoản/đăng xuất lúc request đang chạy: kết quả phiên cũ không ghi đè tài khoản mới; Tab/Back/F5 và các hành vi bộ sưu tập đã nghiệm thu vẫn đúng. Kiểm trên phiên thật, chưa tự đánh đạt bằng fixture.


### 24.18. Không báo lỗi khi refresh hủy request, gom nội dung phục hồi — 21/10/2026

Người dùng báo không còn lỗi mất đăng nhập như trước, nhưng đôi lúc refresh liên tục thấy hai nội dung Không thể tải thông tin tài khoản / Chưa xác minh được phiên. Source hiện chỉ có một recovery panel; chưa có bằng chứng hai node panel đồng thời. Hai nhánh lỗi có thể lần lượt thay nội dung trong cùng vị trí. Xác nhận catch của auth/profile vẫn ghi lỗi khi nhận CanceledError do beforeunload/pagehide hủy request; những ca trước chỉ kiểm không rơi về guest, chưa kiểm cảnh báo của tài liệu cũ.

**Sửa chung trong phạm vi auth đã được cho phép:** pageDeparture sở hữu trạng thái và version rời trang. Axios đánh dấu trước khi hủy request, chặn request mới của trang đang rời, reset khi pageshow. Cancel do rời trang không ghi sessionError/profileError hoặc kết luận guest; profile không khởi chạy lại lúc đang rời. Auth/refresh flight phân biệt lượt rời trang để request cũ không chặn lần khôi phục mới. Khi trang được giữ lại/quay lại, pageshow tiếp tục xác minh hồ sơ/phiên; listener có cleanup. Recovery panel bị ẩn ngay trong lúc rời trang, lỗi thật sau đó vẫn hiện. Một panel dùng cùng câu Chưa thể hoàn tất kiểm tra tài khoản. Vui lòng thử lại. cho cả lỗi hồ sơ và phiên; nút Thử lại vẫn chọn đúng luồng theo lỗi thực, không che lỗi kết nối thật.

**Kiểm:** Edge headless, localhost Vite ở cổng kiểm riêng và bản build fixture: giữ auth hoặc profile chậm 1000 ms, dispatch beforeunload nhưng cố ý giữ tài liệu cũ 350 ms để quan sát; không có cảnh báo visible, không hiện Đăng nhập và hint admin còn nguyên. Dispatch pageshow thì phục hồi được quyền thật, không còn cảnh báo. PASS `test-auth-departure.cjs`. Đây là mô phỏng lifecycle có kiểm soát, chưa phải nghiệm thu bfcache Back trên thiết bị thật. `test-auth-recovery.cjs` kiểm thêm đúng một notice và cùng nội dung ở 429/503/network/profile lỗi, retry/online thành công, member/admin/expired, Socket.IO lỗi tạm thời; 10 reload khi request đang chờ PASS. Unit single-flight, timeout/network, đổi tài khoản và logout trong thời gian chờ retry PASS. Đã xem batch ảnh notice sáng/tối.

Build PASS; focused lint các file sửa 0; `npx tsc -b` còn 25 diagnostic cũ ngoài thay đổi; diff check PASS. Log departure-{build,types,focused,lint}.txt trong frontend/qa-policy-checkbox bị ignore. Giữ các thay đổi dở và dấu nghiệm thu, không sửa code/inventory admin hay useSiteSettings; responsive vòng cuối; chưa commit.

- [ ] AUTH-R06 — Đã đăng nhập, refresh liên tục lúc phiên/hồ sơ chưa tải xong: không bật cảnh báo tài khoản/phiên chỉ vì request bị hủy, không rơi về guest. Thử hủy việc rời trang hoặc Back: vẫn phục hồi được trạng thái, không đứng ở chờ xác minh.
- [ ] AUTH-R07 — Lỗi kết nối thật kéo dài: chỉ một khung phục hồi với cùng nội dung; nút Thử lại hoặc online khôi phục đúng. Không hiện nối tiếp hai nội dung cũ, không che phiên thật đã hết hạn.


### 24.19. Khung refresh ổn định cho Chi tiết bộ sưu tập #6 — 21/10/2026

Người dùng yêu cầu áp dụng cơ chế không nháy của danh sách vào chi tiết. Trước sửa, trang lazy chưa có body trước module; nhánh loading dựng header khác hoàn toàn nhánh có dữ liệu. CSS global loader còn ẩn/fade nguyên collection-detail-page. Hook tải khi user chưa khôi phục, rồi scope guest→user xóa collection và tải lại; đây là nguồn thay khung/dữ liệu khi khởi tạo, không phải bằng chứng mọi ảnh bị tải lại từ mạng.

**Đã sửa:** CollectionDetailFrame là nguồn trình bày chung cho header thật và skeleton; CollectionDetailSkeleton dùng trong HTML startup do plugin render và trong React. Back/heading, khoảng metadata/actions và lưới placeholder có sẵn trước JavaScript, không chờ chunk hoặc auth/API. Page bỏ startup trong layout effect khi module mount; header thật dùng lại Frame, giữ các hành vi/nút đã có. Khung đánh data-loading-scope=local để global loader không ẩn/fade cả body. CSS header/layout được chuyển về một file dùng chung cho critical/runtime, giữ CSS responsive hiện có; bỏ loading spinner/CSS sidebar cũ không còn dùng. Khoảng metadata được chừa để dữ liệu thông thường không đẩy khung; tên/mô tả dài vẫn được phép nở tự nhiên.

Hook đợi khởi tạo phiên và profile có token trước lần đọc đầu, tránh đọc guest rồi xóa/tải lại khi user xuất hiện. Vẫn giữ scope route/tài khoản, cleanup và kiểm version của store; không cache title/mô tả/ảnh/quyền vào storage, không dựng nội dung riêng từ phiên cũ. Trên lần mở mới, heading chung Bộ sưu tập và placeholder chờ tên/mô tả/quyền thật từ API. Đây là ổn định khung, không phải giữ nguyên toàn bộ nội dung động trước khi API trả về hoặc chuyển ứng dụng sang SSR toàn trang. Ảnh vẫn tải độc lập, không đợi tất cả ảnh mới hiện nội dung.

**Kiểm:** Edge headless 1440×900 light/dark, localhost:5173 và bản build fixture. `test-detail-startup.cjs` giữ riêng main JS, lazy detail chunk, auth và collection API: frame hiện trước main; còn khi chờ chunk; React tiếp quản không có hai body startup; Back/heading không lệch quá 0,6 px qua CSS, chiều cao frame giữ nguyên trước/sau CSS và metadata fixture; ép global-loading-active vẫn opacity 1. Sau auth/profile chỉ **1 request** đọc detail. Đã xem ảnh skeleton sáng và ready tối; phát hiện build đầu đọc critical CSS trước một chỉnh sửa chiều cao, đã build lại đồng nhất 154px và thêm assert chiều cao, không dùng kết quả bản cũ làm nghiệm thu.

Unit detail state PASS route/session isolation, cleanup, favorite races, reorder rollback/stale result, partial delete retry và mutation locks. Browser chi tiết sáng/tối PASS bìa qua bàn phím, drag rollback, favorite, export lock, dialog xóa cancel/busy/partial retry, viewer permission, mở ảnh/Back/F5, error/offline/retry, rỗng/404 và guest public không gọi favorites riêng. Script cũ còn tìm nhãn Đã yêu thích/Xuất/Chọn; cập nhật selector theo tên truy cập hiện có trước lượt này (Bỏ yêu thích/Xuất bộ sưu tập/Chọn nhiều ảnh), không đổi nghiệp vụ để chiều test. Toàn danh sách sáng/tối, startup theme/storage và auth departure/resume cũng PASS.

Build PASS, focused ESLint 0; `npx tsc -b` còn 25 diagnostic cũ; lint repo còn 65 error/220 warning ngoài phần sửa. Diff check PASS. Chỉ đo fixture/dev, không khẳng định thời gian production nhanh hơn hoặc mọi thiết bị hết nháy. Responsive chưa nghiệm thu. Phạm vi user: page/hook/header, Frame/Skeleton/CSS và script kiểm; chung build: plugin public header. Không sửa admin, inventory admin, auth store chung hoặc useSiteSettings trong lượt này. Giữ các thay đổi dở và dấu nghiệm thu; chưa commit.

- [ ] CDET-16 — Mở trực tiếp/F5 chi tiết ở sáng/tối: Back, vùng tiêu đề và khung chờ có sẵn; không mất/fade toàn body khi module/auth/API/ảnh đang tải. Tên/mô tả được điền từ API, chưa có dữ liệu không hiện nội dung bộ khác hoặc quyền giả.
- [ ] CDET-17 — Khi tài khoản khôi phục, khung không bị xóa rồi tải lại lần thứ hai. Guest vẫn xem bộ public; bộ private/quyền quản lý chỉ hiện sau kiểm thật. Back/F5, favorite/xuất/bìa/chọn/xóa và offline/retry giữ đúng hành vi.


**Điều chỉnh tiêu đề chờ #6 theo phản hồi người dùng — 21/10/2026:** chữ chung Bộ sưu tập trong skeleton khiến người dùng thấy tên BST 1 bị đổi khi refresh. Đã bỏ chữ này ở trạng thái busy, dùng placeholder giữ chiều cao heading; API hoàn tất mới hiện tên thật. Tên không được cache/dựng giả trước API. Chưa đánh đạt CDET-16/17 từ phản hồi này.

- [ ] CDET-18 — F5 chi tiết: lúc chờ là placeholder tên, không hiện chữ chung Bộ sưu tập thay tên; sau tải hiện đúng tên BST. Không ảnh hưởng Back, metadata và quyền thao tác.

### 24.20. Giảm mã tải đầu trang collection — 21/10/2026

Người dùng cho phép tối ưu và đồng ý sửa riêng cách tải route user trong App.tsx (file chung có route admin). Trước sửa, HomePage và ImagePage được import trực tiếp vào entry dù URL là /collections. Đã chuyển hai route này sang React.lazy, sử dụng Suspense hiện có; giữ CollectionsPage eager và nguyên khung startup/header. Không sửa route admin, auth hay quy tắc gọi API. Chi phí được chuyển sang lần đầu mở Trang chủ/Chi tiết ảnh; chunk chỉ tải khi route cần và được trình duyệt cache.

Trong kiểm hồi quy phát hiện useHeaderSurface tìm page bằng document.querySelector nên chọn nhầm collections-page đang ẩn trong HTML startup ở trang ảnh. Đã giới hạn hero/page trong root React hiện tại; không lấy hình học khung startup ẩn để quyết định nền header. Không có import trực tiếp hook này trong khu vực admin; Header không được dựng ở admin.

**Đo trước/sau:** build production cùng máy; Edge headless 1440×900, context mới, fixture local cô lập với cùng một collection, đợi card hiện rồi 500 ms. Tổng decodedBodySize của script thực sự tải: 1.061.650 → 812.673 byte (giảm 23,45%, gồm cả chunk dùng chung). Bundle entry gzip theo Vite: 337,43 → 251,01 kB. Đây là bằng chứng giảm payload JavaScript, không phải phép đo tốc độ production, LCP hoặc INP; số byte là trước nén cho network fixture. Không suy ra thời gian tải giảm tương ứng 23,45%. Log trước/sau và script đo local nằm trong frontend/qa-policy-checkbox (bị ignore).

**Kiểm tra:** build PASS; ESLint riêng App.tsx/useHeaderSurface/script mới PASS. Typecheck npx tsc -b còn cùng 25 diagnostic có trước; lint toàn repo còn 65 error/220 warning, không có diagnostic mới trong phần sửa. Edge desktop sáng/tối PASS: collection không tải chunk HomePage/ImagePage; logo về Trang chủ tải đúng chunk; Back/F5; header/toolbar startup-runtime khớp (vi/en, maxShift 0 trong fixture); chi tiết trước JS/chunk/auth/API, một lượt đọc ban đầu; danh sách lọc/tạo/sửa/xóa/lỗi/offline; chi tiết bìa/kéo/sắp xếp/favorite/xuất/chọn/xóa/quyền; ảnh modal/arrows/Close/Back/F5/error/retry và header cuộn. Auth recovery PASS gồm 429/503/profile/online, quyền guard, Socket.IO và 10 refresh liên tiếp. Không sửa dữ liệu thật. Responsive để vòng cuối.

Phạm vi thay đổi lượt này: **chung được cho phép** App.tsx (chỉ import hai route user); **user** useHeaderSurface.ts và scripts/test-user-route-splitting.cjs; **tài liệu user** inventory này. Không sửa mã/inventory admin hoặc useSiteSettings. Chưa commit; giữ toàn bộ dấu nghiệm thu có trước.

- [ ] COL-P01 — F5 danh sách/chi tiết khi đăng nhập và guest: header, bộ lọc, nút và khung chờ giữ ổn định; sau đó ảnh/dữ liệu điền đúng, không đổi trạng thái phiên.
- [ ] COL-P02 — Từ collection bấm logo về Trang chủ, Back về collection; mở ảnh, dùng mũi tên/đóng/Back và F5 link ảnh: đúng URL, đúng trang/modal, không mất nội dung hoặc lỗi JavaScript.
- [ ] COL-P03 — Trang ảnh: cuộn xuống rồi lên đầu, nền header đổi/khôi phục đúng ở sáng/tối; khung collection ẩn không ảnh hưởng phép đo.

### 24.21. Đồng nhất vị trí header Trang chủ và trang khác — 22/10/2026

Theo phản hồi người dùng, đo Edge desktop 1440×900 bằng fixture: menu Trang chủ x=515,984375, Collection x=519,984375 (lệch 4 CSS px, guest sáng). CSS ImmersiveHomeChrome ghi đè header thành width:100%, khác width:100vw của HeaderFrame; khác biệt thanh cuộn làm thay đổi tâm và mép phải. Bỏ ghi đè left/width/transform ở header Trang chủ, để HeaderFrame sở hữu hình học chung; giữ transition và màu/chế độ cinematic hiện có.

Phạm vi user: frontend/src/components/ImmersiveHomeChrome.css và frontend/scripts/test-header-route-geometry.cjs; tài liệu user: inventory này. Không sửa admin hoặc file chung khác. Script kiểm phiên đăng nhập dùng fixture profile đúng query /users/me?_t=..., socket cô lập, không dữ liệu thật.

Sau sửa PASS: logo/menu/từng link/cụm actions có chênh lệch dưới 1 CSS px khi đi Trang chủ → Collection → Giới thiệu → Trang chủ, guest và account admin fixture, sáng/tối, cùng viewport 1440×900. Startup-runtime collection PASS vi/en ở desktop 1200/1705, maxShift 0 và logo pixels khớp. Build PASS; typecheck còn 25 diagnostic cũ; lint repo còn 65 error/220 warning cũ. Không suy rộng thành đã kiểm mọi route/trình duyệt/thiết bị. Responsive để vòng cuối. Chưa commit; giữ dấu nghiệm thu.

- [ ] HDR-01 — Cùng cửa sổ desktop, chuyển Trang chủ/Collection/Giới thiệu và quay lại: logo, từng mục menu và cụm nút phải giữ cùng vị trí, cả guest và đăng nhập.
- [ ] HDR-02 — Refresh rồi cuộn Trang chủ: header giữ vị trí các item; màu trên hero và nền khi cuộn vẫn đúng. Collection vẫn giữ chống nháy đã nghiệm thu.


### 24.22. Khung refresh Khám phá theo Collections — 22/10/2026

Theo yêu cầu người dùng, áp dụng cơ chế HTML startup của Collections cho `/explore` và `/explore/`. Trước sửa, body Khám phá chỉ xuất hiện sau route chunk; render đầu có thể hiện empty trước effect tải ảnh. Nay plugin dựng sẵn header và khung hero/bộ lọc, dùng chung `ExploreToolbar` với React; `useLayoutEffect` gỡ shell khi trang thực đã commit. Shell inert/aria-hidden, không chứa dữ liệu ảnh/danh mục giả hoặc cấp quyền từ hint. API ảnh/danh mục vẫn sở hữu dữ liệu thật; không đợi auth hoặc toàn bộ ảnh để hiện khung. Thêm trạng thái chờ request đầu để không hiện “Chưa có ảnh phù hợp” trước lúc tải. CSS riêng của Khám phá đồng bộ font, palette, spacing và scrollbar gutter trước/sau CSS ứng dụng; phép đo ban đầu phát hiện lệch ngang 4px do gutter và đã sửa trong phạm vi route.

**Bằng chứng tự động:** Vite build PASS; focused ESLint 0 error/1 warning effect; `npx tsc -b` còn 26 diagnostic ngoài các file sửa, lint toàn repo 60 error/174 warning (không sửa các phần ngoài phạm vi). Detector trên page/toolbar trả `[]`, không coi đây là nghiệm thu chức năng. Edge headless 1440×900, bản build local, guest/API fixture, sáng/tối: giữ JS/CSS rồi giải phóng, API chậm, empty chỉ sau API, reload PASS; tọa độ/kích thước hero heading, nav header và vùng filters trước HTML→React bằng nhau, màu/font đo tương ứng bằng nhau. `test-explore-page.cjs` PASS sáng/tối: category retry, bộ lọc/order asc, page2 lỗi/thử lại, lỗi ảnh/thử lại, empty/reset. `test-public-startup.cjs` PASS gồm palette/cache/storage và bootstrap admin giữ nguyên. Đã xem screenshot runtime dark. Log/screenshot local trong `frontend/qa-policy-checkbox/explore-refresh*`, `explore-runtime-*` bị ignore; script mới `frontend/scripts/test-explore-refresh.cjs` lưu trong Git.

**Giới hạn:** fixture không chứng minh production/thiết bị thật hết nháy; ảnh và danh mục vẫn hiện khi API hoàn tất, lựa chọn đã lưu khôi phục khi React chạy. Chưa kiểm responsive, tài khoản thật hoặc mọi trường hợp tải font. Không tự đổi 20 dấu nghiệm thu cũ của Khám phá.

**Phạm vi:** user: ExplorePage.tsx/CSS và ExploreToolbar mới; chung phục vụ khởi động public: index.html, vite-plugin-public-header.ts (nhánh thêm chỉ cho Explore); QA: script mới. Không sửa file/inventory admin, auth hoặc useSiteSettings. Giữ thay đổi có trước ở `measure-route-refresh.cjs`.

- [ ] EXP-R01 — Refresh Khám phá nhiều lần ở theme sáng/tối: header và khung tiêu đề/bộ lọc không mất rồi hiện lại hoặc xê dịch khi chờ tải module; ảnh/danh mục hiện đúng sau API. Kiểm lại trên trình duyệt người dùng.
- [ ] EXP-R02 — Refresh với mạng chậm; trước khi có kết quả không nháy “Chưa có ảnh phù hợp”. Sau tải vẫn dùng được tìm kiếm, lọc, sắp xếp, tải thêm và mở ảnh/Back. Responsive nghiệm thu riêng.


### 24.23. Sửa nháy thanh tìm kiếm/danh mục Khám phá sau phản hồi — 22/10/2026

Người dùng báo phần hero/tìm kiếm/danh mục/bộ lọc còn nháy hoặc xê dịch khi refresh. Lượt kiểm 24.22 chỉ dùng danh mục rỗng và đo khung ngoài, nên chưa bao phủ danh mục có dữ liệu hoặc hình học bên trong ô tìm kiếm. Không xem kết quả cũ là nghiệm thu phần này.

**Nguyên nhân xác minh bằng fixture:** startup search dùng span mô phỏng thay cho cấu trúc input/nút thật; font fallback đổi khi CSS/font ứng dụng tải gây lệch chiều rộng input khoảng 5,7px (computed family cũ giống nhau nhưng font thực chưa cùng thời điểm). Script restore đặt cuối HTML phải chờ stylesheet, không đủ để khôi phục danh mục trước CSS. Trước đây API danh mục còn làm tạo lại params ảnh dù đang chọn Tất cả.

**Sửa:** startup dùng cùng cấu trúc class/input/nút với SearchBar, CSS riêng Explore giữ hình học bên trong và font điều khiển Arial ổn định như header; không sửa SearchBar dùng chung. Cache danh mục public đã tải trong sessionStorage theo locale, reader có kiểm dữ liệu và giới hạn số phần tử, storage lỗi thì fallback rỗng; API vẫn revalidate, không dùng cache làm dữ liệu phân quyền. HTML observer cài trước stylesheet, thêm chip bằng textContent/createElement, ngắt khi xong/DOMContentLoaded; React khởi tạo từ cùng snapshot để không làm cả hàng biến mất khi refresh. Cache chỉ giúp lượt đã từng tải trong phiên; truy cập đầu hoặc storage không dùng được vẫn tải danh mục từ API. Tham số request ảnh phụ thuộc categoryName thực thay vì cả mảng categories, tránh request lại khi kết quả danh mục không đổi bộ lọc ảnh.

**Kiểm:** build PASS; focused ESLint 0 error/1 warning effect; typecheck còn 26 diagnostic ngoài file sửa. Detector page/toolbar `[]`; diff check PASS. Edge headless 1440×900, build local, API fixture với 9 tên danh mục, theme light/dark PASS: trước JS/CSS→React giữ tọa độ và kích thước ô tìm kiếm/input/hero/header/filter; tải danh mục, reload giữ lại đủ 9 chip trước JS/CSS và sau API, khung bộ lọc bằng nhau; chỉ 1 request ảnh mỗi lượt tải/reload. Hồi quy Explore category retry/filter/order/page2 retry/empty/reset và public startup Collections/palette/storage/admin bootstrap đều PASS. Đã xem screenshot light, ảnh đủ danh mục lưu `frontend/qa-policy-checkbox/explore-categories-{light,dark}.png`; log `explore-refresh-followup-final.txt`, `explore-refresh-followup-{build,types,lint,regression,collections}.txt` và `explore-refresh-payload.json` là artifact local bị ignore.

**Dung lượng, không phải benchmark production:** HTML build hiện 73.654 byte / gzip 14.749 byte. So cùng HTML khi loại riêng CSS inline, DOM startup và script restore Explore: chênh 14.867 byte thô / gzip 2.971 byte. Phần này hiện được chèn trong HTML chung nên các route khác cũng mang dung lượng này. Đây là chi phí truyền/phân tích thêm; chưa đo latency/LCP/INP production hoặc CPU/mạng thiết bị thật, không kết luận nhanh/chậm hơn từ kích thước gzip. Cache không thêm request; fixture xác nhận không lặp request ảnh khi danh mục hoàn tất trong ca đã đo.

**Phạm vi:** user: ExplorePage/CSS, ExploreToolbar, categorySnapshot mới; chung startup public: plugin, chỉ thêm xử lý Explore. QA: mở rộng script refresh. Không sửa admin, hook settings hoặc SearchBar dùng chung; giữ thay đổi có trước ở script measure. Giữ EXP-R01/R02 chưa đánh dấu, chờ người dùng kiểm; responsive vẫn vòng cuối. Lựa chọn filter lưu trong localStorage vẫn khôi phục khi React chạy, chưa đo mọi filter đã lưu/locale/font/thiết bị.
