# Màu nút PhotoCloud

Nguồn mặc định duy nhất: shared/sitePalette.json ở gốc repository. Admin → Cài đặt website → Bảng màu website cho phép lưu palette sáng/tối; CSS của trang chỉ tham chiếu token, không thêm mã màu hoặc tự pha nâu khác. button-tokens.css giữ alias và quy tắc nút, không giữ bản sao mã màu mặc định.

- primary: Đặt lịch, Tạo, Gửi, Lưu thay đổi, Tải xuống, Thử lại.
- secondary: Chia sẻ, Xuất, Hủy, các thao tác phụ. Nền kem/tối, chữ nâu/be, viền nhẹ.
- ghost/link: điều hướng, đóng, menu; nền trong suốt, hover dùng secondary-hover.
- selected: bộ lọc/tab/đã yêu thích; giữ aria-pressed hoặc trạng thái hiện có, không chỉ dùng màu.
- danger: xác nhận xóa; icon xóa dùng danger-text trên danger-soft hoặc nền trong suốt.
- success: thao tác mang ý nghĩa duyệt/chấp thuận; không dùng vì nút nằm trong màn hình thành công.

Dùng Button với variant default/outline/secondary/ghost/link/destructive cho phần mới. Component xuất data-variant cho stylesheet chung; asChild cũng giữ màu qua data-slot. Phần legacy giữ cấu trúc và hành vi, sử dụng cùng token trực tiếp trong CSS.

Ví dụ CSS: background: var(--button-primary-bg); color: var(--button-primary-fg). Hover dùng --button-primary-hover; không đổi riêng nền mà bỏ qua màu chữ. Focus dùng --button-focus. Không dùng --accent hoặc --text-primary để tự tạo palette nút.

Không đổi màu ảnh, swatch chọn màu, biểu đồ hoặc badge trạng thái để đồng bộ nút. Nút đặt trên ảnh dùng cùng token và nền đủ rõ. Giữ hiệu ứng/geometry hiện có trong phạm vi thay màu.

Đổi màu đang vận hành: dùng bảng màu trong admin, xem ví dụ rồi Lưu thay đổi. Khôi phục mặc định chỉ sửa bản nháp cho tới khi lưu. Màu được lưu qua settings API có kiểm quyền/CSRF; public API chỉ trả dữ liệu màu đã kiểm tra. Không chấp nhận CSS tùy ý.

Đổi mặc định của sản phẩm: chỉnh shared/sitePalette.json; chạy node scripts/generate-palette-defaults.cjs (predev/prebuild cũng chạy) để sinh palette-defaults.css. Chạy node scripts/test-button-tokens.cjs và node scripts/test-site-palette.cjs, rồi kiểm browser. Cache local được áp dụng trước React mount; settings công khai đối soát sau đó. Không gọi API mỗi khi kéo color picker, không polling.

Phạm vi là các màu giao diện ngữ nghĩa đã nối token: nền/chữ/viền/điểm nhấn/nút/trạng thái và alias studio/admin. Màu ảnh, logo, biểu đồ dữ liệu, màu riêng nhà cung cấp và mọi màu legacy chưa dùng token không được cam kết đổi hết bằng editor. Khi thêm giao diện, dùng token để hưởng palette chung.
