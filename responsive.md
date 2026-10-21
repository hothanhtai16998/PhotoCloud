# Responsive Web Standards — PhotoCloud

Tiêu chuẩn cho vòng responsive cuối sau vòng chức năng theo `AGENTS.md`. Khi sửa chức năng vẫn tránh tràn, cắt nội dung và thao tác chỉ dùng chuột. Tài liệu này là hướng dẫn, không phải kết quả nghiệm thu.

## 1. Phạm vi và nguồn trạng thái

- Người dùng phải hoàn thành được tác vụ chính: xem ảnh, điều hướng, đăng nhập, gửi form và phục hồi khi lỗi.
- User ghi trạng thái tại `PAGE_INVENTORY_AND_ANALYSIS.md`; admin tại `ADMIN_PAGE_INVENTORY_AND_ANALYSIS.md`. Không sao chép dấu nghiệm thu sang tài liệu này.
- Giữ thiết kế/chức năng đã duyệt, dùng token/component hiện có. Sửa phần chung có admin phụ thuộc phải theo quyền trong `AGENTS.md`.
- Thiếu thiết bị thật: tiếp tục phần code/kiểm giả lập được giao, ghi giới hạn và chuẩn bị checklist. Không tự đánh `x` hoặc gạch responsive.

## 2. Breakpoint và bố cục

- Dùng breakpoint phù hợp nội dung và hệ thống hiện có, ưu tiên mobile-first khi viết mới. Không đổi mọi breakpoint chỉ để thống nhất số.
- Kiểm mốc đại diện 320/375/390/640/768/1024/1280/1440 CSS px và ngay trước/sau breakpoint thực tế. Đây là kích thước giả lập, không phải tên thiết bị thật.
- CSS custom properties không dùng trực tiếp trong điều kiện `@media`; dùng giá trị hiện có hoặc biến build-time nếu dự án hỗ trợ.
- Cho flex/grid co lại bằng `min-width: 0`, track `minmax(0, 1fr)` và kích thước linh hoạt. Width/max-width bằng px có thể hợp lý khi vừa viewport; không cấm mọi giá trị px hoặc `position: absolute`.
- Sửa nguyên nhân tràn. Không đặt `overflow-x: hidden` toàn trang để che lỗi vì có thể cắt focus, menu và nội dung. Bảng/vùng kéo có thể cuộn ngang cục bộ với cách thao tác rõ.
- Kiểm nội dung dài, tiếng Việt, URL không ngắt, dữ liệu rỗng/nhiều phần tử, zoom 200% và tăng cỡ chữ. Không cắt thông tin cần để hoàn thành tác vụ.

Ví dụ minh họa, chỉ áp dụng trong component cần sửa:

```css
.responsive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
  gap: 1rem;
}
.responsive-grid > * { min-width: 0; }
.long-content { overflow-wrap: anywhere; }
```

## 3. Touch và keyboard

- Mục tiêu vùng bấm thoải mái khoảng 44×44 CSS px cho điều khiển cảm ứng; tăng vùng tương tác bằng padding/label khi icon nhỏ. Kiểm khoảng cách để không bấm nhầm, không ép toàn bộ button bằng selector CSS toàn cục.
- Icon button có tên truy cập. Dùng button cho hành động, link cho điều hướng; Enter/Space/Tab/Shift+Tab và Escape hoạt động theo loại điều khiển.
- Không giấu hành động chỉ sau hover. Thiết bị touch phải tìm thấy và dùng được; keyboard có focus nhìn thấy.
- Slider/drag: kiểm kéo, cuộn trang, hủy gesture, mất pointer capture và đổi hướng. Chọn `touch-action` theo gesture, không vô hiệu hóa cuộn/zoom toàn trang.
- Viewport nhỏ chỉ chứng minh bố cục. Ghi riêng có tổng hợp touch hoặc thao tác trên thiết bị thật hay không.

## 4. Typography và form

- Dùng thang chữ hiện có và đơn vị tương đối khi phù hợp. Nội dung đọc được ở zoom/cỡ chữ lớn; không áp một cỡ chữ mới toàn site để sửa một trang.
- Input trên iOS nên có chữ tối thiểu 16 CSS px để giảm zoom tự động khi focus; kiểm Safari thật. Không cấm pinch zoom hoặc đặt `user-scalable=no`.
- Label hiển thị, autocomplete/type phù hợp, lỗi gắn trường bằng `aria-describedby`, `aria-invalid` khi thực sự lỗi. Giữ dữ liệu nhập khi API thất bại.
- Kiểm bàn phím ảo, focus/scroll tới trường lỗi, submit và footer cố định. `aria-disabled` đơn lẻ không chặn sự kiện; dùng `disabled` khi cần khóa native control.
- Không truyền trạng thái chỉ bằng màu. Kiểm tương phản/focus/disabled trong cả sáng/tối.

## 5. Ảnh và media

- Ảnh vừa container, giữ tỷ lệ; dùng `width`/`height` hoặc tỷ lệ phù hợp để dành chỗ. `object-fit` không cắt nội dung quan trọng ngoài ý muốn.
- Dùng nguồn/kích thước phù hợp, `srcset`/`sizes` nếu pipeline hỗ trợ. Không lazy-load ảnh chính đầu trang; lazy-load ảnh dưới màn hình.
- Đánh giá dung lượng theo chất lượng ảnh và điều kiện mạng, không coi một ngưỡng KB là bằng chứng tối ưu cho mọi ảnh.
- Khi cần đo hiệu năng, phân biệt DOM, ảnh hiện/LCP, API và phản hồi thao tác. Ghi cache, mạng, dữ liệu và môi trường; fixture không chứng minh production.

## 6. Menu và navigation

- Tái sử dụng primitive hiện có đã quản lý focus. Menu đóng không còn phần tử trong tab order; `aria-hidden` hoặc transform ra ngoài màn hình tự nó không khóa focus.
- Trigger có tên, `aria-expanded` và quan hệ nội dung khi phù hợp. Disclosure điều hướng thường không cần ARIA menu; chỉ dùng role menu khi triển khai đầy đủ tương tác tương ứng.
- Navigation dạng modal: chuyển/giữ focus, Escape/nút đóng, trả focus, quản lý nền và body scroll. Disclosure thường không cần focus trap.
- Lấy route từ router hiện tại, không thay bằng URL ví dụ. Kiểm Back/Forward, F5 và đóng navigation sau chọn link.

## 7. Modal và vùng cố định

- Ưu tiên primitive hiện có thay vì chép modal tự viết. Dialog có tên truy cập, focus ban đầu hợp lý, Tab/Shift+Tab, Escape và trả focus về trigger còn tồn tại.
- Khóa/khôi phục scroll đúng vòng đời, kể cả unmount/dialog lồng nhau. Không gán body overflow về rỗng nếu có chủ sở hữu khác.
- Nội dung cuộn tới cuối, nút chính/đóng tiếp cận được, không bị bàn phím/safe area che. Cân nhắc `dvh` với fallback theo browser mục tiêu.
- Đóng qua backdrop theo hành vi đã duyệt; không làm mất draft hoặc đóng khi busy ngoài dự kiến.
- Header cố định không che nội dung/focus/anchor. Offset nội dung và scroll offset là hai nhu cầu khác nhau; kiểm cả hai và dùng token chiều cao hiện có.

## 8. Chuyển động và theme

- `prefers-reduced-motion`: giảm từng hiệu ứng, giữ phản hồi tải/thành công/lỗi. Không dùng selector `*` với thời gian `0.01ms` để tắt toàn bộ animation/transition vì có thể phá vòng đời và phản hồi.
- Ví dụ hiệu ứng trang trí cụ thể, thay tên bằng class thật trong phạm vi:

  ```css
  @media (prefers-reduced-motion: reduce) {
    .decorative-reveal { animation: none; opacity: 1; transform: none; }
    .image-hover-zoom { transition: none; transform: none; }
  }
  ```

- Theo cơ chế chọn/lưu theme của ứng dụng; không thêm `prefers-color-scheme` ghi đè lựa chọn người dùng. Kiểm sáng/tối, chuyển theme và tải lại.

## 9. Vòng kiểm hữu hạn

1. Chọn route/trạng thái/tác vụ từ inventory; ghi baseline/build, dữ liệu test, browser, viewport và theme.
2. Kiểm gộp desktop/mobile/tablet cần thiết: bố cục, nội dung dài, zoom, keyboard, touch, dialog, bàn phím ảo, loading/empty/error/retry.
3. Sửa một batch, xác nhận tối đa một lượt nữa theo Impeccable. Lỗi chặn còn lại ghi rõ, không tuyên bố đạt hoặc lặp đánh bóng vô hạn.
4. Tách kết quả tự động/giả lập với thiết bị thật. Screenshot đơn lẻ không chứng minh cuộn/kéo/focus hoạt động.

## 10. Thiết bị thật và nghiệm thu

Theo `.cursor/rules/responsive-real-device-testing.mdc`, trước nghiệm thu responsive trang user cần đủ ba nhóm:

| Nhóm | Thiết bị thật và trình duyệt |
|---|---|
| 1 | iPhone — Safari iOS |
| 2 | Android — Chrome |
| 3 | iPad — Safari, hoặc desktop thật — ghi trình duyệt |

Ghi model/OS/browser/version và viewport CSS px **đo thực tế**, không gán mọi thiết bị một viewport chuẩn. Desktop kiểm thêm kích thước cửa sổ liên quan. 390×844, 412×915, 1024×768 và 1440×900 chỉ là mốc tham khảo.

Thiếu thiết bị: ghi nhóm chưa kiểm, chuẩn bị code/checklist và đề nghị người dùng cung cấp kết quả thật khi nghiệm thu. Không chặn sửa lỗi hoặc kiểm giả lập đã được giao. Agent không tự đánh `x`; người dùng xác nhận theo `AGENTS.md`.

## 11. Bằng chứng và bàn giao

Với mỗi route/lượt kiểm, ghi:

- Ngày giờ Việt Nam, người test, commit/build và thay đổi chưa commit liên quan nếu có.
- URL/route, dữ liệu fixture hoặc test staging; không ghi secret hoặc dùng dữ liệu thật để thử xóa/sửa.
- Thiết bị, OS, browser/version, viewport, hướng màn hình, theme, zoom, reduced motion.
- Thao tác, kết quả mong đợi/thực tế, PASS/FAIL/chưa kiểm và log/screenshot. Ghi metadata vào Markdown/log, không phải file PNG.
- Phần chưa kiểm: touch giả lập, bàn phím ảo, Safari, thiết bị thật hoặc production. Không suy diễn kết quả thay thế.

Giữ ID và dấu nghiệm thu trong inventory tương ứng. Tài liệu QA phụ chỉ giữ bằng chứng, không là nguồn trạng thái nghiệm thu thứ hai.
