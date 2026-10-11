# PhotoCloud — bàn giao ngày 10/10/2026

## Đọc trước khi tiếp tục

Workspace: `C:\Users\Fenn\Desktop\PhotoCloud`. Người dùng đã chốt giao diện slide hiện tại và báo “tạm thời ổn”. Không thiết kế lại slide, không phục hồi các phương án cũ. Yêu cầu gần nhất là kiểm tra bước tiếp theo và lưu context để mở chat mới.

Mục tiêu toàn dự án: thu gọn code, bỏ dư/lặp, giảm render/request không cần thiết, cải thiện độ mượt và responsive. Làm từng component/đơn vị: rà soát → sửa → build → kiểm thử localhost → dừng để người dùng kiểm tra. Kiểm tra git diff trước khi sửa và bảo toàn thay đổi hiện có. Người dùng cho phép commit phần đã xác nhận nếu họ quên commit; không chuyển nhánh, push, deploy, sửa dữ liệu production hoặc đọc/in bí mật .env. Backend dùng MongoDB Atlas/R2 nên localhost không đồng nghĩa dữ liệu disposable: không tạo/sửa dữ liệu backend để test nếu chưa được yêu cầu.

## Trạng thái Git và môi trường

HEAD mới nhất khi kết thúc bàn giao: `58359d1 Fix slide` (xuất hiện trong lúc lập context, không do trợ lý thực hiện). Commit này đã lưu toàn bộ thay đổi slide/category/store và cả 4 ZIP cũ. Trước đó `81e560a Use display-sized slider images and avoid hidden preloads`, `0284fa6 Simplify homepage slider loading transitions and zoom`. Header/Sidebar đã hoàn thành trong các commit `23c0066`, `09fbbac`, `b82d302`.

Thay đổi code phiên này đã được commit trong `58359d1`. Chỉ context và ZIP bàn giao mới đang chưa tracked. Luôn kiểm tra lại `git status`, `git diff`, `git log` vì trạng thái có thể thay đổi sau bàn giao. Không reset/checkout để làm sạch. Có cả file mới chưa tracked; `git diff` không thể hiện chúng.

PowerShell; Node/npm tại `C:\Program Files\nodejs`. Frontend `http://localhost:5173/`, backend cổng 3000. Chạy từ gốc `npm run dev` nếu chưa có server; tránh chạy Vite trùng cổng/IPv4–IPv6.

Lệnh build: `$env:PATH='C:\Program Files\nodejs;'+$env:PATH; npm run build --prefix frontend`. Build Vite chỉ bundle, KHÔNG thay thế kiểm tra TypeScript. Trong sandbox, Vite từng bị EPERM và cần quyền chạy ngoài sandbox. Lint các file vừa sửa bằng ESLint trong frontend. `frontend/package-lock.json` đang bị gitignore nhưng đã cập nhật dependencies; lưu ý khi commit/tái cài đặt.

## Giao diện slide cuối cùng — đã chốt

- Một ảnh lớn, kích thước khung ổn định, chuyển ảnh crossfade. Giữ `object-fit: contain`, thấy đủ ảnh ngang/dọc/vuông; khoảng trắng hai bên là lựa chọn đã chấp nhận. KHÔNG đổi sang cover.
- Bỏ các phương án địa cầu, phóng to/thu nhỏ ba ảnh, thumbnail, màn che và các nút chọn phương án. Swiper đã gỡ; dùng custom gallery + Motion cho animation bố cục. Không thêm lại globe hoặc các toggle thử nghiệm.
- Caption tên category + tác giả nằm góc trái, ngang với lề trên của ảnh, không nằm thành hàng riêng phía trên.
- Navigation dưới ảnh, chính giữa: số hiện tại/tổng ở trên; chevron `< >` ở hai bên dynamic dots. Active dot đen; tối đa 5 dot hiển thị, thu nhỏ dot xa. Font số Manrope Variable cài local qua `@fontsource-variable/manrope`.
- Khung ảnh đã tăng vừa đủ để lưới ảnh bên dưới khuất khỏi màn hình đầu khi ở đầu trang. Slider ẩn <=768px.
- Click category: slide thu về góc trên trái, bên phải là phần giới thiệu category (tiêu đề, mô tả, số ảnh); lưới ở dưới. Category → category giữ compact; về Tất cả mới mở rộng. Không tự scroll xuống grid. Reload trên route category vẫn khởi đầu slide lớn như người dùng yêu cầu. Ảnh slide độc lập với filter category, không tự đổi ảnh khi chọn category.
- Chuyển slide giữ ảnh trước nằm dưới ảnh mới trong lúc fade để tránh chớp nền sáng. Các ảnh preview slide được giữ mounted. Có điều hướng bàn phím, swipe và reduced-motion.

## Zoom/loading mới nhất — người dùng đã báo ổn

Click slide mở dialog portal vào document.body, nền tối, ảnh contain. Nút đóng, click ảnh để đóng, Escape, focus trap Tab/Shift+Tab, trả focus bằng preventScroll, khóa cuộn body; xuống mobile đóng zoom. Input/dialog không kích hoạt phím đổi slide.

`SliderZoomImage.tsx` mới: tải ảnh gốc (`fullImage || image`) nhưng giữ preview trong lúc chờ; thanh vàng mảnh indeterminate 3px ở mép trên overlay. Chỉ tắt khi ảnh tải và decode xong; không giả lập phần trăm. Ảnh cache được xử lý qua complete/naturalWidth. Load/error listener cleanup và cờ disposed ngăn cập nhật sau unmount. Lỗi tải gốc giữ preview, tắt thanh và báo nhẹ. Không preload ảnh gốc hàng loạt.

## Các file hiện tại cần bảo toàn

Các file code đã sửa và được commit:
- `frontend/package.json`
- `frontend/src/components/CategoryNavigation.tsx`
- `frontend/src/components/NoFlashGrid/NoFlashGrid.tsx`
- `frontend/src/components/VisualArtFormsSlider.tsx` và `.css`
- `frontend/src/hooks/useImageGridCategory.ts`
- `frontend/src/pages/HomePage.tsx`
- `frontend/src/stores/helpers/imageStoreHelpers.ts`
- `frontend/src/stores/useImageStore.ts`
- `frontend/src/stores/useSliderStore.ts`

Các file mới đã được commit:
- `frontend/src/components/FixedSlideStage.tsx`: các layer fade ổn định, swipe/click zoom.
- `frontend/src/components/SliderZoomImage.tsx`: preview + original + loading/error.
- `frontend/src/pages/HomePageLayouts.css`: compact slide + category intro.
- `frontend/src/utils/categoryNavigationEvent.ts`: liên kết click category với trạng thái layout.
- `frontend/src/utils/sliderLayoutTransition.ts`: spring dùng chung.
- `frontend/scripts/test-image-store.cjs`: regression test store với mock services, không ghi backend.

Luồng category/store và NoFlashGrid đã có thay đổi trong phiên này (chống response cũ, giải quyết slug trước khi fetch category, giảm preload/đo kích thước). Cần đọc implementation và test hiện có trước khi làm thêm; không coi chúng là code nguyên bản chưa sửa.

## Kiểm tra đã thực hiện và giới hạn

- Build Vite pass sau thay đổi mới nhất; còn cảnh báo circular chunks/chunk lớn sẵn có.
- ESLint `VisualArtFormsSlider.tsx`, `SliderZoomImage.tsx` pass.
- Localhost: đã thấy original chưa tải → bar có, original hidden; sau tải → bar mất, original visible. Đã kiểm tra chuyển slide, zoom/đóng, bố cục category/navigation trong quá trình tinh chỉnh.
- Test Node tạm thời chạy code TSX thật với hook/image mocks: giữ loading qua decode, success, error, cache, unmount khi đang tải đều pass. Script này chạy inline, không được lưu thành file test trong repo.
- `test-image-store.cjs` đã pass ở các bước trước; nên chạy lại khi sửa store.
- Chưa xác nhận toàn bộ lint/type-check dự án pass; đã có lỗi TS ngoài phạm vi trước đây. Không diễn giải Vite build pass thành TypeScript pass.
- Chưa mô phỏng mạng chậm/lỗi hoàn chỉnh bằng browser throttling; lỗi/unmount đã kiểm tra bằng mock. Không sửa dữ liệu backend để test.

## Bước tiếp theo đề xuất

1. Đối chiếu status/diff với bàn giao; lưu checkpoint/commit phần đã được xác nhận nếu phù hợp. Không đưa ZIP thử nghiệm vào commit code.
2. Đơn vị tiếp theo theo thứ tự: **thẻ ảnh `frontend/src/components/NoFlashGrid/components/BlurUpImage.tsx` và CSS của nó**. NoFlashGrid/HomePage/store đã được chỉnh trong phiên này, không bắt đầu lại toàn bộ lưới. BlurUpImage chưa được sửa trong commit 58359d1. Đọc các helper/hook mà thẻ dùng trước khi sửa.
3. Rà soát thẻ: kiểm tra cache hiện tạo new Image() ngay trong render; request/preload trùng, chọn URL AVIF, lazy loading/IntersectionObserver, cleanup khi đổi ảnh hoặc unmount, subscription auth/user/favorite/download, callback và giao diện desktop/mobile. Bảo toàn thích/lưu/tải/click ảnh. Chỉ sửa vấn đề đã xác minh. Infinite-scroll là bước sau; không refactor toàn dự án.
4. Chạy regression store nếu chạm data, lint file sửa, build, kiểm tra dev desktop/mobile và đổi category nhanh; dừng để người dùng kiểm tra sau đơn vị này.

Thứ tự phần còn lại: thẻ ảnh BlurUpImage → tải thêm/cuộn → modal/chi tiết ảnh → tìm kiếm → đăng nhập/đăng ký/upload → hồ sơ → yêu thích/lịch sử/bộ sưu tập → giới thiệu → admin → màn hình/file chưa dùng. Header/Sidebar đã hoàn thành, không làm lại trừ khi có lỗi cụ thể.

## Sao lưu và bằng chứng

`PhotoCloud-handoff-2026-10-10.zip` là snapshot các file thay đổi và context tại lần bàn giao này (không có .env, node_modules, dữ liệu backend). Đây không phải toàn bộ repo; cần checkout hiện tại để dùng snapshot.

Các ZIP `PhotoCloud-session-recovery.zip`, `PhotoCloud-travel-slider-backup.zip`, `PhotoCloud-globe-slider-backup.zip`, `PhotoCloud-four-slider-modes-backup.zip` đều là các giai đoạn CŨ; KHÔNG tự phục hồi chúng.

Screenshot mới nhất ở `C:\Users\Fenn\.codex\visualizations\2026\10\09\01a1207e-8dc0-7fe2-bbd8-ed8a603ada38\slide-zoom-loading-complete.png` (tên file có complete nhưng chụp lúc ảnh đang tải). Các proof giao diện khác cùng thư mục: `gallery-manrope-navigation.png`, `photocloud-final-category-intro.png`.

## Prompt để mở chat mới

Tiếp tục PhotoCloud tại C:\Users\Fenn\Desktop\PhotoCloud. Đọc PHOTOCloud-HANDOFF.md, kiểm tra git status/diff/log trước khi sửa. Giữ nguyên slide đã chốt, không phục hồi các mẫu thử cũ. Tiếp theo rà soát và tối ưu thẻ ảnh frontend/src/components/NoFlashGrid/components/BlurUpImage.tsx và CSS liên quan; NoFlashGrid/HomePage/category/store đã được chỉnh, không làm lại toàn bộ lưới. Build, lint phần sửa, kiểm thử localhost rồi dừng để tôi kiểm tra. Không reset, chuyển nhánh, push, deploy, đọc .env hoặc sửa dữ liệu backend để test.



## Cập nhật tiến độ sau bàn giao — 10/10/2026

Người dùng yêu cầu từ nay mỗi lần hoàn tất phải gạch ngang tên component/trang trong `PHOTOCloud-INVENTORY.md`. File này là danh sách tiến độ hiện tại; xem mục Tiến độ tối ưu trước khi chọn phần mới. Chỉ gạch ngang phần đã xong, không tự gạch toàn bộ con theo cha, không gạch cả trang vì mới sửa một phần. Luôn kiểm tra responsive desktop/mobile/tablet và hai phía breakpoint của đơn vị đang làm để tránh phải quay lại.

BlurUpImage đã được tối ưu cùng hook useBatchedFavoriteCheck/useIsMobile và bổ sung hiệu ứng chờ mở ảnh, khóa click lặp. Người dùng đã báo “ok rồi”. Build/lint phần sửa, test mock và localhost desktop/mobile pass. Các thay đổi này vẫn chưa commit; kiểm tra lại Git trước thao tác mới. Có thêm scripts/test-blur-up-image.cjs và scripts/test-image-card-hooks.cjs trong frontend. Không phục hồi slide/header đã chốt.

Bước tiếp theo đã rà soát nhưng CHƯA triển khai: NoFlashGrid/useInfiniteScroll — tải thêm/cuộn vô hạn và responsive lưới. Vấn đề xác minh trong source: các timer không được hủy khi cleanup; khóa loading bị reset mỗi lần effect đổi dependency; breakpoint tại đúng 768px chọn 2 cột nhưng card/CSS ở mobile; phép đo container trừ cố định 32px trong khi padding mobile = 0. Giữ phần category/store đã sửa, chỉ chạm điểm tích hợp cần thiết. Ma trận responsive và phạm vi cụ thể nằm trong inventory. NoFlashGrid và HomePage chưa được đánh dấu hoàn tất toàn bộ.

## Hoàn tất đơn vị NoFlashGrid — 10/10/2026

Đã thực hiện theo yêu cầu “ok làm đi”: useInfiniteScroll hủy timer khi cleanup, giữ khóa request qua loading/callback changes, guard theo snapshot images/page tránh retry loop khi lỗi hoặc không tiến triển, re-observe sau completion để tiếp tục khi sentinel còn trong vùng nhìn. Completion sau unmount không cập nhật state. Retry bằng cách cuộn sentinel ra/vào vùng quan sát. Không thay đổi API/store/category; snapshot array phân biệt query mới kể cả IDs giống nhau.

Responsive: getColumnCount dùng <=768px thống nhất hook/card/CSS; đo chiều rộng grid thật với ResizeObserver + resize listener, bỏ trừ padding cố định/clamp 300px. Giữ masonry, slide/header và CSS hiện có. ImageDimensions đọc cache từ ref để không restart effect mỗi batch, bỏ any ở isPinned. Không thêm preload hàng loạt.

Kiểm tra: scripts/test-infinite-scroll.cjs pass (events trùng, callback/loading changes, progress, filter cancellation, exhausted pagination, lỗi/retry, unmount đang tải); các regression store/BlurUp/hooks trước đó pass. ESLint 3 file sửa không warning/error; Vite build cuối pass, còn warnings circular chunks/chunk size sẵn có. TypeScript toàn dự án còn lỗi ngoài phạm vi; không có lỗi ở 3 file sửa. Fixture HTML/TSX tạm đã xóa.

Localhost: fixture dùng NoFlashGrid thật với request chờ resolve; page1→2→3, chỉ 2 request, dừng cuối; desktop/mobile ảnh ngang/dọc/vuông, tác giả/nút hiển thị. Trang thật kiểm tra 360/390/767/768/769/1024/1279/1280/1366px, số cột đúng, không tràn ngang, resize desktop↔mobile; đổi Chân dung→Du lịch nhanh kết quả cuối Du lịch 6 ảnh; cuộn nhanh Tất cả tải 20→40 ảnh, không duplicate, loading tắt. Lỗi mạng/cleanup test bằng mock, không browser throttling. Không ghi dữ liệu backend.

Inventory đã gạch NoFlashGrid, tổng 17 component hoàn tất phạm vi, chưa có trang nào hoàn tất toàn bộ. Các thay đổi chưa commit, đang chờ người dùng kiểm tra đơn vị này. Đơn vị tiếp theo: modal/chi tiết ảnh; không tự chuyển sang trước khi người dùng kiểm tra.

Proof desktop: C:/Users/Fenn/.codex/visualizations/2026/10/09/01a12274-f462-73c0-972c-29e2225ff141/no-flash-grid-desktop.png. Proof mobile cùng thư mục no-flash-grid-mobile.png.
Reset filter trên trang localhost tải mới: áp dụng Dọc có ảnh, nút Xóa tất cả đưa badge/chip về mặc định; không có console error. Mobile sau reset 1 cột, không tràn ngang.

## Hotfix production khởi tạo bundle — 10/10/2026

Người dùng báo uploadanh.cloud spinner vô hạn; screenshot console ReferenceError Cannot access 'U' before initialization tại vendor-forms-BRNOgEqU.js:1:1939. Tái hiện đúng lỗi trong build local cũ bằng vite preview port4174 (vendor-forms-DBXidNqG.js cùng offset). Nguyên nhân xác nhận: manualChunks chia vendor thành graph vòng (router/misc/forms/socket). Build pass và dev pass không chứng minh production startup pass; circular chunks trước đây thực sự gây crash.

Sửa frontend/vite.config.ts: bỏ manualChunks để Rollup chia theo graph/dynamic imports tự động; bỏ việc suppress CIRCULAR_DEPENDENCY warnings. Build pass, không còn circular chunk warnings. Entry mới index-Dm7EC6pn.js 811.66KB (gzip256.91KB), form/chart vẫn chunk lazy; còn cảnh báo chunk size lớn, chưa tối ưu tiếp để không tái tạo lỗi thứ tự khởi tạo. ESLint config file không thuộc cấu hình lint hiện tại (ignored), không tuyên bố lint config pass. git diff --check pass.

Production preview fresh tab khởi động UI, không ReferenceError; trang signin lazy form hiển thị cả desktop/mobile390px, console errors trống. Preview local API dữ liệu không kiểm tra đầy đủ, không ghi backend hoặc submit auth. Chỉ sửa build config; bảo toàn slide/header/NoFlashGrid/category/store. CHƯA deploy/push/commit; uploadanh.cloud còn build lỗi cho tới khi deploy bản mới. Không tự deploy theo handoff.

Caption slide 10/10/2026: người dùng yêu cầu sửa phần tiêu đề/tác giả lấn ảnh. CSS đưa caption từ absolute overlay sang hàng grid riêng trên ảnh (gap14px), stage row2/controls row3 chỉ khi expanded; pagination nội bộ và compact giữ nguyên. Build pass; localhost769/1024/1366 captionBottom < photoTop, không overflow, next slide cập nhật caption, category compact và mobile390 hoạt động. Proof slide-caption-fixed.png trong thư mục visualization hiện tại. Chỉ sửa VisualArtFormsSlider.css, chưa deploy.

## Cụm thông tin/biểu đồ ảnh — 10/10/2026

Người dùng xác nhận caption và cho chuyển bước tiếp theo. Theo inventory, bắt đầu nhóm modal/chi tiết ảnh bằng ImageModalInfo, child ImageModalChart và hook useImageChart. Không đánh dấu toàn bộ ImagePage hoàn tất (file2300 dòng, còn tải/chuyển ảnh/actions).

ImageModalInfo: panel portal ra body, fixed position clamp theo viewport và kích thước thật, ResizeObserver + requestAnimationFrame hủy khi cleanup thay hai timer 50/200ms và estimate500px. Pointerdown outside xử lý touch; Escape không lan sang handler đóng/chuyển ảnh của ImagePage; focus vào nút đóng và trả về trigger; aria-dialog/expanded/pressed. Wrapper keyed image ID hủy state/listeners khi chuyển ảnh, không tự mở lại khi quay về ảnh cũ. Ngày invalid/future không hiện NaN/số ngày âm.

ImageModalChart: bỏ mousemove timer16ms và quét DOM tất cả bars; pointerenter/focus trên cột thực, state chỉ khi đổi cột; button aria-label ngày + số liệu, localized dates; tooltip portal giới hạn ngang/lật xuống khi sát mép trên, đóng khi scroll/resize; cleanup listener. Hook index daily buckets một lần thay O(days*history), giữ semantics UTC bucket/date và fallback tổng chưa tracked.

Kiểm thử: scripts/test-image-chart.cjs pass (tracked + remaining totals, trước publication, empty/zero). ESLint3 TS/TSX sửa pass; Vite build pass, chỉ warnings annotations/chunk size cũ; TypeScript toàn dự án lỗi ngoài phạm vi, không lỗi ở3file sửa. Fixture temporary importing actual info/chart, parent contain:paint/overflow:hidden không cắt portal, 360/390/767/768/769/1024/1366 và lowheight320 pass; panel nằm viewport, lowheight scrollable; views/downloads counts, Escape focus, keyboard tooltip, outside/đổi ảnh đóng pass. Fixture đã xóa. Không mở ImagePage thật để tránh incrementView/ghi backend trong test; integration với ImagePage còn cần kiểm tra ở đơn vị kế tiếp.

Inventory gạch2components, tổng19, chưa trang nào hoàn tất toàn bộ; chưa commit/push/deploy. Proof C:/Users/Fenn/.codex/visualizations/2026/10/09/01a12274-f462-73c0-972c-29e2225ff141/image-info-mobile.png. Dừng cho người dùng kiểm tra đơn vị. Bước kế tiếp ImagePage tải/chuyển ảnh và cleanup/responsive.

Caption slide — chỉnh lại theo phản hồi người dùng: yêu cầu nằm BÊN TRÁI ngang mép trên ảnh, không nằm hàng phía trên. Thay bố cục expanded thành2cột: caption clamp150–190px + gap24px + stage minmax(0,1fr), cùng row1; controls dưới stage row2. Thay thế cách rowcaption trước đó. Localhost769/1024/1366 xác nhận topcaption=topstage và gap24px, không overflow; nextslide/compact/mobile390 pass; buildpass đã cập nhật dist cho preview4174. Proof slide-caption-left.png. Giữ các thay đổi cụm Info/Chart chưa commit.

Info panel style theo ảnh Unsplash người dùng cung cấp: heading14px nhẹ, published12px, border/shadow mảnh, chart120px cột vuông xanhnhạt và dottedgrid, zero buckets trong suốt, tabs xám selectedtrắng thay selectedđen. CSS đã viết lại gọn, loại bỏ position-below/timeranimation cũ, xử lý radius global!important bằng selector scoped trong layerbase. Không sửa số liệu hay khoảng14ngày. Fixture actual Info/Chart pass390x640,769x440 panel trongviewport; screenshot image-info-refined.png; fixtuređãxóa.

## ImagePage — lượt đầu 10/10/2026

Người dùng yêu cầu kiểm tra ImagePage và nhấn mạnh responsive cho cả component con. Đã đọc toàn trang khoảng2300dòng, kiểm tra Git trước sửa và giữ thay đổi Info/Chart/slide hiện có. Sửa ImagePage.tsx và ImagePage.css: AbortController+active guard fetch; dùng actualLocation state; bỏ manual-ref timer100ms và preload toàn20ảnh liên quan (hover/lazy còn giữ). Guard stats response ảnh cũ; selector theo ảnh/user hiện tại, favorite count0 hợp lệ; seed stats đủviews/downloads trước cập nhật một trường, chart nhận tổng/daily hiện tại. Guard response tác giả khác ảnh/unmount; tooltip đo ngoài render/clamp viewport với ResizeObserver/scroll/resize cleanup. Keyboard không lan vào edit/collection và dialog/input/select con. Không sửa logic store/category/NoFlashGrid hoặc slide trong lượt này.

Responsive: bỏ minimum1400px bằng CSS scoped image-page-modal; regular width trừ64px sidebar tại>=769; mobile margin96!important; toolbar/actions/footer wrap, text/tag dài xuống dòng, tên card liên quan ellipsis. Thay3biểu thức inline height lặp và2effect đo ref không render bằng displayHeight state+ResizeObserver đo chiều rộng thật/toolbar wrap/viewport; ảnh contain, màn hình thấp còn cuộn xem nội dung. Preload lỗi tắt isLoadingRef/bar. Sửa MIMEheader type lỗiTS cũ.

Fixture tạm import ImagePage thật vớiMemoryRouter/images SVG/adapter Axios+stats mocks không ghi backend, đã xóa. Matrix320/360/390/767/768/769/1024/1279/1280/1366/1920, thấp769x320,769x440,956x440 không overflow khung/topbar/footer/info; resize cập nhật chiều cao. Race request600ms vs30ms vàview cũ800ms giữ ảnh3/333views; Info Escape đóng panel/trảfocus không đóng ImagePage. Popup hover chưa xác minh đủ, không nói đã hoàn tất. scripts/test-image-page-lifecycle.cjs test lấy effect từsource thật: abort, stale success/error, statefastpath, oldview updates owncache nhưng khôngcurrentstate; pass. Build pass; TS không còn lỗi ImagePage sau MIMEfix, toàn dự án vẫn lỗi ngoài phạm vi; lint còn1lỗi react-hooks/refs trong code render/tải ảnh, không suppress hay đánh dấu toàn trang xong.

Inventory thêm checklist từng cụm, chưa gạch ImagePage/EditImageModal/CollectionModal/ImageProgressBar. Tiếp tục phần tải ảnh/cache/timers/refsrender rồi directslug ảnhngoài50ảnh, favorites/download/session/focustrap, EditImageModal và CollectionModal con vớiresponsive. Không mở ImagePage thật đểtest vìincrementView ghiDB; dùngmocks. Chưa commit/push/deploy. Proof C:/Users/Fenn/.codex/visualizations/2026/10/09/01a12274-f462-73c0-972c-29e2225ff141/image-page-responsive.png (stress data title/name dài, không phải ảnh production).

Preview production4174 sau build cuối khởi động UI, console errors trống; không mở detail thật để tránh viewtracking ghiDB.

Slide căn giữa — 10/10/2026: người dùng báo ảnh lệch phải. Grid expanded đổi thành3cột với2rail caption cân bằng, stage/navigation cột giữa; maxwidth1600 để giữ đủ bề rộng ảnh desktop. Caption vẫn bên trái ngang stage, gap24px, không overlay ảnh. Đo769/1024/1366/1705: centerError≈0, controlsError≈0, caption top=stage top, không overflow. Nextslide/compact category/mobile390 pass; build pass cập nhật preview4174. Chỉ sửa VisualArtFormsSlider.css, giữ ImagePage và phần khác. Proof slide-centered.png trong thư mục visualization hiện tại. Trạng thái slide vẫn hoàn tất; thay thế bố cục2cột cũ gây lệch tâm.

Quy ước commit từ10/10/2026: người dùng yêu cầu mỗi khi xong đơn vị đã kiểm thử, tự commit thay đổi liên quan nếu chưa commit. Kiểm tra diff, stage đúng file, không push/deploy; không đánh dấu toàn trang xong nếu mới hoàn tất một cụm.

## ImagePage — tải/decode/animation hoàn tất 10/10/2026

Đã commit checkpoint trước trong ac1af13 theo yêu cầu người dùng tựcommit phần xong. Lượt mới gom tải ảnh vào ImagePagePhoto keyed ID/URLs: img DOM thật + watchDecodedImage (load/error/complete/decode/cleanup), preview tới khi ready, primary lỗi thử original, cả2lỗi tắt bar+localizederror/retry. Explicitretry URLcôngkhai khôngquery cócachebusttimestamp để tránhnegativecache; URLcóquery/chữký vàdata/blob giữ nguyên. Bar portal body vì frame contain:layout sẽ neo fixedbar sai nếu ở trongframe. ImageProgressBar thêm optionalprogress indeterminate/aria-valuenow chỉkhi biếtprogress; reduced-motionstaticbar. Không giả phần trăm/fetch blob duplicate đểhiểnthị.

ImagePage bỏ~600dòng lặp source/cache/newImage/progress/refsrender/previousflags, còn1716dòng; giữ preview chính ảnh được chọn thayhiểnthị nhầmảnh trước. Reset scroll/menus/author state qua layoutEffect2RAF cócleanup, bỏtimer100ms relatedclick, timer scroll150ms córefcleanup. Relatedclick truyền nextImages đầy đủ/depsimages, khônglostlist. Store/category/NoFlashGrid vàslide không sửa lượt này.

Kiểm thử: test-decoded-image.cjs dùnghelperthật: chờdecode, duplicateevents, completecache,error,decodeRejectdrawablenaturalWidth, unmountlatecompletion; test-image-page-lifecycle.cjs pass. Fixturetemporary import ImagePage/Photo/Progress thật vớiAxiosadapter/statsmock, khôngghiDB: primarybroken fallbackSVGpass, cả2broken báoerror/tắtbar, saukhôiphụcfile retry thànhcông cócachebust; helddecode bartrue/noaria-valuenow/previewtrue, completebarfalse/readytrue; chuyển1→2 trướckhidecode1xong vẫnảnh2ready; navigationnext/resetScroll/re-enableoverflow pass. Matrix320/360/390/767/768/769/1024/1279/1280/1366/1920 vớiảnhdọc fitsframe/nooverflow; ngang956x440 frame286/nooverflow. FixtureHTML/TSX/publicasset đãxóa. Proof image-page-loading.png trongthưmụcvisualizationhiệntại.

Lint: ImagePage0errors/33warningscũ; Photo/Progress0errors0warnings; watchDecodedImage thêmreturntypes đểloại2warning. TypeScripttoàndựáncònlỗingoàiphạmvi, khônglỗifilevừasửa. Buildpass chỉwarningsannotation/chunksizecũ, preview4174distđãcậpnhật. Inventorygạch Photo/Progress/cụmtải, tổng21component; KHÔNGgạch toànImagePage/EditImageModal/CollectionModal. Bước kế tiếp: directslug ảnhcũ ngoài50ảnh, favorites/download/session/keyboardfocus, rồi2modalcon vàresponsive. Tựcommit đơnvịđãtest theoquyướcngườidùng, khôngpush/deploy.

## ImagePage — mở trực tiếp ảnh cũ hoàn tất 10/10/2026

Thay fallback tìm trong50ảnh mới bằng fetchImageById và public GET /api/images/by-id/:imageId. Controller nhận12/24hex, fullID dùng _id indexed; shortID dùng $expr/$substrBytes offset12, giữ visibility gallery approved/missing/null; invalid400/missing404/ambiguous409 thay lấy nhầmảnh. Populateauthor/category giữ payload cũ. Không dùng slugUtils helper cũ vì substr offset âm không phù hợp và thiếu visibility. ShortID vẫn quét suffix (không index); chưa đổi schema/index hay format slug trong phạm vi này.

Ảnh chính render ngay sau lookup; recommendations fetch riêng, thất bại không đổi error hoặc chặn ảnh chính; danh sách luôn giữ selectedimage và lọc duplicate. Abort+active guard bảo vệ cả2request; directrequest dùng Axios riêng tránhreuse deduplicated request đãabort. Statefastpath hỗ trợ fullID/shortID/case, invalidslug khôngrequest.

Test-image-direct-link.cjs lấycontrollerthật với modelmock: validation, publicvisibility, short/fullquery,404/409 và route registration pass khôngDB. Test-image-page-lifecycle.cjs cậpnhật directlookup, relatedfailure khôngchặn, abort/stalesuccess/error/statefastpath/viewresponse pass. Backend node --check pass. Lintservice0errors0warnings, ImagePage0errors33warningscũ. Buildcuốipass warningsannotation/chunksizecũ. Khôngrestartbackend/deploy/push.

Fixturetemporary importImagePage thật MemoryRouter URLkhôngstate, actualservice/Axiosadapter mock, oldphoto2020 ngoài latestlist vàrecommendationsreject vẫnrender; stats methodsmock khôngghiDB. Responsive320/390/768/769x440/1024/1366/1920 khôngoverflow vàảnhhiểnthị. Fixture đãxóa, tabđóng/viewportreset. Proof image-direct-link.png trongvisualization hiện tại. Inventory gạch riêng cụm mở trực tiếp ảnh cũ, toànImagePage vẫnchưaxong,21componenthoàntất. Tựcommit theo user preference. Backendđangchạy cầnnhậnbảncode route mới trước khi dùng frontend mới ngoàifixture; chưakiểmthử API trênDBthật. Tiếp theo Lưu/Tải xuống/session/keyboardfocus vàpopupauthor, sauđó EditImageModal/CollectionModal children kèmresponsive.

## Hotfix ImagePage — refresh rồi mở/đóng ảnh khác 10/10/2026

User báo home→A→refresh standaloneA→B→close nhảy vềhome. Xác nhận: App clearHistoryState chỉ sửa window.history, Router.location.state vẫngiữ backgroundhome; ImagePage blindlyinherit stale background khi setModalActive trở lại. clearHistoryState cònxóamất idx/key Router. Sửa App lưu key entry reload đểinvalid đúngentryđó, clearflag trongeffect, navigate replace stateđãloại modal fields đểđồngbộ Router màgiữdataảnh. Không mutate ref/session/history trongrender. clearHistoryState helper giữ idx/key vàchỉclearusr.

getImageNavigationBackground chỉinherit background từstatevalid; standaloneA làmbackgroundA sạch. MởB từstandaloneA pushhistory đểBrowserBack/close giữA; đổiảnhtrongmodal replace tránhstackdài; marker returnToBackgroundInHistory cho close navigate(-1) đúngentryA, fallbackexplicitbackground giữquery/hash/state vàreplacekhôngreopenmodal. Cảarrowselect/relatedclick dùngchunghelper. Backgroundroute nhậnLocation riêng quaActualLocationContext/BackgroundRouteContext nên A khôngnhầmstateB vàkhôngcùngnhậnEscape/arrows. App mobile<=768 renderduynhấtactualphoto thaymountA+B hai trang; vẫngiữhistoryback.

Test-image-navigation.cjs lấyhelper/Appnormalization/ImagePagehandlers/keyboard từsource thật: refreshflag/routercleanup, giữhistoryidx/key, pushA→B rồiclosebackA, fallbackquery/hash, gridreturn, relatedclick, backgroundkeyboard khônglistener; pass. Lifecycle/directlookup regressionpass. Lint App/context/utils0errors0warnings, ImagePage0errors32warningscũ. Buildpass warningsannotation/chunksizecũ. Khôngbackendchange/deploy/push/ghiDB.

Fixturetemporary importApp+ImagePage+HomePage thật, MemoryRouter statehome→photoA, Axios/fetch/stats mocks; actualbrowserreload xácnhận background:none. A→B→close A giữnguyênkeyA tại320/390/768/769x440/1024/1366 khônghorizontaloverflow; mobile1page, desktop1closebutton; ArrowRight→B/Escape→A; homegrid→B/close→home; consoleerror fixturefreshtrống. Trongkiểmthử đãloại lỗiHMR/tươngtácquánhanh bằngfreshfixture vàwait ảnhDOM đúngtrướcbướctiếp; khôngcoi logcũ làlỗisảnphẩm. Fixtuređãxóa, tabđóng vàviewportreset. Proof image-navigation-refresh.png. Inventorygạch riêng cụm refresh/navigation; ImagePage vẫnchưahoàntấttổngthể. Tựcommit đơnvị theoquyướcuser. Tiếp theo vẫnLưu/Tải xuống/session/focus, popupauthor, EditImageModal/CollectionModal children.

## ImagePage — giữ vị trí B khi đóng M từ I 10/10/2026

Quy ước user mới: A=trang chủ, M=modal ảnh, I=danh sách ảnh ngẫu nhiên/liên quan trong M hoặc B, B=trang ảnh standalone sau refresh. Yêu cầu B→click I mởM→close/Back phảigiữvịtrí B.

Nguyên nhân: sidebar kiểmstate.modal (sai flaginlineModal) nênresetwindow0 khiđổiđườngdẫn; ImagePage resetscroll-area0 khiđổiảnh; relatedclicksetImage trướcroute làmảnh/vịtríBphíanền thayđổi. Sửa Sidebar dùngvalidationthật vàchỉskipmodaldesktop (mobileMfullpage vẫn mởđầutrang), skipentryB cósnapshot. imagePageScroll mapbounded50 theohistorykey+path/query/hash lưuwindowY/contentY trướcopen từstandaloneB; không dùngimageGridScrollPosition củaA. Arrowselect/relatedclick đều capture; đổiI trongMkhôngghiđèB. Relatedclick chỉnavigate vớiselectedimage/imagesstate, bỏimperativesetImage/setImages/manualrefbranchdead đểBphíanền giữảnh/nộidung.

HookuseImagePageScrollRestore restore bằngRAF+ResizeObserver khichildcontent đủcao, thaytimerướcđoán; cảwindow+scroll-area. Sauthànhcông stopobserver/listeners/RAF, trảhistory.scrollRestoration; foregrounduserwheel/touch/key ưu tiênhủy pendingrestore. BackgroundBkhôngngheinputM đểkhônghủyrestoreB; cleanup khiunmount/đổientry. Refđánhdấusnapshotđãrestore tránhkéoBvềvịtrícũ khiusercuộntiếp/resize; mởlạiB→M createsnapshotmới ghivịtrímới.

Test-image-scroll.cjs dùnghelper/hookthậtmockDOM: entryisolation/overwrite/boundedcache/delayedheight/windowscroller+contentscroller/inputcancel/unmountcleanup/backgroundignoreMinput pass. Test-image-navigation.cjs bổsungcapture từB ởarrow/related, nestedMkhôngoverwriteB pass. Lifecyclepass. ESLintSidebar/helper/hook0errors0warnings, ImagePage0errors32warningscũ; Vitebuildpass chỉannotation/chunksizewarningscũ. KhôngghiDB/backendchange/deploy/push.

Fixturetemporary importApp/ImagePage/HomePage thật MemoryRouter35ảnhSVG35ids, Axios/fetch/statsmock, actualrefresh mởB. DesktopBwindow1560.6666→I10Mscroll0→closeBwindow1560.6666. Mobile390Bwindow5199.3335→I10window0→BackB5199.3335. Matrixrepeat320/390/768/769x440/1024/1366/1920 save→restore vịtrí3847.3333/4126.6665/4608/1406/1903.3334/1294.6666/1450.6666, diff0px, nohorizontaloverflow. NestedM I8→I5 vẫnsourceB1450.6666 vàclose vềB1450.6666; consoleerrortrống. Delayedcontent kiểm bằngunitmock, khôngtuyênbốnetworkthrottlingbrowser. Fixtuređãxóa/tabđóng/viewportreset. Proof image-page-scroll-preserved.png. Inventorygạch riêngcụmgiữvịtrí B, chưađánhdấuImagePagehoàntấttổngthể. Tựcommitđơnvịđãtest theouserpreference. Tiếp theoLưu/Tải xuống/session/focus, popupauthor, EditImageModal/CollectionModalchildren kèmresponsive.

## Rà code dư thừa luồng A/M/I/B — 10/10/2026

User yêu cầu committrước rồi rà tốiưu vàtómtắtluồngảnh. Kiểmtrađầulượt gitclean, HEADd3af45d đãcommitphầngiữvịtríB nênkhôngtạoemptycommit. Giữquyước checkpointcommittrướclượtmới vàtựcommitđơnvịtestxong; khôngpush/deploy.

Đãtốiưuởlượttrước: bỏ~600dòngtảicache/preloaderlặp; DOMimg/load/error/decode/cleanup quaImagePagePhoto/watchDecodedImage; primary→originalfallback/retry; previewbarindeterminate; directIDlookup ảnhngoài50; Routerrefreshstatecleanup/historystable; riêngwindow/contentposition B bounded50; bỏimperativesetImage/setImages/manualref branch khi relatedclick đểBphíanềnkhôngmutate; RAF/ResizeObservercócleanupthaytimerrestoreướcđoán.

Lượtnày phát hiệnhandleImageSelect vàhandleRelatedImageClick lặptrìnhtự validate/captureB/background/modalflag/historynavigate. GomvềhandleImageSelect, NoFlashGrid onImageClicktrực tiếp dùnghàmnày; arrow/Next/Previous đều cùngluồng. State luônimage:selectedImage/images:nextImages/fromGrid:false, ảnhngoàilist thêm1lần; khôngđểpassedImagecũ buộctìmarraymởảnh. XóahandleRelatedImageClick, clearHistoryState deadexport (rgchỉcònunitcall, production đãdùngRouternavigate), unitbỏtestdeadhelper; giữAppnavigate replaceđồngbộRouterkhôngđụngidx. Dọncommentcũ resetheight/manual/ref/refreshsync. Diff3code/testfile20added72removed (~52netlines); khônglàmcụmLưu/Tải xuống/modalconnhânlượt này.

Test-image-navigation.cjs cậpnhậtchunghandler/cardbinding, captureB/capturemới/nestedkhôngoverwrite, selectedimagefaststate, ảnhngoàilistadded; navigation/scroll/lifecyclepass. Lintutils0errors0warnings, ImagePage0errors32warningscũ. Vitebuildpass chỉannotation/chunksizewarningscũ. Fixturetemporary actualApp/ImagePage25SVGimages MemoryRouter/Axios+fetch+statsmock; refreshM→B, sharedcardhandler→M→close/BackB giữvịtrí exact0pxdiff tại320/390/768/769x440/1024/1366/1920 nooverflow; keyboardArrowRight→I2/Next→I3/cardI5/Escape→Bgiữposition1633.3334, consoleerrortrống. Fixture/tabđãdọn, viewportreset. KhôngghiDB/backendchange/push/deploy. Proof image-flow-optimized.png. Inventorygạchscopecodeflow, ImagePage toàntrangvẫncònLưu/Tải xuống/session/focus/popupauthor/EditImageModal/CollectionModalchildren.

Tómtắtluồng dùngquyướcuser: Aclickảnh→M giữAphíanền; MclickI đổiảnh giữnguyênorigin; refreshM→Bstandalone cùngảnh bỏbackgroundA; BclickI lưuposition/historyB→M; đổiItiếptrongM khôngoverwritepositionB; close/Back→B đúngảnh/position. Mobile1fullpage thaystack2pages; desktopoverlayM; backgroundkhôngnhậnEscape/arrows. LinktrựctiếpảnhcũlookupAPI theoID khôngphụthuộclatest50; recommendationsfailurekhôngchặnảnhchính.


## ImagePage — Lưu/Tải xuống/session/responsive 10/10/2026

User yêu cầu tiếp tục và commit trước. Git đầu lượt sạch, HEAD6f630cb đã commit nên không tạo empty commit. Hoàn tất riêng cụm Lưu/Tải xuống; chưa gạch toàn ImagePage.

Favorite lock ref đặt trước bất kỳ await, disabled/aria-busy/spinner. Bỏ ensureCsrfToken duplicate và retry mọi403: Axios đã fetch token đúng baseURL và chỉ retry CSRF_TOKEN_MISSING/INVALID. Optimistic publish/rollback gom chung; favoriteCount0 cập nhật. captureImageActionSession subscribe auth/user giữ valid qua token refresh, invalid vĩnh viễn khi logout/login hoặc đổi account; finally unsubscribe. Response cũ không cập nhật favorite cache/history/toast tài khoản mới; global public stats vẫn cập nhật đúng ID.

Download lock đồng bộ, spinner/disabled trong khi transfer+stats pending. Chỉ PATCH incrementDownload sau blob đã chuyển cho browser (không thể xác nhận người dùng thực sự lưu file). GET backend chỉstream/notification, khôngincrement. Tải lỗi khôngPATCH/history. Bỏ gọi addDownloadToHistory trực tiếp vì store đã nghe downloadCompleted; event1lần/session đúng. Response ảnh cũ khôngsetDownloads/toast/đóngmenu ảnh mới. Blob link cófinallyremove/revoke sau1s; filename regex giới hạn header và bỏ pathseparator. Stats lỗi không đổi file đã tải thành thất bại;429 cócount syncowncache. Không sửa store/service/globalAxios/backend.

Responsive: mobile download riêng1hàng đầywidth; menu widthclamp và khôngtrànngang. LayoutEffect đo trigger, chọnmở trên/dưới theo availableviewport, maxHeight/overflow-y:auto; resize/scroll cập nhật vàcleanup. Reduced motion spinnerstatic.

Test-image-actions.cjs lấy handlers/effect/sessionhelper từsource thật với mocks: duplicate clicks trướcawait, failedtransfer0stats/history, success1stats/history/blobcleanup, khácảnhnosuccesstoast, khácaccountnohistory/stats/cache,403khôngreplaytoggle/rollback, favoriteCount0, tokenrefreshvalid/logout-relogininvalid/subscriptioncleanup, menuabove/below/resize/scrollcleanup. Navigation/scroll/lifecycle regressionspass. Lint ImagePage0errors30warningscũ; sessionhelper0errors0warnings. Buildpass warningsannotation/chunksizecũ.

Fixture temporary ImagePage thật MemoryRouter/authuserfake in-memory/Axiosadapter/fetch/statsmock, khôngbackendwrites: nútLưu vàTải disabled+aria-busy khi chờ1.2s; faileddownload vẫn2lượt, menuB/M tại320/360/390/768/769/956/1024/1366/1920 nooverflow, low320x440/390x320/769x320/956x440 menu trongviewport (mobileopenabove hoặcscrollmenu). Consoleerrortrống. Fixture/tab đãdọn viewportreset. Proof image-actions-responsive.png trongvisualization hiện tại. Tựcommit đơnvịđãtest, khôngpush/deploy. Tiếp theo chia sẻ/keyboard/focus, popupauthor, EditImageModal/CollectionModalchildren vàresponsive.


## ImagePage — Chia sẻ và bàn phím menu tải 11/10/2026

User tiếp tục. Lượt trước gitadd không thực hiện do automatic approval review hết usage limit, không phải action unsafe; không bypass. Lượt này kiểm lại test/diff rồi commit checkpoint61e2ca8 trước sửa.

sharePhotoLink gom native share/canShare, AbortError trảcancelled khôngtoast; native denied/unavailable fallbackcopy. ImagePage khóa ref trướcawait, disabled/aria-busy/spinner, giữ linkảnh gốc, khôngtoast response ảnhcũ/unmount, finallyresetpending. Clipboard fallback textarea cleanupfinally và focusprevious cònconnected vớipreventScroll. Không gửichia sẻ thật trongQA, navigator.share vàcopyToClipboard mocked.

Menu tải córole menu/menuitem, mở bằngArrowUp/Down hoặcclick focusfirstoption, Up/Down/Home/End điềuhướng, Escape chỉđóngmenu trảfocus trigger, Tab đóngmenu rồi tiếp tục thứtựtab. GlobalArrow/Escape khôngđổiảnh/đóngM khi menuđangmở; phímF thực sựtogglefavorite, bỏrepeat/Ctrl/Meta/Alt vàinputs/dialogscon. ResizeObserver trigger/menu bổsunglayoutposition khitoolbarwrap sauresize (kiểm thử phát hiện320x440 bịtràn dưới tạmthời khichuyểndesktop→mobile; saufixbottom428/h440,390x320menu12..195). Observer/listenerscleanup. Không đánhdấu focus trap toànM/Edit/Collection hoàn tất; giữ cho đơnvị sau.

QA phát hiện lỗi cũ useWebSocket:loggerwarn/error còn dùng saukhibỏimport, ReferenceError khi connect_error dobackendkhôngchạy. Khôiphục namedimportlogger, truyền dữliệu dạng{data} đúngLogOptions cho4call. Dọn optionsRef/timeUntilExpiry và callback arguments không dùng, Function đổi signature callable; không đổi singleton/retry/auth/storebehavior. Unit thực thi hookthật fakeSocket vàloggerthật: networkerror/disconnect/authrefreshfailed vẫnlog+gọierrorhandler/clearAuth đúng, khôngundefinedlogger.

Tests test-image-share-keyboard.cjs actualsource native success/cancel/denied/canSharefalse/copy, clipboardfallbacksuccess/errorcleanupfocus, sharelock/staleguard, menukeys/Tab/Escape/focus, keyboardmenuisolation/F/modifiers/input, WebSocketcallbacks. Image-actions/navigation regressionpass. Lint0errors:ImagePage30warningscũ, sharehelper/service0warnings; hookWebSocket0errors12warnings (any/hookdeps, không suppress). Vitebuildpass warningsannotation/chunksizecũ.

Fixture temporaryImagePage+MemoryRouter2SVGimages, Axios/fetch/statsmock/authuserfake, native/copyAPI giả; nativeAbortkhôngtoast, deniedfallbacktoastcopied, copyfailuretoasterror, pendingdisable+aria-busy. BrowserArrowDown/End/Escape focustrigger, Tab→Share, ArrowRight trongmenu giữroute, F→favoriteCount1. Mresponsive320/390/768/769/1024/1366/1920 vàlow390x320/769x320; B320/390/769x320/1920 nooverflow, menu trongviewport saubổsungobserver. Browserconsole có lỗiWSbackendunavailable dẫn ReferenceError cũ đãsửa; không tuyênbố consoletrống. WSfix xácminh bằngfakeSocketunit khôngstartbackend/ghiDB. Proof image-share-keyboard.png trongvisualizationhiệntại. Fixture/tab dọn viewportreset; dev5173 chạy, khôngpush/deploy. Inventorygạch riêngChia sẻ/bànphímmenu; bước tiếp focusM/popupauthor rồiEdit/Collectionchildrenresponsive.


## Focus modal ảnh M — 11/10/2026

User muốn tiếp tục nhưng tiết kiệm credit. Giới hạn lượt này ở focus M; Git đầu lượt sạch, HEAD331e217 đã commit. Không làm thêm popup/Edit/Collection.

Thêm useImageDialogFocus: chỉ foreground desktop M sẵn sàng, focus close preventScroll, Tab/Shift+Tab vòng trong dialog; lọc disabled/tabindex âm/display hoặc visibility hidden/inert. Cleanup listener và trả focus origin còn connected nếu không có dialog/destination khác giữ focus. Paused khi Edit/Collection mở, portal child tự nhận keyboard; không trap B/mobile/background. Overlay có role dialog/aria-modal/name; close/arrows chuyển vào overlay giữ CSS vị trí. Global key handler phân biệt dialog M và dialog con để Escape/arrows/F của M còn hoạt động. Info Tab đóng panel/trả trigger rồi browser chuyển control kế tiếp trong M, tránh ra trang nền. Không sửa slide/NoFlashGrid/category/store.

Kiểm thử đúng phạm vi: test-image-dialog-focus.cjs actual hook với DOM mock kiểm boundary/hidden/portal/restore/destination/cleanup/disabled/paused; share-keyboard/navigation regression pass. Browser fixture nhỏ actual ImagePage/Info MemoryRouter, API/stats mock, không auth/WebSocket/DB writes: Close→Tab→Save→ShiftTab→Close, Escape về opener đúng focus/windowY0; Info Tab→Close M. Resize320/769x440/1366 nooverflow, mobile không role modal; dialog desktop vẫn trong viewport. Hook lint0errors0warnings; ImagePage0errors30warnings cũ. Build một lần sau sửa, pass warnings dependencies/chunk cũ. Proof image-dialog-focus.png. Fixture/tab đã dọn viewport reset. Cập nhật checklist riêng focus M, toàn ImagePage chưa xong. Tự commit, không push/deploy. Tiếp theo popup tác giả (hover/focus/touch/timer) theo cụm nhỏ để tiết kiệm credit.

## ImagePage mobile với Header thật — 11/10/2026
User báo toolbar bị header che, Share ngắt chữ, Edit cắt bên phải, khoảng trắng lớn trước ảnh liên quan. Chỉ sửa ImagePage.css: mobile top-info static thay sticky top0; top actions grid2cột/download fullrow; stats và footer chia hàng, Share/Info2cột/Edit hàngsau; nút vùngchạm44px. Override padding-top0 của no-flash-grid-container chỉ trong relatedsection ImagePage, giữ NoFlashGrid/category/store/slide/Header source.
QA fixture Header+ImagePage thật, MemoryRouter owner và6SVGảnh, Axios/fetch/view mock khôngghiDB. Cổng5173 có CSS cũ (SearchBar length7583 vs source11487), dùng cổngQA5176 để kiểm CSS hiện tại; không sửa cache của user. Matrix320/390/768/769x440/1024 nohorizontaloverflow và mọi actionbutton trongviewport; mobile searchbottom96=toolbartop96, relatedpadding0/gap16; desktopoffset66 và padding16 giữnguyên. PageDown windowY1050.67 toolbarstatic. Authfake hết phiên trongQA nên proof cuối headerđăngnhập, không tuyênbố authflow đãtest. Buildpass warningsdependencies/chunksize cũ. Proof image-page-mobile-header.png. Fixture/tab dọn, viewportreset; QAserver dừng. Không đánh dấu toànImagePage xong; popupauthor/Edit/Collection cònpending. Commit theo user, khôngpush/deploy.

## Hàng ba biểu tượng mobile — 11/10/2026
Theo yêu cầu user: top actions mobile grid 3 cột đều, ẩn label/kbd và chevron; thêm Download icon, giữ pending spinner và aria-label/title. Collection button full width. Menu tải neo phải rộng240px tối đa viewport-32. Browser fixture Header/ImagePage/API giả:320px cả3 nút y162/h44/w90.67, không tràn; menu x60..300 trongviewport;390 proof image-mobile-icons.png;1024 nhãn hiện/nooverflow. Build pass. Commit trước khi sang popup tác giả. Không push/deploy.

## Timer popup tác giả — 11/10/2026
Sau commit1f27392 chuyển sang cụm nhỏ tiếp theo để tiết kiệm credit: thay hideTimeout gắn DOM và nested timer không quản lý bằng ref mở/đóng/fade, clearAuthorTimers dùng khi unmount/đổi ảnh. scheduleAuthorHide dùng ref popup đúng instance và hover/focus-within thay document.querySelector/toạđộ event cũ; cancelAuthorHide hủy cả fade và phục hồi animation. Mouseleave hủy ngay timer mở pending, popup focus/blur dùng cùng callback. Bỏ handler lặp và any liên quan. Không đổi layout popup hay mobile click tác giả→profile, không tuyên bố toàn popup xong.
Test-image-author-timers.cjs chạy callback actual source với fakeclock: pendingopen cancel, reentry trongfade, focus giữpopup, hide hoàn tất, unmount/inactive cleanup. Pass. ESLint ImagePage0errors20warnings còn lại; buildpass warnings cũ. Responsive layout trangảnh đã kiểm fixture320/390/1024 trong đơnvị trước, không kiểm touchpopup ở lượt này. Fixture/tab đã dọn, viewportreset. Bước tiếp theo popup tác giả keyboard/touch rồi Edit/Collection children. Commit riêng theo user, khôngpush/deploy.

## Popup tác giả: tương tác và responsive — 11/10/2026
Inventory đã có gạch hai cụm mobile icons/timer, tiếp tục keyboard/touch popup. Author area focusable rolelink/Enter profile; focus mở popup cùng handler hover. Nút Info44px cho chạm, aria-expanded; giữ click tên tác giả mở hồ sơ. Preview ảnh keyboardEnter/Space; Escape trên popup trả focus tác giả và hủy timer re-open; Escape trên trigger đóng popup mà không đóng trangảnh. Pointerdown ngoài đóng, listener cleanup. Không tuyên bố native touch hardware test, browserclick mô phỏng thao tác chạm.
Responsive QA tìm bug fixedpopup bị toolbar transform translateY0/will-change tạo containingblock khiến cộng offset96/66px. Override transformnone/willchangeauto chỉ top-info ImagePage. Matrix actualHeader/ImagePage SVG/APImock 320x568 rect12..308/y160..412.86;390x320 rect12..372/y60..308;768x1024/1024x768 trongviewport,nooverflow. TabInfo→preview, Escape→author focus, SpaceInfo mở/Escapeđóng, clicksearch ngoài đóng. CSS sửa sau build cuối chỉ centericon (không thaylogic). Test timerpass; lint0errors20warnings cũ trước finalpointereffect; buildpass warningsdependencies/chunk cũ. Proof image-author-popup.png. Fixture/tab dọn viewportreset; không DBwrites/backendstart. Tiếp theo EditImageModal/ImageEditor/EditImageTabs/TagInput/useEditImageForm kèm responsive, từng cụm nhỏ tiết kiệm credit.

## Bảng thống kê gọn, bỏ nhảy vị trí — 11/10/2026
User báo mở Info xuất hiện bên trái rồi trượt phải. Wrapper khởi tạo visibilityhidden, useLayoutEffect đặt left/top trước bật visible; transitionnone!important trên wrapper ngăn position animation. Mobile widthmin280px/viewport-24, header/contentpadding nhỏ, chart80px. Share/Info trên ImagePage chỉicon44px, aria-label/title giữ, footerflex hànggọn; desktop giữnhãn. Không đổi sốliệu/chartlogic.
Buildpass warnings cũ. Browser fixture actualImageModalInfo/Chart + actualCSS/footer, dữliệu8views1download giả khôngAPI:320/390x320/768/1024 paneltrongviewport/nooverflow; mobilepanel280x201.33, desktop320x263.33; transitionnone visibilityvisible, labelspanẩn. TabDownloads chart đúng1, Escape đóng/trảtrigger. Fixture kiểm panel/footer cô lập, không tuyên bố test fullApp/header lần này. Proof image-info-compact.png. Fixture/tabdọn viewportreset; QAserverdừng. Inventorygạch mụcfix, không đánh dấu toànImagePage; tiếpEditImageModal sau userchốt UI.

## Thu gọn nút theo ảnh mẫu — 11/10/2026
User muốn nút nhỏ như Unsplash, thay yêu cầu vùngchạm44px trước đó. CSS mobile đổi32x30px border mảnh nềntrắng radius5, topactions flex Lưu/Collectiontrái Downloadphải; footerstats dọc và actionsright compact Share/Info/Edit chỉicon; Infoauthor nhỏ theo. Giữ menu tải/nhãnaria/spinner. Dọn rulegrid2/3cột và44px bị thaythế, không thêmoverridechồnglặp. Desktop không đổi.
QA fixture actualCSS và ImageModalInfo với markuptoolbar/footer tươngứng (không fullApp):390 tấtcảnút32x30; topx12/50/338 cùngy44, footerx262/300/338 cùngy308. Matrix320/390x320/768/1024 buttonsFit/nooverflow. Buildpass warnings cũ. Proof image-actions-compact.png. Fixture/tabdọn viewportreset/serverdừng. Gạch riêngfixUI, toànImagePage chưahoàntất. Commit theoquyước khôngpush/deploy.

## Related mobile hai cột theo mẫu — 11/10/2026
User muốn ảnh liên quan giống ảnh mẫu Unsplash. NoFlashGrid thêm compactMobile opt-in, ImagePage bật riêngrelated. Mobile<=768 hai cột, gap6, rowspan theo chiều cao tựnhiên tỷlệ metadata/cache fallback4:3, không cộng130px author/actions. Observer resize có compactMobile dependency; defaultmode vẫngetColumnCount/gap24/clamp cũ. ScopedCSS chỉhide mobileauthor/actions cho compactrelated và sectionpadding24/12. Không thêm quảng cáo/premium nội dung mẫu. Click/preload/session/navigation/store/category/slide giữlogic.
Buildpass warnings cũ. Browser fixture actualNoFlashGrid/BlurUpImage/API fake10SVG với tỷlệkhác:390 hai176pxcol/6gap itemtop64/196/251 so le; clickẢnh3 callbackresult đúng. Matrix320cols141,440cols201,768cols365 đềugap6;1024cols480 gap24default; nooverflow. Fixture chỉgrid cô lập, không test fullnavigation A/M/B lại. Proof image-related-two-columns.png. Fixture/tabdọn viewportreset/devQAdừng. Gạch riêngcụm này, toànImagePage chưaxong; EditImageModal còn tiếp. Commit theouser khôngpush/deploy.

## Tăng khe related mobile — 11/10/2026
User muốn khe thoáng hơn như ảnh mẫu. Đổi compactLayout gap6→12 tại NoFlashGrid, cả column width/row unit/row span/inline grid gap dùng cùng biến nên không lệch bố cục. Desktop/default grid vẫn24. Thay đổi một giá trị, không chạy lại build toàn bộ để tiết kiệm credit. Kiểm tra diff và công thức: tại viewport320 với padding12 hai bên, mỗi cột142px nếu không scrollbar; viewport440 mỗi cột202px, gap12. Inventory gạch mục cập nhật, supersede gap6 trước. Commit theo user, khôngpush/deploy.

## Nút mobile rộng và rõ hơn — 11/10/2026
Theo phản hồi user: CSS mobile nút40x32 thay32x30, border#ccc/color#555/shadow nhẹ, SVG18px. Giữ icon-only/hàngtoolbar/footer/gap6 và vị trí downloadright. Chỉ CSS scoped ImagePage; desktop không đổi. Diffcheck/buildpass warnings cũ. Kiểm bề rộng nhóm3nút40*3+gap6*2=132px, cùng stats vẫn vừa320. Không chạy lại browsermatrix cho thayđổi nhỏ để tiếtkiệmcredit, không tuyênbố visualQA mới. Inventory cập nhật riêngmục, supersede32x30. Commit theo user khôngpush/deploy.

## EditImageModal: dịch và responsive — 11/10/2026
User ảnhchụp khóaimage.* và tabeditorcắt. EditImageModal dùngimagePage.* (đủkeys vi/en đã có), sửa vi titlePlaceholder/clearLocation cònEnglish. Exif bỏinlinegrid sangedit-exif-grid, mộtcột<=480 hai minmaxcột lớn. Bảng width100% max600desktop, maxheight100dvh-40desktop/-24mobile, paddingmobile12/16; header/tabs flexshrink0, formminheight0; tabs2cột dưới480. CSSselector cũ tìm camelgridTemplateColumns sai removed. ImageEditor actions/toolbarwrap và mainmobile cuộny/previewmin160/controlsshrink0 đểnút khôngtràn. Không sửa canvas/submit/sessionlogic.
QA actualEditImageModal/hook/Editor fixture fakeowner+SVG khôngsaveAPI:320detailslabelSửaảnh/Tiêuđề/Địađiểm/Môtả khôngimagekey; Exif1cột modal12..300/y12..556;390x320y12..308;768/1366Exif2cột,nohorizontaloverflow. Editor320 banđầu undo/redo ngoài méptrái/tooltabs ngoài phải, saufix outsidebuttons0. Tags existinglabel hiểnthị đúng, không lưu. Proof image-edit-responsive.png. Buildpass warnings cũ (lần cuối sauCSS). Chỉ đánh dấu phạmvi dịch/layout, ImageEditor/fullhookfocus/save chưaxong. Fixture/tabdọn viewportreset/QAdừng. Inventory gạch cụm, commit khôngpush/deploy.

## Edit modal chiều cao cố định, bốn tab một hàng — 11/10/2026
User không thích tab2hàng/gạchchân và chiều cao thayđổi. Heightmin640/viewport-40desktop/-24mobile, fullscreeneditor cùnggiới hạnheight; panelcuộny thayform để bảng ổn định. Tabsgrid3cột1fr+last1.5fr cùnghàng, mobilefontsize12/iconhidden/labelChỉnhảnh; active nền#eee radius6 border0!important, bỏtop1/borderbottomunderline. Desktop vẫn đủ4tab. Buildpass. ActualEditImageModal fixture fakeimage khôngsave:320 chuyểnDetails/Tags/Exif đềuheight544/tabtop80.67 cùnghàng/nooverflow;1366height640/tabtop148.67. Proof image-edit-fixed-tabs.png. Fixture/tabdọn viewportreset/devQAdừng. Inventorygạch cụm, khôngtuyênbố toànhook/Editorhoàntất. Commit theo user khôngpush/deploy.

## Editor desktop lớn hơn và khóa cuộn nền — 11/10/2026
Fullscreen editor đổi width95vw/height640 sang toàn bộ vùng khả dụng của overlay (desktop viewport trừ40px). Details/Tags/Exif giữ chiều cao ổn định; mobile vẫn heightmin640/viewport-24. Thêm min-height0 cho editor main, min-width0 cho canvas để flex không tràn. Dùng useScrollLock hiện có với selector .edit-image-modal cho toàn bộ isOpen, không tháo lock khi chuyển editor/metadata. Wheel/touch ngoài dialog bị preventDefault, keyboard cuộn nền bị chặn; overscroll-behavior contain trên panel/canvas/controls/main để cuộn không lan xuống trang nền. Hook khôi phục style overflow trước đó và vị trí trang khi đóng.
Kiểm tra hook thực tế qua TypeScript transpile và DOM giả: wheel/touch ngoài bị chặn, trong dialog được phép, PageDown ngoài bị chặn, listener dọn sạch và prior overflow hidden/scroll420 được khôi phục. Build pass (warnings PURE/chunk size cũ), diffcheck pass. Chưa chạy visual browser QA mới; không ghi API, không push/deploy.

## Khóa cuộn nền modal xem ảnh — 11/10/2026
Phản hồi user cho thấy modal xem ảnh (khác editor) vẫn kéo trang B phía sau: body overflow hidden không khóa div image-modal-scroll-area của trang nền. Effect lock của ImagePage thêm listener wheel/touchmove capture passivefalse, chặn target ngoài modalRef; portal dialog khác được phép để nested lock tự xử lý. Không kích hoạt listener ở isBackgroundRoute để trang nền không chặn modal hiện tại. Cleanup listener cùng body style. CSS overscroll contain scoped image-page-modal và vùng cuộn con, không thay scrolling trang B standalone/khôi phục vị trí.
Kiểm tra effect thực tế trích từ ImagePage bằng VM: wheel/touch backdrop và nền bị chặn, bên trong và nested dialog được phép, cleanup khôi phục overflow/listeners, background route không gắn lock. Buildpass warnings cũ, diffcheckpass. Chưa kiểm tra wheel vật lý trên trình duyệt; không ghi API/push/deploy.

## Wheel vùng xám cuộn nội dung modal — 11/10/2026
User muốn wheel ngoài modal cuộn chính modal thay vì đứng yên. ImagePage effect giữ preventDefault nền, sau đó cộng deltaY vào scrollRef hiện tại (pixel trực tiếp, line16px, pageclientHeight). Trong modal vẫn native scrolling; ctrl-wheel giữ browser zoom; nested editor/collection và event đã bị preventDefault không chuyển vào modal cha. Touch ngoài vẫn khóa nền. CSS contain từ commit trước giữ giới hạn nội dung không lan nền. Test effect thực tế bằng TypeScript transpile/VM đạt pixel/line/page, wheel trong modal, nested/zoom/prevented và cleanup. Buildpass warnings cũ; không thử wheel vật lý, không API/push/deploy.

## Cuộn native trên vùng xám — 11/10/2026
User báo forward wheel thủ công giật. Bỏ delta normalization và cộng scrollTop. Container modal toàn chiều rộng, nền transparent; scrollRef vẫn tại image-modal-scroll-area nhưng giờ bao gồm gutters. Thêm image-modal-surface trắng bên trong giữ widthmin1600/viewport-112 desktop/fullwidthmobile. modalRef chuyển vào mặt trắng để click gutters vẫn đóng; standalone surface displaycontents giữ flex layout. Event lock cho phép native wheel/touch trong scrollRef, chỉ chặn bên ngoài; contain giữ không lan nền. Scroll restore/onScroll dùng ref cũ không thay luồng A/M/B.
Test effect thực tế VM: native wheel/touch được phép, nền và overlay ngoài scroller bị chặn, nested dialog được phép, cleanup đạt; xác nhận không còn scrollTop+= và modalRef một vị trí. Buildpass warnings cũ/diffcheckpass. Không đo độ mượt hoặc visual QA trên trình duyệt ở lượt này; không API/push/deploy. Supersede forward wheel thủ công commit88ba753.

## Modal hẹp và góc trên theo vị trí — 11/10/2026
Surface desktop widthmin1480/viewport-144 (trước1600/viewport-112); mobile viewport-16. Container fullviewport transparent, margin0!important/transitionnone; khoảng trống16px chuyển vào surface margin để cuộn native làm mặt trắng di chuyển tự nhiên, không đổi viewport height/margin bằng state. Surface và sticky topinfo radius12px, classscrolled bỏradius khi scrollTop>=16; standalone giữ threshold>0. Reset/restoredscroll tính theo cùngthreshold và dependencyshowModalStyle. Cuộn gray vẫn native từ12a82ad.
QA browser fixture nhập CSS thực tế, hìnhSVG giả:1705x900 surfacewidth1480/top16/radius12, PageDown header top0/radius0;390x844 width358.67 (scrollbar cóchiều rộng), top16/radius12, saucuộn top0/radius0; khôngdocumentoverflowx. Screenshot photo-modal-rounded.png. Đây là QA CSS fixture, không trangAPI thật/không wheelvật lý. Buildpass/diffcheckpass. Fixture/tabdọn/viewportreset/devdừng. Khôngpush/deploy.

## Ảnh mobile sát mép — 11/10/2026
Theo ảnh user: <=768 bỏ padding-inline16 của image-modal-image-wrapper ở ImagePage standalone và modal. Surface modal mobile width100% thayviewport-16. Desktop/gaprelated/paddingthôngtin giữ nguyên. Height ảnh đã được ResizeObserver đo container.clientWidth nên tự tính lại khi bỏpadding. Chỉ CSS hai thayđổi; diffcheckpass, không chạy lại build/browser cho chỉnh nhỏ để tiếtkiệmcredit. Không thayobject-fit/proportionalheight, khôngcropảnh. Commitkhôngpush/deploy.

## Giữ trạng thái ảnh cache khi đổi danh mục — 11/10/2026
User thấy ảnh tải lại khi đổi danh mục. Category data cache đã có (_refreshfalse ở HomePage); BlurUpImage vẫn khởi tạo loadedSrcnull khi card remount nên full image bị opacity0 rồi load/layout effect mới hiện, dù URL có trong isImageLoaded. Khởi tạo loadedSrc từ fullImageUrl đã cache để không lặp placeholder transition. URL mới/unresolved vẫnnull, đổiURL trên card đangmount vẫn yêu cầu onLoad đúngURL; onError vẫnresetnull. Không đổi API/cacheexpiry/NoFlashGrid/slider/responsive.
Test initializer thực tế trích source:cached→URL, mới→null, chưaresolve→null. Buildpass warnings cũ/diffcheckpass. Chưa đoNetwork/browser category navigation nên không tuyênbố đã loại bỏ mọi request; browser HTTP cache vẫn quyết định refetch khi tài nguyên hết hạn. KhôngAPI/push/deploy.

## Chuẩn bị ảnh trước khi đổi grid danh mục — 11/10/2026
Bản20c5c67 chỉ giữloadedcache, chưa xử lý danh sách ảnh mới lêngrid trước ảnhready. Thêm usePreparedGridImages scopedHomePage: giữvisibleImages cũ, detectAVIF chọnURL dùngchunggetRegularImageUrl vớiBlurUpImage, preload/decode12priority vớiPromise.allSettled rồi commitmộtlần. Cleanup đánhcancelled đểswitch nhanh khônghiệnkếtquả cũ; timeout3s tránhtreo, emptyresultcommitngay. Navigation truyềnvisibleImages đểclick ảnhcũ trong lúcchuẩn bị đúnglist; paginationnull khi visibleImageskhácstore tránhloadmore saiquery. KhôngthaygridCSS/responsive/slider/session. Testhookthực tếtranspileVM: giữoldđếnready, staleignored, timeout/empty/timercleanup đạt. Buildpass/diffcheckpass. Chưa browservisual/networkQA lần này, khôngtuyênbố hết mọi nhấpnháy; network>3s fallback vẫn cóplaceholder. Commitkhôngpush/deploy.

## Grid category không dùng layout transform — 11/10/2026
User khoanh vùng grid, slider bình thường. HomePage category-grid đổi motion.div layoutposition sangdiv thường; bỏ imports reducedMotion/sliderTransition khôngcòn dùng. CSS scoped.homepage grid/card willchangeauto vàcardtransformnone thayGPUtranslateZ0 từngthẻ. KhôngsửaVisualArtFormsSlider hoặc defaultgrid trangkhác. Giữ preparedImages/cache từscope trước. Động cơ: bỏcompositor/layout animation khôngcần cho danh sách thayđổi, tránhraster lại lớpảnh; chưa khẳngđịnh đây lànguyênnhân duy nhất.
Buildpass/diffcheckpass. Browser actuallocalhost5173 Du lịch→Kiếntrúc→Du lịch: cuối mỗi bước6loaded/0pending; computedcardtransformnone/willchangeauto, gridstylekhôngtransform. Screenshot category-grid-static.png. Không quan sátframe-by-frame/khôngtuyênbố dứtđiểmnháy trênbrowseruser. KhôngsaveAPI/push/deploy. Tabdọn.

## Khôi phục animation và giữ grid DOM — 11/10/2026
User báo fb18062 vẫnnháy và làm slide/grid transitiontệ. Khôi phục motion layoutposition category-grid/sliderLayoutTransition/imports và bỏGPUoverrideCSS của fb18062. Thêm RetainedCategoryGrid scopedHomePage: giữtối đa3views theoIDlist, reuse cùngkey đểthẻảnh khôngunmount khiquaylại; inactive visibilityhidden/height0/positionabsolute/inert/ariahidden (khôngdisplaynone để width vàDOMảnh giữ nguyên). Chỉactive đượcpagination/loadmore/visibilityrefresh, IDimage-grid-container chỉactive qua optionalcontainerId NoFlashGrid (defaultgiữ nguyêncho callerskhác). Views LRU reorderkhiquaylại, giới hạn3. Native/gridCSS/sliderimage khôngthay. GiữpreparedImages trướcđó cho danh mục mớilầnđầu.
Actuallocalhost5173 Tấtcả→Dulịch→Kiếntrúc→Dulịch: Motionstylephục hồi, inactiveviews cònloadedimages, activepending0 sauload, viewsmax3/idactive1. Mobile390x844 nooverflowx/active1. Screenshot category-grid-retained.png. TestsourceactualVM JSX:3viewsbound, revisitLRU, exactly1active. Buildcuốipass/diffcheckpass warningscũ. Không đo frame-by-frame hoặc camđoan máyuserhếtnháy; firstload/evictedcategory vẫn cầnprepare. KhôngsaveAPI/push/deploy. Tabdọnviewportreset.

### Slide animation — 11/10/2026
- Nguyên nhân: khung parent FLIP nhưng stage/ảnh nhảy ngay sang bố cục đích, scale ngang/dọc khác nhau làm méo ảnh; spring kéo đuôi ~1s.
- FixedSlideStage và ảnh cùng tham gia layout projection; ảnh có kích thước theo tỷ lệ tự nhiên, flex center, max-width/height. Tween chung 450ms, reduced motion giữ duration0. Giữ scrollbar desktop khi body không scroll-locked.
- Fixture local dùng SVG tỷ lệ1.5 và component thật: trước ảnh nhảy width1368, sau nội suy900→330 và tỷ lệ1.49988–1.50007, transform hết~429–450ms. Thử chuyển nhanh120/240ms, chiều mở rộng, trang thật Tất cả/Du lịch và nút slide kế; 1440x900,1024x768,390x844 không tràn ngang. Browser background có throttle RAF nên không dùng số liệu này để khẳng định FPS trên máy người dùng.
- Không mở ảnh hoặc ghi dữ liệu backend. Fixture được xóa sau QA. Build và diff check trước commit.
