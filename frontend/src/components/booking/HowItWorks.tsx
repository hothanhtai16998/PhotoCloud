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
    description: 'Duyệt qua 4 gói cốt lõi hoặc gửi yêu cầu riêng để nhận báo giá.',
    icon: Camera,
  },
  {
    name: 'Chọn ngày',
    description: 'Đề xuất ngày và khung giờ mong muốn. PhotoCloud sẽ xác nhận lịch trong 24h.',
    icon: CalendarDays,
  },
  {
    name: 'Xác nhận lịch',
    description: 'Chốt concept, địa điểm và tư vấn trang phục trước buổi chụp.',
    icon: CheckCircle2,
  },
  {
    name: 'Nhận gallery',
    description: 'Ảnh chỉnh màu cao cấp được gửi qua gallery riêng sau 5–7 ngày.',
    icon: Images,
  },
];

export function HowItWorks() {
  const [ref] = useRevealOnScroll<HTMLDivElement>({ threshold: 0.2 });

  return (
    <section ref={ref} className="home-booking-flow" aria-label="Quy trình đặt lịch chụp">
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
