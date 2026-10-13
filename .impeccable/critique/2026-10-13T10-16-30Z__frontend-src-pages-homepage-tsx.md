---
target: Trang chủ PhotoCloud
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\Fenn\\Desktop\\PhotoCloud\\frontend\\src\\pages\\HomePage.tsx"
target_fingerprint: "sha256:ce6bcc114ed233aa6599565226ddf6f92e0363529648ed2c5bea5c4e2037d289"
target_path: "C:\\Users\\Fenn\\Desktop\\PhotoCloud\\frontend\\src\\pages\\HomePage.tsx"
timestamp: 2026-10-13T10-16-30Z
slug: frontend-src-pages-homepage-tsx
---
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
