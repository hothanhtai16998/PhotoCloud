# PhotoCloud — Tiến độ thiết kế lại homepage và nhân vật hướng dẫn

Cập nhật: 28/10/2026.

Tài liệu tổng hợp nội dung đã bàn trong chat, giúp theo dõi phần đã thống nhất và phần còn phải thực hiện. Đây là kế hoạch chi tiết bổ trợ, không thay thế trạng thái nghiệm thu trong [PAGE_INVENTORY_AND_ANALYSIS.md](PAGE_INVENTORY_AND_ANALYSIS.md). Không sao chép hoặc tự đổi các dấu nghiệm thu ở inventory.

## 1. Cách đọc trạng thái

**Tiến độ hiện tại: khoảng 60–65% khối lượng dự kiến — đã triển khai bốn chương khám phá tương tác.** Người dùng đã xác nhận di chuyển theo cuộn và hết lặp hình; chưa nghiệm thu toàn bộ homepage. Tỷ lệ là ước lượng theo phạm vi, không phải tỷ lệ nghiệm thu. Mỗi lần làm tiếp khoảng 20–25% hoặc điều chỉnh theo độ dài phần việc, rồi tóm tắt để người dùng kiểm tra.

| Đợt | Phạm vi | Trạng thái |
|---|---|---|
| 1 — khoảng 20% | Tạo hình và nền tảng nhân vật | Đã duyệt concept Paper; đã tích hợp sáu tư thế, chờ duyệt trên website |
| 2 — khoảng 25% | Cấu trúc homepage, khám phá ảnh/chi tiết/bộ sưu tập và lời dẫn | Đã triển khai bốn chương tương tác, thông tin ảnh thật và đường đi; chờ kiểm |
| 3 — khoảng 25% | Dịch vụ/quy trình/FAQ, tương tác theo nội dung, đạo cụ tiếp theo | Chưa làm |
| 4 — khoảng 20% | Nối cảnh/lấy cất đồ, trạng thái lỗi, accessibility và hồi quy | Chưa làm |
| Vòng cuối — khoảng 10% | Responsive và nghiệm thu riêng sau chức năng | Chưa làm |

### Kết quả đợt 1 — 27/10/2026

- Đã thay robot máy ảnh có chân bằng model procedural mới: thân tròn, đầu lớn, mặt bo góc màu đen, mắt xanh dịu, tay có khuỷu và không chân. Đây là bản dựng mới trong source, không phải model Eilik gốc.
- Tách `createGuideModel.ts` khỏi `createPhotographer.ts`; giữ giao diện controller để bot trên homepage tiếp tục theo các cảnh hiện có.
- Có máy ảnh riêng, dây đeo, album mở hai trang và lịch minh họa. Chưa có thao tác lấy/cất đồ, lật trang, ảnh thật trong album, túi hoặc bộ đạo cụ hoàn chỉnh.
- Có trang duyệt `frontend/guide-preview.html`, chạy bằng Vite tại `/guide-preview.html`: ba tư thế chào/cầm máy ảnh/mở album, bật tắt chuyển động và tôn trọng reduced-motion. Trang duyệt phục vụ local, không phải route production đã đóng gói.
- Đã sửa lỗi tái sử dụng WebGL context đã dispose khi bật/tắt chuyển động trong trang duyệt bằng cách tạo canvas mới.
- Build PASS; ESLint ba module nhân vật/preview 0 error và 0 warning; typecheck toàn dự án còn lỗi ngoài phạm vi, không diagnostic ở ba module này. Detector preview trả `[]`.
- Edge headless local: ba tư thế/nút chuyển động/reduced-motion không pageerror; hồi quy cảnh/docking/modal/hide-reopen/route cleanup PASS; journey fixture 1705 sáng, 390 tối/reduce và 1440 không WebGL PASS. Dữ liệu giả lập, không ghi nghiệp vụ thật. Responsive/thiết bị thật chưa nghiệm thu.
- Ảnh duyệt: `frontend/qa-policy-checkbox/guide-phase1-review.png`; log: `home-bot-phase1-build.txt`, `home-bot-phase1-types-after.txt`, `home-bot-phase1-scroll-verified.txt`, `home-bot-phase1-journey-verified.txt` trong cùng thư mục QA. Artifact QA có thể bị Git ignore.
- Chờ người dùng kiểm: hình dáng đầu/thân, biểu cảm, vị trí tay khi cầm máy ảnh và album, cảm giác chuyển động. Chưa đánh dấu nghiệm thu các ô bên dưới.

- `[x]` trong mục **quyết định**: người dùng đã đồng ý định hướng; không có nghĩa đã viết code hay nghiệm thu chức năng.
- `[ ]` trong checklist thực hiện: chưa có bằng chứng hoàn thành theo thiết kế mới trong cuộc trao đổi này.
- **Có nền tảng**: source đã có một phần liên quan, còn phải kiểm tra và điều chỉnh theo kế hoạch mới.
- **Đề xuất/chờ duyệt**: phương án đã phân tích nhưng chưa được người dùng chốt chi tiết.
- Kiểm thử tự động, duyệt hình ảnh và nghiệm thu của người dùng là các bước riêng. Responsive nghiệm thu ở vòng cuối.

## 2. Những quyết định đã thống nhất

- [x] Mục đích homepage: giúp khách biết PhotoCloud có gì, đang xem phần nào và có thể làm gì tiếp theo.
- [x] Giữ hai lối đi: khám phá ảnh/nội dung và tìm hiểu dịch vụ/đặt lịch. Không biến tất cả nội dung thành một phễu đặt lịch.
- [x] Người dùng cho phép sắp xếp, thêm, bỏ và viết lại nội dung homepage; không bắt buộc giữ cấu trúc hiện tại.
- [x] Giữ đúng chức năng website và các hành vi đã nghiệm thu khi thay cách trình bày.
- [x] Lấy cách dẫn chuyện của Sebastien Graf làm định hướng: giới thiệu → nội dung/trải nghiệm cụ thể → lối đi tiếp.
- [x] Có một nhân vật hướng dẫn xuyên suốt, phản hồi nội dung và thao tác của khách.
- [x] Ngày28/10 người dùng duyệt concept02 / Paper: người nhiếp ảnh cắt giấy, tóc tối, áo graphite, áo trong kem, túi olive và sneaker. Thay thế lựa chọn Eilik trước đó; các phân tích robot bên dưới chỉ còn là lịch sử.
- [x] Bộ đạo cụ nhiếp ảnh đã được người dùng đánh giá phù hợp về hướng tổng thể.
- [x] Nội dung nghiệp vụ phải có nguồn thật hoặc ghi rõ nội dung mẫu; không tự tạo giá, đánh giá, danh tính hay cam kết dịch vụ.

**Chưa chốt:** hình dáng model PhotoCloud cuối cùng, tỷ lệ chính xác, vật liệu, chuyển động, lời dẫn, cấu trúc cảnh cuối cùng và cách cung cấp asset. Chọn mẫu Eilik không đồng nghĩa đã có model/rig/animation hoặc quyền sử dụng asset gốc.

## 3. Nền tảng đã có và giới hạn bằng chứng

Qua các lần đọc source trong chat:

| Hạng mục | Hiện trạng đã thấy | Việc còn lại |
|---|---|---|
| Nhân vật 3D | `createPhotographer.ts` dựng robot máy ảnh procedural bằng Three.js | Thay bằng tạo hình mới đã duyệt |
| Hành động | Có wave, point, photo, album, listen, calendar | Thiết kế lại tư thế, chuyển động và thao tác đạo cụ |
| Dẫn theo nội dung | `HomeTourGuide.tsx` chọn cảnh theo phần trang và phản hồi một số thao tác | Mở rộng theo storyboard mới, tránh lời dẫn lặp và phản hồi sai đối tượng |
| Hành trình | `HomeJourney.tsx` có bốn chương | Thiết kế lại quanh chức năng và điểm đến của website |
| Chọn cảm hứng | Đổi mô tả theo lựa chọn | Chỉ giữ nếu có kết quả hữu ích và dữ liệu phù hợp |
| Gallery hành trình | Lấy hai ảnh đầu từ slider | Thay bằng nội dung tuyển chọn đúng mục đích |
| Câu chuyện buổi chụp | Ba bước minh họa bằng chữ | Quyết định giữ/rút gọn/thay theo tư liệu thật |
| Chức năng hỗ trợ | Source có xử lý giảm chuyển động, fallback, ẩn/mở và vùng đặt bot | Kiểm hồi quy sau khi thay thiết kế |

Các ghi chép kiểm thử cũ nằm trong inventory. File này không xác nhận lại kết quả đó cho thiết kế mới. Trong yêu cầu tạo tài liệu này chỉ thêm file Markdown, không triển khai giao diện hoặc chạy kiểm thử chức năng.

## 4. Tạo hình nhân vật PhotoCloud

### Hướng thiết kế đề xuất từ mẫu đã chọn

| Bộ phận | Đề xuất | Trạng thái |
|---|---|---|
| Đầu | Khoảng 40–45% chiều cao, không tính đế | Ước lượng thiết kế, chờ duyệt |
| Mặt | Màn hình đen lớn, mắt là nguồn biểu cảm chính | Chờ bản vẽ/model |
| Thân | Tròn, gọn, đủ chỗ cho dây đeo máy ảnh | Chờ bản vẽ/model |
| Tay | Dài hơn mẫu một chút, với tới giữa ngực; khuỷu kín | Cần thử cùng đạo cụ |
| Bàn tay | Bo tròn, có ngón cái và phần ngón liền khối | Cần thử cầm/chỉ/lật trang |
| Di chuyển | Không chân; xoay, nghiêng, nhích hoặc lơ lửng nhẹ | Chờ thử chuyển động |
| Đế | Chỉ làm điểm nghỉ ở một số cảnh | Chưa chốt |
| Nhận diện | Thiết kế riêng cho PhotoCloud, dựa trên tinh thần mẫu | Chưa thực hiện |

### Checklist tạo hình

- [ ] Xác định nguồn tạo/cung cấp model và điều kiện sử dụng asset.
- [ ] Làm bản mặt trước, nghiêng và góc 3/4.
- [ ] Duyệt tỷ lệ đầu/thân/tay, khuôn mặt, màu và vật liệu.
- [ ] Kiểm khả năng đọc mắt và dáng khi bot hiển thị nhỏ.
- [ ] Dựng thử ba cảnh: chào → cầm máy ảnh → mở album.
- [ ] Người dùng duyệt tạo hình và ba cảnh thử trước khi làm toàn bộ animation.
- [ ] Hoàn thiện model, rig, vật liệu và phương án fallback phù hợp website.

## 5. Bộ đạo cụ nhiếp ảnh

Bộ đạo cụ được đồng ý về hướng tổng thể; từng asset và animation chưa hoàn thành theo thiết kế mới. Mỗi món cần thống nhất tỷ lệ, vật liệu, điểm cầm, vị trí cất và cách chuyển trạng thái.

| Đạo cụ | Mục đích | Điều cần giải quyết | Hoàn thành |
|---|---|---|---|
| Máy ảnh + dây đeo | Nhận diện, ngắm, lấy nét, chụp | Hai điểm cầm; nâng không che hết mặt | [ ] |
| Túi máy ảnh | Cất/lấy đồ, nối cảnh | Không va tay hoặc xuyên thân | [ ] |
| Khung ngắm | Giải thích bố cục, hướng chú ý | Đọc rõ khi bot nhỏ | [ ] |
| Tấm ảnh rời | Giới thiệu ảnh, chỉ chi tiết | Một tay cầm, một tay chỉ | [ ] |
| Album | Bộ sưu tập, câu chuyện ảnh | Mở/lật/khép; ảnh đúng nội dung | [ ] |
| Sổ lịch + bút | Quy trình và đặt lịch | Không thể hiện xác nhận giả | [ ] |
| Tấm hắt sáng — bổ sung | Minh họa ánh sáng khi có nội dung phù hợp | Kích thước nhỏ hoặc có giá đỡ | [ ] |
| Chân máy — bổ sung | Cảnh hậu trường | Có vị trí đặt, không cần mang theo mọi lúc | [ ] |

- [ ] Thử album và động tác viết với bàn nhỏ nếu tay ngắn gây gượng.
- [ ] Làm chuyển động lấy/cất đạo cụ, không chỉ tư thế cuối.
- [ ] Kiểm va chạm, xuyên vật thể, che mặt và che nội dung.

Chuỗi minh họa đã đề xuất: máy ảnh về dây đeo → mở túi → lấy ảnh → cất ảnh → lấy album → mở/khép album → lấy lịch. Đây chưa phải storyboard cuối.

## 6. Storyboard homepage đề xuất

Thứ tự dưới đây là phương án phân tích đã được người dùng đồng ý hướng tổng thể, chưa phải bố cục và nội dung cuối cùng.

| Phần | Khách cần hiểu/làm được gì | Vai trò nhân vật và đạo cụ | Thực hiện |
|---|---|---|---|
| 1. Mở đầu | Nhận diện PhotoCloud; đi thẳng đến khám phá ảnh hoặc dịch vụ | Chào ngắn, hướng về hai lối đi; máy ảnh đeo sẵn | [ ] |
| 2. Khám phá ảnh | Xem ảnh thật, chọn danh mục, mở chi tiết, đến trang khám phá | Giới thiệu gallery, nhìn/chỉ đúng ảnh; khung ngắm | [ ] |
| 3. Đi sâu từ một ảnh | Hiểu thông tin ảnh, tác giả và đường khám phá tiếp theo | Cầm ảnh, chỉ chi tiết; nút mở trang thật | [ ] |
| 4. Bộ sưu tập | Hiểu cách xem nhóm ảnh theo chủ đề và khác biệt với danh mục | Mở album có nội dung phù hợp | [ ] |
| 5. Chuyển sang dịch vụ | Biết cách tìm gói hoặc trao đổi ý tưởng riêng | Cất album, lấy ảnh tham khảo/sổ ý tưởng | [ ] |
| 6. Gói chụp và quy trình | Hiểu dữ liệu gói, bước gửi yêu cầu và xác nhận lịch | Chỉ đúng gói; lịch và bút; lùi khỏi form khi mở | [ ] |
| 7. FAQ và kết thúc | Tìm lời giải đáp; chọn tiếp khám phá, bộ sưu tập hoặc dịch vụ | Lắng nghe, đóng sổ, chỉ dẫn điểm đến | [ ] |

### Nội dung cần chuẩn bị

- [ ] Kiểm tra chức năng và quyền thật trước khi giới thiệu mỗi thao tác.
- [ ] Tuyển ảnh và bộ sưu tập phù hợp từng cảnh; kiểm nguồn và quyền dùng.
- [ ] Viết tiêu đề, mô tả và CTA có đích đến cụ thể.
- [ ] Viết lời dẫn ngắn, bổ sung ngữ cảnh thay vì đọc lại tiêu đề.
- [ ] Làm rõ sự khác nhau giữa danh mục, ảnh, bộ sưu tập và tác giả.
- [ ] Quyết định bỏ hay mở rộng phần chọn cảm hứng dựa trên kết quả hữu ích.
- [ ] Quyết định giữ/rút gọn/thay câu chuyện buổi chụp theo tư liệu thật.
- [ ] Đối chiếu gói, quy trình, FAQ và chính sách với dữ liệu đã xác nhận.
- [ ] Nội dung chưa xác minh mang nhãn “nội dung ảo, sẽ được thay thế sau”; số liệu chưa có để rỗng/null và ẩn phù hợp.
- [ ] Duyệt storyboard và nội dung trước khi triển khai đầy đủ.

## 7. Hệ thống tương tác và chuyển động

- [ ] Một nhân vật xuyên suốt, trạng thái bám đúng phần đang xem.
- [ ] Mỗi cảnh có vị trí riêng, không che ảnh/chữ/card/điều khiển.
- [ ] Nhìn, chỉ và phản hồi đúng đối tượng vừa tương tác.
- [ ] Lời dẫn gồm giới thiệu, phản hồi thao tác và gợi ý bước tiếp; tránh xuất hiện liên tục.
- [ ] Cuộn nhanh bỏ qua cảnh vẫn vào đúng tư thế, không xếp hàng animation cũ.
- [ ] Cuộn ngược trở về cảnh và đạo cụ hợp lý.
- [ ] Phân biệt nghỉ, di chuyển, diễn hành động và thao tác đạo cụ.
- [ ] Không dùng bước chân cho tạo hình không chân.
- [ ] Hoàn thiện biểu cảm: chào, tò mò, tập trung, giới thiệu, lắng nghe, phản hồi kết quả.
- [ ] Không tự mở tính năng hoặc gửi yêu cầu thay khách.
- [ ] Form/modal mở thì bot nhường vùng thao tác; đóng lại phục hồi đúng cảnh.
- [ ] Dùng được bằng click, bàn phím và touch khi liên quan; hover không là cách duy nhất.
- [ ] Có ẩn/mở, reduced-motion, tải lỗi/không WebGL và nội dung độc lập với bot.
- [ ] Dọn renderer, asset, requestAnimationFrame, timer, observer và listener khi rời trang.

## 8. Triển khai, kiểm tra và nghiệm thu

### Phạm vi

- [ ] Triển khai trong khu vực user/homepage; không sửa admin hoặc inventory admin.
- [ ] Kiểm phụ thuộc trước khi chạm code chung; thay đổi chung có admin dùng phải hỏi theo AGENTS.md.
- [ ] Tái sử dụng phần phù hợp, xóa phần cũ không còn caller và giữ hành vi đã duyệt.
- [ ] Giữ đúng URL, Back/Forward, F5, modal/trang ảnh và điều hướng.

### Kiểm tra chức năng

- [ ] Khám phá → danh mục → ảnh → tác giả/nội dung liên quan đúng đích.
- [ ] Bộ sưu tập mở đúng nội dung.
- [ ] Gói khớp dữ liệu API; lỗi/rỗng/tải có phản hồi phù hợp.
- [ ] CTA mở đúng đặt lịch/báo giá/liên hệ; không gửi trùng hoặc báo thành công trước bằng chứng.
- [ ] Bot phản hồi đúng cảnh, đối tượng và trạng thái; không can thiệp việc nhập form.
- [ ] Ẩn bot hoặc lỗi 3D vẫn dùng được nội dung và chức năng chính.
- [ ] Focus, tên truy cập, bàn phím, tương phản sáng/tối và reduced-motion phù hợp.
- [ ] Chạy build, lint, typecheck và kiểm hồi quy phù hợp; báo riêng lỗi sẵn có ngoài phạm vi.
- [ ] Kiểm giao diện chạy thực theo vòng xác minh hữu hạn của Impeccable.
- [ ] Nếu kết luận hiệu năng, có đo trước/sau và ghi môi trường, dữ liệu, điều kiện.
- [ ] Cập nhật checklist dễ thao tác và bằng chứng trong inventory user; giữ dấu nghiệm thu của người dùng.
- [ ] Người dùng kiểm và xác nhận chức năng.

### Responsive — vòng riêng cuối cùng

- [ ] Kiểm mobile/tablet/desktop, nội dung dài, zoom, scroll, focus và dialog.
- [ ] Kiểm bot/đạo cụ không che nội dung hoặc bottom navigation.
- [ ] Kiểm touch, vùng bấm, hủy thao tác và bàn phím ảo khi liên quan.
- [ ] Ghi rõ trình duyệt, viewport, giả lập hay thiết bị thật và phần chưa kiểm.
- [ ] Người dùng nghiệm thu responsive riêng; không tự đánh dấu đạt trong vòng chức năng.

## 9. Thứ tự thực hiện tiếp theo

1. Chốt tạo hình PhotoCloud từ hướng Eilik bằng bản nhiều góc và ba cảnh thử.
2. Duyệt storyboard, nội dung, điểm đến và dữ liệu cho từng phần homepage.
3. Hoàn thiện rig, đạo cụ, biểu cảm và chuyển cảnh.
4. Triển khai từng phần, tích hợp nhân vật với thao tác thật.
5. Kiểm hồi quy, cập nhật inventory và chờ người dùng nghiệm thu chức năng.
6. Làm vòng responsive riêng theo quy ước dự án.

## 10. Nguồn tham khảo

- Cách kể chuyện: [Sebastien Graf](https://www.sebg.ch/).
- Hướng tạo hình đã chọn: Eilik của Energize Lab; ảnh tham khảo người dùng chọn trong chat ngày 27/10/2026. Không coi ảnh này là model có thể tích hợp trực tiếp.
- Quy tắc repository: [AGENTS.md](AGENTS.md).
- Nghiệm thu chính thức: [PAGE_INVENTORY_AND_ANALYSIS.md](PAGE_INVENTORY_AND_ANALYSIS.md).

## 11. Nhật ký cập nhật

### Đợt tiếp theo: bốn chương khám phá có kết quả thật — 28/10/2026

- Người dùng yêu cầu làm tiếp20–25%; tổng khối lượng ước lượng60–65%. Giữ renderer một pose và đường di chuyển đã được xác nhận ổn.
- HomeJourney thay câu chuyện buổi chụp/lời trích dẫn mẫu bằng bốn chương: chọn lối khám phá → chọn ảnh/xem thông tin → tìm hiểu bộ sưu tập → dịch vụ chụp. Không biến lời biên tập thành cam kết dịch vụ.
- Ba lựa chọn đầu chương đổi mô tả và đích đến thật; gallery cho chọn một trong hai ảnh từ slider hiện có, cập nhật tên/chủ đề/tác giả khi có/kích thước và link `/photos/<slug>`. Không request mới hoặc nhân bản cache. Ảnh lỗi có thông báo, vẫn chọn/xem thông tin và mở trang thật được; dữ liệu rỗng có lối đến Khám phá.
- Chương bộ sưu tập có ba bước chọn được, giải thích thay tại chỗ và link `/collections`. Không nhân bản API/list bộ sưu tập vì phần HeroBooking đã tải/hiển thị ở phía trên. Dịch vụ giữ CTA báo giá/gói và thêm lối tiếp tục xem ảnh; giải thích gửi yêu cầu chưa phải lịch được xác nhận.
- Sidebar có hướng dẫn và điều hướng từng chương; trạng thái chương theo vị trí DOM thực thay vì chia đều phần trăm chiều dài. Nhân vật dùng caption riêng của thao tác, ảnh/photo, bộ sưu tập/album và dịch vụ/calendar. Dọn DraftNotice/copy mẫu và CSS riêng cho cấu trúc cũ trong HomeJourney.
- Build/focused lint PASS; typecheck toàn dự án còn lỗi ngoài phạm vi, không diagnostic HomeJourney/HomeTourGuide; detector[]. Edge fixture sáng1705/tối390-reduce/1440khôngWebGL PASS chọn mục đích, chọn ảnh/thông tin/link đúngID, bước bộ sưu tập, chương hiện tại, góiAPI và booking/no writes. Motion136frame/4ranhgiới/no ghost + hồi quy modal/hide-reopen/route/compact PASS. Log home-discovery-{build,browser-confirm,motion,types}.txt; ảnh home-discovery-*.png trong frontend/qa-policy-checkbox.
- Chờ người dùng duyệt nội dung, bố cục và thao tác đợt này. Chưa làm rig từng bộ phận/lật album/lấy cất đồ, hoàn thiện toàn bộ hero/dịch vụ/FAQ và vòng responsive/thiết bị thật. Chưa kiểm dữ liệu production hoặc hiệu năng production.

### Sửa lặp hình khi chuyển tư thế — 28/10/2026

- Người dùng xác nhận di chuyển theo cuộn đã hoạt động, nhưng ảnh có tay/lịch của hai tư thế chồng lên nhau. Crossfade hai silhouette khác nhau là nguyên nhân: giữ pose cũ opaque khiến đạo cụ/tay cũ lộ qua phần trong suốt của pose mới.
- Bỏ blend hai ảnh: mỗi lần đổi tư thế clear và vẽ một pose opaque trong cùng tác vụ. Không còn RAF/biến previous/alpha transition trong renderer; chuyển động vị trí theo cuộn được giữ nguyên ở HomeTourGuide. Sáu tư thế đổi trực tiếp; chưa phải animation khớp tay chân.
- Nâng test motion: so từng pixel canvas ở136frame với đúng cell atlas hiện tại để bắt ảnh lặp, cùng kiểm không mất hình/không nhảy vị trí. Log `paper-ghost-motion.txt`, `paper-ghost-journey.txt`, build `paper-ghost-build.txt` trong QA. Lint module đạt. Chờ người dùng kiểm lại phần đặt lịch và cuộn ngược.

### Sửa di chuyển liên tục khi cuộn — 28/10/2026

- Phản hồi người dùng: nhân vật biến mất rồi xuất hiện ở vị trí khác khi sang khung. Đã tìm thấy chuyển X gán thẳng từ vị trí chào sang rail; hai pose đều giảm alpha trong crossfade; canvas resize xóa bitmap rồi đợi frame sau mới vẽ.
- Đổi sang đường đi liên tục dựa trên các mốc DOM và scrollY, nội suy smoothstep giữa các điểm đứng. X/Y cùng hội tụ theo thời gian, không khởi tạo lại theo scene; cuộn ngược đi theo cùng đường. Các cảnh sau tiếp tục di chuyển dọc rail, không chỉ đứng một vị trí. Resize viewport bố trí ngay vào vùng an toàn; reduced-motion theo vị trí tĩnh.
- Giữ pose cũ opaque đến khi pose mới phủ lên; resize chỉ khi kích thước bitmap thật sự đổi và vẽ đồng bộ ngay sau resize. Không fade-out hoặc remount nhân vật khi đổi phần. Sáu pose vẫn chưa phải rig chuyển động từng khớp.
- Thêm `frontend/scripts/check-paper-motion.cjs`: lấy136frame qua4ranh giới, cả hai chiều, kiểm vị trí/visibility và pixel alpha để bắt mất hình; dữ liệu ở QA/paper-motion-samples.json. Kiểm thêm modal/ẩn-mở/route và rail hẹp; có log paper-motion-browser-final.txt, paper-motion-reduced.txt và paper-motion-journey.txt.
- Không tăng phần trăm hoặc tự nghiệm thu; đây là sửa lỗi trên phần đã bàn giao. Người dùng cần cuộn chậm/nhanh/ngược trên dữ liệu thật để đánh giá cảm giác chuyển động. Responsive thiết bị thật và hiệu năng production chưa kết luận.

### Đợt tiếp theo: tích hợp Paper và nền tảng kể chuyện — 28/10/2026

- Người dùng duyệt ngoại hình Paper và cho phép đổi bố cục để nội dung/nhân vật phối hợp khi cuộn, lấy cảm hứng Sebastien. Phần chức năng website vẫn được giữ.
- Tạo asset raster bằng ImageGen, lưu trong `frontend/public/images/home-guide/`; README ghi nguồn/prompt. Canvas2D dùng sáu tư thế wave/point/photo/album/listen/calendar và crossfade260ms. Homepage không tải renderer Three.js cũ; các trang preview thử nghiệm cũ vẫn riêng biệt. Không gọi đây là rig tay chân hoàn chỉnh.
- Thêm HomeWayfinding với ba lối đi thật `/explore`, `/collections`, `#home-packages`; 12 cảnh bao phủ các khối homepage hiện có. Phản hồi ưu tiên nội dung card/FAQ/ảnh/bộ sưu tập/ý tưởng và CTA; bỏ xử lý pointerover lặp khi đi giữa các con cùng đối tượng. Modal/nhập liệu ẩn nhân vật, có ẩn/mở lại.
- Dành rail desktop bằng padding scoped homepage; nội dung vào màn hình có reveal nhẹ, không chiếm wheel, không ép cuộn hoặc ẩn nội dung chờ animation. Reduced-motion giữ phản hồi tĩnh. Mobile vẫn compact theo nền tảng cũ, chưa nghiệm thu responsive.
- Build/lint module đạt; typecheck toàn dự án còn lỗi ngoài phạm vi, không diagnostic createPaperGuide/HomeTourGuide/HomeWayfinding. Detector hai component trả[]. Fixture journey sáng/tối/khôngWebGL đạt; kiểm itinerary phát hiện/sửa phản hồi tên gói và nút đóng bị canvas chặn. Kết quả xác nhận cuối ghi ở log paper-guide-* trong QA.
- Chưa hoàn thành: biên tập lại bốn chương cũ thành trải nghiệm khám phá/chi tiết/bộ sưu tập đầy đủ; tương tác ảnh chuyên sâu và từng tình huống dữ liệu; rig từng bộ phận/lật album/lấy cất đồ; responsive và production. Giữ các ô nghiệm thu, chưa tự đánh x.
- Kiểm thủ công đợt này: F5 xem nhân vật mới; cuộn xuôi/ngược qua12cảnh; hover/focus gói/FAQ/đường dẫn; ẩn/mở; mở booking rồi đóng; dùng ba lối đi đầu trang. Đánh giá lại kích thước, độ rõ và cảm giác đổi tư thế trên dữ liệu thật.

### Chuyển sang thử model có sẵn — 27/10/2026

- Theo yêu cầu lấy mẫu sẵn để làm nhanh, đã tải RobotExpressive từ repository three.js chính thức: 463.988 byte, SHA256 `047F5E5FB3BB6D378BD1DF16CA6137F2A596C99B3A1B5690B4020C05AAF6F319`.
- Asset và thông tin nguồn/CC0: `frontend/public/models/photocloud-guide/{RobotExpressive.glb,SOURCE.md}`. Tác giả Tomás Laulhé; chỉnh sửa Don McCurdy. Giữ tạo hình gốc; chưa coi mẫu này đã được người dùng chọn.
- Trang thử Vite local `/model-preview.html` nạp GLB thật, dùng skeletal animation sẵn, chuyển clip có crossfade; có nghỉ/chào/đi bộ/đồng ý/ngồi và reduced-motion. Không thay bot homepage trong bước thử mẫu này.
- Edge headless local PASS tải model, năm nút animation, reduced-motion, không pageerror. Đã xem `frontend/qa-policy-checkbox/stock-guide-review.png`. Có script `frontend/scripts/check-stock-guide.cjs` để kiểm lại.
- Chưa có động tác chụp ảnh/cầm album riêng; cần làm thêm nếu chọn mẫu này. Đợt1 vẫn chờ duyệt ngoại hình; không tính tải model là hoàn thành thiết kế mới.

### Điều chỉnh đợt 1 sau phản hồi “cứng và giả” — 27/10/2026

- Người dùng chưa duyệt tạo hình; giữ tiến độ khoảng20%, không chuyển sang đợt2.
- Bỏ viền xanh dày và chi tiết đỉnh đầu; mặt bo góc lớn hơn, cạnh có bevel. Thân ngắn/tròn hơn, tay dùng capsule nối dài và khớp đồng màu để giảm cảm giác chuỗi viên bi.
- Thêm môi trường phản chiếu studio tạo trong Three.js (không tải ảnh ngoài), vật liệu vỏ và kính có clearcoat; giải phóng render target môi trường khi dispose.
- Chào có thời lượng khoảng2,6giây rồi hạ tay nghỉ trong chế độ chuyển động; bấm chào diễn lại. Đầu/thân có chuyển động nhỏ, ánh mắt nội suy theo con trỏ, chớp mắt đóng/mở theo nhịp. Reduced-motion vẫn giữ tư thế tĩnh.
- Build và lint hai module PASS; TypeScript còn lỗi ngoài phạm vi, không diagnostic hai module. Edge preview ba tư thế/toggle/reduced-motion PASS; hồi quy homepage theo log `home-bot-soft-scroll.txt` và `home-bot-soft-journey.txt`. Ảnh `guide-phase1-review.png` đã cập nhật và được xem trực tiếp.
- Chờ người dùng đánh giá cảm giác tạo hình/chuyển động; chưa coi đạt chất lượng model nghệ thuật thiết kế riêng. Chưa đo FPS/production hay nghiệm thu responsive.

| Ngày | Nội dung | Bằng chứng/giới hạn |
|---|---|---|
| 27/10/2026 | Tạo tài liệu theo dõi, tổng hợp mục tiêu, tạo hình, storyboard, đạo cụ và kiểm thử đã bàn | Chỉ thêm tài liệu; chưa thực hiện hoặc nghiệm thu thiết kế mới |
