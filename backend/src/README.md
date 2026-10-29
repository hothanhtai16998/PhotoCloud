# Cấu trúc `backend/src`

Mục tiêu: người bảo trì tìm được đúng chỗ sửa mà không phải lần theo nhiều bản sao hay chuỗi `import` khó đoán.

Mỗi tầng có một trách nhiệm rõ ràng. Luồng phụ thuộc đi theo một chiều:

```
routes → controllers → services → models
                 ↘ utils (hàm thuần)
```

## Các thư mục

| Thư mục | Trách nhiệm | Quy tắc |
|---|---|---|
| `config/` | Kết nối hạ tầng và cấu hình: biến môi trường, MongoDB, Cloudflare R2. | Validate và ném lỗi khi thiếu biến. Không chứa nghiệp vụ. |
| `controllers/` | Xử lý HTTP theo domain: đọc `req`, gọi service/model, trả response. | Không chứa logic nghiệp vụ dài; dùng `asyncHandler`. |
| `controllers/<domain>/` | Một thư mục cho mỗi domain: `auth/`, `user/`, `image/`, `collection/`, `booking/`, `catalog/`, `engagement/`, `search/`. | Mỗi thư mục có `index.js` làm entry point; route import từ barrel. |
| `services/` | Logic nghiệp vụ và mọi thao tác I/O (DB, HTTP, S3, mail, socket, fs). | Được phép import `models/`, `config/`, `utils/`. |
| `services/<nhóm>/` | Nhóm theo loại tác vụ: `ai/`, `audit/`, `booking/`, `cache/`, `collection/`, `email/`, `lifecycle/`, `media/`, `monitoring/`, `palette/`, `permissions/`, `realtime/`, `search/`. | — |
| `utils/` | **Chỉ hàm thuần.** Không I/O. | Xem quy tắc bên dưới. |
| `middlewares/` | Middleware Express: auth, phân quyền, CSRF, rate limit, cache, validate, multer, error handler. | Chạy trước controller, không gọi service trực tiếp nếu tránh được. |
| `models/` | Schema Mongoose và các hook. | Nguồn sự thật về hình dạng dữ liệu. |
| `routes/` | Định nghĩa endpoint và gắn middleware. | Chỉ khai báo URL + handler, không viết nghiệp vụ. |
| `workers/` | Job nền: xử lý ảnh, hàng đợi upload, gắn tag AI. | Được gọi từ `server.js` khi khởi động. |

## Quy tắc cho `utils/`

Một file **chỉ được ở lại `utils/`** khi đồng thời thỏa cả ba điều kiện:

1. Không import `models/`.
2. Không import `config/` (hay `libs/`, `configs/` cũ).
3. Không gọi HTTP, R2, socket, `fs` hay timer.

Vi phạm bất kỳ điều kiện nào → chuyển sang `services/`.

Tương ứng, `utils/` được phép import `utils/` khác và import gói ngoài (ví dụ `mongoose` chỉ để kiểm tra `ObjectId`).

### Vì sao có thể vẫn còn shim trong `utils/`?

Một số đường dẫn cũ trong `utils/` và `libs/` được giữ lại dưới dạng **re-export mỏng** vì `backend/src/controllers/admin/**` đang import đúng đường dẫn đó, mà khu vực admin nằm ngoài phạm vi refactor này. Mỗi shim có ghi chú nói rõ nơi implementation thật nằm. Khi khu vực admin được cập nhật riêng, các shim này có thể xóa.

## Vài dòng về cách tìm code

- Muốn đổi hành vi của một endpoint → mở `routes/<tên>.js`, nhảy tới handler trong `controllers/<domain>/`.
- Muốn đổi cách ghi log, gửi mail, đọc ảnh, cache → `services/<nhóm>/`.
- Muốn đổi hình dạng dữ liệu → `models/`.
- Muốn thêm một phép tính thuần (parse, validate, format) → `utils/`.

## Kiểm chứng

```bash
node --check <file>                    # cú pháp từng file
npm test                               # chạy tests/ (node --test)
npm run verify:structure               # import path, asset path, shim export parity
npm run verify:admin                   # chuỗi import của khu vực admin còn load được
```

`npm run verify:structure` bắt được loại lỗi mà `node --check` không thấy: một `import` trỏ tới file không còn tồn tại, một asset path sai số cấp thư mục, hoặc một shim không export đủ thứ mà nơi gọi đang destructuring.

## Ghi chú lịch sử

Cấu trúc này được sắp xếp lại từ bố cục cũ (`libs/`, `configs/`, `utils/` lẫn lộn hàm thuần với code I/O, controller rải theo file ở gốc `controllers/`). Việc di chuyển chỉ đổi vị trí file và đường dẫn import — không đổi route, không đổi tên hàm, không đổi hành vi.

