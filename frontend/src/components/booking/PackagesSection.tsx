import { ArrowRight, Check, MessageSquareQuote, Sparkles } from 'lucide-react';
import { openBookingModal } from '@/utils/bookingModalEvent';
import { CORE_PACKAGES, CUSTOM_QUOTE_CARD } from '@/constants/packages';
import { PackageCard } from './PackageCard';
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';

export function PackagesSection() {
  const [headerRef] = useRevealOnScroll<HTMLDivElement>({ threshold: 0.2 });
  const [customRef] = useRevealOnScroll<HTMLDivElement>({ threshold: 0.15, delay: 200 });

  return (
    <section id="home-packages" className="home-package-section" aria-labelledby="home-packages-title">
      <div ref={headerRef} className="home-section-heading studio-section-heading">
        <span>Gói chụp nổi bật</span>
        <h2 id="home-packages-title">Chọn nhanh gói phù hợp</h2>
        <p>
          Bốn gói phù hợp phần lớn buổi chụp. Cần concept riêng? Gửi vài dòng cho PhotoCloud,
          đội ngũ sẽ phản hồi báo giá trong 24h.
        </p>
      </div>
      <div className="home-package-grid">
        {CORE_PACKAGES.map((pkg, index) => (
          <PackageCard key={pkg.id} pkg={pkg} revealIndex={index} />
        ))}
      </div>
      <div ref={customRef} className="home-package-custom" role="complementary" aria-label="Báo giá riêng">
        <div className="home-package-custom-icon" aria-hidden="true">
          <MessageSquareQuote size={22} />
        </div>
        <div className="home-package-custom-body">
          <h3>{CUSTOM_QUOTE_CARD.title}</h3>
          <p>{CUSTOM_QUOTE_CARD.description}</p>
          <ul className="home-package-custom-bullets">
            {CUSTOM_QUOTE_CARD.bullets.map((bullet) => (
              <li key={bullet}>
                <Check size={13} /> {bullet}
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          className="studio-cta-secondary"
          onClick={() => openBookingModal({ mode: 'custom-quote' })}
        >
          <Sparkles size={15} /> Nhận báo giá <ArrowRight size={15} />
        </button>
      </div>
    </section>
  );
}

export default PackagesSection;
