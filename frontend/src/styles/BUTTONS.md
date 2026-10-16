# Màu nút PhotoCloud

Nguồn duy nhất của palette nút: src/styles/button-tokens.css. Các giá trị màu chỉ khai báo trong :root và html.dark-theme ở file đó. CSS của trang chỉ tham chiếu token, không thêm mã màu hoặc tự pha nâu khác.

- primary: Đặt lịch, Tạo, Gửi, Lưu thay đổi, Tải xuống, Thử lại.
- secondary: Chia sẻ, Xuất, Hủy, các thao tác phụ. Nền kem/tối, chữ nâu/be, viền nhẹ.
- ghost/link: điều hướng, đóng, menu; nền trong suốt, hover dùng secondary-hover.
- selected: bộ lọc/tab/đã yêu thích; giữ aria-pressed hoặc trạng thái hiện có, không chỉ dùng màu.
- danger: xác nhận xóa; icon xóa dùng danger-text trên danger-soft hoặc nền trong suốt.
- success: thao tác mang ý nghĩa duyệt/chấp thuận; không dùng vì nút nằm trong màn hình thành công.

Dùng Button với variant default/outline/secondary/ghost/link/destructive cho phần mới. Component xuất data-variant cho stylesheet chung; asChild cũng giữ màu qua data-slot. Phần legacy giữ cấu trúc và hành vi, sử dụng cùng token trực tiếp trong CSS.

Ví dụ CSS: background: var(--button-primary-bg); color: var(--button-primary-fg). Hover dùng --button-primary-hover; không đổi riêng nền mà bỏ qua màu chữ. Focus dùng --button-focus. Không dùng --accent hoặc --text-primary để tự tạo palette nút.

Không đổi màu ảnh, swatch chọn màu, biểu đồ hoặc badge trạng thái để đồng bộ nút. Nút đặt trên ảnh dùng cùng token và nền đủ rõ. Giữ hiệu ứng/geometry hiện có trong phạm vi thay màu.

Đổi thương hiệu: chỉnh các cặp bg/fg và hover ở button-tokens.css cho cả hai theme; chạy node scripts/test-button-tokens.cjs để kiểm token thiếu và tương phản, sau đó kiểm browser. Bộ kiểm tra browser còn đổi primary token lúc chạy để bảo đảm header và nút legacy đều nhận thay đổi.
