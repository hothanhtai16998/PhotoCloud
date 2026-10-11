# PhotoCloud Improvement Checklist

Checklist theo dõi cải thiện PhotoCloud, ưu tiên tăng khả năng đặt lịch trước, sau đó mới mở rộng các tính năng lớn hơn.

## P0 — Giữ nền tảng hiện có

- [ ] Giữ layout tổng thể theo phong cách Unsplash: rõ ràng, tối giản, tập trung vào ảnh.
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
- [ ] Homepage không còn chỉ giống gallery Unsplash thuần túy mà có lớp “studio” rõ ràng.
- [ ] CTA booking nổi bật nhưng không phá phong cách tối giản của website ảnh.
- [ ] Package card, portfolio và testimonial hỗ trợ trực tiếp cho conversion.
- [ ] Profile giúp người dùng theo dõi booking sắp tới, đang xử lý và hoàn thành rõ ràng.
- [ ] Admin có dashboard booking đủ nhanh để nắm tình hình trong ngày và trong tuần.
- [ ] Calendar admin hiển thị thông tin booking dễ hiểu trên desktop và dễ dùng trên mobile.
- [ ] Màu trạng thái booking nhất quán trên toàn hệ thống.
- [ ] Motion tinh tế, hỗ trợ trải nghiệm nhưng không gây lag.
- [ ] Lưới ảnh vẫn load nhanh, có skeleton, blur-up và không bị layout shift đáng kể.
- [ ] Các tính năng growth như availability, referral và blog được triển khai sau khi luồng booking chính ổn định.
