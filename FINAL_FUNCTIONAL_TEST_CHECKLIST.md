# PhotoCloud — Kiểm thử chức năng cuối cùng trước khi lên host

Ngày lập: 15/10/2026 (giờ Việt Nam). Phạm vi: mọi trang có route trong `frontend/src/App.tsx`, gồm các tab và modal liên quan. Đây là một checklist chung; không tạo file riêng cho từng trang.

## 1. Xác nhận tiến độ và cách ghi kết quả

**Lịch chụp & dịch vụ admin đã hoàn tất đợt chỉnh sửa theo yêu cầu.** Cần nghiệm thu cuối cùng sáu tab trên staging trước khi phát hành. Hoàn tất chỉnh sửa không có nghĩa toàn bộ ca dưới đây đã PASS.

Bằng chứng đã có: Vite build thành công; các script fixture cho yêu cầu, lịch, chính sách, gói chụp và lịch rảnh đã được chạy trong đợt phát triển. Gói/chính sách/lịch rảnh được kiểm tra ở 390px và 1440px, sáng/tối, gồm lỗi lưu và giữ bản nháp. Fixture dùng API giả lập, chưa xác nhận hạ tầng, email hay dữ liệu production. Đánh giá và toàn bộ website cần vòng kiểm thử cuối bên dưới.

- `[ ]`: chưa test vòng cuối; chỉ đổi thành `[x]` khi kết quả thực tế đúng mong đợi và có bằng chứng.
- Nếu lỗi: giữ ô trống, ghi ID lỗi trong bảng cuối file. Nếu không áp dụng: ghi N/A và lý do, không đánh PASS.
- Mỗi mục trang phải chạy cả **chức năng** và **R chung** ở mục 3. Route có tham số phải dùng ID/slug thật trong dữ liệu test.
- Ghi cho mỗi lượt: người test, ngày giờ, commit/build, URL staging, trình duyệt, viewport, tài khoản/quyền, kết quả, ảnh hoặc log.
- Chuẩn bị tài khoản khách, người dùng A/B, admin giới hạn quyền và super admin; dữ liệu rỗng/nhiều bản ghi/tên dài/ảnh thiếu và lịch ở nhiều trạng thái. Dùng dữ liệu test cho cập nhật, xóa, gửi email; sao lưu trước kiểm thử có tác động dữ liệu.

## 2. Môi trường và luồng xuyên suốt

- [ ] Ghi URL frontend/backend, build/commit, cấu hình môi trường và tài khoản test; không ghi mật khẩu/token trong file này.
- [ ] Khách mở trang → đăng nhập → xem gói → gửi yêu cầu → admin xử lý → khách thấy trạng thái mới và lịch đúng.
- [ ] Đăng nhập/đăng xuất, phiên hết hạn và refresh token không tạo vòng chuyển hướng; sau đăng xuất không đọc được dữ liệu riêng bằng Back hoặc API.
- [ ] Người dùng B không xem/sửa lịch, hồ sơ riêng, thông báo hay dữ liệu thuộc A bằng cách đổi ID trong URL/API.
- [ ] Các nút gửi/lưu có trạng thái chờ; bấm nhanh nhiều lần không tạo dữ liệu hoặc tác vụ trùng.
- [ ] Dữ liệu đã lưu còn đúng sau tải lại và đăng nhập lại; lỗi mạng không hiển thị thành công giả.
- [ ] Kiểm tra 401/403/404/422/500/503 và mất mạng: thông báo rõ, phục hồi được, không lộ stack trace hay bí mật.

## 3. R chung — bắt buộc cho từng trang và modal

- [ ] Mobile 320×568, 390×844; tablet 768×1024; desktop 1280×720 và 1440×900: không tràn ngang toàn trang, chồng chữ hay cắt nút.
- [ ] Sáng/tối: chữ, nhãn, placeholder, trạng thái chọn/tắt/lỗi, icon và focus dễ đọc; không còn nền/chữ sai theme.
- [ ] Zoom 200%, tên dài, nhiều dòng, dữ liệu rỗng và số lớn: nội dung vẫn đọc và thao tác được.
- [ ] Mobile: menu đóng/mở đúng, tab có thể cuộn tới mọi mục, bảng chuyển bố cục phù hợp, bàn phím không che trường/nút cần dùng.
- [ ] Modal: vừa viewport, body cuộn tới trường cuối, tiêu đề và nút chính không bị cắt; focus vào modal, Tab không thoát, Esc/đóng trả focus về nút mở.
- [ ] Form có label; Tab/Shift+Tab/Enter/Space hoạt động; focus rõ; công tắc/radio có tên và trạng thái đọc được.
- [ ] Loading/empty/error/retry/disabled/success đúng; thử mạng chậm; không nháy dữ liệu cũ hay đứng spinner vô hạn.
- [ ] Back/Forward, mở tab mới, link sâu và F5 giữ đúng ngữ cảnh; overlay không khóa cuộn sau khi đóng.
- [ ] Không có lỗi console chưa xử lý, request lặp vô hạn, ảnh vỡ hoặc nội dung bị footer/header che.

## 4. Trang chủ và danh mục — `/`, `/t/:categorySlug`

- [ ] Header, menu, danh mục, lưới ảnh, liên kết và nút đặt lịch mở đúng đích.
- [ ] Chuyển danh mục đúng dữ liệu, trạng thái chọn và URL; slug không tồn tại được xử lý rõ.
- [ ] Tải thêm/cuộn danh sách theo giao diện hiện có không trùng ảnh, mất vị trí hoặc nhảy bố cục.
- [ ] Mở ảnh rồi đóng/Back trở lại đúng vị trí; ảnh lazy load và placeholder hoạt động.
- [ ] Footer, liên kết mạng xã hội, đăng ký nhận tin và nút liên hệ hoạt động theo cấu hình.
- [ ] R chung hoàn tất.

## 5. Khám phá — `/explore`

- [ ] Các mục khám phá, danh mục và liên kết ảnh dẫn đúng nội dung; bộ lọc/đổi mục có phản hồi đúng.
- [ ] Trạng thái ít ảnh, không có ảnh, tải thêm và lỗi không phá bố cục.
- [ ] R chung hoàn tất.

## 6. Tìm kiếm — `/s/photos/:query`

- [ ] Tìm từ header và trang kết quả; tiếng Việt có dấu, ký tự đặc biệt, khoảng trắng và truy vấn dài được xử lý đúng.
- [ ] URL, tiêu đề, bộ lọc và kết quả khớp từ khóa; truy vấn mới không trộn kết quả cũ.
- [ ] Không có kết quả có hướng dẫn phù hợp; phân trang/tải thêm và mở ảnh hoạt động.
- [ ] R chung hoàn tất.

## 7. Chi tiết ảnh — `/photos/:slug`

- [ ] Ảnh, tiêu đề, tác giả, danh mục và thông tin thực tế đúng; ảnh không tồn tại có trạng thái phù hợp.
- [ ] Xem trực tiếp và mở dạng modal từ danh sách; F5, Back/Forward, đóng và điều hướng ảnh không làm sai nền/vị trí cuộn.
- [ ] Yêu thích, tải ảnh, chia sẻ và lưu vào bộ sưu tập theo nút hiện có; kiểm tra khi chưa đăng nhập và sau đăng nhập.
- [ ] Kiểm tra bình luận/tương tác được hiển thị: tạo/sửa/xóa theo đúng quyền, lỗi giữ nội dung nhập.
- [ ] Bộ đếm và trạng thái thao tác nhất quán với trang yêu thích/tải xuống sau tải lại.
- [ ] R chung hoàn tất.

## 8. Bộ sưu tập — `/collections`, `/collections/:collectionId`

- [ ] Danh sách, tìm/lọc/sắp xếp nếu có, phân trang và mở chi tiết đúng bộ sưu tập.
- [ ] Ảnh, chủ sở hữu, mô tả và quyền công khai/riêng tư đúng; không truy cập được bộ sưu tập riêng của người khác.
- [ ] Các thao tác tạo/sửa/xóa, thêm/bỏ ảnh và yêu thích được cung cấp trên giao diện chạy đúng quyền và đồng bộ sau F5.
- [ ] Xóa có xác nhận; hủy xác nhận không thay dữ liệu; ID sai và bộ sưu tập rỗng có thông báo.
- [ ] R chung hoàn tất.

## 9. Giới thiệu và liên hệ — `/about`, `/contact`

- [ ] Giới thiệu hiển thị nội dung, ảnh và liên kết đúng cấu hình, không có placeholder sai.
- [ ] Email/điện thoại/mạng xã hội mở đúng đích; địa chỉ và giờ làm việc đúng nội dung dự định phát hành.
- [ ] Form liên hệ kiểm tra tên/email/chủ đề/nội dung; điện thoại tùy chọn; dữ liệu tiếng Việt được encode đúng.
- [ ] Nút “Gửi qua email” mở trình email với người nhận/chủ đề/nội dung đúng; không báo đã gửi mail từ server khi chỉ mở ứng dụng email.
- [ ] R chung hoàn tất cho cả hai trang.

## 10. Gói dịch vụ — `/packages`, `/packages/:slug`

- [ ] Giá VNĐ, thời lượng, số ảnh, số người, mô tả và ngày giao khớp cấu hình admin.
- [ ] Chọn/xem chi tiết gói đúng slug; gói ẩn không được đặt mới; slug không tồn tại có phản hồi.
- [ ] Nút đặt lịch mang đúng gói sang form; chưa đăng nhập đi qua luồng đăng nhập phù hợp.
- [ ] R chung hoàn tất.

## 11. Blog — `/blog`, `/blog/:slug`

- [ ] Danh sách, chuyên mục/tìm kiếm/phân trang nếu có và liên kết bài đúng nội dung.
- [ ] Chi tiết có tiêu đề, ảnh, nội dung, ngày/tác giả và bài liên quan theo dữ liệu; slug sai có xử lý.
- [ ] Nội dung dài, ảnh, liên kết và chia sẻ không phá layout; không hiển thị HTML nguy hiểm.
- [ ] R chung hoàn tất cho danh sách và bài viết.

## 12. Nhận tin — `/newsletter/confirm`, `/newsletter/unsubscribe`

- [ ] Token hợp lệ cho phép xác nhận/hủy qua nút; mở trang chưa tự thực hiện hành động ngoài dự kiến.
- [ ] Token thiếu/sai/hết hạn/đã dùng có thông báo; bấm lặp không tạo tác dụng phụ.
- [ ] Lỗi API có thể thử lại; kiểm tra email xác nhận trên staging.
- [ ] R chung hoàn tất.

## 13. Đăng nhập, đăng ký, Google — `/signin`, `/signup`, `/auth/google/callback`

- [ ] Đăng nhập đúng/sai, trường trống, email sai và tài khoản bị giới hạn được xử lý rõ.
- [ ] Đăng ký hợp lệ, email trùng, mật khẩu/xác nhận không khớp và điều kiện bắt buộc; không tạo tài khoản trùng khi bấm nhiều lần.
- [ ] Luồng Google thành công, người dùng hủy, callback lỗi và URL callback trên domain staging/host.
- [ ] Quay về đích phù hợp sau đăng nhập; không chuyển hướng tới URL ngoài không tin cậy.
- [ ] R chung hoàn tất.

## 14. Quên/đặt lại mật khẩu — `/forgot-password`, `/reset-password`

- [ ] Gửi yêu cầu với email hợp lệ, sai định dạng và không tồn tại; thông báo không tiết lộ tài khoản ngoài ý muốn.
- [ ] Email thật trên staging tới đúng người nhận; link dùng domain HTTPS và token hợp lệ.
- [ ] Token thiếu/sai/hết hạn/đã dùng; mật khẩu xác nhận sai; đặt lại thành công đăng nhập được bằng mật khẩu mới.
- [ ] R chung hoàn tất.

## 15. Hồ sơ — `/profile`, `/profile/user/:userId`, route tên người dùng `/*`

- [ ] `/profile` tới đúng hồ sơ; URL username/ID hoạt động khi mở trực tiếp, ID/username sai về trang không tồn tại phù hợp.
- [ ] Avatar, ảnh bìa, giới thiệu, số liệu và các tab ảnh/bộ sưu tập khớp chủ hồ sơ.
- [ ] Theo dõi/bỏ theo dõi và danh sách người theo dõi/đang theo dõi nếu hiển thị; không theo dõi chính mình, không nhân đôi thao tác.
- [ ] Ảnh ghim và chỉnh ghim theo đúng quyền; nội dung riêng không lộ cho khách/người khác.
- [ ] R chung hoàn tất.

## 16. Sửa hồ sơ, cài đặt tài khoản — `/profile/edit`, `/settings`, `/settings/profile`, `/settings/notifications`

- [ ] Chỉnh thông tin, username, avatar/ảnh bìa theo form; validation, ảnh sai định dạng/quá dung lượng và lỗi upload giữ nội dung hợp lệ.
- [ ] Lưu thành công đồng bộ header và hồ sơ; username đổi thì URL mới hoạt động.
- [ ] Đổi mật khẩu kiểm tra mật khẩu cũ, xác nhận và luồng phiên sau thay đổi.
- [ ] Cài đặt thông báo lưu/tải lại đúng; tab và deep link tương ứng mở đúng mục.
- [ ] Danh sách phiên đăng nhập/thu hồi phiên nếu hiển thị hoạt động đúng, phiên bị thu hồi không còn truy cập.
- [ ] R chung hoàn tất.

## 17. Không gian cá nhân — `/me`

- [ ] Các tab/số liệu/nội dung cá nhân và liên kết quản lý mở đúng; tài khoản mới có trạng thái rỗng.
- [ ] Các thao tác upload/sửa thông tin ảnh/ghim nếu cung cấp kiểm tra quyền và đồng bộ với hồ sơ.
- [ ] `/upload` chuyển về `/` đúng route hiện tại, không mở trang hỏng.
- [ ] R chung hoàn tất.

## 18. Yêu thích và tải xuống — `/favorites`, `/favorites/photos`, `/favorites/collections`, `/favorite-collections`, `/downloads`

- [ ] Các route yêu thích và alias mở đúng tab; khách chưa đăng nhập có phản hồi phù hợp.
- [ ] Thêm/bỏ yêu thích ảnh và bộ sưu tập đồng bộ từ trang chi tiết; không còn item sau khi bỏ và F5.
- [ ] Lịch sử tải xuống đúng người dùng, liên kết tải hợp lệ; ảnh đã xóa/không còn quyền có xử lý.
- [ ] Trạng thái rỗng, lọc/tải thêm theo giao diện thực tế hoạt động.
- [ ] R chung hoàn tất cho từng trang.

## 19. Thông báo — `/notifications`

- [ ] Tải danh sách, số chưa đọc, đánh dấu đã đọc/tất cả đã đọc và mở liên kết đúng nội dung.
- [ ] Thông báo realtime nếu kết nối được bật không bị trùng; reconnect và tải lại giữ đúng số liệu.
- [ ] Không đọc được thông báo người khác; nội dung đã xóa có phản hồi phù hợp.
- [ ] R chung hoàn tất.

## 20. Đặt lịch phía khách — `/booking` và modal đặt lịch

- [ ] Chọn gói, ngày/khung giờ, phương án thay thế, địa điểm, số người, liên hệ, ý tưởng và ghi chú theo form.
- [ ] Validation các trường bắt buộc, email/điện thoại, số người và ngày; gói ẩn/ngày nghỉ/ngoài lịch làm việc bị xử lý theo quy tắc API.
- [ ] Giá/thông tin gói đúng; gửi một lần tạo một yêu cầu; lỗi giữ draft; thành công có mã và mở được chi tiết.
- [ ] Khách chưa đăng nhập không gửi được request trái quyền; modal và trang đầy đủ cho kết quả nhất quán.
- [ ] R chung hoàn tất.

## 21. Lịch của tôi và chi tiết — `/profile/bookings`, `/booking/:bookingId`

- [ ] Danh sách/lọc/phân trang theo giao diện; thông tin gói, ngày mong muốn, ngày/giờ đã chốt, tiền cọc và lịch sử đúng.
- [ ] Hủy theo chính sách bật/tắt; tỷ lệ hoàn ở đúng mốc thời gian, tính trên cọc đã nhận; không mô tả thành tự chuyển tiền.
- [ ] Đổi cá nhân: đúng deadline, một lượt được studio duyệt; request đang chờ không tự đổi ngày, không gửi trùng.
- [ ] Đổi do thời tiết: bắt buộc mô tả, trước giờ chụp; miễn deadline/lượt cá nhân nhưng chờ studio duyệt; không trừ lượt cá nhân.
- [ ] Trạng thái kết thúc không cho hành động sai; ID của khách khác/sai không lộ dữ liệu.
- [ ] Đánh giá sau buổi chụp theo điều kiện thực tế; chặn đánh giá trùng/trái quyền.
- [ ] R chung hoàn tất.

## 22. Khung admin và Tổng quan — `/admin`

- [ ] Chặn khách/người không đủ quyền cả UI và API; menu theo đúng vai trò; URL trực tiếp không vượt quyền.
- [ ] Sidebar, breadcrumb, mục active, chuyển trang, về website và đăng xuất đúng; menu mobile đóng sau chọn.
- [ ] Thống kê, biểu đồ, khoảng thời gian và liên kết nhanh dùng dữ liệu thật đúng đơn vị/múi giờ; empty/error không thành số liệu giả.
- [ ] R chung hoàn tất.

## 23. Admin Thư viện ảnh — `/admin/images`

- [ ] Danh sách có thumbnail, tên mặc định, ngày, danh mục, tác giả, trạng thái đúng; tìm kiếm, làm mới và phân trang đúng.
- [ ] Upload một/nhiều ảnh theo UI; tiến trình, lỗi file, hủy/thử lại và dữ liệu sau upload nhất quán.
- [ ] Sửa thông tin/danh mục; lỗi giữ dữ liệu nhập; lưu xong danh sách và trang ảnh cập nhật.
- [ ] Chọn từng ảnh/chọn tất cả có trạng thái đúng; thao tác hàng loạt chỉ áp dụng tập đã chọn, kiểm tra khi đổi trang/tìm kiếm.
- [ ] Xóa đơn/hàng loạt có xác nhận; hủy không xóa; lỗi một phần không báo thành công toàn bộ.
- [ ] R chung hoàn tất, đặc biệt hàng ảnh và nút thao tác trên mobile.

## 24. Admin Danh mục — `/admin/categories`

- [ ] Danh sách, số ảnh và mô tả đúng; thêm/sửa/tên trùng/trường trống được xử lý.
- [ ] Lưu mô tả rỗng và trạng thái hiển thị đúng; thay đổi cập nhật menu/bộ lọc công khai.
- [ ] Xóa có xác nhận và xử lý ảnh đang liên kết theo quy tắc hệ thống; không mất ảnh ngoài dự kiến.
- [ ] R chung hoàn tất.

## 25. Admin Bộ sưu tập — `/admin/collections`

- [ ] Danh sách, tìm kiếm/phân trang theo UI, xem nội dung/chủ sở hữu và trạng thái công khai đúng.
- [ ] Các thao tác sửa/duyệt/xóa được cung cấp chạy đúng quyền; ảnh liên kết cập nhật; không xóa file ảnh ngoài phạm vi.
- [ ] R chung hoàn tất.

## 26. Admin Duyệt nội dung — `/admin/moderation`

- [ ] Lọc nội dung chờ/đã duyệt/từ chối, xem ảnh và tác giả đúng.
- [ ] Duyệt/từ chối đơn và hàng loạt theo UI; lý do khi bắt buộc, xác nhận và lỗi giữ trạng thái chính xác.
- [ ] Nội dung sau duyệt/từ chối hiển thị công khai theo quy tắc; bộ đếm và thư viện đồng bộ.
- [ ] R chung hoàn tất.

## 27. Admin Người dùng — `/admin/users`

- [ ] Danh sách, tìm/lọc/phân trang, xem thông tin và thống kê người dùng theo UI.
- [ ] Sửa quyền/trạng thái, khóa/mở hoặc xóa nếu có: đúng quyền API, xác nhận, không tác động nhầm tài khoản.
- [ ] Các giới hạn tự tác động tài khoản quản trị/super admin được thực thi ở server, không chỉ ẩn nút.
- [ ] R chung hoàn tất.

## 28. Admin Phân quyền — `/admin/roles`

- [ ] Danh sách quản trị, thêm/cấp/sửa/thu hồi quyền theo các thao tác đang hiển thị.
- [ ] Super admin và admin giới hạn quyền thấy menu phù hợp; đổi quyền có hiệu lực khi gọi API, tải lại và đăng nhập lại.
- [ ] Người không có quyền không cấp quyền cho mình/người khác bằng request trực tiếp; chặn thao tác nhạy cảm theo quy tắc thực tế.
- [ ] R chung hoàn tất.

## 29. Admin Nhật ký — `/admin/logs`

- [ ] Thời gian, mức độ, người thực hiện và nội dung đúng; lọc/tìm/phân trang/làm mới theo UI.
- [ ] Nhật ký phản ánh thao tác test; không ghi mật khẩu, token, cookie hoặc thông tin bí mật.
- [ ] R chung hoàn tất, đặc biệt dòng log dài.

## 30. Admin Cài đặt website — `/admin/settings`

- [ ] Kiểm tra từng nhóm cấu hình đang hiển thị: tải giá trị hiện tại, sửa, validation, lưu, lỗi và tải lại.
- [ ] Tên/mô tả website, logo, liên hệ, liên kết, nội dung hiển thị và cấu hình email/upload nếu được cung cấp phản ánh đúng bên công khai.
- [ ] Chế độ bảo trì chặn khách theo thiết kế và cho quản trị tiếp tục truy cập; tắt xong khách truy cập lại được.
- [ ] Cấu hình nhạy cảm không lộ ra API công khai/build frontend; chỉ đúng quyền mới cập nhật được.
- [ ] R chung hoàn tất.

## 31. Admin Lịch chụp & dịch vụ — `/admin/bookings`

### 31.1. Điều hướng sáu tab

- [ ] Yêu cầu / Lịch / Lịch rảnh / Gói chụp / Đánh giá / Chính sách: active đúng, chỉ tải dữ liệu cần thiết, không lẫn trạng thái giữa tab.
- [ ] Chính sách/lịch rảnh có thay đổi: chuyển tab hoặc F5 có cảnh báo theo luồng đã triển khai; hủy rời tab giữ nguyên draft.
- [ ] R chung hoàn tất cho cả sáu tab và các modal.

### 31.2. Yêu cầu

- [ ] Tìm mã/tên/email/điện thoại, lọc nhanh/đầy đủ và phân trang đúng dữ liệu server.
- [ ] Danh sách desktop/mobile thể hiện khách, gói, giá, ngày mong muốn/ngày đã chốt và trạng thái chính xác.
- [ ] Modal chi tiết: thông tin liên hệ/ý tưởng/ghi chú, tab lịch sử với icon/màu đúng trạng thái; đổi tab không mất form.
- [ ] Xác nhận, yêu cầu bổ sung, từ chối, hoàn thành, đổi/hủy lịch theo trạng thái và quyền; chỉ chọn hành động chưa gửi cập nhật.
- [ ] Ngày/giờ bắt buộc khi cần; lý do bắt buộc ở từ chối/hủy; lỗi API giữ draft, thử lại không gửi trùng.
- [ ] Đổi vì thời tiết điền ngày đề nghị, không tự mang giờ cũ sang; chấp thuận hoặc phản hồi không chấp thuận giữ lịch cũ đúng.
- [ ] Yêu cầu đã kết thúc chỉ có thao tác hợp lệ; lịch sử, khách và tab Lịch đồng bộ sau cập nhật.

### 31.3. Lịch

- [ ] Ngày/tuần/tháng, trước/sau, Hôm nay và chọn ngày đúng; không lệch ngày theo múi giờ.
- [ ] Ưu tiên ngày/giờ đã chốt; chưa chốt có nhãn dự kiến; tuần đủ bảy ngày, ngày trống có giải thích.
- [ ] Bộ lọc ẩn/hiện lịch kết thúc và “Đến lịch gần nhất” dùng đúng tập dữ liệu; không bỏ sót bản ghi qua pagination.
- [ ] Mở sự kiện ra modal chi tiết; cập nhật xong lịch đổi đúng; mobile tháng dùng danh sách đọc được.

### 31.4. Lịch rảnh

- [ ] Công tắc đủ bảy ngày: nhận lịch/ngày nghỉ đúng; tắt khóa giờ nhưng giữ giá trị đã nhập.
- [ ] Sửa giờ bắt đầu/kết thúc; chặn thiếu giờ hoặc kết thúc không sau bắt đầu; timezone Việt Nam đúng với backend.
- [ ] Thêm ngày nghỉ bằng nút riêng, chặn ngày trùng; ngày hiển thị dễ đọc; xóa chỉ bỏ đúng ngày.
- [ ] Lưu, bỏ thay đổi, dirty, busy, thành công, tải lỗi/thử lại và lỗi lưu giữ draft.
- [ ] Sau lưu và F5 vẫn đúng; phía khách/API thực sự áp dụng ngày nghỉ và khung giờ, không chỉ đổi giao diện admin.

### 31.5. Gói chụp

- [ ] Tên/mô tả/giá và bốn thông số thời lượng, số ảnh, số người, ngày giao đúng dữ liệu.
- [ ] Thêm/sửa mở modal, điền đúng bản ghi; tiêu đề/nút đóng, Esc, vùng cuộn và footer cố định hoạt động trên màn hình thấp.
- [ ] Validation tên/đường dẫn/danh mục/mô tả và giới hạn số phù hợp API; thử slug trùng và nội dung dài.
- [ ] Đóng khi có thay đổi yêu cầu xác nhận; hủy đóng giữ draft; lỗi lưu giữ form; busy chặn gửi trùng.
- [ ] Lưu thêm/sửa, ẩn có xác nhận và tải lại danh sách; gói ẩn không xuất hiện để đặt mới bên khách.

### 31.6. Đánh giá

- [ ] Danh sách có số sao, mã lịch, nội dung và phản hồi đúng; trạng thái rỗng/tải lỗi có xử lý phù hợp.
- [ ] Nhập và gửi phản hồi bằng thao tác giao diện hiện có (Enter); tiếng Việt, nội dung rỗng/dài và lỗi API được kiểm tra.
- [ ] Phản hồi lưu bền sau F5, thuộc đúng đánh giá, hiển thị phía khách đúng; kiểm tra quyền server.

### 31.7. Chính sách

- [ ] Ba nút gạt: đổi cá nhân, đổi vì thời tiết, khách tự hủy; nhãn/focus/bàn phím đúng, đổi gạt chưa tự gửi lưu.
- [ ] Tắt đổi cá nhân khóa ô deadline; tắt thời tiết ẩn phần giải thích phù hợp; lưu rồi tải lại giữ đúng lựa chọn.
- [ ] Deadline 0–720 giờ; tỷ lệ hoàn 0–100%, đúng thứ tự theo mốc; chặn cấu hình sai ở cả UI/API.
- [ ] Lưu/bỏ thay đổi/dirty/busy, lỗi giữ draft, thành công và cảnh báo rời tab hoạt động.
- [ ] Đối chiếu chính sách thật với lịch khách ở sát deadline/mốc hoàn, chưa chốt giờ dùng 00:00 Việt Nam, không tự chuyển tiền hoàn cọc.

## 32. Trang không tồn tại và route cũ — `/404`, URL sai

- [ ] URL không tồn tại, slug/ID sai và route hồ sơ bắt mọi đường dẫn không gây trang trắng hoặc vòng redirect.
- [ ] Nút về trang chủ/Back hoạt động; tài nguyên/API thiếu trả mã và thông báo phù hợp.
- [ ] Alias yêu thích, `/profile`, `/upload` và link cũ còn dùng không dẫn tới route hỏng.
- [ ] R chung hoàn tất.

## 33. Kiểm tra tích hợp cuối và đưa lên host

- [ ] Chạy build frontend, kiểm thử backend và các script chức năng liên quan; lưu kết quả/commit. Chạy TypeScript và lint toàn dự án; ghi rõ lỗi legacy còn lại và quyết định xử lý, không coi build Vite là type-check.
- [ ] Kiểm tra biến môi trường, API base URL, HTTPS, CORS, cookie Secure/SameSite, CSRF và session trên domain đích.
- [ ] Host cấu hình SPA fallback: F5 trực tiếp các URL con/admin/ảnh/lịch không bị host trả 404; `/api` và static assets không bị rewrite thành HTML.
- [ ] Database kết nối, index/migration cần thiết, dữ liệu khởi tạo và lưu trữ ảnh hoạt động; ảnh upload còn truy cập sau restart.
- [ ] Google OAuth callback, SMTP/email, liên kết xác nhận/reset và thông báo chạy trên staging bằng tài khoản test; không suy từ fixture PASS.
- [ ] Kiểm tra phân quyền endpoint admin, IDOR, upload sai loại/quá cỡ, nội dung HTML/XSS, giới hạn request và thông tin nhạy cảm trong response/log/build.
- [ ] Trình duyệt desktop Chrome/Edge/Firefox và Safari iPhone/Chrome Android: chạy luồng chính; ghi thiết bị thật hay giả lập.
- [ ] Tải trang đầu và ảnh với mạng chậm; không lỗi chunk, vòng tải dữ liệu, nhảy layout nghiêm trọng; ghi các cảnh báo bundle cần xử lý.
- [ ] Title/meta/canonical/social preview, robots/sitemap theo cấu hình; staging không bị index ngoài ý muốn.
- [ ] PWA/cache nếu bật: bản mới tải được, cache cũ không giữ bundle lỗi; mất mạng có phản hồi phù hợp.
- [ ] Có backup database/media, cách rollback build và người chịu trách nhiệm; không mang tài khoản/dữ liệu test không cần thiết lên production.
- [ ] Không còn lỗi P0/P1; lỗi còn lại có người chịu trách nhiệm và quyết định chấp nhận bằng văn bản.
- [ ] Sau deploy: smoke test trang chủ → đăng nhập → ảnh → đặt lịch test → admin xem → đăng xuất; kiểm tra log/health và rollback nếu luồng chính hỏng.

## 34. Nhật ký kết quả và lỗi

| Lượt | Ngày giờ VN | Build/commit | Môi trường | Thiết bị/trình duyệt | Mục đã test | Kết quả | Bằng chứng/người test |
|---|---|---|---|---|---|---|---|
| Cuối 01 | Chưa chạy | — | — | — | — | Chưa nghiệm thu | — |

| ID lỗi | Trang/mục | Mức độ | Bước tái hiện + thực tế | Mong đợi | Người xử lý | Trạng thái/bằng chứng test lại |
|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — |

P0: mất dữ liệu, lộ dữ liệu hoặc toàn hệ thống ngừng hoạt động. P1: luồng chính không hoàn tất hoặc sai quyền/quy tắc nghiệp vụ. P2: lỗi chức năng phụ/giao diện có đường xử lý khác. P3: lỗi trình bày nhỏ.

## 35. Chốt nghiệm thu

- [ ] Mọi mục trang có kết quả, R chung đã chạy, các ca N/A có lý do.
- [ ] Người kiểm thử xác nhận: __________; ngày giờ: __________; build: __________.
- [ ] Người phụ trách đồng ý đưa lên host: __________; lỗi chấp nhận còn lại: __________.
- [ ] Smoke test sau triển khai đạt; người xác nhận: __________; URL: __________.
