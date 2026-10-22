# Rà và dọn tài nguyên — 22/10/2026

Phạm vi: user và artifact kiểm thử. Không sửa admin, dữ liệu, secret hoặc bản sao lưu.

## Đã xóa

Tổng: 69 file; 7924017 byte. Không khẳng định giảm bundle: SVG không được import và artifact QA không được website tải.

- 59 PNG: ảnh chụp kiểm thử trong thư mục bị Git ignore; không phải ảnh nội dung hoặc golden đang được đọc bởi script kiểm trong frontend/scripts.
- 7 SVG: không có tham chiếu tên file/đường dẫn trong source và script; không có cơ chế glob nạp asset được tìm thấy. Đã tra tham chiếu cả khu vực admin trước khi xóa.
- 3 CJS tạm do phiên này tạo: bản sao fixture và probe/đo tạm; script kiểm hồi quy chính trong frontend/scripts được giữ.

| File | Byte |
| --- | ---: |
| frontend/src/assets/camera.svg | 1057 |
| frontend/src/assets/close.svg | 286 |
| frontend/src/assets/date.svg | 337 |
| frontend/src/assets/left-arrow.svg | 262 |
| frontend/src/assets/right-arrow.svg | 263 |
| frontend/src/assets/social-icon/google-plus.svg | 1788 |
| frontend/src/assets/social-icon/pinterest.svg | 665 |
| frontend/qa-policy-checkbox/admin-preview.cjs | 8414 |
| frontend/qa-policy-checkbox/measure-collection-js.cjs | 1260 |
| frontend/qa-policy-checkbox/probe-image-browser.cjs | 13744 |
| frontend/qa-policy-checkbox/account-ready-admin.png | 77116 |
| frontend/qa-policy-checkbox/account-ready-expired.png | 139644 |
| frontend/qa-policy-checkbox/account-ready-member.png | 140418 |
| frontend/qa-policy-checkbox/account-startup-admin.png | 128793 |
| frontend/qa-policy-checkbox/account-startup-expired.png | 128793 |
| frontend/qa-policy-checkbox/account-startup-member.png | 125879 |
| frontend/qa-policy-checkbox/auth-recovery-503-manual.png | 128611 |
| frontend/qa-policy-checkbox/auth-recovery-admin-503.png | 13158 |
| frontend/qa-policy-checkbox/auth-recovery-network-online.png | 116299 |
| frontend/qa-policy-checkbox/auth-recovery-profile-429.png | 71586 |
| frontend/qa-policy-checkbox/auth-recovery-profile-malformed.png | 71389 |
| frontend/qa-policy-checkbox/auth-recovery-profile-retry.png | 71389 |
| frontend/qa-policy-checkbox/collection-detail-owner-dark.png | 150952 |
| frontend/qa-policy-checkbox/collection-detail-owner-light.png | 161711 |
| frontend/qa-policy-checkbox/collection-detail-refined-dark.png | 118618 |
| frontend/qa-policy-checkbox/collection-detail-refined-light.png | 131950 |
| frontend/qa-policy-checkbox/collection-detail-retry-dark.png | 165493 |
| frontend/qa-policy-checkbox/collection-detail-retry-light.png | 176789 |
| frontend/qa-policy-checkbox/collection-detail-viewer-dark.png | 144721 |
| frontend/qa-policy-checkbox/collection-detail-viewer-light.png | 155172 |
| frontend/qa-policy-checkbox/collection-error-refined-dark.png | 132403 |
| frontend/qa-policy-checkbox/collection-error-refined-light.png | 143605 |
| frontend/qa-policy-checkbox/collection-popover-dark.png | 46355 |
| frontend/qa-policy-checkbox/collection-popover-light.png | 48664 |
| frontend/qa-policy-checkbox/collection-public-guest-dark.png | 144264 |
| frontend/qa-policy-checkbox/collection-public-guest-light.png | 154924 |
| frontend/qa-policy-checkbox/collection-shell-dark.png | 200605 |
| frontend/qa-policy-checkbox/collection-shell-light.png | 225513 |
| frontend/qa-policy-checkbox/collection-visible-local.png | 667169 |
| frontend/qa-policy-checkbox/collections-dark.png | 226981 |
| frontend/qa-policy-checkbox/collections-light.png | 136572 |
| frontend/qa-policy-checkbox/collections-recovery-dark.png | 117824 |
| frontend/qa-policy-checkbox/collections-recovery-light.png | 130006 |
| frontend/qa-policy-checkbox/collections-viewer-dark.png | 160299 |
| frontend/qa-policy-checkbox/collections-viewer-light.png | 132190 |
| frontend/qa-policy-checkbox/detail-ready-dark.png | 128487 |
| frontend/qa-policy-checkbox/detail-ready-light.png | 139617 |
| frontend/qa-policy-checkbox/detail-startup-dark.png | 96522 |
| frontend/qa-policy-checkbox/detail-startup-light.png | 107270 |
| frontend/qa-policy-checkbox/header-ready-dark.png | 110245 |
| frontend/qa-policy-checkbox/header-ready-light.png | 146054 |
| frontend/qa-policy-checkbox/header-static-dark.png | 91690 |
| frontend/qa-policy-checkbox/header-static-light.png | 126103 |
| frontend/qa-policy-checkbox/image-cache-after.png | 724870 |
| frontend/qa-policy-checkbox/image-modal-dark.png | 36554 |
| frontend/qa-policy-checkbox/image-modal-light.png | 38030 |
| frontend/qa-policy-checkbox/image-page-dark.png | 30725 |
| frontend/qa-policy-checkbox/image-page-light.png | 31124 |
| frontend/qa-policy-checkbox/image-related-dark.png | 6149 |
| frontend/qa-policy-checkbox/image-related-light.png | 6088 |
| frontend/qa-policy-checkbox/public-startup-dark.png | 114289 |
| frontend/qa-policy-checkbox/public-startup-dev-before-js.png | 5974 |
| frontend/qa-policy-checkbox/public-startup-light.png | 127994 |
| frontend/qa-policy-checkbox/toolbar-after-dark-vi.png | 126298 |
| frontend/qa-policy-checkbox/toolbar-after-light-en.png | 136654 |
| frontend/qa-policy-checkbox/toolbar-after-light-vi.png | 137826 |
| frontend/qa-policy-checkbox/toolbar-before-dark-vi.png | 91690 |
| frontend/qa-policy-checkbox/toolbar-before-light-en.png | 123730 |
| frontend/qa-policy-checkbox/toolbar-before-light-vi.png | 126103 |

## Giữ lại và cần lưu ý

- Logo PNG/SVG, cờ Mỹ/Việt Nam, empty.avif, pin.svg và bốn icon mạng xã hội: có tham chiếu trong giao diện hoặc cấu hình.
- preview-assets/portrait.jpg, couple.jpg, family.jpg: StudioWorld dùng; editorial.jpg: script test-bookmark-panel-motion.cjs dùng.
- File trong assets/admin, font, node_modules, dist, backend và các ZIP/.local-backups: không dọn trong lượt này.
- Log TXT/JSON và script chẩn đoán cũ chưa xác định quyền sở hữu: giữ lại.
- Link /og-image.jpg trong frontend/index.html không khớp file public hiện có /og-image.svg. Đây là link cần rà tiếp; chưa sửa file entry chung trong lượt dọn.
- Không xóa script test-*.cjs chỉ vì không có import: chúng là công cụ kiểm hồi quy chạy trực tiếp.

## Kiểm tra

Build PASS. npx tsc -b exit 1: 25 diagnostic có trước. npm run lint exit 1: 65 error/220 warning có trước. Hồi quy Edge desktop 1440×900 sáng/tối PASS: Trang chủ/Collection/Back/F5; hình học header Trang chủ/Collection/Giới thiệu với guest và account fixture. Không phát sinh lỗi runtime trong các ca này. Responsive và production chưa kiểm; chưa commit. Log mới: frontend/qa-policy-checkbox/cleanup-*.txt (bị ignore).


## Vòng 2 — Rà sâu backend/frontend và thư mục gốc

Đã rà danh sách file tracked, entry/config/npm script, tên module trong các import/tham chiếu của source/script/tài liệu; grep tham chiếu trong admin để tránh xóa helper admin đang dùng. Không dùng việc thiếu import frontend làm bằng chứng xóa API backend.

Xóa thêm 43 file, 595657 byte.

Nhóm xóa: cụm frontend/src/preview độc lập không còn HTML entry hoặc route/import từ ứng dụng, cùng 3 ảnh chỉ cụm đó dùng; plugin CSS không đăng ký trong Vite; hook/config/service/utility không còn tham chiếu; hai helper backend và pool Sharp không còn được import; 8 file .txt chỉ mô tả tên thư mục. Không sửa nghiệp vụ, route hoặc API.

| File | Byte |
| --- | ---: |
| frontend/vite-plugin-non-blocking-css.ts | 1955 |
| backend/src/controllers/.txt | 49 |
| backend/src/libs/.txt | 44 |
| backend/src/middlewares/.txt | 60 |
| backend/src/models/.txt | 118 |
| backend/src/routes/.txt | 78 |
| frontend/src/services/.txt | 54 |
| frontend/src/stores/.txt | 55 |
| frontend/src/types/.txt | 56 |
| frontend/src/config/imageGridConfig.ts | 1522 |
| frontend/src/config/photocloudGridConfig.ts | 2056 |
| frontend/src/config/uploadConfig.ts | 525 |
| frontend/src/hooks/useErrorHandler.ts | 4242 |
| frontend/src/hooks/useMasonry.ts | 1819 |
| frontend/src/hooks/useVirtualScroll.ts | 2127 |
| frontend/src/hooks/userImageModalNavigation.ts | 6806 |
| frontend/src/services/collectionTemplateService.ts | 4112 |
| frontend/src/services/collectionVersionService.ts | 3245 |
| frontend/src/stores/useCollectionFavoriteStore.ts | 1782 |
| frontend/src/utils/applyAppearanceSettings.ts | 8704 |
| frontend/src/utils/colorContrast.ts | 6498 |
| frontend/src/utils/gridUtils.ts | 13566 |
| frontend/src/utils/imageFilters.ts | 2877 |
| frontend/src/utils/requestBatcher.ts | 2685 |
| frontend/src/utils/spiralAnimation.ts | 7295 |
| frontend/src/utils/tagTranslatorAPI.ts | 1197 |
| frontend/src/utils/testRefreshHandler.ts | 624 |
| frontend/src/utils/typeGuards.ts | 1228 |
| backend/src/middlewares/sanitizeMiddleware.js | 2307 |
| backend/src/utils/validators.js | 898 |
| backend/src/workers/sharpWorkerPool.js | 3344 |
| frontend/public/preview-assets/portrait.jpg | 129762 |
| frontend/public/preview-assets/couple.jpg | 101560 |
| frontend/public/preview-assets/family.jpg | 199167 |
| frontend/src/preview/CinematicPreview.css | 6766 |
| frontend/src/preview/RESEARCH.md | 2618 |
| frontend/src/preview/SpatialGallery.tsx | 6838 |
| frontend/src/preview/SpatialPreview.css | 6014 |
| frontend/src/preview/StudioPreview.css | 15349 |
| frontend/src/preview/StudioPreview.tsx | 21053 |
| frontend/src/preview/StudioWorld.tsx | 16515 |
| frontend/src/preview/TimedSlider.css | 6132 |
| frontend/src/preview/TimedSlider.tsx | 1955 |

Giữ permissionGroups.ts vì RoleEditor/AdminRoles import trực tiếp. Giữ checkAITaggingStatus.js vì có entry chạy trực tiếp để chẩn đoán. Giữ backend route/controller/model/migration đang nối từ server hoặc công cụ vận hành. Giữ TimedCardSlider/CardOpeningStage vì Trang chủ và test dùng. Giữ editorial.jpg vì script kiểm motion đọc file này. Quyết định giữ preview ảnh ở vòng 1 được thay thế bởi việc rà cả cụm prototype ở vòng 2.

Hai JSON probe ở gốc frontend vẫn được PRODUCT.md trỏ tới nên giữ làm bằng chứng. tools/extract_video_frames.* là công cụ thủ công, không kết luận thừa từ việc thiếu import. Root src và frontend/frontend không có file; không phải source thứ hai đang chạy. .agents/.cursor/.codex/.github/.impeccable là kỹ năng, quy tắc, môi trường, CI và tài liệu thiết kế; không xóa đồng loạt. Node_modules là dependency, dist là output; build sẽ tạo lại dist. shared/sitePalette.json dùng chung cho runtime/build.

ZIP và .local-backups giữ vì là bản sao lưu phục hồi, không phải tài nguyên web. File dockerignore ở gốc không tự động được Docker dùng như .dockerignore, nhưng chưa xóa/đổi vì chưa biết lệnh deploy ngoài repository. cloudfront-function-cors.js là mã triển khai ngoài app, không xóa vì thiếu import. Đây là audit tĩnh trong phạm vi cho phép, không phải xác nhận không còn bất kỳ file thừa nào.

### Vai trò các mục ở thư mục gốc trong ảnh người dùng

| Mục | Kết luận |
| --- | --- |
| backend/ | API Express, model, route, worker, cấu hình deploy; đã rà module ngoài admin và dọn helper không còn tham chiếu. Không xóa cả thư mục. |
| frontend/ | Ứng dụng React/Vite, public asset, công cụ test; đã dọn module mồ côi và prototype mất entry. |
| shared/ | sitePalette.json được frontend/build/backend dùng chung; giữ. |
| src/ | Chỉ còn thư mục components rỗng, không có file; không phải source của app. |
| tools/ | Hai công cụ trích frame video chạy thủ công, không tham gia bundle; giữ. |
| .agents/, .cursor/, .codex/ | Skill/quy tắc làm việc/môi trường; giữ để không mất cấu hình agent. |
| .github/ | Workflow CI/deploy; giữ. |
| .impeccable/ | Ngữ cảnh thiết kế và báo cáo kiểm; giữ, không chạm nội dung admin. |
| .local-backups/ | Có JSON sao lưu chuẩn hóa category; giữ dữ liệu phục hồi. |
| node_modules/ | Dependency root cho các npm script; không xóa để giữ môi trường chạy. |
| package.json, package-lock.json | Dependency và npm scripts; giữ. Backend/frontend có dependency riêng là cấu trúc hiện tại, không phải mặc định bị nhân bản thừa. |
| PhotoCloud-*.zip | Năm bản sao lưu, tổng 386.790 byte; không được app tải, giữ phục hồi. |
| AGENTS.md, PRODUCT.md, inventory, checklist và tài liệu *.md | Hướng dẫn/nghiệm thu/ngữ cảnh vận hành; không xóa chỉ vì không được code import. |
| test-image-author-timers.cjs | Script kiểm hồi quy chạy thủ công; giữ. |
| cloudfront-function-cors.js | Mã cấu hình CloudFront ngoài ứng dụng; giữ. |
| dockerignore | Tên khác .dockerignore chuẩn; chưa có bằng chứng lệnh ngoài repo không dùng, giữ và đánh dấu cần xác minh deploy. |

### Kết quả kiểm sau vòng 2

- Build frontend PASS.
- npx tsc -b: cùng 25 diagnostic cũ; không có diagnostic mới sau xóa.
- ESLint: 60 error/174 warning, trước vòng này 65 error/220 warning. Giảm do bỏ mã không dùng, không phải sửa hết lỗi ứng dụng.
- Backend: kiểm cú pháp/tham chiếu tương đối 142 file JS ngoài admin; không có module tương đối bị thiếu. Một lỗi cú pháp colorExtractorAdvanced.js khai báo trùng b đã được đối chiếu có sẵn trong HEAD; chưa sửa logic xử lý ảnh. Không khởi động backend hoặc chạy migration chạm database thật.
- Edge desktop 1440×900 sáng/tối PASS: collection không tải route khác; Trang chủ/Back/F5; header Trang chủ/Collection/Giới thiệu guest/account. Không console pageerror trong các ca này.
- Giữ dấu nghiệm thu và responsive; chưa commit.
- Cộng hai lượt: 112 file đã xóa, 8.519.674 byte. Ảnh QA/không được dùng không đi vào payload website; không tuyên bố website nhanh hơn vì dọn source.

## Sửa lỗi cú pháp backend đã phát hiện — 22/10/2026

Theo yêu cầu người dùng, đã sửa backend/src/utils/colorExtractorAdvanced.js: tham số b (RGB blue) bị trùng với const b của LAB. Đổi tên biến cục bộ thành labB và giữ output { L, a, b: labB }, không đổi công thức/ngưỡng màu. Lỗi cũ làm dynamic import của nhánh nâng cao thất bại và extractDominantColors chuyển sang cách đơn giản; nay module import được.

Phạm vi: utility xử lý màu backend dùng chung và script kiểm; không sửa controller admin hoặc chạy database. Node --test backend/scripts/test-color-extraction.test.js PASS 4 test: màu đơn đỏ/xanh lá/xanh dương/trắng ở fast/accurate, ảnh hai màu, entry advanced/simple và ảnh đen rỗng. Fixture ảnh chỉ tạo trong bộ nhớ bằng Sharp. node --check PASS toàn bộ 135 file source JS backend ngoài admin. git diff --check PASS. Chưa chạy upload thật hoặc xử lý lại màu ảnh trong database; không chạy lại frontend build/lint/typecheck vì không thay frontend. Chưa commit.

## Vòng 3 — Các mục người dùng khoanh ở thư mục gốc — 22/10/2026

Quyết định này thay thế các quyết định giữ tạm ở vòng trước, sau khi người dùng yêu cầu kiểm tra hết và xác nhận website không cần công cụ trích ảnh video.

- Xóa tools/extract_video_frames.js và tools/extract_video_frames.ps1: script dùng một lần, hardcode video trên máy Fenn và thư mục video_frames; không được source/npm/CI gọi. Xóa tools sau khi kiểm tra đã rỗng, không xóa đệ quy.
- Xóa 5 PhotoCloud-*.zip: kiểm danh sách entry, là snapshot source cũ; PRODUCT.md xác nhận các giai đoạn cũ không được tự phục hồi. Các file đều đã tracked trong HEAD, có thể lấy lại từ lịch sử Git. Không xóa JSON sao lưu category trong .local-backups.
- Xóa dockerignore ở gốc: không phải tên .dockerignore chuẩn và không có cấu hình/script trong repo gọi. Cấu hình Fly trỏ Dockerfile backend; backend/.dockerignore thật được giữ. Không thay cấu hình deploy ngoài repo.
- Chuyển cloudfront-function-cors.js → deployment/cloudfront/cors-function.js và thêm README vai trò/giới hạn. Đối chiếu HEAD sau chuẩn hóa CRLF: nội dung không đổi. Không có code/npm/workflow gọi file; giữ bản source triển khai thủ công, không tuyên bố đã xác minh CloudFront AWS đang dùng bản này. Không kết nối/publish AWS.
- Chuyển test-image-author-timers.cjs → frontend/scripts/test-image-author-timers.cjs. Trước sửa test FAIL vì đọc ImagePage.tsx sau khi code đã tách hook. Sửa đường dẫn sang useImagePageController.ts dựa trên __dirname; chạy từ root và frontend đều PASS. Không sửa mã runtime.
- Xóa hai thư mục src/components và src ở gốc sau khi xác minh rỗng; không đụng thư mục admin lồng bên trong frontend/frontend.

Kiểm: timer regression PASS, ImagePage lifecycle regression PASS, focused ESLint PASS, node --check CloudFront PASS, nội dung CloudFront khớp HEAD sau chuẩn hóa line ending. Không chạy lại toàn bộ build/typecheck vì chỉ dọn snapshot/tool ngoài runtime và di chuyển script test; build/typecheck ứng dụng không thay đổi so với lượt trước. Chưa commit.
