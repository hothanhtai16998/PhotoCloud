# Câu lệnh rà soát và sửa trang

Sao chép đoạn dưới vào chat mới trong dự án, thay `[tên trang hoặc route]` bằng trang cần xử lý.

```text
Đọc AGENTS.md và PAGE_INVENTORY_AND_ANALYSIS.md trước khi làm.

Dùng $impeccable rà soát và sửa trang [tên trang hoặc route]:
- Đơn giản hóa logic, bỏ state dư, nhánh xử lý trùng và code không còn dùng.
- Tái sử dụng code hiện có; giao diện lặp chuyển thành component chung, logic lặp chuyển thành hook/utility/service phù hợp. Tránh copy-paste và tổng quát hóa quá mức.
- Tách theo trách nhiệm; file nguồn trên 1.000 dòng phải tách nhỏ.
- Giữ các chức năng đã nghiệm thu; kiểm tra hiệu năng, accessibility, sáng/tối và các trạng thái tải/rỗng/lỗi/thử lại.
- Chạy kiểm tra phù hợp, báo rõ kết quả và phần chưa kiểm.
- Cập nhật inventory bằng checklist dễ hiểu, giữ dấu x/o của tôi; chỉ gạch ngang khi tôi xác nhận đạt hết.
- Responsive kiểm riêng sau khi hoàn tất chức năng tất cả trang. Trang chủ để sau, các trang còn lại theo thứ tự inventory.

Thực hiện sửa code và kiểm tra, không chỉ đưa ra đề xuất.
```
