# Bản đồ file backend PhotoCloud

Cập nhật: 09/11/2026. Chỉ đọc nhóm liên quan khi tìm implementation hoặc thêm code.
Danh mục không chứng nhận chức năng đã được nghiệm thu và không cấp quyền sửa
khu vực admin. Phạm vi làm việc theo [AGENTS.md gốc](AGENTS.md) và
[hướng dẫn backend](backend/AGENTS.md).

Kiến trúc và hướng dẫn mở rộng: [backend/src/README.md](backend/src/README.md).
Kết quả rà và việc còn mở: [báo cáo backend](BACKEND_MAINTAINABILITY_REVIEW.md).
Khi thêm/xóa/đổi tên file hoặc đổi trách nhiệm, cập nhật danh mục này cùng code.

### Folder dùng để làm gì?

| Folder | Chức năng và nơi cần thêm code |
|---|---|
| `backend/src/config/` | Biến môi trường và khởi tạo kết nối DB/SDK; storage.js là API tương thích cũ |
| `backend/src/routes/` | URL, thứ tự route, middleware và handler; không đặt nghiệp vụ dài |
| `backend/src/controllers/` | Handler HTTP chia theo domain; controller admin nằm ngoài đợt rà này |
| `backend/src/models/` | Schema Mongoose, index, hook và quy tắc dữ liệu |
| `backend/src/services/auth/` | Tạo phiên đăng nhập và đọc chính sách mật khẩu |
| `backend/src/services/booking/` | Nhắc lịch chụp; không chứa JSX hoặc UI |
| `backend/src/services/cache/` | Cache query và quyền; TTL, invalidation và thống kê |
| `backend/src/services/collection/` | Version và invalidation bộ sưu tập |
| `backend/src/services/storage/` | Thao tác R2 object và pipeline lưu ảnh/video/avatar |
| `backend/src/services/media/` | Metadata, màu, EXIF, Sharp queue, ffmpeg, file tạm và kiểm lượt ảnh bất thường |
| `backend/src/services/realtime/` | Socket server, phát sự kiện, quyền phòng và số liệu socket |
| `backend/src/services/permissions/` | Tính/kiểm quyền admin và gắn trạng thái request |
| `backend/src/services/lifecycle/` | Lập lịch và dọn session/upload tạm |
| `backend/src/services/monitoring/` | Đo hệ thống, cửa sổ số liệu request và điều phối cảnh báo |
| `backend/src/services/ai/` | Tạo/dịch/gộp tag qua dịch vụ AI |
| `backend/src/services/email/` | Gửi mail và nội dung mail theo loại sự kiện |
| `backend/src/services/audit/` | Ghi audit và lấy IP theo cơ chế hiện có |
| `backend/src/services/search/` | Query danh sách ảnh và tra cứu slug |
| `backend/src/services/palette/` | Đọc/kiểm palette dùng chung |
| `backend/src/utils/` | Hàm thuần; một số file là shim cho đường import cũ, không đặt I/O mới tại đây |
| `backend/src/workers/` | Queue upload/AVIF/AI, retry và lease |
| `backend/src/libs/` | Đường import tương thích cũ, không thêm implementation mới |
| `backend/scripts/` | Công cụ bảo trì/kiểm tra; có script thay đổi dữ liệu/quyền, không tự chạy trên dữ liệu thật |
| `backend/tests/` | Test và fixture riêng, tên file phải thể hiện phần nghiệp vụ kiểm tra |

### Danh mục file nguồn và điểm vào

Các đường dẫn tính từ `backend/src/`. Bảng liệt kê file hiện có, nhiệm vụ và
export để tìm đúng implementation. “Chuyển tiếp” nghĩa là tên hàm được xuất lại
ở nơi mới. Không đọc hoặc lập danh mục chi tiết admin controller trong phạm vi
này; thư mục đó do phiên phụ trách admin quản lý.

<details>
<summary>Mở danh mục file backend</summary>

| File | Nhiệm vụ | Điểm vào/export |
|---|---|---|
| `config/database.js` | Cấu hình/kết nối hạ tầng | `CONNECT_DB` |
| `config/env.js` | Cấu hình/kết nối hạ tầng | `env` |
| `config/r2Client.js` | Khởi tạo một S3Client cho R2 | `r2Client` |
| `config/storage.js` | API chuyển tiếp storage cũ; không viết thêm nghiệp vụ tại đây | `r2Client`, `default` |
| `controllers/auth/authController.js` | HTTP xác thực và phiên đăng nhập | `checkEmailAvailability`, `checkUsernameAvailability`, `signUp`, `signIn`, `googleAuth`, `googleCallback`, `signOut`, `refreshToken`, `getActiveSessions`, `signOutAllDevices`, `signOutSession` |
| `controllers/auth/credentialsController.js` | HTTP xác thực và phiên đăng nhập | `checkEmailAvailability`, `checkUsernameAvailability`, `signUp`, `signIn` |
| `controllers/auth/googleAuthController.js` | HTTP xác thực và phiên đăng nhập | `googleAuth`, `googleCallback` |
| `controllers/auth/index.js` | HTTP xác thực và phiên đăng nhập | Chuyển tiếp export; xem đường dẫn trong file |
| `controllers/auth/sessionController.js` | HTTP xác thực và phiên đăng nhập | `signOut`, `refreshToken`, `getActiveSessions`, `signOutAllDevices`, `signOutSession` |
| `controllers/booking/bookingAvailabilityController.js` | HTTP đặt chụp và vòng đời lịch | `getAvailability`, `updateAvailability`, `checkDateAvailability` |
| `controllers/booking/bookingController.js` | HTTP đặt chụp và vòng đời lịch | `getBookingPackages`, `createBooking`, `getMyBookings`, `getMyBooking`, `requestReschedule`, `cancelMyBooking`, `getAdminBookings`, `updateAdminBooking` |
| `controllers/booking/bookingFinalController.js` | HTTP đặt chụp và vòng đời lịch | `getBookingPolicy`, `updateBookingPolicy`, `getMyReview`, `createMyReview`, `listAdminReviews`, `replyAdminReview` |
| `controllers/booking/bookingPackageController.js` | HTTP đặt chụp và vòng đời lịch | `listAdminPackages`, `createAdminPackage`, `updateAdminPackage`, `archiveAdminPackage` |
| `controllers/booking/bookingWorkspaceController.js` | HTTP đặt chụp và vòng đời lịch | `getMyWorkspace`, `acceptContract`, `submitQuestionnaire`, `getAdminWorkspace`, `updateAdminWorkspace` |
| `controllers/booking/index.js` | HTTP đặt chụp và vòng đời lịch | Chuyển tiếp export; xem đường dẫn trong file |
| `controllers/catalog/categoryController.js` | HTTP danh mục, hero và báo cáo | `getAllCategories`, `getAllCategoriesAdmin`, `createCategory`, `updateCategory`, `deleteCategory` |
| `controllers/catalog/heroController.js` | HTTP danh mục, hero và báo cáo | `getHeroCollections` |
| `controllers/catalog/index.js` | HTTP danh mục, hero và báo cáo | Chuyển tiếp export; xem đường dẫn trong file |
| `controllers/catalog/reportController.js` | HTTP danh mục, hero và báo cáo | `createReport`, `getUserReports`, `getAllReports`, `updateReportStatus` |
| `controllers/collection/collectionCollaboratorController.js` | HTTP bộ sưu tập và cộng tác | `addCollaborator`, `removeCollaborator`, `updateCollaboratorPermission` |
| `controllers/collection/collectionCRUDController.js` | HTTP bộ sưu tập và cộng tác | `getUserCollections`, `getCollectionById`, `createCollection`, `updateCollection`, `deleteCollection` |
| `controllers/collection/collectionExportController.js` | HTTP bộ sưu tập và cộng tác | `trackCollectionShare`, `exportCollection` |
| `controllers/collection/collectionFavoriteController.js` | HTTP bộ sưu tập và cộng tác | `toggleCollectionFavorite`, `getFavoriteCollections`, `checkCollectionFavorites` |
| `controllers/collection/collectionHelpers.js` | HTTP bộ sưu tập và cộng tác | `getUserId`, `hasPermission` |
| `controllers/collection/collectionImageController.js` | HTTP bộ sưu tập và cộng tác | `addImageToCollection`, `removeImageFromCollection`, `getCollectionsContainingImage`, `reorderCollectionImages` |
| `controllers/collection/collectionReadController.js` | HTTP bộ sưu tập và cộng tác | `getUserCollections`, `getCollectionById` |
| `controllers/collection/collectionTemplateController.js` | HTTP bộ sưu tập và cộng tác | `getTemplates`, `getTemplateById`, `createTemplate`, `createCollectionFromTemplate`, `updateTemplate`, `deleteTemplate`, `saveCollectionAsTemplate` |
| `controllers/collection/collectionVersionController.js` | HTTP bộ sưu tập và cộng tác | `getCollectionVersions`, `getVersionByNumber`, `restoreCollectionVersion` |
| `controllers/collection/collectionWriteController.js` | HTTP bộ sưu tập và cộng tác | `createCollection`, `updateCollection`, `deleteCollection` |
| `controllers/collection/index.js` | HTTP bộ sưu tập và cộng tác | Chuyển tiếp export; xem đường dẫn trong file |
| `controllers/engagement/favoriteController.js` | HTTP thích/theo dõi/thông báo | `toggleFavorite`, `getFavorites`, `checkFavorites`, `deleteAllFavorites` |
| `controllers/engagement/followController.js` | HTTP thích/theo dõi/thông báo | `followUser`, `unfollowUser`, `getFollowing`, `getFollowers`, `getFollowStatus`, `getFollowCounts`, `getUserFollowStats`, `getUserFollowing`, `getUserFollowers`, `deleteAllFollows` |
| `controllers/engagement/index.js` | HTTP thích/theo dõi/thông báo | Chuyển tiếp export; xem đường dẫn trong file |
| `controllers/engagement/notificationController.js` | HTTP thích/theo dõi/thông báo | `getNotifications`, `markNotificationAsRead`, `markAllNotificationsAsRead`, `deleteNotification`, `getUnreadCount` |
| `controllers/image/directUploadController.js` | HTTP ảnh, upload và thống kê | `uploadImage` |
| `controllers/image/imageCRUDController.js` | HTTP ảnh, upload và thống kê | `getImagesByUserId`, `getImageById`, `downloadImage`, `updateImage` |
| `controllers/image/imageProxyController.js` | HTTP ảnh, upload và thống kê | `proxyImage` |
| `controllers/image/imageSearchController.js` | HTTP ảnh, upload và thống kê | `getAllImages`, `getLocations` |
| `controllers/image/imageStatsController.js` | HTTP ảnh, upload và thống kê | `incrementView`, `incrementDownload` |
| `controllers/image/imageUploadController.js` | HTTP ảnh, upload và thống kê | `uploadImage`, `preUploadImage`, `deletePreUploadedFile`, `finalizeImageUpload`, `createBulkUploadNotification` |
| `controllers/image/index.js` | HTTP ảnh, upload và thống kê | Chuyển tiếp export; xem đường dẫn trong file |
| `controllers/image/stagedUploadController.js` | HTTP ảnh, upload và thống kê | `preUploadImage`, `deletePreUploadedFile`, `finalizeImageUpload`, `createBulkUploadNotification` |
| `controllers/image/uploadStatusController.js` | HTTP ảnh, upload và thống kê | `getUploadStatus` |
| `controllers/search/index.js` | HTTP gợi ý tìm và chia sẻ mạng xã hội | Chuyển tiếp export; xem đường dẫn trong file |
| `controllers/search/searchSuggestionsController.js` | HTTP gợi ý tìm và chia sẻ mạng xã hội | `getSearchSuggestions`, `getPopularSearches` |
| `controllers/search/socialShareController.js` | HTTP gợi ý tìm và chia sẻ mạng xã hội | `handleSocialShare`, `checkSocialScraper` |
| `controllers/user/index.js` | HTTP hồ sơ/tài khoản người dùng | Chuyển tiếp export; xem đường dẫn trong file |
| `controllers/user/userAnalyticsController.js` | HTTP hồ sơ/tài khoản người dùng | `getUserAnalytics` |
| `controllers/user/userController.js` | HTTP hồ sơ/tài khoản người dùng | `searchUsers`, `authMe`, `getUserByUsername`, `getUserById`, `changePassword`, `forgotPassword`, `resetPassword`, `changeInfo`, `getUserStats`, `trackProfileView`, `pinImage`, `unpinImage`, `getPinnedImages`, `reorderPinnedImages`, `getDownloadHistory`, `getNotificationPreferences`, `updateNotificationPreferences` |
| `controllers/user/userDirectoryController.js` | HTTP hồ sơ/tài khoản người dùng | `searchUsers`, `authMe`, `getUserByUsername`, `getUserById` |
| `controllers/user/userPasswordController.js` | HTTP hồ sơ/tài khoản người dùng | `changePassword`, `forgotPassword`, `resetPassword` |
| `controllers/user/userPinnedImagesController.js` | HTTP hồ sơ/tài khoản người dùng | `pinImage`, `unpinImage`, `getPinnedImages`, `reorderPinnedImages` |
| `controllers/user/userPreferencesController.js` | HTTP hồ sơ/tài khoản người dùng | `getDownloadHistory`, `getNotificationPreferences`, `updateNotificationPreferences` |
| `controllers/user/userProfileController.js` | HTTP hồ sơ/tài khoản người dùng | `changeInfo` |
| `controllers/user/userStatsController.js` | HTTP hồ sơ/tài khoản người dùng | `getUserStats`, `trackProfileView` |
| `libs/s3.js` | Shim tương thích; implementation tại service tương ứng | `default` |
| `middlewares/adminMiddleware.js` | Xử lý request trước controller | `adminRoute` |
| `middlewares/asyncHandler.js` | Xử lý request trước controller | `asyncHandler` |
| `middlewares/authMiddleware.js` | Xử lý request trước controller | `optionalAuth`, `protectedRoute` |
| `middlewares/cacheHeaders.js` | Xử lý request trước controller | `setCacheHeaders`, `setCustomCacheHeaders` |
| `middlewares/cacheMiddleware.js` | Xử lý request trước controller | `cacheMiddleware`, `clearCache`, `clearFavoritesCache`, `clearDownloadHistoryCache`, `clearCollectionsCache` |
| `middlewares/csrfMiddleware.js` | Xử lý request trước controller | `csrfToken`, `validateCsrf`, `getCsrfToken` |
| `middlewares/errorHandler.js` | Xử lý request trước controller | `errorHandler` |
| `middlewares/multerMiddleware.js` | Xử lý request trước controller | `singleUpload`, `multipleUpload`, `avatarUpload` |
| `middlewares/permissionMiddleware.js` | Xử lý request trước controller | `PERMISSIONS`, `hasPermission`, `requirePermission`, `requireSuperAdmin` |
| `middlewares/rateLimiter.js` | Xử lý request trước controller | `apiLimiter`, `authLimiter`, `uploadLimiter` |
| `middlewares/requestDeduplication.js` | Xử lý request trước controller | `requestDeduplication` |
| `middlewares/requestQueue.js` | Xử lý request trước controller | `requestQueue`, `enqueueRequest`, `getQueueStatus` |
| `middlewares/validationMiddleware.js` | Xử lý request trước controller | `validate`, `validateSignUp`, `validateSignIn`, `validateImageUpload`, `validateGetImages`, `validateUserId` |
| `models/AdminRole.js` | Schema/index dữ liệu `AdminRole`; xem field và hook trong file | default: AdminRole |
| `models/AnonymousActivity.js` | Schema/index dữ liệu `AnonymousActivity`; xem field và hook trong file | default: AnonymousActivity |
| `models/Booking.js` | Schema/index dữ liệu `Booking`; xem field và hook trong file | default: Booking |
| `models/BookingAvailability.js` | Schema/index dữ liệu `BookingAvailability`; xem field và hook trong file | default: BookingAvailability |
| `models/BookingPackage.js` | Schema/index dữ liệu `BookingPackage`; xem field và hook trong file | default: BookingPackage |
| `models/BookingPolicy.js` | Schema/index dữ liệu `BookingPolicy`; xem field và hook trong file | default: BookingPolicy |
| `models/BookingReview.js` | Schema/index dữ liệu `BookingReview`; xem field và hook trong file | default: BookingReview |
| `models/BookingWorkspace.js` | Schema/index dữ liệu `BookingWorkspace`; xem field và hook trong file | default: BookingWorkspace |
| `models/Category.js` | Schema/index dữ liệu `Category`; xem field và hook trong file | default: Category |
| `models/Collection.js` | Schema/index dữ liệu `Collection`; xem field và hook trong file | default: Collection |
| `models/CollectionTemplate.js` | Schema/index dữ liệu `CollectionTemplate`; xem field và hook trong file | default: CollectionTemplate |
| `models/CollectionVersion.js` | Schema/index dữ liệu `CollectionVersion`; xem field và hook trong file | default: CollectionVersion |
| `models/Follow.js` | Schema/index dữ liệu `Follow`; xem field và hook trong file | default: Follow |
| `models/HeroConfig.js` | Schema/index dữ liệu `HeroConfig`; xem field và hook trong file | default: HeroConfig |
| `models/Image.js` | Schema/index dữ liệu `Image`; xem field và hook trong file | default: Image |
| `models/NewsletterSubscription.js` | Schema/index dữ liệu `NewsletterSubscription`; xem field và hook trong file | default: NewsletterSubscription |
| `models/Notification.js` | Schema/index dữ liệu `Notification`; xem field và hook trong file | default: Notification |
| `models/PageView.js` | Schema/index dữ liệu `PageView`; xem field và hook trong file | default: PageView |
| `models/PasswordResetToken.js` | Schema/index dữ liệu `PasswordResetToken`; xem field và hook trong file | default: PasswordResetToken |
| `models/Report.js` | Schema/index dữ liệu `Report`; xem field và hook trong file | default: Report |
| `models/Session.js` | Schema/index dữ liệu `Session`; xem field và hook trong file | default: Session |
| `models/Settings.js` | Schema/index dữ liệu `Settings`; xem field và hook trong file | `initializeDefaultSettings` |
| `models/SystemLog.js` | Schema/index dữ liệu `SystemLog`; xem field và hook trong file | default: SystemLog |
| `models/UploadJob.js` | Schema/index dữ liệu `UploadJob`; xem field và hook trong file | default: UploadJob |
| `models/User.js` | Schema/index dữ liệu `User`; xem field và hook trong file | default: User |
| `models/UserActivity.js` | Schema/index dữ liệu `UserActivity`; xem field và hook trong file | default: UserActivity |
| `routes/adminRoute.js` | Khai báo URL và gắn middleware/handler | default: adminRoute |
| `routes/authRoute.js` | Khai báo URL và gắn middleware/handler | default: authRoute |
| `routes/bookingRoute.js` | Khai báo URL và gắn middleware/handler | default: bookingRoute |
| `routes/categoryRoute.js` | Khai báo URL và gắn middleware/handler | default: categoryRoute |
| `routes/collectionFavoriteRoute.js` | Khai báo URL và gắn middleware/handler | default: collectionFavoriteRoute |
| `routes/collectionRoute.js` | Khai báo URL và gắn middleware/handler | default: collectionRoute |
| `routes/collectionTemplateRoute.js` | Khai báo URL và gắn middleware/handler | default: collectionTemplateRoute |
| `routes/collectionVersionRoute.js` | Khai báo URL và gắn middleware/handler | default: collectionVersionRoute |
| `routes/favoriteRoute.js` | Khai báo URL và gắn middleware/handler | default: favoriteRoute |
| `routes/followRoute.js` | Khai báo URL và gắn middleware/handler | default: followRoute |
| `routes/heroRoute.js` | Khai báo URL và gắn middleware/handler | default: heroRoute |
| `routes/imageRoute.js` | Khai báo URL và gắn middleware/handler | default: imageRoute |
| `routes/newsletterRoute.js` | Khai báo URL và gắn middleware/handler | default: newsletterRoute |
| `routes/notificationRoute.js` | Khai báo URL và gắn middleware/handler | default: notificationRoute |
| `routes/reportRoute.js` | Khai báo URL và gắn middleware/handler | default: reportRoute |
| `routes/searchRoute.js` | Khai báo URL và gắn middleware/handler | default: searchRoute |
| `routes/userRoute.js` | Khai báo URL và gắn middleware/handler | default: userRoute |
| `server.js` | Khởi tạo Express/Socket, thứ tự middleware/route, kết nối DB và lifecycle | Nội bộ module |
| `services/ai/aiTaggingService.js` | Tạo/dịch/gộp tag ảnh | `generateAITags`, `mergeTags` |
| `services/ai/tagTranslator.js` | Tạo/dịch/gộp tag ảnh | `translateTags`, `getTargetLanguage` |
| `services/audit/auditLogger.js` | Ghi audit và xử lý IP request | `getClientIp`, `comparePermissions`, `logPermissionChange` |
| `services/auth/loginSession.js` | Nghiệp vụ phiên đăng nhập/chính sách mật khẩu | `createLoginSession` |
| `services/auth/passwordRequirements.js` | Nghiệp vụ phiên đăng nhập/chính sách mật khẩu | `getPasswordRequirements` |
| `services/booking/bookingReminders.js` | Điều phối nhắc lịch chụp | `startBookingReminders`, `stopBookingReminders` |
| `services/cache/permissionCache.js` | Cache và invalidation | `getCachedPermissions`, `setCachedPermissions`, `invalidateUserCache`, `clearAllCache`, `getCacheStats`, `startCacheCleanup`, `stopCacheCleanup` |
| `services/cache/queryCache.js` | Cache TTL, gom lượt đọc cùng khóa, chống ghi kết quả cũ sau invalidation | `getCache`, `setCache`, `deleteCache`, `clearCache`, `generateCacheKey`, `cached`, `cleanupExpiredCache`, `getCacheStats` |
| `services/collection/collectionCache.js` | Nghiệp vụ version/cache bộ sưu tập | `invalidateUserCollections` |
| `services/collection/collectionVersionHelper.js` | Nghiệp vụ version/cache bộ sưu tập | `createCollectionVersion` |
| `services/email/bookingEmails.js` | Gửi email theo sự kiện | `sendBookingEmail` |
| `services/email/emailAlerts.js` | Gửi email theo sự kiện | `sendAlertEmail`, `reinitializeTransporter`, `sendUserEmail`, `sendImageProcessingCompleteEmail`, `sendImageApprovedEmail`, `sendImageRejectedEmail` |
| `services/lifecycle/periodicTask.js` | Một timer/một lượt chạy; chống kết quả start cũ tạo timer sau stop | `createPeriodicTask` |
| `services/lifecycle/preUploadCleanup.js` | Lịch tác vụ và dọn dữ liệu tạm | `cleanupOldPreUploadedFiles`, `startPreUploadCleanup`, `stopPreUploadCleanup` |
| `services/lifecycle/sessionCleanup.js` | Lịch tác vụ và dọn dữ liệu tạm | `cleanupExpiredSessions`, `startSessionCleanup`, `stopSessionCleanup` |
| `services/media/activityGuard.js` | Phát hiện lượt xem/tải bất thường, ghi activity; fail-open hiện có | `checkUserActivity` |
| `services/media/blurThumbnail.js` | PNG base64 tối đa 20px, giữ tỷ lệ | `createBlurThumbnail` |
| `services/media/colorExtractor.js` | Xử lý media/metadata và quy tắc lượt ảnh | `extractDominantColors` |
| `services/media/colorExtractorAdvanced.js` | Xử lý media/metadata và quy tắc lượt ảnh | `extractDominantColorsAdvanced` |
| `services/media/directUpload.js` | Tạo bản ghi ảnh cho API upload trực tiếp, wrapper metadata không kích thước | `extractDirectUploadMetadata`, `createImageDocument` |
| `services/media/exifExtractor.js` | Xử lý media/metadata và quy tắc lượt ảnh | `extractExifData` |
| `services/media/imageHelpers.js` | Xử lý media/metadata và quy tắc lượt ảnh | `findCategory`, `parseTags`, `validateCoordinates`, `streamToBuffer`, `extractImageMetadata as extractMetadata` |
| `services/media/imageMetadata.js` | Màu/EXIF và tùy chọn kích thước, fallback khi trích xuất lỗi | `extractImageMetadata` |
| `services/media/mediaCommand.js` | Chạy tool trực tiếp, timeout và dừng tiến trình con | `runMediaCommand` |
| `services/media/mediaTempFiles.js` | Workspace tạm riêng, dọn trong finally | `withMediaTempDirectory` |
| `services/media/sharpQueue.js` | Xử lý media/metadata và quy tắc lượt ảnh | `queueSharpOperation`, `getQueueStatus` |
| `services/media/videoConverter.js` | Xử lý media/metadata và quy tắc lượt ảnh | `convertGifToVideo`, `generateVideoThumbnail`, `getVideoDuration` |
| `services/monitoring/alertMonitor.js` | Đọc settings, ngưỡng/cooldown và gửi cảnh báo qua lịch định kỳ | `invalidateSettingsCache`, `startMonitoring`, `stopMonitoring` |
| `services/monitoring/requestMetrics.js` | Đếm request/lỗi cùng cửa sổ 5 phút | `createRequestMetrics` |
| `services/monitoring/systemMetrics.js` | CPU/RAM/disk/DB, storage unknown, tổng trạng thái; chưa tự thu request HTTP | `getCpuUsage`, `getMemoryUsage`, `getDiskUsage`, `getDatabaseStatus`, `getStorageStatus`, `recordResponseTime`, `getAverageResponseTime`, `recordRequest`, `getErrorRate`, `getSystemStatus` |
| `services/newsletterService.js` | Module backend | `createNewsletterService` |
| `services/palette/sitePalette.js` | Palette cấu hình dùng chung | `validateSitePalette`, `publicSitePalette` |
| `services/permissions/adminUtils.js` | Tính và kiểm quyền | `computeAdminStatus`, `isAdminRoleValid`, `enrichUserWithAdminStatus` |
| `services/permissions/requestAdminStatus.js` | Tính và kiểm quyền | `ensureRequestAdminStatus` |
| `services/realtime/notificationEmitter.js` | Kết nối/sự kiện/quyền WebSocket | `createAndEmitNotification` |
| `services/realtime/roomPermissions.js` | Kiểm quyền vào phòng collection/image/profile và cache quyền | `canJoinCollectionRoom`, `canJoinImageRoom`, `canJoinProfileRoom`, `clearPermissionCache` |
| `services/realtime/socketMetrics.js` | Kết nối/sự kiện/quyền WebSocket | `socketMetrics` |
| `services/realtime/socketServer.js` | Kết nối/sự kiện/quyền WebSocket | `initializeSocketServer`, `getSocketServer`, `emitNotification`, `emitUnreadCount`, `emitCollectionUpdate`, `getCollectionRecipients`, `emitImageFavoriteUpdate`, `emitUserFollowUpdate`, `emitImageStatsUpdate`, `clearPermissionCache` |
| `services/search/imageListing.js` | Dựng filter ảnh/danh mục và giữ nhánh fallback query | `listImages` |
| `services/search/imagePage.js` | Một query lấy trang/populate/count dùng lại cho các nhánh | `fetchImagePage` |
| `services/search/slugUtils.js` | Lọc và truy vấn ảnh | `extractIdFromSlug`, `findImageByShortId` |
| `services/storage/imageStorage.js` | Các biến thể WebP/AVIF/GIF và kết quả upload ảnh | `uploadImageWithSizes`, `generateAvifFormats` |
| `services/storage/mediaStorage.js` | Upload video và avatar | `uploadVideo`, `uploadAvatar` |
| `services/storage/r2Objects.js` | Đọc/ghi/xóa object, URL ký sẵn và URL công khai R2 | `getBucketName`, `uploadToR2`, `deleteImageFromR2`, `deleteAvatarFromR2`, `getImageFromR2`, `generatePresignedUploadUrl`, `getObjectFromR2`, `deleteObjectByKey` |
| `utils/accountIdentifier.js` | Quy tắc/định dạng thuần | `normalizeAccountIdentifier` |
| `utils/adminUtils.js` | Shim tương thích; implementation tại service tương ứng | Chuyển tiếp export; xem đường dẫn trong file |
| `utils/alertMonitor.js` | Shim tương thích; implementation tại service tương ứng | Chuyển tiếp export; xem đường dẫn trong file |
| `utils/auditLogger.js` | Shim tương thích; implementation tại service tương ứng | Chuyển tiếp export; xem đường dẫn trong file |
| `utils/bookingAdminSearch.js` | Quy tắc/định dạng thuần | `bookingAdminSearch` |
| `utils/bookingPolicyRules.js` | Quy tắc/định dạng thuần | `defaultCancellationRules`, `defaultBookingPolicy`, `scheduledTime`, `reschedulePolicyError`, `cancellationRefundPercent`, `validateBookingPolicy` |
| `utils/bookingTime.js` | Quy tắc/định dạng thuần | `readRequestedTime` |
| `utils/checkAITaggingStatus.js` | Shim tương thích; implementation tại service tương ứng | Chuyển tiếp export; xem đường dẫn trong file |
| `utils/colorNames.js` | Quy tắc/định dạng thuần | `rgbToColorName` |
| `utils/constants.js` | Quy tắc/định dạng thuần | `RAW_UPLOAD_FOLDER`, `PAGINATION`, `FILE_UPLOAD`, `TOKEN` |
| `utils/dominantColorSelection.js` | Quy tắc/định dạng thuần | `selectDominantColors` |
| `utils/emailAlerts.js` | Shim tương thích; implementation tại service tương ứng | Chuyển tiếp export; xem đường dẫn trong file |
| `utils/fileTypeUtils.js` | Quy tắc/định dạng thuần | `mimeToExtension`, `mimeToSingleExtension`, `extensionMap`, `getExtensionsFromMimeType`, `getSingleExtensionFromMimeType`, `validateFileType` |
| `utils/imageListingResponse.js` | Quy tắc/định dạng thuần | `normalizeListedImages` |
| `utils/imageSort.js` | Quy tắc/định dạng thuần | `buildSortQuery` |
| `utils/inputUtils.js` | Quy tắc/định dạng thuần | `safeTrim`, `escapeRegex`, `isValidObjectId`, `normalizeEmail` |
| `utils/ipAccessRules.js` | IP/CIDR IPv4/IPv6, rule sai không cấp quyền | `isIPAllowed` |
| `utils/logger.js` | Quy tắc/định dạng thuần | `logger` |
| `utils/notificationPreferences.js` | Quy tắc/định dạng thuần | `buildNotificationPreferencesUpdate` |
| `utils/packagePresentation.js` | Quy tắc/định dạng thuần | `isPackagePhotoUrl`, `validatePackagePresentation`, `readPackagePresentation` |
| `utils/permissionCache.js` | Shim tương thích; implementation tại service tương ứng | Chuyển tiếp export; xem đường dẫn trong file |
| `utils/permissionValidator.js` | Quy tắc/định dạng thuần | `getAllowedPermissions`, `isPermissionAllowedForRole`, `validatePermissionsForRole`, `getInheritedPermissions`, `applyRoleInheritance`, `getRoleDescription` |
| `utils/profileFields.js` | Validate/normalize bảy trường hồ sơ, ghi nhận field đổi | `VALIDATION_RULES`, `validateInputLength`, `buildProfileFieldsUpdate` |
| `utils/publicUser.js` | Chỉ dữ liệu hồ sơ công khai, không trả email/mật khẩu/quyền | `publicUser` |
| `utils/sitePalette.js` | Shim tương thích; implementation tại service tương ứng | Chuyển tiếp export; xem đường dẫn trong file |
| `utils/socketMetrics.js` | Shim tương thích; implementation tại service tương ứng | Chuyển tiếp export; xem đường dẫn trong file |
| `utils/systemMetrics.js` | Shim tương thích; implementation tại service tương ứng | Chuyển tiếp export; xem đường dẫn trong file |
| `utils/tagTranslator.js` | Shim tương thích; implementation tại service tương ứng | Chuyển tiếp export; xem đường dẫn trong file |
| `utils/testGoogleVisionAPI.js` | Shim tương thích; implementation tại service tương ứng | Chuyển tiếp export; xem đường dẫn trong file |
| `workers/aiTaggingQueue.js` | Điều phối công việc nền | `addAITaggingJob`, `getAITaggingQueueStatus` |
| `workers/imageProcessor.js` | Điều phối công việc nền | `processUploadJob` |
| `workers/jobQueue.js` | Điều phối công việc nền | `addJob`, `startUploadQueue`, `stopUploadQueue` |
| `workers/uploadJobRunner.js` | Điều phối công việc nền | `createUploadJobRunner` |

</details>

### Các file hỗ trợ

| File | Vai trò |
|---|---|
| `backend/scripts/checkAITaggingStatus.js` | Kiểm và log cấu hình AI tagging |
| `backend/scripts/ensure-coverage-dir.mjs` | Tạo thư mục output coverage trước khi chạy test |
| `backend/scripts/makeSuperAdmin.js` | Cấp quyền super admin — có thay đổi dữ liệu, không chạy tự động |
| `backend/scripts/migrate-color-extraction.js` | Migration màu ảnh — có thay đổi dữ liệu, cần quy trình riêng |
| `backend/scripts/README-MIGRATION.md` | Tài liệu/công cụ hỗ trợ bảo trì; đọc file trước khi chạy |
| `backend/scripts/testGoogleVisionAPI.js` | Kiểm kết nối Google Vision, có thể gọi dịch vụ ngoài |
| `backend/scripts/verify-admin-imports.mjs` | Kiểm các module admin đang dùng còn tải được |
| `backend/scripts/verify-container.mjs` | Tài liệu/công cụ hỗ trợ bảo trì; đọc file trước khi chạy |
| `backend/scripts/verify-structure.mjs` | Kiểm import, đường tài nguyên và export tương thích |

Test từng nghiệp vụ nằm trong `backend/tests/`; đọc tên `test(...)` để biết hành vi và fixture. Không dùng danh mục này thay cho đọc implementation hiện tại.

<details>
<summary>Danh mục test backend và hành vi kiểm tra</summary>

Mỗi file dùng fixture/mock theo hợp đồng riêng; không coi test pass là nghiệm thu production.

| File | Hành vi test khai báo |
|---|---|
| `backend/tests/auth-isolation.test.js` | identities and refresh cookies never share responses before authentication |
| `backend/tests/booking-admin-search.test.js` | pc-[01].*; PC-0anything |
| `backend/tests/booking-policy-controller.test.js` | controllers enforce policy and persist weather requests without changing confirmed schedule |
| `backend/tests/booking-policy.test.js` | deadline uses confirmed time in Vietnam, including exact boundary; personal disabled / used once; approved weather does not consume personal allowance; weather request exception still requires enabled policy and future shooting; refund sorts thresholds and handles exact boundaries; policy validation rejects coercion, missing zero, bad ranges and inverted refunds |
| `backend/tests/booking-reminder-scheduler.test.js` | booking reminder keeps its hourly schedule and sends due reminders once per saved flag |
| `backend/tests/bookingTime.test.js` | old time slots and flexible requests remain supported; exact preferred time is preserved and period derived; reject malformed times before writes |
| `backend/tests/collection-cache.test.js` | collection mutations invalidate both caches in order and tolerate response-cache errors |
| `backend/tests/color-extraction.test.js` | advanced extraction preserves both colors in a two-color image; public extraction entry supports advanced and simple modes |
| `backend/tests/color-names.test.js` | RGB names retain black/white/gray, hue and brown boundary behavior |
| `backend/tests/dominant-color-selection.test.js` | dominant color selection retains different white/black thresholds and fill order |
| `backend/tests/image-listing.test.js` | image listing preserves search/filter/sort/pagination and serializes map fields |
| `backend/tests/image-metadata.test.js` | shared metadata keeps direct-upload shape, optional dimensions and independent failure fallbacks |
| `backend/tests/image-storage.test.js` | image storage preserves original bytes, variant keys, pending AVIF and avatar output |
| `backend/tests/ip-access-rules.test.js` | IP access rules cover exact matches, IPv4/IPv6 CIDR boundaries and mapped/port forms |
| `backend/tests/login-session.test.js` | password and Google logins share token/session creation and new-device notification semantics |
| `backend/tests/media-runtime.test.js` | media command keeps arguments literal, reports failures and terminates a timed-out child; temporary media directories are unique and removed on success and failure; blur thumbnail preserves ratio and never enlarges a small image |
| `backend/tests/monitoring-metrics.test.js` | error rate uses requests and errors from the same window, expires idle data and stays bounded; storage status does not claim a connection without a probe |
| `backend/tests/newsletter.test.js` | normalizes, deduplicates, confirms once, unsubscribes and permits resubscribe; expired/malformed tokens, cooldown and delivery failure; persistent schema has unique email index and no raw token fields |
| `backend/tests/notification-preferences.test.js` | Kiểm hồi quy bằng assert trực tiếp; đọc file để xem dữ liệu và kết quả mong đợi |
| `backend/tests/packagePresentation.test.js` | legacy clients preserve optional content; empty media is supported, entered content roundtrips; reject unsafe URLs, duplicates and oversized content |
| `backend/tests/password-requirements.test.js` | shared password requirements preserve defaults, false flags and database-error fallback |
| `backend/tests/periodic-task.test.js` | stop during asynchronous startup prevents a late timer; restarting keeps only the newest timer; slow tasks do not overlap across ticks or restarts; errors release the running guard; invalid intervals and failed setup are reported without leaving a timer |
| `backend/tests/pinned-images-order.test.js` | pinned order rejects duplicate, missing and foreign IDs before saving |
| `backend/tests/profile-fields.test.js` | profile partial updates preserve omitted fields, normalized comparisons and field order; profile validates raw trimmed lengths before adding protocol or stripping @; public profile serialization excludes account/private fields and provides existing defaults |
| `backend/tests/query-cache.test.js` | concurrent cache misses share one read; failed reads can be retried; invalidation during a read prevents stale data replacing a newer cached result; clear and explicit writes also invalidate in-flight ownership |
| `backend/tests/r2-objects.test.js` | R2 object service retains keys, content types, public URLs and error propagation |
| `backend/tests/request-admin-status.test.js` | admin and permission guards retain missing-user, cached flags, grants and denials |
| `backend/tests/request-queue.test.js` | request slots release once when both finish and close fire, preserving queued concurrency; waiting requests detach their close listener on admission and cancellation; waiting timeout is enforced while all active slots remain occupied |
| `backend/tests/room-permissions.test.js` | room permission cache keeps allow/deny decisions and invalidates the resource |
| `backend/tests/upload-api.test.js` | upload endpoints await persistence, isolate owners and protect accepted sources |
| `backend/tests/upload-job-runner.test.js` | two runners claim each accepted job once, including every later wave; restart reclaims expired work, preserves current leases and staged reservations; failure backs off, terminal failures are explicit, and AVIF is a persisted child |
| `backend/tests/upload-processor.test.js` | replaying an upload after image creation reuses its ID and does not transfer or notify twice; a worker that lost its lease cannot publish a new image |
| `backend/tests/video-converter.test.js` | video processing retains results, size limits and fallbacks, and cleans workspaces |

</details>

Các file cấp backend: `package.json` sở hữu lệnh chạy và dependency; `package-lock.json` cố định phiên bản; `kill-port-3000.js` dừng tiến trình theo cổng để hỗ trợ local. Không lưu secret vào tài liệu; cấu hình môi trường thực tế nằm ngoài danh mục source.

### Test bổ sung cho trạng thái tài khoản

| File | Hành vi được kiểm |
|---|---|
| `backend/tests/account-session-access.test.js` | Refresh hết hạn/thiếu session, user mất/bị khóa, lỗi DB; API bắt buộc/tùy chọn với trạng thái ban |
| `backend/tests/socket-account-access.test.js` | Handshake không gắn user bị ban, user hợp lệ được gắn, user mất bị từ chối |
| `backend/tests/oauth-log-redaction.test.js` | OAuth state sai không đưa raw query/cookie state vào log |

`sessionController.js` hiện tra trạng thái tài khoản khi refresh; authMiddleware
và socketServer áp dụng ban trước khi gắn danh tính. Xem giới hạn về request/socket
đang chạy trong báo cáo rà code. Không thay tên export hoặc thêm route.
