import { ArrowRight, CalendarCheck2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { openBookingModal } from '@/utils/bookingModalEvent';
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';
import { DraftNotice } from '../home/DraftNotice';

export function FinalCTA() {
  const [ref] = useRevealOnScroll<HTMLElement>({ threshold: 0.2 });
  const navigate = useNavigate();

  return (
    <section ref={ref} className="home-bottom-cta" aria-label="Đặt lịch chụp ngay">
      <span className="home-bottom-cta-icon" aria-hidden="true">
        <CalendarCheck2 size={26} />
      </span>
      <div className="home-bottom-cta-copy">
        <h2>Sẵn sàng cho buổi chụp tiếp theo?</h2>
        <p>
          Gửi yêu cầu trước, PhotoCloud sẽ xác nhận lịch và tư vấn concept phù hợp trong vòng 24h.
        </p>
        <DraftNotice />
      </div>
      <div className="home-bottom-cta-actions">
        <button
          type="button"
          className="studio-cta-primary"
          onClick={() => openBookingModal()}
        >
          Đặt lịch ngay <ArrowRight size={16} />
        </button>
        <button
          type="button"
          className="studio-cta-ghost"
          onClick={() => navigate('/about')}
        >
          Về PhotoCloud
        </button>
      </div>
    </section>
  );
}

export default FinalCTA;
