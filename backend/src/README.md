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

### Vòng đời tác vụ nền

`services/lifecycle/periodicTask.js` dùng chung cho dọn session, dọn upload tạm
và monitoring. Helper sở hữu timer, mã phiên start/stop và khóa chống chạy chồng
trong một tiến trình. Nghiệp vụ dọn dữ liệu và kiểm tra cảnh báo vẫn nằm trong
module tương ứng. `stop` không hủy I/O đã chạy và không thay thế distributed lock.

### Tra cứu chuẩn cho lần bảo trì sau

[AGENTS.md gốc](../../AGENTS.md) giữ quy tắc chung;
[backend/AGENTS.md](../AGENTS.md) giữ phạm vi và quy trình riêng backend.
[BACKEND_FILE_MAP.md](../../BACKEND_FILE_MAP.md) giữ danh mục folder, từng file,
export và test; chỉ mở nhóm cần dùng. README này giải thích kiến trúc và nơi đặt
code mới. Khi thêm/xóa/đổi nhiệm vụ file, cập nhật bản đồ cùng code.
Lịch nhắc booking cũng dùng periodicTask; khóa trong một tiến trình chưa chống
trùng nhiều instance.

## Quy tắc mở rộng backend

1. Luồng chính: `routes → controllers → services → models`; utility chỉ chứa
   tính toán/định dạng thuần. Controller đọc request, gọi nghiệp vụ, trả response.
   Không tạo React component cho logic backend.
2. Trước khi thêm hàm/file, tìm bằng `rg` tên nghiệp vụ và các export trong bảng
   dưới. Mở rộng đúng module đã sở hữu quy tắc; không copy sang controller khác.
3. Cấu hình SDK ở `config/`; I/O với R2 ở `services/storage/`; giải mã/chuyển đổi
   media ở `services/media/`. Không đưa xử lý ảnh vào config hoặc utility thuần.
4. Auth chia theo mật khẩu/Google/quản lý phiên. Tạo token/session dùng
   `loginSession`. Giữ riêng rule mật khẩu, định dạng hồ sơ công khai và chuẩn
   hóa field; không trả document User đầy đủ cho API công khai.
5. Giữ đường import công khai qua barrel/entry point khi di chuyển file.
   Những file mỏng chuyển tiếp export không phải code chết: kiểm caller trước
   khi xóa, đặc biệt `libs/s3.js`, `config/storage.js` và shim trong `utils/`.
6. `workers/` sở hữu claim/retry/lease và điều phối job nền; không chuyển lease
   sang controller. `periodicTask` dùng cho lịch định kỳ trong một tiến trình:
   start/stop an toàn, không tự chạy chồng; không thay thế distributed lock.
7. Cập nhật cache sau thao tác ghi tại nơi sở hữu nghiệp vụ. Dùng API invalidation
   hiện có; không ghi trực tiếp vào Map nội bộ. Query cache ngăn lượt đọc cũ ghi
   sau invalidation nhưng không sửa kết quả đã trả cho request trước đó.
8. Trạng thái chưa đo phải là unknown/null phù hợp, không tự báo connected/0.
   Không ghi log token, cookie, mật khẩu hoặc toàn bộ dữ liệu nhạy cảm của request.
9. Tách file theo trách nhiệm hoặc phần tái sử dụng ổn định. Không tách cơ học
   theo số dòng, không tạo helper với hàng loạt cờ cho các nghiệp vụ khác nhau.
10. Thêm regression test cho rule thay đổi, quyền, dữ liệu thiếu và bất đồng bộ.
    Chạy `npm test --prefix backend`, `npm run verify:structure --prefix backend`
    và `npm run verify:admin --prefix backend`. Không dùng script cấp quyền,
    migration hoặc cleanup với dữ liệu thật để chứng minh test chạy.
11. Khi thêm/xóa/đổi tên file hoặc thay trách nhiệm, cập nhật `BACKEND_FILE_MAP.md` và hướng dẫn kiến trúc trong README này. Không giữ hai implementation cho cùng
    quy tắc. Tài liệu phải ghi đúng phần chưa kiểm, không đổi dấu nghiệm thu.

### Trạng thái tài khoản trong xác thực

Đăng nhập, refresh, protected/optional auth và handshake WebSocket mới phải
thống nhất áp dụng `isBanned`. Khi bị ban, optional auth không gắn user; protected
API và handshake từ chối. Refresh tài khoản mất/bị ban xóa refresh session và
không phát token mới. Chưa ngắt socket cũ hoặc hủy request đã vượt bước kiểm;
không suy ra cơ chế thu hồi JWT tức thời từ các kiểm tra này.
