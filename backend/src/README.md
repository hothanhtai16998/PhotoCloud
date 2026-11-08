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

### Refactor trách nhiệm ngày 08/11/2026

- `controllers/user/userController.js` giữ vai trò entry point tương thích; implementation nằm trong directory, password, profile, stats, pinned images và preferences controllers.
- `controllers/collection/collectionCRUDController.js` re-export read/write controllers. Không đổi route hoặc tên handler.
- `services/auth/passwordRequirements.js` sở hữu đọc chính sách mật khẩu từ settings; `services/media/activityGuard.js` sở hữu kiểm tra chống lạm dụng lượt xem/tải.
- Utility thuần `profileFields`, `publicUser`, `colorNames`, `dominantColorSelection` dùng lại quy tắc ổn định; không chứa I/O.
- Chi tiết phạm vi, kiểm chứng và bảng quét từng file: [báo cáo backend](../../BACKEND_MAINTAINABILITY_REVIEW.md).

Cấu trúc này được sắp xếp lại từ bố cục cũ (`libs/`, `configs/`, `utils/` lẫn lộn hàm thuần với code I/O, controller rải theo file ở gốc `controllers/`). Việc di chuyển chỉ đổi vị trí file và đường dẫn import — không đổi route, không đổi tên hàm, không đổi hành vi.


## Cấu trúc sau đợt hoàn tất sắp xếp 08/11/2026

| Khi cần sửa | Mở tại |
|---|---|
| Đăng nhập mật khẩu/đăng ký | `controllers/auth/credentialsController.js` |
| Đăng nhập Google | `controllers/auth/googleAuthController.js` |
| Refresh, đăng xuất, quản lý phiên | `controllers/auth/sessionController.js` |
| Tạo phiên/token, thông báo thiết bị mới dùng chung | `services/auth/loginSession.js` |
| Khởi tạo SDK R2 | `config/r2Client.js` |
| Đọc/ghi/xóa object, URL upload R2 | `services/storage/r2Objects.js` |
| Sinh các phiên bản ảnh/WebP/AVIF | `services/storage/imageStorage.js` |
| Upload video và avatar | `services/storage/mediaStorage.js` |
| Chạy ffmpeg/ffprobe có timeout | `services/media/mediaCommand.js` |
| Tạo/dọn workspace tạm | `services/media/mediaTempFiles.js` |
| Lấy màu/EXIF và kích thước ảnh với fallback | `services/media/imageMetadata.js` |
| Tạo thumbnail PNG nhỏ | `services/media/blurThumbnail.js` |
| Upload trực tiếp theo API cũ | `controllers/image/directUploadController.js` |
| Cấp URL upload, hoàn tất và hủy upload trước | `controllers/image/stagedUploadController.js` |
| Tạo bản ghi ảnh upload trực tiếp | `services/media/directUpload.js` |
| Lọc danh sách ảnh | `services/search/imageListing.js` |
| Truy vấn một trang ảnh, dùng chung các nhánh thử lại | `services/search/imagePage.js` |
| Chuẩn hóa dữ liệu ảnh trả về | `utils/imageListingResponse.js` |
| Kiểm quyền vào phòng WebSocket và cache quyền phòng | `services/realtime/roomPermissions.js` |
| Kiểm địa chỉ IP/CIDR | `utils/ipAccessRules.js` |

`config/storage.js`, authController và imageUploadController vẫn xuất các tên hàm
cũ để các route, worker và admin không phải sửa cùng lúc. Module triển khai mới
không import ngược từ những entry point này; riêng các nơi gọi cũ được giữ ổn
định. Không xóa API upload cũ vì chưa có yêu cầu bỏ tính năng đó.

Một controller không cần tách chỉ vì đạt vài trăm dòng: giữ các handler ngắn
cùng nghiệp vụ trong cùng file. Model sở hữu schema, worker sở hữu claim/lease,
server sở hữu thứ tự gắn middleware và khởi động. Đợt này không thay schema hay
chuyển controller admin. Ba sửa lỗi hành vi được ghi riêng trong báo cáo:
timeout media, giải phóng slot request một lần, và xử lý IP/CIDR chuẩn.

### Số liệu request và cache bất đồng bộ

- `services/monitoring/requestMetrics.js` sở hữu phép đếm request/lỗi theo cùng
  cửa sổ năm phút (độ phân giải một giây). `systemMetrics.js` giữ tên export cũ.
  Các hàm ghi số liệu chưa được nối tự động vào HTTP; không coi giá trị 0 là
  bằng chứng production không có lỗi. Storage chưa probe trả `unknown`.
- `services/cache/queryCache.js` gom các lượt đọc đang chạy cùng khóa; invalidation
  hủy quyền ghi cache của lượt đọc cũ. Giữ `deleteCache`/`clearCache` tại nơi ghi
  dữ liệu để ngăn kết quả cũ tái tạo cache sau khi thay đổi dữ liệu.
- `middlewares/requestQueue.js` sở hữu listener trong thời gian request thực sự
  chờ; gỡ khi chuyển sang chạy hoặc hết hạn/hủy. Không giữ số đếm IP bằng 0.
