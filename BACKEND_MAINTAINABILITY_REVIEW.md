# Backend maintainability review — 08/11/2026

## Phạm vi và mức kiểm tra

Người dùng cho phép sắp xếp backend và refactor phần dùng chung; giữ nguyên `src/controllers/admin/**`. Không sửa frontend source, không đổi API/nghiệp vụ và không thao tác dữ liệu thật. Các thay đổi có sẵn trong checkout được giữ nguyên.

Danh sách cuối tài liệu là lượt quét từng file nguồn/cấu hình/tài liệu ngoài admin: import, số dòng, shim và khối code trùng chính xác. Đây là kiểm tra cấu trúc tĩnh, **không phải đã kiểm thử mọi nghiệp vụ từng file**. `.env`, dependencies, coverage và lockfile không được đưa vào phân tích nội dung. Đọc sâu tập trung vào những điểm được sửa bên dưới và nơi gọi liên quan.

## Thay đổi đã thực hiện

- User controller cũ 1.133 dòng trộn nhiều trách nhiệm: tách directory/public profile, password, chỉnh hồ sơ, stats, pinned images và preferences/download history. Entry point cũ giữ nguyên danh sách export để route/import hiện tại tiếp tục hoạt động.
- Collection CRUD tách truy vấn đọc khỏi ghi; entry point cũ re-export, không đổi URL, truy vấn hoặc hợp đồng response.
- Chuyển chống lạm dụng lượt xem/tải ảnh vào `services/media/activityGuard.js`; cookie/request/response vẫn thuộc controller. Giữ nguyên threshold, query và fail-open hiện có.
- Profile gom bảy nhánh validate/normalize/ghi nhận thay đổi thành `utils/profileFields.js`. Giữ nguyên thứ tự lỗi, validation trước normalization, trường bỏ qua và semantics undefined. Email/avatar vẫn xử lý riêng vì có quyền và I/O riêng.
- Hai lookup profile dùng chung serializer công khai, không trộn với `authMe` vốn có trường riêng tư. Ghim ảnh dùng chung projection.
- Middleware validation và đổi mật khẩu dùng chung service đọc password requirements; fallback khi lỗi DB và các cờ false vẫn giữ nguyên.
- Hai thuật toán trích màu dùng chung RGB naming và lọc độ hiện diện; giữ riêng sampling/K-means và ngưỡng trắng/đen 12% so với 8%. Đối chiếu RGB với bản cũ trên 140.608 mẫu đều khớp. Pure blue đang được quy tắc cũ xếp purple tại hue 240; giữ nguyên, không đổi nghiệp vụ phân loại trong refactor.
- Script kiểm structure/admin dùng đường dẫn tương đối `import.meta.url`, bỏ hardcode đường dẫn máy Fenn.

## Cách tổ chức

`routes → controllers → services → models`, với utility thuần dùng độc lập. Backend không cần React component. Chỉ trích abstraction khi có trách nhiệm riêng hoặc có tái sử dụng thực tế; không gom mọi lỗi/response khác nghiệp vụ thành một helper nhiều cờ.

## Phần giữ riêng và giới hạn

- `config/storage.js` hiện 636 dòng, tập trung thao tác R2/biến thể ảnh. Chưa tách chỉ để giảm dòng; các export có nhiều nơi dùng, cần test I/O đủ trước thay đổi lớn.
- Auth, realtime, worker upload và model vẫn giữ các chính sách/session/lease/schema riêng; quét tĩnh không đủ để khẳng định mọi đường lỗi/race đã đúng.
- Khối xác định admin status trong adminMiddleware/permissionMiddleware có phần giống nhau nhưng khác việc gắn `_adminRole`; chưa hợp nhất khi chưa có test matrix quyền đầy đủ. Không sửa admin controller.
- Compatibility shim trong utils/libs được giữ cho admin và các caller cũ; không coi re-export là code nghiệp vụ trùng cần xóa.
- Không còn file source ngoài admin vượt 1.000 dòng. Số dòng không phải tiêu chí duy nhất để kết luận dễ bảo trì.
- Health R2 báo connected không xác minh kết nối thật (đã ghi trong DOCKER_DEPLOYMENT.md) vẫn là vấn đề riêng, chưa sửa nghiệp vụ monitoring trong lượt refactor này.

## Bằng chứng

- 34/34 tests backend pass trên Windows Node 24; thêm regression cho profile update, public response, password settings/fallback, RGB và ngưỡng màu.
- `verify:structure`: 0 vấn đề. `verify:admin`: chuỗi import còn nguyên.
- Cú pháp toàn bộ src ngoài admin đã kiểm bằng `node --check`; các entry point user/collection/image tải được với env giả (18/29/15 exports). Module có timer nên tiến trình smoke được dừng sau khi lấy kết quả.
- Docker image `photocloud:refactor` build pass trên Linux; kiểm non-root/tài nguyên/sharp/bcrypt pass. HTTP smoke với MongoDB riêng và R2 giả pass: `/` 200, `/api/users/me` 401 khi chưa đăng nhập, ID sai 400, username không tồn tại 404 và browse collections 200. Đây là smoke đường route, chưa bao phủ đầy đủ ghi dữ liệu/profile/password/abuse detection.
- Chưa kiểm HTTP end-to-end với DB/R2 thật, trình duyệt, chấp nhận người dùng hay hiệu năng production. Không đổi dấu nghiệm thu trong inventory trang.
- Log/bản gốc cục bộ: `.local-backups/backend-maintainability-20261108/`. Chưa push/deploy.

## Danh sách file được quét

“Quét” trong bảng là kiểm tra tĩnh cấu trúc, không xác nhận nghiệp vụ. Các file refactor được mô tả cụ thể phía trên.

| File | Dòng | Ghi chú quét |
|---|---:|---|
| `backend/fly.toml` | 31 | Đã quét cấu trúc |
| `backend/kill-port-3000.js` | 48 | Đã quét cấu trúc |
| `backend/package.json` | 49 | Đã quét cấu trúc |
| `backend/scripts/checkAITaggingStatus.js` | 65 | Đã quét cấu trúc |
| `backend/scripts/ensure-coverage-dir.mjs` | 20 | Đã quét cấu trúc |
| `backend/scripts/makeSuperAdmin.js` | 170 | Đã quét cấu trúc |
| `backend/scripts/migrate-color-extraction.js` | 247 | Đã quét cấu trúc |
| `backend/scripts/README-MIGRATION.md` | 97 | Đã quét cấu trúc |
| `backend/scripts/testGoogleVisionAPI.js` | 130 | Đã quét cấu trúc |
| `backend/scripts/verify-admin-imports.mjs` | 54 | Đã quét cấu trúc |
| `backend/scripts/verify-container.mjs` | 30 | Đã quét cấu trúc |
| `backend/scripts/verify-structure.mjs` | 106 | compatibility shim: retain for existing callers |
| `backend/src/config/database.js` | 108 | Đã quét cấu trúc |
| `backend/src/config/env.js` | 56 | Đã quét cấu trúc |
| `backend/src/config/storage.js` | 636 | Đã quét cấu trúc |
| `backend/src/controllers/auth/authController.js` | 695 | Đã quét cấu trúc |
| `backend/src/controllers/auth/index.js` | 2 | Đã quét cấu trúc |
| `backend/src/controllers/booking/bookingAvailabilityController.js` | 32 | Đã quét cấu trúc |
| `backend/src/controllers/booking/bookingController.js` | 295 | Đã quét cấu trúc |
| `backend/src/controllers/booking/bookingFinalController.js` | 39 | Đã quét cấu trúc |
| `backend/src/controllers/booking/bookingPackageController.js` | 57 | Đã quét cấu trúc |
| `backend/src/controllers/booking/bookingWorkspaceController.js` | 70 | Đã quét cấu trúc |
| `backend/src/controllers/booking/index.js` | 6 | Đã quét cấu trúc |
| `backend/src/controllers/catalog/categoryController.js` | 183 | Đã quét cấu trúc |
| `backend/src/controllers/catalog/heroController.js` | 80 | Đã quét cấu trúc |
| `backend/src/controllers/catalog/index.js` | 4 | Đã quét cấu trúc |
| `backend/src/controllers/catalog/reportController.js` | 288 | Đã quét cấu trúc |
| `backend/src/controllers/collection/collectionCollaboratorController.js` | 317 | Đã quét cấu trúc |
| `backend/src/controllers/collection/collectionCRUDController.js` | 3 | Đã quét cấu trúc |
| `backend/src/controllers/collection/collectionExportController.js` | 183 | Đã quét cấu trúc |
| `backend/src/controllers/collection/collectionFavoriteController.js` | 237 | Đã quét cấu trúc |
| `backend/src/controllers/collection/collectionHelpers.js` | 41 | Đã quét cấu trúc |
| `backend/src/controllers/collection/collectionImageController.js` | 465 | Đã quét cấu trúc |
| `backend/src/controllers/collection/collectionReadController.js` | 268 | Đã quét cấu trúc |
| `backend/src/controllers/collection/collectionTemplateController.js` | 345 | Đã quét cấu trúc |
| `backend/src/controllers/collection/collectionVersionController.js` | 207 | Đã quét cấu trúc |
| `backend/src/controllers/collection/collectionWriteController.js` | 435 | Đã quét cấu trúc |
| `backend/src/controllers/collection/index.js` | 9 | Đã quét cấu trúc |
| `backend/src/controllers/engagement/favoriteController.js` | 397 | Đã quét cấu trúc |
| `backend/src/controllers/engagement/followController.js` | 551 | Đã quét cấu trúc |
| `backend/src/controllers/engagement/index.js` | 4 | Đã quét cấu trúc |
| `backend/src/controllers/engagement/notificationController.js` | 145 | Đã quét cấu trúc |
| `backend/src/controllers/image/imageCRUDController.js` | 400 | Đã quét cấu trúc |
| `backend/src/controllers/image/imageProxyController.js` | 92 | Đã quét cấu trúc |
| `backend/src/controllers/image/imageSearchController.js` | 519 | Đã quét cấu trúc |
| `backend/src/controllers/image/imageStatsController.js` | 393 | Đã quét cấu trúc |
| `backend/src/controllers/image/imageUploadController.js` | 549 | Đã quét cấu trúc |
| `backend/src/controllers/image/index.js` | 7 | Đã quét cấu trúc |
| `backend/src/controllers/image/uploadStatusController.js` | 15 | Đã quét cấu trúc |
| `backend/src/controllers/search/index.js` | 3 | Đã quét cấu trúc |
| `backend/src/controllers/search/searchSuggestionsController.js` | 216 | Đã quét cấu trúc |
| `backend/src/controllers/search/socialShareController.js` | 231 | Đã quét cấu trúc |
| `backend/src/controllers/user/index.js` | 3 | Đã quét cấu trúc |
| `backend/src/controllers/user/userAnalyticsController.js` | 243 | Đã quét cấu trúc |
| `backend/src/controllers/user/userController.js` | 7 | Đã quét cấu trúc |
| `backend/src/controllers/user/userDirectoryController.js` | 137 | Đã quét cấu trúc |
| `backend/src/controllers/user/userPasswordController.js` | 184 | Đã quét cấu trúc |
| `backend/src/controllers/user/userPinnedImagesController.js` | 177 | Đã quét cấu trúc |
| `backend/src/controllers/user/userPreferencesController.js` | 99 | Đã quét cấu trúc |
| `backend/src/controllers/user/userProfileController.js` | 189 | Đã quét cấu trúc |
| `backend/src/controllers/user/userStatsController.js` | 128 | Đã quét cấu trúc |
| `backend/src/libs/s3.js` | 7 | compatibility shim: retain for existing callers |
| `backend/src/middlewares/adminMiddleware.js` | 43 | Đã quét cấu trúc |
| `backend/src/middlewares/asyncHandler.js` | 10 | Đã quét cấu trúc |
| `backend/src/middlewares/authMiddleware.js` | 112 | Đã quét cấu trúc |
| `backend/src/middlewares/cacheHeaders.js` | 96 | Đã quét cấu trúc |
| `backend/src/middlewares/cacheMiddleware.js` | 247 | Đã quét cấu trúc |
| `backend/src/middlewares/csrfMiddleware.js` | 182 | Đã quét cấu trúc |
| `backend/src/middlewares/errorHandler.js` | 120 | Đã quét cấu trúc |
| `backend/src/middlewares/multerMiddleware.js` | 33 | Đã quét cấu trúc |
| `backend/src/middlewares/permissionMiddleware.js` | 196 | Đã quét cấu trúc |
| `backend/src/middlewares/rateLimiter.js` | 90 | Đã quét cấu trúc |
| `backend/src/middlewares/requestDeduplication.js` | 150 | Đã quét cấu trúc |
| `backend/src/middlewares/requestQueue.js` | 234 | Đã quét cấu trúc |
| `backend/src/middlewares/validationMiddleware.js` | 217 | Đã quét cấu trúc |
| `backend/src/models/AdminRole.js` | 174 | Đã quét cấu trúc |
| `backend/src/models/AnonymousActivity.js` | 90 | Đã quét cấu trúc |
| `backend/src/models/Booking.js` | 91 | Đã quét cấu trúc |
| `backend/src/models/BookingAvailability.js` | 18 | Đã quét cấu trúc |
| `backend/src/models/BookingPackage.js` | 24 | Đã quét cấu trúc |
| `backend/src/models/BookingPolicy.js` | 16 | Đã quét cấu trúc |
| `backend/src/models/BookingReview.js` | 14 | Đã quét cấu trúc |
| `backend/src/models/BookingWorkspace.js` | 35 | Đã quét cấu trúc |
| `backend/src/models/Category.js` | 34 | Đã quét cấu trúc |
| `backend/src/models/Collection.js` | 98 | Đã quét cấu trúc |
| `backend/src/models/CollectionTemplate.js` | 76 | Đã quét cấu trúc |
| `backend/src/models/CollectionVersion.js` | 101 | Đã quét cấu trúc |
| `backend/src/models/Follow.js` | 43 | Đã quét cấu trúc |
| `backend/src/models/HeroConfig.js` | 39 | Đã quét cấu trúc |
| `backend/src/models/Image.js` | 256 | Đã quét cấu trúc |
| `backend/src/models/NewsletterSubscription.js` | 16 | Đã quét cấu trúc |
| `backend/src/models/Notification.js` | 114 | Đã quét cấu trúc |
| `backend/src/models/PageView.js` | 38 | Đã quét cấu trúc |
| `backend/src/models/PasswordResetToken.js` | 89 | Đã quét cấu trúc |
| `backend/src/models/Report.js` | 71 | Đã quét cấu trúc |
| `backend/src/models/Session.js` | 43 | Đã quét cấu trúc |
| `backend/src/models/Settings.js` | 54 | Đã quét cấu trúc |
| `backend/src/models/SystemLog.js` | 43 | Đã quét cấu trúc |
| `backend/src/models/UploadJob.js` | 23 | Đã quét cấu trúc |
| `backend/src/models/User.js` | 197 | Đã quét cấu trúc |
| `backend/src/models/UserActivity.js` | 58 | Đã quét cấu trúc |
| `backend/src/README.md` | 64 | Đã quét cấu trúc |
| `backend/src/routes/adminRoute.js` | 132 | Đã quét cấu trúc |
| `backend/src/routes/authRoute.js` | 140 | Đã quét cấu trúc |
| `backend/src/routes/bookingRoute.js` | 61 | Đã quét cấu trúc |
| `backend/src/routes/categoryRoute.js` | 26 | Đã quét cấu trúc |
| `backend/src/routes/collectionFavoriteRoute.js` | 18 | Đã quét cấu trúc |
| `backend/src/routes/collectionRoute.js` | 48 | Đã quét cấu trúc |
| `backend/src/routes/collectionTemplateRoute.js` | 30 | Đã quét cấu trúc |
| `backend/src/routes/collectionVersionRoute.js` | 18 | Đã quét cấu trúc |
| `backend/src/routes/favoriteRoute.js` | 24 | Đã quét cấu trúc |
| `backend/src/routes/followRoute.js` | 35 | Đã quét cấu trúc |
| `backend/src/routes/heroRoute.js` | 9 | Đã quét cấu trúc |
| `backend/src/routes/imageRoute.js` | 63 | Đã quét cấu trúc |
| `backend/src/routes/newsletterRoute.js` | 26 | Đã quét cấu trúc |
| `backend/src/routes/notificationRoute.js` | 24 | Đã quét cấu trúc |
| `backend/src/routes/reportRoute.js` | 21 | Đã quét cấu trúc |
| `backend/src/routes/searchRoute.js` | 23 | Đã quét cấu trúc |
| `backend/src/routes/userRoute.js` | 52 | Đã quét cấu trúc |
| `backend/src/server.js` | 430 | Đã quét cấu trúc |
| `backend/src/services/ai/aiTaggingService.js` | 263 | Đã quét cấu trúc |
| `backend/src/services/ai/tagTranslator.js` | 161 | Đã quét cấu trúc |
| `backend/src/services/audit/auditLogger.js` | 179 | Đã quét cấu trúc |
| `backend/src/services/auth/passwordRequirements.js` | 27 | Đã quét cấu trúc |
| `backend/src/services/booking/bookingReminders.js` | 32 | Đã quét cấu trúc |
| `backend/src/services/cache/permissionCache.js` | 226 | Đã quét cấu trúc |
| `backend/src/services/cache/queryCache.js` | 142 | Đã quét cấu trúc |
| `backend/src/services/collection/collectionVersionHelper.js` | 95 | Đã quét cấu trúc |
| `backend/src/services/email/bookingEmails.js` | 17 | Đã quét cấu trúc |
| `backend/src/services/email/emailAlerts.js` | 463 | Đã quét cấu trúc |
| `backend/src/services/lifecycle/preUploadCleanup.js` | 112 | Đã quét cấu trúc |
| `backend/src/services/lifecycle/sessionCleanup.js` | 52 | Đã quét cấu trúc |
| `backend/src/services/media/activityGuard.js` | 282 | Đã quét cấu trúc |
| `backend/src/services/media/colorExtractor.js` | 124 | Đã quét cấu trúc |
| `backend/src/services/media/colorExtractorAdvanced.js` | 269 | Đã quét cấu trúc |
| `backend/src/services/media/exifExtractor.js` | 203 | Đã quét cấu trúc |
| `backend/src/services/media/imageHelpers.js` | 132 | Đã quét cấu trúc |
| `backend/src/services/media/sharpQueue.js` | 60 | Đã quét cấu trúc |
| `backend/src/services/media/videoConverter.js` | 241 | Đã quét cấu trúc |
| `backend/src/services/monitoring/alertMonitor.js` | 262 | Đã quét cấu trúc |
| `backend/src/services/monitoring/systemMetrics.js` | 264 | Đã quét cấu trúc |
| `backend/src/services/newsletterService.js` | 62 | Đã quét cấu trúc |
| `backend/src/services/palette/sitePalette.js` | 16 | Đã quét cấu trúc |
| `backend/src/services/permissions/adminUtils.js` | 215 | Đã quét cấu trúc |
| `backend/src/services/realtime/notificationEmitter.js` | 41 | Đã quét cấu trúc |
| `backend/src/services/realtime/socketMetrics.js` | 522 | Đã quét cấu trúc |
| `backend/src/services/realtime/socketServer.js` | 545 | Đã quét cấu trúc |
| `backend/src/services/search/slugUtils.js` | 86 | Đã quét cấu trúc |
| `backend/src/utils/adminUtils.js` | 6 | compatibility shim: retain for existing callers |
| `backend/src/utils/alertMonitor.js` | 6 | compatibility shim: retain for existing callers |
| `backend/src/utils/auditLogger.js` | 6 | compatibility shim: retain for existing callers |
| `backend/src/utils/bookingAdminSearch.js` | 6 | Đã quét cấu trúc |
| `backend/src/utils/bookingPolicyRules.js` | 40 | Đã quét cấu trúc |
| `backend/src/utils/bookingTime.js` | 7 | Đã quét cấu trúc |
| `backend/src/utils/checkAITaggingStatus.js` | 6 | compatibility shim: retain for existing callers |
| `backend/src/utils/colorNames.js` | 48 | Đã quét cấu trúc |
| `backend/src/utils/constants.js` | 29 | Đã quét cấu trúc |
| `backend/src/utils/dominantColorSelection.js` | 42 | Đã quét cấu trúc |
| `backend/src/utils/emailAlerts.js` | 6 | compatibility shim: retain for existing callers |
| `backend/src/utils/fileTypeUtils.js` | 88 | Đã quét cấu trúc |
| `backend/src/utils/inputUtils.js` | 29 | Đã quét cấu trúc |
| `backend/src/utils/logger.js` | 27 | Đã quét cấu trúc |
| `backend/src/utils/notificationPreferences.js` | 25 | Đã quét cấu trúc |
| `backend/src/utils/packagePresentation.js` | 13 | Đã quét cấu trúc |
| `backend/src/utils/permissionCache.js` | 6 | compatibility shim: retain for existing callers |
| `backend/src/utils/permissionValidator.js` | 246 | Đã quét cấu trúc |
| `backend/src/utils/profileFields.js` | 50 | Đã quét cấu trúc |
| `backend/src/utils/publicUser.js` | 17 | Đã quét cấu trúc |
| `backend/src/utils/sitePalette.js` | 6 | compatibility shim: retain for existing callers |
| `backend/src/utils/socketMetrics.js` | 6 | compatibility shim: retain for existing callers |
| `backend/src/utils/systemMetrics.js` | 6 | compatibility shim: retain for existing callers |
| `backend/src/utils/tagTranslator.js` | 6 | compatibility shim: retain for existing callers |
| `backend/src/utils/testGoogleVisionAPI.js` | 6 | compatibility shim: retain for existing callers |
| `backend/src/workers/aiTaggingQueue.js` | 111 | Đã quét cấu trúc |
| `backend/src/workers/imageProcessor.js` | 196 | Đã quét cấu trúc |
| `backend/src/workers/jobQueue.js` | 45 | Đã quét cấu trúc |
| `backend/src/workers/uploadJobRunner.js` | 92 | Đã quét cấu trúc |
| `backend/tests/auth-isolation.test.js` | 30 | Đã quét cấu trúc |
| `backend/tests/booking-admin-search.test.js` | 10 | Đã quét cấu trúc |
| `backend/tests/booking-policy-controller.test.js` | 22 | Đã quét cấu trúc |
| `backend/tests/booking-policy.test.js` | 10 | Đã quét cấu trúc |
| `backend/tests/bookingTime.test.js` | 15 | Đã quét cấu trúc |
| `backend/tests/color-extraction.test.js` | 37 | Đã quét cấu trúc |
| `backend/tests/color-names.test.js` | 8 | Đã quét cấu trúc |
| `backend/tests/dominant-color-selection.test.js` | 10 | Đã quét cấu trúc |
| `backend/tests/newsletter.test.js` | 85 | Đã quét cấu trúc |
| `backend/tests/notification-preferences.test.js` | 20 | Đã quét cấu trúc |
| `backend/tests/packagePresentation.test.js` | 15 | Đã quét cấu trúc |
| `backend/tests/password-requirements.test.js` | 16 | Đã quét cấu trúc |
| `backend/tests/profile-fields.test.js` | 31 | Đã quét cấu trúc |
| `backend/tests/upload-api.test.js` | 75 | Đã quét cấu trúc |
| `backend/tests/upload-job-runner.test.js` | 86 | Đã quét cấu trúc |
| `backend/tests/upload-processor.test.js` | 42 | Đã quét cấu trúc |
