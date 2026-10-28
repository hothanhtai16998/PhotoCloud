import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import './HomeWayfinding.css';

export function HomeWayfinding() {
  return <section className="home-wayfinding" aria-labelledby="home-wayfinding-title">
    <div>
      <h2 id="home-wayfinding-title">Bạn muốn<br /><span>bắt đầu từ đâu?</span></h2>
      <p>Tìm cảm hứng qua những bức ảnh, khám phá bộ sưu tập hoặc chuẩn bị cho buổi chụp của riêng bạn. Chọn một lối đi, hoặc cuộn để tôi giới thiệu từng phần.</p>
    </div>
    <nav aria-label="Chọn hành trình PhotoCloud">
      <Link to="/explore" data-guide-caption="Khám phá ảnh, chọn bộ lọc rồi mở một ảnh để xem thông tin và tác giả.">Khám phá ảnh <ArrowUpRight size={18} /></Link>
      <Link to="/collections" data-guide-caption="Bộ sưu tập giúp bạn khám phá các nhóm ảnh và những câu chuyện được tuyển chọn.">Xem bộ sưu tập <ArrowUpRight size={18} /></Link>
      <a href="#home-packages" data-guide-caption="Bạn có thể xem gói trước; gửi yêu cầu không có nghĩa lịch đã được xác nhận.">Tìm dịch vụ chụp <ArrowDown size={18} /></a>
    </nav>
  </section>;
}
