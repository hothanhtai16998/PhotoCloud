# PhotoCloud — Quy tắc làm việc cho agent

Áp dụng cho toàn bộ repository. Cập nhật theo yêu cầu người dùng ngày 16/10/2026.
Chat mới làm việc trong repository này cần đọc file này trước khi sửa code.

## Cách gọi trong chat mới

Có thể dùng nguyên câu sau, thay tên trang:

> Đọc AGENTS.md và page_inventory. Dùng $impeccable rà soát và sửa trang [tên trang/route] theo tiêu chuẩn chất lượng của dự án, đơn giản hóa logic, giữ các chức năng đã nghiệm thu, kiểm tra hồi quy và cập nhật checklist. Responsive để vòng cuối.

Các cách gọi theo mục đích:

- **Chỉ đánh giá:** “Đọc AGENTS.md, dùng $impeccable audit trang [tên/route]. Báo vấn đề có bằng chứng và ưu tiên; chưa sửa code.”
- **Làm code dễ bảo trì:** “Đọc AGENTS.md, đơn giản hóa logic trang [tên/route], bỏ state/nhánh trùng, tách theo trách nhiệm và kiểm tra giữ nguyên hành vi.”
- **Tối ưu tốc độ:** “Đọc AGENTS.md, dùng $impeccable optimize trang [tên/route]. Đo trước/sau, tìm nguyên nhân và sửa chỗ nghẽn.”
- **Xử lý tình huống lỗi:** “Đọc AGENTS.md, dùng $impeccable harden trang [tên/route]: offline, timeout, dữ liệu rỗng, quyền và thử lại.”
- **Vòng responsive cuối:** “Đọc AGENTS.md, bắt đầu kiểm responsive riêng cho các trang đã đạt chức năng; ghi rõ môi trường và những gì chưa kiểm trên thiết bị thật.”

`$impeccable` là tên skill, các từ audit/optimize/harden là yêu cầu cho skill, không phải lệnh shell. Nếu skill không có trong chat mới, báo rõ và tiếp tục theo tiêu chuẩn trong file này; không giả vờ đã chạy skill.

## Website tốt nghĩa là gì trong dự án này?

Người dùng hoàn thành được việc họ đến để làm, hiểu trạng thái hiện tại, nhận phản hồi kịp thời và phục hồi được khi lỗi. Người bảo trì có thể tìm đúng nơi sửa mà không phải lần theo nhiều bản sao dữ liệu hoặc chuỗi effect khó đoán.

Code ngắn, nhiều component, điểm audit cao hay build thành công riêng lẻ đều không đủ để kết luận một trang tốt. Cần cả hành vi đúng, trải nghiệm phù hợp và bằng chứng kiểm tra.

Các tiêu chí giao diện/kỹ thuật bên dưới được tổng hợp từ Impeccable audit, optimize, harden và craft-floor. Quy tắc kiến trúc, bảo mật và quy trình nghiệm thu là bổ sung riêng của PhotoCloud. Đây là tiêu chuẩn làm việc, không phải tuyên bố website hiện đã đạt toàn bộ.

## 1. Logic rõ, dễ đọc và dễ bảo trì

- Mỗi luồng dữ liệu có một nơi sở hữu rõ ràng. Dữ liệu dùng chung đặt ở store phù hợp; trạng thái tạm của giao diện giữ gần nơi dùng. Không đưa mọi thứ vào global store.
- Không giữ state nếu có thể suy ra trực tiếp từ dữ liệu hiện tại. Không dùng nhiều effect chỉ để đồng bộ các bản sao của cùng giá trị.
- Rà bỏ code chết, điều kiện lặp, xử lý không còn người gọi và abstraction không cần thiết trước khi tách file.
- Chia theo trách nhiệm: trình bày, tải dữ liệu, thao tác nghiệp vụ, điều hướng. Hook/component có tên thể hiện nhiệm vụ, đầu vào nhỏ và hợp đồng rõ; tránh một hook khổng lồ hoặc hook trả hàng chục chi tiết nội bộ không liên quan.
- File nguồn dài hơn 1.000 dòng cần tách; file ngắn hơn vẫn nên tách khi trộn quá nhiều trách nhiệm. Không cắt file cơ học hoặc tạo nhiều lớp chỉ để đạt số dòng.
- Ưu tiên hàm thuần cho quy tắc tính toán/biến đổi dữ liệu. Dùng tên cụ thể; comment giải thích lý do hoặc ràng buộc, không kể lại từng dòng code.
- Khai báo kiểu cho dữ liệu qua ranh giới API/component; tránh thêm any, ép kiểu hoặc tắt lint để che lỗi. Dữ liệu bên ngoài vẫn cần kiểm tra lúc chạy khi phù hợp.
- Tái sử dụng component/token/utility hiện có khi đúng ngữ nghĩa. Chỉ tổng quát hóa khi có nhu cầu thực, không xây framework cho một chỗ dùng.

### Không lặp code và tái sử dụng đúng chỗ

- Khi rà hoặc sửa mỗi trang, tìm phần trùng trong trang đó và các trang liên quan trước khi viết thêm. Ưu tiên mở rộng component/hook/utility phù hợp đã có thay vì copy-paste tạo phiên bản mới.
- Giao diện lặp có cùng ý nghĩa và hành vi (ví dụ trường nhập, hàng danh sách, hộp xác nhận, trạng thái rỗng) cần chuyển thành component dùng chung khi có thể tái sử dụng hợp lý. Component sở hữu cấu trúc và hành vi chung; dữ liệu, nội dung và khác biệt thực sự truyền qua props rõ ràng.
- Logic React lặp có state/effect chuyển thành custom hook; tính toán, định dạng hoặc biến đổi dữ liệu thuần chuyển thành utility; gọi API trùng gom về service phù hợp. Không biến logic không có giao diện thành component chỉ để tránh lặp.
- Không tạo một component chung với hàng loạt cờ boolean/điều kiện cho những phần chỉ giống bề ngoài nhưng khác nghiệp vụ. Giữ riêng khác biệt thật; chỉ trích phần chung ổn định. Không tổng quát hóa trước nhu cầu thực.
- Khi gom code trùng, thay các nơi dùng thuộc phạm vi bằng phần dùng chung và xóa bản cũ không còn được gọi. Kiểm tra các nơi bị ảnh hưởng để tránh việc sửa một trang làm hỏng trang khác.
- Báo rõ phần trùng đã gom, nơi tái sử dụng và khác biệt cần giữ. Nếu giữ code gần giống nhau, giải thích ngắn lý do nghiệp vụ thay vì mặc định copy-paste.

## 2. Chức năng đúng và bất đồng bộ an toàn

- Giữ đúng URL, query, Back/Forward, F5 và link mở trực tiếp. Với ảnh: modal và trang độc lập phải dùng cùng quy tắc dữ liệu, không nháy sai chế độ.
- Kết quả request cũ không ghi đè ảnh/từ khóa/tài khoản mới. Hủy request hoặc bỏ kết quả không còn hợp lệ; dọn event listener, timer và observer khi rời trang.
- Chặn gửi trùng ở thao tác có tác dụng phụ. Optimistic UI chỉ dùng khi có thể đối soát và rollback; không báo thành công trước khi đủ bằng chứng.
- Khi lỗi, giữ dữ liệu người dùng đã nhập nếu phù hợp. Thử lại phải đúng đối tượng, không tạo bản ghi hay thao tác trùng.
- Không thay nghiệp vụ hoặc xóa chức năng đã nghiệm thu chỉ vì refactor. Nếu cần đổi hành vi, nêu rõ phạm vi thay đổi.

## 3. Giao diện đầy đủ trạng thái, dễ dùng

- Có trạng thái tải, rỗng, lỗi, thành công, disabled và đang xử lý khi cần. Phân biệt “không có kết quả” với “không tải được dữ liệu”.
- Nút có tên hành động rõ; lỗi nói được vấn đề và bước phục hồi. Không dùng spinner vô hạn để che timeout hoặc request lỗi.
- Thử dữ liệu thiếu, nội dung dài, dấu tiếng Việt, ký tự đặc biệt, số lớn và nhiều phần tử; không để undefined/NaN lọt ra UI.
- Form có label, validation và lỗi gắn với trường phù hợp; submit có phản hồi. Không tự xóa nội dung khi API thất bại.
- Giữ ngôn ngữ, định dạng ngày/giá và hệ thống thiết kế nhất quán. Tái sử dụng token màu, khoảng cách, chữ và component hiện có; kiểm sáng/tối.
- Phân cấp nội dung giúp tìm hành động chính nhanh. Modal chỉ dùng khi nhiệm vụ cần tập trung; không thêm card, hiệu ứng hoặc điều khiển không giúp người dùng hoàn thành việc.

## 4. Accessibility là một phần chức năng

- Dùng button cho hành động, link cho điều hướng, heading theo thứ bậc và HTML có ngữ nghĩa trước khi thêm ARIA.
- Nút chỉ có icon phải có tên truy cập; trạng thái bật/tắt/đang xử lý được thể hiện đúng. Không dùng ARIA thay cho hành vi thật.
- Có focus nhìn thấy; Tab/Enter/Space/Escape hoạt động phù hợp. Modal quản lý focus và trả focus khi đóng; phím tắt không chiếm thao tác gõ trong form.
- Ảnh mang nội dung có alt phù hợp; ảnh trang trí không tạo thông tin thừa cho công cụ đọc màn hình.
- Kiểm độ tương phản trong cả hai theme; mục tiêu chữ thường ít nhất 4,5:1, chữ lớn 3:1. Không dùng riêng màu để truyền trạng thái.
- Tôn trọng prefers-reduced-motion bằng phương án giảm chuyển động vẫn giữ phản hồi có ý nghĩa; không xóa mọi phản hồi máy móc.

## 5. Hiệu năng phải đo và giải thích được

- Đo đúng chỗ chậm trước khi tối ưu: request, JavaScript, render, giải mã ảnh, layout hay hiệu ứng. Ghi điều kiện và kết quả trước/sau; không gán nguyên nhân chỉ vì sau sửa thấy nhanh hơn.
- Hiện khung và điều khiển sớm; dữ liệu phụ/ảnh liên quan không chặn nội dung chính. Không chờ tải toàn bộ ảnh mới hiện lưới.
- Dùng ảnh đúng kích thước; ưu tiên ảnh chính đang nhìn thấy, lazy-load nội dung dưới màn hình. Không lazy-load ảnh chính ở đầu trang.
- Phân trang dữ liệu lớn; tránh tải tất cả để lọc ở client khi API hỗ trợ. Tránh request trùng và dựng hàng loạt phần tử không cần ở lượt render đầu.
- Không thêm memo/useMemo/useCallback đại trà. Chỉ tối ưu khi có chi phí hoặc nhu cầu ổn định tham chiếu rõ; kiểm lại sau thay đổi.
- Dọn import/dependency thừa; tách bundle hợp lý. Tránh layout thrashing, animation thuộc tính layout và hiệu ứng nặng diện rộng.
- Phân biệt thời gian xuất hiện DOM, thời gian ảnh hiện, phản hồi thao tác và thời gian API hoàn tất. Fixture nhanh không chứng minh production hết lag.

## 6. Responsive — thiết kế đúng, nghiệm thu ở vòng cuối

- Khi viết code vẫn tránh width cứng gây tràn, nội dung bị cắt và điều khiển chỉ dùng được bằng chuột. Không trì hoãn kiến trúc thích ứng rồi coi đó là đã đạt responsive.
- Theo yêu cầu hiện tại: hoàn tất chức năng tất cả trang trước, rồi kiểm responsive thành phần riêng. Không tự đánh x responsive trong vòng chức năng.
- Vòng cuối kiểm mobile/tablet/desktop, ngang/dọc khi liên quan, nội dung dài, zoom, bàn phím ảo, scroll, focus và các dialog.
- Mục tiêu vùng bấm thoải mái khoảng 44 × 44 CSS px cho điều khiển cảm ứng; kiểm cả thao tác chạm/kéo/hủy, không chỉ screenshot ở viewport nhỏ.
- Ghi rõ trình duyệt, viewport, giả lập touch hay thiết bị thật; phần chưa kiểm phải nói rõ.

## 7. An toàn dữ liệu và quyền

- Backend phải kiểm quyền và dữ liệu đầu vào cho thao tác quan trọng; ẩn nút ở frontend không phải cơ chế phân quyền.
- Không đưa secret vào frontend/log, không tin HTML hoặc URL đầu vào chưa xử lý. Tận dụng cơ chế auth, CSRF và validation hiện có.
- Kiểm việc đổi/đăng xuất tài khoản khi request đang chạy; không cập nhật dữ liệu riêng của phiên cũ sang tài khoản mới.
- Kiểm thử dùng fixture hoặc dữ liệu test phù hợp, không sửa/xóa dữ liệu thật để chứng minh một thao tác hoạt động.

## 8. Quy trình cho mỗi trang

1. Đọc AGENTS.md, PAGE_INVENTORY_AND_ANALYSIS.md và hướng dẫn gần mã nguồn; xác định phạm vi và ca đã được người dùng nghiệm thu.
2. Nếu áp dụng Impeccable, đọc skill và tài liệu đúng tác vụ. Chỉ audit thì báo cáo, không tự sửa; yêu cầu rà và sửa thì thực hiện cả phần sửa đã được cho phép.
3. Đọc route, component, hook, store và API liên quan; tìm nguồn dữ liệu, tác dụng phụ và điểm phức tạp. Không chỉ nhìn screenshot hoặc số dòng.
4. Ưu tiên lỗi có tác động thật: P0 chặn nhiệm vụ/mất dữ liệu; P1 lỗi lớn cần xử lý trước phát hành; P2 bất tiện có cách vòng; P3 tinh chỉnh. Mỗi lỗi có vị trí, bước tái hiện, ảnh hưởng và bằng chứng; không biến suy đoán thành lỗi đã xác nhận.
5. Sửa trong phạm vi, đơn giản hóa logic và giữ giao diện/nghiệp vụ đã duyệt. Thay đổi ít nhưng giải quyết đúng nguyên nhân.
6. Chạy build, lint và kiểm tra phù hợp với thay đổi; kiểm các luồng dễ hồi quy. Chạy typecheck khi liên quan và báo riêng lỗi sẵn có ngoài phạm vi. Không dùng “build qua” thay cho kiểm kiểu hoặc chức năng.
7. Với thay đổi giao diện, kiểm kết quả chạy thực theo vòng xác minh hữu hạn của skill; không lặp đánh bóng vô hạn. Responsive theo giai đoạn riêng đã thống nhất.
8. Cập nhật inventory bằng thao tác dễ hiểu và kết quả cần thấy; báo thay đổi, bằng chứng và phần chưa kiểm. Không tự nghiệm thu thay người dùng.

## 9. Điều kiện bàn giao và quy ước nghiệm thu

- Code đã được kiểm tra theo phạm vi; không có lỗi chặn đã biết trong phần bàn giao mà bị bỏ qua. Nếu còn lỗi, nêu rõ tác động và trạng thái; không tuyên bố sẵn sàng lên host khi chưa đủ bằng chứng.
- Có checklist kiểm lại những hành vi bị ảnh hưởng; phân biệt kết quả tự động với xác nhận thủ công và môi trường production.
- `x` = người dùng xác nhận đạt; `o` = chưa đạt; trống = chưa kiểm. Đọc được khoảng trắng/chữ hoa trong dấu đánh giá. Không đổi các dấu của người dùng dựa vào fixture.
- Lỗi quan trọng đang mở đưa lên đầu inventory, có màu đỏ khi trình xem hỗ trợ và nhãn chữ dễ hiểu khi không hỗ trợ màu.
- Người dùng xác nhận toàn bộ chức năng đạt thì đánh x và gạch ngang phần chức năng tương ứng. Không gạch responsive nếu chưa kiểm. Tính năng bỏ theo yêu cầu đánh N/A, không tính là ca đạt.
- Đi theo thứ tự trang trong inventory; trang chủ để sau. Hiện Chi tiết ảnh (#4) đã được người dùng nghiệm thu chức năng; trang tiếp theo là Danh sách bộ sưu tập (#5), trừ khi người dùng đổi ưu tiên.

## Nguồn tiêu chí Impeccable

Các tài liệu này ở trong repository; đọc bản hiện tại khi áp dụng skill:

- Skill: `.agents/skills/impeccable/SKILL.md`.
- Audit: `.agents/skills/impeccable/reference/audit.md` — kiểm chất lượng kỹ thuật có bằng chứng.
- Optimize: `.agents/skills/impeccable/reference/optimize.md` — xác định chỗ chậm, đo và tối ưu.
- Harden: `.agents/skills/impeccable/reference/harden.md` — trạng thái lỗi, dữ liệu thực và tình huống biên.
- Craft floor: `.agents/skills/impeccable/reference/craft-floor.md` — chất lượng tương tác và giao diện.
