import { ArrowRight, Check, MessageSquareQuote, Sparkles } from 'lucide-react';
import { openBookingModal } from '@/utils/bookingModalEvent';
import { CUSTOM_QUOTE_CARD } from '@/constants/packages';
import { PackageCard } from './PackageCard';
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';
import { usePublicPackages } from '@/hooks/usePublicPackages';
import { DataLoading } from '@/components/user/DataLoading';
import { DraftNotice } from '../home/DraftNotice';

export function PackagesSection() {
  const { packages, source, loading, error, refetch } = usePublicPackages();
  const initialLoading = loading && source !== 'api';
  const [headerRef] = useRevealOnScroll<HTMLDivElement>({ threshold: 0.2 });
  const [customRef] = useRevealOnScroll<HTMLDivElement>({ threshold: 0.15, delay: 200 });

  return (
    <section id="home-packages" className="home-package-section" aria-labelledby="home-packages-title">
      <div ref={headerRef} className="home-section-heading studio-section-heading">
        <span>Gói chụp nổi bật</span>
        <h2 id="home-packages-title">Chọn nhanh gói phù hợp</h2>
        <p>
          Xem giá, thời lượng và nội dung từng gói. Bạn vẫn có thể gửi ý tưởng riêng để bắt đầu trao đổi với studio.
        </p>
      </div>
      {initialLoading ? <DataLoading message="Đang tải gói chụp" /> : <>
        {source !== 'api' && <DraftNotice />}
        {error && <p role="status">Chưa tải được gói chụp hiện tại. <button type="button" className="home-story-link" disabled={loading} onClick={refetch}>Thử tải lại</button></p>}
        {packages.length ? <div className="home-package-grid">
          {packages.map((pkg, index) => <PackageCard key={pkg.id} pkg={pkg} revealIndex={index} preview={source !== 'api'} />)}
        </div> : <p>Studio chưa công bố gói chụp. Bạn có thể gửi yêu cầu riêng bên dưới.</p>}
      </>}
      <div ref={customRef} className="home-package-custom" role="complementary" aria-label="Báo giá riêng">
        <div className="home-package-custom-icon" aria-hidden="true">
          <MessageSquareQuote size={22} />
        </div>
        <div className="home-package-custom-body">
          <h3>{CUSTOM_QUOTE_CARD.title}</h3>
          <p>{CUSTOM_QUOTE_CARD.description}</p>
          <DraftNotice />
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
