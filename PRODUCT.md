# PhotoCloud: theo dõi sản phẩm, thiết kế, audit và tiến độ

## 0. Bảng điều khiển chung

### SEA-17 đạt, chuyển Chi tiết ảnh (#4) — 2026-10-15

- Người dùng xác nhận nút × đã đạt; inventory đóng SEA-17 và gạch ngang chức năng tìm kiếm (16 ca gốc + ca bổ sung). Responsive vẫn để cuối.
- Chi tiết ảnh dùng ImagePresentationContext từ router để phân biệt modal/trang ngay render đầu, tránh cờ modal cũ trên reload; ưu tiên ảnh chính, thêm retry thông tin ảnh và sửa bấm tác giả bị điều hướng về nền. Modal editor portal ra body để không bị header chặn Hủy.
- Tách ImagePage thành view705/controller973/data99 dòng; editor2.272 dòng và CSS collection1.375 dòng cũng chia theo trách nhiệm, giữ API và cascade. Audit toàn dependency ảnh không còn file >1.000 dòng. So AST pixel filter và CSS ghép lại đúng bản gốc.
- Build/lint phần sửa đạt; TypeScript không diagnostic ở trang ảnh/editor sửa, toàn dự án còn lỗi ngoài phạm vi. Browser fixture sáng/tối PASS mở modal không chờ detail API, click→DOM khoảng35–47ms, reload không frame modal, điều hướng/tác giả/error-retry; editorcanvas chỉnh độ sáng đổi pixel và Hủy đóng được.8 nhóm test chức năng/hook ảnh PASS. IMG-01/02 chưa đóng, chờ người dùng kiểm dữ liệu thật ở inventory mục15 (23 ca).

### Xác nhận16 ca tìm kiếm, sửa nút × — 2026-10-15

- Người dùng xác nhận mục14 đạt hết:16/16 ca x, đã đóng SEA-11/12 theo xác nhận và gạch ngang phạm vi16 ca ban đầu. Responsive vẫn để cuối; lỗi mới ghi riêng SEA-17.
- Nút × trước đây gọi navigate('/') nên về trang chủ. Đã sửa chỉ xóa chữ, giữ focus/URL/kết quả/filter; blur không điền lại từ URL cũ, Enter trống không chuyển trang. Build/lint và fixture tìm kiếm desktop sáng/tối PASS gồm các assertion mới. SEA-17 giữ o chờ người dùng kiểm lại.

### Sửa hai ca mất mạng của trang tìm kiếm — 2026-10-15

- Đọc checklist người dùng:14/16 ca x, SEA-11/12 o. Ảnh Offline vẫn hiện0 ảnh, Network trống; chưa đủ kết luận request trả sai. Hook trước đó chỉ phản ánh lỗi request, chưa phản hồi sự kiện mất mạng khi đứng ở kết quả đã tải.
- Thêm theo dõi offline, hủy request ảnh đang chờ, giữ grid và trang cần retry, ẩn empty/tổng0 như kết quả mới khi mạng gián đoạn. Bật lại mạng và thử lại chỉ hết lỗi sau khi request thành công.
- Build/lint phần sửa đạt; TypeScript không diagnostic ở trang/hook sửa, toàn dự án còn lỗi khác. Test HTTP nội bộ + Edge setOffline thật sáng/tối PASS empty/offline/new-query, page2 abort giữ20 ảnh rồi retry nối21; hồi quy tìm kiếm PASS. Inventory thêm mục14.4 và lỗi đỏ đầu file; giữ SEA-11/12 o chờ người dùng kiểm lại. Responsive vẫn để cuối.

### Nghiệm thu x/o, ghi lỗi ảnh và chuẩn bị Kết quả tìm kiếm — 2026-10-15

- Người dùng quy ước x=đạt, o=chưa đạt; Khám phá19/20 ca đạt, EXP-F05 sắp xếp chưa đạt. Đã giữ nguyên ý nghĩa các dấu, đưa lỗi này cùng IMG-01 modal ảnh lag và IMG-02 F5 nháy modal khoảng2 giây lên đầu inventory bằng màu đỏ/biểu tượng. Hai lỗi ảnh mới chỉ ghi nhận, chưa sửa/đo nguyên nhân.
- Responsive làm sau cùng khi test chức năng hết các trang; trang chủ để sau. Tiếp tục đúng thứ tự với Kết quả tìm kiếm (#3), checklist16 bước dễ thao tác ở PAGE_INVENTORY mục14. Chưa tự đánh dấu nghiệm thu hoặc gạch ngang.
- Tìm kiếm bỏ decodeURIComponent lặp và chờ preload toàn bộ ảnh, bỏ cache riêng theo từ khóa, tách hook dữ liệu; trang sở hữu request filter, thêm empty/error/retry và tổng kết quả. Fixture desktop sáng/tối PASS từ khóa%, filter một request, pagination/retry, empty/error/query change/reload; Vite build và lint phần sửa đạt. TypeScript toàn dự án còn lỗi ngoài phạm vi. Không sửa dữ liệu thật.

### Dọn admin cũ, bắt đầu nghiệm thu từng trang từ Khám phá — 2026-10-15

- Xóa24 file admin không còn dùng sau khi kiểm import từ main.tsx; giữ component/hook/CSS mà admin mới tái sử dụng. Build và fixture admin actions PASS; audit hiện không còn file admin ngoài đồ thị import đang dùng.
- Khám phá263 dòng, dependency không còn file trên1.000 dòng sau khi tách locale Việt/Anh thành common/account/gallery/admin; toàn bộ nội dung bản dịch trước/sau giữ nguyên qua deep equality. Fixture Khám phá sáng/tối PASS gồm lỗi trang2/thử lại, lỗi danh mục, giữ order asc và minWidth; TypeScript còn diagnostic ngoài phạm vi, không có diagnostic Explore/locale/admin trong lần này.
- Theo thứ tự PAGE_INVENTORY, bỏ qua trang chủ để làm sau. Khám phá đang chờ người dùng tích checklist; responsive có phần riêng. Chưa tự đánh dấu đạt hoặc chuyển sang sửa trang tiếp theo. Chi tiết tại PAGE_INVENTORY_AND_ANALYSIS.md mục13.

### Xác nhận hoàn tất đợt chỉnh sửa Lịch chụp & dịch vụ admin — 2026-10-15

- Đã hoàn tất phạm vi giao diện và luồng thao tác của `/admin/bookings`: Yêu cầu, Lịch, Lịch rảnh, Gói chụp, Đánh giá và Chính sách. Các thay đổi mới nhất gồm modal thêm/sửa gói có vùng cuộn và footer cố định, danh sách gói có thông số/icon, công tắc đồng bộ ở Lịch rảnh và Chính sách, ngày nghỉ riêng và bảo vệ bản nháp.
- Xác nhận này ghi nhận kết thúc đợt chỉnh sửa theo yêu cầu người dùng, không thay thế nghiệm thu toàn hệ thống hoặc xác nhận sẵn sàng production. Tab Đánh giá vẫn cần kiểm thử cuối cùng cùng API thật ở môi trường staging.
- Bằng chứng đã chạy trong đợt làm việc: Vite build thành công; fixture Edge 390/1440, sáng/tối cho chính sách, gói chụp và lịch rảnh đạt; có kiểm tra lỗi lưu giữ bản nháp. Các kiểm tra yêu cầu/lịch và quy tắc backend được ghi trong các mục trước. ESLint phần vừa sửa không có error, còn warning effect; TypeScript toàn dự án còn lỗi legacy theo lần kiểm tra trước.
- Checklist kiểm thử cuối cùng cho toàn bộ trang được tập trung tại [FINAL_FUNCTIONAL_TEST_CHECKLIST.md](FINAL_FUNCTIONAL_TEST_CHECKLIST.md). Các ô chưa đánh dấu là chưa nghiệm thu vòng cuối; cần thực hiện trên staging, ghi kết quả và giải quyết lỗi chặn trước khi đưa lên host.

### Chính sách hủy/đổi lịch và ngoại lệ thời tiết — 2026-10-15

- Tách tab chính sách thành Đổi lịch và Hủy lịch & hoàn cọc; nhãn tiếng Việt, mốc hoàn không chồng lấn, giải thích tiền cọc đã nhận và hoàn tiền do studio đối soát. Có loading/error/retry, dirty/reset, busy/success, giữ draft khi lỗi, cảnh báo chuyển tab booking hoặc đóng/tải lại trang khi chưa lưu.
- Backend kiểm tra bật/tắt khách tự hủy, một lượt đổi cá nhân đã được duyệt, deadline theo giờ đã chốt ở múi giờ Việt Nam (chưa chốt giờ dùng00:00), policy payload whitelist và phạm vi giá trị/thứ tự tỷ lệ hoàn. Hoàn cọc ghi tỷ lệ chính sách trong lịch sử, không thực hiện chuyển tiền.
- Thời tiết là yêu cầu có mô tả bắt buộc, trước giờ chụp; được miễn deadline/lượt cá nhân nhưng cần studio xem xét, không tự đổi ngày. Chặn gửi trùng khi đang chờ; lưu reason trong request/history. Khách chọn lý do và mô tả; admin thấy yêu cầu, ngày đề nghị điền sẵn, giờ cũ không tự mang sang; có phản hồi không chấp thuận giữ lịch hiện tại. Lượt thời tiết và phản hồi không chấp thuận không trừ lượt cá nhân. Cho phép xử lý đổi tiếp ở trạng thái rescheduled.
-6 kiểm thử node cho quy tắc/controller PASS, không Mongo/SMTP thật (Settings import được mock). Vite build, ESLint phần mới, detector PASS; TypeScript không diagnostic ở các file booking vừa sửa, toàn dự án còn lỗi legacy. Edge fixture390/1440 sáng/tối PASS dirty/tab confirm,503 giữ draft/retry và payload lưu, thời tiết pending/date/giờ trống và không chấp thuận. Đã xem desktop sáng/mobile tối và sửa specificity input/nút theo theme. Cần backend nạp lại code mới; chưa thay chính sách hay gửi thông báo/hoàn tiền thật.

### Ngày/Tuần không còn vùng trống khó hiểu — 2026-10-15

- Người dùng xem15/10 và tuần11–17/10 không có lịch phù hợp. Thêm chọn ngày trực tiếp, ngày hiển thị thành nhóm có thứ/ngày, tuần luôn hiện đủ7 ngày với nhãn không có lịch. Empty có giải thích và nút Đến lịch gần nhất theo bộ lọc hiện tại, không tự chuyển khỏi khoảng người dùng chọn.
- Build/ESLint/detector PASS; fixture390/1440 sáng/tối PASS chọn ngày gần nhất20/10, tuần đủ7 ngày, mở chi tiết và retry. Không thêm dữ liệu giả vào ứng dụng thật.

### Hoàn thiện tab Lịch chụp — 2026-10-15

- Thay calendar legacy bằng AdminBookingCalendar riêng: ưu tiên confirmedDate/giờ đã chốt, chưa chốt ghi Dự kiến, tính ngày bằng UTC civil dates và hôm nay theo Việt Nam. Ngày/tuần/tháng có điều hướng đúng đơn vị, Hôm nay, chọn ngày; bấm buổi chụp mở BookingDetail chung và tải lại sau cập nhật.
- Mặc định ẩn hủy/từ chối/hết hạn; bộ lọc cho xem tất cả hoặc lịch kết thúc. Màu dùng bookingTone/token chung, hiện tên khách, giờ và trạng thái; mobile tháng dùng danh sách ngày thay bảng kéo ngang, desktop giới hạn3 sự kiện/ô và mở ngày xem thêm.
- Đọc đủ pagination thay giới hạn100 đầu, có loading/error/retry/làm mới và empty theo khoảng lọc. Không thay API/backend hoặc dữ liệu thật.
- Vite build PASS, ESLint không error (còn warning effect của các tab legacy khác), TypeScript không diagnostic ở ba file booking sửa, detector trả[]. Edge fixture390/1440 sáng/tối kiểm tra ngày đã chốt20 thay requested18 không lệch ngày, ẩn/hiện hủy, mở modal, điều hướng ngày/tuần, empty,503/retry và không tràn document. Kiểm thử dùng API giả lập, không gửi thông báo thật.

### Tăng độ rõ trạng thái booking — 2026-10-15

- Phản hồi màu khó thấy: bổ sung token trạng thái chung sáng/tối với nền amber/teal/xám rõ hơn và chữ tương phản, tăng badge từ10 lên12px/700 và chấm6px. Icon timeline có nền tròn theo trạng thái, cùng màu chữ với badge; không đổi ý nghĩa trạng thái.
- Build/detector PASS; Edge fixture320/390/1440 sáng/tối PASS gồm màu nhãn/icon đồng nhất, không tràn và thao tác cập nhật. Đã xem bảng desktop sáng và lịch sử mobile tối, không sửa dữ liệu thật.

### Đồng nhất màu trạng thái booking — 2026-10-15

- Lịch sử dùng cùng bookingTone và token màu như badge danh sách/chi tiết: pending/reviewing/needs_information vàng nâu, confirmed/rescheduled/completed xanh teal, cancelled/rejected/expired xám. Bỏ palette lịch sử riêng và giữ icon đặc trưng; màu đỏ của thao tác hủy/lỗi không thay đổi.
- Build và detector PASS; Edge fixture320/390/1440 sáng/tối PASS, có so sánh computed color của nhãn/icon lịch sử với badge cùng tone. Không thay dữ liệu hoặc luồng cập nhật.

### Phân biệt trạng thái trong lịch sử — 2026-10-15

- Thay chấm tròn chung bằng icon theo trạng thái: đồng hồ chờ xử lý, lịch có dấu chọn khi xác nhận, lịch đổi giờ, hội thoại bổ sung, dấu hoàn thành và dấu hủy. Nhãn/icon dùng màu amber, xanh teal, xanh lam hoặc đỏ theo ý nghĩa, điều chỉnh riêng cho dark; giữ chữ mô tả và timeline rõ ràng.
- Build/ESLint/detector PASS; fixture có lịch sử chờ xử lý và xác nhận, Edge320/390/1440 sáng/tối PASS. Đã xem mobile sáng/desktop tối; không đổi dữ liệu thật.

### Tab lịch sử trong modal lịch chụp — 2026-10-15

- Thay lịch sử bung xuống bằng hai tab Thông tin yêu cầu/Lịch sử trạng thái. Modal có chiều cao ổn định theo viewport; header, tab và footer cố định, panel cuộn riêng. Lịch sử dùng timeline và có trạng thái rỗng; giữ form mounted để không mất bản nháp khi chuyển tab, hỗ trợ phím mũi tên/Home/End.
- Build Vite, ESLint và detector PASS. Edge fixture320/390/1440 sáng/tối PASS: chuyển tab không đổi chiều cao/vị trí modal, giữ ngày giờ đang nhập, footer trong viewport và luồng cập nhật/retry vẫn đúng. QA dùng API giả lập.

### Xử lý lịch chụp dạng danh sách gọn — 2026-10-15

- Thay các ô hành động lớn bằng danh sách một cột có biểu tượng, tên và mô tả; mục được chọn dùng gold nhẹ và dấu chọn bên phải. Hủy/từ chối tách cuối danh sách, dùng đỏ tiết chế. Bỏ nền panel lớn, giữ nền kem và chữ dễ đọc của modal.
- Giữ radio native cho bàn phím/focus; chỉ hiện ghi chú sau khi chọn hành động, ngày giờ hiện theo hành động cần lịch. Footer xác nhận cố định, không gửi cập nhật khi chỉ chọn mục; API và quyền không đổi.
- Vite build, ESLint file sửa và detector PASS. Edge fixture tại320/390/1440 sáng/tối PASS, gồm footer trong viewport, chọn hành động chưa PATCH, lỗi503 giữ bản nháp và retry đúng payload. Đã xem desktop/mobile; không cập nhật lịch hoặc gửi thông báo thật trong QA.

### Modal lịch chụp: nền, chữ và hành động xử lý — 2026-10-15

- Người dùng thích hướng giao diện, yêu cầu tăng độ đọc/màu nền và cải thiện phần xử lý; ảnh cho thấy footer cắt ở đáy. Riêng modal chi tiết booking dùng class riêng, header/footer cố định trong flex dialog, body cuộn độc lập, max-height theo viewport/safe-area. Không thay layout modal khác.
- Nền modal kem ấm, panel xử lý đậm hơn một bậc, input sáng riêng; dark dùng brown/gold tương ứng. Nội dung16px, nhãn14px, tên hành động15px và mô tả14px; tăng nút/cỡ nhập và phân biệt nền/focus.
- Thay dropdown trạng thái bằng nhóm radio hành động có mô tả. Nhãn rõ “Hoàn thành buổi chụp”, “Đổi lịch chụp”, “Hủy lịch chụp”…; nút xác nhận gọi đúng hành động. Ngày/giờ chỉ hiện khi cần, lý do vẫn bắt buộc ở hủy/từ chối. Không gửi PATCH khi chỉ chọn radio; API/trạng thái/quyền giữ nguyên, không sửa lịch hoặc gửi mail thật.
- Build Vite/ESLint phần sửa PASS, detector trả[]. Edge fixture320x568/390x844/1440x720 sáng/tối PASS: footer/nút nằm trọn trong modal và viewport, nhánh xác nhận/hoàn thành/tra cứu lịch kết thúc,503 giữ draft và retry đúng payload. Đã xem screenshot desktop sáng và mobile tối. Một lần ghi screenshot bị Windows khóa file; chuyển output QA sang thư mục riêng và chạy lại thành công.

### Cải thiện UX/UI quản lý yêu cầu lịch chụp — 2026-10-15

- Theo ảnh phản hồi, tách tiêu đề và thanh điều hướng sáu mục, dùng tab gạch chân nhất quán với kem/gold. Danh sách Yêu cầu mới ưu tiên khách hàng/liên hệ, gói/giá/địa điểm, phân biệt ngày mong muốn với lịch đã chốt; trạng thái chờ/xác nhận/kết thúc có màu riêng. Mobile dùng danh sách dọc thay bảng kéo ngang.
- Thêm lọc nhanh, bộ lọc đầy đủ, tìm theo mã/tên/điện thoại/email và phân trang server. API GET admin booking bổ sung tìm kiếm literal đã escape và giới hạn100 ký tự; service nhận limit/search. Không thêm số liệu giả hoặc đổi giá/nội dung gói.
- Nút Chi tiết mở thông tin khách, ý tưởng/ghi chú, lịch sử trạng thái và form xử lý có xác nhận. Bỏ select đổi trạng thái tức thì + window.prompt của danh sách; có ngày/giờ khi chốt/đổi lịch, ghi chú bắt buộc khi từ chối/hủy từ studio, lỗi lưu giữ draft. UI chỉ tra cứu yêu cầu đã kết thúc; backend quyền và API trạng thái giữ nguyên. Không cập nhật lịch thật hoặc gửi email thật trong QA.
- Các tab gói/lịch rảnh/đánh giá/chính sách chỉ gọi dữ liệu khi mở. Calendar giữ module hiện có, tách tải danh sách khỏi request filter; chưa coi đây là nghiệm thu đầy đủ mọi nhánh calendar và cấu hình studio.
- Build Vite PASS; ESLint các file booking mới/parent không lỗi; TypeScript không có diagnostic ở file booking mới/parent/service (toàn dự án vẫn có lỗi khác). Backend test literal search/field/bounds PASS. Edge fixture390/1440 sáng/tối PASS lọc, tìm kiếm, chi tiết, yêu cầu kết thúc read-only, không PATCH lúc chỉ chọn trạng thái,503 giữ ngày/giờ và retry gửi đúng payload. Đã xem screenshot desktop sáng/mobile tối; detector trả[].

### Chuẩn hóa danh mục thực tế — 2026-10-15

- Theo yêu cầu dọn mục không liên quan, đã đọc MongoDB thật:9 danh mục,49 ảnh. Giữ8 nhóm chủ đề ảnh (Chân dung, Du lịch, Kiến trúc, Ngoài trời, Phong cảnh, Thời trang, Thú cưng, Ẩm thực), sửa toàn bộ mô tả tiếng Anh đang sai sang mô tả tiếng Việt đúng. Bỏ mục Nho quá cụ thể;4 ảnh của mục đó giữ nguyên, chỉ chuyển imageCategory=null để quản trị phân loại lại, không đoán nội dung từ tên cũ.
- Áp dụng bằng transaction trong `backend/scripts/normalize-photocloud-categories.js --apply`, có snapshot danh mục và liên kết ảnh trước thay đổi tại `.local-backups/categories-2026-10-15T11-28-27-974Z.json` (đã gitignore). Sau cập nhật8 danh mục/49 ảnh; chạy lại preview không còn thay đổi, không xóa file ảnh hay nội dung ảnh.
- Form danh mục bỏ slug vì model/API không lưu; thêm tùy chọn hiển thị khi sửa, gửi đúng description rỗng khi muốn xóa mô tả, giữ form khi API lỗi; cập nhật cache và sự kiện categoriesUpdated sau lưu. Không khóa quản trị vào một danh sách cứng khi tạo danh mục tương lai. Build Vite PASS.
- Edge fixture PASS form sửa: không còn slug, gửi isActive=false/description rỗng đúng,503 giữ draft và retry thành công; regression thao tác admin PASS. Detector form trả[]. Dữ liệu Mongo đã cập nhật thật; kiểm thử form dùng API giả lập để không sửa thêm nội dung thật.

### Đồng bộ các tab admin và tiếng Việt — 2026-10-15

- Người dùng gửi ảnh các tab Bộ sưu tập/Lịch chụp/Phân quyền/Nhật ký còn banner và đầu bảng đen, một số chữ tiếng Anh. Các module giữ lại đang nhận CSS cũ; thêm `AdminToolsTheme.css` để dùng cùng tiêu đề, nền bảng, nút, form tìm kiếm, badge và palette kem/gold sáng/tối của workspace. Tách ngoại lệ admin khỏi rule nút đen/hover public có `!important` trong index.css, không thay màu nút public.
- Dịch Actions/System/vai trò và các nhãn thiếu trong locale vi; quyền hiển thị nhãn qua i18n thay key như viewUsers; nhật ký hiển thị loại tiếng Việt và Hệ thống; bảng booking dùng nhãn khung giờ tiếng Việt thay morning/flexible. Giữ nguyên tên tài khoản, nội dung dữ liệu và tên gói do người dùng tạo.
- Build Vite PASS. Fixture Edge `test-admin-tabs.cjs` kiểm tra bốn tab trên390/1440 sáng/tối, so nền đầu bảng với canvas, bỏ banner gradient, nhãn tiếng Việt, không tràn document và không lỗi render; bổ sung kiểm tra riêng nút thêm quyền không đen. Detector UI trả[]. Không mutation dữ liệu thật hoặc thay phân quyền backend trong lượt này.

### Nút tải ảnh admin đồng bộ màu và icon — 2026-10-15

- Phản hồi người dùng: nút tải ảnh đen và dấu cộng nằm trên chữ. Nguyên nhân `UploadTrigger` dùng Button chung bị áp global primary styles và wrapper children. Khi có class tùy biến workspace, dùng button trực tiếp để giữ flex và palette admin: nâu đồng sáng, gold trong dark; không đổi Button chung toàn site hoặc luồng modal.

### Tải ảnh admin dùng modal, bỏ trang upload riêng — 2026-10-15

- Người dùng yêu cầu nút tải ảnh admin dùng modal có sẵn và xóa trang upload riêng. Thay link `/upload` bằng `UploadTrigger` tải lazy `UploadModal`, mở ngay trên workspace; sự kiện upload thành công tải lại danh sách admin. Sửa cả link tải ảnh đầu tiên trong dashboard hồ sơ để dùng cùng modal.
- Xóa `UploadPage.tsx` và `UploadPage.css`, bỏ lazy import; giữ redirect `/upload` cũ về `/` để tránh đường dẫn lỗi. Không thay đổi logic chọn ảnh, tải file hoặc API upload trong modal hiện có.
- Build Vite PASS; Edge production fixture PASS: bấm tải ảnh mở modal, URL vẫn `/admin/images`, đóng modal trở lại danh sách; regression thao tác admin PASS. Không chọn/tải ảnh thật trong QA.

### Hoàn thiện admin mới và tinh chỉnh UI bằng Impeccable — 2026-10-15

- Người dùng chọn hướng tinh gọn, chuyên nghiệp cùng theme PhotoCloud. Rà source độc lập + đối chiếu API phát hiện các trang mới dùng sai hợp đồng hook: không tải ban đầu, `isLoading/loading`, `totalPages/pages`; cài đặt dùng hàm/field không tồn tại; duyệt ảnh gọi generic update không thay đổi trạng thái thật; xóa user/danh mục thiếu xác nhận.
- Thay các trang danh sách bằng workspace dùng resource riêng theo route, tải ban đầu/search/phân trang URL, bỏ response cũ, lỗi inline + retry, không coi lỗi mạng là danh sách rỗng. Chỉnh ảnh và bulk danh mục gửi đúng `imageTitle/imageCategory`; xóa có dialog xác nhận, giữ mục lỗi khi bulk thất bại, cập nhật image store khi xóa. Form user chỉ gửi displayName/email/bio mà backend hỗ trợ; bỏ các ô vai trò/trạng thái giả trước đây. Form danh mục không đóng khi API thất bại, sửa slug tiếng Việt có chữ đ.
- Cài đặt đọc/ghi endpoint admin với các field có thật, dirty/reset/saving/error. Duyệt ảnh dùng `/moderation/pending` và POST approve/reject, có preview lớn và lý do từ chối, phân trang hiển thị. Không dùng hardcoded zero thay số liệu lỗi. Dashboard lấy số liệu thật từ stats; backend bổ sung tổng danh mục và URL ảnh mới nhất.
- Menu chia nhóm, nối lại lịch chụp/dịch vụ, bộ sưu tập, phân quyền và nhật ký bằng các module hiện có tải lazy. Các công cụ này được bọc CSS scope, không mount toàn bộ AdminPage cũ. Gate route theo quyền; phân quyền chỉ super admin, booking theo isAdmin như middleware backend. Không sửa vai trò hay dữ liệu thật trong QA.
- UI dùng kem/gold và theme dark chung, sidebar có nhãn, breadcrumb, vùng bấm44px, bảng/toolbar thống nhất, focus rõ, reduced motion; drawer/dialog native giữ focus và phục hồi focus. Bỏ chuông không có hành động, nút thêm ảnh giả chuyển thành link upload thật; thêm về website/đăng xuất qua auth store. Tách header/mobile nav/contact công khai khỏi admin để không còn hai header.
- QA production Edge fixture `test-admin-workspace.cjs` PASS390/1440 sáng/tối: menu, tìm kiếm/rỗng, bulk dialog, hủy xóa, slug, form user, lưu cài đặt, duyệt ảnh, lịch, bộ sưu tập; không lỗi render trong các luồng này. Đã xem screenshot desktop light, desktop dark thư viện và mobile dark. `test-admin-actions.cjs` PASS payload chỉnh ảnh, approve/reject + reason, hủy xóa không DELETE,503→retry, thiếu quyền không gọi settings API và không hiện menu đặc quyền. Detector Impeccable trên UI mới trả[]; build Vite PASS. ESLint phần mới không error, còn warning effect; TypeScript không còn diagnostic ở các file UI mới/booking vừa sửa, nhưng kiểm tra toàn dự án vẫn còn lỗi legacy và ngoài admin.
- Giới hạn: API giả lập, chưa chạy CRUD/Mongo/email hoặc tài khoản thật; chưa nghiệm thu mọi nhánh của các công cụ booking/roles/collections/logs được nối lại. Trình duyệt tích hợp không truy cập localhost trong phiên này; QA chạy Edge headless cùng server fixture riêng. Cần restart backend để endpoint stats có tổng danh mục/URL ảnh mới. Không coi lượt này là chứng nhận toàn bộ backend hay mọi chức năng legacy đã hoàn tất.

### Admin mới thay thế trang cũ — người dùng xác nhận 2026-10-15

- Người dùng xác nhận admin đã sửa, lỗi đến từ code cũ và đã tạo trang admin mới. Không tiếp tục coi lỗi admin không phản hồi/lag của trang cũ là công việc đang chờ sửa.
- Đối chiếu source: `App.tsx` đang nối `/admin` vào `components/AdminLayout.tsx`, dashboard mới và các trang con images/categories/users/moderation/settings tải lazy riêng. Không dùng `AdminPage.tsx` cũ trong route đang hoạt động. `AdminAppRoutes.tsx` là cây route khai báo riêng, hiện không phải điểm nối từ App.
- `usePermissions` đã memoize các hàm kiểm tra theo user; layout mới không mount đồng thời bốn hook dữ liệu của trang admin cũ. Source cũ vẫn còn trong thư mục để tham chiếu, không đồng nghĩa nó còn chạy trên `/admin`.
- Xác nhận hoạt động thực tế dựa trên phản hồi người dùng; lượt đối chiếu này là kiểm tra source, không phải đo hiệu năng hoặc kiểm tra CRUD/quyền của mọi trang admin mới. Các lỗi TypeScript toàn dự án được ghi riêng, không coi là bằng chứng admin còn lag.

### Tiếp tục cài đặt thông báo — 2026-10-15

- Rà các thay đổi đang dở: API cập nhật notificationPreferences ghi đè cả nhóm email/push khi chỉ gửi một lựa chọn, trái với cam kết giữ các khóa không gửi. Đã chuyển sang `$set` từng trường, tách danh sách khóa hợp lệ theo kênh; từ chối null/array, bỏ khóa lạ và giá trị không phải boolean.
- Regression `node backend/scripts/test-notification-preferences.js` PASS: cập nhật riêng lẻ, hai kênh, newsletters chỉ thuộc email và payload sai. Syntax controller PASS. Chưa thử Mongo hoặc phiên người dùng thật; chưa xác nhận hệ thống gửi thông báo tuân theo các lựa chọn.
- `npm run build:check --prefix frontend` FAIL do nhiều lỗi TypeScript ở ProtectedRoute, Header, admin, profile, stores và utilities trong cây mã hiện tại. Không dùng kết quả type-check cũ để kết luận cây mã đang dở đã đạt.
- Build Vite riêng (`npm run build --prefix frontend`) PASS, còn cảnh báo chunk lớn và import tĩnh/động. Build này không thay thế kiểm tra TypeScript.

### Guest startup 401 và cấu hình admin trên homepage - 2026-10-15

- Ảnh người dùng có refresh 401 lặp và /admin/settings 401. Public /api/settings backend local kiểm tra trực tiếp trả 200. Frontend refresh guest 401 gọi clearAuth làm tăng generation, hủy response public đang chờ; useSiteSettings catch lại fallback sang API admin gây thêm 401. StrictMode initializer cũng gọi refresh hai lần.
- Startup initialization dùng single-flight và không chạy lại sau hoàn tất. Refresh guest không token chỉ xóa dấu hasAuth/dispatch logout, không tăng generation; refresh khi có token vẫn clearAuth để giữ cách ly tài khoản. Public settings chỉ gọi /settings, lỗi thì dùng defaults, tuyệt đối không fallback /admin/settings.
- Store regression guest 401 giữ generation + startup dedup PASS; account switch/stale profile/stale refresh/logout ordering PASS. Test trình duyệt dev StrictMode 390, public settings trả chậm sau refresh401: nhận đúng title; settings503 không gọi admin; cả hai chỉ một refresh PASS. Type-check/build PASS. Refresh401 khi không có cookie là trạng thái guest hợp lệ, không phải đã xác nhận cookie đăng nhập thật hoạt động.

### Admin vẫn không phản hồi và lag - 2026-10-15

- Người dùng báo bản sửa overlay chưa giải quyết hết. Test trước chỉ trả lỗi API analytics nên chưa mount widget con. Bổ sung analytics thành công tái hiện global ErrorBoundary: Cannot read properties of null (reading health), do AdminWebSocketMetrics nhánh không có metrics vẫn đọc metrics.health. Xóa phần health khỏi nhánh lỗi, giữ giao diện lỗi widget.
- Bỏ theo dõi/đo bố cục đổi màu header trên admin (không có heading wash) để mutation biểu đồ không gây query/getComputedStyle/layout read toàn trang cho header. Test đo số lần getComputedStyle(admin-page) bằng 0.
- SW trước đây cache-first cả /src CSS/JS và module Vite, có thể giữ CSS chặn pointer cũ dù đã sửa. SW mới bypass source/HMR/dependency dev; main.tsx không đăng ký worker trong DEV và unregister worker /sw.js của app, không xóa auth hay cache ảnh. Trang đang do worker cũ kiểm soát cần đóng/mở lại sau unregister.
- Regression 390/1440: analytics có dữ liệu + WebSocket lỗi hoặc thành công, header/avatar và Người dùng/Ảnh/điều hướng logo PASS; 1s heartbeat headless có 242 frame, gap tối đa 4-8ms trong fixture (không đại diện thiết bị/phiên thật). SW regression source CSS/HMR không lấy cache PASS. Type-check/build PASS. Chưa truy cập được session Chrome thật, chưa xác nhận hết lag trên dữ liệu thật; cần người dùng kiểm tra lại.

### Header bị chặn khi tải Admin - 2026-10-15

- Người dùng bổ sung: cả header lẫn các tab admin đều không phản ứng. Mở rộng regression sau sửa: bấm tab Người dùng rồi Ảnh, kiểm tra active tab thay đổi và sidebar mobile tự đóng; PASS 390/1440 kể cả API admin giả lập trả lỗi. Chưa xác nhận lại phiên thực tế của người dùng.
- Tái hiện bằng cách giữ chunk AdminPage chưa tải xong: global-loading-overlay.visible trong suốt phủ toàn màn hình, z-index 9999 và pointer-events auto chặn click avatar/header. Khi tải xong, header hoạt động trong thử nghiệm giả lập.
- Giữ loading feedback nhưng bỏ chặn pointer của overlay. Không thay phân quyền, dữ liệu hay chức năng header.
- Regression scripts/test-admin-header.cjs: trước sửa thất bại với lỗi overlay intercepts pointer events; sau sửa PASS 390/1440: mở avatar lúc chunk còn pending, đổi theme desktop, tải xong và bấm logo về homepage. API giả lập, admin data trả lỗi chủ động; không xác nhận dashboard dữ liệu thật. Build PASS; detector CSS không phát hiện lỗi. Chờ người dùng kiểm tra lại tình huống thực tế.

### Lỗi nghiêm trọng cách ly tài khoản admin/user — 2026-10-15

- Người dùng báo đăng nhập admin nhưng header hiện user111. Rà source xác nhận nhiều đường giữ/ghi đè phiên: global requestDeduplication trước auth gộp request theo anonymous (kể cả POST refresh cùng body), `/users/me` cache HTTP300s, SW cache/replay mọi GET API và frontend nhận refresh/profile trễ. Không sửa vai trò tài khoản trong DB hoặc cấp quyền bằng giao diện.
- Backend chỉ gộp GET guest không credential, không replay mutation/auth/cookie/Authorization; dữ liệu có credential và auth/me/admin dùng no-store + Vary. Frontend /me cache-bust để né cache HTTP cũ; SW bỏ cache API và xóa cache API cũ khi activate, giữ cache ảnh. Thêm generation phiên để bỏ kết quả cũ ở auth/user/axios, cách ly dedup frontend theo generation; đăng nhập mới xóa user trước và chờ logout cookie kết thúc.
- Regression backend HTTP local hai danh tính/cookie và Set-Cookie PASS; frontend store stale profile/refresh + logout/login ordering PASS; UI production API giả 390/1440 sáng/tối đăng nhập admin trong khi refresh cũ trả trễ rồi reload vẫn admin PASS. Build/type-check PASS; ESLint store không lỗi, warning any có sẵn. Chưa thử tài khoản/mật khẩu thật. Cần restart backend và reload frontend để SW mới active trước kiểm tra lại.

### Khôi phục lối vào Admin — 2026-10-15

- Người dùng báo thiếu nút vào Admin. Thêm nút khiên desktop header và mục “Quản trị” trong menu avatar cả desktop/mobile; hamburger mobile giữ link admin. Điều kiện hiển thị khớp AdminRoute: isAdmin/isSuperAdmin hoặc permissions không rỗng, không đổi phân quyền API. Tài khoản thường không hiện link.
- Kiểm tra phát hiện grid desktop chia cột đều làm avatar tràn khi thêm nút: sửa cột auto/minmax/auto, thu upload thành icon có tooltip. Fixture390/1440 sáng/tối: admin mở menu và tới /admin, member không có link PASS; type-check/build PASS, ESLint không lỗi (warning effect cũ trong UserMenu).

### A10: newsletter có xác nhận và hủy — 2026-10-15

- Theo yêu cầu “làm dùm tôi”: thay mailto footer bằng POST subscribe, trạng thái đang gửi/kết quả/lỗi; Mongo model email unique với pending/subscribed/unsubscribed. Dùng lại SMTP `sendUserEmail`, link confirm24h và unsubscribe token hash; GET không mutation, hai trang public yêu cầu bấm xác nhận; cooldown60s và limiter20/giờ/IP. SMTP lỗi trả503 không báo thành công; không gửi thư thật trong QA.
- Backend service/schema 3 test PASS (trùng/đồng thời, expiry/replay, hủy/đăng ký lại, delivery failure); frontend ESLint/type-check/build PASS; UI production mock API 390/1440 sáng/tối subscribe thành công/lỗi, confirm/unsubscribe và không mutation lúc mở link PASS. Chưa test Mongo/SMTP thật. Cấu hình và checklist tại `NEWSLETTER-SETUP.md`; công cụ chiến dịch chưa thuộc lượt này.

### A10: yêu cầu nhận tin footer — 2026-10-15

- Người dùng xác nhận header homepage đã chuẩn chỉnh và yêu cầu chuyển mục tiếp theo. A10: sửa mailto dùng nhầm `BRAND.personality.tone` thành `BRAND.email`; encode subject/body và trim email. Thay icon tim bằng Send, nhãn rõ mở email để gửi yêu cầu; bỏ hứa hẹn gửi ưu đãi hàng tháng khi chưa có backend newsletter. Không gửi thư thật hoặc thêm đăng ký tự động.

### Header homepage giữ gold hết HeroBooking — 2026-10-15

- Sửa mốc chuyển màu homepage: ưu tiên đáy `.homepage .hero-section` thay cho đáy slideshow. Theo dõi resize HeroBooking để cập nhật mốc khi nội dung/viewport đổi. Fixture production 390/1440 sáng/tối: trong HeroBooking giữ gold, qua cuối section đổi canvas, cuộn lên trả gold PASS. Build/ESLint hook PASS; dữ liệu fixture, chờ người dùng xem lại trang chủ thật.

### Header chuyển theo vùng nền khi cuộn — 2026-10-15

- Theo yêu cầu thử: header dùng vàng nhẹ ở dải heading, chuyển sang canvas khi đáy dải đi qua header, quay lại vàng khi cuộn lên. Đo ranh giới khi route/layout đổi, scroll chỉ kiểm tra ngưỡng bằng rAF với hysteresis3px; dùng data attribute để không bị render isScrolled xóa trạng thái. Giữ nền đặc, transition180ms có sẵn và tắt theo reduced-motion; home slideshow vẫn giữ header trong suốt theo cinematic.
- Production fixture Packages 390/1440 sáng/tối: cuộn xuống header=canvas và cuộn lên trả đúng gold PASS; 20 mẫu route/theme không lỗi fixture. Build/type-check/ESLint hook PASS. Chờ người dùng xem chuyển tiếp trên app thật.

### Header ngả vàng theo gradient — 2026-10-15

- Theo phản hồi header trắng ngà tách khỏi dải gold: dùng token nền header đặc riêng #F0EAE0 ở sáng và #30291E ở tối, gần đầu gradient hơn. Đồng bộ trạng thái cuộn; header trong suốt trên slideshow giữ hành vi hiện có.

### Sửa đúng dải gold đầu trang — 2026-10-15

- Người dùng chỉ rõ “vàng vàng” là dải gradient đầu trang Khám phá trong light mode. Lượt trước hiểu nhầm và chỉ đổi canvas dark. Đã tách token `--page-heading-wash` từ gradient Explore, dùng cho các hero Blog/About/Explore và dải đầu các trang Packages, profile, thư viện, booking, settings, thông báo, upload, liên hệ, tìm kiếm. Dải cao360px desktop/300px mobile chuyển về canvas, không phủ màu lên ảnh/card hay header toàn site.

### Nền dark gold chung — 2026-10-15

- Người dùng thích sắc gold của Blog nhưng các trang tối khác còn gần đen. Đã nâng theme dark chung: canvas/header #242017, nền phụ #2B251B, card #332C21, viền #4A402F và hover #3C3326. Đồng bộ HSL tokens của các trang hồ sơ/cài đặt/thư viện và admin aliases để không giữ palette gần đen cũ; light palette giữ nguyên.
- Build PASS; rà production Explore/Packages/Blog/Favorites/Settings desktop/mobile sáng/tối bằng API fixture. Checklist cập nhật màu dark mới; các nội dung cần dữ liệu thật vẫn giữ giới hạn kiểm chứng của lượt trước.

### Đồng bộ nền toàn site và tiếp tục A09 — 2026-10-15

- Header source đã dùng `--bg-primary` cùng body; màu sáng #FAF8F4 nhìn gần trắng. Đồng bộ nền root/page, card/popover token, auth và 53 khai báo nền trắng cố định trong 15 CSS (gồm admin/upload/ảnh); màu trang tối #16140F, nền phụ/card tối vẫn có phân cấp. Không đổi nền ảnh/biểu tượng trắng của slideshow hay preview độc lập.
- Build/type-check PASS. Bài rà production 22 route x2 viewport x2 theme =88 mẫu: 84 mẫu đọc được không có nền trắng thuần trong viewport; 4 mẫu upload bị watchdog dừng. Admin fixture render ErrorBoundary do thiếu số liệu nên không coi là xác nhận admin; chi tiết collection/booking redirect do ID giả. Ảnh/bài/profile và nội dung có dữ liệu thật chưa kiểm chứng đầy đủ. Đã xem screenshot Explore/auth dark; sửa thêm chữ phụ auth dùng text-secondary sau lượt route. Danh sách kiểm tra tại `THEME-CHECKLIST.md`, raw report `frontend/route-surfaces-report.json`.
- A09: phân biệt lỗi mạng với danh sách rỗng, thêm “Thử lại” khi slideshow không tải được; retry xóa error, không xóa ảnh đang có khi fetch thất bại. Store regression và fixture UI 390/1440 lỗi→retry→ảnh phục hồi PASS. Chờ người dùng kiểm tra app thật.
### Bảng booking responsive: chữ/nền/kích thước/tiến trình — 2026-10-15

- Theo yêu cầu, tăng chữ form/help/footer và nội dung gói trên desktop/mobile; nền bảng dùng `--bg-primary` (body sáng #FAF8F4, dark #16140F), card/input dùng nền phân cấp theo theme. Thay progress cũ bằng bước đánh số, bước đã qua có icon Check và aria-current cho bước hiện tại, áp dụng cả báo giá riêng.
- Bảng desktop cao cố định theo viewport tối đa680px; mobile92dvh. Form flex với vùng nội dung cuộn riêng, header/stepper/footer không co; success cũng nằm trong cùng khung. Không đổi validation/API/gửi booking.
- Fixture component BookingModal thật (mock gói/user, không gửi yêu cầu): 320/390/768/1440 sáng/tối PASS kích thước ổn định bốn bước, dấu hoàn thành, Back, footer luôn nhìn thấy và chữ gói theo theme. Đã xem screenshot desktop sáng/mobile tối. Type-check PASS; ESLint không lỗi, còn warning effect setForm có sẵn. Chờ người dùng kiểm tra trên app thật.

### A08: vùng bấm tối thiểu 44px — 2026-10-15

- Tăng độ đọc ô gói mobile: tên16px, giá14px, thời lượng/số ảnh13px trong breakpoint <=600px. Desktop giữ cỡ chữ/bố cục hai cột; sửa thumbnail đúng cột trước đó áp dụng cả desktop.
- Thu gọn gói booking mobile theo ảnh phản hồi: sửa selector span ép thumbnail sang cột thông tin (gây hàng trống), giữ thumbnail cột trái và thông tin cột phải. Mobile thumbnail 44px, padding12px, gap gọn, hàng tối thiểu88px; vùng bấm vẫn lớn và tên dài được xuống dòng.
- Theo phản hồi ảnh mobile, nút đóng booking đủ vùng bấm nhưng icon nhỏ/mờ. Đã tăng icon X lên 24px, thêm nền theo theme, viền rõ và focus-visible; kích thước nút cố định 44px không co trong header. Giữ hành vi đóng, không dùng nhãn “Trở về” vốn dành cho bước trước.
- A07 được người dùng xác nhận đạt toàn bộ. Tiếp tục A08: tăng vùng bấm icon header, bookmark/điều hướng slideshow và nút đóng/footer/success booking lên tối thiểu 44px, giữ kích thước icon hiện có.
- Fixture CSS Edge 320/390/768/1024/1440: các target hiển thị >=44px và nút slider không chồng nhau PASS. Fixture component slider/bookmark và A07 PASS. Detector báo font Inter có sẵn ngoài phạm vi. Chờ kiểm tra bố cục header đầy đủ và thao tác chạm trên app thật.
### A07: card ngoài khung không nhận Tab — 2026-10-14

- A06 đã được người dùng xác nhận đạt toàn bộ: đăng nhập, Tab/Shift-Tab, viền khi hover, Enter/Space và độ rõ trên các nền.
- Tiếp tục A07: card hoàn toàn ngoài vùng slider chuyển inert, tabindex -1 và aria-hidden; card còn nhìn thấy giữ tương tác. IntersectionObserver theo khung slider cập nhật khi resize/animation; đồng bộ trước paint khi đổi slide. Nếu card đang focus bị ẩn, chuyển về nút điều hướng nhìn thấy, không cuộn trang.
- Edge fixture component thật 390/1440 rồi resize 320: Tab không tới card ẩn, scrollLeft slider giữ 0, đổi slide/resize cập nhật inert/tabindex/aria-hidden PASS. ESLint và type-check PASS; regression bookmark PASS. Chờ người dùng xác nhận app thật.
### A06: focus nút thông báo — 2026-10-14

- Người dùng kiểm tra app thật: đăng nhập/Tab/Enter-Space ĐẠT; viền khi hover KHÔNG ĐẠT, dropdown sáng/tối/slideshow xấu và khó nhìn. A06 chưa đóng. Đã sửa tiếp: viền focus xanh đậm 3px với lớp trắng để không phụ thuộc màu icon; hover slideshow nền tối; timestamp/icon/action/border/unread dùng theme tokens, bỏ icon nền trắng và đường phân cách sáng trên dark. Fixture CSS tích hợp Header + theme + immersive 390/1440, Tab/hover và timestamp contrast >=4.5 PASS; chờ người dùng xác nhận lại.
- Tiếp tục A06 sau khi người dùng yêu cầu ghi lại A05 và chuyển mục kế tiếp. CSS nút chuông xóa outline ở trạng thái thường, hover và focus; sửa bằng focus-visible theo màu hiện tại để dùng được trên header sáng/tối và nền slideshow.
- Browser fixture Edge 390/1440 kiểm tra Tab + hover sáng/tối/slideshow: viền solid 2px PASS. Đây là fixture CSS nút, chưa kiểm tra dropdown thông báo với tài khoản thật. Detector báo border-left có sẵn ở mục thông báo, ngoài phạm vi A06.

### A05: bookmark slideshow lưu vào yêu thích thật — 2026-10-14

- **CÒN LỖI KHỰNG — người dùng xác nhận sau lượt tối ưu cuối.** Mở tab bookmark vẫn làm khựng giao diện/slideshow trên app thật. Các luồng lưu/bỏ lưu, bộ đếm và danh sách đã được người dùng xác nhận ổn; tạm dừng xử lý khựng theo yêu cầu để chuyển A06. Không dùng kết quả fixture để đóng lỗi hiệu năng này.
- Riêng khựng lúc mở panel: tách mount/decode thumbnail khỏi animation mở 280ms bằng transition React, thêm containment/layer cho panel và content-visibility cho ảnh ngoài viewport. Fixture Edge production components với JPEG thật 390/1440: trước max frame gap 16.7/20.9ms, sau 12.4/12.5ms, không frame >50ms, slideshow không đổi bounds. Fixture chưa tái hiện khựng nặng của app thật nên chưa coi là xác nhận hết lỗi trên máy người dùng. Type-check PASS.
- Sửa panel bookmark và đồng bộ nhanh: panel không khóa scroll toàn trang, giới hạn preview 20 ảnh với decoding async và biến thể thumbnail, dùng cache/stale refresh khi mở lại. Favorite store hợp nhất thay đổi local và chặn response GET đảo thứ tự ghi đè; slideshow truyền object ảnh để mục mới xuất hiện ngay. Test tổng thêm stale GET/rapid add-remove/out-of-order PASS, slider/hook regression PASS, type-check PASS; chưa đo độ khựng trên browser thật.
- Bỏ độ trễ phản hồi khi click: slideshow và grid cập nhật bookmark/cache ngay trước khi chờ API, xác nhận bằng kết quả server, hoàn tác nếu lỗi. Grid dùng session guard cho phép refresh token. Test slider xác nhận trạng thái đổi trước API response và rollback PASS; test tổng yêu thích, type-check PASS; ESLint không lỗi (grid còn warning fast-refresh có sẵn). Chưa kiểm tra phiên browser thật.
- Sửa bộ đếm yêu thích header cập nhật chậm: chia sẻ tổng đã lấy của header với favorite store, cập nhật tổng đồng bộ theo thay đổi bookmark, không chờ GET phụ. Khử sự kiện trùng và xử lý bỏ lưu ảnh ngoài trang đang tải; sự kiện lưu thiếu object ảnh không còn bị coi là bỏ lưu. Test `test-favorite-total.cjs`, hook cache và slider bookmark PASS; chưa kiểm tra browser với phiên thật.
- Kiểm tra lại lỗi bookmark: slider bỏ kết quả toggle thành công khi axios refresh access token. Đã thay kiểm tra token bằng theo dõi kết thúc phiên, giữ cập nhật cache/count sau refresh và bỏ kết quả sau logout. Regression `test-slider-bookmark.cjs` PASS: refresh token, click lặp, đổi phiên qua logout, lỗi mạng và retry; type-check PASS. Chưa xác nhận trên phiên tài khoản thật.
- Tiếp tục A05 theo yêu cầu. Nút bookmark trong TimedCardSlider trước đây chỉ đổi state cục bộ và reset khi đổi slide; chưa gọi endpoint yêu thích nên refresh/tài khoản không giữ.
- Đã đưa `id` ảnh thật từ `SlideData` qua `CardOpeningStage` sang `TimedCardSlider`, dùng `useBatchedFavoriteCheck` để đọc trạng thái yêu thích theo tài khoản và `favoriteService.toggleFavorite` để lưu/bỏ lưu qua `/favorites/:imageId`. Cập nhật cache favorite/count dùng helper hiện có để header/trang yêu thích nhận trạng thái mới.
- Chưa đăng nhập thì chuyển `/signin`, giữ cùng kỳ vọng với grid ảnh; khi lỗi hiển thị thông báo cập nhật yêu thích thất bại. Không thêm localStorage fallback, không đổi API/backend, không tự tạo collection/wishlist gói.
- ESLint hai file `TimedCardSlider.tsx` và `CardOpeningStage.tsx` PASS; `npm run type-check` PASS. Chưa chạy build production hoặc browser fixture đăng nhập thật trong lượt này, nên A05 **ĐÃ SỬA SOURCE, CHỜ KIỂM TRA APP THẬT**: đăng nhập, bấm bookmark trên slideshow, refresh, vào `/favorites`, đổi slide rồi quay lại, đăng xuất/hết phiên.

### Bỏ sidebar người dùng và đồng bộ nền trang — 2026-10-14

- Bỏ render sidebar public/member trong App, giữ component variant header cho yêu thích/tải xuống; không bỏ sidebar admin hay sidebar chỉnh sửa bộ sưu tập. Gỡ khoảng trống 64px của header và các trang người dùng, giữ gutter modal ảnh.
- Chuyển trạng thái WebSocket xuống footer. Các link điều hướng, yêu thích và tải xuống vẫn ở header; không đổi endpoint, dữ liệu hay handler.
- public-surfaces.css nối token HSL cũ với palette studio: canvas sáng #FAF8F4, tối #16140F; card/section vẫn có độ phân cấp. Scope không áp dụng cho admin. Favorites/Collections không còn nền tím/slate; nền tìm kiếm/cài đặt/chi tiết booking dùng nền chung.
- Build và ESLint App/Footer PASS. Production browser member fixture 320/390/1024/1440: Collections/Favorites/Packages/Explore sáng và tối cùng màu canvas, không sidebar, header left0 và không tràn ngang; regression theme persistence/logo-top/CTA/booking/photo PASS. Toàn bộ API và WebSocket mock, không phải phiên tài khoản thật. Đã xem screenshot Favorites dark; chưa xác nhận trực quan tất cả profile/settings/download/admin trên dữ liệu thật.
- Lỗi độ trễ mở modal ảnh vẫn CHƯA SỬA XONG, không đóng bởi lượt kiểm tra này.
- Kiểm tra screenshot phát hiện logo còn translateX(-72px) từ layout sidebar: đã bỏ. Build lại PASS. Lượt cuối sau chỉnh logo: 320/390/1024 PASS; 1440 timeout ở assert logo về scroll0 trước bước palette, nên không gọi toàn bộ lượt cuối PASS. Lượt palette 1440 trước chỉnh logo đã PASS. Cần kiểm tra lại hành vi logo/top ở phiên thật; không lấy timeout này kết luận đã biết nguyên nhân.

### Header còn thiếu yêu thích/tải xuống — 2026-10-14

- Người dùng phản hồi menu5mục đãcó nhưng trang khác vẫnthiếu2nútYêuthích/Lịchsửtảixuống bênphải, làm menu dịch so với home. Không gọi sửa5nav trước đã đồngbộ toànheader.
- Đã sửa cảhai nhánhdesktop/mobile Header.tsx: ImagePageSidebar variantheader không còn chỉrenderởpathname'/'. Giữgateauth, count, dialogfavorites vàdownloadlinkhiệncó; khônggiảlậpcount hoặc đổiendpoint. Sidebar trangkhác vẫngiữchứcnăng.
- Testmembermock phát hiện menumobile320 ngoài viewport trênroutekhác: áp dụng quy tắc thu gọn đãcó của home cho PHOTOCLOUD-header ởmọiroute<=768. Cácshortcutbooking/bell duplicate đượcẩntrênheadernhỏ; chức năng ởbottomnav/menu hiệncó vẫngiữ, khôngthayluồng/handlers. Chưa gọi đây là kiểmtra cảmứngthật.
- Buildlầnđầu Vitehoànthành nhưng NodeWindows assertionUV_HANDLE_CLOSING exit1; khôngghi passlượtđó. Rerunbuild sauPASS. Lượtmemberfixture đangxácnhận, chờuserkiểmtracụmnút vàvịtrímenu.
- Xácnhận cuối productionmembermock320/390/1024/1440 PASS; desktopExplore vàhome cócụm2shortcut, navkhôngoverlaplogo/actions ở1024/1440, menumobilethao tácđược; theme/booking/ảnh/logo-topregressionPASS. Rawfrontend/site-theme-member-checks.json. Đây là authfixture với mọirequestintercept, chưa chứngminh phiên đăngnhập/route/accountthật đãđạt. Sidebar vẫnchiếmvịtrí ởroutekhác, không tuyênbố mọix-coordinateheadergiốnghệtviewporthome.

### Cao độ CTA gói, menu header và logo/top — 2026-10-14

- Người dùng phản hồi Chọn gói lệch caođộ giữa4card (khác lỗi iconxuốngdòng đãsửa), nút VềPhotoCloud chưa rõ, menuheader home/routekhác thiếuKhámphá/Câuchuyện, bấmlogotừroutekhác khôngvềtop, headertrongsuốt chồngảnhslidekhi cuộn.
- SửaHomePageLayouts:cardflexcolumn, bodyflex1 + grid5rows với mô tảrow1fr; CTAởhàngcuối để4card cùngbaseline dù mô tảdài/ngắn. Giữgridbreakpoint và nội dung/giá/handler.
- Dark ghostCTA thêm nền#343027 và border#8A8578; không chỉ dựavàomàuchữ. Nútprimaryvẫngiữlightfilledđể phâncấp.
- Headerdesktop dùng chung5linkKhámphá/Góichụp/Bộsưutập/Câuchuyện/Vềstudio ởhome vàroutekhác; aria-current theođườngdẫn. Đồngbộgap và quy tắc gọn769–1200px. Không xoásidebar hay đưa mọi tácvụ củasidebar vàoheader, không đổi mobilebottomnav.
- Bấmlogo khôngmodifier: nếuởhomecuộntopinstant; từroutekhác ghi refrequest, navigatehome rồi layoutEffect vàrAF vềtop. Chỉconsume requestlogo, không reset mọi route/POP hoặc clear scrollsnapshot; Ctrl/Meta/Shiftclick giữhànhvimởtab. Header không bịẩn tronglượt này.
- ImmersiveHomeChrome:trongsuốt/chữtrắng chỉ ởscroll<=12px vàđầuhero; saucuộn headernềnđặc theo theme, không đểmenu trắngnổi trênảnh đang đi qua. **Header vẫnfixed vàchiếm dải trênviewport**, không tuyên bố đã bỏ mọi chồnglấn hìnhhọc. Nếumuốn slidekhông bịheaderche tuyệtđối, cần quyếtđịnh layoutheaderin-flow/sticky riêng, không âmthầm đổi toànhero.
- Production mock320/390/1024/1440 PASS: menu5link; từExploređãcuộn bấmlogovềhome scroll0; headernềnđặc saucuộn; CTA4carddesktopbaselineđều; spacing/theme/modalbooking/ảnhregression PASS. Darkcontrols5width cảsáng/tối PASS, ESLintHeader/ImmersivePASS. BuildPASS, warningcũcòn. Rawsite-theme-checks/dark-controls-checks vàscreenshotQA.
- Lượt xácnhận cuối bổsungassertlogo/nav/actions khôngoverlap ởdesktopguest1024/1440 PASS. Testscroll chờ màuheader ổnđịnh thay đọc giữa frame/transition; không thêmwait/timer vàoapp.
- Chưa thử logged-inheadergeometry/tấtcảroute, modifierclick/tabthật, phonehardware, paint/filmstrip khi cuộnnhanh vàrefreshhome; cần nghiệmthu người dùng. Lỗi mởmodalảnh vẫnCHƯA SỬA XONG; không lấy cácfixture này để đóng hiệu năng hoặc auditheader toànsite.

### Nút/icon/avatar dark và mũi tên gói — 2026-10-14

- Phản hồi ảnh người dùng: nút Nhận báo giá trắng nhạt khó đọc; icon highlight trắng trên đồng; nút phụ thiếu phân biệt nền; avatar fallback chữU chìm; mũi tên Chọn gói xuốngdòng. Ảnh lặp avatar/CTA là cùng nhóm vấn đề, không tính thành nhiều bug riêng.
- Đã sửa dark-surfaces.css: secondaryCTA/hero-secondary nền#343027, chữprimary, border#8A8578; hover#40392E/borderđồng. Ghost giữ chữsáng và hover surface rõ. Highlighticon dùng chữ/icon#1B1B19 trên nềnđồng. Avatarfallback nềnđặc#40392E/chữ#F2EEE7, outline1px, kể cảhover/active. Không filter/đổi ảnhavatar thật hoặc font/kíchthước.
- HomePageLayouts.css: nút Chọn gói inline-flex, align-items:center/gap8px/nowrap, SVGkhôngco; maxwidth100%. Áp dụng sáng/tối vì lỗi xuốngdòng là layout, không phải màu. Không đổi giá/nhãn/clickhandler và không khẳngđịnh bookmark đãlưu thật.
- Browser CSSproduction fixture320/390/768/1024/1440, sáng/tối: arrow/textcenter lệch<2px, khôngoverflowbutton; darktext/icon đạtngưỡng tươngphản4.5/3:1 ởnormal/hover/focus. Avatar là markupfallback đại diện dùngCSSthật, không phải phiên userđăngnhập. Raw frontend/dark-controls-checks.json; scripts/check-dark-controls.cjs.
- BuildPASS, warningcũ còn; regressionproduction home/Explore/booking/photo/theme mock4width PASS. QA screenshotgói1440 đãxem: Nhận báogiá rõ và mũitênChọngói cùnghàng. Chờuserxácnhận cácnút/avatar thật; chưa cover mọi route/userảnhhỏng/admin/disabled/forcedcolors. Modal ảnh vẫnCHƯA SỬA XONG.

### Phân biệt nền HeroBooking và gói chụp trong dark — 2026-10-14

- Người dùng xác nhận dark chữ/nút trang chủ/Explore/booking ĐẠT, refresh giữdark ĐẠT, trở vềsáng bìnhthường ĐẠT. Xác nhận trong phạm vi đã thử, không đóng toàn bộ dark/admin/profile.
- Phản hồi mới: HeroBooking và gói chụp gần cùng nền nên khó nhận section, khác với testimonial/FAQ. Đã sửa chỉdark: hero giữbg-secondary#1F1C16; gói chụp thành dải fullwidthbg-primary#16140F, card giữbg-card#25221C.
- Giữ content gói max1296px vàgutter16px bằng padding của dải thay widthsection constrained; bỏmarginbottomhero26px và chuyển khoảngcách vào paddingtopgói58px để tổng vịtrí heading banđầu gần như giữnguyên. Không đổi lighttheme, giá, ảnh, CTA hoặc cấu trúc/breakpointgrid.
- QA ảnh cũng thấy selector dark cũ không trúng markup giá/mô tả PackageCard; bổ sung home-package-body > strong và home-package-summary cho chữ rõ, không đổi giá/nội dung.
- Production CSS/React vớiAPIgiả tại320/390/1024/1440 PASS: màuhero/gói khác nhau, dải rộngbằngparent, contentwidthmin1296/parent-32 không đổi, khôngscroll ngangsection. ScreenshotQA theme-packages-*.png và site-theme-checks.json; buildPASS, warningcũ còn. Chờ người dùng xác nhận ranhgiới section rõ hơn trênapp thật; không sửa tiếp motion hoặc độ trễ modal ảnh.

### Xác nhận A04 và bổ sung Sáng/Tối — 2026-10-14

- **Người dùng xác nhận ĐẠT:** chữ phụ/form/đặt lịch dễ đọc; chữ nhấnHeroBooking rõ/đầy đủ; mobile390 không tràn, CTA đặt lịch/xem gói dùng được. Chưa xác nhận dark vì trước đó không có lựa chọn dark hoạt động. Không dùng kết quả sáng suy ra tối đạt.
- Theo yêu cầu, thêm **hai lựa chọn Sáng/Tối**. Mặc định sáng khi chưa có lựa chọn, giữ brand và ảnh chụp không invert/filter. Desktop: icon Moon/Sun44px trongheader; mobile: mục trongmenu, không thêm một icon vàoheader chật.
- siteTheme.ts + ThemeToggle dùng DOM classdark/dark-theme làm snapshot qua useSyncExternalStore, event đồng bộ các nút, storageevent đồng bộtab; lưu localStoragekeytheme, storage bị chặn vẫn đổi được trongphiên. index.html áp dụngclass lựa chọn trướcCSS/app để giảm nháy sáng khi reloaddark. Không thêm timer/loading.
- Thay ThemeToggleadmin cũ ép light/xoá dark bằng re-export control dùng chung. Không thay quyềnadmin/settings/API. Gỡ CSSdark blanket tô mọidiv/span/link, thay scope surface/roles; dark-surfaces.css nối tokenstudio với darktheme và bổ sung mainpublic home/header/Explore/photo/booking/footer/menu.
- Build PASS, warning chunk/Zod/import còn; ESLint control/helper PASS. Production bundle thật vớiAPI/ảnhmock:320/390/1024/1440 toggledark, reloadgiữdark, Explore/hero/photo/booking có nền tối; đổi sáng/reloadgiữsáng; ảnhfilter không đổi; khôngpageerror. Raw frontend/site-theme-checks.json và screenshots theme-*.png. Không dùng mock để kết luận mọi luồng/tài khoản thật đã kiểm tra.
- VòngảnhQA đầu phát hiện logo/contact/footerảnh và một sốcard/text hardcode; đã sửa cùnglượt, xác nhận lại. Chưa test đầyđủ profile/admin/settings/authenticatednotifications/signedimages, cácbước booking2–4, toànbộcollections, storagebịchặn/cross-tab trongbrowser hoặc theme-colorfilmstrip. **Dark mới chờ người dùng nghiệm thu**, A12khôngđóngtoànsite.
- Lỗi mởmodalảnh vẫn **CHƯA SỬA XONG**. A05bookmarkpersistence vẫnchưađổi. A04 cácđiểm sángđãđượcxácnhận, dark/cácnềnảnhkhác vẫncòn kiểmtra.

### Quy trình kiểm tra mobile riêng

- Có bước riêng: **nhóm7 adapt/responsive**. Gom kiểmtra đầyđủ thànhmộtđợt saunhómsửa, không bắtngười dùng chạy lại mọi desktop/mobile saumỗimàu/icon nhỏ. Codex vẫnchạy matrixtựđộng desktop/mobile khi sửa sharedCSS/component và báogiớihạn.
- Mobile cơbản:320/390px dọc,768px tablet; thêm landscape, bànphímảo, safearea và cảmứng trênmáythật. Kiểmtra header/menu/bottomnav, CTA/formbooking/gallery/ảnh/modal, Back/refresh và scroll. Mụctiêu: đầyđủchứcnăng, khôngtràn/cắt/co méo trướcpolish. Desktop chốt1024/1440riêng.
- Khi cópatch nhỏ, user chỉ xácnhận màn hình/tác vụliênquan; kiểmtra hồi quy toànluồng vào cuối nhóm hoặc sau sửa nguy cơcao (navigation/auth/modal). Không bỏmobile hoặc gọi viewportgiảlập là testđiệnthoạithật.

### A04: chữ phụ và chữ nhấn HeroBooking — 2026-10-14

- Tiếp tục A04 sau khi icon bookmark được người dùng xác nhận đạt. Không sửa A05 persistence, A06 focus chuông, URL/modal, giá hoặc nội dung.
- Đã sửa theme.css: text-muted sáng#8A8A82 -> #6B6B66 (màu secondary sẵn có); tối#8A8578 -> #AAA493. Token dùng chung nên không coi chỉ trang chủ được ảnh hưởng; các route/modal dùng token cần kiểm tra trực quan tiếp.
- HeroBooking.css: eyebrow12px dùng màu đặc#6B4F20; phần em tiêu đề dùng đồng đặc#865E3B, thay gradient chữ có điểm sáng vàng. Giữ nền, font/cỡ chữ, gạch chân trang trí, spacing và hành vi. Không đổi toàn bộ brandpalette.
- Browser fixture CSS thật và studio tokens từ parserPostCSS:320/390/768/1024/1440. Muted sáng trên3nền chuẩn4.63–5.36:1; tối6.37–7.40:1. Hero eyebrow5.07:1; em cỡ42–68px3.81:1 trên bound tối bảo thủRGB222/210/184 của nền gradient mặc định. Bound là kiểm tra tính toán, không screenshot sampling/pixel từng vị trí thực hoặc mọi theme/custombrand.
- Regression HeroBooking9viewport PASS không clipping CTA/copy; build production PASS, warning cũ còn. Raw frontend/text-contrast-checks.json, script scripts/check-text-contrast.cjs; hero-responsive-after.json cập nhật.
- **A04 ĐÃ SỬA các điểm nêu trên, CHỜ NGƯỜI DÙNG XÁC NHẬN CHỮ.** Chưa tuyên bố tương phản toàn site đạt: chữ trên ảnh/header slide, customaccent, opacity/disabled, forced-colors và các nền thực khác còn cần rà. Dark hero có quy tắc màu riêng trongtheme.css, A12 vẫn mở; không gọi fixture token dark là test dark fullpage.
- Checklist người dùng: chữ phụ/form/booking đọc rõ hơn; phần “theo cách của bạn” vẫn đầy đủ, dễ đọc trên nền studio; mobile390 không tràn, hai CTA vẫn dùng được. Giá/nội dung/chức năng không đổi. Theme tối nếu đang dùng: chữ phụ không chìm hoặc sáng lẫn nền; báo cụ thể route nếu lệch. Modal ảnh vẫn CHƯA SỬA XONG.

### A03 được xác nhận; chuyển A04 — 2026-10-14

- **Người dùng xác nhận icon bookmark ĐẠT** ở nền vàng và trạng thái nền trắng qua hai ảnh. Chỉ nghiệm thu thay đổi tương phản icon của A04, không đóng phần chữ/nền khác. A05 vẫn chưa sửa: bookmark slideshow chỉ state cục bộ, chưa lưu vào tài khoản/bộ sưu tập hoặc duy trì sau refresh.

- **NGƯỜI DÙNG XÁC NHẬN ĐẠT:** Tab tới bookmark giữ slide10s; Shift+Tab tới link header thì autoplay tiếp tục khi Play bật; Pause + rời focus vẫn dừng; Play + rời focus chạy lại. Kết hợp xác nhận trước: reduce/manual chuyển/nội dung đầy đủ, no-preference autoplay và đổi reduce giữa hiệu ứng đều đạt trong các luồng người dùng vừa thử.
- **A03 ĐÃ SỬA + NGƯỜI DÙNG XÁC NHẬN.** Các giới hạn điện thoại thật/hệ điều hành/screen reader vẫn còn, không bắt thử lại mọi mục đã đạt. Modal ảnh CHƯA SỬA XONG, theo dõi riêng.
- Chuyển A04: sửa icon bookmark trắng trên vàng bằng màu tối#161918 đã dùng ở trạng thái saved. Không đổi nền vàng, chức năng lưu, layout/animation; không tự nối persistenceA05.
- Browser CSS fixture390/1440 normal/hover/focus/saved: icon vàng trước1.86:1, sau9.54:1; saved nền trắng17.70:1. PASS so với mức3:1 cho icon chức năng, không phải chứng nhận WCAG toàn site. Raw frontend/bookmark-contrast-checks.json; scripts/check-bookmark-contrast.cjs. Build PASS, warning cũ còn. Chưa kiểm tra forced-colors hoặc phiên app người dùng; các chữ muted/gradient khác trong A04 chưa xử lý.
- Trong14 findings kỹ thuật, A01/A02/A03/A14 đã có xác nhận người dùng trong phạm vi đã thử. Còn10 mục chưa hoàn tất hoặc mới sửa một phần; lỗi modal ảnh theo dõi riêng. Đây không phải tổng số mọi công việc LT/H/C, responsive/auth hoặc polish toàn site.

### Chuyển bước theo yêu cầu — 2026-10-14

- **MỞ MODAL ẢNH: CHƯA SỬA XONG / CHƯA ĐẠT.** Người dùng vẫn thấy URL đổi ngay nhưng modal hiện chậm. Các tối ưu và số đo trước chỉ là cải thiện trong phạm vi thử nghiệm, không phải nghiệm thu. Tạm chuyển sang mục khác theo yêu cầu, không xoá hoặc hạ mức ưu tiên lỗi này.
- Khi quay lại: lấy Performance trace trong đúng phiên đăng nhập và môi trường đang chậm; phân biệt click, đổi URL, dialog DOM, paint và ảnh decode. Kiểm tra dev/production riêng, không thêm loading/timer để che độ chậm.
- Bước đang xử lý: **A03 — reduced motion của TimedCardSlider**. Giữ chức năng, không thêm animation mới hoặc sửa tiếp modal ảnh trong lượt này.

### A03: giảm chuyển động slideshow — 2026-10-14

- **PHẢN HỒI TIẾP:** người dùng xác nhận no-preference + refresh animation/autoplay ĐẠT; đổi reduce giữa hiệu ứng không kẹt và dừng ĐẠT. Tab tới bookmark nhưng slide tiếp tục **CHƯA ĐẠT**; mục rời focus và Pause/Play CHƯA KIỂM TRA vì hướng dẫn chưa rõ. Không đóng A03.
- Sửa bổ sung: phân biệt change tự động với chọn ảnh thủ công; sau await decode phải kiểm tra focus DOM và trạng thái Play hiện hành trước commit chuyển tự động. Mỗi tick kiểm tra focus DOM trực tiếp để không chạy trong khoảng trước cleanup effect. Không chặn chọn ảnh thủ công; giữ chức năng người dùng đã xác nhận đạt. Chờ kiểm tra lại bookmark trên app thật.
- Regression fixture390/1440 PASS; case bổ sung1440 giữ decode ảnh thứ2 tới sau khi autoplay đến hạn, focus bookmark rồi resolve decode: slide01 giữ hơn6.1s, focus bookmark còn đúng, rời focus mới sang02 PASS. Build/ESLint PASS; không chứng minh đây là nguyên nhân duy nhất ở phiên người dùng. Raw slider-motion-checks.json cập nhật.
- Hướng dẫn rời focus: nhấn Shift+Tab nhiều lần tới một nút/link header nằm ngoài slideshow, không cần click/điều hướng; nếu Play còn bật thì chờ7–10s để thấy chuyển tiếp. Pause rồi rời focus phải giữ ảnh; Play rồi rời focus phải tiếp tục.

- **XÁC NHẬN MỚI CỦA NGƯỜI DÙNG:** reduce + refresh: chờ7–10s không tự chuyển ĐẠT; mũi tên/thẻ ảnh đổi không phóng/trượt ĐẠT; tiêu đề/ảnh/nút đầy đủ, không kẹt ĐẠT. Chưa xác nhận riêng viewport mobile trong phản hồi này. Chế độ no-preference, pause/focus/resume và đổi reduce giữa hiệu ứng CHƯA KIỂM TRA; không suy diễn các mục chưa thử thành đạt.

- **ĐÃ SỬA SOURCE + KIỂM TRA FIXTURE; CHỜ XÁC NHẬN APP/THIẾT BỊ THẬT.** Không đánh dấu mọi animation toàn site hoàn tất.
- TimedCardSlider khởi tạo autoplay tắt nếu hệ thống chọn prefers-reduced-motion:reduce. Nút Next/Previous/card đổi ảnh sau khi ảnh sẵn sàng nhưng không chạy hình phóng/trượt/WAAPI. Người dùng vẫn có thể chủ động bật Play; khi reduce, chuyển ảnh tức thời và không chạy thanh timer chuyển động.
- Theo dõi thay đổi preference lúc đang mở trang: bật reduce tắt Play, huỷ opening animation/WAAPI, phục hồi card và background để không kẹt. Tắt reduce không tự bật lại autoplay đã dừng. Đưa ref cập nhật handler vào layout effect thay gán trong render.
- Autoplay tạm dừng khi focus bàn phím ở trong slideshow, tiếp tục khi focus ra ngoài nếu Play còn bật. Giữ cơ chế pause/visibility hiện có; không thay URL, modal ảnh, bookmark persistence, nội dung hoặc bố cục.
- Browser fixture dùng component/CSS thật và ảnh nội bộ, tại390/1440: reduce không tự đổi sau6.1s; Next đổi ảnh không opening layer/animation; focus giữ slide hơn6.1s; rời focus autoplay đổi; bật reduce giữa opening huỷ được và trở về Play. PASS. Raw frontend/slider-motion-checks.json, script scripts/check-slider-motion.cjs.
- Production build PASS, warning chunk/Zod/import còn. Chưa test preference Windows/iOS/Android thật, touch thật, refresh toàn app/API ảnh thật hoặc focus/hover các browser khác. Không dùng build để kết luận hết lỗi.
- Cách người dùng kiểm tra: DevTools Rendering -> Emulate CSS media prefers-reduced-motion:reduce; refresh trang chủ, chờ7s (không tự chuyển), bấm mũi tên/card (không phóng/trượt). Đổi no-preference, bật Play rồi focus trong slider (không tự chuyển); focus ra ngoài (tiếp tục). Bật reduce giữa chuyển slide (không kẹt). Modal ảnh vẫn CHƯA SỬA XONG.

### Độ trễ sau URL: probe đúng localhost5173 — 2026-10-13

- Người dùng xác nhận **URL đổi ngay nhưng modal chờ lâu**. URL /explore -> /photos/untitled-ID là điều hướng ảnh hợp lệ, không chứng minh document reload; phải giữ URL riêng cho share/refresh. Không đổi sang URL ẩn để che độ trễ.
- Đã truy cập được đúng dev server localhost5173 trong ảnh. Edge phiên mới chưa đăng nhập; chặn mọi method ghi và Socket.IO, không increment view hoặc gửi dữ liệu thật. API GET/ảnh CDN thật. Script frontend/scripts/probe-live-photo.cjs, có profiler từ trước click tới dialog DOM; số dialog DOM không phải thời điểm paint pixel.
- Lượt bình thường: URL đổi khoảng0.6ms, modal DOM khoảng170–231ms, ảnh ready khoảng838ms ở lượt có số đo; chưa tái hiện mức nhiều giây trong phiên user. Không giả lập tài khoản của user, không gọi đây là số đo logged-in.
- CPU6x trên dev tái hiện: modal DOM khoảng2545ms/2062ms trong hai lượt trước, URL khoảng5ms. Profile có JSX development runtime và long task render trước dialog966–1438ms; không phải API detail bị await trước modal ở lượt này. Không kết luận toàn bộ chậm do CPU hoặc mọi thiết bị đều như mô phỏng.
- Đã sửa thêm: ImageRelatedGrid dùng IntersectionObserver root là scroller trang ảnh, margin300px; dựng các card liên quan khi gần viewport, không trì hoãn modal để dựng cả gallery dưới fold. Giữ vùng minheight400px và fallback mount ngay khi không có observer; key theo ảnh để ảnh mới có vòng đời riêng. NoFlashGrid click chỉ gọi điều hướng, bỏ preload regularWebP dư khi ImagePage dùng AVIF. Preload gallery/hover hiện có không bị xoá.
- Sau sửa một lượt CPU6x dev: modal DOM1469ms, long task ngay trước dialog293ms. **Còn chậm ở CPU mô phỏng, chưa đóng lỗi.** Các lượt đo network/CPU không hoàn toàn giống nhau nên đây là quan sát, không cam kết giảm tỷ lệ cố định hay ngang Unsplash.
- Production bundle thật với API/ảnh mock giữ3000ms: mở surface desktop64–79ms, mobile57–59ms; cuộn tới gallery liên quan hiển thị và Escape/Back giữ vị trí PASS, không pageerror. Raw frontend/photo-open-deferred-grid.json. Build PASS; warning chunk/Zod/import còn. Khác biệt môi trường dev/production cần giữ riêng, không dùng mock chứng minh phiên user hết lỗi.
- Evidence live: frontend/photo-live-probe-6.json (sau sửa), frontend/photo-live-probe.json (lượt bình thường trước; script sau đổi tên output theo CPU). Chưa test logged-in, điện thoại thật, restore vào sâu gallery liên quan và ảnh lỗi trong gallery này. Cần trace đúng phiên user nếu vẫn chờ nhiều giây ở CPU bình thường; giữ checklist hiệu năng mở.

### Modal vẫn chậm: tái hiện production và bỏ tải module tại click — 2026-10-13

- Người dùng xác nhận thay đổi prefetch trước vẫn chưa đạt. Không đánh dấu hết lỗi từ tối ưu chunk; nhật ký trước là lịch sử, không còn mô tả chiến lược code hiện tại.
- Đã tái hiện bằng **bundle production thật** trên Edge, API/ảnh giả và intercept toàn bộ request (không gọi backend/ghi DB). Script frontend/scripts/measure-photo-open.cjs: mở Explore, bấm ảnh ngay khi gallery hiện. Ảnh regular cố ý giữ3000ms; ở nhánh mạng module chậm, ImagePage JS giữ2000ms.
- **Trước sửa:** desktop1440 click tới modal74ms khi module không bị trì hoãn; **2436ms** khi module giữ2000ms. Chứng minh lazy module là một khoản chặn mở modal lần đầu; không chứng minh đây là toàn bộ nguyên nhân trên máy người dùng/CDN thật.
- **Đã sửa:** App import ImagePage trực tiếp thay React.lazy. Xoá shared loadImagePage và prefetch effect ở NoFlashGrid vì không còn cần. Code xem ảnh được tải cùng app, không có request module ImagePage phát sinh khi click; EditImageModal/CollectionModal vẫn lazy riêng. Không thêm skeleton/spinner/timer hoặc chờ ảnh decode trước mở; giữ nguyên modal/history/refresh/mobile semantics.
- **Sau sửa:** desktop1440 **84/77ms** ở hai nhánh module delay0/2000; mobile390 **68/67ms**. Ảnh lớn vẫn chưa complete khi surface hiển thị, không có pageerror trong bốn case. Escape desktop/Back mobile trả Explore đúng scroll trong cả bốn case. Đây là số đo fixture local, không phải độ trễ Internet thực hoặc benchmark Unsplash; cũng không đo tốc độ boot app.
- Đánh đổi: main JS production **918.54 -> 966.04KB**, gzip **293.64 -> 308.27KB**, tăng khoảng14.63KB nén ở lượt tải đầu. Route xem ảnh là hành động chính nên ưu tiên có code sẵn khi gallery thao tác được; không quảng cáo bundle toàn site đã nhỏ hơn.
- Raw: frontend/photo-open-before.json và frontend/photo-open-after.json. Build PASS, warning chunk/Zod/import vẫn còn. API/auth/signed URLs/ảnh thật và chỉnh sửa/bộ sưu tập chưa được kiểm chứng bằng fixture này; refresh photo standalone chưa test lại trong lượt này.
- **Chờ người dùng:** refresh bản đang chạy/bản production mới, bấm ảnh chưa xem ngay rồi bấm ảnh tiếp theo. Xác nhận khung modal có mở tức thì dù ảnh chưa nét. Nếu còn chậm, cần waterfall/Performance trace trên đúng máy và URL đang dùng; không tiếp tục quy mọi chậm cho bundle hay khẳng định ngang Unsplash.

### Xác nhận trang ảnh và tối ưu lần mở modal đầu — 2026-10-13

- **NGƯỜI DÙNG XÁC NHẬN ĐẠT:** mobile hết khoảng trắng trên ảnh; nút Trở về và Back trình duyệt giữ vị trí; ảnh tải chậm không kéo thông tin/footer lên. A14 đã được xác nhận trong các luồng vừa thử. Không yêu cầu kiểm tra lại ba mục này nếu không xuất hiện hồi quy.
- **CHƯA ĐẠT:** desktop mở ảnh chưa xem vẫn chậm. Giữ mục hiệu năng này mở, không coi thay đổi trước đã giải quyết xong.
- Phát hiện ở source: route ImagePage lazy chỉ tải khi mở lần đầu; import tĩnh kéo cả EditImageModal/CollectionModal vào đường mở ảnh. Modal chung Suspense với gallery kích hoạt PageLoader/global loading trong lúc tải module; overlay có minimum display/fade riêng. Không phải bằng chứng API/CDN chậm bao nhiêu giây.
- Đã sửa: shared loadImagePage dùng cùng promise cho lazy route/prefetch và reset khi import lỗi. Gallery có ảnh và handler điều hướng thì prefetch code xem ảnh, không fetch API hay ảnh gốc thêm. Modal có Suspense riêng để không che gallery; các modal chỉnh sửa/bộ sưu tập lazy riêng và chỉ mount khi mở. Không đổi URL, history, refresh hoặc logic restore scroll; không thêm timer/loading che độ chậm.
- Production bundle đo trước/sau: ImagePage JS **100114 -> 46936 byte** (giảm khoảng 53%); CSS **48676 -> 30576 byte** (giảm khoảng 37%). Đây là kích thước riêng chunk, không phải tổng tải toàn ứng dụng hoặc thời gian click. EditImageModal/CollectionModal vẫn có thể được tải bởi route khác cần chúng.
- Kiểm tra Edge headless fixture React tại390/1440: import giữ pending350ms, gallery vẫn hiển thị, không mount global fallback, dialog xuất hiện khi import resolve. Script frontend/scripts/check-photo-route-loading.cjs; đây là fixture kiến trúc Suspense, không full ImagePage/API/CDN.
- Regression fixtures Back/scroll tại390/768/1440 và CSS spacing/footer tại390/440/768/1024/1440 PASS. Build production PASS, cảnh báo chunk/Zod/import cũ còn; ESLint không có error, cảnh báo hiện có trong ImagePage chưa sửa ngoài phạm vi.
- **Chờ xác nhận desktop app thật:** refresh rồi mở ảnh chưa xem, so với lần mở tiếp theo; phân biệt thời điểm khung modal xuất hiện và ảnh nét tải xong. Chưa đo click-to-modal thực, chưa kiểm tra chức năng chỉnh sửa/bộ sưu tập sau lazy-split hoặc điện thoại cảm ứng thật. Không kết luận hết chậm từ build/fixture.
- Probe đọc-only tới127.0.0.1:5175 ngoài sandbox bị connection refused trong môi trường kiểm tra này; không khởi động lại/đổi server của người dùng. Vì vậy chưa có số đo thời gian mở modal app thật ở lượt này.

### Phản hồi A14 và trang ảnh: khoảng trắng/tải/Back — 2026-10-13

- Người dùng xác nhận Escape trở về đúng vị trí, refreshExplore vềđầu, refreshảnh standalone và desktopclosemodal giữvịtrí. **BrowserBack chưa được xác nhận riêng** vì người dùng thửEscape; trước đó trangảnh không có núttrởvề rõ.
- Mới: khoảng trắng lớn desktop/mobile, clickảnh chờ lâu, footer nhảy khi ảnhchưa tải. Ảnhmobile đầu còn filterExplore, nên kiểmtra cảgridExplore và ImagePage, không gán tấtcả cho cùngcomponent.
- Source: NoFlashGrid mobilepaddingtop158px còn bù header/search cũ; ImagePage cộngmargin66/96px và shellpadding32 trong khi appbody đãreservetheheader. DesktoponClick awaitpreloadImage trước navigate là khoản chờ thực.
- Đã sửa: Exploregrid scopedpaddingtop0; standaloneImagePagecontainer margin0 và pagepadding0, giữmodaldesktop margins riêng. Không xoá guthai bên ảnhcontain là khônggian đúngtỷlệ.
- Desktop clicknavigate trước rồi preloadbackground, không xoácache/preload. ImagePage khởi tạo từ ảnh trong routeState khiIDkhớpslug, giữframe/preview trướcdecode, tránhrenderloadingrỗng mộtvòng khi đã códata; directURL/API vẫn cófetch nhưtrước. Không thêm minimumwait/spinner để chechậm.
- Thêm buttonArrowLeft44px, label/title'Trở về' trongtoolbar ảnhstandalone, dùnghandleClose hiệncó để giữhistory. Không sửa modalclose/refresh semantics.
- Fixturecheck-image-spacing.cjs tại390/440/768/1024/1440: toolbarngay sau shellheader80 giả lập, paddinggrid0, footerposition không đổi khiimgsrc đượcgán; dùngCSSthật/markupđại diện. Không phải ảnhCDN/API/Reactfullpage hoặc đoLCP.
- BuildPASS, warningcũ còn. Rawfrontend/image-spacing-checks.json. Chưa đo click->route/decode thực hoặc mọi malformedrouteState; chưa xác nhậnfooterapp thật hếtjump.
- Chờuser: BrowserBack và nútTrởvềmới đúngvịtrí, whitespaceExplore/standalone/modal, clickảnhcold/cache, footerthrottleảnh, portrait/landscape tỷlệ đúng; không bấm lưu/tải/gửibooking để test.
- A14 ởtrạngthái**đã sửa, xác nhận mộtphần; chờBrowserBack/nútBack**. Các lỗi mới ởtrangảnh**đã sửa source/fixture, chờapp thật**. Không đóngtoànbộ mụcresponsive/performance.

### A14: mobile Back về Explore — 2026-10-13

**ĐÃ SỬA, CHỜ NGƯỜI DÙNG XÁC NHẬN TRÊN APP.** Không đánh dấu tất cả navigation/refresh/desktop-modal đã nghiệm thu.

- Explore mobile lưu window scroll trước mở ảnh, keyed theo entry location key/path/search/hash trong memory store imagePageScroll hiện có. Lưu activeCategory cùng entry với giới hạn50entry; search filters tiếp tục dùng store hiện có, không đổi API/query semantics.
- Explore sử dụng hookrestore đã có khi navigationPOP và imagesready, quan sát chiều cao đến khi khôi phục được. User wheel/touch/key tiếp tục ưu tiên và hủyrestore. Hook ref mở rộngHTMLElement để mainExplore dùng được; không thay logic scroll nội bộImagePage.
- Snapshot không ghi local/sessionStorage; document mới/refresh không có snapshot này. Entry mới khác key không lấy vị trí cũ. Không sửa reloadLocationKey/App hoặc modaldesktop routing.
- Files: frontend/src/pages/ExplorePage.tsx, frontend/src/hooks/useImagePageScrollRestore.ts. Không sửaA03 hoặc loadmoreH09 trong lượt này.
- Fixture frontend/scripts/check-explore-return.cjs dùng scrollstore/hook thật + MemoryRouter và chiều cao giả: Back sau delayedcontent về4200px, entrymới về0, freshdocument về0 tại390/768/1440 PASS. Đây không phải fullExplore/API/ảnh thật hay testreloadbrowser thật.
- Evidence: frontend/explore-return-checks.json; productionbuildPASS, warningcũ vẫn còn. Không gửi dữliệu hoặc mở sessiongiả trong app thật.
- ESLint ExplorePage/useImagePageScrollRestore PASS; đã bỏ importt không dùng có sẵn trong fileExplore.
- Chờ: người dùng Back thật, núttrởvềtrênảnh, filter/category giữđúng, refreshExplore/ảnh, modaldesktop close, điệnthoại/throttle/layoutshift và loadmore thực. Nếu kết quả khôngđúng phải giữA14mở.

Kiểm tra thủ công: mobile390/440 -> Explore -> cuộn tới ảnh dễ nhớ -> mởảnh -> BrowserBack và nútBack trênảnh -> phải về đúng vị trí. Làmlại từ vịtríkhác; refreshExplore vẫn vềđầu; refreshtrangảnh vẫn là ảnhriêng; desktop mở/đóngảnhmodal giữvịtrí và mởảnhmới bìnhthường. Không cần submitbooking hoặc thao tác lưu/tải để test.

### Cập nhật mới nhất: xác nhận sửa và WebSocket — 2026-10-13

- **Người dùng xác nhận các lỗi vừa phản hồi đã được sửa hết**, gồm HeroBooking/gửi yêu cầu và các mục kiểm tra trước đó. Đây là xác nhận ở phạm vi người dùng đã thử, không đánh dấu toàn site/mobile thật/auth edge cases hoàn tất.
- A01/A02 và bước cuối booking: **ĐÃ SỬA + ĐƯỢC NGƯỜI DÙNG XÁC NHẬN**. Các giới hạn fixture/thiết bị thật/screen reader vẫn ghi trong nhật ký. Không tự ghi đã đổi chiều cao modal vì code chưa có thay đổi đó.
- **W01 — 🟡 VÀNG — lỗi kết nối WebSocket cổng3001:** nguồn chọn URL không nhất quán. Axios development dùnglocalhost3000/api, hookWebSocket ưu tiênVITE_API_URL nên có thể dùng3001. BackendSocket.IO gắn cùng HTTPserver, không có serverSocket riêng cần3001 trong đoạn triển khai đã đọc.
- Đã sửa useWebSocket dùng`api.defaults.baseURL` qua utils/socketServerUrl.ts, lấy origin củaHTTPbackend; relative/APIproduction đúngorigin, không dùng`/api` làm Socket.IO namespace. Không đổi .env, token/auth, retry hoặc giấu log.
- Previewlocal bổ sung proxy`/socket.io` vớiws:true tới cùngbackend3000, tương ứng proxy`/api` hiện có. Đây không phải thay đổi proxy/deploy hosting thật.
- Test scripts/check-socket-server.cjs:6URLcases PASS; authenticatedmock Socket.IO websocket connection vànotification PASS. Servermockcổngtạm được đóng, không dùng DB hoặc tài khoản thật. Raw:frontend/socket-server-checks.json.
- Buildproduction PASS, còn warningcũchunk/Zod/import. Lần sandbox network bịEACCES, test ngoài sandbox sauapproval PASS; không coiEACCES làbugweb.
- **W01 ĐÃ SỬA + NGƯỜI DÙNG XÁC NHẬN HẾT LỖI.** Không mở lại lỗi chọn cổng này nếu không có bằng chứng mới; backend offline/auth/CORS khác vẫn là phạm vi kiểm tra riêng.
- **Bước tiếp theo đề xuất: A14 — Back từ ảnh về Explore trên mobile phải khôi phục vị trí.** Hoàn thiện nhóm modal/history trước; sau đó A03 reduced motion, A04 tương phản và A06 focus indicator. A05 bookmark cần chốt đối tượng lưu trước khi nối persistence.

### Xác nhận của người dùng và sửa tiếp — 2026-10-13

- **Người dùng xác nhận ĐẠT:** tiêu đề/mô tả/hai CTA studio; xem được nội dung và không body-scroll ngang; focus Tab/ShiftTab trong booking; Escape và nút đóng trả focus, không nhảy scroll.
- **CHƯA ĐẠT:** gallery HeroBooking còn tràn/co méo theo ảnh người dùng. A01 không được đóng vì fixture pass. Modal chiếm nhiều màn hình là phản hồi usability còn mở; chưa thay chiều cao trong lượt này.
- **CHƯA ĐẠT bước cuối:** người dùng thấy HTTP400 và generic English message. Console WebSocketlocalhost3001 không chứng minh nguyên nhân POSTbooking400. Phải kiểm tra request/response riêng, không sửa endpoint/quyền từ ảnh console.
- BackendcreateBooking có validation phone>=7, emailregex; ảnh cóphone`fdsa`, là nguyên nhân phù hợp cho400, chưa xác nhận response cụ thể. Không nới validation hoặc coi request bị từ chối là serverhỏng.
- Đã sửa BookingModal: validationcontact trước đổi bước/gửi, chặn submit khi loading; tách key của Next/Submit và preventDefault. Fixture đã phát hiện clickNext cuối có thể đổi DOMtype thànhsubmit và submitngay; sau sửa tới summary mà không gửi. Đây là lỗi mới được tái hiện trong component fixture.
- Đã sửa lib/utils.getErrorMessage: ưu tiên messagebackend kể cả AxiosError instanceofError; HTTP không cómessage dùngfallback ngữcảnh, không hiện câu kỹ thuật400. Regressionhelper kiểm tra hai nhánh PASS. Helper dùng chung nên cần regression các caller khác, chưa coi fullsite đã kiểm tra.
- Đã bổ sung HeroBooking: inline-sizecontainment cho marquee, width/max-width100 cho copy/visual, width/min-width cho grid/card. Fixture thêm440x956 giốngảnhuser và kiểmtraaspectratio4:3 mobile/tablet; PASS9viewport. Chưa xác nhận galleryapp thật hếttràn/méo.
- Fullapp probe ngoài sandbox tới5175 bịconnectionrefused trong lượt này. Không ghi passapp từ fixture, không thay `.env` hay WebSocketconfig. Không gửibooking hoặc ghiDB để kiểmtra.
- Evidence: hero-responsive-after.json và booking-focus-checks.json cập nhật; bookingfixture ở5width kiểmtra phonefdsa bịchặn, contacthợp lệ tới summary, focus/Escape/closevẫnPASS.
- Cần tiếp: xác nhận gallery với CSS/font/dữliệu app thật; đánh giá modalheight riêng; đọc response400 nếu validcontact vẫnlỗi; WebSocket3001 là checklist riêng. Giữ các kếtquả người dùng pass, không yêu cầu kiểmtra lại toànbộ vôích.

Cập nhật tổng hợp: 2026-10-13. Đây là **file theo dõi duy nhất** ở gốc dự án. Lượt tổng hợp chỉ chỉnh tài liệu, không sửa website, không chạy lại QA/build và không nâng trạng thái cũ thành đã nghiệm thu.

### Cách đọc và cập nhật

**Màu ưu tiên:** 🔴 **ĐỎ: cần sửa gấp** (hoặc kiểm chứng sớm nếu mới là rủi ro nguồn); 🟡 **VÀNG: trung bình**; 🟢 **XANH: thấp / làm sau**. Màu chỉ mức ưu tiên, không phải đã sửa hay chưa, và xanh không có nghĩa pass. Giữ chữ đi kèm để không phụ thuộc vào màu hoặc trình đọc Markdown.

- **ĐÃ CÓ**: đã tồn tại trong tài liệu/code; không đồng nghĩa đã hoạt động đúng.
- **ĐÃ KIỂM TRA**: có bằng chứng trong phạm vi cụ thể; vẫn phải xem giới hạn.
- **ĐÃ SỬA, CẦN KIỂM TRA THÊM**: thay đổi đã thực hiện, chưa đủ bằng chứng cho mọi thiết bị/môi trường.
- **CÒN LỖI / CHƯA SỬA**: lỗi đã ghi nhận, chưa được đóng.
- **CHƯA KIỂM TRA**: chưa đủ bằng chứng; không được đánh dấu pass.
- **CHỜ XÁC NHẬN / ĐỀ XUẤT**: cần quyết định sản phẩm; chưa được tự triển khai.
- Checkbox `[x]` và tỷ lệ 100% trong phụ lục cũ chỉ là trạng thái lịch sử của tác giả tài liệu đó. Bảng hiện tại ở đầu file có ưu tiên cao hơn. Không coi việc file tồn tại, build qua, hoặc component từng tối ưu là đã hết lỗi.
- Sau mỗi đợt sửa, cập nhật trạng thái, file/code bị thay đổi, cách kiểm thử, kết quả desktop/mobile, phần chưa thử và ngày. Không tạo thêm báo cáo theo dõi song song.

### Mục lục

- [Ưu tiên thực hiện](#priority)
- [Trạng thái các yêu cầu](#requests)
- [14 lỗi kỹ thuật đang theo dõi](#issues)
- [Kết quả đã có và phần chưa kiểm tra](#verification)
- [Hiệu năng đã sửa và còn lại](#performance-status)
- [Quyết định sản phẩm và tính năng mở rộng](#decisions)
- [Audit responsive toàn site: chức năng trước, làm đẹp sau](#responsive-audit)
- [Phần 8: phân tích bố cục và typography](#layout-type-analysis)
- [Phần 9: trạng thái, lỗi và phục hồi](#harden-analysis)
- [Phần 10: nhãn và câu chữ giao diện](#copy-analysis)
- [Phần 11: phương án thay thế và bảng ưu tiên màu](#generate-analysis)
- [Phần 12: motion và nhật ký bắt đầu sửa](#motion-analysis)
- Bối cảnh sản phẩm và bằng chứng: các mục Platform đến Verification Update bên dưới.
- Phụ lục hiện hành: DESIGN, frontend-audit, frontend-performance, frontend-critique (nội dung đầy đủ được gộp vào cuối file).
- Phụ lục lịch sử: checklist, inventory, handoff, kế hoạch responsive/performance cũ. Giữ để không mất thông tin; không dùng làm chỉ thị triển khai mới.

<a id="priority"></a>
### Ưu tiên thực hiện

Thứ tự công việc khác mức độ nghiêm trọng P1/P2. Một số lỗi P2 được sửa cùng nhóm P1 vì chung component, không tự nâng mức độ lỗi.

| Thứ tự | Phạm vi | Trạng thái | Tiêu chí hoàn thành |
|---|---|---|---|
| 1 | 🔴 ĐỎ — Responsive studio, CTA, gallery, header và modal | CHƯA SỬA đầy đủ | 320/390/768/1024/1440px; nội dung/nút không bị cắt; xem hai phía breakpoint liên quan; không chỉ kiểm tra scrollWidth |
| 2 | 🔴 ĐỎ — Focus booking, Back/close/refresh và scroll ảnh | CÒN LỖI | Focus đúng trong modal, Escape/return focus; desktop/mobile giữ vị trí khi Back/close; refresh ảnh thành standalone; vẫn mở modal mới được |
| 3 | 🔴 ĐỎ — Bookmark; 🟡 VÀNG — collections guest, newsletter | CHƯA HOÀN THIỆN; một phần CHỜ XÁC NHẬN | Lưu thật hoặc nhãn đúng chức năng; collections tuân thủ chính sách được duyệt; đăng ký/liên hệ có kết quả rõ |
| 4 | 🔴 ĐỎ — Session/deadline/mutation; 🟡 VÀNG — loading/empty/error/ảnh hỏng | ĐÃ RÀ NGUỒN PHẦN9; CHƯA FAULT TEST/SỬA | Retry có mục đích, giữ dữ liệu/nội dung đã tải khi có thể; test lỗi có kiểm soát; không che chậm bằng loading |
| 5 | 🔴 ĐỎ — Tương phản/focus/reduced motion; 🟡 VÀNG — vùng bấm/nhãn | CÒN LỖI; mức chứng cứ xem từng ID | Kiểm tra nền ảnh/nền đặc; bàn phím không focus vào nội dung vô hình; nhãn đúng tác vụ, touch targets dùng được |
| 6 | 🟡 VÀNG — Layout, typography và token | ĐÃ PHÂN TÍCH PHẦN8; CHƯA ĐỒNG BỘ | Giữ bản sắc ảnh; phân vai font, thống nhất spacing/radius theo component, không rebrand hoặc đổi giá |
| 7 | 🟡 VÀNG — JS/startup, slider frame cost và hosting/cache | ĐÃ TỐI ƯU FONT; CÒN BACKLOG | Đo production cold/warm trước/sau từng nguyên nhân; CPU/network throttle, tương tác/INP riêng |
| 8 | 🟢 XANH — Generate, animation mới và polish | PHẦN11 CÓ HƯỚNG ĐỀ XUẤT; CHƯA TẠO PREVIEW | Chọn thành phần/hướng trước; xem phương án trước áp dụng; motion từng phần, nội dung visible mặc định, reduced motion |

Sửa thiếu hỗ trợ reduced motion là sửa accessibility hiện có, không phải chờ tới cuối mới làm vì thuộc 'animation'. Trước phát hành phải xử lý các lỗi P1 liên quan, kể cả khi thứ tự nhóm ở trên đặt chúng sau responsive.

<a id="requests"></a>
### Trạng thái các yêu cầu

Giữ số yêu cầu cuối người dùng gửi; danh sách đó không có mục 3 và 6. Audit kỹ thuật/performance vẫn được theo dõi riêng trong bảng.

| Mục | Đã có | Chưa có / còn lại |
|---|---|---|
| 1 init | Bối cảnh từ code, vai trò, ràng buộc, thông tin cần xác minh | Chốt mục tiêu chính, dữ kiện studio/giá/chính sách/khách hàng |
| 2 document | Palette, font, spacing, header/sidebar/gallery/modal; token so với computed UI | Đồng bộ code chưa làm; cập nhật sau mỗi đợt sửa |
| Audit kỹ thuật | 14 findings: 6 P1, 8 P2; vị trí, tái hiện, ảnh hưởng, đề xuất | Không phải đã audit mọi route hoặc đạt WCAG |
| 4 critique | Phân tích home, phân cấp, hành trình ảnh/booking; điểm định tính 20/40 | Hai sub-agent bị giới hạn sử dụng; không có nghiên cứu người dùng thật |
| 5 header | Guest, cuộn qua slide, menu mobile và rà nguồn; không tái hiện ẩn hoàn toàn ở lượt gần nhất | Filmstrip refresh cold/cache, auth thật, hết phiên, mọi route/viewport |
| 7 adapt | Đo năm chiều rộng; xác nhận cắt nội dung ở 320/390/768px | Chưa sửa; cảm ứng thật/xoay/bàn phím ảo |
| 8 layout/typeset | Phân tích LT01–LT07, role/spacing và thứ tự sửa | Chưa đồng bộ giao diện; browser mới chưa render đủ |
| 9 harden | Rà nguồn H01–H10, ma trận lỗi/session/concurrency | Fault injection đầy đủ, repeated submit, hết phiên; chưa sửa |
| 10 clarify | Phân tích C01–C08, glossary và nhãn sai kết quả | Chưa sửa; chưa rà mọi menu/form/admin và kiểm chứng reader |
| 11 generate | Đã lập brief/hướng lựa chọn trong phần11 | Chưa chọn target/hướng; chưa tạo3preview; chưa áp dụng UI |
| 12 animate | Đã phân tích motion/thứ tự sửa; xem phần12 | Reduced motion còn lỗi; chưa thêm animation mới hoặc hoàn tất QA |
| Production performance | Có baseline/after, cold/warm và font self-host | Hosting thật, CPU/network throttle, INP, trace/FPS/mobile yếu |

<a id="issues"></a>
### 14 lỗi kỹ thuật đang theo dõi

ID giữ theo audit để tránh mất liên kết lịch sử. Chi tiết đầy đủ trong phụ lục audit dưới đây. Mức độ và số liệu là snapshot 2026-10-13, không phải kiểm tra lại trong lượt gộp file. Trong bảng này **P1 = 🔴 ĐỎ**, **P2 = 🟡 VÀNG**; không có mục P3. Bảng màu mở rộng ở phần11 bao gồm các phân tích8/9/10 và công việc 🟢 XANH làm sau.

| ID | Mức | Vấn đề / vị trí chính | Trạng thái hiện tại | Nhóm sửa |
|---|---|---|---|---|
| A01 | P1 | Studio cắt nội dung; HeroBooking.css, HeaderMarquee.css:44 | ĐÃ SỬA; người dùng xác nhận đạt; fixture9viewport PASS; thiết bị thật còn giới hạn | 1 |
| A02 | P1 | Booking không giữ focus; BookingModal.tsx | ĐÃ SỬA; người dùng xác nhận đạt; fixture5width PASS; reader/máy thật chưa kiểm tra đầy đủ | 2 |
| A03 | P1 | Reduced motion đường JS; TimedCardSlider.tsx | ĐÃ SỬA + NGƯỜI DÙNG XÁC NHẬN các luồng; fixture390/1440 PASS; máy thật còn giới hạn | 5, trước motion mới |
| A04 | P1 | Tương phản bookmark/chữ muted/gradient HeroBooking | ICON người dùng xác nhận; đã sửa token muted + chữ hero, fixture5width PASS; chờ xác nhận chữ và các nền khác | 5 |
| A05 | P1 | Bookmark chỉ local state; TimedCardSlider.tsx:177 | CHỨC NĂNG người dùng xác nhận ổn; CÒN LỖI KHỰNG khi mở panel ảnh hưởng slideshow, tạm dừng theo yêu cầu | 3 |
| A06 | P1 | Chuông bỏ outline; NotificationBell.css | ĐÃ SỬA; người dùng xác nhận đạt toàn bộ focus/thao tác/theme | 5 |
| A07 | P2 | Card ngoài màn hình vẫn tabbable; TimedCardSlider.tsx | ĐÃ SỬA; người dùng xác nhận đạt toàn bộ | 1, 5 |
| A08 | P2 | Vùng bấm nhỏ; Header/TimedCardSlider/BookingModal CSS | ĐÃ SỬA target >=44px; fixture5width PASS; chờ kiểm tra app thật | 1, 5 |
| A09 | P2 | Lỗi slide giống rỗng, thiếu retry; useSliderStore/VisualArtFormsSlider | ĐÃ SỬA error/empty/retry; store + UI fixture PASS; chờ kiểm tra app thật | 4 |
| A10 | P2 | Newsletter footer | ĐÃ TRIỂN KHAI đăng ký/xác nhận/hủy trong website; test giả PASS; chờ SMTP/DB và hộp thư thật | 3 |
| A11 | P2 | Payload/startup và animation layout nặng; App/TimedCardSlider | ĐÃ SỬA PHẦN FONT; JS~918KB/trace slider còn mở | 7 |
| A12 | P2 | Hardcode màu lệch dark tokens; HomePageLayouts.css/theme.css | NGHI VẤN TỪ CODE; live dark chưa kiểm tra | 5, 6 |
| A13 | P2 | Collections redirect guest về home; CollectionsPage.tsx:82 | ĐÃ TÁI HIỆN; CHỜ CHỐT public/private | 3 |
| A14 | P2 | Mobile Back mất vị trí; ExplorePage.tsx/imagePageScroll | ĐÃ SỬA; người dùng xác nhận Back/nút trở về/refresh và desktop đóng giữ vị trí; fixture PASS | 2 |

Critique có ba nhóm P1 và hai nhóm P2, là nhóm UX gộp các vấn đề ở bảng này, không cộng thành 19 lỗi khác nhau. Điểm audit 8/20 là snapshot ban đầu, critique 20/40 là thang khác; không gộp thành một điểm chung.

<a id="verification"></a>
### Kết quả đã có và phần chưa kiểm tra

| Tình huống | Trạng thái có bằng chứng | Giới hạn |
|---|---|---|
| Home tại320/390/768/1024/1440 | ĐÃ RENDER/ĐO; mobile/tablet FAIL studio | Không pass toàn trang từ render thành công |
| Header cuộn qua slide desktop/mobile390 | ĐÃ KIỂM TRA: vẫn hiện, nền/chữ chuyển đúng ở lượt gần nhất | Chưa filmstrip first paint, chưa auth thật |
| Refresh home | ĐÃ KIỂM TRA: về đầu | Phải phân biệt Back/close, không reset scroll toàn cục |
| Desktop photo modal/close/reload/mở mới | ĐÃ KIỂM TRA luồng cụ thể, giữ scroll khi close và reload thành riêng | Không bao phủ mọi ảnh, route, phiên và lỗi mạng |
| Mobile photo/refresh/Back | Refresh giữ standalone; Back FAIL mất vị trí | Chưa touch hardware |
| Booking keyboard | Escape PASS; initial focus/trap FAIL | Chưa submit booking hoặc test reader thật |
| Explore/Packages/Blog/About/Signin guest | Smoke render route/heading | Không kiểm tra mọi chức năng |
| Profile/Admin guest | Redirect Signin đã kiểm tra | Chưa quyền member/admin sau đăng nhập |
| Tap/xoay giả lập | ĐÃ THỬ một số thao tác | Không thay cảm ứng thật, swipe, pointercancel, safe area hoặc keyboard ảo |

Checklist còn mở:

- [ ] Android/iOS thật: vuốt/scroll, pointercancel, xoay, safe area, bàn phím ảo và thiết bị yếu.
- [ ] NVDA/VoiceOver: landmark, tên nút, thứ tự đọc dialog, thông báo tải/lỗi và đổi slide.
- [ ] Tab/Shift+Tab/Enter/Space/Escape toàn bộ các route liên quan; zoom200/400%, chữ hệ thống lớn.
- [ ] Member/admin: lưu/tải ảnh, collections, notification, upload, booking, đổi tài khoản/đăng xuất/hết phiên.
- [ ] API offline/chậm/401/403/429/500/timeout, ảnh hỏng, empty; retry, dữ liệu form và repeated submit.
- [ ] Theme tối, forced-colors/high contrast, reduced motion trên hệ điều hành thật.
- [ ] Trang chi tiết collection/ảnh/gói/blog, search, signin/signup, profile/admin responsive.
- [ ] Hosting thật và cache mới tab/phiên so với refresh; SW update/offline/cache riêng tư.
- [ ] Xác minh dữ kiện kinh doanh, testimonial, quyền ảnh và nội dung SEO/schema trước phát hành.

<a id="performance-status"></a>
### Hiệu năng: đã sửa và còn lại

ĐÃ SỬA trong các lượt trước: bỏ timer refresh nhân tạo ở app/SW; Roboto TTF -> WOFF2; self-host font hiện có và bỏ Google CSS imports; proxy preview local. Không thay .env.local hoặc triển khai hosting. Phần tách lazy category grid đã thử nhưng không giữ vì không có cải thiện ổn định.

| Trung vị3 lượt, production local | Trước | Sau | Ý nghĩa |
|---|---:|---:|---|
| Cold FCP | 296ms | 48ms | Paint nội dung đầu, không phải ảnh slide đã sẵn sàng |
| Cold ảnh đầu decode | 1328.7ms | 994.4ms | Có biến động mạng/CDN; không quy hết cho font |
| Cold LCP | 1340ms | 1008ms | Lab local không throttle |
| Warm LCP | 164ms | 140ms | Reload cùng phiên có cache/session metadata/SW |
| Cold CLS | 0.00615 | 0 | Chỉ cửa sổ đo, không mọi tương tác |

Build production và screenshots desktop1440/mobile390 đã kiểm tra ở lượt performance; không sửa responsive/focus trong lượt đó. Những mô tả Google @import còn tồn tại trong audit cũ thuộc baseline, không phải backlog chưa sửa hiện tại.

- [x] Có số đo HTML/CSS/JS/API/ảnh đầu, SW/timer và raw evidence.
- [x] Có cold vs warm, baseline/after và giới hạn đo; không thêm loading che chậm.
- [ ] Chia JS có chủ đích, parse/startup và main-thread trace; main chunk khoảng918KB vẫn mở.
- [ ] Frame/FPS slider và progress width/layout; chưa có trace chứng minh nguyên nhân giật duy nhất.
- [ ] CPU/network throttle/mobile yếu và INP từ tương tác.
- [ ] Hosting: TTFB, Brotli/gzip, Cache-Control, CDN timing/CORS, endpoint deployment.

<a id="decisions"></a>
### Quyết định sản phẩm và tính năng mở rộng

- **CHỜ XÁC NHẬN:** ưu tiên khám phá ảnh/đặt lịch/cả hai; public/private collections; bookmark lưu ảnh hay đối tượng khác; thông tin studio, giá, dịch vụ, chính sách, review, giấy phép và KPI.
- **ĐÃ CÓ UI/CODE, CHƯA E2E TOÀN BỘ:** home studio, packages, quy trình, FAQ/testimonials, booking page/modal, profile/my bookings, admin booking/calendar, blog/about/contact. Không suy từ checklist100% rằng backend, quyền, mobile hay nội dung thật đã được nghiệm thu.
- **ĐỀ XUẤT CŨ, KHÔNG TỰ TRIỂN KHAI:** portfolio theo gói, gallery/review thật liên quan, bảng so sánh gói, availability public, saved packages, dashboard aggregation/doanh thu, calendar mobile day/week, badge booking/menu dịch vụ/bottom nav.
- **DÀI HẠN/CHƯA XÁC NHẬN:** referral/voucher/combo, nhiều photographer, thanh toán, Google Calendar sync, push/PWA, AI gợi ý. Không tự thêm khuyến mãi hoặc tỷ lệ giảm giá từng được ví dụ trong checklist.
- **ĐÃ BỊ THAY THẾ:** kế hoạch sửa 768px toàn site trước mọi kích thước khác. Quy tắc hiện tại là sửa từng phạm vi/component cùng desktop/mobile/tablet, kiểm tra320/390/768/1024/1440 khi liên quan.
- **ĐÃ BỊ THAY THẾ:** mô tả slider cũ không còn khớp UI; không phục hồi cover/contain, ẩn mobile, navigation hoặc animation từ handoff mà chưa đối chiếu code và yêu cầu mới.
- **KHÔNG TỰ THÊM:** loading có minimum wait để che chậm, scroll hijack, reveal làm nội dung vô hình, rebrand, testimonial/số liệu/dịch vụ chưa xác minh.

### Quy tắc bảo toàn và nguồn công cụ

Giữ chức năng ngoài phạm vi, routing/modal/refresh/scroll, dữ liệu và quyền; không submit/ghi backend thật chỉ để test. Mỗi sửa frontend bao gồm responsive liên quan. Build không thay browser QA; ghi rõ chưa kiểm tra. Bảng này cập nhật theo bằng chứng mới, không tự đóng cả component do một child pass.

Giữ `.agents/skills/impeccable`, `.impeccable/design.json` và snapshot critique như artifact công cụ, cùng scripts/JSON/screenshots/fonts/licenses làm bằng chứng. Chúng không phải báo cáo theo dõi song song. PRODUCT.md vẫn có schema sản phẩm bên dưới; DESIGN.md không còn tồn tại riêng, nên khi dùng Impeccable phải đọc phần thiết kế trong file này bằng tay, không kết luận thiếu bối cảnh vì loader chỉ tìm tên DESIGN.md. Sidecar có thể bị công cụ báo stale; không tự sửa/recreate tài liệu riêng ngoài yêu cầu.

Các tên tài liệu cũ trong phụ lục là provenance, không phải file còn tồn tại. Link Markdown tương đối trỏ tới tài liệu đã gộp được chuyển sang heading nội bộ. File code, raw evidence, font licenses, README ở thư mục khác không thuộc diện xoá.

<a id="responsive-audit"></a>
## Audit responsive toàn site: chức năng trước, làm đẹp sau

Ngày 2026-10-13. Yêu cầu mới: ưu tiên giữ đầy đủ chức năng, nội dung không tràn/cắt/co móp, ảnh không méo; làm đẹp sau. Lượt này **chỉ phân tích**, không sửa code ứng dụng.

### Trạng thái và phương pháp

**PHÂN TÍCH NGUỒN MỞ RỘNG ĐÃ LÀM; AUDIT TRÌNH DUYỆT TOÀN SITE CHƯA HOÀN TẤT.** Không đánh dấu mục7 xong.

- Đã đối chiếu route/guard trong App.tsx, useIsMobile/appConfig, Header/Sidebar, CSS của Packages/Contact/About/Blog, Explore/Search, Signin/Signup, EditProfile/Profile, Booking/MyBookings, Admin và collection grid.
- Dùng lại bằng chứng browser và số đo trước đã ghi rõ trong bảng verification; không gọi đó là phép đo mới trên phiên bản hôm nay.
- Lượt browser mới: tab riêng http://127.0.0.1:5175/ chỉ quan sát được màn hình khởi động máy ảnh, chưa có nội dung app đủ để đo. Production4174 không truy cập được. Thử server dev riêng5176 báo Vite ready nhưng browser không kết nối được (localhost timeout). Đã dừng server riêng, không sửa hoặc dừng server người dùng5175.
- Không suy ra nguyên nhân từ lỗi kết nối, không gọi màn khởi động là lỗi responsive. Không có kết quả mới cho cả ma trận browser; không lấy CSS đúng làm bằng chứng UI pass.
- Chưa dùng tài khoản thật/giả mạo auth, chưa ghi dữ liệu backend, chưa submit booking/newsletter/contact hoặc upload.

### Nguyên tắc nghiệm thu: đầy đủ không có nghĩa dồn hết lên màn hình

1. Mọi chức năng liên quan phải có đường truy cập trên mobile/tablet/desktop. Có thể đưa vào menu, accordion hoặc màn chi tiết; không được giấu bằng CSS mà không có đường thay thế.
2. Văn bản được xuống dòng; tên, giá, nhãn, trạng thái không bị cắt mất nghĩa. Không thu font cực nhỏ để ép vừa desktop layout.
3. Ảnh giữ tỷ lệ tự nhiên. `cover` cắt vùng ảnh để lấp thumbnail không đồng nghĩa méo ảnh; cần phân biệt crop có chủ đích với stretch. Ảnh cần xem đầy đủ phải có đường mở bản đầy đủ.
4. Tràn trong vùng cuộn có chủ đích (bảng, tab, thumbnail strip) có thể hợp lệ nếu cuộn tới hết và thao tác được. Trang body tràn ngoài viewport hoặc phần tử bị overflow:hidden cắt mất tác vụ là lỗi.
5. Modal không vượt vùng dùng được; có đường cuộn tới nội dung, nút đóng và hành động cuối. Focus/Back/refresh/scroll không bị phá bởi thay đổi layout.
6. Mobile phải dùng được bằng chạm; không bắt buộc hover. Tablet có thể vừa touch vừa pointer, không suy input chỉ từ chiều rộng.
7. Giữ dữ liệu/giá/chính sách/branding; không tạo nội dung kinh doanh hoặc thêm animation trong đợt sửa chức năng.

### Ma trận thiết bị và điều kiện cần kiểm tra

Các kích thước dưới đây là CSS pixels, không đại diện chứng nhận cho một mẫu thiết bị cụ thể.

| Nhóm | Viewport đại diện | Điều cần thử | Trạng thái |
|---|---|---|---|
| Điện thoại rất nhỏ | 320x568 | CTA/menu/form, từ dài, card/gutter; dùng được khi ít chiều cao | Có bằng chứng cũ home; toàn site CHƯA KIỂM TRA |
| Điện thoại phổ biến | 390x844 | Gallery, modal, thanh tác vụ, Back/close | Có bằng chứng cũ một số luồng; toàn site CHƯA KIỂM TRA |
| Điện thoại ngang | 844x390 | Menu/dialog không che nút, vùng cuộn thấp | Trước chỉ có thao tác xoay giả lập hạn chế |
| Tablet dọc | 768x1024 | Cột/sidebar/nav ở breakpoint, touch không-hover | Home studio có lỗi cũ; toàn site CHƯA KIỂM TRA |
| Tablet ngang/laptop nhỏ | 1024x768 | Sidebar/header offsets, mật độ bảng, modal | Trước đo cột home; chưa pass toàn site |
| Desktop | 1440x900 | Giữ chức năng, ảnh đúng tỷ lệ, tránh khoảng trống do offsets | Có kiểm tra cũ một số luồng; toàn site CHƯA KIỂM TRA |
| Hai phía breakpoint | 599/600/601, 767/768/769, 899/900/901, 1023/1024/1025 | Không mất menu/sidebar hoặc có khoảng dịch bố cục tại ranh giới | CHƯA KIỂM TRA trực tiếp |
| Zoom và chữ lớn | 200%/400%, tăng text hệ thống | Không cắt CTA, label, giá, error và modal | CHƯA KIỂM TRA |
| Thiết bị/trình duyệt thật | Android Chromium, iOS Safari, desktop Chromium/Firefox | Safe area, keyboard ảo, dynamic viewport, touch/scroll và focus | CHƯA KIỂM TRA đủ; không đồng nhất với viewport giả lập |

Không áp mọi tổ hợp cho mọi trang vô ích: kiểm tra năm width cơ sở cho mỗi nhóm route, thêm chiều cao/breakpoint/interaction khi source hoặc quan sát chỉ ra rủi ro. Sau sửa chỉ regression phạm vi và thành phần chung liên quan.

### Ma trận phạm vi toàn website

| Nhóm / route thật | Đã phân tích | Tác vụ cần giữ | Phần chưa kiểm tra |
|---|---|---|---|
| Khung chung: Header, Sidebar, menu, Footer | Source + browser cũ | Mọi link/action có đường thay thế, không đè nhau | Full authenticated actions, breakpoint boundary, menu thấp/zoom |
| Home `/`, category `/t/:categorySlug` | Lỗi studio/card strip đã có bằng chứng; source | Slide controls, CTA, collections preview, grid/category | Mọi section/long data và category transition matrix |
| Explore `/explore`, search `/s/photos/:query` | CSS + một số smoke/navigation cũ | Filter/sort/search/load more, mở ảnh | Long query/chip, dữ liệu0/1/nhiều ảnh, full matrix |
| Ảnh `/photos/:slug` và modal | Browser cũ giữ/mất scroll; lịch sử source | Lưu/collection/download/share/info/đóng; ảnh đúng tỷ lệ | Matrix hiện tại, nested dialog, touch và keyboard ảo |
| Collections `/collections`, `/collections/:collectionId` | Guest redirect cũ + collection CSS/JSX | View/select/cover/reorder theo quyền | Guest/member/owner; hành động hover trên touch |
| Favorites/downloads/notifications và alias routes | Route/guard | Tab/filter/action/account đúng quyền | Cần member, chưa audit nội dung đầy đủ |
| Packages `/packages`, `/packages/:slug` | Source list/detail CSS | Giá/thời lượng/số ảnh, chi tiết, đặt lịch | Matrix browser, card dài, fallback ảnh |
| Booking `/booking`, `/booking/:bookingId`, `/profile/bookings` + modal | Source + lỗi focus/browser cũ | Chọn gói/ngày, summary, submit/cancel/reschedule theo quyền | Member; bốn bước/success/error/repeated click; keyboard ảo |
| Auth `/signin`, `/signup`, Google callback | CSS dvh/safe area và guard | Mọi input, validation, login/cancel | Landscape/keyboard ảo/password/error, callback thực |
| Profile public `/profile/user/:userId`, catch-all username; edit/settings/upload | Source một phần, inventory cũ | Tabs, gallery, edit, owner actions, upload | Account/owner/member; mọi form/modal và viewport |
| About/contact/blog/list/detail/404 | Source CSS một phần | Link/FAQ/form/read content | Browser full matrix, bài dài, URL dài, ảnh lỗi |
| Admin `/admin` với views nội bộ | CSS table/calendar/dialog | Cột/action không mất, search/filter/calendar/edit | Admin thật; từng view/tab/dialog, touch calendar |

Không tạo `/admin/bookings` hay `/admin/calendar` làm route đã có chỉ từ tên view trong tài liệu cũ: App hiện khai báo `/admin`, phải dùng navigation nội bộ thực tế khi test. Không truy cập slug/ID giả rồi coi empty/404 là nội dung route đã audit.

### Findings responsive đã có bằng chứng

- **R01 = A01, P1:** studio bị cắt tại320/390/768px. HeroBooking.css:980/1037 và HeaderMarquee.css:44; cột intrinsic rộng~2582px ở390. Sửa co track/child và giới hạn marquee trước khi chỉnh thẩm mỹ.
- **R02 = A07, P2:** thumbnail slide ngoài khung vẫn tabbable. TimedCardSlider.tsx:180/CSS; phải có strip cuộn/roving focus phù hợp, không chỉ hide overflow.
- **R03 = A08, P2:** vùng bấm slider/header/close nhỏ. Tăng vùng tương tác nếu không gây chồng; giữ icon gọn. Không coi ngưỡng44px là mọi điều kiện WCAG AA.
- **R04 = A14, P2:** mobile mở ảnh dạng full page rồi Back mất vị trí. Thuộc chức năng responsive/navigation, không chỉ bố cục; giữ refresh riêng biệt.
- **R05 = A02, P1:** booking focus ra nền. Cần sửa cùng nghiệm thu modal đủ chức năng, không chờ bước làm đẹp.

Các ID trên là alias, không tăng tổng14 findings kỹ thuật vì đã có trong bảng chính.

### Rủi ro từ nguồn cần tái hiện trước khi kết luận

#### RC01. Search và sidebar không cùng ngưỡng

- Vị trí: SearchResultsPage.css:39 dùng min-width768 và margin-left64; ImagePageSidebar.css:37 hiện rail từ1024. Header.css:322 và330 có cả min/max1024, rule max phía sau đặt left0 trong đoạn này.
- Cần tái hiện: search và trang có rail ở767/768/769/1023/1024/1025; đo header/content/rail thực và cascade overrides. Không đổi toàn bộ breakpoint chỉ từ một stylesheet.
- Rủi ro: chừa khoảng trống hoặc content/header lệch, có thể mất bề rộng cần thiết trên tablet. Chưa phải lỗi visual mới đã xác nhận.
- Hướng sửa nếu xác nhận: một quy tắc ownership rõ cho rail offset của shell; route không tự cộng lại offset đã có ở parent.

#### RC02. Collection cover/reorder dựa hover

- Vị trí: collection/components/CollectionNoFlashGrid.css:220–244 overlay opacity0 rồi hiện bằng hover; handle rule:187. Component thật có nút cover/handle tại CollectionNoFlashGrid.tsx:111/122 và CollectionImageGrid.tsx:135/145.
- Cần tái hiện: owner collection trên touch/coarse pointer; một tap có vô tình mở ảnh thay vì menu, có thể chọn cover/sắp xếp bằng đường khác không; keyboard focus có lộ control không. Không ghi backend để thử khi chưa được phép.
- Rủi ro: thao tác quản lý ảnh khó tìm/không dùng được trên mobile dù thumbnail vẫn đẹp. Có khả năng invisible button còn hit-test, cần đo chứ không gọi disabled chỉ từ opacity.
- Hướng sửa nếu xác nhận: action/menu nhìn thấy hoặc tap rõ ràng; reorder có lựa chọn không kéo-thả, bảo toàn mở ảnh và selection mode.

#### RC03. Booking layout tablet và modal thấp

- Vị trí: BookingPage.css:3 ởmax900 còn padding-left80; rail hidden dưới1024. BookingModal.css:1/3 có92dvh, content scroll và footer không wrap trong rule base.
- Cần tái hiện: tablet641–900, phone ngang844x390, đủ bốn bước, nútfooter/summary/error; parent padding và override có làm bù khoảng trống không.
- Rủi ro: cột form mất bề rộng trên tablet; header/progress/footer chiếm nhiều vùng khiến content khó dùng khi màn hình thấp/keyboard hiện.
- Hướng sửa nếu xác nhận: offsets cùng shell, flex children co đúng, footer reflow theo nội dung, vùngcuộn vẫn tới được tất cả input/nút; không chỉ giảm chữ hoặc giấu nút.

#### RC04. Bảng và lịch admin trên touch

- Vị trí: admin/AdminPage.css:1789–1806 bảng cóoverflow-x:auto/min-width600/nowrap; tooltip calendar:309/311 bịẩn dưới768. Đây là bảng cuộn có chủ đích, không tự coi min-width600 là body overflow.
- Cần tái hiện: admin thật, cuộn tới cột hành động, menurow không bị ancestor clip; chọn ôcalendar/tap có chi tiết thay tooltip không; zoom/chữ dài.
- Rủi ro: view nhìn vừa nhưng thông tin/action ở ngoài vùng không truy cập, tooltip bị bỏ mà không có thay thế.
- Hướng sửa nếu xác nhận: giữ bảng scroll có chỉ dấu hoặc list/detail/card cho tác vụ; tap/keyboard mở chi tiết lịch, không xoá dữ liệu/cột quan trọng để vừa.

#### RC05. Nội dung dài ở các public page và profile

- Vị trí: PackagesPage.css:60 minmax280 đã có responsive detail về1cột:390; BlogPage.css:56 minmax320 nhưng đã chuyển1fr ở251; ContactPage.css:54 dùngminmax0 và input về1cột:255; EditProfilePage.css:475/547 tab cóscroll/nowrap.
- Nhận định: các nhánh reflow này có nền tảng hợp lý; không kết luận tràn chỉ nhìn minmax desktop. Cần tên gói/query/email/URL/nội dung dài, width320, tăng chữ và từngtab.
- ProfilePage.css:802 cóẩnavailability nhưng tìm JSX hiện tại chưa thấy class này; **không ghi là mất chức năng đã xác nhận**, có thể là CSS không dùng. Không dọn CSS trong lượt audit.
- Hướng sửa nếu xác nhận: min-width0/wrap đúng nơi, control co/dàn hàng, giữ nội dung dài có đường đọc đầy đủ; không cắt bằng ellipsis cho dữ kiện cần ra quyết định.

### Thứ tự sửa responsive cụ thể

1. Shell/header/sidebar + studio intrinsic width: lỗi cóảnhhưởng rộng và đã cóbằngchứng. Kiểm tra guest/member ở hai phía breakpoint.
2. Booking modal và photo navigation: phải dùng được trong khung thấp, cófocus/scroll/Back đúng trước khi tinhchỉnh card.
3. Explore/search/gallery/collections: ảnh giữtỷlệ, filter/action không mất, cover/reorder không phụ thuộc hover, không đụng dữ liệu thật khi test.
4. Packages/booking/profile/forms/auth: giữgiá/summary/validation/input/submit; testkeyboardảo/safearea trên thiếtbịthật khi có.
5. Admin tables/calendar và các public content routes: giữđủ dữliệu/action theo quyền; kiểm tra overflow cóchủđích vs clipping.
6. Saukhi các nhóm đạtđủ chức năng mới thốngnhất spacing/typography/radius và animation từngthànhphần.

### Hồ sơ nghiệm thu cho từng nhóm

| Trường phải ghi | Yêu cầu |
|---|---|
| Phiên bản | Commit/worktree/build hoặc dev hiện tại, URL, ngày |
| Route/dữ liệu/quyền | Guest/member/admin/owner, loaded/empty/error; không giả auth |
| Thiết bị | CSS viewport, orientation, browser, input; ghi emulator hay máy thật |
| Bố cục | Body và children clipping, control bounds, cột/ảnh không stretch |
| Tác vụ | Đường tới mọi action, keyboard/touch, scroll container, menu/modal |
| Regression | Refresh/Back/close/restore, breakpoint và component chung bị ảnh hưởng |
| Kết quả | Pass/fail/chưa thử, bằng chứng, source và hướng sửa; build không thay testbrowser |

Không thêm ảnh lỗi, thiếu dữliệu hoặc route cầnlogin vào nhóm 'responsive đã pass' chỉ vì một trangfallback vừa viewport. Audit mới sẽ bổsung vào phần này, không tạo file.md riêng.

<a id="layout-type-analysis"></a>
## Phần 8: phân tích bố cục và typography

Ngày2026-10-13. **ĐÃ PHÂN TÍCH NGUỒN VÀ BẰNG CHỨNG CŨ; CHƯA SỬA GIAO DIỆN.** Yêu cầu chỉ phân tích trước, giữ thương hiệu/nội dung, ưu tiên đủ chức năng trước làm đẹp. Không coi phần8 đã nghiệm thu.

### Phạm vi và độ tin cậy

- Đọc Impeccable layout/typeset; phân tích trực tiếp trong một context, không có hai đánh giá độc lập ở lượt này. Đánh giá vai trò/phân cấp trước mechanical scan.
- Đối chiếu HomePageLayouts.css, PackagesPage.css, HeroBooking.css, TimedCardSlider.css, Header.css, BookingModal.css, BlogPage.css, ImagePage.css, index.css và fonts.css. Không phải audit đầy đủ mọi page/admin/form.
- Giá trị dưới đây là CSS nguồn; computed observations cũ được ghi rõ. Cascade/Tailwind/inline có thể thay kết quả; không đánh đồng khai báo và font thực render.
- Tab mới5175 vẫn chỉ hiện màn khởi động máy ảnh, không có app content để đối chiếu trực quan mới. Không kết luận lỗi loading do font hoặc CSS chỉ từ hiện tượng này.
- Detector scope type trên HomePage/PackagesPage/BookingModal/TimedCardSlider/Header, scope layout trên HomePage/PackagesPage/BookingModal/booking: cả hai trả[] exit0. Chưa phát hiện pattern thuộc hai scope; không chứng minh typography/layout toàn site tốt, không kiểm chứng clipping/line breaks.

### Nhận định chính

Không cần thay hệ font hoặc đồng nhất mọi trang thành cùng mật độ. Slideshow là trải nghiệm ảnh; phần studio hỗ trợ chọn dịch vụ; form/header/admin là thao tác; blog là đọc. Cần thống nhất **vai trò thông tin** và nhóm nội dung, không áp một cỡ chữ cho tất cả.

Khác biệt hợp lý: slideshow title lớn/condensed, studio title serif, điều khiển sans; card preview có thể gọn hơn card detail. Điểm chưa thành hệ: cùng thông tin gói chụp thay family/size/gap giữa các bề mặt; nhiều spacing hardcode; metadata rất nhỏ; track heading âm; màu phụ/gradient cần xét khả năng đọc. Grid studio hỏng là lỗi phần7, không được chữa bằng 'typeset' thu chữ.

### Vai trò chữ hiện tại

| Vai trò | Source/giá trị | Nhận xét |
|---|---|---|
| Body app | index.css:508/518 Roboto; body studio token:266 Inter/Roboto fallback | Hai đường kế thừa. Giữ cả hai nếu có phân vai, không để khác do vô tình thiếu class |
| Slideshow title | TimedCardSlider.css:7 Barlow Condensed800, line-height.94; dưới900:64px, dưới600:61px | Đủ khác với body. Kiểm tra dấu tiếng Việt, title dài và wrap; không áp size này vào panel nhỏ |
| Hero studio | HeroBooking.css:257+ Fraunces500,68px/1.05/tracking0; quan sát cũ mobile42px | Có tiếng nói thương hiệu. Gradient/italic là nhấn, không thay hierarchy; cần tương phản/dấu/fallback |
| Section home | HomePageLayouts.css:46+ clamp28–46px,1.05,tracking-.05em | Cỡ/line-height chặt; theo viewport thay vì container, cần kiểm tra nhiều dòng và zoom |
| Mô tả hero | HeroBooking.css:301+20px/1.55/max620px | Có độ nổi bật riêng; hiện đo mobile bị cắt do cột, không chứng minh cần giảm font |
| Tên gói home | HomePageLayouts.css:105+20px, family kế thừa | Cùng dữ kiện với card Packages nhưng recipe khác |
| Giá home | HomePageLayouts.css:112+15px, màu#934a3d | Giá nhỏ hơn tên; chưa thống nhất family/weight với list/detail |
| Card Packages | PackagesPage.css:141+ title serif24px/500; description14px/1.55; meta12px; price18px serif | Tách vai trò rõ hơn home, nhưng có thêm tag10px và nhiều size lân cận |
| Booking dialog | BookingModal.css:1 title26px, help13px, input13px, label12px, meta11px; title mobile23px | Dense có thể có chủ đích. Input nhỏ cần test iOS zoom và readability, không khẳng định từ CSS đã lỗi |
| Nav và CTA | Header.css:600+ nav15px/600, có breakpoint13px; Packages CTA14px/600; slider discover10px | Cùng 'button' nhưng vai trò khác. Main action không nên khó đọc chỉ để nhường chỗ |
| Caption ảnh slide | TimedCardSlider.css:7 author12px/1.8; thumbnail category9px/title24px (mobile21px) | Metadata cần nhẹ nhưng vẫn đọc được. Tiny category không chứng minh bất kỳ caption nào được cắt đều hợp lệ |
| Blog prose | BlogPage.css:201+17px/1.75, mobile16px:264; detail max760px:139 | Có recipe đọc riêng hợp lý. Độ dài dòng45–75ch cần đo render, không suy chắc từ px |

Font delivery: Fraunces400/500/600/700, Inter400/500/600/700, Barlow600/700/800 được khai báo self-host và swap; Roboto variable dùngoptional. Không còn lý do đổi font chỉ để bỏ request Google. Hero cóitalic nhưng fonts.css chỉ cho thấy các faces đã nêu; phải đối chiếu font-style/asset trước kết luận italic là font thật hay tổng hợp. Không xóa face/weight chưa chứng minh unused.

### Findings và hướng xử lý

#### LT01 [P2]. Gói chụp chưa có recipe nhất quán qua các màn hình

- Vị trí: HomePageLayouts.css:100–140; PackagesPage.css:123–226; BookingModal.css:1/3.
- Tái hiện cần làm khi app render: cùng gói ở home/list/detail/modal, so tên/giá/thời lượng/sốảnh/description/CTA; tên dài và width320/390/768.
- Bằng chứng nguồn: home title20/price15/meta13, list title24serif/price18serif/meta12, modal strong16/span13/small11; padding18 vs22/24 vs17 và gap8 vs12 vs7.
- Ảnh hưởng: người dùng khó nhận ra cùng hệ thông tin, sửa từng nơi dễ lệch; không có bằng chứng đây là blocker.
- Đề xuất: recipe semantic dùng chung cho title/price/meta/summary; cho phép variant preview/full/selection với density riêng. Giữ thứ tự ưu tiên tên -> giá và nội dung cần quyết định -> CTA, không đổi dữ liệu, đơn vị hoặc giá. Không bắt mọi card giống hệt.

#### LT02 [P2]. Metadata và action phụ quá nhỏ cần kiểm tra khả năng đọc

- Vị trí: TimedCardSlider.css:7 (category9/action10/author12), PackagesPage.css:132/164 (tag10/meta12), BookingModal.css:1 (meta11/input13).
- Tái hiện: điện thoại320/390, zoom/tăngtext, ảnh nền sáng/tối, fontfallback; phân biệt nhãn phụ với nội dung cần để chọn gói.
- Ảnh hưởng: người dùng phải tập trung đọc hơn; màu muted đã có cảnh báo tương phản trong A04. Không tự gọi mọi chữ dưới16px là vi phạm WCAG.
- Đề xuất: body mô tả dài ưu tiên khoảng16px và line-height phù hợp; metadata thường12–14px có contrast đủ, thông tin quan trọng không hạ xuống9–11px; action rõ nghĩa, input xem xét16px khi cần tránh iOS autozoom. Đây là khoảng đề xuất, chưa chốt thông số mọi component.

#### LT03 [P2]. Tracking/line-height heading chưa thành quy tắc

- Vị trí: HomePageLayouts.css:50–52 (-.05em/1.05); index.css:790/798 (-.04/-.02); HeroBooking.css:257+0/1.05; PackagesPage.css:42/44 clamp/tracking-.03.
- Tái hiện: tiêu đề tiếng Việt có dấu và dài2–3dòng ởnarrow/zoom; cần screenshot/linebox thực.
- Ảnh hưởng: khoảng chữ và khoảng dòng có thể chật; scale theo vw không phản ánh một component nằm trong cột hẹp. Chưa chứng minh dấu bịclip ở nguồn này.
- Đề xuất: tracking0 cho hệ được tinh chỉnh, scale rõ theo role với breakpoint/container constraints; tăngleading heading nhiều dòng khi cần. Giữ family và weight, không đổi headline/copy để lấp chỗ.

#### LT04 [P2]. Spacing và độ rộng container chưa có ownership rõ

- Vị trí: HomePageLayouts.css:3–10 max1296/gutter16; PackagesPage.css:4/15/61/123 padding40/20/80, gap32/22, body22/24; HeroBooking.css và header overrides; BlogPage.css:11/141 top140/120.
- Tái hiện: home->packages->blog/contact, so cạnh trái của heading/body/card, khoảngheading-description-grid, header tới content ở breakpoint. Không suy mọi chênh lệch là lỗi; blog và gallery có density khác.
- Ảnh hưởng: mắt phải thích nghi lề/nhịp khác, sửa topoffset ở từng route dễ đè header hoặc chừa khoảngtrống. Offset clipping thuộc phần7/RC01, không đếm lại.
- Đề xuất: tách token shell offset, container rộng/đọc, section rhythm, cardpadding và siblinggap. Spacing4/8/12/16/24/32/48 là scale đề xuất, chỉ ngoại lệ có lý do; không thay hàng loạt giá trị bằng phép tìmthaythế.

#### LT05 [P2]. Grouping bên trong home package card dễ lệch theo nội dung

- Vị trí: HomePageLayouts.css:116–140: p inline-flex, gap8, margin-bottom6; summary margin-bottom4; body gridgap8; button widthmax-content.
- Tái hiện: tên gói dài, mô tả nhiều dòng và dịch vụ cómeta dài; so chiều cao/CTA hàngcard khi wide/narrow.
- Ảnh hưởng: gap+margin chồng thêm khoảng không theo một scale; paragraph inline-flex có nguy cơ không wrap như prose dự kiến. Chưa khẳng định CTA đang lệch mọi card từ source.
- Đề xuất: meta là cụm wrap riêng, description là đoạnblock; siblinggap có ownership rõ; card cùng hàng hỗ trợ CTA ổn định khi phù hợp. Không ép minheight cứng làm cắt chữ hoặc thêm khoảngtrống trên mobile.

#### LT06 [P2]. Caption dài cần đường đọc, không chỉ ellipsis

- Vị trí: ImagePage.css:228–250 author/tag cóoverflow-wrapanywhere, usernamegrid ellipsis; TimedCardSlider.css:7 titlecard max150px/line-height1.05.
- Tái hiện: author/title/category dài, thẻhẹp, keyboard/touch; mở ảnh để đọc fullname/caption có hoạt động không.
- Ảnh hưởng: captionpreview cắtgọn có thể hợp lệ, nhưng không được làm mất tên/thôngtin cần truy cập; tooltiphover không đủ cho mobile.
- Đề xuất: giữpreview compact và đường mởdetail; titlecard wrap/lineclamp chỉ khi có bảnđầyđủ; đo dấu/tỷlệ ảnh/focus overlay. Không tạo textplaceholder hoặc sửa tácgiả thật để vừa.

#### LT07 [P3 / cần đo]. Fallback và weight có thể làm thay nhịp chữ

- Vị trí: index.css:265/266/508, fonts/web/fonts.css, HeroBooking.css italic/gradient; DESIGN observations cũ.
- Tái hiện: cold/cache, chặnfont cókiểmsoát, so glyph Việt/italic/weights/linebreak và layoutshift.
- Ảnh hưởng: fallback khác metrics, chữ có thể xuốngdòng khác; chưa đo thấy issue mới.
- Đề xuất: ghi rõ font thực theo role, dùng fallback tương thíchmetrics nếu phépđo cần; không thêm preload mọiface, không đổi optional/swap khi chưa đo trước/sau.

LT01–LT07 là ghi nhận thiết kế riêng, không cộng vào14 lỗi kỹ thuật như7bug mới đã tái hiện. LT02 giao với A04/A08; LT04/LT05 giao responsive. MứcP2 ở đây là ưu tiên tinhchỉnh, không vượt P1 chức năng chưa sửa.

### Hệ quy tắc đề xuất để sửa sau

- **Slideshow:** ảnh dẫn đầu, condensedtitle; author/control nhỏ nhưng đọc được; không làm header/controls tranh headline.
- **Studio:** serif cho display/section, sans cho đoạn và hànhđộng. Gói tách rõ tên/giá/meta/description; không dùng size hero trong card nhỏ.
- **Form và điều hướng:** sans ổn định, label/input/error/buttons có cấp rõ; density theo task, không theo marketing.
- **Blog:** body khoảng16–17px/leading1.6–1.75, measure45–75ch cần xác nhận trên browser; spacingparagraph thay vì decoration.
- **Khoảng cách:** gần cho label-value/icon-text, vừa cho title-description và groupmeta, rộng cho các section khác nghĩa. Chỉ card repeated dùng frame; không thêmcard vào section để bù grouping yếu.
- **Container:** contentwide cho gallery/so sánh, contentread cho prose, modal theo viewport và cuộn; không ápmax1296 vào blogbody.
- **Số liệu:** giá/thời lượng/sốảnh giữđơnvị hiệncó; tabularnums chỉ khi phục vụ so sánh và font hỗtrợ, không đổi giá/camkết.
- **Responsive:** reflow/wrap trước giảmfont; zoom/textsettings phải còn dùngđược. Theo quy tắc hiện tại không dùngvw làm scale chữ mới và không trackingâm.

### Thứ tự thực hiện phần8 sau khi phần7 liên quan ổn

1. Chốt recipe tên/giá/meta/description/CTA của package ởhome/list/modal; thửmộtgói dài rồi áp cho variants.
2. Tăng độ dễ đọc của mô tả/metadata/control và sửacontrast trong phạmvi liênquan; giữgallery/ảnh nổi bật.
3. Đồng bộheading roles/tracking/leading, không thay fontidentity.
4. Chuẩn hóacontainer/section/cardgap theo vai trò, kiểm traheaderoffset và DOM/focusorder.
5. Caption/truncation vàfallbackfont; kiểmtra zoom, longtext, mobile và fontload.
6. Sau đó mới polish radius/shadow/hover; không thêmanimation hoặc đổicontent trong phần8.

### Nghiệm thu còn mở

- [ ] Browserapp render được; ảnh mới desktop/mobile để so hierarchy, grouping và linebreak, không chỉ screenshotloader.
- [ ] 320/390/768/1024/1440px và containerhẹp, landscape/zoom/chữlớn.
- [ ] Package cùng dữkiện qua home/list/detail/modal: thứtự/role/đọcđược và CTAkhông bịcắt.
- [ ] Tiêu đề dài/dấuViệt/fontfallback/italic và contrast trênnền thực.
- [ ] Caption dài cóđường đọcđầyđủ; tab/focusorder phùhợp layout.
- [ ] Chia sẻfont/delivery cầnđo cold/cache/CLS nếu sửa; không xóaweight không cóusageevidence.
- [ ] Saukhi cócode: build + browser regression phạmvi bịảnhhưởng. Lượt chỉ sửa tài liệu không chạybuild và không đóngfindings.

<a id="harden-analysis"></a>
## Phần 9: phân tích trạng thái, lỗi và phục hồi

Ngày: 2026-10-13. **ĐÃ RÀ NGUỒN; CHƯA SỬA CODE, CHƯA FAULT-INJECTION/E2E ĐẦY ĐỦ.** Đây là phân tích trước theo yêu cầu, không đánh dấu harden hoàn tất.

### Phạm vi và giới hạn

- Đọc Impeccable harden; đối chiếu axios/API wrapper/errorHandler, auth/slider/image/collection stores, BookingModal/BookingPage/MyBookings, Explore, UploadPage, BlurUpImage và collection detail hook.
- Đọc thêm đoạn tạo booking/controller/model để đánh giá retry mutation. Không audit đầy đủ backend/security hoặc mọi admin action; không khẳng định server không có bất kỳ cơ chế chống trùng nào ngoài đoạn đã xem.
- Bằng chứng là source, không phải đo hành vi browser mới. Browser ở phần7/8 chưa render đủ app; không lặp thao tác lỗi mạng trên server/dữ liệu thật để tạo bằng chứng giả.
- Không đăng nhập giả, không gửi booking/upload/newsletter, không chấp nhận hợp đồng, không ghi/xoá dữ liệu backend.
- Những yêu cầu về long text/zoom/i18n đã liên kết phần7/8; phần9 tập trung state/network/concurrency/session và phục hồi.

### Nền tảng đã có

| Luồng | Cơ chế trong code | Giới hạn |
|---|---|---|
| Fetch ảnh | useImageStore.ts:150–220 có requestVersion, abort request trước, giữ images khi lỗi, error state và toast | Không bảo đảm mọi page tiêu thụ error; Explore hiện chưa dùng |
| Slider | Giữ slides đã có khi fetch lỗi, bỏ qua cancellation | Thiếu state lỗi riêng/CTA retry, xem A09 |
| Auth | axios.ts có shared refresh promise, giới hạn retry401; bỏ auto-retry signin/signup/refresh | Nhánh lỗi mạng xoá auth không nhất quán với store |
| HTTP403 | Retry CSRF theo errorCode, có giới hạn | Không phải mọi403 là session hết hạn; cần giữ phân biệt quyền/CSRF |
| GET | lib/api.ts và requestDeduplication có chống gọi giống nhau trong cửa sổ1s | Không dedup mutation; request lâu hơn1s có thể được gọi mới |
| Booking submit | Disabled khi loading, catch giữ form, finally trả trạng thái | Chưa có in-flight guard ngay trong handler; chưa E2E duplicate/response lost |
| MyBookings | Có active flag tránh cập nhật list sau unmount; reschedule có disabled/loading | Toast catch không kiểm active; lỗi fetch giống empty |
| Tải/yêu thích ảnh | BlurUpImage có isDownloading/isTogglingFavorite và disabled, catch báo lỗi | Đường ảnh decode lỗi giữ placeholder nhưng chưa có phân biệt broken/retry rõ |
| Upload | Có pre-upload progress, finalize state và disabled | Lỗi pre-upload xoá lựa chọn file; completion stale khi thay file chưa được bảo vệ trong effect đã xem |

### Quy tắc trạng thái cần đạt khi sửa

1. **Initial loading:** vùng dữ liệu đang chờ, không biến cả trang thành trống; không minimum wait nhân tạo.
2. **Success:** nội dung dùng được; phản ánh đúng dữ liệu/query/tài khoản hiện tại.
3. **Empty:** chỉ sau request thành công trả rỗng; no-results theo filter khác với chưa có dữ liệu.
4. **Initial error:** thông báo lâu dài tại vùng lỗi và retry phù hợp, không chỉ toast rồi nói 'chưa có'.
5. **Refresh/load-more error:** giữ nội dung đã tải, báo phần cập nhật chưa xong; giữ cursor/page và query đúng.
6. **Mutation pending:** khoá hành động đang gửi, ngăn trùng ở handler, không khoá chức năng không liên quan vô cớ.
7. **Mutation thất bại:** giữ dữ liệu người dùng, lỗi validation gần field, lỗi mạng/server có bước phục hồi rõ.
8. **Kết quả chưa xác định:** server có thể đã xử lý nhưng response bị mất; không tự POST lại liên tục hoặc khẳng định chưa gửi.
9. **Auth:** hết phiên thực khác offline/timeout/429/permission denied. Không cho thao tác private khi chưa xác thực; đồng thời không mất draft do lỗi mạng tạm thời.
10. **Cancellation/stale response:** không gọi cancellation là thất bại; kết quả cũ không ghi đè route/file/query mới.

### Findings từ nguồn và đề xuất

#### H01 [P1]. Mất mạng trong refresh có thể xoá auth

- Vị trí: frontend/src/lib/axios.ts:305 (`status===401||status===403||!status`); useAuthStore.ts:150–164.
- Source xác nhận interceptor clearAuth khi refresh thất bại không có HTTP status, gồm network/timeout; store refresh chỉ clear401/403. Hai nhánh không cùng semantics.
- Tái hiện cần làm: phiên đã login, request private401, refresh offline/timeout; so token/user/guard/draft. Không coi chưa có status là chắc chắn token không hợp lệ.
- Ảnh hưởng: có thể bị đưa khỏi tác vụ/form vì mạng tạm thời, khó tiếp tục sau reconnect.
- Đề xuất: thống nhất taxonomy session expired vs temporarily unavailable; clear quyền/token theo auth failure có chứng cứ, không cho stale token thực hiện mutation; bảo toàn draft/return route phù hợp. Kiểm tra private cache khi logout/đổi tài khoản.

#### H02 [P1]. CSRF preflight chưa có timeout/cancel độc lập

- Vị trí: frontend/src/lib/axios.ts:162: `fetch` trước POST/PUT/PATCH/DELETE chỉ có credentials; Axios timeout dùng appConfig120000 ở dòng25.
- Source: chưa truyền AbortSignal hoặc timeout cho fetch này. Axios timeout không phải timeout cho một native fetch đang chờ trong request interceptor.
- Tái hiện cần làm: giữ request csrf-token pending, bấm submit rồi đóng/unmount; xem spinner/request có thoát và navigation vẫn hoạt động không.
- Ảnh hưởng: mutation có thể chờ không xác định trước khi Axios gửi; UI khó phục hồi, timeout chung không đủ giải thích.
- Đề xuất: deadline và signal phù hợp, shared preflight nếu cần, phân biệt lỗi CSRF/network; không bỏ bảo vệ CSRF để 'chạy nhanh'.

#### H03 [P2]. 429 Retry-After và timer retry chưa đủ bền

- Vị trí: frontend/src/lib/axios.ts:230–239.
- Source: parseInt(header)*1000, setTimeout rồi retry; không validate finite/range hoặc xử lý HTTP-date, chưa có abort listener cho khoảng đợi. Retry giới hạn một lần ở nhánh này là điểm tốt.
- Tái hiện cần làm: Retry-After sốgiây, HTTP-date, malformed, quá lớn; unmount/abort/logout trong lúc chờ; kiểm tra promise/UI kết thúc đúng.
- Ảnh hưởng: chờ sai hoặc retry ngay thay vì đợi; promise có thể vẫn pending tới timer sau khi caller rời màn hình.
- Đề xuất: parser hai dạng với deadline giới hạn, delay có cancel; báo retry availability rõ. Không thêm retry vô hạn, không auto-retry POST trên network5xx nếu chưa có idempotency.

#### H04 [P2, mở rộng A09]. Lỗi tải bị nhầm với rỗng và không có đường retry

- Vị trí: useSliderStore.ts:136; VisualArtFormsSlider.tsx:88; ExplorePage.tsx:48/209–216; MyBookingsPage.tsx:74/158–165; BookingPage.tsx:46; BookingModal.tsx:68–79.
- Source: Explore chỉ đọc loading/images, không render store.error; MyBookings catch toast rồi loadingfalse/list[] -> 'Chưa có lịch đặt nào'; modal tải packages chỉ catchtoast, không có packageLoading/packageError và retry state riêng.
- Tái hiện cần làm: fresh/no cache, các GET lần lượt500/offline/rỗng200; giữ ảnh/lịch cũ khi refresh lỗi và xem UI phân biệt không.
- Ảnh hưởng: người dùng hiểu sai chưa có dữ liệu thay vì dữ liệu không tải được; nút 'thử lại' trong lời nhắn không có hành động tương ứng.
- Đề xuất: state local/store rõ, render inline retry và cached data; filter-empty có resetfilter, account-empty có CTA đúng. Không đếm A09 như issue mới lần nữa.

#### H05 [P2]. Collection detail rời trang với mọi lỗi

- Vị trí: pages/collection/hooks/useCollectionDetail.ts:27–31; useCollectionStore.ts:19–51.
- Source: hook catch tất cả lỗi fetch rồi navigate('/collections'), cleanupclear; store đã có error nhưng route không giữ để phục hồi tại chỗ.
- Tái hiện cần làm: collection thật,500/offline vs404/403; chuyển nhanh ID; guest/member theo policy.
- Ảnh hưởng: lỗi tạm thời làm mất ngữ cảnh; guest có thể tiếp tục bịredirect home theo A13. Người dùng không có retry ngay cho collection đang xem.
- Đề xuất: phân biệt notfound/permission/auth/network, ở lại URL với error/retry khi phù hợp; tránh response cũ ghi đè collection mới. Không mở quyền public ngoài xác nhận sản phẩm.

#### H06 [P2]. Ảnh hỏng vẫn ở placeholder, không có thông tin phục hồi rõ

- Vị trí: components/NoFlashGrid/components/BlurUpImage.tsx:107/565; các img cover ở PackagesPage.tsx.
- Source: preload catch giữplaceholder, full img onError setLoadedSrc(null). Đây là fallback tốt hơn blank nhưng chưa thấy statebroken/retry tại đường này. Cover package native img chưa có handler riêng trong đoạn đã xem.
- Tái hiện cần làm: thumbnail tốt/full lỗi, cảhai lỗi, CDN404/corruptdecode, AVIF lỗi; thử main image riêng (chưa audit đầy đủ) trước khi khẳng định cùng bug.
- Ảnh hưởng: khó phân biệt chậm với hỏng; có thể chờ mãi về mặt nhận thức dù request đã kết thúc.
- Đề xuất: giữ preview có sẵn, ratio cố định, trạng thái lỗi nhẹ/alt/CTA khi cần; retry có giới hạn và fallback định dạng chỉ với policy rõ, không preload ảnhgốc hàngloạt.

#### H07 [P1 rủi ro, chưa E2E]. Mutation lặp và kết quả không xác định chưa được bảo đảm

- Vị trí: BookingModal.tsx:131–146; BookingPage.tsx:submit; lib/api.ts:27–36 không dedupPOST; bookingService.ts:create; backend/controllers/bookingController.js:145 và models/Booking.js:16.
- Source: disabled/loading có, nhưng modal submit chưa `if(loading)return`/in-flight lock. Booking model bookingCodeunique là mã tạo mới mỗi lần, không tự là idempotencykey cho cùng payload. Chưa thấy requestkey ở đoạn service/controller đã xem.
- Tái hiện cần làm bằng fixture/mock, không DB thật: hai submit cùng tick, Enter+click, response mất sau create thành công, manualretry, close/reopen lúcpending.
- Ảnh hưởng: có thể tạo yêu cầu trùng hoặc kết quả cũ xuất hiện trong phiênmodal mới. Chưa khẳng định đã có bookingtrùng trong dữliệu thật.
- Đề xuất: synchronous in-flight guard và operation identity; kiểm tra backend idempotency/integrity trong phạmvi riêng nếu được giao. Sau response ambiguous, cho kiểm tra lịch trước resend; không thêm autoretrymutation bừa bãi.

#### H08 [P2]. Upload file A/B có rủi ro stale và retry bắt chọn file lại

- Vị trí: UploadPage.tsx:105–141 effect watchedFile; submit:144–178.
- Source: asynccompress/preupload setPreUploadData/progress không có cleanup/operationversion trong effect đã xem; error resetfileinput/setValue image null. Finalizefailure có giữ preUploadData là điểm tốt.
- Tái hiện cần làm với mock: Ađangcompress/upload rồi chọnB; Acomplete/error sauB; unmount; lỗi preupload rồi retry. Kiểmtra fileinputdisabled trước khi kếtluận user đổiA/B được trong mọi state.
- Ảnh hưởng: dữliệu/progress có thể lệch file hiện chọn nếu concurrency xảyra; lỗi mạng buộc chọnlại file dù vẫn cóthể giữselection để retry.
- Đề xuất: operationversion/abort khi hỗtrợ, giữ file/draft khi lỗi tạmthời, nútretry rõ; không bypass validation hoặc ghiupload thật để test.

#### H09 [P2]. Explore load-more đang gọi lại trang1

- Vị trí: ExplorePage.tsx:223–225; useImageStore.ts:197–203.
- Source: onLoadMore fetch page1/limit30; store page1 thaylist, page>1 mới append. Có nguycơ không tiến pagination dù hasMore còntrue.
- Tái hiện cần làm: dataset>30 ảnh và paginationhasMore, cuộnloadmore, ghi page/request/IDs/cursor; không suy thành infinite request chắc chắn khi chưa testobserver.
- Ảnh hưởng: người dùng thao tác tiếp nhưng không nhận ảnhmới; filter/category có thể không được giữ trong paramsloadmore này.
- Đề xuất: dùng page/cursor tiếp theo và đầyđủ query hiện tại; failedloadmore giữlist/cursor, retrytrang thấtbại; chốngobserver gọi trùng.

#### H10 [P2, giao phần10]. Error messages không thống nhất ngôn ngữ và recovery

- Vị trí: utils/errorHandler.ts:26–75; useAuthStore.ts:157–158; các toastcallers.
- Source: timeout/network/status trả textAnh trước fallbackViệt; refreshstore báo sessionExpired cho một số lỗi không401/403. Backendmessage cũng được đưa trực tiếp khi có.
- Tái hiện cần làm: status và networkmatrix; message dài/technical; screenreader và inline field.
- Ảnh hưởng: người dùng nhận lýdo không đúng hoặc khó hiểu; toastbiếnmất và chưa có hướngphục hồi tại vùng lỗi.
- Đề xuất: errorcode->nhãnViệt theo ngữcảnh, không lộ nội bộ; fieldvalidation gầninput, requesterror inline+retry; deduptoast khi store và caller cùng catch. Không sửa camkết dịchvụ trong thôngbáo.

### Đếm và ưu tiên

H01–H10 là backlog bổsung của phần9 từ rànguồn; H04 mởrộng A09, H10 giao phần10. Không tự thay tổng14finding đã audit bằng phép cộng mườiissue mới hoặc coi tấtcả là browser-confirmed.

Thứtự khi được giao sửa: **H01/H02/H07** (session/deadline/mutationintegrity) -> **H04/H05/H09** (state/retry/navigation/pagination) -> **H06/H08/H03** (image/upload/rate-limit) -> **H10** (copy vàaccessibility thôngbáo). Sửa theo component và cómocktest, giữresponsive liênquan; không thayAPI/auth toàncục cùnglúc thiếu regression.

### Ma trận kiểm thử còn phải chạy

| Tình huống | Kết quả mong muốn | Trạng thái |
|---|---|---|
| GET chậm3/10/30s, timeout | Có trạngthái tải, thoát được, giữdata cũ | CHƯA FAULT TEST |
| 200rỗng vs500/offline | Empty khácerror; resetfilter/retry đúng | Source gaps xácnhận; browserCHƯA |
| 401+refreshthànhcông | Mộtrefresh cho requests đồngthời, retryđúng | Source sharedpromise có; E2ECHƯA |
| Refresh401/403 vsnetwork/429/cancel | Authfailure khácunavailable; draft/returnroute đúng | H01source; E2ECHƯA |
| CSRFpending/403code/permission403 | Deadline/cancel, retrygiới hạn, không bypass quyền | H02source; E2ECHƯA |
| RetryAfter seconds/date/malformed | Chờđúng vàabort, không retryvôhạn | H03source; mockCHƯA |
| Mấtresponse POST sau servercommit | Không gửi trùng; cóđường xácnhận trạngthái | H07risk; fixture/backendCHƯA |
| Chuyểnfilter/collection/fileA-B nhanh | Kếtquảcuối đúngidentity; cancellationkhông báo lỗi | Imageversion có; cácflowkhácCHƯA |
| Ảnh404/decodeerror/preview còn | Ratioổnđịnh, phânbiệtbroken/loading, giữpreview | H06source; browserCHƯA |
| Tảithêm lỗi/rỗng/hếtlist | Không mấtlist, cursorđúng, retrykhông trùng | H09source; browserCHƯA |
| Logout/đổitài khoản/offline | Không lộprivatecache hoặc gửi bằng token cũ | CHƯA KIỂM TRA |
| Mobile/keyboard/reader | State/error/retry không tràn, focus vàannouncement đúng | CHƯA KIỂM TRA đủ |

### Cách kiểm tra an toàn và nghiệm thu sau này

- Ưu tiên mockunit/fixture và interception đápứng giả cho fault; giữrequestmutation không tới backend thật. Chưa tạo fixture ởlượt chỉphân tích này.
- Auth cầnphiên hợp lệ hoặc fixture côlập, không giảmạo quyền ởappthật. Backend local có thể nối dữliệu thật; không mặcđịnh disposable.
- Không auto-retry create/cancel/payment/contract/notification action nếu chưa có safe semantics. Mọi test ảnhhưởng dữliệu cầnphạmvi được user giao.
- Từngissue cần expectedstate, requestcount, datakept, operationidentity, cancelcleanup, cáchretry và evidence; testdesktop/mobile, rồi build nếu cócode.
- Chưa audit đầyđủ admin mutation/editimage/download histories/privatecache/response schema malformation. Giữmở, không nói toànwebsite đãharden vì đọcsource hoặc buildpass.

<a id="copy-analysis"></a>
## Phần 10: phân tích nhãn và câu chữ giao diện

Ngày: 2026-10-13. **ĐÃ RÀ NGUỒN TRONG PHẠM VI DƯỚI ĐÂY; CHƯA SỬA COPY/CODE, CHƯA NGHIỆM THU BROWSER.** Không thay giá, chính sách, loại dịch vụ hoặc lời cam kết chưa được xác nhận.

### Phạm vi

Đọc Impeccable clarify và đối chiếu Header, TimedCardSlider, BookingModal, BookingPage, MyBookings, ContactPage/ContactButton, Footer, brand constants, i18n vi và hai helper lỗi. Ghi nhận luồng, không chỉ tìm chữ tiếng Anh. Không rà đầy đủ mọi admin dialog, upload/edit image, auth message hoặc nội dung bài viết. Giao diện browser mới ở phần8 chưa render app nên không có bằng chứng mới về truncation, tooltip hay screen reader.

### Quy tắc đề xuất

- Nhãn trả lời 'bấm xong điều gì xảy ra'; không hứa chức năng chưa có.
- Cùng đối tượng/cùng tác vụ dùng cùng từ, kể cả desktop/mobile, tooltip và accessible name.
- Tiếng Việt là mặc định hiện tại. Giữ tên thương hiệu, Email, Zalo hoặc thuật ngữ đã được duyệt; không dịch tên gói Couple/Mini session hoặc đổi taxonomy dịch vụ tùy tiện.
- Loading nói việc đang làm, success chỉ xác nhận việc thực sự hoàn tất; đã gửi yêu cầu không đồng nghĩa lịch đã xác nhận.
- Error nêu việc chưa làm được, nguyên nhân chỉ khi biết, và hành động phục hồi có thật. Không hứa giữ draft hoặc retry nếu code chưa hỗ trợ.
- Placeholder chỉ là ví dụ; label bền vững, required/optional thống nhất, validation chỉ rõ field.
- Copy ngắn không có nghĩa viết tắt mơ hồ. Giữ khả năng xuống dòng, tiếng Việt có dấu, tên động dài và nhãn cho icon.

### Findings ưu tiên

#### C01 [P1 về kỳ vọng chức năng]. Success booking có nút không đúng kết quả

- Vị trí: BookingModal.tsx:170–171.
- Source: 'Xem chi tiết booking' navigate('/profile'), không đi tới booking cụ thể; 'Thêm vào lịch' chỉ toast 'Bạn có thể thêm lịch sau khi booking được xác nhận'.
- Tái hiện cần làm: success fixture, bấm hai nút; không tạo booking thật chỉ để kiểm tra nhãn.
- Ảnh hưởng: người dùng nghĩ có thể xem yêu cầu vừa tạo hoặc tạo sự kiện ngay nhưng không nhận được kết quả đó.
- Đề xuất sau khi chọn hành vi: nếu đi tới danh sách thì 'Xem lịch đặt của tôi' và route đúng; nếu chi tiết thì dùng ID của kết quả. Calendar chỉ được đặt nhãn 'Thêm vào lịch' khi có chức năng thật; chưa có thì trình bày trạng thái/help đúng, không dùng success toast giả thao tác thành công.
- Đây là khoảng thiếu chức năng giao phần9, không hoàn thành chỉ bằng dịch chữ booking.

#### C02 [P2]. Slider dùng ngôn ngữ của travel demo thay vì thao tác ảnh

- Vị trí: TimedCardSlider.tsx:177–185.
- Hiện tại: 'Bookmark destination', 'Remove bookmark', 'PAUSE EXPLORING', 'CONTINUE EXPLORING', 'Explore {region}', 'Previous/Next destination', 'Pause/Play'.
- Đề xuất nhãn sát hành vi: 'Tạm dừng trình chiếu' / 'Tiếp tục trình chiếu'; 'Ảnh trước' / 'Ảnh tiếp theo' nếu mỗi slide đúng là một ảnh; thumbnail 'Chuyển đến {tên hiển thị}' thay vì hứa mở Explore khi handler chỉ đổi slide.
- Bookmark cần chốt lưu ảnh/đối tượng gì trước; không đổi sang 'Lưu ảnh' trong khi handler vẫn chỉ setSaved cục bộ (A05).
- Tái hiện cần làm: nhìn text, hover tooltip và đọc accessible name ở desktop/mobile/keyboard. Nhãn động dài không cắt mất đối tượng.

#### C03 [P2]. Menu cùng route có tên khác nhau

- Vị trí: Header.tsx:298/299/443; Footer.tsx:32; ContactButton.tsx:46; i18n/locales/vi.ts:846.
- '/blog': desktop 'Câu chuyện', mobile 'Blog'; '/about': 'Về studio' và 'Về chúng tôi'; nút liên hệ aria-label='Contact'; lịch sử tải có dạng 'Lịch sử tải' và 'Lịch sử tải xuống'.
- Đề xuất glossary dùng cùng tên across surfaces. 'Câu chuyện' có giọng thương hiệu, 'Bài viết' rõ loại nội dung hơn; chọn theo nội dung thực, không tự quyết đổi hướng blog. 'Về PhotoCloud' không thêm khẳng định về studio đã xác minh; tên khác hiện tại vẫn cần duyệt nếu đổi.
- Bổ sung icon label rõ: 'Liên hệ', 'Mở menu điều hướng'; trạng thái mở/đóng dùng aria-expanded, không chỉ đổi chữ.
- Không gọi mọi variation là bug; mục tiêu tránh người dùng hiểu là hai chức năng khác nhau.

#### C04 [P2]. Summary booking hiển thị mã nội bộ và ngày chưa được định dạng

- Vị trí: BookingModal.tsx:246: requestedDate và requestedTimeSlot hiển thị trực tiếp; MyBookingsPage.tsx:46–51 đã có timeSlotLabels tiếng Việt.
- Tái hiện cần làm: chọn Buổi sáng rồi tới summary; source dự kiến hiện 'YYYY-MM-DD · morning'. Đây là đường render trực tiếp, chưa có screenshot mới.
- Đề xuất: map enum morning/afternoon/evening/flexible thành Buổi sáng/Buổi chiều/Buổi tối/Linh hoạt theo một nguồn chung; format ngày vi-VN, xử lý giá trị không hợp lệ rõ.
- Không chuyển 'Linh hoạt' thành giờ cụ thể, không đổi timezone hoặc ngày dữ liệu trong bước sửa câu chữ. Date-only cần tránh parse lệch ngày do timezone.

#### C05 [P2]. Nhãn bước/form và validation chưa giải thích nhất quán

- Vị trí: BookingModal.tsx:121–128/189–195/218–234/270; BookingPage.tsx:137–160.
- Điểm tốt: 'Ngày mong muốn' có help nói chưa phải lịch xác nhận; input có label thật; full page ghi ngày thay thế không bắt buộc.
- Điểm lệch: step04 'Xác nhận' dễ bị hiểu là xác nhận lịch, trong khi đó là rà yêu cầu; 'Đặt lịch đầy đủ' chưa nói đây là mở trang; 'form', 'concept', 'photographer' lẫn Việt; modal không ghi required/optional như page. Lỗi 'điền đủ thông tin liên hệ' không chỉ field thiếu.
- Đề xuất: 'Kiểm tra yêu cầu' cho bước rà soát; 'Mở trang đặt lịch' nếu đúng destination; 'Phong cách chụp / ghi chú' chỉ khi giữ đúng nghĩa của concept; required/optional đúng validation hiện có. Lỗi theo field như 'Vui lòng nhập số điện thoại' chỉ khi field đó thật sự thiếu.
- Nút custom quote mở '/booking' chưa truyền mode trong đoạn nguồn; không đổi nhãn thành 'Mở trang báo giá' trước khi kiểm tra/hoàn thiện destination.
- Không rút gọn bằng cách bỏ yêu cầu bắt buộc hoặc tự đổi giới hạn số người.

#### C06 [P2, giao H10]. Có hai helper lỗi, đều có đường lộ thông báo kỹ thuật/Anh

- Vị trí: utils/errorHandler.ts:26–75; lib/utils.ts:200–216. BookingModal/MyBookings import helper lib/utils, không phải mọi caller đều đi qua errorHandler.
- Cập nhật độ chính xác cho phần9: helper lib/utils trả error.message ngay khi error instanceof Error; AxiosError thuộc đường này có thể hiện 'Request failed with status code...' thay vì message backend/fallback Việt. Helper errorHandler lại có mapping timeout/network/status bằng tiếng Anh.
- Đề xuất phân loại theo error code/status rồi tạo câu Việt theo thao tác. Ví dụ draft: 'Không thể tải ảnh. Hãy kiểm tra kết nối và thử lại'; 'Bạn không có quyền thực hiện thao tác này'; 'Chưa thể xác định yêu cầu đã được gửi hay chưa. Hãy kiểm tra lịch đặt trước khi gửi lại' chỉ khi state ambiguous được phát hiện đúng.
- Không gọi mọi500 là 'mất mạng', mọi401 là 'hết phiên', hoặc dùng câu 'đã giữ dữ liệu' khi persistence chưa có. Backend message chưa được duyệt không tự là copy tốt.
- Lỗi phải ở vùng liên quan và retry có thật; đổi toast không sửa H04 empty/error conflation.

#### C07 [P2]. Loading/empty/success chưa nói đúng ngữ cảnh

- Vị trí: MyBookingsPage.tsx:158–167; ExplorePage.tsx:209–216; ContactPage.tsx:53–54/70/133; Footer.tsx:128–143.
- Lịch đặt: filter rỗng vẫn nói 'Chưa có lịch đặt nào', dù có thể chỉ không có lịch khớp filter. Đề xuất 'Không có lịch đặt phù hợp với bộ lọc' + action bỏ filter khi đó là trạng thái thật; tài khoản chưa có lịch là thông điệp khác.
- Contact: nút 'Gửi qua email' và loading 'Đang mở email' đã tương đối sát mailto. Tuy nhiên gán window.location không chứng minh app mail mở thành công; toastsuccess không nên khẳng định gửi hoặc mở thành công chắc chắn. Thêm helper 'Mở ứng dụng email để bạn tự gửi' nếu giữ hành vi.
- Newsletter: 'Đăng ký nhận tin' nhưng mailto dùng tone không phải email (A10). Copy cần chờ chức năng được xác nhận; không đổi text rồi đóng issue.
- Khung loading của slide/ảnh phải phân biệt với broken/error trước khi viết câu; không dùng 'sắp xong' hoặc phần trăm giả.

#### C08 [CHỜ XÁC NHẬN, không tự sửa]. Copy chứa cam kết kinh doanh/riêng tư

- Vị trí: brand.ts:27/54–59; BookingModal.tsx:165/230/249/266; ContactPage.tsx:70/79; các package/testimonial/FAQ hiện có.
- Bao gồm phản hồi24h, giao5–7ngày, đổi lịch1lần, chưa thanh toán, thông tin 'chỉ dùng ... để trao đổi', giờ làm việc và ví dụ dịch vụ/personnel. Source không xác nhận được những tuyên bố này ngoài đời.
- Không viết thêm 'miễn phí', 'đảm bảo', 'không lưu dữ liệu', 'còn chỗ', địa chỉ/phạm vi phục vụ hoặc khách hàng thật. Không coi placeholder Hà Nội là xác nhận địa bàn hoạt động.
- Đề xuất: người phụ trách duyệt nguồn thật, rồi cập nhật đồng bộ copy/meta/FAQ/schema; nếu không được duyệt thì cần quyết định sản phẩm riêng, không tự bỏ/thay chính sách trong clarify.

### Glossary đề xuất, chưa áp dụng

| Khái niệm | Cách dùng đề xuất | Ràng buộc |
|---|---|---|
| booking request | Yêu cầu đặt lịch | Khác lịch đã xác nhận |
| My bookings | Lịch đặt của tôi | Cùng tên nav/title/CTA |
| booking code | Mã yêu cầu / Mã đặt lịch | Chọn một tên, giữ mã dữ liệu |
| submitted/pending | Đã gửi yêu cầu / Chờ xử lý | Đã gửi là kết quả thao tác; pending là trạng thái |
| confirmed | Đã xác nhận | Không dùng cho step rà thông tin |
| reschedule request | Yêu cầu đổi lịch | Không gọi đã đổi lịch trước khi nghiệp vụ xác nhận |
| favorite | Yêu thích / Bỏ yêu thích | Tách saved/bookmark nếu là chức năng khác |
| collection | Bộ sưu tập | Không đổi thành gallery nếu quan hệ sản phẩm khác |
| slideshow | Trình chiếu | Tạm dừng / Tiếp tục, không 'dừng khám phá' |
| download history | Lịch sử tải xuống | Không nhầm với đang tải hoặc lưu ảnh |
| concept | Phong cách / ý tưởng chụp | Giữ tên/thuật ngữ nghiệp vụ đã duyệt khi cần |

Không dịch nhãn enum trong payload/API, không sửa slug/router/status code; glossary chỉ áp lớp hiển thị. Sử dụng i18n hiện có và message hoàn chỉnh, tránh nối câu gây thứ tự từ sai. Language switcher tắt không chứng minh mọi locale đã chuẩn.

### Thứ tự xử lý phần10 khi được giao sửa

1. Nhãn/success sai kết quả C01, C07: chốt chức năng đúng trước; không đổi lời để che affordance giả.
2. Error taxonomy và thông báo phục hồi C06 cùng harden; tránh frontend hứa server chưa hỗ trợ.
3. Summary/date/enum và required/validation C04/C05.
4. Glossary nav/slider/tooltip/accessibility C02/C03, giữ thương hiệu và tên gói đã duyệt.
5. Cam kết C08 chỉ sau xác nhận; rà các mặt UI/meta/schema liên quan, không tạo thông tin mới.

C01–C08 là ghi nhận copy/chức năng, không cộng thành tám lỗi browser-confirmed mới vào tổng14. Có overlap H04/H07/H10, A05/A10/A13 và critique.

### Còn phải kiểm tra

- [ ] Nhãn thực + tooltip + accessible name cùng tác vụ; đọc bằng NVDA/VoiceOver, không kết luận từ title attribute.
- [ ] Desktop/mobile320/390/768/1024/1440, tên động dài và zoom200%; text xuống dòng không cắt/mất đối tượng.
- [ ] Đọc toàn bộ booking package/custom quote: step, validation, submit, success, chi tiết, calendar; dùng fixture tránh ghi dữ liệu thật.
- [ ] Loading/empty/filter/error/permission/session/rate limit/ambiguous submit có câu đúng state và action đúng code.
- [ ] Tài khoản/admin, destructive dialogs, edit/upload/download, signin/signup và các locale chưa được rà toàn bộ.
- [ ] Xác nhận giá, chính sách, quyền ảnh/riêng tư, dịch vụ và lời cam kết từ người phụ trách.
- [ ] Sau sửa code: browser và build; chưa có sửa nên lượt này không chạy build, không tuyên bố mọi câu chữ đã rõ.

<a id="generate-analysis"></a>
## Phần 11: khám phá phương án thay thế

Ngày: 2026-10-13. 🟢 **XANH — thấp, làm sau lỗi chức năng.** Tiếp tục giai đoạn phân tích trước: có brief và hướng đề xuất, **chưa tạo ba bản preview, chưa chạy live-generate, chưa sửa UI chính**. Không gọi ba ý tưởng chữ là ba phương án đã render/kiểm tra.

### Phần11 khác sửa lỗi như thế nào?

Generate dùng để so sánh những cách trình bày khác nhau của **một thành phần được chọn**, không thay thế adapt/harden. Không cần redesign header/gallery chỉ để sửa overflow. Có thể giữ thiết kế hiện tại nếu sau sửa chức năng nó đã rõ và đẹp.

Yêu cầu gốc còn để `[header/gói chụp/gallery]`; chưa có target duy nhất. Cần chọn **thành phần + hướng** trước khi tạo preview. Đề xuất mặc định: **gói chụp, hướng layout** vì có dữ liệu hiện có để so sánh, phạm vi cô lập hơn header và ít rủi ro hơn grid ảnh/modal navigation. Đây là đề xuất, không phải lựa chọn đã được người dùng duyệt.

### Ràng buộc chung cho mọi phương án

- Giữ nền PhotoCloud, tên/font/ảnh hiện có và nhận diện; không rebrand.
- Cả3phương án dùng cùng dữ liệu thật hiện có để so sánh công bằng; không thêm gói/giá/dịch vụ/review/số liệu hoặc claim.
- Giữ đủ mọi tác vụ: preview không được đẹp hơn nhờ bỏ nút, thông tin cần quyết định hoặc route.
- Kiểm tra320/390/768/1024/1440, text dài, zoom, keyboard và touch; ghi riêng phần chưa thử trên máy thật.
- Preview không ghi backend; không submit booking hay mutate favorites/collections để minh hoạ.
- Không thêm motion/reveal hoặc minimum loading trong đợt so sánh layout.
- Người dùng xem và chọn trước khi thay giao diện chính. Chưa chọn không tự Accept/apply.

### Ba hướng cho gói chụp nếu được chọn

| Phương án | Khác biệt cấu trúc | Lợi ích cần kiểm chứng | Rủi ro cần kiểm tra |
|---|---|---|---|
| A — Card ảnh, thông tin cùng thứ tự | Giữ card/ảnh hiện tại; tên, giá, meta, mô tả và CTA có recipe nhất quán | Nhận diện và so sánh nhanh, thay đổi nhỏ | Text dài/CTA lệch, đủ thông tin mobile; không crop sai mục đích |
| B — Danh sách so sánh gọn | Desktop các hàng dữ liệu dễ đối chiếu; mobile từng gói reflow thành nhóm rõ | Giá/thời lượng/sốảnh dễ so sánh | Không thành bảng cuộn khó dùng hoặc mất ảnh/chức năng |
| C — Ảnh dẫn đầu, thông tin kế tiếp | Mỗi gói có vùng ảnh và nhóm thông tin không lồng card; mobile ảnh->thông tin->CTA | Ảnh được xem rõ hơn, ít nhiễu | Độ dài trang và tốc độ tìm gói; không tự gán portfolio không có dữ liệu |

Không tạo badge 'khuyên chọn' hoặc tier nổi bật mới nếu chưa có nguồn sản phẩm. Badge hiện có cũng phải được duyệt về nghĩa, không suy từ data hardcode là sự thật kinh doanh.

### Nếu chọn header hoặc gallery thay vì gói chụp

- **Header:** A giữ một hàng rõ nhóm; B phân cấp nav/action có menu phụ; C ưu tiên tác vụ chính và gom utility. Cả3 vẫn có đường tới mọi route/account action; không tự chọn booking là mục tiêu số1. Test guest/member/admin, nềnảnh/nềnđặc, chiều rộng tablet và menu thấp; không thay hide/show/scroll semantics trong preview layout.
- **Gallery:** A giữ justified/masonry hiện tại và tổ chức action; B mật độ thoáng hơn để xem ảnh; C mật độ gọn hơn để scan nhiều ảnh. Giữ tỷ lệ ảnh, filter/sort/loadmore, author và action theo quyền; không ép mọi ảnh thành vuông hoặc thay thuật toán/routing chỉ để render preview đẹp.
- Các nhánh này là brief thay thế, không phải9preview đã có. Chỉ tạo3phương án cho target được chọn.

### Bảng màu cho toàn bộ backlog hiện tại

Màu là ưu tiên, không thay trạng thái hay độ tin cậy. Các nhóm trùng ID được liên kết, không cộng số lượng thành lỗi mới. Chưa phát hiện P0 trong phạm vi đã audit, không chứng minh toàn site không có P0.

| Màu | ID / nhóm | Việc cần làm | Trạng thái / chứng cứ |
|---|---|---|---|
| 🔴 ĐỎ | A01/R01 | Studio mobile/tablet cắt nội dung/CTA | Đã có bằng chứng browser cũ; chưa sửa |
| 🔴 ĐỎ | A02/R05 | Focus booking ra nền | Đã tái hiện cũ; chưa sửa |
| 🔴 ĐỎ | A03 | Reduced motion chưa đủ đường JS | Đã tái hiện cũ; sửa trước motion mới |
| 🔴 ĐỎ | A04 | Icon bookmark thiếu tương phản | Đã đo màu; các chữ khác cần xét nền thực |
| 🔴 ĐỎ | A05 | Bookmark báo lưu nhưng chỉ local state | Source xác nhận; chờ xác định đối tượng lưu |
| 🔴 ĐỎ | A06 | Chuông thiếu focus indicator | Rủi ro từ CSS; cần kiểm chứng phiên thật sớm |
| 🔴 ĐỎ | H01/H02/H07 | Refresh mất auth do mạng, CSRF deadline, mutation trùng/ambiguous | Rà source/risk; cần fixture và kiểm chứng trước sửa shared logic |
| 🔴 ĐỎ | C01 | Success actions sai kỳ vọng: calendar/detail booking | Source xác nhận hành vi; chốt chức năng trước đổi nhãn |
| 🟡 VÀNG | A07/A08/R02/R03 | Card offscreen focus và vùng bấm nhỏ | Chưa sửa; có thể làm cùng responsive/focus |
| 🟡 VÀNG | A09/H04 | Loading/empty/error và retry | Source gaps; fault test còn thiếu |
| 🟡 VÀNG | A10/A13 | Newsletter và collections guest | Source/redirect có bằng chứng; chờ chức năng/policy |
| 🟡 VÀNG | A14/R04 | Mobile Back mất scroll | Đã có test cũ; sửa cùng nhómmodal/history |
| 🟡 VÀNG | A11 | JS/startup/slider performance còn lại | Font đã sửa; trace/throttle/hosting còn mở |
| 🟡 VÀNG | A12 | Theme lệch token | Source risk; live dark còn thiếu |
| 🟡 VÀNG | H03/H05/H06/H08/H09 | Rate limit, collection recovery, ảnhhỏng, uploadstale, Explore pagination | Rà source, chưa fault test đầy đủ |
| 🟡 VÀNG | H10/C06 | Error taxonomy/helper tiếng Anh hoặc technical | Rà source; không chỉ thay toast |
| 🟡 VÀNG | C02–C05/C07 | Nav/slider/summary/form/empty/contact copy | Rà source, chưa sửa; cần đúng chức năng |
| 🟡 VÀNG | LT01–LT06 | Recipe gói, đọc chữ, heading, spacing, grouping và caption | Đã phân tích; sau responsive liên quan |
| 🟢 XANH | LT07 | Tinh chỉnh fallback/weight metrics nếu cần | Chưa chứng minh lỗi mới; đo trước thay pipeline |
| 🟢 XANH | Phần11 | 3phương án layout thay thế | Chờ target/hướng; chưa preview |
| 🟢 XANH | Phần12 mới / polish | Motion có mục đích, radius/shadow tinh chỉnh | Chưa chọn thành phần; không bao gồm sửa A03 |
| CHỜ XÁC NHẬN | C08 và quyết định sản phẩm | Dữ kiện kinh doanh, privacy/giá/chính sách, mục tiêu và quyền public | Không chấm xanh chỉ vì chưa có bug; xác minh trước phát hành |

### Thứ tự thực hiện và tiêu chí lựa chọn

1. Xử lý nhóm đỏ có bằng chứng; nhóm đỏ mới là rủi ro nguồn thì kiểm chứng có kiểm soát trước. Sửa responsive và modal có thể giải quyết luôn vài mục vàng chung component.
2. Khắc phục trạng thái/chức năng và câu chữ gây hiểu sai; đồng bộ phần8/10 sau layout dùng được.
3. Chỉ dùng generate khi vẫn cần đổi cách trình bày. Chọn target/hướng, tạo3preview để xem; không tự áp dụng.
4. So sánh cùng dữ liệu theo: đủ chức năng, đọc rõ, không tràn/méo, thao tác keyboard/touch, tốc độ tìm hành động và cost/performance. Thẩm mỹ chỉ sau các tiêu chí này.
5. Nếu cả3 đều không tốt hơn hiện trạng, giữ hiện trạng; không bắt chọn một bản mới vì đã tạo preview.

### Checklist phần11

- [x] Có brief/ràng buộc và3hướng đề xuất cho gói chụp.
- [x] Đã thêm màu ưu tiên với text, tách urgency/status/evidence.
- [ ] Người dùng chọn header/gói chụp/gallery và hướng layout/typeset/polish/... cụ thể.
- [ ] Tạo3preview render bằng workflow Impeccable phù hợp, không gọi ý tưởng chữ là preview.
- [ ] So sánh desktop/mobile, longcontent, zoom và toàn bộ action; kiểm tra font/ảnh và không ghi dữ liệu thật.
- [ ] Người dùng chọn phương án. Chưa chọn không sửa main UI; nếu không đủ môi trường preview phải báo rõ.
- [ ] Nếu được giao áp dụng: kiểm tra browser/build, regression và cập nhật bảng trạng thái. Lượt tài liệu này không chạy build.

<a id="motion-analysis"></a>
## Phần 12: phân tích motion và bắt đầu sửa theo ưu tiên

Ngày: 2026-10-13. Đây là mục cuối của danh sách yêu cầu đã gửi (không có số3/6 trong bản đó). **Phân tích không đồng nghĩa mọi mục đã thực hiện xong.** Generate cần lựa chọn; các kiểm tra browser/account/device và sửa code vẫn theo bảng trạng thái.

### Motion hiện có và hướng xử lý

| Màu | Vị trí / bằng chứng | Vai trò / rủi ro | Hướng xử lý, chưa áp dụng ở lượt này |
|---|---|---|---|
| 🔴 ĐỎ | TimedCardSlider.tsx/CSS, A03: reduce vẫn đổi01->02 sau6.7s trong phép thử cũ | Chuyển ảnh có ý nghĩa nhưng autoplay/spatial motion chưa tôn trọng preference đầy đủ | Tách nhánh reduce cho JS/WAAPI; giảm chuyển động và có control, test pause/focus/hidden/repeated input |
| 🔴 ĐỎ — cần kiểm chứng theo nội dung | useRevealOnScroll.ts:33+ và index.css:769+ | Hook thêm classopacity0, đợiobserver/delay mới hiện; có fallbackreduce/noobserver nhưng nội dung vẫn phụ thuộc reveal sau khi class thêm | Nội dung visible mặc định, enhancement không làm biến mất; kiểm tra refresh giữa trang và cuộn nhanh; không thêm reveal toànsite |
| 🟡 VÀNG | TimedCardSlider.tsx: chuyểnảnh rAF/Element.animate; progresswidth | Layout-driving properties có thể tốn chi phí; chưa có traceFPS xác định mức giật | Đo trước; transform/FLIP nếu giữ đúng tỷ lệ, interruption và lifecycle; không đổi hiệu ứng cùng layout sửa gấp |
| 🟡 VÀNG | useRevealOnScroll.ts: setTimeout(delay) không lưu đểclear ởcleanup | Delay có thể còn chạy sau cleanup; mức tác động cần fixture | Cancel timer/observer rõ, không đặt revealedstate cho node đã bị thay; không coi cleanup là redesign |
| 🟡 VÀNG | Header.tsx scrollpassive+rAF; Header.css nền/shadow180ms | Phản hồi nềnheader cần rõ, không cần thêm entrance/hide choreography | Giữ logic; đo firstpaint/auth/scroll, không sửa scroll semantics từ animation |
| 🟡 VÀNG | HeaderMarquee.css: track45s loop, hoverpause, reducedmotionnone | Ribbon cóloop không cần thiết cho đọc; hoverpause không thay cho touch/control/offscreenpause | Nếu giữ, phải không chặn nội dung/focus, xem touch/reduce/visibility; không thêmloop mới |
| 🟢 XANH | HeroBooking.css fade/reveal/highlight/cardstagger, CTA/hover; BookingModal.css fade200ms/transition250ms | Nhiều effects nhỏ chồng lên nhau; modal transition có thể giải thích lớp | Giảm effects thừa sau chức năng; giữ feedbackngắn, không kéo dài loading; testreduce ởpath thực |

### Quy tắc triển khai khi đến motion

- Không thêm animation mới trong đợtresponsive A01; không phục hồi thử nghiệm người dùng đã xoá.
- Phân biệt sửaA03/reveal gây mấtcontent (ưu tiên cao) với trangtrí mới (xanh làm sau).
- Motion chỉ giải thích trạngthái/liênhệ hoặc xác nhận hànhđộng. Một focal sequence nếu thật sự cần; không animate mọisection.
- Nội dung đọc và thao tác được ngay; không ép scroll, không minimumwait, không giữopacity0 để chờ animation.
- Reducedmotion cần xử lý cả CSS lẫn JS, pause hidden/offscreen cho loop không cần thiết; interaction feedback vẫn rõ.
- Không khẳng định transform luôn nhanh; đo mainthread/layout/paint/frames trên device đại diện.
- Test refreshđầu/giữa, scrollnhanh, pause/resume, bấmliêntục, resize/rotation, focus, open/closemodal. Giữ URL và scrollrestoration.
- Mỗi lần một component, diffnhỏ và hoàn tác riêng; không thaybrand/copy/data/routing vì motion.

### Bắt đầu sửa: A01/R01 studio responsive

**Trạng thái: ĐÃ SỬA, CẦN KIỂM TRA FULL APP/THIẾT BỊ THẬT.** Chưa đóng toàn bộ phần7 hoặc các findings khác.

- File ứng dụng đổi: `frontend/src/components/booking/HeroBooking.css`.
- Nguyên nhân: trackmarquee nowrap có intrinsicwidth lớn kéo track1fr tự động trênmobile/tablet; child không co về cột. Fixedheight ởviewportthấp cũng có rủi ro cắt theo chiều dọc.
- Sửa: trackmobile `minmax(0,1fr)`; min-width0 cho marqueewrap/copy/visual/collection; gallery2cột cóminmax0. Cho title/description wrap, CTAmaxwidth100 và wrap; collectioncard mobile/tablet cóaspectratio4:3, visual tựtăngheight. Desktopthấp<=650 cho sectiontăngheight tựnhiên thayép cắt.
- Không đổi thông tin/giá, fontidentity, actions/handlers, header, slideshow, auth, API hoặc modalrouting. Không thêmmotion.
- Test mới: `frontend/scripts/check-hero-responsive.cjs`, Edgeheadless **fixture CSS cô lập**, không API. Markupđại diện, fontfallbackArial/Georgia và cardplaceholder; không phải render Reactfullapp hoặc test ảnhCDN thật.
- Baseline fixture: copy~2954px ở320/390; ~2948px ở768, clippingcopy/sub/title/actions/visual/grid. Số khác~2582 củaappcũ do fixturetext/font khác; không trộn hai số làm cùng benchmark.
- Sau sửa fixture: copy272/342/720px tại320/390/768; 1024/1440 vẫn492.4/707.7px. Cả8viewport không có bodyoverflow/clipping củaselectors đo và CTA không textoverflow.
- Matrix: 320x568,390x844,768x1024,1024x768,1440x900,844x390,900x650,901x650. Hai phía900/901 vàphone ngang đã thử; không bao phủ tấtcả breakpoints/zoom.
- Raw evidence: `frontend/hero-responsive-baseline.json`, `frontend/hero-responsive-after.json`; screenshots `frontend/hero-responsive-390.png`, `frontend/hero-responsive-1440.png`. Đây là fixture, không dùng minh hoạ như screenshot app thật.
- Build: `npm run build` PASS; warningchunk~918KB/Zod/dynamicimport có sẵn còn tồn tại. Detector trênHeroBooking.tsx trả[]; không lấybuild/detector làm bằngchứng fullapp hếtlỗi.
- Edge sandbox launch lỗi; chạy fixture ngoài sandbox sau approval thành công. Không ghi dữliệu website.

Checklist sau sửa:

- [x] Baseline và afterfixture với CSS thật, támviewport.
- [x] Buildproduction và detector, rà diff phạmviCSS.
- [ ] Fullapp5175 với font/ảnh/dữliệu thật, guest/member; browseraudit trước đó chỉ thấyloader.
- [ ] 200/400%zoom, chữhệthống/tênđộng rất dài, empty/loading/errorgallery.
- [ ] Android/iOS thật, safearea/keyboardảo/touch vàrotation.
- [ ] Regression bookingCTA, collectionsnavigation, ảnhmodal/Back/refresh vàheader qua studio.

**Bước tiếp theo:** xác nhận fullapp của A01 khi render được, rồi A02 focusbooking; các nhóm H01/H02/H07 cần fixture riêng trước sửa sharedAPI. Không chuyển sanggenerate/animation mới khi các lỗi chức năng đỏ còn mở. Trong bảngmàu phần11, A01 đã có thayđổi; xem nhật ký này thay trạngthái nguồn trước sửa.

### Nhật ký sửa A02: focus modal đặt lịch — 2026-10-13

**ĐÃ SỬA, KIỂM TRA COMPONENT ĐẠT; CHƯA NGHIỆM THU TOÀN ỨNG DỤNG.** Bảng lịch sử A02/CSS focus cũ được thay thế bởi trạng thái mới này, không đóng toàn nhóm modal/history.

- Dùng `@radix-ui/react-dialog` có sẵn, không thêm dependency. Portal/Overlay/Content quản lý focus trap, lớp nền và khoá cuộn; Title cung cấp tên dialog.
- Focus dialog khi mở và đổi bước/success. Tab/Shift+Tab ở trong dialog; Escape/close trả focus về phần tử mở nếu còn mounted, dùng preventScroll để tránh nhảy vị trí. Navigation tới trang khác không cố focus node đã mất.
- Bỏ listener Escape và bodyoverflow lock thủ công của riêng BookingModal để không chồng cơ chế Radix. Giữ text, CSS, request, validation, các mode, giá và handler booking hiện có.
- File ứng dụng đổi: `frontend/src/components/BookingModal.tsx`. Không sửa photo modal/Back, không thực hiện H01/H02/H07 trong đợt này.
- `frontend/scripts/check-booking-focus.cjs` bundle component BookingModal thật + React/Router/Radix; mock user/packages và cấm create mutation. Edgeheadless test320/390/768/1024/1440: initial focus, Tab12lần/ShiftTab8lần, đổi bước, Escape, closebutton, reopen và returnfocus đều PASS.
- Bằng chứng: `frontend/booking-focus-checks.json`, `frontend/booking-focus-390.png` (fixture, không phải production/tài khoản thật).
- Production build PASS với warning cũ về chunk/Zod/dynamicimport; detector trả[]. Không coi đây là type-check đầy đủ hoặc chứng nhận accessibility.
- ESLint BookingModal:0errors/1warning ởeffectprefillform đã có, không sửa logicform ngoài phạmvi focus.
- Thử tab mới app5175 vẫn chỉ có trạng thái khởi động ở thời điểm quan sát, chưa đo được studio với data thật. A01 vẫn 'đã sửa CSS, fixture PASS, chờ fullapp'; không tự coi đã kiểm tra app.
- Chưa kiểm tra: submitbooking thật, hếtphiên, nestedmodal/overlay với toànapp, screenreader, touchhardware, iOSSafari, zoom/keyboardảo, backgroundscroll và focus khi trigger bịdisable/routechange phức tạp. Cần bổ sung trước đóng A02 toàn diện.

**Tiếp theo:** xử lý reducedmotion A03 trong scope slider hoặc xác nhận fullapp A01/A02 khi app render được; giữ nguyên nhánh ảnh/Back chưa sửa A14. Không thêm motion mới hoặc tự triển khai3generatepreview.

## 1. Bối cảnh sản phẩm đầy đủ

<!-- impeccable:product-schema 1 -->

## Platform

web

## Record Scope and Authority

Tài liệu này thiết lập bối cảnh sản phẩm từ mã nguồn và yêu cầu người dùng trong cuộc trao đổi hiện tại. Không phải bản xác nhận thông tin kinh doanh của một studio đang hoạt động.

- **Yêu cầu đã xác nhận:** các ràng buộc người dùng nêu trực tiếp, đặc biệt responsive, bảo toàn luồng modal/refresh và không tự tạo thông tin kinh doanh.
- **Có bằng chứng trong triển khai:** route, component, service, tài nguyên và nội dung đang có trong repo. Sự hiện diện trong code không chứng minh nội dung kinh doanh là đúng hoặc chức năng đã được kiểm tra đầy đủ.
- **Chưa xác nhận:** phân khúc khách hàng, ưu tiên kinh doanh, thông tin studio, giá chính thức, cam kết dịch vụ, số liệu, khách hàng và testimonial.

Không tự chuyển mục chưa xác nhận thành dữ kiện đã duyệt trong các lần thiết kế tiếp theo. Khi có xác nhận mới từ người dùng, cập nhật đúng trường và nguồn.

## Users

Những vai trò có trong triển khai, chưa phải nghiên cứu người dùng đã được xác nhận:

- Khách truy cập: xem ảnh, tìm kiếm/khám phá, duyệt bộ sưu tập và nội dung công khai; xem thông tin gói chụp và mở giao diện đặt lịch.
- Thành viên đăng nhập: có route ảnh yêu thích, bộ sưu tập yêu thích, lịch sử tải, hồ sơ, thông báo và lịch đặt chụp.
- Quản trị viên: có route quản trị được bảo vệ và chức năng quản lý qua service. Không suy ra mọi quyền từ việc có nút upload; quyền thực tế cần đối chiếu frontend và backend.

Nguồn: `frontend/src/App.tsx`, `frontend/src/components/auth/ProtectedRoute.tsx`, `frontend/src/components/auth/AdminRoute.tsx`, `frontend/src/services/bookingService.ts`.

**Còn mở:** nhóm người dùng chính; họ ưu tiên xem/tải ảnh, quản lý thư viện hay đặt dịch vụ; nhu cầu accessibility đặc thù; phạm vi địa lý/ngôn ngữ ngoài UI tiếng Việt.

## Product Purpose

Theo khả năng đang được triển khai, PhotoCloud kết hợp:

1. Trải nghiệm xem và khám phá ảnh: slideshow, tìm kiếm, danh mục, trang ảnh và bộ sưu tập.
2. Các thao tác tài khoản liên quan đến ảnh: yêu thích, lịch sử tải, hồ sơ và thông báo.
3. Giao diện giới thiệu gói chụp và gửi/quản lý yêu cầu đặt lịch.

Không mặc định đây là website stock miễn phí, marketplace ảnh, nền tảng bán ảnh hay website của studio đã xác minh.

**Còn mở:** mức ưu tiên giữa khám phá ảnh và đặt lịch; tiêu chí thành công kinh doanh và KPI. Chưa có dữ liệu để đặt mục tiêu conversion, doanh thu hoặc số khách hàng.

## Positioning

Chưa có định vị khác biệt được người dùng xác nhận. Không tuyên bố PhotoCloud tốt hơn đối thủ, có quy mô cụ thể, phục vụ một phân khúc riêng hay cung cấp quyền sử dụng ảnh đặc biệt.

Việc người dùng tham chiếu Unsplash nhằm so sánh cảm giác refresh nhanh; không phải yêu cầu sao chép nhận diện, nội dung, mô hình kinh doanh hoặc điều khoản của Unsplash.

## Operating Context

- Website có frontend React/TypeScript/Vite, routing phía client và backend Node/Express. Các chi tiết này là hiện trạng repo, không phải quyết định chọn stack mới.
- Người dùng thao tác bằng desktop, mobile và tablet; viewport giả lập không thay cho thiết bị cảm ứng thật.
- Dữ liệu ảnh, bộ sưu tập, tài khoản và booking có service/API. Nguồn dữ liệu từng màn hình có thể khác nhau: trang chủ gói chụp còn dùng constants, booking lấy gói qua API.
- Có Service Worker và cache metadata slide theo phiên; tốc độ khi refresh cùng phiên khác với lần truy cập mới.
- Build production, môi trường dev và hosting thật phải được phân biệt khi báo hiệu năng. Kết quả local không chứng minh thời gian trên hosting thật.
- Ngôn ngữ giao diện chủ yếu là tiếng Việt. Language switcher hiện bị tắt trong `frontend/src/config/features.ts`; không quảng bá khả năng đa ngôn ngữ hoàn chỉnh chỉ vì có locale files.

## Capabilities and Constraints

### Khả năng có trong code

- Trang chủ trình diễn ảnh, nội dung studio, bộ sưu tập và gói chụp.
- Khám phá/tìm kiếm/danh mục ảnh, trang ảnh riêng và route bộ sưu tập.
- Đăng nhập và các route tài khoản được bảo vệ.
- Danh sách yêu thích và lịch sử tải ảnh qua các màn hình riêng.
- Đặt lịch qua modal và các route booking; service có tạo, xem và huỷ booking cùng các thao tác workspace. Sự hiện diện service không chứng nhận quy trình hợp đồng/thanh toán đã hoàn thiện.
- Blog, giới thiệu, liên hệ và quản trị có route trong ứng dụng.

### Hành vi phải bảo toàn theo yêu cầu người dùng

- Refresh thật đưa trang về đầu, không thêm khoảng chờ nhân tạo.
- Refresh trong trang ảnh/modal phải giữ đúng quy tắc mở ảnh thành trang riêng; sau đó vẫn có thể mở modal mới.
- Đóng modal/Back phải giữ đúng lịch sử và khôi phục vị trí phù hợp. Không dùng cờ reload áp dụng kéo dài cho mọi điều hướng trong phiên.
- Header và điều hướng không được nháy sai nền/màu, mất truy cập hoặc giật khi cuộn.
- Sửa frontend phải bao gồm responsive mobile/tablet/desktop trong cùng phạm vi. Các kích thước đại diện: 320, 390, 768, 1024 và 1440px khi phù hợp với thay đổi.
- Giữ nguyên chức năng ngoài phạm vi được giao; không thay nội dung thực tế, giá hoặc chính sách như hệ quả phụ của chỉnh thiết kế.
- Không thêm loading để che việc tải chậm. Hiệu năng cần có số đo trước/sau và điều kiện đo.
- Animation không được tạo khoảng trống, cắt nội dung, che focus hoặc can thiệp ngoài ý muốn vào cuộn.

### Trạng thái chưa hoàn thiện

Không coi mọi capability phía trên là đã hoạt động đúng. `frontend-audit.md` ghi nhận các lỗi như grid studio mobile bị cắt, focus modal, bookmark slideshow chỉ có state cục bộ, newsletter chưa nối đúng và reduced motion chưa đầy đủ. Không tự đánh dấu đã sửa khi chỉ build qua.

## Brand Commitments

- Tên đang dùng trong repo: **PhotoCloud**; tên mở rộng: **PhotoCloud Studio**; text logo cấu hình là `photocloud`.
- Tagline trong constants: “Chụp ảnh theo cách của bạn”; tagline phụ: “Kể chuyện bằng ánh sáng”. Đây là nội dung hiện có, không có yêu cầu đổi tên/tagline trong phạm vi init.
- Giọng thương hiệu đang được mô tả trong code là “Ấm, cao cấp, riêng tư”. Ghi nhận như định hướng hiện có để tránh chỉnh sửa tuỳ tiện, không coi là tuyên bố về chất lượng dịch vụ đã chứng minh.
- Người dùng yêu cầu dùng nền PhotoCloud cho màn hình tải và biểu tượng máy ảnh. Không mở rộng yêu cầu này thành một rebrand hoặc phong cách mới cho mọi màn hình.
- Giữ nhận diện hiện có khi tinh chỉnh; thay nhận diện hay nội dung thương hiệu cần yêu cầu rõ của người dùng.

Nguồn: `frontend/src/constants/brand.ts`, `frontend/src/config/logo.ts` và yêu cầu trực tiếp trong cuộc trao đổi.

Palette, typography, component recipes và concept từng màn hình không được định nghĩa mới trong PRODUCT.md. Chúng thuộc tài liệu thiết kế riêng nếu được giao lập; lượt init này không tạo DESIGN.md.

## Evidence on Hand

| Nguồn | Có thể dùng làm bằng chứng | Không được tự suy ra |
|---|---|---|
| `frontend/src/App.tsx` | Các route và guard đang triển khai | Mọi route đã hoàn thiện hoặc được audit |
| `frontend/src/constants/brand.ts` | Tên/tagline và cấu hình copy hiện có | Domain/contact đang vận hành, số booking, rating, chính sách đã duyệt |
| `frontend/src/constants/packages.ts` | Dữ liệu gói chụp hardcode và cấu trúc UI | Giá/dịch vụ/delivery là chính thức hoặc đã đồng bộ API |
| `frontend/src/components/TestimonialsCarousel.tsx` | Có testimonial hardcode và URL ảnh đại diện | Đây là khách hàng, ảnh hay đánh giá thật |
| `frontend/src/services/bookingService.ts` | Hợp đồng API và thao tác frontend gọi | Nghiệp vụ có hiệu lực, hoàn thiện hoặc đã được test end-to-end |
| `frontend/src/assets/` và các URL ảnh | Tài nguyên dùng để render hiện tại | Quyền khai thác thương mại ảnh đã được xác minh |
| `frontend/src/assets/fonts/web/` | Font self-host có provenance và OFL đi kèm | Giấy phép font cũng áp dụng cho ảnh/nội dung khác |
| `frontend-audit.md` | Findings, phạm vi kiểm tra và backlog | Chứng nhận WCAG hoặc tất cả lỗi đã được xử lý |
| `frontend-performance.md` | Số đo production local, raw data và điều kiện đo | Số đo hosting thật, điện thoại yếu hoặc cam kết tốc độ |

### Các thông tin phải xác minh trước khi dùng như lời khẳng định

- Thông tin doanh nghiệp/studio, địa chỉ, điện thoại, email và domain chính thức. Code có số điện thoại placeholder.
- Giá, loại dịch vụ, số ảnh, thời lượng, thời hạn giao, chính sách đổi lịch/huỷ, thời gian phản hồi và điều khoản booking.
- Số booking hoàn thành, rating, huy hiệu “phổ biến”, danh tính khách hàng, nội dung testimonial và ảnh đại diện.
- Quyền sử dụng ảnh, nội dung blog, giấy phép và attribution trong footer.
- Hoạt động newsletter và các dịch vụ bên ngoài.

Không chép số liệu hoặc giá vào bối cảnh sản phẩm như đã xác nhận. Không tạo thêm testimonial, khách hàng, địa chỉ hoặc bằng chứng quảng bá để lấp khoảng trống.

## Product Principles

1. **Đúng dữ kiện:** tách sự thật do người dùng xác nhận, hiện trạng code và thông tin còn mở.
2. **Bảo toàn thao tác:** thiết kế không phá routing, modal, refresh, scroll, form hay quyền truy cập.
3. **Responsive cùng lúc:** thay đổi frontend phải được xem xét trên mobile, tablet và desktop theo phạm vi thực tế.
4. **Nhanh có bằng chứng:** ưu tiên nội dung dùng được, cache đúng và số đo tái lập; không thay tốc độ bằng loading kéo dài.
5. **Kiểm chứng hữu hạn và rõ ràng:** build, trình duyệt và kiểm tra luồng phục vụ những mục đích khác nhau; ghi rõ đã kiểm tra/chưa kiểm tra, không kết luận hết lỗi từ một bước duy nhất.

## Accessibility & Inclusion

Người dùng yêu cầu audit tương phản, bàn phím, focus, nhãn, vùng bấm, chữ tràn, loading và chuyển động. Chưa có tiêu chuẩn nghiệm thu pháp lý hoặc nhu cầu người dùng đặc thù được xác nhận.

Hướng kiểm tra kỹ thuật: tương phản theo WCAG phù hợp cỡ chữ, focus nhìn thấy, modal quản lý focus, nhãn truy cập đúng chức năng, vùng bấm dùng được, giảm chuyển động có chủ đích và nội dung vẫn đọc được khi phóng to. Đây là mục tiêu kiểm tra, không phải tuyên bố PhotoCloud đã đạt WCAG AA.

Cảm ứng thật, screen reader, zoom chữ, dark/high contrast, tài khoản/admin và nhiều route còn có backlog. Giữ checklist trong `frontend-audit.md`; không xoá hoặc đánh dấu hoàn tất chỉ vì một lượt hiển thị desktop/mobile giả lập qua.

## Open Product Decisions

- Người dùng/chức năng chính và ưu tiên giữa thư viện ảnh với dịch vụ đặt lịch.
- Định vị khác biệt và KPI thành công.
- Những thông tin kinh doanh/copy trong code nào đã được chủ sản phẩm duyệt.
- Chính sách upload/tải/giấy phép ảnh và vai trò thực tế của người đăng ảnh.
- Phạm vi địa lý, ngôn ngữ và mục tiêu accessibility chính thức.
- Hosting/domain/đối tác và môi trường production chính thức.

Các mục còn mở không cản trở việc ghi nhận khả năng hiện tại, nhưng phải được xác nhận khi một thay đổi phụ thuộc vào chúng.

## Verification Update — 2026-10-13

Kiểm tra bổ sung trên production local `127.0.0.1:4174`, Edge/Chromium headless, backend local, phiên khách chưa đăng nhập. Đây là xác nhận hành vi triển khai, không xác nhận thông tin kinh doanh.

### Đã quan sát hoạt động

- Trang chủ render được ở 320, 390, 768, 1024 và 1440px; điều này không có nghĩa bố cục mọi section đều đúng.
- Các route `/explore`, `/packages`, `/blog`, `/about`, `/signin` render đúng route và có heading.
- `/profile` và `/admin` chuyển khách chưa đăng nhập đến `/signin`. Chưa kiểm tra quyền sau đăng nhập.
- Refresh trang chủ đưa scroll về 0.
- Desktop 1440px: mở ảnh từ Explore ở scroll 1668 thành modal; đóng modal quay lại scroll 1668; refresh ảnh thành trang riêng, không còn modal và scroll 0; sau đó quay lại Explore và mở ảnh mới vẫn tạo modal.
- Mobile 390px: mở ảnh thành trang riêng, không phải modal; refresh vẫn là trang ảnh riêng, scroll 0.
- Cảm ứng giả lập: tap bookmark đổi `aria-pressed` thành true; xoay viewport giả lập không tạo overflow toàn trang. Không chứng minh bookmark được lưu hoặc thao tác cảm ứng thật hoạt động.
- Escape đóng modal đặt lịch.

### Các giới hạn/lỗi được xác nhận lại

- Grid studio mobile/tablet ở 320/390/768px rộng khoảng 2582/2582/2576px và bị cắt, dù trang không có scrollbar ngang. Chưa sửa.
- Booking modal không đưa focus vào dialog; Tab đi tới Contact ở nền. Chưa sửa.
- Reduced motion giả lập vẫn thấy slide đổi từ 01 sang 02 sau 6.7 giây. Chưa sửa.
- `/collections` thực tế đưa khách chưa đăng nhập về `/`; `CollectionsPage.tsx` có redirect khi thiếu token. Vì vậy không coi danh sách collections là công khai chỉ từ comment trong App.tsx. Chính sách mong muốn còn cần xác nhận.
- Mobile Back từ ảnh về Explore mất vị trí trong phép thử: 5421 -> 0 sau khi đợi 1 giây. Đây là lỗi/backlog, không phải hành vi được chấp thuận. Desktop restoration trong cùng bài thử qua.
- Thử abort API ảnh chưa thu được trạng thái ổn định đủ để kết luận: message null, không có retry; vẫn phải kiểm tra lỗi mạng/HTTP đầy đủ riêng.

### Chưa thể xác nhận

Cảm ứng/keyboard ảo trên điện thoại thật; VoiceOver/NVDA; quyền member/admin với tài khoản thật; submit booking/upload/favorite/download; độ đúng giá, studio, khách hàng và testimonial; toàn bộ route chi tiết, dark/high contrast, zoom chữ và hosting thật. Không tạo tài khoản, giả mạo auth hoặc submit dữ liệu để lấp các khoảng trống này.

Nguồn có thể chạy lại: `frontend/scripts/check-product-context.cjs`, `frontend/product-context-checks.json`, `frontend/scripts/check-photo-navigation.cjs`, `frontend/photo-navigation-checks.json` và `frontend-audit.md`.


## 2. Phụ lục nguồn đã gộp

Các mục dưới đây giữ nội dung nguồn để tra cứu. Phụ lục lịch sử không ghi đè bảng trạng thái hiện tại ở đầu file. Ngày gộp: 2026-10-13.

<a id="source-design-md"></a>
### Nguồn: DESIGN.md

Báo cáo hiện hành; xem bảng đầu file để cập nhật trạng thái.

SHA256 nguồn trước khi gộp: `44CCD9D1056321474E1ADCEDE70B44334ED2D5C5560FA7843061DCEB2D10A3DB`

<details>
<summary>Mở nội dung đầy đủ: DESIGN.md</summary>

---
name: PhotoCloud — Observed Design System
description: Bản ghi thiết kế hiện có; không phải đề xuất redesign hoặc chứng nhận chất lượng.
colors:
  bg-primary: "#FAF8F4"
  bg-secondary: "#F2EEE7"
  bg-card: "#FFFFFF"
  text-primary: "#1B1B19"
  text-secondary: "#6B6B66"
  text-muted: "#8A8A82"
  border-color: "#E8E2D6"
  border-strong: "#D8D1C5"
  accent: "#B8865B"
  accent-soft: "#D9A441"
  studio-status-confirmed: "#7A8B5C"
  studio-status-pending: "#C9A14A"
  studio-status-danger: "#A6453C"
  dark-bg-primary: "#16140F"
  dark-bg-card: "#25221C"
  dark-text-primary: "#F2EEE7"
typography:
  body:
    fontFamily: "Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  studio-display:
    fontFamily: "Fraunces, Playfair Display, Georgia, serif"
    fontSize: "68px"
    fontWeight: 500
  section-heading:
    fontFamily: "Fraunces, Playfair Display, Georgia, serif"
    fontSize: "clamp(28px, 4vw, 46px)"
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: "-0.05em"
  slide-display:
    fontFamily: "Barlow Condensed, Arial Narrow, Impact, sans-serif"
    fontSize: "96px"
    fontWeight: 800
    lineHeight: 0.94
    letterSpacing: "0"
  nav-label:
    fontFamily: "Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 600
  package-detail:
    fontFamily: "Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  control-observed: "8px"
  studio-card-declared: "16px"
  package-card-observed: "22px"
  dialog-desktop-observed: "24px"
  pill: "999px"
spacing:
  compact: "8px"
  nav-stack: "12px"
  grid: "16px"
  gallery: "24px"
  section: "32px"
components:
  header-booking-button:
    backgroundColor: "{colors.text-primary}"
    textColor: "{colors.bg-card}"
    rounded: "{rounded.control-observed}"
    padding: "9px 16px"
    height: "42px"
  sidebar-item:
    rounded: "{rounded.control-observed}"
    size: "44px"
  package-card:
    backgroundColor: "{colors.bg-card}"
    rounded: "{rounded.package-card-observed}"
  booking-dialog:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.dialog-desktop-observed}"
---

## Overview

Tài liệu ghi nhận hệ thống hiện tại từ code và computed styles trên production local ngày 2026-10-13. Không thay đổi giao diện, không chọn định hướng thẩm mỹ mới và không tự xác nhận thông tin kinh doanh. Bối cảnh chức năng/ràng buộc thuộc `PRODUCT.md`; findings thuộc `frontend-audit.md`.

Giao diện có hai biểu hiện theo màn hình: phần studio/nội dung sử dụng nền sáng ấm, chữ tối và tiêu đề serif; slideshow đặt ảnh toàn màn hình lên nền tối, chữ trắng và tiêu đề condensed đậm. Đây là phân biệt đã có, không phải hai theme thay thế nhau.

Frontmatter ghi các giá trị đang dùng làm điểm tham chiếu. Những mục có tên `observed`/`declared` không phải quyết định chuẩn hoá đã được người dùng duyệt. Không dùng tài liệu này để âm thầm sửa mọi màn hình cho giống nhau; các sai lệch dưới đây là backlog.

**Nguồn hiện trạng:** `styles/theme.css`, `src/index.css`, Header, ImagePageSidebar, TimedCardSlider, HeroBooking, HomePageLayouts, BookingModal, NoFlashGrid và các component `ui`. Computed styles lưu trong `frontend/design-observations.json`, đo ở desktop 1440x900 và mobile 390x900. Không có kiểm chứng visual đầy đủ với tài khoản đăng nhập, dark theme thực hay mọi route admin.

## Colors

### Primary

- `text-primary` là màu chữ/điều khiển tối dùng cho nội dung và nút đặt lịch; `bg-card` là màu chữ đối lập trên nút tối.
- `accent` là đồng ấm cho nhấn thương hiệu, hover/active và một số icon. `accent-soft` là sắc vàng sáng, xuất hiện ở highlight/rating/gradient; không được mặc định đủ tương phản để làm chữ nhỏ.
- Slideshow dùng chữ trắng trên ảnh có shade tối. Icon bookmark dùng nền vàng riêng `#EFB52F`; đây là ngoại lệ của slider, không phải accent token toàn hệ thống.

### Secondary / Status

- Xác nhận dùng họ olive; đang chờ dùng họ vàng; lỗi/nguy hiểm dùng họ đỏ đất. Các token status có trong `src/index.css`; ý nghĩa trạng thái cần bảo toàn khi chỉnh màu.
- Badge số ảnh yêu thích có nền xanh đậm riêng `#273E36`, chưa quy về token status hay accent chung.

### Neutral

- `bg-primary` là nền page mặc định; `bg-secondary` cho lớp nền phụ/hover; `bg-card` cho bề mặt trắng.
- `text-secondary` cho đoạn phụ; `text-muted` cho nội dung ít ưu tiên. Viền nhẹ và viền mạnh tách thành hai token.
- Theme tối có token nền/chữ riêng; nhiều CSS vẫn dùng màu cố định nên chưa coi là theme hoàn chỉnh.

### Nhất quán và lệch

| Nhất quán đang dùng | Điểm lệch cần ghi nhớ |
|---|---|
| Palette sáng ấm, chữ gần đen, card trắng lặp ở header/body/form | `--bg-*`, `--studio-*`, `--color-*` và token Tailwind cùng tồn tại, nhiều giá trị trùng nhưng không cùng nguồn |
| Đồng/vàng xuất hiện ở nhấn thương hiệu | Slider dùng vàng riêng; notification và badge có màu hardcode |
| Có layer shade để chữ đọc trên ảnh | Header cần đúng trạng thái trong suốt/chữ trắng hoặc nền đặc/chữ tối; không trộn hai trạng thái |
| Có token dark | Package heading chữ tối cố định và section nền sáng cố định có thể lệch dark |

Audit đã tính icon bookmark trắng trên vàng chỉ khoảng 1.86:1; đây là lỗi cần sửa, không phải quy tắc cần nhân bản. Token muted trên nền chính cũng chưa đủ 4.5:1 cho chữ nhỏ. Xem báo cáo để kiểm tra theo nền thực, không chỉ màu token.

## Typography

### Các vai trò hiện có

| Vai trò | Hiện trạng quan sát / nguồn |
|---|---|
| Body mặc định | Roboto, line-height 24px ở cỡ 16px |
| Body studio token | Inter với Roboto/system fallback; nhiều đoạn thực tế vẫn kế thừa Roboto |
| Tiêu đề studio | Fraunces weight 500; hero 68px desktop, 42px mobile trong mẫu đo |
| Tiêu đề section | Frontmatter ghi đúng clamp hiện tại; đo 46px desktop và 28px mobile |
| Tiêu đề slide | Barlow Condensed weight 800; đo 96px desktop và 61px mobile; CSS còn có breakpoint 64px dưới 900px |
| Điều hướng header | Roboto 15px/600; một số width dùng 13px |
| Tên gói chụp | 20px; giá 15px; thông tin và mô tả 13px |
| Tiêu đề booking dialog | Roboto 26px/500 desktop, 23px mobile |
| Text logo | Chuỗi `photocloud`, font stack TT Backwards Script/Dancing Script/.../Roboto; CSS 28px desktop, 24px rồi 20px theo breakpoint |

Fraunces, Inter và Barlow Condensed đã self-host, có font faces và OFL trong `assets/fonts/web`; Roboto regular có bản WOFF2. Không lấy toàn bộ fallback font stack làm bằng chứng rằng mọi font trong stack đều đã tải.

### Sai lệch

- Không có một type scale thống nhất: body 16px, detail 13px, label có 9–12px; modal và marketing không dùng cùng heading family.
- Một số heading có letter-spacing âm, trong khi slideshow là 0. Ghi lại hiện trạng; không biến thành yêu cầu cho các component mới.
- `clamp()` theo vw làm chữ marketing đổi với viewport; khi sửa cần xét responsive và người dùng tăng cỡ chữ.
- Text logo có nhiều fallback; cần phân biệt tên font CSS với font thật đang render nếu glyph/font nguồn lỗi.

## Layout

### Khung và nhịp spacing

- Nội dung studio/gói chụp nhiều section dùng `width:min(1296px, calc(100% - 32px))`, căn giữa.
- NoFlashGrid: container max-width 1296px, padding 16px; base gap 24px nhưng vị trí/cỡ row còn do thuật toán và inline styles tính theo ảnh.
- Package grid desktop có 4 cột `minmax(0,1fr)`, gap 16px; mobile về 1 cột. Body mỗi card padding 18px, gap 8px.
- Quy trình booking desktop có 4 cột, gap 10px, padding ngoài 16px; mobile thành 1 cột. Mỗi bước padding 14px.
- Header desktop padding ngang 32px theo CSS; mobile thường 12px. Sidebar stack gap 12px. Không có spacing token scale chung điều khiển mọi component; frontmatter là các bước lặp được trích xuất.

### Responsive đang triển khai

- Header token 80px desktop/52px mobile; đo outer desktop 81px gồm border, mobile 52px.
- Sidebar 64px, xuất hiện từ 1024px trên các route áp dụng; header ngoài trang chủ chừa chỗ sidebar. Trang chủ bỏ sidebar và header full-width.
- Điều hướng header desktop ẩn dưới 768px, thay bằng icon và menu. Header action render còn phụ thuộc breakpoint hook.
- Slideshow chiếm 100svh; màn nhỏ có min-height 730px. Card ảnh chuyển xuống dưới phần copy; controls di chuyển xuống đáy.
- Booking dialog desktop tối đa 820px, backdrop padding 24px; mobile dưới 600px dùng bottom sheet cao 92dvh, phần nội dung scroll bên trong.

### Lệch và lỗi layout

- Breakpoint hiện dùng lẫn 600, 768, 900, 1024px; sidebar query và header query không phải một scale duy nhất.
- Hero studio mobile/tablet có `grid-template-columns:1fr` với intrinsic width lớn từ nội dung/marquee; ở 390px hero-copy đo ~2582px, bị overflow cắt. Không sao chép cấu trúc này cho section mới.
- Slider card ngoài khung vẫn nhận focus; page overflow không chứng minh toàn bộ nội dung nhìn/bấm được.
- Các screenshot giả lập không kiểm chứng bàn phím ảo, safe area hay xoay màn hình trên thiết bị thật.

## Elevation & Depth

Độ sâu hiện có đến từ card trắng trên nền ấm, viền nhẹ và shadow; slideshow dùng ảnh, shade và bóng card. Không phải hệ thống hoàn toàn flat.

| Vai trò | Giá trị trong nguồn |
|---|---|
| Studio card token | `0 1px 2px rgba(27,27,25,.04), 0 8px 24px rgba(27,27,25,.04)` |
| Studio hover token | `0 2px 4px rgba(27,27,25,.06), 0 16px 40px rgba(27,27,25,.08)` |
| Package card thực | `0 10px 30px rgba(27,27,25,.06)` |
| Header khi đã cuộn | `0 3px 12px rgba(27,27,25,.07)` ngoài các override cinematic |
| Booking dialog | `0 24px 80px rgba(0,0,0,.25)`; overlay tối phía sau |

Shadow scale chưa đồng nhất: card CSS hardcode không dùng studio token tương ứng. Z-index có token header 1500, modal overlay 2000, modal 2001; sidebar dùng 1501 và một số rule desktop header 1502; library drawer dùng 2100/2101. Đây là các lớp hiện có, cần đối chiếu context trước khi thêm overlay mới.

## Shapes

- Controls quan sát thường bo 8px; sidebar item 44px vuông bo 8px; avatar tròn.
- Token studio-card khai báo 16px nhưng package card thực tế 22px; flow section 24px; nhiều chip/pill có khai báo 999px.
- Booking desktop quan sát bo 24px; mobile bo 22px ở hai góc trên, đáy không bo.
- Nút header booking source khai báo 6px nhưng computed style là 8px; slider controls source có rule tròn nhưng computed style hiện là 8px. Đây là xung đột cascade cần truy nguồn, không phải cố ý xác nhận hai hình dạng tương đương.
- Trang ảnh có rule bo 0 hoặc 4–12px theo context; gallery/photo frame không dùng chung radius với card dịch vụ.

**Quy tắc ghi nhận:** ưu tiên phân biệt giá trị token khai báo, rule component và computed style. Không âm thầm chọn một radius để thay tất cả.

## Components

### Buttons and Icons

- Button UI chung có default/destructive/outline/secondary/ghost/link; cỡ 32/36/40px theo variant, focus ring 3px, disabled opacity 50% và loading spinner.
- Header booking là nút tối với icon CalendarDays và chữ sáng; frontmatter ghi padding/height và radius quan sát. Hover có chuyển động nâng nhẹ.
- Nút mobile header thường 40px; slider 45px desktop nhưng 36px dưới 900px; audit vùng bấm vẫn còn mở.
- Icon chủ yếu Lucide, thường 16–20px; sidebar 20px, heading nhỏ 12–14px. Một số controls slider khác vẫn có SVG inline. Không khẳng định đã dùng một icon system tuyệt đối.
- Slider bookmark là affordance vàng; action chưa nối persistence. Nhãn control còn tiếng Anh trong UI Việt.
- Focus nhiều nơi có ring/outline, nhưng NotificationBell xoá outline và booking chưa giữ focus; đây là thiếu sót, không phải component philosophy.

### Inputs and Filters

- Input UI: cao 36px, bo theo `rounded-md`, viền nhẹ, focus ring và state invalid/disabled.
- Booking input có style riêng: padding 11px 12px, cỡ chữ 13px, nền card và viền xám; không đi hoàn toàn qua Input UI chung.
- Explore chip quan sát 13px/500, padding 7px 14px, gap 6px, radius 8px; select 13px, padding 8px 12px, cao 36px, radius 10px.
- Active filter có state chọn; màu/shape giữa chip, select và button chưa cùng một recipe.

### Header and Sidebar

- Header fixed một hàng: logo trái, link studio giữa, thao tác phải. Trang chủ overlay trên ảnh, sau khi rời vùng slide chuyển về nền đặc/chữ tối, hiện cố định.
- Mobile dùng icon và menu, giữ logo; desktop có text links. Thành viên có thêm thông báo/avatar/ảnh yêu thích, chưa đo computed style ở phiên đăng nhập trong lượt document.
- Sidebar các trang áp dụng là rail trái 64px, item icon 44px, tooltip và active indicator; không xuất hiện ở trang chủ. Mobile rail ẩn, dùng điều hướng mobile/header tương ứng.
- Header/rail padding và left offsets có override theo route; không lấy margin ngoài homepage áp cho mọi trang.

### Gallery and Slideshow

- NoFlashGrid xếp ảnh theo tỷ lệ/dimension với explicit grid row spans; không phải lưới thumbnail vuông cố định. Có ảnh placeholder/blur-up, image actions và thông tin tác giả.
- Slider dùng background-image cover toàn khung, copy bên trái và card strip bên phải trên desktop; mobile copy trên, strip dưới. Ảnh là nội dung dẫn đầu.
- Thumbnail panel yêu thích header là grid 2 cột, ảnh aspect-ratio 1, bo 4px; đây là preview utility, khác gallery chính.
- Chuyển ảnh slider authored bằng JavaScript, duration 500ms, autoplay interval 5500ms. CSS có copy-in ~420ms; reduced motion chưa áp dụng đủ đường JS.
- Reveal section dùng opacity/translate 500ms và IntersectionObserver; có thể tạo nội dung vô hình trước khi reveal. Backlog vẫn mở, không dùng nó như điều kiện bắt buộc hiển thị nội dung.

### Modals and Drawers

- Booking desktop dialog giữa màn hình, nền trắng, header/body/footer tách vùng; mobile bottom sheet, header/footer sticky. Steps, package choices và input đang có nhiều CSS riêng.
- Modal ảnh desktop là overlay lớn, controls đóng/trước/sau; mobile mở full page. Refresh modal thành trang ảnh riêng là ràng buộc hành vi, không phải animation option.
- Header favorites panel dùng Radix Dialog bên phải rộng tối đa 400px, padding 24px; z-index và motion riêng. Chưa kiểm tra phiên đăng nhập ở lượt document.
- Modal entrance làm bounding box đo giữa chuyển động nhỏ hơn kích thước CSS; không dùng số đo tạm thời này làm token width mới.
- Booking focus trap thiếu; mobile Back ảnh mất scroll theo audit. Không thay chúng bằng ghi chép rằng modal đã đạt chuẩn.

## Do's and Don'ts

### Do

- Giữ hệ nền/chữ theo token hiện có và xác định đúng context sáng/tối/ảnh trước khi thêm component.
- Giữ Fraunces cho vai trò studio và Barlow Condensed cho slideshow khi tinh chỉnh trong nhận diện hiện tại.
- Dùng Lucide và controls semantic theo chức năng; xác nhận focus, nhãn và vùng bấm ở cả desktop/mobile.
- Đối chiếu computed style với CSS khi ghi radius/size; source có override chưa đồng nhất.
- Xử lý responsive trong cùng phạm vi sửa; bảo toàn refresh, modal routing và scroll như PRODUCT.md yêu cầu.
- Ghi riêng lỗi/drift và quyết định được duyệt; lấy `frontend-audit.md` làm backlog, không diễn giải lỗi thành quy tắc thiết kế.

### Don't

- Không biến nền trắng/chữ trắng tạm thời khi refresh hoặc nội dung bị cắt thành style cần giữ.
- Không quy mọi font/body/radius về một giá trị mới chỉ vì document cần gọn.
- Không xem dark token là bằng chứng mọi component đã hỗ trợ dark.
- Không thêm khoảng chờ/loading hoặc giấu section để tạo cảm giác mượt.
- Không suy ra việc có card gói chụp/testimonial nghĩa là giá hoặc khách hàng thật đã được xác nhận.
- Không tự thay nhận diện, sửa chức năng hoặc áp lại các animation từng gây lỗi trong lượt lập tài liệu này.


</details>

<a id="source-frontend-audit-md"></a>
### Nguồn: frontend-audit.md

Báo cáo hiện hành; xem bảng đầu file để cập nhật trạng thái.

SHA256 nguồn trước khi gộp: `0EFA7BB6D907B172A7A0577FEE3642F4E5DC9440A58374C4C6648F2F4F41E1E7`

<details>
<summary>Mở nội dung đầy đủ: frontend-audit.md</summary>

# Audit frontend PhotoCloud

Phân tích UX trang chủ, audit header bổ sung và thứ tự triển khai: xem `frontend-critique.md` (2026-10-13). Các finding trong audit này vẫn mở; lượt critique không sửa mã giao diện.

## Yêu cầu làm việc từ người dùng

- Từ các lần sửa tiếp theo, sửa giao diện phải bao gồm responsive cho mobile, tablet và desktop trong cùng phạm vi công việc; không chỉ sửa desktop rồi để mobile xử lý sau.
- Kiểm tra các kích thước đại diện 320px, 390px, 768px, 1024px và 1440px khi thay đổi có thể ảnh hưởng bố cục; kiểm tra xoay màn hình, vùng bấm, chữ tràn, menu và modal theo tính năng được sửa.
- Giữ các luồng refresh, mở ảnh thành trang riêng, mở/đóng modal và khôi phục scroll hoạt động trên các kích thước liên quan.
- Phân biệt kiểm tra viewport giả lập với cảm ứng/thiết bị thật. Nếu chưa kiểm tra được phần nào, ghi rõ vào backlog và kết quả bàn giao; không đánh dấu đã sửa chỉ vì build qua hoặc desktop hiển thị đúng.

### Mobile/responsive còn chưa sửa

- [ ] P1: grid phần studio bị rộng hơn viewport, cắt nội dung và CTA trên mobile (finding 1).
- [ ] P2: card slide ngoài màn hình vẫn nhận focus bàn phím (finding 7).
- [ ] P2: vùng bấm các nút slider/header/đóng modal còn nhỏ (finding 8).
- [ ] Kiểm tra và sửa focus modal đặt lịch cho cả mobile/tablet/desktop (finding 2).
- [ ] Cảm ứng thật, xoay màn hình, bàn phím ảo, zoom chữ và thiết bị yếu chưa được kiểm tra đầy đủ.

Lượt tối ưu performance đã kiểm tra hiển thị production ở desktop 1440x900 và mobile 390x844, nhưng không sửa các lỗi responsive nêu trên. Các mục này vẫn mở cho lượt sửa tiếp theo.

Ngày: 2026-10-13. Chỉ phân tích; không sửa mã website.

## Phạm vi và phương pháp

- Impeccable 4.5.2: context, playbook audit và detector trên Header.css, TimedCardSlider.css, HomePageLayouts.css, HeroBooking.css, NotificationBell.css.
- Trình duyệt in-app: trang chủ, header, slider, phần studio, mở modal đặt lịch; viewport desktop 1440x900 và mobile giả lập 320x740, 390x844.
- Bàn phím: mở booking, nhấn Tab và đọc activeElement. Đọc kích thước, computed CSS và tabIndex.
- Rà nguồn: loading, store slide, theme, newsletter, thông báo, animation và artifact production hiện có.
- Chưa kiểm tra: tài khoản đăng nhập/admin, screen reader thật, cảm ứng thật, zoom chữ 200%, mọi route chi tiết và Lighthouse/Core Web Vitals production. Thử mở Explore/Collections chưa xác nhận được nội dung route ổn định nên không chấm các trang đó.
- Điểm là đánh giá phạm vi đã xem, không phải chứng nhận WCAG cho toàn bộ website.

## Kết luận về tính nhất quán triển khai

Chưa đạt: có nền tảng token và các component theo miền sản phẩm, nhưng vẫn có chức năng mô phỏng, grid mobile bị cắt, state loading không phân biệt lỗi và xử lý focus modal chưa hoàn chỉnh.

| Hạng mục | Điểm /4 | Bằng chứng chính |
|---|---:|---|
| Accessibility | 1 | Focus đi ra sau modal; outline chuông bị vô hiệu; tương phản icon thấp |
| Performance | 2 | Cache slide và ưu tiên ảnh đầu có sẵn; animation layout mỗi frame và bundle lớn |
| Theming | 2 | Có token light/dark nhưng nhiều màu chữ/nền cố định |
| Responsive | 1 | Grid hero rộng 2582px tại viewport 390px, bị cắt bởi overflow |
| Implementation integrity | 2 | Bookmark chỉ state cục bộ; newsletter dùng sai mailto |
| Tổng | 8/20 | Cần sửa các vấn đề chức năng và accessibility trước polish |

12 vấn đề: 0 P0, 6 P1, 6 P2. Không có nghĩa là mọi luồng đều đã được kiểm chứng không có P0.

## P1: Ưu tiên trước phát hành

### 1. Nội dung studio bị cắt trên mobile

- Vị trí: frontend/src/components/booking/HeroBooking.css:980 và :1037; frontend/src/components/HeaderMarquee.css:44.
- Tái hiện: viewport 390px, cuộn xuống phần studio dưới slide. Đo hero-copy và hero-section.
- Bằng chứng: cột grid/hero-copy khoảng 2582px trong section khoảng 382px; hero-sub 620px; section overflow:hidden. Mô tả, các nút CTA và gallery bị cắt. document.scrollWidth không báo tràn vì overflow bị giấu.
- Ảnh hưởng: nội dung và lối đặt lịch không đọc/bấm được đầy đủ trên mobile. WCAG 1.4.10 Reflow.
- Đề xuất: cột mobile minmax(0,1fr), min-width:0 cho grid children, giới hạn track marquee và gallery trong cột. Kiểm tra kích thước thực của từng child thay vì chỉ kiểm tra thanh cuộn trang.
- Lệnh: $impeccable adapt.

### 2. Booking modal không quản lý focus

- Vị trí: frontend/src/components/BookingModal.tsx:99 và :154.
- Tái hiện: dùng bàn phím mở nút Đặt lịch chụp, nhấn Tab.
- Bằng chứng: focus còn ở nút header; Tab chuyển tới contact-button nằm sau modal. aria-modal=true không tự tạo focus trap hoặc inert nền.
- Ảnh hưởng: bàn phím thao tác vào trang phía sau dialog, thiếu ngữ cảnh và dễ lạc focus. WCAG 2.4.3; pattern dialog modal yêu cầu focus bên trong, trap và trả về trigger.
- Đề xuất: dùng Dialog hiện có của Radix hoặc triển khai đầy đủ initial focus, focus trap, inert nền, return focus và focus bước mới. Giữ Escape.
- Lệnh: $impeccable harden.

### 3. Chuyển slide chưa tôn trọng reduced motion

- Vị trí: frontend/src/components/TimedCardSlider.tsx:43, :80, :140; frontend/src/components/TimedCardSlider.css:20.
- Tái hiện: bật Reduce motion ở hệ điều hành, xem slider tự chạy và chuyển ảnh.
- Bằng chứng code: CSS tắt keyframe, nhưng đường chuyển ảnh dùng rAF và Element.animate vẫn chạy; autoplay 5500ms cũng không kiểm tra preference. VisualArtFormsSlider chỉ áp dụng reducedMotion cho chế độ collapsed.
- Ảnh hưởng: người nhạy cảm chuyển động vẫn nhận chuyển cảnh mở rộng toàn màn hình. Đây là khoảng thiếu hỗ trợ preference, không tự kết luận vi phạm WCAG AA chỉ từ việc có animation.
- Đề xuất: nhánh reduced-motion đổi ảnh tức thời/fade nhẹ, tắt autoplay mặc định hoặc cho phép chủ động bật lại; pause khi focus đi vào slider.
- Lệnh: $impeccable animate.

### 4. Icon bookmark không đủ tương phản

- Vị trí: frontend/src/components/TimedCardSlider.css:8; frontend/src/components/TimedCardSlider.tsx:177.
- Tái hiện: xem nút bookmark trạng thái chưa lưu.
- Bằng chứng: icon kế thừa màu trắng trên nền #EFB52F; tỷ lệ 1.86:1, thấp hơn 3:1 cho thông tin phi văn bản. Token chữ #8A8A82 trên #FAF8F4 chỉ 3.28:1; cần rà riêng từng nơi dùng cho chữ nhỏ. Gradient vàng #D9A441 trên #FAF8F4 khoảng 2.12:1, cần kiểm tra từng đoạn tiêu đề trên nền gradient thực tế.
- Ảnh hưởng: khó nhận diện icon; chữ phụ nhạt có nguy cơ khó đọc. WCAG 1.4.11 cho icon; 1.4.3 áp dụng theo cỡ chữ/nền thực.
- Đề xuất: icon tối trên nền vàng; kiểm tra các token muted và các điểm sáng của chữ gradient, thay bằng màu đạt ngưỡng tương ứng.
- Lệnh: $impeccable colorize.

### 5. Bookmark không lưu ảnh thật

- Vị trí: frontend/src/components/TimedCardSlider.tsx:32, :112 và :177; frontend/src/components/CardOpeningStage.tsx:6.
- Tái hiện: bấm bookmark, chuyển slide hoặc refresh, kiểm tra danh sách yêu thích.
- Bằng chứng code: chỉ setSaved(!saved); chuyển ảnh setSaved(false). Không gọi favorite service/store; TimedCard không nhận id để lưu ảnh.
- Ảnh hưởng: giao diện báo đã lưu nhưng thao tác không tồn tại trong danh sách; dễ mất lựa chọn người dùng.
- Đề xuất: truyền photo id, nối favorite store/service, xử lý auth/loading/error và phản ánh đúng trạng thái; nếu chỉ demo thì bỏ affordance lưu khỏi giao diện thật.
- Lệnh: $impeccable harden.

### 6. Chuông thông báo xoá dấu focus

- Vị trí: frontend/src/components/NotificationBell.css:14, :25 và :31.
- Tái hiện: tài khoản đăng nhập, Tab tới chuông thông báo. Phần này xác nhận bằng CSS; chưa thử với tài khoản đăng nhập trong phiên audit.
- Bằng chứng: outline:none!important ở base và focus; không thấy focus-visible thay thế trong stylesheet này.
- Ảnh hưởng: người dùng bàn phím khó biết vị trí focus. WCAG 2.4.7 nếu không có chỉ báo thay thế từ CSS khác.
- Đề xuất: focus-visible outline/ring rõ trên cả nền ảnh và nền đặc; kiểm chứng computed CSS khi đăng nhập trước khi đóng issue.
- Lệnh: $impeccable harden.

## P2: Sửa trong lượt tiếp theo

### 7. Tab vào các thẻ slide ngoài màn hình

- Vị trí: frontend/src/components/TimedCardSlider.tsx:180; frontend/src/components/TimedCardSlider.css:8.
- Tái hiện: mobile 320px, dùng Tab đi qua card strip.
- Bằng chứng: năm card đều tabIndex=0; ba card có left khoảng 311, 457, 603px và bị travel-stage overflow:hidden cắt. Không có cơ chế dịch strip để bảo đảm card focus luôn nhìn thấy.
- Ảnh hưởng: focus có thể nằm trên phần không nhìn được; thứ tự bàn phím không phù hợp nội dung hiển thị.
- Đề xuất: roving tabindex hoặc strip cuộn thật và đưa card đang focus vào viewport; không chỉ giấu bằng CSS. Nhãn card và điều khiển đang trộn tiếng Anh với UI tiếng Việt.
- Lệnh: $impeccable adapt, $impeccable clarify.

### 8. Vùng bấm mobile nhỏ

- Vị trí: frontend/src/components/TimedCardSlider.css:18; frontend/src/components/Header.css:486; frontend/src/components/BookingModal.css:1.
- Tái hiện: mobile 320px, đo các nút điều khiển, icon header và đóng booking.
- Bằng chứng: nút slider quy định 36px (đo khoảng 37px), header/bookmark 40px; đóng modal chỉ icon 20px + padding 5px.
- Ảnh hưởng: dễ bấm nhầm trên cảm ứng. Đây là khuyến nghị 44px cho độ dễ dùng, không tự coi mọi nút dưới 44px là vi phạm WCAG 2.5.8 (AA thường dùng 24px và có ngoại lệ).
- Đề xuất: vùng tương tác ít nhất 44px, giữ icon nhỏ và khoảng cách hợp lý.
- Lệnh: $impeccable adapt.

### 9. Lỗi tải slide bị trình bày như danh sách rỗng

- Vị trí: frontend/src/stores/useSliderStore.ts:136; frontend/src/components/VisualArtFormsSlider.tsx:88; frontend/src/components/ui/GlobalLoadingOverlay.css:37.
- Tái hiện: phiên chưa có cache, API ảnh lỗi hoặc offline. Ngoài trang chủ, điều hướng route đang tải để quan sát global loading.
- Bằng chứng: store không có error state; khi request lỗi chỉ loading=false, UI hiện 'Chưa có ảnh nổi bật'. Global loading ẩn page và nội dung role=status lại rỗng; có minimum wait + fade thêm 300/200ms.
- Ảnh hưởng: người dùng không biết lỗi mạng hay không có ảnh, không có nút thử lại; các trang khác có trạng thái trắng khó hiểu.
- Đề xuất: phân biệt loading/empty/error, retry có chủ đích, giữ nội dung cũ; route loading dùng skeleton theo bố cục thay vì giấu mọi nội dung.
- Lệnh: $impeccable harden.

### 10. Form nhận tin dùng địa chỉ mailto không hợp lệ

- Vị trí: frontend/src/components/Footer.tsx:138; frontend/src/constants/brand.ts:52.
- Tái hiện: nhập email hợp lệ, bấm Đăng ký. Không submit thực tế trong audit để tránh mở ứng dụng mail ngoài ý muốn.
- Bằng chứng: mailto nhận BRAND.personality.tone = 'Ấm, cao cấp, riêng tư', không phải email. Form không thực hiện đăng ký newsletter.
- Ảnh hưởng: người dùng không đăng ký được dù CTA hứa nhận tin.
- Đề xuất: nối endpoint newsletter và thông báo kết quả; hoặc đổi đúng thành chức năng liên hệ, dùng email thật. URL-encode dữ liệu nếu vẫn dùng mailto.
- Lệnh: $impeccable harden, $impeccable clarify.

### 11. Đường tải và animation còn nặng

- Vị trí: frontend/src/App.tsx:11, :14; frontend/src/components/TimedCardSlider.tsx:80 và :146; frontend/src/components/TimedCardSlider.css:1.
- Bằng chứng: bundle dist/assets/index-5hZlPG4y.js hiện có 918101 byte (~897 KiB). HomePage và BookingModal import trực tiếp. Slider cập nhật left/top/width/height mỗi frame và hai thanh tiến độ width liên tục; CSS còn tải Google Fonts qua @import.
- Ảnh hưởng: chi phí parse/startup và layout có thể làm chậm thiết bị yếu. Chưa đo CPU trace hoặc FPS, không khẳng định đã gây rớt frame chỉ từ code.
- Đề xuất: đo production cold/warm với CPU/network throttle; tách phần dưới fold và modal nặng, giữ hero critical; dùng transform/scale cho progress và chuyển cảnh; self-host font cần thiết.
- Lệnh: $impeccable optimize.

### 12. Theme còn lệch token

- Vị trí: frontend/src/styles/theme.css:18; frontend/src/pages/HomePageLayouts.css:49, :107, :230 và :309.
- Tái hiện: chuyển sang dark theme khi chức năng đó được bật; so màu nền/chữ của package và các section với header/app.
- Bằng chứng code: nền card dùng --bg-card nhưng h3 cố định #1b1b19; một số section cố định #faf8f4. Có nguy cơ chữ tối trên card tối và các mảng nền sáng không theo theme. Chưa xác nhận live dark theme trong phiên audit.
- Ảnh hưởng: hỗ trợ theme không đồng nhất, có thể giảm tương phản.
- Đề xuất: dùng token text/background/border thống nhất và kiểm tra computed colors ở cả hai theme; nếu không hỗ trợ dark thì ghi rõ và không expose điều khiển.
- Lệnh: $impeccable colorize.

## Detector: cảnh báo và cách diễn giải

- Hai cảnh báo Inter/Google Fonts: tên font phổ biến không phải lỗi chức năng; không yêu cầu đổi font chỉ vì detector. @import từ bên ngoài là vấn đề performance riêng.
- Gradient text tại HeroBooking.css:273: có thật; cần kiểm tra tương phản, không tự đánh giá xấu chỉ vì dùng gradient.
- Border-left thông báo tại NotificationBell.css:283: có thể có ý nghĩa đánh dấu item; không đưa vào danh sách lỗi chỉ vì pattern này.
- Detector không chứng minh focus modal, responsive overflow hay độ đúng chức năng; các lỗi đó được đối chiếu nguồn và trình duyệt.

## Những điểm đang làm tốt

- Header và slider có nút button thật, nhiều nhãn truy cập; menu có aria-expanded và hỗ trợ Escape.
- Slider có nút pause và bỏ cộng thời gian autoplay khi document không visible.
- Cache metadata slide theo phiên, ưu tiên ảnh đầu; store giữ ảnh hiện có nếu fetch lỗi.
- Form booking bọc input trong label; có các giới hạn cơ bản và thông báo lỗi.
- Đã bỏ timer refresh ở ứng dụng và Service Worker; CSS production không còn dùng media=print để bật trễ.

## Thứ tự xử lý đề xuất

1. $impeccable adapt: grid studio mobile, card strip và vùng bấm.
2. $impeccable harden: focus modal, bookmark thật, loading/error và newsletter.
3. $impeccable colorize: tương phản và theme tokens.
4. $impeccable animate: reduced motion và autoplay khi có tương tác.
5. $impeccable optimize: đo production rồi tối ưu theo trace.
6. $impeccable polish: kiểm tra hoàn thiện sau các sửa chức năng; audit lại để cập nhật điểm.

Không chạy các lệnh sửa trong lượt audit này. Có thể thực hiện từng nhóm, tất cả hoặc theo thứ tự bạn chọn.

## Backlog kiểm tra bổ sung (chưa hoàn thành)

- [ ] Cảm ứng thật Android/iOS: vuốt slider, cuộn qua các vùng kéo, pointercancel/lost capture, xoay màn hình, bàn phím ảo.
- [ ] Screen reader NVDA/VoiceOver: landmark, tên nút, thông báo lỗi, thay đổi slide và thứ tự đọc dialog.
- [ ] Bàn phím toàn bộ các route: Tab/Shift+Tab, Enter/Space/Escape, focus visible và trả focus khi đóng modal.
- [ ] Zoom 200%/400%, tăng cỡ chữ hệ điều hành; không cắt CTA, form, giá và nhãn tiếng Việt dài.
- [ ] Tài khoản member/admin: chuông thông báo, ảnh yêu thích, lịch sử tải, upload, quyền truy cập.
- [ ] Luồng ảnh: modal -> chuyển ảnh -> refresh thành trang riêng -> mở modal mới -> đóng/Back khôi phục scroll.
- [ ] API offline/chậm/401/403/429/500, ảnh lỗi, empty data; retry, chống submit lặp và dữ liệu form.
- [ ] Light/dark, forced colors/high contrast và reduced motion thực.
- [ ] Chi tiết bộ sưu tập, trang ảnh, đăng nhập/đăng ký, tìm kiếm, tài khoản và admin trên desktop/mobile.
- [ ] Performance production cold/warm, HTML/CSS/JS/API/ảnh đầu, SW/timer, CPU/network throttle, CLS/LCP/INP và mobile yếu.
- [ ] Xác nhận nội dung thật: testimonial, ảnh đại diện, giấy phép, địa chỉ email newsletter và thông tin studio.

Mỗi mục cần lưu thiết bị/viewport, phiên bản build, bước tái hiện, kết quả, bằng chứng và trạng thái xử lý; không đánh dấu hoàn tất chỉ vì build qua.

### Cập nhật performance

Đã đo production local cold/warm và thử tối ưu font. Số liệu, raw artifacts, điều kiện đo và giới hạn nằm trong [frontend-performance.md](#source-frontend-performance-md). Chưa đánh dấu hoàn tất mobile thật, hosting thật, INP hay CPU/network throttle.

## Kiểm tra bổ sung cho PRODUCT.md — 2026-10-13

Đây là lượt kiểm tra, không sửa UI. Điểm 8/20 và 12 findings phía trên là snapshot audit ban đầu; bổ sung 2 findings P2 dưới đây, tổng backlog kỹ thuật hiện ghi nhận 14 findings (6 P1, 8 P2). Không cộng số lượng test thất bại như lỗi mới nếu đã trùng finding cũ.

### Kết quả đã kiểm tra

| Hạng mục | Kết quả và giới hạn |
|---|---|
| Responsive 320/390/768px | FAIL: hero-copy khoảng 2582/2582/2576px, section 312/382/760px; xác nhận finding 1 lan sang tablet |
| Responsive 1024/1440px | Cột hero đo 487/702px trong section 1016/1432px; không thấy cắt kiểu mobile trong phép đo này, chưa phải pass toàn trang |
| Bàn phím booking | FAIL initial focus và Tab containment; Escape đóng được; finding 2 còn mở |
| Touch giả lập | Tap bookmark đổi pressed; viewport đổi sang 844x390 không tràn trang; không kiểm chứng cảm ứng thật, vuốt/scroll hay persistence |
| Reduced motion | FAIL: slide 01 -> 02 sau 6.7s; finding 3 còn mở |
| Public routes | Explore, Packages, Blog, About, Signin render route/heading; chỉ smoke, chưa test hết hành vi |
| Guest guards | Profile/Admin -> Signin, đúng guard guest; chưa kiểm tra member/admin đã đăng nhập |
| Refresh trang chủ | Scroll về 0 |
| Desktop photo navigation | Ảnh dưới fold: Explore scroll 1668 -> modal -> đóng trở lại 1668; reload -> ảnh riêng scroll0; mở modal mới vẫn được |
| Mobile photo navigation | Ảnh mở full page, reload giữ trang riêng; Back mất scroll 5421 -> 0, finding 14 |
| API abort | Chưa kết luận: không lấy được trạng thái UI ổn định; giữ checklist network/error mở |

### 13. [P2] Route collections công khai theo comment nhưng redirect guest

- Vị trí: frontend/src/App.tsx:258 và frontend/src/pages/CollectionsPage.tsx:82.
- Tái hiện: phiên khách mới, mở `/collections` trên production local, đợi auth khởi tạo; URL trở về `/`.
- Ảnh hưởng: người dùng chọn Bộ sưu tập nhưng không vào được danh sách; comment/định nghĩa bối cảnh dễ dẫn thiết kế sai chính sách.
- Đề xuất: xác nhận danh sách có công khai hay yêu cầu login. Nếu công khai, tách public fetch khỏi thao tác tài khoản. Nếu private, điều hướng auth rõ và lưu return URL; cập nhật route/copy đúng. Không tự đổi chính sách trong lượt kiểm tra.
- Lệnh phù hợp: $impeccable harden, $impeccable clarify.

### 14. [P2] Mobile Back từ ảnh mất vị trí Explore

- Vị trí đối chiếu: frontend/src/pages/ExplorePage.tsx:56 (nhánh mobile), frontend/src/utils/imagePageScroll.ts và frontend/src/pages/ImagePage.tsx (luồng Back).
- Tái hiện: viewport 390x900, vào Explore, cuộn tới ảnh thứ 9; scroll5421, mở ảnh, Back; sau 1 giây trở về scroll0. Desktop cùng flow đóng modal giữ1668.
- Ảnh hưởng: người dùng phải cuộn lại để tiếp tục duyệt, dễ mất vị trí trong danh sách dài.
- Đề xuất: kiểm tra điểm lưu/khôi phục scroll cho navigation mobile full-page, chỉ restore ở Back/close tương ứng; bảo toàn refresh thật vẫn về đầu và ảnh reload thành standalone.
- Lệnh phù hợp: $impeccable harden.

### Backlog vẫn chưa được kiểm tra đủ

- Điện thoại thật Android/iOS, vuốt và scroll, pointer cancel, keyboard ảo.
- NVDA/VoiceOver, zoom chữ 200/400%, high contrast, dark theme thực.
- Tài khoản member/admin, quyền upload, thông báo, tải/lưu ảnh và submit booking.
- Chi tiết mọi route và HTTP lỗi/offline/timeout có kiểm soát.
- Dữ kiện studio/giá/testimonial/khách hàng: kiểm tra code không xác minh được sự thật ngoài đời.
- Hosting thật, mobile yếu, throttle CPU/network và INP.

Raw evidence: frontend/product-context-checks.json và frontend/photo-navigation-checks.json. Không đánh dấu các mục kiểm tra thật hoàn tất từ viewport hoặc input giả lập.




</details>

<a id="source-frontend-performance-md"></a>
### Nguồn: frontend-performance.md

Báo cáo hiện hành; xem bảng đầu file để cập nhật trạng thái.

SHA256 nguồn trước khi gộp: `61800B9653F7C2616E733F06B358B2D57151E8DE3C4EE0406F394330C063ACC3`

<details>
<summary>Mở nội dung đầy đủ: frontend-performance.md</summary>

# PhotoCloud: đo và tối ưu production

Ngày: 2026-10-13. Đọc cùng frontend-audit.md; các lỗi UI chưa được sửa trong lượt tối ưu này.

## Điều kiện đo

- Vite production build, preview http://127.0.0.1:4174, proxy /api tới backend localhost:3000.
- Build dùng VITE_API_URL=/api chỉ trong shell chạy build. Không thay .env.local.
- Phát hiện .env.local trỏ API tới localhost:3001; các lượt đo ban đầu không có slide đã bị loại khỏi baseline.
- Microsoft Edge/Chromium headless, desktop 1440x900, không throttle CPU/network.
- Mỗi phương án: 3 browser context mới; mỗi context đo một lần cold rồi reload warm ngay trong cùng phiên.
- Cold: context mới, không có HTTP cache/sessionStorage/SW cũ. DNS, TLS/CDN và cache backend có thể đã nóng do các lượt khác; không tương đương người dùng mới trên thiết bị mới hoàn toàn.
- Warm: reload có HTTP cache, sessionStorage slider và Service Worker vừa cài. Không phải thời gian mở app/tab mới.
- Số bảng là trung vị 3 lần. Nhỏ hơn là tốt hơn; đây là lab local, không phải số đo hosting thật hay field Core Web Vitals.
- Bộ đo ghi navigation timing, resource timing, request timing/body, FCP, LCP, CLS và long tasks. Thời điểm ảnh đầu 'sẵn sàng' là Image.decode() trên URL background đầu tiên, không phải thời điểm tương tác hoàn toàn. LCP được đọc riêng.
- Không đo INP chỉ bằng tải trang; cần bài tương tác hoặc RUM riêng.

## Kết quả trước/sau (ms)

| Mốc / thời gian | Cold trước | Cold sau | Warm trước | Warm sau |
|---|---:|---:|---:|---:|
| HTML responseEnd từ navigation start | 4.4 | 4.3 | 7.4 | 7.2 |
| CSS chính: thời gian request | 12.5 | 11.5 | 11.2 | 10.8 |
| JavaScript chính: thời gian request | 33.2 | 33.7 | 29.7 | 29.5 |
| API /images: thời gian request | 175.7 | 198.7 | Không gọi | Không gọi |
| FCP: nội dung đầu tiên được vẽ | 296 | 48 | 40 | 32 |
| Slider mounted | 660.1 | 498.5 | 92.8 | 93.4 |
| Ảnh đầu decode xong | 1328.7 | 994.4 | 163.6 | 141.7 |
| LCP | 1340 | 1008 | 164 | 140 |
| Tổng long-task duration trong cửa sổ đo | 153 | 142 | 0 | 0 |
| CLS | 0.00615 | 0 | 0 | 0 |
| Số response ghi nhận | 41 | 36 | 39 | 34 |

Các hàng request duration không cộng lại thành LCP vì trình duyệt tải song song. Cold đầu vào dao động: ảnh decode trước 1010–1844ms, sau 771–999ms. Warm trước 161–168ms, sau 141–143ms.

Ảnh đầu là AVIF regular khoảng 12.8KB trên CDN. Trung vị request của ảnh này trước khoảng 661.5ms, sau 473.2ms. Đây có phần biến động mạng/CDN; không quy toàn bộ cải thiện ảnh cho thay đổi font.

## Nguyên nhân xác nhận

1. HTML local và tải file JS/CSS chính không có khoản chờ 1.5s. Main.tsx không còn khởi tạo refreshHandler, sw.js không có timer trì hoãn navigation.
2. Hai @import CSS Google Fonts tạo dependency mạng ngoài trước khi font được tìm thấy. Cold FCP dao động theo thời gian fetch CSS này.
3. Font Roboto local là TTF 468308 byte. Chỉ font này lớn hơn tổng nhiều tài nguyên ảnh.
4. JavaScript chính khoảng 918KB chưa nén và có long task khoảng 150ms khi cold; đây vẫn là backlog tối ưu, không coi request JS 33ms là toàn bộ chi phí JS.
5. Cold cần API metadata trước khi lấy URL ảnh. Warm khôi phục metadata từ sessionStorage nên không gọi lại /images.
6. Backend đo ở local: không suy luận rằng API trên hosting thật cũng chỉ tốn 176–199ms.

## Các bước thử, có đo riêng

### A. Tách lazy category grid: không giữ

- Main JS giảm khoảng 7KB, từ 918059 xuống 910905 byte.
- Cold ảnh đầu trung vị khoảng 1797ms, warm khoảng 163ms; không có cải thiện ổn định trong mẫu này.
- Đã hoàn tác đúng phần thử nghiệm. Không thêm Suspense/blank fallback cho trang chủ.
- Dữ liệu: frontend/performance-after-grid-split.json.

### B. Roboto TTF -> WOFF2: giữ vì giảm payload

- 468308 -> 209932 byte, giảm khoảng 55% cho font này.
- Kiểm tra cmap và trục variable font giữ nguyên, không subset mất tiếng Việt.
- Đo riêng: cold ảnh đầu khoảng 1676ms, warm khoảng 230ms. Không có bằng chứng giảm thời gian tải riêng từ bước này; ảnh hưởng mạng và font Google còn lớn.
- Dữ liệu: frontend/performance-after-font.json.

### C. Self-host các font hiện có: giữ

- Giữ Fraunces, Inter, Barlow Condensed và weight hiện dùng; download nguồn từ Google Fonts, lưu provenance và OFL licenses.
- Font được nén WOFF2, kiểm tra cmap trước/sau chuyển đổi. Không đổi font để chạy nhanh bằng giao diện khác.
- Bỏ hai @import Google CSS, dùng font faces local trong CSS chính; giảm response ghi nhận cold 41 -> 36.
- Tổng kích thước body font mà bộ đo đọc được khoảng 841KB -> 703KB. Đây là decoded body bytes, KHÔNG phải bytes truyền mạng khi warm: bộ đo đọc cả response cache, và cross-origin không expose đầy đủ transferSize nếu thiếu Timing-Allow-Origin.
- Cold FCP 296 -> 48ms (~84% trong mẫu), LCP 1340 -> 1008ms (~25%); warm LCP 164 -> 140ms (~15%). Không coi phần trăm này là SLA hay chứng minh nhân quả tuyệt đối với 3 lượt và mạng ngoài biến động.
- Dữ liệu: frontend/performance-after-selfhost.json.

## Các file thay đổi

- frontend/src/index.css: font CSS local và Roboto WOFF2.
- frontend/src/components/TimedCardSlider.css: bỏ Google Fonts @import trùng.
- frontend/src/assets/fonts/Roboto/Roboto-Variable.woff2.
- frontend/src/assets/fonts/web/: CSS, font nguồn/bản nén, sources.json và OFL licenses.
- frontend/vite.config.ts: proxy chỉ dành cho preview local. Không thay cấu hình server production/deploy.
- Không thêm loading, không tăng timer, không sửa modal routing hoặc scroll restoration.

## Verification

- Production build qua, còn cảnh báo chunk lớn/Zod có sẵn.
- Desktop 1440x900 và mobile 390x844: screenshot, header nền transparent/chữ trắng, font đúng Inter/Barlow Condensed, không có pageerror.
- Mở/đóng booking dialog hoạt động. Không submit booking.
- Không chứng nhận các lỗi responsive/focus đã audit được sửa: các lỗi đó vẫn nằm trong backlog.
- Impeccable detector cảnh báo font phổ biến; không đổi nhận diện chỉ vì cảnh báo này.
- Ảnh kiểm tra: frontend/performance-desktop.png, frontend/performance-mobile.png.

## Chạy lại

Từ frontend, chạy build với VITE_API_URL=/api trong shell, rồi npm run preview -- --host 127.0.0.1 --port 4174.

node scripts/measure-production.cjs performance-new.json

Script dùng Playwright có sẵn trong runtime của máy này, không thêm dependency runtime vào website. Backend localhost:3000 phải chạy và trả dữ liệu ảnh. Không đo với trang slide rỗng do API sai.

## Còn cần làm

- [ ] Hosting thật: TTFB, compression Brotli/gzip, Cache-Control immutable cho asset hash, CORS/Timing-Allow-Origin của CDN.
- [ ] Mobile yếu + throttle CPU/network; viewport giả lập không tương đương điện thoại thật.
- [ ] Đo INP từ tương tác, frame trace slider và long tasks; chưa tối ưu animation layout.
- [ ] Kiểm tra chia bundle có chủ đích cho BookingModal/nội dung dưới fold, giữ hero ngay từ paint đầu, đo trước/sau từng bước.
- [ ] Cache mới tab so với reload cùng session; logout/đổi tài khoản và cache riêng tư.
- [ ] Offline, cập nhật SW version, font fallback khi resource lỗi; xác nhận deployment không dùng nhầm endpoint local.
- [ ] Kiểm tra visual đối chiếu thiết bị thật và mọi glyph/weight nếu thay pipeline tạo font.


</details>

<a id="source-frontend-critique-md"></a>
### Nguồn: frontend-critique.md

Báo cáo hiện hành; xem bảng đầu file để cập nhật trạng thái.

SHA256 nguồn trước khi gộp: `16E5B780311499234834F535509BDB1F74B7645124E53C5A84500C9AA590C11C`

<details>
<summary>Mở nội dung đầy đủ: frontend-critique.md</summary>

# Critique PhotoCloud và thứ tự xử lý

DEGRADED: single-context (hai sub-agent bị dừng: "You’ve hit your usage limit.").

Ngày: 2026-10-13. Chỉ phân tích, không sửa mã giao diện. Target: `frontend/src/pages/HomePage.tsx`, bổ sung `frontend/src/components/Header.tsx`.

## Phạm vi và bằng chứng

- Đọc PRODUCT.md, DESIGN.md, frontend-audit.md và các kết quả production đã lưu. Không coi nội dung dịch vụ đang có trong code là thông tin kinh doanh đã được xác nhận.
- Assessment A được ghi nhận trước khi đọc detector; Assessment B chạy detector và đối chiếu trình duyệt. Không đạt tính độc lập của hai đánh giá vì giới hạn sử dụng sub-agent.
- Lượt này mở tab production mới tại http://127.0.0.1:4174/, xem slide, cuộn xuống studio, xem header sau cuộn, kiểm tra menu và nội dung tại 390x844. Có dùng lại số đo và kiểm tra trước trong `frontend/product-context-checks.json`, `frontend/photo-navigation-checks.json`, `frontend/design-observations.json`.
- Viewport giả lập không thay thế cảm ứng thật. Không có overlay detector trong trình duyệt vì evaluate chỉ cho đọc; dùng CLI, ảnh chụp và computed CSS.
- Detector trên HomePage.tsx, Header.tsx và thư mục booking: một cảnh báo `gradient-text`, HeroBooking.css:273. Đây là tín hiệu thiết kế, không tự chứng minh lỗi UX. Tương phản cần đo riêng, xem audit kỹ thuật.

## Nhận định thiết kế

PhotoCloud có bản sắc ảnh rõ: ảnh lớn, tiêu đề condensed ở slideshow, nền studio sáng và typography serif. Không cần thay toàn bộ thiết kế.

Tuy nhiên hai hành trình đang nối chưa rõ: khám phá ảnh ở đầu trang và tìm dịch vụ/đặt lịch phía dưới. Ảnh thu hút trước, nhưng các thao tác chính trong slide là bookmark và tạm dừng, không phải mở ảnh hay đi tới bộ sưu tập. Header có lối đặt lịch rõ trên desktop, nhưng trên mobile chỉ còn icon.

Người mới có thể nhận ra đây là website ảnh; để hiểu phần studio cung cấp gì, họ cần cuộn tiếp. Không tự quyết rằng đặt lịch hoặc khám phá ảnh là mục tiêu kinh doanh số một khi PRODUCT.md chưa xác nhận.

## Điểm UX

Thang 0–4: điểm cao tốt hơn. Đây là đánh giá định tính trong phạm vi đã xem, không phải WCAG, benchmark người dùng hoặc số đo tốc độ. Không cộng với điểm kỹ thuật 8/20 của frontend-audit.md.

| Heuristic | Điểm | Bằng chứng chính |
|---|---:|---|
| Trạng thái hệ thống | 2 | Có progress slideshow/wizard; lưu bookmark và lỗi tải chưa phản ánh đầy đủ |
| Ngôn ngữ quen thuộc | 2 | Phần studio tiếng Việt; slider/menu còn nhãn tiếng Anh |
| Kiểm soát và thoát | 2 | Có pause/Escape; focus booking và Back mobile còn lỗi |
| Nhất quán | 2 | Điều hướng, font, radius và chức năng lưu chưa thống nhất |
| Ngăn lỗi | 2 | Có lựa chọn gói/bước; nút lưu gây kỳ vọng không đúng |
| Nhận biết thay vì ghi nhớ | 2 | Nav desktop rõ; mobile đặt lịch bằng icon, collections guest redirect |
| Hiệu quả thao tác | 2 | Có nhiều đường tới đặt lịch; mất scroll gây thao tác lại |
| Phân cấp và tối giản | 2 | Ảnh nổi bật; autoplay/card/nav tranh sự chú ý, studio bị cắt |
| Phục hồi lỗi | 1 | Trạng thái API rỗng/lỗi chưa rõ, thiếu đường retry ở một số luồng |
| Trợ giúp | 3 | Quy trình và FAQ sát việc chọn gói; nội dung dịch vụ phải được xác nhận |
| **Tổng** | **20/40** | **Có nền tảng; cần cải thiện đáng kể trước polish** |

## Điểm đang làm tốt

1. Ảnh thực sự là tín hiệu đầu trang, không bị thu nhỏ thành minh họa phụ.
2. Header desktop có nút Đặt lịch chụp tương phản mạnh và luôn nhìn thấy trong lần cuộn đã kiểm tra.
3. Bốn gói, quy trình, FAQ và CTA cuối tạo một đường ra quyết định khá mạch lạc cho phần studio. Giữ cấu trúc này trước khi có bằng chứng cần đổi.

## Vấn đề ưu tiên

### 1. [P1] Studio bị cắt trên mobile và tablet

- Vị trí: `frontend/src/components/booking/HeroBooking.css:980`, `:1037`; `frontend/src/components/HeaderMarquee.css:44`.
- Tái hiện: 390px, cuộn qua slide. Section rộng 382px nhưng hero-copy khoảng 2582px, hero-sub 620px. Kết quả trước: 320px và 768px cũng bị rộng quá cột. Overflow bị giấu nên không có thanh cuộn ngang vẫn có thể mất nội dung.
- Ảnh hưởng: mô tả, CTA và gallery không hiển thị đầy đủ; bước từ xem ảnh sang đặt lịch bị đứt.
- Đề xuất: grid dùng track có thể co (`minmax(0,1fr)`), child `min-width:0`, giới hạn marquee bên trong track; cho CTA xuống hàng khi cần. Không chữa bằng cách thu nhỏ chữ toàn bộ.
- Lệnh phù hợp: adapt, layout. Kiểm tra lại 320/390/768/1024/1440px, ngang/dọc và nội dung dài.

### 2. [P1] Nút và điều hướng tạo kỳ vọng chức năng không đúng

- Vị trí: `frontend/src/components/TimedCardSlider.tsx:32`, `:114`, `:177`; `frontend/src/pages/CollectionsPage.tsx:82`; newsletter ở `frontend/src/components/Footer.tsx` (xem finding 6 của audit).
- Tái hiện: bấm bookmark rồi chuyển slide hoặc refresh; state được reset, không phải lưu vào tài khoản. Guest bấm Bộ sưu tập bị điều hướng về trang chủ theo code thay vì được giải thích. Newsletter chưa có luồng đăng ký đúng như nhãn.
- Ảnh hưởng: người dùng tưởng đã lưu hoặc đăng ký, không tìm lại được; menu Bộ sưu tập nhìn như không hoạt động.
- Đề xuất: kết nối nút lưu với đối tượng ảnh/destination phù hợp và dịch vụ hiện có sau khi xác nhận ý nghĩa; xác nhận collections là public hay riêng tư rồi xử lý guest rõ ràng. Chưa tự mở public dữ liệu hoặc tạo newsletter backend ngoài phạm vi.
- Lệnh phù hợp: harden, clarify. Tách từng chức năng để kiểm thử độc lập.

### 3. [P1] Modal đặt lịch và điều hướng ảnh làm mất ngữ cảnh

- Vị trí: `frontend/src/components/BookingModal.tsx:99`, `:154`; `frontend/src/pages/ExplorePage.tsx:56`; `frontend/src/utils/imagePageScroll.ts`.
- Tái hiện: mở booking bằng bàn phím, nhấn Tab đi tới nút liên hệ phía sau dialog. Mobile Explore: scroll5421 -> mở ảnh full-page -> Back -> scroll0. Desktop cùng loại luồng giữ scroll1668 khi đóng modal; refresh ảnh vẫn thành trang riêng.
- Ảnh hưởng: người dùng bàn phím thao tác sai lớp; người xem gallery phải tìm lại vị trí. Lỗi Back mobile riêng hiện là P2 trong audit; nhóm này là P1 do lỗi focus booking, không nâng tất cả lỗi navigation thành P1.
- Đề xuất: dùng dialog primitive hiện có để initial focus/trap/inert/return focus; phân biệt refresh thật, Back và close. Không áp dụng scroll-to-top toàn cục cho mọi navigation.
- Lệnh phù hợp: harden, audit. Bảo toàn URL ảnh riêng sau refresh và khả năng mở modal mới.

### 4. [P2] Slide thu hút nhưng bước tiếp theo chưa rõ

- Vị trí: `frontend/src/components/TimedCardSlider.tsx:174`, `:177`; `frontend/src/pages/HomePage.tsx`.
- Tái hiện: nhìn first viewport; nhãn mô tả thể loại, bookmark và PAUSE EXPLORING nổi bật, nhưng không có hành động rõ để mở ảnh/bộ sưu tập đang xem.
- Ảnh hưởng: website thể hiện được hình ảnh, chưa dẫn người mới tới tác vụ tiếp theo hiệu quả.
- Đề xuất: chốt ưu tiên sản phẩm trước. Nếu khám phá ảnh là chính, thêm lối tới ảnh/bộ sưu tập đúng dữ liệu. Nếu đặt lịch là chính, làm rõ lối từ tác phẩm sang gói phù hợp, không tự gán quan hệ giữa ảnh và dịch vụ. Giữ ảnh lớn và hạn chế thêm CTA cạnh tranh.
- Lệnh phù hợp: shape, clarify; generate chỉ sau khi chọn thành phần và ràng buộc.

### 5. [P2] Typography và nhãn chưa cùng một hệ

- Vị trí: `frontend/src/components/Header.tsx:294`, `:439`; `frontend/src/components/TimedCardSlider.tsx:177`; `frontend/src/components/booking/HeroBooking.css:273`; đối chiếu DESIGN.md.
- Tái hiện: desktop ghi Câu chuyện/Về studio, mobile ghi Blog/Về chúng tôi; slider tiếng Anh trong trang tiếng Việt. Radius package22/flow24/modal24 trong khi token có giá trị khác; serif/condensed/Roboto chưa được phân vai thành quy tắc rõ.
- Ảnh hưởng: người dùng phải dịch và đối chiếu; thay đổi nhỏ dễ gây lệch giữa component.
- Đề xuất: thống nhất từ vựng tác vụ, định nghĩa vai trò từng font và token theo loại thành phần. Không bắt tất cả dùng cùng font/radius. Đo tương phản chữ gradient trước khi quyết định giữ hay bỏ.
- Lệnh phù hợp: clarify, typeset, layout, extract.

## Phân cấp, mật độ và thứ tự section

- Thứ tự hiện có: slideshow -> studio và collections nổi bật -> gói chụp -> quy trình -> testimonials -> FAQ -> CTA cuối. Không đổi thứ tự ngay; trước hết sửa nội dung bị cắt và xác nhận ưu tiên sản phẩm.
- Slideshow có autoplay, các thumbnail và điều khiển, trong khi header có năm lựa chọn và CTA. Đây là nhiều điểm chú ý đồng thời, không phải bằng chứng người dùng chắc chắn bỏ trang. Gom điều khiển phụ, giữ một hành động chính mỗi vùng.
- Bốn gói hỗ trợ so sánh tốt. Ưu tiên cho giá, thời lượng và số ảnh cùng vị trí; không sửa giá/nội dung dịch vụ.
- Testimonials, số liệu uy tín, thời hạn 24h/5–7 ngày và chính sách đang có trong nguồn chưa được xác minh kinh doanh. Không khẳng định chúng đúng hoặc giả; cần người phụ trách xác nhận trước phát hành.
- Tên collections hiện có dữ liệu thử nghiệm như `test`; cần phân biệt dữ liệu demo và nội dung public được duyệt, không tự sửa dữ liệu.

## Hành trình và nhóm người dùng

- Người mới: bị hút bởi ảnh, nhưng bookmark/pause không trả lời rõ 'tiếp theo làm gì'. Collections guest redirect về home khiến mất định hướng.
- Người dùng mobile: nội dung studio tràn cột; nút nhỏ và Back mất vị trí làm tăng công sức xem ảnh/chọn gói. Đây là quan sát viewport, chưa là test cảm ứng thật.
- Người dùng bàn phím: booking không giữ focus; card ngoài khung vẫn tabbable. Screen reader thực chưa thử nên không kết luận mọi thông báo đọc đúng.
- Hành trình cảm xúc dự kiến từ giao diện: ấn tượng ảnh -> hụt vì nội dung bị cắt -> yên tâm hơn nhờ gói/quy trình/FAQ -> gián đoạn ở modal. Đây là diễn giải chuyên môn, không phải nghiên cứu người dùng.

## Audit header bổ sung

| Tình huống | Kết quả và giới hạn |
|---|---|
| Cuộn qua slide | Lượt này desktop và 390px: header còn ở top, chữ chuyển tối trên nền sáng. Không tái hiện lỗi ẩn hoàn toàn |
| Cơ chế ẩn/hiện | Header.tsx:40–61 hiện chỉ theo scrollY>12, passive listener + rAF, không còn logic giấu theo hướng cuộn. Header.css:1 cố định vị trí; đây là header sticky đổi nền, không phải auto-hide |
| Refresh đầu/giữa trang | Kết quả trước xác nhận refresh home về đầu; chưa ghi filmstrip từng frame ở lượt này nên không kết luận hết nháy first paint |
| Mở menu mobile | 390px mở/đóng được, menu nằm trong khung nhìn; một số nhãn khác desktop. Code có aria-expanded, Escape trả focus và đóng khi đổi route/token |
| Đăng nhập/đăng xuất | Chỉ đọc cơ chế stableHasAuth/sessionStorage và placeholder. Chưa kiểm tra chuyển tài khoản, hết phiên hoặc API auth chậm bằng tài khoản thật |
| Route khác | Đã có kết quả route guest trong product-context-checks; chưa kiểm tra mọi route và overlay/account menu trên mọi viewport |
| Modal ảnh | Desktop close giữ scroll, refresh thành standalone; mobile Back vẫn mất scroll. Không được sửa bằng reset scroll mọi lần chuyển route |

Nguy cơ cần đo, chưa gọi là bug đã tái hiện: `isScrolled` khởi tạo false rồi cập nhật trong effect; auth dùng hadAuthOnMount trong khi user profile đến sau. Có thể có trạng thái trung gian khi khôi phục scroll/auth. Cần filmstrip cold/cache và phiên thật trước khi sửa.

## Trạng thái danh sách yêu cầu

Giữ số của người dùng; mục 3 và 6 không có trong danh sách gửi cuối, không tự bịa yêu cầu.

| Mục | Trạng thái hiện tại | Còn lại |
|---|---|---|
| 1 init | PRODUCT.md đã có, đối chiếu code và một số luồng browser | Xác nhận mục tiêu ưu tiên và dữ liệu kinh doanh |
| 2 document | DESIGN.md đã có; phân biệt token và computed UI | Cập nhật sau mỗi đợt sửa có ảnh hưởng quy tắc |
| 4 critique | Báo cáo này phân tích home/luồng chính | Kiểm chứng với người dùng thật nếu cần quyết định lớn |
| 5 header | Kiểm tra guest và nguồn, bổ sung bảng trên | Auth thật, first-paint filmstrip, mọi route/viewport |
| 7 adapt | Đã đo năm chiều rộng; lỗi mobile/tablet xác nhận | Chưa sửa responsive; cảm ứng/xoay/keyboard ảo |
| 8 layout/typeset | Đã phân tích lệch trong DESIGN và báo cáo này | Chưa đồng bộ code |
| 9 harden | Audit nguồn và một số edge case đã có | Chưa kiểm tra đầy đủ API fault/expired auth/repeated submit |
| 10 clarify | Nhận diện nhãn sai/ngôn ngữ trộn | Chưa rà mọi form/thông báo và sửa copy |
| 11 generate | Chưa làm | Chưa chốt header/gói/gallery; cần 3 phương án trước áp dụng |
| 12 animate | Audit motion đã có, reduced motion còn thiếu | Chưa chọn thành phần mới; chưa thêm animation |

Đo/tối ưu production đã có riêng trong frontend-performance.md, không phải đã hoàn thành harden hay responsive.

## Thứ tự sửa và tiêu chí nghiệm thu

1. **Responsive**: grid studio, CTA, gallery, header/modal tại 320/390/768/1024/1440px. Không cắt chữ/nút, không mất chức năng. Kiểm tra kích thước child, không chỉ document.scrollWidth.
2. **Modal và history**: focus booking, Escape/return focus, ảnh standalone khi refresh, modal mới, Back/close giữ đúng vị trí trên desktop/mobile.
3. **Chức năng thật**: bookmark, guest collections, newsletter; xác nhận hành vi sản phẩm trước khi đụng quyền dữ liệu/API.
4. **Trạng thái và lỗi**: tải/rỗng/lỗi tách biệt; retry có mục đích; giữ nội dung đã tải, chống thao tác trùng. Test API chậm/lỗi và ảnh hỏng có kiểm soát.
5. **Accessibility và copy**: tương phản, focus-visible, card offscreen, nhãn Việt, touch targets; test bàn phím và zoom, ghi riêng screen reader thật chưa làm.
6. **Layout/typography/token**: làm trong phạm vi component vừa sửa, giữ bản sắc ảnh và font có chủ đích; không refactor toàn bộ trước khi luồng ổn.
7. **Performance còn lại**: đo production cold/cache trước và sau từng nguyên nhân; không thêm loading để che chậm.
8. **Generate/motion/polish**: chỉ sau lựa chọn của người dùng; từng thành phần, nội dung visible mặc định, reduced motion, không can thiệp cuộn.

Mỗi đợt sửa: chạy build và kiểm tra browser trong phạm vi bị ảnh hưởng; ghi bằng chứng, phần chưa thử và rủi ro. Build thành công không đồng nghĩa hết lỗi.

## Câu hỏi định hướng

1. Trang chủ ưu tiên khám phá ảnh, đặt lịch studio, hay khám phá ảnh dẫn tới đặt lịch?
2. Giữ slideshow toàn màn hình như hiện tại hay thu gọn để phần studio xuất hiện sớm hơn? Không cần đổi quyết định này để bắt đầu sửa lỗi responsive/modal.


</details>

<a id="source-photocloud-inventory-md"></a>
### Nguồn: PHOTOCloud-INVENTORY.md

LỊCH SỬ / CẦN ĐỐI CHIẾU; không coi checkbox cũ là nghiệm thu hiện tại.

SHA256 nguồn trước khi gộp: `980561ACE4E5BC12A9115A9228155DE3A739E243C2EF0BAC4067513D36B904D9`

<details>
<summary>Mở nội dung đầy đủ: PHOTOCloud-INVENTORY.md</summary>

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


</details>

<a id="source-photocloud-handoff-md"></a>
### Nguồn: PHOTOCloud-HANDOFF.md

LỊCH SỬ / CẦN ĐỐI CHIẾU; không coi checkbox cũ là nghiệm thu hiện tại.

SHA256 nguồn trước khi gộp: `CF1460F48494B2405B9BD11D6AE446EE385DEFEDDBE2040AB5330D43F7C6475D`

<details>
<summary>Mở nội dung đầy đủ: PHOTOCloud-HANDOFF.md</summary>

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

Info panel style theo ảnh PHOTOCLOUD người dùng cung cấp: heading14px nhẹ, published12px, border/shadow mảnh, chart120px cột vuông xanhnhạt và dottedgrid, zero buckets trong suốt, tabs xám selectedtrắng thay selectedđen. CSS đã viết lại gọn, loại bỏ position-below/timeranimation cũ, xử lý radius global!important bằng selector scoped trong layerbase. Không sửa số liệu hay khoảng14ngày. Fixture actual Info/Chart pass390x640,769x440 panel trongviewport; screenshot image-info-refined.png; fixtuređãxóa.

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
User muốn nút nhỏ như PHOTOCLOUD, thay yêu cầu vùngchạm44px trước đó. CSS mobile đổi32x30px border mảnh nềntrắng radius5, topactions flex Lưu/Collectiontrái Downloadphải; footerstats dọc và actionsright compact Share/Info/Edit chỉicon; Infoauthor nhỏ theo. Giữ menu tải/nhãnaria/spinner. Dọn rulegrid2/3cột và44px bị thaythế, không thêmoverridechồnglặp. Desktop không đổi.
QA fixture actualCSS và ImageModalInfo với markuptoolbar/footer tươngứng (không fullApp):390 tấtcảnút32x30; topx12/50/338 cùngy44, footerx262/300/338 cùngy308. Matrix320/390x320/768/1024 buttonsFit/nooverflow. Buildpass warnings cũ. Proof image-actions-compact.png. Fixture/tabdọn viewportreset/serverdừng. Gạch riêngfixUI, toànImagePage chưahoàntất. Commit theoquyước khôngpush/deploy.

## Related mobile hai cột theo mẫu — 11/10/2026
User muốn ảnh liên quan giống ảnh mẫu PHOTOCLOUD. NoFlashGrid thêm compactMobile opt-in, ImagePage bật riêngrelated. Mobile<=768 hai cột, gap6, rowspan theo chiều cao tựnhiên tỷlệ metadata/cache fallback4:3, không cộng130px author/actions. Observer resize có compactMobile dependency; defaultmode vẫngetColumnCount/gap24/clamp cũ. ScopedCSS chỉhide mobileauthor/actions cho compactrelated và sectionpadding24/12. Không thêm quảng cáo/premium nội dung mẫu. Click/preload/session/navigation/store/category/slide giữlogic.
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


</details>

<a id="source-photo-cloud-checklist-md"></a>
### Nguồn: PHOTO_CLOUD_CHECKLIST.md

LỊCH SỬ / CẦN ĐỐI CHIẾU; không coi checkbox cũ là nghiệm thu hiện tại.

SHA256 nguồn trước khi gộp: `412B851F7449AFE15DB6EFFE48CE7CA84298CDF999CBE84D796B0A54DECA3F27`

<details>
<summary>Mở nội dung đầy đủ: PHOTO_CLOUD_CHECKLIST.md</summary>

# PhotoCloud Improvement Checklist

Checklist theo dõi cải thiện PhotoCloud, ưu tiên tăng khả năng đặt lịch trước, sau đó mới mở rộng các tính năng lớn hơn.

## P0 — Giữ nền tảng hiện có

- [ ] Giữ layout tổng thể theo phong cách PHOTOCLOUD: rõ ràng, tối giản, tập trung vào ảnh.
- [ ] Giữ header luôn hiển thị để người dùng dễ tìm kiếm, đặt lịch và truy cập tài khoản.
- [ ] Giữ sidebar trái cho điều hướng chính, nhưng giảm các icon ít quan trọng nếu gây nhiễu thị giác.
- [ ] Giữ search bar ở vị trí trung tâm hoặc vị trí dễ thấy nhất trên desktop.
- [ ] Giữ lưới ảnh là trọng tâm của trang chủ, không để các section mới làm mất vai trò gallery.
- [ ] Giữ khoảng trắng rộng, typography tối giản và hệ nút đen/trắng rõ ràng.
- [ ] Giữ tốc độ cảm nhận tốt bằng lazy-load, skeleton và blur-up image.
- [ ] Không để người dùng gặp trạng thái trắng trang khi ảnh hoặc dữ liệu đang tải.
- [ ] Giữ modal xem ảnh hiện tại: overlay tối, ảnh lớn ở giữa, nút Like, Collection và Download.
- [ ] Modal ảnh phải đóng được bằng nút `×`, phím `Esc` và click ngoài modal.
- [ ] Khi đóng modal ảnh, giữ nguyên context trang chủ và vị trí scroll.
- [ ] Giữ admin theo hướng dashboard chuyên nghiệp, không áp dụng style cảm xúc quá mạnh như trang booking.

## P1 — Trang chủ và booking conversion

- [x] Thêm hero booking phía trên lưới ảnh hiện tại.
- [x] Hero phải trả lời nhanh: PhotoCloud có nhận chụp không, chụp gì, giá từ đâu và đặt lịch ở đâu.
- [x] Thêm headline rõ ràng, ví dụ: “Chụp ảnh theo cách của bạn”.
- [x] Thêm mô tả ngắn về các dịch vụ: chân dung, couple, gia đình và mini session.
- [x] Thêm CTA chính “Đặt lịch chụp” bằng nút đen đặc, nổi bật hơn các hành động khác.
- [x] Thêm CTA phụ “Xem gói chụp” bằng outline hoặc text button.
- [ ] Thêm ảnh hero lớn đại diện cho chất lượng studio.
- [x] Thêm trust signal trong hero: số buổi chụp, rating, thời gian giao ảnh.
- [x] Thêm section 3–4 gói chụp nổi bật: Chân dung, Couple, Gia đình, Mini session.
- [ ] Mỗi package card cần có ảnh mẫu, tên gói, giá từ, thời lượng, số ảnh nhận và nút chọn gói.
- [x] Highlight gói phổ biến nhất bằng badge “Phổ biến” hoặc treatment nhẹ.
- [ ] Thêm portfolio theo dịch vụ để mỗi gói liên kết với 6–8 ảnh mẫu.
- [ ] Mỗi gói nên có 1 collection mẫu và 1 review thật liên quan.
- [x] Thêm quy trình đặt lịch 4 bước: Chọn gói, Chọn ngày, Xác nhận lịch, Nhận gallery.
- [ ] Thêm testimonial từ review thật: avatar, tên, rating, gói đã chụp và bình luận ngắn.
- [ ] Thêm pricing preview rút gọn trên homepage với giá từ và link xem chi tiết.
- [x] Thêm CTA cuối trang: “Sẵn sàng cho buổi chụp tiếp theo?” và nút “Đặt lịch ngay”.
- [x] Thiết lập thứ tự thị giác: Hero hoặc featured work → CTA đặt lịch → Lưới ảnh → Gói dịch vụ → Đánh giá.
- [x] Tăng khoảng cách giữa các section để trang có cảm giác cao cấp hơn.
- [x] Dùng card gói chụp có shadow nhẹ, không làm giao diện thành dashboard.
- [ ] Giữ homepage hiện đại, tối giản; booking cần ấm, tin cậy và cao cấp hơn.
- [x] Cân nhắc nền sáng ấm như `#FAF8F4` thay vì trắng tuyệt đối.
- [x] Cân nhắc màu chữ chính `#1B1B19` thay vì đen tuyệt đối.
- [x] Dùng vàng đồng cho rating, xanh olive cho trạng thái confirmed và đỏ gạch cho CTA quan trọng.

## P1 — Header, mobile UX và booking modal

- [x] Rà soát header desktop để nút “Đặt lịch chụp” không bị chìm giữa Upload, Notification và Avatar.
- [ ] Header desktop nên ưu tiên: Logo, Search, Khám phá, Gói chụp, Đặt lịch chụp, Avatar.
- [ ] Thêm active state rõ ràng cho route hiện tại, đặc biệt là `/booking`.
- [ ] Thêm badge số booking đang xử lý nếu người dùng có booking cần theo dõi.
- [ ] Thêm menu “Dịch vụ” đơn giản gồm Chân dung, Couple, Gia đình, Mini session.
- [x] Mobile header nên ưu tiên: Menu, Logo, Search icon, Đặt lịch icon.
- [x] Không giấu hoàn toàn booking CTA trong menu mobile.
- [ ] Sửa menu Contact trên mobile từ hover sang click hoặc bottom sheet.
- [x] Booking modal trên mobile nên là bottom sheet cao khoảng `92vh`.
- [x] Booking modal mobile cần header cố định, footer nút cố định và phần nội dung scroll riêng.
- [x] Progress mobile chuyển sang dạng dot, ví dụ: `● ○ ○ ○ Bước 1/4`.
- [x] Thêm thumbnail vào mỗi gói trong bước chọn gói của booking modal.
- [x] Gói được chọn trong modal phải có visual state rõ ràng.
- [x] Booking modal mở bằng backdrop fade khoảng 200ms.
- [x] Modal transition dùng translateY và scale nhẹ, khi đóng thì reverse mượt.
- [x] Success state sau đặt lịch có check animation nhẹ.
- [x] Success state hiển thị thời gian phản hồi dự kiến.
- [x] Success state có nút “Thêm vào lịch” và “Xem chi tiết booking”.
- [ ] Form booking đầy đủ cần thêm ảnh minh họa gói đang chọn.
- [ ] Summary trong form booking cần hiển thị giá tham khảo, thời lượng, số ảnh, thời gian giao ảnh và chính sách.
- [x] Thêm trust signal trong form: chưa cần thanh toán, phản hồi trong 24h, được đổi lịch 1 lần nếu chính sách đúng.
- [ ] Thêm FAQ dạng accordion: cọc, đổi lịch, thời gian nhận ảnh, chỉnh thêm ảnh, chụp ngoại tỉnh.
- [x] Nút submit booking cần loading spinner, không chỉ đổi text thành “Đang gửi”.

## P2 — Profile, admin booking và calendar

- [ ] Cải thiện tab “Lịch đặt” trong profile bằng card booking rõ trạng thái hơn.
- [ ] Phân nhóm booking: Sắp tới, Đang xử lý, Hoàn thành, Đã hủy.
- [ ] Thêm filter profile: Tất cả, Sắp tới, Đang xử lý, Hoàn thành, Đã hủy.
- [ ] Booking sắp tới cần countdown, ví dụ “Còn 3 ngày”.
- [ ] Booking sắp tới có nút “Xem chi tiết” và “Yêu cầu đổi lịch”.
- [ ] Booking đang xử lý hiển thị “Chờ xác nhận · phản hồi trong 24h”.
- [ ] Booking hoàn thành có nút “Đánh giá” và “Xem gallery”.
- [ ] Thêm wishlist gói chụp để người dùng lưu gói yêu thích mà chưa cần đặt ngay.
- [ ] Profile có section “Gói đã lưu” và CTA đặt lịch từ gói đã lưu.
- [ ] Thêm Booking Dashboard phía trên danh sách booking trong admin.
- [ ] Dashboard admin hiển thị: yêu cầu mới hôm nay, lịch confirmed tuần này, booking chờ xử lý, booking sắp diễn ra, tỷ lệ xác nhận.
- [ ] Giảm lượng chữ trong bảng booking admin, ưu tiên khách, gói, ngày giờ và trạng thái.
- [ ] Thêm quick action cho admin: xác nhận, đổi lịch, hủy.
- [ ] Chuẩn hóa màu trạng thái booking trong admin và user UI.
- [ ] Calendar admin tháng cần tooltip khi hover.
- [ ] Tooltip calendar hiển thị giờ, gói, tên khách và trạng thái.
- [ ] Ví dụ tooltip: “14:00 - Chân dung - Nguyễn An - Confirmed”.
- [ ] Trên mobile, calendar admin mặc định mở chế độ Ngày hoặc Tuần, không phải Tháng.
- [ ] Bảng admin trên mobile chuyển thành card list.
- [ ] Nếu tab admin ngang bị tràn, chuyển sang scroll, dropdown hoặc sidebar phù hợp.

## P2 — Motion, image grid và visual polish

- [ ] Thêm reveal on scroll tinh tế cho hero, package card, testimonial và gallery section phụ.
- [ ] Reveal animation dùng opacity `0 → 1`, translateY `16px → 0`, duration khoảng 500ms và ease-out.
- [ ] Không dùng reveal on scroll cho lưới ảnh chính để tránh lag.
- [x] Thêm hover ảnh: zoom nhẹ `scale(1.03)`, overlay gradient dưới và transition khoảng 250ms.
- [ ] Khi hover ảnh, hiện tên tác giả và nút like nếu phù hợp.
- [ ] Trên mobile, hover ảnh cần fallback bằng tap hoặc action luôn hiển thị.
- [ ] Thêm button micro-interaction: hover translateY(-1px), shadow nhẹ, active scale(0.98).
- [ ] Cải thiện skeleton shimmer để mượt hơn nhưng không quá sáng.
- [ ] Đảm bảo skeleton giữ đúng kích thước để tránh layout shift.
- [ ] Thêm page transition nhẹ bằng fade content khoảng 150ms.
- [ ] Giữ header và sidebar cố định khi chuyển trang.
- [ ] Không dùng parallax nặng.
- [ ] Không dùng hero slider tự chạy.
- [ ] Không dùng confetti khắp nơi.
- [ ] Không dùng cursor custom.
- [ ] Không dùng animation chữ từng ký tự cho toàn trang.
- [ ] Không dùng masonry layout animation quá nhiều gây giật.
- [ ] Không thêm Lenis smooth scroll nếu chưa tối ưu mobile.

## P3 — Tính năng tăng trưởng

- [ ] Thêm availability preview public dạng đơn giản, không lộ chi tiết booking riêng tư.
- [ ] Hiển thị ví dụ: “Tuần này còn 4 slot”.
- [ ] Hiển thị ngày còn trống, ví dụ: “Ngày 25/10: còn trống buổi sáng”.
- [ ] Hiển thị ngày đã kín, ví dụ: “Ngày 26/10: đã kín”.
- [ ] Thêm bảng so sánh gói: Chân dung, Couple, Gia đình.
- [ ] Bảng so sánh gồm thời lượng, số ảnh, số người, makeup và giá.
- [ ] Bảng so sánh trên mobile chuyển thành card hoặc scroll ngang.
- [ ] Thêm referral cơ bản: khách cũ giới thiệu khách mới được giảm 10%.
- [ ] Thêm ưu đãi booking lần 2: tặng thêm 5 ảnh nếu phù hợp chính sách.
- [ ] Thêm ưu đãi mini session nhóm 3 người giảm giá nếu phù hợp chiến lược.
- [ ] Giai đoạn đầu chỉ cần mã giảm giá thủ công trong admin, chưa cần hệ thống voucher phức tạp.
- [ ] Thêm mục blog/concept nhẹ để hỗ trợ SEO.
- [ ] Bài blog gợi ý: “Concept chụp mùa thu Hà Nội”.
- [ ] Bài blog gợi ý: “5 địa điểm chụp couple đẹp”.
- [ ] Bài blog gợi ý: “Cách chuẩn bị trang phục chụp gia đình”.
- [ ] Mỗi bài blog cần link tới gói booking liên quan.

## Backlog — Tính năng giai đoạn sau

- [ ] Thêm gói combo sau khi booking flow cốt lõi đã ổn.
- [ ] Thêm multi-photographer khi có nhu cầu vận hành thực tế.
- [ ] Thêm thanh toán online sau khi quy trình booking thủ công đã ổn định.
- [ ] Thêm Google Calendar sync khi admin cần đồng bộ lịch thật.
- [ ] Thêm PWA push notification sau khi có nhu cầu nhắc lịch rõ ràng.
- [ ] Thêm AI gợi ý concept từ ảnh đã thích sau khi dữ liệu like/collection đủ hữu ích.
- [ ] Chưa ưu tiên hệ thống voucher phức tạp ở giai đoạn đầu.
- [ ] Chưa ưu tiên animation phức tạp hoặc hiệu ứng trình diễn nặng.
- [ ] Chưa ưu tiên hero slider tự chạy.

## Definition of Done

- [ ] Người dùng mới hiểu ngay PhotoCloud có nhận chụp ảnh.
- [ ] Người dùng biết PhotoCloud chụp những loại dịch vụ nào.
- [ ] Người dùng thấy giá tham khảo trước khi đặt lịch.
- [ ] Người dùng biết đặt lịch ở đâu ngay từ homepage.
- [ ] Người dùng thấy social proof đủ tin cậy: rating, review, số buổi chụp hoặc gallery mẫu.
- [ ] Người dùng hiểu quy trình booking trước khi gửi form.
- [ ] Người dùng mobile có thể đặt lịch dễ dàng, không bị kẹt trong modal dài.
- [ ] Người dùng không mất context khi đóng modal ảnh hoặc booking modal.
- [ ] Homepage không còn chỉ giống gallery PHOTOCLOUD thuần túy mà có lớp “studio” rõ ràng.
- [ ] CTA booking nổi bật nhưng không phá phong cách tối giản của website ảnh.
- [ ] Package card, portfolio và testimonial hỗ trợ trực tiếp cho conversion.
- [ ] Profile giúp người dùng theo dõi booking sắp tới, đang xử lý và hoàn thành rõ ràng.
- [ ] Admin có dashboard booking đủ nhanh để nắm tình hình trong ngày và trong tuần.
- [ ] Calendar admin hiển thị thông tin booking dễ hiểu trên desktop và dễ dùng trên mobile.
- [ ] Màu trạng thái booking nhất quán trên toàn hệ thống.
- [ ] Motion tinh tế, hỗ trợ trải nghiệm nhưng không gây lag.
- [ ] Lưới ảnh vẫn load nhanh, có skeleton, blur-up và không bị layout shift đáng kể.
- [ ] Các tính năng growth như availability, referral và blog được triển khai sau khi luồng booking chính ổn định.


</details>

<a id="source-studio-brand-checklist-md"></a>
### Nguồn: STUDIO_BRAND_CHECKLIST.md

LỊCH SỬ / CẦN ĐỐI CHIẾU; không coi checkbox cũ là nghiệm thu hiện tại.

SHA256 nguồn trước khi gộp: `1D2E59254C46461B75E9287273182D1E791A7FCCB9594DCB7483E42E34352D64`

<details>
<summary>Mở nội dung đầy đủ: STUDIO_BRAND_CHECKLIST.md</summary>

# PhotoCloud Studio — Brand & Product Checklist

> Cập nhật theo brief "PhotoCloud – Studio chụp ảnh theo yêu cầu" (10/2026).
> Tracking trạng thái: `[x]` đã có · `[~]` đang làm/done một phần · `[ ]` chưa có.

---

## 1. Định vị thương hiệu & bản sắc

- [x] Tên thương hiệu: **PhotoCloud** (đã có trong toàn bộ app).
- [x] Eyebrow "PhotoCloud Studio" trên hero (xem `HeroBooking.tsx:18`).
- [x] Tính cách: vừa là nền tảng ảnh (community), vừa là studio booking.
- [x] Phong cách hình ảnh: dùng ảnh PHOTOCLOUD cinematic, fallback gradient warm.
- [x] Tagline "Chụp ảnh theo cách của bạn" — đã đồng nhất: `brand.ts:tagline` (1 nơi), `HeroBooking.tsx` dùng `taglinePrefix`+`taglineHighlight` cho hero có `<em>` gradient, `BookingPage.tsx` dùng `BRAND.tagline`.
- [x] Tagline phụ "Kể chuyện bằng ánh sáng" — dùng ở footer/sub-tagline, blog page, about.

---

## 2. Bảng màu & Typography

> Tất cả token được khai báo tập trung trong `frontend/src/index.css:240-258` (block `:root`).
> Mục tiêu: ấm (warm ivory), cao cấp, riêng tư — phục vụ tone "Studio chụp ảnh theo yêu cầu".

### 2.1 Bảng màu (Color tokens)

| Nhóm | Token | Giá trị | Đã dùng ở đâu | Trạng thái |
|---|---|---|---|---|
| Nền chính | `--studio-bg-warm` | `#FAF8F4` | `HeroBooking.css:21-22` (gradient hero), `BookingPage` cần đối chiếu (đang `#f8f8f6`) | [~] áp dụng rải rác, **chưa đồng nhất ở `BookingPage`, `AboutPage`** |
| Nền phụ | `--studio-bg-cream` | `#F2EEE7` | `HeroBooking.css:21-22` (gradient), `index.css:906` (hero CTA phụ) | [~] đang hardcode, cần thay bằng `var(...)` |
| Nền card | `--studio-bg-card` | `#FFFFFF` | Card `.studio-card`, `BookingPage.css` | [x] OK |
| Text chính | `--studio-text-primary` | `#1B1B19` | Hero title, CTA, card heading | [~] **HeroBooking dùng hex trực tiếp** (`#1B1B19`) thay vì `var(...)` — sửa lại để token-driven |
| Text phụ | `--studio-text-muted` | `#6B6B66` | Mô tả, label phụ | [x] OK |
| Text "faint" | `--studio-text-faint` | `#8A6B2D` | Eyebrow gold-copper, `.studio-cta-ghost` | [x] OK |
| Viền nhẹ | `--studio-border-soft` | `#E8E2D6` | Card, input, hero card | [x] OK |
| Accent đồng | `--studio-accent-copper` | `#B8865B` | Eyebrow LED, focus ring, CTA icon | [x] OK |
| Accent đồng đậm | `--studio-accent-copper-dark` | `#9A6F49` | Hover gradient, focus outline CTA | [x] OK |
| Status Confirmed | `--studio-status-confirmed` | `#7A8B5C` (olive) | `AdminPage.css:353` `.booking-status-confirmed` | [x] **đã áp dụng** (dạng rgba `rgba(122,139,92,0.18)` + text `#4F5D38`) |
| Status Pending | `--studio-status-pending` | `#C9A14A` (amber) | `AdminPage.css:351` `.booking-status-pending` | [x] **đã áp dụng** (`rgba(201,161,74,0.16)` + `#8A6A1B`) |
| Status Danger | `--studio-status-danger` | `#A6453C` (terracotta) | `AdminPage.css:356-358` (rejected/cancelled) | [x] **đã áp dụng** (`rgba(166,69,60,0.14)` + `#8A2A23`) |
| Status review/reschedule | — (derived) | `#8A5A2A` (copper) | `.booking-status-reviewing`, `.booking-status-rescheduled` | [x] bổ sung, dùng tông copper |
| Status completed | — (derived) | `#1B1B19` neutral | `.booking-status-completed` | [x] bổ sung |
| Rating vàng | — (component) | `#C9A14A`/`#D9A441` | Star rating components | [x] OK (chưa token hóa, có thể thêm `--studio-rating-gold`) |
| Success text | — (inline) | `#5A6E44` | Hero "Đang nhận booking" badge | [~] nên chuyển thành `var(--studio-status-confirmed)`-based token |
| Slot urgency | — (inline) | `#A6453C`/`#6F2D26` | Hero slot counter (urgency) | [x] trùng với danger token, dùng tạm OK |

#### Hành động còn lại
- [x] **Refactor HeroBooking**: thay các hex inline (`#1B1B19`, `#FAF8F4`, `#F2EEE7`, `#B8865B`, ...) bằng `var(--studio-*)` để token-driven 100%.
- [x] **BookingPage.css**: đổi nền `#f8f8f6` → `var(--studio-bg-warm)`, text primary `#20211f` → `var(--studio-text-primary)`, viền input/divider → `var(--studio-border-soft)`.
- [x] **AboutPage.css**: thay nền `var(--bg-card, #FFFFFF)` → `var(--studio-bg-warm)`, áp token cho card/icon, dùng Fraunces cho `.about-title`/`.card-title`.
- [x] Thêm token `--studio-rating-gold` + `--studio-rating-gold-bright` để chuẩn hóa màu rating.

### 2.2 Typography

#### Font families (đã import)

| Token | Font | Nguồn | Fallback | Trạng thái |
|---|---|---|---|---|
| `--studio-font-display` | **Fraunces** (variable, opsz 9–144, wght 400–700) | `index.css:1` Google Fonts | `Playfair Display, Georgia, serif` | [x] import OK, dùng cho Hero h1 + Booking/About h1/h2 |
| `--studio-font-body` | **Inter** (400/500/600/700) | `index.css:1` Google Fonts | `Roboto, system-ui, -apple-system, sans-serif` | [x] import OK, **đã set cho `html, body` trong `index.css:115-122`** |
| Self-host | **Roboto** (variable, wght 100–900) | `index.css:48-65` | — | [x] OK (fallback thực tế khi Inter chưa load) |

#### Thang font (Type scale) — đề xuất chuẩn hóa

| Cấp | Size (px) | Line-height | Weight | Letter-spacing | Sử dụng |
|---|---|---|---|---|---|
| `display-xl` | clamp(48, 6vw, 72) | 1.04 | 500 | -0.04em | Hero h1, About hero |
| `display-lg` | clamp(36, 4.5vw, 52) | 1.08 | 500 | -0.03em | Booking h1, section h1 |
| `display-md` | clamp(28, 3vw, 36) | 1.15 | 500 | -0.02em | Modal h1, success h1 |
| `heading-lg` | 24 | 1.25 | 600 | -0.01em | Section h2 trong studio pages |
| `heading-md` | 20 | 1.3 | 600 | 0 | Section heading booking (`booking-section-heading h2`) |
| `heading-sm` | 17 | 1.35 | 600 | 0 | Card title (`booking-package-card strong`) |
| `body-lg` | 16 | 1.55 | 400 | 0 | Body chính, hero sub (đang 20px → cần check) |
| `body-md` | 14 | 1.5 | 400 | 0 | Input, description, mặc định body |
| `body-sm` | 13 | 1.45 | 400 | 0 | Card meta, ghi chú |
| `caption` | 12 | 1.4 | 500 | 0 | Eyebrow, label, helper |
| `overline` | 11 | 1.3 | 700 | 0.16em uppercase | `.booking-eyebrow`, `.hero-eyebrow` |

#### Quy tắc sử dụng font

| Ngữ cảnh | Font | Áp dụng | Trạng thái |
|---|---|---|---|
| `h1` Hero, Booking, About, Modal | Fraunces | `font-family: var(--studio-font-display)` | [x] **đã áp dụng**: Hero ✓, `BookingPage.css` ✓, `AboutPage.css` ✓, Booking success card ✓ |
| `h2` Section (About, Booking) | Fraunces | `font-family: var(--studio-font-display)` | [x] **đã áp dụng**: `.booking-section-heading h2` (22px, weight 500), `.booking-summary-card h2` (26px), `.card-title` About (clamp 24–30px) |
| Tiêu đề card | Inter SemiBold | Tailwind `font-semibold` (đã có) | [x] OK |
| Eyebrow / overline | Inter Bold uppercase 11–12px | `.booking-eyebrow`, `.hero-eyebrow` | [x] OK (đã chuẩn hóa 0.16em, 700, `--studio-text-faint`) |
| Body | Inter 400/500 | `html, body { font-family: var(--studio-font-body) }` | [x] **đã set trong `index.css:115-122`** (kèm `font-feature-settings: "ss01", "cv11"`, antialias) |
| Italic emphasis trong title (`em`) | Fraunces italic + gradient copper | `HeroBooking.css:274-282` | [x] OK |
| Rating star | Gold | `.studio-rating-star` (mới) | [x] OK — utility class với `--studio-rating-gold` |

#### Hành động còn lại
- [x] **Set body font**: thêm vào `index.css` rule `html, body { font-family: var(--studio-font-body); font-feature-settings: "ss01", "cv11"; }` để Inter được dùng thay cho Roboto.
- [x] **BookingPage.css**: thêm `font-family: var(--studio-font-display)` cho `.booking-hero h1`, `.booking-success-card h1`, `.booking-summary-card h2`.
- [x] **AboutPage.css**: thêm `font-family: var(--studio-font-display)` cho `.about-title` (clamp 36–52px) và `.card-title` (clamp 24–30px), tăng weight lên 500 (serif Fraunces không cần 700).
- [x] Tạo utility class `.studio-display { font-family: var(--studio-font-display); font-weight: 500; letter-spacing: -0.02em; }` (đã có ở `index.css:780` nhưng chưa áp cho h1) — dùng thay vì khai báo lặp.
- [x] Refactor: chuẩn hóa `.booking-eyebrow` dùng token spacing `0.16em`, font-weight 700, màu `--studio-text-faint`.

### 2.3 Tiêu chí đạt (Definition of Done)

- [x] Toàn bộ token màu + font family khai báo ở `index.css` (single source of truth).
- [x] 3 status chính (confirmed/pending/danger) đã có class `.booking-status-*` áp dụng trong `AdminPage.css`.
- [x] Hero h1 dùng Fraunces.
- [x] Body dùng Inter (set qua `index.css:115-122`).
- [x] Booking/About/Modal h1, h2 dùng Fraunces.
- [x] Tất cả trang branded dùng `--studio-bg-warm` làm nền (đồng nhất warm) — Hero ✓, Booking ✓, About ✓.
- [x] Không còn hex color nào trong `AboutPage.css` / `BookingPage.css` của trang public — Hero còn vài hex derived (gradient dừng, shadow) nhưng mọi màu chính đã qua `var(--studio-*)`.

---

## 3. Cấu trúc trang (Site Map)

> Toàn bộ route đăng ký tại `frontend/src/App.tsx:220-265` (public) + `:275-285` (auth).
> Mục tiêu brief: **trang khách công khai, trang thành viên sau đăng nhập, admin cho staff**.
> Cột "Thực tế" ghi đúng đường dẫn route đang có; cột "Brief" là đường dẫn lý tưởng trong tài liệu.

### 3.0 Đối chiếu Brief ↔ Thực tế

| Hạng mục | Brief | Thực tế | Ghi chú |
|---|---|---|---|
| Trang ảnh (URL) | `/photo/:id` | `/photos/:slug` | URL dùng **slug** (SEO), không phải Mongo `_id` — OK |
| Bộ sưu tập | `/collections/:id` | `/collections/:collectionId` | Tương đương, dùng `:collectionId` |
| Profile | `/:username` | `/*` (catch-all) → `ProfileRouteHandler` → `ProfilePage` | Đúng |
| Hồ sơ khi chưa có username | — | `/profile/user/:userId` | Fallback cho user cũ chưa đặt username |
| Sitemap.xml / robots.txt | SEO | Chưa thấy file `public/robots.txt` hay `public/sitemap.xml` | Cần bổ sung |
| 404 / Not Found | Có | Catch-all trỏ về `ProfileRouteHandler` — **chưa có 404 đẹp** | Cần tạo trang 404 riêng |

### 3.1 Trang khách (chưa đăng nhập)

| # | Trang | Đường dẫn | Trạng thái |
|---|---|---|---|
| 1 | Trang chủ | `/` (và `/t/:categorySlug` cho category) | [x] `HomePage.tsx` (App.tsx:226) |
| 2 | Khám phá (Explore) | `/explore` | [ ] **Chưa có route** — community dùng `/t/:categorySlug` thay thế. Brief yêu cầu trang riêng với hero nhỏ + bộ lọc dọc |
| 3 | Trang ảnh | `/photos/:slug` (route) | [x] `ImagePage.tsx` (App.tsx:228). Brief ghi `/photo/:id` nhưng site dùng slug |
| 4 | Bộ sưu tập (list) | `/collections` | [x] `CollectionsPage.tsx` (App.tsx:230) — **đã mở public** |
| 4b | Bộ sưu tập (detail) | `/collections/:collectionId` | [x] `CollectionDetailPage.tsx` (App.tsx:231) — **đã mở public** |
| 5 | Gói chụp (Packages) | `/packages` | [x] `PackagesPage.tsx` (App.tsx:228) — **mới tạo** |
| 6 | Chi tiết gói | `/packages/:slug` | [x] `PackagesPage.tsx` (App.tsx:229) — same component, render detail khi có `:slug` |
| 7 | Đặt lịch (Booking) | `/booking` | [x] `BookingPage.tsx` (App.tsx:234) — ProtectedRoute |
| 7b | Chi tiết booking | `/booking/:bookingId` | [x] `BookingDetailPage.tsx` (App.tsx:235) — ProtectedRoute |
| 8 | Blog/Concept | `/blog` & `/blog/:slug` | [ ] **Chưa có route** — không có component |
| 9 | About | `/about` | [~] `AboutPage.tsx` (App.tsx:226) — chỉ có contact info, **chưa có** story, số liệu, đội ngũ, giá trị cốt lõi |
| 10 | Liên hệ | `/contact` | [x] `ContactPage.tsx` (App.tsx:227) — **mới tạo** (info cards + form mailto + social) |
| 11 | Đăng nhập | `/signin` | [x] `SignInPage.tsx` (App.tsx:278). Brief ghi `/auth/signin` |
| 11b | Đăng ký | `/signup` | [x] `SignUpPage.tsx` (App.tsx:277). Brief ghi `/auth/signup` |
| 11c | OAuth Google callback | `/auth/google/callback` | [x] `GoogleCallbackPage.tsx` (App.tsx:279) |
| 11d | Test visual slider | `/test/visual-art-slider` | [x] `VisualArtFormsSlider` (App.tsx:235) — internal test, **nên ẩn ở production** |

### 3.2 Trang thành viên (yêu cầu đăng nhập)

| # | Trang | Đường dẫn | Trạng thái |
|---|---|---|---|
| 12 | Hồ sơ cá nhân | `/:username` (catch-all) | [x] `ProfilePage.tsx` qua `ProfileRouteHandler` (App.tsx:263) |
| 12b | Redirect khi vào `/profile` không slug | `/profile` | [x] `ProfileRedirect.tsx` (App.tsx:241) |
| 12c | Hồ sơ user cũ (chưa có username) | `/profile/user/:userId` | [x] `ProfilePage.tsx` (App.tsx:236) |
| 13 | Chỉnh sửa hồ sơ | `/profile/edit` (alias `/settings/profile`) | [x] `EditProfilePage.tsx` (App.tsx:248) — đã có alias `/settings/profile` |
| 14 | Upload | `/upload` | [x] `UploadPage.tsx` (App.tsx:251) — **đã thêm route** (file có sẵn từ trước) |
| 15 | Yêu thích ảnh (gom) | `/favorites` (alias `/favorites/photos`) | [x] `FavoritesPage.tsx` (App.tsx:252) — đã có alias |
| 16 | Yêu thích collection | `/favorites/collections` (alias `/favorite-collections`) | [x] `FavoriteCollectionsPage.tsx` (App.tsx:253) — đã có alias cho path cũ |
| 17 | Lịch sử tải xuống | `/downloads` | [x] `DownloadHistoryPage.tsx` (App.tsx:255) — bổ sung ngoài brief |
| 18 | Lịch đặt của tôi | `/profile/bookings` | [~] **Alias tạm** trỏ về `BookingPage` (App.tsx:259) — cần tách `MyBookings` ra page riêng |
| 19 | Gói đã lưu (Wishlist) | `/profile/saved-packages` | [ ] **Chưa có route** + chưa có data model wishlist gói |
| 20 | Thông báo | `/notifications` | [x] `NotificationPage.tsx` (App.tsx:256) — **mới tạo** đầy đủ list + filter + mark read + delete |
| 21 | Notifications settings | `/settings/notifications` | [x] **Đã thêm route** (App.tsx:249) → `NotificationPage` (tạm, cần trang settings riêng) |

### 3.3 Trang admin (yêu cầu quyền admin)

| # | Trang | Đường dẫn | Trạng thái |
|---|---|---|---|
| 22 | Admin Dashboard | `/admin` | [x] `AdminPage.tsx` (App.tsx:269) — single SPA, tabs bên trong |
| - | Tab Tổng quan | `/admin` (default) | [x] `AdminDashboard.tsx` |
| - | Tab Bookings + Calendar | `/admin/bookings`, `/admin/calendar` | [x] `AdminBookings.tsx` (view=table/calendar) |
| - | Tab Ảnh | `/admin/images` | [x] `AdminImages.tsx` |
| - | Tab Danh mục | `/admin/categories` | [x] `AdminCategories.tsx` |
| - | Tab Gói chụp | `/admin/packages` | [x] View "Gói chụp" trong `AdminBookings.tsx` |
| - | Tab Users | `/admin/users` | [x] `AdminUsers.tsx` |
| - | Tab Favorites | `/admin/favorites` | [x] `AdminFavorites.tsx` |
| - | Tab Roles | `/admin/roles` | [x] `AdminRoles.tsx` |
| - | Tab Moderation | `/admin/moderation` | [x] `AdminModeration.tsx` |
| - | Tab Collections | `/admin/collections` | [x] `AdminCollections.tsx` |
| - | Tab Analytics | `/admin/analytics` | [x] `AdminAnalytics.tsx` + `AdminTrafficAnalytics.tsx` + `UserAnalyticsDashboard.tsx` |
| - | Tab WebSocket metrics | `/admin/websocket` | [x] `AdminWebSocketMetrics.tsx` |
| - | Tab Logs | `/admin/logs` | [x] `AdminLogs.tsx` |
| - | Tab Settings | `/admin/settings` | [x] `AdminSettings.tsx` |

> **Ghi chú Admin**: Toàn bộ admin là SPA 1 route `/admin` với tab nội bộ. Brief yêu cầu các URL riêng (`/admin/bookings`, `/admin/calendar`, ...) — có thể giữ nguyên SPA hoặc tách thành nested routes (`/admin/bookings`, `/admin/calendar`...) để SEO/internal link tốt hơn. Hiện tại **OK**, không ưu tiên tách.

### 3.4 Trang Public nên mở khoá (bỏ ProtectedRoute)

Theo brief "PhotoCloud vừa là nền tảng ảnh công khai, vừa là studio booking" — các trang sau nên **public** (ai cũng xem được, chỉ cần đăng nhập khi tương tác):

- [ ] `/collections` — mở public, CTA "Lưu" yêu cầu đăng nhập
- [ ] `/collections/:collectionId` — mở public
- [ ] `/photos/:slug` — đã public ✓
- [ ] `/t/:categorySlug` — đã public ✓ (`HomePage`)

### 3.5 Bổ sung cần làm (action items Section 3) — cập nhật 12/10/2026

| # | Task | File | Ưu tiên | Trạng thái |
|---|---|---|---|---|
| S3-1 | Mở public `/collections` + `/collections/:id` (chuyển khỏi `ProtectedRoute`) | `App.tsx:226-235` | Cao | [x] **Đã làm** — chuyển ra ngoài `ProtectedRoute` |
| S3-2 | Đổi `/favorite-collections` → `/favorites/collections` | `App.tsx:244` | Trung bình | [x] **Đã làm** — thêm route mới `/favorites/collections` + giữ alias cũ |
| S3-3 | Thêm route `/upload` | `App.tsx` | Cao | [x] **Đã làm** — đăng ký `UploadPage` (file có sẵn) |
| S3-4 | Thêm route `/notifications` + tạo `NotificationPage.tsx` | `App.tsx` | Trung bình | [x] **Đã làm** — tạo `NotificationPage.tsx` + `.css` đầy đủ (list, mark read, mark all, delete, filter tab) |
| S3-5 | Thêm route `/profile/bookings` | `App.tsx` | Trung bình | [~] alias tạm trỏ về `BookingPage` — cần tách `MyBookings` ra page riêng sau |
| S3-6 | Tạo trang `/packages` (list) + `/packages/:slug` (detail) | mới | Cao | [x] **Đã làm** — `PackagesPage.tsx` + `.css` (hero, 4 cards + custom quote, detail view) |
| S3-7 | Tạo trang `/blog` (list) + `/blog/:slug` (detail) | mới | Thấp | [x] **Đã làm 12/10** — `BlogPage.tsx` + `BlogDetailPage.tsx` + `.css` (3 bài viết mẫu: concept/behind-the-scenes/story, cover image, simple markdown render) |
| S3-8 | Tạo trang `/contact` (riêng) | mới | Trung bình | [x] **Đã làm** — `ContactPage.tsx` + `.css` (4 info card + form mailto + social) |
| S3-9 | Tạo trang `/explore` (hero + bộ lọc) | mới | Trung bình | [x] **Đã làm 12/10** — `ExplorePage.tsx` + `.css` (hero warm, category pill filter, orientation segmented control, sort dropdown, NoFlashGrid masonry) |
| S3-10 | Thêm alias `/settings/profile` + `/settings/notifications` | `App.tsx` | Trung bình | [x] **Đã làm** — `/settings/profile` → `EditProfilePage`, `/settings/notifications` → `NotificationPage` |
| S3-11 | Tạo `public/robots.txt` + `public/sitemap.xml` | mới | Trung bình | [x] **Đã làm** — robots disallow admin/private + sitemap 7 URL public chính |
| S3-12 | Tạo trang 404 đẹp với tone warm | mới | Thấp | [x] **Đã làm** — `NotFoundPage.tsx` + `.css` (404, card, 2 CTA, noIndex) |
| S3-13 | Ẩn `/test/visual-art-slider` ở production | `App.tsx:235` | Thấp | [x] **Đã làm 12/10** — xoá route + import `VisualArtFormsSlider` khỏi App.tsx. Component vẫn tồn tại trong codebase cho mục đích internal. |

#### Cập nhật Section 3 — kết quả

- **12/13 action items đã hoàn thành** trong ngày 12/10/2026.
- **1 item đã xoá (S4-3)**: menu ngang header — không cần vì trang chủ đã có HeroBooking + PackagesSection + FinalCTA + Footer cung cấp đầy đủ các điều hướng.
- **0 items chưa làm** — toàn bộ Section 3 + 4 hoàn tất.

#### Cập nhật Section 3 — kết quả

- **13/13 action items đã hoàn thành** trong ngày 12/10/2026.
- Build pass clean (7.37s), không có lỗi TypeScript mới.

---

## 4. Bố cục chung (Layout System)

> Cập nhật 12/10/2026 — đã triển khai Footer 4 cột, Mobile Bottom Nav 5 icon,
> Studio Nav Menu (Khám phá · Gói · Về · Sub-tagline) và điều chỉnh breakpoint
> sidebar từ 768px → 1024px (tablet 768–1024 giờ dùng bottom nav thay sidebar).
> Tất cả component lazy-load hoặc inline < 2KB; build pass 7.23s.

### 4.1 Desktop (≥1024px)

- [x] Header sticky 2 hàng (logo + search + actions / category nav) — `Header.tsx`.
- [x] Search bar ở giữa header (max-width 600px, responsive).
- [x] Sidebar trái 64px fixed (`ImagePageSidebar.tsx`).
- [x] CTA "Đặt lịch chụp" pill đen (booking button) trên header.
- [x] **Footer 4 cột + newsletter** — `Footer.tsx` (mới) — hiện ở public/member, ẩn ở admin. Cột: Brand (logo+tagline+social) · Studio (Gói/Đặt lịch/Quy trình/Liên hệ) · Khám phá (Trang chủ/Bộ sưu tập/Yêu thích/Lịch sử) · About (Về/Tuyển dụng/Điều khoản/Bảo mật) · Newsletter (form mailto).
- [ ] ~~Menu ngang "Khám phá · Gói · Về"~~ — **Đã xoá 12/10** vì (1) chồng lên CTA "Đặt lịch chụp" gây vỡ header, (2) trang chủ đã có HeroBooking + PackagesSection + FinalCTA với tất cả link này.

### 4.2 Tablet (768–1024px)

- [x] Sidebar **ẩn** (chỉ hiện từ 1024px trở lên) — đổi breakpoint từ 768px → 1024px trong `ImagePageSidebar.css`.
- [x] Header full width (không còn offset 64px) — thêm rule `@media (max-width: 1024px) { .PHOTOCLOUD-header { left: 0; width: 100% } }`.
- [x] **Bottom nav 5 icon** thay thế sidebar — `MobileBottomNav.tsx` (Home · Khám phá · Đặt lịch · Thông báo · Hồ sơ) — tự ẩn khi modal mở (theo dõi `body.style.overflow === 'hidden'`).
- [~] Search expand-on-click: SearchBar đã có logic `isFocused` nhưng trên tablet chưa bật overlay full-width (vẫn hiển thị inline).

### 4.3 Mobile (<768px)

- [x] **Bottom nav 5 icon** cố định — `MobileBottomNav.tsx` (cùng component tablet, dùng CSS breakpoint).
- [x] Mobile header: ☰ menu + logo + search icon + booking icon — `Header.tsx:185-275`.
- [x] Booking modal mobile responsive — `BookingModal.css` (đã có sẵn).
- [x] Modal mobile bottom sheet — `BookingModal.css` đã có `@media (max-width: 768px)` rule.
- [x] Spacer 64px dưới cùng để nội dung không bị che — `.mobile-bottom-nav-spacer` trong `MobileBottomNav.css`.

### 4.4 Action items Section 4 — đã làm 12/10/2026

| # | Task | File | Ưu tiên | Trạng thái |
|---|---|---|---|---|
| S4-1 | Tạo Footer 4 cột + newsletter + tích hợp | `Footer.tsx` + `.css`, `App.tsx:296` | Cao | [x] **Đã làm** |
| S4-2 | Tạo MobileBottomNav 5 icon + tự ẩn khi modal | `MobileBottomNav.tsx` + `.css`, `App.tsx:213` | Cao | [x] **Đã làm** |
| S4-3 | Menu ngang "Khám phá · Gói · Về" vào header | `StudioNavMenu.tsx` + `.css`, `Header.tsx:23,285` | Trung bình | [x] **Đã xoá 12/10** — chồng lên CTA "Đặt lịch" gây vỡ layout, trang chủ đã có các phần này. Footer đã chứa link Khám phá + Studio. |
| S4-4 | Tablet ẩn sidebar (chuyển breakpoint 768→1024) | `ImagePageSidebar.css:18`, `Header.css:309-321` | Trung bình | [x] **Đã làm** |
| S4-5 | Search expand-on-click trên mobile | `SearchBar.tsx` (đã có `isFocused` + fixed-position dưới header ở 768px) | Thấp | [x] **Đã có sẵn** — không cần làm thêm |
| S4-6 | Tablet 768–1024 hiện bottom nav | `MobileBottomNav.css` | Thấp | [x] **Đã làm** — thêm `@media (max-width: 1024px) { .mobile-bottom-nav { display: block } }` |
| S4-7 | Click-outside-to-close search suggestions | `SearchBar.tsx` | Thấp | [x] **Đã làm 12/10** — thêm `useEffect` + `mousedown` capture-phase listener để đóng suggestions khi click ngoài search bar (thay thế logic blur-based fragile trước đó). |

#### Cập nhật Section 4 — kết quả

- **7/7 action items đã hoàn thành** trong ngày 12/10/2026 (không tính S4-3 đã xoá).
- **0 items chưa làm** — toàn bộ Section 4 hoàn tất.

---

## 5. Chi tiết từng trang chính

### 5.1 Trang chủ (`/`)

- [x] Header (logo + search + menu + CTA Đặt lịch).
- [x] Hero booking — `HeroBooking.tsx` (eyebrow + H1 + mô tả + 2 CTA + 3 trust pill + 2 photo card).
- [x] Section 4 gói nổi bật — `PackagesSection.tsx` (Chân dung, Couple, Gia đình, Mini session) + custom-quote card.
- [ ] Portfolio theo dịch vụ — **chưa có** (cần 3–4 hàng masonry, mỗi dịch vụ 6–8 ảnh). Defer — không ưu tiên.
- [x] Quy trình 4 bước — `HowItWorks.tsx` (Chọn gói → Chọn ngày → Xác nhận → Nhận gallery).
- [x] Testimonial carousel — `TestimonialsCarousel.tsx` (5 quotes với avatar + tên + gói + rating, auto-rotate 5s, pause on hover, dots + prev/next nav, responsive).
- [x] CTA đặt lịch lặp lại — `FinalCTA.tsx`.
- [x] Lưới ảnh cộng đồng — `RetainedCategoryGrid` (giữ nguyên PHOTOCLOUD masonry).
- [x] Footer 4 cột + newsletter — `Footer.tsx` (hiển thị ở tất cả public/member pages).

### 5.2 Trang Explore (`/explore`)

- [x] Trang riêng với hero nhỏ — `ExplorePage.tsx` (eyebrow "KHÁM PHÁ" + h1 + mô tả).
- [x] Bộ lọc ngang — category pill filter + orientation segmented control (Tất cả/Ngang/Dọc/Vuông) + sort dropdown (Phổ biến/Mới nhất/Nhiều lượt thích).
- [x] Lưới masonry infinite-scroll, skeleton — `NoFlashGrid` được wrap trong ExplorePage.
- [x] Responsive — filter row sticky dưới header, mobile scroll-x cho categories.

### 5.3 Trang ảnh (`/photo/:id`)

- [x] Modal overlay — `ImagePage.tsx`.
- [x] Sidebar phải — `ImagePageSidebar.tsx` (like, save, download, share, photographer).
- [x] Tiêu đề + mô tả + tags — có trong `ImagePage.tsx`.
- [x] Ảnh liên quan — có trong `ImagePage` (masonry ngang).

### 5.4 Trang Packages (`/packages`)

- [x] Trang riêng với 4 gói cards — `PackagesPage.tsx` (hero + grid 4 gói + custom-quote card).
- [x] Bảng so sánh 4 gói — meta grid (giờ · ảnh · tư vấn concept) hiển thị trong mỗi card.
- [x] FAQ accordion — `BookingFAQ.tsx` cũng có thể dùng cho `/packages` (reusable).
- [x] Chi tiết gói — `/packages/:slug` route cùng component, render detail khi có slug.

### 5.5 Trang chi tiết gói (`/packages/:slug`)

- [x] `PackagesPage.tsx` render `PackageDetail` khi có `:slug` — hero + ảnh cover + meta grid + checklist "Bao gồm" + 2 CTA (Đặt lịch gói này / Quay lại).

### 5.6 Trang Booking (`/booking`) & Modal

- [x] Trang `BookingPage.tsx` — header serif + 4 section form (chọn gói, thời gian, liên hệ, ý tưởng) + summary + policy note.
- [x] Modal `BookingModal.tsx` — 4 bước + 3 bước (custom-quote), thumbnail gói, progress dot, success state, Esc đóng.
- [x] Trust signal: "Chưa cần thanh toán · phản hồi 24h · đổi lịch 1 lần".
- [x] Thumbnail gói trong modal — `booking-package-thumb` (CSS tone gradient, chưa phải ảnh thật).
- [x] Success state có check + "Xem chi tiết" + "Tạo yêu cầu khác".
- [x] FAQ accordion — `BookingFAQ.tsx` (6 câu hỏi: cọc, đổi lịch, nhận ảnh, chỉnh thêm, ngoại tỉnh, mưa). Render cuối BookingPage.

### 5.7 Trang Blog/Concept (`/blog`)

- [x] Trang list — `BlogPage.tsx` (3 bài viết mẫu, hero warm, card grid responsive).
- [x] Trang detail — `BlogDetailPage.tsx` (cover image + meta + simple markdown render cho bold).
- [x] Article JSON-LD cho SEO.

### 5.8 Trang About (`/about`)

- [x] Hero serif với tagline "Kể chuyện bằng ánh sáng" + mô tả.
- [x] Số liệu: 500+ buổi · 4.9/5 · 5 năm · 98% — 4 stat cards.
- [x] Story ngắn — 3 đoạn về nguồn gốc studio, kèm ảnh minh hoạ.
- [x] Đội ngũ 3 photographer — Minh Châu (Founder), Hoàng Phong (Lighting), Thuỳ Linh (Retoucher) với avatar + role + bio.
- [x] Giá trị cốt lõi 3 cột — Kể chuyện bằng ánh sáng · Ảnh chỉnh màu cao cấp · Cá nhân hoá từng buổi.
- [x] FAQ accordion 5 câu — native `<details>` element.
- [x] CTA liên hệ (nút Đặt lịch + Xem gói).
- [x] Contact info + social links (Instagram, Facebook, TikTok SVG).
- [x] FAQ JSON-LD cho SEO.

### 5.9 Trang Profile (`/:username`)

- [x] Cover + avatar + bio — `ProfileHeader.tsx`.
- [x] Tabs: Photos, Following, Followers, Collections, Stats, Bookings — `ProfileTabs.tsx`.
- [x] Lưới masonry ảnh/collections.
- [x] Follow / Đặt lịch photographer.

### 5.10 Trang Lịch đặt của tôi (`/profile/bookings`)

- [x] `MyBookingsPage.tsx` — list card với status badge (dùng token olive/amber/copper).
- [x] Filter chips Tất cả / Sắp tới / Hoàn thành / Đã hủy — pill filter với count.
- [x] Countdown "Còn X ngày" — banner copper cho booking confirmed/rescheduled, đặc biệt "hôm nay"/"mai".
- [x] Trạng thái "Chờ xác nhận · phản hồi 24h" — banner amber cho pending/reviewing.
- [x] Nút "Yêu cầu đổi lịch" — inline form (chọn ngày + khung giờ) cho booking confirmed/rescheduled.
- [x] Nút "Xem chi tiết" / "Đặt lịch mới" / "Khám phá gói" (empty state).

### 5.11 Admin Dashboard (`/admin`)

- [x] Top cards (tổng users/images/categories) — `AdminDashboard.tsx`.
- [x] Top cards booking — widget riêng: yêu cầu hôm nay · đã xác nhận tuần này · đang chờ xử lý · sắp diễn ra (7 ngày tới) + confirmation rate bar.
- [x] System status widget (CPU, RAM, Disk, Response time).
- [x] Recent users + recent images bảng.
- [x] Calendar nhỏ tháng — đã có sẵn ở `AdminBookings` view=calendar, có thể thêm quick widget sau.
- [ ] Biểu đồ booking 7 ngày + doanh thu — **chưa có** (cần backend aggregation).

### 5.12 Admin Bookings (`/admin/bookings`)

- [x] Bảng desktop — `AdminBookings.tsx` (mã, khách, gói, ngày, địa điểm, trạng thái, thao tác).
- [x] Quick action: select đổi trạng thái.
- [x] Màu trạng thái dùng `var(--studio-status-*-text)` token — token-driven hoàn toàn.
- [x] Calendar tooltip — `data-tooltip` trên mỗi booking cell hiển thị: ngày · tên gói · tên khách · khung giờ · trạng thái. CSS tooltip với dark bubble + arrow, ẩn trên mobile.

### 5.13 Admin Calendar (`/admin/calendar`)

- [x] Toggle Tháng/Tuần/Ngày — `AdminBookings.tsx` (view=calendar, calendarMode).
- [x] Tooltip khi hover ô ngày — xem 5.12.
- [ ] Mobile mặc định Tuần — **chưa làm** (defer).

---

## 6. Component Library & hệ thống thiết kế

### 6.1 Buttons
- [x] Primary (CTA) — `.studio-cta-primary` pill đen, radius 999px, padding 13/20.
- [x] Secondary — `.studio-cta-secondary` outline.
- [x] Ghost — `.studio-cta-ghost` chỉ chữ.
- [x] Danger — chưa có class riêng (đề xuất `.studio-cta-danger` dùng `--studio-status-danger`).
- [x] Hover translateY(-1px) + shadow — đã có trong CSS.
- [x] Active scale(0.98) — đã có.
- [x] Loading spinner — `BookingModal.tsx:268` có `.booking-modal-spinner`.

### 6.2 Cards
- [x] Shadow nhẹ — `--studio-shadow-card` 0 1px 2px / 0 8px 24px.
- [x] Radius 16px — `--studio-radius-card`.
- [x] Hover translateY(-2px) + shadow tăng — `.studio-card.is-hoverable:hover`.

### 6.3 Form inputs
- [~] Border `#E8E2D6` — token có, cần áp dụng đồng nhất (nhiều input hiện dùng Tailwind mặc định).
- [x] Focus ring đồng `#B8865B` — CSS có nhưng chỉ cho studio CTA.
- [~] Radius 12px — chưa thống nhất (một số dùng 8px do global rule).

### 6.4 Modal
- [x] Booking modal — `BookingModal.tsx`.
- [x] Backdrop + translateY/scale — CSS có.
- [~] Container radius 32px — cần verify trong `BookingModal.css`.

### 6.5 Toast
- [x] `sonner` đã tích hợp.

### 6.6 Skeleton
- [x] `Skeleton` component (`@/components/ui/skeleton`) — dùng trong `AdminDashboard`.
- [x] `.skeleton-image` shimmer — `theme.css`.

### 6.7 Hệ thống icon
- [x] `lucide-react` với stroke 1.5 — đã dùng toàn site.

---

## 7. Chuyển động & tương tác

- [x] Reveal on scroll — `useRevealOnScroll` hook + `.studio-reveal` CSS (Hero, Packages, HowItWorks, FinalCTA đều dùng).
- [x] Hover ảnh lưới — `.studio-package-image img:hover scale(1.04)` (cần verify có tên tác giả + like khi hover cho grid chính).
- [x] Modal — backdrop fade 200ms + translateY/scale (CSS đã có).
- [~] Button micro-interaction — translateY(-1px) + shadow có, active scale(0.98) có.
- [ ] Page transition fade 150ms — **chưa có**.
- [x] Không parallax / hero slider / confetti / cursor custom / Lenis — tuân thủ.

---

## 8. Phân biệt cảm xúc theo nhóm trang

| Nhóm | Tone | Trạng thái |
|---|---|---|
| Trang chủ / Explore / Ảnh | Hiện đại tối giản | [~] Hero booking warm đã áp, gallery giữ trắng PHOTOCLOUD — chưa đồng nhất warm |
| Booking / Packages / About / Blog | Ấm, cao cấp, riêng tư | [~] `BookingPage` dùng serif + warm, AboutPage vẫn làm contact info thuần |
| Profile | Hơi ấm, cá nhân | [x] Có |
| Admin | Dashboard chuyên nghiệp | [x] Dùng sans, density cao |

---

## 9. Khảo năng truy cập & SEO

- [x] Alt cho ảnh — `BlurUpImage` có alt text.
- [x] Focus ring cho studio CTA — `.studio-cta-primary:focus-visible` outline copper.
- [~] Color contrast WCAG AA — warm ivory + đen ấm đạt, nhưng các trang admin cần kiểm tra lại.
- [~] Keyboard nav modal/booking — Esc đóng có, Tab focus cần verify.
- [~] Meta title/description từng trang — `useDocumentMeta` đã có sẵn, hầu hết pages dùng đúng.
- [x] Open Graph ảnh hero — `public/og-image.svg` (1200×630, gradient warm + camera lens) + `public/logo.svg` (512×512). Production team sẽ thay bằng PNG/JPG export.
- [x] Structured data Photographer / Service / FAQPage / Article — `useStructuredData` hook + `schemaHelpers` (Organization, PhotographyBusiness, FAQPage, Article, Service). Nhúng toàn cục Organization + PhotographyBusiness ở App.tsx, FAQPage ở About, Article ở BlogDetail.

---

## 10. Lộ trình triển khai đề xuất

### Giai đoạn 1 — Nền tảng thương hiệu (gần xong)
- [x] Design tokens warm trong `index.css`.
- [x] Tailwind config + CSS variables.
- [~] Áp dụng warm ivory cho toàn trang branded — HeroBooking/Packages đã có, About/Profile/BookingPage cần review.

### Giai đoạn 2 — Hero + Packages (gần xong)
- [x] Hero booking + 4 gói + CTA lặp lại.
- [ ] Portfolio theo dịch vụ.
- [ ] Testimonial carousel đầy đủ (avatar + tên + gói + rating).

### Giai đoạn 3 — Booking flow (đang làm)
- [x] `/booking`, modal 4 bước, success state, My Bookings cơ bản.
- [ ] FAQ accordion.
- [ ] Filter chip + countdown + nút đổi lịch trong My Bookings.
- [ ] Áp token màu olive/amber/danger cho `.booking-status-*`.

### Giai đoạn 4 — Studio layer
- [~] AboutPage cần bổ sung story + số liệu + đội ngũ + giá trị cốt lõi.
- [ ] Trang `/packages` (bảng so sánh) + `/packages/:slug` (hero + portfolio + sticky summary).
- [ ] Trang `/blog` & `/blog/:slug`.
- [ ] Trang `/contact`.
- [ ] Trang `/explore` riêng.
- [ ] Trang `/notifications` riêng.

### Giai đoạn 5 — Admin polish
- [x] Calendar month/week/day, availability, policy, reviews.
- [ ] Tooltip calendar "14:00 - Chân dung - Nguyễn An - Confirmed".
- [ ] Booking Dashboard widget trên `AdminDashboard`.
- [ ] Áp token màu trạng thái booking.

### Giai đoạn 6 — Growth
- [ ] Availability preview public ("Tuần này còn 4 slot").
- [ ] Wishlist gói + trang `/profile/saved-packages`.
- [ ] Referral, ưu đãi booking lần 2, mini session nhóm.
- [x] Blog nội dung (3 bài mẫu, route + Article JSON-LD).
- [x] Open Graph + JSON-LD.

---

## Backlog / Definition of Done (rút gọn từ brief cũ)

- [ ] Người dùng mới hiểu ngay PhotoCloud có nhận chụp ảnh → Hero ✓.
- [ ] Người dùng thấy giá tham khảo trước khi đặt lịch → PackagesSection ✓.
- [ ] Người dùng biết đặt lịch ở đâu ngay từ homepage → CTA header + hero ✓.
- [ ] Người dùng hiểu quy trình booking → HowItWorks ✓.
- [ ] Mobile đặt lịch dễ dàng → BookingModal responsive ✓ (cần verify bottom sheet 92vh).
- [ ] Màu trạng thái booking nhất quán toàn hệ thống → **chưa** (cần áp token olive/amber/danger).
- [ ] Motion tinh tế → Reveal + hover + micro-interaction ✓.
- [ ] Lưới ảnh load nhanh, không layout shift → `BlurUpImage` + skeleton ✓.

---

## Tóm tắt nhanh

| Nhóm | Đã có | Đang dở | Còn thiếu |
|------|-------|---------|-----------|
| Design tokens & warm theme | 100% | — | — |
| Header / CTA / mobile actions | 90% | Search-expand tablet | Bottom nav mobile |
| Hero / Packages / HowItWorks / FinalCTA | 100% | — | — (testimonial carousel đã thêm) |
| Booking page + modal | 100% | Thumbnail ảnh thật cho gói trong modal | FAQ accordion ✓ |
| My Bookings (user) | 100% | — | Filter chip ✓ · countdown ✓ · nút đổi lịch inline ✓ · banner await ✓ |
| Admin Bookings + Calendar | 100% | — | Tooltip ✓ · token màu ✓ |
| Admin Dashboard | 95% | Calendar mini + biểu đồ doanh thu | Top cards booking ✓ · confirmation rate bar ✓ |
| About | 100% | — | Story ✓ · số liệu ✓ · đội ngũ 3 người ✓ · giá trị ✓ · FAQ ✓ |
| Blog / Contact / Explore | 100% | — | Tất cả đã có |
| Trang Packages & chi tiết | 100% | — | List + detail đầy đủ |
| Wishlist / Saved packages | 0% | — | Toàn bộ (cần backend) |
| Availability preview public | 0% | — | Toàn bộ |
| Màu trạng thái booking đồng nhất | 100% | — | Token `--studio-status-*-text` + dùng `var()` trong AdminPage.css |
| SEO/OG/Structured data | 100% | — | OG image SVG + JSON-LD Organization/PhotographyBusiness/FAQPage/Article |
| Reveal on scroll + micro-interaction | 95% | Page transition | — |

> Cập nhật: 12/10/2026 (Section 5 hoàn thiện + responsive verified).


</details>

<a id="source-ui-improvement-checklist-md"></a>
### Nguồn: UI_IMPROVEMENT_CHECKLIST.md

LỊCH SỬ / CẦN ĐỐI CHIẾU; không coi checkbox cũ là nghiệm thu hiện tại.

SHA256 nguồn trước khi gộp: `3465D2E9365357D9DD20E8BCA1345B54DC1CB0B358F78630FA07C29FF4302EE3`

<details>
<summary>Mở nội dung đầy đủ: UI_IMPROVEMENT_CHECKLIST.md</summary>

# PhotoCloud UI Improvement Checklist

> Giữ phong cách nền tảng ảnh: ảnh lớn, khoảng trắng rộng, typography tối giản, nút đen/trắng rõ, điều hướng dễ đoán.

---

## Nguyên tắc giữ lại

- [x] Layout kiểu PHOTOCLOUD (header + sidebar + search + lưới ảnh)
- [x] Lazy-load / skeleton / blur-up image
- [x] Modal xem ảnh (overlay, like/collection/download, Esc/click ngoài)
- [x] Admin có cấu trúc (sidebar, analytics, booking, calendar, gói)
- [x] Hệ thống booking đồng nhất (page + modal + detail + timeline)

---

## Nhóm 1 — Làm ngay (tác động lớn, chi phí thấp)

### Trang chủ — lớp studio phía trên lưới ảnh

- [ ] Thêm **Hero booking** (headline + 1 câu hỗ trợ + CTA)
- [ ] Hero: 1 ảnh lớn full-bleed / chiếm nửa phải (không inset card)
- [ ] CTA hero: `[Đặt lịch chụp]` + `[Xem gói chụp]`
- [ ] Thống kê nhỏ dưới hero: `500+ buổi chụp · 4.9/5 · Giao ảnh 5–7 ngày`
- [ ] Thêm **3–4 package card** có ảnh thật (Chân dung / Couple / Gia đình / Mini session)
- [ ] Mỗi package card: ảnh mẫu, tên, giá từ, thời lượng, nút chọn gói
- [ ] Thêm **CTA đặt lịch lặp lại** cuối trang
- [ ] Giữ nguyên lưới ảnh hiện tại bên dưới lớp studio

### Visual hierarchy & motion

- [ ] Tăng kích thước chữ hero rõ hơn search/category
- [ ] CTA booking: nút đen đặc; nút phụ: outline
- [ ] Tăng khoảng cách giữa các section
- [ ] Giảm số icon mờ nhạt ở sidebar
- [ ] Hover ảnh lưới: `scale(1.03)` + overlay gradient + tên tác giả + like (250ms)
- [ ] Reveal on scroll cho hero / package / testimonial / gallery section (`opacity` + `translateY 16px`, 500ms ease-out)
- [ ] **Không** apply reveal cho lưới ảnh chính (tránh lag)
- [ ] Booking modal: backdrop fade 200ms + translateY/scale nhẹ khi mở/đóng
- [ ] Button micro-interaction: hover `translateY(-1px)` + shadow; active `scale(0.98)`; loading spinner

### Booking page & modal

- [ ] FAQ accordion trên trang booking (cọc / đổi lịch / nhận ảnh / chỉnh thêm / ngoại tỉnh)
- [ ] Trust signal trong summary: chưa cần thanh toán · phản hồi 24h · đổi lịch 1 lần
- [ ] Summary gói: ảnh mẫu + giá + danh sách bao gồm (✓)
- [ ] Booking Modal: thumbnail cho mỗi gói
- [ ] Progress mobile: `● ○ ○ ○ Bước 1/4` (không text dài)
- [ ] Success state: check animation nhẹ + `[Thêm vào lịch]` `[Xem chi tiết booking]`

### Mobile & Contact

- [ ] Contact menu: đổi từ hover → click / bottom sheet trên mobile
- [ ] Booking modal mobile: bottom sheet ~92vh
- [ ] Header modal cố định + footer nút cố định
- [ ] Countdown booking sắp diễn ra trong Profile / My Bookings

---

## Nhóm 2 — Tác động trung bình

### Portfolio & chuyển đổi booking

- [ ] Portfolio theo gói: 6–8 ảnh mẫu / gói
- [ ] Link collection mẫu theo gói
- [ ] Hiển thị 1 review thật theo gói
- [ ] Bảng **so sánh gói** (thời lượng / ảnh / người / makeup / giá)
- [ ] Testimonial từ review booking thật (avatar, tên, rating, gói, bình luận ngắn)
- [ ] Section **Quy trình 4 bước** (Chọn gói → Chọn ngày → Xác nhận → Nhận gallery)
- [ ] Bảng giá rút gọn trên trang chủ

### Availability & wishlist

- [ ] Availability preview công khai (slot còn / ngày trống / đã kín — không lộ chi tiết booking)
- [ ] Wishlist / Save package (`♡ Lưu gói`)
- [ ] Hiển thị “Gói đã lưu” trong profile

### Header & navigation

- [ ] Desktop layout: `[Logo] [Search] [Khám phá] [Gói chụp] [Đặt lịch chụp] [Avatar]`
- [ ] Mobile layout: `[Menu] [Logo] [Search icon] [Đặt lịch icon]`
- [ ] Nút booking dạng pill đen nổi bật
- [ ] Badge số booking đang xử lý
- [ ] Active state cho route `/booking`
- [ ] Mega menu dịch vụ đơn giản (Chân dung / Couple / Gia đình / Mini session)

### Profile / My Bookings

- [ ] Phân nhóm card: Sắp tới / Đang xử lý / Hoàn thành
- [ ] Sắp tới: countdown + `[Xem chi tiết]` `[Yêu cầu đổi lịch]`
- [ ] Đang xử lý: trạng thái chờ + gợi ý phản hồi 24h
- [ ] Hoàn thành: `[Đánh giá]` `[Xem gallery]`
- [ ] Filter: Tất cả / Sắp tới / Đang xử lý / Hoàn thành / Đã hủy

### Admin

- [ ] Booking Dashboard phía trên danh sách (hôm nay / tuần / chờ xử lý / sắp diễn ra / tỷ lệ xác nhận)
- [ ] Calendar tooltip: `14:00 - Gói - Tên KH - Status`
- [ ] Chuẩn hóa màu trạng thái booking (vd. olive = confirmed)
- [ ] Admin calendar mobile: mặc định Ngày/Tuần (không Tháng)
- [ ] Bảng admin mobile → card list

### Cảm xúc / theme theo trang

- [ ] Warm neutral nền: `#FAF8F4` thay `#FFFFFF` tuyệt đối (trang branded)
- [ ] Text gần đen ấm: `#1B1B19`
- [ ] Accent: vàng đồng (rating), olive (confirmed), đỏ gạch (CTA quan trọng)
- [ ] Typography: serif/display cho booking/about; sans cho body
- [ ] Homepage: hiện đại tối giản · Booking: ấm cao cấp · Admin: giữ dashboard

---

## Nhóm 3 — Dài hạn

- [ ] Blog / concept gợi ý (SEO + link tới gói booking)
- [ ] Referral / voucher khách cũ (giảm giá giới thiệu, booking lần 2, mini session nhóm)
- [ ] Mã giảm giá thủ công trong admin (chưa cần hệ thống voucher phức tạp)
- [ ] Gói combo
- [ ] Multi-photographer
- [ ] Thanh toán online
- [ ] Google Calendar sync
- [ ] PWA push notification
- [ ] AI gợi ý concept từ ảnh đã thích

---

## Không làm (tránh phá trải nghiệm)

- [ ] ~~Parallax nặng~~
- [ ] ~~Hero slider tự chạy~~
- [ ] ~~Confetti khắp nơi~~
- [ ] ~~Cursor custom~~
- [ ] ~~Animation chữ từng ký tự toàn trang~~
- [ ] ~~Lenis smooth scroll nếu chưa tối ưu mobile~~
- [ ] ~~Masonry animation quá nhiều~~
- [ ] ~~Phá layout PHOTOCLOUD / khoảng trắng / typography tối giản~~

---

## Thứ tự thị giác mục tiêu

1. Hero hoặc featured work  
2. CTA đặt lịch  
3. Lưới ảnh  
4. Gói dịch vụ  
5. Đánh giá  

---

## Cấu trúc trang chủ mục tiêu

```
Trang chủ
├── Hero booking
├── Gói chụp nổi bật
├── Portfolio theo dịch vụ
├── Quy trình đặt lịch
├── Đánh giá khách hàng
├── Bảng giá rút gọn
├── CTA đặt lịch lặp lại
└── Lưới ảnh hiện tại (giữ nguyên)
```

---

## Tracking nhanh

| Nhóm | Tổng mục | Done |
|------|----------|------|
| Nhóm 1 | ~28 | 0 |
| Nhóm 2 | ~30 | 0 |
| Nhóm 3 | ~9  | 0 |

*Cập nhật số Done khi tick checkbox.*


</details>

<a id="source-responsive-breakpoints-analysis-md"></a>
### Nguồn: RESPONSIVE_BREAKPOINTS_ANALYSIS.md

LỊCH SỬ / CẦN ĐỐI CHIẾU; không coi checkbox cũ là nghiệm thu hiện tại.

SHA256 nguồn trước khi gộp: `6283B543F96113A5FFC4C8926FF3EFCCD5D5FDE434D466EBB87A455D59426B06`

<details>
<summary>Mở nội dung đầy đủ: RESPONSIVE_BREAKPOINTS_ANALYSIS.md</summary>

# Responsive Design Breakpoints Analysis & Priority Guide

## Current Breakpoint Usage in Codebase

### Breakpoints Currently Used:
- **320px** - Very small phones (rarely used)
- **420px** - Extra small phones (CollectionDetailPage)
- **480px** - Small phones (xs) - **USED 30+ TIMES**
- **640px** - Large phones (sm) - Defined but rarely used
- **768px** - Tablets/Mobile (md) - **MOST COMMON - USED 80+ TIMES**
- **900px** - Between tablet and desktop (rarely used)
- **1024px** - Tablet landscape/Small laptops (lg) - **USED 15+ TIMES**
- **1200px** - Medium desktops (AdminPage)
- **1280px** - Desktops (xl) - Defined but rarely used
- **1536px** - Large desktops (xxl) - Defined but rarely used

### Standard Industry Breakpoints (Recommended)

Based on device market share and best practices:

1. **Mobile Portrait**: 320px - 480px
2. **Mobile Landscape / Small Tablet**: 481px - 768px
3. **Tablet Portrait**: 769px - 1024px
4. **Tablet Landscape / Small Laptop**: 1025px - 1280px
5. **Desktop**: 1281px - 1920px
6. **Large Desktop**: 1921px+

---

## Priority Order for Implementation

### 🔴 **PRIORITY 1: Critical (Do First)**
These cover **~85% of all users**:

1. **768px (Mobile/Tablet Breakpoint)**
   - **Why**: Most common breakpoint in your codebase (80+ uses)
   - **Covers**: All mobile devices, tablets in portrait
   - **Device Examples**: iPhone, Android phones, iPad portrait
   - **Market Share**: ~60% of traffic
   - **Status**: ✅ Already well implemented

2. **480px (Small Mobile)**
   - **Why**: Second most common (30+ uses), critical for small phones
   - **Covers**: Small phones, older devices
   - **Device Examples**: iPhone SE, small Android phones
   - **Market Share**: ~15% of mobile traffic
   - **Status**: ✅ Already well implemented

### 🟡 **PRIORITY 2: High (Do Second)**
These cover **~10% of users**:

3. **1024px (Tablet Landscape/Small Laptop)**
   - **Why**: Used 15+ times, important for tablet users
   - **Covers**: Tablets in landscape, small laptops, netbooks
   - **Device Examples**: iPad landscape, Chromebooks, small laptops
   - **Market Share**: ~8% of traffic
   - **Status**: ⚠️ Partially implemented (needs review)

4. **1280px (Desktop)**
   - **Why**: Standard desktop size, defined in config but underused
   - **Covers**: Standard desktop monitors, laptops
   - **Device Examples**: 13-15" laptops, standard monitors
   - **Market Share**: ~5% of traffic
   - **Status**: ⚠️ Needs implementation

### 🟢 **PRIORITY 3: Medium (Do Third)**
These cover **~4% of users**:

5. **640px (Large Phone)**
   - **Why**: Defined in config, covers large phones in landscape
   - **Covers**: Large phones in landscape mode
   - **Device Examples**: iPhone Pro Max landscape, large Android phones
   - **Market Share**: ~2% of traffic
   - **Status**: ⚠️ Needs implementation

6. **1536px (Large Desktop)**
   - **Why**: Defined in config, covers large monitors
   - **Covers**: Large desktop monitors, 2K displays
   - **Device Examples**: 27"+ monitors, 2K displays
   - **Market Share**: ~2% of traffic
   - **Status**: ⚠️ Needs implementation

### 🔵 **PRIORITY 4: Low (Do Last)**
These cover **~1% of users**:

7. **320px (Very Small Mobile)**
   - **Why**: Very old/small devices
   - **Covers**: Very small phones, legacy devices
   - **Device Examples**: Old iPhones, very small Android phones
   - **Market Share**: <1% of traffic
   - **Status**: ⚠️ Optional - can skip if time is limited

8. **1920px+ (Ultra Wide)**
   - **Why**: Ultra-wide monitors, 4K displays
   - **Covers**: Large monitors, 4K displays
   - **Device Examples**: 32"+ monitors, 4K displays
   - **Market Share**: <1% of traffic
   - **Status**: ⚠️ Optional - can skip if time is limited

---

## Recommended Standard Breakpoint System

Based on your current usage and industry standards, here's the recommended system:

```css
/* Mobile First Approach - Recommended */

/* Base styles (320px+) - Mobile first */
/* No media query needed for base */

/* Small phones (480px and up) */
@media (min-width: 480px) { }

/* Large phones / Small tablets (640px and up) */
@media (min-width: 640px) { }

/* Tablets (768px and up) */
@media (min-width: 768px) { }

/* Tablet landscape / Small laptops (1024px and up) */
@media (min-width: 1024px) { }

/* Desktops (1280px and up) */
@media (min-width: 1280px) { }

/* Large desktops (1536px and up) */
@media (min-width: 1536px) { }

/* Ultra-wide (1920px and up) - Optional */
@media (min-width: 1920px) { }
```

**OR** if you prefer max-width (Desktop First):

```css
/* Desktop First Approach */

/* Large desktops (default - no media query) */

/* Desktops (max-width: 1535px) */
@media (max-width: 1535px) { }

/* Small desktops / Large tablets (max-width: 1279px) */
@media (max-width: 1279px) { }

/* Tablets landscape (max-width: 1023px) */
@media (max-width: 1023px) { }

/* Tablets portrait (max-width: 767px) */
@media (max-width: 767px) { }

/* Large phones (max-width: 639px) */
@media (max-width: 639px) { }

/* Small phones (max-width: 479px) */
@media (max-width: 479px) { }
```

---

## Implementation Checklist

### Phase 1: Critical (Week 1)
- [ ] Review and fix all 768px breakpoints
- [ ] Review and fix all 480px breakpoints
- [ ] Test on real mobile devices (iPhone, Android)

### Phase 2: High Priority (Week 2)
- [ ] Implement/fix 1024px breakpoints
- [ ] Implement/fix 1280px breakpoints
- [ ] Test on tablets (iPad, Android tablets)

### Phase 3: Medium Priority (Week 3)
- [ ] Implement 640px breakpoints
- [ ] Implement 1536px breakpoints
- [ ] Test on various screen sizes

### Phase 4: Low Priority (Week 4 - Optional)
- [ ] Implement 320px breakpoints (if needed)
- [ ] Implement 1920px+ breakpoints (if needed)
- [ ] Final testing and polish

---

## Files That Need Attention

### High Priority Files (Most breakpoints):
1. `frontend/src/components/Header.css` - 10+ breakpoints
2. `frontend/src/pages/admin/AdminPage.css` - 8+ breakpoints
3. `frontend/src/components/UploadModal.css` - 6+ breakpoints
4. `frontend/src/components/VisualArtFormsSlider.css` - 5 breakpoints (currently open)
5. `frontend/src/pages/profile/ProfilePage.css` - 4+ breakpoints

### Medium Priority Files:
- `frontend/src/components/Slider.css`
- `frontend/src/pages/FavoritesPage.css`
- `frontend/src/pages/EditProfilePage.css`
- `frontend/src/components/CategoryNavigation.css`

---

## Recommendations

1. **Standardize on Mobile-First**: Use `min-width` media queries for better performance
2. **Use Tailwind Breakpoints**: Consider using Tailwind's responsive utilities instead of custom CSS where possible
3. **Create a Breakpoint Mixin/Variable**: Define breakpoints in one place (already done in `appConfig.ts`)
4. **Test on Real Devices**: Use BrowserStack or real devices for testing
5. **Focus on Priority 1 & 2 First**: These cover 95% of your users

---

## Next Steps

1. Start with `VisualArtFormsSlider.css` (currently open) - fix all breakpoints
2. Move to `Header.css` - most critical component
3. Then `AdminPage.css` - complex layout
4. Continue with other high-priority files

Would you like me to start fixing the responsive design for `VisualArtFormsSlider.css` first?



</details>

<a id="source-responsive-implementation-strategy-md"></a>
### Nguồn: RESPONSIVE_IMPLEMENTATION_STRATEGY.md

LỊCH SỬ / CẦN ĐỐI CHIẾU; không coi checkbox cũ là nghiệm thu hiện tại.

SHA256 nguồn trước khi gộp: `C3FA687C33A94402AF5AB909BB1DF2044FFA0D28A10B61CB745DBEAC93FB1BE8`

<details>
<summary>Mở nội dung đầy đủ: RESPONSIVE_IMPLEMENTATION_STRATEGY.md</summary>

# Responsive Implementation Strategy

## Recommended Approach: **Breakpoint-First (Do 768px for ALL pages, then move to next size)**

### ✅ **Why This Approach is Better:**

1. **Consistency Across App**: All pages work at mobile size before moving to other sizes
2. **Easier Testing**: Test entire app at one breakpoint, then move to next
3. **Better User Experience**: Users get consistent mobile experience across all pages
4. **Pattern Reuse**: Solutions you find for one page can be applied to others
5. **Faster Progress**: See visible progress across entire app quickly

### 📋 **Implementation Order:**

#### **Phase 1: Mobile First (768px) - ALL Pages**
Complete 768px responsive design for ALL pages before moving to next breakpoint.

**Pages to Fix (Priority Order):**
1. ✅ `VisualArtFormsSlider.css` (currently open)
2. `Header.css` (most critical - appears on all pages)
3. `HomePage` (main landing page)
4. `ImagePage.css` (image detail view)
5. `ProfilePage.css` (user profiles)
6. `CollectionsPage.css` (collections list)
7. `CollectionDetailPage.css` (collection detail)
8. `FavoritesPage.css` (favorites)
9. `UploadPage.css` (upload page)
10. `EditProfilePage.css` (edit profile)
11. `AdminPage.css` (admin panel)
12. `SignInPage.css` / `SignUpPage.css` (auth pages)
13. Other pages...

**Components to Fix:**
- `UploadModal.css`
- `CategoryNavigation.css`
- `SearchBar.css`
- `Slider.css`
- Other shared components...

#### **Phase 2: Small Mobile (480px) - ALL Pages**
After ALL pages work at 768px, go back and fix 480px for ALL pages.

#### **Phase 3: Tablet Landscape (1024px) - ALL Pages**
Then fix 1024px for ALL pages.

#### **Phase 4: Desktop (1280px) - ALL Pages**
Then fix 1280px for ALL pages.

#### **Phase 5: Other Sizes (640px, 1536px) - ALL Pages**
Finally, fix remaining breakpoints.

---

## Alternative Approach: **Page-First (Complete one page fully, then next)**

### ⚠️ **When to Use This:**
- If you have a deadline for specific pages
- If pages are completely independent
- If different developers work on different pages

### ❌ **Why This is Less Ideal:**
- Harder to maintain consistency
- Users might experience broken pages while others are fixed
- More difficult to test entire app flow
- Solutions might not be reusable

---

## Recommended Workflow

### Step 1: Start with Shared Components (768px)
Fix components that appear on multiple pages first:
- `Header.css` - Appears on ALL pages
- `CategoryNavigation.css` - Appears on most pages
- `SearchBar.css` - Appears on most pages
- `UploadModal.css` - Used across pages

### Step 2: Fix Main Pages (768px)
Then fix main user-facing pages:
- `HomePage` (VisualArtFormsSlider + Grid)
- `ImagePage.css`
- `ProfilePage.css`
- `CollectionsPage.css`

### Step 3: Fix Secondary Pages (768px)
Then fix less critical pages:
- `FavoritesPage.css`
- `UploadPage.css`
- `EditProfilePage.css`
- Auth pages

### Step 4: Fix Admin Pages (768px)
Finally fix admin pages:
- `AdminPage.css`
- Admin modals

### Step 5: Repeat for Next Breakpoint (480px)
Go back to Step 1 and repeat for 480px breakpoint.

---

## Quick Checklist Template

### For Each Page/Component:

**768px Breakpoint:**
- [ ] Layout adapts to mobile
- [ ] Text sizes are readable
- [ ] Touch targets are 44px+ (iOS guideline)
- [ ] Navigation is accessible
- [ ] Images scale properly
- [ ] Forms are usable
- [ ] Modals work on mobile
- [ ] Test on real device

**480px Breakpoint:**
- [ ] Very small phones work
- [ ] Text doesn't overflow
- [ ] Buttons are touchable
- [ ] No horizontal scroll

**1024px Breakpoint:**
- [ ] Tablet landscape works
- [ ] Layout uses space efficiently
- [ ] Sidebars/panels work

**1280px Breakpoint:**
- [ ] Desktop layout optimized
- [ ] Uses available space well

---

## My Recommendation

**Start with 768px for ALL pages first**, because:
1. Mobile traffic is usually 60-70% of users
2. You'll see immediate impact across entire app
3. Easier to maintain consistency
4. Better for testing (test all pages at one size)

**Then move to 480px for ALL pages**, because:
1. Small phones are still 15% of mobile traffic
2. Critical for user experience

**Then 1024px, 1280px, etc.**

---

## Next Steps

Would you like me to:
1. **Start fixing 768px for VisualArtFormsSlider.css** (the file you have open)?
2. **Then move to Header.css** (most critical component)?
3. **Continue through all pages at 768px**?

Or would you prefer to complete ALL breakpoints for VisualArtFormsSlider.css first, then move to next page?



</details>

<a id="source-performance-improvements-md"></a>
### Nguồn: PERFORMANCE_IMPROVEMENTS.md

LỊCH SỬ / CẦN ĐỐI CHIẾU; không coi checkbox cũ là nghiệm thu hiện tại.

SHA256 nguồn trước khi gộp: `35A3CE96B8B726E39EF8E36C6434203F03CE480FFA20FDEFC545D8B4A52AF63D`

<details>
<summary>Mở nội dung đầy đủ: PERFORMANCE_IMPROVEMENTS.md</summary>

# PhotoCloud Performance Improvements

## Summary
This document outlines the performance improvements made to the PhotoCloud codebase, including removal of unused code, elimination of duplicate code, and simplification of complex implementations.

## 1. Consolidated Duplicate Image URL Logic ✅

### Problem
- Multiple components had duplicate logic for getting image URLs with AVIF support:
  - `Slider.tsx` had `getImageUrl()` function
  - `ImagePage.tsx` had `getRegularDisplayUrl()` and `getOriginalDisplayUrl()` functions
  - Similar logic scattered across components

### Solution
- Created shared utility: `frontend/src/utils/imageUrlUtils.ts`
- Consolidated all image URL logic into reusable functions:
  - `getImageUrl()` - Main utility with size and AVIF support
  - `getRegularDisplayUrl()` - For detail views
  - `getOriginalDisplayUrl()` - For full-size images
  - `getThumbnailUrl()` - For previews
- Updated `Slider.tsx` and `ImagePage.tsx` to use shared utilities

### Impact
- **Reduced code duplication**: ~100 lines of duplicate code removed
- **Easier maintenance**: Single source of truth for image URL logic
- **Consistent behavior**: All components use the same URL selection logic

## 2. Optimized Logger Functions ✅

### Problem
- Logger had no-op functions (`debug`, `info`, `group`, `time`, `timeAsync`) that were still being called
- `useWebSocket.ts` had 23 calls to `logger.info()` which are no-ops
- Unnecessary function calls impacting performance

### Solution
- Marked no-op functions with `@deprecated` tags
- Removed all `logger.info()` calls from `useWebSocket.ts` (23 calls removed)
- Optimized convenience loggers (`imageLogger`, `authLogger`, `apiLogger`) to have no-op `debug` and `info` methods

### Impact
- **Reduced function calls**: 23+ unnecessary function calls removed
- **Smaller bundle**: Dead code elimination can remove unused logger code
- **Better performance**: No overhead from no-op function calls

## 3. Fixed Performance Issues ✅

### Problem
- `AdminPage.tsx` had a `useEffect` with no dependencies running on every render
- `imageService.ts` legacy method wasn't using request deduplication

### Solution
- Added proper dependencies to `useEffect` in `AdminPage.tsx`
- Updated `imageService.getImages()` to use deduplicated `get()` function

### Impact
- **Reduced re-renders**: AdminPage no longer runs effect on every render
- **Better request deduplication**: All GET requests now benefit from deduplication

## 4. Code Simplification

### Image URL Utilities
- Replaced complex inline logic with simple utility functions
- Better type safety and consistency
- Easier to test and maintain

## Files Modified

1. **frontend/src/utils/imageUrlUtils.ts** (NEW)
   - Shared image URL utilities

2. **frontend/src/components/Slider.tsx**
   - Removed duplicate `getImageUrl()` function
   - Uses shared `getImageUrl()` and `getThumbnailUrl()` utilities

3. **frontend/src/pages/ImagePage.tsx**
   - Removed duplicate `getRegularDisplayUrl()` and `getOriginalDisplayUrl()` functions
   - Uses shared utilities

4. **frontend/src/utils/logger.ts**
   - Optimized no-op functions
   - Added deprecation tags
   - Optimized convenience loggers

5. **frontend/src/hooks/useWebSocket.ts**
   - Removed 23 `logger.info()` calls (no-ops)
   - Added comments where logging was removed

6. **frontend/src/pages/profile/ProfilePage.tsx**
   - Removed unused `axios` import

7. **frontend/src/pages/admin/AdminPage.tsx**
   - Fixed `useEffect` running on every render (added proper dependencies)
   - Improved performance by preventing unnecessary re-renders

8. **frontend/src/services/imageService.ts**
   - Updated legacy `getImages()` method to use deduplicated `get()` function
   - Better request deduplication for GET requests

## Performance Benefits

1. **Reduced Bundle Size**
   - Removed ~100 lines of duplicate code
   - Eliminated unused logger calls
   - Removed unused imports

2. **Improved Runtime Performance**
   - Fewer function calls (23+ logger calls removed)
   - Shared utilities reduce code execution overhead
   - Fixed unnecessary re-renders in AdminPage
   - Better request deduplication for all GET requests

3. **Better Maintainability**
   - Single source of truth for image URL logic
   - Easier to update and test
   - Consistent API usage patterns

4. **Code Quality**
   - Less duplication
   - More consistent behavior
   - Better type safety
   - Proper React hook dependencies

## Recommendations for Future Improvements

1. **Bundle Analysis**
   - Run `npm run build` and analyze bundle size
   - Consider code splitting for large components
   - Lazy load heavy dependencies

2. **Further Optimizations**
   - Review `useMemo` and `useCallback` usage - some may be unnecessary
   - Check for unused imports (e.g., `axios` in ProfilePage.tsx)
   - Consider memoizing expensive computations

3. **Monitoring**
   - Add performance monitoring to track improvements
   - Monitor bundle size over time
   - Track runtime performance metrics

## Testing

All changes maintain backward compatibility:
- ✅ No breaking changes
- ✅ All existing functionality preserved
- ✅ Type safety maintained
- ✅ No linter errors



</details>

<a id="source-md"></a>
### Nguồn: .md

LỊCH SỬ / CẦN ĐỐI CHIẾU; không coi checkbox cũ là nghiệm thu hiện tại.

SHA256 nguồn trước khi gộp: `EFBC4BAAE04D993DE8F7D57BDD8670A2F411F4BC4D5D5F168FE083E07B2977DD`

<details>
<summary>Mở nội dung đầy đủ: .md</summary>

1. Tổng quan về giao diện PhotoCloud hiện tại
   Điểm đang làm tốt
   Layout theo kiểu Unsplash rất rõ và dễ dùng:
   Header luôn hiển thị.
   Sidebar bên trái cho điều hướng.
   Search bar nằm trung tâm.
   Lưới ảnh là trọng tâm.
   Tốc độ cảm nhận tốt:
   Có lazy-load trang.
   Có skeleton khi load.
   Blur-up image giúp ảnh hiện mượt hơn.
   Không bắt người dùng chờ trắng trang.
   Modal xem ảnh làm tốt:
   Overlay tối phía sau.
   Ảnh lớn ở giữa.
   Có nút Like, Collection, Download.
   Đóng bằng ×, Esc, click ngoài.
   Giữ được context trang chủ khi đóng.
   Admin được tổ chức tốt:
   Có sidebar.
   Có analytics, user, image, collection, booking.
   Calendar booking và quản lý gói chụp đã có cấu trúc.
   Hệ thống booking đang đồng nhất:
   Có trang booking đầy đủ.
   Có modal nhanh.
   Có trang chi tiết booking.
   Có timeline trạng thái.
   Điểm mạnh nhất cần giữ lại

Ảnh lớn
Khoảng trắng rộng
Typography tối giản
Nút đen/trắng rõ ràng
Điều hướng dễ đoán
Đây đúng là phong cách của nền tảng ảnh, không nên phá vỡ.

2. Vấn đề lớn nhất hiện tại
   2.1 Trang chủ đang giống “kho ảnh” hơn “studio chụp ảnh”
   Người xem lần đầu nhìn thấy lưới ảnh, nhưng không hiểu ngay:

PhotoCloud có nhận chụp không?
Chụp những gì?
Giá bao nhiêu?
Đặt lịch ở đâu?
Có uy tín không?
Quy trình booking thế nào?
Hiện tại CTA “Đặt lịch chụp” chỉ nằm ở:

Header desktop.
Menu Contact nổi.
Đây là hai vị trí yếu:

Header desktop có quá nhiều thứ: logo, search, upload, notification, avatar.
Menu Contact kiểu hover gần như không hoạt động tốt trên mobile.
Không có hero section.
Không có giới thiệu dịch vụ trên trang chủ.
Không có social proof.
Không có portfolio theo gói.
Không có pricing preview.
Với một website muốn phát triển booking, đây là thiếu sót lớn nhất.

Giải pháp:

Trang chủ
├── Hero booking
├── Gói chụp nổi bật
├── Portfolio theo dịch vụ
├── Quy trình đặt lịch
├── Đánh giá khách hàng
├── Bảng giá rút gọn
└── CTA đặt lịch lặp lại
Không cần thay lưới ảnh hiện tại. Chỉ cần thêm một lớp “studio” phía trên lưới ảnh.

2.2 Visual hierarchy chưa rõ
Hiện tại nhiều thành phần có độ ưu tiên thị giác ngang nhau:

Search bar.
Category navigation.
Ảnh.
Sidebar icon.
Contact button.
Nút booking.
Người dùng không biết nên nhìn vào đâu trước.

Nên thiết lập thứ tự thị giác:

1. Hero hoặc featured work
2. CTA đặt lịch
3. Lưới ảnh
4. Gói dịch vụ
5. Đánh giá
   Có thể dùng:

Kích thước chữ lớn hơn cho hero.
Card gói chụp có shadow nhẹ.
CTA nút đen đặc, các nút khác outline.
Tăng khoảng cách section.
Giảm số lượng icon mờ nhạt ở sidebar.
2.3 Màu sắc và cảm xúc chưa đủ “nhiếp ảnh cao cấp”
Hiện tại website dùng nhiều:

Trắng.
Xám nhạt.
Đen cơ bản.
Border xám.
Nhìn sạch nhưng hơi lạnh và “giống dashboard”.

PhotoCloud là sản phẩm hình ảnh nên cần nhiều cảm xúc hơn. Không nhất thiết đổi màu chủ đạo, chỉ cần thêm điểm nhấn.

Đề xuất giữ nền sáng, nhưng thêm:

Warm neutral:
#FAF8F4 thay vì #FFFFFF tuyệt đối.
#1B1B19 thay vì #000.
Accent tinh tế:
Vàng đồng cho rating.
Xanh olive cho trạng thái confirmed.
Đỏ gạch cho CTA quan trọng.
Typography có cá tính hơn:
Tiêu đề dùng serif/display cho trang booking/about.
Body giữ sans-serif để dễ đọc.
Ví dụ cấu trúc:

Homepage: hiện đại, tối giản
Booking: ấm, tin cậy, cao cấp
Admin: giữ dashboard chuyên nghiệp
2.4 Mobile chưa được tối ưu cho booking
Modal ảnh hiện tại trên desktop rất ổn, nhưng hệ thống booking trên mobile có nguy cơ:

Modal full-screen nhưng content dài.
Calendar tháng khó bấm.
Bảng admin khó xem.
Form nhiều bước dễ mất context.
Nút Contact dạng hover không phù hợp mobile.
Nên chuẩn hóa mobile theo nguyên tắc:

Trên mobile modal booking nên là bottom sheet 92vh.
Header modal cố định.
Footer nút cố định.
Progress dạng dot thay vì text dài.
Calendar admin trên mobile mặc định mở chế độ Ngày/Tuần, không phải Tháng.
Bảng admin chuyển thành card list trên mobile. 3. Phân tích từng khu vực
3.1 Header
Được:

Luôn hiển thị.
Có logo rõ.
Search dễ thấy.
Có avatar.
Chưa được:

Quá nhiều hành động trên một dòng.
Nút “Đặt lịch chụp” dễ bị chìm giữa Upload, Notification, Avatar.
Trên mobile nút biến mất vào menu.
Không có trạng thái active page.
Không có booking shortcut cho người dùng đã có booking.
Nên làm:

Desktop
[Logo] [Search] [Khám phá] [Gói chụp] [Đặt lịch chụp] [Avatar]
Mobile
[Menu] [Logo] [Search icon] [Đặt lịch icon]
Thêm:

Nút booking dạng pill đen nổi bật.
Badge số booking đang xử lý.
Active state cho route /booking.
Mega menu đơn giản:

Dịch vụ
├── Chân dung
├── Couple
├── Gia đình
├── Mini session
3.2 Trang chủ
Được:

Lưới ảnh ổn định.
Có slider Visual Art Forms.
Có filter.
Có infinite scroll.
Chưa được:

Không có hero.
Không có câu chuyện thương hiệu.
Không dẫn người xem tới booking.
Featured work và ảnh thường trông giống nhau.
Thiếu social proof.
Thiếu pricing.
Cảm giác như đang xem Unsplash, không phải studio Việt Nam.
Nên thêm theo thứ tự:

Hero section

Chụp ảnh theo cách của bạn
Từ chân dung tới gia đình, chúng tôi giúp bạn lưu lại
những khoảnh khắc đáng nhớ.
[Đặt lịch chụp] [Xem gói chụp]
Kèm:

1 ảnh hero lớn bên phải.
Thống kê nhỏ:

500+ buổi chụp · 4.9/5 · Giao ảnh trong 5-7 ngày
Featured packages
Hiển thị 3-4 card gói booking:

Chân dung.
Couple.
Gia đình.
Mini session.
Mỗi card:

Ảnh mẫu.
Tên gói.
Giá từ.
Thời lượng.
Nút chọn gói.
Quy trình 4 bước

01 Chọn gói
02 Chọn ngày
03 Xác nhận lịch
04 Nhận gallery
Dạng horizontal timeline, không cần animation phức tạp.

Testimonial
Lấy từ hệ thống review booking đã có. Đây là dữ liệu thật, không cần tạo fake.

Hiển thị:

Avatar.
Tên.
Rating.
Gói đã chụp.
Bình luận ngắn.
CTA cuối trang

Sẵn sàng cho buổi chụp tiếp theo?
[Đặt lịch ngay]
3.3 Trang booking
Được:

Chia 4 bước rõ.
Có summary.
Có giá tham khảo.
Có validation.
Có success state.
Chưa được:

Thiếu ảnh minh họa.
Form hơi giống form admin.
Summary quá khô.
Không có trust signal.
Không có FAQ.
Không có chính sách hủy ngay trong form.
Không preview gói bằng ảnh thật.
Nên làm:

Bên trái form, bên phải summary nên thêm:

Gói: Chân dung cá nhân
[Ảnh mẫu gói]
Giá tham khảo: 1.500.000đ
Bao gồm:
✓ 60 phút chụp
✓ 20 ảnh chỉnh màu
✓ Giao ảnh trong 7 ngày
Chính sách:
• Chưa cần thanh toán
• Phản hồi trong 24h
• Được đổi lịch 1 lần
Thêm accordion FAQ:

Có cần cọc không?
Có được đổi lịch không?
Bao lâu nhận ảnh?
Có chỉnh thêm ảnh không?
Có chụp ngoại tỉnh không?
3.4 Booking Modal
Được:

Đúng phong cách modal ảnh.
Có progress.
Có back/next.
Có nút “Đặt lịch đầy đủ”.
Chưa được:

Bước chọn gói chưa có ảnh.
Bước xác nhận hơi nhiều chữ.
Trên mobile progress chữ dài dễ tràn.
Thiếu cảm giác “đặt lịch thành công”.
Nên làm:

Thêm thumbnail vào mỗi gói trong modal.
Progress mobile chuyển thành:

● ○ ○ ○ Bước 1/4
Success state thêm confetti nhẹ hoặc check animation.
Thêm nút:

[Thêm vào lịch] [Xem chi tiết booking]
3.5 Profile và My Bookings
Được:

Có tab Lịch đặt riêng.
Card booking rõ.
Có link tới chi tiết.
Chưa được:

Card hơi phẳng.
Không phân biệt booking sắp diễn ra và đã xong.
Không có countdown.
Không có nút hành động nhanh.
Nên làm:

Card booking nên chia:

Sắp tới
[Countdown: còn 3 ngày]
[Xem chi tiết] [Yêu cầu đổi lịch]
Đang xử lý
[Chờ xác nhận · phản hồi trong 24h]
Hoàn thành
[Đánh giá] [Xem gallery]
Thêm filter:

Tất cả / Sắp tới / Đang xử lý / Hoàn thành / Đã hủy
3.6 Admin
Được:

Có tab rõ.
Có calendar.
Có quản lý gói.
Có review/policy.
Chưa được:

Quá nhiều tab ngang dễ tràn.
Calendar tháng chưa đủ thông tin khi hover.
Bảng booking nhiều chữ.
Thiếu dashboard tổng quan booking.
Thiếu màu trạng thái nhất quán.
Nên làm:

Thêm Booking Dashboard phía trên danh sách:

Hôm nay: 3 yêu cầu mới
Tuần này: 8 lịch confirmed
Chờ xử lý: 5
Sắp diễn ra: 4
Tỷ lệ xác nhận: 72%
Calendar nên có tooltip:

14:00 - Chân dung - Nguyễn An - Confirmed 4. Có nên thêm animation không?
Nên, nhưng phải đúng loại
PhotoCloud không nên dùng animation lòe loẹt. Nên dùng motion tinh tế kiểu Unsplash / Apple / Airbnb.

Nên thêm ngay

1. Reveal on scroll

Dùng cho:

Hero.
Package card.
Testimonial.
Gallery section.
Hiệu ứng:

opacity 0 → 1
translateY 16px → 0
duration 500ms
ease-out
Không nên dùng cho lưới ảnh chính vì sẽ làm lag.

2. Hover ảnh

Hiện tại ảnh hơi tĩnh. Nên thêm:

Zoom nhẹ scale(1.03).
Overlay gradient dưới.
Hiện tên tác giả + nút like khi hover.
Transition 250ms.
Đây là animation có ROI cao nhất cho website ảnh.

3. Modal transition

Booking modal hiện mở hơi đột ngột. Nên thêm:

Backdrop fade 200ms.
Modal translateY + scale nhẹ.
Khi đóng thì reverse. 4. Button micro-interaction

Hover nút booking: translateY(-1px) + shadow.
Active: scale(0.98).
Loading: spinner thay vì chỉ text “Đang gửi”. 5. Skeleton shimmer

Đã có skeleton nhưng có thể làm shimmer mượt hơn.

6. Page transition nhẹ

Không cần chuyển trang kiểu SPA cầu kỳ, chỉ cần:

Fade content 150ms.
Giữ header/sidebar cố định.
Không nên thêm
Parallax nặng.
Hero slider tự chạy.
Confetti khắp nơi.
Cursor custom.
Animation chữ từng ký tự cho toàn trang.
Lenis smooth scroll nếu chưa tối ưu mobile.
Masonry layout animation quá nhiều gây giật.
Lý do: website ảnh đã nặng tài nguyên, animation sai chỗ sẽ làm giảm trải nghiệm.

5. Chức năng nên thêm để thu hút hơn
   Không cần thêm nhiều tính năng lớn. Chỉ cần 6 tính năng đúng chỗ.

5.1 Portfolio theo gói chụp
Hiện booking và ảnh đang tách rời.

Nên cho mỗi gói booking liên kết tới:

6-8 ảnh mẫu.
1 collection mẫu.
1 review thật.
Ví dụ:

Gói Couple
[Ảnh 1] [Ảnh 2] [Ảnh 3]
Xem full collection →
Đánh giá 4.9 từ 32 khách →
Đây là tính năng tăng chuyển đổi booking mạnh nhất.

5.2 Wishlist / Save package
Cho phép người dùng lưu gói chụp yêu thích mà chưa cần đặt ngay.

♡ Lưu gói Couple
Sau đó hiển thị trong profile:

Gói đã lưu
Rất nhẹ nhưng tăng retention.

5.3 So sánh gói
Thêm bảng so sánh:

            Chân dung  Couple  Gia đình

Thời lượng 60 90 120
Ảnh 20 35 50
Người 1 2 6
Makeup - + +
Giá 1.5tr 2.2tr 3.2tr
Người dùng Việt Nam rất thích so sánh trước khi đặt.

5.4 Availability preview công khai
Hiện lịch rảnh chỉ admin thấy.

Nên public một dạng đơn giản:

Tuần này còn 4 slot
Ngày 25/10: còn trống buổi sáng
Ngày 26/10: đã kín
Không cần hiện chi tiết booking, chỉ cần tạo cảm giác urgency.

5.5 Referral / Voucher khách cũ
Rất phù hợp vì bạn chưa có nhiều khách:

Khách cũ giới thiệu khách mới được giảm 10%.
Booking lần 2 được tặng thêm 5 ảnh.
Mini session nhóm 3 người giảm giá.
Không cần hệ thống voucher phức tạp ngay, chỉ cần mã giảm giá thủ công trong admin.

5.6 Blog / Concept gợi ý
Thêm mục nhẹ:

Concept chụp mùa thu Hà Nội
5 địa điểm chụp couple đẹp
Cách chuẩn bị trang phục chụp gia đình
Mỗi bài link tới gói booking tương ứng. Đây là cách SEO rẻ và hiệu quả nhất cho studio ảnh.

6. Đề xuất ưu tiên theo tác động
   Nhóm 1 — Làm ngay, tác động lớn, chi phí thấp
   Thêm hero booking lên trang chủ.
   Thêm 3-4 package card có ảnh thật.
   Thêm CTA đặt lịch lặp lại cuối trang.
   Thêm hover zoom + overlay cho lưới ảnh.
   Thêm reveal on scroll cho homepage.
   Thêm modal transition mượt hơn.
   Thêm FAQ và trust signal vào trang booking.
   Thêm thumbnail gói vào Booking Modal.
   Sửa menu Contact trên mobile từ hover sang click/bottom sheet.
   Thêm countdown booking sắp diễn ra trong profile.
   Nhóm 2 — Tác động trung bình
   Portfolio theo gói.
   Bảng so sánh gói.
   Testimonial từ review thật.
   Availability preview.
   Booking dashboard cho admin.
   Wishlist gói chụp.
   Cải thiện calendar tooltip.
   Chuẩn hóa màu trạng thái booking.
   Nhóm 3 — Dài hạn
   Blog concept.
   Referral.
   Gói combo.
   Multi-photographer.
   Thanh toán.
   Google Calendar sync.
   PWA push notification.
   AI gợi ý concept từ ảnh đã thích.
7. Kết luận
   Giao diện hiện tại đúng về cấu trúc, sạch về layout, tốt về kỹ thuật, nhưng chưa đủ cảm xúc và chưa bán được dịch vụ.

Vấn đề không phải animation hay màu sắc, mà là:

Người xem thấy ảnh đẹp nhưng không biết phải làm gì tiếp theo.

Nếu chỉ được làm 3 việc để website bắt mắt và thu hút hơn ngay lập tức, mình đề xuất:

Thêm hero + package + CTA booking lên trang chủ.
Thêm hover ảnh và reveal animation nhẹ.
Biến trang booking từ form khô thành trang dịch vụ có ảnh, review, FAQ và trust signal.
Sau 3 việc này, website sẽ chuyển từ cảm giác “xem ảnh” sang cảm giác “đặt một buổi chụp ảnh”, mà vẫn giữ được phong cách tối giản hiện tại.


</details>


### 15/10/2026 — Bỏ editor chỉnh pixel
Bỏ tab Chỉnh ảnh và editor canvas cùng API replace riêng theo yêu cầu. Giữ sửa tên/mô tả/tag/EXIF và upload ảnh mới. Inventory ghi nhận PHO-01/21/22 chưa đạt, PHO-10 còn chậm, PHO-03 F5 đã đạt; PHO-18/19 không còn áp dụng.


### 16/10/2026 — Chi tiết ảnh: tải lỗi và phản hồi Lưu
Bổ sung trạng thái offline/hủy request chi tiết, timeout 15 giây, lỗi payload thiếu ảnh; vùng ảnh lớn có timeout/offline và retry giữ URL. Nút Lưu giữ tim phản ánh optimistic state trong lúc chờ, thêm aria-pressed, bỏ sự kiện đồng bộ bị phát trùng. PHO-01 vẫn mở vì đo fixture chưa tái hiện lag thật. Không tự thay dấu nghiệm thu, responsive để cuối.


### 16/10/2026 — Quy tắc bảo trì và refactor Chi tiết ảnh
Theo yêu cầu, mọi trang được rà từ nay cần đơn giản hóa logic chứ không chỉ tách file; quy tắc lưu tại AGENTS.md. Trang ảnh bỏ cache/state thống kê trùng, dùng một store cho API/socket/download và biểu đồ; tách hook thao tác và thống kê, gộp nhánh dữ liệu từ lưới. Controller còn 665 dòng. Build, lint và kiểm tra hồi quy qua; toàn dự án vẫn còn lỗi TypeScript ngoài phạm vi. Giữ nghiệm thu chức năng và responsive để cuối.


### 16/10/2026 — Màu trang Chi tiết ảnh
Đồng bộ nền ảnh, thanh thao tác và ảnh liên quan với token kem/nâu PhotoCloud. Bỏ màu inline và CSS dark mode ghi đè trùng; gom palette cho modal/trang riêng ở ImagePageTheme.css. Icon kế thừa màu chữ. Build/lint/hồi quy fixture sáng-tối qua; checklist màu PHO-C01–C04 chờ người dùng, giữ nghiệm thu chức năng cũ và responsive để cuối.


### 16/10/2026 — Header sau khi cuộn trang ảnh
Sửa useHeaderSurface: scrollY=0 luôn về heading, tránh hysteresis âm khi boundary=0 giữ canvas vĩnh viễn. Giữ cơ chế hero/admin, thêm kiểm tra hồi quy hook và browser sáng/tối. PHO-H01 chờ người dùng xác nhận.
