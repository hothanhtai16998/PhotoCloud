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
