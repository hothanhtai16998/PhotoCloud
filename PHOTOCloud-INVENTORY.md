# PhotoCloud — danh sách trang và component

Thống kê từ mã nguồn ngày 10/10/2026. Phạm vi: `frontend/src`. Không thay đổi code ứng dụng.

## Cách đếm

Đếm theo **file .tsx/.jsx**, không phải instance đang hiển thị. Một file UI có thể khai báo nhiều component; tên khai báo được liệt kê riêng. Component cha là file render ít nhất một component của dự án, kể cả trong cùng file. Component con là file được render trong JSX của file khác. Một file có thể vừa là cha vừa là con, không cộng hai nhóm. Không tính icon Lucide, thư viện, hook, service, store, CSS, type. Đã lần theo re-export/index.ts và lazy import bằng TypeScript. Quan hệ thể hiện JSX trong source, không khẳng định mọi nhánh đang chạy. Children truyền qua props/cơ chế động cần kiểm tra riêng; “chưa thấy nơi render” chưa đồng nghĩa code thừa.

## Tiến độ tối ưu

**Quy ước từ 10/10/2026:** tên gạch ngang = đã hoàn tất phạm vi tối ưu và kiểm thử; xác nhận của người dùng ghi riêng. Tên chưa gạch = chưa hoàn tất; không đồng nghĩa chưa từng chỉnh sửa. Không tự đánh dấu mọi component con khi component cha xong. Hoàn tất không đồng nghĩa đã commit.

Từ nay, trước khi đánh dấu xong: rà soát → sửa → lint/build và kiểm thử cần thiết → localhost desktop/mobile/tablet, kiểm tra hai phía breakpoint liên quan → cập nhật danh sách → dừng để người dùng kiểm tra. Các phần đã chốt trước đây căn cứ vào handoff, Git và xác nhận trong chat; không tự mở lại slide/header.

### Đã hoàn tất — 21 file component, chưa có trang nào được đánh dấu hoàn tất toàn bộ

| Component | Bằng chứng/phạm vi |
|---|---|
| ~~[Header](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/Header.tsx)~~ | a2c6d06 — bố cục/responsive |
| ~~[Avatar](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/Avatar.tsx)~~ | a2c6d06, 21e4b00 — phần trong Header |
| ~~[TextLogo](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/TextLogo.tsx)~~ | a2c6d06 — phần trong Header |
| ~~[LanguageSwitcher](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/LanguageSwitcher.tsx)~~ | 21e4b00 — trạng thái đã chốt |
| ~~[UserMenu](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/UserMenu.tsx)~~ | dca1501 — tối ưu menu người dùng |
| ~~[NotificationBell](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/NotificationBell.tsx)~~ | 4e28d7d — tối ưu thông báo |
| ~~[SearchBar](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/SearchBar/SearchBar.tsx)~~ | 475149e, f94ed3e — luồng tìm kiếm trong Header |
| ~~[SearchSuggestions](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/SearchBar/SearchSuggestions.tsx)~~ | 475149e — danh sách gợi ý |
| ~~[SearchFilters](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/SearchFilters.tsx)~~ | 8cf7fb0 — bộ lọc và reset |
| ~~[CategoryNavigation](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/CategoryNavigation.tsx)~~ | 23c0066, 58359d1 — điều hướng category |
| ~~[ImagePageSidebar](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ImagePageSidebar.tsx)~~ | 09fbbac — subscription và cache preview |
| ~~[WebSocketStatus](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/WebSocketStatus.tsx)~~ | b82d302 — trạng thái kết nối |
| ~~[VisualArtFormsSlider](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/VisualArtFormsSlider.tsx)~~ | 58359d1 — slide đã chốt |
| ~~[FixedSlideStage](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/FixedSlideStage.tsx)~~ | 58359d1 — chuyển ảnh/swipe |
| ~~[SliderZoomImage](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/SliderZoomImage.tsx)~~ | 58359d1 — zoom và loading |
| ~~[BlurUpImage](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/NoFlashGrid/components/BlurUpImage.tsx)~~ | Đã được người dùng xác nhận; tối ưu phụ thuộc và phản hồi click; desktop/mobile + mock pass; chưa commit |
| ~~[NoFlashGrid](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/NoFlashGrid/NoFlashGrid.tsx)~~ | Tải thêm/cuộn + responsive đã kiểm thử 10/10/2026; người dùng đã cho chuyển bước tiếp theo; chưa commit |
| ~~[ImageModalInfo](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/NoFlashGrid/components/ImageModalInfo.tsx)~~ | Panel thông tin: portal/clamp viewport, cleanup khi đổi ảnh, Escape/focus/pointer; localhost responsive pass; chờ kiểm tra |
| ~~[ImageModalChart](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/NoFlashGrid/components/ImageModalChart.tsx)~~ | Tooltip theo cột, bàn phím/touch, thống kê daily index; mock totals + responsive pass; chờ kiểm tra |
| ~~[ImagePagePhoto](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ImagePagePhoto.tsx)~~ | Preview + actual DOM load/decode, dispose khi chuyển ảnh, fallback/error/retry; responsive320–1920 và màn hình ngang; lint0errors/0warnings |
| ~~[ImageProgressBar](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/NoFlashGrid/components/ImageProgressBar.tsx)~~ | Progress thực hoặc indeterminate khi không có byteprogress, aria/reduced-motion, portal từPhoto; lint0errors/0warnings |

Phụ thuộc trực tiếp của BlurUpImage đã xử lý: `useBatchedFavoriteCheck`, `useIsMobile`; test mock cho tải ảnh, response cũ, auth/cache, click lặp và cleanup. Không đánh dấu các hook này thành component trong thống kê.

### Đã hoàn tất: NoFlashGrid — tải thêm/cuộn vô hạn + responsive

| Phần | Trạng thái | Việc cần kiểm tra |
|---|---|---|
| ~~NoFlashGrid / useInfiniteScroll~~ | Đã sửa và kiểm thử | Hủy timer; giữ khóa qua loading/callback; guard progress tránh retry loop; re-observe sau completion; dừng ở trang cuối |
| HomePage — loadMore | Đã kiểm tra tích hợp; chưa hoàn tất toàn trang | Category cuối đúng sau đổi nhanh; tải thật 20→40 không duplicate; regression store cho filtered pagination/reset pass |
| ~~NoFlashGrid — layout~~ | Đã kiểm tra responsive | Đồng nhất <=768px; ResizeObserver đo lưới thật, bỏ trừ padding cố định và minimum 300px |
| UploadModal và các UI dùng chung | Chưa đánh dấu hoàn tất | Header đã xong không đồng nghĩa mọi tính năng bên trong đã tối ưu xong |

Ma trận đã kiểm tra cho NoFlashGrid: 360px, 390px, 767px, 768px, 769px, 1024px, 1279px, 1280px, 1366px; resize/đổi hướng; ảnh ngang/dọc/vuông; thanh tác giả/nút không bị cắt, không tràn ngang; cuộn nhanh/tải tiếp/đổi category/reset filter; không ghi dữ liệu backend để test. Chỉ sửa vấn đề đã xác minh trong phạm vi này.

Đang thực hiện modal/chi tiết ảnh: đã xong cụm Thông tin/biểu đồ; tiếp theo ImagePage — tải/chuyển ảnh, cleanup và responsive. Chưa đánh dấu ImagePage hoàn tất. Sau đó → trang tìm kiếm → đăng nhập/đăng ký/upload → hồ sơ → yêu thích/lịch sử/bộ sưu tập → giới thiệu → admin → rà soát file chưa dùng.

### ImagePage — đang thực hiện, chưa gạch toàn trang

| Cụm | Trạng thái |
|---|---|
| ~~Khung ImagePage/modal và responsive nội dung~~ | Đã sửa min-width1400px, width+sidebar, breakpoint768/769, toolbar/footer wrap, tiêu đề/tác giả/tag dài; đo khung ảnh bằng ResizeObserver theo viewport thật |
| ~~Chống response cũ khi tải/chuyển ảnh~~ | Abort + active guard; fast path state; regression success/error/cleanup pass |
| ~~Đồng bộ thống kê và biểu đồ~~ | Response lượt xem/tải không ghi vào ảnh khác; khởi tạo đủ views/downloads; chart nhận tổng/daily mới; favorite count0 hợp lệ; selector chỉ theo ảnh hiện tại |
| ~~Tải ảnh/animation và ImageProgressBar~~ | Đã gom vào keyed ImagePagePhoto, bỏ cacheprobe/newImage và preload riêng của trang, refs trongrender/previousimageflags; cleanup listener/decode/RAF chuyển ảnh/timer scroll; page lint0errors, còn33warnings |
| ~~Mở trực tiếp ảnh cũ~~ | Xong: API đọc theo ID ngắn/đầy đủ, giữ visibility gallery; ảnh chính không phụ thuộc 50 ảnh mới hoặc lỗi ảnh liên quan. Test mock và responsive 320–1920px pass |
| ~~Refresh → mở ảnh khác → đóng/quay lại~~ | Xong: đồng bộ state Router, bỏ background cũ; giữ ảnh A trong history khi mở B, đóng B trở lại A; chỉ ảnh đang mở nhận keyboard. Mobile một trang, desktop modal; 320/390/768/769/1024/1366px pass |
| ~~B → mở M từ I → đóng về đúng vị trí B~~ | Xong: lưu window/scroll-area riêng theo history entry, khôi phục khi đủ nội dung, sidebar không reset B; mở lại cập nhật vị trí mới, đổi I trong M không ghi đè. 320–1920px sai lệch 0px trong fixture |
| ~~Rà gọn code điều hướng A/M/I/B~~ | Xong: bấm I/nút/phím dùng chung handleImageSelect, luôn truyền selected image/list qua state; bỏ helper history không dùng và comment lỗi thời. Regression, build và responsive 320–1920px pass |
| ~~Lưu/Tải xuống: khóa bấm lặp, trạng thái chờ, session và responsive~~ | Hoàn tất 10/10/2026: khóa đồng bộ trước await; CSRF dùng Axios; tải thất bại không tăng thống kê/lịch sử; response khác tài khoản không cập nhật cache; menu tự đổi hướng và cuộn trong viewport; kiểm thử mocks 320–1920px cả B/M và màn hình thấp |
| ~~Chia sẻ và bàn phím/focus menu tải~~ | Hoàn tất 11/10/2026: khóa chia sẻ/aria-busy, native cancel không báo lỗi, native denied fallback copy, toast guard ảnh cũ; clipboard fallback trả focus; menu Arrow/Home/End/Escape/Tab, phím F và chặn phím lặp/modifier; responsive B/M 320–1920px/màn hình thấp |
| ~~Focus modal ảnh M~~ | Xong 11/10/2026: Tab/Shift+Tab trong M, focus nút đóng khi mở, trả focus preventScroll; không trap trang B/mobile/background, tạm nhường Edit/Collection; Info Tab đóng panel rồi tiếp tục trong M. Kiểm tra 320/769x440/1366px |
| Focus dialog con và popup tác giả | Chưa xong: EditImageModal/CollectionModal và popup tác giả; toàn ImagePage vẫn chưa hoàn tất |
| EditImageModal → ImageEditor/EditImageTabs/TagInput/useEditImageForm | Chưa hoàn tất, cần kiểm thử responsive toàn luồng |
| CollectionModal và các component con | Chưa hoàn tất, cần kiểm thử responsive và portal/outside click |
| Popup tác giả | Đã sửa tính vị trí ngoài render, clamp viewport và guard response khác ảnh; chưa kiểm chứng đầy đủ hover/focus/touch, timer đóng còn cần rà |

Kiểm thử lượt đầu ImagePage: fixture import trang/component thật, adapter Axios và stats services mock toàn bộ để không ghi backend. 320/360/390/767/768/769/1024/1279/1280/1366/1920px không tràn ngang với tên/title/location/tag rất dài; màn hình ngang956x440,769x440 và769x320; regular/mobile và modal/desktop; ResizeObserver cập nhật khung ảnh khi đổi kích thước. Thông tin mở/đóng Escape và trả focus không đóng trang; race1→2→3 giữ ảnh3 và333views khi response cũ về. Fixture đã xóa. Build pass, test-image-page-lifecycle.cjs pass; chưa tuyên bố lint toàn trang pass vì cụm tải/renderrefs còn lỗi. Không đánh dấu trang hay các modal con xong chỉ vì khung đã sửa.

## Tổng số

| Nhóm | Số file |
|---|---:|
| Trang | 16 |
| Trang nối route | 15 |
| Trang chưa nối route | 1 |
| Component hỗ trợ định tuyến | 2 |
| Component, không gồm trang/App/main/re-export | 115 |
| Component cha | 62 |
| Component con render từ file khác | 92 |
| Component không render component con của dự án | 53 |
| Component chưa thấy nơi render JSX trực tiếp | 23 |
| File re-export .tsx | 1 |
| File App/main | 2 |
| Tổng file TSX/JSX | 136 |

## Các trang

| Trang/file | Route | Component trực tiếp |
|---|---|---|
| [pages/AboutPage.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/AboutPage.tsx) | `/about` | — |
| [pages/CollectionsPage.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/CollectionsPage.tsx) | `/collections` | components/NoFlashGrid/components/BlurUpImage.tsx<br>components/collection/CollectionModal.tsx<br>pages/admin/components/modals/ConfirmModal.tsx |
| [pages/DownloadHistoryPage.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/DownloadHistoryPage.tsx) | `/downloads` | components/DownloadHistory.tsx |
| [pages/EditProfilePage.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/EditProfilePage.tsx) | `/profile/edit` | components/DownloadHistory.tsx<br>pages/profile/components/ActiveSessions.tsx<br>pages/profile/components/PasswordForm.tsx<br>pages/profile/components/ProfileForm.tsx |
| [pages/FavoriteCollectionsPage.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/FavoriteCollectionsPage.tsx) | `/favorite-collections` | components/NoFlashGrid/components/BlurUpImage.tsx |
| [pages/FavoritesPage.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/FavoritesPage.tsx) | `/favorites` | components/NoFlashGrid/NoFlashGrid.tsx<br>pages/admin/components/modals/ConfirmModal.tsx |
| [pages/GoogleCallbackPage.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/GoogleCallbackPage.tsx) | `/auth/google/callback` | — |
| [pages/HomePage.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/HomePage.tsx) | `/`<br>`/t/:categorySlug` | components/ActiveFiltersIndicator.tsx<br>components/NoFlashGrid/NoFlashGrid.tsx<br>components/VisualArtFormsSlider.tsx |
| [pages/ImagePage.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/ImagePage.tsx) | `/photos/:slug` | components/EditImageModal.tsx<br>components/NoFlashGrid/NoFlashGrid.tsx<br>components/NoFlashGrid/components/ImageModalInfo.tsx<br>components/ImagePagePhoto.tsx<br>components/collection/CollectionModal.tsx |
| [pages/SearchResultsPage.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/SearchResultsPage.tsx) | `/s/photos/:query` | components/ActiveFiltersIndicator.tsx<br>components/NoFlashGrid/NoFlashGrid.tsx<br>components/SearchResultsTags.tsx |
| [pages/SignInPage.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/SignInPage.tsx) | `/signin` | components/ui/button.tsx<br>components/ui/input.tsx |
| [pages/SignUpPage.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/SignUpPage.tsx) | `/signup` | pages/auth/components/SignUpForm.tsx |
| [pages/UploadPage.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/UploadPage.tsx) | Chưa nối route trong App.tsx | components/ui/button.tsx<br>components/ui/input.tsx<br>components/ui/label.tsx |
| [pages/admin/AdminPage.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/AdminPage.tsx) | `/admin` | AdminTabLoader (cùng file)<br>components/ui/skeleton.tsx<br>pages/admin/components/PermissionMatrix.tsx<br>pages/admin/components/tabs/AdminAnalytics.tsx<br>pages/admin/components/tabs/AdminCategories.tsx<br>pages/admin/components/tabs/AdminCollections.tsx<br>pages/admin/components/tabs/AdminFavorites.tsx<br>pages/admin/components/tabs/AdminImages.tsx<br>pages/admin/components/tabs/AdminLogs.tsx<br>pages/admin/components/tabs/AdminModeration.tsx<br>pages/admin/components/tabs/AdminRoles.tsx<br>pages/admin/components/tabs/AdminSettings.tsx<br>pages/admin/components/tabs/AdminUsers.tsx |
| [pages/collection/CollectionDetailPage.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/collection/CollectionDetailPage.tsx) | `/collections/:collectionId` | components/ui/button.tsx<br>pages/admin/components/modals/ConfirmModal.tsx<br>pages/collection/components/CollectionBulkActions.tsx<br>pages/collection/components/CollectionHeader.tsx<br>pages/collection/components/CollectionNoFlashGrid.tsx |
| [pages/profile/ProfilePage.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/profile/ProfilePage.tsx) | `/@username`<br>`/@username/:tab`<br>`/profile/user/:userId` | components/NoFlashGrid/NoFlashGrid.tsx<br>components/NoFlashGrid/components/BlurUpImage.tsx<br>components/UploadModal.tsx<br>components/ui/button.tsx<br>components/ui/skeleton.tsx<br>pages/profile/components/EditPinsModal.tsx<br>pages/profile/components/ProfileHeader.tsx<br>pages/profile/components/ProfileTabs.tsx<br>pages/profile/components/UserAnalyticsDashboard.tsx<br>pages/profile/components/UserList.tsx |

ImagePage dùng chung cho trang riêng và modal ảnh, tính một lần. `/test/visual-art-slider` là route thử nghiệm render component, không có page file riêng. `/profile` dùng ProfileRedirect; `/*` dùng ProfileRouteHandler để xử lý /@username. Tab admin là component trong AdminPage, không tính thành trang. Upload hiện dùng UploadModal; UploadPage.tsx chưa nối route.

## Component cha và quan hệ cha–con

| File cha | Component con trực tiếp | File sử dụng nó |
|---|---|---|
| ~~[components/ImagePagePhoto.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ImagePagePhoto.tsx)~~ | components/NoFlashGrid/components/ImageProgressBar.tsx | pages/ImagePage.tsx |
| ~~[components/CategoryNavigation.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/CategoryNavigation.tsx)~~ | CategoryNavigationContent (cùng file) | components/Header.tsx |
| [components/EditImageModal.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/EditImageModal.tsx) | components/EditImage/EditImageTabs.tsx<br>components/EditImage/ImageEditor.tsx<br>components/ui/TagInput.tsx<br>components/ui/button.tsx | pages/ImagePage.tsx |
| [components/FloatingContactButton.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/FloatingContactButton.tsx) | ContactInfoContent (cùng file)<br>TikTokIcon (cùng file) | Chưa thấy JSX từ file khác |
| [components/FollowButton.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/FollowButton.tsx) | components/ui/button.tsx | Chưa thấy JSX từ file khác |
| ~~[components/Header.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/Header.tsx)~~ | components/Avatar.tsx<br>components/CategoryNavigation.tsx<br>components/LanguageSwitcher.tsx<br>components/NotificationBell.tsx<br>components/SearchBar/SearchBar.tsx<br>components/SearchResultsNavigation.tsx<br>components/TextLogo.tsx<br>components/UploadModal.tsx<br>components/UserMenu.tsx<br>components/ui/button.tsx | App.tsx |
| ~~[components/ImagePageSidebar.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ImagePageSidebar.tsx)~~ | components/WebSocketStatus.tsx | App.tsx |
| ~~[components/NoFlashGrid/NoFlashGrid.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/NoFlashGrid/NoFlashGrid.tsx)~~ | components/NoFlashGrid/components/BlurUpImage.tsx | pages/FavoritesPage.tsx<br>pages/HomePage.tsx<br>pages/ImagePage.tsx<br>pages/SearchResultsPage.tsx<br>pages/collection/components/CollectionNoFlashGrid.tsx<br>pages/profile/ProfilePage.tsx<br>pages/profile/components/EditPinsModal.tsx |
| ~~[components/NoFlashGrid/components/ImageModalInfo.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/NoFlashGrid/components/ImageModalInfo.tsx)~~ | components/NoFlashGrid/components/ImageModalChart.tsx | pages/ImagePage.tsx |
| [components/PWAInstallPrompt.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/PWAInstallPrompt.tsx) | components/ui/button.tsx | App.tsx |
| [components/ReportButton.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ReportButton.tsx) | components/ui/button.tsx | pages/collection/components/CollectionHeader.tsx |
| ~~[components/SearchBar/SearchBar.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/SearchBar/SearchBar.tsx)~~ | components/SearchBar/SearchSuggestions.tsx<br>components/SearchFilters.tsx | components/Header.tsx |
| ~~[components/SearchBar/SearchSuggestions.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/SearchBar/SearchSuggestions.tsx)~~ | SuggestionButton (cùng file) | components/SearchBar/SearchBar.tsx |
| [components/UploadModal.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/UploadModal.tsx) | components/ui/button.tsx<br>components/upload/UploadForm.tsx<br>components/upload/UploadPreview.tsx<br>components/upload/UploadProgress.tsx | components/Header.tsx<br>pages/profile/ProfilePage.tsx |
| ~~[components/VisualArtFormsSlider.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/VisualArtFormsSlider.tsx)~~ | components/FixedSlideStage.tsx<br>components/SliderZoomImage.tsx | App.tsx<br>pages/HomePage.tsx |
| [components/admin/AdminEmptyState.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/admin/AdminEmptyState.tsx) | components/ui/button.tsx | pages/admin/components/tabs/AdminUsers.tsx |
| [components/auth/signin-form.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/auth/signin-form.tsx) | components/ui/button.tsx<br>components/ui/card.tsx<br>components/ui/input.tsx<br>components/ui/label.tsx | Chưa thấy JSX từ file khác |
| [components/auth/signup-form.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/auth/signup-form.tsx) | components/ui/button.tsx<br>components/ui/card.tsx<br>components/ui/input.tsx<br>components/ui/label.tsx | Chưa thấy JSX từ file khác |
| [components/collection/CollectionModal.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/collection/CollectionModal.tsx) | components/NoFlashGrid/components/BlurUpImage.tsx<br>components/ui/button.tsx | pages/CollectionsPage.tsx<br>pages/ImagePage.tsx |
| [components/collection/CollectionShare.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/collection/CollectionShare.tsx) | components/ui/button.tsx | pages/collection/components/CollectionHeader.tsx |
| [components/ui/PageLoader.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/PageLoader.tsx) | PageLoader (cùng file)<br>components/ui/LoadingSpinner.tsx | Chưa thấy JSX từ file khác |
| [components/ui/Swipeable.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/Swipeable.tsx) | components/ui/button.tsx | Chưa thấy JSX từ file khác |
| [components/ui/chart.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/chart.tsx) | ChartStyle (cùng file) | pages/admin/components/tabs/AdminAnalytics.tsx<br>pages/profile/components/UserAnalyticsDashboard.tsx |
| [components/ui/field.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/field.tsx) | components/ui/label.tsx<br>components/ui/separator.tsx | Chưa thấy JSX từ file khác |
| [components/ui/navigation-menu.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/navigation-menu.tsx) | NavigationMenuViewport (cùng file) | Chưa thấy JSX từ file khác |
| [components/ui/sheet.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/sheet.tsx) | SheetOverlay (cùng file)<br>SheetPortal (cùng file) | Chưa thấy JSX từ file khác |
| [components/upload/UploadForm.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/upload/UploadForm.tsx) | components/ui/input.tsx | components/UploadModal.tsx |
| [pages/admin/components/PermissionButton.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/PermissionButton.tsx) | components/ui/button.tsx<br>pages/admin/components/PermissionTooltip.tsx | pages/admin/components/tabs/AdminCategories.tsx<br>pages/admin/components/tabs/AdminImages.tsx<br>pages/admin/components/tabs/AdminUsers.tsx |
| [pages/admin/components/PermissionMatrix.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/PermissionMatrix.tsx) | pages/admin/components/PermissionBadge.tsx | pages/admin/AdminPage.tsx |
| [pages/admin/components/modals/ConfirmModal.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/modals/ConfirmModal.tsx) | components/ui/button.tsx | pages/CollectionsPage.tsx<br>pages/FavoritesPage.tsx<br>pages/admin/components/tabs/AdminCategories.tsx<br>pages/admin/components/tabs/AdminCollections.tsx<br>pages/admin/components/tabs/AdminFavorites.tsx<br>pages/admin/components/tabs/AdminImages.tsx<br>pages/admin/components/tabs/AdminRoles.tsx<br>pages/admin/components/tabs/AdminUsers.tsx<br>pages/collection/CollectionDetailPage.tsx<br>pages/collection/components/CollectionCollaborators.tsx<br>pages/profile/components/ActiveSessions.tsx |
| [pages/admin/components/modals/CreateCategoryModal.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/modals/CreateCategoryModal.tsx) | components/ui/button.tsx<br>components/ui/input.tsx | pages/admin/components/tabs/AdminCategories.tsx |
| [pages/admin/components/modals/CreateRoleModal.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/modals/CreateRoleModal.tsx) | components/ui/button.tsx<br>components/ui/input.tsx | pages/admin/components/tabs/AdminRoles.tsx |
| [pages/admin/components/modals/EditCategoryModal.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/modals/EditCategoryModal.tsx) | components/ui/button.tsx<br>components/ui/input.tsx | pages/admin/components/tabs/AdminCategories.tsx |
| [pages/admin/components/modals/EditRoleModal.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/modals/EditRoleModal.tsx) | components/ui/button.tsx<br>components/ui/input.tsx | pages/admin/components/tabs/AdminRoles.tsx |
| [pages/admin/components/modals/ModerationNotesModal.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/modals/ModerationNotesModal.tsx) | components/ui/button.tsx<br>components/ui/textarea.tsx | pages/admin/components/tabs/AdminImages.tsx<br>pages/admin/components/tabs/AdminModeration.tsx<br>pages/admin/components/tabs/AdminUsers.tsx |
| [pages/admin/components/modals/UserEditModal.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/modals/UserEditModal.tsx) | components/ui/button.tsx<br>components/ui/input.tsx | pages/admin/components/tabs/AdminUsers.tsx |
| [pages/admin/components/tabs/AdminAnalytics.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/tabs/AdminAnalytics.tsx) | components/ui/chart.tsx<br>pages/admin/components/tabs/AdminTrafficAnalytics.tsx<br>pages/admin/components/tabs/AdminWebSocketMetrics.tsx | pages/admin/AdminPage.tsx |
| [pages/admin/components/tabs/AdminCategories.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/tabs/AdminCategories.tsx) | pages/admin/components/PermissionButton.tsx<br>pages/admin/components/modals/ConfirmModal.tsx<br>pages/admin/components/modals/CreateCategoryModal.tsx<br>pages/admin/components/modals/EditCategoryModal.tsx | pages/admin/AdminPage.tsx |
| [pages/admin/components/tabs/AdminCollections.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/tabs/AdminCollections.tsx) | components/ui/button.tsx<br>components/ui/input.tsx<br>pages/admin/components/modals/ConfirmModal.tsx | pages/admin/AdminPage.tsx |
| [pages/admin/components/tabs/AdminDashboard.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/tabs/AdminDashboard.tsx) | DateCell (cùng file)<br>components/ui/button.tsx<br>components/ui/card.tsx<br>components/ui/skeleton.tsx | Chưa thấy JSX từ file khác |
| [pages/admin/components/tabs/AdminFavorites.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/tabs/AdminFavorites.tsx) | components/ui/button.tsx<br>pages/admin/components/modals/ConfirmModal.tsx | pages/admin/AdminPage.tsx |
| [pages/admin/components/tabs/AdminImages.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/tabs/AdminImages.tsx) | components/ui/button.tsx<br>components/ui/input.tsx<br>pages/admin/components/PermissionButton.tsx<br>pages/admin/components/modals/ConfirmModal.tsx<br>pages/admin/components/modals/ModerationNotesModal.tsx | pages/admin/AdminPage.tsx |
| [pages/admin/components/tabs/AdminLogs.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/tabs/AdminLogs.tsx) | components/ui/button.tsx | pages/admin/AdminPage.tsx |
| [pages/admin/components/tabs/AdminModeration.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/tabs/AdminModeration.tsx) | components/ui/button.tsx<br>pages/admin/components/modals/ModerationNotesModal.tsx | pages/admin/AdminPage.tsx |
| [pages/admin/components/tabs/AdminRoles.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/tabs/AdminRoles.tsx) | components/ui/button.tsx<br>pages/admin/components/modals/ConfirmModal.tsx<br>pages/admin/components/modals/CreateRoleModal.tsx<br>pages/admin/components/modals/EditRoleModal.tsx | pages/admin/AdminPage.tsx |
| [pages/admin/components/tabs/AdminSettings.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/tabs/AdminSettings.tsx) | components/ui/button.tsx<br>components/ui/card.tsx<br>components/ui/input.tsx<br>components/ui/label.tsx<br>components/ui/tabs.tsx<br>components/ui/textarea.tsx | pages/admin/AdminPage.tsx |
| [pages/admin/components/tabs/AdminUsers.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/tabs/AdminUsers.tsx) | components/admin/AdminBreadcrumbs.tsx<br>components/admin/AdminEmptyState.tsx<br>components/ui/button.tsx<br>components/ui/input.tsx<br>pages/admin/components/PermissionButton.tsx<br>pages/admin/components/modals/ConfirmModal.tsx<br>pages/admin/components/modals/ModerationNotesModal.tsx<br>pages/admin/components/modals/UserEditModal.tsx | pages/admin/AdminPage.tsx |
| [pages/admin/components/tabs/AdminWebSocketMetrics.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/tabs/AdminWebSocketMetrics.tsx) | components/ui/card.tsx<br>components/ui/skeleton.tsx | pages/admin/components/tabs/AdminAnalytics.tsx |
| [pages/auth/components/SignUpForm.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/auth/components/SignUpForm.tsx) | components/ui/button.tsx<br>components/ui/input.tsx<br>pages/auth/components/ValidationStatus.tsx | pages/SignUpPage.tsx |
| [pages/collection/components/CollectionCollaborators.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/collection/components/CollectionCollaborators.tsx) | pages/admin/components/modals/ConfirmModal.tsx | Chưa thấy JSX từ file khác |
| [pages/collection/components/CollectionHeader.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/collection/components/CollectionHeader.tsx) | components/ReportButton.tsx<br>components/collection/CollectionShare.tsx<br>components/ui/button.tsx | pages/collection/CollectionDetailPage.tsx |
| [pages/collection/components/CollectionImageGrid.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/collection/components/CollectionImageGrid.tsx) | components/NoFlashGrid/components/BlurUpImage.tsx<br>components/ui/button.tsx | Chưa thấy JSX từ file khác |
| [pages/collection/components/CollectionNoFlashGrid.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/collection/components/CollectionNoFlashGrid.tsx) | components/NoFlashGrid/NoFlashGrid.tsx<br>components/ui/button.tsx | pages/collection/CollectionDetailPage.tsx |
| [pages/profile/components/ActiveSessions.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/profile/components/ActiveSessions.tsx) | pages/admin/components/modals/ConfirmModal.tsx | pages/EditProfilePage.tsx |
| [pages/profile/components/EditPinsModal.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/profile/components/EditPinsModal.tsx) | components/NoFlashGrid/NoFlashGrid.tsx<br>components/ui/button.tsx | pages/profile/ProfilePage.tsx |
| [pages/profile/components/FollowingFollowers.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/profile/components/FollowingFollowers.tsx) | components/ui/skeleton.tsx | Chưa thấy JSX từ file khác |
| [pages/profile/components/PasswordForm.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/profile/components/PasswordForm.tsx) | components/ui/button.tsx<br>components/ui/input.tsx<br>components/ui/label.tsx | pages/EditProfilePage.tsx |
| [pages/profile/components/PinnedImages.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/profile/components/PinnedImages.tsx) | components/NoFlashGrid/components/BlurUpImage.tsx | Chưa thấy JSX từ file khác |
| [pages/profile/components/ProfileForm.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/profile/components/ProfileForm.tsx) | components/ui/button.tsx<br>components/ui/input.tsx<br>components/ui/label.tsx | pages/EditProfilePage.tsx |
| [pages/profile/components/ProfileHeader.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/profile/components/ProfileHeader.tsx) | components/Avatar.tsx<br>components/ui/button.tsx | pages/profile/ProfilePage.tsx |
| [pages/profile/components/UserAnalyticsDashboard.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/profile/components/UserAnalyticsDashboard.tsx) | components/ui/chart.tsx<br>components/ui/skeleton.tsx | pages/profile/ProfilePage.tsx |
| [pages/profile/components/UserList.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/profile/components/UserList.tsx) | components/ui/skeleton.tsx | pages/profile/ProfilePage.tsx |

## Component không render component con của dự án

| File | Nơi sử dụng trực tiếp |
|---|---|
| [components/ActiveFiltersIndicator.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ActiveFiltersIndicator.tsx) | pages/HomePage.tsx<br>pages/SearchResultsPage.tsx |
| ~~[components/Avatar.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/Avatar.tsx)~~ | components/Header.tsx<br>pages/profile/components/ProfileHeader.tsx |
| [components/ContactButton.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ContactButton.tsx) | App.tsx |
| [components/DownloadHistory.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/DownloadHistory.tsx) | pages/DownloadHistoryPage.tsx<br>pages/EditProfilePage.tsx |
| [components/EditImage/EditImageTabs.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/EditImage/EditImageTabs.tsx) | components/EditImageModal.tsx |
| [components/EditImage/ImageEditor.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/EditImage/ImageEditor.tsx) | components/EditImageModal.tsx |
| [components/ErrorBoundary.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ErrorBoundary.tsx) | main.tsx |
| [components/ErrorBoundarySection.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ErrorBoundarySection.tsx) | Chưa thấy JSX từ file khác |
| ~~[components/FixedSlideStage.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/FixedSlideStage.tsx)~~ | components/VisualArtFormsSlider.tsx |
| ~~[components/LanguageSwitcher.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/LanguageSwitcher.tsx)~~ | components/Header.tsx |
| [components/Logo.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/Logo.tsx) | Chưa thấy JSX từ file khác |
| ~~[components/NoFlashGrid/components/BlurUpImage.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/NoFlashGrid/components/BlurUpImage.tsx)~~ | components/NoFlashGrid/NoFlashGrid.tsx<br>components/collection/CollectionModal.tsx<br>pages/CollectionsPage.tsx<br>pages/FavoriteCollectionsPage.tsx<br>pages/collection/components/CollectionImageGrid.tsx<br>pages/profile/ProfilePage.tsx<br>pages/profile/components/PinnedImages.tsx |
| [components/NoFlashGrid/components/DownloadSizeSelector.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/NoFlashGrid/components/DownloadSizeSelector.tsx) | Chưa thấy JSX từ file khác |
| ~~[components/NoFlashGrid/components/ImageModalChart.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/NoFlashGrid/components/ImageModalChart.tsx)~~ | components/NoFlashGrid/components/ImageModalInfo.tsx |
| ~~[components/NoFlashGrid/components/ImageProgressBar.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/NoFlashGrid/components/ImageProgressBar.tsx)~~ | components/ImagePagePhoto.tsx |
| ~~[components/NotificationBell.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/NotificationBell.tsx)~~ | components/Header.tsx |
| [components/PageViewTracker.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/PageViewTracker.tsx) | App.tsx |
| ~~[components/SearchFilters.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/SearchFilters.tsx)~~ | components/SearchBar/SearchBar.tsx |
| [components/SearchResultsNavigation.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/SearchResultsNavigation.tsx) | components/Header.tsx |
| [components/SearchResultsTags.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/SearchResultsTags.tsx) | pages/SearchResultsPage.tsx |
| [components/Slider.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/Slider.tsx) | Chưa thấy JSX từ file khác |
| ~~[components/SliderZoomImage.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/SliderZoomImage.tsx)~~ | components/VisualArtFormsSlider.tsx |
| ~~[components/TextLogo.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/TextLogo.tsx)~~ | components/Header.tsx |
| ~~[components/UserMenu.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/UserMenu.tsx)~~ | components/Header.tsx |
| [components/VideoPlayer.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/VideoPlayer.tsx) | Chưa thấy JSX từ file khác |
| ~~[components/WebSocketStatus.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/WebSocketStatus.tsx)~~ | components/ImagePageSidebar.tsx |
| [components/admin/AdminBreadcrumbs.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/admin/AdminBreadcrumbs.tsx) | pages/admin/components/tabs/AdminUsers.tsx |
| [components/admin/QuickStatsWidget.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/admin/QuickStatsWidget.tsx) | Chưa thấy JSX từ file khác |
| [components/admin/ThemeToggle.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/admin/ThemeToggle.tsx) | Chưa thấy JSX từ file khác |
| [components/auth/AdminRoute.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/auth/AdminRoute.tsx) | App.tsx |
| [components/auth/AuthInitializer.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/auth/AuthInitializer.tsx) | main.tsx |
| [components/auth/ProtectedRoute.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/auth/ProtectedRoute.tsx) | App.tsx |
| [components/ui/GlobalLoadingOverlay.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/GlobalLoadingOverlay.tsx) | App.tsx |
| [components/ui/LoadingSpinner.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/LoadingSpinner.tsx) | components/ui/PageLoader.tsx |
| [components/ui/TagInput.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/TagInput.tsx) | components/EditImageModal.tsx |
| [components/ui/button.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/button.tsx) | components/EditImageModal.tsx<br>components/FollowButton.tsx<br>components/Header.tsx<br>components/PWAInstallPrompt.tsx<br>components/ReportButton.tsx<br>components/UploadModal.tsx<br>components/admin/AdminEmptyState.tsx<br>components/auth/signin-form.tsx<br>components/auth/signup-form.tsx<br>components/collection/CollectionModal.tsx<br>components/collection/CollectionShare.tsx<br>components/ui/Swipeable.tsx<br>pages/SignInPage.tsx<br>pages/UploadPage.tsx<br>pages/admin/components/PermissionButton.tsx<br>pages/admin/components/modals/ConfirmModal.tsx<br>pages/admin/components/modals/CreateCategoryModal.tsx<br>pages/admin/components/modals/CreateRoleModal.tsx<br>pages/admin/components/modals/EditCategoryModal.tsx<br>pages/admin/components/modals/EditRoleModal.tsx<br>pages/admin/components/modals/ModerationNotesModal.tsx<br>pages/admin/components/modals/UserEditModal.tsx<br>pages/admin/components/tabs/AdminCollections.tsx<br>pages/admin/components/tabs/AdminDashboard.tsx<br>pages/admin/components/tabs/AdminFavorites.tsx<br>pages/admin/components/tabs/AdminImages.tsx<br>pages/admin/components/tabs/AdminLogs.tsx<br>pages/admin/components/tabs/AdminModeration.tsx<br>pages/admin/components/tabs/AdminRoles.tsx<br>pages/admin/components/tabs/AdminSettings.tsx<br>pages/admin/components/tabs/AdminUsers.tsx<br>pages/auth/components/SignUpForm.tsx<br>pages/collection/CollectionDetailPage.tsx<br>pages/collection/components/CollectionHeader.tsx<br>pages/collection/components/CollectionImageGrid.tsx<br>pages/collection/components/CollectionNoFlashGrid.tsx<br>pages/profile/ProfilePage.tsx<br>pages/profile/components/EditPinsModal.tsx<br>pages/profile/components/PasswordForm.tsx<br>pages/profile/components/ProfileForm.tsx<br>pages/profile/components/ProfileHeader.tsx |
| [components/ui/card.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/card.tsx) | components/auth/signin-form.tsx<br>components/auth/signup-form.tsx<br>pages/admin/components/tabs/AdminDashboard.tsx<br>pages/admin/components/tabs/AdminSettings.tsx<br>pages/admin/components/tabs/AdminWebSocketMetrics.tsx |
| [components/ui/input.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/input.tsx) | components/auth/signin-form.tsx<br>components/auth/signup-form.tsx<br>components/upload/UploadForm.tsx<br>pages/SignInPage.tsx<br>pages/UploadPage.tsx<br>pages/admin/components/modals/CreateCategoryModal.tsx<br>pages/admin/components/modals/CreateRoleModal.tsx<br>pages/admin/components/modals/EditCategoryModal.tsx<br>pages/admin/components/modals/EditRoleModal.tsx<br>pages/admin/components/modals/UserEditModal.tsx<br>pages/admin/components/tabs/AdminCollections.tsx<br>pages/admin/components/tabs/AdminImages.tsx<br>pages/admin/components/tabs/AdminSettings.tsx<br>pages/admin/components/tabs/AdminUsers.tsx<br>pages/auth/components/SignUpForm.tsx<br>pages/profile/components/PasswordForm.tsx<br>pages/profile/components/ProfileForm.tsx |
| [components/ui/label.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/label.tsx) | components/auth/signin-form.tsx<br>components/auth/signup-form.tsx<br>components/ui/field.tsx<br>pages/UploadPage.tsx<br>pages/admin/components/tabs/AdminSettings.tsx<br>pages/profile/components/PasswordForm.tsx<br>pages/profile/components/ProfileForm.tsx |
| [components/ui/separator.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/separator.tsx) | components/ui/field.tsx |
| [components/ui/skeleton.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/skeleton.tsx) | pages/admin/AdminPage.tsx<br>pages/admin/components/tabs/AdminDashboard.tsx<br>pages/admin/components/tabs/AdminWebSocketMetrics.tsx<br>pages/profile/ProfilePage.tsx<br>pages/profile/components/FollowingFollowers.tsx<br>pages/profile/components/UserAnalyticsDashboard.tsx<br>pages/profile/components/UserList.tsx |
| [components/ui/spinner.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/spinner.tsx) | Chưa thấy JSX từ file khác |
| [components/ui/tabs.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/tabs.tsx) | pages/admin/components/tabs/AdminSettings.tsx |
| [components/ui/textarea.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/textarea.tsx) | pages/admin/components/modals/ModerationNotesModal.tsx<br>pages/admin/components/tabs/AdminSettings.tsx |
| [components/upload/UploadPreview.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/upload/UploadPreview.tsx) | components/UploadModal.tsx |
| [components/upload/UploadProgress.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/upload/UploadProgress.tsx) | components/UploadModal.tsx |
| [pages/admin/components/PermissionBadge.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/PermissionBadge.tsx) | pages/admin/components/PermissionMatrix.tsx |
| [pages/admin/components/PermissionTooltip.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/PermissionTooltip.tsx) | pages/admin/components/PermissionButton.tsx |
| [pages/admin/components/tabs/AdminTrafficAnalytics.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/tabs/AdminTrafficAnalytics.tsx) | pages/admin/components/tabs/AdminAnalytics.tsx |
| [pages/auth/components/ValidationStatus.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/auth/components/ValidationStatus.tsx) | pages/auth/components/SignUpForm.tsx |
| [pages/collection/components/CollectionBulkActions.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/collection/components/CollectionBulkActions.tsx) | pages/collection/CollectionDetailPage.tsx |
| [pages/profile/components/ProfileCompletion.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/profile/components/ProfileCompletion.tsx) | Chưa thấy JSX từ file khác |
| [pages/profile/components/ProfileTabs.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/profile/components/ProfileTabs.tsx) | pages/profile/ProfilePage.tsx |

## Toàn bộ component theo thư mục

### components — 31 file

| File | Component khai báo |
|---|---|
| ~~[components/ImagePagePhoto.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ImagePagePhoto.tsx)~~ | ImagePagePhoto |
| [components/ActiveFiltersIndicator.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ActiveFiltersIndicator.tsx) | ActiveFiltersIndicator |
| ~~[components/Avatar.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/Avatar.tsx)~~ | Avatar |
| ~~[components/CategoryNavigation.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/CategoryNavigation.tsx)~~ | CategoryNavigation, CategoryNavigationContent |
| [components/ContactButton.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ContactButton.tsx) | ContactButton |
| [components/DownloadHistory.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/DownloadHistory.tsx) | DownloadHistory |
| [components/EditImageModal.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/EditImageModal.tsx) | EditImageModal |
| [components/ErrorBoundary.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ErrorBoundary.tsx) | ErrorBoundary |
| [components/ErrorBoundarySection.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ErrorBoundarySection.tsx) | ErrorBoundarySection |
| ~~[components/FixedSlideStage.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/FixedSlideStage.tsx)~~ | FixedSlideStage |
| [components/FloatingContactButton.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/FloatingContactButton.tsx) | ContactInfoContent, FloatingContactButton, TikTokIcon |
| [components/FollowButton.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/FollowButton.tsx) | FollowButton |
| ~~[components/Header.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/Header.tsx)~~ | Header |
| ~~[components/ImagePageSidebar.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ImagePageSidebar.tsx)~~ | ImagePageSidebar |
| ~~[components/LanguageSwitcher.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/LanguageSwitcher.tsx)~~ | LanguageSwitcher |
| [components/Logo.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/Logo.tsx) | Logo |
| ~~[components/NotificationBell.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/NotificationBell.tsx)~~ | NotificationBell |
| [components/PWAInstallPrompt.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/PWAInstallPrompt.tsx) | PWAInstallPrompt |
| [components/PageViewTracker.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/PageViewTracker.tsx) | PageViewTracker |
| [components/ReportButton.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ReportButton.tsx) | ReportButton |
| ~~[components/SearchFilters.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/SearchFilters.tsx)~~ | SearchFiltersComponent |
| [components/SearchResultsNavigation.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/SearchResultsNavigation.tsx) | SearchResultsNavigation |
| [components/SearchResultsTags.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/SearchResultsTags.tsx) | SearchResultsTags |
| [components/Slider.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/Slider.tsx) | Slider |
| ~~[components/SliderZoomImage.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/SliderZoomImage.tsx)~~ | SliderZoomImage |
| ~~[components/TextLogo.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/TextLogo.tsx)~~ | TextLogo |
| [components/UploadModal.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/UploadModal.tsx) | UploadModal |
| ~~[components/UserMenu.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/UserMenu.tsx)~~ | UserMenu |
| [components/VideoPlayer.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/VideoPlayer.tsx) | VideoPlayer |
| ~~[components/VisualArtFormsSlider.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/VisualArtFormsSlider.tsx)~~ | VisualArtFormsSlider |
| ~~[components/WebSocketStatus.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/WebSocketStatus.tsx)~~ | WebSocketStatus |

### components/EditImage — 2 file

| File | Component khai báo |
|---|---|
| [components/EditImage/EditImageTabs.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/EditImage/EditImageTabs.tsx) | EditImageTabs |
| [components/EditImage/ImageEditor.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/EditImage/ImageEditor.tsx) | ImageEditor |

### components/NoFlashGrid — 1 file

| File | Component khai báo |
|---|---|
| ~~[components/NoFlashGrid/NoFlashGrid.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/NoFlashGrid/NoFlashGrid.tsx)~~ | NoFlashGrid |

### components/NoFlashGrid/components — 5 file

| File | Component khai báo |
|---|---|
| ~~[components/NoFlashGrid/components/BlurUpImage.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/NoFlashGrid/components/BlurUpImage.tsx)~~ | BlurUpImage |
| [components/NoFlashGrid/components/DownloadSizeSelector.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/NoFlashGrid/components/DownloadSizeSelector.tsx) | DownloadSizeSelector |
| ~~[components/NoFlashGrid/components/ImageModalChart.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/NoFlashGrid/components/ImageModalChart.tsx)~~ | ImageModalChart |
| ~~[components/NoFlashGrid/components/ImageModalInfo.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/NoFlashGrid/components/ImageModalInfo.tsx)~~ | ImageModalInfo |
| ~~[components/NoFlashGrid/components/ImageProgressBar.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/NoFlashGrid/components/ImageProgressBar.tsx)~~ | ImageProgressBar |

### components/SearchBar — 2 file

| File | Component khai báo |
|---|---|
| ~~[components/SearchBar/SearchBar.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/SearchBar/SearchBar.tsx)~~ | SearchBar |
| ~~[components/SearchBar/SearchSuggestions.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/SearchBar/SearchSuggestions.tsx)~~ | SearchSuggestions, SuggestionButton |

### components/admin — 4 file

| File | Component khai báo |
|---|---|
| [components/admin/AdminBreadcrumbs.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/admin/AdminBreadcrumbs.tsx) | AdminBreadcrumbs |
| [components/admin/AdminEmptyState.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/admin/AdminEmptyState.tsx) | AdminEmptyState |
| [components/admin/QuickStatsWidget.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/admin/QuickStatsWidget.tsx) | QuickStatsWidget |
| [components/admin/ThemeToggle.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/admin/ThemeToggle.tsx) | ThemeToggle |

### components/auth — 5 file

| File | Component khai báo |
|---|---|
| [components/auth/AdminRoute.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/auth/AdminRoute.tsx) | AdminRoute |
| [components/auth/AuthInitializer.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/auth/AuthInitializer.tsx) | AuthInitializer |
| [components/auth/ProtectedRoute.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/auth/ProtectedRoute.tsx) | ProtectedRoute |
| [components/auth/signin-form.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/auth/signin-form.tsx) | SigninForm |
| [components/auth/signup-form.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/auth/signup-form.tsx) | SignupForm |

### components/collection — 2 file

| File | Component khai báo |
|---|---|
| [components/collection/CollectionModal.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/collection/CollectionModal.tsx) | CollectionModal |
| [components/collection/CollectionShare.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/collection/CollectionShare.tsx) | CollectionShare |

### components/ui — 18 file

| File | Component khai báo |
|---|---|
| [components/ui/GlobalLoadingOverlay.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/GlobalLoadingOverlay.tsx) | GlobalLoadingOverlay |
| [components/ui/LoadingSpinner.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/LoadingSpinner.tsx) | LoadingSpinner |
| [components/ui/PageLoader.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/PageLoader.tsx) | DefaultPageLoader, PageLoader |
| [components/ui/Swipeable.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/Swipeable.tsx) | Swipeable |
| [components/ui/TagInput.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/TagInput.tsx) | TagInput |
| [components/ui/button.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/button.tsx) | Button, ButtonGroup |
| [components/ui/card.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/card.tsx) | Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle |
| [components/ui/chart.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/chart.tsx) | ChartContainer, ChartLegendContent, ChartStyle, ChartTooltipContent |
| [components/ui/field.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/field.tsx) | Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet, FieldTitle |
| [components/ui/input.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/input.tsx) | Input |
| [components/ui/label.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/label.tsx) | Label |
| [components/ui/navigation-menu.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/navigation-menu.tsx) | NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, NavigationMenuViewport |
| [components/ui/separator.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/separator.tsx) | Separator |
| [components/ui/sheet.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/sheet.tsx) | Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetOverlay, SheetPortal, SheetTitle, SheetTrigger |
| [components/ui/skeleton.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/skeleton.tsx) | Skeleton |
| [components/ui/spinner.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/spinner.tsx) | Spinner |
| [components/ui/tabs.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/tabs.tsx) | Tabs, TabsContent, TabsList, TabsTrigger |
| [components/ui/textarea.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/textarea.tsx) | Textarea |

### components/upload — 3 file

| File | Component khai báo |
|---|---|
| [components/upload/UploadForm.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/upload/UploadForm.tsx) | UploadForm |
| [components/upload/UploadPreview.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/upload/UploadPreview.tsx) | UploadPreview |
| [components/upload/UploadProgress.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/upload/UploadProgress.tsx) | UploadProgress |

### pages/admin/components — 4 file

| File | Component khai báo |
|---|---|
| [pages/admin/components/PermissionBadge.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/PermissionBadge.tsx) | PermissionBadge, RoleBadge |
| [pages/admin/components/PermissionButton.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/PermissionButton.tsx) | PermissionButton |
| [pages/admin/components/PermissionMatrix.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/PermissionMatrix.tsx) | PermissionMatrix |
| [pages/admin/components/PermissionTooltip.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/PermissionTooltip.tsx) | PermissionTooltip |

### pages/admin/components/modals — 7 file

| File | Component khai báo |
|---|---|
| [pages/admin/components/modals/ConfirmModal.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/modals/ConfirmModal.tsx) | ConfirmModal |
| [pages/admin/components/modals/CreateCategoryModal.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/modals/CreateCategoryModal.tsx) | CreateCategoryModal |
| [pages/admin/components/modals/CreateRoleModal.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/modals/CreateRoleModal.tsx) | CreateRoleModal |
| [pages/admin/components/modals/EditCategoryModal.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/modals/EditCategoryModal.tsx) | EditCategoryModal |
| [pages/admin/components/modals/EditRoleModal.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/modals/EditRoleModal.tsx) | EditRoleModal |
| [pages/admin/components/modals/ModerationNotesModal.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/modals/ModerationNotesModal.tsx) | ModerationNotesModal |
| [pages/admin/components/modals/UserEditModal.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/modals/UserEditModal.tsx) | UserEditModal |

### pages/admin/components/tabs — 13 file

| File | Component khai báo |
|---|---|
| [pages/admin/components/tabs/AdminAnalytics.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/tabs/AdminAnalytics.tsx) | AdminAnalytics |
| [pages/admin/components/tabs/AdminCategories.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/tabs/AdminCategories.tsx) | AdminCategories |
| [pages/admin/components/tabs/AdminCollections.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/tabs/AdminCollections.tsx) | AdminCollections |
| [pages/admin/components/tabs/AdminDashboard.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/tabs/AdminDashboard.tsx) | AdminDashboard, DateCell |
| [pages/admin/components/tabs/AdminFavorites.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/tabs/AdminFavorites.tsx) | AdminFavorites |
| [pages/admin/components/tabs/AdminImages.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/tabs/AdminImages.tsx) | AdminImages |
| [pages/admin/components/tabs/AdminLogs.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/tabs/AdminLogs.tsx) | AdminLogs |
| [pages/admin/components/tabs/AdminModeration.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/tabs/AdminModeration.tsx) | AdminModeration |
| [pages/admin/components/tabs/AdminRoles.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/tabs/AdminRoles.tsx) | AdminRoles |
| [pages/admin/components/tabs/AdminSettings.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/tabs/AdminSettings.tsx) | AdminSettings |
| [pages/admin/components/tabs/AdminTrafficAnalytics.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/tabs/AdminTrafficAnalytics.tsx) | AdminTrafficAnalytics |
| [pages/admin/components/tabs/AdminUsers.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/tabs/AdminUsers.tsx) | AdminUsers |
| [pages/admin/components/tabs/AdminWebSocketMetrics.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/tabs/AdminWebSocketMetrics.tsx) | AdminWebSocketMetrics |

### pages/auth/components — 2 file

| File | Component khai báo |
|---|---|
| [pages/auth/components/SignUpForm.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/auth/components/SignUpForm.tsx) | SignUpForm |
| [pages/auth/components/ValidationStatus.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/auth/components/ValidationStatus.tsx) | ValidationStatus |

### pages/collection/components — 5 file

| File | Component khai báo |
|---|---|
| [pages/collection/components/CollectionBulkActions.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/collection/components/CollectionBulkActions.tsx) | CollectionBulkActions |
| [pages/collection/components/CollectionCollaborators.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/collection/components/CollectionCollaborators.tsx) | CollectionCollaborators |
| [pages/collection/components/CollectionHeader.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/collection/components/CollectionHeader.tsx) | CollectionHeader |
| [pages/collection/components/CollectionImageGrid.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/collection/components/CollectionImageGrid.tsx) | CollectionImageGrid |
| [pages/collection/components/CollectionNoFlashGrid.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/collection/components/CollectionNoFlashGrid.tsx) | CollectionNoFlashGrid |

### pages/profile/components — 11 file

| File | Component khai báo |
|---|---|
| [pages/profile/components/ActiveSessions.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/profile/components/ActiveSessions.tsx) | ActiveSessions |
| [pages/profile/components/EditPinsModal.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/profile/components/EditPinsModal.tsx) | EditPinsModal |
| [pages/profile/components/FollowingFollowers.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/profile/components/FollowingFollowers.tsx) | FollowingFollowers |
| [pages/profile/components/PasswordForm.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/profile/components/PasswordForm.tsx) | PasswordForm |
| [pages/profile/components/PinnedImages.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/profile/components/PinnedImages.tsx) | PinnedImages |
| [pages/profile/components/ProfileCompletion.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/profile/components/ProfileCompletion.tsx) | ProfileCompletion |
| [pages/profile/components/ProfileForm.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/profile/components/ProfileForm.tsx) | ProfileForm |
| [pages/profile/components/ProfileHeader.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/profile/components/ProfileHeader.tsx) | ProfileHeader |
| [pages/profile/components/ProfileTabs.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/profile/components/ProfileTabs.tsx) | ProfileTabs |
| [pages/profile/components/UserAnalyticsDashboard.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/profile/components/UserAnalyticsDashboard.tsx) | UserAnalyticsDashboard |
| [pages/profile/components/UserList.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/profile/components/UserList.tsx) | UserList |

## Chưa thấy nơi render JSX trực tiếp

Cần rà soát trước khi giữ/gỡ; chưa xóa hoặc sửa các file này:

- [components/ErrorBoundarySection.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ErrorBoundarySection.tsx)
- [components/FloatingContactButton.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/FloatingContactButton.tsx)
- [components/FollowButton.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/FollowButton.tsx)
- [components/Logo.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/Logo.tsx)
- [components/NoFlashGrid/components/DownloadSizeSelector.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/NoFlashGrid/components/DownloadSizeSelector.tsx)
- [components/Slider.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/Slider.tsx)
- [components/VideoPlayer.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/VideoPlayer.tsx)
- [components/admin/QuickStatsWidget.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/admin/QuickStatsWidget.tsx)
- [components/admin/ThemeToggle.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/admin/ThemeToggle.tsx)
- [components/auth/signin-form.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/auth/signin-form.tsx)
- [components/auth/signup-form.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/auth/signup-form.tsx)
- [components/ui/PageLoader.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/PageLoader.tsx)
- [components/ui/Swipeable.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/Swipeable.tsx)
- [components/ui/field.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/field.tsx)
- [components/ui/navigation-menu.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/navigation-menu.tsx)
- [components/ui/sheet.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/sheet.tsx)
- [components/ui/spinner.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/ui/spinner.tsx)
- [pages/admin/components/tabs/AdminDashboard.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/admin/components/tabs/AdminDashboard.tsx)
- [pages/collection/components/CollectionCollaborators.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/collection/components/CollectionCollaborators.tsx)
- [pages/collection/components/CollectionImageGrid.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/collection/components/CollectionImageGrid.tsx)
- [pages/profile/components/FollowingFollowers.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/profile/components/FollowingFollowers.tsx)
- [pages/profile/components/PinnedImages.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/profile/components/PinnedImages.tsx)
- [pages/profile/components/ProfileCompletion.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/profile/components/ProfileCompletion.tsx)

## Khung ứng dụng, route helper, re-export

- [main.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/main.tsx) → App.tsx, components/ErrorBoundary.tsx, components/auth/AuthInitializer.tsx
- [App.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/App.tsx) → PageLoader (cùng file), components/ContactButton.tsx, components/Header.tsx, components/ImagePageSidebar.tsx, components/PWAInstallPrompt.tsx, components/PageViewTracker.tsx, components/VisualArtFormsSlider.tsx, components/auth/AdminRoute.tsx, components/auth/ProtectedRoute.tsx, components/ui/GlobalLoadingOverlay.tsx, pages/AboutPage.tsx, pages/CollectionsPage.tsx, pages/DownloadHistoryPage.tsx, pages/EditProfilePage.tsx, pages/FavoriteCollectionsPage.tsx, pages/FavoritesPage.tsx, pages/GoogleCallbackPage.tsx, pages/HomePage.tsx, pages/ImagePage.tsx, pages/SearchResultsPage.tsx, pages/SignInPage.tsx, pages/SignUpPage.tsx, pages/admin/AdminPage.tsx, pages/collection/CollectionDetailPage.tsx, pages/profile/ProfilePage.tsx, pages/profile/ProfileRedirect.tsx, pages/profile/ProfileRouteHandler.tsx
- [pages/profile/ProfileRedirect.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/profile/ProfileRedirect.tsx) → —
- [pages/profile/ProfileRouteHandler.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/pages/profile/ProfileRouteHandler.tsx) → pages/profile/ProfilePage.tsx
- [components/SearchBar.tsx](C:/Users/Fenn/Desktop/PhotoCloud/frontend/src/components/SearchBar.tsx) — re-export, không khai báo component mới

Slide căn giữa — 10/10/2026: người dùng báo ảnh lệch phải. Grid expanded đổi thành3cột với2rail caption cân bằng, stage/navigation cột giữa; maxwidth1600 để giữ đủ bề rộng ảnh desktop. Caption vẫn bên trái ngang stage, gap24px, không overlay ảnh. Đo769/1024/1366/1705: centerError≈0, controlsError≈0, caption top=stage top, không overflow. Nextslide/compact category/mobile390 pass; build pass cập nhật preview4174. Chỉ sửa VisualArtFormsSlider.css, giữ ImagePage và phần khác. Proof slide-centered.png trong thư mục visualization hiện tại. Trạng thái slide vẫn hoàn tất; thay thế bố cục2cột cũ gây lệch tâm.

- ~~ImagePage — bố cục mobile cùng Header (11/10/2026)~~: toolbar cuộn theo trang, nút không bị cắt/ngắt chữ, vùng chạm 44px; bỏ padding header trang chủ trong grid liên quan. Kiểm tra 320/390/768/769/1024px. Chỉ hoàn tất cụm này, ImagePage và các dialog con còn mục riêng.

- ~~ImagePage — ba nút biểu tượng cùng hàng trên mobile (11/10/2026)~~: Lưu/Bộ sưu tập/Tải xuống, giữ aria-label/title, vùng chạm 44px; desktop giữ chữ.

- ~~ImagePage — cleanup timer popup tác giả (11/10/2026)~~: hủy mở/đóng/fade khi quay lại, đổi ảnh hoặc unmount; giữ popup khi hover/focus bên trong. Bàn phím/touch của popup còn cần kiểm tra riêng.

- ~~ImagePage — popup tác giả: bàn phím, nút chạm và responsive (11/10/2026)~~: Tab/focus, Enter mở hồ sơ, nút Info mở/đóng popup, ảnh preview dùng Enter/Space; Escape đóng, chạm ngoài đóng. Popup kiểm tra 320/390x320/768/1024 không vượt viewport. Toàn ImagePage chưa xong; tiếp theo EditImageModal và component con.

- ~~ImagePage/ImageModalInfo — bảng thống kê gọn và vị trí mở (11/10/2026)~~: đặt vị trí trước khi hiện, không transition vị trí; mobile rộng tối đa 280px/chart80px; Share/Info chỉ biểu tượng44px. Kiểm tra320/390x320/768/1024.

- ~~ImagePage — thu gọn nút mobile theo mẫu (11/10/2026)~~: nút32x30px, Lưu/Collection trái và Download phải; Share/Info/Edit bên phải cùng hàng thống kê, stats xếp dọc. Dọn CSS grid/44px đã được thay thế; kiểm320/390 ngang/768/1024.

- ~~ImagePage — ảnh liên quan hai cột trên mobile (11/10/2026)~~: compactMobile riêng, hai cột so le theo tỷ lệ ảnh/khe6px, ẩn hàng tác giả/nút ở khu vực này. Giữ grid mặc định và desktop; kiểm320/440/768/1024 và click ảnh.

- ~~ImagePage — tăng khe ảnh liên quan mobile (11/10/2026)~~: đổi khe ngang/dọc từ 6px thành 12px theo phản hồi; phép tính chiều rộng cột và row span dùng chung gap nên tự cập nhật.

- ~~ImagePage — tăng độ rõ và bề rộng nút mobile (11/10/2026)~~: 40x32px thay32x30, viền#ccc/icon18px màu#555, bóng nhẹ; giữ hàng nút gọn.

- ~~EditImageModal — nhãn dịch và bố cục responsive (11/10/2026)~~: gọi imagePage.* đúng nhóm, Exif1cột mobile nhỏ/2cột tablet-desktop; tab2hàng dưới480, bảng giới hạn100dvh và cuộn nội dung; toolbar ImageEditor wrap. Kiểm320/390 ngang/768/1366. Chưa đánh dấu tối ưu toàn bộ ImageEditor/useEditImageForm hoặc focus/session/lưu.

- ~~EditImageModal — chiều cao ổn định/tab một hàng (11/10/2026)~~: cao640px giới hạn viewport, cả4tab chung hàng; nền xám chọn tab thay gạch chân; nội dung cuộn riêng. Mobile320 Details/Tags/Exif đều544px, desktop640px.

- ~~Editor desktop tận dụng chiều cao viewport; khóa wheel/touch/keyboard ngoài EditImageModal và chặn scroll chaining của các vùng cuộn trong editor.~~ Hoàn tất 11/10/2026; build và kiểm tra hook đạt. Mobile giữ giới hạn viewport hiện có.

- ~~Modal xem ảnh: chặn wheel/touch vùng nền và backdrop, chặn scroll chaining tại giới hạn nội dung; áp dụng desktop/mobile.~~ 11/10/2026, sửa riêng vùng cuộn nền của trang B.

- ~~Wheel ngoài modal xem ảnh chuyển vào vùng cuộn bên trong modal; trang nền vẫn khóa.~~ 11/10/2026, hỗ trợ delta pixel/line/page, giữ zoom và nested dialog.

- ~~Modal ảnh dùng một vùng cuộn native toàn chiều rộng gồm cả vùng xám; bỏ cộng scrollTop từ wheel để tránh giật.~~ 11/10/2026, giữ bề rộng mặt trắng và click ngoài đóng modal, mobile full width.

- ~~Modal xem ảnh hẹp hơn, bo hai góc trên12px khi cách mép16px; sát mép thì góc vuông, native scroll giữ nguyên.~~ 11/10/2026, QA CSS browser desktop1705/mobile390 không tràn, buildpass.

- ~~Ảnh chính mobile sát hai mép: bỏ padding ngang wrapper và gutter surface modal; thông tin/nút/related vẫn có đệm riêng.~~ 11/10/2026, scoped<=768 cho standalone và modal.

- ~~Ảnh grid đã cache giữ loadedSrc khi thẻ remount sau đổi danh mục; không chạy lại hiệu ứng placeholder cho URL đã tải.~~ 11/10/2026, ảnh mới vẫn lazy/preload như trước.

- ~~Grid trang chủ giữ danh sách hiện tại đến khi 12 ảnh ưu tiên danh mục mới được chuẩn bị; bỏ kết quả danh mục cũ khi chuyển nhanh.~~ 11/10/2026, fallback3s khi mạngchậm, navigation dùngdanh sáchđanghiện.

- ~~Grid trang chủ bỏ Motion layout transform và layer GPU ép buộc từng card; slide giữ nguyên.~~ 11/10/2026, QA trangthật Du lịch/Kiến trúc/Du lịch loaded6/pending0, buildpass. Chưa đo frame-by-frame nhấp nháy.

- ~~Khôi phục animation Tất cả↔danh mục; grid giữ DOM ba danh sách gần nhất để quay lại không remount ảnh.~~ 11/10/2026, supersede fb18062; browserdesktop/mobile+buildpass.
- ~~Slide Tất cả ↔ danh mục: đồng bộ layout khung/vùng ảnh/ảnh, giữ tỷ lệ ảnh khi thu/phóng; tween 450ms thay spring kéo đuôi.~~ 11/10/2026. QA fixture tỷ lệ ảnh 1.49988–1.50007 (gốc1.5), kết thúc ~429–450ms; trang thật chuyển ảnh/danh mục, desktop1440/1024 và mobile390. Desktop giữ scrollbar khi không khóa modal.
