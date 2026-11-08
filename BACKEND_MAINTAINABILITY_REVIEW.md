# Báo cáo sắp xếp code backend PhotoCloud

Cập nhật: 08/11/2026.

## Kết quả rà tiếp: monitoring, hàng đợi và cache

Vòng này chỉ kiểm và sửa code backend; không làm công cụ triển khai, frontend
hoặc admin controller. Các phần dùng chung tiếp tục nằm trong phạm vi đã được
người dùng cho phép. Những kết quả ở mục này là mới hơn bảng kiểm tra phía dưới.

| Vấn đề xác nhận | Sửa thế nào | Thay đổi cần biết |
|---|---|---|
| Tỷ lệ lỗi dùng số lỗi gần đây nhưng chia cho số request ước lượng từ toàn bộ thời gian chạy; có thể vượt 100% | Tách `services/monitoring/requestMetrics.js`, đếm request và lỗi trong cùng cửa sổ 5 phút bằng các nhóm một giây | Giá trị tính từ 0–100%, tự loại số liệu cũ; độ phân giải thời gian một giây, không còn phụ thuộc tổng request từ khi khởi động |
| Trạng thái lưu trữ luôn trả `connected` dù không hề kiểm tra | `getStorageStatus()` trả `unknown`; tổng trạng thái là warning nếu chưa biết storage và không có lỗi nghiêm trọng khác | Không báo mất kết nối hoặc tự xác nhận kết nối. Chưa bổ sung phép thử dịch vụ lưu trữ thật |
| Request chờ hết hạn chỉ được kiểm khi còn lượt chạy trống | Dọn request hết hạn trước khi xét giới hạn concurrency; dùng lại một helper thêm request chờ cho hai nơi gọi | Request chờ có thể nhận 429 khi vượt 30 giây ngay cả lúc tất cả lượt chạy còn bận; xử lý theo nhịp quét 100 ms, không cam kết thời gian thực tuyệt đối |
| Listener chờ còn giữ trên response sau khi đã vào chạy; trạng thái IP hết hoạt động vẫn ở lại Map | Gỡ listener khi vào chạy/hủy/hết hạn, xóa số đếm khi về 0; không chạy request đã đóng | Timer quét không tự giữ tiến trình Node sống khi không còn việc khác |
| Lượt đọc cache cũ có thể ghi lại kết quả sau khi cache bị xóa vì dữ liệu thay đổi | `queryCache.js` chỉ cho lượt đọc còn quyền sở hữu ghi kết quả; xóa cache/ghi trực tiếp sẽ hủy quyền đó | Request cũ vẫn nhận kết quả đọc của chính nó nhưng không ghi đè cache mới; các lượt đọc đồng thời cùng khóa chia sẻ một lần tải. Lượt đọc lỗi được giải phóng để thử lại |

**Kiểm tra vòng này:** 55/55 test backend đạt trên Windows Node 24; thêm test
cho cùng cửa sổ request/lỗi, dữ liệu hết hạn, storage chưa kiểm, timeout khi hàng
đợi đầy, hủy request, listener sau khi vào chạy, đọc cache đồng thời và xóa cache
khi lượt đọc chưa hoàn tất. `verify:structure`, `verify:admin` đạt. Hai rule
`no-undef`/`no-unused-vars` trên 189 file source ngoài admin controller không báo lỗi.

Chưa đo tải thật hoặc kiểm toàn bộ luồng API của các thay đổi vòng này. Các hàm
`recordRequest`/`recordResponseTime` hiện chưa được tự gắn vào luồng HTTP ngoài
phần định nghĩa của module; sửa phép tính không có nghĩa đã tự thu đủ lưu lượng.
Đây là việc cần nối và kiểm riêng trước khi dùng số liệu làm cảnh báo vận hành.
Không gửi email cảnh báo thật trong kiểm thử.

Bằng chứng: `.local-backups/backend-monitoring-review-20261108/`. Chưa tạo commit
mới cho vòng này, không đổi các dấu nghiệm thu của người dùng.

## 1. Đã làm được gì?

Đã tách những file trộn nhiều công việc, gom các đoạn xử lý lặp và dọn phần code không còn dùng. Mục tiêu là khi cần sửa một chức năng, người bảo trì tìm được đúng file và không phải sửa cùng một quy tắc ở nhiều nơi.

Phạm vi gồm controller phía user và các service, middleware, utility dùng chung được người dùng cho phép. Không sửa frontend hoặc `backend/src/controllers/admin/**`.

**Đã hoàn thành đợt sắp xếp các nhóm nêu dưới đây. Chưa có cơ sở khẳng định toàn bộ backend hết lỗi hoặc mọi chức năng đã được thử đầy đủ.**

## 2. Các phần đã sắp xếp

| Nhóm code | Vấn đề trước đây | Đã sửa và tác dụng |
|---|---|---|
| Người dùng | `userController.js` hơn 1.100 dòng, chứa nhiều công việc khác nhau | Chia theo hồ sơ, mật khẩu, thống kê, ghim ảnh và tùy chọn cá nhân. Muốn sửa chức năng nào có file tương ứng |
| Hồ sơ | Bảy trường lặp cách kiểm độ dài, chuẩn hóa và ghi nhận thay đổi | Gom vào `utils/profileFields.js`. Email/avatar giữ riêng vì có kiểm quyền và thao tác dữ liệu khác |
| Hồ sơ công khai | Tra cứu bằng username và ID tự tạo cùng dạng kết quả | Dùng `utils/publicUser.js` để giữ cấu trúc thống nhất và không đưa trường riêng tư vào kết quả |
| Bộ sưu tập | Đọc và ghi trộn trong cùng file; tạo/sửa/xóa lặp việc xóa cache | Chia controller đọc/ghi; dùng `services/collection/collectionCache.js` cho việc xóa dữ liệu đệm |
| Đăng nhập | Mật khẩu, Google và quản lý phiên nằm chung; hai luồng lặp việc tạo phiên | Chia ba controller. `services/auth/loginSession.js` sở hữu tạo token, phiên và thông báo thiết bị mới |
| Quy tắc mật khẩu | Kiểm tra đầu vào và đổi mật khẩu tự đọc cùng settings | Dùng `services/auth/passwordRequirements.js`; giữ cấu hình mặc định khi đọc settings lỗi |
| Quyền request | Nhiều middleware tự xác định trạng thái admin | Dùng `services/permissions/requestAdminStatus.js`, giữ khác biệt về cách gắn thông tin role |
| Lưu ảnh/video | `config/storage.js` trộn kết nối, đọc/ghi file, xử lý ảnh, video và avatar | Kết nối ở `config/r2Client.js`; các thao tác thực tế ở `services/storage/` |
| Upload | Luồng upload trực tiếp trộn với luồng cấp URL rồi xử lý nền | Tách hai controller. Tạo bản ghi ảnh trực tiếp chuyển sang service; xóa bản triển khai cũ bị comment |
| Metadata và thumbnail | Nhiều nơi lặp cách lấy màu/EXIF hoặc tạo PNG nhỏ | Dùng chung `imageMetadata.js` và `blurThumbnail.js`; luồng upload trực tiếp vẫn bỏ bước đọc kích thước như trước |
| Danh sách ảnh | Controller vừa dựng query vừa định dạng response; ba nhánh lặp cùng query lấy trang | Tách service lọc ảnh, service lấy trang và utility định dạng/sắp xếp. Các nhánh thử lại gọi cùng một query |
| Lượt xem/tải ảnh | Controller chứa cả quy tắc phát hiện hành vi bất thường | Chuyển sang `services/media/activityGuard.js`; controller giữ request/cookie/response |
| Màu ảnh | Hai thuật toán lặp quy tắc đặt tên RGB và lọc độ hiện diện | Gom vào utility; giữ riêng thuật toán và ngưỡng trắng/đen 12% so với 8% |
| WebSocket | Quyền vào phòng và cache quyền trộn với kết nối/sự kiện | Chuyển sang `services/realtime/roomPermissions.js` |
| Xử lý video | Lặp chạy tool, tạo file tạm và dọn file ở nhiều nhánh | Helper chạy tool và workspace tạm riêng; `finally` dọn file khi thành công hoặc lỗi |
| Code thừa | Import, biến chứa kết quả không đọc, counter không dùng và code comment cũ | Loại phần thừa; giữ các truy vấn/upload vẫn có tác dụng phụ |
| Script kiểm tra | Gắn cứng đường dẫn máy cá nhân | Lấy đường dẫn theo vị trí script để dùng ở checkout khác |

Các file đầu mối cũ như `userController.js`, `authController.js`, `imageUploadController.js` và `config/storage.js` vẫn chuyển tiếp tên hàm sang nơi mới. Vì vậy các route, worker và phần admin đang gọi đường dẫn cũ tiếp tục dùng được.

## 3. Muốn sửa chức năng thì mở file nào?

Các đường dẫn dưới đây tính từ `backend/src/`.

| Chức năng | File nên mở |
|---|---|
| Tìm người dùng, lấy tài khoản hiện tại/hồ sơ công khai | `controllers/user/userDirectoryController.js` |
| Chỉnh hồ sơ/email/avatar | `controllers/user/userProfileController.js` |
| Đổi hoặc đặt lại mật khẩu | `controllers/user/userPasswordController.js` |
| Thống kê hồ sơ | `controllers/user/userStatsController.js` |
| Ghim/bỏ ghim/sắp xếp ảnh ghim | `controllers/user/userPinnedImagesController.js` |
| Lịch sử tải, tùy chọn thông báo | `controllers/user/userPreferencesController.js` |
| Đăng nhập mật khẩu và đăng ký | `controllers/auth/credentialsController.js` |
| Đăng nhập Google | `controllers/auth/googleAuthController.js` |
| Refresh, đăng xuất và quản lý phiên | `controllers/auth/sessionController.js` |
| Đọc bộ sưu tập | `controllers/collection/collectionReadController.js` |
| Tạo/sửa/xóa bộ sưu tập | `controllers/collection/collectionWriteController.js` |
| Upload trực tiếp | `controllers/image/directUploadController.js` |
| Cấp URL upload trước, hoàn tất hoặc hủy | `controllers/image/stagedUploadController.js` |
| Lọc danh sách ảnh | `services/search/imageListing.js` |
| Query lấy một trang ảnh | `services/search/imagePage.js` |
| Đọc/ghi/xóa object lưu trữ | `services/storage/r2Objects.js` |
| Tạo các kích thước ảnh/WebP/AVIF | `services/storage/imageStorage.js` |
| Upload video/avatar | `services/storage/mediaStorage.js` |
| Điều phối chuyển video/thumbnail/thời lượng | `services/media/videoConverter.js` |
| Quyền vào phòng WebSocket | `services/realtime/roomPermissions.js` |
| Kiểm địa chỉ IP/CIDR | `utils/ipAccessRules.js` |

## 4. Ba lỗi hành vi đã sửa cùng đợt

### Timeout xử lý video

**Trước:** timer trong `Promise.race` không được hủy khi xong; timeout không chủ động dừng ffmpeg. Hai thao tác cùng tên ảnh có thể dùng trùng file tạm.

**Sau:** gọi tool trực tiếp bằng `execFile`, không ghép chuỗi qua shell. Mỗi lệnh có giới hạn 5 phút và dừng tiến trình trực tiếp khi hết hạn. Mỗi thao tác có workspace tạm riêng và dọn trong `finally`.

**Khác biệt cần biết:** trước đây chỉ chuyển GIF có timeout; nay thumbnail và đọc thời lượng cũng có timeout. Chưa thử chuyển video/GIF thật; đã kiểm điều phối bằng dữ liệu giả và timeout bằng tiến trình Node con.

### Giải phóng lượt request hai lần

**Trước:** cả `finish` và `close` có thể cùng xảy ra, khiến một request giảm hai lượt đang chạy. Hàng đợi có thể cho nhiều request chạy hơn giới hạn dự kiến.

**Sau:** một helper giải phóng đúng một lần và gỡ listener còn lại. Giữ giới hạn số request và thời gian chờ cũ.

### Xử lý giới hạn IP admin

**Trước:** IPv6 bị cắt sai tại dấu `:` đầu tiên; nhánh bắt lỗi CIDR còn dùng biến ngoài phạm vi.

**Sau:** dùng bộ xử lý IP/subnet của Node cho IPv4, IPv6, địa chỉ kèm port và IPv4-mapped IPv6. Rule sai không cấp quyền.

**Khác biệt cần biết:** một số IPv6 hợp lệ trước bị từ chối nay có thể được chấp nhận đúng rule. Chưa kiểm mọi tổ hợp quyền/IP trên tài khoản thật.

## 5. Kết quả kiểm tra code

| Kiểm tra | Kết quả | Giới hạn |
|---|---|---|
| Bộ test backend | 48/48 đạt với Node 24 trên Windows và Node 22 trên Linux | Chưa bao phủ mọi nhánh nghiệp vụ |
| Biến chưa khai báo, biến/import không dùng | Không còn báo lỗi theo `no-undef` và `no-unused-vars` trên 188 file JavaScript nguồn ngoài admin controller | Chỉ hai rule này, không phải toàn bộ lint hoặc chứng nhận code hoàn hảo |
| Đường dẫn import và tài nguyên | `verify:structure` đạt | Không thay thế chạy API |
| Tải các module mà admin đang phụ thuộc | `verify:admin` đạt | Chưa chứng minh mọi thao tác admin đúng |
| Quy tắc đặt tên màu sau khi gom | Khớp bản cũ trên 140.608 mẫu RGB | Không đánh giá độ chính xác nghiệp vụ của quy tắc cũ |
| API với MongoDB test riêng và cấu hình lưu trữ giả | Đăng nhập, refresh, sửa/đọc hồ sơ, tùy chọn thông báo, ghim ảnh, hồ sơ công khai và tìm ảnh đều đạt | Chưa kiểm tài khoản hoặc dịch vụ thật |
| WebSocket | Xác thực và vào phòng ảnh đạt với dữ liệu test | Chưa kiểm toàn bộ sự kiện/tình huống kết nối lại |

Kết quả test là trên checkout hiện tại, bao gồm lệnh test và bản sửa mock có sẵn trong `backend/package.json` và `backend/tests/upload-processor.test.js`. Không suy ra rằng một bản checkout thiếu những thay đổi đó sẽ có cùng kết quả.

Không dùng dữ liệu thật để thử thao tác ghi. Chưa kiểm Google OAuth thật, upload lưu trữ thật, chuyển GIF/video thật hoặc giao diện trình duyệt. Không đánh dấu nghiệm thu thay người dùng.

## 6. Những phần giữ nguyên và việc còn mở

- **Không chia file cơ học:** model giữ schema; worker giữ claim/lease của job; server giữ thứ tự middleware và khởi động. Các handler ngắn cùng nghiệp vụ vẫn có thể ở chung file.
- **Không đổi luật nghiệp vụ để gom code:** giữ URL, tên hàm xuất ra, TTL/cache key, luật kiểm duyệt và ngưỡng chống lạm dụng, ngoại trừ ba sửa lỗi được nêu riêng ở mục 4.
- **Một số khác biệt cần giữ:** thuật toán trích màu khác nhau có ngưỡng khác nhau; upload trực tiếp và upload nền có vòng đời khác nhau; email/avatar có quyền và thao tác riêng.
- **Giữ file chuyển tiếp:** các file mỏng trong `utils/` và `libs/` còn phục vụ đường import cũ, đặc biệt của admin. Chưa xóa khi nơi gọi chưa được đổi tương ứng.
- **Monitoring:** đã bỏ trạng thái storage `connected` giả định, hiện trả `unknown`. Chưa có probe dịch vụ thật và chưa nối tự động các hàm ghi số liệu request/thời gian vào luồng HTTP; xem kết quả rà tiếp ở đầu báo cáo.
- **Cần kiểm chức năng sâu hơn:** Google OAuth, upload thật, mọi tổ hợp quyền, xử lý lỗi mạng và tải đồng thời chưa được chứng minh đầy đủ bằng các kiểm tra trên.

Hướng dẫn cấu trúc chi tiết: [backend/src/README.md](backend/src/README.md). Bằng chứng kiểm tra cục bộ nằm trong `.local-backups/backend-maintainability-20261108/` và `.local-backups/backend-final-20261108/`.

## Phụ lục: danh sách source đã kiểm bằng công cụ

Bảng này được cập nhật từ source hiện tại. Kiểm cú pháp/import và tìm biến thừa không có nghĩa từng dòng đã được đọc sâu hoặc mọi nghiệp vụ của file đã được thử.

<details>
<summary>Mở danh sách file nguồn backend ngoài admin controller</summary>

| File | Số dòng hiện tại |
|---|---:|
| `backend/src/config/database.js` | 108 |
| `backend/src/config/env.js` | 56 |
| `backend/src/config/r2Client.js` | 17 |
| `backend/src/config/storage.js` | 5 |
| `backend/src/controllers/auth/authController.js` | 15 |
| `backend/src/controllers/auth/credentialsController.js` | 223 |
| `backend/src/controllers/auth/googleAuthController.js` | 242 |
| `backend/src/controllers/auth/index.js` | 2 |
| `backend/src/controllers/auth/sessionController.js` | 179 |
| `backend/src/controllers/booking/bookingAvailabilityController.js` | 32 |
| `backend/src/controllers/booking/bookingController.js` | 295 |
| `backend/src/controllers/booking/bookingFinalController.js` | 39 |
| `backend/src/controllers/booking/bookingPackageController.js` | 57 |
| `backend/src/controllers/booking/bookingWorkspaceController.js` | 70 |
| `backend/src/controllers/booking/index.js` | 6 |
| `backend/src/controllers/catalog/categoryController.js` | 183 |
| `backend/src/controllers/catalog/heroController.js` | 80 |
| `backend/src/controllers/catalog/index.js` | 4 |
| `backend/src/controllers/catalog/reportController.js` | 288 |
| `backend/src/controllers/collection/collectionCollaboratorController.js` | 317 |
| `backend/src/controllers/collection/collectionCRUDController.js` | 3 |
| `backend/src/controllers/collection/collectionExportController.js` | 183 |
| `backend/src/controllers/collection/collectionFavoriteController.js` | 236 |
| `backend/src/controllers/collection/collectionHelpers.js` | 41 |
| `backend/src/controllers/collection/collectionImageController.js` | 465 |
| `backend/src/controllers/collection/collectionReadController.js` | 267 |
| `backend/src/controllers/collection/collectionTemplateController.js` | 345 |
| `backend/src/controllers/collection/collectionVersionController.js` | 207 |
| `backend/src/controllers/collection/collectionWriteController.js` | 389 |
| `backend/src/controllers/collection/index.js` | 9 |
| `backend/src/controllers/engagement/favoriteController.js` | 396 |
| `backend/src/controllers/engagement/followController.js` | 551 |
| `backend/src/controllers/engagement/index.js` | 4 |
| `backend/src/controllers/engagement/notificationController.js` | 145 |
| `backend/src/controllers/image/directUploadController.js` | 215 |
| `backend/src/controllers/image/imageCRUDController.js` | 400 |
| `backend/src/controllers/image/imageProxyController.js` | 92 |
| `backend/src/controllers/image/imageSearchController.js` | 61 |
| `backend/src/controllers/image/imageStatsController.js` | 393 |
| `backend/src/controllers/image/imageUploadController.js` | 8 |
| `backend/src/controllers/image/index.js` | 7 |
| `backend/src/controllers/image/stagedUploadController.js` | 347 |
| `backend/src/controllers/image/uploadStatusController.js` | 15 |
| `backend/src/controllers/search/index.js` | 3 |
| `backend/src/controllers/search/searchSuggestionsController.js` | 216 |
| `backend/src/controllers/search/socialShareController.js` | 231 |
| `backend/src/controllers/user/index.js` | 3 |
| `backend/src/controllers/user/userAnalyticsController.js` | 243 |
| `backend/src/controllers/user/userController.js` | 7 |
| `backend/src/controllers/user/userDirectoryController.js` | 137 |
| `backend/src/controllers/user/userPasswordController.js` | 184 |
| `backend/src/controllers/user/userPinnedImagesController.js` | 177 |
| `backend/src/controllers/user/userPreferencesController.js` | 99 |
| `backend/src/controllers/user/userProfileController.js` | 189 |
| `backend/src/controllers/user/userStatsController.js` | 128 |
| `backend/src/libs/s3.js` | 7 |
| `backend/src/middlewares/adminMiddleware.js` | 35 |
| `backend/src/middlewares/asyncHandler.js` | 10 |
| `backend/src/middlewares/authMiddleware.js` | 112 |
| `backend/src/middlewares/cacheHeaders.js` | 96 |
| `backend/src/middlewares/cacheMiddleware.js` | 244 |
| `backend/src/middlewares/csrfMiddleware.js` | 182 |
| `backend/src/middlewares/errorHandler.js` | 120 |
| `backend/src/middlewares/multerMiddleware.js` | 33 |
| `backend/src/middlewares/permissionMiddleware.js` | 190 |
| `backend/src/middlewares/rateLimiter.js` | 90 |
| `backend/src/middlewares/requestDeduplication.js` | 150 |
| `backend/src/middlewares/requestQueue.js` | 235 |
| `backend/src/middlewares/validationMiddleware.js` | 217 |
| `backend/src/models/AdminRole.js` | 174 |
| `backend/src/models/AnonymousActivity.js` | 90 |
| `backend/src/models/Booking.js` | 91 |
| `backend/src/models/BookingAvailability.js` | 18 |
| `backend/src/models/BookingPackage.js` | 24 |
| `backend/src/models/BookingPolicy.js` | 16 |
| `backend/src/models/BookingReview.js` | 14 |
| `backend/src/models/BookingWorkspace.js` | 35 |
| `backend/src/models/Category.js` | 34 |
| `backend/src/models/Collection.js` | 98 |
| `backend/src/models/CollectionTemplate.js` | 76 |
| `backend/src/models/CollectionVersion.js` | 101 |
| `backend/src/models/Follow.js` | 43 |
| `backend/src/models/HeroConfig.js` | 39 |
| `backend/src/models/Image.js` | 256 |
| `backend/src/models/NewsletterSubscription.js` | 16 |
| `backend/src/models/Notification.js` | 114 |
| `backend/src/models/PageView.js` | 38 |
| `backend/src/models/PasswordResetToken.js` | 89 |
| `backend/src/models/Report.js` | 71 |
| `backend/src/models/Session.js` | 43 |
| `backend/src/models/Settings.js` | 54 |
| `backend/src/models/SystemLog.js` | 43 |
| `backend/src/models/UploadJob.js` | 23 |
| `backend/src/models/User.js` | 197 |
| `backend/src/models/UserActivity.js` | 58 |
| `backend/src/routes/adminRoute.js` | 130 |
| `backend/src/routes/authRoute.js` | 140 |
| `backend/src/routes/bookingRoute.js` | 61 |
| `backend/src/routes/categoryRoute.js` | 26 |
| `backend/src/routes/collectionFavoriteRoute.js` | 18 |
| `backend/src/routes/collectionRoute.js` | 48 |
| `backend/src/routes/collectionTemplateRoute.js` | 30 |
| `backend/src/routes/collectionVersionRoute.js` | 18 |
| `backend/src/routes/favoriteRoute.js` | 24 |
| `backend/src/routes/followRoute.js` | 35 |
| `backend/src/routes/heroRoute.js` | 9 |
| `backend/src/routes/imageRoute.js` | 63 |
| `backend/src/routes/newsletterRoute.js` | 26 |
| `backend/src/routes/notificationRoute.js` | 24 |
| `backend/src/routes/reportRoute.js` | 21 |
| `backend/src/routes/searchRoute.js` | 23 |
| `backend/src/routes/userRoute.js` | 52 |
| `backend/src/server.js` | 430 |
| `backend/src/services/ai/aiTaggingService.js` | 263 |
| `backend/src/services/ai/tagTranslator.js` | 161 |
| `backend/src/services/audit/auditLogger.js` | 179 |
| `backend/src/services/auth/loginSession.js` | 62 |
| `backend/src/services/auth/passwordRequirements.js` | 27 |
| `backend/src/services/booking/bookingReminders.js` | 32 |
| `backend/src/services/cache/permissionCache.js` | 224 |
| `backend/src/services/cache/queryCache.js` | 142 |
| `backend/src/services/collection/collectionCache.js` | 22 |
| `backend/src/services/collection/collectionVersionHelper.js` | 95 |
| `backend/src/services/email/bookingEmails.js` | 17 |
| `backend/src/services/email/emailAlerts.js` | 463 |
| `backend/src/services/lifecycle/preUploadCleanup.js` | 112 |
| `backend/src/services/lifecycle/sessionCleanup.js` | 52 |
| `backend/src/services/media/activityGuard.js` | 282 |
| `backend/src/services/media/blurThumbnail.js` | 10 |
| `backend/src/services/media/colorExtractor.js` | 124 |
| `backend/src/services/media/colorExtractorAdvanced.js` | 269 |
| `backend/src/services/media/directUpload.js` | 85 |
| `backend/src/services/media/exifExtractor.js` | 203 |
| `backend/src/services/media/imageHelpers.js` | 100 |
| `backend/src/services/media/imageMetadata.js` | 51 |
| `backend/src/services/media/mediaCommand.js` | 16 |
| `backend/src/services/media/mediaTempFiles.js` | 13 |
| `backend/src/services/media/sharpQueue.js` | 60 |
| `backend/src/services/media/videoConverter.js` | 145 |
| `backend/src/services/monitoring/alertMonitor.js` | 262 |
| `backend/src/services/monitoring/systemMetrics.js` | 262 |
| `backend/src/services/newsletterService.js` | 62 |
| `backend/src/services/palette/sitePalette.js` | 16 |
| `backend/src/services/permissions/adminUtils.js` | 135 |
| `backend/src/services/permissions/requestAdminStatus.js` | 11 |
| `backend/src/services/realtime/notificationEmitter.js` | 41 |
| `backend/src/services/realtime/roomPermissions.js` | 125 |
| `backend/src/services/realtime/socketMetrics.js` | 522 |
| `backend/src/services/realtime/socketServer.js` | 424 |
| `backend/src/services/search/imageListing.js` | 352 |
| `backend/src/services/search/imagePage.js` | 24 |
| `backend/src/services/search/slugUtils.js` | 86 |
| `backend/src/services/storage/imageStorage.js` | 374 |
| `backend/src/services/storage/mediaStorage.js` | 85 |
| `backend/src/services/storage/r2Objects.js` | 193 |
| `backend/src/utils/accountIdentifier.js` | 3 |
| `backend/src/utils/adminUtils.js` | 6 |
| `backend/src/utils/alertMonitor.js` | 6 |
| `backend/src/utils/auditLogger.js` | 6 |
| `backend/src/utils/bookingAdminSearch.js` | 6 |
| `backend/src/utils/bookingPolicyRules.js` | 40 |
| `backend/src/utils/bookingTime.js` | 7 |
| `backend/src/utils/checkAITaggingStatus.js` | 6 |
| `backend/src/utils/colorNames.js` | 48 |
| `backend/src/utils/constants.js` | 29 |
| `backend/src/utils/dominantColorSelection.js` | 42 |
| `backend/src/utils/emailAlerts.js` | 6 |
| `backend/src/utils/fileTypeUtils.js` | 88 |
| `backend/src/utils/imageListingResponse.js` | 70 |
| `backend/src/utils/imageSort.js` | 31 |
| `backend/src/utils/inputUtils.js` | 29 |
| `backend/src/utils/ipAccessRules.js` | 44 |
| `backend/src/utils/logger.js` | 26 |
| `backend/src/utils/notificationPreferences.js` | 25 |
| `backend/src/utils/packagePresentation.js` | 13 |
| `backend/src/utils/permissionCache.js` | 6 |
| `backend/src/utils/permissionValidator.js` | 246 |
| `backend/src/utils/profileFields.js` | 50 |
| `backend/src/utils/publicUser.js` | 17 |
| `backend/src/utils/sitePalette.js` | 6 |
| `backend/src/utils/socketMetrics.js` | 6 |
| `backend/src/utils/systemMetrics.js` | 6 |
| `backend/src/utils/tagTranslator.js` | 6 |
| `backend/src/utils/testGoogleVisionAPI.js` | 6 |
| `backend/src/workers/aiTaggingQueue.js` | 111 |
| `backend/src/workers/imageProcessor.js` | 196 |
| `backend/src/workers/jobQueue.js` | 45 |
| `backend/src/workers/uploadJobRunner.js` | 92 |

</details>
