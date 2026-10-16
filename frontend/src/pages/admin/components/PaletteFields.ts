import type { PaletteToken } from '@/theme/sitePalette';
export type PaletteGroup = 'surfaces' | 'buttons' | 'states';
export const paletteGroups: {id: PaletteGroup;label: string;hint: string}[] = [
 {id:'surfaces',label:'Nền & chữ',hint:'Nền trang, thanh điều hướng, hộp thoại và nội dung.'},
 {id:'buttons',label:'Nút & tương tác',hint:'Đặt lịch, Tạo, Lưu, Hủy, bộ lọc và bàn phím.'},
 {id:'states',label:'Trạng thái',hint:'Xóa, thành công, cảnh báo và thông báo.'},
];
const names: Record<string,[string,string]> = {
 '--bg-primary':['Nền trang','Vùng nền chung phía sau nội dung.'], '--bg-header':['Nền thanh điều hướng','Thanh có logo PhotoCloud và menu trên cùng.'], '--bg-secondary':['Nền phụ','Vùng tìm kiếm, khối phụ và các vùng phân nhóm.'], '--bg-card':['Nền hộp nội dung','Thẻ bộ sưu tập, form và hộp thoại.'],
 '--text-primary':['Chữ chính','Tên trang, tên bộ sưu tập và nội dung chính.'], '--text-secondary':['Chữ phụ','Mô tả, ngày tháng và thông tin bổ sung.'], '--text-muted':['Chữ ít nổi bật','Chú thích và thông tin ít ưu tiên.'], '--border-color':['Đường viền nhẹ','Đường ngăn, khung thẻ và form.'], '--border-strong':['Đường viền rõ','Trường nhập và vùng cần phân biệt rõ hơn.'], '--hover-bg':['Nền khi rê chuột','Mục menu hoặc hàng danh sách đang được trỏ đến.'], '--accent':['Điểm nhấn thương hiệu','Liên kết nhấn và chi tiết trang trí thương hiệu.'], '--accent-soft':['Điểm nhấn bổ sung','Chi tiết phụ và các điểm nhấn ấm.'],
 '--button-primary-bg':['Nền nút chính','Đặt lịch chụp, Tạo, Gửi và Lưu thay đổi.'], '--button-primary-fg':['Chữ nút chính','Chữ và icon trên nút Đặt lịch / Lưu.'], '--button-primary-hover':['Nền nút chính khi rê chuột','Rê chuột lên Đặt lịch hoặc Lưu để thấy trạng thái này.'],
 '--button-secondary-bg':['Nền nút phụ','Chia sẻ, Xuất, Hủy và Upload trên header.'], '--button-secondary-fg':['Chữ nút phụ','Chữ và icon trên nút Chia sẻ / Hủy.'], '--button-secondary-hover':['Nền nút phụ khi rê chuột','Rê chuột lên Chia sẻ, Hủy hoặc thao tác phụ.'], '--button-secondary-border':['Viền nút phụ','Viền bao quanh Chia sẻ / Hủy.'],
 '--button-selected-bg':['Nền đã chọn','Bộ lọc đang bật, tab đang mở và đã yêu thích.'], '--button-selected-fg':['Chữ đã chọn','Chữ và icon trong bộ lọc hoặc tab đang chọn.'], '--button-selected-border':['Viền đã chọn','Viền nhấn cho trạng thái đang chọn.'], '--button-focus':['Viền focus bàn phím','Viền xuất hiện khi dùng Tab đến nút.'],
 '--button-danger-bg':['Nền nút xóa','Nút xác nhận Xóa trong hộp thoại.'], '--button-danger-hover':['Nền nút xóa khi rê chuột','Trạng thái rê chuột của nút xác nhận Xóa.'], '--button-danger-fg':['Chữ nút xóa','Chữ trên nền nút xác nhận Xóa.'], '--button-danger-soft':['Nền xóa nhẹ','Nút icon thùng rác và thao tác nguy hiểm nhỏ.'], '--button-danger-text':['Chữ / icon xóa nhẹ','Icon thùng rác trên nền nhẹ hoặc trong menu.'],
 '--button-success-bg':['Nền nút chấp thuận','Thao tác duyệt hoặc chấp thuận trong quản trị.'], '--button-success-hover':['Nền chấp thuận khi rê chuột','Trạng thái rê chuột của nút chấp thuận.'], '--button-success-fg':['Chữ nút chấp thuận','Chữ và icon trên nút chấp thuận.'],
 '--status-success':['Thông báo thành công','Thông báo đã lưu hoặc trạng thái thành công.'], '--status-warning':['Thông báo cảnh báo','Nhắc kiểm tra nội dung trước khi tiếp tục.'], '--status-error':['Thông báo lỗi','Lỗi nhập liệu, kết nối và thông báo cần xử lý.'], '--status-info':['Thông báo thông tin','Ghi chú và thông tin hướng dẫn.'],
};
export function paletteField(key: PaletteToken): {label:string;hint:string;group:PaletteGroup} {
 const [label,hint] = names[key] ?? ['Màu giao diện','Áp dụng cho chi tiết giao diện tương ứng.'];
 const group = /danger|success|--status-/.test(key) ? 'states' : key.startsWith('--button-') ? 'buttons' : 'surfaces';
 return {label,hint,group};
}

export const paletteSections: {label:string;hint:string;keys:PaletteToken[]}[] = [
 {label:'Nền giao diện',hint:'Nền trang, thanh điều hướng và hộp nội dung.',keys:['--bg-primary','--bg-header','--bg-secondary','--bg-card','--hover-bg']},
 {label:'Chữ và đường viền',hint:'Các màu nội dung dùng chung trên website.',keys:['--text-primary','--text-secondary','--text-muted','--border-color','--border-strong']},
 {label:'Thương hiệu',hint:'Điểm nhấn và chi tiết bổ sung.',keys:['--accent','--accent-soft']},
 {label:'Nút chính · Đặt lịch / Lưu / Tạo',hint:'Nền, chữ và rê chuột cùng một bộ. Viền nút chính dùng chung màu nền.',keys:['--button-primary-bg','--button-primary-fg','--button-primary-hover']},
 {label:'Nút phụ · Chia sẻ / Hủy / Xuất',hint:'Bộ màu cho thao tác phụ, gồm cả đường viền.',keys:['--button-secondary-bg','--button-secondary-fg','--button-secondary-border','--button-secondary-hover']},
 {label:'Đã chọn · Yêu thích / Bộ lọc',hint:'Nền, chữ và viền khi thao tác đang được chọn.',keys:['--button-selected-bg','--button-selected-fg','--button-selected-border']},
 {label:'Focus bàn phím',hint:'Viền nhận biết khi di chuyển bằng phím Tab.',keys:['--button-focus']},
 {label:'Nút xóa',hint:'Bộ màu cho xác nhận xóa.',keys:['--button-danger-bg','--button-danger-fg','--button-danger-hover']},
 {label:'Icon xóa nhẹ',hint:'Nền và icon cho thao tác xóa dạng nhỏ.',keys:['--button-danger-soft','--button-danger-text']},
 {label:'Nút duyệt / Chấp thuận',hint:'Bộ màu cho thao tác chấp thuận trong admin.',keys:['--button-success-bg','--button-success-fg','--button-success-hover']},
 {label:'Thông báo',hint:'Màu chữ theo ý nghĩa thông báo.',keys:['--status-success','--status-warning','--status-error','--status-info']},
];
