# CloudFront: mẫu cấu hình thủ công

`cors-function.js` là bản source của CloudFront Function trước đây nằm ở
`cloudfront-function-cors.js` tại gốc repository. Không có import, npm script,
workflow CI hoặc cấu hình Fly/Docker trong repo gọi file này. Frontend/backend
không cần tải file để chạy.

Giữ bản source ở đây để đối chiếu hoặc triển khai thủ công. Lượt dọn chỉ di chuyển
file, không đổi nội dung, không publish function hoặc thay cấu hình AWS.
Chưa kiểm CloudFront Console nên không khẳng định bản này đang được gắn với
distribution, hoặc đang khớp bản AWS. Không tự publish lại mẫu cũ khi chưa kiểm
origin và behavior thực tế.

Hai script trích frame video và năm ZIP snapshot cũ ở gốc đã được bỏ khỏi working
tree theo lượt dọn ngày 22/10/2026. Đây không phải phần của quy trình triển khai;
phiên bản file trước khi xóa vẫn nằm trong lịch sử Git sau khi commit thay đổi.
