import { ArrowRight, Camera, Clock3, Sparkles, Star } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';
import { openBookingModal } from '@/utils/bookingModalEvent';
import { formatPackageDuration, formatPackagePhotos, formatPackagePrice, type StudioPackage } from '@/constants/packages';

interface PackageCardProps {
  pkg: StudioPackage;
  revealIndex?: number;
}

export function PackageCard({ pkg, revealIndex = 0 }: PackageCardProps) {
  const [ref] = useRevealOnScroll<HTMLElement>({ threshold: 0.1 });
  return (
    <article ref={ref} className="home-package-card studio-card is-hoverable" data-accent={pkg.accent}
      style={{ '--package-reveal-delay': `${revealIndex * 70}ms` } as CSSProperties}>
      <div className="home-package-image studio-package-image">
        {pkg.popular && <span className="home-package-badge"><Star size={11} /> Phổ biến</span>}
        <img
          src={pkg.coverUrl}
          alt={`Ảnh mẫu gói ${pkg.name}`}
          loading="lazy"
          decoding="async"
          width={600}
          height={450}
          onError={(event) => {
            const target = event.currentTarget;
            target.style.display = 'none';
          }}
        />
      </div>
      <div className="home-package-body">
        <h3>{pkg.name}</h3>
        <strong>{formatPackagePrice(pkg)}</strong>
        <p>
          <Clock3 size={13} /> {formatPackageDuration(pkg)} · <Camera size={13} /> {formatPackagePhotos(pkg)}
        </p>
        <span className="home-package-summary">{pkg.description}</span>
        <button
          type="button"
          onClick={() => openBookingModal({ selectedPackageId: pkg.id })}
        >
          Chọn gói <ArrowRight size={15} />
        </button>
      </div>
    </article>
  );
}
