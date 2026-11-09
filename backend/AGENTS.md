# PhotoCloud — Hướng dẫn backend

Áp dụng cho `backend/**`, cùng [AGENTS.md gốc](../AGENTS.md).
Đọc phần liên quan trong [kiến trúc backend](src/README.md), rồi tra đúng nhóm
file trong [BACKEND_FILE_MAP.md](../BACKEND_FILE_MAP.md). Không cần đọc toàn bộ
bản đồ. [Báo cáo rà code](../BACKEND_MAINTAINABILITY_REVIEW.md) ghi bằng chứng
và các giới hạn còn mở; không dùng báo cáo cũ thay cho code hiện tại.

## Ranh giới backend vs frontend (cập nhật 29/10/2026)

- **Mặc định của phiên này là backend.** Công việc được giao và các yêu cầu đang mở chỉ thuộc phạm vi `backend/**`, `.github/**` và tài liệu. Không tự mở rộng sang `frontend/src/**`.
- **Không sửa frontend khi chưa được hỏi rõ ràng.** Kể cả khi việc sửa có vẻ hiển nhiên (dọn lint, sửa lỗi type, sửa lỗi correctness) hoặc khi người dùng đã chọn một phương án có nhắc tới frontend trong câu hỏi đặt ngữ cảnh khác. Phải **hỏi lại người dùng ở lượt đó** và chỉ sửa những file được duyệt tường minh.
- **Cách duyệt không hợp lệ:** chọn một phương án tổng quát như “làm cho CI xanh” không phải giấy phép sửa mọi file cần thiết. Hệ quả phải nằm trong phạm vi câu hỏi đã đặt ra.
- **Nếu đã lỡ sửa frontend:** báo rõ danh sách file và mức độ ảnh hưởng, lưu bản vá vào `.local-backups/` (đã gitignore) rồi hoàn tác về HEAD, và chỉ sửa lại khi có duyệt mới.
- **Ảnh hưởng lên CI phải nói rõ:** khi hoàn tác frontend, lint của frontend về lại trạng thái cũ (nhiều lỗi có sẵn) nên job lint ở `ci.yml` phải giữ `continue-on-error: true`, hoặc người dùng phải duyệt riêng việc dọn lint.
- **Tài liệu kiểm chứng phải trung thực:** mục inventory ghi đúng trạng thái sau khi hoàn tác, không để lại claim về thay đổi đã bị gỡ.

## Ranh giới admin và phần dùng chung

- Giữ nguyên `src/controllers/admin/**` trong phiên không được giao admin.
  Không đọc để sửa/refactor/định dạng/xóa hoặc thay import tại khu vực này.
- Phần backend dùng chung mà admin dùng cần sự cho phép theo file gốc; quyền
  đã cấp trong phiên không phải hỏi lại. Kiểm caller và giữ hợp đồng export.
- Nếu công việc API cần cập nhật checklist trang, đọc mục inventory/nghiệm thu
  trong [hướng dẫn frontend](../frontend/AGENTS.md); chỉ cập nhật phần được giao.
  Không tự đổi dấu nghiệm thu dựa vào fixture.

## Kiến trúc và nơi đặt code

- `routes → controllers → services → models`; utility chỉ chứa hàm thuần.
  Route khai báo URL/middleware; controller đọc request/trả response; service
  sở hữu nghiệp vụ/I/O; model sở hữu schema/index/hook; worker giữ queue/retry/lease.
- Cấu hình SDK ở `config/`; đọc/ghi R2 ở `services/storage/`; xử lý ảnh/video
  ở `services/media/`. Không đặt I/O vào utility mới.
- Tìm implementation đã có trước khi thêm. Các file mỏng chuyển tiếp export
  là hợp đồng import tương thích, đặc biệt `config/storage.js`, `libs/s3.js`
  và shim `utils/`; không xóa khi caller cũ vẫn dùng.
- API phải tự kiểm dữ liệu và quyền sở hữu. Giữ route, status, response và
  hành vi đã duyệt; nếu cần đổi rule, ghi rõ và thêm regression test.
- Dùng fixture/mock/database test. Không chạy script cấp super admin, migration,
  cleanup hoặc gửi email thật chỉ để kiểm code.

## Quy tắc triển khai backend

- Mỗi luồng dữ liệu/quy tắc có nơi sở hữu rõ. Không tạo bản sao state hoặc
  nhiều implementation của cùng nghiệp vụ. Tìm code trùng trước khi viết mới;
  gom tính toán thuần vào utility, DB/network/filesystem vào service phù hợp.
- Rà code chết, nhánh lặp và abstraction không cần thiết trước khi chia file.
  File hơn 1.000 dòng cần tách theo trách nhiệm; file ngắn vẫn tách nếu trộn
  nhiều việc. Không chia cơ học chỉ để giảm dòng.
- Tên hàm/module thể hiện nhiệm vụ, đầu vào nhỏ và hợp đồng rõ. Không xây helper
  nhiều cờ để gom các luồng chỉ giống bề ngoài. Giải thích khác biệt cần giữ.
- Kiểm dữ liệu ngoài tại ranh giới API. Không thêm any, ép kiểu hoặc tắt lint
  để che lỗi. Comment giải thích lý do/ràng buộc; tái sử dụng module hiện có.
- Khi bỏ tính năng/module, kiểm caller rồi dọn import, dependency, timer,
  listener và tài nguyên không còn dùng. Giữ hợp đồng đã được chấp nhận.
- Kết quả request/job cũ không ghi đè trạng thái mới; kiểm đổi/đăng xuất tài
  khoản khi request chạy. Chặn thao tác trùng, retry đúng đối tượng và không
  báo thành công trước khi có bằng chứng. Không sửa rule đã duyệt chỉ vì refactor.
- Backend kiểm quyền và dữ liệu đầu vào cho thao tác quan trọng. Dùng auth,
  CSRF và validation hiện có; không tin dữ liệu do client cung cấp.

## Kiểm tra và cập nhật tài liệu

Chạy từ gốc repository:

```text
npm test --prefix backend
npm run verify:structure --prefix backend
npm run verify:admin --prefix backend
```

Thêm test phù hợp cho quyền, dữ liệu thiếu, retry, invalidation và request/job cũ.
Syntax/build pass không thay thế kiểm chức năng. Chạy thêm kiểm tra liên quan khi
có thay đổi mới hoặc lỗi chưa giải quyết, không lặp kiểm rộng vô hạn.

Khi thêm/xóa/đổi trách nhiệm file, cập nhật [bản đồ](../BACKEND_FILE_MAP.md) và
[hướng dẫn kiến trúc](src/README.md) cùng code. Ghi kết quả và phần chưa kiểm vào
[báo cáo backend](../BACKEND_MAINTAINABILITY_REVIEW.md); không đổi dấu nghiệm thu.
