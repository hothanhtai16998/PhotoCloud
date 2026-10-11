import { ArrowDown, ArrowRight, CalendarDays, Camera, Clock3, Sparkles, Star } from 'lucide-react';
import { openBookingModal } from '@/utils/bookingModalEvent';
import { TRUST_STATS } from '@/constants/packages';
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';
import './HeroBooking.css';

interface HeroBookingProps {
  onViewPackages?: () => {
    /* see packages section */
  };
}

const HERO_IMAGES = {
  // Cinematic warm-tone couple shot used as the main hero visual.
  main: 'https://images.unsplash.com/photo-1525258946800-98cfd641d0de?auto=format&fit=crop&w=1200&q=80',
  // Smaller portrait shot layered on top.
  portrait: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80',
};

const MARQUEE_WORDS = [
  'CHỤP ẢNH CHÂN DUNG',
  'COUPLE SESSION',
  'GIA ĐÌNH',
  'MINI SESSION',
  'WEDDING',
  'EDITORIAL',
  'CHỤP ẢNH DOANH NGHIỆP',
  'BOOKING NHANH',
];

export function HeroBooking({ onViewPackages }: HeroBookingProps) {
  const [copyRef] = useRevealOnScroll<HTMLDivElement>({ threshold: 0.1 });
  const [visualRef] = useRevealOnScroll<HTMLDivElement>({ threshold: 0.05, delay: 150 });

  return (
    <section className="hero-section" aria-labelledby="home-booking-title">
      {/* Decorative orbs (floating animation) */}
      <span className="hero-orb hero-orb--copper" aria-hidden="true" />
      <span className="hero-orb hero-orb--gold" aria-hidden="true" />
      <span className="hero-orb hero-orb--cream" aria-hidden="true" />

      {/* Marquee ribbon (subtle top ticker) */}
      <div className="hero-marquee" aria-hidden="true">
        <div className="hero-marquee-track">
          {[...MARQUEE_WORDS, ...MARQUEE_WORDS].map((word, i) => (
            <span key={i}>
              {word}
              <span className="dot" />
            </span>
          ))}
        </div>
      </div>

      <div ref={copyRef} className="hero-copy">
        <span className="hero-eyebrow">
          <Sparkles size={14} /> PhotoCloud Studio
        </span>
        <h1 id="home-booking-title" className="hero-title">
          Chụp ảnh <em>theo cách</em> của bạn
        </h1>
        <p className="hero-sub">
          PhotoCloud nhận chụp chân dung, couple, gia đình và mini session —
          đặt lịch trong 60 giây, nhận ảnh chỉnh màu cao cấp sau 5–7 ngày.
        </p>
        <div className="hero-actions">
          <button
            type="button"
            className="hero-cta hero-cta--primary"
            onClick={() => openBookingModal()}
          >
            <CalendarDays size={17} />
            Đặt lịch chụp
            <ArrowRight size={16} className="hero-cta-arrow" />
          </button>
          <button
            type="button"
            className="hero-cta hero-cta--secondary"
            onClick={onViewPackages}
          >
            Xem gói chụp
            <ArrowRight size={16} className="hero-cta-arrow" />
          </button>
        </div>
        <div className="hero-trust" aria-label="Thông tin tin cậy">
          <span className="hero-trust-pill">
            <Camera size={15} /> {TRUST_STATS.sessions} buổi chụp
          </span>
          <span className="hero-trust-pill">
            <Star size={15} /> {TRUST_STATS.rating} đánh giá
          </span>
          <span className="hero-trust-pill">
            <Clock3 size={15} /> Giao ảnh {TRUST_STATS.delivery}
          </span>
        </div>
      </div>

      <div ref={visualRef} className="hero-visual" aria-hidden="true">
        <div className="hero-photo-card hero-photo-card--main">
          <img
            src={HERO_IMAGES.main}
            alt=""
            loading="eager"
            decoding="async"
            width={1200}
            height={1500}
            onError={(event) => {
              const target = event.currentTarget;
              target.style.display = 'none';
              target.parentElement!.style.background = 'linear-gradient(135deg, #c9a27d, #513930)';
            }}
          />
          <span className="hero-photo-label">Couple session</span>
        </div>
        <div className="hero-photo-card hero-photo-card--small">
          <img
            src={HERO_IMAGES.portrait}
            alt=""
            loading="lazy"
            decoding="async"
            width={600}
            height={600}
            onError={(event) => {
              const target = event.currentTarget;
              target.style.display = 'none';
              target.parentElement!.style.background = 'linear-gradient(135deg, #754739, #d6b28b)';
            }}
          />
          <span className="hero-photo-label">Portrait</span>
        </div>
      </div>

      {/* Scroll indicator (below content, suggests more below) */}
      <div className="hero-scroll-hint" aria-hidden="true">
        <span className="mouse" />
        <span>Cuộn xuống</span>
        <ArrowDown size={12} />
      </div>
    </section>
  );
}

export default HeroBooking;
