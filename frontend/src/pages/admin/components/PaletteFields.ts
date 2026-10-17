import { adminText } from '@/pages/admin/adminLocale';
import type { PaletteToken } from '@/theme/sitePalette';
export type PaletteGroup = 'surfaces' | 'buttons' | 'states';
export const paletteGroups: {id: PaletteGroup;label: string;hint: string}[] = [
 {id:'surfaces',label:adminText("Nền & chữ"),hint:adminText("Nền trang, thanh điều hướng, hộp thoại và nội dung.")},
 {id:'buttons',label:adminText("Nút & tương tác"),hint:adminText("Đặt lịch, Tạo, Lưu, Hủy, bộ lọc và bàn phím.")},
 {id:'states',label:adminText("Trạng thái"),hint:adminText("Xóa, thành công, cảnh báo và thông báo.")},
];
const names: Record<string,[string,string]> = {
 '--bg-primary':[adminText("Nền trang"),adminText("Vùng nền chung phía sau nội dung.")], '--bg-header':[adminText("Nền thanh điều hướng"),adminText("Thanh có logo PhotoCloud và menu trên cùng.")], '--bg-secondary':[adminText("Nền phụ"),adminText("Vùng tìm kiếm, khối phụ và các vùng phân nhóm.")], '--bg-card':[adminText("Nền hộp nội dung"),adminText("Thẻ bộ sưu tập, form và hộp thoại.")],
 '--text-primary':[adminText("Chữ chính"),adminText("Tên trang, tên bộ sưu tập và nội dung chính.")], '--text-secondary':[adminText("Chữ phụ"),adminText("Mô tả, ngày tháng và thông tin bổ sung.")], '--text-muted':[adminText("Chữ ít nổi bật"),adminText("Chú thích và thông tin ít ưu tiên.")], '--border-color':[adminText("Đường viền nhẹ"),adminText("Đường ngăn, khung thẻ và form.")], '--border-strong':[adminText("Đường viền rõ"),adminText("Trường nhập và vùng cần phân biệt rõ hơn.")], '--hover-bg':[adminText("Nền khi rê chuột"),adminText("Mục menu hoặc hàng danh sách đang được trỏ đến.")], '--accent':[adminText("Điểm nhấn thương hiệu"),adminText("Liên kết nhấn và chi tiết trang trí thương hiệu.")], '--accent-soft':[adminText("Điểm nhấn bổ sung"),adminText("Chi tiết phụ và các điểm nhấn ấm.")],
 '--button-primary-bg':[adminText("Nền nút chính"),adminText("Đặt lịch chụp, Tạo, Gửi và Lưu thay đổi.")], '--button-primary-fg':[adminText("Chữ nút chính"),adminText("Chữ và icon trên nút Đặt lịch / Lưu.")], '--button-primary-hover':[adminText("Nền nút chính khi rê chuột"),adminText("Rê chuột lên Đặt lịch hoặc Lưu để thấy trạng thái này.")],
 '--button-secondary-bg':[adminText("Nền nút phụ"),adminText("Chia sẻ, Xuất, Hủy và Upload trên header.")], '--button-secondary-fg':[adminText("Chữ nút phụ"),adminText("Chữ và icon trên nút Chia sẻ / Hủy.")], '--button-secondary-hover':[adminText("Nền nút phụ khi rê chuột"),adminText("Rê chuột lên Chia sẻ, Hủy hoặc thao tác phụ.")], '--button-secondary-border':[adminText("Viền nút phụ"),adminText("Viền bao quanh Chia sẻ / Hủy.")],
 '--button-selected-bg':[adminText("Nền đã chọn"),adminText("Bộ lọc đang bật, tab đang mở và đã yêu thích.")], '--button-selected-fg':[adminText("Chữ đã chọn"),adminText("Chữ và icon trong bộ lọc hoặc tab đang chọn.")], '--button-selected-border':[adminText("Viền đã chọn"),adminText("Viền nhấn cho trạng thái đang chọn.")], '--button-focus':[adminText("Viền focus bàn phím"),adminText("Viền xuất hiện khi dùng Tab đến nút.")],
 '--button-danger-bg':[adminText("Nền nút xóa"),adminText("Nút xác nhận Xóa trong hộp thoại.")], '--button-danger-hover':[adminText("Nền nút xóa khi rê chuột"),adminText("Trạng thái rê chuột của nút xác nhận Xóa.")], '--button-danger-fg':[adminText("Chữ nút xóa"),adminText("Chữ trên nền nút xác nhận Xóa.")], '--button-danger-soft':[adminText("Nền xóa nhẹ"),adminText("Nút icon thùng rác và thao tác nguy hiểm nhỏ.")], '--button-danger-text':[adminText("Chữ / icon xóa nhẹ"),adminText("Icon thùng rác trên nền nhẹ hoặc trong menu.")],
 '--button-success-bg':[adminText("Nền nút chấp thuận"),adminText("Thao tác duyệt hoặc chấp thuận trong quản trị.")], '--button-success-hover':[adminText("Nền chấp thuận khi rê chuột"),adminText("Trạng thái rê chuột của nút chấp thuận.")], '--button-success-fg':[adminText("Chữ nút chấp thuận"),adminText("Chữ và icon trên nút chấp thuận.")],
 '--status-success':[adminText("Thông báo thành công"),adminText("Thông báo đã lưu hoặc trạng thái thành công.")], '--status-warning':[adminText("Thông báo cảnh báo"),adminText("Nhắc kiểm tra nội dung trước khi tiếp tục.")], '--status-error':[adminText("Thông báo lỗi"),adminText("Lỗi nhập liệu, kết nối và thông báo cần xử lý.")], '--status-info':[adminText("Thông báo thông tin"),adminText("Ghi chú và thông tin hướng dẫn.")],
};
export function paletteField(key: PaletteToken): {label:string;hint:string;group:PaletteGroup} {
 const [label,hint] = names[key] ?? [adminText("Màu giao diện"),adminText("Áp dụng cho chi tiết giao diện tương ứng.")];
 const group = /danger|success|--status-/.test(key) ? 'states' : key.startsWith('--button-') ? 'buttons' : 'surfaces';
 return {label:adminText(label),hint:adminText(hint),group};
}

export const paletteSections: {label:string;hint:string;keys:PaletteToken[]}[] = [
 {label:adminText("Nền giao diện"),hint:adminText("Nền trang, thanh điều hướng và hộp nội dung."),keys:['--bg-primary','--bg-header','--bg-secondary','--bg-card','--hover-bg']},
 {label:adminText("Chữ và đường viền"),hint:adminText("Các màu nội dung dùng chung trên website."),keys:['--text-primary','--text-secondary','--text-muted','--border-color','--border-strong']},
 {label:adminText("Thương hiệu"),hint:adminText("Điểm nhấn và chi tiết bổ sung."),keys:['--accent','--accent-soft']},
 {label:adminText("Nút chính · Đặt lịch / Lưu / Tạo"),hint:adminText("Nền, chữ và rê chuột cùng một bộ. Viền nút chính dùng chung màu nền."),keys:['--button-primary-bg','--button-primary-fg','--button-primary-hover']},
 {label:adminText("Nút phụ · Chia sẻ / Hủy / Xuất"),hint:adminText("Bộ màu cho thao tác phụ, gồm cả đường viền."),keys:['--button-secondary-bg','--button-secondary-fg','--button-secondary-border','--button-secondary-hover']},
 {label:adminText("Đã chọn · Yêu thích / Bộ lọc"),hint:adminText("Nền, chữ và viền khi thao tác đang được chọn."),keys:['--button-selected-bg','--button-selected-fg','--button-selected-border']},
 {label:adminText("Focus bàn phím"),hint:adminText("Viền nhận biết khi di chuyển bằng phím Tab."),keys:['--button-focus']},
 {label:adminText("Nút xóa"),hint:adminText("Bộ màu cho xác nhận xóa."),keys:['--button-danger-bg','--button-danger-fg','--button-danger-hover']},
 {label:adminText("Icon xóa nhẹ"),hint:adminText("Nền và icon cho thao tác xóa dạng nhỏ."),keys:['--button-danger-soft','--button-danger-text']},
 {label:adminText("Nút duyệt / Chấp thuận"),hint:adminText("Bộ màu cho thao tác chấp thuận trong admin."),keys:['--button-success-bg','--button-success-fg','--button-success-hover']},
 {label:adminText("Thông báo"),hint:adminText("Màu chữ theo ý nghĩa thông báo."),keys:['--status-success','--status-warning','--status-error','--status-info']},
];
