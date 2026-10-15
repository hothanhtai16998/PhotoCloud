# A10: đăng ký nhận tin

## Đã triển khai

- Footer gọi `POST /api/newsletter/subscribe`, không mở ứng dụng email.
- Đăng ký lưu trong collection MongoDB `newslettersubscriptions`; email duy nhất, trạng thái pending/subscribed/unsubscribed và ngày xác nhận/hủy.
- Email xác nhận dùng SMTP hiện có, link hiệu lực 24 giờ. Token ngẫu nhiên 32 byte; DB chỉ lưu SHA-256. Link dùng fragment `#token=...` để không đưa token vào access log của trang.
- Link mở trang `/newsletter/confirm` hoặc `/newsletter/unsubscribe`; người dùng phải bấm nút xác nhận mới thay đổi trạng thái. GET không kích hoạt/hủy đăng ký.
- Giới hạn 20 request/giờ/IP cho newsletter và cách nhau 60 giây cho lần gửi lại cùng email. Đã đăng ký hoặc đang trong thời gian chờ trả lời chung để không công khai danh sách người đăng ký.
- SMTP lỗi trả 503; không báo đã xác nhận/đã gửi thành công. Link xác nhận lỗi gửi bị thu hồi.

## Cấu hình dùng thật

1. Khởi động lại backend sau cập nhật route/model. Dùng frontend mới (dev server sẽ tự cập nhật hoặc build/deploy lại).
2. Trong Admin > Cài đặt > SMTP, bật SMTP và điền host, port, secure, tài khoản, mật khẩu và địa chỉ gửi đúng của dịch vụ đang dùng. Không đưa mật khẩu vào git/chat.
3. Địa chỉ gửi phải được dịch vụ email cho phép; cấu hình DNS xác minh theo dịch vụ nếu dùng tên miền riêng. Không mua gói hoặc tạo tài khoản trả phí tự động trong thay đổi này.
4. `FRONTEND_URL` (hoặc `CLIENT_URL` nếu không đặt) phải là URL frontend thực tế, ví dụ local `http://localhost:5173` hoặc domain production có HTTPS. Không dùng URL API làm URL frontend.
5. Không cần `RESEND_API_KEY` riêng cho luồng này: nó dùng lại `sendUserEmail` và SMTP lưu trong settings.

## Kiểm tra với email của chính bạn

1. Đăng ký ở footer: email sai bị từ chối; email hợp lệ hiện lời nhắc kiểm tra hộp thư/thư rác.
2. Trong DB, trạng thái ban đầu là pending. Chưa bấm xác nhận thì chưa được đưa vào danh sách gửi bản tin.
3. Mở email, mở link xác nhận: việc mở trang chưa kích hoạt. Bấm “Xác nhận đăng ký”: hiển thị thành công, DB chuyển subscribed.
4. Đăng ký lại email đã subscribed: không tạo bản ghi hoặc gửi email xác nhận trùng.
5. Mở link hủy trong email và bấm “Hủy nhận tin”: DB chuyển unsubscribed. Bấm lại cùng link vẫn thành công.
6. Đăng ký lại sau ít nhất 60 giây: nhận email mới, phải xác nhận lại; link cũ không hủy lần đồng ý mới.
7. Thử link sửa sai/hết hạn, mất mạng, SMTP tắt, bấm liên tục và kiểm tra sáng/tối mobile/desktop.

## Kiểm chứng và phạm vi

- `cd backend` rồi `node --test tests/newsletter.test.js`: kiểm tra service với repository/mail giả, schema index; không kết nối MongoDB hoặc gửi email thật.
- `cd frontend` rồi `node scripts/test-route-surfaces.cjs --newsletter`: build production trước; kiểm tra form và hai trang hành động bằng API giả.
- Gửi thư qua SMTP thật, deliverability/hộp thư rác, index DB trên deployment và DNS chưa được xác minh trong lượt code này.
- Đây là luồng nhận đăng ký có xác nhận/hủy, chưa có công cụ soạn hoặc tự động gửi chiến dịch định kỳ. Khi làm chiến dịch, chỉ gửi cho subscribed, tạo link hủy hợp lệ cho từng người và kiểm tra trạng thái ngay trước khi gửi.
