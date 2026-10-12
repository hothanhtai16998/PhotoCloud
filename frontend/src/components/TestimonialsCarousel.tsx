import { useEffect, useRef, useState } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';
import './TestimonialsCarousel.css';

interface Testimonial {
  name: string;
  package: string;
  rating: number;
  avatar: string;
  quote: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Thu Hà',
    package: 'Chân dung cá nhân',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&q=80&auto=format&fit=crop&crop=face',
    quote: 'Buổi chụp nhẹ nhàng, chị Minh Châu hướng dẫn tạo dáng tự nhiên và rất dễ thương. Gallery nhận đúng hẹn 6 ngày, ảnh đẹp hơn mong đợi.',
  },
  {
    name: 'Minh Khoa',
    package: 'Couple session',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80&auto=format&fit=crop&crop=face',
    quote: 'Chúng mình muốn ảnh thật, không pose quá cầu kỳ — PhotoCloud hiểu ngay. Ảnh tự nhiên mà vẫn có bố cục đẹp. Sẽ quay lại cho anniversary.',
  },
  {
    name: 'Lan Chi',
    package: 'Gia đình 4 người',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&q=80&auto=format&fit=crop&crop=face',
    quote: 'Hai nhóc 3 và 5 tuổi mà chị photographer kiên nhẫn vô cùng. Cuối cùng toàn bộ ảnh gia đình đều rất vui vẻ và tự nhiên. Highly recommend!',
  },
  {
    name: 'Đức Anh',
    package: 'Mini session',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&q=80&auto=format&fit=crop&crop=face',
    quote: 'Chỉ 30 phút nhưng chất lượng không thua buổi chụp 2 tiếng. Đội ngũ chuyên nghiệp, giao ảnh nhanh. Mini session hoàn hảo cho profile.',
  },
  {
    name: 'Phương Thảo',
    package: 'Chân dung cá nhân',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&q=80&auto=format&fit=crop&crop=face',
    quote: 'Retouch ảnh đỉnh. Mình muốn giữ nét thật, không biến dạng mặt — PhotoCloud làm đúng ý. Đây là bộ ảnh đầu tiên mà mình thực sự tự hào.',
  },
];

export function TestimonialsCarousel() {
  useRevealOnScroll();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = TESTIMONIALS.length;

  const goTo = (index: number) => {
    setActive((index + total) % total);
  };

  const goNext = () => goTo(active + 1);
  const goPrev = () => goTo(active - 1);

  useEffect(() => {
    if (paused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(goNext, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused, active]);

  const testimonial = TESTIMONIALS[active];

  return (
    <section
      className="testimonials-carousel studio-reveal"
      aria-label="Đánh giá từ khách hàng"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="testimonials-header">
        <div className="testimonials-title">
          <p className="booking-eyebrow">KHÁCH HÀNG NÓI GÌ</p>
          <h2>Những khoảnh khắc đáng nhớ</h2>
        </div>
        <div className="testimonials-nav">
          <button
            type="button"
            className="testimonials-nav-btn"
            onClick={goPrev}
            aria-label="Khách hàng trước"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="testimonials-nav-btn"
            onClick={goNext}
            aria-label="Khách hàng tiếp theo"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="testimonials-track">
        {TESTIMONIALS.map((item, index) => (
          <div
            key={item.name}
            className={`testimonials-slide${index === active ? ' is-active' : ''}`}
            aria-hidden={index !== active}
          >
            <div className="testimonials-quote">
              <div className="testimonials-stars" aria-label={`${item.rating} trên 5 sao`}>
                {Array.from({ length: item.rating }, (_, i) => (
                  <Star key={i} size={14} fill="currentColor" />
                ))}
              </div>
              <blockquote>"{item.quote}"</blockquote>
            </div>
            <div className="testimonials-author">
              <img src={item.avatar} alt={item.name} className="testimonials-avatar" loading="lazy" />
              <div>
                <strong>{item.name}</strong>
                <span>{item.package}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="testimonials-dots" role="tablist" aria-label="Chuyển đánh giá">
        {TESTIMONIALS.map((item, index) => (
          <button
            key={item.name}
            type="button"
            role="tab"
            aria-selected={index === active}
            aria-label={`Đánh giá của ${item.name}`}
            className={`testimonials-dot${index === active ? ' is-active' : ''}`}
            onClick={() => goTo(index)}
          />
        ))}
      </div>
    </section>
  );
}
