import { CalendarDays, Camera, CheckCircle2, Images } from 'lucide-react';
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';

interface Step {
  name: string;
  description: string;
  icon: typeof Camera;
}

const STEPS: Step[] = [
  {
    name: 'Chọn gói',
    description: 'Xem các gói đang được công bố hoặc gửi ý tưởng để trao đổi riêng.',
    icon: Camera,
  },
  {
    name: 'Chọn ngày',
    description: 'Gửi ngày, khung giờ và địa điểm bạn mong muốn.',
    icon: CalendarDays,
  },
  {
    name: 'Xác nhận lịch',
    description: 'Trao đổi với studio để thống nhất nội dung và xác nhận lịch chụp.',
    icon: CheckCircle2,
  },
  {
    name: 'Nhận gallery',
    description: 'Số ảnh và thời gian giao theo gói chụp hoặc báo giá đã thống nhất.',
    icon: Images,
  },
];

export function HowItWorks() {
  const [ref] = useRevealOnScroll<HTMLDivElement>({ threshold: 0.2 });

  return (
    <section ref={ref} className="home-booking-flow" aria-label="Quy trình đặt lịch chụp">
      <div className="home-flow-intro"><h2>Từ yêu cầu<br /><em>đến buổi chụp.</em></h2><p>Gửi yêu cầu để bắt đầu trao đổi. Lịch được chốt sau khi studio xác nhận.</p></div>
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        return (
          <div className="home-booking-step studio-booking-step" key={step.name}>
            <span className="home-booking-step-number">
              <Icon size={18} aria-hidden="true" />
              <em>{String(index + 1).padStart(2, '0')}</em>
            </span>
            <strong>{step.name}</strong>
            <p>{step.description}</p>
          </div>
        );
      })}
    </section>
  );
}

export default HowItWorks;
