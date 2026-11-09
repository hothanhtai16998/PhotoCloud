# PhotoCloud — Quy tắc nghiệp vụ và phối hợp chung

Áp dụng toàn repository. Cập nhật: 09/11/2026.
Đọc file này trước, sau đó chỉ đọc hướng dẫn khu vực được giao:

| Công việc | Hướng dẫn |
|---|---|
| Frontend | [frontend/AGENTS.md](frontend/AGENTS.md) |
| Backend | [backend/AGENTS.md](backend/AGENTS.md) |
| Cả hai | Đọc cả hai; chỉ sửa phạm vi người dùng giao |

## Phạm vi và phối hợp

- Yêu cầu hiện tại của người dùng quyết định công việc. Đọc tài liệu không tự
  cấp quyền sửa; yêu cầu tổng quát không mở rộng sang khu vực chưa được giao.
- Khu vực admin do phiên được giao admin tường minh phụ trách. Phiên user
  không tự sửa admin. Khi sửa phần dùng chung có admin phụ thuộc, cần sự cho
  phép nếu phiên chưa có; quyền đã cấp trong phiên tiếp tục có hiệu lực.
- Không ghi đè công việc hoặc tài liệu tiến độ của phiên khác. Khi bàn giao,
  phân loại thay đổi user/admin/chung và nêu rõ tác động liên quan.
- Quy tắc triển khai, kiểm tra và tài liệu từng khu vực nằm trong hướng dẫn
  tương ứng; không sao chép cùng một quy tắc sang nhiều nơi.

## Nghiệp vụ và dữ liệu

- Không bịa hoặc suy diễn dữ kiện nghiệp vụ. Phân biệt dữ liệu thật với mẫu;
  số liệu, danh tính, thông tin liên hệ và cam kết chính sách cần chủ website
  xác nhận. Khi thiếu dữ liệu thật, giữ trạng thái thiếu thay vì tạo giá trị giả.
- Giữ chức năng và quy tắc đã được người dùng chấp nhận. Thay đổi hành vi phải
  nêu rõ phạm vi; không tự xóa hoặc đổi nghiệp vụ chỉ để dễ tổ chức code.
- Bảo vệ quyền truy cập theo tài khoản và đối tượng dữ liệu. Không để dữ liệu
  riêng của phiên cũ chuyển sang phiên/tài khoản mới.
- Không lưu secret, mật khẩu, token hoặc nội dung `.env` vào code, log hay
  tài liệu. Dữ liệu ngoài chưa xử lý không được coi là đáng tin.
- Dùng fixture/dữ liệu test phù hợp; không sửa/xóa dữ liệu thật để chứng minh
  chức năng. Không tự chạy thao tác cấp quyền hoặc migration trên dữ liệu thật.

## Bằng chứng và bàn giao

- Kết luận dựa trên kiểm tra trong phạm vi. Không bỏ qua lỗi chặn đã biết;
  ghi tác động, trạng thái và phần còn chưa kiểm. Không tuyên bố sẵn sàng lên
  host hoặc hoàn tất toàn bộ chỉ dựa trên build/test một phần.
- Phân biệt kiểm tự động, kiểm thủ công và xác nhận trên môi trường thật.
  Chỉ người dùng quyết định nghiệm thu; không tự thay trạng thái họ đã đánh.
- Chỉ kết luận hiệu năng khi có đo, ghi môi trường/dữ liệu/phiên và giới hạn.
  Số fixture hoặc một lượt kiểm không chứng minh hiệu năng production.
- Khi đổi trách nhiệm hoặc cấu trúc, cập nhật tài liệu đúng nơi sở hữu cùng
  code; không giữ nội dung mô tả thay đổi đã bị hoàn tác.

## Ký ức giữa các chat — AgentMemory

- Khi có công cụ, đầu nhiệm vụ tìm phần liên quan bằng `memory_recall` hoặc
  `memory_smart_search`, project `PhotoCloud`. Vẫn đọc lại hướng dẫn và tài
  liệu hiện tại; ký ức là tham khảo, không cấp quyền hoặc thay thế bằng chứng.
- Tự lưu quyết định rõ của người dùng, nguyên nhân lỗi/cách sửa đã kiểm chứng
  và điểm bàn giao bằng `memory_save`; ghi ngày/phạm vi/bằng chứng/phần chưa kiểm,
  tránh trùng. Không tự nhập toàn bộ lịch sử chat khác.
- Không lưu secret hoặc dữ liệu cá nhân không cần thiết. Không dùng ký ức cũ
  để mở rộng phạm vi, thay nghiệm thu hoặc coi dữ liệu mẫu là thật.
- Nếu không kết nối được, báo ngắn gọn và tiếp tục theo tài liệu dự án;
  không tuyên bố đã lưu khi chưa có xác nhận từ công cụ.

Thiết lập: [docs/AGENTMEMORY_SETUP.md](docs/AGENTMEMORY_SETUP.md).
