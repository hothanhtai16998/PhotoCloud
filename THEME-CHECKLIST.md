# Kiểm tra nền sáng/tối và A09

## Cách kiểm tra chung

1. Mở trang ở desktop, sau đó thử mobile khoảng 390px và 320px.
2. Chuyển sáng/tối từ menu. Sáng: nền trang/header trắng ngà #FAF8F4; tối: nền trang/header gold trầm #242017, nền phụ #2B251B và card #332C21. Header trên ảnh slideshow có thể trong suốt.
3. Cuộn từ đầu tới cuối, mở menu/panel nếu có. Không có mảng trắng thuần bất ngờ khi bật tối; chữ/icon/viền vẫn đọc được.
4. Tải lại trang và chuyển sang trang khác: chế độ đã chọn phải được giữ.
5. Card, ô nhập và khu vực phụ có thể dùng nền phân cấp; ảnh, logo và màu trạng thái không cần đổi thành màu body.

## Danh sách theo trang

| Trang | Những phần cần kiểm tra |
|---|---|
| Trang chủ `/` và danh mục `/t/...` | Header trên slideshow và sau khi cuộn, vùng Studio, gói chụp, footer, trạng thái slideshow rỗng/lỗi |
| Khám phá `/explore` | Nền trang, thanh lọc, danh sách ảnh và phân trang |
| Gói chụp `/packages`, `/packages/...` | Nền trang, gói, FAQ và CTA |
| Về studio `/about` | Nền nội dung và các section khi cuộn |
| Liên hệ `/contact` | Nền trang, form và ô nhập |
| Blog `/blog`, bài `/blog/...` | Danh sách, bài chi tiết, vùng chữ dài |
| Bộ sưu tập `/collections` | Nền danh sách, bộ lọc, trạng thái rỗng |
| Chi tiết bộ sưu tập `/collections/...` | Header, danh sách ảnh; mở chỉnh sửa nếu có quyền |
| Yêu thích `/favorites`, `/favorites/collections` | Nền tab, danh sách và rỗng; mở panel trái tim trên header |
| Tìm kiếm `/s/photos/...` | Nền trang, thanh tìm kiếm, kết quả và rỗng |
| Ảnh `/photos/...` | Mở ảnh thật từ grid; nền thanh thông tin, nội dung và ảnh liên quan; thử cả trang độc lập và modal |
| Lịch sử tải `/downloads` | Nền trang, danh sách và rỗng |
| Thông báo `/notifications`, `/settings/notifications` | Trang thông báo và dropdown chuông: nền, icon, thời gian |
| Hồ sơ `/profile`, `/@username` | Nền hồ sơ, tab ảnh/booking và các modal chỉnh sửa |
| Cài đặt `/settings/profile`, `/profile/edit` | Các tab, input, phiên đăng nhập và nút lưu |
| Upload `/upload` | Chọn file để xem preview/form, nhưng không cần tải lên; dropdown/tag và modal |
| Đặt lịch `/booking` | Form đầy đủ và chọn gói |
| Modal đặt lịch | Tất cả bốn bước, nút đóng, quay lại; không cần gửi yêu cầu thật |
| Booking của tôi `/profile/bookings` | Nền danh sách, card và trạng thái rỗng |
| Chi tiết booking `/booking/...` | Mở booking thật: hợp đồng, questionnaire, lịch trình, reschedule, review |
| Đăng nhập `/signin`, đăng ký `/signup` | Nền form, input, nút Google và lỗi validation; khung minh họa tối vẫn giữ màu riêng |
| `/404` | Nền trang và nút quay lại |
| Admin `/admin` | Với quyền admin: mở từng tab, bảng, modal xác nhận và biểu mẫu; kiểm tra riêng từng trạng thái ở dark mode |

## A09: lỗi tải slideshow

1. Trang chủ đang tải bình thường phải giữ ảnh hiện có, không hiển thị lỗi.
2. Để tái hiện lỗi khi chưa có cache, mở tab ẩn danh, dùng DevTools chặn request `/api/images?...limit=10...`, rồi tải lại trang chủ.
3. Phải thấy “Không tải được ảnh nổi bật.” và nút “Thử lại”, thay vì “Chưa có ảnh nổi bật”.
4. Bỏ chặn request, bấm “Thử lại”: ảnh tải lại, thông báo lỗi biến mất.
5. Khi API trả danh sách rỗng thành công, hiển thị “Chưa có ảnh nổi bật”; đó không phải lỗi mạng.

## Giới hạn kiểm chứng

Bài kiểm tra route production dùng API giả và dữ liệu rỗng. Trang chi tiết ảnh/collection/booking, bài blog, hồ sơ và các tab admin cần dữ liệu thật để kiểm tra đầy đủ. Không coi kiểm tra source hoặc trạng thái rỗng là đã xác nhận mọi phần của một trang.

Kết quả lượt rà: 88 mẫu route/theme/viewport; upload bị treo trong cả bốn mẫu, cần kiểm tra trên app thật. Admin fixture thiếu số liệu và hiển thị ErrorBoundary; chi tiết collection/booking dùng ID giả bị chuyển hướng. Những mục này chưa được xác nhận bằng render đầy đủ. Các mẫu đọc được không còn mảng trắng thuần trong viewport; đây không phải kiểm tra toàn bộ nội dung sau cuộn của mọi trang.
